import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/** A Detective's question to the GM, logged by the GM (plan §6.14). */
const InvestigationSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    detectiveId: { type: Schema.Types.ObjectId, required: true, ref: "Player" },
    targetId: { type: Schema.Types.ObjectId, required: true, ref: "Player" },
    /** The true answer at the moment it was asked. */
    answerIsImpostor: { type: Boolean, required: true },
    recordedBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

InvestigationSchema.index({ gameId: 1, detectiveId: 1, createdAt: 1 });

export type InvestigationDoc = InferSchemaType<typeof InvestigationSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };

export const Investigation: Model<InvestigationDoc> =
  (mongoose.models.Investigation as Model<InvestigationDoc>) ||
  mongoose.model<InvestigationDoc>("Investigation", InvestigationSchema);
