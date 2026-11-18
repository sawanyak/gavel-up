import { objectId, taskUpdateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { deleteTask, updateTask } from "@/lib/server/services/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH /api/gm/tasks/:id — edit title, description, points, verification, ghosts. */
export const PATCH = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const input = taskUpdateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const task = await updateTask(staff, game, objectId.parse(params.id), input, clientIp(req));
  return json({ task: { id: String(task._id), title: task.title, points: task.points } });
});

/** DELETE /api/gm/tasks/:id — only before anyone was given it. */
export const DELETE = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const game = await getActiveGame();
  await deleteTask(staff, game, objectId.parse(params.id), clientIp(req));
  return new Response(null, { status: 204 });
});
