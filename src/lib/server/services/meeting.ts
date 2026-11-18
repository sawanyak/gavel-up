import mongoose, { type Types } from "mongoose";
import { audit, bumpVersion } from "../audit";
import { assertNotArchived, playerActor, staffActor } from "../auth/guards";
import { ApiError, badRequest, conflict, forbidden, isDuplicateKey, notFound } from "../errors";
import { tallyTeam } from "../game/tally";
import {
  Elimination,
  Game,
  Meeting,
  Player,
  Prediction,
  Team,
  Vote,
  type GameDoc,
  type MeetingDoc,
  type MeetingStatus,
  type PlayerDoc,
  type PredictionDoc,
  type StaffDoc,
  type TeamDoc,
  type TeamResult,
  type VoteDoc,
} from "../models";
import { awardInSession } from "./ledger";

/*
 * Emergency meeting lifecycle (plan §7):
 *   CALLED → VOTING → CLOSED (⇄ VOTING via reopen) → RESULTS → RESOLVED → (resume) PLAYING
 *   CALLED / VOTING → CANCELLED (straight back to PLAYING)
 * Every transition is a compare-and-set on the expected status, so double clicks
 * and two GMs pressing at once are safe.
 */

const graceMs = (game: GameDoc) => (game.config?.voteGraceSec ?? 3) * 1000;

async function getMeeting(game: GameDoc, meetingId: string | Types.ObjectId) {
  const m = await Meeting.findOne({ _id: meetingId, gameId: game._id }).lean<MeetingDoc>();
  if (!m) throw notFound("Meeting not found.");
  return m;
}

function wrongStatus(m: MeetingDoc, expected: string) {
  return conflict("INVALID_MEETING_STATUS", `This meeting is ${m.status.toLowerCase()}, not ${expected.toLowerCase()}.`, { status: m.status });
}

async function cas(m: MeetingDoc, from: MeetingStatus[], set: Record<string, unknown>) {
  const res = await Meeting.findOneAndUpdate({ _id: m._id, status: { $in: from } }, { $set: set }, { new: true }).lean<MeetingDoc>();
  if (!res) throw wrongStatus((await Meeting.findById(m._id).lean<MeetingDoc>())!, from.join(" or "));
  return res;
}

/* ───────────────────────── GM: lifecycle ───────────────────────── */

export async function callMeeting(staff: StaffDoc, game: GameDoc, override: boolean, ip: string) {
  assertNotArchived(game);
  if (game.phase !== "PLAYING") throw conflict("INVALID_PHASE", game.phase === "MEETING" ? "A meeting is already running." : "Meetings can only be called during the game.");
  const max = game.config?.maxMeetings ?? 1;
  if ((game.meetingsHeld ?? 0) >= max && !override) {
    throw conflict("MEETING_LIMIT", `${game.meetingsHeld} of ${max} meeting(s) already held. Confirm to call another one anyway.`);
  }

  const number = (await Meeting.countDocuments({ gameId: game._id })) + 1;
  const session = await mongoose.startSession();
  let meeting: MeetingDoc | null = null;
  try {
    await session.withTransaction(async () => {
      const [m] = await Meeting.create([{ gameId: game._id, number, status: "CALLED", calledBy: staff._id }], { session });
      const res = await Game.updateOne(
        { _id: game._id, phase: "PLAYING", activeMeetingId: null },
        { $set: { phase: "MEETING", activeMeetingId: m._id, display: { screen: "MEETING", updatedAt: new Date() } }, $inc: { version: 1 } },
        { session },
      );
      if (res.modifiedCount !== 1) throw conflict("MEETING_IN_PROGRESS", "Another meeting was just called.");
      meeting = m.toObject() as MeetingDoc;
    });
  } catch (err) {
    if (isDuplicateKey(err)) throw conflict("MEETING_IN_PROGRESS", "Another meeting was just called.");
    throw err;
  } finally {
    await session.endSession();
  }
  await audit({ gameId: game._id, actor: staffActor(staff), action: "MEETING_CALLED", target: { type: "meeting", id: meeting!._id }, after: { number, override }, ip });
  return meeting!;
}

