import { describe, expect, it } from "vitest";
import * as gmState from "@/app/api/gm/state/route";
import * as gmRegistration from "@/app/api/gm/registration/route";
import * as gmTeams from "@/app/api/gm/teams/route";
import * as gmStaff from "@/app/api/gm/staff/route";
import * as gmPlayer from "@/app/api/gm/players/[id]/route";
import * as gmQr from "@/app/api/gm/qr/route";
import * as tmState from "@/app/api/tm/state/route";
import * as playerState from "@/app/api/player/state/route";
import { Player } from "@/lib/server/models";
import { Client, GM, createStaffMember, loginStaff, registerPlayer, setupGame } from "../helpers";

const GM_ONLY = [
  { name: "gm/state", h: gmState.GET, opts: {} },
  { name: "gm/registration", h: gmRegistration.PATCH, opts: { method: "PATCH", body: { open: false } } },
  { name: "gm/teams", h: gmTeams.POST, opts: { body: { key: "orange", name: "Orange" } } },
  { name: "gm/staff GET", h: gmStaff.GET, opts: {} },
  { name: "gm/staff POST", h: gmStaff.POST, opts: { body: { name: "Hacker", role: "GM", pin: "123456" } } },
  { name: "gm/qr", h: gmQr.GET, opts: {} },
] as const;

describe("Phase 1 · permissions matrix", () => {
  it("anonymous users get 401 on every GM endpoint", async () => {
    await setupGame();
    for (const e of GM_ONLY) {
      const r = await new Client().call(e.h, e.opts);
      expect(r.status, e.name).toBe(401);
    }
  });

  it("players get 401 on every GM endpoint (player cookie is not a staff cookie)", async () => {
    const { byKey } = await setupGame();
    const { client } = await registerPlayer(byKey.red._id);
    for (const e of GM_ONLY) expect((await client.call(e.h, e.opts)).status, e.name).toBe(401);
  });

  it("Team Managers get 403 on every GM endpoint", async () => {
    const { byKey } = await setupGame();
    await createStaffMember("Red Manager", "222222", "TM", [byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    for (const e of GM_ONLY) expect((await tm.call(e.h, e.opts)).status, e.name).toBe(403);
    const { res } = await registerPlayer(byKey.red._id);
    const del = await tm.call(gmPlayer.DELETE, { method: "DELETE", params: { id: res.body.player.id }, body: { reason: "nope" } });
    expect(del.status).toBe(403);
  });

  it("staff cookie does not grant player access", async () => {
    await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    expect((await gm.call(playerState.GET)).status).toBe(401);
  });
});

describe("Phase 1 · live state & privacy", () => {
  it("GM sees registrations live (newest first) with team counts and phone numbers", async () => {
    const { byKey } = await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    const before = await gm.call(gmState.GET);
    expect(before.body.counts.registered).toBe(0);

    await registerPlayer(byKey.red._id, "First Person", "0771111111");
    await registerPlayer(byKey.red._id, "Second Person", "0772222222");
    await registerPlayer(byKey.blue._id, "Third Person", "0773333333");

    const after = await gm.call(gmState.GET, { query: { v: String(before.body.version) } });
    expect(after.status).toBe(200);
    expect(after.body.counts.registered).toBe(3);
    expect(after.body.registrations[0].name).toBe("Third Person");
    expect(after.body.registrations[0].phone).toBe("+94773333333");
    const red = after.body.teams.find((t: { key: string }) => t.key === "red");
    expect(red.playerCount).toBe(2);
    expect(after.body.staffOnline.map((s: { name: string }) => s.name)).toContain("Host One");
  });

  it("returns 304 when nothing changed and 200 after a change", async () => {
    const { byKey } = await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    const first = await gm.call(gmState.GET);
    const v = String(first.body.version);
    expect((await gm.call(gmState.GET, { query: { v } })).status).toBe(304);
    await registerPlayer(byKey.red._id);
    const changed = await gm.call(gmState.GET, { query: { v } });
    expect(changed.status).toBe(200);
    expect(changed.body.version).toBeGreaterThan(first.body.version);
  });

  it("player snapshot: own team members only, no phones, no roles", async () => {
    const { byKey } = await setupGame();
    const { client } = await registerPlayer(byKey.red._id, "Red One", "0771111111");
    await registerPlayer(byKey.red._id, "Red Two", "0772222222");
    await registerPlayer(byKey.blue._id, "Blue One", "0773333333");
    await Player.updateMany({}, { $set: { role: "impostor" } }); // simulate secret data present in DB

    const r = await client.call(playerState.GET);
    expect(r.status).toBe(200);
    const text = JSON.stringify(r.body);
    expect(r.body.team.members.map((m: { name: string }) => m.name).sort()).toEqual(["Red One", "Red Two"]);
    expect(text).not.toContain("Blue One");
    expect(text).not.toMatch(/\+94|077/);
    expect(text).not.toContain("impostor"); // roles not revealed → hidden even for self
    expect(r.body.me.role).toBeNull();
    expect(r.body.game.rolesRevealed).toBe(false);
  });

  it("TM snapshot: own team only, no phones, no roles", async () => {
    const { byKey } = await setupGame();
    await registerPlayer(byKey.red._id, "Red One", "0771111111");
    await registerPlayer(byKey.blue._id, "Blue One", "0773333333");
    await Player.updateMany({}, { $set: { role: "impostor" } });
    await createStaffMember("Red Manager", "222222", "TM", [byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    const r = await tm.call(tmState.GET);
    expect(r.status).toBe(200);
    expect(r.body.teams).toHaveLength(1);
    expect(r.body.teams[0].members.map((m: { name: string }) => m.name)).toEqual(["Red One"]);
    const text = JSON.stringify(r.body);
    expect(text).not.toContain("Blue One");
    expect(text).not.toMatch(/\+94|impostor/);
  });

  it("GM snapshot contains no player roles before the reveal", async () => {
    const { byKey } = await setupGame();
    await registerPlayer(byKey.red._id);
    await Player.updateMany({}, { $set: { role: "impostor" } });
    const gm = await loginStaff(GM.name, GM.pin);
    const body = (await gm.call(gmState.GET)).body;
    expect(body.registrations.every((r: object) => !("role" in r))).toBe(true);
    expect(JSON.stringify(body.registrations)).not.toContain("impostor");
  });
});
