/** Polling support (plan §10.1): `?v=<version>` → 304 when nothing changed. */
export function notModifiedIfCurrent(req: Request, version: number): Response | null {
  const v = new URL(req.url).searchParams.get("v");
  if (v !== null && v === String(version)) {
    return new Response(null, { status: 304, headers: { "Cache-Control": "no-store" } });
  }
  return null;
}

/** Origin the browser actually used (Host header), so a QR made via the LAN IP points at the LAN IP. */
function requestOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return new URL(req.url).origin;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function registrationUrl(req: Request, code: string) {
  const base = (process.env.PUBLIC_BASE_URL || requestOrigin(req)).replace(/\/$/, "");
  return `${base}/play/register?g=${encodeURIComponent(code)}`;
}

export const userAgent =(req: Request) => req.headers.get("user-agent") ?? "";
