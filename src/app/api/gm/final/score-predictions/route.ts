import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { scorePredictions } from "@/lib/server/services/scoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/final/score-predictions — final reveal only. Idempotent (`pred:<id>`). */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  const game = await getActiveGame();
  return json(await scorePredictions(staff, game, clientIp(req)));
});
