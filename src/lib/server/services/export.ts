import {
  Announcement,
  AuditLog,
  Elimination,
  Investigation,
  Meeting,
  Player,
  PointTransaction,
  Prediction,
  Staff,
  Task,
  TaskAssignment,
  Team,
  Vote,
  type GameDoc,
  type PlayerDoc,
  type PointTransactionDoc,
  type TeamDoc,
} from "../models";

/**
 * Game backup (plan §13 "Backups and recovery"). Excludes session tokens, login codes,
 * PIN hashes and rate-limit rows. Phone numbers only when explicitly requested.
 */
export async function exportGame(game: GameDoc, includePhones: boolean) {
  const gameId = game._id;
  const [teams, players, staff, tasks, assignments, meetings, votes, predictions, transactions, eliminations, investigations, announcements, audit] =
    await Promise.all([
      Team.find({ gameId }).lean<TeamDoc[]>(),
      Player.find({ gameId }).select(`+role +roleSource +roleAssignedAt${includePhones ? "" : " -phoneE164"}`).lean<PlayerDoc[]>(),
      Staff.find().select("name role teamIds active lastSeenAt").lean(),
      Task.find({ gameId }).lean(),
      TaskAssignment.find({ gameId }).lean(),
      Meeting.find({ gameId }).lean(),
      Vote.find({ gameId }).lean(),
      Prediction.find({ gameId }).lean(),
      PointTransaction.find({ gameId }).sort({ createdAt: 1 }).lean<PointTransactionDoc[]>(),
      Elimination.find({ gameId }).lean(),
      Investigation.find({ gameId }).lean(),
      Announcement.find({ gameId }).lean(),
      AuditLog.find({ gameId }).sort({ createdAt: 1 }).lean(),
    ]);

  const teamName = new Map(teams.map((t) => [String(t._id), t.name]));
  const playerName = new Map(players.map((p) => [String(p._id), p.name]));

  const playersTable = players.map((p) => ({
    name: p.name,
    team: teamName.get(String(p.teamId)) ?? "",
    role: p.role ?? "",
    status: p.status,
    eliminationCause: p.eliminationCause ?? "",
    late: p.late ? "yes" : "",
    removed: p.removedAt ? "yes" : "",
    registeredAt: p.registeredAt?.toISOString() ?? "",
    ...(includePhones ? { phone: p.phoneE164 } : {}),
  }));
  const transactionsTable = transactions.map((t) => ({
    at: t.createdAt.toISOString(),
    team: teamName.get(String(t.teamId)) ?? "",
    amount: t.amount,
    category: t.category,
    reason: t.reason,
    by: t.createdBy?.name ?? "",
    earnedBy: t.earnedByPlayerId ? (playerName.get(String(t.earnedByPlayerId)) ?? "") : "",
    reversed: t.reversedById ? "yes" : "",
  }));

  const { config, ...gameInfo } = game;
  return {
    playersTable,
    transactionsTable,
    full: {
      exportedAt: new Date().toISOString(),
      includesPhones: includePhones,
      game: { ...gameInfo, config },
      teams,
      players,
      staff,
      tasks,
      taskAssignments: assignments,
      meetings,
      votes,
      predictions,
      pointTransactions: transactions,
      eliminations,
      investigations,
      announcements,
      auditLogs: audit,
    },
  };
}

/** RFC 4180-ish CSV with a BOM so Excel opens UTF-8 names correctly. Guards against formula injection. */
export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "﻿";
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\r\n");
}
