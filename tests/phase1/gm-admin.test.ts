import { describe, expect, it } from "vitest";
import * as gmRegistration from "@/app/api/gm/registration/route";
import * as gmTeams from "@/app/api/gm/teams/route";
import * as gmTeam from "@/app/api/gm/teams/[id]/route";
import * as gmStaff from "@/app/api/gm/staff/route";
import * as gmStaffOne from "@/app/api/gm/staff/[id]/route";
import * as gmPlayer from "@/app/api/gm/players/[id]/route";
import * as gmQr from "@/app/api/gm/qr/route";
import * as staffMe from "@/app/api/staff/me/route";
import { AuditLog, Game, Player, Staff, Team } from "@/lib/server/models";
import { Client, GM, loginStaff, registerPlayer, setupGame } from "../helpers";

describe("Phase 1 · GM: registration toggle", () => {
  it("opening registration moves SETUP → LOBBY and can be closed again", async () => {
    await setupGame({ registrationOpen: false });
    const gm = await loginStaff(GM.name, GM.pin);
    const open = await gm.call(gmRegistration.PATCH, { method: "PATCH", body: { open: true } });
    expect(open.status).toBe(200);
    expect(open.body).toEqual({ registrationOpen: true, phase: "LOBBY" });
    const close = await gm.call(gmRegistration.PATCH, { method: "PATCH", body: { open: false } });
    expect(close.body.registrationOpen).toBe(false);
    expect(close.body.phase).toBe("LOBBY");
    expect(await AuditLog.countDocuments({ action: { $in: ["REGISTRATION_OPENED", "REGISTRATION_CLOSED"] } })).toBe(2);
  });

  it("requires at least 2 teams to open", async () => {
    const { game } = await setupGame({ registrationOpen: false });
    await Team.deleteMany({ gameId: game._id, key: { $ne: "red" } });
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(gmRegistration.PATCH, { method: "PATCH", body: { open: true } });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("NOT_ENOUGH_TEAMS");
  });
});

describe("Phase 1 · GM: teams", () => {
  it("creates a team with the palette colour, rejects duplicate colours", async () => {
    await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(gmTeams.POST, { body: { key: "orange", name: "Orange" } });
    expect(r.status).toBe(201);
    expect(r.body.team.colorHex).toBe("#F07D0D");
    const dup = await gm.call(gmTeams.POST, { body: { key: "orange", name: "Orange 2" } });
    expect(dup.status).toBe(409);
    const badKey = await gm.call(gmTeams.POST, { body: { key: "gold", name: "Gold" } });
    expect(badKey.status).toBe(400);
  });

  it("renames / recolours a team", async () => {
    const { byKey } = await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(gmTeam.PATCH, { method: "PATCH", params: { id: String(byKey.purple._id) }, body: { key: "pink", name: "Pink" } });
    expect(r.status).toBe(200);
    expect(r.body.team).toMatchObject({ key: "pink", name: "Pink", colorHex: "#ED54BA" });
  });

  it("refuses to delete a team that has players; deletes an empty one", async () => {
    const { byKey } = await setupGame();
    await registerPlayer(byKey.red._id);
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(gmTeam.DELETE, { method: "DELETE", params: { id: String(byKey.red._id) } });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("TEAM_NOT_EMPTY");
    expect((await gm.call(gmTeam.DELETE, { method: "DELETE", params: { id: String(byKey.purple._id) } })).status).toBe(204);
    expect(await Team.countDocuments()).toBe(4);
  });
});

describe("Phase 1 · GM: staff accounts", () => {
  it("creates a Team Manager; list never exposes PIN hashes", async () => {
    const { byKey } = await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(gmStaff.POST, { body: { name: "Red Manager", role: "TM", teamIds: [String(byKey.red._id)], pin: "222222" } });
    expect(r.status).toBe(201);
    const list = await gm.call(gmStaff.GET);
    expect(list.body.staff).toHaveLength(2);
    expect(JSON.stringify(list.body)).not.toMatch(/pinHash|\$2[aby]\$/);
    // New TM can log in
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(staffMe.GET)).body.staff.role).toBe("TM");
  });

  it("a TM must have at least one team; duplicate names rejected", async () => {
    await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    expect((await gm.call(gmStaff.POST, { body: { name: "No Team", role: "TM", teamIds: [], pin: "222222" } })).status).toBe(400);
    expect((await gm.call(gmStaff.POST, { body: { name: "host one", role: "GM", pin: "222222" } })).status).toBe(409);
  });

  it("can't deactivate or demote the last active GM", async () => {
    await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    const me = (await Staff.findOne().lean())!;
    const r = await gm.call(gmStaffOne.PATCH, { method: "PATCH", params: { id: String(me._id) }, body: { active: false } });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("LAST_GM");
  });

  it("changing a PIN logs that person out everywhere", async () => {
    const { byKey } = await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    const created = await gm.call(gmStaff.POST, { body: { name: "Red Manager", role: "TM", teamIds: [String(byKey.red._id)], pin: "222222" } });
    const tm = await loginStaff("Red Manager", "222222");
    await gm.call(gmStaffOne.PATCH, { method: "PATCH", params: { id: created.body.staff.id }, body: { pin: "333333" } });
    expect((await tm.call(staffMe.GET)).status).toBe(401);
    expect((await new Client().call((await import("@/app/api/staff/login/route")).POST, { body: { name: "Red Manager", pin: "333333" } })).status).toBe(200);
  });
});

