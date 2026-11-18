import { ledgerQuerySchema } from "@/lib/shared/validation";
import { getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { notModifiedIfCurrent } from "@/lib/server/http";
import { gmPointsSnapshot } from "@/lib/server/scoringDto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/gm/points?v=&teamId=&category=&limit= — leaderboard and the point ledger. */
export const GET = route(async (req) => {
  const { staff } = await requireGM(req);
  const url = new URL(req.url);
  const q = ledgerQuerySchema.parse({
    teamId: url.searchParams.get("teamId") || undefined,
    category: url.searchParams.get("category") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });
  const game = await getActiveGame();
  return notModifiedIfCurrent(req, game.version) ?? json(await gmPointsSnapshot(game, staff, q));
});
