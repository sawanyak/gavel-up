import type { Types } from "mongoose";
import { PLAYER_COOKIE, STAFF_COOKIE, type StaffRole } from "@/lib/shared/constants";
import { ApiError, forbidden, notFound, unauthenticated } from "../errors";
import { Game, Player, Staff, type GameDoc, type PlayerDoc, type StaffDoc } from "../models";
import { loadSession, revokeSessionsFor } from "./session";

export async function getActiveGame(): Promise<GameDoc> {
  const game = await Game.findOne({ active: true }).lean<GameDoc>();
  if (!game) throw notFound("No active game. Run the seed script.", "NO_ACTIVE_GAME");
  return game;
}

export async function getGameByCode(code?: string | null): Promise<GameDoc> {
  if (!code) return getActiveGame();
  const game = await Game.findOne({ code: code.toUpperCase() }).lean<GameDoc>();
  if (!game) throw notFound("Game not found.", "GAME_NOT_FOUND");
  return game;
}

export function assertNotArchived(game: GameDoc) {
  if (game.phase === "COMPLETED") throw new ApiError(423, "GAME_ARCHIVED", "This game has finished.");
}

export async function requirePlayer(req: Request) {
  const session = await loadSession(req, PLAYER_COOKIE, "player");
  if (!session) throw unauthenticated("Your session has expired. Ask a Team Manager for a login code.", "SESSION_EXPIRED");
  const player = await Player.findById(session.subjectId).lean<PlayerDoc>();
  if (!player || player.removedAt) {
    await revokeSessionsFor(session.subjectId);
    throw new ApiError(410, "PLAYER_REMOVED", "This registration was removed. Please see the registration desk.");
  }
  const game = await Game.findById(player.gameId).lean<GameDoc>();
  if (!game) throw notFound("Game not found.", "GAME_NOT_FOUND");
  return { session, player, game };
}

/** Optional variant: returns null instead of throwing. */
export async function optionalPlayer(req: Request) {
  const session = await loadSession(req, PLAYER_COOKIE, "player");
  if (!session) return null;
  const player = await Player.findById(session.subjectId).lean<PlayerDoc>();
  if (!player || player.removedAt) return null;
  return { session, player };
}

export async function requireStaff(req: Request, roles: StaffRole[] = ["GM", "TM"]) {
  const session = await loadSession(req, STAFF_COOKIE, "staff");
  if (!session) throw unauthenticated("Please log in as staff.", "SESSION_EXPIRED");
  const staff = await Staff.findById(session.subjectId).lean<StaffDoc>();
  if (!staff || !staff.active) {
    await revokeSessionsFor(session.subjectId);
    throw unauthenticated("Your staff account is inactive.", "STAFF_INACTIVE");
  }
  if (!roles.includes(staff.role as StaffRole)) throw forbidden("Game Master access required.");
  if (!staff.lastSeenAt || Date.now() - staff.lastSeenAt.getTime() > 30_000) {
    await Staff.updateOne({ _id: staff._id }, { $set: { lastSeenAt: new Date() } });
  }
  return { session, staff };
}

export const requireGM = (req: Request) => requireStaff(req, ["GM"]);

/** GMs can act on any team; TMs only on the teams they manage. */
export function canAccessTeam(staff: StaffDoc, teamId: Types.ObjectId | string) {
  if (staff.role === "GM") return true;
  return staff.teamIds.some((t) => String(t) === String(teamId));
}

export function assertTeamAccess(staff: StaffDoc, teamId: Types.ObjectId | string) {
  if (!canAccessTeam(staff, teamId)) throw forbidden("You can only manage your own team.", "NOT_YOUR_TEAM");
}

export const staffActor = (s: StaffDoc) => ({ type: "staff", id: s._id, name: s.name });
export const playerActor = (p: PlayerDoc) => ({ type: "player", id: p._id, name: p.name });

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}
