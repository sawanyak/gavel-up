/**
 * PRIVACY BOUNDARY (plan §10.2). Every state response is built here, per audience.
 * Never return raw Mongoose documents from a route.
 */
import type { GamePhase, Role, StaffRole, TeamColorKey } from "@/lib/shared/constants";
import type { GameRules } from "@/lib/shared/roleContent";
import { revealPreview, roleConfigOf } from "./services/roles";
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
  const p = game.config?.points;
  return {
    ...gameHeader(game),
    teams: teams.map(teamInfo),
    rules: gameRules(game),
    points: {
      taskDefault: p?.taskDefault ?? 10,
      correctInternalVotePerVoter: p?.correctInternalVotePerVoter ?? 10,
      correctPrediction: p?.correctPrediction ?? 30,
      wrongPrediction: p?.wrongPrediction ?? -15,
    },
  };
}

export function gameRules(game: GameDoc): GameRules {
  const c = game.config;
  return {
    crewNeedsToCatch: c?.impostorWinThreshold ?? 2,
    detectiveInvestigationLimit: c?.detectiveInvestigationLimit ?? 1,
    maxMeetings: c?.maxMeetings ?? 1,
    alliesVisible: c?.impostorsSeeEachOther ?? true,
  };
}

/** Private, role-specific extras for the player's own view. */
async function roleExtras(game: GameDoc, player: PlayerDoc, role: Role | null): Promise<Pick<PlayerSnapshot["me"], "allies" | "detective">> {
  if (role === "impostor" && (game.config?.impostorsSeeEachOther ?? true)) {
    const [others, teams] = await Promise.all([
      Player.find({ gameId: game._id, role: "impostor", removedAt: null, _id: { $ne: player._id } })
        .select("name teamId status")
        .sort({ name: 1 })
        .lean<PlayerDoc[]>(),
      Team.find({ gameId: game._id }).lean<TeamDoc[]>(),
    ]);
    const t = new Map(teams.map((x) => [String(x._id), x]));
    return {
      allies: others.map((o) => ({
        id: String(o._id),
        name: o.name,
        teamName: t.get(String(o.teamId))?.name ?? "?",
        colorHex: t.get(String(o.teamId))?.colorHex ?? "#fff",
        status: o.status as "alive" | "ghost",
      })),
    };
  }
  if (role === "detective") {
    const limit = game.config?.detectiveInvestigationLimit ?? 1;
    const used = player.investigationsUsed ?? 0;
    return { detective: { limit, used, remaining: Math.max(0, limit - used) } };
  }
  return {};
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
  const role = (withRole?.role as Role | null | undefined) ?? null;
  const extras = role ? await roleExtras(game, player, role) : {};
  return {
    version: game.version,
    serverTime: Date.now(),
    game: { ...gameHeader(game), rolesRevealed: !!game.rolesRevealedAt, rules: gameRules(game) },
    me: {
      ...extras,
      id: String(player._id),
      name: player.name,
      team: team ? teamInfo(team) : { id: String(player.teamId), key: "white", name: "?", colorHex: "#fff", order: 0 },
      status: player.status as "alive" | "ghost",
      role,
      late: !!player.late,
    },
    team: {
      score: team?.score ?? 0,
      members: members.map((m) => ({ id: String(m._id), name: m.name, status: m.status as "alive" | "ghost" })),
    },
  };
}

async function gmRoles(game: GameDoc, teams: TeamDoc[], players: PlayerDoc[]): Promise<GMSnapshot["roles"]> {
  const rc = roleConfigOf(game);
  const config = {
    impostorsPerTeam: rc.impostorsPerTeam,
    detectivesPerTeam: rc.detectivesPerTeam,
    minTeamSizeForSpecialRoles: rc.minTeamSizeForSpecialRoles,
    impostorsSeeEachOther: game.config?.impostorsSeeEachOther ?? true,
    impostorOverrides: (rc.impostorOverrides ?? {}) as Record<string, number>,
  };
  if (!game.rolesRevealedAt) {
    const { plans, warnings } = await revealPreview(game);
    return { revealedAt: null, config, counts: plans.map(({ warnings: _w, ...p }) => p), warnings };
  }
  const warnings: string[] = [];
  const counts = teams.map((t) => {
    const mine = players.filter((p) => String(p.teamId) === String(t._id));
    const n = (r: Role) => mine.filter((p) => p.role === r).length;
    const row = { teamId: String(t._id), teamName: t.name, players: mine.length, impostors: n("impostor"), detectives: n("detective"), crewmates: n("crewmate") };
    if (row.players > 0 && row.impostors === 0) warnings.push(`${t.name} has no impostor.`);
    if (row.players >= rc.minTeamSizeForSpecialRoles && row.detectives === 0) warnings.push(`${t.name} has no detective.`);
    return row;
  });
  const unassigned = players.filter((p) => !p.role).length;
  if (unassigned) warnings.push(`${unassigned} player(s) have no role yet.`);
  return { revealedAt: game.rolesRevealedAt.toISOString(), config, counts, warnings };
}

export async function gmSnapshot(game: GameDoc): Promise<GMSnapshot> {
  const revealed = !!game.rolesRevealedAt;
  const [teams, players, removed, onlineStaff] = await Promise.all([
    teamsOf(game._id),
    // Roles are loaded for the GM only once they've been revealed.
    (revealed
      ? Player.find({ gameId: game._id, removedAt: null }).select("+role")
      : Player.find({ gameId: game._id, removedAt: null })
    )
      .sort({ registeredAt: -1 })
      .lean<PlayerDoc[]>(),
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
      ...(revealed ? { role: (p.role as Role | null) ?? null } : {}),
    })),
    counts: { registered: players.length, removed },
    staffOnline: onlineStaff.map((s) => ({ id: String(s._id), name: s.name, role: s.role as StaffRole })),
    roles: await gmRoles(game, teams, players),
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
