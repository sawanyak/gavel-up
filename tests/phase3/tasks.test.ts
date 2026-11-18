import { describe, expect, it } from "vitest";
import * as gmTasks from "@/app/api/gm/tasks/route";
import * as gmTask from "@/app/api/gm/tasks/[id]/route";
import * as revealTask from "@/app/api/gm/tasks/[id]/reveal/route";
import * as hideTask from "@/app/api/gm/tasks/[id]/hide/route";
import * as complete from "@/app/api/player/tasks/[id]/complete/route";
import * as verify from "@/app/api/staff/task-assignments/[id]/verify/route";
import * as kill from "@/app/api/staff/players/[id]/kill/route";
import * as playerState from "@/app/api/player/state/route";
import * as tmState from "@/app/api/tm/state/route";
import { Game, Player, PointTransaction, TaskAssignment, Team } from "@/lib/server/models";
import { Client, GM, createStaffMember, fillTeams, loginStaff, registerPlayer, setupGame, startGame } from "../helpers";

type Ctx = Awaited<ReturnType<typeof startGame>>;

async function newTask(gm: Client, body: Record<string, unknown>) {
  const r = await gm.call(gmTasks.POST, { body: { title: "Find the gavel", ...body } });
  expect(r.status).toBe(201);
  return r.body.task.id as string;
}
const reveal = (gm: Client, id: string, body: Record<string, unknown> = {}) => gm.call(revealTask.POST, { params: { id }, body });
const tasksOf = async (c: Client) => (await c.call(playerState.GET)).body.tasks as { assignmentId: string; status: string; title: string; partner?: { name: string }; rejectReason: string | null }[];
const done = (c: Client, assignmentId: string) => c.call(complete.POST, { params: { id: assignmentId } });
const score = async (ctx: Ctx, key: string) => (await Team.findById(ctx.byKey[key]._id).lean())!.score;

describe("Phase 3 · task bank (GM)", () => {
  it("creates tasks with default points by kind; GM only; validates input", async () => {
    const ctx = await startGame();
    await newTask(ctx.gm, { kind: "individual" });
    await newTask(ctx.gm, { kind: "paired", title: "Talk to your partner" });
    const list = (await ctx.gm.call(gmTasks.GET)).body;
    expect(list.tasks.map((t: { points: number }) => t.points)).toEqual([10, 15]);
    expect(list.tasks.every((t: { revealed: boolean }) => !t.revealed)).toBe(true);

    expect((await ctx.gm.call(gmTasks.POST, { body: { title: "x", kind: "individual" } })).status).toBe(400);
    expect((await ctx.gm.call(gmTasks.POST, { body: { title: "Too many", kind: "individual", points: 500 } })).status).toBe(400);
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    const tm = await loginStaff("Red Manager", "222222");
    expect((await tm.call(gmTasks.POST, { body: { title: "Nope", kind: "individual" } })).status).toBe(403);
    expect((await ctx.players[0].client.call(gmTasks.GET)).status).toBe(401);
  });

  it("can't reveal tasks before roles are revealed", async () => {
    const { byKey } = await setupGame();
    await fillTeams(byKey, { red: 3 });
    const gm = await loginStaff(GM.name, GM.pin);
    const id = await newTask(gm, { kind: "individual" });
    const r = await reveal(gm, id);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("INVALID_PHASE");
  });

  it("hidden tasks are invisible to players; edit and delete rules", async () => {
    const ctx = await startGame();
    const id = await newTask(ctx.gm, { kind: "individual" });
    expect(await tasksOf(ctx.players[0].client)).toEqual([]);
    expect((await ctx.gm.call(gmTask.PATCH, { params: { id }, body: { points: 25, title: "Renamed task" } })).status).toBe(200);
    expect((await ctx.gm.call(gmTask.PATCH, { params: { id }, body: { kind: "team" } })).status).toBe(400); // kind is fixed

    await reveal(ctx.gm, id);
    const del = await ctx.gm.call(gmTask.DELETE, { params: { id } });
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe("TASK_HAS_ASSIGNMENTS");

    const unused = await newTask(ctx.gm, { kind: "individual", title: "Unused" });
    expect((await ctx.gm.call(gmTask.DELETE, { params: { id: unused } })).status).toBe(204);
  });
});

