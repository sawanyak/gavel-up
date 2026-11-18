"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { IssueCodeButton, useStaffMe } from "@/components/game/staff";
import { AnnouncementList, KillButton, ScorePill, VerificationQueue } from "@/components/game/gameplay";
import { Countdown } from "@/components/game/meeting";
import { AwardForm, PointsFeed } from "@/components/game/scoring";
import { FinalView } from "@/components/game/final";
import { ConnectionBanner, HudCard, LoadingView, MessageView, PhaseChip, TeamBadge, inputClass } from "@/components/game/ui";
import { useGameState } from "@/lib/client/useGameState";
import type { TMSnapshot } from "@/lib/shared/types";

export default function TeamManagerPage() {
  const me = useStaffMe();
  const { data, error, connection, refresh, serverOffset } = useGameState<TMSnapshot>("/api/tm/state", (s) => (s?.meeting?.status === "VOTING" ? 1500 : 3000));
  const [search, setSearch] = useState("");

  if (error?.status === 401) return <LoadingView label="Redirecting to login…" />;
  if (error) return <MessageView title="Error" message={error.message} />;
  if (!data) return <LoadingView />;

  const q = search.trim().toLowerCase();
  const canKill = data.game.phase === "PLAYING" || (data.game.phase === "MEETING" && data.meeting?.status === "CALLED");
  const meeting = data.meeting;

  return (
    <div className="space-y-5">
      <ConnectionBanner connection={connection} />
      {me && <StaffNav role={me.role} name={me.name} />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black font-mono tracking-widest text-white">Team Manager</h1>
        <PhaseChip phase={data.game.phase} />
      </div>

      {data.teams.length === 0 && <MessageView title="No team assigned" message="Ask a Game Master to assign you to a team." />}

      {data.final && <FinalView final={data.final} myTeamId={data.teams.length === 1 ? data.teams[0].id : undefined} />}

      <AnnouncementList announcements={data.announcements} compact />

      {meeting && (
        <HudCard
          variant="red"
          title={`Emergency meeting #${meeting.number} · ${meeting.status.toLowerCase()}`}
          right={meeting.status === "VOTING" && <Countdown endsAt={meeting.votingEndsAt} serverOffset={serverOffset} />}
        >
          {meeting.status === "CALLED" && <p className="text-sm text-slate-300">Gather your team. Voting opens soon.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {meeting.teams.map((mt) => {
              const team = data.teams.find((t) => t.id === mt.teamId);
              return (
                <div key={mt.teamId} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
                  <p className="font-mono font-bold uppercase tracking-wider mb-1" style={{ color: team?.colorHex }}>
                    {team?.name} · {mt.voted.length}/{mt.voted.length + mt.notVoted.length} voted
                  </p>
                  {mt.notVoted.length > 0 && meeting.status === "VOTING" && (
                    <p className="text-slate-300">
                      <b>Still to vote:</b> {mt.notVoted.join(", ")}
                    </p>
                  )}
                  {mt.eliminated !== undefined && (
                    <p className="text-slate-200 mt-1">
                      {mt.eliminated ? (
                        <>
                          Ejected: <b>{mt.eliminated.name}</b> —{" "}
                          {mt.eliminated.wasImpostor ? <b className="text-red-400">an impostor</b> : "not an impostor"}
                        </>
                      ) : (
                        "Nobody was ejected"
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {meeting.status === "VOTING" && <p className="mt-2 text-xs text-slate-400">Remind players who haven&apos;t voted. Kills are paused until the game resumes.</p>}
        </HudCard>
      )}

      {(data.queue.length > 0 || canKill) && <VerificationQueue items={data.queue} onChange={refresh} />}

      {data.teams.length > 0 && data.game.phase !== "SETUP" && data.game.phase !== "LOBBY" && data.game.phase !== "COMPLETED" && !data.final?.leaderboardShownAt && (
        <div className="grid gap-5 lg:grid-cols-2">
          <AwardForm
            teams={data.teams}
            bounds={data.points}
            activities={data.activities}
            players={data.teams.flatMap((t) => t.members.map((m) => ({ id: m.id, name: m.name, teamId: t.id })))}
            onDone={refresh}
          />
          <HudCard title="Recent points">
            <PointsFeed items={data.feed} />
          </HudCard>
        </div>
      )}

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
