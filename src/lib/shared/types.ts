// Response shapes shared between API (server) and pages (client).
import type { GamePhase, Role, StaffRole, TeamColorKey } from "./constants";
import type { GameRules } from "./roleContent";

export type { GameRules };

export interface TeamInfo {
  id: string;
  key: TeamColorKey;
  name: string;
  colorHex: string;
  order: number;
}

export interface PublicGameInfo {
  code: string;
  name: string;
  phase: GamePhase;
  registrationOpen: boolean;
  teams: TeamInfo[];
  rules: GameRules;
  points: { taskDefault: number; correctInternalVotePerVoter: number; correctPrediction: number; wrongPrediction: number };
}

export interface PlayerSnapshot {
  version: number;
  serverTime: number;
  game: { code: string; name: string; phase: GamePhase; registrationOpen: boolean; rolesRevealed: boolean; rules: GameRules };
  me: {
    id: string;
    name: string;
    team: TeamInfo;
    status: "alive" | "ghost";
    role: Role | null;
    late: boolean;
    /** Impostors only (when impostorsSeeEachOther): the other impostors. */
    allies?: { id: string; name: string; teamName: string; colorHex: string; status: "alive" | "ghost" }[];
    /** Detectives only. `answer` is the host's yes/no to "is <target> an impostor?". */
    detective?: { limit: number; used: number; remaining: number; history: { targetName: string; answer: "yes" | "no"; at: string }[] };
  };
  team: { score: number; members: { id: string; name: string; status: "alive" | "ghost" }[] };
  tasks: PlayerTask[];
  activities: { id: string; title: string; description: string; points: number }[];
  announcements: AnnouncementView[];
  meeting: PlayerMeetingView | null;
  leaderboard: LeaderboardRow[];
  /** Own team's latest point changes. */
  teamFeed: FeedItem[];
  /** Null until the final reveal starts; then grows step by step. */
  final: FinalState | null;
}

/* ───────── Phase 4: meetings ───────── */

export type MeetingStatus = "CALLED" | "VOTING" | "CLOSED" | "RESULTS" | "RESOLVED" | "CANCELLED";

export interface MeetingTeamOutcome {
  teamId: string;
  teamName: string;
  colorHex: string;
  /** null = nobody eliminated in that team. */
  eliminated: { name: string; wasImpostor: boolean } | null;
}

export interface PlayerMeetingView {
  id: string;
  number: number;
  status: MeetingStatus;
  votingEndsAt: string | null;
  allowSkip: boolean;
  me: {
    eligible: boolean;
    /** Why not eligible (only while voting / after it opened). */
    notEligibleReason: "ghost" | "late" | null;
    hasVoted: boolean;
    skipped: boolean;
    votedFor: { id: string; name: string } | null;
  };
  /** Alive teammates you can vote for (not you). */
  candidates: { id: string; name: string }[];
  /** Own team only: how many have voted. */
  teamProgress: { voted: number; eligible: number };
  predictions: {
    enabled: boolean;
    points: { correct: number; wrong: number };
    otherTeams: {
      teamId: string;
      name: string;
      colorHex: string;
      locked: { byName: string; targetName: string; byMe: boolean } | null;
      candidates: { id: string; name: string }[];
    }[];
  };
  /** After results are revealed. */
  results: null | {
    teams: MeetingTeamOutcome[];
    myTeam: { tally: { name: string; count: number }[]; skipCount: number; notVotedCount: number };
  };
}

export interface GMMeetingTeam {
  teamId: string;
  teamName: string;
  colorHex: string;
  eligibleCount: number;
  voted: { id: string; name: string }[];
  notVoted: { id: string; name: string }[];
  tally: { playerId: string; name: string; count: number }[];
  skipCount: number;
  candidates: { id: string; name: string }[];
  /** After voting closes. */
  result: null | {
    topCandidates: { id: string; name: string }[];
    tie: boolean;
    mostSkipped: boolean;
    decision: { eliminated: { id: string; name: string } | null; decidedByName: string } | null;
    wasImpostor: boolean | null;
  };
}

export interface GMMeetingView {
  id: string;
  number: number;
  status: MeetingStatus;
  calledAt: string;
  votingOpenedAt: string | null;
  votingEndsAt: string | null;
  teams: GMMeetingTeam[];
  votes: { id: string; voterName: string; teamId: string; targetName: string | null; at: string }[];
  predictions: { id: string; predictorName: string; predictorTeamName: string; targetTeamName: string; targetName: string; at: string }[];
}

