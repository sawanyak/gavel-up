"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Play, RotateCcw, Square, Trash2, XCircle } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { useStaffMe } from "@/components/game/staff";
import { Countdown } from "@/components/game/meeting";
import { Alert, Button, ConfirmDialog, ConnectionBanner, Field, HudCard, LoadingView, MessageView, Modal, PhaseChip, inputClass } from "@/components/game/ui";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import { useGameState } from "@/lib/client/useGameState";
import type { GMMeetingTeam, GMMeetingView, GMSnapshot } from "@/lib/shared/types";

const pollMs = (s: GMSnapshot | null) => (s?.meeting?.status === "VOTING" ? 1500 : 2000);

const STEP_LABEL: Record<string, string> = {
  CALLED: "1 · Discussion",
  VOTING: "2 · Voting open",
  CLOSED: "3 · Check results",
  RESULTS: "4 · Results shown",
  RESOLVED: "5 · Done",
};

export default function GMMeetingPage() {
  const me = useStaffMe();
  const { data, error, connection, refresh, serverOffset } = useGameState<GMSnapshot>("/api/gm/state", pollMs);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiErrorInfo | null>(null);
  const [confirm, setConfirm] = useState<null | "call" | "override" | "close" | "reveal" | "confirm" | "cancel">(null);
  const [duration, setDuration] = useState<string>("");
  const [reason, setReason] = useState("");

  if (error?.status === 403) return <MessageView title="Game Masters only" message="Your account is a Team Manager." actions={[{ label: "Go to my team", href: "/tm" }]} />;
  if (error?.status === 401) return <LoadingView label="Redirecting to login…" />;
  if (error) return <MessageView title="Error" message={error.message} />;
  if (!data) return <LoadingView />;

  const m = data.meeting;
  const run = async (key: string, path: string, body: unknown = {}) => {
    setBusy(key);
    setActionError(null);
    const r = await api(path, { body });
    setBusy(null);
    if (!r.ok) {
      if (r.error.code === "MEETING_LIMIT") setConfirm("override");
      else setActionError(r.error);
      refresh();
      return false;
    }
    setConfirm(null);
    refresh();
    return true;
  };
  const mp = (action: string) => `/api/gm/meetings/${m!.id}/${action}`;

  return (
    <div className="space-y-5">
      <ConnectionBanner connection={connection} />
      {me && <StaffNav role={me.role} name={me.name} />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white">Emergency meeting</h1>
        <PhaseChip phase={data.game.phase} />
        <span className="text-xs font-mono text-slate-400">
          {data.meetings.held}/{data.meetings.max} held
        </span>
        {data.staffOnline.filter((s) => s.role === "GM" && s.id !== me?.id).length > 0 && (
          <span className="text-xs font-mono text-amber-300">
            Also here: {data.staffOnline.filter((s) => s.role === "GM" && s.id !== me?.id).map((s) => s.name).join(", ")} — agree who presses the buttons
          </span>
        )}
      </div>

      {actionError && <Alert>{actionError.message}</Alert>}

      {!m && (
        <HudCard variant="red" title="No meeting running">
          {data.game.phase === "PLAYING" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">Calling a meeting sounds the alarm on every phone and pauses kills once voting opens.</p>
              <Button variant="danger" size="lg" onClick={() => setConfirm("call")}>
                <AlertTriangle className="w-5 h-5" /> Call emergency meeting
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Meetings can be called while the game is in progress (after roles are revealed).</p>
          )}
        </HudCard>
      )}

      {m && (
        <>
          <HudCard
            variant="red"
            title={`Meeting #${m.number} · ${STEP_LABEL[m.status] ?? m.status}`}
            right={m.status === "VOTING" && <Countdown endsAt={m.votingEndsAt} serverOffset={serverOffset} big />}
          >
            <div className="flex flex-wrap items-end gap-3">
              {m.status === "CALLED" && (
                <>
                  <Field label="Voting time (seconds)">
                    <input
                      className={`${inputClass} py-2 w-32`}
                      inputMode="numeric"
                      placeholder={String(data.meetings.votingDurationSec)}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value.replace(/[^\d]/g, ""))}
                    />
                  </Field>
                  <Button
                    variant="danger"
                    loading={busy === "open"}
                    onClick={() => run("open", mp("open-voting"), duration ? { durationSec: Number(duration) } : {})}
                  >
                    <Play className="w-4 h-4" /> Open voting
                  </Button>
                </>
              )}
              {m.status === "VOTING" && (
                <Button variant="danger" onClick={() => setConfirm("close")}>
                  <Square className="w-4 h-4" /> Close voting now
                </Button>
              )}
              {m.status === "CLOSED" && (
                <>
                  <Button variant="danger" onClick={() => setConfirm("reveal")} disabled={m.teams.some((t) => t.result && !t.result.decision)}>
                    Reveal results
                  </Button>
                  <Button variant="ghost" loading={busy === "reopen"} onClick={() => run("reopen", mp("reopen-voting"), { extraSec: 30 })}>
                    <RotateCcw className="w-4 h-4" /> Reopen voting +30s
                  </Button>
                  {m.teams.some((t) => t.result && !t.result.decision) && <span className="text-sm text-amber-300">Break every tie below before revealing.</span>}
                </>
              )}
              {m.status === "RESULTS" && (
                <Button variant="danger" onClick={() => setConfirm("confirm")}>
                  <CheckCircle2 className="w-4 h-4" /> Confirm eliminations & award points
                </Button>
              )}
              {m.status === "RESOLVED" && (
                <Button variant="success" size="lg" loading={busy === "resume"} onClick={() => run("resume", mp("resume"))}>
                  <Play className="w-4 h-4" /> Resume game
                </Button>
              )}
              {(m.status === "CALLED" || m.status === "VOTING") && (
                <Button variant="ghost" onClick={() => setConfirm("cancel")}>
                  <XCircle className="w-4 h-4" /> Cancel meeting
                </Button>
              )}
            </div>
            {m.status === "VOTING" && <p className="mt-3 text-xs text-slate-400">Voting closes by itself when the timer runs out. Kills are paused until the game resumes.</p>}
          </HudCard>

          <div className="grid gap-4 lg:grid-cols-2">
            {m.teams.map((t) => (
              <TeamCard key={t.teamId} meeting={m} team={t} onChange={refresh} />
            ))}
          </div>

          {(m.votes.length > 0 || m.predictions.length > 0) && <VotesAndPredictions meeting={m} snapshot={data} onChange={refresh} />}
        </>
      )}

      <ConfirmDialog
        open={confirm === "call" || confirm === "override"}
        danger
        title={confirm === "override" ? "Call another meeting?" : "Call emergency meeting?"}
        message={
          confirm === "override"
            ? `${data.meetings.held} of ${data.meetings.max} planned meeting(s) already happened. Call an extra one anyway?`
            : "The alarm goes off on every player's phone right away."
        }
        confirmLabel="Call meeting"
        loading={busy === "call"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run("call", "/api/gm/meetings", confirm === "override" ? { override: true } : {})}
      />
      <ConfirmDialog
        open={confirm === "close"}
        title="Close voting now?"
        message="Anyone who hasn't voted yet won't be able to (you can reopen it before revealing results)."
        confirmLabel="Close voting"
        loading={busy === "close"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run("close", mp("close-voting"))}
      />
      <ConfirmDialog
        open={confirm === "reveal"}
        title="Reveal results?"
        message="Every phone shows who was voted out in each team and whether they were an impostor."
        confirmLabel="Reveal"
        loading={busy === "reveal"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run("reveal", mp("reveal-results"))}
      />
      <ConfirmDialog
        open={confirm === "confirm"}
        danger
        typeToConfirm="CONFIRM"
        title="Confirm eliminations?"
        message="Voted-out players become ghosts and teams get their correct-vote points. This can't be undone from here."
        confirmLabel="Confirm"
        loading={busy === "confirm"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run("confirm", mp("confirm"), { confirm: "CONFIRM" })}
      />
      <Modal open={confirm === "cancel"} onClose={() => setConfirm(null)} title="Cancel meeting?" variant="red">
        <p className="text-sm text-slate-300 mb-3">Votes are thrown away and the game resumes. It won&apos;t count as one of the planned meetings.</p>
        <Field label="Reason">
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. called by mistake" />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Keep meeting
          </Button>
          <Button variant="danger" loading={busy === "cancel"} onClick={() => run("cancel", mp("cancel"), { reason })}>
            Cancel meeting
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TeamCard({ meeting: m, team: t, onChange }: { meeting: GMMeetingView; team: GMMeetingTeam; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const r = t.result;
  const max = Math.max(1, ...t.tally.map((x) => x.count), t.skipCount);

  const decide = async (eliminatePlayerId: string | null) => {
    setBusy(eliminatePlayerId ?? "none");
    setError(null);
    const res = await api(`/api/gm/meetings/${m.id}/decide`, { body: { teamId: t.teamId, eliminatePlayerId } });
    setBusy(null);
    if (!res.ok) setError(res.error);
    onChange();
  };

  return (
    <section className="rounded-2xl border-2 bg-slate-950/85 p-4" style={{ borderColor: t.colorHex }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono font-bold uppercase tracking-widest" style={{ color: t.colorHex === "#3F474E" ? "#94a3b8" : t.colorHex }}>
          {t.teamName}
        </h3>
        <span className="text-sm font-mono text-white">
          {t.voted.length}/{t.eligibleCount} voted
        </span>
      </div>

      {m.status !== "CALLED" && (
        <ul className="space-y-1.5 mb-3">
          {t.tally.map((x) => (
            <li key={x.playerId} className="text-sm">
              <div className="flex justify-between text-slate-200">
                <span>{x.name}</span>
                <span className="font-mono">{x.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-red-500" style={{ width: `${(x.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
          {t.tally.length === 0 && <li className="text-sm text-slate-500">No votes for anyone yet.</li>}
          {t.skipCount > 0 && <li className="text-xs text-slate-400">Skipped: {t.skipCount}</li>}
        </ul>
      )}

      {m.status === "VOTING" && t.notVoted.length > 0 && (
        <p className="text-xs text-slate-400">
          <b className="text-slate-300">Not voted:</b> {t.notVoted.map((p) => p.name).join(", ")}
        </p>
      )}
      {m.status === "CALLED" && <p className="text-xs text-slate-400">{t.eligibleCount} alive player(s) will be able to vote.</p>}

      {r && (
        <div className="mt-3 border-t border-slate-800 pt-3 space-y-2">
          {r.mostSkipped && <Alert kind="info">Most voters skipped. You may choose “Nobody”.</Alert>}
          {r.tie && !r.decision && (
            <>
              <p className="text-sm font-bold text-amber-300">Tie — you decide who is ejected:</p>
              <div className="flex flex-wrap gap-2">
                {r.topCandidates.map((c) => (
                  <Button key={c.id} size="sm" variant="danger" loading={busy === c.id} onClick={() => decide(c.id)}>
                    {c.name}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" loading={busy === "none"} onClick={() => decide(null)}>
                  Nobody
                </Button>
              </div>
            </>
          )}
          {r.decision && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-300">Ejected:</span>
              <b className="text-white">{r.decision.eliminated?.name ?? "Nobody"}</b>
              <span className="text-xs text-slate-500">({r.decision.decidedByName === "auto" ? "most votes" : `decided by ${r.decision.decidedByName}`})</span>
              {r.wasImpostor !== null && (
                <span className={clsx("font-black font-mono text-xs", r.wasImpostor ? "text-red-400" : "text-slate-400")}>
                  {r.wasImpostor ? "IMPOSTOR" : "not impostor"}
                </span>
              )}
              {m.status === "CLOSED" && r.decision.eliminated && (
                <Button size="sm" variant="ghost" className="ml-auto" loading={busy === "none"} onClick={() => decide(null)}>
                  Overrule: nobody
                </Button>
              )}
            </div>
          )}
          {error && <Alert>{error.message}</Alert>}
        </div>
      )}
    </section>
  );
}

function VotesAndPredictions({ meeting: m, snapshot, onChange }: { meeting: GMMeetingView; snapshot: GMSnapshot; onChange: () => void }) {
  const [removing, setRemoving] = useState<{ kind: "votes" | "predictions"; id: string; label: string } | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const teamName = new Map(snapshot.teams.map((t) => [t.id, t.name]));
  const canRemoveVotes = m.status === "VOTING" || m.status === "CLOSED";

  const remove = async () => {
    if (!removing) return;
    setLoading(true);
    setError(null);
    const r = await api(`/api/gm/${removing.kind}/${removing.id}/invalidate`, { body: { reason } });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    setRemoving(null);
    setReason("");
    onChange();
  };

  return (
    <HudCard title="Votes & predictions (GM only)" variant="plain">
      <details>
        <summary className="cursor-pointer text-sm text-slate-300">
          {m.votes.length} vote(s), {m.predictions.length} prediction(s) — show
        </summary>
        <div className="grid gap-4 md:grid-cols-2 mt-3">
          <ul className="text-sm divide-y divide-slate-800">
            {m.votes.map((v) => (
              <li key={v.id} className="flex items-center gap-2 py-1.5">
                <span className="text-slate-500 text-xs w-14 shrink-0">{teamName.get(v.teamId)}</span>
                <span className="text-slate-200 truncate">
                  {v.voterName} → {v.targetName ?? <i className="text-slate-400">skip</i>}
                </span>
                {canRemoveVotes && (
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setRemoving({ kind: "votes", id: v.id, label: `${v.voterName}'s vote` })}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <ul className="text-sm divide-y divide-slate-800">
            {m.predictions.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-1.5">
                <span className="text-slate-200 truncate">
                  {p.predictorName} ({p.predictorTeamName}) → {p.targetName} ({p.targetTeamName})
                </span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setRemoving({ kind: "predictions", id: p.id, label: `${p.predictorName}'s prediction` })}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </Button>
              </li>
            ))}
            {m.predictions.length === 0 && <li className="py-1.5 text-slate-500">No predictions.</li>}
          </ul>
        </div>
      </details>
      <Modal open={!!removing} onClose={() => setRemoving(null)} title="Remove?">
        <p className="text-sm text-slate-300 mb-3">
          Remove <b className="text-white">{removing?.label}</b>? They (or their team) can then {removing?.kind === "votes" ? "vote" : "predict"} again while voting is open.
        </p>
        <Field label="Reason" error={error?.message}>
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. voted on the wrong phone" />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            Keep
          </Button>
          <Button variant="danger" loading={loading} onClick={remove}>
            Remove
          </Button>
        </div>
      </Modal>
    </HudCard>
  );
}
