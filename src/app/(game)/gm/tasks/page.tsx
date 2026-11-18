"use client";

import React, { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, ChevronRight, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { useStaffMe } from "@/components/game/staff";
import { VerificationQueue } from "@/components/game/gameplay";
import { Alert, Button, ConfirmDialog, ConnectionBanner, Field, HudCard, LoadingView, MessageView, Modal, PhaseChip, inputClass } from "@/components/game/ui";
import { api, fieldError, type ApiErrorInfo } from "@/lib/client/api";
import { useGameState } from "@/lib/client/useGameState";
import type { AssignmentStatus, GMTasksSnapshot, GMTaskView, TaskKind } from "@/lib/shared/types";

const KIND_INFO: Record<TaskKind, { label: string; help: string }> = {
  individual: { label: "Individual", help: "Each player does it themselves and taps Done." },
  team: { label: "Team", help: "One per team. Any member taps Done for the whole team." },
  paired: { label: "Paired", help: "Random partners (e.g. 'Talk to <name> for 2 minutes'). Both must confirm." },
  activity: { label: "Activity", help: "Table topics, Q&A, icebreakers. Shown to everyone; staff give the points." },
};

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  open: "not done",
  awaiting_partner: "waiting for partner",
  awaiting_verification: "to check",
  completed: "done",
  rejected: "rejected",
};

