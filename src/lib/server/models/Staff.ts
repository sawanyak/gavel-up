import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const StaffSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, required: true },
    role: { type: String, enum: ["GM", "TM"], required: true },
    /** Team Managers: the teams they manage. Game Masters: []. */
    teamIds: { type: [Schema.Types.ObjectId], default: [] },
    pinHash: { type: String, required: true, select: false },
    active: { type: Boolean, default: true },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

StaffSchema.index({ nameNormalized: 1 }, { unique: true });

export type StaffDoc = InferSchemaType<typeof StaffSchema> & { _id: mongoose.Types.ObjectId };

export const Staff: Model<StaffDoc> =
  (mongoose.models.Staff as Model<StaffDoc>) || mongoose.model<StaffDoc>("Staff", StaffSchema);
