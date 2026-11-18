import { idempotencyKeySchema, manualAwardSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireStaff } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { manualAward } from "@/lib/server/services/scoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/staff/points { teamId, amount, reason, activityTaskId?, earnedByPlayerId? }
 * Header `Idempotency-Key` (one per submit; retries reuse it). GM any team; TM own team within TM bounds.
 */
export const POST = route(async (req) => {
  const { staff } = await requireStaff(req);
  const key = idempotencyKeySchema.parse(req.headers.get("idempotency-key") ?? undefined);
  const input = manualAwardSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const { tx, created, teamScore } = await manualAward(staff, game, input, key, clientIp(req));
  return json(
    { transaction: { id: String(tx._id), teamId: String(tx.teamId), amount: tx.amount, reason: tx.reason }, teamScore, alreadyApplied: !created },
    { status: created ? 201 : 200 },
  );
});
