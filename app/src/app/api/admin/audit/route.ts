import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

const MAX_PAGE_SIZE = 200;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const sp = req.nextUrl.searchParams;
  const page     = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(sp.get("pageSize") ?? "50", 10) || 50));
  const userId = sp.get("userId");
  const entity = sp.get("entity");
  const action = sp.get("action");
  const from   = sp.get("from");
  const to     = sp.get("to");
  const q      = sp.get("q");

  // NOTA: audit_log.user_id NO tiene FK a users (tabla append-only), así que no se
  // puede usar el embed de PostgREST. Se resuelven los nombres en una 2ª consulta.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (serviceClient as any)
    .from("audit_log")
    .select("id, created_at, user_id, entity, entity_id, action, before, after", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (userId) query = query.eq("user_id", userId);
  if (entity) query = query.eq("entity", entity);
  if (action) query = query.eq("action", action);
  if (from)   query = query.gte("created_at", from);
  if (to)     query = query.lte("created_at", to);
  if (q)      query = query.ilike("entity", `%${q}%`);

  const fromIdx = (page - 1) * pageSize;
  query = query.range(fromIdx, fromIdx + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditRows: any[] = data ?? [];

  // Resolver nombres de usuario (join manual).
  const ids = [...new Set(auditRows.map((r) => r.user_id).filter(Boolean))];
  const userMap = new Map<string, { full_name: string; email: string }>();
  if (ids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: us } = await (serviceClient as any)
      .from("users")
      .select("id, full_name, email")
      .in("id", ids);
    for (const u of us ?? []) userMap.set(u.id, { full_name: u.full_name, email: u.email });
  }

  const rows = auditRows.map((r) => ({
    id:         r.id,
    created_at: r.created_at,
    user:       r.user_id ? (userMap.get(r.user_id) ?? null) : null,
    entity:     r.entity,
    entity_id:  r.entity_id,
    action:     r.action,
    before:     r.before,
    after:      r.after,
  }));

  return NextResponse.json({ rows, total: count ?? 0, page, pageSize });
}
