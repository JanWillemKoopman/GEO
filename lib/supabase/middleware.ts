import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { isPubliekPad } from "@/lib/auth-paden";

/**
 * Ververst de Supabase-sessie op elke request en beschermt de app-routes.
 * Standaard @supabase/ssr-patroon: cookies worden zowel op de inkomende request
 * als op de uitgaande response gezet zodat de sessie geldig blijft.
 *
 * ⚠️ Welke adressen zonder sessie bereikbaar zijn, staat in `lib/auth-paden.ts`,
 * en dat is sinds 17 september 2026 een lijst uitzonderingen in plaats van een
 * lijst beschermde secties: alles is dicht behalve wat daar met reden genoemd
 * wordt. De reden voor die omkering staat in dat bestand.
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
  const isAuthPage = path === "/login" || path === "/register";

  // Niet ingelogd + geen publiek adres → naar het inlogscherm.
  if (!user && !isPubliekPad(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // ⚠️ Zonder de queryparameters van het vorige adres: het inlogscherm leest
    // er zelf twee (`check_email` en `reset_sent`) en zet daar een melding bij.
    // Meeliften levert dus een mededeling die nergens op slaat.
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Wel ingelogd + op een auth-pagina → naar de app.
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    // De wortel beslist waar je heen gaat: het overzicht van je merk, of de
    // merkenlijst als er nog geen keuze is (`app/page.tsx`).
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
