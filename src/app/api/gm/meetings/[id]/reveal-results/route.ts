import { objectId } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { revealResults } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — reveal who is eliminated per team (CLOSED → RESULTS). */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const game = await getActiveGame();
  const result = await revealResults(staff, game, objectId.parse(params.id), clientIp(req));
  return json({ meeting: { id: String(result._id), status: result.status } });
});
