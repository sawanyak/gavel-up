"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { sounds } from "@/lib/sounds";

/** Lean header for game pages: no loading screen, no marketing nav (plan §2.3). */
export function GameShell({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    setMuted(sounds.getMuted());
    return sounds.subscribe(setMuted);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-slate-950/85 backdrop-blur-md select-none">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/sliit-gavel-club-logo.png"
              alt="SLIIT Gavel Club"
              width={120}
              height={38}
              priority
              className="h-8 w-auto object-contain"
            />
            <span className="hidden sm:inline text-[11px] font-mono font-bold tracking-widest text-red-300 border border-red-500/50 rounded px-2 py-0.5">
              LIVE GAME
            </span>
          </Link>
          <button
            onClick={() => setMuted(sounds.toggleMute())}
            className="p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300"
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>
        </div>
      </header>
      <main className="relative z-10 flex-grow w-full max-w-6xl mx-auto px-4 py-5 sm:py-8">{children}</main>
    </>
  );
}
