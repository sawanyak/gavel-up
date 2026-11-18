import { describe, expect, it } from "vitest";
import * as kill from "@/app/api/staff/players/[id]/kill/route";
import * as invalidateVote from "@/app/api/gm/votes/[id]/invalidate/route";
import * as invalidatePrediction from "@/app/api/gm/predictions/[id]/invalidate/route";
import * as playerState from "@/app/api/player/state/route";
import * as tmState from "@/app/api/tm/state/route";
import * as gmState from "@/app/api/gm/state/route";
import { Game, Prediction, Vote } from "@/lib/server/models";
import { type Client, createStaffMember, loginStaff, registerPlayer, startGame } from "../helpers";
import { meetingApi, predict, startVoting, vote } from "./meetingHelpers";

const state = async (c: Client) => (await c.call(playerState.GET)).body;

describe("Phase 4 · internal votes", () => {
  it("I8 ghosts and late joiners can't vote", async () => {
    const ctx = await startGame({ red: 4 });
    const [ghost, other] = ctx.players;
    await ctx.gm.call(kill.POST, { params: { id: ghost.id }, body: {} });
    const id = await startVoting(ctx.gm);
    const g = await vote(ghost.client, id, other.id);
    expect(g.status).toBe(403);
    expect(g.body.error.code).toBe("NOT_ELIGIBLE");
    expect((await state(ghost.client)).meeting.me).toMatchObject({ eligible: false, notEligibleReason: "ghost" });

    const late = await registerPlayer(ctx.byKey.red._id, "Late Lucy");
    expect((await vote(late.client, id, other.id)).status).toBe(403);
    expect((await state(late.client)).meeting.me.notEligibleReason).toBe("late");
  });

  it("I9 20 simultaneous votes from one player store exactly one", async () => {
    const ctx = await startGame({ red: 4 });
    const id = await startVoting(ctx.gm);
    const [me, target] = ctx.players;
    const rs = await Promise.all(Array.from({ length: 20 }, () => vote(me.client, id, target.id)));
    expect(rs.every((r) => r.status === 200 || r.status === 201)).toBe(true);
    expect(rs.every((r) => r.body.vote.targetId === target.id)).toBe(true);
    expect(await Vote.countDocuments({ voterId: me.id })).toBe(1);
  });

  it("votes are final: a second vote for someone else returns the first one", async () => {
    const ctx = await startGame({ red: 4 });
    const id = await startVoting(ctx.gm);
    const [me, a, b] = ctx.players;
    await vote(me.client, id, a.id);
    const again = await vote(me.client, id, b.id);
    expect(again.body).toMatchObject({ alreadyVoted: true, vote: { targetId: a.id } });
    expect((await state(me.client)).meeting.me).toMatchObject({ hasVoted: true, votedFor: { id: a.id, name: a.name } });
  });

  it("I10 can't vote for another team, yourself, or someone who was a ghost at open", async () => {
    const ctx = await startGame({ red: 4, blue: 3 });
    const [me, , ghost] = ctx.players.filter((p) => p.team === "red");
    await ctx.gm.call(kill.POST, { params: { id: ghost.id }, body: {} });
    const id = await startVoting(ctx.gm);
    const blue = ctx.players.find((p) => p.team === "blue")!;
    for (const target of [blue.id, me.id, ghost.id]) {
      const r = await vote(me.client, id, target);
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe("INVALID_TARGET");
    }
    expect((await state(me.client)).meeting.candidates.map((c: { id: string }) => c.id)).not.toContain(ghost.id);
  });

  it("skip is allowed by default and can be turned off", async () => {
    const ctx = await startGame({ red: 4 });
    const id = await startVoting(ctx.gm);
    expect((await vote(ctx.players[0].client, id, null)).status).toBe(201);
    expect((await state(ctx.players[0].client)).meeting.me).toMatchObject({ hasVoted: true, skipped: true });
    await Game.updateOne({ _id: ctx.game._id }, { $set: { "config.allowSkipVote": false } });
    const r = await vote(ctx.players[1].client, id, null);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("SKIP_NOT_ALLOWED");
  });

  it("can't vote before voting opens", async () => {
    const ctx = await startGame({ red: 3 });
    const id = (await meetingApi(ctx.gm).call()).body.meeting.id;
    const r = await vote(ctx.players[0].client, id, ctx.players[1].id);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("VOTING_CLOSED");
  });

  it("players see only their own vote and their team's progress; TMs see who voted but not for whom; GM sees all", async () => {
    const ctx = await startGame({ red: 4, blue: 3 });
    const id = await startVoting(ctx.gm);
    const [a, b, c] = ctx.players.filter((p) => p.team === "red");
    await vote(a.client, id, c.id);

    const bView = (await state(b.client)).meeting;
    expect(bView.teamProgress).toEqual({ voted: 1, eligible: 4 });
    expect(bView.me).toMatchObject({ hasVoted: false, votedFor: null });
    expect(bView.results).toBeNull();
    // The player view has no list of voters or choices at all.
    expect(Object.keys(bView).sort()).toEqual(["allowSkip", "candidates", "id", "me", "number", "predictions", "results", "status", "teamProgress", "votingEndsAt"]);
    expect(bView.candidates.every((x: object) => Object.keys(x).sort().join() === "id,name")).toBe(true);

    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    const tmMeeting = (await tm.call(tmState.GET)).body.meeting;
    expect(tmMeeting.teams[0].voted).toEqual([a.name]);
    expect(tmMeeting.teams[0].notVoted).toHaveLength(3);
    expect(JSON.stringify(tmMeeting)).not.toContain(c.id);

    const gmMeeting = (await ctx.gm.call(gmState.GET)).body.meeting;
    const red = gmMeeting.teams.find((t: { teamName: string }) => t.teamName === "Red");
    expect(red.tally).toEqual([{ playerId: c.id, name: c.name, count: 1 }]);
    expect(gmMeeting.votes).toHaveLength(1);
  });

  it("the GM can remove a vote; that player may vote again", async () => {
    const ctx = await startGame({ red: 4 });
    const id = await startVoting(ctx.gm);
    const [a, b, c] = ctx.players;
    await vote(a.client, id, b.id);
    const voteId = (await ctx.gm.call(gmState.GET)).body.meeting.votes[0].id;
    expect((await ctx.gm.call(invalidateVote.POST, { params: { id: voteId }, body: { reason: "wrong phone" } })).status).toBe(200);
    expect((await vote(a.client, id, c.id)).status).toBe(201);
    expect(String((await Vote.findOne({ voterId: a.id }).lean())!.targetId)).toBe(c.id);
  });
});

