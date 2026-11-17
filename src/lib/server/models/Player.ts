import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { ROLES } from "@/lib/shared/constants";

const PlayerSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    teamId: { type: Schema.Types.ObjectId, required: true, ref: "Team" },
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, required: true },
    phoneE164: { type: String, required: true },
    status: { type: String, enum: ["alive", "ghost"], default: "alive" },
    /**
     * SECRET. `select: false` means it is never loaded unless explicitly requested
     * with `.select("+role")`. Responses must go through the DTO mappers.
     */
    role: { type: String, enum: [...ROLES, null], default: null, select: false },
    roleAssignedAt: { type: Date, default: null, select: false },
    roleSource: { type: String, enum: ["reveal", "late", "gm_override", null], default: null, select: false },
    eliminatedAt: { type: Date, default: null },
    eliminationCause: { type: String, enum: ["kill", "vote", "gm", null], default: null },
    investigationsUsed: { type: Number, default: 0 },
    /** Registered after roles were revealed. */
    late: { type: Boolean, default: false },
    removedAt: { type: Date, default: null },
    registeredAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

PlayerSchema.index({ gameId: 1, phoneE164: 1 }, { unique: true });
PlayerSchema.index({ gameId: 1, teamId: 1, status: 1 });
PlayerSchema.index({ gameId: 1, role: 1 });

export type PlayerDoc = InferSchemaType<typeof PlayerSchema> & { _id: mongoose.Types.ObjectId };

export const Player: Model<PlayerDoc> =
  (mongoose.models.Player as Model<PlayerDoc>) || mongoose.model<PlayerDoc>("Player", PlayerSchema);
