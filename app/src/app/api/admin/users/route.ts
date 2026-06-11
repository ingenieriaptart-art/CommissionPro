import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { serviceClient } = auth;

  const body = await req.json().catch(() => null);
  const { email, password, full_name, role_id, position, phone } = body ?? {};

  if (!email || !password || !full_name || !role_id) {
    return NextResponse.json(
      { error: "email, password, full_name y role_id son requeridos" },
      { status: 400 }
    );
  }

  const { data: authData, error: authErr } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr) {
    const is409 = authErr.status === 422;
    return NextResponse.json(
      { error: is409 ? "Este email ya está registrado" : authErr.message },
      { status: is409 ? 409 : 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newUser, error: insertErr } = await (serviceClient as any)
    .from("users")
    .insert({
      auth_user_id:         authData.user.id,
      email,
      full_name,
      role_id,
      position:             position ?? null,
      phone:                phone    ?? null,
      status:               "active",
      must_change_password: false,
    })
    .select("*, role:roles(id,key,name)")
    .single();

  if (insertErr) {
    await serviceClient.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json(newUser, { status: 201 });
}
