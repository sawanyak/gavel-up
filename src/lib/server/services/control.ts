import mongoose from "mongoose";
import { audit, bumpVersion } from "../audit";
import { assertNotArchived, assertTeamAccess, staffActor } from "../auth/guards";
import { badRequest, conflict, notFound } from "../errors";
import { Elimination, Game, Investigation, Meeting, Player, type GameDoc, type MeetingDoc, type PlayerDoc, type StaffDoc } from "../models";

/** Kills happen while the game runs (roles revealed, before the final reveal). */
const KILL_PHASES = ["PLAYING", "MEETING"];

async function getPlayer(game: GameDoc, playerId: string) {
  const player = await Player.findOne({ _id: playerId, gameId: game._id, removedAt: null }).lean<PlayerDoc>();
  if (!player) throw notFound("Player not found.");
  return player;
}

/** GM, or the victim's TM, marks a sticker kill: the player becomes a ghost (plan R19). */
export async function killPlayer(staff: StaffDoc, game: GameDoc, playerId: string, note: string | undefined, ip: string) {
  assertNotArchived(game);
  if (!KILL_PHASES.includes(game.phase)) throw conflict("INVALID_PHASE", "Kills can only be marked while the game is running.");
  if (game.phase === "MEETING" && game.activeMeetingId) {
    // Voters are frozen when voting opens, so kills pause from then until the game resumes.
    const m = await Meeting.findById(game.activeMeetingId).select("status").lean<MeetingDoc>();
    if (m && m.status !== "CALLED") throw conflict("KILLS_PAUSED", "Kills are paused while the meeting is voting. Mark it after the game resumes.");
  }
  const player = await getPlayer(game, playerId);
  assertTeamAccess(staff, player.teamId);

  const now = new Date();
  const res = await Player.updateOne(
    { _id: player._id, status: "alive" },
    { $set: { status: "ghost", eliminatedAt: now, eliminationCause: "kill" } },
  );
  if (res.modifiedCount !== 1) throw conflict("ALREADY_GHOST", `${player.name} is already a ghost.`);

  await Elimination.create({
    gameId: game._id,
    playerId: player._id,
    teamId: player.teamId,
    cause: "kill",
    recordedBy: staffActor(staff),
    note: note ?? "",
  });
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "PLAYER_KILLED",
    target: { type: "player", id: player._id },
    before: { status: "alive" },
    after: { status: "ghost", note: note ?? null },
    ip,
  });
  return { id: String(player._id), name: player.name, status: "ghost" as const };
}

/** GM-only: undo a kill (or any elimination). */
export async function revivePlayer(staff: StaffDoc, game: GameDoc, playerId: string, reason: string, ip: string) {
  assertNotArchived(game);
  const player = await getPlayer(game, playerId);
  const res = await Player.updateOne(
    { _id: player._id, status: "ghost" },
    { $set: { status: "alive", eliminatedAt: null, eliminationCause: null } },
  );
  if (res.modifiedCount !== 1) throw conflict("NOT_A_GHOST", `${player.name} is not a ghost.`);

  const latest = await Elimination.findOne({ playerId: player._id, revertedAt: null }).sort({ createdAt: -1 });
  if (latest) {
    latest.set({ revertedAt: new Date(), revertedBy: staff._id, revertReason: reason });
    await latest.save();
  }
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "PLAYER_REVIVED",
    target: { type: "player", id: player._id },
    before: { status: "ghost", cause: player.eliminationCause },
    after: { status: "alive", reason },
    ip,
  });
  return { id: String(player._id), name: player.name, status: "alive" as const };
}

/**
 * GM logs a Detective's physical question "Is <target> an impostor?" (plan R22).
 * Returns the true answer for the GM to say privately. The limit is enforced with a
 * conditional increment inside a transaction, so double-taps can't use two questions.
 */
export async function recordInvestigation(staff: StaffDoc, game: GameDoc, detectiveId: string, targetId: string, ip: string) {
  assertNotArchived(game);
  if (!game.rolesRevealedAt) throw conflict("ROLES_NOT_REVEALED", "Roles haven't been revealed yet.");
  if (detectiveId === targetId) throw badRequest("INVALID_TARGET", "A detective can't investigate themselves.");

  const detective = await Player.findOne({ _id: detectiveId, gameId: game._id, removedAt: null }).select("+role").lean<PlayerDoc>();
  if (!detective) throw notFound("Detective not found.");
  if (detective.role !== "detective") throw badRequest("NOT_DETECTIVE", `${detective.name} is not a detective.`);
  if (detective.status !== "alive") throw conflict("DETECTIVE_IS_GHOST", `${detective.name} is a ghost and can't investigate.`);
  const target = await Player.findOne({ _id: targetId, gameId: game._id, removedAt: null }).select("+role").lean<PlayerDoc>();
  if (!target) throw notFound("Target player not found.");

  const limit = game.config?.detectiveInvestigationLimit ?? 1;
  const answerIsImpostor = target.role === "impostor";
  let remaining = 0;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await Player.findOneAndUpdate(
        { _id: detective._id, investigationsUsed: { $lt: limit } },
        { $inc: { investigationsUsed: 1 } },
        { new: true, session },
      ).lean<PlayerDoc>();
      if (!updated) throw conflict("INVESTIGATION_LIMIT", `${detective.name} has used all ${limit} investigation(s).`);
      remaining = Math.max(0, limit - updated.investigationsUsed);
      await Investigation.create([{ gameId: game._id, detectiveId: detective._id, targetId: target._id, answerIsImpostor, recordedBy: staff._id }], {
        session,
      });
      await Game.updateOne({ _id: game._id }, { $inc: { version: 1 } }, { session });
    });
  } finally {
    await session.endSession();
  }

  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "DETECTIVE_INVESTIGATION",
    target: { type: "player", id: detective._id },
    after: { targetId: target._id, targetName: target.name, answerIsImpostor },
    ip,
  });
  return { answerIsImpostor, remaining, detective: { id: String(detective._id), name: detective.name }, target: { id: String(target._id), name: target.name } };
}
