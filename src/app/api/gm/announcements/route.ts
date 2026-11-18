import { announcementCreateSchema } from "@/lib/shared/validation";
import { clientIp, getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, readJson, route } from "@/lib/server/errors";
import { createAnnouncement } from "@/lib/server/services/announcements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/gm/announcements { text, level, teamId?, pinned } */
export const POST = route(async (req) => {
  const { staff } = await requireGM(req);
  const input = announcementCreateSchema.parse(await readJson(req));
  const game = await getActiveGame();
  const a = await createAnnouncement(staff, game, input, clientIp(req));
  return json({ announcement: { id: String(a._id), text: a.text } }, { status: 201 });
});
