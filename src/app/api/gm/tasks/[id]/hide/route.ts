import { objectId } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { hideTask } from "@/lib/server/services/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/tasks/:id/hide — hide from players. Points already earned stay. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const game = await getActiveGame();
  const task = await hideTask(staff, game, objectId.parse(params.id), clientIp(req));
  return json({ task: { id: String(task._id), revealed: false } });
});
