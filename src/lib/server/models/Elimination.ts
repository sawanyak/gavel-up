import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/** Every kill, vote-out or GM elimination, and its reversal (plan §6.13). */
const EliminationSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    playerId: { type: Schema.Types.ObjectId, required: true, ref: "Player" },
    teamId: { type: Schema.Types.ObjectId, required: true },
    cause: { type: String, enum: ["kill", "vote", "gm"], required: true },
    meetingId: { type: Schema.Types.ObjectId, default: null },
    recordedBy: {
      type: new Schema({ type: String, id: { type: Schema.Types.ObjectId, default: null }, name: String }, { _id: false }),
      required: true,
    },
    note: { type: String, default: "" },
    revertedAt: { type: Date, default: null },
    revertedBy: { type: Schema.Types.ObjectId, default: null },
    revertReason: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

EliminationSchema.index({ gameId: 1, playerId: 1, createdAt: -1 });

export type EliminationDoc = InferSchemaType<typeof EliminationSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };

export const Elimination: Model<EliminationDoc> =
  (mongoose.models.Elimination as Model<EliminationDoc>) || mongoose.model<EliminationDoc>("Elimination", EliminationSchema);
