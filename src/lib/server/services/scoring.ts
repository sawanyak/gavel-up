import mongoose, { type Types } from "mongoose";
import { audit } from "../audit";
import { assertNotArchived, assertTeamAccess, staffActor } from "../auth/guards";
import { badRequest, conflict, isDuplicateKey, notFound } from "../errors";
import {
  Meeting,
  Player,
  PointTransaction,
  Prediction,
  Task,
  Team,
  type GameDoc,
  type MeetingDoc,
  type PlayerDoc,
  type PointTransactionDoc,
  type PredictionDoc,
  type StaffDoc,
  type TeamDoc,
} from "../models";
import { award, awardInSession, recomputeScores } from "./ledger";

/* ───────────────────────── Manual awards ───────────────────────── */

export interface ManualAwardInput {
  teamId: string;
  amount: number;
  reason: string;
  activityTaskId?: string;
  earnedByPlayerId?: string;
}

export function manualBounds(game: GameDoc, staff: StaffDoc) {
  const p = game.config?.points;
  return staff.role === "GM" ? { min: p?.gmManualMin ?? -100, max: p?.gmManualMax ?? 100 } : { min: p?.tmManualMin ?? -20, max: p?.tmManualMax ?? 20 };
}

/**
 * GM (any team) or TM (own team, within TM bounds) awards or deducts points (plan R16).
 * `clientKey` is the request's Idempotency-Key, so a retried submit never awards twice.
 */
export async function manualAward(staff: StaffDoc, game: GameDoc, input: ManualAwardInput, clientKey: string, ip: string) {
  assertNotArchived(game);
  if (!game.rolesRevealedAt) throw conflict("INVALID_PHASE", "Points can be given once the game has started.");
  const team = await Team.findOne({ _id: input.teamId, gameId: game._id }).lean<TeamDoc>();
  if (!team) throw notFound("Team not found.");
  assertTeamAccess(staff, team._id);
  const { min, max } = manualBounds(game, staff);
  if (input.amount < min || input.amount > max) {
    throw badRequest("AMOUNT_OUT_OF_RANGE", `${staff.role === "GM" ? "Game Masters" : "Team Managers"} can give between ${min} and +${max} points at a time.`, { min, max });
  }

  let activity: { _id: Types.ObjectId; title: string } | null = null;
  if (input.activityTaskId) {
    activity = await Task.findOne({ _id: input.activityTaskId, gameId: game._id, kind: "activity" }).select("title").lean();
    if (!activity) throw badRequest("INVALID_ACTIVITY", "Unknown activity.");
  }
  if (input.earnedByPlayerId) {
    const p = await Player.exists({ _id: input.earnedByPlayerId, teamId: team._id, removedAt: null });
    if (!p) throw badRequest("INVALID_PLAYER", "That player isn't in this team.");
  }

  const { tx, created } = await award({
    gameId: game._id,
    teamId: team._id,
    amount: input.amount,
    category: activity ? "activity" : input.amount < 0 ? "penalty" : "manual",
    reason: activity ? `${activity.title}: ${input.reason}` : input.reason,
    idempotencyKey: `manual:${staff._id}:${clientKey}`,
    createdBy: { type: "staff", id: staff._id, name: staff.name },
    earnedByPlayerId: input.earnedByPlayerId ? new mongoose.Types.ObjectId(input.earnedByPlayerId) : null,
    source: activity ? { type: "task", id: activity._id } : { type: "manual", id: null },
  });
  if (created) {
    await audit({ gameId: game._id, actor: staffActor(staff), action: "POINTS_AWARDED", target: { type: "team", id: team._id }, after: { amount: input.amount, reason: input.reason }, ip });
  }
  const teamScore = (await Team.findById(team._id).lean<TeamDoc>())!.score;
  return { tx, created, teamScore };
}

/* ───────────────────────── Reversal & recompute ───────────────────────── */

/** GM cancels a transaction with an opposite one. Each transaction can be reversed once. */
export async function reverseTransaction(staff: StaffDoc, game: GameDoc, txId: string, reason: string, ip: string) {
  assertNotArchived(game);
  const original = await PointTransaction.findOne({ _id: txId, gameId: game._id }).lean<PointTransactionDoc>();
  if (!original) throw notFound("Transaction not found.");
  if (original.reversesId) throw conflict("CANNOT_REVERSE_REVERSAL", "This is already a reversal. Give a new award instead.");
  if (original.reversedById) throw conflict("ALREADY_REVERSED", "This transaction was already reversed.");

  const session = await mongoose.startSession();
  let reversal: PointTransactionDoc | null = null;
  try {
    await session.withTransaction(async () => {
      reversal = await awardInSession(
        {
          gameId: game._id,
          teamId: original.teamId,
          amount: -original.amount,
          category: "reversal",
          reason: `Reversed (${reason}): ${original.reason}`,
          idempotencyKey: `reverse:${original._id}`,
          createdBy: { type: "staff", id: staff._id, name: staff.name },
          source: original.source?.type ? { type: original.source.type, id: original.source.id ?? null } : null,
          reversesId: original._id,
        },
        session,
      );
      const res = await PointTransaction.updateOne({ _id: original._id, reversedById: null }, { $set: { reversedById: reversal._id } }, { session });
      if (res.modifiedCount !== 1) throw conflict("ALREADY_REVERSED", "This transaction was already reversed.");
    });
  } catch (err) {
    if (isDuplicateKey(err)) throw conflict("ALREADY_REVERSED", "This transaction was already reversed.");
    throw err;
  } finally {
    await session.endSession();
  }
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "POINTS_REVERSED",
    target: { type: "pointTransaction", id: original._id },
    before: { amount: original.amount, reason: original.reason },
    after: { reason },
    ip,
  });
  const teamScore = (await Team.findById(original.teamId).lean<TeamDoc>())!.score;
  return { reversal: reversal!, teamScore };
}

