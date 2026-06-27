import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/reset-password");
  const isApi  = pathname.startsWith("/api/");

  if (!session && !isAuth) {
    if (isApi) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isAuth) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  // Excluye también el service worker (sw.js) y el worker de serwist para que se
  // sirvan directos desde public/ sin pasar por el redirect de sesión del proxy.
  // (No toca la lógica de sesión; solo evita que el registro/actualización del SW
  //  caiga en un redirect a /login para usuarios no autenticados.)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|api|sw\\.js|swe-worker-.*\\.js|.*\\.html|.*\\.png|.*\\.svg).*)"],
};
