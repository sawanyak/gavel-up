import mongoose, { type ClientSession, type Types } from "mongoose";
import { conflict, isDuplicateKey } from "../errors";
import { Game, PointTransaction, Team, type PointCategory, type PointTransactionDoc } from "../models";

/**
 * The point ledger (plan §6.12, §11.4).
 *
 * Every point change is one immutable PointTransaction with a deterministic
 * idempotency key. The insert, the `teams.score` cache update and the game version
 * bump happen in ONE Mongo transaction, so a duplicate key aborts all of it:
 * the same award can never be counted twice, however many times it's retried.
 */
export interface AwardInput {
  gameId: Types.ObjectId;
  teamId: Types.ObjectId;
  amount: number;
  category: PointCategory;
  reason: string;
  idempotencyKey: string;
  createdBy: { type: "system" | "staff" | "player"; id?: Types.ObjectId | null; name?: string };
  earnedByPlayerId?: Types.ObjectId | null;
  source?: { type: string; id: Types.ObjectId | null } | null;
  /** Set on reversal transactions: the transaction being cancelled out. */
  reversesId?: Types.ObjectId | null;
}

/** Writes one transaction inside an existing session. Throws E11000 if the key was already used. */
export async function awardInSession(input: AwardInput, session: ClientSession): Promise<PointTransactionDoc> {
  // Once the final leaderboard is on screen, scores are frozen so the announced result can't change.
  const g = await Game.findById(input.gameId).select("final").session(session).lean<{ final?: { leaderboardShownAt?: string } }>();
  if (g?.final?.leaderboardShownAt) throw conflict("SCORES_FROZEN", "Scores are final — the leaderboard has already been shown.");
  const [tx] = await PointTransaction.create(
    [
      {
        gameId: input.gameId,
        teamId: input.teamId,
        amount: input.amount,
        category: input.category,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        createdBy: { type: input.createdBy.type, id: input.createdBy.id ?? null, name: input.createdBy.name ?? "" },
        earnedByPlayerId: input.earnedByPlayerId ?? null,
        source: input.source ?? null,
        reversesId: input.reversesId ?? null,
      },
    ],
    { session },
  );
  const res = await Team.updateOne({ _id: input.teamId, gameId: input.gameId }, { $inc: { score: input.amount } }, { session });
  if (res.matchedCount !== 1) throw new Error(`award: team ${input.teamId} not in game ${input.gameId}`);
  await Game.updateOne({ _id: input.gameId }, { $inc: { version: 1 } }, { session });
  return tx.toObject() as PointTransactionDoc;
}

/**
 * Awards points once. Returns `created: false` (and the original transaction)
 * when this idempotency key was already used.
 */
export async function award(input: AwardInput): Promise<{ tx: PointTransactionDoc; created: boolean }> {
  const session = await mongoose.startSession();
  try {
    let tx: PointTransactionDoc | null = null;
    await session.withTransaction(async () => {
      tx = await awardInSession(input, session);
    });
    return { tx: tx!, created: true };
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    const existing = await PointTransaction.findOne({ gameId: input.gameId, idempotencyKey: input.idempotencyKey }).lean<PointTransactionDoc>();
    return { tx: existing!, created: false };
  } finally {
    await session.endSession();
  }
}

/** Rebuilds every team's cached score from the ledger. Returns the new scores. */
export async function recomputeScores(gameId: Types.ObjectId) {
  const sums = await PointTransaction.aggregate<{ _id: Types.ObjectId; total: number }>([
    { $match: { gameId } },
    { $group: { _id: "$teamId", total: { $sum: "$amount" } } },
  ]);
  const byTeam = new Map(sums.map((s) => [String(s._id), s.total]));
  const teams = await Team.find({ gameId }).select("_id").lean();
  await Promise.all(teams.map((t) => Team.updateOne({ _id: t._id }, { $set: { score: byTeam.get(String(t._id)) ?? 0 } })));
  await Game.updateOne({ _id: gameId }, { $inc: { version: 1 } });
  return teams.map((t) => ({ id: String(t._id), score: byTeam.get(String(t._id)) ?? 0 }));
}
