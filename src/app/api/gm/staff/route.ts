import { staffCreateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { staffListItem } from "@/lib/server/dto";
import { json, readJson, route } from "@/lib/server/errors";
import { Staff, type StaffDoc } from "@/lib/server/models";
import { createStaff } from "@/lib/server/services/staff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/gm/staff — list staff (never includes PIN hashes). */
export const GET = route(async (req) => {
  await requireGM(req);
  const staff = await Staff.find().sort({ role: 1, name: 1 }).lean<StaffDoc[]>();
  return json({ staff: staff.map(staffListItem) });
});

/** POST /api/gm/staff { name, role, teamIds, pin } */
export const POST = route(async (req) => {
  const { staff: actor } = await requireGM(req);
  const input = staffCreateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const created = await createStaff(actor, game, input, clientIp(req));
  return json({ staff: staffListItem(created) }, { status: 201 });
});
