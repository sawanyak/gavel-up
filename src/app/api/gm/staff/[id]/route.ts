import { objectId, staffUpdateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { staffListItem } from "@/lib/server/dto";
import { json, readJson, route } from "@/lib/server/errors";
import { updateStaff } from "@/lib/server/services/staff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH /api/gm/staff/:id { name?, role?, teamIds?, pin?, active? } */
export const PATCH = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff: actor } = await requireGM(req);
  const input = staffUpdateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const updated = await updateStaff(actor, game, objectId.parse(params.id), input, clientIp(req));
  return json({ staff: staffListItem(updated) });
});
