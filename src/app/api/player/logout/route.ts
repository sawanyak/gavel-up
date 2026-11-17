import { NextResponse } from "next/server";
import { PLAYER_COOKIE } from "@/lib/shared/constants";
import { clearSessionCookie, readCookie, sha256 } from "@/lib/server/auth/session";
import { route } from "@/lib/server/errors";
import { Session } from "@/lib/server/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async (req) => {
  const token = readCookie(req, PLAYER_COOKIE);
  if (token) await Session.updateOne({ tokenHash: sha256(token) }, { $set: { revokedAt: new Date() } });
  const res = new NextResponse(null, { status: 204 });
  clearSessionCookie(res, PLAYER_COOKIE);
  return res;
});
