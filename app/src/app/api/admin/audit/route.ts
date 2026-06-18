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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (serviceClient as any)
    .from("audit_log")
    .select("id, created_at, entity, entity_id, action, before, after, user:users(full_name,email)", { count: "exact" })
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

  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, pageSize });
}
