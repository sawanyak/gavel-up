import { taskCreateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { gmTasksSnapshot } from "@/lib/server/dto";
import { json, readJson, route } from "@/lib/server/errors";
import { notModifiedIfCurrent } from "@/lib/server/http";
import { createTask } from "@/lib/server/services/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/gm/tasks?v= — task bank, assignment progress and the verification queue. */
export const GET = route(async (req) => {
  await requireGM(req);
  const game = await getActiveGame();
  return notModifiedIfCurrent(req, game.version) ?? json(await gmTasksSnapshot(game));
});

/** POST /api/gm/tasks — create a task (hidden until revealed). */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  const input = taskCreateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const task = await createTask(staff, game, input, clientIp(req));
  return json({ task: { id: String(task._id), title: task.title, points: task.points } }, { status: 201 });
});
