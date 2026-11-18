import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { recompute } from "@/lib/server/services/scoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/scores/recompute — rebuilds team scores from the ledger. */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  const game = await getActiveGame();
  return json(await recompute(staff, game, clientIp(req)));
});
