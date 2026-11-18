import mongoose, { type Types } from "mongoose";
import type { z } from "zod";
import type { taskCreateSchema, taskRevealSchema, taskUpdateSchema } from "@/lib/shared/validation";
import { audit, bumpVersion } from "../audit";
import { assertNotArchived, canAccessTeam, playerActor, staffActor } from "../auth/guards";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { makePairs, pairKey, type PairPlayer } from "../game/pairs";
import { cryptoRng, type Rng } from "../game/roles";
import {
  Game,
  Player,
  Task,
  TaskAssignment,
  Team,
  type AssignmentStatus,
  type GameDoc,
  type PlayerDoc,
  type StaffDoc,
  type TaskAssignmentDoc,
  type TaskDoc,
} from "../models";
import { awardInSession } from "./ledger";

type TaskCreate = z.infer<typeof taskCreateSchema>;
type TaskUpdate = z.infer<typeof taskUpdateSchema>;
type TaskReveal = z.infer<typeof taskRevealSchema>;

/** Players can complete tasks only while the game is running. */
const TASK_PHASES = ["PLAYING", "MEETING"];

async function getTask(game: GameDoc, taskId: string) {
  const task = await Task.findOne({ _id: taskId, gameId: game._id }).lean<TaskDoc>();
  if (!task) throw notFound("Task not found.");
  return task;
}

/* ───────────────────────── GM: task bank ───────────────────────── */

export async function createTask(staff: StaffDoc, game: GameDoc, input: TaskCreate, ip: string) {
  assertNotArchived(game);
  const pts = game.config?.points;
  const points = input.points ?? (input.kind === "paired" ? (pts?.pairedTaskDefault ?? 15) : (pts?.taskDefault ?? 10));
  const order = input.order ?? (await Task.countDocuments({ gameId: game._id }));
  const task = await Task.create({
    gameId: game._id,
    title: input.title,
    description: input.description,
    kind: input.kind,
    points,
    verification: input.kind === "activity" ? "none" : input.verification,
    pairScope: input.kind === "paired" ? (input.pairScope ?? "same_team") : null,
    allowGhosts: input.allowGhosts,
    order,
    createdBy: staff._id,
  });
  await bumpVersion(game._id);
  await audit({ gameId: game._id, actor: staffActor(staff), action: "TASK_CREATED", target: { type: "task", id: task._id }, after: input, ip });
  return task.toObject() as TaskDoc;
}

export async function updateTask(staff: StaffDoc, game: GameDoc, taskId: string, input: TaskUpdate, ip: string) {
  assertNotArchived(game);
  const before = await getTask(game, taskId);
  const after = await Task.findByIdAndUpdate(before._id, { $set: input }, { new: true }).lean<TaskDoc>();
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "TASK_UPDATED",
    target: { type: "task", id: before._id },
    before: { title: before.title, points: before.points, verification: before.verification, allowGhosts: before.allowGhosts },
    after: input,
    ip,
  });
  return after!;
}

export async function deleteTask(staff: StaffDoc, game: GameDoc, taskId: string, ip: string) {
  assertNotArchived(game);
  const task = await getTask(game, taskId);
  if (await TaskAssignment.exists({ taskId: task._id })) {
    throw conflict("TASK_HAS_ASSIGNMENTS", "This task was already given to players. Hide it instead.");
  }
  await Task.deleteOne({ _id: task._id });
  await bumpVersion(game._id);
  await audit({ gameId: game._id, actor: staffActor(staff), action: "TASK_DELETED", target: { type: "task", id: task._id }, before: { title: task.title }, ip });
}

/**
 * Reveals a task and assigns it (plan §9.5 `tasks/:id/reveal`).
 * Safe to press again: assignments have a unique key per task, so only players who
 * don't have it yet (e.g. late joiners) get a new assignment.
 */
