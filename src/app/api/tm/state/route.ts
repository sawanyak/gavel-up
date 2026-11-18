import { getActiveGame, requireStaff } from "@/lib/server/auth/guards";
import { tmSnapshot } from "@/lib/server/dto";
import { json, route } from "@/lib/server/errors";
import { notModifiedIfCurrent } from "@/lib/server/http";
import { autoCloseIfExpired } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/tm/state?v= — Team Manager view: own team(s) only, no roles, no phones. */
export const GET = route(async (req) => {
  const { staff } = await requireStaff(req);
  const game = await autoCloseIfExpired(await getActiveGame());
  return notModifiedIfCurrent(req, game.version) ?? json(await tmSnapshot(game, staff));
});
