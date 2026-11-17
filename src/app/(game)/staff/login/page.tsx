"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Field, HudCard, LoadingView, inputClass } from "@/components/game/ui";
import { api, type ApiErrorInfo } from "@/lib/client/api";
import type { StaffMe } from "@/lib/shared/types";

function LoginInner() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const go = (s: StaffMe) => {
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    if (safeNext && (s.role === "GM" || safeNext.startsWith("/tm"))) router.replace(safeNext);
    else router.replace(s.role === "GM" ? "/gm" : "/tm");
  };

  // Already logged in? Skip the form.
  useEffect(() => {
    api<{ staff: StaffMe }>("/api/staff/me").then((r) => r.ok && go(r.data.staff));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await api<{ staff: StaffMe }>("/api/staff/login", { body: { name, pin } });
    setLoading(false);
    if (r.ok) go(r.data.staff);
    else {
      setError(r.error);
      setPin("");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-6">
      <HudCard title="Staff access" variant="red">
        <p className="text-sm text-slate-300 mb-5">Game Masters and Team Managers only.</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" />
          </Field>
          <Field label="6-digit PIN">
            <input
              className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          {error && <Alert>{error.message}</Alert>}
          <Button type="submit" variant="danger" size="lg" className="w-full" loading={loading} disabled={!name || pin.length !== 6}>
            Log in
          </Button>
        </form>
      </HudCard>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <LoginInner />
    </Suspense>
  );
}