export async function recompute(staff: StaffDoc, game: GameDoc, ip: string) {
  const before = await Team.find({ gameId: game._id }).select("name score").lean<TeamDoc[]>();
  const teams = await recomputeScores(game._id);
  const changed = teams.filter((t) => before.find((b) => String(b._id) === t.id)?.score !== t.score);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "SCORES_RECOMPUTED",
    before: before.map((b) => ({ id: b._id, score: b.score })),
    after: { teams, changed: changed.length },
    ip,
  });
  return { teams, changed: changed.length };
}

/* ───────────────────────── Prediction scoring ───────────────────────── */

export interface PredictionResult {
  id: string;
  predictorName: string;
  predictorTeamId: string;
  targetName: string;
  targetTeamId: string;
  correct: boolean;
  amount: number;
}

/**
 * Scores every cross-team prediction once (plan §11.3): +30 if the target is an impostor,
 * −15 if not, to the predictor's team. Predictions from cancelled meetings are ignored.
 * Only in the final phase, because results would reveal who the impostors are.
 * Safe to run again: already-scored predictions are skipped (key `pred:<id>`).
 */
export async function scorePredictions(staff: StaffDoc, game: GameDoc, ip: string) {
  assertNotArchived(game);
  if (game.phase !== "FINAL") throw conflict("INVALID_PHASE", "Predictions are scored during the final reveal.");
  const pts = game.config?.points;
  const plus = pts?.correctPrediction ?? 30;
  const minus = pts?.wrongPrediction ?? -15;

  const cancelled = await Meeting.find({ gameId: game._id, status: "CANCELLED" }).select("_id").lean<MeetingDoc[]>();
  const predictions = await Prediction.find({ gameId: game._id, meetingId: { $nin: cancelled.map((m) => m._id) } }).lean<PredictionDoc[]>();
  const players = await Player.find({ _id: { $in: predictions.flatMap((p) => [p.targetPlayerId, p.predictorPlayerId]) } })
    .select("+role name")
    .lean<PlayerDoc[]>();
  const byId = new Map(players.map((p) => [String(p._id), p]));

  let newlyScored = 0;
  for (const p of predictions) {
    if (p.scoredAt) continue;
    const correct = byId.get(String(p.targetPlayerId))?.role === "impostor";
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const claimed = await Prediction.findOneAndUpdate(
          { _id: p._id, scoredAt: null },
          { $set: { scoredAt: new Date(), outcome: correct ? "correct" : "wrong" } },
          { new: true, session },
        );
        if (!claimed) return;
        const tx = await awardInSession(
          {
            gameId: game._id,
            teamId: p.predictorTeamId,
            amount: correct ? plus : minus,
            category: "prediction",
            reason: `${correct ? "Correct" : "Wrong"} prediction: ${byId.get(String(p.targetPlayerId))?.name ?? "?"}`,
            idempotencyKey: `pred:${p._id}`,
            createdBy: { type: "system", name: staff.name },
            earnedByPlayerId: p.predictorPlayerId,
            source: { type: "prediction", id: p._id },
          },
          session,
        );
        await Prediction.updateOne({ _id: p._id }, { $set: { transactionId: tx._id } }, { session });
        newlyScored += 1;
      });
    } finally {
      await session.endSession();
    }
  }

  const scored = await Prediction.find({ gameId: game._id, scoredAt: { $ne: null } }).lean<PredictionDoc[]>();
  const results: PredictionResult[] = scored.map((p) => ({
    id: String(p._id),
    predictorName: byId.get(String(p.predictorPlayerId))?.name ?? "?",
    predictorTeamId: String(p.predictorTeamId),
    targetName: byId.get(String(p.targetPlayerId))?.name ?? "?",
    targetTeamId: String(p.targetTeamId),
    correct: p.outcome === "correct",
    amount: p.outcome === "correct" ? plus : minus,
  }));
  if (newlyScored) await audit({ gameId: game._id, actor: staffActor(staff), action: "PREDICTIONS_SCORED", after: { newlyScored }, ip });
  return { results, newlyScored };
}
