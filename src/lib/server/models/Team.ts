import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { TEAM_COLOR_KEYS } from "@/lib/shared/constants";

const TeamSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    key: { type: String, required: true, enum: TEAM_COLOR_KEYS },
    name: { type: String, required: true, trim: true },
    colorHex: { type: String, required: true },
    order: { type: Number, default: 0 },
    /** Cached sum of pointTransactions (maintained transactionally from Phase 5). */
    score: { type: Number, default: 0 },
  },
  { timestamps: true },
);

TeamSchema.index({ gameId: 1, key: 1 }, { unique: true });

export type TeamDoc = InferSchemaType<typeof TeamSchema> & { _id: mongoose.Types.ObjectId };

export const Team: Model<TeamDoc> =
  (mongoose.models.Team as Model<TeamDoc>) || mongoose.model<TeamDoc>("Team", TeamSchema);
