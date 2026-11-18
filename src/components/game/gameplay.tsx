"use client";

import React, { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, CheckCircle2, Clock, Ghost, HeartPulse, Megaphone, Pin, Skull, Trophy, Undo2, Users, X } from "lucide-react";
import { CrewmateVector } from "@/components/CrewmateVector";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import { sounds } from "@/lib/sounds";
import type { AnnouncementView, PlayerSnapshot, PlayerTask, VerificationItem } from "@/lib/shared/types";
import { Alert, Button, ConfirmDialog, Field, HudCard, Modal, inputClass } from "./ui";

/* ───────────────────────── Player: tasks ───────────────────────── */

const STATUS_ORDER: Record<PlayerTask["status"], number> = { rejected: 0, open: 1, awaiting_partner: 2, awaiting_verification: 3, completed: 4 };

export function TaskList({ tasks, activities, onChange }: { tasks: PlayerTask[]; activities: PlayerSnapshot["activities"]; onChange: () => void }) {
  const [confirming, setConfirming] = useState<PlayerTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  if (tasks.length === 0 && activities.length === 0) return null;
  const sorted = [...tasks].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const doneCount = tasks.filter((t) => t.status === "completed").length;

  const submit = async (t: PlayerTask) => {
    setLoading(true);
    setError(null);
    const r = await api<{ assignment: { status: string } }>(`/api/player/tasks/${t.assignmentId}/complete`, { method: "POST" });
    setLoading(false);
    setConfirming(null);
    if (!r.ok) return setError(r.error);
    if (r.data.assignment.status === "completed") sounds.playTaskComplete();
    onChange();
  };

  return (
    <HudCard title="Tasks" right={tasks.length > 0 && <span className="text-xs font-mono text-slate-400">{doneCount}/{tasks.length} done</span>}>
      {error && (
        <div className="mb-3">
          <Alert>{error.message}</Alert>
        </div>
      )}
      <ul className="space-y-3">
        {sorted.map((t) => (
          <TaskCard key={t.assignmentId} task={t} onDo={() => setConfirming(t)} />
        ))}
      </ul>

      {activities.length > 0 && (
        <div className={clsx(tasks.length > 0 && "mt-5")}>
          <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2">Activities — points given by staff</p>
          <ul className="space-y-2">
            {activities.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-white">{a.title}</p>
                  {a.points > 0 && <span className="text-xs font-mono font-bold text-cyan-200 whitespace-nowrap">up to +{a.points}</span>}
                </div>
                {a.description && <p className="text-sm text-slate-300 mt-1">{a.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!confirming}
        title={confirming?.kind === "paired" ? "Confirm with your partner" : "Mark as done?"}
        confirmLabel={confirming?.kind === "paired" ? "Yes, we did it" : "Done"}
        loading={loading}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && submit(confirming)}
        message={
          confirming && (
            <>
              <b className="text-white">{confirming.title}</b>
              {confirming.kind === "paired" && confirming.partner && (
                <p className="mt-2">
                  Both you and <b className="text-white">{confirming.partner.name}</b> have to confirm on your own phones before the points count.
                </p>
              )}
              {confirming.verification === "staff" && <p className="mt-2">A Team Manager will check it before the points are given.</p>}
              <p className="mt-2 text-xs text-slate-400">Only confirm tasks you really did — staff can see who confirmed.</p>
            </>
          )
        }
      />
    </HudCard>
  );
}

function TaskCard({ task: t, onDo }: { task: PlayerTask; onDo: () => void }) {
  const waitingOnPartner = t.status === "awaiting_partner" && t.confirmedByMe;
  const partnerAsked = t.status === "awaiting_partner" && !t.confirmedByMe;
  return (
    <li
      className={clsx(
        "rounded-xl border-2 p-3",
        t.status === "completed" ? "border-emerald-500/40 bg-emerald-950/20" : partnerAsked ? "border-amber-400/70 bg-amber-950/20" : "border-slate-700 bg-slate-900/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={clsx("font-semibold", t.status === "completed" ? "text-emerald-200" : "text-white")}>{t.title}</p>
          {t.partner && (
            <p className="text-xs mt-0.5 text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> with <b className="text-white">{t.partner.name}</b>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: t.partner.colorHex }} />
              <span className="text-slate-400">{t.partner.teamName}</span>
            </p>
          )}
          {t.kind === "team" && <p className="text-xs mt-0.5 text-slate-400">Team task — anyone in your team can complete it</p>}
        </div>
        <span className="text-xs font-mono font-bold text-cyan-200 whitespace-nowrap">+{t.points}</span>
      </div>
      {t.description && <p className="text-sm text-slate-300 mt-1.5">{t.description}</p>}

      <div className="mt-3">
        {t.status === "completed" && (
          <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
            <CheckCircle2 className="w-4 h-4" /> Done · +{t.points} for your team
          </p>
        )}
        {t.status === "awaiting_verification" && (
          <p className="flex items-center gap-1.5 text-sm text-amber-200">
            <Clock className="w-4 h-4" /> Waiting for a Team Manager to check it
          </p>
        )}
        {waitingOnPartner && (
          <p className="flex items-center gap-1.5 text-sm text-amber-200">
            <Clock className="w-4 h-4" /> Waiting for {t.partner?.name ?? "your partner"} to confirm on their phone
          </p>
        )}
        {t.status === "rejected" && (
          <div className="mb-2">
            <Alert>Not accepted{t.rejectReason ? `: ${t.rejectReason}` : ""}. You can try again.</Alert>
          </div>
        )}
        {(t.status === "open" || t.status === "rejected" || partnerAsked) && (
          <Button size="sm" variant={partnerAsked ? "success" : "primary"} onClick={onDo} className="w-full sm:w-auto">
            <Check className="w-4 h-4" />
            {partnerAsked ? `${t.partner?.name ?? "Partner"} confirmed — confirm too` : t.status === "rejected" ? "Try again" : t.kind === "paired" ? "We did it" : "Mark done"}
          </Button>
        )}
      </div>
    </li>
  );
}

/* ───────────────────────── Announcements ───────────────────────── */

/** Shows announcements; plays a sound when a new one arrives (not on first load). */
export function AnnouncementList({ announcements, compact }: { announcements: AnnouncementView[]; compact?: boolean }) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(announcements.map((a) => a.id));
    if (seen.current) {
      const fresh = announcements.filter((a) => !seen.current!.has(a.id));
      if (fresh.length) {
        sounds.playStart();
        if (fresh.some((a) => a.level === "alert")) navigator.vibrate?.([200, 100, 200]);
      }
    }
    seen.current = ids;
  }, [announcements]);

  if (announcements.length === 0) return null;
  return (
    <div className="space-y-2">
      {announcements.map((a) => (
        <div
          key={a.id}
          className={clsx(
            "rounded-xl border-2 px-4 py-3 flex items-start gap-3",
            a.level === "alert" ? "border-red-500/70 bg-red-950/60" : "border-cyan-500/40 bg-cyan-950/40",
            compact && "py-2",
          )}
        >
          {a.pinned ? (
            <Pin className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
          ) : (
            <Megaphone className={clsx("w-4 h-4 mt-0.5 shrink-0", a.level === "alert" ? "text-red-300" : "text-cyan-300")} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white whitespace-pre-wrap break-words">{a.text}</p>
            <p className="text-[10px] font-mono text-slate-400 mt-1">
              {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {a.teamId && " · your team only"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Ghost ───────────────────────── */

export function GhostBanner({ teamKey }: { teamKey: string }) {
  return (
    <section className="rounded-2xl border-2 border-slate-600 bg-slate-900/90 p-4 flex items-center gap-4">
      <CrewmateVector color={teamKey as never} size={60} isDead />
      <div>
        <h2 className="flex items-center gap-2 font-mono font-black uppercase tracking-widest text-slate-200">
          <Ghost className="w-5 h-5" /> You&apos;re a ghost
        </h2>
        <p className="text-sm text-slate-300 mt-1">You were eliminated. You can still do tasks to earn points for your team, but you can&apos;t vote.</p>
        <p className="text-xs text-slate-400 mt-1">Don&apos;t tell anyone who got you!</p>
      </div>
    </section>
  );
}

/* ───────────────────────── Staff: kill / revive ───────────────────────── */

export function KillButton({ player, onDone, size = "sm" }: { player: { id: string; name: string }; onDone: () => void; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const go = async () => {
    setLoading(true);
    setError(null);
    const r = await api(`/api/staff/players/${player.id}/kill`, { body: note.trim() ? { note } : {} });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    setOpen(false);
    setNote("");
    onDone();
  };
  return (
    <>
      <Button size={size} variant="ghost" onClick={() => setOpen(true)} title="Mark killed (sticker)" aria-label={`Mark ${player.name} killed`}>
        <Skull className="w-3.5 h-3.5 text-red-400" />
        {size === "md" && "Killed"}
      </Button>
      <ConfirmDialog
        open={open}
        danger
        title="Mark as killed?"
        confirmLabel="Mark killed"
        loading={loading}
        onCancel={() => setOpen(false)}
        onConfirm={go}
        message={
          <>
            <b className="text-white">{player.name}</b> becomes a <b>ghost</b>: they can still do tasks but can&apos;t vote. Check the sticker first. Only a Game Master can undo this.
          </>
        }
      >
        <Field label="Note (optional)" error={error?.message}>
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. sticker on back, near stage" maxLength={120} />
        </Field>
      </ConfirmDialog>
    </>
  );
}

export function ReviveButton({ player, onDone }: { player: { id: string; name: string }; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const go = async () => {
    setLoading(true);
    setError(null);
    const r = await api(`/api/gm/players/${player.id}/revive`, { body: { reason } });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    setOpen(false);
    setReason("");
    onDone();
  };
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="Undo kill" aria-label={`Revive ${player.name}`}>
        <HeartPulse className="w-3.5 h-3.5 text-emerald-300" />
      </Button>
      <ConfirmDialog
        open={open}
        title="Undo kill?"
        confirmLabel="Revive"
        loading={loading}
        onCancel={() => setOpen(false)}
        onConfirm={go}
        message={
          <>
            <b className="text-white">{player.name}</b> becomes alive again. Recorded in the audit log.
          </>
        }
      >
        <Field label="Reason" error={error?.message}>
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. marked the wrong person" maxLength={120} />
        </Field>
      </ConfirmDialog>
    </>
  );
}

/* ───────────────────────── Staff: verification queue ───────────────────────── */

export function VerificationQueue({ items, onChange }: { items: VerificationItem[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<VerificationItem | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const decide = async (item: VerificationItem, approve: boolean, why?: string) => {
    setBusy(item.id);
    setError(null);
    const r = await api(`/api/staff/task-assignments/${item.id}/verify`, { body: { approve, ...(why ? { reason: why } : {}) } });
    setBusy(null);
    if (!r.ok) setError(r.error);
    setRejecting(null);
    setReason("");
    onChange();
  };

  return (
    <HudCard title="Tasks to check" variant={items.length ? "red" : "plain"} right={<span className="text-xs font-mono text-slate-400">{items.length} waiting</span>}>
      {error && (
        <div className="mb-3">
          <Alert>{error.message}</Alert>
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-3">Nothing to check right now.</p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {items.map((i) => (
            <li key={i.id} className="py-2.5 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{i.taskTitle}</p>
                <p className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
                  {i.teams.map((t) => (
                    <span key={t.id} className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: t.colorHex }} />
                  ))}
                  {i.playerNames.join(" & ")} · +{i.points}
                  {i.rejectedCount > 0 && <span className="text-amber-300">· retry #{i.rejectedCount}</span>}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="success" loading={busy === i.id} onClick={() => decide(i, true)}>
                  <Check className="w-4 h-4" /> Approve
                </Button>
                <Button size="sm" variant="ghost" disabled={busy === i.id} onClick={() => setRejecting(i)}>
                  <X className="w-4 h-4" /> Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject task">
        <p className="text-sm text-slate-300 mb-3">
          The player sees your reason and can try again. <b className="text-white">{rejecting?.taskTitle}</b> — {rejecting?.playerNames.join(" & ")}
        </p>
        <Field label="Reason (shown to the player)">
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. show us the photo first" maxLength={120} />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setRejecting(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={!!rejecting && busy === rejecting.id} onClick={() => rejecting && decide(rejecting, false, reason.trim() || undefined)}>
            <Undo2 className="w-4 h-4" /> Reject
          </Button>
        </div>
      </Modal>
    </HudCard>
  );
}

/** Small score pill used on dashboards. */
export function ScorePill({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-950/40 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-200">
      <Trophy className="w-3.5 h-3.5" /> {score} pts
    </span>
  );
}
