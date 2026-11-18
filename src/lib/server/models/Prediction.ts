import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/**
 * A cross-team prediction (plan §6.11), stored separately from votes.
 * Unique {meetingId, predictorTeamId, targetTeamId}: the FIRST teammate to predict
 * a given other team locks it for the whole team.
 */
const PredictionSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    meetingId: { type: Schema.Types.ObjectId, required: true, ref: "Meeting" },
    predictorTeamId: { type: Schema.Types.ObjectId, required: true },
    predictorPlayerId: { type: Schema.Types.ObjectId, required: true },
    targetTeamId: { type: Schema.Types.ObjectId, required: true },
    targetPlayerId: { type: Schema.Types.ObjectId, required: true },
    outcome: { type: String, enum: ["correct", "wrong", null], default: null },
    scoredAt: { type: Date, default: null },
    transactionId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PredictionSchema.index({ meetingId: 1, predictorTeamId: 1, targetTeamId: 1 }, { unique: true });
PredictionSchema.index({ meetingId: 1, predictorPlayerId: 1 });

export type PredictionDoc = InferSchemaType<typeof PredictionSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };

export const Prediction: Model<PredictionDoc> =
  (mongoose.models.Prediction as Model<PredictionDoc>) || mongoose.model<PredictionDoc>("Prediction", PredictionSchema);
