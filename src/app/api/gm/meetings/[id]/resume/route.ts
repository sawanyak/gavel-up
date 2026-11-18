import { objectId } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { resumeGame } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — back to the game (RESOLVED → PLAYING). */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const game = await getActiveGame();
  const result = await resumeGame(staff, game, objectId.parse(params.id), clientIp(req));
  return json(result);
});
