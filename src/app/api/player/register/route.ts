import { PLAYER_COOKIE, PLAYER_SESSION_TTL_MS } from "@/lib/shared/constants";
import { registerSchema } from "@/lib/shared/validation";
import { clientIp, optionalPlayer } from "@/lib/server/auth/guards";
import { setSessionCookie } from "@/lib/server/auth/session";
import { json, readJson, route } from "@/lib/server/errors";
import { userAgent } from "@/lib/server/http";
import { registerPlayer } from "@/lib/server/services/players";
import { Team } from "@/lib/server/models";
import { teamInfo } from "@/lib/server/dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/player/register { gameCode?, name, phone, teamId } */
export const POST = route(async (req) => {
  const input = registerSchema.parse(await readJson(req));
  const existing = await optionalPlayer(req);
  const { player, token, created } = await registerPlayer(input, {
    ip: clientIp(req),
    userAgent: userAgent(req),
    existing,
  });
  const team = await Team.findById(player.teamId).lean();
  const res = json(
    { player: { id: String(player._id), name: player.name, team: team ? teamInfo(team) : null }, created },
    { status: created ? 201 : 200 },
  );
  if (token) setSessionCookie(res, PLAYER_COOKIE, token, PLAYER_SESSION_TTL_MS);
  return res;
});
