import mongoose from "mongoose";

// NoSQL-injection guard: every request body/query is parsed with zod into primitive
// strings/numbers before it reaches a filter, so `$`-operator objects can't get through.
mongoose.set("strictQuery", true);

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Cache the connection across hot reloads (dev) and warm serverless invocations (prod).
const g = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = g.__mongoose ?? (g.__mongoose = { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    cache.promise = mongoose
      .connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        dbName: process.env.MONGODB_DB || undefined,
      })
      .catch((err) => {
        cache.promise = null; // allow retry on next request
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
