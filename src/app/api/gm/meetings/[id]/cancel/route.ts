import { objectId, cancelMeetingSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { cancelMeeting } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { reason } — cancel before voting closes; doesn't count as a meeting. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const input = cancelMeetingSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const result = await cancelMeeting(staff, game, objectId.parse(params.id), input.reason, clientIp(req));
  return json({ meeting: { id: String(result._id), status: result.status } });
});
