import { objectId } from "@/lib/shared/validation";
import { requirePlayer } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { completeTask } from "@/lib/server/services/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/player/tasks/:assignmentId/complete — mark done / confirm a paired task. Idempotent. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { player, game } = await requirePlayer(req);
  const { assignment, alreadyDone } = await completeTask(player, game, objectId.parse(params.id));
  return json({ assignment: { id: String(assignment._id), status: assignment.status }, alreadyDone });
});
