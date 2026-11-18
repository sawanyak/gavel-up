import { objectId, decideSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { decideTeam } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { teamId, eliminatePlayerId|null } — break a tie or overrule to nobody. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const input = decideSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const result = await decideTeam(staff, game, objectId.parse(params.id), input.teamId, input.eliminatePlayerId, clientIp(req));
  return json({ meeting: { id: String(result._id), status: result.status } });
});
