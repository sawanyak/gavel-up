import { describe, expect, it } from "vitest";
import * as announce from "@/app/api/gm/announcements/route";
import * as announcement from "@/app/api/gm/announcements/[id]/route";
import * as playerState from "@/app/api/player/state/route";
import * as tmState from "@/app/api/tm/state/route";
import * as gmState from "@/app/api/gm/state/route";
import { createStaffMember, loginStaff, startGame } from "../helpers";

const texts = (body: { announcements: { text: string }[] }) => body.announcements.map((a) => a.text);

describe("Phase 3 · announcements", () => {
  it("everyone sees an all-players announcement; team announcements reach only that team", async () => {
    const ctx = await startGame({ red: 2, blue: 2 });
    expect((await ctx.gm.call(announce.POST, { body: { text: "Snacks are served!" } })).status).toBe(201);
    expect((await ctx.gm.call(announce.POST, { body: { text: "Red: meet at the stage", teamId: String(ctx.byKey.red._id), level: "alert" } })).status).toBe(201);

    const red = ctx.players.find((p) => p.team === "red")!;
    const blue = ctx.players.find((p) => p.team === "blue")!;
    expect(texts((await red.client.call(playerState.GET)).body)).toEqual(["Red: meet at the stage", "Snacks are served!"]);
    expect(texts((await blue.client.call(playerState.GET)).body)).toEqual(["Snacks are served!"]);

    await createStaffMember("Blue Manager", "333333", "TM", [ctx.byKey.blue._id]);
    const tm = await loginStaff("Blue Manager", "333333");
    expect(texts((await tm.call(tmState.GET)).body)).toEqual(["Snacks are served!"]);
    expect(texts((await ctx.gm.call(gmState.GET)).body)).toHaveLength(2);
  });

  it("deleting removes it from phones; pinned ones stay above newer ones", async () => {
    const ctx = await startGame({ red: 2 });
    const pinned = await ctx.gm.call(announce.POST, { body: { text: "Pinned rules", pinned: true } });
    for (let i = 1; i <= 6; i++) await ctx.gm.call(announce.POST, { body: { text: `News ${i}` } });
    const p = ctx.players[0].client;
    const list = texts((await p.call(playerState.GET)).body);
    expect(list[0]).toBe("Pinned rules");
    expect(list).toHaveLength(6); // pinned + latest 5

    expect((await ctx.gm.call(announcement.DELETE, { params: { id: pinned.body.announcement.id } })).status).toBe(204);
    expect(texts((await p.call(playerState.GET)).body)).not.toContain("Pinned rules");
  });

  it("GM only, 1–280 characters", async () => {
    const ctx = await startGame({ red: 2 });
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(announce.POST, { body: { text: "hi" } })).status).toBe(403);
    expect((await ctx.gm.call(announce.POST, { body: { text: "" } })).status).toBe(400);
    expect((await ctx.gm.call(announce.POST, { body: { text: "x".repeat(281) } })).status).toBe(400);
  });
});