export async function revealTask(staff: StaffDoc, game: GameDoc, taskId: string, target: TaskReveal, ip: string, rng: Rng = cryptoRng) {
  assertNotArchived(game);
  if (!TASK_PHASES.includes(game.phase)) throw conflict("INVALID_PHASE", "Reveal roles before revealing tasks.");
  const task = await getTask(game, taskId);

  const teamFilter = target.teamIds?.length ? target.teamIds : null;
  if (target.playerIds?.length && task.kind !== "individual") {
    throw badRequest("INVALID_TARGET", "Only individual tasks can be given to specific players.");
  }
  if (teamFilter) {
    const n = await Team.countDocuments({ gameId: game._id, _id: { $in: teamFilter } });
    if (n !== teamFilter.length) throw badRequest("INVALID_TEAM", "Unknown team.");
  }

  const playerQuery: Record<string, unknown> = { gameId: game._id, removedAt: null };
  if (!task.allowGhosts) playerQuery.status = "alive";
  if (teamFilter) playerQuery.teamId = { $in: teamFilter };
  if (target.playerIds?.length) playerQuery._id = { $in: target.playerIds };
  const players = await Player.find(playerQuery).select("_id teamId").lean<PlayerDoc[]>();
  if (target.playerIds?.length && players.length !== target.playerIds.length) {
    throw badRequest("INVALID_TARGET", "Some selected players can't get this task (removed, or a ghost when ghosts aren't allowed).");
  }

  const base = { gameId: game._id, taskId: task._id };
  const docs: { teamIds: Types.ObjectId[]; assigneeIds: Types.ObjectId[]; assignmentKey: string }[] = [];
  let unpaired: string[] = [];

  if (task.kind === "individual") {
    for (const p of players) docs.push({ teamIds: [p.teamId], assigneeIds: [p._id], assignmentKey: `p:${p._id}` });
  } else if (task.kind === "team") {
    const teamIds = [...new Set(players.map((p) => String(p.teamId)))];
    for (const t of teamIds) docs.push({ teamIds: [new mongoose.Types.ObjectId(t)], assigneeIds: [], assignmentKey: `t:${t}` });
  } else if (task.kind === "paired") {
    const existing = await TaskAssignment.find({ taskId: task._id }).select("assigneeIds").lean<TaskAssignmentDoc[]>();
    const assigned = new Set(existing.flatMap((a) => a.assigneeIds.map(String)));
    const toPair: PairPlayer[] = [];
    const already: PairPlayer[] = [];
    for (const p of players) (assigned.has(String(p._id)) ? already : toPair).push({ id: String(p._id), teamId: String(p.teamId) });
    const result = makePairs(toPair, (task.pairScope as "same_team" | "cross_team") ?? "same_team", rng, already);
    unpaired = result.unpaired.map((p) => p.id);
    for (const [a, b] of result.pairs) {
      const teamIds = [...new Set([a.teamId, b.teamId])].map((t) => new mongoose.Types.ObjectId(t));
      docs.push({ teamIds, assigneeIds: [a.id, b.id].map((id) => new mongoose.Types.ObjectId(id)), assignmentKey: pairKey(a.id, b.id) });
    }
  }
  // "activity" tasks have no assignments: they're shown to everyone and scored by staff.

  const before = await TaskAssignment.countDocuments({ taskId: task._id });
  if (docs.length) {
    try {
      await TaskAssignment.bulkWrite(
        docs.map((d) => ({
          updateOne: {
            filter: { ...base, assignmentKey: d.assignmentKey },
            update: { $setOnInsert: { ...base, ...d, status: "open" } },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    } catch (err) {
      // Two GMs pressing at once can race on an upsert; the unique index keeps it correct.
      if ((err as { code?: number }).code !== 11000 && !String(err).includes("E11000")) throw err;
    }
  }
  const assignmentsCreated = (await TaskAssignment.countDocuments({ taskId: task._id })) - before;

  const now = new Date();
  await Task.updateOne({ _id: task._id }, { $set: { revealed: true, revealedAt: task.revealedAt ?? now } });
  await bumpVersion(game._id);
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: "TASK_REVEALED",
    target: { type: "task", id: task._id },
    after: { target, assignmentsCreated, unpaired: unpaired.length },
    ip,
  });
  return { task: { ...task, revealed: true }, assignmentsCreated, unpaired: unpaired.length };
}

export async function hideTask(staff: StaffDoc, game: GameDoc, taskId: string, ip: string) {
  assertNotArchived(game);
  const task = await getTask(game, taskId);
  await Task.updateOne({ _id: task._id }, { $set: { revealed: false } });
  await bumpVersion(game._id);
  await audit({ gameId: game._id, actor: staffActor(staff), action: "TASK_HIDDEN", target: { type: "task", id: task._id }, ip });
  return { ...task, revealed: false };
}

/* ───────────────────────── Completion ───────────────────────── */

type Actor = { type: "staff" | "player"; id: Types.ObjectId; name: string };

/**
 * Moves an assignment to "completed" and awards each earning team ONCE, in one
 * transaction. If another request already completed it, nothing happens.
 */
async function completeAndAward(
  a: TaskAssignmentDoc,
  task: TaskDoc,
  actor: Actor,
  fromStatuses: AssignmentStatus[],
  extra: Record<string, unknown> = {},
) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const res = await TaskAssignment.updateOne(
        { _id: a._id, status: { $in: fromStatuses } },
        { $set: { status: "completed", completedAt: now, ...extra } },
        { session },
      );
      if (res.modifiedCount !== 1) return; // someone else got there first
      const txIds: Types.ObjectId[] = [];
      if (task.points > 0) {
        const earner = a.assigneeIds.length === 1 ? a.assigneeIds[0] : actor.type === "player" ? actor.id : null;
        for (const teamId of a.teamIds) {
          const tx = await awardInSession(
            {
              gameId: a.gameId,
              teamId,
              amount: task.points,
              category: "task",
              reason: `Task: ${task.title}`,
              idempotencyKey: `task:${a._id}:team:${teamId}`,
              createdBy: { type: "system", name: actor.name },
              earnedByPlayerId: earner,
              source: { type: "taskAssignment", id: a._id },
            },
            session,
          );
          txIds.push(tx._id);
        }
      } else {
        await Game.updateOne({ _id: a.gameId }, { $inc: { version: 1 } }, { session });
      }
      await TaskAssignment.updateOne({ _id: a._id }, { $set: { transactionIds: txIds } }, { session });
    });
  } finally {
    await session.endSession();
  }
}

