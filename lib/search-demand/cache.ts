import "server-only";

/**
 * Zoekvolumes ophalen: eerst de cache, dan pas de leverancier
 * (docs/tasks/zoekdata-in-de-keten.md, blok B, migratie 0104).
 *
 * ── DE CACHE IS NIET OPTIONEEL ──────────────────────────────────────────────
 *
 * Dezelfde zoekterm twee keer ophalen is twee keer betalen voor hetzelfde
 * getal. Volumes veranderen maandelijks, niet dagelijks: een rij jonger dan
 * `CACHE_GELDIGHEID_DAGEN` wordt nooit opnieuw opgehaald.
 *
 * ── ZONDER LEVERANCIER, ZONDER FOUTMELDING ──────────────────────────────────
 *
 * Is er geen sleutel (`searchDemandProvider()` geeft `null`), dan levert deze
 * functie terug wat de cache al heeft, en niets voor de rest. Geen throw, geen
 * placeholder: dat is precies "zonder sleutel gedraagt de app zich identiek".
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { searchDemandProvider } from "@/lib/search-demand/registry";
import type { SearchDemandResult } from "@/lib/search-demand/types";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe lang een gecachet volume geldig blijft. Volumes veranderen maandelijks. */
export const CACHE_GELDIGHEID_DAGEN = 30;

export interface KeywordVolume {
  keyword: string;
  volume: number | null;
  competition: number | null;
  cpc: number | null;
  /** "gemeten" = uit de cache of vers opgehaald bij een echte leverancier. Geen "geschat": deze module gokt nooit zelf. */
  fetchedAt: string;
}

/**
 * Voor elke zoekterm het volume, eerst uit de cache, de rest vers opgehaald
 * als er een leverancier is.
 *
 * Zoektermen die de leverancier niet kent (of die niet opgehaald konden
 * worden) ontbreken simpelweg in de teruggegeven Map: geen 0, geen gok
 * (conventie 3). De aanroeper leest dat als "onbekend" bij een `.get()` die
 * `undefined` teruggeeft.
 */
export async function keywordVolumes(
  admin: Admin,
  keywords: string[],
  country: string,
  language: string,
  profileId: string | null = null,
): Promise<Map<string, KeywordVolume>> {
  const uniekeTermen = [...new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))];
  if (uniekeTermen.length === 0) return new Map();

  const resultaat = new Map<string, KeywordVolume>();

  // ── Eerst de cache ─────────────────────────────────────────────────────
  const grens = new Date();
  grens.setUTCDate(grens.getUTCDate() - CACHE_GELDIGHEID_DAGEN);

  const { data: gecacht } = await admin
    .from("keyword_demand")
    .select("keyword, volume, competition, cpc, fetched_at")
    .in("keyword", uniekeTermen)
    .eq("country", country.toUpperCase())
    .eq("language", language.toLowerCase());

  const geldig = new Set<string>();
  for (const rij of (gecacht ?? []) as {
    keyword: string;
    volume: number | null;
    competition: number | null;
    cpc: number | null;
    fetched_at: string;
  }[]) {
    const versGenoeg = new Date(rij.fetched_at) >= grens;
    if (!versGenoeg) continue;
    geldig.add(rij.keyword);
    resultaat.set(rij.keyword, {
      keyword: rij.keyword,
      volume: rij.volume,
      competition: rij.competition,
      cpc: rij.cpc,
      fetchedAt: rij.fetched_at,
    });
  }

  const ontbrekend = uniekeTermen.filter((k) => !geldig.has(k));
  if (ontbrekend.length === 0) return resultaat;

  // ── De rest, alleen als er een leverancier is ────────────────────────────
  const provider = searchDemandProvider();
  if (!provider) return resultaat;

  let opgehaald: SearchDemandResult[];
  try {
    opgehaald = await provider.fetchVolumes(ontbrekend, country, language);
  } catch (err) {
    console.warn(`Zoekvolume ophalen mislukt bij ${provider.id}: ${String(err)}.`);
    return resultaat;
  }

  if (opgehaald.length === 0) return resultaat;

  const nu = new Date().toISOString();
  const rijen = opgehaald.map((r) => ({
    keyword: r.keyword.trim().toLowerCase(),
    country: country.toUpperCase(),
    language: language.toLowerCase(),
    volume: r.volume,
    competition: r.competition,
    cpc: r.cpc,
    provider: provider.id,
    raw_json: r.raw as object,
    fetched_at: nu,
  }));

  const { error } = await admin
    .from("keyword_demand")
    .upsert(rijen, { onConflict: "keyword,country,language" });
  if (error) {
    console.warn(`Zoekvolumes opslaan in de cache mislukt: ${error.message}.`);
  }

  for (const r of rijen) {
    resultaat.set(r.keyword, {
      keyword: r.keyword,
      volume: r.volume,
      competition: r.competition,
      cpc: r.cpc,
      fetchedAt: r.fetched_at,
    });
  }

  // ── De kostenboekhouding: nooit in ai_calls, altijd in vendor_calls ──────
  await admin.from("vendor_calls").insert({
    provider: provider.id,
    kind: "search_volume",
    units: opgehaald.length,
    // DataForSEO's Google Ads-eindpunt: $0,06 per aanroep van hooguit 1000
    // termen (docs/tasks/ontwikkelplan-visie.md §6). Geen poging tot een
    // exacter bedrag per term: dat verandert per leverancier en is hier geen
    // besluit waard.
    cost_usd: 0.06 * Math.ceil(opgehaald.length / 1000),
    profile_id: profileId,
  });

  return resultaat;
}
