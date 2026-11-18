import { getActiveGame } from "@/lib/server/auth/guards";
import { displaySnapshot } from "@/lib/server/dto";
import { json, route } from "@/lib/server/errors";
import { notModifiedIfCurrent, registrationUrl } from "@/lib/server/http";
import { autoCloseIfExpired } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/public/display?v= — projector snapshot. No login; safe data only. */
export const GET = route(async (req) => {
  const game = await autoCloseIfExpired(await getActiveGame());
  return notModifiedIfCurrent(req, game.version) ?? json(await displaySnapshot(game, registrationUrl(req, game.code)));
});
