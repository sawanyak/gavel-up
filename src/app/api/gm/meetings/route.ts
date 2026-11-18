import { callMeetingSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { callMeeting } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/meetings { override? } — call an emergency meeting (PLAYING → MEETING). */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  const { override } = callMeetingSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const m = await callMeeting(staff, game, !!override, clientIp(req));
  return json({ meeting: { id: String(m._id), number: m.number, status: m.status } }, { status: 201 });
});
