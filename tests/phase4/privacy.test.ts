import { describe, expect, it } from "vitest";
import * as playerState from "@/app/api/player/state/route";
import * as tmState from "@/app/api/tm/state/route";
import * as publicGame from "@/app/api/public/game/route";
import { Client, createStaffMember, loginStaff, startGame } from "../helpers";
import { meetingApi, predict, startVoting, vote } from "./meetingHelpers";

describe("Phase 4 · meeting privacy", () => {
  it("during voting nobody but the GM sees vote choices, roles or predictions of other teams", async () => {
    const ctx = await startGame({ red: 4, blue: 4 });
    const id = await startVoting(ctx.gm);
    const blueId = String(ctx.byKey.blue._id);
    const blues = ctx.players.filter((p) => p.team === "blue");
    for (const p of ctx.players.filter((x) => x.team === "red")) {
      const others = ctx.players.filter((x) => x.team === "red" && x.id !== p.id);
      await vote(p.client, id, others[0].id);
    }
    await predict(ctx.players[0].client, id, blueId, blues[0].id);

    for (const p of ctx.players.filter((x) => x.role === "crewmate")) {
      const text = JSON.stringify((await p.client.call(playerState.GET)).body);
      expect(text).not.toContain("impostor");
      expect(text).not.toContain("Impostor"); // no results yet
      expect(text).not.toContain('"tally"'); // distribution hidden until results
    }
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect(JSON.stringify((await tm.call(tmState.GET)).body)).not.toMatch(/impostor|detective|crewmate|targetName|predict/i);
    expect(JSON.stringify((await new Client().call(publicGame.GET)).body)).not.toMatch(/"(impostor|detective|crewmate)"|"role"|meeting/);
  });

  it("after results, everyone learns only whether each voted-out player was the impostor", async () => {
    const ctx = await startGame({ red: 4, blue: 4 });
    const api = meetingApi(ctx.gm);
    const id = await startVoting(ctx.gm);
    const crew = ctx.byRole("crewmate", "red")[0];
    for (const p of ctx.players.filter((x) => x.team === "red" && x.id !== crew.id)) await vote(p.client, id, crew.id);
    await api.close(id);
    await api.reveal(id);
    const blue = ctx.byRole("crewmate", "blue")[0];
    const body = (await blue.client.call(playerState.GET)).body;
    const red = body.meeting.results.teams.find((t: { teamName: string }) => t.teamName === "Red");
    expect(red.eliminated).toEqual({ name: crew.name, wasImpostor: false });
    // Still no role words anywhere else in a crewmate's view.
    expect(JSON.stringify(body)).not.toContain("impostor");
  });
});
