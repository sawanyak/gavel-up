import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/** One-time device-recovery codes issued by staff (plan §6.6). */
const LoginCodeSchema = new Schema({
  gameId: { type: Schema.Types.ObjectId, required: true },
  playerId: { type: Schema.Types.ObjectId, required: true },
  codeHash: { type: String, required: true },
  issuedBy: { type: Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
});

LoginCodeSchema.index({ playerId: 1 });
LoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type LoginCodeDoc = InferSchemaType<typeof LoginCodeSchema> & { _id: mongoose.Types.ObjectId };

export const LoginCode: Model<LoginCodeDoc> =
  (mongoose.models.LoginCode as Model<LoginCodeDoc>) || mongoose.model<LoginCodeDoc>("LoginCode", LoginCodeSchema);
