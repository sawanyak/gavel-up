import { objectId, invalidateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { invalidateVote } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { reason } — remove a vote before results; the voter may vote again. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const input = invalidateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  await invalidateVote(staff, game, objectId.parse(params.id), input.reason, clientIp(req));
  return json({ ok: true });
});
