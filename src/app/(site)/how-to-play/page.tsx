"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, ClipboardCheck, Crown, QrCode, Search, ShieldAlert, Sparkles, Trophy, Vote, Wrench } from "lucide-react";
import { CrewmateVector } from "@/components/CrewmateVector";
import { getRoleContent, type GameRules } from "@/lib/shared/roleContent";
import type { PublicGameInfo } from "@/lib/shared/types";

const DEFAULT_RULES: GameRules = { crewNeedsToCatch: 2, detectiveInvestigationLimit: 1, maxMeetings: 1, alliesVisible: true };
const DEFAULT_POINTS = { taskDefault: 10, correctInternalVotePerVoter: 10, correctPrediction: 30, wrongPrediction: -15 };

const STEPS = [
  { Icon: QrCode, title: "Register", text: "Scan the QR code at the desk, enter your name and phone, and pick the team colour you were given." },
  { Icon: Sparkles, title: "Role reveal", text: "The hosts reveal everyone's secret role at once. Check your phone privately — and keep it secret!" },
  { Icon: ClipboardCheck, title: "Tasks & activities", text: "Complete tasks on your phone and take part in games, table topics and Q&A to earn points for your team." },
  { Icon: AlertTriangle, title: "Emergency meeting", text: "When the alarm sounds, discuss with your team and vote for who you think the impostor is." },
  { Icon: Crown, title: "Final reveal", text: "The hosts reveal every impostor, the final leaderboard and the winning team." },
];

