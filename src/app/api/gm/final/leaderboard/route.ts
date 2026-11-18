import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { showLeaderboard } from "@/lib/server/services/final";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/final/leaderboard — step 3. Freezes the scores. */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  return json({ leaderboard: await showLeaderboard(staff, await getActiveGame(), clientIp(req)) });
});
