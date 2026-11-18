import { finalCompleteSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { completeGame } from "@/lib/server/services/final";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/final/complete { confirm: "FINISH" } — archive. Everything becomes read-only (423). */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  finalCompleteSchema.parse(await readJson(req)); // type-to-confirm guard
  const game = await completeGame(staff, await getActiveGame(), clientIp(req));
  return json({ phase: game.phase });
});
