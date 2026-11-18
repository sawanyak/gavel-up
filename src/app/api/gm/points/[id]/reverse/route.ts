import { objectId, reverseSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { reverseTransaction } from "@/lib/server/services/scoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/points/:txId/reverse { reason } — cancels a transaction with an opposite one (once). */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const { reason } = reverseSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const { reversal, teamScore } = await reverseTransaction(staff, game, objectId.parse(params.id), reason, clientIp(req));
  return json({ reversal: { id: String(reversal._id), amount: reversal.amount }, teamScore }, { status: 201 });
});
