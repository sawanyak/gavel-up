import crypto from "crypto";
import type { Types } from "mongoose";
import { LOGIN_CODE_TTL_MS, PLAYER_SESSION_TTL_MS } from "@/lib/shared/constants";
import { normalizeName } from "@/lib/shared/validation";
import { audit, bumpVersion } from "../audit";
import { assertNotArchived, assertTeamAccess, getGameByCode, staffActor } from "../auth/guards";
import { createSession, revokeSessionsFor, sha256 } from "../auth/session";
import { ApiError, badRequest, conflict, forbidden, isDuplicateKey, notFound, unauthenticated } from "../errors";
import { Game, LoginCode, Player, Team, type GameDoc, type PlayerDoc, type StaffDoc } from "../models";
import { rateLimit } from "../rateLimit";

export interface RegisterInput {
  gameCode?: string;
  name: string;
  phone: string; // already normalised to E.164 by zod
  teamId: string;
}

/**
 * Register a player (plan §9.3). Returns `created: false` when the same device retries
 * with the same phone (idempotent), and a session token when a new session is needed.
 */
export async function registerPlayer(
  input: RegisterInput,
  ctx: { ip: string; userAgent: string; existing: { player: PlayerDoc } | null },
): Promise<{ player: PlayerDoc; token: string | null; created: boolean; game: GameDoc }> {
  const game = await getGameByCode(input.gameCode);
  assertNotArchived(game);

  // Same device retrying (double tap / refresh): return the existing registration.
  if (
    ctx.existing &&
    String(ctx.existing.player.gameId) === String(game._id) &&
    ctx.existing.player.phoneE164 === input.phone
  ) {
    return { player: ctx.existing.player, token: null, created: false, game };
  }

  if (!game.registrationOpen) throw forbidden("Registration is closed right now.", "REGISTRATION_CLOSED");

  // Venue Wi-Fi shares one IP, so the per-IP limit is generous; per-phone is strict.
  await rateLimit(`reg:ip:${ctx.ip}`, 60, 60);
  await rateLimit(`reg:phone:${input.phone}`, 5, 600);

  const team = await Team.findOne({ _id: input.teamId, gameId: game._id }).lean();
  if (!team) throw badRequest("INVALID_TEAM", "Pick one of the listed team colours.");

  const late = !!game.rolesRevealedAt;
  let player;
  try {
    player = await Player.create({
      gameId: game._id,
      teamId: team._id,
      name: input.name,
      nameNormalized: normalizeName(input.name),
      phoneE164: input.phone,
      late,
      // Late joiners get the configured role immediately; existing players are never reassigned (plan §11.1).
      ...(late ? { role: game.config?.lateJoinerRole ?? "crewmate", roleAssignedAt: new Date(), roleSource: "late" } : {}),
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw conflict(
        "PHONE_ALREADY_REGISTERED",
        "This phone number is already registered. If it's you on a new phone, ask a Team Manager for a login code.",
      );
    }
    throw err;
  }

  // Race guard: if roles were revealed between reading the game and inserting this player,
  // the reveal's sweep may have missed us — give the late-joiner role now. (The reveal does
  // its own sweep too, so whichever happens second catches it.)
  if (!late) {
    const fresh = await Game.findById(game._id).select("rolesRevealedAt config.lateJoinerRole").lean<GameDoc>();
    if (fresh?.rolesRevealedAt) {
      await Player.updateOne(
        { _id: player._id, role: null },
        { $set: { role: fresh.config?.lateJoinerRole ?? "crewmate", roleAssignedAt: new Date(), roleSource: "late", late: true } },
      );
    }
  }

  const token = await createSession({
    subjectType: "player",
    subjectId: player._id,
    gameId: game._id,
    ttlMs: PLAYER_SESSION_TTL_MS,
    userAgent: ctx.userAgent,
  });
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: { type: "player", id: player._id, name: player.name },
    action: "PLAYER_REGISTERED",
    target: { type: "player", id: player._id },
    after: { name: player.name, teamId: team._id, late },
    ip: ctx.ip,
  });
  return { player: player.toObject() as PlayerDoc, token, created: true, game };
}

const codeHash = (playerId: Types.ObjectId | string, code: string) => sha256(`${playerId}:${code}`);

