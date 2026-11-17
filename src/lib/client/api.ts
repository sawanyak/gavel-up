"use client";

export interface ApiErrorInfo {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: ApiErrorInfo };

/** fetch wrapper for our JSON API. Never throws; network failures return status 0. */
export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, error: { status: 0, code: "NETWORK", message: "No connection. Check your internet and try again." } };
  }
  if (res.status === 204) return { ok: true, status: 204, data: null as T };
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (res.ok) return { ok: true, status: res.status, data: json as T };
  const err = (json as { error?: { code: string; message: string; details?: unknown } })?.error;
  return {
    ok: false,
    status: res.status,
    error: { status: res.status, code: err?.code ?? "HTTP_" + res.status, message: err?.message ?? "Something went wrong.", details: err?.details },
  };
}

/** First field error message from a VALIDATION_ERROR response, if any. */
export function fieldError(error: ApiErrorInfo | null | undefined, field: string): string | undefined {
  const d = error?.details as Record<string, string[] | undefined> | undefined;
  return d?.[field]?.[0];
}
