import { objectId, reviveSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { revivePlayer } from "@/lib/server/services/control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/players/:id/revive { reason } — GM-only undo of a kill. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const { reason } = reviveSchema.parse(await readJson(req));
  const game = await getActiveGame();
  return json({ player: await revivePlayer(staff, game, objectId.parse(params.id), reason, clientIp(req)) });
});
