import { describe, expect, it } from "vitest";
import * as reveal from "@/app/api/gm/roles/reveal/route";
import * as roleOverride from "@/app/api/gm/players/[id]/role/route";
import * as assignRole from "@/app/api/gm/teams/[id]/assign-role/route";
import * as gmConfig from "@/app/api/gm/config/route";
import * as gmState from "@/app/api/gm/state/route";
import * as playerState from "@/app/api/player/state/route";
import { AuditLog, Player } from "@/lib/server/models";
import { GM, createStaffMember, loginStaff, registerPlayer, setupGame, fillTeams } from "../helpers";

const CONFIRM = { confirm: "REVEAL" };

describe("Phase 2 · late joiners", () => {
  it("get crewmate immediately; existing roles never change", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 5, blue: 5 });
    const gm = await loginStaff(GM.name, GM.pin);
    await gm.call(reveal.POST, { body: CONFIRM });
    const before = (await Player.find().select("+role").lean()).map((p) => `${p._id}:${p.role}`).sort();

    const { client } = await registerPlayer(byKey.red._id, "Late Lara");
    const view = (await client.call(playerState.GET)).body;
    expect(view.me.role).toBe("crewmate");
    expect(view.me.late).toBe(true);

    const after = (await Player.find({ name: { $ne: "Late Lara" } }).select("+role").lean()).map((p) => `${p._id}:${p.role}`).sort();
    expect(after).toEqual(before);
  });

  it("a team that was empty at reveal gets a warning once late joiners arrive, and the GM can add a random impostor", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 4 });
    const gm = await loginStaff(GM.name, GM.pin);
    await gm.call(reveal.POST, { body: CONFIRM });
    await fillTeams(byKey, { green: 4 });

    const s = (await gm.call(gmState.GET)).body;
    expect(s.roles.warnings.join(" ")).toMatch(/Green has no impostor/);

    const r = await gm.call(assignRole.POST, { params: { id: String(byKey.green._id) }, body: { role: "impostor" } });
    expect(r.status).toBe(200);
    expect(await Player.countDocuments({ teamId: byKey.green._id, role: "impostor" })).toBe(1);
    expect(await AuditLog.countDocuments({ action: "ROLE_RANDOM_ASSIGNED" })).toBe(1);
    const s2 = (await gm.call(gmState.GET)).body;
    expect(s2.roles.warnings.join(" ")).not.toMatch(/Green has no impostor/);
  });

  it("random assignment needs ≥2 alive crewmates and is GM-only", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 3 });
    const gm = await loginStaff(GM.name, GM.pin);
    await gm.call(reveal.POST, { body: CONFIRM });
    const r = await gm.call(assignRole.POST, { params: { id: String(byKey.red._id) }, body: { role: "impostor" } });
    expect(r.status).toBe(400); // only 1 crewmate left
    await createStaffMember("Red Manager", "222222", "TM", [byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(assignRole.POST, { params: { id: String(byKey.red._id) }, body: { role: "impostor" } })).status).toBe(403);
  });
});

describe("Phase 2 · GM role override", () => {
  it("changes a role with a reason, audited, and the player sees it", async () => {
    const { byKey } = await setupGame();
    const clients = await fillTeams(byKey, { red: 4 });
    const gm = await loginStaff(GM.name, GM.pin);
    await gm.call(reveal.POST, { body: CONFIRM });
    const crew = await Player.findOne({ role: "crewmate" }).lean();
    const r = await gm.call(roleOverride.POST, { params: { id: String(crew!._id) }, body: { role: "detective", reason: "swap requested by host" } });
    expect(r.status).toBe(200);
    expect(r.body.player.role).toBe("detective");
    const log = await AuditLog.findOne({ action: "ROLE_OVERRIDDEN" }).lean();
    expect(log!.before).toEqual({ role: "crewmate" });

    const views = await Promise.all(clients.red.map(async (c) => (await c.call(playerState.GET)).body));
    expect(views.find((v) => v.me.id === String(crew!._id))!.me.role).toBe("detective");
  });

  it("is rejected before reveal, without a reason, and for non-GMs", async () => {
    const { byKey } = await setupGame();
    const { res } = await registerPlayer(byKey.red._id, "Someone");
    const gm = await loginStaff(GM.name, GM.pin);
    const early = await gm.call(roleOverride.POST, { params: { id: res.body.player.id }, body: { role: "impostor", reason: "testing" } });
    expect(early.status).toBe(409);
    await fillTeams(byKey, { red: 3 });
    await gm.call(reveal.POST, { body: CONFIRM });
    expect((await gm.call(roleOverride.POST, { params: { id: res.body.player.id }, body: { role: "impostor" } })).status).toBe(400);
    expect((await gm.call(roleOverride.POST, { params: { id: res.body.player.id }, body: { role: "medic", reason: "x y z" } })).status).toBe(400);
    await createStaffMember("Red Manager", "222222", "TM", [byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(roleOverride.POST, { params: { id: res.body.player.id }, body: { role: "impostor", reason: "sneaky" } })).status).toBe(403);
  });
});

describe("Phase 2 · role settings", () => {
  it("GM can change impostors/detectives per team and per-team overrides before reveal", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 8, blue: 8 });
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(gmConfig.PATCH, {
      method: "PATCH",
      body: { detectivesPerTeam: 0, impostorOverrides: { [String(byKey.red._id)]: 2 } },
    });
    expect(r.status).toBe(200);
    const preview = (await gm.call(gmState.GET)).body.roles.counts;
    expect(preview.find((c: { teamName: string }) => c.teamName === "Red")).toMatchObject({ impostors: 2, detectives: 0 });
    expect(preview.find((c: { teamName: string }) => c.teamName === "Blue")).toMatchObject({ impostors: 1, detectives: 0 });

    await gm.call(reveal.POST, { body: CONFIRM });
    expect(await Player.countDocuments({ teamId: byKey.red._id, role: "impostor" })).toBe(2);
    expect(await Player.countDocuments({ role: "detective" })).toBe(0);
  });

  it("settings are locked after reveal, validated, and GM-only", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 3 });
    const gm = await loginStaff(GM.name, GM.pin);
    expect((await gm.call(gmConfig.PATCH, { method: "PATCH", body: { impostorsPerTeam: 9 } })).status).toBe(400);
    expect((await gm.call(gmConfig.PATCH, { method: "PATCH", body: { votingDurationSec: 10 } })).status).toBe(400); // unknown key
    expect((await gm.call(gmConfig.PATCH, { method: "PATCH", body: { impostorOverrides: { "aaaaaaaaaaaaaaaaaaaaaaaa": 1 } } })).status).toBe(400);
    await createStaffMember("Red Manager", "222222", "TM", [byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(gmConfig.PATCH, { method: "PATCH", body: { impostorsPerTeam: 2 } })).status).toBe(403);

    await gm.call(reveal.POST, { body: CONFIRM });
    const locked = await gm.call(gmConfig.PATCH, { method: "PATCH", body: { impostorsPerTeam: 2 } });
    expect(locked.status).toBe(409);
    expect(locked.body.error.code).toBe("CONFIG_LOCKED");
  });
});
