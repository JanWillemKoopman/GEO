import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueue, enqueueMeasurement, dedupe } from "@/lib/jobs/queue";
import { maxMeasurementPeriods } from "@/lib/config";
import { mayMeasureAgain } from "@/lib/measure-cadence";
import { activeOnly } from "@/lib/archive";

/**
 * GET /api/cron/tracking, de terugkerende meting (abcplan.md §6 A3, §12.4).
 *
 * MAANDELIJKS, niet wekelijks (optimalisatie.md 2.1). De zichtbaarheid van een
 * MKB'er in AI-assistenten verandert niet van week tot week, en met een
 * 95%-band van ±18 punten is een verschil tussen twee opeenvolgende weken
 * vrijwel altijd ruis. Minder maar betekenisvollere meetpunten geven een
 * bruikbaarder trendlijn, en het scheelt ruim de helft van de kosten.
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
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  // ⚠️ Gearchiveerde analyses vallen hier NIET onder (migratie 0044).
  //
  // Dit is de duurste plek waar het filter kan ontbreken: zonder deze regel
  // plant de app elke maand een volledige meetronde in voor een merk dat
  // niemand meer in de app ziet staan, ~$0,40 per ronde per analyse, en
  // niemand die het merkt, want de uitkomst is nergens zichtbaar.
  const { data: analyses } = await activeOnly(
    admin
      .from("analyses")
      .select("id, profile_id")
      .eq("tracking_enabled", true)
      .in("status", ["gemeten", "gereed"]),
  );

  const results: { id: string; period: number; planned: number }[] = [];
  // Overgeslagen analyses komen in het antwoord terecht en niet alleen in een
  // logregel: dit endpoint is het enige venster op wat de maandronde deed, en
  // "waarom is deze klant niet gemeten" is precies de vraag die je dan stelt.
  const overgeslagen: { id: string; reden: string }[] = [];
  // Eén audit per profiel, niet per analyse: meerdere analyses van hetzelfde
  // merk delen dezelfde website, en die twee keer controleren levert twee
  // identieke uitslagen op.
  const auditedProfiles = new Set<string>();

  for (const a of analyses ?? []) {
    // Herhaalcontrole (optimalisatie.md 3.8). Een blokkade kan er morgen zijn
    // na een aanpassing door de webbouwer, en dan moet de klant dat horen,
    // een audit die alleen bij het aanmaken draait, veroudert stil.
    const profileId = a.profile_id as string | null;
    if (profileId && !auditedProfiles.has(profileId)) {
      auditedProfiles.add(profileId);
      await enqueue(admin, {
        type: "technical_audit",
        payload: {},
        profileId,
        dedupeKey: dedupe.technicalAudit(profileId),
      });
    }

    const { data: lastWeek } = await admin
      .from("visibility_scores")
      .select("week_no, computed_at")
      .eq("analysis_id", a.id)
      .order("week_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ⚠️ Niet alleen "is er al een volgende periode", maar ook "is de vorige
    // lang genoeg geleden" (12 augustus 2026). Zonder deze controle meet een
    // klant die op 28 augustus is aangesloten alweer op 1 september: een volle
    // betaalde ronde vier dagen later, en een punt op de trendlijn dat vier
    // dagen verandering toont alsof het een maand is. Zie lib/measure-cadence.ts
    // voor het bewijs uit de database.
    const cadans = mayMeasureAgain(lastWeek?.computed_at as string | null);
    if (!cadans.ok) {
      overgeslagen.push({ id: a.id as string, reden: cadans.reason });
      continue;
    }

    // `week_no` is een PERIODE-index, geen kalenderweek, met een maandelijkse
    // cadans is periode 1 de eerste hermeting, een maand na de nulmeting. De
    // kolomnaam blijft staan tot fase 6, waar de trendweergave gebouwd wordt.
    const nextPeriod = (lastWeek?.week_no ?? 0) + 1;
    if (nextPeriod > maxMeasurementPeriods) continue;

    const { planned } = await enqueueMeasurement(admin, a.id as string, nextPeriod);
    results.push({ id: a.id as string, period: nextPeriod, planned });
  }

  return NextResponse.json({
    analyses: results.length,
    results,
    overgeslagen: overgeslagen.length,
    overgeslagenDetails: overgeslagen,
  });
}
