import { revealSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { revealRoles } from "@/lib/server/services/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/roles/reveal { confirm: "REVEAL" } — atomic & idempotent. */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  revealSchema.parse(await readJson(req));
  const game = await getActiveGame();
  return json(await revealRoles(staff, game, clientIp(req)));
});
