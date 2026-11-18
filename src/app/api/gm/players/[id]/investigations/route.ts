import { investigationSchema, objectId } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { recordInvestigation } from "@/lib/server/services/control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/gm/players/:detectiveId/investigations { targetPlayerId }
 * Logs the Detective's question and returns the true answer — to the GM only.
 */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const { targetPlayerId } = investigationSchema.parse(await readJson(req));
  const game = await getActiveGame();
  return json(await recordInvestigation(staff, game, objectId.parse(params.id), targetPlayerId, clientIp(req)), { status: 201 });
});
