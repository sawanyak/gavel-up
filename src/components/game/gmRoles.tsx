"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, Eye, EyeOff, Shuffle, Sparkles } from "lucide-react";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import type { Role } from "@/lib/shared/constants";
import type { GMSnapshot } from "@/lib/shared/types";
import { ROLE_STYLE } from "./roles";
import { Alert, Button, ConfirmDialog, HudCard, TeamBadge } from "./ui";

export function RoleChip({ role }: { role: Role | null | undefined }) {
  if (!role) return <span className="text-[10px] font-mono uppercase text-slate-500 border border-slate-600 rounded px-1">no role</span>;
  const s = ROLE_STYLE[role];
  return <span className={clsx("text-[10px] font-mono font-bold uppercase rounded px-1.5 py-0.5 border", s.text, s.border)}>{role}</span>;
}

function CountsTable({ counts }: { counts: GMSnapshot["roles"]["counts"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <th className="text-left py-1.5">Team</th>
            <th className="py-1.5">Players</th>
            <th className="py-1.5 text-red-300">Impostors</th>
            <th className="py-1.5 text-amber-300">Detectives</th>
            <th className="py-1.5 text-cyan-300">Crewmates</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((c) => (
            <tr key={c.teamId} className="border-t border-slate-800 text-center">
              <td className="text-left py-1.5 font-semibold text-white">{c.teamName}</td>
              <td>{c.players}</td>
              <td className={c.players > 0 && c.impostors === 0 ? "text-amber-300 font-bold" : ""}>{c.impostors}</td>
              <td>{c.detectives}</td>
              <td>{c.crewmates}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Reveal Roles" primary control + type-to-confirm dialog with a preview. */
export function RevealRolesButton({ snapshot, onDone }: { snapshot: GMSnapshot; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const { game, roles } = snapshot;

  if (roles.revealedAt) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/40 px-3 py-2 text-xs font-mono font-bold uppercase text-emerald-200">
        <Sparkles className="w-4 h-4" /> Roles revealed {new Date(roles.revealedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }

  const reveal = async () => {
    setLoading(true);
    setError(null);
    const r = await api("/api/gm/roles/reveal", { body: { confirm: "REVEAL" } });
    setLoading(false);
    if (r.ok) {
      setOpen(false);
      onDone();
    } else setError(r.error);
  };

  return (
    <>
      <Button
        variant="danger"
        onClick={() => setOpen(true)}
        disabled={game.phase !== "LOBBY" || snapshot.counts.registered === 0}
        title={game.phase !== "LOBBY" ? "Open registration first" : undefined}
      >
        <Sparkles className="w-4 h-4" /> Reveal roles
      </Button>
      <ConfirmDialog
        open={open}
        danger
        title="Reveal roles to everyone?"
        confirmLabel="Reveal roles"
        typeToConfirm="REVEAL"
        loading={loading}
        onCancel={() => setOpen(false)}
        onConfirm={reveal}
        message={
          <>
            Roles are assigned <b>randomly</b> to all <b className="text-white">{snapshot.counts.registered}</b> registered players and appear on
            their phones immediately. <b className="text-red-300">This can&apos;t be undone.</b> People who register later become crewmates.
          </>
        }
      >
        <div className="mb-4 space-y-3">
          <CountsTable counts={roles.counts} />
          {roles.warnings.length > 0 && (
            <Alert kind="info">
              <ul className="list-disc pl-4 space-y-0.5">
                {roles.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Alert>
          )}
          {error && <Alert>{error.message}</Alert>}
        </div>
      </ConfirmDialog>
    </>
  );
}

/** Role overview after reveal: counts, warnings with quick fixes, optional names. */
export function RolesPanel({
  snapshot,
  showNames,
  setShowNames,
  onChange,
}: {
  snapshot: GMSnapshot;
  showNames: boolean;
  setShowNames: (v: boolean) => void;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const { roles, teams, registrations } = snapshot;
  if (!roles.revealedAt) return null;

  const assign = async (teamId: string, role: "impostor" | "detective") => {
    setBusy(teamId + role);
    setMsg(null);
    const r = await api<{ player: { name: string } }>(`/api/gm/teams/${teamId}/assign-role`, { body: { role } });
    setBusy(null);
    if (r.ok) setMsg({ kind: "success", text: `${r.data.player.name} is now a ${role}. Tell them to check their phone.` });
    else setMsg({ kind: "error", text: r.error.message });
    onChange();
  };

  return (
    <HudCard
      title="Roles"
      variant="red"
      right={
        <Button size="sm" variant="ghost" onClick={() => setShowNames(!showNames)}>
          {showNames ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {showNames ? "Hide names" : "Show names"}
        </Button>
      }
    >
      <CountsTable counts={roles.counts} />

      {roles.warnings.length > 0 && (
        <div className="mt-3 space-y-2">
          {roles.counts
            .filter((c) => c.players > 0 && (c.impostors === 0 || (c.detectives === 0 && c.players >= roles.config.minTeamSizeForSpecialRoles)))
            .map((c) => (
              <div key={c.teamId} className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span className="flex-1">
                  {c.teamName}: {c.impostors === 0 ? "no impostor" : ""}
                  {c.impostors === 0 && c.detectives === 0 ? " & " : ""}
                  {c.detectives === 0 ? "no detective" : ""}
                </span>
                {c.impostors === 0 && (
                  <Button size="sm" variant="ghost" loading={busy === c.teamId + "impostor"} onClick={() => assign(c.teamId, "impostor")}>
                    <Shuffle className="w-3.5 h-3.5" /> Random impostor
                  </Button>
                )}
                {c.detectives === 0 && (
                  <Button size="sm" variant="ghost" loading={busy === c.teamId + "detective"} onClick={() => assign(c.teamId, "detective")}>
                    <Shuffle className="w-3.5 h-3.5" /> Random detective
                  </Button>
                )}
              </div>
            ))}
          {roles.warnings
            .filter((w) => !/has no (impostor|detective)/.test(w))
            .map((w) => (
              <Alert key={w} kind="info">
                {w}
              </Alert>
            ))}
        </div>
      )}
      {msg && <div className="mt-3"><Alert kind={msg.kind}>{msg.text}</Alert></div>}

      {showNames && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const specials = registrations.filter((r) => r.teamId === t.id && r.role && r.role !== "crewmate");
            return (
              <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <TeamBadge team={t} size={24} />
                <ul className="mt-2 space-y-1 text-sm">
                  {specials.length === 0 && <li className="text-slate-500">No special roles</li>}
                  {specials.map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <RoleChip role={r.role} />
                      <span className={r.status === "ghost" ? "line-through text-slate-500" : "text-white"}>{r.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </HudCard>
  );
}
