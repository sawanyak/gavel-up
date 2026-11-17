import { NextResponse } from "next/server";
import { objectId, teamUpdateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { teamInfo } from "@/lib/server/dto";
import { json, readJson, route } from "@/lib/server/errors";
import { deleteTeam, updateTeam } from "@/lib/server/services/staff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const input = teamUpdateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const team = await updateTeam(staff, game, objectId.parse(params.id), input, clientIp(req));
  return json({ team: teamInfo(team) });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const game = await getActiveGame();
  await deleteTeam(staff, game, objectId.parse(params.id), clientIp(req));
  return new NextResponse(null, { status: 204 });
});
