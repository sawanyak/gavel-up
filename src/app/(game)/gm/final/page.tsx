"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { CheckCircle2, Circle, Download } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { useStaffMe } from "@/components/game/staff";
import { DisplayControl } from "@/components/game/gmControl";
import { FinalView, StatTile } from "@/components/game/final";
import { Alert, Button, ConfirmDialog, ConnectionBanner, HudCard, LoadingView, MessageView, PhaseChip } from "@/components/game/ui";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import { useGameState } from "@/lib/client/useGameState";
import type { FinalState, GMSnapshot } from "@/lib/shared/types";

type StepKey = "start" | "reveal-impostors" | "score-predictions" | "leaderboard" | "announce-winner" | "complete";

const STEPS: { key: StepKey; label: string; help: string; doneField: keyof FinalState }[] = [
  { key: "start", label: "Start final reveal", help: "Stops tasks, kills, voting and registration. Phones say “watch the big screen”.", doneField: "startedAt" },
  { key: "reveal-impostors", label: "Reveal the impostors", help: "Every impostor is shown on phones and the projector, with caught / escaped.", doneField: "impostorsRevealedAt" },
  { key: "score-predictions", label: "Score predictions", help: "Each team prediction gets its points (right / wrong).", doneField: "predictionsScoredAt" },
  { key: "leaderboard", label: "Show the final leaderboard", help: "Scores are frozen from here — no more points can be given.", doneField: "leaderboardShownAt" },
  { key: "announce-winner", label: "Announce the winner", help: "Winning team and “Impostors win” or “Crew wins”.", doneField: "winnerAnnouncedAt" },
  { key: "complete", label: "Finish & archive", help: "The game becomes read-only. Export a backup first!", doneField: "completedAt" },
];

