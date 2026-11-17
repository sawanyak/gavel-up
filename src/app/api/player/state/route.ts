import { requirePlayer } from "@/lib/server/auth/guards";
import { playerSnapshot } from "@/lib/server/dto";
import { json, route } from "@/lib/server/errors";
import { notModifiedIfCurrent } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/player/state?v= — the player's private view (or 304). */
export const GET = route(async (req) => {
  const { game, player } = await requirePlayer(req);
  return notModifiedIfCurrent(req, game.version) ?? json(await playerSnapshot(game, player));
});
