import { describe, expect, it } from "vitest";
import * as reopen from "@/app/api/gm/meetings/[id]/reopen-voting/route";
import * as cancel from "@/app/api/gm/meetings/[id]/cancel/route";
import * as callRoute from "@/app/api/gm/meetings/route";
import * as kill from "@/app/api/staff/players/[id]/kill/route";
import * as playerState from "@/app/api/player/state/route";
import * as gmState from "@/app/api/gm/state/route";
import { Elimination, Game, Meeting, Player, PointTransaction, Team } from "@/lib/server/models";
import { createStaffMember, fillTeams, GM, loginStaff, setupGame, startGame } from "../helpers";
import { meetingApi, startVoting, vote } from "./meetingHelpers";

const phase = async (gameId: unknown) => (await Game.findById(gameId).lean())!.phase;

describe("Phase 4 · calling a meeting", () => {
  it("PLAYING → MEETING; only one at a time; GM only; phones see the alarm", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const api = meetingApi(ctx.gm);
    const r = await api.call();
    expect(r.status).toBe(201);
    expect(await phase(ctx.game._id)).toBe("MEETING");
    expect((await api.call()).status).toBe(409);
    const s = (await ctx.players[0].client.call(playerState.GET)).body;
    expect(s.meeting).toMatchObject({ number: 1, status: "CALLED", candidates: [] });

    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(callRoute.POST, { body: {} })).status).toBe(403);
  });

  it("can't call a meeting before roles are revealed", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 3 });
    const gm = await loginStaff(GM.name, GM.pin);
    expect((await meetingApi(gm).call()).status).toBe(409);
  });

  it("respects the meeting limit (1 by default) unless the GM overrides", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const api = meetingApi(ctx.gm);
    const id = await startVoting(ctx.gm);
    await api.close(id);
    await api.reveal(id);
    await api.confirm(id);
    await api.resume(id);
    const again = await api.call();
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("MEETING_LIMIT");
    expect((await api.call({ override: true })).status).toBe(201);
  });

  it("rejects illegal transitions", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const api = meetingApi(ctx.gm);
    const id = (await api.call()).body.meeting.id;
    expect((await api.reveal(id)).status).toBe(409); // not closed
    expect((await api.confirm(id)).status).toBe(409); // no results
    expect((await api.resume(id)).status).toBe(409); // not resolved
    expect((await api.open(id, { durationSec: 10 })).status).toBe(400); // too short
    expect((await api.open(id)).status).toBe(200);
    expect((await api.open(id)).status).toBe(409); // already voting
  });
});

describe("Phase 4 · full meeting", () => {
  it("vote → close → results → confirm: voted-out players become ghosts; correct voters earn team points (I15, I17)", async () => {
    const ctx = await startGame({ red: 5, blue: 4 });
    const api = meetingApi(ctx.gm);
    const id = await startVoting(ctx.gm);
    const redImp = ctx.byRole("impostor", "red")[0];
    const reds = ctx.players.filter((p) => p.team === "red" && p.id !== redImp.id);
    // 3 of 4 other reds vote for the real impostor; the 4th votes for someone else.
    for (const p of reds.slice(0, 3)) expect((await vote(p.client, id, redImp.id)).status).toBe(201);
    expect((await vote(reds[3].client, id, reds[0].id)).status).toBe(201);
    // Blue: everybody skips.
    for (const p of ctx.players.filter((x) => x.team === "blue")) await vote(p.client, id, null);

    expect((await api.close(id)).body.meeting.status).toBe("CLOSED");
    expect((await api.close(id)).status).toBe(200); // idempotent
    expect((await api.reveal(id)).status).toBe(200);

    const results = (await reds[0].client.call(playerState.GET)).body.meeting.results;
    const red = results.teams.find((t: { teamName: string }) => t.teamName === "Red");
    const blue = results.teams.find((t: { teamName: string }) => t.teamName === "Blue");
    expect(red.eliminated).toEqual({ name: redImp.name, wasImpostor: true });
    expect(blue.eliminated).toBeNull();
    expect(results.myTeam.tally[0]).toEqual({ name: redImp.name, count: 3 });

    const c1 = await api.confirm(id);
    expect(c1.status).toBe(200);
    expect(c1.body.eliminated).toBe(1);
    const c2 = await api.confirm(id);
    expect(c2.body.alreadyDone).toBe(true);

    expect((await Player.findById(redImp.id).lean())!.status).toBe("ghost");
    expect((await Elimination.findOne({ playerId: redImp.id }).lean())!.cause).toBe("vote");
    const txs = await PointTransaction.find({ category: "internal_vote" }).lean();
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(30);
    expect((await Team.findById(ctx.byKey.red._id).lean())!.score).toBe(30);
    expect((await Game.findById(ctx.game._id).lean())!.meetingsHeld).toBe(1);

    expect((await api.resume(id)).status).toBe(200);
    expect(await phase(ctx.game._id)).toBe("PLAYING");
    expect((await reds[0].client.call(playerState.GET)).body.meeting).toBeNull();
  });

  it("I16 a tie must be broken by the GM (one of the tied players, or nobody)", async () => {
    const ctx = await startGame({ red: 4 });
    const api = meetingApi(ctx.gm);
    const id = await startVoting(ctx.gm);
    const [a, b, c, d] = ctx.players;
    await vote(a.client, id, b.id);
    await vote(b.client, id, a.id);
    await vote(c.client, id, null);
    await api.close(id);
    const r = await api.reveal(id);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("TIE_UNRESOLVED");

    const red = String(ctx.byKey.red._id);
    expect((await api.decide(id, red, d.id)).status).toBe(400); // not one of the tied players
    expect((await api.decide(id, red, b.id)).status).toBe(200);
    expect((await api.reveal(id)).status).toBe(200);
    const m = (await Meeting.findById(id).lean())!;
    expect(String(m.teamResults[0].decision!.eliminatedPlayerId)).toBe(b.id);
    expect(m.teamResults[0].decision!.decidedByName).toBe(GM.name);
  });

  it("the GM can overrule a clear result to 'nobody eliminated'", async () => {
    const ctx = await startGame({ red: 3 });
    const api = meetingApi(ctx.gm);
    const id = await startVoting(ctx.gm);
    const [a, b] = ctx.players;
    await vote(a.client, id, b.id);
    await api.close(id);
    await api.decide(id, String(ctx.byKey.red._id), null);
    await api.reveal(id);
    await api.confirm(id);
    expect((await Player.findById(b.id).lean())!.status).toBe("alive");
  });

  it("reopening voting lets late voters in; results are re-tallied", async () => {
    const ctx = await startGame({ red: 3 });
    const api = meetingApi(ctx.gm);
    const id = await startVoting(ctx.gm);
    const [a, b, c] = ctx.players;
    await vote(a.client, id, b.id);
    await api.close(id);
    expect((await vote(c.client, id, b.id)).status).toBe(409);
    expect((await ctx.gm.call(reopen.POST, { params: { id }, body: { extraSec: 30 } })).status).toBe(200);
    expect((await vote(c.client, id, b.id)).status).toBe(201);
    await api.close(id);
    const m = (await Meeting.findById(id).lean())!;
    expect(m.teamResults[0].tally[0].count).toBe(2);
  });

  it("cancelling goes straight back to the game and doesn't use up the meeting", async () => {
    const ctx = await startGame({ red: 3 });
    const id = await startVoting(ctx.gm);
    await vote(ctx.players[0].client, id, ctx.players[1].id);
    expect((await ctx.gm.call(cancel.POST, { params: { id }, body: {} })).status).toBe(400); // needs a reason
    expect((await ctx.gm.call(cancel.POST, { params: { id }, body: { reason: "fire alarm test" } })).status).toBe(200);
    expect(await phase(ctx.game._id)).toBe("PLAYING");
    expect((await Game.findById(ctx.game._id).lean())!.meetingsHeld).toBe(0);
    expect((await meetingApi(ctx.gm).call()).status).toBe(201);
  });
});

