import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Ververst de Supabase-sessie op elke request en beschermt de app-routes.
 * Standaard @supabase/ssr-patroon: cookies worden zowel op de inkomende request
 * als op de uitgaande response gezet zodat de sessie geldig blijft.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/analyses");
  const isAuthPage = path === "/login" || path === "/register";

  // Niet ingelogd + beschermde route → naar login.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Wel ingelogd + op een auth-pagina → naar de app.
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/analyses";
    return NextResponse.redirect(url);
  }

  return response;
}
