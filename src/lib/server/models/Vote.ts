import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/**
 * An internal team vote (plan §6.10). `targetId: null` = skip.
 * Unique {meetingId, voterId}: one vote per person per meeting, final once cast.
 * An invalidated vote is deleted (copied into the audit log) so the voter may vote again.
 */
const VoteSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    meetingId: { type: Schema.Types.ObjectId, required: true, ref: "Meeting" },
    teamId: { type: Schema.Types.ObjectId, required: true },
    voterId: { type: Schema.Types.ObjectId, required: true },
    targetId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

VoteSchema.index({ meetingId: 1, voterId: 1 }, { unique: true });
VoteSchema.index({ meetingId: 1, teamId: 1 });

export type VoteDoc = InferSchemaType<typeof VoteSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };

export const Vote: Model<VoteDoc> = (mongoose.models.Vote as Model<VoteDoc>) || mongoose.model<VoteDoc>("Vote", VoteSchema);
