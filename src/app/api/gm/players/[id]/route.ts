import { NextResponse } from "next/server";
import { objectId, playerRemoveSchema, playerUpdateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { removePlayer, updatePlayer } from "@/lib/server/services/players";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: { id: string } };

/** PATCH /api/gm/players/:id { name?, teamId?, force? } */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const input = playerUpdateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const p = await updatePlayer(staff, game, objectId.parse(params.id), input, clientIp(req));
  return json({ player: { id: String(p._id), name: p.name, teamId: String(p.teamId) } });
});

/** DELETE /api/gm/players/:id { reason } — soft delete (junk/duplicate registration). */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const { reason } = playerRemoveSchema.parse(await readJson(req));
  const game = await getActiveGame();
  await removePlayer(staff, game, objectId.parse(params.id), reason, clientIp(req));
  return new NextResponse(null, { status: 204 });
});
