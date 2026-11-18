import { roleConfigSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { updateRoleConfig } from "@/lib/server/services/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH /api/gm/config — role settings (Phase 2). Locked after Reveal Roles. */
export const PATCH = route(async (req) => {
  const { staff } = await requireGM(req);
  const input = roleConfigSchema.parse(await readJson(req));
  const game = await getActiveGame();
  return json({ config: await updateRoleConfig(staff, game, input, clientIp(req)) });
});
