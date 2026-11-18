/**
 * PRIVACY BOUNDARY (plan §10.2). Every state response is built here, per audience.
 * Never return raw Mongoose documents from a route.
 */
import type { GamePhase, Role, StaffRole, TeamColorKey } from "@/lib/shared/constants";
import type { GameRules } from "@/lib/shared/roleContent";
import { revealPreview, roleConfigOf } from "./services/roles";
import { displayMeetingView, gmMeetingView, playerMeetingView, tmMeetingView } from "./meetingDto";
import { gameLeaderboard, leaderboard, teamFeed } from "./scoringDto";
import { effectiveScreen } from "./services/display";
import { manualBounds } from "./services/scoring";
import type {
  AnnouncementView,
  AssignmentStatus,
  DisplaySnapshot,
  FinalState,
  GMSnapshot,
  GMTasksSnapshot,
  InvestigationView,
  PlayerSnapshot,
  PlayerTask,
  PublicGameInfo,
  StaffListItem,
  StaffMe,
  TeamInfo,
  TMSnapshot,
  VerificationItem,
} from "@/lib/shared/types";
import type { Types } from "mongoose";
import {
  Announcement,
  Investigation,
  Player,
  Staff,
  Task,
  TaskAssignment,
  Team,
  type AnnouncementDoc,
  type GameDoc,
  type InvestigationDoc,
  type PlayerDoc,
  type StaffDoc,
  type TaskAssignmentDoc,
  type TaskDoc,
  type TeamDoc,
} from "./models";

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
    const logs = await Investigation.find({ detectiveId: player._id }).sort({ createdAt: 1 }).lean<InvestigationDoc[]>();
    const targets = logs.length ? await Player.find({ _id: { $in: logs.map((l) => l.targetId) } }).select("name").lean<PlayerDoc[]>() : [];
    const nameOf = new Map(targets.map((t) => [String(t._id), t.name]));
    return {
      detective: {
        limit,
        used,
        remaining: Math.max(0, limit - used),
        history: logs.map((l) => ({
          targetName: nameOf.get(String(l.targetId)) ?? "?",
          answer: l.answerIsImpostor ? ("yes" as const) : ("no" as const),
          at: l.createdAt.toISOString(),
        })),
      },
    };
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
  const [extras, tasks, activities, announcements, meeting, board, feed] = await Promise.all([
    role ? roleExtras(game, player, role) : {},
    playerTasks(game, player),
    Task.find({ gameId: game._id, kind: "activity", revealed: true }).sort({ order: 1 }).lean<TaskDoc[]>(),
    announcementsFor(game._id, [player.teamId]),
    playerMeetingView(game, player),
    // Hidden during the finale until the official leaderboard step (it would spoil the result).
    game.rolesRevealedAt && !(game.phase === "FINAL" && !(game.final as FinalState | undefined)?.leaderboardShownAt) ? gameLeaderboard(game._id) : [],
    game.rolesRevealedAt ? teamFeed(game._id, [player.teamId], 8) : [],
  ]);
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
    tasks,
    activities: activities.map((t) => ({ id: String(t._id), title: t.title, description: t.description ?? "", points: t.points })),
    announcements,
    meeting,
    leaderboard: board,
    teamFeed: feed,
    final: publicFinal(game),
  };
}

/** The final reveal is public by design: each part appears only after its step. */
export function publicFinal(game: GameDoc): FinalState | null {
  return game.phase === "FINAL" || game.phase === "COMPLETED" ? ((game.final ?? {}) as FinalState) : null;
}

