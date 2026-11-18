"use client";

import React from "react";
import { clsx } from "clsx";
import { Crown, Search, Trophy } from "lucide-react";
import { CrewmateVector, type CrewmateColor } from "@/components/CrewmateVector";
import type { FinalState, LeaderboardRow } from "@/lib/shared/types";
import { HudCard } from "./ui";

/** Final reveal on a phone or the TM page. Each block appears only after the GM's step. */
export function FinalView({ final: f, myTeamId }: { final: FinalState; myTeamId?: string }) {
  const winners = new Set(f.winningTeamIds ?? []);
  const winnerRows = (f.leaderboard ?? []).filter((r) => winners.has(r.teamId));

  return (
    <div className="space-y-4">
      {f.winnerAnnouncedAt && <WinnerBanner rows={winnerRows} impostorsWin={!!f.impostorsWin} votedOut={f.impostorsVotedOut ?? 0} threshold={f.threshold ?? 2} myTeamId={myTeamId} />}

      {!f.impostorsRevealedAt && (
        <HudCard variant="red" title="Final reveal">
          <p className="text-center text-white font-bold py-3">The final reveal has started — watch the big screen!</p>
        </HudCard>
      )}

      {f.impostors && (
        <HudCard variant="red" title="The impostors were…">
          <ul className="space-y-2">
            {f.impostors.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/30 px-3 py-2">
                <span className="w-3 h-3 rounded-full" style={{ background: i.colorHex }} />
                <span className="flex-1 font-bold text-white">{i.name}</span>
                <span className="text-xs text-slate-300">{i.teamName}</span>
                {i.votedOut ? (
                  <span className="text-[10px] font-mono uppercase text-emerald-300 border border-emerald-400/50 rounded px-1">caught</span>
                ) : (
                  <span className="text-[10px] font-mono uppercase text-red-300 border border-red-400/50 rounded px-1">escaped</span>
                )}
              </li>
            ))}
            {f.impostors.length === 0 && <li className="text-slate-400 text-sm">There were no impostors.</li>}
          </ul>
        </HudCard>
      )}

      {f.predictionResults && f.predictionResults.length > 0 && (
        <HudCard title="Predictions" right={<Search className="w-4 h-4 text-amber-300" />}>
          <ul className="space-y-1.5 text-sm">
            {f.predictionResults.map((p) => (
              <li key={p.id} className={clsx("flex items-center gap-2", p.predictorTeamId === myTeamId ? "text-white font-semibold" : "text-slate-300")}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.predictorColorHex }} />
                <span className="flex-1 min-w-0 truncate">
                  {p.predictorTeamName} guessed {p.targetName} ({p.targetTeamName})
                </span>
                <span className={clsx("font-mono font-bold", p.correct ? "text-emerald-300" : "text-red-300")}>
                  {p.correct ? "✓" : "✗"} {p.amount > 0 ? `+${p.amount}` : p.amount}
                </span>
              </li>
            ))}
          </ul>
        </HudCard>
      )}

      {f.leaderboard && <FinalBoard rows={f.leaderboard} winners={winners} myTeamId={myTeamId} />}
    </div>
  );
}

export function WinnerBanner({
  rows,
  impostorsWin,
  votedOut,
  threshold,
  myTeamId,
}: {
  rows: LeaderboardRow[];
  impostorsWin: boolean;
  votedOut: number;
  threshold: number;
  myTeamId?: string;
}) {
  const mine = rows.some((r) => r.teamId === myTeamId);
  return (
    <section className="rounded-2xl border-2 border-amber-400/70 bg-gradient-to-b from-amber-950/70 to-slate-950/90 p-5 text-center shadow-[0_0_40px_rgba(251,191,36,0.35)]">
      <Crown className="w-10 h-10 mx-auto text-amber-300" />
      <p className="mt-1 text-xs font-mono uppercase tracking-widest text-amber-200">{rows.length > 1 ? "Winning teams" : "Winning team"}</p>
      <div className="flex flex-wrap justify-center gap-4 my-3">
        {rows.map((r) => (
          <div key={r.teamId} className="flex flex-col items-center">
            <CrewmateVector color={r.key as CrewmateColor} size={64} />
            <p className="text-2xl font-black" style={{ color: r.colorHex }}>
              {r.name}
            </p>
            <p className="text-sm font-mono text-amber-100">{r.score} pts</p>
          </div>
        ))}
      </div>
      {mine && <p className="text-emerald-300 font-bold">That&apos;s your team — congratulations! 🎉</p>}
      <p className={clsx("mt-3 text-xl font-black font-mono tracking-widest", impostorsWin ? "text-red-400" : "text-cyan-300")}>
        {impostorsWin ? "IMPOSTORS WIN" : "CREW WINS"}
      </p>
      <p className="text-xs text-slate-400">
        {votedOut} impostor{votedOut === 1 ? " was" : "s were"} voted out (the crew needed {threshold}).
      </p>
    </section>
  );
}

function FinalBoard({ rows, winners, myTeamId }: { rows: LeaderboardRow[]; winners: Set<string>; myTeamId?: string }) {
  return (
    <HudCard title="Final leaderboard" right={<Trophy className="w-4 h-4 text-amber-300" />}>
      <ol className="space-y-1.5">
        {rows.map((r) => (
          <li
            key={r.teamId}
            className={clsx("flex items-center gap-3 rounded-xl border px-3 py-2", r.teamId === myTeamId ? "border-cyan-400/70 bg-cyan-500/10" : "border-slate-800 bg-slate-900/60")}
          >
            <span className="w-6 text-center font-mono font-black text-slate-300">{r.rank}</span>
            <span className="w-3 h-3 rounded-full" style={{ background: r.colorHex }} />
            <span className="flex-1 font-bold text-white">{r.name}</span>
            {winners.has(r.teamId) && <Crown className="w-4 h-4 text-amber-300" />}
            <span className="font-mono font-black text-amber-200">{r.score}</span>
          </li>
        ))}
      </ol>
    </HudCard>
  );
}

export function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-center">
      <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
}
