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
}

export interface TMSnapshot {
  version: number;
  serverTime: number;
  game: { code: string; name: string; phase: GamePhase; registrationOpen: boolean };
  teams: (TeamInfo & { score: number; members: { id: string; name: string; status: "alive" | "ghost"; late: boolean }[] })[];
  queue: VerificationItem[];
  announcements: AnnouncementView[];
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
