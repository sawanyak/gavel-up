"use client";

import React, { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Eye, EyeOff, Search, ShieldAlert, Users, Wrench } from "lucide-react";
import { CrewmateVector, type CrewmateColor } from "@/components/CrewmateVector";
import { getRoleContent } from "@/lib/shared/roleContent";
import type { Role } from "@/lib/shared/constants";
import type { PlayerSnapshot } from "@/lib/shared/types";
import { sounds } from "@/lib/sounds";
import { Button } from "./ui";

export const ROLE_STYLE: Record<Role, { text: string; border: string; bg: string; glow: string; Icon: typeof Wrench }> = {
  impostor: { text: "text-red-400", border: "border-red-500", bg: "bg-red-950/70", glow: "shadow-[0_0_40px_rgba(239,68,68,0.6)]", Icon: ShieldAlert },
  detective: { text: "text-amber-300", border: "border-amber-400", bg: "bg-amber-950/60", glow: "shadow-[0_0_40px_rgba(251,191,36,0.5)]", Icon: Search },
  crewmate: { text: "text-cyan-300", border: "border-cyan-400", bg: "bg-cyan-950/50", glow: "shadow-[0_0_40px_rgba(0,240,255,0.45)]", Icon: Wrench },
};

const seenKey = (gameCode: string, playerId: string) => `gu_seenReveal:${gameCode}:${playerId}`;

function readSeen(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function writeSeen(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* private mode: the overlay may show again — harmless */
  }
}

/**
 * Full-screen, one-time role reveal (plan §7.2). Step 1 asks the player to hide their
 * screen; step 2 shows the role with sound + vibration.
 */
export function RoleRevealOverlay({ snapshot }: { snapshot: PlayerSnapshot }) {
  const { me, game } = snapshot;
  const key = seenKey(game.code, me.id);
  const [step, setStep] = useState<"hidden" | "warn" | "reveal">("hidden");

  useEffect(() => {
    if (game.rolesRevealed && me.role && !readSeen(key)) {
      setStep("warn");
      try {
        navigator.vibrate?.([120, 80, 120]);
      } catch {
        /* unsupported */
      }
    }
  }, [game.rolesRevealed, me.role, key]);

  if (step === "hidden" || !me.role) return null;
  const s = ROLE_STYLE[me.role];
  const content = getRoleContent(me.role, game.rules);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 p-6 text-center select-none">
      {step === "warn" ? (
        <>
          <p className="text-6xl mb-4">🤫</p>
          <h2 className="text-3xl font-black font-mono tracking-widest text-white mb-3">ROLES ARE IN</h2>
          <p className="text-slate-300 max-w-xs mb-8">Make sure nobody can see your screen. Your role is secret — don&apos;t tell anyone.</p>
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              setStep("reveal");
              sounds.playRoleReveal();
              try {
                navigator.vibrate?.(300);
              } catch {
                /* unsupported */
              }
            }}
          >
            Reveal my role
          </Button>
        </>
      ) : (
        <div className="animate-[fadeIn_0.6s_ease-out]">
          <p className="text-xs font-mono uppercase tracking-[0.4em] text-slate-400 mb-4">You are</p>
          <div className={clsx("mx-auto mb-5 inline-block rounded-full p-4 border-4", s.border, s.glow)}>
            <CrewmateVector color={me.team.key as CrewmateColor} size={120} isImpostor={me.role === "impostor"} />
          </div>
          <h2 className={clsx("text-5xl sm:text-6xl font-black font-mono tracking-widest mb-3", s.text)}>{content.title}</h2>
          <p className="text-slate-200 max-w-sm mx-auto mb-8 italic">{content.tagline}</p>
          <Button
            size="lg"
            onClick={() => {
              writeSeen(key);
              setStep("hidden");
            }}
          >
            Got it — keep it secret
          </Button>
        </div>
      )}
    </div>
  );
}

/** Role card on the dashboard: hidden by default, tap to show, auto-hides after 15 s. */
export function RoleCard({ snapshot }: { snapshot: PlayerSnapshot }) {
  const { me, game } = snapshot;
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!me.role) return null;
  const s = ROLE_STYLE[me.role];
  const content = getRoleContent(me.role, game.rules);

  const toggle = () => {
    if (timer.current) clearTimeout(timer.current);
    sounds.playClick();
    setShown((v) => {
      if (!v) timer.current = setTimeout(() => setShown(false), 15_000);
      return !v;
    });
  };

  return (
    <section className={clsx("rounded-2xl border-2 p-4 sm:p-5 transition-all", shown ? `${s.border} ${s.bg}` : "border-slate-700 bg-slate-950/85")}>
      <button onClick={toggle} className="w-full flex items-center justify-between gap-3 text-left" aria-expanded={shown}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Secret role</span>
          {shown ? (
            <span className={clsx("text-xl font-black font-mono tracking-widest", s.text)}>{content.title}</span>
          ) : (
            <span className="text-xl font-black font-mono tracking-widest text-slate-600">• • • • • •</span>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-xs font-mono font-bold uppercase text-slate-200">
          {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {shown ? "Hide" : "Tap to view"}
        </span>
      </button>

      {shown && (
        <div className="mt-4 space-y-4 text-sm">
          <p className="text-slate-100">{content.description}</p>

          <Block title="Your goal">
            <p>{content.objective}</p>
          </Block>

          <Block title="Abilities">
            <List items={content.abilities} />
          </Block>

          {me.role === "impostor" && me.allies && (
            <Block title="Fellow impostors" icon={<Users className="w-4 h-4" />}>
              {me.allies.length === 0 ? (
                <p className="text-slate-400">You&apos;re the only impostor.</p>
              ) : (
                <ul className="space-y-1.5">
                  {me.allies.map((a) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: a.colorHex }} />
                      <span className={clsx("font-semibold", a.status === "ghost" ? "line-through text-slate-500" : "text-white")}>{a.name}</span>
                      <span className="text-xs text-slate-400">({a.teamName})</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          )}

          {me.role === "detective" && me.detective && (
            <Block title="Investigations" icon={<Search className="w-4 h-4" />}>
              <p className="text-lg font-black text-amber-200">
                {me.detective.remaining} of {me.detective.limit} remaining
              </p>
              {me.detective.remaining > 0 && (
                <p className="text-xs text-slate-300 mt-1">Go to a host privately and ask: &quot;Is &lt;name&gt; an impostor?&quot;</p>
              )}
              {me.detective.history.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {me.detective.history.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-300">Is {h.targetName} an impostor?</span>
                      <span className={clsx("font-black font-mono", h.answer === "yes" ? "text-red-400" : "text-emerald-300")}>
                        {h.answer === "yes" ? "YES" : "NO"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          )}

          <Block title="How to earn points">
            <List items={content.howToScore} />
          </Block>

          <Block title="Remember">
            <List items={content.instructions} />
          </Block>
        </div>
      )}
    </section>
  );
}

function Block({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <h3 className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-300 mb-1.5">
        {icon}
        {title}
      </h3>
      <div className="text-slate-200">{children}</div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
