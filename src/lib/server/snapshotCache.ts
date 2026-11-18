/**
 * Per-version snapshot cache (found by the Phase 7 load test).
 *
 * During voting every vote bumps `games.version`, so all ~80 phones re-fetch at once. Most
 * of each snapshot (teams, roster, meeting, votes, tasks, announcements…) is the same for
 * everyone, so it's loaded ONCE per game version per server instance and shared.
 *
 * This is exactly as safe as the existing 304 logic: every change visible in a snapshot
 * already bumps the version (otherwise clients would never see it). Data loaded under a
 * version is never older than that version, because the version is read first.
 *
 * Holds server-side data only; what each audience sees is still decided by the DTO mappers.
 */
import type { Types } from "mongoose";
import {
  Announcement,
  Meeting,
  Player,
  PointTransaction,
  Prediction,
  Task,
  TaskAssignment,
  Team,
  Vote,
  type AnnouncementDoc,
  type GameDoc,
  type MeetingDoc,
  type PlayerDoc,
  type PointTransactionDoc,
  type PredictionDoc,
  type TaskAssignmentDoc,
  type TaskDoc,
  type TeamDoc,
  type VoteDoc,
} from "./models";

type Entry = { version: number; value: Promise<unknown>; at: number };
const store = new Map<string, Entry>();
const MAX_ENTRIES = 400;

/** `fn` runs at most once per (game, key, version); concurrent callers share the promise. */
export function perVersion<T>(game: Pick<GameDoc, "_id" | "version">, key: string, fn: () => Promise<T>): Promise<T> {
  const k = `${game._id}:${key}`;
  const hit = store.get(k);
  if (hit && hit.version === game.version) return hit.value as Promise<T>;
  // Wrap in a real Promise: Mongoose queries are lazy thenables that would run again on each await.
  const value = Promise.resolve().then(fn);
  store.set(k, { version: game.version, value, at: Date.now() });
  value.catch(() => store.delete(k)); // never cache failures
  if (store.size > MAX_ENTRIES) {
    const oldest = [...store].sort((a, b) => a[1].at - b[1].at).slice(0, store.size - MAX_ENTRIES);
    for (const [key2] of oldest) store.delete(key2);
  }
  return value;
}

/** Test helper: forget everything (tests sometimes edit the DB directly without a version bump). */
export function clearSnapshotCache() {
  store.clear();
}

/** Shared, read-only building blocks for snapshots. No phone numbers, no roles. */
export const shared = (game: GameDoc) => ({
  teams: () => perVersion(game, "teams", () => Team.find({ gameId: game._id }).sort({ order: 1, name: 1 }).lean<TeamDoc[]>()),
  /** Non-removed players: id, name, team, status, late. */
  roster: () =>
    perVersion(game, "roster", () =>
      Player.find({ gameId: game._id, removedAt: null }).select("name teamId status late registeredAt").sort({ name: 1 }).lean<PlayerDoc[]>(),
    ),
  /** Every player ever registered (incl. removed), for name lookups. */
  names: () =>
    perVersion(game, "names", async () => {
      const all = await Player.find({ gameId: game._id }).select("name").lean<PlayerDoc[]>();
      return new Map(all.map((p) => [String(p._id), p.name]));
    }),
  revealedTasks: () => perVersion(game, "revealedTasks", () => Task.find({ gameId: game._id, revealed: true }).sort({ order: 1 }).lean<TaskDoc[]>()),
  assignments: () => perVersion(game, "assignments", () => TaskAssignment.find({ gameId: game._id }).lean<TaskAssignmentDoc[]>()),
  announcements: () =>
    perVersion(game, "announcements", () => Announcement.find({ gameId: game._id, deletedAt: null }).sort({ createdAt: -1 }).limit(60).lean<AnnouncementDoc[]>()),
  teamFeed: (teamIds: Types.ObjectId[], limit: number) =>
    perVersion(game, `feed:${teamIds.map(String).sort().join(",")}:${limit}`, () =>
      PointTransaction.find({ gameId: game._id, teamId: { $in: teamIds } }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean<PointTransactionDoc[]>(),
    ),
  meeting: () =>
    perVersion(game, "meeting", async () => (game.activeMeetingId ? Meeting.findById(game.activeMeetingId).lean<MeetingDoc>() : null)),
  votes: () =>
    perVersion(game, "votes", async () => (game.activeMeetingId ? Vote.find({ meetingId: game.activeMeetingId }).sort({ createdAt: 1 }).lean<VoteDoc[]>() : [])),
  predictions: () =>
    perVersion(game, "predictions", async () =>
      game.activeMeetingId ? Prediction.find({ meetingId: game.activeMeetingId }).sort({ createdAt: 1 }).lean<PredictionDoc[]>() : [],
    ),
});
