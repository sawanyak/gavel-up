import type { Types } from "mongoose";
import type { FeedItem, GMPointsSnapshot, LeaderboardRow, LedgerItem, PointCategory } from "@/lib/shared/types";
import type { GamePhase, TeamColorKey } from "@/lib/shared/constants";
import { Player, PointTransaction, Task, Team, type GameDoc, type PlayerDoc, type PointTransactionDoc, type StaffDoc, type TaskDoc, type TeamDoc } from "./models";
import { manualBounds } from "./services/scoring";

/** Teams by score (desc), then name. Equal scores share a rank (1, 1, 3). */
export function leaderboard(teams: Pick<TeamDoc, "_id" | "key" | "name" | "colorHex" | "score">[]): LeaderboardRow[] {
  const sorted = [...teams].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name));
  return sorted.map((t) => ({
    teamId: String(t._id),
    key: t.key as TeamColorKey,
    name: t.name,
    colorHex: t.colorHex,
    score: t.score ?? 0,
    rank: sorted.findIndex((x) => (x.score ?? 0) === (t.score ?? 0)) + 1,
  }));
}

const feedItem = (t: PointTransactionDoc): FeedItem => ({
  id: String(t._id),
  teamId: String(t.teamId),
  amount: t.amount,
  reason: t.reason,
  category: t.category as PointCategory,
  at: t.createdAt.toISOString(),
});

export async function teamFeed(gameId: Types.ObjectId, teamIds: Types.ObjectId[], limit = 10): Promise<FeedItem[]> {
  const txs = await PointTransaction.find({ gameId, teamId: { $in: teamIds } }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean<PointTransactionDoc[]>();
  return txs.map(feedItem);
}

export async function gameLeaderboard(gameId: Types.ObjectId) {
  return leaderboard(await Team.find({ gameId }).lean<TeamDoc[]>());
}

export async function gmPointsSnapshot(
  game: GameDoc,
  staff: StaffDoc,
  q: { teamId?: string; category?: string; limit: number },
): Promise<GMPointsSnapshot> {
  const filter: Record<string, unknown> = { gameId: game._id };
  if (q.teamId) filter.teamId = q.teamId;
  if (q.category) filter.category = q.category;
  const [teams, txs, totals, players, activities] = await Promise.all([
    Team.find({ gameId: game._id }).sort({ order: 1, name: 1 }).lean<TeamDoc[]>(),
    PointTransaction.find(filter).sort({ createdAt: -1, _id: -1 }).limit(q.limit).lean<PointTransactionDoc[]>(),
    PointTransaction.aggregate<{ _id: string; total: number; n: number }>([
      { $match: { gameId: game._id } },
      { $group: { _id: "$category", total: { $sum: "$amount" }, n: { $sum: 1 } } },
    ]),
    Player.find({ gameId: game._id, removedAt: null }).select("name teamId").sort({ name: 1 }).lean<PlayerDoc[]>(),
    Task.find({ gameId: game._id, kind: "activity" }).select("title").sort({ order: 1 }).lean<TaskDoc[]>(),
  ]);
  const team = new Map(teams.map((t) => [String(t._id), t]));
  const earnerIds = txs.map((t) => t.earnedByPlayerId).filter(Boolean) as Types.ObjectId[];
  const earners = earnerIds.length ? await Player.find({ _id: { $in: earnerIds } }).select("name").lean<PlayerDoc[]>() : [];
  const earnerName = new Map(earners.map((p) => [String(p._id), p.name]));

  const ledger: LedgerItem[] = txs.map((t) => ({
    ...feedItem(t),
    teamName: team.get(String(t.teamId))?.name ?? "?",
    colorHex: team.get(String(t.teamId))?.colorHex ?? "#fff",
    createdByName: t.createdBy?.name ?? "",
    earnedByName: t.earnedByPlayerId ? (earnerName.get(String(t.earnedByPlayerId)) ?? "?") : null,
    reversed: !!t.reversedById,
    isReversal: !!t.reversesId,
  }));

  return {
    version: game.version,
    serverTime: Date.now(),
    phase: game.phase as GamePhase,
    leaderboard: leaderboard(teams),
    ledger,
    totals: {
      transactions: totals.reduce((s, x) => s + x.n, 0),
      byCategory: Object.fromEntries(totals.map((x) => [x._id, x.total])),
    },
    teams: teams.map((t) => ({ id: String(t._id), key: t.key as TeamColorKey, name: t.name, colorHex: t.colorHex, order: t.order ?? 0 })),
    players: players.map((p) => ({ id: String(p._id), name: p.name, teamId: String(p.teamId) })),
    activities: activities.map((a) => ({ id: String(a._id), title: a.title })),
    bounds: manualBounds(game, staff),
  };
}
