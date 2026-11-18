import { describe, expect, it } from "vitest";
import * as points from "@/app/api/staff/points/route";
import * as kill from "@/app/api/staff/players/[id]/kill/route";
import * as gmTasks from "@/app/api/gm/tasks/route";
import * as gmState from "@/app/api/gm/state/route";
import * as playerState from "@/app/api/player/state/route";
import * as register from "@/app/api/player/register/route";
import { Client, startGame } from "../helpers";
import { Game, PointTransaction, Team } from "@/lib/server/models";
import { meetingApi, predict, startVoting, vote } from "../phase4/meetingHelpers";
import { finalApi } from "./finalHelpers";

let n = 0;
const give = (c: Client, teamId: string, amount: number) =>
  c.call(points.POST, { body: { teamId, amount, reason: "Q&A round" }, headers: { "idempotency-key": `f-${Date.now()}-${++n}` } });

/** A game with one resolved meeting: Red votes out its impostor; one Red prediction on Blue's impostor. */
async function playedGame() {
  const ctx = await startGame({ red: 4, blue: 4 });
  const id = await startVoting(ctx.gm);
  const redImp = ctx.byRole("impostor", "red")[0];
  const blueImp = ctx.byRole("impostor", "blue")[0];
  const reds = ctx.players.filter((p) => p.team === "red" && p.id !== redImp.id);
  for (const p of reds) await vote(p.client, id, redImp.id);
  await predict(reds[0].client, id, String(ctx.byKey.blue._id), blueImp.id);
  const api = meetingApi(ctx.gm);
  await api.close(id);
  await api.reveal(id);
  await api.confirm(id);
  await api.resume(id);
  return { ...ctx, redImp, blueImp, red: String(ctx.byKey.red._id), blue: String(ctx.byKey.blue._id) };
}

