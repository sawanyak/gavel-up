import type { DisplayScreen, FinalState } from "@/lib/shared/types";
import { audit } from "../audit";
import { staffActor } from "../auth/guards";
import { conflict } from "../errors";
import { Game, Meeting, type GameDoc, type MeetingDoc, type StaffDoc } from "../models";

/**
 * Which projector screens make sense right now (plan §8.6). The GM can only switch to
 * these, so the projector can never show something before its authorised reveal.
 */
export async function availableScreens(game: GameDoc): Promise<DisplayScreen[]> {
  const f = (game.final ?? {}) as FinalState;
  const screens: DisplayScreen[] = ["LOBBY", "REGISTRATION", "RULES"];
  const meeting = game.activeMeetingId ? await Meeting.findById(game.activeMeetingId).select("status votingOpenedAt").lean<MeetingDoc>() : null;
  if (meeting && meeting.status !== "CANCELLED") {
    screens.push("MEETING");
    if (meeting.votingOpenedAt) screens.push("VOTING");
    if (meeting.status === "RESULTS" || meeting.status === "RESOLVED") screens.push("RESULTS");
  }
  // During the final reveal, scores stay hidden until the official leaderboard step.
  if (game.phase !== "FINAL" || f.leaderboardShownAt) screens.push("LEADERBOARD");
  if (game.phase === "FINAL" || game.phase === "COMPLETED") screens.push("FINAL");
  if (f.impostorsRevealedAt) screens.push("IMPOSTORS");
  if (f.winnerAnnouncedAt) screens.push("WINNER", "STATS");
  return screens;
}

export async function setDisplay(staff: StaffDoc, game: GameDoc, screen: DisplayScreen, ip: string) {
  const allowed = await availableScreens(game);
  if (!allowed.includes(screen)) throw conflict("SCREEN_NOT_AVAILABLE", `The ${screen.toLowerCase()} screen isn't available right now.`, { allowed });
  await Game.updateOne({ _id: game._id }, { $set: { display: { screen, updatedAt: new Date() } }, $inc: { version: 1 } });
  await audit({ gameId: game._id, actor: staffActor(staff), action: "DISPLAY_CHANGED", after: { screen }, ip });
  return { screen, available: allowed };
}

/**
 * The screen to actually show: the stored one if it's still allowed, otherwise a safe
 * fallback (e.g. RESULTS after the meeting is over → LEADERBOARD).
 */
export async function effectiveScreen(game: GameDoc): Promise<{ screen: DisplayScreen; available: DisplayScreen[] }> {
  const available = await availableScreens(game);
  const wanted = (game.display?.screen ?? "LOBBY") as DisplayScreen;
  if (available.includes(wanted)) return { screen: wanted, available };
  const fallback: DisplayScreen = available.includes("WINNER") ? "WINNER" : available.includes("LEADERBOARD") && game.rolesRevealedAt ? "LEADERBOARD" : game.registrationOpen ? "REGISTRATION" : "LOBBY";
  return { screen: fallback, available };
}
