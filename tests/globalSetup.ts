import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { GlobalSetupContext } from "vitest/node";

// A single-node replica set (not a standalone server) so MongoDB transactions work,
// exactly like Atlas.
export default async function setup({ provide }: GlobalSetupContext) {
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  provide("mongoUri", rs.getUri());
  return async () => {
    await rs.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
