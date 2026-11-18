"use client";

import React, { useEffect, useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Clock, Lock, Search, SkipForward, Vote as VoteIcon } from "lucide-react";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import { sounds } from "@/lib/sounds";
import type { MeetingTeamOutcome, PlayerMeetingView } from "@/lib/shared/types";
import { Alert, Button, ConfirmDialog, HudCard } from "./ui";

/* ───────────────────────── Countdown ───────────────────────── */

/** Server-synced countdown: remaining = endsAt − (Date.now() + serverOffset). */
export function useRemaining(endsAt: string | null, serverOffset: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - (now + serverOffset)) / 1000));
}

export function Countdown({ endsAt, serverOffset, big }: { endsAt: string | null; serverOffset: number; big?: boolean }) {
  const s = useRemaining(endsAt, serverOffset);
  if (s === null) return null;
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-mono font-black tabular-nums",
        big ? "text-4xl" : "text-lg",
        s <= 10 ? "text-red-400 animate-pulse" : s <= 30 ? "text-amber-300" : "text-white",
      )}
    >
      <Clock className={big ? "w-8 h-8" : "w-4 h-4"} /> {mm}:{ss}
    </span>
  );
}

/* ───────────────────────── Alarm overlay ───────────────────────── */

/** Full-screen red alarm, once per meeting per device. */
export function EmergencyOverlay({ meeting }: { meeting: PlayerMeetingView | null }) {
  const [show, setShow] = useState(false);
  const key = meeting ? `gu_seenMeeting:${meeting.id}` : null;
  useEffect(() => {
    if (!key || !meeting || !["CALLED", "VOTING"].includes(meeting.status)) return;
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
    } catch {
      /* private mode */
    }
    if (!seen) {
      setShow(true);
      sounds.playEmergency();
      navigator.vibrate?.([400, 150, 400, 150, 400]);
    }
  }, [key, meeting]);
  if (!show || !meeting) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(key!, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-red-950/95 p-6 text-center animate-[fadeIn_0.3s_ease-out]">
      <AlertTriangle className="w-24 h-24 text-red-400 animate-pulse" />
      <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-widest text-white drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]">
        EMERGENCY
        <br />
        MEETING
      </h1>
      <p className="text-lg text-red-100 max-w-sm">Stop what you&apos;re doing and gather with your team. Discuss who you think the impostor is.</p>
      <Button variant="danger" size="lg" onClick={dismiss}>
        Go to the meeting
      </Button>
    </div>
  );
}

/* ───────────────────────── Meeting panel ───────────────────────── */

export function MeetingPanel({ meeting: m, serverOffset, onChange }: { meeting: PlayerMeetingView; serverOffset: number; onChange: () => void }) {
  return (
    <HudCard
      variant="red"
      title={`Emergency meeting #${m.number}`}
      right={m.status === "VOTING" ? <Countdown endsAt={m.votingEndsAt} serverOffset={serverOffset} /> : undefined}
    >
      {m.status === "CALLED" && (
        <div className="text-center space-y-2 py-2">
          <p className="text-white font-bold">Gather with your team and discuss.</p>
          <p className="text-sm text-slate-300">Voting opens on this screen when the hosts start it. Keep this page open.</p>
        </div>
      )}
      {m.status === "VOTING" && <VotingView m={m} onChange={onChange} />}
      {m.status === "CLOSED" && (
        <div className="text-center space-y-2 py-2">
          <p className="text-white font-bold">Voting is closed.</p>
          <p className="text-sm text-slate-300">{m.me.hasVoted ? "Your vote was counted." : "You didn't vote."} Waiting for the hosts to reveal the results…</p>
        </div>
      )}
      {(m.status === "RESULTS" || m.status === "RESOLVED") && m.results && <ResultsView m={m} />}
    </HudCard>
  );
}

function VotingView({ m, onChange }: { m: PlayerMeetingView; onChange: () => void }) {
  const [choice, setChoice] = useState<{ id: string | null; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const cast = async () => {
    if (!choice) return;
    setLoading(true);
    setError(null);
    // Retries are safe: the server returns the same vote.
    let r = await api(`/api/player/votes`, { body: { meetingId: m.id, targetId: choice.id } });
    if (!r.ok && (r.status === 0 || r.status === 503)) r = await api(`/api/player/votes`, { body: { meetingId: m.id, targetId: choice.id } });
    setLoading(false);
    setChoice(null);
    if (!r.ok) return setError(r.error);
    navigator.vibrate?.(80);
    onChange();
  };

  return (
    <div className="space-y-4">
      {!m.me.eligible ? (
        <Alert kind="info">
          {m.me.notEligibleReason === "ghost" ? "Ghosts can't vote. You can still listen in and do tasks." : "You joined after voting opened, so you can't vote in this meeting."}
        </Alert>
      ) : m.me.hasVoted ? (
        <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-500/50 bg-emerald-950/40 p-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-300 shrink-0" />
          <div>
            <p className="font-bold text-emerald-200">Vote recorded ✓</p>
            <p className="text-sm text-slate-300">{m.me.skipped ? "You skipped." : `You voted for ${m.me.votedFor?.name}.`} Votes are final.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-200">
            Who in <b>your team</b> is the impostor? <span className="text-slate-400">One vote, final.</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {m.candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => setChoice({ id: c.id, name: c.name })}
                className="min-h-[52px] rounded-xl border-2 border-slate-700 bg-slate-900/80 px-4 py-3 text-left font-bold text-white hover:border-red-400 active:scale-[0.98] transition"
              >
                <VoteIcon className="inline w-4 h-4 mr-2 text-red-300" />
                {c.name}
              </button>
            ))}
          </div>
          {m.allowSkip && (
            <Button variant="ghost" className="w-full" onClick={() => setChoice({ id: null, name: "" })}>
              <SkipForward className="w-4 h-4" /> Skip vote
            </Button>
          )}
        </>
      )}
      {error && <Alert>{error.message}</Alert>}
      <p className="text-center text-xs font-mono text-slate-400">
        Your team: {m.teamProgress.voted}/{m.teamProgress.eligible} voted
      </p>

      {m.me.eligible && m.predictions.enabled && m.predictions.otherTeams.length > 0 && <PredictionsView m={m} onChange={onChange} />}

      <ConfirmDialog
        open={!!choice}
        danger={choice?.id !== null}
        title={choice?.id ? "Confirm your vote" : "Skip your vote?"}
        confirmLabel={choice?.id ? `Vote ${choice.name}` : "Skip"}
        loading={loading}
        onCancel={() => setChoice(null)}
        onConfirm={cast}
        message={choice?.id ? <>Vote for <b className="text-white">{choice.name}</b>? You can&apos;t change it afterwards.</> : "You won't vote in this meeting. This can't be undone."}
      />
    </div>
  );
}