/** Projector (plan §8.6, §10.2 DisplaySnapshot): safe data only, no phones, no vote choices. */
export async function displaySnapshot(game: GameDoc, registrationUrl: string): Promise<DisplaySnapshot> {
  const f = (game.final ?? {}) as FinalState;
  const [teams, players, meeting, announcements, { screen }] = await Promise.all([
    teamsOf(game._id),
    Player.find({ gameId: game._id, removedAt: null }).select("teamId status").lean<PlayerDoc[]>(),
    displayMeetingView(game),
    Announcement.find({ gameId: game._id, deletedAt: null, teamId: null }).sort({ createdAt: -1 }).limit(3).lean<AnnouncementDoc[]>(),
    effectiveScreen(game),
  ]);
  const hideScores = game.phase === "FINAL" && !f.leaderboardShownAt;
  const rows = teams.map((t) => {
    const mine = players.filter((p) => String(p.teamId) === String(t._id));
    const ghosts = mine.filter((p) => p.status === "ghost").length;
    return { teamId: String(t._id), name: t.name, colorHex: t.colorHex, key: t.key as TeamColorKey, players: mine.length, alive: mine.length - ghosts, ghosts, score: hideScores ? 0 : (t.score ?? 0) };
  });
  const ghosts = players.filter((p) => p.status === "ghost").length;
  return {
    version: game.version,
    serverTime: Date.now(),
    game: gameHeader(game),
    screen,
    registrationUrl,
    counts: { registered: players.length, alive: players.length - ghosts, ghosts },
    teams: rows,
    leaderboard: hideScores ? [] : game.phase === "COMPLETED" || f.leaderboardShownAt ? (f.leaderboard ?? leaderboard(teams)) : leaderboard(teams),
    meeting,
    final: publicFinal(game) ?? {},
    announcements: announcements.map(announcementView),
    rules: gameRules(game),
  };
}

/* ───────────────────────── Phase 3 helpers ───────────────────────── */

/** The player's own assignments (individual, paired, and their team's team tasks). Revealed tasks only. */
async function playerTasks(game: GameDoc, player: PlayerDoc): Promise<PlayerTask[]> {
  const assignments = await TaskAssignment.find({
    gameId: game._id,
    $or: [{ assigneeIds: player._id }, { assigneeIds: { $size: 0 }, teamIds: player.teamId }],
  }).lean<TaskAssignmentDoc[]>();
  if (assignments.length === 0) return [];
  const tasks = await Task.find({ _id: { $in: assignments.map((a) => a.taskId) }, revealed: true }).lean<TaskDoc[]>();
  const taskById = new Map(tasks.map((t) => [String(t._id), t]));
  const partnerIds = assignments.flatMap((a) => a.assigneeIds.filter((id) => String(id) !== String(player._id)));
  const [partners, teams] = partnerIds.length
    ? await Promise.all([
        Player.find({ _id: { $in: partnerIds } }).select("name teamId").lean<PlayerDoc[]>(),
        Team.find({ gameId: game._id }).lean<TeamDoc[]>(),
      ])
    : [[], []];
  const partnerById = new Map(partners.map((p) => [String(p._id), p]));
  const teamById = new Map(teams.map((t) => [String(t._id), t]));

  return assignments
    .filter((a) => taskById.has(String(a.taskId)))
    .map((a) => {
      const t = taskById.get(String(a.taskId))!;
      const partnerId = a.assigneeIds.find((id) => String(id) !== String(player._id));
      const partner = partnerId ? partnerById.get(String(partnerId)) : undefined;
      const partnerTeam = partner ? teamById.get(String(partner.teamId)) : undefined;
      const view: PlayerTask & { order: number } = {
        assignmentId: String(a._id),
        title: t.title,
        description: t.description ?? "",
        points: t.points,
        kind: t.kind as PlayerTask["kind"],
        verification: (t.verification as "none" | "staff") ?? "none",
        status: a.status as AssignmentStatus,
        confirmedByMe: a.confirmations.some((c) => String(c.playerId) === String(player._id)),
        rejectReason: a.status === "rejected" ? (a.rejectReason ?? null) : null,
        order: t.order ?? 0,
      };
      if (partner) view.partner = { name: partner.name, teamName: partnerTeam?.name ?? "?", colorHex: partnerTeam?.colorHex ?? "#fff" };
      return view;
    })
    .sort((x, y) => x.order - y.order)
    .map(({ order: _o, ...rest }) => rest);
}

