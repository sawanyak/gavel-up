import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { connectDB } from "./db";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new ApiError(400, code, message, details);
export const unauthenticated = (message = "Please log in.", code = "UNAUTHENTICATED") =>
  new ApiError(401, code, message);
export const forbidden = (message = "You are not allowed to do that.", code = "FORBIDDEN") =>
  new ApiError(403, code, message);
export const notFound = (message = "Not found.", code = "NOT_FOUND") => new ApiError(404, code, message);
export const conflict = (code: string, message: string, details?: unknown) =>
  new ApiError(409, code, message, details);

export function errorResponse(err: ApiError) {
  return NextResponse.json(
    { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } },
    { status: err.status, headers: { "Cache-Control": "no-store" } },
  );
}

function isDbUnavailable(err: unknown) {
  const name = (err as { name?: string })?.name ?? "";
  return (
    name === "MongooseServerSelectionError" ||
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNotConnectedError" ||
    (err instanceof Error && err.message === "MONGODB_URI is not set")
  );
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler: connects DB, maps errors to the standard JSON error shape. */
export function route<C = { params: Record<string, string> }>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      await connectDB();
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return errorResponse(err);
      if (err instanceof ZodError) {
        return errorResponse(
          badRequest("VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.", err.flatten().fieldErrors),
        );
      }
      if (isDbUnavailable(err)) {
        const res = errorResponse(new ApiError(503, "DB_UNAVAILABLE", "Server is busy, retrying…"));
        res.headers.set("Retry-After", "3");
        return res;
      }
      console.error("[api] unhandled error", err);
      return errorResponse(new ApiError(500, "INTERNAL_ERROR", "Something went wrong."));
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest("VALIDATION_ERROR", "Request body must be JSON.");
  }
}

export const isDuplicateKey = (err: unknown) => (err as { code?: number })?.code === 11000;

export function json(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