/** Opens voting: freezes who can vote and who can be voted for (alive players, per team). */
export async function openVoting(staff: StaffDoc, game: GameDoc, meetingId: string, durationSec: number | undefined, ip: string) {
  assertNotArchived(game);
  const m = await getMeeting(game, meetingId);
  if (m.status !== "CALLED") throw wrongStatus(m, "CALLED");

  const [teams, alive] = await Promise.all([
    Team.find({ gameId: game._id }).sort({ order: 1, name: 1 }).lean<TeamDoc[]>(),
    Player.find({ gameId: game._id, removedAt: null, status: "alive" }).select("_id teamId").lean<PlayerDoc[]>(),
  ]);
  // Teams with nobody alive have nothing to vote on, so they're left out of the meeting.
  const eligible = teams
    .map((t) => {
      const ids = alive.filter((p) => String(p.teamId) === String(t._id)).map((p) => p._id);
      return { teamId: t._id, voterIds: ids, candidateIds: ids };
    })
    .filter((e) => e.voterIds.length > 0);
  const seconds = durationSec ?? game.config?.votingDurationSec ?? 180;
  const now = new Date();
  const endsAt = new Date(now.getTime() + seconds * 1000);
  const updated = await cas(m, ["CALLED"], { status: "VOTING", votingOpenedAt: now, votingEndsAt: endsAt, eligible });
  await Game.updateOne({ _id: game._id }, { $set: { votingDeadline: endsAt, display: { screen: "VOTING", updatedAt: now } }, $inc: { version: 1 } });
  await audit({ gameId: game._id, actor: staffActor(staff), action: "VOTING_OPENED", target: { type: "meeting", id: m._id }, after: { seconds }, ip });
  return updated;
}

async function computeTeamResult(m: MeetingDoc, teamId: Types.ObjectId): Promise<TeamResult> {
  const e = m.eligible.find((x) => String(x.teamId) === String(teamId));
  const votes = await Vote.find({ meetingId: m._id, teamId }).lean<VoteDoc[]>();
  const r = tallyTeam(
    { voterIds: (e?.voterIds ?? []).map(String), candidateIds: (e?.candidateIds ?? []).map(String) },
    votes.map((v) => ({ voterId: String(v.voterId), targetId: v.targetId ? String(v.targetId) : null })),
  );
  const toId = (s: string) => new mongoose.Types.ObjectId(s);
  return {
    teamId,
    tally: r.tally.map((t) => ({ playerId: toId(t.playerId), count: t.count })),
    skipCount: r.skipCount,
    votedCount: r.votedCount,
    notVotedCount: r.notVotedCount,
    topCandidateIds: r.topCandidateIds.map(toId),
    tie: r.tie,
    mostSkipped: r.mostSkipped,
    decision:
      r.autoDecision === undefined ? null : { eliminatedPlayerId: r.autoDecision ? toId(r.autoDecision) : null, decidedBy: "auto", decidedByName: "auto", at: new Date() },
    wasImpostor: null,
  } as TeamResult;
}

/** Closes voting and tallies every team. Idempotent: closing a closed meeting does nothing. */
export async function closeVoting(game: GameDoc, meetingId: string | Types.ObjectId, staff: StaffDoc | null, ip = "") {
  const m = await getMeeting(game, meetingId);
  if (m.status !== "VOTING") {
    if (m.status === "CLOSED") return m;
    throw wrongStatus(m, "VOTING");
  }
  const claimed = await Meeting.findOneAndUpdate({ _id: m._id, status: "VOTING" }, { $set: { status: "CLOSED", votingClosedAt: new Date() } }, { new: true }).lean<MeetingDoc>();
  if (!claimed) return (await Meeting.findById(m._id).lean<MeetingDoc>())!;
  const teamResults = await Promise.all(claimed.eligible.map((e) => computeTeamResult(claimed, e.teamId as Types.ObjectId)));
  const closed = await Meeting.findByIdAndUpdate(m._id, { $set: { teamResults } }, { new: true }).lean<MeetingDoc>();
  await Game.updateOne({ _id: game._id }, { $set: { votingDeadline: null }, $inc: { version: 1 } });
  await audit({
    gameId: game._id,
    actor: staff ? staffActor(staff) : { type: "system", name: "timer" },
    action: "VOTING_CLOSED",
    target: { type: "meeting", id: m._id },
    after: { auto: !staff },
    ip,
  });
  return closed!;
}

