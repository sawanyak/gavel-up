import mongoose from "mongoose";
import type { Role } from "@/lib/shared/constants";
import { audit, bumpVersion } from "../audit";
import { assertNotArchived, staffActor } from "../auth/guards";
import { ApiError, badRequest, conflict, notFound } from "../errors";
import { allocateRoles, cryptoRng, planTeam, type Rng, type RoleConfig, type TeamPlan } from "../game/roles";
import { Game, Player, Team, type GameDoc, type PlayerDoc, type StaffDoc, type TeamDoc } from "../models";

const STALE_LOCK_MS = 60_000;

export function roleConfigOf(game: GameDoc): RoleConfig {
  const c = game.config ?? ({} as GameDoc["config"]);
  const overrides = c?.impostorOverrides as unknown;
  return {
    impostorsPerTeam: c?.impostorsPerTeam ?? 1,
    detectivesPerTeam: c?.detectivesPerTeam ?? 1,
    minTeamSizeForSpecialRoles: c?.minTeamSizeForSpecialRoles ?? 3,
    impostorOverrides:
      overrides instanceof Map ? Object.fromEntries(overrides) : ((overrides as Record<string, number> | undefined) ?? {}),
  };
}

/** What Reveal Roles would do right now (counts only, no names). */
export async function revealPreview(game: GameDoc): Promise<{ plans: (TeamPlan & { teamName: string })[]; warnings: string[] }> {
  const [teams, counts] = await Promise.all([
    Team.find({ gameId: game._id }).sort({ order: 1 }).lean<TeamDoc[]>(),
    Player.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { gameId: game._id, removedAt: null } },
      { $group: { _id: "$teamId", n: { $sum: 1 } } },
    ]),
  ]);
  const byTeam = new Map(counts.map((c) => [String(c._id), c.n]));
  const config = roleConfigOf(game);
  const plans = teams.map((t) => ({ ...planTeam(String(t._id), byTeam.get(String(t._id)) ?? 0, config, t.name), teamName: t.name }));
  return { plans, warnings: plans.flatMap((p) => p.warnings) };
}

export interface RevealResult {
  alreadyRevealed: boolean;
  summary: { teamId: string; teamName: string; impostors: number; detectives: number; crewmates: number }[];
  warnings: string[];
}

async function currentSummary(gameId: mongoose.Types.ObjectId): Promise<RevealResult["summary"]> {
  const [teams, rows] = await Promise.all([
    Team.find({ gameId }).sort({ order: 1 }).lean<TeamDoc[]>(),
    Player.aggregate<{ _id: { teamId: mongoose.Types.ObjectId; role: Role | null }; n: number }>([
      { $match: { gameId, removedAt: null } },
      { $group: { _id: { teamId: "$teamId", role: "$role" }, n: { $sum: 1 } } },
    ]),
  ]);
  return teams.map((t) => {
    const count = (role: Role) => rows.find((r) => String(r._id.teamId) === String(t._id) && r._id.role === role)?.n ?? 0;
    return { teamId: String(t._id), teamName: t.name, impostors: count("impostor"), detectives: count("detective"), crewmates: count("crewmate") };
  });
}

/**
 * Reveal Roles (plan §6.18, §11.1): atomic, idempotent, safe under concurrent clicks.
 * 1. Take a lock on the game document (compare-and-set).
 * 2. Allocate roles in memory, write them all + flip the phase in ONE transaction.
 * 3. Sweep: anyone who registered mid-reveal gets the late-joiner role.
 */
export async function revealRoles(staff: StaffDoc, game: GameDoc, ip: string, rng: Rng = cryptoRng): Promise<RevealResult> {
  assertNotArchived(game);
  if (game.rolesRevealedAt) return { alreadyRevealed: true, summary: await currentSummary(game._id), warnings: [] };
  if (game.phase !== "LOBBY") throw conflict("INVALID_PHASE", "Open registration (Lobby) before revealing roles.");

  const now = new Date();
  const locked = await Game.findOneAndUpdate(
    {
      _id: game._id,
      rolesRevealedAt: null,
      $or: [{ revealLock: null }, { "revealLock.at": { $lt: new Date(now.getTime() - STALE_LOCK_MS) } }],
    },
    { $set: { revealLock: { by: staff._id, at: now } } },
    { new: true },
  ).lean<GameDoc>();

  if (!locked) {
    const fresh = await Game.findById(game._id).lean<GameDoc>();
    if (fresh?.rolesRevealedAt) return { alreadyRevealed: true, summary: await currentSummary(game._id), warnings: [] };
    throw conflict("REVEAL_IN_PROGRESS", "Roles are being revealed right now. Wait a few seconds.");
  }

  const releaseLock = () =>
    Game.updateOne({ _id: game._id, rolesRevealedAt: null, "revealLock.by": staff._id }, { $set: { revealLock: null } });

  let warnings: string[] = [];
  try {
    const [teams, players] = await Promise.all([
      Team.find({ gameId: game._id }).sort({ order: 1 }).lean<TeamDoc[]>(),
      Player.find({ gameId: game._id, removedAt: null }).select("_id teamId").lean<PlayerDoc[]>(),
    ]);
    if (players.length === 0) throw new ApiError(422, "NO_PLAYERS", "Nobody has registered yet.");

    const allocation = allocateRoles(
      teams.map((t) => ({
        teamId: String(t._id),
        teamName: t.name,
        playerIds: players.filter((p) => String(p.teamId) === String(t._id)).map((p) => String(p._id)),
      })),
      roleConfigOf(locked),
      rng,
    );
    const { assignments } = allocation;
    warnings = allocation.warnings;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const ops = [...assignments].map(([id, role]) => ({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(id), role: null },
            update: { $set: { role, roleAssignedAt: now, roleSource: "reveal" as const } },
          },
        }));
        if (ops.length) await Player.bulkWrite(ops, { session });
        const res = await Game.updateOne(
          { _id: game._id, rolesRevealedAt: null, "revealLock.by": staff._id },
          {
            $set: { rolesRevealedAt: now, phase: "PLAYING", revealLock: null, display: { screen: "RULES", updatedAt: now } },
            $inc: { version: 1 },
          },
          { session },
        );
        if (res.modifiedCount !== 1) throw conflict("REVEAL_IN_PROGRESS", "Another reveal finished first.");
      });
    } finally {
      await session.endSession();
    }
  } catch (err) {
    await releaseLock();
    throw err;
  }

  // Anyone whose registration landed while we were allocating becomes a late joiner.
  await assignLateRolesSweep(game._id, locked.config?.lateJoinerRole ?? "crewmate");

  const summary = await currentSummary(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "ROLES_REVEALED",
    after: { summary, warnings },
    ip,
  });
  return { alreadyRevealed: false, summary, warnings };
}

