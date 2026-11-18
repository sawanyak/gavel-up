"use client";

import React, { useRef, useState } from "react";
import { clsx } from "clsx";
import { Award, Trophy } from "lucide-react";
import { api, fieldError, newIdempotencyKey, type ApiErrorInfo } from "@/lib/client/api";
import type { FeedItem, LeaderboardRow, PointCategory, TeamInfo } from "@/lib/shared/types";
import { Alert, Button, Field, HudCard, inputClass } from "./ui";

/* ───────────────────────── Award form ───────────────────────── */

const PRESETS = ["Table Topics", "Q&A", "Icebreaker", "Task bonus", "Penalty"];

/**
 * Give or take points. One Idempotency-Key per submission: if the network fails and the
 * person presses again, the same key is reused, so the award can't happen twice.
 */
export function AwardForm({
  teams,
  bounds,
  activities = [],
  players = [],
  onDone,
}: {
  teams: Pick<TeamInfo, "id" | "name" | "colorHex">[];
  bounds: { min: number; max: number };
  activities?: { id: string; title: string }[];
  players?: { id: string; name: string; teamId: string }[];
  onDone: () => void;
}) {
  const [teamId, setTeamId] = useState(teams.length === 1 ? teams[0].id : "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [activityId, setActivityId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const keyRef = useRef<string>(newIdempotencyKey());

  const n = Number(amount);
  const valid = teamId && Number.isInteger(n) && n !== 0 && n >= bounds.min && n <= bounds.max && reason.trim().length >= 3;
  const chips = [5, 10, 20, -5, -10].filter((c) => c >= bounds.min && c <= bounds.max);
  const teamPlayers = players.filter((p) => p.teamId === teamId);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setDone(null);
    const r = await api<{ teamScore: number }>("/api/staff/points", {
      body: { teamId, amount: n, reason: reason.trim(), ...(activityId ? { activityTaskId: activityId } : {}), ...(playerId ? { earnedByPlayerId: playerId } : {}) },
      headers: { "Idempotency-Key": keyRef.current },
    });
    setLoading(false);
    if (!r.ok) {
      // Keep the same key only for retryable failures (no connection / server busy).
      if (r.status !== 0 && r.status !== 503) keyRef.current = newIdempotencyKey();
      return setError(r.error);
    }
    keyRef.current = newIdempotencyKey();
    const team = teams.find((t) => t.id === teamId);
    setDone(`${n > 0 ? "+" : ""}${n} to ${team?.name ?? "team"} — now ${r.data.teamScore} pts`);
    setAmount("");
    setReason("");
    setActivityId("");
    setPlayerId("");
    onDone();
  };

  return (
    <HudCard title="Give points" right={<Award className="w-4 h-4 text-amber-300" />}>
      <div className="space-y-3">
        {teams.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTeamId(t.id);
                  setPlayerId("");
                }}
                className={clsx(
                  "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-bold min-h-[44px]",
                  teamId === t.id ? "text-white" : "border-slate-700 text-slate-300",
                )}
                style={teamId === t.id ? { borderColor: t.colorHex } : undefined}
              >
                <span className="w-3 h-3 rounded-full" style={{ background: t.colorHex }} /> {t.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setAmount(String(c))}
              className={clsx(
                "rounded-lg border-2 px-3 py-2 font-mono font-bold min-h-[44px] min-w-[56px]",
                Number(amount) === c ? "border-cyan-400 text-white bg-cyan-500/15" : c < 0 ? "border-red-500/50 text-red-300" : "border-emerald-500/50 text-emerald-300",
              )}
            >
              {c > 0 ? `+${c}` : c}
            </button>
          ))}
          <input
            className={`${inputClass} py-2 w-28`}
            inputMode="numeric"
            placeholder="other"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))}
            aria-label="Amount"
          />
          <span className="text-xs text-slate-500">
            {bounds.min} to +{bounds.max}
          </span>
        </div>
        <Field label="Reason" error={fieldError(error, "reason")}>
          <input className={inputClass} value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Table topics — best answer" />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setReason(p)} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:text-white">
              {p}
            </button>
          ))}
        </div>
        {(activities.length > 0 || teamPlayers.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {activities.length > 0 && (
              <select className={`${inputClass} py-2`} value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                <option value="">No activity</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            )}
            {teamPlayers.length > 0 && (
              <select className={`${inputClass} py-2`} value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                <option value="">Who earned it? (optional)</option>
                {teamPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {error && !fieldError(error, "reason") && <Alert>{error.message}</Alert>}
        {done && <Alert kind="success">{done}</Alert>}
        <Button className="w-full" variant={n < 0 ? "danger" : "success"} disabled={!valid} loading={loading} onClick={submit}>
          {n < 0 ? `Take ${-n} points` : n > 0 ? `Give +${n} points` : "Give points"}
        </Button>
      </div>
    </HudCard>
  );
}

/* ───────────────────────── Leaderboard & feed ───────────────────────── */

export function Leaderboard({ rows, highlightTeamId, title = "Leaderboard" }: { rows: LeaderboardRow[]; highlightTeamId?: string; title?: string }) {
  if (rows.length === 0) return null;
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.score)));
  return (
    <HudCard title={title} right={<Trophy className="w-4 h-4 text-amber-300" />}>
      <ol className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.teamId}
            className={clsx("rounded-xl border px-3 py-2", r.teamId === highlightTeamId ? "border-cyan-400/70 bg-cyan-500/10" : "border-slate-800 bg-slate-900/60")}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center font-mono font-black text-slate-300">{r.rank}</span>
              <span className="w-3 h-3 rounded-full" style={{ background: r.colorHex }} />
              <span className="flex-1 font-bold text-white">{r.name}</span>
              <span className="font-mono font-black text-amber-200">{r.score}</span>
            </div>
            <div className="ml-9 mt-1 h-1.5 rounded-full bg-slate-800">
              <div className="h-full rounded-full" style={{ width: `${(Math.max(0, r.score) / max) * 100}%`, background: r.colorHex }} />
            </div>
          </li>
        ))}
      </ol>
    </HudCard>
  );
}

const CATEGORY_LABEL: Record<PointCategory, string> = {
  task: "Task",
  activity: "Activity",
  manual: "Award",
  internal_vote: "Votes",
  prediction: "Prediction",
  penalty: "Penalty",
  reversal: "Correction",
};

export function PointsFeed({ items, empty = "No points yet." }: { items: FeedItem[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-800">
      {items.map((f) => (
        <li key={f.id} className="flex items-center gap-3 py-1.5 text-sm">
          <span className={clsx("w-12 text-right font-mono font-bold", f.amount >= 0 ? "text-emerald-300" : "text-red-300")}>
            {f.amount > 0 ? `+${f.amount}` : f.amount}
          </span>
          <span className="flex-1 min-w-0 truncate text-slate-200">{f.reason}</span>
          <span className="text-[10px] font-mono uppercase text-slate-500 whitespace-nowrap">
            {CATEGORY_LABEL[f.category]} · {new Date(f.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </li>
      ))}
    </ul>
  );
}
