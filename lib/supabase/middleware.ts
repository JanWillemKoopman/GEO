import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Ververst de Supabase-sessie op elke request en beschermt de app-routes.
 * Standaard @supabase/ssr-patroon: cookies worden zowel op de inkomende request
 * als op de uitgaande response gezet zodat de sessie geldig blijft.
 *
 * ⚠️ `requestHeaders` (17 september 2026, redesign2026.md §8.12.6) is een
 * eigen `Headers`-kopie van `request.headers` met `x-apparaat` erop, gezet
 * door `middleware.ts` vóór deze functie. Hij gaat overal waar deze functie
 * een `NextResponse.next({ request })` bouwt mee als het `request`-argument,
 * in plaats van het ongewijzigde `request` zelf: alleen zo komt de header bij
 * `headers()` in een servercomponent terecht. Een header die je pas op de
 * REACTIE zet (`response.headers.set(...)`) bereikt de browser, maar nooit
 * `next/headers` tijdens hetzelfde verzoek, want die leest de headers van het
 * inkomende verzoek zoals de middleware ze doorgeeft.
 *
 * Optioneel en met een terugval op `request.headers` zelf, zodat een aanroep
 * zonder dit argument (een test, een toekomstige caller) niet breekt.
 */
export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const headers = requestHeaders ?? new Headers(request.headers);
  let response = NextResponse.next({ request: { headers } });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers } });
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
  // `/solliciteren` is het zijproject (14 september 2026): een eigen app van
  // één pagina, achter dezelfde inlog. Hij hoort in deze lijst om dezelfde
  // reden als de rest: de pagina zelf roept `requireUser()` aan, dus er lekt
  // niets, maar zonder deze regel krijgt een bezoeker zonder sessie eerst een
  // server-render en pas daarna het inlogscherm.
  const isProtected = [
    "/analyses",
    "/merk",
    "/instellingen",
    "/beheer",
    "/sales",
    "/solliciteren",
  ].some((p) => path === p || path.startsWith(`${p}/`));
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
