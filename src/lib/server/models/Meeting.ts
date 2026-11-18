import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

export const MEETING_STATUSES = ["CALLED", "VOTING", "CLOSED", "RESULTS", "RESOLVED", "CANCELLED"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

const Id = Schema.Types.ObjectId;

/** Who could vote and who could be voted for, per team, frozen when voting opens. */
const EligibleSchema = new Schema({ teamId: Id, voterIds: [Id], candidateIds: [Id] }, { _id: false });

const TeamResultSchema = new Schema(
  {
    teamId: Id,
    tally: [new Schema({ playerId: Id, count: Number }, { _id: false })],
    skipCount: Number,
    votedCount: Number,
    notVotedCount: Number,
    topCandidateIds: [Id],
    tie: Boolean,
    mostSkipped: Boolean,
    /** null until decided. eliminatedPlayerId null = nobody eliminated. */
    decision: {
      type: new Schema({ eliminatedPlayerId: { type: Id, default: null }, decidedBy: String, decidedByName: String, at: Date }, { _id: false }),
      default: null,
    },
    wasImpostor: { type: Boolean, default: null },
  },
  { _id: false },
);

/** An emergency meeting (plan §6.9). */
const MeetingSchema = new Schema(
  {
    gameId: { type: Id, required: true, ref: "Game" },
    number: { type: Number, required: true },
    status: { type: String, enum: MEETING_STATUSES, default: "CALLED" },
    calledAt: { type: Date, default: () => new Date() },
    calledBy: { type: Id, default: null },
    votingOpenedAt: { type: Date, default: null },
    votingEndsAt: { type: Date, default: null },
    votingClosedAt: { type: Date, default: null },
    eligible: { type: [EligibleSchema], default: [] },
    teamResults: { type: [TeamResultSchema], default: [] },
    resultsRevealedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Id, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
  },
  { timestamps: true },
);

MeetingSchema.index({ gameId: 1, number: 1 }, { unique: true });

export type MeetingDoc = InferSchemaType<typeof MeetingSchema> & { _id: mongoose.Types.ObjectId };
export type TeamResult = MeetingDoc["teamResults"][number];

export const Meeting: Model<MeetingDoc> =
  (mongoose.models.Meeting as Model<MeetingDoc>) || mongoose.model<MeetingDoc>("Meeting", MeetingSchema);
