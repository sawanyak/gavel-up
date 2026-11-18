import type { Types } from "mongoose";
import type { FinalState, GameStats } from "@/lib/shared/types";
import { audit } from "../audit";
import { assertNotArchived, staffActor } from "../auth/guards";
import { ApiError, conflict } from "../errors";
import { computeOutcome, type TieRule } from "../game/endgame";
import {
  Elimination,
  Game,
  Investigation,
  Meeting,
  Player,
  PointTransaction,
  Prediction,
  TaskAssignment,
  Team,
  Vote,
  type EliminationDoc,
  type GameDoc,
  type MeetingDoc,
  type PlayerDoc,
  type StaffDoc,
  type TeamDoc,
} from "../models";
import { leaderboard } from "../scoringDto";
import { scorePredictions } from "./scoring";

/*
 * Final reveal (plan §7, §11.5). Strict order, one click each, never repeated:
 *   start → reveal impostors → score predictions → leaderboard → announce winner → finish
 * Each step is a compare-and-set on `games.final`, and its result is stored there, so a
 * refresh (or a second GM) always sees exactly the same result.
 */

const now = () => new Date().toISOString();
const finalOf = (g: GameDoc) => (g.final ?? {}) as FinalState;

function screen(name: string) {
  return { display: { screen: name, updatedAt: new Date() } };
}

/** Writes `final.<field>` only if `guardField` exists and `field` doesn't (one-time step). */
async function step(game: GameDoc, field: keyof FinalState, guardField: keyof FinalState | null, set: Record<string, unknown>, label: string) {
  const filter: Record<string, unknown> = { _id: game._id, phase: "FINAL", [`final.${field}`]: { $exists: false } };
  if (guardField) filter[`final.${guardField}`] = { $exists: true };
  const res = await Game.updateOne(filter, { $set: set, $inc: { version: 1 } });
  if (res.modifiedCount !== 1) {
    const fresh = (await Game.findById(game._id).lean<GameDoc>())!;
    if (fresh.phase === "FINAL" && finalOf(fresh)[field]) return { game: fresh, already: true };
    if (fresh.phase !== "FINAL") throw conflict("INVALID_PHASE", "Start the final reveal first.");
    throw conflict("STEP_OUT_OF_ORDER", `Do the previous step first (${label}).`);
  }
  return { game: (await Game.findById(game._id).lean<GameDoc>())!, already: false };
}

export async function startFinal(staff: StaffDoc, game: GameDoc, ip: string) {
  assertNotArchived(game);
  if (game.phase === "FINAL") return game;
  if (game.phase !== "PLAYING") throw conflict("INVALID_PHASE", game.phase === "MEETING" ? "Finish the meeting and resume the game first." : "The game isn't running.");
  const res = await Game.updateOne(
    { _id: game._id, phase: "PLAYING", activeMeetingId: null },
    { $set: { phase: "FINAL", registrationOpen: false, "final.startedAt": now(), ...screen("FINAL") }, $inc: { version: 1 } },
  );
  if (res.modifiedCount !== 1) throw conflict("INVALID_PHASE", "The game state just changed. Check and try again.");
  await audit({ gameId: game._id, actor: staffActor(staff), action: "FINAL_STARTED", ip });
  return (await Game.findById(game._id).lean<GameDoc>())!;
}

async function voteEliminatedIds(gameId: Types.ObjectId) {
  const elims = await Elimination.find({ gameId, cause: "vote", revertedAt: null }).select("playerId").lean<EliminationDoc[]>();
  return new Set(elims.map((e) => String(e.playerId)));
}

