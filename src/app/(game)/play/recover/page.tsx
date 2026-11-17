"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, HudCard, inputClass } from "@/components/game/ui";
import { api, fieldError, type ApiErrorInfo } from "@/lib/client/api";

export default function RecoverPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await api("/api/player/recover", { body: { phone, code: code.trim() } });
    setLoading(false);
    if (r.ok) router.replace("/play");
    else setError(r.error);
  };

  return (
    <div className="max-w-md mx-auto">
      <HudCard title="Log in on this device">
        <p className="text-sm text-slate-300 mb-5">
          Already registered on another phone? Ask your <b className="text-white">Team Manager</b> or a host for a 6-digit login code. Your
          other device will be logged out.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Phone number you registered with" error={fieldError(error, "phone")}>
            <input className={inputClass} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07X XXX XXXX" />
          </Field>
          <Field label="6-digit login code" error={fieldError(error, "code")}>
            <input
              className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
            />
          </Field>
          {error && !fieldError(error, "phone") && !fieldError(error, "code") && <Alert>{error.message}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={code.length !== 6 || phone.length < 9}>
            Log in
          </Button>
        </form>
      </HudCard>
    </div>
  );
}
