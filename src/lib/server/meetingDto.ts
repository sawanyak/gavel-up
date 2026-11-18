/**
 * Meeting views per audience (part of the DTO privacy boundary, plan §10.2):
 *  - player: own vote only, own team's progress (counts), own team's prediction locks;
 *    the per-candidate distribution only after results are revealed.
 *  - TM: who has / hasn't voted in their team (names only, never choices).
 *  - GM: everything, live.
 */
import type { Types } from "mongoose";
import { tallyTeam } from "./game/tally";
import type { GameDoc, PlayerDoc } from "./models";
import { shared } from "./snapshotCache";
import type { GMMeetingTeam, GMMeetingView, MeetingStatus, PlayerMeetingView, TMMeetingView } from "@/lib/shared/types";

const AFTER_RESULTS: MeetingStatus[] = ["RESULTS", "RESOLVED"];
const VOTING_STARTED: MeetingStatus[] = ["VOTING", "CLOSED", "RESULTS", "RESOLVED"];

/** Everything here is shared per game version (see snapshotCache): no per-phone queries. */
async function load(game: GameDoc) {
  if (!game.activeMeetingId) return null;
  const s = shared(game);
  const m = await s.meeting();
  if (!m || m.status === "CANCELLED") return null;
  const [teams, players, name, votes, predictions] = await Promise.all([s.teams(), s.roster(), s.names(), s.votes(), s.predictions()]);
  return { m, teams, players, votes, predictions, nameOf: (id: Types.ObjectId | string | null | undefined) => (id ? (name.get(String(id)) ?? "?") : "?") };
}

const ids = (xs: Types.ObjectId[] | undefined) => (xs ?? []).map(String);

