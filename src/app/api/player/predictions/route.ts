import { predictionSchema } from "@/lib/shared/validation";
import { requirePlayer } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { makePrediction } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/player/predictions { meetingId, targetTeamId, targetPlayerId } — first teammate locks it. */
export const POST = route(async (req) => {
  const { player, game } = await requirePlayer(req);
  const input = predictionSchema.parse(await readJson(req));
  const p = await makePrediction(player, game, input.meetingId, input.targetTeamId, input.targetPlayerId);
  return json({ prediction: { id: String(p._id), targetTeamId: String(p.targetTeamId), targetPlayerId: String(p.targetPlayerId) } }, { status: 201 });
});
