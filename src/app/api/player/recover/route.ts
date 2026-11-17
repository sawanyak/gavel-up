import { PLAYER_COOKIE, PLAYER_SESSION_TTL_MS } from "@/lib/shared/constants";
import { recoverSchema } from "@/lib/shared/validation";
import { clientIp } from "@/lib/server/auth/guards";
import { setSessionCookie } from "@/lib/server/auth/session";
import { json, readJson, route } from "@/lib/server/errors";
import { userAgent } from "@/lib/server/http";
import { recoverWithCode } from "@/lib/server/services/players";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/player/recover { gameCode?, phone, code } — log in on a new device. */
export const POST = route(async (req) => {
  const input = recoverSchema.parse(await readJson(req));
  const { player, token } = await recoverWithCode(input, { ip: clientIp(req), userAgent: userAgent(req) });
  const res = json({ player: { id: String(player._id), name: player.name } });
  setSessionCookie(res, PLAYER_COOKIE, token, PLAYER_SESSION_TTL_MS);
  return res;
});