const OPEN: AssignmentStatus[] = ["open", "rejected"];

/** Player marks their task done (or confirms a paired task). Idempotent. */
export async function completeTask(player: PlayerDoc, game: GameDoc, assignmentId: string) {
  assertNotArchived(game);
  const a = await TaskAssignment.findOne({ _id: assignmentId, gameId: game._id }).lean<TaskAssignmentDoc>();
  if (!a) throw notFound("Task not found.");
  const task = await Task.findById(a.taskId).lean<TaskDoc>();
  if (!task || !task.revealed) throw notFound("This task isn't available any more.", "TASK_NOT_AVAILABLE");

  const mine = a.assigneeIds.length
    ? a.assigneeIds.some((id) => String(id) === String(player._id))
    : a.teamIds.some((id) => String(id) === String(player.teamId));
  if (!mine) throw forbidden("This isn't your task.", "NOT_YOUR_TASK");
  if (!TASK_PHASES.includes(game.phase)) throw conflict("TASKS_CLOSED", "Tasks are closed right now.");
  if (player.status === "ghost" && !task.allowGhosts) throw forbidden("Ghosts can't do this task.", "GHOSTS_NOT_ALLOWED");

  const actor: Actor = { type: "player", id: player._id, name: player.name };
  const fresh = async () => (await TaskAssignment.findById(a._id).lean<TaskAssignmentDoc>())!;

  if (a.status === "completed" || a.status === "awaiting_verification") return { assignment: a, alreadyDone: true };

  let current = a;
  let from: AssignmentStatus[] = OPEN;

  if (task.kind === "paired") {
    const now = new Date();
    const confirmed = await TaskAssignment.findOneAndUpdate(
      { _id: a._id, status: { $in: ["open", "awaiting_partner", "rejected"] }, "confirmations.playerId": { $ne: player._id } },
      { $push: { confirmations: { playerId: player._id, at: now } }, $set: { status: "awaiting_partner" } },
      { new: true },
    ).lean<TaskAssignmentDoc>();
    if (!confirmed) return { assignment: await fresh(), alreadyDone: true };
    const done = new Set(confirmed.confirmations.map((c) => String(c.playerId)));
    if (!a.assigneeIds.every((id) => done.has(String(id)))) {
      await bumpVersion(game._id);
      return { assignment: confirmed, alreadyDone: false };
    }
    current = confirmed;
    from = ["awaiting_partner"];
  }

  if (task.verification === "staff") {
    const res = await TaskAssignment.updateOne(
      { _id: current._id, status: { $in: from } },
      { $set: { status: "awaiting_verification", submittedBy: player._id, submittedAt: new Date(), rejectReason: null } },
    );
    if (res.modifiedCount === 1) await bumpVersion(game._id);
  } else {
    await completeAndAward(current, task, actor, from, { submittedBy: player._id, submittedAt: new Date() });
  }
  await audit({
    gameId: game._id,
    actor: playerActor(player),
    action: task.verification === "staff" ? "TASK_SUBMITTED" : "TASK_COMPLETED",
    target: { type: "taskAssignment", id: a._id },
  });
  return { assignment: await fresh(), alreadyDone: false };
}

