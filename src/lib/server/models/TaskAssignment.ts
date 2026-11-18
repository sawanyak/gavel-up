import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

export const ASSIGNMENT_STATUSES = ["open", "awaiting_partner", "awaiting_verification", "completed", "rejected"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

/**
 * One assignment of a task (plan §6.8):
 *  - individual: assigneeIds [p],   key "p:<id>"
 *  - team:       assigneeIds [],    key "t:<teamId>"   (any team member can complete it)
 *  - paired:     assigneeIds [a,b], key "pair:<min>:<max>" (both must confirm)
 * `teamIds` = the team(s) that earn the points (two for a cross-team pair).
 */
const TaskAssignmentSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, ref: "Game" },
    taskId: { type: Schema.Types.ObjectId, required: true, ref: "Task" },
    teamIds: { type: [Schema.Types.ObjectId], required: true },
    assigneeIds: { type: [Schema.Types.ObjectId], default: [] },
    assignmentKey: { type: String, required: true },
    status: { type: String, enum: ASSIGNMENT_STATUSES, default: "open" },
    confirmations: { type: [new Schema({ playerId: Schema.Types.ObjectId, at: Date }, { _id: false })], default: [] },
    submittedBy: { type: Schema.Types.ObjectId, default: null },
    submittedAt: { type: Date, default: null },
    verifiedBy: { type: Schema.Types.ObjectId, default: null },
    verifiedAt: { type: Date, default: null },
    rejectReason: { type: String, default: null },
    rejectedCount: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    transactionIds: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true },
);

TaskAssignmentSchema.index({ gameId: 1, taskId: 1, assignmentKey: 1 }, { unique: true });
TaskAssignmentSchema.index({ gameId: 1, assigneeIds: 1 });
TaskAssignmentSchema.index({ gameId: 1, teamIds: 1, status: 1 });

export type TaskAssignmentDoc = InferSchemaType<typeof TaskAssignmentSchema> & { _id: mongoose.Types.ObjectId };

export const TaskAssignment: Model<TaskAssignmentDoc> =
  (mongoose.models.TaskAssignment as Model<TaskAssignmentDoc>) ||
  mongoose.model<TaskAssignmentDoc>("TaskAssignment", TaskAssignmentSchema);
