import { describe, expect, it } from "vitest";
import * as gmTasks from "@/app/api/gm/tasks/route";
import * as revealTask from "@/app/api/gm/tasks/[id]/reveal/route";
import * as complete from "@/app/api/player/tasks/[id]/complete/route";
import * as kill from "@/app/api/staff/players/[id]/kill/route";
import * as investigate from "@/app/api/gm/players/[id]/investigations/route";
import * as announce from "@/app/api/gm/announcements/route";
import * as playerState from "@/app/api/player/state/route";
import * as tmState from "@/app/api/tm/state/route";
import * as publicGame from "@/app/api/public/game/route";
import { Client, createStaffMember, loginStaff, startGame } from "../helpers";

/** Runs every Phase 3 feature once, then checks nothing leaks to non-GM views. */
async function busyGame() {
  const ctx = await startGame({ red: 4, blue: 4 });
  for (const [kind, pairScope] of [["individual"], ["team"], ["paired", "cross_team"]] as const) {
    const t = await ctx.gm.call(gmTasks.POST, { body: { title: `Task ${kind}`, kind, ...(pairScope ? { pairScope } : {}) } });
    await ctx.gm.call(revealTask.POST, { params: { id: t.body.task.id }, body: {} });
  }
  for (const p of ctx.players) {
    for (const t of (await p.client.call(playerState.GET)).body.tasks) await p.client.call(complete.POST, { params: { id: t.assignmentId } });
  }
  const det = ctx.byRole("detective", "red")[0];
  const imp = ctx.byRole("impostor", "blue")[0];
  await ctx.gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: imp.id } });
  await ctx.gm.call(kill.POST, { params: { id: ctx.byRole("crewmate", "blue")[0].id }, body: {} });
  await ctx.gm.call(announce.POST, { body: { text: "Keep going, crew!" } });
  return { ...ctx, det };
}

describe("Phase 3 · privacy after tasks, kills and investigations", () => {
  it("crewmates' and the detective's views contain no impostor information", async () => {
    const ctx = await busyGame();
    for (const p of ctx.players.filter((x) => x.role !== "impostor")) {
      const body = (await p.client.call(playerState.GET)).body;
      const text = JSON.stringify(body);
      expect(text).not.toContain("impostor");
      if (p.role === "crewmate") expect(text).not.toContain('"detective"');
      for (const t of body.tasks) if (t.partner) expect(Object.keys(t.partner).sort()).toEqual(["colorHex", "name", "teamName"]);
      if (p.role === "crewmate") expect(body.me.detective).toBeUndefined();
    }
    // The detective learns the answer only as yes/no in their own history.
    const det = (await ctx.det.client.call(playerState.GET)).body.me.detective;
    expect(det.history[0].answer).toBe("yes");
  });

  it("TM and public views contain no roles or investigation results", async () => {
    const ctx = await busyGame();
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect(JSON.stringify((await tm.call(tmState.GET)).body)).not.toMatch(/impostor|detective|crewmate|answer/i);
    // Public info has rule keys like "detectiveInvestigationLimit", but never a role value.
    expect(JSON.stringify((await new Client().call(publicGame.GET)).body)).not.toMatch(/"(impostor|detective|crewmate)"|"role"|answer/);
  });

  it("TMs and players can't read the GM task view", async () => {
    const ctx = await busyGame();
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(gmTasks.GET)).status).toBe(403);
    expect((await ctx.players[0].client.call(gmTasks.GET)).status).toBe(401);
  });
});
