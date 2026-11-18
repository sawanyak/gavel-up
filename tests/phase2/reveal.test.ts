import { describe, expect, it } from "vitest";
import * as reveal from "@/app/api/gm/roles/reveal/route";
import * as gmState from "@/app/api/gm/state/route";
import * as gmRegistration from "@/app/api/gm/registration/route";
import { AuditLog, Game, Player } from "@/lib/server/models";
import { Client, GM, fillTeams, loginStaff, registerPlayer, setupGame } from "../helpers";

const CONFIRM = { confirm: "REVEAL" };

async function roleCounts() {
  const players = await Player.find({ removedAt: null }).select("+role teamId").lean();
  const byTeam: Record<string, Record<string, number>> = {};
  for (const p of players) {
    const t = String(p.teamId);
    byTeam[t] ??= {};
    byTeam[t][String(p.role)] = (byTeam[t][String(p.role)] ?? 0) + 1;
  }
  return { players, byTeam };
}

describe("Phase 2 · Reveal Roles", () => {
  it("assigns 1 impostor + 1 detective per team, moves to PLAYING, audits", async () => {
    const { byKey, game } = await setupGame();
    await fillTeams(byKey, { red: 6, blue: 5, green: 4 });
    const gm = await loginStaff(GM.name, GM.pin);

    const r = await gm.call(reveal.POST, { body: CONFIRM });
    expect(r.status).toBe(200);
    expect(r.body.alreadyRevealed).toBe(false);

    const { players, byTeam } = await roleCounts();
    expect(players.every((p) => p.role)).toBe(true);
    for (const key of ["red", "blue", "green"]) {
      expect(byTeam[String(byKey[key]._id)]).toMatchObject({ impostor: 1, detective: 1 });
    }
    const g = await Game.findById(game._id).lean();
    expect(g!.phase).toBe("PLAYING");
    expect(g!.rolesRevealedAt).toBeTruthy();
    expect(g!.revealLock).toBeNull();
    expect(await AuditLog.countDocuments({ action: "ROLES_REVEALED" })).toBe(1);
    // Response summary shows counts only — never names
    expect(JSON.stringify(r.body)).not.toMatch(/Player [A-Z]/);
  });

  it("requires typing REVEAL", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 3 });
    const gm = await loginStaff(GM.name, GM.pin);
    expect((await gm.call(reveal.POST, { body: {} })).status).toBe(400);
    expect((await gm.call(reveal.POST, { body: { confirm: "reveal now" } })).status).toBe(400);
    expect(await Player.countDocuments({ role: { $ne: null } })).toBe(0);
  });

  it("is idempotent: a second press changes nothing", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 5, blue: 5 });
    const gm = await loginStaff(GM.name, GM.pin);
    await gm.call(reveal.POST, { body: CONFIRM });
    const before = (await roleCounts()).players.map((p) => `${p._id}:${p.role}`).sort();
    const again = await gm.call(reveal.POST, { body: CONFIRM });
    expect(again.status).toBe(200);
    expect(again.body.alreadyRevealed).toBe(true);
    const after = (await roleCounts()).players.map((p) => `${p._id}:${p.role}`).sort();
    expect(after).toEqual(before);
  });

  it("10 concurrent presses (two GMs, double clicks) → exactly one allocation", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 6, blue: 6, green: 6 });
    const gm = await loginStaff(GM.name, GM.pin);
    const results = await Promise.all(Array.from({ length: 10 }, () => gm.call(reveal.POST, { body: CONFIRM })));
    const ok = results.filter((r) => r.status === 200);
    const inProgress = results.filter((r) => r.status === 409 && r.body.error.code === "REVEAL_IN_PROGRESS");
    expect(ok.length + inProgress.length).toBe(10);
    expect(ok.filter((r) => r.body.alreadyRevealed === false)).toHaveLength(1);
    expect(await AuditLog.countDocuments({ action: "ROLES_REVEALED" })).toBe(1);
    const { byTeam } = await roleCounts();
    for (const t of Object.values(byTeam)) expect(t).toMatchObject({ impostor: 1, detective: 1, crewmate: 4 });
  });

  it("players registering DURING the reveal still end up with a role", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 8, blue: 8 });
    const gm = await loginStaff(GM.name, GM.pin);
    await Promise.all([
      gm.call(reveal.POST, { body: CONFIRM }),
      ...Array.from({ length: 12 }, (_, i) => registerPlayer(byKey[i % 2 ? "red" : "blue"]._id, `Racer ${String.fromCharCode(65 + i)}`)),
    ]);
    const { players } = await roleCounts();
    expect(players).toHaveLength(28);
    expect(players.filter((p) => !p.role)).toHaveLength(0);
    // Still exactly one impostor per team: racers become crewmates (late joiners) or were included in the allocation
    const imps = players.filter((p) => p.role === "impostor");
    expect(imps).toHaveLength(2);
  });

  it("refuses to reveal before registration is opened (SETUP) and with nobody registered", async () => {
    await setupGame({ registrationOpen: false });
    const gm = await loginStaff(GM.name, GM.pin);
    const setup = await gm.call(reveal.POST, { body: CONFIRM });
    expect(setup.status).toBe(409);
    expect(setup.body.error.code).toBe("INVALID_PHASE");
    await gm.call(gmRegistration.PATCH, { method: "PATCH", body: { open: true } });
    const empty = await gm.call(reveal.POST, { body: CONFIRM });
    expect(empty.status).toBe(422);
    expect(empty.body.error.code).toBe("NO_PLAYERS");
    // the failed attempt must not leave the lock behind
    expect((await Game.findOne().lean())!.revealLock).toBeNull();
  });

  it("recovers from a stale lock left by a crashed request", async () => {
    const { byKey, game } = await setupGame();
    await fillTeams(byKey, { red: 4 });
    await Game.updateOne({ _id: game._id }, { $set: { revealLock: { by: game._id, at: new Date(Date.now() - 5 * 60_000) } } });
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(reveal.POST, { body: CONFIRM });
    expect(r.status).toBe(200);
    expect(r.body.alreadyRevealed).toBe(false);
  });

  it("a fresh lock held by someone else → 409 REVEAL_IN_PROGRESS, nothing assigned", async () => {
    const { byKey, game } = await setupGame();
    await fillTeams(byKey, { red: 4 });
    await Game.updateOne({ _id: game._id }, { $set: { revealLock: { by: game._id, at: new Date() } } });
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(reveal.POST, { body: CONFIRM });
    expect(r.status).toBe(409);
    expect(await Player.countDocuments({ role: { $ne: null } })).toBe(0);
  });

  it("empty teams are allowed but produce warnings; small teams get reduced roles", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 5, blue: 2 }); // green/yellow/purple empty
    const gm = await loginStaff(GM.name, GM.pin);
    const r = await gm.call(reveal.POST, { body: CONFIRM });
    expect(r.status).toBe(200);
    expect(r.body.warnings.join(" ")).toMatch(/Green has no players/);
    const blue = r.body.summary.find((s: { teamName: string }) => s.teamName === "Blue");
    expect(blue).toMatchObject({ impostors: 1, detectives: 0, crewmates: 1 });
  });

  it("only GMs can reveal", async () => {
    const { byKey } = await setupGame();
    const [p] = (await fillTeams(byKey, { red: 3 })).red;
    expect((await p.call(reveal.POST, { body: CONFIRM })).status).toBe(401);
    expect((await new Client().call(reveal.POST, { body: CONFIRM })).status).toBe(401);
    expect(await Player.countDocuments({ role: { $ne: null } })).toBe(0);
  });

  it("GM dashboard shows a preview before and real counts after", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 4, blue: 1 });
    const gm = await loginStaff(GM.name, GM.pin);
    const pre = (await gm.call(gmState.GET)).body.roles;
    expect(pre.revealedAt).toBeNull();
    expect(pre.counts.find((c: { teamName: string }) => c.teamName === "Red")).toMatchObject({ players: 4, impostors: 1, detectives: 1, crewmates: 2 });
    expect(pre.warnings.join(" ")).toMatch(/Blue/);

    await gm.call(reveal.POST, { body: CONFIRM });
    const post = (await gm.call(gmState.GET)).body;
    expect(post.roles.revealedAt).toBeTruthy();
    expect(post.registrations.every((r: { role: string | null }) => ["impostor", "detective", "crewmate"].includes(r.role!))).toBe(true);
    expect(post.roles.counts.find((c: { teamName: string }) => c.teamName === "Red")).toMatchObject({ impostors: 1, detectives: 1, crewmates: 2 });
  });
});
