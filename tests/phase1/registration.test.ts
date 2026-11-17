import { describe, expect, it } from "vitest";
import * as register from "@/app/api/player/register/route";
import * as playerState from "@/app/api/player/state/route";
import * as publicGame from "@/app/api/public/game/route";
import { Game, Player, AuditLog } from "@/lib/server/models";
import { PLAYER_COOKIE } from "@/lib/shared/constants";
import { Client, nextPhone, registerPlayer, setupGame } from "../helpers";

describe("Phase 1 · registration", () => {
  it("public game info lists teams and registration status without secrets", async () => {
    const { teams } = await setupGame();
    const r = await new Client().call(publicGame.GET);
    expect(r.status).toBe(200);
    expect(r.body.registrationOpen).toBe(true);
    expect(r.body.teams).toHaveLength(teams.length);
    expect(Object.keys(r.body.teams[0]).sort()).toEqual(["colorHex", "id", "key", "name", "order"]);
  });

  it("registers a player and sets a secure httpOnly session cookie", async () => {
    const { byKey } = await setupGame();
    const c = new Client();
    const r = await c.call(register.POST, { body: { name: "  Nimal  Perera ", phone: "077 123 4567", teamId: String(byKey.red._id) } });
    expect(r.status).toBe(201);
    expect(r.body.player.name).toBe("Nimal Perera");
    expect(r.body.player.team.key).toBe("red");
    expect(r.setCookies[PLAYER_COOKIE].httpOnly).toBe(true);
    expect(r.setCookies[PLAYER_COOKIE].value.length).toBeGreaterThan(30);

    const p = await Player.findOne({ name: "Nimal Perera" }).lean();
    expect(p!.phoneE164).toBe("+94771234567");
    expect(p!.status).toBe("alive");
    expect(p!.late).toBe(false);

    // Session works immediately.
    const s = await c.call(playerState.GET);
    expect(s.status).toBe(200);
    expect(s.body.me.name).toBe("Nimal Perera");
  });

  it("same device retrying the same registration is idempotent (200, no duplicate)", async () => {
    const { byKey } = await setupGame();
    const c = new Client();
    const body = { name: "Nimal", phone: "0771234567", teamId: String(byKey.red._id) };
    expect((await c.call(register.POST, { body })).status).toBe(201);
    const again = await c.call(register.POST, { body });
    expect(again.status).toBe(200);
    expect(again.body.created).toBe(false);
    expect(await Player.countDocuments()).toBe(1);
  });

  it("rejects the same phone from another device (impersonation / duplicate guard)", async () => {
    const { byKey } = await setupGame();
    await registerPlayer(byKey.red._id, "Nimal", "0771234567");
    const { res } = await registerPlayer(byKey.blue._id, "Someone Else", "+94 77 123 4567");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PHONE_ALREADY_REGISTERED");
    expect(await Player.countDocuments()).toBe(1);
  });

  it("rejects registration while closed", async () => {
    const { byKey } = await setupGame({ registrationOpen: false });
    const { res } = await registerPlayer(byKey.red._id);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("REGISTRATION_CLOSED");
  });

  it("rejects bad input with field errors", async () => {
    const { byKey } = await setupGame();
    const c = new Client();
    const bad = [
      { name: "A", phone: nextPhone(), teamId: String(byKey.red._id) },
      { name: "Valid Name", phone: "123", teamId: String(byKey.red._id) },
      { name: "Valid Name", phone: nextPhone(), teamId: "not-an-id" },
      { name: "Valid Name", phone: nextPhone() },
    ];
    for (const body of bad) {
      const r = await c.call(register.POST, { body });
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe("VALIDATION_ERROR");
    }
    const notJson = await c.call(register.POST, { method: "POST", rawBody: "{oops" });
    expect(notJson.status).toBe(400);
  });

  it("rejects a team that belongs to a different game", async () => {
    await setupGame({ code: "OTHER" });
    const other = await Game.findOne({ code: "OTHER" });
    const { byKey } = await setupGame({ code: "TEST" }); // TEST becomes active
    expect(other).toBeTruthy();
    const otherTeam = (await import("@/lib/server/models")).Team.findOne({ gameId: other!._id, key: "red" });
    const r = await new Client().call(register.POST, {
      body: { name: "Nimal", phone: nextPhone(), teamId: String((await otherTeam)!._id) },
    });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_TEAM");
    expect(byKey.red).toBeTruthy();
  });

  it("handles 40 concurrent registrations including 5 duplicate phones", async () => {
    const { teams } = await setupGame();
    const phones = Array.from({ length: 35 }, () => nextPhone());
    const dupes = phones.slice(0, 5);
    const all = [...phones, ...dupes];
    const results = await Promise.all(
      all.map((phone, i) => registerPlayer(teams[i % teams.length]._id, `Player ${String.fromCharCode(65 + (i % 26))}${i}`.replace(/\d/g, "x"), phone)),
    );
    const statuses = results.map((r) => r.res.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(35);
    expect(statuses.filter((s) => s === 409)).toHaveLength(5);
    expect(await Player.countDocuments()).toBe(35);
  });

  it("marks players registering after role reveal as late (and gives them crewmate)", async () => {
    const { game, byKey } = await setupGame();
    await Game.updateOne({ _id: game._id }, { $set: { rolesRevealedAt: new Date(), phase: "PLAYING" } });
    const { res, client } = await registerPlayer(byKey.green._id, "Late Comer");
    expect(res.status).toBe(201);
    const p = await Player.findOne({ name: "Late Comer" }).select("+role +roleSource").lean();
    expect(p!.late).toBe(true);
    expect(p!.role).toBe("crewmate");
    expect(p!.roleSource).toBe("late");
    const s = await client.call(playerState.GET);
    expect(s.body.me.late).toBe(true);
  });

  it("registration stays possible during gameplay when open", async () => {
    const { game, byKey } = await setupGame();
    await Game.updateOne({ _id: game._id }, { $set: { phase: "MEETING", rolesRevealedAt: new Date() } });
    expect((await registerPlayer(byKey.red._id)).res.status).toBe(201);
  });

  it("rejects registration once the game is completed", async () => {
    const { game, byKey } = await setupGame();
    await Game.updateOne({ _id: game._id }, { $set: { phase: "COMPLETED" } });
    const { res } = await registerPlayer(byKey.red._id);
    expect(res.status).toBe(423);
  });

  it("bumps the game version and writes an audit entry on registration", async () => {
    const { game, byKey } = await setupGame();
    await registerPlayer(byKey.red._id, "Audit Me");
    const after = await Game.findById(game._id).lean();
    expect(after!.version).toBeGreaterThan(game.version);
    expect(await AuditLog.countDocuments({ action: "PLAYER_REGISTERED" })).toBe(1);
  });

  it("rate-limits repeated attempts for the same phone", async () => {
    const { byKey } = await setupGame({ registrationOpen: false });
    const phone = nextPhone();
    // closed registration returns before rate limiting, so open it and hammer with a taken phone
    await Game.updateMany({}, { $set: { registrationOpen: true } });
    await registerPlayer(byKey.red._id, "First", phone);
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await registerPlayer(byKey.red._id, "Again", phone)).res.status);
    expect(codes.slice(0, 4).every((s) => s === 409)).toBe(true);
    expect(codes.at(-1)).toBe(429);
  });
});
