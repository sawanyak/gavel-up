import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const AuditLogSchema = new Schema({
  gameId: { type: Schema.Types.ObjectId, default: null },
  actor: {
    type: new Schema({ type: String, id: Schema.Types.ObjectId, name: String }, { _id: false }),
    required: true,
  },
  action: { type: String, required: true },
  target: { type: new Schema({ type: String, id: Schema.Types.ObjectId }, { _id: false }), default: null },
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null },
  ip: { type: String, default: "" },
  createdAt: { type: Date, default: () => new Date() },
});

AuditLogSchema.index({ gameId: 1, createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: mongoose.Types.ObjectId };

export const AuditLog: Model<AuditLogDoc> =
  (mongoose.models.AuditLog as Model<AuditLogDoc>) || mongoose.model<AuditLogDoc>("AuditLog", AuditLogSchema);