export async function revealImpostors(staff: StaffDoc, game: GameDoc, ip: string) {
  assertNotArchived(game);
  const [imps, teams, votedOut] = await Promise.all([
    Player.find({ gameId: game._id, role: "impostor", removedAt: null }).select("+role name teamId status").sort({ name: 1 }).lean<PlayerDoc[]>(),
    Team.find({ gameId: game._id }).lean<TeamDoc[]>(),
    voteEliminatedIds(game._id),
  ]);
  const team = new Map(teams.map((t) => [String(t._id), t]));
  const impostors = imps.map((p) => ({
    id: String(p._id),
    name: p.name,
    teamId: String(p.teamId),
    teamName: team.get(String(p.teamId))?.name ?? "?",
    colorHex: team.get(String(p.teamId))?.colorHex ?? "#fff",
    status: p.status as "alive" | "ghost",
    votedOut: votedOut.has(String(p._id)),
  }));
  const r = await step(game, "impostorsRevealedAt", "startedAt", { "final.impostorsRevealedAt": now(), "final.impostors": impostors, ...screen("IMPOSTORS") }, "start the final reveal");
  if (!r.already) await audit({ gameId: game._id, actor: staffActor(staff), action: "FINAL_IMPOSTORS_REVEALED", after: { count: impostors.length }, ip });
  return finalOf(r.game).impostors ?? [];
}

export async function scoreFinalPredictions(staff: StaffDoc, game: GameDoc, ip: string) {
  assertNotArchived(game);
  const f = finalOf(game);
  if (game.phase !== "FINAL") throw conflict("INVALID_PHASE", "Start the final reveal first.");
  if (f.predictionsScoredAt) return f.predictionResults ?? [];
  if (!f.impostorsRevealedAt) throw conflict("STEP_OUT_OF_ORDER", "Reveal the impostors first.");
  const { results } = await scorePredictions(staff, game, ip);
  const teams = await Team.find({ gameId: game._id }).lean<TeamDoc[]>();
  const tname = new Map(teams.map((t) => [String(t._id), t]));
  const predictionResults = results.map((r) => ({
    ...r,
    predictorTeamName: tname.get(r.predictorTeamId)?.name ?? "?",
    predictorColorHex: tname.get(r.predictorTeamId)?.colorHex ?? "#fff",
    targetTeamName: tname.get(r.targetTeamId)?.name ?? "?",
  }));
  const s = await step(game, "predictionsScoredAt", "impostorsRevealedAt", { "final.predictionsScoredAt": now(), "final.predictionResults": predictionResults }, "reveal the impostors");
  return finalOf(s.game).predictionResults ?? [];
}

export async function showLeaderboard(staff: StaffDoc, game: GameDoc, ip: string) {
  assertNotArchived(game);
  // Snapshot the scores: from here on the ledger is frozen (see ledger.awardInSession).
  const board = leaderboard(await Team.find({ gameId: game._id }).lean<TeamDoc[]>());
  const r = await step(game, "leaderboardShownAt", "predictionsScoredAt", { "final.leaderboardShownAt": now(), "final.leaderboard": board, ...screen("LEADERBOARD") }, "score the predictions");
  if (!r.already) await audit({ gameId: game._id, actor: staffActor(staff), action: "FINAL_LEADERBOARD_SHOWN", after: { board }, ip });
  return finalOf(r.game).leaderboard ?? [];
}

export async function countImpostorsVotedOut(gameId: Types.ObjectId) {
  const ids = [...(await voteEliminatedIds(gameId))];
  return Player.countDocuments({ _id: { $in: ids }, role: "impostor" });
}

export async function announceWinner(staff: StaffDoc, game: GameDoc, gmChoice: string[] | undefined, ip: string) {
  assertNotArchived(game);
  const f = finalOf(game);
  if (game.phase !== "FINAL") throw conflict("INVALID_PHASE", "Start the final reveal first.");
  if (f.winnerAnnouncedAt) return f;
  if (!f.leaderboardShownAt || !f.leaderboard) throw conflict("STEP_OUT_OF_ORDER", "Show the leaderboard first.");

  const impostorsVotedOut = await countImpostorsVotedOut(game._id);
  const threshold = game.config?.impostorWinThreshold ?? 2;
  const outcome = computeOutcome(
    f.leaderboard.map((r) => ({ teamId: r.teamId, name: r.name, score: r.score })),
    impostorsVotedOut,
    threshold,
    (game.config?.winningTeamTieRule as TieRule) ?? "SHARED",
    gmChoice,
  );
  if (outcome.status === "needs_gm_choice") {
    throw new ApiError(409, "WINNER_TIE", "Teams are tied for first place. Choose the winner.", { tiedTeamIds: outcome.tiedTeamIds });
  }
  const stats = await buildStats(game);
  const r = await step(
    game,
    "winnerAnnouncedAt",
    "leaderboardShownAt",
    {
      "final.winnerAnnouncedAt": now(),
      "final.winningTeamIds": outcome.winningTeamIds,
      "final.tied": outcome.tied,
      "final.impostorsWin": outcome.impostorsWin,
      "final.impostorsVotedOut": outcome.impostorsVotedOut,
      "final.threshold": outcome.threshold,
      "final.stats": stats,
      ...screen("WINNER"),
    },
    "show the leaderboard",
  );
  if (!r.already) await audit({ gameId: game._id, actor: staffActor(staff), action: "FINAL_WINNER_ANNOUNCED", after: outcome, ip });
  return finalOf(r.game);
}

