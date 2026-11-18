"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { IssueCodeButton, useStaffMe } from "@/components/game/staff";
import { AnnouncementList, KillButton, ScorePill, VerificationQueue } from "@/components/game/gameplay";
import { ConnectionBanner, HudCard, LoadingView, MessageView, PhaseChip, TeamBadge, inputClass } from "@/components/game/ui";
import { useGameState } from "@/lib/client/useGameState";
import type { TMSnapshot } from "@/lib/shared/types";

export default function TeamManagerPage() {
  const me = useStaffMe();
  const { data, error, connection, refresh } = useGameState<TMSnapshot>("/api/tm/state", 3000);
  const [search, setSearch] = useState("");

  if (error?.status === 401) return <LoadingView label="Redirecting to login…" />;
  if (error) return <MessageView title="Error" message={error.message} />;
  if (!data) return <LoadingView />;

  const q = search.trim().toLowerCase();
  const canKill = data.game.phase === "PLAYING" || data.game.phase === "MEETING";

  return (
    <div className="space-y-5">
      <ConnectionBanner connection={connection} />
      {me && <StaffNav role={me.role} name={me.name} />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black font-mono tracking-widest text-white">Team Manager</h1>
        <PhaseChip phase={data.game.phase} />
      </div>

      {data.teams.length === 0 && <MessageView title="No team assigned" message="Ask a Game Master to assign you to a team." />}

      <AnnouncementList announcements={data.announcements} compact />

      {(data.queue.length > 0 || canKill) && <VerificationQueue items={data.queue} onChange={refresh} />}

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className={`${inputClass} pl-9 py-2`} placeholder="Find a player" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {data.teams.map((t) => {
          const members = t.members.filter((m) => !q || m.name.toLowerCase().includes(q));
          return (
            <HudCard
              key={t.id}
              title={<TeamBadge team={t} size={28} />}
              right={
                <span className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  {t.members.length} players · {t.members.filter((m) => m.status === "ghost").length} ghosts <ScorePill score={t.score} />
                </span>
              }
            >
              {members.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No players{q && " match"}.</p>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-2">
                      <span className="flex-1 text-white">
                        {m.name}
                        {m.late && <span className="ml-2 text-[10px] font-mono uppercase text-fuchsia-300">late</span>}
                        {m.status === "ghost" && <span className="ml-2 text-[10px] font-mono uppercase text-slate-400">ghost</span>}
                      </span>
                      {canKill && m.status === "alive" && <KillButton player={m} onDone={refresh} />}
                      <IssueCodeButton playerId={m.id} playerName={m.name} />
                    </li>
                  ))}
                </ul>
              )}
            </HudCard>
          );
        })}
      </div>
    </div>
  );
}
