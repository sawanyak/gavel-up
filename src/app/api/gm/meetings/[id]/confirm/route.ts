import { objectId, confirmMeetingSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { confirmMeeting } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { confirm: "CONFIRM" } — ghost the voted-out players and award vote points. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  confirmMeetingSchema.parse(await readJson(req)); // type-to-confirm guard
  const game = await getActiveGame();
  const result = await confirmMeeting(staff, game, objectId.parse(params.id), clientIp(req));
  return json({ meeting: { id: String(result.meeting._id), status: result.meeting.status }, eliminated: result.eliminated, awards: result.awards, alreadyDone: result.alreadyDone });
});
