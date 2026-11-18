import { requirePlayer } from "@/lib/server/auth/guards";
import { playerSnapshot } from "@/lib/server/dto";
import { json, route } from "@/lib/server/errors";
import { notModifiedIfCurrent } from "@/lib/server/http";
import { autoCloseIfExpired } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/player/state?v= — the player's private view (or 304). */
export const GET = route(async (req) => {
  const { game: current, player } = await requirePlayer(req);
  const game = await autoCloseIfExpired(current);
  return notModifiedIfCurrent(req, game.version) ?? json(await playerSnapshot(game, player));
});
