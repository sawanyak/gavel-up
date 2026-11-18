import { objectId, roleOverrideSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { overrideRole } from "@/lib/server/services/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/players/:id/role { role, reason } — GM override after reveal (audited). */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const { role, reason } = roleOverrideSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const { player, teamImpostors } = await overrideRole(staff, game, objectId.parse(params.id), role, reason, clientIp(req));
  return json({ player: { id: String(player._id), name: player.name, role: player.role }, teamImpostors });
});
