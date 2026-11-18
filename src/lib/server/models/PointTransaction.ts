import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

export const POINT_CATEGORIES = ["task", "activity", "manual", "internal_vote", "prediction", "penalty", "reversal"] as const;
export type PointCategory = (typeof POINT_CATEGORIES)[number];

const ActorRef = new Schema({ type: String, id: { type: Schema.Types.ObjectId, default: null }, name: String }, { _id: false });

/**
 * The ledger — the single source of scoring truth (plan §6.12).
 * Immutable: corrections are new "reversal" rows. `teams.score` is a cache of Σ amount.
 */
const PointTransactionSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    teamId: { type: Schema.Types.ObjectId, required: true, ref: "Team" },
    amount: { type: Number, required: true },
    category: { type: String, enum: POINT_CATEGORIES, required: true },
    reason: { type: String, required: true },
    earnedByPlayerId: { type: Schema.Types.ObjectId, default: null },
    source: {
      type: new Schema({ type: String, id: { type: Schema.Types.ObjectId, default: null } }, { _id: false }),
      default: null,
    },
    /** Deterministic from domain ids (plan §11.4), so a duplicate award is impossible. */
    idempotencyKey: { type: String, required: true },
    createdBy: { type: ActorRef, required: true },
    reversesId: { type: Schema.Types.ObjectId, default: null },
    reversedById: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PointTransactionSchema.index({ gameId: 1, idempotencyKey: 1 }, { unique: true });
PointTransactionSchema.index({ gameId: 1, createdAt: -1 });
PointTransactionSchema.index({ gameId: 1, teamId: 1 });

export type PointTransactionDoc = InferSchemaType<typeof PointTransactionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const PointTransaction: Model<PointTransactionDoc> =
  (mongoose.models.PointTransaction as Model<PointTransactionDoc>) ||
  mongoose.model<PointTransactionDoc>("PointTransaction", PointTransactionSchema);
