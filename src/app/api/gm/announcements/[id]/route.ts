import { objectId } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { route } from "@/lib/server/errors";
import { deleteAnnouncement } from "@/lib/server/services/announcements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** DELETE /api/gm/announcements/:id — remove from players' screens. */
export const DELETE = route<{ params: { id: string } }>(async (req, { params }) => {
  const { staff } = await requireGM(req);
  const game = await getActiveGame();
  await deleteAnnouncement(staff, game, objectId.parse(params.id), clientIp(req));
  return new Response(null, { status: 204 });
});
