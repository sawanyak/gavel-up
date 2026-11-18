import { voteSchema } from "@/lib/shared/validation";
import { requirePlayer } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { castVote } from "@/lib/server/services/meeting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/player/votes { meetingId, targetId|null } — one final vote; retries return the same vote. */
export const POST = route(async (req) => {
  const { player, game } = await requirePlayer(req);
  const { meetingId, targetId } = voteSchema.parse(await readJson(req));
  const { vote, alreadyVoted } = await castVote(player, game, meetingId, targetId);
  return json(
    { vote: { targetId: vote.targetId ? String(vote.targetId) : null, createdAt: vote.createdAt }, alreadyVoted },
    { status: alreadyVoted ? 200 : 201 },
  );
});
