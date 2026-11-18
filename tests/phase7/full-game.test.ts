import { describe, expect, it } from "vitest";
import * as reveal from "@/app/api/gm/roles/reveal/route";
import * as gmTasks from "@/app/api/gm/tasks/route";
import * as revealTask from "@/app/api/gm/tasks/[id]/reveal/route";
import * as complete from "@/app/api/player/tasks/[id]/complete/route";
import * as kill from "@/app/api/staff/players/[id]/kill/route";
import * as investigate from "@/app/api/gm/players/[id]/investigations/route";
import * as points from "@/app/api/staff/points/route";
import * as announce from "@/app/api/gm/announcements/route";
import * as playerState from "@/app/api/player/state/route";
import * as tmState from "@/app/api/tm/state/route";
import * as gmState from "@/app/api/gm/state/route";
import * as display from "@/app/api/public/display/route";
import * as health from "@/app/api/health/route";
import { Elimination, PointTransaction, Team, Vote } from "@/lib/server/models";
import { Client, GM, createStaffMember, fillTeams, loginStaff, setupGame } from "../helpers";
import { meetingApi, predict, vote } from "../phase4/meetingHelpers";
import { finalApi } from "../phase6/finalHelpers";

type P = { client: Client; id: string; name: string; team: string; role: string };

/** Presses a GM button twice at the same time (E4): both must succeed or be harmless, with one effect. */
async function twice<T extends { status: number }>(fn: () => Promise<T>) {
  const [a, b] = await Promise.all([fn(), fn()]);
  expect(a.status < 500 && b.status < 500).toBe(true);
  expect([a.status, b.status].some((s) => s >= 200 && s < 300)).toBe(true);
  return a.status < 300 ? a : b;
}

/**
 * Privacy sweep (plan I6): before the final reveal, no non-GM response may reveal anyone
 * else's role. Impostors may see allies; detectives only their own yes/no answers.
 */
async function sweep(players: P[], others: Client[], label: string) {
  for (const p of players) {
    const body = (await p.client.call(playerState.GET)).body;
    if (body.final?.impostorsRevealedAt) continue;
    const text = JSON.stringify({ ...body, me: { ...body.me, allies: undefined, role: undefined } });
    if (p.role !== "impostor") expect(text, `${label}: ${p.role} ${p.name}`).not.toContain('"impostor"');
    expect(text, `${label}: ${p.name}`).not.toMatch(/"role":"(impostor|detective|crewmate)"/);
    for (const m of body.team.members) expect(Object.keys(m).sort()).toEqual(["id", "name", "status"]);
  }
  for (const c of others) {
    const r = await c.call(c === others[0] ? tmState.GET : display.GET);
    const text = JSON.stringify(r.body);
    if (!r.body.final?.impostorsRevealedAt) expect(text, `${label}: staff/projector`).not.toMatch(/"(impostor|detective|crewmate)"|"role"/);
    expect(text).not.toMatch(/\+947\d{8}/);
  }
}

