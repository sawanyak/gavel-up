/**
 * Internal vote tally for one team (plan §11.2). Pure and unit-tested.
 *
 * - Only votes from eligible voters for eligible candidates count.
 * - The single top candidate (with at least 1 vote) is eliminated automatically.
 * - A tie at the top → `tie: true`, no decision: the GM must choose one of the tied players or nobody.
 * - No votes for anyone (nobody voted, or all skipped) → nobody eliminated.
 * - Skips never block an elimination, but `mostSkipped` warns the GM when skips beat the top count.
 */
export interface TallyVote {
  voterId: string;
  targetId: string | null;
}

export interface TallyResult {
  tally: { playerId: string; count: number }[];
  skipCount: number;
  votedCount: number;
  notVotedCount: number;
  topCandidateIds: string[];
  tie: boolean;
  mostSkipped: boolean;
  /** undefined = needs a GM decision; null = nobody eliminated; string = eliminated player. */
  autoDecision: string | null | undefined;
}

export function tallyTeam(eligible: { voterIds: string[]; candidateIds: string[] }, votes: TallyVote[]): TallyResult {
  const voters = new Set(eligible.voterIds);
  const candidates = new Set(eligible.candidateIds);
  const counted = new Map<string, number>();
  const seen = new Set<string>();
  let skipCount = 0;

  for (const v of votes) {
    if (!voters.has(v.voterId) || seen.has(v.voterId)) continue;
    seen.add(v.voterId);
    if (v.targetId === null) skipCount += 1;
    else if (candidates.has(v.targetId) && v.targetId !== v.voterId) counted.set(v.targetId, (counted.get(v.targetId) ?? 0) + 1);
  }

  const tally = [...counted].map(([playerId, count]) => ({ playerId, count })).sort((a, b) => b.count - a.count || a.playerId.localeCompare(b.playerId));
  const max = tally[0]?.count ?? 0;
  const topCandidateIds = max > 0 ? tally.filter((t) => t.count === max).map((t) => t.playerId) : [];
  const tie = topCandidateIds.length > 1;
  return {
    tally,
    skipCount,
    votedCount: seen.size,
    notVotedCount: voters.size - seen.size,
    topCandidateIds,
    tie,
    mostSkipped: skipCount > max && max > 0,
    autoDecision: topCandidateIds.length === 0 ? null : tie ? undefined : topCandidateIds[0],
  };
}
