import { type NextRequest, userAgent } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // ── DE APPARAATDETECTIE (17 SEPTEMBER 2026, STAP 5 VAN REDESIGN2026.MD) ────
  //
  // `x-apparaat` wordt hier gezet op een KOPIE van de verzoekheaders, en pas
  // daarna aan `updateSession` doorgegeven, die hem overal gebruikt waar hij
  // een `NextResponse.next({ request })` bouwt. Dat is met opzet geen
  // `response.headers.set(...)` na afloop: dat zou een headerregel op de
  // reactie aan de browser zetten, terwijl `lib/apparaat.ts` de headers van
  // het VERZOEK leest via `next/headers`. Zie de toelichting in
  // `lib/supabase/middleware.ts`.
  //
  // Geen extra netwerkronde: de middleware draait al op elke pagina voor de
  // sessie, en de useragent staat al in dit verzoek.
  const requestHeaders = new Headers(request.headers);
  const { device } = userAgent(request);
  // ⚠️ Een tablet is bewust GEEN telefoon. `redesign2026.md` §8.12.5: de
  // tussenstand tussen 768 en 1024 pixels is de desktopopmaak met de zijbalk
  // ingeklapt, geen derde ontwerp. Alleen `device.type === "mobile"` (een
  // telefoon) krijgt de mobiele structuur uit stap 6 en 7.
  requestHeaders.set("x-apparaat", device.type === "mobile" ? "telefoon" : "computer");
  // `x-pad`: het pad van dit verzoek, voor `lib/pad.ts`. Zelfde reden als
  // `x-apparaat` hierboven: een servercomponent zoals `analyses/[id]/layout.tsx`
  // kent alleen de `params` van zijn eigen segment, en heeft soms wél het volle
  // pad nodig om te weten of een dieper geneste route zijn eigen chrome toont.
  requestHeaders.set("x-pad", request.nextUrl.pathname);

  return await updateSession(request, requestHeaders);
}

export const config = {
  matcher: [
    /*
     * Draai op alles behalve:
     * - Next.js interne assets (_next/static, _next/image)
     * - favicon en statische afbeeldingen
     * - alle API-routes (zie hieronder)
     *
     * ── ⚠️ WAAROM /api ER SINDS 28 AUGUSTUS 2026 BUITEN VALT ────────────────
     *
     * De middleware doet precies twee dingen: de sessie verversen en een
     * bezoeker zonder sessie van een beschermde PAGINA naar het inlogscherm
     * sturen. Voor een API-route heeft ze allebei niets te bieden. Een
     * doorverwijzing naar HTML is niet wat een `fetch()` wil, en verversen doet
     * de route zelf: in een route handler mag `cookies()` wél schrijven (dat
     * is precies waarom `app/api/invites/accept` iemand daar kan inloggen),
     * dus `getUser()` in de handler vernieuwt het token net zo goed.
     *
     * Wat ze wél kostte: een volledige netwerkronde naar de Auth-server van
     * Supabase vóór de handler ook maar begon. Elke knop in de app doet een
     * `fetch()` naar een API-route en daarna een verversing van het scherm, dus
     * die ronde zat in élke klik. Alle 34 routes doen hun eigen controle
     * (`getUser()`, of de cron-sleutel); de twee die dat niet doen, `health` en
     * `invites/accept`, zijn met opzet publiek.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
