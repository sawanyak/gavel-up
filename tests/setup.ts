import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";
import { connectDB, disconnectDB } from "@/lib/server/db";
import { syncAllIndexes } from "@/lib/server/models";

process.env.MONGODB_URI = inject("mongoUri");
process.env.MONGODB_DB = "gavelup_test";

beforeAll(async () => {
  await connectDB();
  await syncAllIndexes();
});

beforeEach(async () => {
  // Fresh data for every test (indexes are kept).
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await disconnectDB();
});