export default function GMFinalPage() {
  const me = useStaffMe();
  const { data, error, connection, refresh } = useGameState<GMSnapshot>("/api/gm/state", 2000);
  const [busy, setBusy] = useState<StepKey | null>(null);
  const [confirm, setConfirm] = useState<StepKey | null>(null);
  const [tie, setTie] = useState<string[] | null>(null);
  const [actionError, setActionError] = useState<ApiErrorInfo | null>(null);

  if (error?.status === 403) return <MessageView title="Game Masters only" message="Your account is a Team Manager." actions={[{ label: "Go to my team", href: "/tm" }]} />;
  if (error?.status === 401) return <LoadingView label="Redirecting to login…" />;
  if (error) return <MessageView title="Error" message={error.message} />;
  if (!data) return <LoadingView />;

  const f = data.final ?? {};
  const nextIndex = STEPS.findIndex((s) => !f[s.doneField]);
  const canStart = data.game.phase === "PLAYING" && !data.meeting;

  const run = async (key: StepKey, body: unknown = {}) => {
    setBusy(key);
    setActionError(null);
    const r = await api<unknown>(`/api/gm/final/${key}`, { body });
    setBusy(null);
    setConfirm(null);
    if (!r.ok) {
      if (r.error.code === "WINNER_TIE") setTie((r.error.details as { tiedTeamIds: string[] }).tiedTeamIds);
      else setActionError(r.error);
    } else setTie(null);
    refresh();
  };
  const press = (key: StepKey) => (key === "start" || key === "complete" || key === "leaderboard" ? setConfirm(key) : run(key));

  return (
    <div className="space-y-5">
      <ConnectionBanner connection={connection} />
      {me && <StaffNav role={me.role} name={me.name} />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white">Final reveal</h1>
        <PhaseChip phase={data.game.phase} />
      </div>
      {actionError && <Alert>{actionError.message}</Alert>}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <HudCard variant="red" title="Steps — one click each, in order">
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const done = !!f[s.doneField];
              const isNext = i === nextIndex;
              const disabled = !isNext || (s.key === "start" && !canStart);
              return (
                <li key={s.key} className={clsx("rounded-xl border p-3", done ? "border-emerald-500/40 bg-emerald-950/20" : isNext ? "border-red-400/70 bg-red-950/30" : "border-slate-800 opacity-60")}>
                  <div className="flex items-start gap-3">
                    {done ? <CheckCircle2 className="w-5 h-5 text-emerald-300 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-500 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-bold text-white">
                        {i + 1}. {s.label}
                      </p>
                      <p className="text-xs text-slate-400">{s.help}</p>
                      {s.key === "start" && isNext && !canStart && (
                        <p className="text-xs text-amber-300 mt-1">{data.meeting ? "Finish the meeting and resume the game first." : "Available while the game is in progress."}</p>
                      )}
                      {s.key === "announce-winner" && tie && (
                        <div className="mt-2 space-y-2">
                          <p className="text-sm text-amber-300">Teams are tied for first. Pick the winner:</p>
                          <div className="flex flex-wrap gap-2">
                            {tie.map((id) => {
                              const t = data.teams.find((x) => x.id === id);
                              return (
                                <Button key={id} size="sm" onClick={() => run("announce-winner", { winningTeamIds: [id] })}>
                                  {t?.name ?? id}
                                </Button>
                              );
                            })}
                            <Button size="sm" variant="ghost" onClick={() => run("announce-winner", { winningTeamIds: tie })}>
                              Share it
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    {!done && (
                      <Button size="sm" variant={isNext ? "danger" : "ghost"} disabled={disabled} loading={busy === s.key} onClick={() => press(s.key)}>
                        Go
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </HudCard>

        <div className="space-y-5">
          <DisplayControl snapshot={data} onChange={refresh} />
          <HudCard title="Backup">
            <p className="text-sm text-slate-300 mb-3">Download a copy after the reveal, after the meeting and at the end (plan: backups).</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["/api/gm/export?format=json", "Full backup (JSON)"],
                ["/api/gm/export?format=csv&table=players", "Players (CSV)"],
                ["/api/gm/export?format=csv&table=transactions", "Points (CSV)"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  download
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-700 bg-slate-900/70 px-3 py-1.5 min-h-[44px] text-xs font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-white"
                >
                  <Download className="w-3.5 h-3.5" /> {label}
                </a>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Phone numbers are left out of these files.</p>
          </HudCard>
        </div>
      </div>

      {f.startedAt && (
        <div className="grid gap-5 lg:grid-cols-2">
          <FinalView final={f} />
          {f.stats && (
            <HudCard title="Stats">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatTile label="Players" value={f.stats.registered} />
                <StatTile label="Kills" value={f.stats.kills} />
                <StatTile label="Voted out" value={f.stats.voteEliminations} />
                <StatTile label="Impostors caught" value={f.stats.impostorsVotedOut} />
                <StatTile label="Vote turnout" value={`${f.stats.turnoutPct}%`} />
                <StatTile label="Tasks done" value={f.stats.tasksCompleted} />
                <StatTile label="Predictions" value={`${f.stats.predictionsCorrect}/${f.stats.predictionsMade}`} />
                <StatTile label="Detective questions" value={f.stats.investigations} />
                <StatTile label="Meetings" value={f.stats.meetingsHeld} />
              </div>
            </HudCard>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirm === "start"}
        danger
        typeToConfirm="FINAL"
        title="Start the final reveal?"
        message="Tasks, kills, voting and registration stop for everyone. This can't be undone."
        confirmLabel="Start"
        loading={busy === "start"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run("start", { confirm: "FINAL" })}
      />
      <ConfirmDialog
        open={confirm === "leaderboard"}
        title="Show the final leaderboard?"
        message="Scores freeze now. Give any last points (e.g. pending task checks) before continuing."
        confirmLabel="Show leaderboard"
        loading={busy === "leaderboard"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run("leaderboard")}
      />
      <ConfirmDialog
        open={confirm === "complete"}
        danger
        typeToConfirm="FINISH"
        title="Finish and archive?"
        message="The game becomes read-only for everyone. Download the backup first."
        confirmLabel="Finish"
        loading={busy === "complete"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run("complete", { confirm: "FINISH" })}
      />
    </div>
  );
}
