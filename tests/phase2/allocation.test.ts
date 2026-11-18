import { describe, expect, it } from "vitest";
import { allocateRoles, planTeam, shuffle, type RoleConfig } from "@/lib/server/game/roles";
import { getRoleContent } from "@/lib/shared/roleContent";
import { ROLES } from "@/lib/shared/constants";

const DEFAULT: RoleConfig = { impostorsPerTeam: 1, detectivesPerTeam: 1, minTeamSizeForSpecialRoles: 3 };
const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

/** Deterministic RNG for repeatable tests (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return (max: number) => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

describe("Phase 2 · role allocation (unit)", () => {
  it("default: exactly 1 impostor + 1 detective per team, rest crewmates", () => {
    const teams = ["red", "blue", "green", "yellow", "purple"].map((t) => ({ teamId: t, playerIds: ids(t, 14) }));
    const { assignments, plans } = allocateRoles(teams, DEFAULT);
    expect(assignments.size).toBe(70);
    for (const t of teams) {
      const roles = t.playerIds.map((p) => assignments.get(p));
      expect(roles.filter((r) => r === "impostor")).toHaveLength(1);
      expect(roles.filter((r) => r === "detective")).toHaveLength(1);
      expect(roles.filter((r) => r === "crewmate")).toHaveLength(12);
    }
    expect(plans.every((p) => p.warnings.length === 0)).toBe(true);
  });

  it("every player gets exactly one role and no one from another team is touched", () => {
    const teams = [
      { teamId: "a", playerIds: ids("a", 9) },
      { teamId: "b", playerIds: ids("b", 4) },
    ];
    const { assignments } = allocateRoles(teams, DEFAULT);
    expect([...assignments.keys()].sort()).toEqual([...ids("a", 9), ...ids("b", 4)].sort());
  });

  it("respects per-team impostor overrides and the global setting", () => {
    const cfg: RoleConfig = { ...DEFAULT, impostorsPerTeam: 1, impostorOverrides: { big: 2 } };
    expect(planTeam("big", 20, cfg)).toMatchObject({ impostors: 2, detectives: 1, crewmates: 17 });
    expect(planTeam("small", 10, cfg)).toMatchObject({ impostors: 1, detectives: 1, crewmates: 8 });
    expect(planTeam("x", 10, { ...DEFAULT, detectivesPerTeam: 0 })).toMatchObject({ impostors: 1, detectives: 0, crewmates: 9 });
    // overrides may also be a Map (Mongoose Map type)
    expect(planTeam("big", 20, { ...DEFAULT, impostorOverrides: new Map([["big", 3]]) }).impostors).toBe(3);
  });

  it("handles tiny teams safely and warns", () => {
    expect(planTeam("t", 0, DEFAULT)).toMatchObject({ impostors: 0, detectives: 0, crewmates: 0 });
    expect(planTeam("t", 1, DEFAULT)).toMatchObject({ impostors: 0, detectives: 0, crewmates: 1 });
    expect(planTeam("t", 2, DEFAULT)).toMatchObject({ impostors: 1, detectives: 0, crewmates: 1 });
    expect(planTeam("t", 3, DEFAULT)).toMatchObject({ impostors: 1, detectives: 1, crewmates: 1 });
    expect(planTeam("t", 1, DEFAULT).warnings.length).toBeGreaterThan(0);
    expect(planTeam("t", 2, DEFAULT).warnings.length).toBeGreaterThan(0);
    expect(planTeam("t", 3, DEFAULT).warnings).toHaveLength(0);
  });

  it("never makes everyone special — at least one crewmate in teams of 2+", () => {
    const greedy: RoleConfig = { impostorsPerTeam: 5, detectivesPerTeam: 5, minTeamSizeForSpecialRoles: 1 };
    for (let n = 2; n <= 12; n++) {
      const p = planTeam("t", n, greedy);
      expect(p.crewmates).toBeGreaterThanOrEqual(1);
      expect(p.impostors + p.detectives + p.crewmates).toBe(n);
    }
  });

  it("shuffle is a permutation", () => {
    const input = ids("p", 50);
    const out = shuffle(input, seeded(42));
    expect(out).toHaveLength(50);
    expect([...out].sort()).toEqual([...input].sort());
    expect(out).not.toEqual(input);
  });

  it("is fair: each player is the impostor ~equally often (10,000 runs)", () => {
    const players = ids("p", 10);
    const counts = new Map(players.map((p) => [p, 0]));
    const rng = seeded(7);
    const RUNS = 10_000;
    for (let i = 0; i < RUNS; i++) {
      const { assignments } = allocateRoles([{ teamId: "t", playerIds: players }], DEFAULT, rng);
      for (const [p, r] of assignments) if (r === "impostor") counts.set(p, counts.get(p)! + 1);
    }
    // Expected 1000 each; chi-square with 9 dof — 99.9% critical value ≈ 27.9
    const chi = [...counts.values()].reduce((s, c) => s + (c - RUNS / 10) ** 2 / (RUNS / 10), 0);
    expect(chi).toBeLessThan(27.9);
  });

  it("produces different allocations on different runs (real crypto RNG)", () => {
    const players = ids("p", 12);
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const { assignments } = allocateRoles([{ teamId: "t", playerIds: players }], DEFAULT);
      seen.add(players.find((p) => assignments.get(p) === "impostor")!);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("Phase 2 · role content (unit)", () => {
  const rules = { crewNeedsToCatch: 2, detectiveInvestigationLimit: 1, maxMeetings: 1, alliesVisible: true };
  it("every role has a title, description, objective, abilities, scoring and instructions", () => {
    for (const r of ROLES) {
      const c = getRoleContent(r, rules);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(20);
      expect(c.objective.length).toBeGreaterThan(10);
      expect(c.abilities.length).toBeGreaterThan(0);
      expect(c.howToScore.length).toBeGreaterThan(0);
      expect(c.instructions.length).toBeGreaterThan(0);
    }
  });
  it("reflects configured rules in the text", () => {
    expect(getRoleContent("impostor", rules).objective).toContain("fewer than 2 impostors");
    expect(getRoleContent("impostor", { ...rules, crewNeedsToCatch: 1 }).objective).toContain("fewer than 1 impostor is");
    expect(getRoleContent("detective", rules).abilities[0]).toContain("1 person");
    expect(getRoleContent("detective", { ...rules, detectiveInvestigationLimit: 3 }).abilities[0]).toContain("3 people");
    expect(getRoleContent("impostor", { ...rules, alliesVisible: false }).abilities.join(" ")).toContain("work alone");
  });
});
