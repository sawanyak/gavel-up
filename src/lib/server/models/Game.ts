import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { GAME_PHASES } from "@/lib/shared/constants";

const PointsConfig = new Schema(
  {
    taskDefault: { type: Number, default: 10 },
    pairedTaskDefault: { type: Number, default: 15 },
    correctInternalVotePerVoter: { type: Number, default: 10 },
    correctPrediction: { type: Number, default: 30 },
    wrongPrediction: { type: Number, default: -15 },
    tmManualMin: { type: Number, default: -20 },
    tmManualMax: { type: Number, default: 20 },
    gmManualMin: { type: Number, default: -100 },
    gmManualMax: { type: Number, default: 100 },
  },
  { _id: false },
);

const ConfigSchema = new Schema(
  {
    impostorsPerTeam: { type: Number, default: 1 },
    impostorOverrides: { type: Map, of: Number, default: {} },
    detectivesPerTeam: { type: Number, default: 1 },
    minTeamSizeForSpecialRoles: { type: Number, default: 3 },
    impostorsSeeEachOther: { type: Boolean, default: true },
    lateJoinerRole: { type: String, default: "crewmate" },
    detectiveInvestigationLimit: { type: Number, default: 1 },
    maxMeetings: { type: Number, default: 1 },
    votingDurationSec: { type: Number, default: 180 },
    voteGraceSec: { type: Number, default: 3 },
    allowSkipVote: { type: Boolean, default: true },
    predictionsEnabled: { type: Boolean, default: true },
    predictionsRevealAt: { type: String, enum: ["FINAL", "MEETING_RESULTS"], default: "FINAL" },
    impostorWinThreshold: { type: Number, default: 2 },
    winningTeamTieRule: { type: String, enum: ["SHARED", "GM_DECIDES"], default: "SHARED" },
    points: { type: PointsConfig, default: () => ({}) },
    poll: {
      type: new Schema(
        {
          idleMs: { type: Number, default: 4000 },
          activeMs: { type: Number, default: 3000 },
          votingMs: { type: Number, default: 1500 },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
  },
  { _id: false },
);

const GameSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    /** Exactly one game is the "active" one that the GM UI and registration operate on. */
    active: { type: Boolean, default: false },
    phase: { type: String, enum: GAME_PHASES, default: "SETUP" },
    registrationOpen: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    rolesRevealedAt: { type: Date, default: null },
    revealLock: { type: new Schema({ by: Schema.Types.ObjectId, at: Date }, { _id: false }), default: null },
    activeMeetingId: { type: Schema.Types.ObjectId, default: null },
    /** Copy of the active meeting's votingEndsAt while voting is open, so every poll can lazily close it without an extra read. */
    votingDeadline: { type: Date, default: null },
    meetingsHeld: { type: Number, default: 0 },
    display: {
      type: new Schema({ screen: { type: String, default: "LOBBY" }, updatedAt: Date }, { _id: false }),
      default: () => ({ screen: "LOBBY", updatedAt: new Date() }),
    },
    final: { type: Schema.Types.Mixed, default: () => ({}) },
    config: { type: ConfigSchema, default: () => ({}) },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

GameSchema.index({ code: 1 }, { unique: true });
GameSchema.index({ active: 1 }, { unique: true, partialFilterExpression: { active: true } });

export type GameDoc = InferSchemaType<typeof GameSchema> & { _id: mongoose.Types.ObjectId };

export const Game: Model<GameDoc> =
  (mongoose.models.Game as Model<GameDoc>) || mongoose.model<GameDoc>("Game", GameSchema);
