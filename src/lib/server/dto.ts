/**
 * PRIVACY BOUNDARY (plan §10.2). Every state response is built here, per audience.
 * Never return raw Mongoose documents from a route.
 */
import type { GamePhase, StaffRole, TeamColorKey } from "@/lib/shared/constants";
import type {
  GMSnapshot,
  PlayerSnapshot,
  PublicGameInfo,
  StaffListItem,
  StaffMe,
  TeamInfo,
  TMSnapshot,
} from "@/lib/shared/types";
import { Player, Staff, Team, type GameDoc, type PlayerDoc, type StaffDoc, type TeamDoc } from "./models";

export const teamInfo = (t: TeamDoc): TeamInfo => ({
  id: String(t._id),
  key: t.key as TeamColorKey,
  name: t.name,
  colorHex: t.colorHex,
  order: t.order ?? 0,
});

const gameHeader = (g: GameDoc) => ({
  code: g.code,
  name: g.name,
  phase: g.phase as GamePhase,
  registrationOpen: g.registrationOpen,
});

async function teamsOf(gameId: GameDoc["_id"]) {
  return Team.find({ gameId }).sort({ order: 1, name: 1 }).lean<TeamDoc[]>();
}

export async function publicGameInfo(game: GameDoc): Promise<PublicGameInfo> {
  const teams = await teamsOf(game._id);
  return { ...gameHeader(game), teams: teams.map(teamInfo) };
}

export async function playerSnapshot(game: GameDoc, player: PlayerDoc): Promise<PlayerSnapshot> {
  const [team, members, withRole] = await Promise.all([
    Team.findById(player.teamId).lean<TeamDoc>(),
    Player.find({ teamId: player.teamId, removedAt: null })
      .select("name status") // explicit projection: no phone, no role
      .sort({ name: 1 })
      .lean<PlayerDoc[]>(),
    // Own role only, and only once roles are revealed.
    game.rolesRevealedAt ? Player.findById(player._id).select("+role").lean<PlayerDoc>() : null,
  ]);
  return {
    version: game.version,
    serverTime: Date.now(),
    game: { ...gameHeader(game), rolesRevealed: !!game.rolesRevealedAt },
    me: {
      id: String(player._id),
      name: player.name,
      team: team ? teamInfo(team) : { id: String(player.teamId), key: "white", name: "?", colorHex: "#fff", order: 0 },
      status: player.status as "alive" | "ghost",
      role: (withRole?.role as PlayerSnapshot["me"]["role"]) ?? null,
      late: !!player.late,
    },
    team: {
      score: team?.score ?? 0,
      members: members.map((m) => ({ id: String(m._id), name: m.name, status: m.status as "alive" | "ghost" })),
    },
  };
}

export async function gmSnapshot(game: GameDoc): Promise<GMSnapshot> {
  const [teams, players, removed, onlineStaff] = await Promise.all([
    teamsOf(game._id),
    Player.find({ gameId: game._id, removedAt: null }).sort({ registeredAt: -1 }).lean<PlayerDoc[]>(),
    Player.countDocuments({ gameId: game._id, removedAt: { $ne: null } }),
    Staff.find({ active: true, lastSeenAt: { $gte: new Date(Date.now() - 90_000) } }).lean<StaffDoc[]>(),
  ]);
  const countByTeam = new Map<string, number>();
  for (const p of players) countByTeam.set(String(p.teamId), (countByTeam.get(String(p.teamId)) ?? 0) + 1);
  return {
    version: game.version,
    serverTime: Date.now(),
    game: { id: String(game._id), ...gameHeader(game), rolesRevealed: !!game.rolesRevealedAt },
    teams: teams.map((t) => ({ ...teamInfo(t), score: t.score ?? 0, playerCount: countByTeam.get(String(t._id)) ?? 0 })),
    registrations: players.map((p) => ({
      id: String(p._id),
      name: p.name,
      phone: p.phoneE164,
      teamId: String(p.teamId),
      status: p.status as "alive" | "ghost",
      late: !!p.late,
      registeredAt: p.registeredAt.toISOString(),
    })),
    counts: { registered: players.length, removed },
    staffOnline: onlineStaff.map((s) => ({ id: String(s._id), name: s.name, role: s.role as StaffRole })),
  };
}

export async function tmSnapshot(game: GameDoc, staff: StaffDoc): Promise<TMSnapshot> {
  const allTeams = await teamsOf(game._id);
  const mine = staff.role === "GM" ? allTeams : allTeams.filter((t) => staff.teamIds.some((id) => String(id) === String(t._id)));
  const members = await Player.find({ teamId: { $in: mine.map((t) => t._id) }, removedAt: null })
    .select("name status teamId late") // no phone, no role
    .sort({ name: 1 })
    .lean<PlayerDoc[]>();
  return {
    version: game.version,
    serverTime: Date.now(),
    game: gameHeader(game),
    teams: mine.map((t) => ({
      ...teamInfo(t),
      score: t.score ?? 0,
      members: members
        .filter((m) => String(m.teamId) === String(t._id))
        .map((m) => ({ id: String(m._id), name: m.name, status: m.status as "alive" | "ghost", late: !!m.late })),
    })),
  };
}

export const staffMe = (s: StaffDoc): StaffMe => ({
  id: String(s._id),
  name: s.name,
  role: s.role as StaffRole,
  teamIds: s.teamIds.map(String),
});

export const staffListItem = (s: StaffDoc): StaffListItem => ({
  ...staffMe(s),
  active: s.active,
  lastSeenAt: s.lastSeenAt ? s.lastSeenAt.toISOString() : null,
});
