// Shared constants used by both server and client code.

export const TEAM_COLORS = {
  red: "#C51111",
  blue: "#132ED1",
  cyan: "#38FEDC",
  green: "#117F2D",
  yellow: "#F5F557",
  orange: "#F07D0D",
  purple: "#6B2FBC",
  pink: "#ED54BA",
  lime: "#50EF39",
  black: "#3F474E",
  white: "#D6E0F0",
} as const;

export type TeamColorKey = keyof typeof TEAM_COLORS;
export const TEAM_COLOR_KEYS = Object.keys(TEAM_COLORS) as TeamColorKey[];

/** Default teams created by the seed script [REC]. Edit in /gm/setup. */
export const DEFAULT_TEAMS: { key: TeamColorKey; name: string }[] = [
  { key: "red", name: "Red" },
  { key: "blue", name: "Blue" },
  { key: "green", name: "Green" },
  { key: "yellow", name: "Yellow" },
  { key: "purple", name: "Purple" },
];

export const PLAYER_COOKIE = "gu_player";
export const STAFF_COOKIE = "gu_staff";

export const PLAYER_SESSION_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
export const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const STAFF_MAX_FAILED_LOGINS = 5;
export const STAFF_LOCK_MS = 5 * 60 * 1000;

export const GAME_PHASES = ["SETUP", "LOBBY", "PLAYING", "MEETING", "FINAL", "COMPLETED"] as const;
export type GamePhase = (typeof GAME_PHASES)[number];

export const ROLES = ["crewmate", "impostor", "detective"] as const;
export type Role = (typeof ROLES)[number];

export type StaffRole = "GM" | "TM";
