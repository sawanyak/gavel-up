import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const SessionSchema = new Schema({
  tokenHash: { type: String, required: true },
  subjectType: { type: String, enum: ["player", "staff"], required: true },
  subjectId: { type: Schema.Types.ObjectId, required: true },
  gameId: { type: Schema.Types.ObjectId, default: null },
  createdAt: { type: Date, default: () => new Date() },
  lastSeenAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  userAgent: { type: String, default: "" },
});

SessionSchema.index({ tokenHash: 1 }, { unique: true });
SessionSchema.index({ subjectId: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof SessionSchema> & { _id: mongoose.Types.ObjectId };

export const Session: Model<SessionDoc> =
  (mongoose.models.Session as Model<SessionDoc>) || mongoose.model<SessionDoc>("Session", SessionSchema);