export async function playerMeetingView(game: GameDoc, player: PlayerDoc): Promise<PlayerMeetingView | null> {
  const ctx = await load(game);
  if (!ctx) return null;
  const { m, teams, nameOf, votes, predictions } = ctx;
  const started = VOTING_STARTED.includes(m.status as MeetingStatus);
  const mine = m.eligible.find((e) => String(e.teamId) === String(player.teamId));
  const eligible = started ? ids(mine?.voterIds).includes(String(player._id)) : player.status === "alive";

  const myVote = started ? (votes.find((v) => String(v.voterId) === String(player._id)) ?? null) : null;
  const teamVotes = started ? votes.filter((v) => String(v.teamId) === String(player.teamId)).length : 0;
  const locks = started ? predictions.filter((p) => String(p.predictorTeamId) === String(player.teamId)) : [];
  const predictionsEnabled = game.config?.predictionsEnabled ?? true;

  let results: PlayerMeetingView["results"] = null;
  if (AFTER_RESULTS.includes(m.status as MeetingStatus)) {
    const team = new Map(teams.map((t) => [String(t._id), t]));
    const myResult = m.teamResults.find((r) => String(r.teamId) === String(player.teamId));
    results = {
      teams: m.teamResults
        .filter((r) => team.has(String(r.teamId)))
        .map((r) => ({
          teamId: String(r.teamId),
          teamName: team.get(String(r.teamId))!.name,
          colorHex: team.get(String(r.teamId))!.colorHex,
          eliminated: r.decision?.eliminatedPlayerId ? { name: nameOf(r.decision.eliminatedPlayerId), wasImpostor: !!r.wasImpostor } : null,
        })),
      myTeam: {
        tally: (myResult?.tally ?? []).map((t) => ({ name: nameOf(t.playerId), count: t.count ?? 0 })),
        skipCount: myResult?.skipCount ?? 0,
        notVotedCount: myResult?.notVotedCount ?? 0,
      },
    };
  }

  return {
    id: String(m._id),
    number: m.number,
    status: m.status as MeetingStatus,
    votingEndsAt: m.votingEndsAt ? m.votingEndsAt.toISOString() : null,
    allowSkip: game.config?.allowSkipVote ?? true,
    me: {
      eligible,
      notEligibleReason: eligible ? null : player.status === "ghost" ? "ghost" : started ? "late" : null,
      hasVoted: !!myVote,
      skipped: !!myVote && !myVote.targetId,
      votedFor: myVote?.targetId ? { id: String(myVote.targetId), name: nameOf(myVote.targetId) } : null,
    },
    candidates: started
      ? ids(mine?.candidateIds)
          .filter((id) => id !== String(player._id))
          .map((id) => ({ id, name: nameOf(id) }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [],
    teamProgress: { voted: teamVotes, eligible: mine?.voterIds.length ?? 0 },
    predictions: {
      enabled: predictionsEnabled,
      points: { correct: game.config?.points?.correctPrediction ?? 30, wrong: game.config?.points?.wrongPrediction ?? -15 },
      otherTeams:
        started && predictionsEnabled
          ? teams
              .filter((t) => String(t._id) !== String(player.teamId))
              .map((t) => {
                const e = m.eligible.find((x) => String(x.teamId) === String(t._id));
                const lock = locks.find((l) => String(l.targetTeamId) === String(t._id));
                return {
                  teamId: String(t._id),
                  name: t.name,
                  colorHex: t.colorHex,
                  locked: lock
                    ? { byName: nameOf(lock.predictorPlayerId), targetName: nameOf(lock.targetPlayerId), byMe: String(lock.predictorPlayerId) === String(player._id) }
                    : null,
                  candidates: ids(e?.candidateIds)
                    .map((id) => ({ id, name: nameOf(id) }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
                };
              })
              .filter((t) => t.candidates.length > 0 || t.locked)
          : [],
    },
    results,
  };
}

export async function gmMeetingView(game: GameDoc): Promise<GMMeetingView | null> {
  const ctx = await load(game);
  if (!ctx) return null;
  const { m, teams, players, nameOf, votes, predictions } = ctx;
  const teamName = new Map(teams.map((t) => [String(t._id), t.name]));
  const started = VOTING_STARTED.includes(m.status as MeetingStatus);

  const teamViews: GMMeetingTeam[] = teams.map((t) => {
    const e = m.eligible.find((x) => String(x.teamId) === String(t._id));
    // Before voting opens, preview with the currently alive players.
    const voterIds = started ? ids(e?.voterIds) : players.filter((p) => String(p.teamId) === String(t._id) && p.status === "alive").map((p) => String(p._id));
    const candidateIds = started ? ids(e?.candidateIds) : voterIds;
    const tv = votes.filter((v) => String(v.teamId) === String(t._id));
    const votedSet = new Set(tv.map((v) => String(v.voterId)));
    const live = tallyTeam({ voterIds, candidateIds }, tv.map((v) => ({ voterId: String(v.voterId), targetId: v.targetId ? String(v.targetId) : null })));
    const r = m.teamResults.find((x) => String(x.teamId) === String(t._id));
    return {
      teamId: String(t._id),
      teamName: t.name,
      colorHex: t.colorHex,
      eligibleCount: voterIds.length,
      voted: voterIds.filter((id) => votedSet.has(id)).map((id) => ({ id, name: nameOf(id) })),
      notVoted: voterIds.filter((id) => !votedSet.has(id)).map((id) => ({ id, name: nameOf(id) })),
      tally: live.tally.map((x) => ({ playerId: x.playerId, name: nameOf(x.playerId), count: x.count })),
      skipCount: live.skipCount,
      candidates: candidateIds.map((id) => ({ id, name: nameOf(id) })),
      result: r
        ? {
            topCandidates: ids(r.topCandidateIds).map((id) => ({ id, name: nameOf(id) })),
            tie: !!r.tie,
            mostSkipped: !!r.mostSkipped,
            decision: r.decision
              ? {
                  eliminated: r.decision.eliminatedPlayerId ? { id: String(r.decision.eliminatedPlayerId), name: nameOf(r.decision.eliminatedPlayerId) } : null,
                  decidedByName: r.decision.decidedByName ?? "auto",
                }
              : null,
            wasImpostor: r.wasImpostor ?? null,
          }
        : null,
    };
  });

  return {
    id: String(m._id),
    number: m.number,
    status: m.status as MeetingStatus,
    calledAt: m.calledAt.toISOString(),
    votingOpenedAt: m.votingOpenedAt ? m.votingOpenedAt.toISOString() : null,
    votingEndsAt: m.votingEndsAt ? m.votingEndsAt.toISOString() : null,
    teams: teamViews.filter((t) => t.eligibleCount > 0 || t.result),
    votes: votes.map((v) => ({
      id: String(v._id),
      voterName: nameOf(v.voterId),
      teamId: String(v.teamId),
      targetName: v.targetId ? nameOf(v.targetId) : null,
      at: v.createdAt.toISOString(),
    })),
    predictions: predictions.map((p) => ({
      id: String(p._id),
      predictorName: nameOf(p.predictorPlayerId),
      predictorTeamName: teamName.get(String(p.predictorTeamId)) ?? "?",
      targetTeamName: teamName.get(String(p.targetTeamId)) ?? "?",
      targetName: nameOf(p.targetPlayerId),
      at: p.createdAt.toISOString(),
    })),
  };
}

/** Projector: totals only (never who voted or for whom); per-team outcomes after results. */
export async function displayMeetingView(game: GameDoc) {
  const ctx = await load(game);
  if (!ctx) return null;
  const { m, teams, nameOf } = ctx;
  const { votes } = ctx;
  const perTeam = m.eligible.map((e) => ({
    teamId: String(e.teamId),
    voted: votes.filter((v) => String(v.teamId) === String(e.teamId)).length,
    eligible: e.voterIds.length,
  }));
  const team = new Map(teams.map((t) => [String(t._id), t]));
  return {
    number: m.number,
    status: m.status as MeetingStatus,
    votingEndsAt: m.votingEndsAt ? m.votingEndsAt.toISOString() : null,
    votesCast: votes.length,
    eligibleTotal: perTeam.reduce((s, t) => s + t.eligible, 0),
    perTeam,
    results: AFTER_RESULTS.includes(m.status as MeetingStatus)
      ? m.teamResults
          .filter((r) => team.has(String(r.teamId)))
          .map((r) => ({
            teamId: String(r.teamId),
            teamName: team.get(String(r.teamId))!.name,
            colorHex: team.get(String(r.teamId))!.colorHex,
            eliminated: r.decision?.eliminatedPlayerId ? { name: nameOf(r.decision.eliminatedPlayerId), wasImpostor: !!r.wasImpostor } : null,
          }))
      : null,
  };
}

export async function tmMeetingView(game: GameDoc, teamIds: Types.ObjectId[]): Promise<TMMeetingView | null> {
  const ctx = await load(game);
  if (!ctx) return null;
  const { m, nameOf } = ctx;
  const votes = ctx.votes.filter((v) => teamIds.some((t) => String(t) === String(v.teamId)));
  const voted = new Set(votes.map((v) => String(v.voterId)));
  const revealed = AFTER_RESULTS.includes(m.status as MeetingStatus);
  return {
    id: String(m._id),
    number: m.number,
    status: m.status as MeetingStatus,
    votingEndsAt: m.votingEndsAt ? m.votingEndsAt.toISOString() : null,
    teams: teamIds.map((tid) => {
      const e = m.eligible.find((x) => String(x.teamId) === String(tid));
      const r = m.teamResults.find((x) => String(x.teamId) === String(tid));
      return {
        teamId: String(tid),
        voted: ids(e?.voterIds).filter((id) => voted.has(id)).map((id) => nameOf(id)),
        notVoted: ids(e?.voterIds).filter((id) => !voted.has(id)).map((id) => nameOf(id)),
        eliminated: revealed ? (r?.decision?.eliminatedPlayerId ? { name: nameOf(r.decision.eliminatedPlayerId), wasImpostor: !!r.wasImpostor } : null) : undefined,
      };
    }),
  };
}
