"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { RefreshCw, Undo2 } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { useStaffMe } from "@/components/game/staff";
import { AwardForm, Leaderboard } from "@/components/game/scoring";
import { Alert, Button, ConfirmDialog, ConnectionBanner, Field, HudCard, LoadingView, MessageView, PhaseChip, inputClass } from "@/components/game/ui";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import { useGameState } from "@/lib/client/useGameState";
import type { GMPointsSnapshot, LedgerItem, PointCategory } from "@/lib/shared/types";

const CATEGORIES: { value: PointCategory | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "task", label: "Tasks" },
  { value: "activity", label: "Activities" },
  { value: "manual", label: "Awards" },
  { value: "penalty", label: "Penalties" },
  { value: "internal_vote", label: "Meeting votes" },
  { value: "prediction", label: "Predictions" },
  { value: "reversal", label: "Corrections" },
];

export default function GMPointsPage() {
  const me = useStaffMe();
  const [teamId, setTeamId] = useState("");
  const [category, setCategory] = useState("");
  const qs = new URLSearchParams({ ...(teamId ? { teamId } : {}), ...(category ? { category } : {}) }).toString();
  // A different URL per filter: the hook restarts and fetches the filtered ledger.
  const { data, error, connection, refresh } = useGameState<GMPointsSnapshot>(`/api/gm/points${qs ? `?${qs}` : ""}`, 3000);
  const [reversing, setReversing] = useState<LedgerItem | null>(null);
  const [confirmRecompute, setConfirmRecompute] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiErrorInfo | null>(null);

  if (error?.status === 403) return <MessageView title="Game Masters only" message="Your account is a Team Manager." actions={[{ label: "Go to my team", href: "/tm" }]} />;
  if (error?.status === 401) return <LoadingView label="Redirecting to login…" />;
  if (error) return <MessageView title="Error" message={error.message} />;
  if (!data) return <LoadingView />;

  const recompute = async () => {
    setBusy(true);
    setActionError(null);
    const r = await api<{ changed: number }>("/api/gm/scores/recompute", { method: "POST", body: {} });
    setBusy(false);
    setConfirmRecompute(false);
    if (!r.ok) return setActionError(r.error);
    setNotice(r.data.changed === 0 ? "All scores already matched the history." : `Fixed ${r.data.changed} team score(s).`);
    refresh();
  };

  const canAward = data.phase !== "SETUP" && data.phase !== "LOBBY" && data.phase !== "COMPLETED";

  return (
    <div className="space-y-5">
      <ConnectionBanner connection={connection} />
      {me && <StaffNav role={me.role} name={me.name} />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white">Points</h1>
        <PhaseChip phase={data.phase} />
        <span className="flex-grow" />
        <Button variant="ghost" size="sm" onClick={() => setConfirmRecompute(true)}>
          <RefreshCw className="w-3.5 h-3.5" /> Recheck scores
        </Button>
      </div>
      {actionError && <Alert>{actionError.message}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <div className="grid gap-5 lg:grid-cols-2">
        {canAward ? (
          <AwardForm teams={data.teams} bounds={data.bounds} activities={data.activities} players={data.players} onDone={refresh} />
        ) : (
          <HudCard title="Give points">
            <p className="text-sm text-slate-400">Points can be given once roles are revealed.</p>
          </HudCard>
        )}
        <Leaderboard rows={data.leaderboard} />
      </div>

      <HudCard title="Points history" right={<span className="text-xs font-mono text-slate-400">{data.totals.transactions} total</span>}>
        <div className="flex flex-wrap gap-2 mb-3">
          <select className={`${inputClass} py-2 w-auto`} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">All teams</option>
            {data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select className={`${inputClass} py-2 w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        {data.ledger.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {data.ledger.map((t) => (
              <li key={t.id} className={clsx("flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm", t.reversed && "opacity-50")}>
                <span className={clsx("w-14 text-right font-mono font-bold", t.amount >= 0 ? "text-emerald-300" : "text-red-300", t.reversed && "line-through")}>
                  {t.amount > 0 ? `+${t.amount}` : t.amount}
                </span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.colorHex }} />
                <span className="w-16 text-slate-300 text-xs font-mono uppercase">{t.teamName}</span>
                <span className="flex-1 min-w-[10rem] text-slate-100">
                  {t.reason}
                  {t.earnedByName && <span className="text-slate-400"> · {t.earnedByName}</span>}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {t.category.replace("_", " ")} · {t.createdByName} · {new Date(t.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {t.reversed ? (
                  <span className="text-[10px] font-mono uppercase text-slate-400">reversed</span>
                ) : (
                  !t.isReversal &&
                  data.phase !== "COMPLETED" && (
                    <Button size="sm" variant="ghost" onClick={() => setReversing(t)} aria-label="Reverse">
                      <Undo2 className="w-3.5 h-3.5" />
                    </Button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </HudCard>

      {reversing && <ReverseDialog tx={reversing} onClose={() => setReversing(null)} onDone={refresh} />}
      <ConfirmDialog
        open={confirmRecompute}
        title="Recheck scores?"
        message="Adds up every team's points history again and fixes any score that doesn't match. Safe to run at any time."
        confirmLabel="Recheck"
        loading={busy}
        onCancel={() => setConfirmRecompute(false)}
        onConfirm={recompute}
      />
    </div>
  );
}

function ReverseDialog({ tx, onClose, onDone }: { tx: LedgerItem; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const go = async () => {
    setLoading(true);
    setError(null);
    const r = await api(`/api/gm/points/${tx.id}/reverse`, { body: { reason } });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    onDone();
    onClose();
  };
  return (
    <ConfirmDialog
      open
      danger
      title="Reverse these points?"
      confirmLabel="Reverse"
      loading={loading}
      onCancel={onClose}
      onConfirm={go}
      message={
        <>
          Adds <b className="text-white">{-tx.amount > 0 ? `+${-tx.amount}` : -tx.amount}</b> to <b className="text-white">{tx.teamName}</b> to cancel “{tx.reason}”. The original stays in
          the history.
          {tx.category === "task" && " The task itself stays marked as done."}
        </>
      }
    >
      <Field label="Reason" error={error?.message}>
        <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. given to the wrong team" />
      </Field>
    </ConfirmDialog>
  );
}
