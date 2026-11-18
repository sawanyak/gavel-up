import type { z } from "zod";
import type { announcementCreateSchema } from "@/lib/shared/validation";
import { audit, bumpVersion } from "../audit";
import { assertNotArchived, staffActor } from "../auth/guards";
import { badRequest, notFound } from "../errors";
import { Announcement, Team, type AnnouncementDoc, type GameDoc, type StaffDoc } from "../models";

type AnnouncementInput = z.infer<typeof announcementCreateSchema>;

export async function createAnnouncement(staff: StaffDoc, game: GameDoc, input: AnnouncementInput, ip: string) {
  assertNotArchived(game);
  if (input.teamId && !(await Team.exists({ _id: input.teamId, gameId: game._id }))) throw badRequest("INVALID_TEAM", "Unknown team.");
  const a = await Announcement.create({
    gameId: game._id,
    text: input.text,
    level: input.level,
    teamId: input.teamId ?? null,
    pinned: input.pinned,
    createdBy: { id: staff._id, name: staff.name },
  });
  await bumpVersion(game._id);
  await audit({ gameId: game._id, actor: staffActor(staff), action: "ANNOUNCEMENT_CREATED", target: { type: "announcement", id: a._id }, after: input, ip });
  return a.toObject() as AnnouncementDoc;
}

export async function deleteAnnouncement(staff: StaffDoc, game: GameDoc, id: string, ip: string) {
  const a = await Announcement.findOneAndUpdate({ _id: id, gameId: game._id, deletedAt: null }, { $set: { deletedAt: new Date() } });
  if (!a) throw notFound("Announcement not found.");
  await bumpVersion(game._id);
  await audit({ gameId: game._id, actor: staffActor(staff), action: "ANNOUNCEMENT_DELETED", target: { type: "announcement", id: a._id }, before: { text: a.text }, ip });
}
