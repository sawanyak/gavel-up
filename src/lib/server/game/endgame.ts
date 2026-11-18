/**
 * Endgame outcome (plan §11.5). Pure and unit-tested.
 *
 *   impostorsWin   = impostorsVotedOut < threshold          (default threshold 2) [USER]
 *   leaderboard    = teams by score desc, then name asc
 *   winningTeamIds = every team with the top score
 *     tie + "SHARED"     → co-winners
 *     tie + "GM_DECIDES" → the GM must pick one of the tied teams
 */
export interface OutcomeTeam {
  teamId: string;
  name: string;
  score: number;
}

export type TieRule = "SHARED" | "GM_DECIDES";

export type Outcome =
  | { status: "ok"; winningTeamIds: string[]; tied: boolean; impostorsWin: boolean; impostorsVotedOut: number; threshold: number }
  | { status: "needs_gm_choice"; tiedTeamIds: string[] };

export function computeOutcome(
  teams: OutcomeTeam[],
  impostorsVotedOut: number,
  threshold: number,
  tieRule: TieRule,
  gmChoice?: string[],
): Outcome {
  const impostorsWin = impostorsVotedOut < threshold;
  if (teams.length === 0) return { status: "ok", winningTeamIds: [], tied: false, impostorsWin, impostorsVotedOut, threshold };
  const max = Math.max(...teams.map((t) => t.score));
  const top = teams
    .filter((t) => t.score === max)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => t.teamId);
  const tied = top.length > 1;
  if (tied && tieRule === "GM_DECIDES") {
    const pick = (gmChoice ?? []).filter((id) => top.includes(id));
    if (pick.length === 0) return { status: "needs_gm_choice", tiedTeamIds: top };
    return { status: "ok", winningTeamIds: pick, tied, impostorsWin, impostorsVotedOut, threshold };
  }
  return { status: "ok", winningTeamIds: top, tied, impostorsWin, impostorsVotedOut, threshold };
}
