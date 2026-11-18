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
export { PointTransaction } from "./PointTransaction";
export type { PointTransactionDoc, PointCategory } from "./PointTransaction";
export { Task } from "./Task";
export type { TaskDoc, TaskKind } from "./Task";
export { TaskAssignment } from "./TaskAssignment";
export type { TaskAssignmentDoc, AssignmentStatus } from "./TaskAssignment";
export { Elimination } from "./Elimination";
export type { EliminationDoc } from "./Elimination";
export { Investigation } from "./Investigation";
export type { InvestigationDoc } from "./Investigation";
export { Announcement } from "./Announcement";
export type { AnnouncementDoc } from "./Announcement";

import { Game } from "./Game";
import { Team } from "./Team";
import { Player } from "./Player";
import { Staff } from "./Staff";
import { Session } from "./Session";
import { LoginCode } from "./LoginCode";
import { AuditLog } from "./AuditLog";
import { RateLimit } from "./RateLimit";
import { PointTransaction } from "./PointTransaction";
import { Task } from "./Task";
import { TaskAssignment } from "./TaskAssignment";
import { Elimination } from "./Elimination";
import { Investigation } from "./Investigation";
import { Announcement } from "./Announcement";

export const ALL_MODELS = [
  Game,
  Team,
  Player,
  Staff,
  Session,
  LoginCode,
  AuditLog,
  RateLimit,
  PointTransaction,
  Task,
  TaskAssignment,
  Elimination,
  Investigation,
  Announcement,
];

/** Creates/updates all indexes. Run by the seed script and test setup. */
export async function syncAllIndexes() {
  // Collections must exist before a transaction can write to them, so create them up front too.
  for (const m of ALL_MODELS) {
    await m.createCollection().catch(() => {});
    await m.syncIndexes();
  }
}