describe("Phase 4 · cross-team predictions", () => {
  it("I12 the first teammate locks it; a simultaneous second gets PREDICTION_LOCKED with who/whom", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const id = await startVoting(ctx.gm);
    const [r1, r2] = ctx.players.filter((p) => p.team === "red");
    const [b1, b2] = ctx.players.filter((p) => p.team === "blue");
    const blueId = String(ctx.byKey.blue._id);
    const [x, y] = await Promise.all([predict(r1.client, id, blueId, b1.id), predict(r2.client, id, blueId, b2.id)]);
    expect([x.status, y.status].sort()).toEqual([201, 409]);
    const loser = x.status === 409 ? x : y;
    expect(loser.body.error.code).toBe("PREDICTION_LOCKED");
    expect(loser.body.error.details.lockedBy.name).toBeTruthy();
    expect(await Prediction.countDocuments()).toBe(1);

    // Teammates see the lock; the other team doesn't see red's prediction at all.
    const lock = (await state(r2.client)).meeting.predictions.otherTeams.find((t: { teamId: string }) => t.teamId === blueId).locked;
    expect(lock.targetName).toMatch(new RegExp(`${b1.name}|${b2.name}`));
    const blueView = JSON.stringify((await state(b1.client)).meeting.predictions);
    expect(blueView).not.toContain('"locked":{');
  });

  it("I13 can't predict your own team, a ghost, or someone not in that team", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const blueGhost = ctx.players.filter((p) => p.team === "blue")[2];
    await ctx.gm.call(kill.POST, { params: { id: blueGhost.id }, body: {} });
    const id = await startVoting(ctx.gm);
    const [r1, r2] = ctx.players.filter((p) => p.team === "red");
    const blueId = String(ctx.byKey.blue._id);
    expect((await predict(r1.client, id, String(ctx.byKey.red._id), r2.id)).status).toBe(400);
    expect((await predict(r1.client, id, blueId, blueGhost.id)).status).toBe(400);
    expect((await predict(r1.client, id, blueId, r2.id)).status).toBe(400);
    // a ghost can't predict
    expect((await predict(blueGhost.client, id, String(ctx.byKey.red._id), r1.id)).status).toBe(403);
  });

  it("can be turned off; the GM can remove one to unlock it", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const id = await startVoting(ctx.gm);
    const [r1, r2] = ctx.players.filter((p) => p.team === "red");
    const [b1, b2] = ctx.players.filter((p) => p.team === "blue");
    const blueId = String(ctx.byKey.blue._id);
    await predict(r1.client, id, blueId, b1.id);
    const pid = (await ctx.gm.call(gmState.GET)).body.meeting.predictions[0].id;
    expect((await ctx.gm.call(invalidatePrediction.POST, { params: { id: pid }, body: { reason: "pressed by mistake" } })).status).toBe(200);
    expect((await predict(r2.client, id, blueId, b2.id)).status).toBe(201);

    await Game.updateOne({ _id: ctx.game._id }, { $set: { "config.predictionsEnabled": false } });
    const r = await predict(b1.client, id, String(ctx.byKey.red._id), r1.id);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("PREDICTIONS_DISABLED");
  });
});