const announcementView = (a: AnnouncementDoc): AnnouncementView => ({
  id: String(a._id),
  text: a.text,
  level: a.level as "info" | "alert",
  pinned: !!a.pinned,
  teamId: a.teamId ? String(a.teamId) : null,
  createdAt: a.createdAt.toISOString(),
});

/** Pinned announcements plus the latest 5. `teamIds` = everyone + those teams; null = all (GM). */
async function announcementDocs(gameId: Types.ObjectId, teamIds: Types.ObjectId[] | null) {
  const filter: Record<string, unknown> = { gameId, deletedAt: null };
  if (teamIds) filter.$or = [{ teamId: null }, { teamId: { $in: teamIds } }];
  const docs = await Announcement.find(filter).sort({ createdAt: -1 }).limit(30).lean<AnnouncementDoc[]>();
  return [...docs.filter((d) => d.pinned), ...docs.filter((d) => !d.pinned).slice(0, 5)];
}

async function announcementsFor(gameId: Types.ObjectId, teamIds: Types.ObjectId[]) {
  return (await announcementDocs(gameId, teamIds)).map(announcementView);
}

/** Tasks waiting for a TM or GM to approve. `teamIds` null = all teams (GM). */
async function verificationQueue(gameId: Types.ObjectId, teamIds: Types.ObjectId[] | null): Promise<VerificationItem[]> {
  const filter: Record<string, unknown> = { gameId, status: "awaiting_verification" };
  if (teamIds) filter.teamIds = { $in: teamIds };
  const items = await TaskAssignment.find(filter).sort({ submittedAt: 1 }).limit(200).lean<TaskAssignmentDoc[]>();
  if (items.length === 0) return [];
  const [tasks, players, teams] = await Promise.all([
    Task.find({ _id: { $in: items.map((i) => i.taskId) } }).lean<TaskDoc[]>(),
    Player.find({ _id: { $in: items.flatMap((i) => [...i.assigneeIds, ...(i.submittedBy ? [i.submittedBy] : [])]) } })
      .select("name")
      .lean<PlayerDoc[]>(),
    Team.find({ gameId }).lean<TeamDoc[]>(),
  ]);
  const task = new Map(tasks.map((t) => [String(t._id), t]));
  const pname = new Map(players.map((p) => [String(p._id), p.name]));
  const team = new Map(teams.map((t) => [String(t._id), t]));
  return items.map((i) => ({
    id: String(i._id),
    taskTitle: task.get(String(i.taskId))?.title ?? "?",
    points: task.get(String(i.taskId))?.points ?? 0,
    playerNames: i.assigneeIds.length ? i.assigneeIds.map((id) => pname.get(String(id)) ?? "?") : [pname.get(String(i.submittedBy)) ?? "Team"],
    teams: i.teamIds.map((t) => ({ id: String(t), name: team.get(String(t))?.name ?? "?", colorHex: team.get(String(t))?.colorHex ?? "#fff" })),
    submittedAt: i.submittedAt ? i.submittedAt.toISOString() : null,
    rejectedCount: i.rejectedCount ?? 0,
  }));
}