export default function HowToPlayPage() {
  const [info, setInfo] = useState<PublicGameInfo | null>(null);
  useEffect(() => {
    fetch("/api/public/game", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => {});
  }, []);
  const rules = info?.rules ?? DEFAULT_RULES;
  const pts = info?.points ?? DEFAULT_POINTS;

  const roles = [
    { content: getRoleContent("crewmate", rules), Icon: Wrench, color: "cyan" as const, accent: "border-cyan-400/60 text-cyan-300", impostor: false },
    { content: getRoleContent("detective", rules), Icon: Search, color: "yellow" as const, accent: "border-amber-400/60 text-amber-300", impostor: false },
    { content: getRoleContent("impostor", rules), Icon: ShieldAlert, color: "red" as const, accent: "border-red-500/60 text-red-400", impostor: true },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <header className="text-center">
        <h1 className="text-4xl sm:text-6xl font-black font-mono tracking-widest text-white drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">HOW TO PLAY</h1>
        <p className="mt-3 text-base sm:text-lg font-mono text-cyan-300">Among Us — in real life, at Gavel Up.</p>
      </header>

      {/* Flow */}
      <section>
        <h2 className="text-xl font-mono font-bold uppercase tracking-widest text-cyan-300 mb-4">The game, step by step</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border-2 border-slate-800 bg-slate-950/85 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <Icon className="w-5 h-5 text-cyan-300" />
              </div>
              <h3 className="font-bold text-white mb-1">{title}</h3>
              <p className="text-sm text-slate-300">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Characters */}
      <section>
        <h2 className="text-xl font-mono font-bold uppercase tracking-widest text-cyan-300 mb-4">Characters</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map(({ content, Icon, color, accent, impostor }) => (
            <article key={content.role} className={clsx("rounded-2xl border-2 bg-slate-950/85 p-5", accent.split(" ")[0])}>
              <div className="flex items-center gap-3 mb-3">
                <CrewmateVector color={color} size={56} isImpostor={impostor} />
                <div>
                  <h3 className={clsx("text-2xl font-black font-mono tracking-widest", accent.split(" ")[1])}>{content.title}</h3>
                  <p className="text-xs text-slate-400 italic">{content.tagline}</p>
                </div>
                <Icon className={clsx("w-6 h-6 ml-auto", accent.split(" ")[1])} />
              </div>
              <p className="text-sm text-slate-200 mb-3">{content.description}</p>
              <p className="text-sm text-white font-semibold mb-1">Goal</p>
              <p className="text-sm text-slate-300 mb-3">{content.objective}</p>
              <p className="text-sm text-white font-semibold mb-1">Abilities</p>
              <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                {content.abilities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-400">
          Each team normally has <b className="text-slate-200">one impostor</b> and <b className="text-slate-200">one detective</b>. Everyone else is a crewmate.
          Nobody knows who is who — roles are secret until the final reveal.
        </p>
      </section>

      {/* Ghosts */}
      <section className="rounded-2xl border-2 border-slate-700 bg-slate-950/85 p-5 flex flex-col sm:flex-row gap-4 items-start">
        <CrewmateVector color="white" size={64} isDead />
        <div>
          <h2 className="text-xl font-mono font-bold uppercase tracking-widest text-slate-200 mb-2">Got a red sticker? You&apos;re a ghost</h2>
          <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
            <li>Tell your Team Manager — they&apos;ll mark you as eliminated.</li>
            <li>Ghosts can still complete tasks and earn points for their team.</li>
            <li>Ghosts can&apos;t vote in the emergency meeting.</li>
          </ul>
        </div>
      </section>

      {/* Meeting & voting */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-red-500/50 bg-red-950/30 p-5">
          <h2 className="flex items-center gap-2 text-xl font-mono font-bold uppercase tracking-widest text-red-300 mb-3">
            <Vote className="w-5 h-5" /> Emergency meeting
          </h2>
          <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1.5">
            <li>The hosts call {rules.maxMeetings === 1 ? "one emergency meeting" : `up to ${rules.maxMeetings} emergency meetings`}. A voting window opens on your phone with a timer.</li>
            <li>Discuss with your team, then vote for the person <b>in your own team</b> you think is the impostor. One vote each; you can also skip.</li>
            <li>The most-voted player in each team is eliminated and revealed as impostor or crewmate. Ties are decided by the hosts.</li>
            <li>The crew wins the impostor battle if at least {rules.crewNeedsToCatch} impostor{rules.crewNeedsToCatch === 1 ? " is" : "s are"} voted out — otherwise the impostors win!</li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-amber-400/50 bg-amber-950/20 p-5">
          <h2 className="flex items-center gap-2 text-xl font-mono font-bold uppercase tracking-widest text-amber-300 mb-3">
            <Search className="w-5 h-5" /> Predict another team&apos;s impostor
          </h2>
          <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1.5">
            <li>During the meeting you may also name who you think the impostor is in <b>another</b> team. It&apos;s optional.</li>
            <li>Only <b>one prediction per team, per other team</b> counts — the first teammate to submit locks it in, so agree first!</li>
            <li>
              Correct: <b className="text-emerald-300">+{pts.correctPrediction}</b> points for your team. Wrong:{" "}
              <b className="text-red-300">{pts.wrongPrediction}</b> points.
            </li>
            <li>Predictions never eliminate anyone. Results are revealed at the end.</li>
          </ul>
        </div>
      </section>

      {/* Scoring */}
      <section className="rounded-2xl border-2 border-cyan-500/40 bg-slate-950/85 p-5">
        <h2 className="flex items-center gap-2 text-xl font-mono font-bold uppercase tracking-widest text-cyan-300 mb-3">
          <Trophy className="w-5 h-5" /> Scoring
        </h2>
        <p className="text-sm text-slate-300 mb-3">All points are <b className="text-white">team points</b>. The team with the most points at the end wins.</p>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          {[
            ["Completing a task", `about +${pts.taskDefault} (varies by task)`],
            ["Table topics, Q&A, icebreakers", "awarded by Team Managers & hosts"],
            ["Each teammate who votes for your team's real impostor", `+${pts.correctInternalVotePerVoter}`],
            ["Correct cross-team prediction", `+${pts.correctPrediction}`],
            ["Wrong cross-team prediction", `${pts.wrongPrediction}`],
          ].map(([what, pts]) => (
            <div key={what} className="flex justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
              <span className="text-slate-200">{what}</span>
              <span className="font-mono font-bold text-cyan-200 text-right">{pts}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center">
        <Link
          href="/play"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-red-400 bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 font-mono font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]"
        >
          Open my game screen
        </Link>
      </div>
    </div>
  );
}
