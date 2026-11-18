/**
 * Role allocation (plan §11.1). Pure functions: no DB access, so they can be unit-tested
 * exhaustively. The RNG is injectable; production uses crypto.randomInt.
 */
import crypto from "crypto";
import type { Role } from "@/lib/shared/constants";

export interface RoleConfig {
  impostorsPerTeam: number;
  detectivesPerTeam: number;
  minTeamSizeForSpecialRoles: number;
  impostorOverrides?: Record<string, number> | Map<string, number>;
}

export type Rng = (maxExclusive: number) => number;
export const cryptoRng: Rng = (max) => crypto.randomInt(0, max);

export interface TeamPlan {
  teamId: string;
  players: number;
  impostors: number;
  detectives: number;
  crewmates: number;
  warnings: string[];
}

function overrideFor(config: RoleConfig, teamId: string): number | undefined {
  const o = config.impostorOverrides;
  if (!o) return undefined;
  const v = o instanceof Map ? o.get(teamId) : o[teamId];
  return typeof v === "number" ? v : undefined;
}

/** How many of each special role a team of `n` players gets. */
export function planTeam(teamId: string, n: number, config: RoleConfig, teamName = "Team"): TeamPlan {
  const warnings: string[] = [];
  let imp = overrideFor(config, teamId) ?? config.impostorsPerTeam;
  let det = config.detectivesPerTeam;

  if (n === 0) {
    return { teamId, players: 0, impostors: 0, detectives: 0, crewmates: 0, warnings: [`${teamName} has no players — late joiners there will all be crewmates.`] };
  }
  if (n < config.minTeamSizeForSpecialRoles) {
    imp = Math.min(imp, n >= 2 ? 1 : 0);
    det = 0;
    warnings.push(`${teamName} has only ${n} player(s) — reduced special roles.`);
  }
  // Always leave at least one crewmate when the team has 2+ players.
  const maxSpecial = n >= 2 ? n - 1 : 0;
  imp = Math.max(0, Math.min(imp, maxSpecial));
  det = Math.max(0, Math.min(det, maxSpecial - imp));

  if (imp === 0) warnings.push(`${teamName} will have no impostor.`);
  return { teamId, players: n, impostors: imp, detectives: det, crewmates: n - imp - det, warnings };
}

/** Unbiased Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface AllocationInput {
  teamId: string;
  teamName?: string;
  playerIds: string[];
}

export function allocateRoles(teams: AllocationInput[], config: RoleConfig, rng: Rng = cryptoRng) {
  const assignments = new Map<string, Role>();
  const plans: TeamPlan[] = [];
  for (const t of teams) {
    const plan = planTeam(t.teamId, t.playerIds.length, config, t.teamName);
    plans.push(plan);
    const order = shuffle(t.playerIds, rng);
    order.forEach((pid, i) => {
      assignments.set(pid, i < plan.impostors ? "impostor" : i < plan.impostors + plan.detectives ? "detective" : "crewmate");
    });
  }
  return { assignments, plans, warnings: plans.flatMap((p) => p.warnings) };
}
