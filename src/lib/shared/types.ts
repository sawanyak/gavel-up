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
    /** Detectives only. */
    detective?: { limit: number; used: number; remaining: number };
  };
  team: { score: number; members: { id: string; name: string; status: "alive" | "ghost" }[] };
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
}

export interface TMSnapshot {
  version: number;
  serverTime: number;
  game: { code: string; name: string; phase: GamePhase; registrationOpen: boolean };
  teams: (TeamInfo & { score: number; members: { id: string; name: string; status: "alive" | "ghost"; late: boolean }[] })[];
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