/** GM task bank view (its own endpoint, so the main GM poll stays small). */
export async function gmTasksSnapshot(game: GameDoc): Promise<GMTasksSnapshot> {
  const [tasks, assignments, teams, players, queue] = await Promise.all([
    Task.find({ gameId: game._id }).sort({ order: 1, createdAt: 1 }).lean<TaskDoc[]>(),
    TaskAssignment.find({ gameId: game._id }).select("taskId status assigneeIds teamIds").lean<TaskAssignmentDoc[]>(),
    teamsOf(game._id),
    Player.find({ gameId: game._id, removedAt: null }).select("name teamId status").sort({ name: 1 }).lean<PlayerDoc[]>(),
    verificationQueue(game._id, null),
  ]);
  const pname = new Map(players.map((p) => [String(p._id), p.name]));
  const tname = new Map(teams.map((t) => [String(t._id), t.name]));
  return {
    version: game.version,
    serverTime: Date.now(),
    phase: game.phase as GamePhase,
    tasks: tasks.map((t) => {
      const mine = assignments.filter((a) => String(a.taskId) === String(t._id));
      const counts = { total: 0, open: 0, awaiting_partner: 0, awaiting_verification: 0, completed: 0, rejected: 0 };
      for (const a of mine) {
        counts.total += 1;
        counts[a.status as AssignmentStatus] += 1;
      }
      return {
        id: String(t._id),
        title: t.title,
        description: t.description ?? "",
        kind: t.kind as GMTasksSnapshot["tasks"][number]["kind"],
        points: t.points,
        verification: (t.verification as "none" | "staff") ?? "none",
        pairScope: (t.pairScope as "same_team" | "cross_team" | null) ?? null,
        allowGhosts: t.allowGhosts ?? true,
        revealed: !!t.revealed,
        revealedAt: t.revealedAt ? t.revealedAt.toISOString() : null,
        order: t.order ?? 0,
        counts,
        assignments: mine.map((a) => ({
          id: String(a._id),
          status: a.status as AssignmentStatus,
          names: a.assigneeIds.length
            ? a.assigneeIds.map((id) => pname.get(String(id)) ?? "?")
            : a.teamIds.map((id) => `${tname.get(String(id)) ?? "?"} team`),
          teamIds: a.teamIds.map(String),
        })),
      };
    }),
    queue,
    teams: teams.map(teamInfo),
    players: players.map((p) => ({ id: String(p._id), name: p.name, teamId: String(p.teamId), status: p.status as "alive" | "ghost" })),
  };
}

async function gmInvestigations(gameId: Types.ObjectId): Promise<InvestigationView[]> {
  const logs = await Investigation.find({ gameId }).sort({ createdAt: -1 }).limit(100).lean<InvestigationDoc[]>();
  if (logs.length === 0) return [];
  const [players, staff] = await Promise.all([
    Player.find({ _id: { $in: logs.flatMap((l) => [l.detectiveId, l.targetId]) } }).select("name").lean<PlayerDoc[]>(),
    Staff.find({ _id: { $in: logs.map((l) => l.recordedBy) } }).select("name").lean<StaffDoc[]>(),
  ]);
  const pname = new Map(players.map((p) => [String(p._id), p.name]));
  const sname = new Map(staff.map((s) => [String(s._id), s.name]));
  return logs.map((l) => ({
    id: String(l._id),
    detectiveId: String(l.detectiveId),
    detectiveName: pname.get(String(l.detectiveId)) ?? "?",
    targetId: String(l.targetId),
    targetName: pname.get(String(l.targetId)) ?? "?",
    answerIsImpostor: l.answerIsImpostor,
    recordedByName: sname.get(String(l.recordedBy)) ?? "?",
    at: l.createdAt.toISOString(),
  }));
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
    investigations: await gmInvestigations(game._id),
    announcements: (await announcementDocs(game._id, null)).map((a) => ({ ...announcementView(a), createdByName: a.createdBy?.name ?? "" })),
    pendingVerifications: await TaskAssignment.countDocuments({ gameId: game._id, status: "awaiting_verification" }),
    meeting: await gmMeetingView(game),
    meetings: { held: game.meetingsHeld ?? 0, max: game.config?.maxMeetings ?? 1, votingDurationSec: game.config?.votingDurationSec ?? 180 },
    final: (game.final ?? {}) as FinalState,
    display: await effectiveScreen(game),
    tieRule: (game.config?.winningTeamTieRule as "SHARED" | "GM_DECIDES") ?? "SHARED",
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
    queue: await verificationQueue(game._id, staff.role === "GM" ? null : mine.map((t) => t._id)),
    announcements: (await announcementDocs(game._id, staff.role === "GM" ? null : mine.map((t) => t._id))).map(announcementView),
    meeting: await tmMeetingView(game, mine.map((t) => t._id)),
    final: publicFinal(game),
    points: manualBounds(game, staff),
    feed: await teamFeed(game._id, mine.map((t) => t._id), 20),
    activities: (await Task.find({ gameId: game._id, kind: "activity" }).select("title").sort({ order: 1 }).lean<TaskDoc[]>()).map((a) => ({
      id: String(a._id),
      title: a.title,
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
