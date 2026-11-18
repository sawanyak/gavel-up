import { describe, expect, it } from "vitest";
import { computeOutcome } from "@/lib/server/game/endgame";

const teams = [
  { teamId: "r", name: "Red", score: 120 },
  { teamId: "b", name: "Blue", score: 90 },
  { teamId: "g", name: "Green", score: 120 },
];

describe("Phase 6 · endgame outcome (pure, I27)", () => {
  it("a single top team wins", () => {
    const o = computeOutcome([{ teamId: "r", name: "Red", score: 50 }, { teamId: "b", name: "Blue", score: 40 }], 2, 2, "SHARED");
    expect(o).toMatchObject({ status: "ok", winningTeamIds: ["r"], tied: false });
  });

  it("SHARED tie → co-winners (alphabetical)", () => {
    expect(computeOutcome(teams, 2, 2, "SHARED")).toMatchObject({ status: "ok", winningTeamIds: ["g", "r"], tied: true });
  });

  it("GM_DECIDES tie → needs the GM's choice, which must be one of the tied teams", () => {
    expect(computeOutcome(teams, 2, 2, "GM_DECIDES")).toEqual({ status: "needs_gm_choice", tiedTeamIds: ["g", "r"] });
    expect(computeOutcome(teams, 2, 2, "GM_DECIDES", ["b"])).toMatchObject({ status: "needs_gm_choice" });
    expect(computeOutcome(teams, 2, 2, "GM_DECIDES", ["r"])).toMatchObject({ status: "ok", winningTeamIds: ["r"] });
  });

  it("impostors win when fewer than the threshold (2) were voted out", () => {
    for (const [out, impostorsWin] of [
      [0, true],
      [1, true],
      [2, false],
      [5, false],
    ] as const) {
      expect(computeOutcome(teams, out, 2, "SHARED")).toMatchObject({ impostorsWin, impostorsVotedOut: out, threshold: 2 });
    }
  });
});
