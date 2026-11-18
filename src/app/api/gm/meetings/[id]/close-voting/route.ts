import { objectId } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { closeVoting } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — close voting now and tally (idempotent). */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const game = await getActiveGame();
  const result = await closeVoting(game, objectId.parse(params.id), staff, clientIp(req));
  return json({ meeting: { id: String(result._id), status: result.status } });
});
