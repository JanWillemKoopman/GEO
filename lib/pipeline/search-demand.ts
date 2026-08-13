import "server-only";

/**
 * De profielbrede herkalibratie van zoekvolume (docs/tasks/potentiescore.md §2,
 * stap B).
 *
 * ── WAAROM DIT EEN APARTE STAP IS, NIET EEN UITBREIDING VAN `calibrateVolumes` ──
 *
 * `calibrateVolumes()` (lib/pipeline/prompts.ts) schat het zoekvolume van de
 * vragen van ÉÉN analyse, relatief ten opzichte van elkaar. Dat maakt de
 * onderwerpen van twee analyses niet vergelijkbaar: de zwaarste vraag van een
 * kleine nichemarkt komt op precies dezelfde manier dicht bij 100 uit als de
 * zwaarste vraag van een grote markt, want beide aanroepen kregen de opdracht
 * "gebruik de volle schaal" op hun eigen, geïsoleerde lijst. Geen rekensom ná
 * afloop kan dat repareren, de ruwe cijfers zijn niet oneerlijk afgerond, ze
 * zijn niet-vergelijkbaar aan de bron.
 *
 * Deze stap lost dat op door NOOIT één analyse te herwegen, maar ALTIJD alle
 * onderwerpen van een merk in één aanroep tegen elkaar af te zetten, met
 * dezelfde vaste ijkpunten als `calibrateVolumes()`
 * (`SEARCH_VOLUME_ANCHORS`). Zo betekent 70 bij dit merk hetzelfde als 70 bij
 * elk ander merk: "ongeveer zo veel gezocht als een hypotheekadviseur in één
 * regio", niet "de zwaarste vraag van deze ene analyse".
 *
 * ── WANNEER DIT DRAAIT ──────────────────────────────────────────────────────
 *
 * Getriggerd vanuit `generateReport()` zodra een analyse zijn EERSTE rapport
 * krijgt (`weekNo === 0`): dat is het moment waarop een onderwerp de
 * vergelijking binnenkomt. Een herhaalde maandmeting van een onderwerp dat al
 * meetelde triggert dit niet opnieuw, dat onderwerp verandert niet van
 * zoekvolume omdat het voor de derde keer gemeten wordt.
 *
 * ── ALLES WORDT VERVANGEN, NOOIT AANGEVULD ───────────────────────────────────
 *
 * Elke keer dat deze stap draait, krijgen ALLE onderwerpen van dit merk een
 * nieuwe `search_volume_index`, ook de onderwerpen die deze keer inhoudelijk
 * niet veranderd zijn. Een onderwerp dat vorige maand op 80 stond kan deze
 * maand op 55 uitkomen, niet omdat het zelf veranderde, maar omdat er nu een
 * onderwerp bijkwam dat er met recht boven hoort te staan. Dat is precies de
 * eis: eerlijk blijven over de analyses van dit merk heen.
 */
import { z } from "zod";
import { callStructured, type StructuredCallResult } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { SEARCH_VOLUME_ANCHORS } from "@/lib/pipeline/prompts";

const SearchDemandCalibration = z.object({
  scores: z.array(
    z.object({
      index: z.number(),
      volume: z.number(),
      /** Eén zin, voor de tooltip in de app. */
      reasoning: z.string(),
    }),
  ),
});

/** Meer dan dit aantal onderwerpen in één aanroep is geen realistisch geval
 * (5-8 topics per merk, zie propose-topics.ts), maar een vangnet hoort er te
 * staan: de zwaarst wegende onderwerpen (hoogste ruwe schatting) gaan voor. */
const MAX_TOPICS_PER_CALL = 40;

/** Hoeveel voorbeeldvragen per onderwerp meegaan, ter concretisering. */
const EXAMPLES_PER_TOPIC = 3;

export interface RecalibrationResult {
  /** Aantal onderwerpen dat een nieuwe index kreeg. 0 = niets te herberekenen of de aanroep faalde. */
  updated: number;
  costUsd: number;
}

interface TopicRow {
  id: string;
  title: string;
  rationale: string | null;
  analysis_id: string;
}

/**
 * Herberekent `search_volume_index` voor alle niet-gearchiveerde onderwerpen
 * van een merk die al minstens één rapport hebben (dus al meetellen).
 */
