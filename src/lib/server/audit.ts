import type { Types } from "mongoose";
import { AuditLog, Game } from "./models";

type Actor = { type: string; id?: Types.ObjectId | null; name?: string };

export async function audit(entry: {
  gameId?: Types.ObjectId | null;
  actor: Actor;
  action: string;
  target?: { type: string; id: Types.ObjectId } | null;
  before?: unknown;
  after?: unknown;
  ip?: string;
}) {
  await AuditLog.create({
    gameId: entry.gameId ?? null,
    actor: entry.actor,
    action: entry.action,
    target: entry.target ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: entry.ip ?? "",
  });
}

/** Every state mutation bumps the game version so polling clients refetch (plan §10.1). */
export async function bumpVersion(gameId: Types.ObjectId) {
  await Game.updateOne({ _id: gameId }, { $inc: { version: 1 } });
}
