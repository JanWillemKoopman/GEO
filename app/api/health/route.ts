import { NextResponse } from "next/server";
import { envStatus } from "@/lib/env";
import { cronAuthOk } from "@/lib/cron-auth";

/**
 * Health-check.
 *
 * ── TWEE ANTWOORDEN, EN DAT IS DE HELE POINTE (antihack.md M2) ──────────────
 *
 * Tot 29 augustus 2026 gaf deze route aan IEDEREEN die het adres kende terug
 * welke omgevingsvariabelen gezet waren, of e-mail aan stond, en de volledige
 * modeltabel uit `lib/openai/models.ts`. Geen sleutelwaarden, dat was goed
 * gedaan. Maar het is wel een gratis kaart van de infrastructuur, en welke
 * AI-modellen we draaien is bedrijfsinformatie.
 *
 * Nu:
 *   • zonder sleutel: alleen "de app leeft". Dat is precies wat een
 *     uptime-monitor nodig heeft, en die blijft dus gewoon werken;
 *   • met de cron-sleutel: de volledige stand, om na een deploy te zien of
 *     Vercel goed staat.
 *
 * ⚠️ Deze route is samen met `/api/invites/accept` een van de twee onder
 * `app/api/` zonder sessiecontrole, en dat is met opzet. Staat er ooit een derde
 * bij, dan hoort daar een even expliciete uitleg als deze bij te staan.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const basis = { status: "ok", time: new Date().toISOString() };

  // ⚠️ DE TRY/CATCH IS HIER GEEN SLORDIGHEID MAAR DE HELE TRUC.
  //
  // `cronAuthOk` leest `serverEnv.cronSecret`, en die getter GOOIT als
  // CRON_SECRET niet gezet is. In een cron-route is dat precies goed: geen
  // sleutel betekent daar een 500 en dus geen toegang. Hier zou datzelfde gedrag
  // de health-check laten omvallen op exact het moment dat je hem nodig hebt,
  // namelijk bij een deploy waar variabelen ontbreken.
  //
  // Een fout betekent hier dus: niet geautoriseerd, geef het korte antwoord. De
  // app leeft immers, dat is wat deze route moet zeggen.
  let bevoegd = false;
  try {
    bevoegd = cronAuthOk(request.headers.get("authorization"));
  } catch {
    bevoegd = false;
  }

  if (!bevoegd) return NextResponse.json(basis);

  return NextResponse.json({ ...basis, service: "geo-tracker", env: envStatus() });
}
