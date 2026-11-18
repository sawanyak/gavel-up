import { objectId, taskRevealSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { revealTask } from "@/lib/server/services/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/tasks/:id/reveal { teamIds?, playerIds? } — show and assign. Safe to repeat. */
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const target = taskRevealSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const { task, assignmentsCreated, unpaired } = await revealTask(staff, game, objectId.parse(params.id), target, clientIp(req));
  return json({ task: { id: String(task._id), revealed: true }, assignmentsCreated, unpaired });
});