describe("Phase 6 · final reveal sequence", () => {
  it("runs start → impostors → predictions → leaderboard → winner → finish, in order", async () => {
    const ctx = await playedGame();
    await give(ctx.gm, ctx.blue, 100);
    const f = finalApi(ctx.gm);

    // Out of order is refused.
    expect((await f.revealImpostors()).status).toBe(409);
    expect((await f.start("NOPE")).status).toBe(400);
    expect((await f.start()).status).toBe(200);
    expect((await Game.findById(ctx.game._id).lean())!.registrationOpen).toBe(false);
    // Phones don't get the live ranking during the finale (it would spoil the result).
    const during = (await ctx.players[0].client.call(playerState.GET)).body;
    expect(during.leaderboard).toEqual([]);
    expect(during.final).toEqual({ startedAt: expect.any(String) });
    for (const r of [await f.scorePredictions(), await f.leaderboard(), await f.winner(), await f.complete()]) {
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe("STEP_OUT_OF_ORDER");
    }

    // 1. Impostors
    const imps = (await f.revealImpostors()).body.impostors;
    expect(imps.map((i: { name: string }) => i.name).sort()).toEqual([ctx.redImp.name, ctx.blueImp.name].sort());
    expect(imps.find((i: { id: string }) => i.id === ctx.redImp.id).votedOut).toBe(true);
    expect(imps.find((i: { id: string }) => i.id === ctx.blueImp.id).votedOut).toBe(false);
    const view = (await ctx.players[0].client.call(playerState.GET)).body.final;
    expect(view.impostors).toHaveLength(2);
    expect(view.leaderboard).toBeUndefined();

    // 2. Predictions: Red guessed Blue's impostor → +30
    const preds = (await f.scorePredictions()).body.results;
    expect(preds).toHaveLength(1);
    expect(preds[0]).toMatchObject({ correct: true, amount: 30, predictorTeamName: "Red", targetTeamName: "Blue" });
    expect((await f.scorePredictions()).body.results).toHaveLength(1); // again: same, no new points
    expect(await PointTransaction.countDocuments({ category: "prediction" })).toBe(1);

    // 3. Leaderboard (snapshot; scores now frozen)
    const lb = (await f.leaderboard()).body.leaderboard;
    expect(lb[0]).toMatchObject({ name: "Blue", score: 100, rank: 1 });
    const frozen = await give(ctx.gm, ctx.red, 50);
    expect(frozen.status).toBe(409);
    expect(frozen.body.error.code).toBe("SCORES_FROZEN");

    // 4. Winner: only 1 impostor voted out (< 2) → impostors win
    const w = (await f.winner()).body;
    expect(w).toMatchObject({ winningTeamIds: [ctx.blue], tied: false, impostorsWin: true, impostorsVotedOut: 1, threshold: 2 });
    const again = (await f.winner()).body;
    expect(again).toEqual(w);

    // Everyone sees the identical stored result after a refresh.
    const p = (await ctx.players[3].client.call(playerState.GET)).body.final;
    expect(p).toMatchObject({ winningTeamIds: [ctx.blue], impostorsWin: true });
    expect(p.stats).toMatchObject({ registered: 8, voteEliminations: 1, impostorsVotedOut: 1, meetingsHeld: 1, predictionsMade: 1, predictionsCorrect: 1 });
    expect(p.stats.turnoutPct).toBe(38); // 3 votes of 8 eligible

    // 5. Finish
    expect((await f.complete("NOPE")).status).toBe(400);
    expect((await f.complete()).body.phase).toBe("COMPLETED");
  });

  it("can't start while a meeting is running", async () => {
    const ctx = await startGame({ red: 3 });
    await startVoting(ctx.gm);
    const r = await finalApi(ctx.gm).start();
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("INVALID_PHASE");
  });

  it("two GMs pressing the same step at once get one result", async () => {
    const ctx = await playedGame();
    const f = finalApi(ctx.gm);
    await f.start();
    const rs = await Promise.all([1, 2, 3].map(() => f.revealImpostors()));
    expect(rs.every((r) => r.status === 200)).toBe(true);
    const lists = rs.map((r) => JSON.stringify(r.body.impostors));
    expect(new Set(lists).size).toBe(1);
  });

  it("crew wins when at least 2 impostors are voted out; GM_DECIDES ties need a choice", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    await Game.updateOne({ _id: ctx.game._id }, { $set: { "config.winningTeamTieRule": "GM_DECIDES" } });
    const id = await startVoting(ctx.gm);
    for (const team of ["red", "blue"]) {
      const imp = ctx.byRole("impostor", team)[0];
      for (const p of ctx.players.filter((x) => x.team === team && x.id !== imp.id)) await vote(p.client, id, imp.id);
    }
    const api = meetingApi(ctx.gm);
    await api.close(id);
    await api.reveal(id);
    await api.confirm(id); // each team: 2 correct voters → +20 each, so Red and Blue tie
    await api.resume(id);
    const f = finalApi(ctx.gm);
    await f.start();
    await f.revealImpostors();
    await f.scorePredictions();
    await f.leaderboard();
    const tie = await f.winner();
    expect(tie.status).toBe(409);
    expect(tie.body.error.code).toBe("WINNER_TIE");
    expect(tie.body.error.details.tiedTeamIds.sort()).toEqual([String(ctx.byKey.red._id), String(ctx.byKey.blue._id)].sort());
    const w = await f.winner([String(ctx.byKey.red._id)]);
    expect(w.body).toMatchObject({ winningTeamIds: [String(ctx.byKey.red._id)], impostorsWin: false, impostorsVotedOut: 2 });
  });

  it("I28 after finishing, every change is refused with 423 but views still load", async () => {
    const ctx = await playedGame();
    const f = finalApi(ctx.gm);
    await f.start();
    await f.revealImpostors();
    await f.scorePredictions();
    await f.leaderboard();
    await f.winner();
    await f.complete();

    expect((await give(ctx.gm, ctx.red, 5)).status).toBe(423);
    expect((await ctx.gm.call(kill.POST, { params: { id: ctx.players[0].id }, body: {} })).status).toBe(423);
    expect((await ctx.gm.call(gmTasks.POST, { body: { title: "Late task", kind: "individual" } })).status).toBe(423);
    expect((await meetingApi(ctx.gm).call()).status).toBe(423);
    const reg = await new Client().call(register.POST, { body: { name: "Too Late", phone: "0779999999", teamId: ctx.red } });
    expect([403, 423]).toContain(reg.status);

    expect((await ctx.gm.call(gmState.GET)).status).toBe(200);
    const s = (await ctx.players[0].client.call(playerState.GET)).body;
    expect(s.game.phase).toBe("COMPLETED");
    expect(s.final.completedAt).toBeTruthy();
    expect((await Team.findById(ctx.red).lean())!.score).toBeGreaterThan(0);
  });
});
