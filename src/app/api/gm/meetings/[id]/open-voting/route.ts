import { objectId, openVotingSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { openVoting } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { durationSec? } — open voting with a timer (CALLED → VOTING). */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const input = openVotingSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const result = await openVoting(staff, game, objectId.parse(params.id), input.durationSec, clientIp(req));
  return json({ meeting: { id: String(result._id), status: result.status, votingEndsAt: result.votingEndsAt } });
});
