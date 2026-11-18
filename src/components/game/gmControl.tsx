"use client";

import React, { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Megaphone, Pin, Search, Send, Trash2 } from "lucide-react";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import type { GMSnapshot } from "@/lib/shared/types";
import { Alert, Button, Field, HudCard, Modal, inputClass } from "./ui";

/* ───────────────────────── Detective log ───────────────────────── */

/**
 * The Detective comes to a host and asks "Is <X> an impostor?". The host records it here
 * and reads the answer privately. Lives in a modal so nothing shows on the main screen.
 */
export function DetectiveLogButton({ snapshot, onDone }: { snapshot: GMSnapshot; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [detectiveId, setDetectiveId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [result, setResult] = useState<{ answerIsImpostor: boolean; remaining: number; target: { name: string }; detective: { name: string } } | null>(null);

  const teamName = useMemo(() => new Map(snapshot.teams.map((t) => [t.id, t])), [snapshot.teams]);
  const detectives = snapshot.registrations.filter((r) => r.role === "detective");
  const asked = (id: string) => snapshot.investigations.filter((i) => i.detectiveId === id).length;
  const q = search.trim().toLowerCase();
  const targets = snapshot.registrations.filter((r) => r.id !== detectiveId && (!q || r.name.toLowerCase().includes(q)));

  if (!snapshot.game.rolesRevealed) return null;

  const close = () => {
    setOpen(false);
    setResult(null);
    setError(null);
    setTargetId("");
    setSearch("");
  };

  const record = async () => {
    setLoading(true);
    setError(null);
    const r = await api<NonNullable<typeof result>>(`/api/gm/players/${detectiveId}/investigations`, { body: { targetPlayerId: targetId } });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    setResult(r.data);
    onDone();
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Search className="w-4 h-4 text-amber-300" /> Detective question
      </Button>
      <Modal open={open} onClose={close} title="Detective question">
        {result ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-300">
              {result.detective.name} asked: is <b className="text-white">{result.target.name}</b> an impostor?
            </p>
            <p className={clsx("text-5xl font-black font-mono tracking-widest", result.answerIsImpostor ? "text-red-400" : "text-emerald-300")}>
              {result.answerIsImpostor ? "YES" : "NO"}
            </p>
            <p className="text-xs text-slate-400">Tell them privately. They have {result.remaining} question(s) left. Their phone now shows this answer.</p>
            <Button onClick={close} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Detective">
              <select className={inputClass} value={detectiveId} onChange={(e) => setDetectiveId(e.target.value)}>
                <option value="">Choose…</option>
                {detectives.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.status === "ghost"}>
                    {d.name} ({teamName.get(d.teamId)?.name}) · asked {asked(d.id)}
                    {d.status === "ghost" ? " · ghost" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="They ask about">
              <input className={`${inputClass} mb-2`} placeholder="Search name" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className={inputClass} size={6} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({teamName.get(t.teamId)?.name})
                  </option>
                ))}
              </select>
            </Field>
            {error && <Alert>{error.message}</Alert>}
            <p className="text-xs text-slate-400">Check you heard the name right — this uses up their question.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button loading={loading} disabled={!detectiveId || !targetId} onClick={record}>
                Record & show answer
              </Button>
            </div>
            {snapshot.investigations.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-400">Earlier questions ({snapshot.investigations.length})</summary>
                <ul className="mt-2 space-y-1">
                  {snapshot.investigations.map((i) => (
                    <li key={i.id} className="text-slate-300">
                      {new Date(i.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {i.detectiveName} → {i.targetName}:{" "}
                      <b className={i.answerIsImpostor ? "text-red-400" : "text-emerald-300"}>{i.answerIsImpostor ? "YES" : "NO"}</b>
                      <span className="text-slate-500"> ({i.recordedByName})</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

/* ───────────────────────── Announcements ───────────────────────── */

export function AnnouncementsPanel({ snapshot, onChange }: { snapshot: GMSnapshot; onChange: () => void }) {
  const [text, setText] = useState("");
  const [level, setLevel] = useState<"info" | "alert">("info");
  const [teamId, setTeamId] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const teams = new Map(snapshot.teams.map((t) => [t.id, t]));

  const send = async () => {
    setLoading(true);
    setError(null);
    const r = await api("/api/gm/announcements", { body: { text, level, pinned, teamId: teamId || null } });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    setText("");
    setPinned(false);
    onChange();
  };
  const remove = async (id: string) => {
    const r = await api(`/api/gm/announcements/${id}`, { method: "DELETE" });
    if (!r.ok) setError(r.error);
    onChange();
  };

  return (
    <HudCard title="Announcements" right={<Megaphone className="w-4 h-4 text-cyan-300" />}>
      <div className="space-y-3">
        <textarea
          className={`${inputClass} min-h-[72px]`}
          maxLength={280}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Shown on every player's phone, e.g. 'Snacks at the back table!'"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${inputClass} py-2 w-auto`} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Everyone</option>
            {snapshot.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} only
              </option>
            ))}
          </select>
          <select className={`${inputClass} py-2 w-auto`} value={level} onChange={(e) => setLevel(e.target.value as "info" | "alert")}>
            <option value="info">Normal</option>
            <option value="alert">Alert (red)</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-slate-300">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin
          </label>
          <span className="flex-grow" />
          <span className="text-xs font-mono text-slate-500">{text.length}/280</span>
          <Button size="sm" loading={loading} disabled={!text.trim()} onClick={send}>
            <Send className="w-4 h-4" /> Send
          </Button>
        </div>
        {error && <Alert>{error.message}</Alert>}
        {snapshot.announcements.length > 0 && (
          <ul className="divide-y divide-slate-800 border-t border-slate-800">
            {snapshot.announcements.map((a) => (
              <li key={a.id} className="flex items-start gap-2 py-2">
                {a.pinned && <Pin className="w-3.5 h-3.5 mt-1 text-amber-300 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className={clsx("text-sm break-words", a.level === "alert" ? "text-red-200" : "text-slate-200")}>{a.text}</p>
                  <p className="text-[10px] font-mono text-slate-500">
                    {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {a.createdByName} ·{" "}
                    {a.teamId ? `${teams.get(a.teamId)?.name ?? "?"} only` : "everyone"}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)} aria-label="Delete announcement">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </HudCard>
  );
}
