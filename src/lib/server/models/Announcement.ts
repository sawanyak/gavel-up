import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

/** GM announcements shown on phones (plan §6.15). `teamId: null` means everyone. */
const AnnouncementSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    text: { type: String, required: true },
    level: { type: String, enum: ["info", "alert"], default: "info" },
    teamId: { type: Schema.Types.ObjectId, default: null },
    pinned: { type: Boolean, default: false },
    createdBy: { type: new Schema({ id: Schema.Types.ObjectId, name: String }, { _id: false }), required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AnnouncementSchema.index({ gameId: 1, deletedAt: 1, createdAt: -1 });

export type AnnouncementDoc = InferSchemaType<typeof AnnouncementSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };

export const Announcement: Model<AnnouncementDoc> =
  (mongoose.models.Announcement as Model<AnnouncementDoc>) ||
  mongoose.model<AnnouncementDoc>("Announcement", AnnouncementSchema);