/**
 * Lazy close (plan §7.3): every state poll calls this. If voting's deadline (+ grace) has
 * passed, the first request to notice closes it. Returns the (possibly updated) game.
 */
export async function autoCloseIfExpired(game: GameDoc): Promise<GameDoc> {
  if (!game.votingDeadline || !game.activeMeetingId) return game;
  if (Date.now() <= game.votingDeadline.getTime() + graceMs(game)) return game;
  await closeVoting(game, game.activeMeetingId, null);
  return (await Game.findById(game._id).lean<GameDoc>())!;
}

export async function reopenVoting(staff: StaffDoc, game: GameDoc, meetingId: string, extraSec: number, ip: string) {
  assertNotArchived(game);
  const m = await getMeeting(game, meetingId);
  if (m.status !== "CLOSED") throw wrongStatus(m, "CLOSED");
  const endsAt = new Date(Date.now() + extraSec * 1000);
  const updated = await cas(m, ["CLOSED"], { status: "VOTING", votingEndsAt: endsAt, votingClosedAt: null, teamResults: [] });
  await Game.updateOne({ _id: game._id }, { $set: { votingDeadline: endsAt }, $inc: { version: 1 } });
  await audit({ gameId: game._id, actor: staffActor(staff), action: "VOTING_REOPENED", target: { type: "meeting", id: m._id }, after: { extraSec }, ip });
  return updated;
}

/** GM picks who is eliminated in a team (required for ties; may also overrule to "nobody"). */
export async function decideTeam(staff: StaffDoc, game: GameDoc, meetingId: string, teamId: string, eliminatePlayerId: string | null, ip: string) {
  assertNotArchived(game);
  const m = await getMeeting(game, meetingId);
  if (m.status !== "CLOSED") throw wrongStatus(m, "CLOSED");
  const idx = m.teamResults.findIndex((r) => String(r.teamId) === teamId);
  if (idx < 0) throw notFound("That team isn't in this meeting.");
  const r = m.teamResults[idx];
  const top = r.topCandidateIds.map(String);
  if (eliminatePlayerId !== null && !top.includes(eliminatePlayerId)) {
    throw badRequest("INVALID_DECISION", "Choose one of the players with the most votes, or nobody.");
  }
  const decision = { eliminatedPlayerId: eliminatePlayerId ? new mongoose.Types.ObjectId(eliminatePlayerId) : null, decidedBy: String(staff._id), decidedByName: staff.name, at: new Date() };
  const res = await Meeting.updateOne({ _id: m._id, status: "CLOSED" }, { $set: { [`teamResults.${idx}.decision`]: decision } });
  if (res.modifiedCount !== 1) throw wrongStatus((await Meeting.findById(m._id).lean<MeetingDoc>())!, "CLOSED");
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "MEETING_DECISION",
    target: { type: "meeting", id: m._id },
    before: { decision: r.decision },
    after: { teamId, eliminatePlayerId },
    ip,
  });
  return (await Meeting.findById(m._id).lean<MeetingDoc>())!;
}

/** Reveals per-team results: who is eliminated and whether they were the impostor. */
export async function revealResults(staff: StaffDoc, game: GameDoc, meetingId: string, ip: string) {
  assertNotArchived(game);
  const m = await getMeeting(game, meetingId);
  if (m.status === "RESULTS") return m;
  if (m.status !== "CLOSED") throw wrongStatus(m, "CLOSED");
  const undecided = m.teamResults.filter((r) => !r.decision);
  if (undecided.length) {
    const names = await Team.find({ _id: { $in: undecided.map((r) => r.teamId) } }).select("name").lean<TeamDoc[]>();
    throw conflict("TIE_UNRESOLVED", `Break the tie first: ${names.map((t) => t.name).join(", ")}.`);
  }
  const eliminatedIds = m.teamResults.map((r) => r.decision?.eliminatedPlayerId).filter(Boolean) as Types.ObjectId[];
  const roles = await Player.find({ _id: { $in: eliminatedIds } }).select("+role").lean<PlayerDoc[]>();
  const isImp = new Map(roles.map((p) => [String(p._id), p.role === "impostor"]));
  const teamResults = m.teamResults.map((r) => ({
    ...r,
    wasImpostor: r.decision?.eliminatedPlayerId ? (isImp.get(String(r.decision.eliminatedPlayerId)) ?? false) : null,
  }));
  const now = new Date();
  const updated = await cas(m, ["CLOSED"], { status: "RESULTS", resultsRevealedAt: now, teamResults });
  await Game.updateOne({ _id: game._id }, { $set: { display: { screen: "RESULTS", updatedAt: now } }, $inc: { version: 1 } });
  await audit({ gameId: game._id, actor: staffActor(staff), action: "MEETING_RESULTS_REVEALED", target: { type: "meeting", id: m._id }, ip });
  return updated;
}

