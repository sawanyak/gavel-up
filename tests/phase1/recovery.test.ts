import { describe, expect, it } from "vitest";
import * as loginCode from "@/app/api/staff/players/[id]/login-code/route";
import * as recover from "@/app/api/player/recover/route";
import * as playerState from "@/app/api/player/state/route";
import { LoginCode } from "@/lib/server/models";
import { Client, GM, createStaffMember, loginStaff, registerPlayer, setupGame } from "../helpers";

async function setup() {
  const { byKey } = await setupGame();
  const { client: oldDevice, res, phone } = await registerPlayer(byKey.red._id, "Nimal");
  const gm = await loginStaff(GM.name, GM.pin);
  return { byKey, oldDevice, playerId: res.body.player.id as string, phone, gm };
}

describe("Phase 1 · device recovery (staff-issued login codes)", () => {
  it("issues a 6-digit code and lets the player log in on a new device; old device is logged out", async () => {
    const { oldDevice, playerId, phone, gm } = await setup();
    const issued = await gm.call(loginCode.POST, { method: "POST", params: { id: playerId } });
    expect(issued.status).toBe(200);
    expect(issued.body.code).toMatch(/^\d{6}$/);

    const newDevice = new Client();
    const r = await newDevice.call(recover.POST, { body: { phone, code: issued.body.code } });
    expect(r.status).toBe(200);
    expect((await newDevice.call(playerState.GET)).body.me.name).toBe("Nimal");
    expect((await oldDevice.call(playerState.GET)).status).toBe(401);
  });

  it("a code works only once", async () => {
    const { playerId, phone, gm } = await setup();
    const { body } = await gm.call(loginCode.POST, { method: "POST", params: { id: playerId } });
    expect((await new Client().call(recover.POST, { body: { phone, code: body.code } })).status).toBe(200);
    const again = await new Client().call(recover.POST, { body: { phone, code: body.code } });
    expect(again.status).toBe(401);
    expect(again.body.error.code).toBe("INVALID_CODE");
  });

  it("concurrent use of the same code succeeds exactly once", async () => {
    const { playerId, phone, gm } = await setup();
    const { body } = await gm.call(loginCode.POST, { method: "POST", params: { id: playerId } });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => new Client().call(recover.POST, { body: { phone, code: body.code } })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  });

  it("expired codes are rejected", async () => {
    const { playerId, phone, gm } = await setup();
    const { body } = await gm.call(loginCode.POST, { method: "POST", params: { id: playerId } });
    await LoginCode.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await new Client().call(recover.POST, { body: { phone, code: body.code } })).status).toBe(401);
  });

  it("issuing a new code invalidates the previous one", async () => {
    const { playerId, phone, gm } = await setup();
    const first = await gm.call(loginCode.POST, { method: "POST", params: { id: playerId } });
    const second = await gm.call(loginCode.POST, { method: "POST", params: { id: playerId } });
    if (first.body.code !== second.body.code) {
      expect((await new Client().call(recover.POST, { body: { phone, code: first.body.code } })).status).toBe(401);
    }
    expect((await new Client().call(recover.POST, { body: { phone, code: second.body.code } })).status).toBe(200);
  });

  it("wrong code for the right phone fails, and brute force is rate-limited", async () => {
    const { playerId, phone, gm } = await setup();
    const { body } = await gm.call(loginCode.POST, { method: "POST", params: { id: playerId } });
    const wrong = body.code === "000000" ? "000001" : "000000";
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await new Client().call(recover.POST, { body: { phone, code: wrong } })).status);
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
    // Even the right code is blocked while rate-limited.
    expect((await new Client().call(recover.POST, { body: { phone, code: body.code } })).status).toBe(429);
  });

  it("unknown phone gets the same error as a wrong code (no account enumeration)", async () => {
    await setup();
    const r = await new Client().call(recover.POST, { body: { phone: "0719999999", code: "123456" } });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("INVALID_CODE");
  });

  it("a Team Manager can issue codes for their own team only", async () => {
    const { byKey, playerId } = await setup();
    const { res: blue } = await registerPlayer(byKey.blue._id, "Blue Player");
    await createStaffMember("Red Manager", "222222", "TM", [byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(loginCode.POST, { method: "POST", params: { id: playerId } })).status).toBe(200);
    const other = await tm.call(loginCode.POST, { method: "POST", params: { id: blue.body.player.id } });
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe("NOT_YOUR_TEAM");
  });

  it("players cannot issue codes", async () => {
    const { oldDevice, playerId } = await setup();
    expect((await oldDevice.call(loginCode.POST, { method: "POST", params: { id: playerId } })).status).toBe(401);
  });

  it("stores only a hash of the code", async () => {
    const { playerId, gm } = await setup();
    const { body } = await gm.call(loginCode.POST, { method: "POST", params: { id: playerId } });
    const doc = await LoginCode.findOne().lean();
    expect(doc!.codeHash).not.toContain(body.code);
  });
});
