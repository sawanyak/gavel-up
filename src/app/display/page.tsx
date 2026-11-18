"use client";

import React, { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, Crown, Maximize, Megaphone, Volume2 } from "lucide-react";
import { CrewmateVector, type CrewmateColor } from "@/components/CrewmateVector";
import { GavelUpTitle } from "@/components/GavelUpTitle";
import { SpaceBackground } from "@/components/SpaceBackground";
import { Countdown } from "@/components/game/meeting";
import { useGameState } from "@/lib/client/useGameState";
import { sounds } from "@/lib/sounds";
import type { DisplaySnapshot, LeaderboardRow } from "@/lib/shared/types";

/**
 * Projector (plan §8.6). Public, no login, safe data only. The GM picks the screen.
 * Sound is off until someone clicks "Enable sound" on the projector laptop.
 */
export default function DisplayPage() {
  const { data, error, serverOffset } = useGameState<DisplaySnapshot>("/api/public/display", (s) => (s?.meeting?.status === "VOTING" ? 1500 : 3000));
  const [soundOn, setSoundOn] = useState(false);
  const lastScreen = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;
    if (lastScreen.current && lastScreen.current !== data.screen && soundOn) {
      if (data.screen === "MEETING") sounds.playEmergency();
      if (data.screen === "IMPOSTORS" || data.screen === "WINNER") sounds.playRoleReveal();
    }
    lastScreen.current = data.screen;
  }, [data, soundOn]);

  const enableSound = () => {
    sounds.enableEffectsOnly();
    sounds.playClick();
    setSoundOn(true);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-white">
      <SpaceBackground />
      <div className="relative z-10 flex h-full flex-col p-6 lg:p-10">
        {error ? (
          <Centered>
            <p className="text-3xl font-mono text-slate-300">{error.status === 404 ? "No game is running yet." : "Can't reach the game server — retrying…"}</p>
          </Centered>
        ) : !data ? (
          <Centered>
            <p className="text-3xl font-mono text-cyan-300 animate-pulse">Connecting…</p>
          </Centered>
        ) : (
          <>
            <Screen d={data} serverOffset={serverOffset} />
            {data.announcements[0] && !["WINNER", "IMPOSTORS"].includes(data.screen) && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-cyan-500/40 bg-slate-950/80 px-6 py-3 text-2xl">
                <Megaphone className="w-7 h-7 text-cyan-300 shrink-0" />
                <span className="truncate">{data.announcements[0].text}</span>
              </div>
            )}
          </>
        )}
      </div>
      <div className="absolute right-3 top-3 z-20 flex gap-2 opacity-40 hover:opacity-100">
        {!soundOn && (
          <button onClick={enableSound} className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs">
            <Volume2 className="w-4 h-4" /> Enable sound
          </button>
        )}
        <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5" aria-label="Full screen">
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">{children}</div>;
}

function Heading({ children, red }: { children: React.ReactNode; red?: boolean }) {
  return (
    <h1
      className={clsx(
        "text-6xl lg:text-8xl font-black font-mono tracking-widest",
        red ? "text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]" : "text-white drop-shadow-[0_0_25px_rgba(0,240,255,0.6)]",
      )}
    >
      {children}
    </h1>
  );
}

