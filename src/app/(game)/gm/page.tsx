"use client";

import React, { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { IssueCodeButton, useStaffMe } from "@/components/game/staff";
import {
  Alert,
  Button,
  ConfirmDialog,
  ConnectionBanner,
  Field,
  HudCard,
  LoadingView,
  MessageView,
  Modal,
  PhaseChip,
  TeamBadge,
  inputClass,
} from "@/components/game/ui";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import { useGameState } from "@/lib/client/useGameState";
import type { GMRegistration, GMSnapshot } from "@/lib/shared/types";

export default function GMDashboard() {
  const me = useStaffMe();
  const { data, error, connection, refresh, serverOffset } = useGameState<GMSnapshot>("/api/gm/state", 2000);

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState<ApiErrorInfo | null>(null);
  const [editing, setEditing] = useState<GMRegistration | null>(null);
  const [removing, setRemoving] = useState<GMRegistration | null>(null);

  const teamsById = useMemo(() => new Map((data?.teams ?? []).map((t) => [t.id, t])), [data?.teams]);

  // Highlight possible duplicates (same name, different phone).
  const dupNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of data?.registrations ?? []) {
      const k = r.name.toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, n]) => n > 1).map(([k]) => k));
  }, [data?.registrations]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.registrations ?? []).filter(
      (r) => (!teamFilter || r.teamId === teamFilter) && (!q || r.name.toLowerCase().includes(q) || r.phone.includes(q)),
    );
  }, [data?.registrations, search, teamFilter]);

  if (error?.status === 403) return <MessageView title="Game Masters only" message="Your account is a Team Manager." actions={[{ label: "Go to my team", href: "/tm" }]} />;
  if (error?.status === 401) return <LoadingView label="Redirecting to login…" />;
  if (error) return <MessageView title="Error" message={error.message} />;
  if (!data) return <LoadingView />;

  const setRegistration = async (open: boolean) => {
    setToggling(true);
    setActionError(null);
    const r = await api("/api/gm/registration", { method: "PATCH", body: { open } });
    setToggling(false);
    setConfirmClose(false);
    if (!r.ok) setActionError(r.error);
    refresh();
  };

  const now = Date.now() + serverOffset;

  return (
    <div className="space-y-5">
      <ConnectionBanner connection={connection} />
      {me && <StaffNav role={me.role} name={me.name} />}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white">{data.game.name}</h1>
        <span className="text-xs font-mono text-slate-400 border border-slate-700 rounded px-2 py-0.5">CODE {data.game.code}</span>
        <PhaseChip phase={data.game.phase} />
      </div>

      {actionError && <Alert>{actionError.message}</Alert>}

      {/* Primary controls */}
      <HudCard title="Game controls" variant="red">
        <div className="flex flex-wrap items-center gap-3">
          {data.game.registrationOpen ? (
            <Button variant="ghost" onClick={() => setConfirmClose(true)} loading={toggling}>
              Close registration
            </Button>
          ) : (
            <Button variant="success" onClick={() => setRegistration(true)} loading={toggling} disabled={data.game.phase === "COMPLETED"}>
              <UserPlus className="w-4 h-4" /> Open registration
            </Button>
          )}
          <span className={clsx("text-xs font-mono uppercase tracking-wider", data.game.registrationOpen ? "text-emerald-300" : "text-slate-400")}>
            Registration is {data.game.registrationOpen ? "OPEN" : "CLOSED"}
          </span>
          <span className="text-xs text-slate-500">More controls (Reveal Roles, Meeting…) arrive in later phases.</span>
        </div>
      </HudCard>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border-2 border-cyan-500/40 bg-slate-950/85 p-3 text-center">
          <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">Registered</p>
          <p className="text-4xl font-black text-white">{data.counts.registered}</p>
        </div>
        {data.teams.map((t) => (
          <button
            key={t.id}
            onClick={() => setTeamFilter(teamFilter === t.id ? "" : t.id)}
            className={clsx("rounded-xl border-2 bg-slate-950/85 p-3 flex items-center gap-3", teamFilter === t.id ? "" : "border-slate-800")}
            style={teamFilter === t.id ? { borderColor: t.colorHex } : undefined}
          >
            <TeamBadge team={t} size={34} showName={false} />
            <div className="text-left">
              <p className="text-[11px] font-mono uppercase tracking-widest" style={{ color: t.colorHex }}>
                {t.name}
              </p>
              <p className="text-2xl font-black text-white">{t.playerCount}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Live registrations */}
      <HudCard
        title="Live registrations"
        right={
          <span className="text-xs font-mono text-slate-400">
            {rows.length} shown{data.counts.removed > 0 && ` · ${data.counts.removed} removed`}
          </span>
        }
      >
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className={`${inputClass} pl-9 py-2`} placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputClass} py-2 sm:w-48`} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="">All teams</option>
            {data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-slate-500 py-8 font-mono text-sm">No registrations yet. Open registration and share the QR code.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {rows.map((r) => {
              const t = teamsById.get(r.teamId);
              const fresh = now - new Date(r.registeredAt).getTime() < 30_000;
              return (
                <li key={r.id} className={clsx("flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5", fresh && "bg-cyan-500/5 animate-pulse")}>
                  {t && <TeamBadge team={t} size={26} showName={false} />}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">
                      {r.name}
                      {dupNames.has(r.name.toLowerCase()) && (
                        <span className="ml-2 text-[10px] font-mono uppercase text-amber-300 border border-amber-400/50 rounded px-1">possible dup</span>
                      )}
                      {r.late && <span className="ml-2 text-[10px] font-mono uppercase text-fuchsia-300 border border-fuchsia-400/50 rounded px-1">late</span>}
                    </p>
                    <p className="text-xs font-mono text-slate-400">
                      {r.phone} · {t?.name ?? "?"} · {new Date(r.registeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <IssueCodeButton playerId={r.id} playerName={r.name} />
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)} aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(r)} aria-label="Remove">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </HudCard>

      <ConfirmDialog
        open={confirmClose}
        title="Close registration?"
        message="New players won't be able to join until you open it again. Already-registered players are not affected."
        confirmLabel="Close"
        loading={toggling}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => setRegistration(false)}
      />

      {editing && <EditPlayerModal player={editing} snapshot={data} onClose={() => setEditing(null)} onDone={refresh} />}
      {removing && <RemovePlayerModal player={removing} onClose={() => setRemoving(null)} onDone={refresh} />}
    </div>
  );
}

function EditPlayerModal({
  player,
  snapshot,
  onClose,
  onDone,
}: {
  player: GMRegistration;
  snapshot: GMSnapshot;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [teamId, setTeamId] = useState(player.teamId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const save = async (force = false) => {
    setLoading(true);
    setError(null);
    const r = await api(`/api/gm/players/${player.id}`, { method: "PATCH", body: { name, teamId, force } });
    setLoading(false);
    if (r.ok) {
      onDone();
      onClose();
    } else setError(r.error);
  };

  return (
    <Modal open onClose={onClose} title="Edit player">
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Team">
          <select className={inputClass} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {snapshot.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        {error && <Alert>{error.message}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {error?.code === "ROLES_ALREADY_ASSIGNED" ? (
            <Button variant="danger" loading={loading} onClick={() => save(true)}>
              Move anyway
            </Button>
          ) : (
            <Button loading={loading} onClick={() => save(false)}>
              Save
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function RemovePlayerModal({ player, onClose, onDone }: { player: GMRegistration; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const remove = async () => {
    setLoading(true);
    const r = await api(`/api/gm/players/${player.id}`, { method: "DELETE", body: { reason } });
    setLoading(false);
    if (r.ok) {
      onDone();
      onClose();
    } else setError(r.error);
  };

  return (
    <ConfirmDialog
      open
      danger
      title="Remove registration?"
      confirmLabel="Remove"
      loading={loading}
      onCancel={onClose}
      onConfirm={remove}
      message={
        <>
          Remove <b className="text-white">{player.name}</b> ({player.phone})? They&apos;ll be logged out and the phone number can be used to register
          again. This is recorded in the audit log.
        </>
      }
    >
      <Field label="Reason" error={error?.message}>
        <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. duplicate, test entry" />
      </Field>
    </ConfirmDialog>
  );
}
