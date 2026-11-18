import { displaySchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { setDisplay } from "@/lib/server/services/display";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH /api/gm/display { screen } — switch the projector (only screens allowed right now). */
export const PATCH = route(async (req) => {
  const { staff } = await requireGM(req);
  const { screen } = displaySchema.parse(await readJson(req));
  return json(await setDisplay(staff, await getActiveGame(), screen, clientIp(req)));
});
