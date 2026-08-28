import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
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
