import { registrationToggleSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { setRegistrationOpen } from "@/lib/server/services/staff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH /api/gm/registration { open } */
export const PATCH = route(async (req) => {
  const { staff } = await requireGM(req);
  const { open } = registrationToggleSchema.parse(await readJson(req));
  const game = await getActiveGame();
  return json(await setRegistrationOpen(staff, game, open, clientIp(req)));
});
