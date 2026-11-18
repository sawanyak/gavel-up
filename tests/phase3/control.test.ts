import { describe, expect, it } from "vitest";
import * as kill from "@/app/api/staff/players/[id]/kill/route";
import * as revive from "@/app/api/gm/players/[id]/revive/route";
import * as investigate from "@/app/api/gm/players/[id]/investigations/route";
import * as playerState from "@/app/api/player/state/route";
import * as gmState from "@/app/api/gm/state/route";
import * as tmState from "@/app/api/tm/state/route";
import { AuditLog, Elimination, Game, Player } from "@/lib/server/models";
import { Client, GM, createStaffMember, fillTeams, loginStaff, setupGame, startGame } from "../helpers";

const killP = (c: Client, id: string, body: Record<string, unknown> = {}) => c.call(kill.POST, { params: { id }, body });

describe("Phase 3 · kills and revives", () => {
  it("a TM marks a kill in their own team: the player becomes a ghost everywhere", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    const [victim, mate] = ctx.players.filter((p) => p.team === "red");

    const r = await killP(tm, victim.id, { note: "sticker on back" });
    expect(r.status).toBe(200);
    expect(r.body.player.status).toBe("ghost");
    expect((await victim.client.call(playerState.GET)).body.me.status).toBe("ghost");
    const mates = (await mate.client.call(playerState.GET)).body.team.members;
    expect(mates.find((m: { id: string }) => m.id === victim.id).status).toBe("ghost");
    expect((await tm.call(tmState.GET)).body.teams[0].members.find((m: { id: string }) => m.id === victim.id).status).toBe("ghost");

    const elim = (await Elimination.findOne({ playerId: victim.id }).lean())!;
    expect(elim.cause).toBe("kill");
    expect(elim.note).toBe("sticker on back");
    expect(await AuditLog.countDocuments({ action: "PLAYER_KILLED" })).toBe(1);
  });

  it("a TM can't kill in another team; players can't call it at all", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    const blue = ctx.players.find((p) => p.team === "blue")!;
    const r = await killP(tm, blue.id);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("NOT_YOUR_TEAM");
    expect((await killP(ctx.players[0].client, blue.id)).status).toBe(401);
    expect((await Player.findById(blue.id).lean())!.status).toBe("alive");
  });

  it("killing a ghost is refused; double taps record one kill", async () => {
    const ctx = await startGame({ red: 3 });
    const v = ctx.players[0];
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => killP(ctx.gm, v.id)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409).every((r) => r.body.error.code === "ALREADY_GHOST")).toBe(true);
    expect(await Elimination.countDocuments()).toBe(1);
  });

  it("kills are refused before roles are revealed", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 2 });
    const gm = await loginStaff(GM.name, GM.pin);
    const p = (await Player.findOne().lean())!;
    const r = await killP(gm, String(p._id));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("INVALID_PHASE");
  });

  it("only a GM can revive, with a reason", async () => {
    const ctx = await startGame({ red: 3 });
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    const v = ctx.players[0];
    await killP(tm, v.id);
    expect((await tm.call(revive.POST, { params: { id: v.id }, body: { reason: "mistake" } })).status).toBe(403);
    expect((await ctx.gm.call(revive.POST, { params: { id: v.id }, body: {} })).status).toBe(400);
    expect((await ctx.gm.call(revive.POST, { params: { id: v.id }, body: { reason: "wrong person" } })).status).toBe(200);
    expect((await v.client.call(playerState.GET)).body.me.status).toBe("alive");
    const r = await ctx.gm.call(revive.POST, { params: { id: v.id }, body: { reason: "again" } });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("NOT_A_GHOST");
  });

  it("I24 kill → revive → kill: status correct, 3 audit entries, history kept", async () => {
    const ctx = await startGame({ red: 3 });
    const v = ctx.players[0];
    await killP(ctx.gm, v.id);
    await ctx.gm.call(revive.POST, { params: { id: v.id }, body: { reason: "wrong person" } });
    await killP(ctx.gm, v.id);
    expect((await Player.findById(v.id).lean())!.status).toBe("ghost");
    expect(await AuditLog.countDocuments({ action: { $in: ["PLAYER_KILLED", "PLAYER_REVIVED"] } })).toBe(3);
    const elims = await Elimination.find({ playerId: v.id }).sort({ createdAt: 1 }).lean();
    expect(elims).toHaveLength(2);
    expect(elims[0].revertedAt).not.toBeNull();
    expect(elims[0].revertReason).toBe("wrong person");
    expect(elims[1].revertedAt).toBeNull();
  });
});

describe("Phase 3 · detective log", () => {
  it("I18 the GM logs one question; the second is refused (limit 1)", async () => {
    const ctx = await startGame({ red: 4, blue: 4 });
    const det = ctx.byRole("detective", "red")[0];
    const imp = ctx.byRole("impostor", "blue")[0];
    const crew = ctx.byRole("crewmate", "red")[0];

    const r = await ctx.gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: imp.id } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ answerIsImpostor: true, remaining: 0 });

    const again = await ctx.gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: crew.id } });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("INVESTIGATION_LIMIT");
  });

  it("answers truthfully for a crewmate; the detective sees remaining + history as yes/no", async () => {
    const ctx = await startGame({ red: 4 });
    const det = ctx.byRole("detective")[0];
    const crew = ctx.byRole("crewmate")[0];
    const r = await ctx.gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: crew.id } });
    expect(r.body.answerIsImpostor).toBe(false);
    const me = (await det.client.call(playerState.GET)).body.me;
    expect(me.detective.remaining).toBe(0);
    expect(me.detective.used).toBe(1);
    expect(me.detective.history).toEqual([{ targetName: crew.name, answer: "no", at: expect.any(String) }]);
    // GM sees the log
    const log = (await ctx.gm.call(gmState.GET)).body.investigations;
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ detectiveName: det.name, targetName: crew.name, answerIsImpostor: false, recordedByName: GM.name });
  });

  it("5 simultaneous taps use only one question", async () => {
    const ctx = await startGame({ red: 4 });
    const det = ctx.byRole("detective")[0];
    const target = ctx.byRole("crewmate")[0];
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => ctx.gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: target.id } })));
    expect(rs.filter((r) => r.status === 201)).toHaveLength(1);
    expect((await Player.findById(det.id).lean())!.investigationsUsed).toBe(1);
  });

  it("validates: not a detective, self, ghost detective, TM access, configurable limit", async () => {
    const ctx = await startGame({ red: 4 });
    const det = ctx.byRole("detective")[0];
    const crew = ctx.byRole("crewmate");
    const notDet = await ctx.gm.call(investigate.POST, { params: { id: crew[0].id }, body: { targetPlayerId: crew[1].id } });
    expect(notDet.body.error.code).toBe("NOT_DETECTIVE");
    expect((await ctx.gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: det.id } })).status).toBe(400);

    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: crew[0].id } })).status).toBe(403);

    await Game.updateOne({ _id: ctx.game._id }, { $set: { "config.detectiveInvestigationLimit": 2 } });
    expect((await ctx.gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: crew[0].id } })).status).toBe(201);
    expect((await ctx.gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: crew[1].id } })).status).toBe(201);
    expect((await det.client.call(playerState.GET)).body.me.detective.history).toHaveLength(2);

    await killP(ctx.gm, det.id);
    await Game.updateOne({ _id: ctx.game._id }, { $set: { "config.detectiveInvestigationLimit": 5 } });
    const ghost = await ctx.gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: crew[0].id } });
    expect(ghost.body.error.code).toBe("DETECTIVE_IS_GHOST");
  });
});
