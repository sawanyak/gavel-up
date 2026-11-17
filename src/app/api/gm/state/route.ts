import { getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { gmSnapshot } from "@/lib/server/dto";
import { json, route } from "@/lib/server/errors";
import { notModifiedIfCurrent } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/gm/state?v= — full Game Master dashboard snapshot. */
export const GET = route(async (req) => {
  await requireGM(req);
  const game = await getActiveGame();
  return notModifiedIfCurrent(req, game.version) ?? json(await gmSnapshot(game));
});
