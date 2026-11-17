"use client";

import React, { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import { Plus, Save, Trash2 } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { useStaffMe } from "@/components/game/staff";
import { Alert, Button, ConfirmDialog, Field, HudCard, LoadingView, MessageView, Modal, TeamBadge, inputClass } from "@/components/game/ui";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import { useGameState } from "@/lib/client/useGameState";
import { TEAM_COLOR_KEYS, TEAM_COLORS, type TeamColorKey } from "@/lib/shared/constants";
import type { GMSnapshot, StaffListItem } from "@/lib/shared/types";

export default function SetupPage() {
  const me = useStaffMe();
  const { data, error, refresh } = useGameState<GMSnapshot>("/api/gm/state", 5000);
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const loadStaff = useCallback(async () => {
    const r = await api<{ staff: StaffListItem[] }>("/api/gm/staff");
    if (r.ok) setStaff(r.data.staff);
  }, []);
  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  if (error?.status === 403) return <MessageView title="Game Masters only" message="Your account is a Team Manager." />;
  if (error) return <MessageView title="Error" message={error.message} />;
  if (!data) return <LoadingView />;

  return (
    <div className="space-y-5">
      {me && <StaffNav role={me.role} name={me.name} />}
      <TeamsSection snapshot={data} onChange={refresh} />
      <StaffSection staff={staff} snapshot={data} onChange={loadStaff} />
    </div>
  );
}

/* ───────────────────────── Teams ───────────────────────── */

function TeamsSection({ snapshot, onChange }: { snapshot: GMSnapshot; onChange: () => void }) {
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [newKey, setNewKey] = useState<TeamColorKey | "">("");
  const [deleting, setDeleting] = useState<GMSnapshot["teams"][number] | null>(null);
  const used = new Set(snapshot.teams.map((t) => t.key));

  const run = async (p: Promise<{ ok: boolean; error?: ApiErrorInfo }>) => {
    setError(null);
    const r = await p;
    if (!r.ok) setError(r.error ?? null);
    onChange();
    return r.ok;
  };

  return (
    <HudCard title="Teams" right={<span className="text-xs font-mono text-slate-400">{snapshot.teams.length} teams</span>}>
      {error && <div className="mb-3"><Alert>{error.message}</Alert></div>}
      <ul className="space-y-2">
        {snapshot.teams.map((t) => (
          <TeamRow key={`${t.id}-${t.key}-${t.name}`} team={t} used={used} onSave={(body) => run(api(`/api/gm/teams/${t.id}`, { method: "PATCH", body }))} onDelete={() => setDeleting(t)} />
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-800 pt-4">
        <Field label="Add a team colour">
          <select className={`${inputClass} py-2 w-44`} value={newKey} onChange={(e) => setNewKey(e.target.value as TeamColorKey)}>
            <option value="">Choose…</option>
            {TEAM_COLOR_KEYS.filter((k) => !used.has(k)).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
        <Button
          disabled={!newKey}
          onClick={async () => {
            if (!newKey) return;
            const name = newKey[0].toUpperCase() + newKey.slice(1);
            if (await run(api("/api/gm/teams", { body: { key: newKey, name } }))) setNewKey("");
          }}
        >
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <ConfirmDialog
        open={!!deleting}
        danger
        title="Delete team?"
        message={<>Delete the <b>{deleting?.name}</b> team? Only empty teams can be deleted.</>}
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await run(api(`/api/gm/teams/${deleting.id}`, { method: "DELETE" }));
          setDeleting(null);
        }}
      />
    </HudCard>
  );
}

function TeamRow({
  team,
  used,
  onSave,
  onDelete,
}: {
  team: GMSnapshot["teams"][number];
  used: Set<string>;
  onSave: (body: { key?: string; name?: string }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [key, setKey] = useState(team.key);
  const [name, setName] = useState(team.name);
  const dirty = key !== team.key || name !== team.name;
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
      <TeamBadge team={{ key, name, colorHex: TEAM_COLORS[key] }} size={32} showName={false} />
      <input className={`${inputClass} py-2 flex-1 min-w-[120px]`} value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
      <select className={`${inputClass} py-2 w-32`} value={key} onChange={(e) => setKey(e.target.value as TeamColorKey)}>
        {TEAM_COLOR_KEYS.filter((k) => k === team.key || !used.has(k)).map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <span className="text-xs font-mono text-slate-400 w-16 text-center">{team.playerCount} players</span>
      <Button size="sm" disabled={!dirty} onClick={() => onSave({ key, name })}>
        <Save className="w-3.5 h-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete} disabled={team.playerCount > 0} title={team.playerCount > 0 ? "Team has players" : "Delete"}>
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </Button>
    </li>
  );
}

/* ───────────────────────── Staff ───────────────────────── */

function StaffSection({ staff, snapshot, onChange }: { staff: StaffListItem[]; snapshot: GMSnapshot; onChange: () => void }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffListItem | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const teamName = (id: string) => snapshot.teams.find((t) => t.id === id)?.name ?? "?";

  const toggleActive = async (s: StaffListItem) => {
    setError(null);
    const r = await api(`/api/gm/staff/${s.id}`, { method: "PATCH", body: { active: !s.active } });
    if (!r.ok) setError(r.error);
    onChange();
  };

  return (
    <HudCard
      title="Staff accounts"
      right={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="w-3.5 h-3.5" /> Add staff
        </Button>
      }
    >
      {error && <div className="mb-3"><Alert>{error.message}</Alert></div>}
      <ul className="divide-y divide-slate-800">
        {staff.map((s) => (
          <li key={s.id} className={clsx("flex flex-wrap items-center gap-3 py-2.5", !s.active && "opacity-50")}>
            <span
              className={clsx(
                "text-[10px] font-mono font-bold rounded px-1.5 py-0.5 border",
                s.role === "GM" ? "text-red-300 border-red-400/60" : "text-cyan-300 border-cyan-400/60",
              )}
            >
              {s.role}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{s.name}</p>
              <p className="text-xs text-slate-400">
                {s.role === "TM" ? s.teamIds.map(teamName).join(", ") || "no team" : "All teams"}
                {!s.active && " · inactive"}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toggleActive(s)}>
              {s.active ? "Deactivate" : "Activate"}
            </Button>
          </li>
        ))}
      </ul>
      {creating && <StaffForm snapshot={snapshot} onClose={() => setCreating(false)} onDone={onChange} />}
      {editing && <StaffForm snapshot={snapshot} existing={editing} onClose={() => setEditing(null)} onDone={onChange} />}
    </HudCard>
  );
}

function StaffForm({
  snapshot,
  existing,
  onClose,
  onDone,
}: {
  snapshot: GMSnapshot;
  existing?: StaffListItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [role, setRole] = useState<"GM" | "TM">(existing?.role ?? "TM");
  const [teamIds, setTeamIds] = useState<string[]>(existing?.teamIds ?? []);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const save = async () => {
    setLoading(true);
    setError(null);
    const body = existing
      ? { name, role, teamIds: role === "TM" ? teamIds : [], ...(pin ? { pin } : {}) }
      : { name, role, teamIds: role === "TM" ? teamIds : [], pin };
    const r = existing ? await api(`/api/gm/staff/${existing.id}`, { method: "PATCH", body }) : await api("/api/gm/staff", { body });
    setLoading(false);
    if (r.ok) {
      onDone();
      onClose();
    } else setError(r.error);
  };

  return (
    <Modal open onClose={onClose} title={existing ? `Edit ${existing.name}` : "Add staff member"}>
      <div className="space-y-4">
        <Field label="Name (used to log in)">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Role">
          <div className="flex gap-2">
            {(["TM", "GM"] as const).map((r) => (
              <Button key={r} size="sm" variant={role === r ? "primary" : "ghost"} onClick={() => setRole(r)}>
                {r === "GM" ? "Game Master" : "Team Manager"}
              </Button>
            ))}
          </div>
        </Field>
        {role === "TM" && (
          <Field label="Teams managed">
            <div className="flex flex-wrap gap-2">
              {snapshot.teams.map((t) => {
                const on = teamIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTeamIds(on ? teamIds.filter((x) => x !== t.id) : [...teamIds, t.id])}
                    className={clsx("rounded-lg border-2 px-2 py-1", on ? "bg-slate-800" : "border-slate-700 opacity-60")}
                    style={on ? { borderColor: t.colorHex } : undefined}
                  >
                    <TeamBadge team={t} size={22} />
                  </button>
                );
              })}
            </div>
          </Field>
        )}
        <Field label={existing ? "New 6-digit PIN (leave empty to keep)" : "6-digit PIN"} hint="Tell them the PIN in person. Changing it logs them out.">
          <input
            className={`${inputClass} font-mono tracking-[0.4em]`}
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        {error && <Alert>{error.message}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={save} disabled={!name || (!existing && pin.length !== 6) || (!!pin && pin.length !== 6)}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
