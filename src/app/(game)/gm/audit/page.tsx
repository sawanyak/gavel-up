"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { useStaffMe } from "@/components/game/staff";
import { Alert, Button, HudCard, LoadingView, inputClass } from "@/components/game/ui";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import type { AuditItem } from "@/lib/shared/types";

/** Everything staff (and the system) did, newest first. GM only. */
export default function GMAuditPage() {
  const me = useStaffMe();
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({ limit: "50", ...(before ? { before } : {}), ...(action ? { action } : {}) });
      const r = await api<{ items: AuditItem[]; hasMore: boolean; next: string | null }>(`/api/gm/audit?${qs}`);
      setLoading(false);
      if (!r.ok) return setError(r.error);
      setItems((prev) => (before && prev ? [...prev, ...r.data.items] : r.data.items));
      setNext(r.data.next);
      setHasMore(r.data.hasMore);
    },
    [action],
  );

  useEffect(() => {
    load();
  }, [load]);

  const actions = [...new Set((items ?? []).map((i) => i.action))].sort();

  return (
    <div className="space-y-5">
      {me && <StaffNav role={me.role} name={me.name} />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white">Audit log</h1>
        <span className="flex-grow" />
        <select className={`${inputClass} py-2 w-auto`} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {[...new Set([action, ...actions].filter(Boolean))].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <Button size="sm" variant="ghost" onClick={() => load()} loading={loading && !items}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>
      {error && <Alert>{error.message}</Alert>}
      {!items ? (
        <LoadingView />
      ) : (
        <HudCard>
          {items.length === 0 ? (
            <p className="text-center text-slate-500 py-6">Nothing recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800 text-sm">
              {items.map((i) => (
                <li key={i.id} className="py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-xs text-slate-500 w-20">{new Date(i.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                    <span className="font-mono text-xs font-bold text-cyan-200">{i.action}</span>
                    <span className="text-slate-300">
                      {i.actor.name || i.actor.type} <span className="text-slate-500">({i.actor.type})</span>
                    </span>
                  </div>
                  {(i.before !== null || i.after !== null) && (
                    <details className="ml-20 mt-1">
                      <summary className="cursor-pointer text-xs text-slate-400">details</summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/40 p-2 text-[11px] text-slate-300 whitespace-pre-wrap break-all">
                        {JSON.stringify({ before: i.before, after: i.after, target: i.target }, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
          {hasMore && next && (
            <div className="text-center mt-3">
              <Button size="sm" variant="ghost" loading={loading} onClick={() => load(next)}>
                Load older
              </Button>
            </div>
          )}
        </HudCard>
      )}
    </div>
  );
}
