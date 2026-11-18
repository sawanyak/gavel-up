import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { Game, PointTransaction, Team } from "@/lib/server/models";
import { award, recomputeScores, type AwardInput } from "@/lib/server/services/ledger";
import { setupGame } from "../helpers";

const SYSTEM = { type: "system" as const, name: "test" };

describe("Phase 3 · point ledger core", () => {
  it("an award writes one transaction, updates the team score and bumps the game version", async () => {
    const { game, byKey } = await setupGame();
    const r = await award({ gameId: game._id, teamId: byKey.red._id, amount: 10, category: "task", reason: "x", idempotencyKey: "k1", createdBy: SYSTEM });
    expect(r.created).toBe(true);
    expect(r.tx.amount).toBe(10);
    expect((await Team.findById(byKey.red._id).lean())!.score).toBe(10);
    expect((await Game.findById(game._id).lean())!.version).toBe(game.version + 1);
  });

  it("the same idempotency key never awards twice (sequential and 20 concurrent)", async () => {
    const { game, byKey } = await setupGame();
    const input: AwardInput = { gameId: game._id, teamId: byKey.blue._id, amount: 15, category: "task", reason: "x", idempotencyKey: "same", createdBy: SYSTEM };
    const first = await award(input);
    const again = await award(input);
    expect(again.created).toBe(false);
    expect(String(again.tx._id)).toBe(String(first.tx._id));

    const results = await Promise.all(Array.from({ length: 20 }, () => award({ ...input, idempotencyKey: "burst" })));
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(await PointTransaction.countDocuments({ gameId: game._id })).toBe(2);
    expect((await Team.findById(byKey.blue._id).lean())!.score).toBe(30);
  });

  it("refuses to award a team from another game (and writes nothing)", async () => {
    const { game } = await setupGame();
    await expect(
      award({ gameId: game._id, teamId: new mongoose.Types.ObjectId(), amount: 5, category: "manual", reason: "x", idempotencyKey: "bad", createdBy: SYSTEM }),
    ).rejects.toThrow();
    expect(await PointTransaction.countDocuments()).toBe(0);
  });

  it("recompute rebuilds cached scores from the ledger", async () => {
    const { game, teams } = await setupGame();
    const expected = new Map<string, number>();
    for (let i = 0; i < 60; i++) {
      const t = teams[i % teams.length];
      const amount = (i % 7) * 5 - 10;
      await award({ gameId: game._id, teamId: t._id, amount, category: "manual", reason: "x", idempotencyKey: `r${i}`, createdBy: SYSTEM });
      expected.set(String(t._id), (expected.get(String(t._id)) ?? 0) + amount);
    }
    await Team.updateMany({ gameId: game._id }, { $set: { score: 999 } }); // corrupt the cache
    const scores = await recomputeScores(game._id);
    for (const s of scores) expect(s.score).toBe(expected.get(s.id) ?? 0);
  });
});