/** TM (own team) or GM approves or rejects a task that needs checking. */
export async function verifyAssignment(staff: StaffDoc, game: GameDoc, assignmentId: string, approve: boolean, reason: string | undefined, ip: string) {
  assertNotArchived(game);
  const a = await TaskAssignment.findOne({ _id: assignmentId, gameId: game._id }).lean<TaskAssignmentDoc>();
  if (!a) throw notFound("Task not found.");
  if (!a.teamIds.some((t) => canAccessTeam(staff, t))) throw forbidden("You can only verify your own team's tasks.", "NOT_YOUR_TEAM");
  const task = await Task.findById(a.taskId).lean<TaskDoc>();
  if (!task) throw notFound("Task not found.");

  if (a.status !== "awaiting_verification") {
    if (a.status === "completed" && approve) return { assignment: a, alreadyDone: true };
    throw conflict("NOT_AWAITING_VERIFICATION", "This task isn't waiting for approval any more.");
  }

  const now = new Date();
  if (approve) {
    await completeAndAward(a, task, { type: "staff", id: staff._id, name: staff.name }, ["awaiting_verification"], {
      verifiedBy: staff._id,
      verifiedAt: now,
    });
  } else {
    const res = await TaskAssignment.updateOne(
      { _id: a._id, status: "awaiting_verification" },
      {
        $set: { status: "rejected", rejectReason: reason || "Not accepted — try again.", confirmations: [], verifiedBy: staff._id, verifiedAt: now },
        $inc: { rejectedCount: 1 },
      },
    );
    if (res.modifiedCount !== 1) throw conflict("NOT_AWAITING_VERIFICATION", "This task isn't waiting for approval any more.");
    await bumpVersion(game._id);
  }
  await audit({
    gameId: game._id,
    actor: staffActor(staff),
    action: approve ? "TASK_APPROVED" : "TASK_REJECTED",
    target: { type: "taskAssignment", id: a._id },
    after: { reason: reason ?? null },
    ip,
  });
  return { assignment: (await TaskAssignment.findById(a._id).lean<TaskAssignmentDoc>())!, alreadyDone: false };
}
