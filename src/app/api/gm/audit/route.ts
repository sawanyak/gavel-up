import { auditQuerySchema } from "@/lib/shared/validation";
import type { AuditItem } from "@/lib/shared/types";
import { getActiveGame, requireGM } from "@/lib/server/auth/guards";
import { json, route } from "@/lib/server/errors";
import { AuditLog } from "@/lib/server/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/gm/audit?before=&limit=&action= — newest first, paginated with `before`. */
export const GET = route(async (req) => {
  await requireGM(req);
  const url = new URL(req.url);
  const q = auditQuerySchema.parse({
    before: url.searchParams.get("before") || undefined,
    limit: url.searchParams.get("limit") || undefined,
    action: url.searchParams.get("action") || undefined,
  });
  const game = await getActiveGame();
  const filter: Record<string, unknown> = { $or: [{ gameId: game._id }, { gameId: null }] };
  if (q.before) filter.createdAt = { $lt: new Date(q.before) };
  if (q.action) filter.action = q.action;
  const docs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(q.limit + 1).lean();
  const items: AuditItem[] = docs.slice(0, q.limit).map((d) => ({
    id: String(d._id),
    at: (d.createdAt as Date).toISOString(),
    actor: { type: d.actor?.type ?? "?", name: d.actor?.name ?? "" },
    action: d.action,
    target: d.target?.id ? { type: d.target.type ?? "?", id: String(d.target.id) } : null,
    before: d.before ?? null,
    after: d.after ?? null,
  }));
  return json({ items, hasMore: docs.length > q.limit, next: items.at(-1)?.at ?? null });
});