/**
 * Confirm (plan §7.2 RESULTS → RESOLVED), in ONE transaction:
 *  - voted-out players become ghosts (cause "vote")
 *  - internal-vote points: +perVoter × teammates who voted for their team's real impostor
 *    (one transaction per team, key `ivote:<meetingId>:<teamId>`)
 *  - meetingsHeld + 1
 * A second confirm is a no-op.
 */
export async function confirmMeeting(staff: StaffDoc, game: GameDoc, meetingId: string, ip: string) {
  assertNotArchived(game);
  const m = await getMeeting(game, meetingId);
  if (m.status === "RESOLVED") return { meeting: m, eliminated: 0, awards: [] as { teamId: string; amount: number }[], alreadyDone: true };
  if (m.status !== "RESULTS") throw wrongStatus(m, "RESULTS");

  const perVoter = game.config?.points?.correctInternalVotePerVoter ?? 10;
  const [votes, impostors] = await Promise.all([
    Vote.find({ meetingId: m._id }).lean<VoteDoc[]>(),
    Player.find({ gameId: game._id, role: "impostor", removedAt: null }).select("_id teamId").lean<PlayerDoc[]>(),
  ]);
  const impostorIds = new Set(impostors.map((p) => String(p._id)));
  const awards: { teamId: string; amount: number; voters: number }[] = [];
  for (const e of m.eligible) {
    const voters = new Set(e.voterIds.map(String));
    const correct = votes.filter(
      (v) => String(v.teamId) === String(e.teamId) && voters.has(String(v.voterId)) && v.targetId && impostorIds.has(String(v.targetId)),
    ).length;
    if (correct > 0) awards.push({ teamId: String(e.teamId), amount: correct * perVoter, voters: correct });
  }

  let eliminated = 0;
  let didIt = false;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      eliminated = 0;
      const now = new Date();
      const res = await Meeting.updateOne(
        { _id: m._id, status: "RESULTS" },
        { $set: { status: "RESOLVED", resolvedAt: now, resolvedBy: staff._id } },
        { session },
      );
      if (res.modifiedCount !== 1) return;
      didIt = true;
      for (const r of m.teamResults) {
        const pid = r.decision?.eliminatedPlayerId;
        if (!pid) continue;
        await Player.updateOne({ _id: pid, status: "alive" }, { $set: { status: "ghost", eliminatedAt: now, eliminationCause: "vote" } }, { session });
        await Elimination.create([{ gameId: game._id, playerId: pid, teamId: r.teamId, cause: "vote", meetingId: m._id, recordedBy: staffActor(staff) }], { session });
        eliminated += 1;
      }
      for (const a of awards) {
        await awardInSession(
          {
            gameId: game._id,
            teamId: new mongoose.Types.ObjectId(a.teamId),
            amount: a.amount,
            category: "internal_vote",
            reason: `${a.voters} correct vote(s) in emergency meeting #${m.number}`,
            idempotencyKey: `ivote:${m._id}:${a.teamId}`,
            createdBy: { type: "system", name: staff.name },
            source: { type: "meeting", id: m._id },
          },
          session,
        );
      }
      await Game.updateOne({ _id: game._id }, { $inc: { meetingsHeld: 1, version: 1 } }, { session });
    });
  } finally {
    await session.endSession();
  }
  if (!didIt) return { meeting: (await Meeting.findById(m._id).lean<MeetingDoc>())!, eliminated: 0, awards: [], alreadyDone: true };
  await audit({ gameId: game._id, actor: staffActor(staff), action: "MEETING_CONFIRMED", target: { type: "meeting", id: m._id }, after: { eliminated, awards }, ip });
  return { meeting: (await Meeting.findById(m._id).lean<MeetingDoc>())!, eliminated, awards: awards.map(({ teamId, amount }) => ({ teamId, amount })), alreadyDone: false };
}

