export { Game } from "./Game";
export type { GameDoc } from "./Game";
export { Team } from "./Team";
export type { TeamDoc } from "./Team";
export { Player } from "./Player";
export type { PlayerDoc } from "./Player";
export { Staff } from "./Staff";
export type { StaffDoc } from "./Staff";
export { Session } from "./Session";
export { LoginCode } from "./LoginCode";
export { AuditLog } from "./AuditLog";
export { RateLimit } from "./RateLimit";

import { Game } from "./Game";
import { Team } from "./Team";
import { Player } from "./Player";
import { Staff } from "./Staff";
import { Session } from "./Session";
import { LoginCode } from "./LoginCode";
import { AuditLog } from "./AuditLog";
import { RateLimit } from "./RateLimit";

export const ALL_MODELS = [Game, Team, Player, Staff, Session, LoginCode, AuditLog, RateLimit];

/** Creates/updates all indexes. Run by the seed script and test setup. */
export async function syncAllIndexes() {
  for (const m of ALL_MODELS) await m.syncIndexes();
}
