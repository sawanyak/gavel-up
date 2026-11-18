import { exportQuerySchema } from "@/lib/shared/validation";
import { getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { route } from "@/lib/server/errors";
import { exportGame, toCsv } from "@/lib/server/services/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/gm/export?format=json|csv&table=players|transactions&includePhones=0|1
 * Full game backup (never session tokens or PIN hashes). Phone numbers only with includePhones=1.
 */
export const GET = route(async (req) => {
  await requireGM(req);
  const url = new URL(req.url);
  const q = exportQuerySchema.parse(Object.fromEntries(url.searchParams));
  const game = await getActiveGame();
  const data = await exportGame(game, q.includePhones === "1");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  if (q.format === "csv") {
    const body = toCsv(q.table === "players" ? data.playersTable : data.transactionsTable);
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gavelup-${game.code}-${q.table}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(JSON.stringify(data.full, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gavelup-${game.code}-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
