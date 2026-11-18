import { describe, expect, it } from "vitest";
import * as reveal from "@/app/api/gm/roles/reveal/route";
import * as playerState from "@/app/api/player/state/route";
import * as tmState from "@/app/api/tm/state/route";
import * as publicGame from "@/app/api/public/game/route";
import * as register from "@/app/api/player/register/route";
import { Game, Player } from "@/lib/server/models";
import { Client, GM, createStaffMember, loginStaff, setupGame, fillTeams } from "../helpers";

async function revealedGame(perTeam = { red: 5, blue: 5, green: 4 }) {
  const ctx = await setupGame();
  const clients = await fillTeams(ctx.byKey, perTeam);
  const gm = await loginStaff(GM.name, GM.pin);
  expect((await gm.call(reveal.POST, { body: { confirm: "REVEAL" } })).status).toBe(200);
  const all = Object.values(clients).flat();
  const views = await Promise.all(all.map(async (c) => ({ c, body: (await c.call(playerState.GET)).body })));
  return { ...ctx, gm, views };
}

describe("Phase 2 · role privacy", () => {
  it("before reveal, nobody (not even the player) sees a role", async () => {
    const { byKey } = await setupGame();
    const [c] = (await fillTeams(byKey, { red: 3 })).red;
    const body = (await c.call(playerState.GET)).body;
    expect(body.me.role).toBeNull();
    expect(body.me.allies).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/impostor|detective"|crewmate/);
  });

  it("each player sees exactly their own role, matching the database", async () => {
    const { views } = await revealedGame();
    for (const v of views) {
      const db = await Player.findById(v.body.me.id).select("+role").lean();
      expect(v.body.me.role).toBe(db!.role);
    }
  });

  it("a crewmate's response contains no other role information at all", async () => {
    const { views } = await revealedGame();
    const crew = views.filter((v) => v.body.me.role === "crewmate");
    expect(crew.length).toBeGreaterThan(0);
    for (const v of crew) {
      const text = JSON.stringify(v.body);
      expect(text).not.toContain("impostor");
      expect(text).not.toContain("detective\"");
      expect(v.body.me.allies).toBeUndefined();
      expect(v.body.me.detective).toBeUndefined();
      // teammates are listed without roles
      for (const m of v.body.team.members) expect(Object.keys(m).sort()).toEqual(["id", "name", "status"]);
    }
  });

  it("impostors see all OTHER impostors (across teams), and only impostors", async () => {
    const { views } = await revealedGame();
    const imps = views.filter((v) => v.body.me.role === "impostor");
    expect(imps).toHaveLength(3);
    const impIds = new Set(imps.map((v) => v.body.me.id));
    for (const v of imps) {
      const allyIds = v.body.me.allies.map((a: { id: string }) => a.id);
      expect(allyIds).toHaveLength(2);
      expect(allyIds).not.toContain(v.body.me.id);
      for (const id of allyIds) expect(impIds.has(id)).toBe(true);
      expect(v.body.me.allies[0]).toHaveProperty("teamName");
    }
  });

  it("detectives see their investigation allowance but no allies", async () => {
    const { views } = await revealedGame();
    const dets = views.filter((v) => v.body.me.role === "detective");
    expect(dets).toHaveLength(3);
    for (const v of dets) {
      expect(v.body.me.detective).toEqual({ limit: 1, used: 0, remaining: 1 });
      expect(v.body.me.allies).toBeUndefined();
      expect(JSON.stringify(v.body)).not.toContain("impostor");
    }
  });

  it("impostorsSeeEachOther=false hides the ally list", async () => {
    const ctx = await setupGame();
    await Game.updateOne({ _id: ctx.game._id }, { $set: { "config.impostorsSeeEachOther": false } });
    const clients = await fillTeams(ctx.byKey, { red: 4, blue: 4 });
    const gm = await loginStaff(GM.name, GM.pin);
    await gm.call(reveal.POST, { body: { confirm: "REVEAL" } });
    for (const c of Object.values(clients).flat()) {
      const b = (await c.call(playerState.GET)).body;
      expect(b.me.allies).toBeUndefined();
      expect(b.game.rules.alliesVisible).toBe(false);
    }
  });

  it("Team Manager and public views never include roles after reveal", async () => {
    const { byKey } = await revealedGame();
    await createStaffMember("Red Manager", "222222", "TM", [byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    const tmText = JSON.stringify((await tm.call(tmState.GET)).body);
    expect(tmText).not.toMatch(/impostor|detective|crewmate|"role"/);
    const pubText = JSON.stringify((await new Client().call(publicGame.GET)).body);
    expect(pubText).not.toMatch(/"(impostor|detective|crewmate)"|"role"/);
  });

  it("the registration response never includes the role, even for late joiners", async () => {
    const { byKey } = await revealedGame();
    const r = await new Client().call(register.POST, { body: { name: "Late Larry", phone: "0719998877", teamId: String(byKey.red._id) } });
    expect(r.status).toBe(201);
    expect(JSON.stringify(r.body)).not.toMatch(/crewmate|impostor|role/);
  });

  it("a removed impostor disappears from other impostors' ally lists", async () => {
    const { views, gm } = await revealedGame();
    const imps = views.filter((v) => v.body.me.role === "impostor");
    const gmPlayer = await import("@/app/api/gm/players/[id]/route");
    await gm.call(gmPlayer.DELETE, { method: "DELETE", params: { id: imps[0].body.me.id }, body: { reason: "left the event" } });
    const b = (await imps[1].c.call(playerState.GET)).body;
    expect(b.me.allies.map((a: { id: string }) => a.id)).not.toContain(imps[0].body.me.id);
  });
});