function Screen({ d, serverOffset }: { d: DisplaySnapshot; serverOffset: number }) {
  switch (d.screen) {
    case "REGISTRATION":
      return (
        <Centered>
          <Heading>JOIN THE CREW</Heading>
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/public/qr" alt="Registration QR code" className="w-[min(42vh,520px)] rounded-3xl bg-white p-4" />
            <div className="text-left space-y-4">
              <p className="text-3xl">1. Scan the code</p>
              <p className="text-3xl">2. Enter your name & phone</p>
              <p className="text-3xl">3. Pick your team colour</p>
              <p className="pt-4 font-mono text-xl text-cyan-300 break-all">{d.registrationUrl}</p>
              <p className="text-5xl font-black text-amber-300">{d.counts.registered} registered</p>
            </div>
          </div>
        </Centered>
      );
    case "RULES":
      return (
        <Centered>
          <Heading>HOW TO PLAY</Heading>
          <div className="grid gap-6 lg:grid-cols-3 max-w-6xl text-left">
            <RuleCard color="cyan" title="CREWMATE" lines={["Do tasks to earn team points", "Find your team's impostor", "Vote wisely in the meeting"]} />
            <RuleCard color="yellow" title="DETECTIVE" lines={[`Ask a host ${d.rules.detectiveInvestigationLimit === 1 ? "one secret question" : `${d.rules.detectiveInvestigationLimit} secret questions`}`, "“Is <name> an impostor?”", "Use it well — keep it secret"]} />
            <RuleCard color="red" title="IMPOSTOR" lines={["Tag crewmates with stickers", "Blend in, do fake tasks", `Win if fewer than ${d.rules.crewNeedsToCatch} impostors are caught`]} />
          </div>
          <p className="text-2xl text-slate-300">Got a red sticker? You&apos;re a ghost — you can still do tasks, but you can&apos;t vote.</p>
        </Centered>
      );
    case "MEETING":
      return (
        <Centered>
          <AlertTriangle className="w-40 h-40 text-red-500 animate-pulse" />
          <Heading red>EMERGENCY MEETING</Heading>
          <p className="text-4xl text-red-100">Gather with your team and discuss. Voting opens soon.</p>
        </Centered>
      );
    case "VOTING":
      return <VotingScreen d={d} serverOffset={serverOffset} />;
    case "RESULTS":
      return (
        <Centered>
          <Heading red>MEETING RESULTS</Heading>
          <div className="grid gap-4 w-full max-w-5xl">
            {(d.meeting?.results ?? []).map((r) => (
              <div key={r.teamId} className="flex items-center gap-6 rounded-2xl border-2 bg-slate-950/80 px-8 py-5 text-left" style={{ borderColor: r.colorHex }}>
                <span className="w-40 text-3xl font-black font-mono" style={{ color: r.colorHex }}>
                  {r.teamName}
                </span>
                {r.eliminated ? (
                  <span className="text-4xl">
                    <b>{r.eliminated.name}</b>{" "}
                    {r.eliminated.wasImpostor ? <span className="font-black text-red-400">WAS AN IMPOSTOR</span> : <span className="text-slate-400">was not an impostor</span>}
                  </span>
                ) : (
                  <span className="text-4xl text-slate-400">Nobody was ejected</span>
                )}
              </div>
            ))}
          </div>
        </Centered>
      );
    case "FINAL":
      return (
        <Centered>
          <GavelUpTitle size="lg" />
          <Heading red>THE FINAL REVEAL</Heading>
          <p className="text-4xl text-slate-200 animate-pulse">Who were the impostors…?</p>
        </Centered>
      );
    case "IMPOSTORS":
      return (
        <Centered>
          <Heading red>THE IMPOSTORS</Heading>
          <div className="flex flex-wrap justify-center gap-8">
            {(d.final.impostors ?? []).map((i) => {
              const team = d.teams.find((t) => t.teamId === i.teamId);
              return (
                <div key={i.id} className="flex flex-col items-center gap-2 animate-[fadeIn_0.6s_ease-out]">
                  <CrewmateVector color={(team?.key ?? "red") as CrewmateColor} size={150} isImpostor />
                  <p className="text-4xl font-black">{i.name}</p>
                  <p className="text-2xl font-mono" style={{ color: i.colorHex }}>
                    {i.teamName}
                  </p>
                  <p className={clsx("text-xl font-mono font-bold", i.votedOut ? "text-emerald-300" : "text-red-400")}>{i.votedOut ? "CAUGHT" : "ESCAPED"}</p>
                </div>
              );
            })}
          </div>
        </Centered>
      );
    case "LEADERBOARD":
      return (
        <Centered>
          <Heading>LEADERBOARD</Heading>
          <BigBoard rows={d.leaderboard} winners={new Set(d.final.winningTeamIds ?? [])} />
        </Centered>
      );
    case "WINNER":
      return <WinnerScreen d={d} />;
    case "STATS":
      return <StatsScreen d={d} />;
    case "LOBBY":
    default:
      return (
        <Centered>
          <GavelUpTitle size="xl" />
          <p className="text-4xl font-mono text-cyan-200">{d.game.name}</p>
          <div className="flex flex-wrap justify-center gap-6">
            {d.teams.map((t) => (
              <div key={t.teamId} className="flex flex-col items-center">
                <CrewmateVector color={t.key as CrewmateColor} size={90} />
                <p className="text-2xl font-black" style={{ color: t.colorHex }}>
                  {t.name}
                </p>
                <p className="text-xl text-slate-300">{t.players} crew</p>
              </div>
            ))}
          </div>
          <p className="text-3xl text-amber-300 font-bold">{d.counts.registered} players on board</p>
        </Centered>
      );
  }
}

function RuleCard({ color, title, lines }: { color: "cyan" | "yellow" | "red"; title: string; lines: string[] }) {
  const tone = { cyan: "border-cyan-400/60 text-cyan-300", yellow: "border-amber-400/60 text-amber-300", red: "border-red-500/60 text-red-400" }[color];
  return (
    <div className={clsx("rounded-3xl border-2 bg-slate-950/85 p-6", tone.split(" ")[0])}>
      <div className="flex items-center gap-4 mb-3">
        <CrewmateVector color={color} size={70} isImpostor={color === "red"} />
        <h2 className={clsx("text-4xl font-black font-mono", tone.split(" ")[1])}>{title}</h2>
      </div>
      <ul className="space-y-2 text-2xl text-slate-100">
        {lines.map((l) => (
          <li key={l}>• {l}</li>
        ))}
      </ul>
    </div>
  );
}

