import QRCode from "qrcode";
import { getActiveGame } from "@/lib/server/auth/guards";
import { route } from "@/lib/server/errors";
import { registrationUrl } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/public/qr — the registration QR (same as the printed poster) for the projector. */
export const GET = route(async (req) => {
  const game = await getActiveGame();
  const png = await QRCode.toBuffer(registrationUrl(req, game.code), { width: 700, margin: 2, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
});
