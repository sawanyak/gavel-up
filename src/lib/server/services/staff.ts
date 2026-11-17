import bcrypt from "bcryptjs";
import { STAFF_LOCK_MS, STAFF_MAX_FAILED_LOGINS, STAFF_SESSION_TTL_MS, TEAM_COLORS, type TeamColorKey } from "@/lib/shared/constants";
import { normalizeName } from "@/lib/shared/validation";
import { audit, bumpVersion } from "../audit";
import { assertNotArchived, staffActor } from "../auth/guards";
import { createSession, revokeSessionsFor } from "../auth/session";
import { ApiError, badRequest, conflict, isDuplicateKey, notFound, unauthenticated } from "../errors";
import { Game, Player, Staff, Team, type GameDoc, type StaffDoc } from "../models";
import { rateLimit } from "../rateLimit";

const BCRYPT_ROUNDS = 10;
export const hashPin = (pin: string) => bcrypt.hash(pin, BCRYPT_ROUNDS);

export async function staffLogin(input: { name: string; pin: string }, ctx: { ip: string; userAgent: string }) {
  await rateLimit(`staff-login:ip:${ctx.ip}`, 30, 60);
  const invalid = () => unauthenticated("Wrong name or PIN.", "INVALID_CREDENTIALS");

  const staff = await Staff.findOne({ nameNormalized: input.name }).select("+pinHash");
  if (!staff || !staff.active) throw invalid();
  if (staff.lockedUntil && staff.lockedUntil.getTime() > Date.now()) {
    throw new ApiError(429, "LOCKED", "Too many wrong PINs. Try again in a few minutes.");
  }

  const ok = await bcrypt.compare(input.pin, staff.pinHash);
  if (!ok) {
    const failed = (staff.failedAttempts ?? 0) + 1;
    if (failed >= STAFF_MAX_FAILED_LOGINS) {
      await Staff.updateOne({ _id: staff._id }, { $set: { failedAttempts: 0, lockedUntil: new Date(Date.now() + STAFF_LOCK_MS) } });
      await audit({ actor: { type: "system" }, action: "STAFF_LOCKED", target: { type: "staff", id: staff._id }, ip: ctx.ip });
      throw new ApiError(429, "LOCKED", "Too many wrong PINs. Try again in a few minutes.");
    }
    await Staff.updateOne({ _id: staff._id }, { $set: { failedAttempts: failed } });
    throw invalid();
  }

  await Staff.updateOne({ _id: staff._id }, { $set: { failedAttempts: 0, lockedUntil: null, lastSeenAt: new Date() } });
  const token = await createSession({ subjectType: "staff", subjectId: staff._id, ttlMs: STAFF_SESSION_TTL_MS, userAgent: ctx.userAgent });
  const plain = staff.toObject() as StaffDoc;
  await audit({ actor: staffActor(plain), action: "STAFF_LOGIN", ip: ctx.ip });
  return { staff: plain, token };
}

async function validateTeamIds(game: GameDoc, teamIds: string[]) {
  if (teamIds.length === 0) return [];
  const teams = await Team.find({ _id: { $in: teamIds }, gameId: game._id }).select("_id").lean();
  if (teams.length !== new Set(teamIds).size) throw badRequest("INVALID_TEAM", "One or more teams don't exist.");
  return teams.map((t) => t._id);
}

export async function createStaff(
  actor: StaffDoc,
  game: GameDoc,
  input: { name: string; role: "GM" | "TM"; teamIds: string[]; pin: string },
  ip: string,
) {
  const teamIds = input.role === "TM" ? await validateTeamIds(game, input.teamIds) : [];
  if (input.role === "TM" && teamIds.length === 0) throw badRequest("TEAM_REQUIRED", "A Team Manager needs at least one team.");
  try {
    const staff = await Staff.create({
      name: input.name,
      nameNormalized: normalizeName(input.name),
      role: input.role,
      teamIds,
      pinHash: await hashPin(input.pin),
      createdBy: actor._id,
    });
    await audit({ gameId: game._id, actor: staffActor(actor), action: "STAFF_CREATED", target: { type: "staff", id: staff._id }, after: { name: staff.name, role: staff.role, teamIds }, ip });
    await bumpVersion(game._id);
    return (await Staff.findById(staff._id).lean<StaffDoc>())!;
  } catch (err) {
    if (isDuplicateKey(err)) throw conflict("STAFF_NAME_TAKEN", "A staff member with that name already exists.");
    throw err;
  }
}

