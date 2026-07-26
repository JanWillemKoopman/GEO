import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { runWorker } from "@/lib/jobs/worker";
import { describeError } from "@/lib/errors";

/**
 * GET /api/cron/worker — de motor (optimalisatie.md 1.1).
 *
 * Draait elke minuut (zie vercel.json) en werkt de wachtrij af. Dit is wat de
 * belofte "je kunt dit scherm sluiten" waarmaakt: het werk hangt niet meer aan
 * een openstaande browsertab maar aan deze cron.
 *
 * Beveiligd met CRON_SECRET, net als de wekelijkse lus. Vercel Cron stuurt dat
 * automatisch mee als Authorization-header wanneer de env-variabele zo heet.
 *
 * De werker houdt zelf een tijdbudget aan (40s) en stopt netjes; wat blijft
 * liggen wordt een minuut later opgepakt. Vastgelopen taken van een afgebroken
 * vorige aanroep worden aan het begin teruggezet.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWorker();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Werker mislukt:", err);
    return NextResponse.json({ error: "Werker mislukt.", detail: describeError(err) }, { status: 500 });
  }
}