/** Staff issues a one-time 6-digit code so a player can log in on a new device (plan §13). */
export async function issueLoginCode(staff: StaffDoc, playerId: string, ip: string) {
  const player = await Player.findById(playerId).lean<PlayerDoc>();
  if (!player || player.removedAt) throw notFound("Player not found.");
  assertTeamAccess(staff, player.teamId);

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + LOGIN_CODE_TTL_MS);
  // Only the newest code is valid.
  await LoginCode.updateMany({ playerId: player._id, usedAt: null }, { $set: { usedAt: new Date() } });
  await LoginCode.create({ gameId: player.gameId, playerId: player._id, codeHash: codeHash(player._id, code), issuedBy: staff._id, expiresAt });
  await audit({
    gameId: player.gameId,
    actor: staffActor(staff),
    action: "LOGIN_CODE_ISSUED",
    target: { type: "player", id: player._id },
    ip,
  });
  return { code, expiresAt };
}

export async function recoverWithCode(
  input: { gameCode?: string; phone: string; code: string },
  ctx: { ip: string; userAgent: string },
) {
  const game = await getGameByCode(input.gameCode);
  assertNotArchived(game);
  await rateLimit(`recover:phone:${input.phone}`, 5, 600);
  await rateLimit(`recover:ip:${ctx.ip}`, 30, 600);

  const invalid = () => unauthenticated("That code is wrong or has expired. Ask a Team Manager for a new one.", "INVALID_CODE");
  const player = await Player.findOne({ gameId: game._id, phoneE164: input.phone, removedAt: null }).lean<PlayerDoc>();
  if (!player) throw invalid();

  // Atomically consume the code so it can't be used twice (even concurrently).
  const used = await LoginCode.findOneAndUpdate(
    { playerId: player._id, codeHash: codeHash(player._id, input.code), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  );
  if (!used) throw invalid();

  await revokeSessionsFor(player._id); // log out the old device(s)
  const token = await createSession({
    subjectType: "player",
    subjectId: player._id,
    gameId: game._id,
    ttlMs: PLAYER_SESSION_TTL_MS,
    userAgent: ctx.userAgent,
  });
  await audit({
    gameId: game._id,
    actor: { type: "player", id: player._id, name: player.name },
    action: "PLAYER_RECOVERED_SESSION",
    target: { type: "player", id: player._id },
    ip: ctx.ip,
  });
  return { player, token };
}

/** GM edits a player's name or team (plan §9.5). */
export async function updatePlayer(
  staff: StaffDoc,
  game: GameDoc,
  playerId: string,
  input: { name?: string; teamId?: string; force?: boolean },
  ip: string,
) {
  assertNotArchived(game);
  const player = await Player.findOne({ _id: playerId, gameId: game._id, removedAt: null }).lean<PlayerDoc>();
  if (!player) throw notFound("Player not found.");

  const set: Record<string, unknown> = {};
  if (input.name && input.name !== player.name) {
    set.name = input.name;
    set.nameNormalized = normalizeName(input.name);
  }
  if (input.teamId && input.teamId !== String(player.teamId)) {
    const team = await Team.findOne({ _id: input.teamId, gameId: game._id }).lean();
    if (!team) throw badRequest("INVALID_TEAM", "Team not found.");
    if (game.rolesRevealedAt && !input.force) {
      throw conflict(
        "ROLES_ALREADY_ASSIGNED",
        "Roles are already revealed. Moving this player may leave a team without its impostor/detective. Confirm to move anyway.",
      );
    }
    set.teamId = team._id;
  }
  if (Object.keys(set).length === 0) return player;

  const updated = await Player.findByIdAndUpdate(player._id, { $set: set }, { new: true }).lean<PlayerDoc>();
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "PLAYER_UPDATED",
    target: { type: "player", id: player._id },
    before: { name: player.name, teamId: player.teamId },
    after: set,
    ip,
  });
  return updated!;
}

/**
 * Soft-delete a junk/duplicate registration. The phone is renamed so the real person can
 * register again; the original phone is kept in the audit log.
 */
export async function removePlayer(staff: StaffDoc, game: GameDoc, playerId: string, reason: string, ip: string) {
  assertNotArchived(game);
  const player = await Player.findOne({ _id: playerId, gameId: game._id, removedAt: null }).lean<PlayerDoc>();
  if (!player) throw notFound("Player not found.");
  const res = await Player.updateOne(
    { _id: player._id, removedAt: null },
    { $set: { removedAt: new Date(), phoneE164: `${player.phoneE164}#removed-${player._id}` } },
  );
  if (res.modifiedCount === 0) throw new ApiError(409, "ALREADY_REMOVED", "Player was already removed.");
  await revokeSessionsFor(player._id);
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "PLAYER_REMOVED",
    target: { type: "player", id: player._id },
    before: { name: player.name, phone: player.phoneE164, teamId: player.teamId },
    after: { reason },
    ip,
  });
}
