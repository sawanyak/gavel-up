import { finalStartSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { startFinal } from "@/lib/server/services/final";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/final/start { confirm: "FINAL" } — PLAYING → FINAL (no meeting running). */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  finalStartSchema.parse(await readJson(req)); // type-to-confirm guard
  const game = await startFinal(staff, await getActiveGame(), clientIp(req));
  return json({ phase: game.phase });
});