describe("Phase 7 · a whole game, start to finish (E1, E3, E4)", () => {
  it("3 teams × 5 players: reveal → tasks → kill → detective → points → meeting → predictions → final → archive", async () => {
    const ctx = await setupGame();
    const clientsByTeam = await fillTeams(ctx.byKey, { red: 5, blue: 5, green: 5 });
    const gm = await loginStaff(GM.name, GM.pin);
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const redTM = await loginStaff("Red Manager", "222222");
    const projector = new Client("10.9.9.9");
    const others = [redTM, projector];

    expect((await new Client().call(health.GET)).status).toBe(200);

    // Reveal roles — pressed twice.
    await twice(() => gm.call(reveal.POST, { body: { confirm: "REVEAL" } }));
    // Each player's role, taken from their own view.
    const players: P[] = [];
    for (const team of ["red", "blue", "green"]) {
      for (const c of clientsByTeam[team]) {
        const me = (await c.call(playerState.GET)).body.me;
        players.push({ client: c, id: me.id, name: me.name, team, role: me.role });
      }
    }
    expect(players.filter((p) => p.role === "impostor")).toHaveLength(3);
    expect(players.filter((p) => p.role === "detective")).toHaveLength(3);
    await sweep(players, others, "after reveal");

    // Tasks: an individual task for everyone (revealed twice → assigned once), all complete it.
    const task = await gm.call(gmTasks.POST, { body: { title: "Find someone born in your month", kind: "individual", points: 10 } });
    await twice(() => gm.call(revealTask.POST, { params: { id: task.body.task.id }, body: {} }));
    for (const p of players) {
      const [t] = (await p.client.call(playerState.GET)).body.tasks;
      await twice(() => p.client.call(complete.POST, { params: { id: t.assignmentId } }));
    }
    expect(await PointTransaction.countDocuments({ category: "task" })).toBe(15);
    await sweep(players, others, "after tasks");

    // A sticker kill in Red (by the TM), pressed twice → one elimination.
    const redCrew = players.filter((p) => p.team === "red" && p.role === "crewmate");
    const victim = redCrew[0];
    const k = await Promise.all([redTM.call(kill.POST, { params: { id: victim.id }, body: {} }), redTM.call(kill.POST, { params: { id: victim.id }, body: {} })]);
    expect(k.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await Elimination.countDocuments({ cause: "kill" })).toBe(1);

    // Detective asks once.
    const det = players.find((p) => p.team === "blue" && p.role === "detective")!;
    const blueImp = players.find((p) => p.team === "blue" && p.role === "impostor")!;
    expect((await gm.call(investigate.POST, { params: { id: det.id }, body: { targetPlayerId: blueImp.id } })).body.answerIsImpostor).toBe(true);

    // Manual award retried with the same key → once.
    const award = () => redTM.call(points.POST, { body: { teamId: String(ctx.byKey.red._id), amount: 20, reason: "Table topics" }, headers: { "idempotency-key": "full-game-award-1" } });
    await twice(award);
    await gm.call(announce.POST, { body: { text: "Emergency meeting in 5 minutes!" } });
    await sweep(players, others, "mid game");

    // E3: refreshing gives the same view (only the server clock differs).
    const s1 = (await players[1].client.call(playerState.GET)).body;
    const s2 = (await players[1].client.call(playerState.GET)).body;
    expect({ ...s1, serverTime: 0 }).toEqual({ ...s2, serverTime: 0 });

    // Meeting.
    const api = meetingApi(gm);
    const call = await twice(() => api.call());
    const meetingId = call.body.meeting.id;
    await twice(() => api.open(meetingId, { durationSec: 120 }));
    // Red: everyone alive votes for the Red impostor. Blue: a tie. Green: everyone skips.
    const redImp = players.find((p) => p.team === "red" && p.role === "impostor")!;
    for (const p of players.filter((x) => x.team === "red" && x.id !== redImp.id && x.id !== victim.id)) await vote(p.client, meetingId, redImp.id);
    expect((await vote(victim.client, meetingId, redImp.id)).status).toBe(403); // ghost
    const blues = players.filter((p) => p.team === "blue");
    await vote(blues[0].client, meetingId, blues[1].id);
    await vote(blues[1].client, meetingId, blues[0].id);
    for (const p of players.filter((x) => x.team === "green")) await vote(p.client, meetingId, null);
    // One Red prediction on Blue's impostor (correct) and one Green prediction on a Red crewmate (wrong).
    await predict(players.find((p) => p.team === "red" && p.id !== victim.id)!.client, meetingId, String(ctx.byKey.blue._id), blueImp.id);
    await predict(players.find((p) => p.team === "green")!.client, meetingId, String(ctx.byKey.red._id), redCrew[1].id);
    await sweep(players, others, "during voting");

    await twice(() => api.close(meetingId));
    expect((await api.reveal(meetingId)).body.error.code).toBe("TIE_UNRESOLVED");
    await api.decide(meetingId, String(ctx.byKey.blue._id), null); // GM: nobody in Blue
    await twice(() => api.reveal(meetingId));
    await twice(() => api.confirm(meetingId));
    await twice(() => api.resume(meetingId));
    expect(await Vote.countDocuments()).toBe(3 + 2 + 5);
    expect(await Elimination.countDocuments({ cause: "vote" })).toBe(1);
    await sweep(players, others, "after the meeting");

    // Final reveal: every step pressed twice.
    const f = finalApi(gm);
    await twice(() => f.start());
    await twice(() => f.revealImpostors());
    await twice(() => f.scorePredictions());
    await twice(() => f.leaderboard());
    const w = await twice(() => f.winner());
    expect(w.body.impostorsWin).toBe(true); // only 1 impostor voted out (< 2)
    expect(await PointTransaction.countDocuments({ category: "prediction" })).toBe(2);

    // Scores add up: ledger == cache, and the winner is the top of the frozen leaderboard.
    const teams = await Team.find().lean();
    for (const t of teams) {
      const sum = (await PointTransaction.find({ teamId: t._id }).lean()).reduce((s, x) => s + x.amount, 0);
      expect(t.score).toBe(sum);
    }
    const final = (await gm.call(gmState.GET)).body.final;
    expect(final.winningTeamIds).toContain(final.leaderboard[0].teamId);

    await twice(() => f.complete());
    // Every phone, the TM page and the projector show the identical stored result.
    const views = [
      ...(await Promise.all(players.map(async (p) => (await p.client.call(playerState.GET)).body.final))),
      (await redTM.call(tmState.GET)).body.final,
      (await projector.call(display.GET)).body.final,
    ];
    for (const v of views) expect({ ...v }).toEqual(views[0]);
    expect(views[0].completedAt).toBeTruthy();
  });
});