export async function recalibrateSearchVolume(profileId: string): Promise<RecalibrationResult> {
  const admin = createAdminClient();

  const { data: topicRows } = await admin
    .from("profile_topics")
    .select("id, title, rationale, analysis_id")
    .eq("profile_id", profileId)
    .not("analysis_id", "is", null);

  const alleTopics = (topicRows ?? []) as TopicRow[];
  if (alleTopics.length === 0) return { updated: 0, costUsd: 0 };

  // Gearchiveerde analyses tellen niet mee: een onderwerp waar de klant mee
  // gestopt is, mag de schaal van de actieve onderwerpen niet beïnvloeden
  // (docs/tasks/potentiescore.md §5, keuze 2). Twee stappen in plaats van een
  // inner join, want zonder gegenereerde Supabase-types levert een geneste
  // `select` hier een array terug in plaats van één object.
  const { data: analysisRows } = await admin
    .from("analyses")
    .select("id, archived_at")
    .in("id", alleTopics.map((t) => t.analysis_id));
  const nietGearchiveerd = new Set(
    ((analysisRows ?? []) as { id: string; archived_at: string | null }[])
      .filter((a) => !a.archived_at)
      .map((a) => a.id),
  );
  const topics = alleTopics.filter((t) => nietGearchiveerd.has(t.analysis_id));
  if (topics.length === 0) return { updated: 0, costUsd: 0 };

  // Alleen onderwerpen die al minstens één rapport hadden, tellen mee: dat is
  // "de analyse is afgerond" uit de vraag. Een onderwerp waarvan de eerste
  // meting nog loopt heeft nog geen enkel gemeten gegeven en hoort dus nog
  // niet in de vergelijking.
  const analysisIds = [...new Set(topics.map((t) => t.analysis_id))];
  const { data: reportRows } = await admin
    .from("reports")
    .select("analysis_id")
    .in("analysis_id", analysisIds);
  const gemeten = new Set(((reportRows ?? []) as { analysis_id: string }[]).map((r) => r.analysis_id));
  const eligible = topics.filter((t) => gemeten.has(t.analysis_id));
  if (eligible.length === 0) return { updated: 0, costUsd: 0 };

  // Voorbeeldvragen per onderwerp: de zwaarst wegende uit de ruwe, per-analyse
  // schatting van calibrateVolumes(), zodat het model iets concreets ziet in
  // plaats van alleen een titel.
  const { data: promptRows } = await admin
    .from("prompts")
    .select("analysis_id, text, volume_estimate")
    .in("analysis_id", eligible.map((t) => t.analysis_id))
    .eq("active", true)
    .order("volume_estimate", { ascending: false, nullsFirst: false });

  const examplesByAnalysis = new Map<string, string[]>();
  for (const p of (promptRows ?? []) as { analysis_id: string; text: string }[]) {
    const lijst = examplesByAnalysis.get(p.analysis_id) ?? [];
    if (lijst.length < EXAMPLES_PER_TOPIC) {
      lijst.push(p.text);
      examplesByAnalysis.set(p.analysis_id, lijst);
    }
  }

  // Vangnet: te veel onderwerpen in één aanroep is geen verwachte situatie
  // (5-8 per merk), maar zou wel een onbegrensde en steeds duurdere aanroep
  // opleveren naarmate een merk langer meedraait.
  const gekozen = eligible.slice(0, MAX_TOPICS_PER_CALL);
  if (eligible.length > MAX_TOPICS_PER_CALL) {
    console.warn(
      `Zoekvolume-herkalibratie profiel ${profileId}: ${eligible.length} onderwerpen, ` +
        `afgekapt tot ${MAX_TOPICS_PER_CALL}.`,
    );
  }

  const numbered = gekozen
    .map((t, i) => {
      const voorbeelden = examplesByAnalysis.get(t.analysis_id) ?? [];
      const onderbouwing = t.rationale ? ` (${t.rationale})` : "";
      const vb = voorbeelden.length > 0 ? `\n   voorbeeldvragen: ${voorbeelden.map((v) => `"${v}"`).join(", ")}` : "";
      return `${i + 1}. ${t.title}${onderbouwing}${vb}`;
    })
    .join("\n");

  let result: StructuredCallResult<z.infer<typeof SearchDemandCalibration>>;
  try {
    result = await callStructured({
      model: MODELS.quality,
      system:
        "Je bent een zoekgedrag-analist. Hieronder staan ALLE onderwerpen waarop één merk zichtbaar " +
        "wil zijn in AI-antwoorden. Schat voor elk onderwerp hoe vaak mensen er in totaal over zoeken " +
        "(alle vragen binnen dat onderwerp samen), RELATIEF ten opzichte van de andere onderwerpen in " +
        "deze lijst. Gebruik de volle schaal 0-100.\n\n" +
        SEARCH_VOLUME_ANCHORS +
        "\n\nGeef bij elk onderwerp ook één korte zin (reasoning) die uitlegt waarom het op dat niveau " +
        "staat, in gewone taal voor een ondernemer, geen jargon.",
      user: `Onderwerpen:\n${numbered}`,
      schema: SearchDemandCalibration,
      schemaName: "search_demand_calibration",
      webSearch: false,
      work: "content",
      meta: { kind: "search_demand_calibration", profileId },
    });
  } catch (err) {
    console.error(`Zoekvolume-herkalibratie mislukt voor profiel ${profileId}:`, err);
    // Niets overschrijven: de vorige, nog steeds geldige waarden blijven staan.
    // Beter een verouderd cijfer dan een verzonnen cijfer (conventie 3).
    return { updated: 0, costUsd: 0 };
  }

  const byIndex = new Map(result.parsed.scores.map((s) => [Math.round(s.index), s]));
  let updated = 0;
  await Promise.all(
    gekozen.map(async (t, i) => {
      const s = byIndex.get(i + 1);
      if (!s) return; // Ontbreekt het model een onderwerp, dan blijft de oude waarde staan.
      const { error } = await admin
        .from("profile_topics")
        .update({
          search_volume_index: Math.max(0, Math.min(100, Math.round(s.volume))),
          search_volume_reasoning: s.reasoning?.trim() || null,
        })
        .eq("id", t.id);
      if (!error) updated++;
    }),
  );

  return { updated, costUsd: result.costUsd };
}
