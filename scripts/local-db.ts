/**
 * Runs a local MongoDB (single-node replica set, so transactions work) for development
 * and physical testing without Atlas. Data is kept in ./.local-db between runs.
 *
 *   npm run db:local
 *   → then in .env.local:  MONGODB_URI=<the URI printed below>
 */
import fs from "fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const PORT = Number(process.env.LOCAL_DB_PORT ?? 27999);
const dbPath = ".local-db";

async function main() {
  fs.mkdirSync(dbPath, { recursive: true });
  const rs = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger", name: "rs0" },
    instanceOpts: [{ port: PORT, dbPath }],
  });
  const uri = rs.getUri("gavelup");
  console.log("\n✔ Local MongoDB running (Ctrl+C to stop)");
  console.log(`  MONGODB_URI=${uri}\n`);

  const stop = async () => {
    await rs.stop({ doCleanup: false, force: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 1 << 30); // keep alive
}

main().catch((err) => {
  console.error("✖ Could not start local MongoDB:", err.message);
  process.exit(1);
});
