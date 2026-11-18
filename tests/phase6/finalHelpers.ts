import * as start from "@/app/api/gm/final/start/route";
import * as revealImp from "@/app/api/gm/final/reveal-impostors/route";
import * as scorePred from "@/app/api/gm/final/score-predictions/route";
import * as board from "@/app/api/gm/final/leaderboard/route";
import * as winner from "@/app/api/gm/final/announce-winner/route";
import * as complete from "@/app/api/gm/final/complete/route";
import type { Client } from "../helpers";

export const finalApi = (gm: Client) => ({
  start: (confirm = "FINAL") => gm.call(start.POST, { body: { confirm } }),
  revealImpostors: () => gm.call(revealImp.POST),
  scorePredictions: () => gm.call(scorePred.POST),
  leaderboard: () => gm.call(board.POST),
  winner: (winningTeamIds?: string[]) => gm.call(winner.POST, { body: winningTeamIds ? { winningTeamIds } : {} }),
  complete: (confirm = "FINISH") => gm.call(complete.POST, { body: { confirm } }),
});