export async function updateStaff(
  actor: StaffDoc,
  game: GameDoc,
  staffId: string,
  input: { name?: string; role?: "GM" | "TM"; teamIds?: string[]; pin?: string; active?: boolean },
  ip: string,
) {
  const target = await Staff.findById(staffId).lean<StaffDoc>();
  if (!target) throw notFound("Staff member not found.");

  const newRole = input.role ?? target.role;
  const newActive = input.active ?? target.active;
  // Never leave the event without an active Game Master.
  if (target.role === "GM" && target.active && (newRole !== "GM" || !newActive)) {
    const otherGMs = await Staff.countDocuments({ role: "GM", active: true, _id: { $ne: target._id } });
    if (otherGMs === 0) throw conflict("LAST_GM", "You can't remove the last active Game Master.");
  }

  const set: Record<string, unknown> = {};
  if (input.name) {
    set.name = input.name;
    set.nameNormalized = normalizeName(input.name);
  }
  if (input.role) set.role = input.role;
  if (input.active !== undefined) set.active = input.active;
  if (input.teamIds) set.teamIds = await validateTeamIds(game, input.teamIds);
  if (newRole === "GM") set.teamIds = [];
  if (newRole === "TM" && (((set.teamIds as unknown[]) ?? target.teamIds).length === 0)) {
    throw badRequest("TEAM_REQUIRED", "A Team Manager needs at least one team.");
  }
  if (input.pin) {
    set.pinHash = await hashPin(input.pin);
    set.failedAttempts = 0;
    set.lockedUntil = null;
  }

  try {
    await Staff.updateOne({ _id: target._id }, { $set: set });
  } catch (err) {
    if (isDuplicateKey(err)) throw conflict("STAFF_NAME_TAKEN", "A staff member with that name already exists.");
    throw err;
  }
  // Changing PIN, role or deactivating logs them out everywhere.
  if (input.pin || input.active === false || (input.role && input.role !== target.role)) {
    await revokeSessionsFor(target._id);
  }
  const { pinHash: _omit, ...auditable } = set;
  await audit({
    gameId: game._id,
    actor: staffActor(actor),
    action: "STAFF_UPDATED",
    target: { type: "staff", id: target._id },
    before: { name: target.name, role: target.role, teamIds: target.teamIds, active: target.active },
    after: { ...auditable, ...(input.pin ? { pinChanged: true } : {}) },
    ip,
  });
  await bumpVersion(game._id);
  return (await Staff.findById(target._id).lean<StaffDoc>())!;
}

export async function setRegistrationOpen(actor: StaffDoc, game: GameDoc, open: boolean, ip: string) {
  assertNotArchived(game);
  const set: Record<string, unknown> = { registrationOpen: open };
  if (open && game.phase === "SETUP") set.phase = "LOBBY";
  const teamCount = await Team.countDocuments({ gameId: game._id });
  if (open && teamCount < 2) throw badRequest("NOT_ENOUGH_TEAMS", "Create at least 2 teams before opening registration.");
  await Game.updateOne({ _id: game._id }, { $set: set, $inc: { version: 1 } });
  await audit({
    gameId: game._id,
    actor: staffActor(actor),
    action: open ? "REGISTRATION_OPENED" : "REGISTRATION_CLOSED",
    before: { registrationOpen: game.registrationOpen, phase: game.phase },
    after: set,
    ip,
  });
  return { registrationOpen: open, phase: (set.phase as string) ?? game.phase };
}

export async function createTeam(actor: StaffDoc, game: GameDoc, input: { key: string; name: string; order?: number }, ip: string) {
  assertNotArchived(game);
  try {
    const order = input.order ?? (await Team.countDocuments({ gameId: game._id })) + 1;
    const team = await Team.create({
      gameId: game._id,
      key: input.key,
      name: input.name,
      colorHex: TEAM_COLORS[input.key as TeamColorKey],
      order,
    });
    await bumpVersion(game._id);
    await audit({ gameId: game._id, actor: staffActor(actor), action: "TEAM_CREATED", target: { type: "team", id: team._id }, after: input, ip });
    return team.toObject();
  } catch (err) {
    if (isDuplicateKey(err)) throw conflict("TEAM_EXISTS", "A team with that colour already exists.");
    throw err;
  }
}

export async function updateTeam(actor: StaffDoc, game: GameDoc, teamId: string, input: { key?: string; name?: string; order?: number }, ip: string) {
  assertNotArchived(game);
  const team = await Team.findOne({ _id: teamId, gameId: game._id }).lean();
  if (!team) throw notFound("Team not found.");
  const set: Record<string, unknown> = { ...input };
  if (input.key) set.colorHex = TEAM_COLORS[input.key as TeamColorKey];
  try {
    const updated = await Team.findByIdAndUpdate(team._id, { $set: set }, { new: true }).lean();
    await bumpVersion(game._id);
    await audit({ gameId: game._id, actor: staffActor(actor), action: "TEAM_UPDATED", target: { type: "team", id: team._id }, before: { key: team.key, name: team.name, order: team.order }, after: set, ip });
    return updated!;
  } catch (err) {
    if (isDuplicateKey(err)) throw conflict("TEAM_EXISTS", "A team with that colour already exists.");
    throw err;
  }
}

export async function deleteTeam(actor: StaffDoc, game: GameDoc, teamId: string, ip: string) {
  assertNotArchived(game);
  const team = await Team.findOne({ _id: teamId, gameId: game._id }).lean();
  if (!team) throw notFound("Team not found.");
  const players = await Player.countDocuments({ teamId: team._id, removedAt: null });
  if (players > 0) throw conflict("TEAM_NOT_EMPTY", `This team has ${players} player(s). Move or remove them first.`);
  await Team.deleteOne({ _id: team._id });
  await Staff.updateMany({ teamIds: team._id }, { $pull: { teamIds: team._id } });
  await bumpVersion(game._id);
  await audit({ gameId: game._id, actor: staffActor(actor), action: "TEAM_DELETED", target: { type: "team", id: team._id }, before: { key: team.key, name: team.name }, ip });
}
