"use client";

import React from "react";
import { Hourglass, Users } from "lucide-react";
import { CrewmateVector, type CrewmateColor } from "@/components/CrewmateVector";
import { ConnectionBanner, HudCard, LoadingView, MessageView, PhaseChip } from "@/components/game/ui";
import { RoleCard, RoleRevealOverlay } from "@/components/game/roles";
import { AnnouncementList, GhostBanner, ScorePill, TaskList } from "@/components/game/gameplay";
import { useGameState } from "@/lib/client/useGameState";
import type { PlayerSnapshot } from "@/lib/shared/types";

export default function PlayerDashboard() {
  const { data, error, connection, refresh } = useGameState<PlayerSnapshot>("/api/player/state", 4000);

  if (error?.status === 410) {
    return <MessageView title="Registration removed" message={error.message} actions={[{ label: "Register again", href: "/play/register" }]} />;
  }
  if (error?.status === 401) {
    return (
      <MessageView
        title="You're not logged in"
        message="This device isn't logged in to the game. If you already registered on another phone, ask your Team Manager for a 6-digit login code."
        actions={[
          { label: "I have a login code", href: "/play/recover" },
          { label: "Register", href: "/play/register" },
        ]}
      />
    );
  }
  if (error) return <MessageView title="Something went wrong" message={error.message} />;
  if (!data) return <LoadingView />;

  const { me, team, game } = data;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <ConnectionBanner connection={connection} />

      {/* Identity card — shown to the desk to verify the team colour */}
      <section
        className="rounded-2xl border-2 bg-slate-950/85 p-4 flex items-center gap-4"
        style={{ borderColor: me.team.colorHex, boxShadow: `0 0 24px ${me.team.colorHex}55` }}
      >
        <CrewmateVector color={me.team.key as CrewmateColor} size={76} isDead={me.status === "ghost"} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Player</p>
          <h1 className="text-2xl font-black text-white truncate">{me.name}</h1>
          <p className="font-mono font-bold uppercase tracking-wider" style={{ color: me.team.colorHex }}>
            {me.team.name} team
          </p>
        </div>
      </section>

      <div className="flex justify-center">
        <PhaseChip phase={game.phase} />
      </div>

      <AnnouncementList announcements={data.announcements} />

      {me.status === "ghost" && <GhostBanner teamKey={me.team.key} />}

      {!game.rolesRevealed && (
        <HudCard title="Stand by" variant="cyan">
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <Hourglass className="w-10 h-10 text-cyan-300 animate-pulse" />
            <p className="text-white font-bold">You&apos;re registered!</p>
            <p className="text-sm text-slate-300">
              The hosts will reveal everyone&apos;s secret role soon. Keep this page open — it updates automatically.
            </p>
            <p className="text-xs text-red-300 font-mono uppercase tracking-wider">When your role appears, don&apos;t show it to anyone.</p>
          </div>
        </HudCard>
      )}

      {game.rolesRevealed && me.role && (
        <>
          <RoleRevealOverlay snapshot={data} />
          <RoleCard snapshot={data} />
          {me.late && (
            <p className="text-center text-xs text-slate-400">You joined after roles were revealed, so you&apos;re part of the crew.</p>
          )}
        </>
      )}

      {game.rolesRevealed && !me.role && (
        <HudCard title="Role pending" variant="cyan">
          <p className="text-sm text-slate-300">Your role is being assigned — this page will update in a moment.</p>
        </HudCard>
      )}

      {game.rolesRevealed && <TaskList tasks={data.tasks} activities={data.activities} onChange={refresh} />}

      <HudCard
        title="Your team"
        right={
          <span className="flex items-center gap-2 text-xs font-mono text-slate-400">
            {team.members.length} crew <ScorePill score={team.score} />
          </span>
        }
      >
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {team.members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-lg bg-slate-900/70 border border-slate-800 px-3 py-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span className={m.id === me.id ? "text-cyan-200 font-bold" : "text-slate-200"}>{m.name}</span>
              {m.status === "ghost" && <span className="ml-auto text-[10px] font-mono uppercase text-slate-500">ghost</span>}
            </li>
          ))}
        </ul>
      </HudCard>

      <p className="text-center text-[11px] text-slate-500 font-mono">
        GAME {game.code} · v{data.version}
      </p>
    </div>
  );
}
