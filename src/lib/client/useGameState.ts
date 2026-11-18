"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiErrorInfo } from "./api";

export type Connection = "connecting" | "online" | "reconnecting";

interface Versioned {
  version: number;
  serverTime: number;
}

/** Status codes that mean "stop polling, the user must do something". */
const FATAL = new Set([401, 403, 404, 410]);

/**
 * Polls a state endpoint with `?v=<version>` (plan §10.1).
 * - 304 → nothing changed; 200 → replace snapshot (ignores out-of-order older versions)
 * - errors → keep last snapshot, back off exponentially (max 15 s), show "reconnecting"
 * - refetches immediately when the tab becomes visible or the device comes back online
 */
export function useGameState<T extends Versioned>(url: string, intervalMs: number | ((s: T | null) => number) = 3000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [serverOffset, setServerOffset] = useState(0);

  const versionRef = useRef<number | null>(null);
  const dataRef = useRef<T | null>(null);
  const failuresRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const inFlightRef = useRef(false);
  /** Bumped whenever the URL changes, so responses for an old URL are ignored. */
  const genRef = useRef(0);
  const intervalRef = useRef(intervalMs);
  intervalRef.current = intervalMs;

  const schedule = useCallback((ms: number, fn: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!stoppedRef.current) timerRef.current = setTimeout(fn, ms);
  }, []);

  const poll = useCallback(async () => {
    if (stoppedRef.current || inFlightRef.current) return;
    inFlightRef.current = true;
    const gen = genRef.current;
    const sep = url.includes("?") ? "&" : "?";
    const q = versionRef.current !== null ? `${sep}v=${versionRef.current}` : "";
    let nextDelay: number;
    try {
      const res = await fetch(url + q, { cache: "no-store", credentials: "same-origin" });
      // The URL changed while this request was in flight (e.g. a filter): drop it.
      if (gen !== genRef.current) return;
      if (res.status === 304 || res.ok) {
        if (res.ok) {
          const json = (await res.json()) as T;
          if (versionRef.current === null || json.version >= versionRef.current) {
            versionRef.current = json.version;
            dataRef.current = json;
            setData(json);
            setServerOffset(json.serverTime - Date.now());
          }
        }
        failuresRef.current = 0;
        setError(null);
        setConnection("online");
      } else {
        let body: { error?: { code: string; message: string } } | null = null;
        try {
          body = await res.json();
        } catch {
          /* ignore */
        }
        const info: ApiErrorInfo = {
          status: res.status,
          code: body?.error?.code ?? `HTTP_${res.status}`,
          message: body?.error?.message ?? "Something went wrong.",
        };
        if (FATAL.has(res.status)) {
          setError(info);
          setConnection("online");
          stoppedRef.current = true;
          return;
        }
        throw info;
      }
    } catch {
      if (gen !== genRef.current) return;
      failuresRef.current += 1;
      setConnection("reconnecting");
    } finally {
      if (gen === genRef.current) inFlightRef.current = false;
    }
    if (gen !== genRef.current) return;
    const iv = intervalRef.current;
    const base = typeof iv === "function" ? iv(dataRef.current) : iv;
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    nextDelay = failuresRef.current > 0 ? Math.min(15_000, 1000 * 2 ** (failuresRef.current - 1)) : hidden ? Math.max(base, 10_000) : base;
    schedule(nextDelay, poll);
  }, [url, schedule]);

  const refresh = useCallback(() => {
    stoppedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    return poll();
  }, [poll]);

  useEffect(() => {
    genRef.current += 1;
    inFlightRef.current = false;
    stoppedRef.current = false;
    versionRef.current = null;
    poll();
    const wake = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [poll, refresh]);

  return { data, error, connection, serverOffset, refresh };
}