describe("Phase 3 · revealing and assigning", () => {
  it("individual task to everyone: one assignment per player; pressing again adds only late joiners", async () => {
    const ctx = await startGame({ red: 4, blue: 3 });
    const id = await newTask(ctx.gm, { kind: "individual" });
    const r = await reveal(ctx.gm, id);
    expect(r.status).toBe(200);
    expect(r.body.assignmentsCreated).toBe(7);
    for (const p of ctx.players) expect(await tasksOf(p.client)).toHaveLength(1);

    expect((await reveal(ctx.gm, id)).body.assignmentsCreated).toBe(0);
    const late = await registerPlayer(ctx.byKey.red._id, "Late Larry");
    expect((await reveal(ctx.gm, id)).body.assignmentsCreated).toBe(1);
    expect(await tasksOf(late.client)).toHaveLength(1);
  });

  it("can target specific teams or specific players", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const forRed = await newTask(ctx.gm, { kind: "individual", title: "Red only" });
    expect((await reveal(ctx.gm, forRed, { teamIds: [String(ctx.byKey.red._id)] })).body.assignmentsCreated).toBe(3);
    const blue = ctx.players.find((p) => p.team === "blue")!;
    expect(await tasksOf(blue.client)).toHaveLength(0);

    const forTwo = await newTask(ctx.gm, { kind: "individual", title: "Just two" });
    const two = ctx.players.slice(0, 2).map((p) => p.id);
    expect((await reveal(ctx.gm, forTwo, { playerIds: two })).body.assignmentsCreated).toBe(2);

    const team = await newTask(ctx.gm, { kind: "team", title: "Team photo" });
    expect((await reveal(ctx.gm, team, { playerIds: two })).status).toBe(400); // only individual tasks target players
  });

  it("paired tasks: same-team pairs share a team; cross-team pairs never do", async () => {
    const ctx = await startGame({ red: 4, blue: 4 });
    const same = await newTask(ctx.gm, { kind: "paired", pairScope: "same_team", title: "Same team chat" });
    expect((await reveal(ctx.gm, same)).body.assignmentsCreated).toBe(4);
    const cross = await newTask(ctx.gm, { kind: "paired", pairScope: "cross_team", title: "Cross team chat" });
    expect((await reveal(ctx.gm, cross)).body.assignmentsCreated).toBe(4);

    const team = new Map(ctx.players.map((p) => [p.id, p.team]));
    for (const a of await TaskAssignment.find().lean()) {
      const [x, y] = a.assigneeIds.map(String);
      const sameTeam = team.get(x) === team.get(y);
      expect(sameTeam).toBe(a.teamIds.length === 1);
    }
    for (const p of ctx.players) {
      const ts = await tasksOf(p.client);
      expect(ts).toHaveLength(2);
      expect(ts.every((t) => t.partner?.name)).toBe(true);
    }
  });

  it("ghosts are skipped when a task doesn't allow ghosts", async () => {
    const ctx = await startGame({ red: 4 });
    const victim = ctx.players[0];
    await ctx.gm.call(kill.POST, { params: { id: victim.id }, body: {} });
    const id = await newTask(ctx.gm, { kind: "individual", allowGhosts: false });
    expect((await reveal(ctx.gm, id)).body.assignmentsCreated).toBe(3);
  });

  it("activity tasks show to everyone without a Done button (no assignments)", async () => {
    const ctx = await startGame({ red: 2 });
    const id = await newTask(ctx.gm, { kind: "activity", title: "Table topics", points: 20 });
    expect((await reveal(ctx.gm, id)).body.assignmentsCreated).toBe(0);
    const s = (await ctx.players[0].client.call(playerState.GET)).body;
    expect(s.activities).toEqual([{ id, title: "Table topics", description: "", points: 20 }]);
    expect(s.tasks).toEqual([]);
  });
});