describe("Phase 1 · GM: player corrections", () => {
  it("renames and moves a player before roles are revealed", async () => {
    const { byKey } = await setupGame();
    const { res } = await registerPlayer(byKey.red._id, "Nimall");
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(gmPlayer.PATCH, { method: "PATCH", params: { id: res.body.player.id }, body: { name: "Nimal", teamId: String(byKey.blue._id) } });
    expect(r.status).toBe(200);
    const p = await Player.findById(res.body.player.id).lean();
    expect(p!.name).toBe("Nimal");
    expect(String(p!.teamId)).toBe(String(byKey.blue._id));
    expect(await AuditLog.countDocuments({ action: "PLAYER_UPDATED" })).toBe(1);
  });

  it("moving a player after role reveal needs explicit force", async () => {
    const { game, byKey } = await setupGame();
    const { res } = await registerPlayer(byKey.red._id);
    await Game.updateOne({ _id: game._id }, { $set: { rolesRevealedAt: new Date(), phase: "PLAYING" } });
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(gmPlayer.PATCH, { method: "PATCH", params: { id: res.body.player.id }, body: { teamId: String(byKey.blue._id) } });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("ROLES_ALREADY_ASSIGNED");
    const forced = await gm.call(gmPlayer.PATCH, { method: "PATCH", params: { id: res.body.player.id }, body: { teamId: String(byKey.blue._id), force: true } });
    expect(forced.status).toBe(200);
  });

  it("removing a junk registration frees the phone for the real person", async () => {
    const { byKey } = await setupGame();
    const { res, phone } = await registerPlayer(byKey.red._id, "Fake Person");
    const gm = await loginStaff(GM.name, GM.pin);
    const del = await gm.call(gmPlayer.DELETE, { method: "DELETE", params: { id: res.body.player.id }, body: { reason: "impersonation" } });
    expect(del.status).toBe(204);
    const real = await registerPlayer(byKey.red._id, "Real Person", phone);
    expect(real.res.status).toBe(201);
    const log = await AuditLog.findOne({ action: "PLAYER_REMOVED" }).lean();
    expect((log!.before as { phone: string }).phone).toBe("+94" + phone.slice(1));
  });

  it("removing twice → 404", async () => {
    const { byKey } = await setupGame();
    const { res } = await registerPlayer(byKey.red._id);
    const gm = await loginStaff(GM.name, GM.pin);
    await gm.call(gmPlayer.DELETE, { method: "DELETE", params: { id: res.body.player.id }, body: { reason: "dup" } });
    const again = await gm.call(gmPlayer.DELETE, { method: "DELETE", params: { id: res.body.player.id }, body: { reason: "dup" } });
    expect(again.status).toBe(404);
  });
});

describe("Phase 1 · GM: registration QR code", () => {
  it("returns a PNG and the encoded registration URL", async () => {
    await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    const png = await gm.call(gmQr.GET);
    expect(png.status).toBe(200);
    expect(png.headers.get("content-type")).toBe("image/png");
    const info = await gm.call(gmQr.GET, { query: { format: "json" } });
    expect(info.body.url).toBe("http://test.local/play/register?g=TEST");
  });

  it("uses the address the GM opened the page with (LAN IP / proxy host)", async () => {
    await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    const lan = await gm.call(gmQr.GET, { query: { format: "json" }, headers: { host: "192.168.1.23:3000" } });
    expect(lan.body.url).toBe("http://192.168.1.23:3000/play/register?g=TEST");
    const prod = await gm.call(gmQr.GET, {
      query: { format: "json" },
      headers: { "x-forwarded-host": "gavelup.vercel.app", "x-forwarded-proto": "https" },
    });
    expect(prod.body.url).toBe("https://gavelup.vercel.app/play/register?g=TEST");
  });

  it("PUBLIC_BASE_URL overrides the request host", async () => {
    await setupGame();
    const gm = await loginStaff(GM.name, GM.pin);
    process.env.PUBLIC_BASE_URL = "https://gavel.example.org/";
    try {
      const r = await gm.call(gmQr.GET, { query: { format: "json" }, headers: { host: "localhost:3000" } });
      expect(r.body.url).toBe("https://gavel.example.org/play/register?g=TEST");
    } finally {
      delete process.env.PUBLIC_BASE_URL;
    }
  });
});
