"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { ShieldCheck } from "lucide-react";
import { CrewmateVector, type CrewmateColor } from "@/components/CrewmateVector";
import { Alert, Button, ConfirmDialog, Field, HudCard, LoadingView, MessageView, TeamBadge, inputClass } from "@/components/game/ui";
import { api, fieldError, type ApiErrorInfo } from "@/lib/client/api";
import type { PlayerSnapshot, PublicGameInfo, TeamInfo } from "@/lib/shared/types";
import { sounds } from "@/lib/sounds";

function RegisterInner() {
  const router = useRouter();
  const code = useSearchParams().get("g") ?? "";
  const [game, setGame] = useState<PublicGameInfo | null>(null);
  const [loadError, setLoadError] = useState<ApiErrorInfo | null>(null);
  const [already, setAlready] = useState<PlayerSnapshot | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiErrorInfo | null>(null);

  useEffect(() => {
    (async () => {
      const [g, me] = await Promise.all([
        api<PublicGameInfo>(`/api/public/game${code ? `?code=${encodeURIComponent(code)}` : ""}`),
        api<PlayerSnapshot>("/api/player/state"),
      ]);
      if (g.ok) setGame(g.data);
      else setLoadError(g.error);
      if (me.ok) setAlready(me.data);
    })();
  }, [code]);

  const submit = async () => {
    if (!team) return;
    setSubmitting(true);
    setError(null);
    const r = await api("/api/player/register", { body: { gameCode: code || undefined, name, phone, teamId: team.id } });
    setSubmitting(false);
    setConfirming(false);
    if (r.ok) {
      sounds.playStart();
      router.replace("/play");
    } else {
      setError(r.error);
    }
  };

  if (loadError) return <MessageView title="Game not found" message={loadError.message} />;
  if (!game) return <LoadingView />;

  if (already && already.game.code === game.code) {
    return (
      <MessageView
        variant="cyan"
        title="You're already aboard"
        message={
          <>
            This phone is registered as <b className="text-white">{already.me.name}</b> ({already.me.team.name} team).
          </>
        }
        actions={[{ label: "Go to my dashboard", href: "/play" }]}
      />
    );
  }

  if (!game.registrationOpen) {
    return (
      <MessageView
        title="Registration closed"
        message="Registration isn't open right now. Please check with the registration desk."
        actions={[{ label: "Already registered? Log in with a code", href: "/play/recover" }]}
      />
    );
  }

  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 9 && !!team;

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
          JOIN THE CREW
        </h1>
        <p className="text-sm font-mono text-cyan-300 mt-1">{game.name} · Among Us IRL</p>
      </div>

      <HudCard title="Crewmate registration">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) setConfirming(true);
          }}
        >
          <Field label="Your name" error={fieldError(error, "name")} hint="As you'd like it shown to your team.">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} placeholder="e.g. Nimal Perera" />
          </Field>

          <Field label="Phone number" error={fieldError(error, "phone")} hint="Used only to stop duplicate sign-ups and to recover your login.">
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" maxLength={25} placeholder="07X XXX XXXX" />
          </Field>

          <div>
            <span className="block text-xs font-mono font-bold uppercase tracking-widest text-cyan-300 mb-1.5">
              Your team colour
            </span>
            <p className="text-xs text-slate-400 mb-3">Pick the colour the registration desk gave you.</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {game.teams.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => {
                    sounds.playClick();
                    setTeam(t);
                  }}
                  className={clsx(
                    "flex flex-col items-center gap-1 rounded-xl border-2 p-2 min-h-[88px] transition-all",
                    team?.id === t.id ? "scale-105 bg-slate-800" : "border-slate-700 bg-slate-900/70 opacity-80 hover:opacity-100",
                  )}
                  style={team?.id === t.id ? { borderColor: t.colorHex, boxShadow: `0 0 18px ${t.colorHex}88` } : undefined}
                  aria-pressed={team?.id === t.id}
                >
                  <CrewmateVector color={t.key as CrewmateColor} size={44} />
                  <span className="text-xs font-mono font-bold uppercase">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {error && !fieldError(error, "name") && !fieldError(error, "phone") && (
            <Alert>
              {error.message}
              {error.code === "PHONE_ALREADY_REGISTERED" && (
                <>
                  {" "}
                  <Link href="/play/recover" className="underline font-bold">
                    Log in with a code
                  </Link>
                </>
              )}
            </Alert>
          )}

          <Button type="submit" variant="danger" size="lg" className="w-full" disabled={!canSubmit}>
            Register
          </Button>

          <p className="flex items-start gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            We store only your name, phone and team for this event. Phone numbers are visible only to the hosts and are deleted after the event.
          </p>
        </form>
      </HudCard>

      <ConfirmDialog
        open={confirming}
        title="Confirm your team"
        confirmLabel="Yes, join"
        loading={submitting}
        onCancel={() => setConfirming(false)}
        onConfirm={submit}
        message={
          team && (
            <div className="flex flex-col items-center gap-3 text-center">
              <TeamBadge team={team} size={72} />
              <p>
                <b className="text-white">{name.trim()}</b>, is <b style={{ color: team.colorHex }}>{team.name.toUpperCase()}</b> the colour the
                desk gave you? You can&apos;t change it yourself later.
              </p>
            </div>
          )
        }
      />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <RegisterInner />
    </Suspense>
  );
}
