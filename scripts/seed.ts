/**
 * Seed / bootstrap the database.
 *
 *   npm run seed                                  # uses .env.local
 *   npm run seed -- --code REHEARSAL --name "Rehearsal" --activate
 *
 * Env: MONGODB_URI, BOOTSTRAP_GM_NAME, BOOTSTRAP_GM_PIN (6 digits), GAME_CODE, GAME_NAME
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local — rely on real env vars */
}

import { connectDB, disconnectDB } from "../src/lib/server/db";
import { seedGame } from "../src/lib/server/seed";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const code = arg("code") ?? process.env.GAME_CODE ?? "GAVELUP26";
  const name = arg("name") ?? process.env.GAME_NAME ?? "Gavel Up 2026";
  const activate = process.argv.includes("--activate") || !arg("code");

  await connectDB();
  const { game, gm } = await seedGame({
    code,
    name,
    activate,
    gmName: process.env.BOOTSTRAP_GM_NAME,
    gmPin: process.env.BOOTSTRAP_GM_PIN,
  });
  console.log(`✔ Game ${game.code} (${game.name}) — active: ${game.active}, phase: ${game.phase}`);
  console.log(gm ? `✔ Game Master account: ${gm.name}` : "⚠ BOOTSTRAP_GM_NAME / BOOTSTRAP_GM_PIN not set — no GM created");
  await disconnectDB();
}

main().catch(async (err) => {
  console.error("✖ Seed failed:", err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
