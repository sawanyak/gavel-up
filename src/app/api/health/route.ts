import mongoose from "mongoose";
import { connectDB } from "@/lib/server/db";
import { Game } from "@/lib/server/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/health — pre-event check (runbook): is the app up, can it reach MongoDB,
 * and which game is active? Public, but reveals nothing sensitive.
 */
export async function GET() {
  const started = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db!.admin().ping();
    const game = await Game.findOne({ active: true }).select("code phase registrationOpen").lean();
    return Response.json(
      {
        ok: true,
        db: "up",
        dbLatencyMs: Date.now() - started,
        game: game ? { code: game.code, phase: game.phase, registrationOpen: game.registrationOpen } : null,
        time: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ ok: false, db: "down", time: new Date().toISOString() }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } });
  }
}
