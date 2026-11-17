import { STAFF_COOKIE, STAFF_SESSION_TTL_MS } from "@/lib/shared/constants";
import { staffLoginSchema } from "@/lib/shared/validation";
import { clientIp } from "@/lib/server/auth/guards";
import { setSessionCookie } from "@/lib/server/auth/session";
import { staffMe } from "@/lib/server/dto";
import { json, readJson, route } from "@/lib/server/errors";
import { userAgent } from "@/lib/server/http";
import { staffLogin } from "@/lib/server/services/staff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/staff/login { name, pin } */
export const POST = route(async (req) => {
  const input = staffLoginSchema.parse(await readJson(req));
  const { staff, token } = await staffLogin(input, { ip: clientIp(req), userAgent: userAgent(req) });
  const res = json({ staff: staffMe(staff) });
  setSessionCookie(res, STAFF_COOKIE, token, STAFF_SESSION_TTL_MS);
  return res;
});
