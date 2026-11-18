import { describe, expect, it } from "vitest";
import { makePairs, pairKey, type PairPlayer } from "@/lib/server/game/pairs";
import { cryptoRng } from "@/lib/server/game/roles";

const team = (t: string, n: number, start = 0): PairPlayer[] => Array.from({ length: n }, (_, i) => ({ id: `${t}${i + start}`, teamId: t }));

function check(players: PairPlayer[], scope: "same_team" | "cross_team", others: PairPlayer[] = []) {
  const { pairs, unpaired } = makePairs(players, scope, cryptoRng, others);
  const keys = new Set<string>();
  for (const [a, b] of pairs) {
    expect(a.id).not.toBe(b.id);
    if (scope === "same_team") expect(a.teamId).toBe(b.teamId);
    else expect(a.teamId).not.toBe(b.teamId);
    const k = pairKey(a.id, b.id);
    expect(keys.has(k)).toBe(false); // never the same two people twice
    keys.add(k);
  }
  // Every input player is in at least one pair, or reported as unpaired.
  const seen = new Set([...pairs.flat().map((p) => p.id), ...unpaired.map((p) => p.id)]);
  for (const p of players) expect(seen.has(p.id)).toBe(true);
  return { pairs, unpaired };
}

describe("Phase 3 · pairing (pure)", () => {
  it("same team, even sizes: everyone gets exactly one partner from their team", () => {
    const { pairs, unpaired } = check([...team("r", 6), ...team("b", 4)], "same_team");
    expect(pairs).toHaveLength(5);
    expect(unpaired).toHaveLength(0);
    const counts = new Map<string, number>();
    for (const p of pairs.flat()) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
    expect([...counts.values()].every((n) => n === 1)).toBe(true);
  });

  it("same team, odd size: the odd one out joins an existing pair (one person gets two partners)", () => {
    const { pairs, unpaired } = check(team("r", 5), "same_team");
    expect(pairs).toHaveLength(3);
    expect(unpaired).toHaveLength(0);
  });

  it("same team: a team of one can't be paired and is reported", () => {
    const { unpaired } = check([...team("r", 4), ...team("g", 1)], "same_team");
    expect(unpaired.map((p) => p.id)).toEqual(["g0"]);
  });

  it("cross team: partners are always from different teams, and nobody is left out when it's possible", () => {
    const { unpaired } = check([...team("r", 5), ...team("b", 3)], "cross_team");
    expect(unpaired).toHaveLength(0);
  });

  it("cross team with a single team: nobody can be paired", () => {
    const { pairs, unpaired } = check(team("r", 4), "cross_team");
    expect(pairs).toHaveLength(0);
    expect(unpaired).toHaveLength(4);
  });

  it("a late joiner is paired with someone who already has a pair", () => {
    const already = [...team("r", 2), ...team("b", 2)];
    const { pairs } = check(team("r", 1, 10), "same_team", already);
    expect(pairs).toHaveLength(1);
    expect(pairs[0][1].teamId).toBe("r");
  });

  it("holds the rules over 300 random team layouts", () => {
    for (let i = 0; i < 300; i++) {
      const players = ["r", "b", "g", "y", "p"].flatMap((t) => team(t, cryptoRng(9)));
      check(players, i % 2 ? "same_team" : "cross_team");
    }
  });
});
