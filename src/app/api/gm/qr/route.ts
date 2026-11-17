import QRCode from "qrcode";
import { getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { registrationUrl } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/gm/qr[?format=json] — PNG QR code for the registration desk. */
export const GET = route(async (req) => {
  await requireGM(req);
  const game = await getActiveGame();
  const url = registrationUrl(req, game.code);
  if (new URL(req.url).searchParams.get("format") === "json") return json({ url, code: game.code });
  const png = await QRCode.toBuffer(url, { width: 900, margin: 2, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
});