export async function completeGame(staff: StaffDoc, game: GameDoc, ip: string) {
  if (game.phase === "COMPLETED") return game;
  if (game.phase !== "FINAL" || !finalOf(game).winnerAnnouncedAt) throw conflict("STEP_OUT_OF_ORDER", "Announce the winner first.");
  const res = await Game.updateOne(
    { _id: game._id, phase: "FINAL", "final.winnerAnnouncedAt": { $exists: true } },
    { $set: { phase: "COMPLETED", registrationOpen: false, archivedAt: new Date(), "final.completedAt": now() }, $inc: { version: 1 } },
  );
  if (res.modifiedCount === 1) await audit({ gameId: game._id, actor: staffActor(staff), action: "GAME_COMPLETED", ip });
  return (await Game.findById(game._id).lean<GameDoc>())!;
}

/* ───────────────────────── Stats ───────────────────────── */

export async function buildStats(game: GameDoc): Promise<GameStats> {
  const gameId = game._id;
  const [teams, players, kills, voteOuts, impostorsVotedOut, meetings, predictions, tasksCompleted, byCategory, investigations] = await Promise.all([
    Team.find({ gameId }).sort({ order: 1 }).lean<TeamDoc[]>(),
    Player.find({ gameId, removedAt: null }).select("teamId status").lean<PlayerDoc[]>(),
    Elimination.countDocuments({ gameId, cause: "kill", revertedAt: null }),
    Elimination.countDocuments({ gameId, cause: "vote", revertedAt: null }),
    countImpostorsVotedOut(gameId),
    Meeting.find({ gameId, status: { $ne: "CANCELLED" } }).select("_id eligible").lean<MeetingDoc[]>(),
    Prediction.find({ gameId }).select("outcome meetingId").lean(),
    TaskAssignment.countDocuments({ gameId, status: "completed" }),
    PointTransaction.aggregate<{ _id: string; total: number }>([{ $match: { gameId } }, { $group: { _id: "$category", total: { $sum: "$amount" } } }]),
    Investigation.countDocuments({ gameId }),
  ]);
  const meetingIds = meetings.map((m) => m._id);
  const votesCast = await Vote.countDocuments({ meetingId: { $in: meetingIds } });
  const eligibleVoters = meetings.reduce((s, m) => s + m.eligible.reduce((x, e) => x + e.voterIds.length, 0), 0);
  const validPredictions = predictions.filter((p) => meetingIds.some((id) => String(id) === String(p.meetingId)));
  return {
    registered: players.length,
    perTeam: teams.map((t) => {
      const mine = players.filter((p) => String(p.teamId) === String(t._id));
      return { teamId: String(t._id), name: t.name, colorHex: t.colorHex, players: mine.length, ghosts: mine.filter((p) => p.status === "ghost").length };
    }),
    kills,
    voteEliminations: voteOuts,
    impostorsVotedOut,
    meetingsHeld: meetings.length,
    votesCast,
    turnoutPct: eligibleVoters ? Math.round((votesCast / eligibleVoters) * 100) : 0,
    predictionsMade: validPredictions.length,
    predictionsCorrect: validPredictions.filter((p) => p.outcome === "correct").length,
    tasksCompleted,
    investigations,
    pointsByCategory: Object.fromEntries(byCategory.map((c) => [c._id, c.total])),
  };
}
