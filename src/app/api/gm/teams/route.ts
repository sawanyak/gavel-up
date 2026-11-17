import { teamCreateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { teamInfo } from "@/lib/server/dto";
import { json, readJson, route } from "@/lib/server/errors";
import { createTeam } from "@/lib/server/services/staff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/teams { key, name, order? } */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  const input = teamCreateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const team = await createTeam(staff, game, input, clientIp(req));
  return json({ team: teamInfo(team) }, { status: 201 });
});
