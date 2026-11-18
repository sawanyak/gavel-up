import { announceWinnerSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { announceWinner } from "@/lib/server/services/final";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/final/announce-winner { winningTeamIds? } — step 4 (choice only for a GM_DECIDES tie). */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  const { winningTeamIds } = announceWinnerSchema.parse(await readJson(req));
  const f = await announceWinner(staff, await getActiveGame(), winningTeamIds, clientIp(req));
  return json({ winningTeamIds: f.winningTeamIds, tied: f.tied, impostorsWin: f.impostorsWin, impostorsVotedOut: f.impostorsVotedOut, threshold: f.threshold });
});
