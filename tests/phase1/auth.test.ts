import { describe, expect, it } from "vitest";
import * as staffLogin from "@/app/api/staff/login/route";
import * as staffLogout from "@/app/api/staff/logout/route";
import * as staffMe from "@/app/api/staff/me/route";
import * as playerLogout from "@/app/api/player/logout/route";
import * as playerState from "@/app/api/player/state/route";
import * as gmPlayers from "@/app/api/gm/players/[id]/route";
import { Session, Staff } from "@/lib/server/models";
import { STAFF_COOKIE } from "@/lib/shared/constants";
import { Client, GM, loginStaff, registerPlayer, setupGame } from "../helpers";

describe("Phase 1 · staff authentication", () => {
  it("logs in with name + PIN (case/space-insensitive name)", async () => {
    await setupGame();
    const c = new Client();
    const r = await c.call(staffLogin.POST, { body: { name: "  host one ", pin: GM.pin } });
    expect(r.status).toBe(200);
    expect(r.body.staff.role).toBe("GM");
    expect(r.body.staff).not.toHaveProperty("pinHash");
    expect(r.setCookies[STAFF_COOKIE].httpOnly).toBe(true);
    const me = await c.call(staffMe.GET);
    expect(me.body.staff.name).toBe("Host One");
  });

  it("rejects a wrong PIN or unknown name with the same message", async () => {
    await setupGame();
    const a = await new Client().call(staffLogin.POST, { body: { name: GM.name, pin: "000000" } });
    const b = await new Client().call(staffLogin.POST, { body: { name: "Nobody", pin: "000000" } });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it("locks the account after 5 wrong PINs, even for the right PIN", async () => {
    await setupGame();
    const c = new Client();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await c.call(staffLogin.POST, { body: { name: GM.name, pin: "999999" } })).status);
    expect(statuses).toEqual([401, 401, 401, 401, 429]);
    const right = await c.call(staffLogin.POST, { body: { name: GM.name, pin: GM.pin } });
    expect(right.status).toBe(429);
    expect(right.body.error.code).toBe("LOCKED");
  });

  it("lock expires and a successful login resets the counter", async () => {
    await setupGame();
    await Staff.updateOne({}, { $set: { lockedUntil: new Date(Date.now() - 1000), failedAttempts: 4 } });
    expect((await new Client().call(staffLogin.POST, { body: { name: GM.name, pin: GM.pin } })).status).toBe(200);
    const s = await Staff.findOne().lean();
    expect(s!.failedAttempts).toBe(0);
  });

  it("logout revokes the session server-side", async () => {
    await setupGame();
    const c = await loginStaff(GM.name, GM.pin);
    const token = c.cookies[STAFF_COOKIE];
    expect((await c.call(staffLogout.POST, { method: "POST" })).status).toBe(204);
    // Even if someone kept the old cookie value, it no longer works.
    const thief = new Client();
    thief.cookies[STAFF_COOKIE] = token;
    expect((await thief.call(staffMe.GET)).status).toBe(401);
  });

  it("deactivated staff are rejected on their next request", async () => {
    await setupGame();
    const c = await loginStaff(GM.name, GM.pin);
    await Staff.updateOne({}, { $set: { active: false } });
    const r = await c.call(staffMe.GET);
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("STAFF_INACTIVE");
  });

  it("stores only a hash of session tokens", async () => {
    await setupGame();
    const c = await loginStaff(GM.name, GM.pin);
    const s = await Session.findOne({ subjectType: "staff" }).lean();
    expect(s!.tokenHash).not.toBe(c.cookies[STAFF_COOKIE]);
    expect(s!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("Phase 1 · player sessions", () => {
  it("player state requires a session", async () => {
    await setupGame();
    const r = await new Client().call(playerState.GET);
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("SESSION_EXPIRED");
  });

  it("a forged cookie is rejected", async () => {
    await setupGame();
    const c = new Client();
    c.cookies.gu_player = "forged-token-value-that-is-long-enough-xxxxxxxx";
    expect((await c.call(playerState.GET)).status).toBe(401);
  });

  it("expired sessions are rejected", async () => {
    const { byKey } = await setupGame();
    const { client } = await registerPlayer(byKey.red._id);
    await Session.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await client.call(playerState.GET)).status).toBe(401);
  });

  it("player logout ends the session", async () => {
    const { byKey } = await setupGame();
    const { client } = await registerPlayer(byKey.red._id);
    expect((await client.call(playerLogout.POST, { method: "POST" })).status).toBe(204);
    expect((await client.call(playerState.GET)).status).toBe(401);
  });

  it("a player removed directly in the DB (session still live) gets 410 PLAYER_REMOVED", async () => {
    const { byKey } = await setupGame();
    const { client } = await registerPlayer(byKey.red._id);
    await (await import("@/lib/server/models")).Player.updateMany({}, { $set: { removedAt: new Date() } });
    const r = await client.call(playerState.GET);
    expect(r.status).toBe(410);
    expect(r.body.error.code).toBe("PLAYER_REMOVED");
    expect((await client.call(playerState.GET)).status).toBe(401); // and the session is now revoked
  });

  it("removing a player via the GM API revokes their session immediately", async () => {
    const { byKey } = await setupGame();
    const { client, res } = await registerPlayer(byKey.red._id, "Junk Entry");
    const gm = await loginStaff(GM.name, GM.pin);
    const del = await gm.call(gmPlayers.DELETE, { method: "DELETE", params: { id: res.body.player.id }, body: { reason: "duplicate" } });
    expect(del.status).toBe(204);
    const r = await client.call(playerState.GET);
    expect(r.status).toBe(401); // session already revoked
    expect(await Session.countDocuments({ subjectType: "player", revokedAt: null })).toBe(0);
  });
});
