"use client";

import React, { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { StaffNav } from "@/components/game/StaffNav";
import { useStaffMe } from "@/components/game/staff";
import { Alert, Button, HudCard } from "@/components/game/ui";
import { api } from "@/lib/client/api";

export default function QrPage() {
  const me = useStaffMe();
  const [info, setInfo] = useState<{ url: string; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ url: string; code: string }>("/api/gm/qr?format=json").then((r) => (r.ok ? setInfo(r.data) : setError(r.error.message)));
  }, []);

  return (
    <div className="space-y-5">
      <div className="print:hidden">{me && <StaffNav role={me.role} name={me.name} />}</div>
      {error && <Alert>{error}</Alert>}
      {info && (
        <HudCard title="Registration desk QR" className="max-w-xl mx-auto text-center print:border-0 print:bg-white print:shadow-none">
          <p className="text-2xl font-black font-mono tracking-widest text-white print:text-black mb-1">SCAN TO JOIN THE CREW</p>
          <p className="text-sm text-slate-300 print:text-black mb-4">Gavel Up · Among Us IRL</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/gm/qr" alt="Registration QR code" className="mx-auto w-full max-w-sm rounded-xl bg-white p-2" />
          <p className="mt-4 font-mono text-sm text-cyan-300 print:text-black break-all">{info.url}</p>
          <p className="mt-1 text-xs text-slate-400 print:text-black">Game code: {info.code}</p>
          <div className="mt-5 print:hidden">
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
          <p className="mt-4 text-xs text-amber-300 print:hidden">
            Check the URL above is your public site address (set PUBLIC_BASE_URL in production) — not localhost.
          </p>
        </HudCard>
      )}
    </div>
  );
}
