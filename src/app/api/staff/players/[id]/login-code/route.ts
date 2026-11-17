import { objectId } from "@/lib/shared/validation";
import { clientIp, requireStaff } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { issueLoginCode } from "@/lib/server/services/players";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/staff/players/:id/login-code — GM, or TM for own team. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireStaff(req);
  const { code, expiresAt } = await issueLoginCode(staff, objectId.parse(params.id), clientIp(req));
  return json({ code, expiresAt: expiresAt.toISOString() });
});