function PredictionsView({ m, onChange }: { m: PlayerMeetingView; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<{ teamId: string; teamName: string; id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const { correct, wrong } = m.predictions.points;

  const submit = async () => {
    if (!pick) return;
    setLoading(true);
    setError(null);
    const r = await api(`/api/player/predictions`, { body: { meetingId: m.id, targetTeamId: pick.teamId, targetPlayerId: pick.id } });
    setLoading(false);
    setPick(null);
    if (!r.ok) setError(r.error);
    onChange();
  };

  return (
    <div className="rounded-xl border-2 border-amber-400/40 bg-amber-950/20 p-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
        <span className="flex items-center gap-2 font-mono font-bold uppercase tracking-wider text-amber-200 text-sm">
          <Search className="w-4 h-4" /> Predict other teams (optional)
        </span>
        <span className="text-xs text-amber-200/80">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-300">
            Right: <b className="text-emerald-300">+{correct}</b> for your team. Wrong: <b className="text-red-300">{wrong}</b>. The first teammate to predict a team locks it for everyone in
            your team, so agree first!
          </p>
          {error && <Alert>{error.message}</Alert>}
          {m.predictions.otherTeams.map((t) => (
            <div key={t.teamId}>
              <p className="text-xs font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: t.colorHex }}>
                {t.name} team
              </p>
              {t.locked ? (
                <p className="flex items-center gap-1.5 text-sm text-slate-200">
                  <Lock className="w-4 h-4 text-amber-300" />
                  {t.locked.byMe ? "You" : t.locked.byName} predicted <b>{t.locked.targetName}</b>
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {t.candidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setPick({ teamId: t.teamId, teamName: t.name, id: c.id, name: c.name })}
                      className="rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white hover:border-amber-300"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!pick}
        title="Lock in prediction?"
        confirmLabel="Lock it in"
        loading={loading}
        onCancel={() => setPick(null)}
        onConfirm={submit}
        message={
          pick && (
            <>
              Predict <b className="text-white">{pick.name}</b> as the impostor of the <b>{pick.teamName}</b> team? This locks it for your whole team. Right: +{correct}, wrong: {wrong}.
              Results are revealed at the end of the game.
            </>
          )
        }
      />
    </div>
  );
}

export function TeamOutcome({ t }: { t: MeetingTeamOutcome }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: t.colorHex }} />
      <span className="font-mono text-xs uppercase tracking-wider text-slate-300 w-16 shrink-0">{t.teamName}</span>
      {t.eliminated ? (
        <span className="text-sm text-white">
          <b>{t.eliminated.name}</b>{" "}
          {t.eliminated.wasImpostor ? <span className="font-black text-red-400">WAS AN IMPOSTOR</span> : <span className="text-slate-400">was not an impostor</span>}
        </span>
      ) : (
        <span className="text-sm text-slate-400">Nobody was ejected</span>
      )}
    </li>
  );
}

function ResultsView({ m }: { m: PlayerMeetingView }) {
  const r = m.results!;
  const max = Math.max(1, ...r.myTeam.tally.map((t) => t.count), r.myTeam.skipCount);
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {r.teams.map((t) => (
          <TeamOutcome key={t.teamId} t={t} />
        ))}
      </ul>
      <div>
        <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2">Your team&apos;s votes</p>
        <ul className="space-y-1.5">
          {r.myTeam.tally.map((t) => (
            <li key={t.name} className="text-sm">
              <div className="flex justify-between text-slate-200">
                <span>{t.name}</span>
                <span className="font-mono">{t.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-red-500" style={{ width: `${(t.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
          <li className="text-xs text-slate-400">
            Skipped: {r.myTeam.skipCount} · Didn&apos;t vote: {r.myTeam.notVotedCount}
          </li>
        </ul>
      </div>
      {m.status === "RESULTS" && <p className="text-center text-xs text-slate-400">The hosts will confirm the results and resume the game shortly.</p>}
    </div>
  );
}