/** Back to normal play after a resolved meeting. */
export async function resumeGame(staff: StaffDoc, game: GameDoc, meetingId: string, ip: string) {
  assertNotArchived(game);
  const m = await getMeeting(game, meetingId);
  if (m.status !== "RESOLVED") throw wrongStatus(m, "RESOLVED");
  const res = await Game.updateOne(
    { _id: game._id, phase: "MEETING", activeMeetingId: m._id },
    { $set: { phase: "PLAYING", activeMeetingId: null, votingDeadline: null, display: { screen: "LEADERBOARD", updatedAt: new Date() } }, $inc: { version: 1 } },
  );
  if (res.modifiedCount === 1) await audit({ gameId: game._id, actor: staffActor(staff), action: "GAME_RESUMED", target: { type: "meeting", id: m._id }, ip });
  return { phase: "PLAYING" as const };
}

/** Cancel a meeting that hasn't closed yet. It doesn't count towards the meeting limit. */
export async function cancelMeeting(staff: StaffDoc, game: GameDoc, meetingId: string, reason: string, ip: string) {
  assertNotArchived(game);
  const m = await getMeeting(game, meetingId);
  if (m.status === "CANCELLED") return m;
  const updated = await cas(m, ["CALLED", "VOTING"], { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason });
  await Game.updateOne(
    { _id: game._id, activeMeetingId: m._id },
    { $set: { phase: "PLAYING", activeMeetingId: null, votingDeadline: null, display: { screen: "LEADERBOARD", updatedAt: new Date() } }, $inc: { version: 1 } },
  );
  await audit({ gameId: game._id, actor: staffActor(staff), action: "MEETING_CANCELLED", target: { type: "meeting", id: m._id }, after: { reason }, ip });
  return updated;
}

/* ───────────────────────── Players: vote and predict ───────────────────────── */

async function openMeetingFor(player: PlayerDoc, game: GameDoc, meetingId: string) {
  const fresh = await autoCloseIfExpired(game);
  const m = await getMeeting(fresh, meetingId);
  if (m.status !== "VOTING" || !m.votingEndsAt || Date.now() > m.votingEndsAt.getTime() + graceMs(fresh)) {
    throw conflict("VOTING_CLOSED", "Voting is closed.");
  }
  const mine = m.eligible.find((e) => String(e.teamId) === String(player.teamId));
  if (!mine || !mine.voterIds.some((id) => String(id) === String(player._id))) {
    throw forbidden(
      player.status === "ghost" ? "Ghosts can't vote." : "You joined after voting opened, so you can't vote in this meeting.",
      "NOT_ELIGIBLE",
    );
  }
  return { meeting: m, game: fresh };
}

/** One vote per player per meeting, for an alive teammate (not yourself) or a skip. Retries return the same vote. */
export async function castVote(player: PlayerDoc, game: GameDoc, meetingId: string, targetId: string | null) {
  assertNotArchived(game);
  const { meeting: m, game: fresh } = await openMeetingFor(player, game, meetingId);
  const existing = await Vote.findOne({ meetingId: m._id, voterId: player._id }).lean<VoteDoc>();
  if (existing) return { vote: existing, alreadyVoted: true };

  if (targetId === null) {
    if (!(fresh.config?.allowSkipVote ?? true)) throw badRequest("SKIP_NOT_ALLOWED", "You have to vote for someone.");
  } else {
    const mine = m.eligible.find((e) => String(e.teamId) === String(player.teamId))!;
    if (targetId === String(player._id) || !mine.candidateIds.some((id) => String(id) === targetId)) {
      throw badRequest("INVALID_TARGET", "You can only vote for an alive member of your own team (not yourself).");
    }
  }
  try {
    const vote = await Vote.create({ gameId: game._id, meetingId: m._id, teamId: player.teamId, voterId: player._id, targetId });
    await bumpVersion(game._id);
    return { vote: vote.toObject() as VoteDoc, alreadyVoted: false };
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    return { vote: (await Vote.findOne({ meetingId: m._id, voterId: player._id }).lean<VoteDoc>())!, alreadyVoted: true };
  }
}