describe("Phase 3 · completing tasks", () => {
  it("individual: completing awards the team once, even with 20 simultaneous taps", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const id = await newTask(ctx.gm, { kind: "individual", points: 10 });
    await reveal(ctx.gm, id);
    const p = ctx.players.find((x) => x.team === "red")!;
    const [t] = await tasksOf(p.client);

    const results = await Promise.all(Array.from({ length: 20 }, () => done(p.client, t.assignmentId)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect((await tasksOf(p.client))[0].status).toBe("completed");
    expect(await PointTransaction.countDocuments({ category: "task" })).toBe(1);
    expect(await score(ctx, "red")).toBe(10);
    const tx = (await PointTransaction.findOne().lean())!;
    expect(tx.idempotencyKey).toBe(`task:${t.assignmentId}:team:${ctx.byKey.red._id}`);
    expect(String(tx.earnedByPlayerId)).toBe(p.id);
  });

  it("you can't complete someone else's task", async () => {
    const ctx = await startGame({ red: 3 });
    const id = await newTask(ctx.gm, { kind: "individual" });
    await reveal(ctx.gm, id);
    const [t] = await tasksOf(ctx.players[0].client);
    const r = await done(ctx.players[1].client, t.assignmentId);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("NOT_YOUR_TASK");
  });

  it("team task: any member completes it for the whole team; other teams can't", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    const id = await newTask(ctx.gm, { kind: "team", points: 20, title: "Team photo" });
    expect((await reveal(ctx.gm, id)).body.assignmentsCreated).toBe(2);
    const [r1, r2] = ctx.players.filter((p) => p.team === "red");
    const blue = ctx.players.find((p) => p.team === "blue")!;
    const [t] = await tasksOf(r1.client);
    expect((await done(blue.client, t.assignmentId)).status).toBe(403);
    expect((await done(r1.client, t.assignmentId)).status).toBe(200);
    expect((await tasksOf(r2.client))[0].status).toBe("completed");
    expect(await score(ctx, "red")).toBe(20);
    expect(await score(ctx, "blue")).toBe(0);
  });

  it("I21 paired: first confirm waits for the partner; second completes and awards each team once", async () => {
    const ctx = await startGame({ red: 2, blue: 2 });
    const id = await newTask(ctx.gm, { kind: "paired", pairScope: "cross_team", points: 15 });
    await reveal(ctx.gm, id);
    const a = ctx.players[0];
    const [t] = await tasksOf(a.client);
    const b = ctx.players.find((p) => p.name === t.partner!.name)!;
    expect(b.team).not.toBe(a.team);

    expect((await done(a.client, t.assignmentId)).body.assignment.status).toBe("awaiting_partner");
    expect(await PointTransaction.countDocuments()).toBe(0);
    const partnerView = (await tasksOf(b.client)).find((x) => x.assignmentId === t.assignmentId)!;
    expect(partnerView.status).toBe("awaiting_partner");
    // a confirming again changes nothing
    expect((await done(a.client, t.assignmentId)).body.alreadyDone).toBe(true);

    expect((await done(b.client, t.assignmentId)).body.assignment.status).toBe("completed");
    expect(await PointTransaction.countDocuments()).toBe(2);
    expect(await score(ctx, a.team)).toBe(15);
    expect(await score(ctx, b.team)).toBe(15);
  });

  it("I22 staff verification: rejected → resubmitted → approved gives exactly one award", async () => {
    const ctx = await startGame({ red: 3, blue: 3 });
    await createStaffMember("Red Manager", "222222", "TM", [ctx.byKey.red._id]);
    await createStaffMember("Blue Manager", "333333", "TM", [ctx.byKey.blue._id]);
    const redTM = await loginStaff("Red Manager", "222222");
    const blueTM = await loginStaff("Blue Manager", "333333");
    const id = await newTask(ctx.gm, { kind: "individual", verification: "staff", points: 10 });
    await reveal(ctx.gm, id);
    const p = ctx.players.find((x) => x.team === "red")!;
    const [t] = await tasksOf(p.client);

    expect((await done(p.client, t.assignmentId)).body.assignment.status).toBe("awaiting_verification");
    expect(await score(ctx, "red")).toBe(0);
    const queue = (await redTM.call(tmState.GET)).body.queue;
    expect(queue).toHaveLength(1);
    expect(queue[0].playerNames).toEqual([p.name]);
    expect((await blueTM.call(tmState.GET)).body.queue).toHaveLength(0);
    expect((await blueTM.call(verify.POST, { params: { id: t.assignmentId }, body: { approve: true } })).status).toBe(403);

    expect((await redTM.call(verify.POST, { params: { id: t.assignmentId }, body: { approve: false, reason: "No photo shown" } })).status).toBe(200);
    const rejected = (await tasksOf(p.client))[0];
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectReason).toBe("No photo shown");

    await done(p.client, t.assignmentId);
    const approvals = await Promise.all([1, 2, 3].map(() => redTM.call(verify.POST, { params: { id: t.assignmentId }, body: { approve: true } })));
    expect(approvals.every((r) => r.status === 200)).toBe(true);
    expect((await tasksOf(p.client))[0].status).toBe("completed");
    expect(await PointTransaction.countDocuments()).toBe(1);
    expect(await score(ctx, "red")).toBe(10);
    // rejecting after approval is refused
    expect((await ctx.gm.call(verify.POST, { params: { id: t.assignmentId }, body: { approve: false } })).status).toBe(409);
  });

  it("I23 ghosts can complete tasks and still earn team points", async () => {
    const ctx = await startGame({ red: 3 });
    const id = await newTask(ctx.gm, { kind: "individual", points: 10 });
    await reveal(ctx.gm, id);
    const p = ctx.players[0];
    await ctx.gm.call(kill.POST, { params: { id: p.id }, body: {} });
    const [t] = await tasksOf(p.client);
    expect((await done(p.client, t.assignmentId)).status).toBe(200);
    expect(await score(ctx, "red")).toBe(10);
  });

  it("…unless the task says ghosts aren't allowed", async () => {
    const ctx = await startGame({ red: 3 });
    const id = await newTask(ctx.gm, { kind: "individual", allowGhosts: false });
    await reveal(ctx.gm, id);
    const p = ctx.players[0];
    const [t] = await tasksOf(p.client);
    await ctx.gm.call(kill.POST, { params: { id: p.id }, body: {} });
    const r = await done(p.client, t.assignmentId);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("GHOSTS_NOT_ALLOWED");
  });

  it("hidden tasks disappear and can't be completed; earned points stay", async () => {
    const ctx = await startGame({ red: 2 });
    const id = await newTask(ctx.gm, { kind: "individual" });
    await reveal(ctx.gm, id);
    const [a, b] = ctx.players;
    await done(a.client, (await tasksOf(a.client))[0].assignmentId);
    const [tb] = await tasksOf(b.client);
    await ctx.gm.call(hideTask.POST, { params: { id } });
    expect(await tasksOf(b.client)).toEqual([]);
    expect((await done(b.client, tb.assignmentId)).status).toBe(404);
    expect(await score(ctx, "red")).toBe(10);
  });

  it("tasks close outside the playing phases", async () => {
    const ctx = await startGame({ red: 2 });
    const id = await newTask(ctx.gm, { kind: "individual" });
    await reveal(ctx.gm, id);
    const [t] = await tasksOf(ctx.players[0].client);
    await Game.updateOne({ _id: ctx.game._id }, { $set: { phase: "FINAL" } });
    const r = await done(ctx.players[0].client, t.assignmentId);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("TASKS_CLOSED");
  });

  it("GM task view shows progress counts and supports 304 polling", async () => {
    const ctx = await startGame({ red: 2, blue: 2 });
    const id = await newTask(ctx.gm, { kind: "individual" });
    await reveal(ctx.gm, id);
    await done(ctx.players[0].client, (await tasksOf(ctx.players[0].client))[0].assignmentId);
    const s = (await ctx.gm.call(gmTasks.GET)).body;
    expect(s.tasks[0].counts).toMatchObject({ total: 4, completed: 1, open: 3 });
    expect(s.tasks[0].assignments).toHaveLength(4);
    const again = await ctx.gm.call(gmTasks.GET, { query: { v: String(s.version) } });
    expect(again.status).toBe(304);
    expect(await Player.countDocuments()).toBe(4);
  });
});
