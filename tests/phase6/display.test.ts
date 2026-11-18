import { describe, expect, it } from "vitest";
import * as display from "@/app/api/public/display/route";
import * as setDisplay from "@/app/api/gm/display/route";
import * as qr from "@/app/api/public/qr/route";
import * as points from "@/app/api/staff/points/route";
import { Client, createStaffMember, fillTeams, loginStaff, setupGame, startGame } from "../helpers";
import { meetingApi, startVoting, vote } from "../phase4/meetingHelpers";
import { finalApi } from "./finalHelpers";

const projector = () => new Client("10.9.9.9");
const show = (gm: Client, screen: string) => gm.call(setDisplay.PATCH, { method: "PATCH", body: { screen } });

describe("Phase 6 · projector display", () => {
  it("needs no login and never contains roles, phones or vote choices before the final reveal", async () => {
    const ctx = await startGame({ red: 4, blue: 4 });
    const id = await startVoting(ctx.gm);
    const [a, b] = ctx.players.filter((p) => p.team === "red");
    await vote(a.client, id, b.id);

    const r = await projector().call(display.GET);
    expect(r.status).toBe(200);
    const text = JSON.stringify(r.body);
    expect(text).not.toMatch(/"(impostor|detective|crewmate)"|"role"|\+94|07\d{8}/);
    expect(text).not.toContain(b.id); // no candidate ids at all
    expect(r.body.meeting).toMatchObject({ status: "VOTING", votesCast: 1, eligibleTotal: 8 });
    expect(r.body.meeting.perTeam.find((t: { teamId: string }) => t.teamId === String(ctx.byKey.red._id))).toEqual({
      teamId: String(ctx.byKey.red._id),
      voted: 1,
      eligible: 4,
    });
    expect(r.body.screen).toBe("VOTING"); // opening voting switched the projector
    expect(r.body.counts).toEqual({ registered: 8, alive: 8, ghosts: 0 });
  });

  it("supports 304 polling", async () => {
    const ctx = await startGame({ red: 2 });
    const first = (await projector().call(display.GET)).body;
    expect((await projector().call(display.GET, { query: { v: String(first.version) } })).status).toBe(304);
    await show(ctx.gm, "RULES");
    const next = await projector().call(display.GET, { query: { v: String(first.version) } });
    expect(next.status).toBe(200);
    expect(next.body.screen).toBe("RULES");
  });

  it("the GM can only switch to screens that are allowed right now", async () => {
    const ctx = await startGame({ red: 3 });
    expect((await show(ctx.gm, "REGISTRATION")).status).toBe(200);
    for (const screen of ["IMPOSTORS", "WINNER", "RESULTS", "VOTING"]) {
      const r = await show(ctx.gm, screen);
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe("SCREEN_NOT_AVAILABLE");
    }
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await show(tm, "RULES")).status).toBe(403);
  });

  it("hides scores during the final reveal until the leaderboard step, then shows impostors and winner", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    await ctx.gm.call(points.POST, { body: { teamId: String(ctx.byKey.red._id), amount: 40, reason: "Q&A round" }, headers: { "idempotency-key": "display-key-1" } });
    expect((await projector().call(display.GET)).body.leaderboard[0]).toMatchObject({ name: "Red", score: 40 });

    const f = finalApi(ctx.gm);
    await f.start();
    let d = (await projector().call(display.GET)).body;
    expect(d.leaderboard).toEqual([]);
    expect(d.teams.every((t: { score: number }) => t.score === 0)).toBe(true);
    expect(d.final.impostors).toBeUndefined();
    expect((await show(ctx.gm, "LEADERBOARD")).status).toBe(409);

    await f.revealImpostors();
    d = (await projector().call(display.GET)).body;
    expect(d.screen).toBe("IMPOSTORS");
    expect(d.final.impostors).toHaveLength(2);

    await f.scorePredictions();
    await f.leaderboard();
    d = (await projector().call(display.GET)).body;
    expect(d.screen).toBe("LEADERBOARD");
    expect(d.leaderboard[0]).toMatchObject({ name: "Red", score: 40 });

    await f.winner();
    d = (await projector().call(display.GET)).body;
    expect(d.screen).toBe("WINNER");
    expect(d.final.winningTeamIds).toEqual([String(ctx.byKey.red._id)]);
    expect((await show(ctx.gm, "STATS")).status).toBe(200);
  });

  it("meeting results show on the projector only after the GM reveals them", async () => {
    const ctx = await startGame({ red: 3 });
    const id = await startVoting(ctx.gm);
    const [a, b, c] = ctx.players;
    await vote(a.client, id, b.id);
    await vote(c.client, id, b.id);
    const api = meetingApi(ctx.gm);
    await api.close(id);
    expect((await projector().call(display.GET)).body.meeting.results).toBeNull();
    await api.reveal(id);
    const d = (await projector().call(display.GET)).body;
    expect(d.screen).toBe("RESULTS");
    expect(d.meeting.results[0].eliminated.name).toBe(b.name);
  });

  it("serves the registration QR publicly", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 1 });
    const r = await projector().call(qr.GET, { headers: { host: "192.168.1.50:3000" } });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/png");
  });
});
