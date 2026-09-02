import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
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
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  try {
    // ⚠️ Eerst de geplande hermetingen, dan pas de wachtrij. Een hermeting die
    // vandaag aan de beurt is, zet veertig meettaken klaar; die worden dan in
    // dezelfde ronde van de werker meteen opgepakt in plaats van een minuut te
    // wachten. Het is één query op een gedeeltelijke index, dus als er niets
    // gepland staat, kost dit niets.
    let hermetingen = 0;
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { draaiGeplandeHermetingen } = await import("@/lib/pipeline/sales-remeasure");
      hermetingen = await draaiGeplandeHermetingen(createAdminClient());
    } catch (err) {
      // Een storing hier mag de wachtrij niet platleggen: de werker draait elke
      // minuut en doet veel meer dan dit.
      console.error("Geplande hermetingen mislukt:", err);
    }

    const result = await runWorker();
    return NextResponse.json({ ...result, hermetingen });
  } catch (err) {
    console.error("Werker mislukt:", err);
    return NextResponse.json({ error: "De achtergrondwerker liep vast.", detail: describeError(err) }, { status: 500 });
  }
}
