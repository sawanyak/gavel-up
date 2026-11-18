import { killSchema, objectId } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireStaff } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { killPlayer } from "@/lib/server/services/control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/staff/players/:id/kill { note? } — GM, or the TM of the victim's team. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireStaff(req);
  const { note } = killSchema.parse(await readJson(req));
  const game = await getActiveGame();
  return json({ player: await killPlayer(staff, game, objectId.parse(params.id), note, clientIp(req)) });
});
