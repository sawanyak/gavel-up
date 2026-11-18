import { describe, expect, it } from "vitest";
import { tallyTeam } from "@/lib/server/game/tally";

const team = { voterIds: ["a", "b", "c", "d", "e"], candidateIds: ["a", "b", "c", "d", "e"] };
const v = (voterId: string, targetId: string | null) => ({ voterId, targetId });

describe("Phase 4 · vote tally (pure)", () => {
  it("single top candidate is eliminated automatically", () => {
    const r = tallyTeam(team, [v("a", "b"), v("c", "b"), v("d", "e"), v("e", null)]);
    expect(r.tally).toEqual([
      { playerId: "b", count: 2 },
      { playerId: "e", count: 1 },
    ]);
    expect(r).toMatchObject({ skipCount: 1, votedCount: 4, notVotedCount: 1, topCandidateIds: ["b"], tie: false, autoDecision: "b" });
  });

  it("2-way and 3-way ties need a GM decision", () => {
    const two = tallyTeam(team, [v("a", "b"), v("b", "a")]);
    expect(two.tie).toBe(true);
    expect(two.topCandidateIds.sort()).toEqual(["a", "b"]);
    expect(two.autoDecision).toBeUndefined();
    const three = tallyTeam(team, [v("a", "b"), v("b", "c"), v("c", "a")]);
    expect(three.topCandidateIds).toHaveLength(3);
    expect(three.autoDecision).toBeUndefined();
  });

  it("nobody voted, or everyone skipped → nobody eliminated", () => {
    expect(tallyTeam(team, []).autoDecision).toBeNull();
    const skips = tallyTeam(team, [v("a", null), v("b", null)]);
    expect(skips.autoDecision).toBeNull();
    expect(skips.skipCount).toBe(2);
  });

  it("skips don't block an elimination but warn when they outnumber the top", () => {
    const r = tallyTeam(team, [v("a", "b"), v("c", null), v("d", null)]);
    expect(r.autoDecision).toBe("b");
    expect(r.mostSkipped).toBe(true);
  });

  it("ignores ineligible voters, invalid targets, self-votes and duplicates", () => {
    const r = tallyTeam(team, [v("zz", "b"), v("a", "zz"), v("b", "b"), v("c", "d"), v("c", "e")]);
    expect(r.tally).toEqual([{ playerId: "d", count: 1 }]);
    expect(r.votedCount).toBe(3); // a, b, c each counted once (their bad votes count as voted)
    expect(r.autoDecision).toBe("d");
  });
});