/** Gives the late-joiner role to any non-removed player still without a role (after reveal). */
export async function assignLateRolesSweep(gameId: mongoose.Types.ObjectId, lateRole: string) {
  const res = await Player.updateMany(
    { gameId, removedAt: null, role: null },
    { $set: { role: lateRole, roleAssignedAt: new Date(), roleSource: "late", late: true } },
  );
  if (res.modifiedCount > 0) await bumpVersion(gameId);
  return res.modifiedCount;
}

/** GM manually sets a player's role after reveal (fix a mistake / fill a gap). */
export async function overrideRole(staff: StaffDoc, game: GameDoc, playerId: string, role: Role, reason: string, ip: string) {
  assertNotArchived(game);
  if (!game.rolesRevealedAt) throw conflict("ROLES_NOT_REVEALED", "Roles haven't been revealed yet.");
  const player = await Player.findOne({ _id: playerId, gameId: game._id, removedAt: null }).select("+role").lean<PlayerDoc>();
  if (!player) throw notFound("Player not found.");
  if (player.role === role) return { player, teamImpostors: await countRole(player.teamId, "impostor") };

  await Player.updateOne({ _id: player._id }, { $set: { role, roleAssignedAt: new Date(), roleSource: "gm_override" } });
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "ROLE_OVERRIDDEN",
    target: { type: "player", id: player._id },
    before: { role: player.role },
    after: { role, reason },
    ip,
  });
  return { player: { ...player, role }, teamImpostors: await countRole(player.teamId, "impostor") };
}

const countRole = (teamId: mongoose.Types.ObjectId, role: Role) => Player.countDocuments({ teamId, role, removedAt: null });

/** Promote a random alive crewmate in a team to impostor/detective (e.g. a team filled by late joiners). */
export async function assignRandomRole(
  staff: StaffDoc,
  game: GameDoc,
  teamId: string,
  role: "impostor" | "detective",
  ip: string,
  rng: Rng = cryptoRng,
) {
  assertNotArchived(game);
  if (!game.rolesRevealedAt) throw conflict("ROLES_NOT_REVEALED", "Roles haven't been revealed yet.");
  const team = await Team.findOne({ _id: teamId, gameId: game._id }).lean<TeamDoc>();
  if (!team) throw notFound("Team not found.");
  const candidates = await Player.find({ teamId: team._id, removedAt: null, status: "alive", role: "crewmate" }).select("_id name").lean<PlayerDoc[]>();
  if (candidates.length < 2) throw badRequest("NOT_ENOUGH_CREWMATES", "This team needs at least 2 alive crewmates to pick from.");
  const pick = candidates[rng(candidates.length)];
  // Compare-and-set so two clicks can't promote two different players at once.
  const res = await Player.updateOne(
    { _id: pick._id, role: "crewmate" },
    { $set: { role, roleAssignedAt: new Date(), roleSource: "gm_override" } },
  );
  if (res.modifiedCount !== 1) throw conflict("RETRY", "Please try again.");
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "ROLE_RANDOM_ASSIGNED",
    target: { type: "player", id: pick._id },
    before: { role: "crewmate" },
    after: { role, teamId: team._id },
    ip,
  });
  return { player: { id: String(pick._id), name: pick.name, role } };
}

export interface RoleConfigInput {
  impostorsPerTeam?: number;
  detectivesPerTeam?: number;
  minTeamSizeForSpecialRoles?: number;
  impostorsSeeEachOther?: boolean;
  impostorOverrides?: Record<string, number>;
}

/** Role settings — locked once roles are revealed. */
export async function updateRoleConfig(staff: StaffDoc, game: GameDoc, input: RoleConfigInput, ip: string) {
  assertNotArchived(game);
  if (game.rolesRevealedAt) throw conflict("CONFIG_LOCKED", "Role settings can't change after roles are revealed.");
  if (input.impostorOverrides) {
    const ids = Object.keys(input.impostorOverrides);
    const n = await Team.countDocuments({ gameId: game._id, _id: { $in: ids } });
    if (n !== ids.length) throw badRequest("INVALID_TEAM", "Unknown team in impostor overrides.");
  }
  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) if (v !== undefined) set[`config.${k}`] = v;
  if (Object.keys(set).length === 0) return roleConfigOf(game);
  await Game.updateOne({ _id: game._id, rolesRevealedAt: null }, { $set: set, $inc: { version: 1 } });
  await audit({ gameId: game._id, actor: staffActor(staff), action: "ROLE_CONFIG_UPDATED", after: input, ip });
  const fresh = (await Game.findById(game._id).lean<GameDoc>())!;
  return { ...roleConfigOf(fresh), impostorsSeeEachOther: fresh.config?.impostorsSeeEachOther ?? true };
}
