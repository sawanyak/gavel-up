"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AlertTriangle, Loader2, WifiOff, X } from "lucide-react";
import { clsx } from "clsx";
import { CrewmateVector, type CrewmateColor } from "@/components/CrewmateVector";
import type { Connection } from "@/lib/client/useGameState";
import type { GamePhase } from "@/lib/shared/constants";
import { sounds } from "@/lib/sounds";

/* ───────────────────────── Layout ───────────────────────── */

export function HudCard({
  title,
  right,
  variant = "cyan",
  className,
  children,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  variant?: "cyan" | "red" | "plain";
  className?: string;
  children: React.ReactNode;
}) {
  const border =
    variant === "red" ? "border-red-500/50 shadow-neon-red" : variant === "cyan" ? "border-cyan-500/40" : "border-slate-800";
  return (
    <section className={clsx("rounded-2xl border-2 bg-slate-950/85 backdrop-blur-md p-4 sm:p-5", border, className)}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-cyan-500/20 pb-3 mb-4">
          {title && (
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-widest text-cyan-300">
              <span className={clsx("w-2.5 h-2.5 rounded-full animate-pulse", variant === "red" ? "bg-red-500" : "bg-cyan-400")} />
              {title}
            </h2>
          )}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/* ───────────────────────── Controls ───────────────────────── */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, onClick, ...rest }: ButtonProps) {
  const styles = {
    primary: "bg-cyan-500/15 text-cyan-200 border-cyan-400/60 hover:bg-cyan-500/25 shadow-[0_0_12px_rgba(0,240,255,0.25)]",
    danger: "bg-red-600/80 text-white border-red-400 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]",
    success: "bg-emerald-600/80 text-white border-emerald-400 hover:bg-emerald-600",
    ghost: "bg-slate-900/70 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500",
  }[variant];
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3.5 text-base" }[size];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      onClick={(e) => {
        sounds.playClick();
        onClick?.(e);
      }}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl border-2 font-mono font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]",
        styles,
        sizes,
        className,
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-mono font-bold uppercase tracking-widest text-cyan-300 mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block mt-1 text-xs text-slate-400">{hint}</span>}
      {error && <span className="block mt-1 text-xs text-red-400 font-semibold">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border-2 border-slate-700 bg-slate-900/80 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30";

export function Alert({ kind = "error", children }: { kind?: "error" | "info" | "success"; children: React.ReactNode }) {
  const s = {
    error: "border-red-500/60 bg-red-950/60 text-red-200",
    info: "border-cyan-500/40 bg-cyan-950/40 text-cyan-100",
    success: "border-emerald-500/50 bg-emerald-950/50 text-emerald-200",
  }[kind];
  return <div className={clsx("rounded-xl border px-4 py-3 text-sm", s)}>{children}</div>;
}

/* ───────────────────────── Modal / confirm ───────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  variant = "cyan",
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: "cyan" | "red";
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Portal to <body>: HudCard's backdrop-blur would otherwise make it the containing block for `fixed`.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "w-full rounded-t-2xl sm:rounded-2xl border-2 bg-slate-950 p-5 max-h-[90vh] overflow-y-auto",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
          variant === "red" ? "border-red-500/70" : "border-cyan-500/50",
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono font-bold uppercase tracking-widest text-cyan-200">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Confirmation dialog. With `typeToConfirm`, the user must type that word
 * (used for irreversible game actions, plan §8.5).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  typeToConfirm,
  loading,
  onConfirm,
  onCancel,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  typeToConfirm?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
  wide?: boolean;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);
  const ready = !typeToConfirm || typed.trim().toUpperCase() === typeToConfirm;
  return (
    <Modal open={open} onClose={onCancel} title={title} variant={danger ? "red" : "cyan"} wide={wide}>
      <div className="text-sm text-slate-300 mb-4">{message}</div>
      {children}
      {typeToConfirm && (
        <Field label={`Type ${typeToConfirm} to confirm`}>
          <input className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </Field>
      )}
      <div className="flex gap-3 justify-end mt-5">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} disabled={!ready} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ───────────────────────── Game bits ───────────────────────── */

export function TeamBadge({
  team,
  size = 36,
  showName = true,
  dead,
}: {
  team: { key: string; name: string; colorHex: string };
  size?: number;
  showName?: boolean;
  dead?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <CrewmateVector color={team.key as CrewmateColor} size={size} isDead={dead} />
      {showName && (
        <span className="font-mono font-bold uppercase tracking-wider" style={{ color: team.colorHex === "#3F474E" ? "#94a3b8" : team.colorHex }}>
          {team.name}
        </span>
      )}
    </span>
  );
}

const PHASE_LABEL: Record<GamePhase, string> = {
  SETUP: "Setup",
  LOBBY: "Lobby · Registration",
  PLAYING: "Game in progress",
  MEETING: "Emergency meeting",
  FINAL: "Final reveal",
  COMPLETED: "Game over",
};

export function PhaseChip({ phase }: { phase: GamePhase }) {
  const red = phase === "MEETING" || phase === "FINAL";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-widest",
        red ? "border-red-400/60 bg-red-950/60 text-red-200" : "border-cyan-400/40 bg-cyan-950/40 text-cyan-200",
      )}
    >
      <span className={clsx("w-2 h-2 rounded-full animate-pulse", red ? "bg-red-400" : "bg-cyan-400")} />
      {PHASE_LABEL[phase]}
    </span>
  );
}

export function ConnectionBanner({ connection }: { connection: Connection }) {
  if (connection !== "reconnecting") return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-950/90 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-200 shadow-lg">
      <WifiOff className="w-4 h-4" /> Reconnecting…
    </div>
  );
}

/* ───────────────────────── State views ───────────────────────── */

export function LoadingView({ label = "Connecting to the ship…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-cyan-300">
      <Loader2 className="w-10 h-10 animate-spin" />
      <p className="font-mono text-sm uppercase tracking-widest">{label}</p>
    </div>
  );
}

export function MessageView({
  title,
  message,
  actions,
  variant = "red",
}: {
  title: string;
  message: React.ReactNode;
  actions?: { label: string; href: string }[];
  variant?: "red" | "cyan";
}) {
  return (
    <HudCard variant={variant} className="max-w-md mx-auto mt-10 text-center">
      <AlertTriangle className={clsx("w-10 h-10 mx-auto mb-3", variant === "red" ? "text-red-400" : "text-cyan-300")} />
      <h1 className="text-lg font-mono font-black uppercase tracking-widest text-white mb-2">{title}</h1>
      <div className="text-sm text-slate-300 mb-5">{message}</div>
      {actions && (
        <div className="flex flex-col gap-2">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded-xl border-2 border-cyan-400/60 bg-cyan-500/10 px-4 py-3 font-mono font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </HudCard>
  );
}
