import { getGameByCode } from "@/lib/server/auth/guards";
import { publicGameInfo } from "@/lib/server/dto";
import { json, route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/public/game?code= — safe info for the register page (no auth). */
export const GET = route(async (req) => {
  const code = new URL(req.url).searchParams.get("code");
  const game = await getGameByCode(code ? code.slice(0, 20) : null);
  return json(await publicGameInfo(game));
});