function VotingScreen({ d, serverOffset }: { d: DisplaySnapshot; serverOffset: number }) {
  const m = d.meeting;
  return (
    <Centered>
      <Heading red>VOTING</Heading>
      {m?.status === "VOTING" ? (
        <div className="text-7xl">
          <Countdown endsAt={m.votingEndsAt} serverOffset={serverOffset} big />
        </div>
      ) : (
        <p className="text-4xl text-slate-300">Voting closed — results coming up</p>
      )}
      <div className="grid gap-4 w-full max-w-5xl">
        {(m?.perTeam ?? []).map((p) => {
          const t = d.teams.find((x) => x.teamId === p.teamId);
          const pct = p.eligible ? (p.voted / p.eligible) * 100 : 0;
          return (
            <div key={p.teamId} className="flex items-center gap-6">
              <span className="w-40 text-right text-3xl font-black font-mono" style={{ color: t?.colorHex }}>
                {t?.name}
              </span>
              <div className="flex-1 h-10 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${pct}%`, background: t?.colorHex }} />
              </div>
              <span className="w-32 text-3xl font-mono">
                {p.voted}/{p.eligible}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-3xl text-slate-300">
        {m?.votesCast ?? 0} of {m?.eligibleTotal ?? 0} votes cast
      </p>
    </Centered>
  );
}

function BigBoard({ rows, winners }: { rows: LeaderboardRow[]; winners: Set<string> }) {
  if (rows.length === 0) return <p className="text-4xl text-slate-400">Scores will be revealed soon…</p>;
  const max = Math.max(1, ...rows.map((r) => Math.max(0, r.score)));
  return (
    <div className="w-full max-w-6xl space-y-4">
      {rows.map((r) => (
        <div key={r.teamId} className="flex items-center gap-6">
          <span className="w-12 text-4xl font-black font-mono text-slate-300">{r.rank}</span>
          <CrewmateVector color={r.key as CrewmateColor} size={64} />
          <span className="w-48 text-4xl font-black" style={{ color: r.colorHex }}>
            {r.name}
          </span>
          <div className="flex-1 h-12 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full transition-all duration-1000" style={{ width: `${(Math.max(0, r.score) / max) * 100}%`, background: r.colorHex }} />
          </div>
          <span className="w-36 text-right text-5xl font-black font-mono text-amber-200">{r.score}</span>
          {winners.has(r.teamId) && <Crown className="w-12 h-12 text-amber-300" />}
        </div>
      ))}
    </div>
  );
}

function WinnerScreen({ d }: { d: DisplaySnapshot }) {
  const f = d.final;
  const winners = (f.leaderboard ?? []).filter((r) => (f.winningTeamIds ?? []).includes(r.teamId));
  return (
    <Centered>
      <p className={clsx("text-6xl lg:text-7xl font-black font-mono tracking-widest", f.impostorsWin ? "text-red-400" : "text-cyan-300")}>
        {f.impostorsWin ? "IMPOSTORS WIN" : "CREW WINS"}
      </p>
      <p className="text-2xl text-slate-300">
        {f.impostorsVotedOut} impostor{f.impostorsVotedOut === 1 ? " was" : "s were"} caught (the crew needed {f.threshold})
      </p>
      <Crown className="w-28 h-28 text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" />
      <p className="text-3xl font-mono uppercase tracking-widest text-amber-200">{winners.length > 1 ? "Winning teams" : "Winning team"}</p>
      <div className="flex flex-wrap justify-center gap-16">
        {winners.map((w) => (
          <div key={w.teamId} className="flex flex-col items-center animate-[fadeIn_0.8s_ease-out]">
            <CrewmateVector color={w.key as CrewmateColor} size={180} />
            <p className="text-7xl font-black" style={{ color: w.colorHex }}>
              {w.name}
            </p>
            <p className="text-4xl font-mono text-amber-100">{w.score} pts</p>
          </div>
        ))}
      </div>
    </Centered>
  );
}

function StatsScreen({ d }: { d: DisplaySnapshot }) {
  const s = d.final.stats;
  if (!s) return <WinnerScreen d={d} />;
  const tiles: [string, React.ReactNode][] = [
    ["Players", s.registered],
    ["Kills", s.kills],
    ["Voted out", s.voteEliminations],
    ["Impostors caught", s.impostorsVotedOut],
    ["Vote turnout", `${s.turnoutPct}%`],
    ["Tasks done", s.tasksCompleted],
    ["Predictions right", `${s.predictionsCorrect}/${s.predictionsMade}`],
    ["Meetings", s.meetingsHeld],
  ];
  return (
    <Centered>
      <Heading>GAME STATS</Heading>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-3xl border-2 border-cyan-500/40 bg-slate-950/85 p-6">
            <p className="text-xl font-mono uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-6xl font-black">{value}</p>
          </div>
        ))}
      </div>
    </Centered>
  );
}
