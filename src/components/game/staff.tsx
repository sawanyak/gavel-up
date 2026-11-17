"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import type { StaffMe } from "@/lib/shared/types";
import { Alert, Button, Modal } from "./ui";

/** Loads the logged-in staff member; redirects to the login page when not logged in. */
export function useStaffMe() {
  const router = useRouter();
  const [me, setMe] = useState<StaffMe | null>(null);
  useEffect(() => {
    api<{ staff: StaffMe }>("/api/staff/me").then((r) => {
      if (r.ok) setMe(r.data.staff);
      else if (r.status === 401) router.replace(`/staff/login?next=${encodeURIComponent(window.location.pathname)}`);
    });
  }, [router]);
  return me;
}

/** Issue a one-time device login code for a player and show it big on screen. */
export function IssueCodeButton({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const issue = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    setCode(null);
    const r = await api<{ code: string; expiresAt: string }>(`/api/staff/players/${playerId}/login-code`, { method: "POST" });
    setLoading(false);
    if (r.ok) setCode(r.data);
    else setError(r.error);
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={issue} title="Give this player a login code for a new device">
        <KeyRound className="w-3.5 h-3.5" /> Code
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Device login code">
        <p className="text-sm text-slate-300 mb-4">
          Check it&apos;s really <b className="text-white">{playerName}</b> in person, then let them type this on their new phone at{" "}
          <b className="text-cyan-300">/play/recover</b>. Their old device will be logged out.
        </p>
        {loading && <p className="text-center text-slate-400">Generating…</p>}
        {code && (
          <div className="text-center">
            <p className="text-5xl font-mono font-black tracking-[0.3em] text-white my-4">{code.code}</p>
            <p className="text-xs text-slate-400">
              Valid once, until {new Date(code.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
        {error && <Alert>{error.message}</Alert>}
      </Modal>
    </>
  );
}
