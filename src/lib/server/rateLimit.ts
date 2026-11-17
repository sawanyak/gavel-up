import { ApiError, isDuplicateKey } from "./errors";
import { RateLimit } from "./models";

/**
 * Fixed-window rate limit backed by MongoDB so it works across serverless instances.
 * Throws 429 when `limit` is exceeded within `windowSec`.
 */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  if (process.env.DISABLE_RATE_LIMIT === "1") return;
  const windowMs = windowSec * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs * 2);
  let doc;
  try {
    doc = await RateLimit.findOneAndUpdate(
      { key, windowStart },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, new: true },
    );
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    // Two concurrent upserts raced; the second one retries as a plain update.
    doc = await RateLimit.findOneAndUpdate({ key, windowStart }, { $inc: { count: 1 } }, { new: true });
  }
  if (doc && doc.count > limit) {
    throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Please wait a moment and try again.");
  }
}
