import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

export const TASK_KINDS = ["individual", "team", "paired", "activity"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

/** Task definitions (plan §6.7). Assignments and completions live in TaskAssignment. */
const TaskSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    kind: { type: String, enum: TASK_KINDS, required: true },
    points: { type: Number, required: true },
    /** "staff": a TM or GM must approve before points are awarded. */
    verification: { type: String, enum: ["none", "staff"], default: "none" },
    pairScope: { type: String, enum: ["same_team", "cross_team", null], default: null },
    allowGhosts: { type: Boolean, default: true },
    revealed: { type: Boolean, default: false },
    revealedAt: { type: Date, default: null },
    order: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

TaskSchema.index({ gameId: 1, revealed: 1, order: 1 });

export type TaskDoc = InferSchemaType<typeof TaskSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };

export const Task: Model<TaskDoc> = (mongoose.models.Task as Model<TaskDoc>) || mongoose.model<TaskDoc>("Task", TaskSchema);
