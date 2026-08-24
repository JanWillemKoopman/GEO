import "server-only";

/**
 * Stap 3: de site van één bedrijf uitlezen (plan hoofdstuk 8, stap 3).
 *
 * ── GEEN ENKELE AI-AANROEP, EN DAT IS HET ONTWERP ───────────────────────────
 *
 * Plan 21.1: "Wat wél meeschaalt met het aantal bedrijven zijn de goedkope
 * stappen: de crawl per bedrijf, die niets kost omdat er geen model aan te pas
 * komt." Dat is de reden dat een volledige markt meegenomen kan worden in plaats
 * van "de vijftien bekendste". Zou hier een model aan te pas komen, dan zou het
 * afkappen van de bedrijvenlijst geld besparen, en dan sneuvelen precies de
 * onzichtbare bedrijven die deze module zoekt.
 *
 * ── WAAROM ÉÉN TAAK PER BEDRIJF ─────────────────────────────────────────────
 *
 * Dertig sites uitlezen in één taak past niet binnen één werker-aanroep
 * (`lib/jobs/types.ts`). Eén taak per bedrijf is dezelfde opzet als
 * `measure_prompt`: dertig taken plannen in plaats van een architectuurwijziging.
 * En het heeft een tweede voordeel: één onbereikbare site laat de andere
 * negenentwintig ongemoeid.
 *
 * ── WAT DE CRAWL MOET OPLEVEREN, EN WAAROM ──────────────────────────────────
 *
 * Niet "een indruk van het bedrijf" maar drie concrete dingen die later een
 * opportunity dragen:
 *
 *   1. **De diensten die de site beschrijft.** Dat is de voorwaarde onder
 *      opportunitytype 3 (intent gap): het bedrijf scoort slecht op een intentie
 *      terwijl zijn eigen site die dienst wél beschrijft. Zonder deze lijst is
 *      dat type niet te detecteren en valt de scherpste haak weg.
 *   2. **Of de site überhaupt bestaat en werkt.** Een bedrijf zonder werkende
 *      site is onzichtbaar én moeilijk te helpen; dat weegt mee in de score
 *      (plan 13.1, verbeterbaarheid).
 *   3. **De omvangssignalen.** Aantal pagina's, een teampagina, een vacaturepagina.
 *      Plan 13.2: een bedrijf met een enorme kans maar zonder website is geen
 *      prospect.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { crawlInventory } from "@/lib/crawler";
import { sectionOf } from "@/lib/crawl-urls";

type Admin = SupabaseClient;

/**
 * Hoeveel pagina's we per prospect ophalen.
 *
 * Vijfentwintig, tegen 150 bij een klantprofiel. Dat verschil is met opzet: bij
 * een klant bouwen we een contentplan op de volledige site, hier beantwoorden we
 * één vraag ("welke diensten beschrijft dit bedrijf") over dertig bedrijven
 * tegelijk. Vijfentwintig pagina's dekt bij een lokaal bedrijf vrijwel de hele
 * site, en het houdt de taak binnen zijn tijd.
 */
export const MAX_PAGINAS_PER_PROSPECT = 25;

/** Wat er van de site geleerd is. Landt als jsonb op `sales_companies.crawl_summary`. */
export interface CrawlSamenvatting {
  paginas: number;
  gevondenUrls: number;
  afgekapt: boolean;
  /** De secties van de site, ruw: dat zijn de kandidaat-diensten. */
  secties: string[];
  titels: string[];
  heeftTeampagina: boolean;
  heeftContactpagina: boolean;
  heeftVacaturepagina: boolean;
}

/**
 * Wat een sectie tot een teampagina, contactpagina of vacaturepagina maakt.
 *
 * Bewust woordlijsten en geen model: het zijn drie ja-of-nee-vragen op een
 * URL-pad, en een model erop loslaten zou de stap van gratis naar betaald tillen
 * voor iets wat een `includes()` afhandelt. Nederlandse én Engelse varianten,
 * want een deel van de sites gebruikt `/about` en `/careers`.
 */
const TEAM_WOORDEN = ["team", "over-ons", "overons", "about", "medewerkers", "wie-zijn-wij"];
const CONTACT_WOORDEN = ["contact", "afspraak", "offerte"];
const VACATURE_WOORDEN = ["vacature", "vacatures", "werken-bij", "careers", "jobs"];

