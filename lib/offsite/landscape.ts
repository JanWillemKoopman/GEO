import "server-only";

/**
 * Welke bronnen bepalen deze markt? (optimalisatie.md 7.1)
 *
 * De metingen laten zien dat AI-assistenten voor koopvragen zwaar leunen op
 * ándere sites: reviewplatforms, vergelijkers, lijstjes, vakpers, fora. Die
 * bronnen stonden al in de database, `tracking_run_mentions.cited_sources`
 * wordt bij elke meting gevuld, maar werden alleen als kale URL-lijst in de
 * uitsplitsing getoond. Het enige advies dat het product kon geven was "schrijf
 * een pagina op je eigen site", en daarmee zit er een plafond op het resultaat
 * dat je met betere teksten niet wegneemt.
 *
 * Geen AI-aanroep: dit is groeperen en tellen.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SourceLandscapeRow } from "@/lib/types/database";
import { domainOf, IGNORED_DOMAINS, MIN_CITATIONS, MAX_DOMAINS } from "@/lib/offsite/domain";

export { domainOf } from "@/lib/offsite/domain";

type Admin = SupabaseClient;

export interface DomainStat {
  domain: string;
  citations: number;
  promptCount: number;
  competitors: string[];
}

/**
 * Telt over ALLE metingen heen welke domeinen geciteerd worden, hoe vaak, bij
 * hoeveel verschillende vragen, en voor welke concurrenten.
 *
 * Over alle periodes en niet één: een bron die deze markt bepaalt, doet dat niet
 * alleen deze maand, en met één periode is elk domein statistisch toeval.
 */
export async function computeLandscape(
  admin: Admin,
  analysisId: string,
  ownDomain: string | null,
): Promise<DomainStat[]> {
  const { data: runs } = await admin
    .from("tracking_runs")
    .select("id, prompt_id")
    .eq("analysis_id", analysisId)
    .eq("purpose", "periodic");

  const runList = runs ?? [];
  if (runList.length === 0) return [];

  const promptByRun = new Map(runList.map((r) => [r.id as string, (r.prompt_id as string | null) ?? r.id]));

  const { data: mentions } = await admin
    .from("tracking_run_mentions")
    .select("tracking_run_id, entity_name, is_own_brand, mentioned, cited_sources")
    .in(
      "tracking_run_id",
      runList.map((r) => r.id as string),
    );

  const stats = new Map<
    string,
    { citations: number; prompts: Set<string>; competitors: Set<string> }
  >();

  for (const m of mentions ?? []) {
    const sources = (m.cited_sources ?? []) as string[];
    if (sources.length === 0) continue;

    const promptKey = promptByRun.get(m.tracking_run_id as string) ?? (m.tracking_run_id as string);

    for (const url of sources) {
      const domain = domainOf(url);
      if (!domain || IGNORED_DOMAINS.has(domain)) continue;
      if (ownDomain && domain === ownDomain) continue;

      const entry = stats.get(domain) ?? { citations: 0, prompts: new Set(), competitors: new Set() };
      entry.citations++;
      entry.prompts.add(promptKey);
      // Alleen concurrenten die via deze bron ook echt GENOEMD werden: dat is
      // de zin die het rapport moet kunnen maken.
      if (!m.is_own_brand && m.mentioned) entry.competitors.add(m.entity_name as string);
      stats.set(domain, entry);
    }
  }

  return Array.from(stats.entries())
    .map(([domain, e]) => ({
      domain,
      citations: e.citations,
      promptCount: e.prompts.size,
      competitors: Array.from(e.competitors).sort(),
    }))
    .filter((d) => d.citations >= MIN_CITATIONS)
    // Op aantal VRAGEN eerst: een bron die bij zes verschillende vragen opduikt
    // bepaalt de markt breder dan een die bij één vraag zes keer aangehaald wordt.
    .sort((a, b) => b.promptCount - a.promptCount || b.citations - a.citations)
    .slice(0, MAX_DOMAINS);
}

/** Schrijft het landschap weg, met behoud van eerdere aanwezigheidscontroles. */
export async function saveLandscape(
  admin: Admin,
  analysisId: string,
  stats: DomainStat[],
): Promise<SourceLandscapeRow[]> {
  if (stats.length === 0) return [];

  // De tellingen bijwerken maar `own_present` NIET aanraken: die kost een
  // gegroundde AI-aanroep en hoeft niet opnieuw als er alleen een citatie bij
  // is gekomen.
  const { data } = await admin
    .from("source_landscape")
    .upsert(
      stats.map((s) => ({
        analysis_id: analysisId,
        domain: s.domain,
        citations: s.citations,
        prompt_count: s.promptCount,
        competitors: s.competitors,
      })),
      { onConflict: "analysis_id,domain" },
    )
    .select("*");

  return (data ?? []) as SourceLandscapeRow[];
}