export interface TMMeetingView {
  id: string;
  number: number;
  status: MeetingStatus;
  votingEndsAt: string | null;
  teams: { teamId: string; voted: string[]; notVoted: string[]; eliminated: { name: string; wasImpostor: boolean } | null | undefined }[];
}

/* ───────── Phase 3: tasks, announcements, detective ───────── */

export type TaskKind = "individual" | "team" | "paired" | "activity";
export type AssignmentStatus = "open" | "awaiting_partner" | "awaiting_verification" | "completed" | "rejected";

export interface PlayerTask {
  assignmentId: string;
  title: string;
  description: string;
  points: number;
  kind: Exclude<TaskKind, "activity">;
  verification: "none" | "staff";
  status: AssignmentStatus;
  /** Paired tasks: whether I've already confirmed. */
  confirmedByMe: boolean;
  partner?: { name: string; teamName: string; colorHex: string };
  rejectReason: string | null;
}

export interface AnnouncementView {
  id: string;
  text: string;
  level: "info" | "alert";
  pinned: boolean;
  teamId: string | null;
  createdAt: string;
}

export interface VerificationItem {
  id: string;
  taskTitle: string;
  points: number;
  playerNames: string[];
  teams: { id: string; name: string; colorHex: string }[];
  submittedAt: string | null;
  rejectedCount: number;
}

export interface GMTaskView {
  id: string;
  title: string;
  description: string;
  kind: TaskKind;
  points: number;
  verification: "none" | "staff";
  pairScope: "same_team" | "cross_team" | null;
  allowGhosts: boolean;
  revealed: boolean;
  revealedAt: string | null;
  order: number;
  counts: Record<AssignmentStatus, number> & { total: number };
  assignments: { id: string; status: AssignmentStatus; names: string[]; teamIds: string[] }[];
}

export interface GMTasksSnapshot {
  version: number;
  serverTime: number;
  phase: GamePhase;
  tasks: GMTaskView[];
  queue: VerificationItem[];
  teams: TeamInfo[];
  players: { id: string; name: string; teamId: string; status: "alive" | "ghost" }[];
}

export interface InvestigationView {
  id: string;
  detectiveId: string;
  detectiveName: string;
  targetId: string;
  targetName: string;
  answerIsImpostor: boolean;
  recordedByName: string;
  at: string;
}

export interface RoleCounts {
  teamId: string;
  teamName: string;
  players: number;
  impostors: number;
  detectives: number;
  crewmates: number;
}

export interface RoleConfigView {
  impostorsPerTeam: number;
  detectivesPerTeam: number;
  minTeamSizeForSpecialRoles: number;
  impostorsSeeEachOther: boolean;
  impostorOverrides: Record<string, number>;
}

export interface GMRegistration {
  id: string;
  name: string;
  phone: string;
  teamId: string;
  status: "alive" | "ghost";
  late: boolean;
  registeredAt: string;
  /** Present only after roles are revealed (GM view only). */
  role?: Role | null;
}

export interface GMSnapshot {
  version: number;
  serverTime: number;
  game: { id: string; code: string; name: string; phase: GamePhase; registrationOpen: boolean; rolesRevealed: boolean };
  teams: (TeamInfo & { score: number; playerCount: number })[];
  registrations: GMRegistration[];
  counts: { registered: number; removed: number };
  staffOnline: { id: string; name: string; role: StaffRole }[];
  roles: {
    revealedAt: string | null;
    config: RoleConfigView;
    /** Before reveal: what Reveal Roles would assign (counts only). After: actual counts. */
    counts: RoleCounts[];
    warnings: string[];
  };
  investigations: InvestigationView[];
  announcements: (AnnouncementView & { createdByName: string })[];
  pendingVerifications: number;
  meeting: GMMeetingView | null;
  meetings: { held: number; max: number; votingDurationSec: number };
  final: FinalState;
  display: { screen: DisplayScreen; available: DisplayScreen[] };
  tieRule: "SHARED" | "GM_DECIDES";
}

export interface TMSnapshot {
  version: number;
  serverTime: number;
  game: { code: string; name: string; phase: GamePhase; registrationOpen: boolean };
  teams: (TeamInfo & { score: number; members: { id: string; name: string; status: "alive" | "ghost"; late: boolean }[] })[];
  queue: VerificationItem[];
  announcements: AnnouncementView[];
  meeting: TMMeetingView | null;
  points: { min: number; max: number };
  feed: FeedItem[];
  activities: { id: string; title: string }[];
  final: FinalState | null;
}