describe("Phase 4 · timer", () => {
  it("I11 voting closes by itself after the deadline (+grace), on the next request", async () => {
    const ctx = await startGame({ red: 3 });
    const id = await startVoting(ctx.gm, 30);
    const past = new Date(Date.now() - 10_000);
    await Meeting.updateOne({ _id: id }, { $set: { votingEndsAt: past } });
    await Game.updateOne({ _id: ctx.game._id }, { $set: { votingDeadline: past } });

    const r = await vote(ctx.players[0].client, id, ctx.players[1].id);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("VOTING_CLOSED");
    expect((await Meeting.findById(id).lean())!.status).toBe("CLOSED");
    expect((await Game.findById(ctx.game._id).lean())!.votingDeadline).toBeNull();
  });

  it("a GM poll alone also closes expired voting (no GM click needed)", async () => {
    const ctx = await startGame({ red: 3 });
    const id = await startVoting(ctx.gm, 30);
    const before = (await ctx.gm.call(gmState.GET)).body;
    const past = new Date(Date.now() - 10_000);
    await Meeting.updateOne({ _id: id }, { $set: { votingEndsAt: past } });
    await Game.updateOne({ _id: ctx.game._id }, { $set: { votingDeadline: past } });
    const after = await ctx.gm.call(gmState.GET, { query: { v: String(before.version) } });
    expect(after.status).toBe(200); // not 304: the close bumped the version
    expect(after.body.meeting.status).toBe("CLOSED");
  });

  it("votes inside the grace period still count", async () => {
    const ctx = await startGame({ red: 3 });
    const id = await startVoting(ctx.gm, 30);
    const justNow = new Date(Date.now() - 1000); // grace is 3 s
    await Meeting.updateOne({ _id: id }, { $set: { votingEndsAt: justNow } });
    await Game.updateOne({ _id: ctx.game._id }, { $set: { votingDeadline: justNow } });
    expect((await vote(ctx.players[0].client, id, ctx.players[1].id)).status).toBe(201);
  });
});

describe("Phase 4 · kills during a meeting", () => {
  it("allowed while the meeting is just called, paused once voting opens", async () => {
    const ctx = await startGame({ red: 4 });
    const api = meetingApi(ctx.gm);
    const id = (await api.call()).body.meeting.id;
    expect((await ctx.gm.call(kill.POST, { params: { id: ctx.players[0].id }, body: {} })).status).toBe(200);
    await api.open(id);
    const r = await ctx.gm.call(kill.POST, { params: { id: ctx.players[1].id }, body: {} });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("KILLS_PAUSED");
  });
});
