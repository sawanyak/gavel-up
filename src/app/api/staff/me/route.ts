import { requireStaff } from "@/lib/server/auth/guards";
import { staffMe } from "@/lib/server/dto";
import { json, route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(async (req) => {
  const { staff } = await requireStaff(req);
  return json({ staff: staffMe(staff) });
});
