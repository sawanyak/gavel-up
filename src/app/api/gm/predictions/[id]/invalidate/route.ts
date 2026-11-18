import { objectId, invalidateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { invalidatePrediction } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { reason } — remove a prediction before scoring; unlocks it for that team. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const input = invalidateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  await invalidatePrediction(staff, game, objectId.parse(params.id), input.reason, clientIp(req));
  return json({ ok: true });
});
