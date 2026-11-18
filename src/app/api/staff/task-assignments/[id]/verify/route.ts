import { objectId, taskVerifySchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireStaff } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { verifyAssignment } from "@/lib/server/services/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/staff/task-assignments/:id/verify { approve, reason? } — GM, or TM of the team. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireStaff(req);
  const { approve, reason } = taskVerifySchema.parse(await readJson(req));
  const game = await getActiveGame();
  const { assignment, alreadyDone } = await verifyAssignment(staff, game, objectId.parse(params.id), approve, reason, clientIp(req));
  return json({ assignment: { id: String(assignment._id), status: assignment.status }, alreadyDone });
});
