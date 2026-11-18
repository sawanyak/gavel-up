import * as callRoute from "@/app/api/gm/meetings/route";
import * as openRoute from "@/app/api/gm/meetings/[id]/open-voting/route";
import * as closeRoute from "@/app/api/gm/meetings/[id]/close-voting/route";
import * as decideRoute from "@/app/api/gm/meetings/[id]/decide/route";
import * as revealRoute from "@/app/api/gm/meetings/[id]/reveal-results/route";
import * as confirmRoute from "@/app/api/gm/meetings/[id]/confirm/route";
import * as resumeRoute from "@/app/api/gm/meetings/[id]/resume/route";
import * as voteRoute from "@/app/api/player/votes/route";
import * as predictRoute from "@/app/api/player/predictions/route";
import type { Client } from "../helpers";

export const meetingApi = (gm: Client) => ({
  call: (body: Record<string, unknown> = {}) => gm.call(callRoute.POST, { body }),
  open: (id: string, body: Record<string, unknown> = {}) => gm.call(openRoute.POST, { params: { id }, body }),
  close: (id: string) => gm.call(closeRoute.POST, { params: { id } }),
  decide: (id: string, teamId: string, eliminatePlayerId: string | null) => gm.call(decideRoute.POST, { params: { id }, body: { teamId, eliminatePlayerId } }),
  reveal: (id: string) => gm.call(revealRoute.POST, { params: { id } }),
  confirm: (id: string) => gm.call(confirmRoute.POST, { params: { id }, body: { confirm: "CONFIRM" } }),
  resume: (id: string) => gm.call(resumeRoute.POST, { params: { id } }),
});

/** Calls a meeting and opens voting. Returns the meeting id. */
export async function startVoting(gm: Client, durationSec = 120) {
  const api = meetingApi(gm);
  const c = await api.call();
  if (c.status !== 201) throw new Error(`call failed ${c.status} ${JSON.stringify(c.body)}`);
  const id = c.body.meeting.id as string;
  const o = await api.open(id, { durationSec });
  if (o.status !== 200) throw new Error(`open failed ${o.status} ${JSON.stringify(o.body)}`);
  return id;
}

export const vote = (c: Client, meetingId: string, targetId: string | null) => c.call(voteRoute.POST, { body: { meetingId, targetId } });
export const predict = (c: Client, meetingId: string, targetTeamId: string, targetPlayerId: string) =>
  c.call(predictRoute.POST, { body: { meetingId, targetTeamId, targetPlayerId } });
