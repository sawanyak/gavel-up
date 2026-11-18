import { assignRandomRoleSchema, objectId } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { assignRandomRole } from "@/lib/server/services/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/teams/:id/assign-role { role } — promote a random alive crewmate. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const { role } = assignRandomRoleSchema.parse(await readJson(req));
  const game = await getActiveGame();
  return json(await assignRandomRole(staff, game, objectId.parse(params.id), role, clientIp(req)));
});
