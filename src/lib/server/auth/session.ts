import crypto from "crypto";
import type { NextResponse } from "next/server";
import type { Types } from "mongoose";
import { Session } from "../models";

export const newToken = () => crypto.randomBytes(32).toString("base64url");
export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function createSession(opts: {
  subjectType: "player" | "staff";
  subjectId: Types.ObjectId;
  gameId?: Types.ObjectId | null;
  ttlMs: number;
  userAgent?: string;
}) {
  const token = newToken();
  await Session.create({
    tokenHash: sha256(token),
    subjectType: opts.subjectType,
    subjectId: opts.subjectId,
    gameId: opts.gameId ?? null,
    expiresAt: new Date(Date.now() + opts.ttlMs),
    userAgent: (opts.userAgent ?? "").slice(0, 200),
  });
  return token;
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/** Returns the live (not revoked, not expired) session for this cookie, or null. */
export async function loadSession(req: Request, cookieName: string, subjectType: "player" | "staff") {
  const token = readCookie(req, cookieName);
  if (!token || token.length > 100) return null;
  const session = await Session.findOne({ tokenHash: sha256(token), subjectType });
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
  // Throttled "last seen" update (used for "staff online" indicators).
  if (Date.now() - session.lastSeenAt.getTime() > 30_000) {
    await Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  }
  return session;
}

export async function revokeSessionsFor(subjectId: Types.ObjectId, exceptSessionId?: Types.ObjectId) {
  await Session.updateMany(
    { subjectId, revokedAt: null, ...(exceptSessionId ? { _id: { $ne: exceptSessionId } } : {}) },
    { $set: { revokedAt: new Date() } },
  );
}

export function setSessionCookie(res: NextResponse, name: string, token: string, ttlMs: number) {
  res.cookies.set(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ttlMs / 1000),
  });
}

export function clearSessionCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", { httpOnly: true, path: "/", maxAge: 0 });
}