export interface StaffMe {
  id: string;
  name: string;
  role: StaffRole;
  teamIds: string[];
}

export interface StaffListItem extends StaffMe {
  active: boolean;
  lastSeenAt: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/* ───────── Phase 5: scoring ───────── */

export type PointCategory = "task" | "activity" | "manual" | "internal_vote" | "prediction" | "penalty" | "reversal";

export interface LeaderboardRow {
  teamId: string;
  key: TeamColorKey;
  name: string;
  colorHex: string;
  score: number;
  /** Competition ranking: equal scores share a rank (1, 1, 3). */
  rank: number;
}

export interface FeedItem {
  id: string;
  teamId: string;
  amount: number;
  reason: string;
  category: PointCategory;
  at: string;
}

export interface LedgerItem extends FeedItem {
  teamName: string;
  colorHex: string;
  createdByName: string;
  earnedByName: string | null;
  reversed: boolean;
  isReversal: boolean;
}

export interface GMPointsSnapshot {
  version: number;
  serverTime: number;
  phase: GamePhase;
  leaderboard: LeaderboardRow[];
  ledger: LedgerItem[];
  totals: { transactions: number; byCategory: Record<string, number> };
  teams: TeamInfo[];
  players: { id: string; name: string; teamId: string }[];
  activities: { id: string; title: string }[];
  bounds: { min: number; max: number };
}

/* ───────── Phase 6: final reveal, projector ───────── */

export interface FinalImpostor {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  colorHex: string;
  status: "alive" | "ghost";
  votedOut: boolean;
}

export interface FinalPredictionResult {
  id: string;
  predictorName: string;
  predictorTeamId: string;
  predictorTeamName: string;
  predictorColorHex: string;
  targetName: string;
  targetTeamId: string;
  targetTeamName: string;
  correct: boolean;
  amount: number;
}

export interface GameStats {
  registered: number;
  perTeam: { teamId: string; name: string; colorHex: string; players: number; ghosts: number }[];
  kills: number;
  voteEliminations: number;
  impostorsVotedOut: number;
  meetingsHeld: number;
  votesCast: number;
  turnoutPct: number;
  predictionsMade: number;
  predictionsCorrect: number;
  tasksCompleted: number;
  investigations: number;
  pointsByCategory: Record<string, number>;
}

/** Stored in games.final; each part appears only after its step (ISO timestamps). */
export interface FinalState {
  startedAt?: string;
  impostorsRevealedAt?: string;
  impostors?: FinalImpostor[];
  predictionsScoredAt?: string;
  predictionResults?: FinalPredictionResult[];
  leaderboardShownAt?: string;
  leaderboard?: LeaderboardRow[];
  winnerAnnouncedAt?: string;
  winningTeamIds?: string[];
  tied?: boolean;
  impostorsWin?: boolean;
  impostorsVotedOut?: number;
  threshold?: number;
  stats?: GameStats;
  completedAt?: string;
}

export const DISPLAY_SCREENS = ["LOBBY", "REGISTRATION", "RULES", "MEETING", "VOTING", "RESULTS", "FINAL", "IMPOSTORS", "LEADERBOARD", "WINNER", "STATS"] as const;
export type DisplayScreen = (typeof DISPLAY_SCREENS)[number];

/** Projector view: safe data only. Roles appear only after the final impostor reveal. */
export interface DisplaySnapshot {
  version: number;
  serverTime: number;
  game: { code: string; name: string; phase: GamePhase; registrationOpen: boolean };
  screen: DisplayScreen;
  registrationUrl: string;
  counts: { registered: number; alive: number; ghosts: number };
  teams: { teamId: string; name: string; colorHex: string; key: TeamColorKey; players: number; alive: number; ghosts: number; score: number }[];
  leaderboard: LeaderboardRow[];
  meeting: null | {
    number: number;
    status: MeetingStatus;
    votingEndsAt: string | null;
    votesCast: number;
    eligibleTotal: number;
    perTeam: { teamId: string; voted: number; eligible: number }[];
    results: MeetingTeamOutcome[] | null;
  };
  final: FinalState;
  announcements: AnnouncementView[];
  rules: GameRules;
}

export interface AuditItem {
  id: string;
  at: string;
  actor: { type: string; name: string };
  action: string;
  target: { type: string; id: string } | null;
  before: unknown;
  after: unknown;
}