/** Optional cross-team prediction. The first teammate to predict a team locks it for the whole team. */
export async function makePrediction(player: PlayerDoc, game: GameDoc, meetingId: string, targetTeamId: string, targetPlayerId: string) {
  assertNotArchived(game);
  if (!(game.config?.predictionsEnabled ?? true)) throw forbidden("Predictions are turned off.", "PREDICTIONS_DISABLED");
  const { meeting: m } = await openMeetingFor(player, game, meetingId);
  if (targetTeamId === String(player.teamId)) throw badRequest("INVALID_TARGET", "Predict a player from another team — use your vote for your own team.");
  const theirs = m.eligible.find((e) => String(e.teamId) === targetTeamId);
  if (!theirs || !theirs.candidateIds.some((id) => String(id) === targetPlayerId)) {
    throw badRequest("INVALID_TARGET", "That player isn't an alive member of that team.");
  }
  try {
    const p = await Prediction.create({
      gameId: game._id,
      meetingId: m._id,
      predictorTeamId: player.teamId,
      predictorPlayerId: player._id,
      targetTeamId,
      targetPlayerId,
    });
    await bumpVersion(game._id);
    await audit({ gameId: game._id, actor: playerActor(player), action: "PREDICTION_MADE", target: { type: "prediction", id: p._id } });
    return p.toObject() as PredictionDoc;
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    const lock = (await Prediction.findOne({ meetingId: m._id, predictorTeamId: player.teamId, targetTeamId }).lean<PredictionDoc>())!;
    const names = await Player.find({ _id: { $in: [lock.predictorPlayerId, lock.targetPlayerId] } }).select("name").lean<PlayerDoc[]>();
    const name = (id: Types.ObjectId) => names.find((n) => String(n._id) === String(id))?.name ?? "?";
    throw new ApiError(409, "PREDICTION_LOCKED", `${name(lock.predictorPlayerId)} already predicted ${name(lock.targetPlayerId)} for your team.`, {
      lockedBy: { name: name(lock.predictorPlayerId) },
      target: { name: name(lock.targetPlayerId) },
    });
  }
}

/* ───────────────────────── GM: corrections ───────────────────────── */

/** Removes a vote before results (e.g. cast on the wrong phone). That person may vote again while voting is open. */
export async function invalidateVote(staff: StaffDoc, game: GameDoc, voteId: string, reason: string, ip: string) {
  assertNotArchived(game);
  const v = await Vote.findOne({ _id: voteId, gameId: game._id }).lean<VoteDoc>();
  if (!v) throw notFound("Vote not found.");
  const m = await getMeeting(game, v.meetingId);
  if (!["VOTING", "CLOSED"].includes(m.status)) throw conflict("TOO_LATE", "Votes can only be removed before results are revealed.");
  await Vote.deleteOne({ _id: v._id });
  if (m.status === "CLOSED") {
    const idx = m.teamResults.findIndex((r) => String(r.teamId) === String(v.teamId));
    if (idx >= 0) {
      const fresh = await computeTeamResult(m, v.teamId);
      await Meeting.updateOne({ _id: m._id, status: "CLOSED" }, { $set: { [`teamResults.${idx}`]: fresh } });
    }
  }
  await bumpVersion(game._id);
  await audit({ gameId: game._id, actor: staffActor(staff), action: "VOTE_INVALIDATED", target: { type: "vote", id: v._id }, before: v, after: { reason }, ip });
}

/** Removes a prediction before it is scored; this unlocks that team → team pair again. */
export async function invalidatePrediction(staff: StaffDoc, game: GameDoc, predictionId: string, reason: string, ip: string) {
  assertNotArchived(game);
  const p = await Prediction.findOne({ _id: predictionId, gameId: game._id }).lean<PredictionDoc>();
  if (!p) throw notFound("Prediction not found.");
  if (p.scoredAt) throw conflict("TOO_LATE", "This prediction has already been scored.");
  await Prediction.deleteOne({ _id: p._id, scoredAt: null });
  await bumpVersion(game._id);
  await audit({ gameId: game._id, actor: staffActor(staff), action: "PREDICTION_INVALIDATED", target: { type: "prediction", id: p._id }, before: p, after: { reason }, ip });
}
