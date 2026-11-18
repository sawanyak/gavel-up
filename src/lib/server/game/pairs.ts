/**
 * Pure pairing for paired tasks ("Talk to <name> for 2 minutes").
 *
 * - same_team: partners are always in the same team.
 * - cross_team: partners are always in different teams. We pair from the team with the
 *   most players left first, which maximises the number of cross-team pairs.
 *
 * Odd one out: the leftover player is paired with a random already-paired player who fits
 * the scope (that partner then has two pairs). If nobody fits (e.g. a team of one for
 * same_team), the player is returned in `unpaired`.
 */
import { shuffle, type Rng } from "./roles";

export interface PairPlayer {
  id: string;
  teamId: string;
}

export type PairScope = "same_team" | "cross_team";

export interface PairResult {
  pairs: [PairPlayer, PairPlayer][];
  unpaired: PairPlayer[];
}

/**
 * @param players  players who still need a pair
 * @param others   players who already have a pair for this task (only used as partners for leftovers)
 */
export function makePairs(players: PairPlayer[], scope: PairScope, rng: Rng, others: PairPlayer[] = []): PairResult {
  const pairs: [PairPlayer, PairPlayer][] = [];
  const leftovers: PairPlayer[] = [];

  if (scope === "same_team") {
    const byTeam = new Map<string, PairPlayer[]>();
    for (const p of players) byTeam.set(p.teamId, [...(byTeam.get(p.teamId) ?? []), p]);
    for (const members of byTeam.values()) {
      const s = shuffle(members, rng);
      for (let i = 0; i + 1 < s.length; i += 2) pairs.push([s[i], s[i + 1]]);
      if (s.length % 2 === 1) leftovers.push(s[s.length - 1]);
    }
  } else {
    let pool = shuffle(players, rng);
    while (pool.length >= 2) {
      const counts = new Map<string, number>();
      for (const p of pool) counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1);
      const max = Math.max(...counts.values());
      const biggest = [...counts].filter(([, n]) => n === max).map(([t]) => t);
      const team = biggest[rng(biggest.length)];
      const fromTeam = pool.filter((p) => p.teamId === team);
      const fromOthers = pool.filter((p) => p.teamId !== team);
      if (fromOthers.length === 0) break; // everyone left is in one team
      const a = fromTeam[rng(fromTeam.length)];
      const b = fromOthers[rng(fromOthers.length)];
      pairs.push([a, b]);
      pool = pool.filter((p) => p !== a && p !== b);
    }
    leftovers.push(...pool);
  }

  // Leftovers join someone who already has a partner (they'll have two pairs).
  const unpaired: PairPlayer[] = [];
  const paired = [...pairs.flat(), ...others];
  for (const p of leftovers) {
    const fits = paired.filter((q) => q.id !== p.id && (scope === "same_team" ? q.teamId === p.teamId : q.teamId !== p.teamId));
    if (fits.length === 0) {
      unpaired.push(p);
      continue;
    }
    pairs.push([p, fits[rng(fits.length)]]);
  }
  return { pairs, unpaired };
}

/** Order-independent key, so the same two people are never paired twice for one task. */
export const pairKey = (a: string, b: string) => (a < b ? `pair:${a}:${b}` : `pair:${b}:${a}`);
