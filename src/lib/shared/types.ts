// Response shapes shared between API (server) and pages (client).
import type { GamePhase, Role, StaffRole, TeamColorKey } from "./constants";

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
}

export interface PlayerSnapshot {
  version: number;
  serverTime: number;
  game: { code: string; name: string; phase: GamePhase; registrationOpen: boolean; rolesRevealed: boolean };
  me: { id: string; name: string; team: TeamInfo; status: "alive" | "ghost"; role: Role | null; late: boolean };
  team: { score: number; members: { id: string; name: string; status: "alive" | "ghost" }[] };
}

export interface GMRegistration {
  id: string;
  name: string;
  phone: string;
  teamId: string;
  status: "alive" | "ghost";
  late: boolean;
  registeredAt: string;
}

export interface GMSnapshot {
  version: number;
  serverTime: number;
  game: { id: string; code: string; name: string; phase: GamePhase; registrationOpen: boolean; rolesRevealed: boolean };
  teams: (TeamInfo & { score: number; playerCount: number })[];
  registrations: GMRegistration[];
  counts: { registered: number; removed: number };
  staffOnline: { id: string; name: string; role: StaffRole }[];
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
