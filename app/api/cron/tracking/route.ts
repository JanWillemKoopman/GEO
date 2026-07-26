import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueMeasurement } from "@/lib/jobs/queue";
import { maxMeasurementPeriods } from "@/lib/config";

/**
 * GET /api/cron/tracking — de terugkerende meting (abcplan.md §6 A3, §12.4).
 *
 * MAANDELIJKS, niet wekelijks (optimalisatie.md 2.1). De zichtbaarheid van een
 * MKB'er in AI-assistenten verandert niet van week tot week, en met een
 * 95%-band van ±16 punten is een verschil tussen twee opeenvolgende weken
 * vrijwel altijd ruis. Minder maar betekenisvollere meetpunten geven een
 * bruikbaarder trendlijn — en het scheelt ruim de helft van de kosten.
 *
 * Plant nu meettaken in plaats van de meting synchroon te draaien
 * (optimalisatie.md 1.4). Daarmee is ook de laatste plek weg waar het aantal
 * vragen tegen de tijdslimiet van één route aanliep: deze cron zet alleen taken
 * klaar en is in milliseconden klaar, hoeveel analyses er ook actief zijn.
 *
 * De aggregatie ketent zichzelf aan de laatste meettaak (1.5).
 */
export const maxDuration = 60;


export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: analyses } = await admin
    .from("analyses")
    .select("id")
    .eq("tracking_enabled", true)
    .in("status", ["gemeten", "gereed"]);

  const results: { id: string; period: number; planned: number }[] = [];

  for (const a of analyses ?? []) {
    const { data: lastWeek } = await admin
      .from("visibility_scores")
      .select("week_no")
      .eq("analysis_id", a.id)
      .order("week_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    // `week_no` is een PERIODE-index, geen kalenderweek — met een maandelijkse
    // cadans is periode 1 de eerste hermeting, een maand na de nulmeting. De
    // kolomnaam blijft staan tot fase 6, waar de trendweergave gebouwd wordt.
    const nextPeriod = (lastWeek?.week_no ?? 0) + 1;
    if (nextPeriod > maxMeasurementPeriods) continue;

    const { planned } = await enqueueMeasurement(admin, a.id as string, nextPeriod);
    results.push({ id: a.id as string, period: nextPeriod, planned });
  }

  return NextResponse.json({ analyses: results.length, results });
}
