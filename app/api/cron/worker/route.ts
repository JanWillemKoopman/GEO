import { NextResponse } from "next/server";
import { cronAuthOk } from "@/lib/cron-auth";
import { runWorker } from "@/lib/jobs/worker";
import { describeError } from "@/lib/errors";

/**
 * GET /api/cron/worker, de motor (optimalisatie.md 1.1).
 *
 * Draait elke minuut (zie vercel.json) en werkt de wachtrij af. Dit is wat de
 * belofte "je kunt dit scherm sluiten" waarmaakt: het werk hangt niet meer aan
 * een openstaande browsertab maar aan deze cron.
 *
 * Beveiligd met CRON_SECRET, net als de wekelijkse lus. Vercel Cron stuurt dat
 * automatisch mee als Authorization-header wanneer de env-variabele zo heet.
 *
 * De werker houdt zelf een tijdbudget aan en stopt netjes; wat blijft liggen
 * wordt een minuut later opgepakt. Vastgelopen taken van een afgebroken vorige
 * aanroep worden aan het begin teruggezet.
 *
 * maxDuration staat op 300 en niet op 60: contentgeneratie laat het premium model een
 * volledige pagina schrijven, en dat past er niet in. 300s is het maximum dat
 * Vercel met Fluid Compute toestaat (ook op Hobby). Het tijdbudget van de
 * werker moet daar ruim onder blijven, zie workerTimeBudgetMs in lib/config.ts.
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthOk(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  try {
    const result = await runWorker();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Werker mislukt:", err);
    return NextResponse.json({ error: "De achtergrondwerker liep vast.", detail: describeError(err) }, { status: 500 });
  }
}
