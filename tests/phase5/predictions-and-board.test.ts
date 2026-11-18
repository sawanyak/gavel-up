import { describe, expect, it } from "vitest";
import * as scorePredictions from "@/app/api/gm/final/score-predictions/route";
import * as cancel from "@/app/api/gm/meetings/[id]/cancel/route";
import * as points from "@/app/api/staff/points/route";
import * as playerState from "@/app/api/player/state/route";
import * as tmState from "@/app/api/tm/state/route";
import { Game, PointTransaction, Prediction, Team } from "@/lib/server/models";
import { leaderboard } from "@/lib/server/scoringDto";
import { type Client, createStaffMember, loginStaff, startGame } from "../helpers";
import { meetingApi, predict, startVoting } from "../phase4/meetingHelpers";

const toFinal = (gameId: unknown) => Game.updateOne({ _id: gameId }, { $set: { phase: "FINAL", activeMeetingId: null, votingDeadline: null } });
let n = 0;
const give = (c: Client, teamId: string, amount: number, reason = "Q&A answer") =>
  c.call(points.POST, { body: { teamId, amount, reason }, headers: { "idempotency-key": `p-${Date.now()}-${++n}` } });

describe("Phase 5 · prediction scoring", () => {
  it("I14 correct +30 / wrong −15 to the predictor's team, exactly once", async () => {
    const ctx = await startGame({ red: 4, blue: 4, green: 4 });
    const id = await startVoting(ctx.gm);
    const blueImp = ctx.byRole("impostor", "blue")[0];
    const greenCrew = ctx.byRole("crewmate", "green")[0];
    const red = ctx.players.find((p) => p.team === "red")!;
    expect((await predict(red.client, id, String(ctx.byKey.blue._id), blueImp.id)).status).toBe(201);
    expect((await predict(red.client, id, String(ctx.byKey.green._id), greenCrew.id)).status).toBe(201);
    const api = meetingApi(ctx.gm);
    await api.close(id);
    await api.reveal(id);
    await api.confirm(id);
    await api.resume(id);

    // Not before the final reveal: scoring would give away who the impostors are.
    expect((await ctx.gm.call(scorePredictions.POST)).status).toBe(409);

    await toFinal(ctx.game._id);
    const r = await ctx.gm.call(scorePredictions.POST);
    expect(r.status).toBe(200);
    expect(r.body.newlyScored).toBe(2);
    const outcomes = r.body.results.map((x: { targetName: string; correct: boolean; amount: number }) => [x.targetName, x.correct, x.amount]).sort();
    expect(outcomes).toEqual([[blueImp.name, true, 30], [greenCrew.name, false, -15]].sort());
    expect((await Team.findById(ctx.byKey.red._id).lean())!.score).toBe(15);

    const again = await ctx.gm.call(scorePredictions.POST);
    expect(again.body.newlyScored).toBe(0);
    expect(await PointTransaction.countDocuments({ category: "prediction" })).toBe(2);
    expect((await Prediction.findOne({ targetPlayerId: blueImp.id }).lean())!.outcome).toBe("correct");
  });

  it("predictions from a cancelled meeting are never scored", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const id = await startVoting(ctx.gm);
    const red = ctx.players.find((p) => p.team === "red")!;
    const blue = ctx.players.find((p) => p.team === "blue")!;
    await predict(red.client, id, String(ctx.byKey.blue._id), blue.id);
    await ctx.gm.call(cancel.POST, { params: { id }, body: { reason: "called by mistake" } });
    await toFinal(ctx.game._id);
    const r = await ctx.gm.call(scorePredictions.POST);
    expect(r.body.newlyScored).toBe(0);
    expect(await PointTransaction.countDocuments({ category: "prediction" })).toBe(0);
  });
});

describe("Phase 5 · leaderboard and feeds", () => {
  it("ranks teams by score with shared ranks for ties", () => {
    const t = (name: string, score: number) => ({ _id: name as never, key: "red" as const, name, colorHex: "#fff", score });
    const rows = leaderboard([t("Blue", 20), t("Red", 50), t("Green", 20), t("Yellow", 0)]);
    expect(rows.map((r) => [r.name, r.rank])).toEqual([
      ["Red", 1],
      ["Blue", 2],
      ["Green", 2],
      ["Yellow", 4],
    ]);
  });

  it("players see the leaderboard and only their own team's point feed", async () => {
    const ctx = await startGame({ red: 2, blue: 2 });
    await give(ctx.gm, String(ctx.byKey.red._id), 20, "Red table topics");
    await give(ctx.gm, String(ctx.byKey.blue._id), 5, "Blue icebreaker");
    const red = ctx.players.find((p) => p.team === "red")!;
    const s = (await red.client.call(playerState.GET)).body;
    expect(s.leaderboard.map((r: { name: string; score: number }) => [r.name, r.score]).slice(0, 2)).toEqual([
      ["Red", 20],
      ["Blue", 5],
    ]);
    expect(s.teamFeed.map((f: { reason: string }) => f.reason)).toEqual(["Red table topics"]);
    expect(s.team.score).toBe(20);
  });

  it("TMs see their team's feed, their bounds and activities to link", async () => {
    const ctx = await startGame({ red: 2, blue: 2 });
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    await give(tm, String(ctx.byKey.red._id), 10, "Q&A");
    await give(ctx.gm, String(ctx.byKey.blue._id), 10, "Blue only");
    const s = (await tm.call(tmState.GET)).body;
    expect(s.points).toEqual({ min: -20, max: 20 });
    expect(s.feed.map((f: { reason: string }) => f.reason)).toEqual(["Q&A"]);
  });
});