function bevat(secties: readonly string[], woorden: readonly string[]): boolean {
  return secties.some((s) => woorden.some((w) => s.includes(w)));
}

export interface EnrichUitkomst {
  status: "gelukt" | "niet_gelukt" | "geen_website";
  paginas: number;
  melding: string | null;
}

/**
 * De site van één bedrijf uitlezen en het resultaat vastleggen.
 *
 * Idempotent (conventie 9): een bedrijf dat al `gelukt` staat, wordt niet
 * opnieuw opgehaald. Dat scheelt geen geld maar wel tijd, en het voorkomt dat
 * een tweede poging op een markt de crawl van alle dertig bedrijven overdoet.
 */
export async function verrijkBedrijf(admin: Admin, companyId: string): Promise<EnrichUitkomst> {
  const { data } = await admin
    .from("sales_companies")
    .select("id, domain, name, crawl_status")
    .eq("id", companyId)
    .maybeSingle();

  const bedrijf = data as
    | { id: string; domain: string | null; name: string; crawl_status: string }
    | null;
  if (!bedrijf) throw new Error(`Bedrijf ${companyId} bestaat niet.`);

  if (bedrijf.crawl_status === "gelukt") {
    return { status: "gelukt", paginas: 0, melding: "De site was al uitgelezen." };
  }

  // ⚠️ Geen website is een BEVINDING en geen fout (conventie 3). Dit is juist het
  // bedrijf waar deze module naar op zoek is: aantoonbaar bestaand en volledig
  // onzichtbaar. Het krijgt zijn eigen stand, zodat het niet tussen de mislukte
  // crawls verdwijnt.
  if (!bedrijf.domain) {
    await admin
      .from("sales_companies")
      .update({ crawl_status: "geen_website", crawled_at: new Date().toISOString() })
      .eq("id", companyId);
    return { status: "geen_website", paginas: 0, melding: null };
  }

  let inventaris: Awaited<ReturnType<typeof crawlInventory>>;
  try {
    inventaris = await crawlInventory(bedrijf.domain, { maxPages: MAX_PAGINAS_PER_PROSPECT });
  } catch (err) {
    const melding = err instanceof Error ? err.message : "onbekende fout";
    await admin
      .from("sales_companies")
      .update({
        crawl_status: "niet_gelukt",
        crawl_error: melding,
        crawled_at: new Date().toISOString(),
      })
      .eq("id", companyId);
    return { status: "niet_gelukt", paginas: 0, melding };
  }

  const bruikbaar = inventaris.pages.filter((p) => p.title || p.text);
  if (bruikbaar.length === 0) {
    // De site bestaat wel maar gaf niets bruikbaars terug: achter een inlog, of
    // volledig door JavaScript opgebouwd. Dat is geen "geen website", en het is op
    // zichzelf informatie: een site die onze crawler niet leest, leest een
    // AI-crawler waarschijnlijk ook niet.
    await admin
      .from("sales_companies")
      .update({
        crawl_status: "niet_gelukt",
        crawl_error: "De site gaf geen leesbare pagina's terug.",
        crawled_at: new Date().toISOString(),
      })
      .eq("id", companyId);
    return { status: "niet_gelukt", paginas: 0, melding: "Geen leesbare pagina's." };
  }

  const secties = [...new Set(bruikbaar.map((p) => sectionOf(p.url)).filter(Boolean))];
  const samenvatting: CrawlSamenvatting = {
    paginas: bruikbaar.length,
    gevondenUrls: inventaris.totalFound,
    afgekapt: inventaris.truncated,
    secties,
    titels: bruikbaar
      .map((p) => p.title)
      .filter((t): t is string => Boolean(t))
      .slice(0, MAX_PAGINAS_PER_PROSPECT),
    heeftTeampagina: bevat(secties, TEAM_WOORDEN),
    heeftContactpagina: bevat(secties, CONTACT_WOORDEN),
    heeftVacaturepagina: bevat(secties, VACATURE_WOORDEN),
  };

  await admin
    .from("sales_companies")
    .update({
      crawl_status: "gelukt",
      crawl_error: null,
      crawl_summary: samenvatting as unknown as Record<string, unknown>,
      crawled_at: new Date().toISOString(),
      // De klok van de bewaartermijn loopt op activiteit. Een crawl is
      // activiteit: dit bedrijf is nog in beeld (plan 24.2).
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", companyId);

  return { status: "gelukt", paginas: bruikbaar.length, melding: null };
}
