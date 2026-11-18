import { objectId, reopenVotingSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { reopenVoting } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { extraSec } — reopen closed voting before results. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const input = reopenVotingSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const result = await reopenVoting(staff, game, objectId.parse(params.id), input.extraSec, clientIp(req));
  return json({ meeting: { id: String(result._id), status: result.status, votingEndsAt: result.votingEndsAt } });
});