export default function GMTasksPage() {
  const me = useStaffMe();
  const { data, error, connection, refresh } = useGameState<GMTasksSnapshot>("/api/gm/tasks", 3000);
  const [creating, setCreating] = useState(false);

  if (error?.status === 403) return <MessageView title="Game Masters only" message="Your account is a Team Manager." actions={[{ label: "Go to my team", href: "/tm" }]} />;
  if (error?.status === 401) return <LoadingView label="Redirecting to login…" />;
  if (error) return <MessageView title="Error" message={error.message} />;
  if (!data) return <LoadingView />;

  const canReveal = data.phase === "PLAYING" || data.phase === "MEETING";

  return (
    <div className="space-y-5">
      <ConnectionBanner connection={connection} />
      {me && <StaffNav role={me.role} name={me.name} />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white">Tasks</h1>
        <PhaseChip phase={data.phase} />
        <span className="flex-grow" />
        <Button onClick={() => setCreating(true)} disabled={data.phase === "COMPLETED"}>
          <Plus className="w-4 h-4" /> New task
        </Button>
      </div>

      {!canReveal && <Alert kind="info">You can prepare tasks now. They can be revealed to players once roles are revealed.</Alert>}

      {data.queue.length > 0 && <VerificationQueue items={data.queue} onChange={refresh} />}

      {data.tasks.length === 0 ? (
        <HudCard>
          <p className="text-center text-slate-400 py-6">No tasks yet. Press “New task” to add one.</p>
        </HudCard>
      ) : (
        <div className="space-y-3">
          {data.tasks.map((t) => (
            <TaskRow key={t.id} task={t} snapshot={data} canReveal={canReveal} onChange={refresh} />
          ))}
        </div>
      )}

      {creating && <TaskFormModal onClose={() => setCreating(false)} onDone={refresh} />}
    </div>
  );
}

function TaskRow({ task: t, snapshot, canReveal, onChange }: { task: GMTaskView; snapshot: GMTasksSnapshot; canReveal: boolean; onChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const teamColor = new Map(snapshot.teams.map((x) => [x.id, x.colorHex]));
  const pct = t.counts.total ? Math.round((t.counts.completed / t.counts.total) * 100) : 0;

  const act = async (path: string, method = "POST") => {
    setBusy(true);
    setError(null);
    const r = await api(path, { method, ...(method === "POST" ? { body: {} } : {}) });
    setBusy(false);
    setConfirmHide(false);
    setConfirmDelete(false);
    if (!r.ok) setError(r.error);
    onChange();
  };

  return (
    <HudCard variant={t.revealed ? "cyan" : "plain"}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-white text-lg">{t.title}</h3>
            <span className="text-[10px] font-mono uppercase border border-slate-600 rounded px-1.5 py-0.5 text-slate-300">
              {KIND_INFO[t.kind].label}
              {t.kind === "paired" && (t.pairScope === "cross_team" ? " · other teams" : " · same team")}
            </span>
            <span className="text-xs font-mono font-bold text-cyan-200">+{t.points}</span>
            {t.verification === "staff" && <span className="text-[10px] font-mono uppercase text-amber-300 border border-amber-400/50 rounded px-1.5 py-0.5">staff check</span>}
            {!t.allowGhosts && <span className="text-[10px] font-mono uppercase text-slate-400 border border-slate-700 rounded px-1.5 py-0.5">no ghosts</span>}
            <span
              className={clsx(
                "text-[10px] font-mono uppercase rounded px-1.5 py-0.5 border",
                t.revealed ? "text-emerald-300 border-emerald-400/50" : "text-slate-400 border-slate-700",
              )}
            >
              {t.revealed ? "visible to players" : "hidden"}
            </span>
          </div>
          {t.description && <p className="text-sm text-slate-300 mt-1">{t.description}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" disabled={!canReveal} onClick={() => setRevealing(true)} title={t.revealed ? "Give it to more players" : "Show to players"}>
            <Eye className="w-3.5 h-3.5" /> {t.revealed ? "Assign more" : "Reveal"}
          </Button>
          {t.revealed && (
            <Button size="sm" variant="ghost" onClick={() => setConfirmHide(true)}>
              <EyeOff className="w-3.5 h-3.5" /> Hide
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit task">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {t.counts.total === 0 && (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete task">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <Alert>{error.message}</Alert>
        </div>
      )}

      {t.counts.total > 0 && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          <button onClick={() => setExpanded(!expanded)} className="mt-2 flex items-center gap-1 text-xs font-mono text-slate-300 hover:text-white">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {t.counts.completed}/{t.counts.total} done
            {t.counts.awaiting_partner > 0 && ` · ${t.counts.awaiting_partner} waiting for partner`}
            {t.counts.awaiting_verification > 0 && ` · ${t.counts.awaiting_verification} to check`}
            {t.counts.rejected > 0 && ` · ${t.counts.rejected} rejected`}
          </button>
          {expanded && (
            <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-sm">
              {t.assignments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-lg bg-slate-900/60 border border-slate-800 px-2.5 py-1.5">
                  {a.teamIds.map((id) => (
                    <span key={id} className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: teamColor.get(id) }} />
                  ))}
                  <span className="truncate text-slate-200">{a.names.join(" & ")}</span>
                  <span className={clsx("ml-auto text-[10px] font-mono uppercase whitespace-nowrap", a.status === "completed" ? "text-emerald-300" : "text-slate-400")}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {t.kind === "activity" && t.revealed && <p className="mt-2 text-xs text-slate-400">Shown to all players. Give points with a manual award.</p>}

      {revealing && <RevealModal task={t} snapshot={snapshot} onClose={() => setRevealing(false)} onDone={onChange} />}
      {editing && <TaskFormModal task={t} onClose={() => setEditing(false)} onDone={onChange} />}
      <ConfirmDialog
        open={confirmHide}
        title="Hide task?"
        message="Players won't see it any more and can't complete it. Points already earned stay. You can reveal it again later."
        confirmLabel="Hide"
        loading={busy}
        onCancel={() => setConfirmHide(false)}
        onConfirm={() => act(`/api/gm/tasks/${t.id}/hide`)}
      />
      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Delete task?"
        message={`“${t.title}” will be deleted.`}
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => act(`/api/gm/tasks/${t.id}`, "DELETE")}
      />
    </HudCard>
  );
}

function RevealModal({ task, snapshot, onClose, onDone }: { task: GMTaskView; snapshot: GMTasksSnapshot; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<"all" | "teams" | "players">("all");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [result, setResult] = useState<{ assignmentsCreated: number; unpaired: number } | null>(null);
  const teamName = new Map(snapshot.teams.map((t) => [t.id, t.name]));
  const q = search.trim().toLowerCase();
  const players = useMemo(() => snapshot.players.filter((p) => !q || p.name.toLowerCase().includes(q)), [snapshot.players, q]);
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const go = async () => {
    setLoading(true);
    setError(null);
    const body = mode === "teams" ? { teamIds } : mode === "players" ? { playerIds } : {};
    const r = await api<{ assignmentsCreated: number; unpaired: number }>(`/api/gm/tasks/${task.id}/reveal`, { body });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    setResult(r.data);
    onDone();
  };

  return (
    <Modal open onClose={onClose} title={task.revealed ? "Assign to more players" : "Reveal task"}>
      {result ? (
        <div className="space-y-3">
          <Alert kind="success">
            Done — {result.assignmentsCreated} new {task.kind === "team" ? "team assignment(s)" : task.kind === "paired" ? "pair(s)" : "assignment(s)"}.
            {task.kind === "activity" && " It's now shown to everyone."}
          </Alert>
          {result.unpaired > 0 && <Alert>{result.unpaired} player(s) couldn&apos;t be paired (no one suitable to pair with).</Alert>}
          <Button className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            <b className="text-white">{task.title}</b> — {KIND_INFO[task.kind].help}
          </p>
          {task.kind === "paired" && (
            <p className="text-xs text-slate-400">Partners are picked at random. Pressing this again later only pairs people who don&apos;t have a partner yet.</p>
          )}
          {task.kind !== "activity" && (
            <>
              <div className="flex flex-wrap gap-2">
                {(["all", "teams", ...(task.kind === "individual" ? ["players"] : [])] as const).map((m) => (
                  <Button key={m} size="sm" variant={mode === m ? "primary" : "ghost"} onClick={() => setMode(m as typeof mode)}>
                    {m === "all" ? "Everyone" : m === "teams" ? "Some teams" : "Some players"}
                  </Button>
                ))}
              </div>
              {mode === "teams" && (
                <div className="flex flex-wrap gap-2">
                  {snapshot.teams.map((t) => (
                    <label
                      key={t.id}
                      className={clsx("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer", teamIds.includes(t.id) ? "border-cyan-400 text-white" : "border-slate-700 text-slate-300")}
                    >
                      <input type="checkbox" checked={teamIds.includes(t.id)} onChange={() => setTeamIds(toggle(teamIds, t.id))} />
                      <span className="w-3 h-3 rounded-full" style={{ background: t.colorHex }} />
                      {t.name}
                    </label>
                  ))}
                </div>
              )}
              {mode === "players" && (
                <div>
                  <input className={`${inputClass} mb-2 py-2`} placeholder="Search name" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <ul className="max-h-56 overflow-y-auto divide-y divide-slate-800 rounded-lg border border-slate-800">
                    {players.map((p) => (
                      <li key={p.id}>
                        <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={playerIds.includes(p.id)} onChange={() => setPlayerIds(toggle(playerIds, p.id))} />
                          <span className="text-white">{p.name}</span>
                          <span className="text-slate-400 text-xs">{teamName.get(p.teamId)}</span>
                          {p.status === "ghost" && <span className="text-[10px] font-mono text-slate-500">ghost</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-400 mt-1">{playerIds.length} selected</p>
                </div>
              )}
            </>
          )}
          {error && <Alert>{error.message}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={loading}
              disabled={(mode === "teams" && teamIds.length === 0) || (mode === "players" && playerIds.length === 0)}
              onClick={go}
            >
              <Eye className="w-4 h-4" /> {task.revealed ? "Assign" : "Reveal now"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TaskFormModal({ task, onClose, onDone }: { task?: GMTaskView; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [kind, setKind] = useState<TaskKind>(task?.kind ?? "individual");
  const [points, setPoints] = useState(task ? String(task.points) : "");
  const [verification, setVerification] = useState<"none" | "staff">(task?.verification ?? "none");
  const [pairScope, setPairScope] = useState<"same_team" | "cross_team">(task?.pairScope ?? "same_team");
  const [allowGhosts, setAllowGhosts] = useState(task?.allowGhosts ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const save = async () => {
    setLoading(true);
    setError(null);
    const pts = points.trim() === "" ? undefined : Number(points);
    const body = task
      ? { title, description, points: pts, verification, allowGhosts }
      : { title, description, kind, points: pts, verification, allowGhosts, ...(kind === "paired" ? { pairScope } : {}) };
    const r = await api(task ? `/api/gm/tasks/${task.id}` : "/api/gm/tasks", { method: task ? "PATCH" : "POST", body });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    onDone();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={task ? "Edit task" : "New task"}>
      <div className="space-y-4">
        <Field label="Title" error={fieldError(error, "title")}>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Find someone born in the same month" maxLength={60} />
        </Field>
        <Field label="Description (optional)" error={fieldError(error, "description")}>
          <textarea className={`${inputClass} min-h-[64px]`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
        </Field>
        <Field label="Type" hint={KIND_INFO[kind].help}>
          <select className={inputClass} value={kind} disabled={!!task} onChange={(e) => setKind(e.target.value as TaskKind)}>
            {(Object.keys(KIND_INFO) as TaskKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_INFO[k].label}
              </option>
            ))}
          </select>
        </Field>
        {kind === "paired" && !task && (
          <Field label="Partners from">
            <select className={inputClass} value={pairScope} onChange={(e) => setPairScope(e.target.value as typeof pairScope)}>
              <option value="same_team">Their own team</option>
              <option value="cross_team">Other teams</option>
            </select>
          </Field>
        )}
        <Field label="Points (team)" hint={task ? undefined : `Leave empty for the default (${kind === "paired" ? 15 : 10}).`} error={fieldError(error, "points")}>
          <input className={inputClass} inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ""))} placeholder="10" />
        </Field>
        {kind !== "activity" && (
          <>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={verification === "staff"} onChange={(e) => setVerification(e.target.checked ? "staff" : "none")} />
              A Team Manager must check it before points are given
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={allowGhosts} onChange={(e) => setAllowGhosts(e.target.checked)} />
              Ghosts can do it too
            </label>
          </>
        )}
        {error && !error.details && <Alert>{error.message}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={save}>
            {task ? "Save" : "Create (hidden)"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
