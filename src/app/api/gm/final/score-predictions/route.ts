import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { scoreFinalPredictions } from "@/lib/server/services/final";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/final/score-predictions — step 2, after the impostors are revealed. Idempotent. */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  return json({ results: await scoreFinalPredictions(staff, await getActiveGame(), clientIp(req)) });
});
