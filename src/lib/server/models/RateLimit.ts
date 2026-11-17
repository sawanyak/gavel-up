import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/** Fixed-window counters for rate limiting (works across serverless instances). */
const RateLimitSchema = new Schema({
  key: { type: String, required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

RateLimitSchema.index({ key: 1, windowStart: 1 }, { unique: true });
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitDoc = InferSchemaType<typeof RateLimitSchema>;

export const RateLimit: Model<RateLimitDoc> =
  (mongoose.models.RateLimit as Model<RateLimitDoc>) || mongoose.model<RateLimitDoc>("RateLimit", RateLimitSchema);
