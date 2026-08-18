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
  // ⚠️ Elke ingelogde sectie hoort hier te staan, niet alleen `/analyses`. Sinds
  // de herindeling van 17 augustus 2026 zit het merendeel van de app onder
  // `/merk`, en dat viel buiten deze controle. De pagina's zelf roepen
  // `requireUser()` aan, dus er lekte niets, maar een bezoeker zonder sessie
  // kreeg een omweg via een server-render in plaats van meteen het inlogscherm.
  const isProtected = ["/analyses", "/merk", "/instellingen", "/beheer"].some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
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
    // De wortel beslist waar je heen gaat: het overzicht van je merk, of de
    // merkenlijst als er nog geen keuze is (`app/page.tsx`).
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
