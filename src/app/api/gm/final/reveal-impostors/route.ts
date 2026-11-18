import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { revealImpostors } from "@/lib/server/services/final";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/final/reveal-impostors — step 1 of the final reveal. */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  return json({ impostors: await revealImpostors(staff, await getActiveGame(), clientIp(req)) });
});
