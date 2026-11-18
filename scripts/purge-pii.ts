/**
 * Delete personal data after the event (plan §13: within 30 days).
 *
 *   npm run purge-pii -- --code GAVELUP26            # dry run: shows what would change
 *   npm run purge-pii -- --code GAVELUP26 --yes      # does it
 *
 * Replaces every phone number with a placeholder, deletes all sessions, login codes and
 * rate-limit rows. Names, teams, roles and scores stay so the results remain viewable.
 * Refuses unless the game is finished (COMPLETED); add --force to override.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* rely on real env vars */
}

import { connectDB, disconnectDB } from "../src/lib/server/db";
import { audit } from "../src/lib/server/audit";
import { Game, LoginCode, Player, RateLimit, Session } from "../src/lib/server/models";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function main() {
  const code = arg("code")?.toUpperCase();
  if (!code) throw new Error("Pass --code <GAME CODE>");
  const apply = process.argv.includes("--yes");
  await connectDB();
  const game = await Game.findOne({ code }).lean();
  if (!game) throw new Error(`No game with code ${code}`);
  if (game.phase !== "COMPLETED" && !process.argv.includes("--force")) {
    throw new Error(`Game ${code} is ${game.phase}, not COMPLETED. Finish it first (or pass --force).`);
  }

  const players = await Player.find({ gameId: game._id, phoneE164: { $not: /^purged#/ } }).select("_id").lean();
  console.log(`Game ${code}: ${players.length} player phone number(s) to remove.`);
  if (!apply) {
    console.log("Dry run — nothing changed. Re-run with --yes to purge.");
    return;
  }

  // phoneE164 is required + unique per game, so use a unique placeholder instead of unsetting.
  await Player.bulkWrite(players.map((p) => ({ updateOne: { filter: { _id: p._id }, update: { $set: { phoneE164: `purged#${p._id}` } } } })));
  const ids = players.map((p) => p._id);
  const [s, l] = await Promise.all([
    Session.deleteMany({ subjectType: "player", subjectId: { $in: ids } }),
    LoginCode.deleteMany({ gameId: game._id }),
  ]);
  await RateLimit.deleteMany({});
  await audit({ gameId: game._id, actor: { type: "system", name: "purge-pii" }, action: "PII_PURGED", after: { phones: players.length, sessions: s.deletedCount, loginCodes: l.deletedCount } });
  console.log(`✔ Removed ${players.length} phone number(s), ${s.deletedCount} session(s), ${l.deletedCount} login code(s).`);
}

main()
  .catch((e) => {
    console.error("✖", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
