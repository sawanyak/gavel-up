import { describe, expect, it } from "vitest";
import * as points from "@/app/api/staff/points/route";
import * as gmTasks from "@/app/api/gm/tasks/route";
import { PointTransaction, Team } from "@/lib/server/models";
import { type Client, GM, createStaffMember, fillTeams, loginStaff, setupGame, startGame } from "../helpers";

let n = 0;
const key = () => `test-key-${Date.now()}-${++n}`;
const give = (c: Client, body: Record<string, unknown>, k: string | null = key()) =>
  c.call(points.POST, { body, headers: k ? { "idempotency-key": k } : {} });
const score = async (id: unknown) => (await Team.findById(id).lean())!.score;

async function withTM() {
  const ctx = await startGame({ red: 3, blue: 3 });
  await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
  const tm = await loginStaff("Red Manager", "222222");
  return { ...ctx, tm, red: String(ctx.byKey.red._id), blue: String(ctx.byKey.blue._id) };
}

describe("Phase 5 · manual awards", () => {
  it("a TM gives points to their own team; the score and response update", async () => {
    const ctx = await withTM();
    const r = await give(ctx.tm, { teamId: ctx.red, amount: 15, reason: "Table topics winner" });
    expect(r.status).toBe(201);
    expect(r.body.teamScore).toBe(15);
    const tx = (await PointTransaction.findOne().lean())!;
    expect(tx).toMatchObject({ amount: 15, category: "manual", reason: "Table topics winner" });
    expect(tx.createdBy.name).toBe("Red Manager");
  });

  it("I19 a TM can't award another team or go past ±20", async () => {
    const ctx = await withTM();
    const other = await give(ctx.tm, { teamId: ctx.blue, amount: 5, reason: "nice" });
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe("NOT_YOUR_TEAM");
    for (const amount of [21, -21]) {
      const r = await give(ctx.tm, { teamId: ctx.red, amount, reason: "too much" });
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe("AMOUNT_OUT_OF_RANGE");
    }
    expect((await give(ctx.tm, { teamId: ctx.red, amount: -20, reason: "noise penalty" })).status).toBe(201);
    expect((await PointTransaction.findOne().lean())!.category).toBe("penalty");
  });

  it("GM bounds are ±100; 0 and missing reasons are refused", async () => {
    const ctx = await withTM();
    expect((await give(ctx.gm, { teamId: ctx.blue, amount: 100, reason: "Q&A sweep" })).status).toBe(201);
    expect((await give(ctx.gm, { teamId: ctx.blue, amount: 101, reason: "too much" })).status).toBe(400);
    expect((await give(ctx.gm, { teamId: ctx.blue, amount: 0, reason: "zero" })).status).toBe(400);
    expect((await give(ctx.gm, { teamId: ctx.blue, amount: 5, reason: "x" })).status).toBe(400);
  });

  it("I20 the same Idempotency-Key never awards twice, even when retried at once", async () => {
    const ctx = await withTM();
    const k = key();
    const rs = await Promise.all(Array.from({ length: 10 }, () => give(ctx.tm, { teamId: ctx.red, amount: 10, reason: "Icebreaker" }, k)));
    expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
    expect(rs.filter((r) => r.status === 200).every((r) => r.body.alreadyApplied)).toBe(true);
    expect(await PointTransaction.countDocuments()).toBe(1);
    expect(await score(ctx.red)).toBe(10);
    // A new submit (new key) is a new award.
    await give(ctx.tm, { teamId: ctx.red, amount: 10, reason: "Icebreaker" });
    expect(await score(ctx.red)).toBe(20);
  });

  it("needs an Idempotency-Key header", async () => {
    const ctx = await withTM();
    const r = await give(ctx.gm, { teamId: ctx.red, amount: 5, reason: "no key" }, null);
    expect(r.status).toBe(400);
  });

  it("can be linked to an activity and to the player who earned it", async () => {
    const ctx = await withTM();
    const act = await ctx.gm.call(gmTasks.POST, { body: { title: "Table topics", kind: "activity" } });
    const redPlayer = ctx.players.find((p) => p.team === "red")!;
    const bluePlayer = ctx.players.find((p) => p.team === "blue")!;
    const r = await give(ctx.tm, { teamId: ctx.red, amount: 10, reason: "best speech", activityTaskId: act.body.task.id, earnedByPlayerId: redPlayer.id });
    expect(r.status).toBe(201);
    const tx = (await PointTransaction.findOne().lean())!;
    expect(tx.category).toBe("activity");
    expect(tx.reason).toBe("Table topics: best speech");
    expect(String(tx.earnedByPlayerId)).toBe(redPlayer.id);
    const wrong = await give(ctx.tm, { teamId: ctx.red, amount: 10, reason: "x player", earnedByPlayerId: bluePlayer.id });
    expect(wrong.body.error.code).toBe("INVALID_PLAYER");
  });

  it("players can't award points; nobody can before the game starts", async () => {
    const ctx = await withTM();
    expect((await give(ctx.players[0].client, { teamId: ctx.red, amount: 5, reason: "self award" })).status).toBe(401);

    const fresh = await setupGame({ code: "PRE" });
    await fillTeams(fresh.byKey, { red: 2 });
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await give(gm, { teamId: String(fresh.byKey.red._id), amount: 5, reason: "too early" });
    expect(r.status).toBe(409);
  });
});
