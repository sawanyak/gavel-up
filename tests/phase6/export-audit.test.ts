import { describe, expect, it } from "vitest";
import * as exportRoute from "@/app/api/gm/export/route";
import * as auditRoute from "@/app/api/gm/audit/route";
import * as kill from "@/app/api/staff/players/[id]/kill/route";
import { toCsv } from "@/lib/server/services/export";
import { createStaffMember, loginStaff, registerPlayer, startGame } from "../helpers";

describe("Phase 6 · export", () => {
  it("JSON backup has the whole game but no PIN hashes, session tokens or (by default) phones", async () => {
    const ctx = await startGame({ red: 3, blue: 2 });
    const r = await ctx.gm.call(exportRoute.GET);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-disposition")).toMatch(/attachment; filename="gavelup-TEST-.*\.json"/);
    const text = JSON.stringify(r.body);
    expect(text).not.toMatch(/pinHash|tokenHash|codeHash|phoneE164|\+947/);
    expect(r.body.players).toHaveLength(5);
    expect(r.body.players.every((p: { role: string }) => ["impostor", "detective", "crewmate"].includes(p.role))).toBe(true);
    expect(r.body.includesPhones).toBe(false);

    const withPhones = await ctx.gm.call(exportRoute.GET, { query: { includePhones: "1" } });
    expect(withPhones.body.players[0].phoneE164).toMatch(/^\+94/);
  });

  it("CSV of players and transactions opens in Excel (BOM) and is safe from formula injection", async () => {
    const ctx = await startGame({ red: 2 });
    const r = await ctx.gm.call(exportRoute.GET, { query: { format: "csv", table: "players" } });
    expect(r.headers.get("content-type")).toMatch(/text\/csv/);
    const lines = (r.body as string).replace(/^﻿/, "").split("\r\n");
    expect(lines[0]).toBe("name,team,role,status,eliminationCause,late,removed,registeredAt");
    expect(lines).toHaveLength(3);
    expect(toCsv([{ a: "=HYPERLINK(1)", b: 'say "hi", ok' }])).toBe('﻿a,b\r\n\'=HYPERLINK(1),"say ""hi"", ok"');
  });

  it("is GM-only", async () => {
    const ctx = await startGame({ red: 2 });
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(exportRoute.GET)).status).toBe(403);
    expect((await ctx.players[0].client.call(exportRoute.GET)).status).toBe(401);
  });
});

describe("Phase 6 · audit log", () => {
  it("lists actions newest first, filters by action, and pages with `before`", async () => {
    const ctx = await startGame({ red: 4 });
    for (const p of ctx.players.slice(0, 3)) await ctx.gm.call(kill.POST, { params: { id: p.id }, body: {} });
    await registerPlayer(ctx.byKey.red._id, "Late Lou");

    const first = (await ctx.gm.call(auditRoute.GET, { query: { limit: "2" } })).body;
    expect(first.items).toHaveLength(2);
    expect(first.hasMore).toBe(true);
    expect(new Date(first.items[0].at) >= new Date(first.items[1].at)).toBe(true);

    const kills = (await ctx.gm.call(auditRoute.GET, { query: { action: "PLAYER_KILLED" } })).body.items;
    expect(kills).toHaveLength(3);
    expect(kills[0].actor.name).toBe("Host One");

    const page2 = (await ctx.gm.call(auditRoute.GET, { query: { limit: "2", before: first.next } })).body.items;
    expect(page2.every((i: { at: string }) => new Date(i.at) <= new Date(first.next))).toBe(true);

    expect((await ctx.players[0].client.call(auditRoute.GET)).status).toBe(401);
  });
});
