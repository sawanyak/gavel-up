"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Printer } from "lucide-react";
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

  const isLocal = !!info && /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)[:/]/.test(info.url);

  return (
    <>
      {/* ───────── Screen view ───────── */}
      <div className="space-y-5 print:hidden">
        {me && <StaffNav role={me.role} name={me.name} />}
        {error && <Alert>{error}</Alert>}
        {info && (
          <HudCard title="Registration desk QR" className="max-w-xl mx-auto text-center">
            {isLocal && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/60 bg-amber-950/60 p-3 text-left text-sm text-amber-100">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-300" />
                <span>
                  This QR points to <b>localhost</b>, so phones can&apos;t open it. Open this page using your laptop&apos;s IP address (e.g.{" "}
                  <code>http://192.168.x.x:3000/gm/qr</code>) or the public site URL, or set <code>PUBLIC_BASE_URL</code>.
                </span>
              </div>
            )}
            <p className="text-2xl font-black font-mono tracking-widest text-white mb-1">SCAN TO JOIN THE CREW</p>
            <p className="text-sm text-slate-300 mb-4">Gavel Up · Among Us IRL</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/gm/qr" alt="Registration QR code" className="mx-auto w-full max-w-sm rounded-xl bg-white p-2" />
            <p className="mt-4 font-mono text-sm text-cyan-300 break-all">{info.url}</p>
            <p className="mt-1 text-xs text-slate-400">Game code: {info.code}</p>
            <div className="mt-5">
              <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Print poster
              </Button>
            </div>
          </HudCard>
        )}
      </div>

      {/* ───────── Print view: plain A4 poster ───────── */}
      {info && (
        <div className="hidden print:flex flex-col items-center justify-center text-center text-black bg-white min-h-[260mm]">
          <Image src="/images/sliit-gavel-club-logo-black.png" alt="SLIIT Gavel Club" width={260} height={80} className="h-16 w-auto object-contain mb-6" />
          <h1 className="text-5xl font-black tracking-widest mb-2">SCAN TO JOIN THE CREW</h1>
          <p className="text-xl mb-8">Gavel Up · Among Us IRL</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/gm/qr" alt="Registration QR code" className="w-[140mm] h-[140mm]" />
          <ol className="mt-8 text-lg text-left space-y-1">
            <li>1. Scan the code with your phone camera</li>
            <li>2. Enter your name and phone number</li>
            <li>3. Pick the team colour the desk gave you</li>
          </ol>
          <p className="mt-6 font-mono text-sm break-all">{info.url}</p>
        </div>
      )}
    </>
  );
}
