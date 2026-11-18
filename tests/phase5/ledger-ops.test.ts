import { describe, expect, it } from "vitest";
import * as points from "@/app/api/staff/points/route";
import * as reverse from "@/app/api/gm/points/[id]/reverse/route";
import * as recompute from "@/app/api/gm/scores/recompute/route";
import * as gmPoints from "@/app/api/gm/points/route";
import { PointTransaction, Staff, Team, type StaffDoc } from "@/lib/server/models";
import { manualAward, reverseTransaction } from "@/lib/server/services/scoring";
import { cryptoRng } from "@/lib/server/game/roles";
import { type Client, createStaffMember, loginStaff, startGame } from "../helpers";

let n = 0;
const give = (c: Client, teamId: string, amount: number, reason = "Q&A answer") =>
  c.call(points.POST, { body: { teamId, amount, reason }, headers: { "idempotency-key": `k-${Date.now()}-${++n}` } });
const score = async (id: unknown) => (await Team.findById(id).lean())!.score;

describe("Phase 5 · reversals and recompute", () => {
  it("I25 reversing restores the score; a second reversal is refused (also when simultaneous)", async () => {
    const ctx = await startGame({ red: 3 });
    const red = String(ctx.byKey.red._id);
    const tx = (await give(ctx.gm, red, 40)).body.transaction;
    const rs = await Promise.all([1, 2, 3, 4].map(() => ctx.gm.call(reverse.POST, { params: { id: tx.id }, body: { reason: "wrong team" } })));
    expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
    expect(rs.filter((r) => r.status === 409).every((r) => r.body.error.code === "ALREADY_REVERSED")).toBe(true);
    expect(await score(red)).toBe(0);
    const rev = (await PointTransaction.findOne({ category: "reversal" }).lean())!;
    expect(rev.amount).toBe(-40);
    expect(String(rev.reversesId)).toBe(tx.id);
    expect(String((await PointTransaction.findById(tx.id).lean())!.reversedById)).toBe(String(rev._id));
    // A reversal itself can't be reversed.
    const again = await ctx.gm.call(reverse.POST, { params: { id: String(rev._id) }, body: { reason: "undo undo" } });
    expect(again.body.error.code).toBe("CANNOT_REVERSE_REVERSAL");
  });

  it("only GMs reverse; a reason is required", async () => {
    const ctx = await startGame({ red: 3 });
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    const tx = (await give(tm, String(ctx.byKey.red._id), 10)).body.transaction;
    expect((await tm.call(reverse.POST, { params: { id: tx.id }, body: { reason: "mine" } })).status).toBe(403);
    expect((await ctx.gm.call(reverse.POST, { params: { id: tx.id }, body: {} })).status).toBe(400);
  });

  it("I26 after 500 random awards and reversals, recompute equals the cached scores", async () => {
    const ctx = await startGame({ red: 2, blue: 2, green: 2 });
    const gm = (await Staff.findOne({ role: "GM" }).lean<StaffDoc>())!;
    const teamIds = ctx.teams.map((t) => String(t._id));
    const txIds: string[] = [];
    for (let i = 0; i < 500; i++) {
      if (i % 5 === 4 && txIds.length) {
        const pick = txIds.splice(cryptoRng(txIds.length), 1)[0];
        await reverseTransaction(gm, ctx.game, pick, "random undo", "test");
      } else {
        const amount = cryptoRng(41) - 20 || 7;
        const { tx } = await manualAward(gm, ctx.game, { teamId: teamIds[cryptoRng(teamIds.length)], amount, reason: "random op" }, `op-${i}`, "test");
        txIds.push(String(tx._id));
      }
    }
    const cached = new Map((await Team.find().lean()).map((t) => [String(t._id), t.score]));
    const r = await ctx.gm.call(recompute.POST);
    expect(r.status).toBe(200);
    expect(r.body.changed).toBe(0);
    for (const t of r.body.teams) expect(t.score).toBe(cached.get(t.id));
  });

  it("recompute repairs a corrupted cache", async () => {
    const ctx = await startGame({ red: 2 });
    const red = String(ctx.byKey.red._id);
    await give(ctx.gm, red, 25);
    await Team.updateOne({ _id: red }, { $set: { score: 999 } });
    const r = await ctx.gm.call(recompute.POST);
    expect(r.body.changed).toBe(1);
    expect(await score(red)).toBe(25);
  });

  it("GM ledger lists newest first, filters by team/category, and polls with 304", async () => {
    const ctx = await startGame({ red: 2, blue: 2 });
    const red = String(ctx.byKey.red._id);
    const blue = String(ctx.byKey.blue._id);
    await give(ctx.gm, red, 10, "first");
    await give(ctx.gm, blue, -5, "second");
    const all = (await ctx.gm.call(gmPoints.GET)).body;
    expect(all.ledger.map((x: { reason: string }) => x.reason)).toEqual(["second", "first"]);
    expect(all.leaderboard[0]).toMatchObject({ name: "Red", score: 10, rank: 1 });
    expect(all.totals.byCategory).toMatchObject({ manual: 10, penalty: -5 });
    const onlyRed = (await ctx.gm.call(gmPoints.GET, { query: { teamId: red } })).body;
    expect(onlyRed.ledger).toHaveLength(1);
    const penalties = (await ctx.gm.call(gmPoints.GET, { query: { category: "penalty" } })).body;
    expect(penalties.ledger[0].reason).toBe("second");
    expect((await ctx.gm.call(gmPoints.GET, { query: { v: String(all.version) } })).status).toBe(304);
  });
});
