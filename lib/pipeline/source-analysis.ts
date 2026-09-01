import "server-only";

/**
 * De geciteerde bronnen analyseren (optimalisatie.md 4.4).
 *
 * `top_cited_sources` staat al sinds de eerste migratie in de database, maar
 * ging als KALE URL-LIJST de schrijfprompt in. Een model dat "bron:
 * https://example.nl/gids-cv-ketels" leest, weet daar niets mee te beginnen,
 * het ziet een string, geen inhoud.
 *
 * Terwijl dit de meest waardevolle context is die er is: dít zijn de pagina's
 * die de AI wél goed genoeg vond om te citeren. Wat die pagina's doen, welke
 * vragen ze beantwoorden, in welke vorm, met welke feiten, is de lat waar de
 * nieuwe pagina overheen moet.
 *
 * Dus halen we ze op met de bestaande crawler (gratis) en laten we één goedkope
 * AI-aanroep samenvatten wat ze inhoudelijk doen.
 */
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlPages } from "@/lib/crawler";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { SourceAnalysis } from "@/lib/schemas/source-analysis";
import { sourceAnalysisEnabled } from "@/lib/config";
import { redactCompetitors } from "@/lib/pipeline/redact";

/**
 * Hoeveel bronnen we analyseren. Meer levert nauwelijks extra inzicht op, de
 * eerste paar zijn de pagina's die de AI het vaakst aanhaalde, en elke extra
 * pagina is een fetch en tokens.
 */
const MAX_SOURCES = 4;

/** Per pagina genoeg tekst om te zien wat hij doet, niet genoeg om de prompt te vullen. */
const CHARS_PER_SOURCE = 2500;

const SYSTEM =
  "Je analyseert webpagina's die een AI-assistent CITEERDE toen hij een vraag beantwoordde. " +
  "Je taak is niet samenvatten wat er staat, maar vaststellen WAAROM deze pagina geciteerd werd: " +
  "welke concrete vragen beantwoordt hij, in welke vorm (stappenplan, tabel, FAQ, prijslijst, " +
  "definitie), en met welke harde feiten (cijfers, jaartallen, termijnen, prijzen). " +
  "Wees specifiek en kort. Noem GEEN bedrijfsnamen in je antwoord. Beschrijf alleen wat de pagina " +
  "inhoudelijk doet. Antwoord in het Nederlands.";

export interface AnalyzedSources {
  /** Leeg als er niets te analyseren viel of als de analyse uitstaat. */
  block: string;
  urls: string[];
}

/**
 * Haalt de geciteerde bronnen op en beschrijft wat ze doen.
 *
 * Faalt zacht op elk niveau: een pagina die niet op te halen is wordt
 * overgeslagen, en gaat de AI-aanroep stuk dan levert deze functie een lege
 * blok op. De contentgeneratie moet doorgaan. Dit is context die het resultaat
 * beter maakt, geen voorwaarde om te kunnen schrijven.
 */
/**
 * De cachesleutel: de URL's plus de doelvragen (A9, migratie 0082).
 *
 * De vragen horen erin. Deze analyse is gericht op wat DEZE pagina moet winnen
 * ("de nieuwe pagina moet deze vragen gaan winnen"), dus twee pagina's met
 * dezelfde bronnen maar andere doelvragen horen een ander antwoord te krijgen.
 * Alleen op URL cachen zou precies de itemspecifieke scherpte weggooien die S9
 * en S10 kwamen brengen, en dat voor een besparing van een tiende cent.
 */
export function sourceCacheKey(urls: string[], targetQuestions: string[]): string {
  const basis = JSON.stringify({
    urls: [...urls].sort(),
    vragen: [...targetQuestions].map((v) => v.trim().toLowerCase()).sort(),
  });
  return createHash("sha256").update(basis).digest("hex");
}

export async function analyzeCitedSources(args: {
  urls: string[];
  /** Waar de nieuwe pagina over moet gaan, scherpt de analyse aan. */
  targetQuestions: string[];
  competitors: string[];
  analysisId: string;
  profileId: string;
}): Promise<AnalyzedSources> {
  const empty: AnalyzedSources = { block: "", urls: [] };
  if (!sourceAnalysisEnabled) return empty;

  const urls = Array.from(new Set(args.urls.filter((u) => /^https?:\/\//i.test(u)))).slice(0, MAX_SOURCES);
  if (urls.length === 0) return empty;

  // ── Eerst kijken of we dit al weten (A9, conventie 9) ────────────────────
  //
  // Deze stap crawlt tot vier bronpagina's en doet daar een AI-aanroep
  // overheen, en hij draaide bij het schrijven én bij het herschrijven, per
  // pagina. Tien pagina's uit één cluster citeren grotendeels dezelfde bronnen:
  // dat was tot twintig keer crawlen voor een uitkomst die per bron hetzelfde
  // is. Faalt de cache (tabel weg, database traag), dan rekenen we gewoon
  // opnieuw: een cache mag nooit een reden zijn dat er geen pagina komt.
  const admin = createAdminClient();
  const cacheKey = sourceCacheKey(urls, args.targetQuestions);
  try {
    const { data: bewaard } = await admin
      .from("source_analysis_cache")
      .select("block, urls")
      .eq("profile_id", args.profileId)
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (bewaard?.block) {
      return { block: bewaard.block as string, urls: (bewaard.urls as string[]) ?? urls };
    }
  } catch (err) {
    console.warn(`Cache van de bronanalyse niet leesbaar, we rekenen opnieuw: ${String(err)}`);
  }

  const pages = await crawlPages(urls);
  if (pages.length === 0) return empty;

  const body = pages
    .map(
      (p, i) =>
        `--- BRON ${i + 1}: ${p.url}${p.title ? ` ("${p.title}")` : ""} ---\n` +
        // Concurrentnamen er hier al uit: de analyse gaat straks de
        // schrijfprompt in, en daar geldt de harde regel dat er nooit een
        // concurrent bij naam op de pagina van de klant komt.
        redactCompetitors(p.text.slice(0, CHARS_PER_SOURCE), args.competitors),
    )
    .join("\n\n");

  const questions = args.targetQuestions.length
    ? `De nieuwe pagina moet deze vragen gaan winnen:\n- ${args.targetQuestions.join("\n- ")}\n\n`
    : "";

  try {
    const result = await callStructured({
      model: MODELS.quality,
      system: SYSTEM,
      user: `${questions}Hieronder de pagina's die de AI citeerde. Analyseer per bron.\n\n${body}`,
      schema: SourceAnalysis,
      schemaName: "source_analysis",
      webSearch: false,
      work: "analytical",
      meta: { kind: "source_analysis", analysisId: args.analysisId, profileId: args.profileId },
    });

    const lines = result.parsed.sources.map(
      (s) =>
        `- ${s.url}\n  Beantwoordt: ${s.answersQuestions.join("; ") || "onduidelijk"}\n` +
        `  Vorm: ${s.format}\n  Concrete feiten: ${s.concreteFacts.join("; ") || "geen"}`,
    );

    const block =
      `\nDE LAT: dit zijn de pagina's die de AI WÉL citeerde bij deze vragen. Jouw pagina moet ` +
      `hier inhoudelijk overheen: completer, concreter, of directer antwoordend.\n${lines.join("\n")}\n` +
      (result.parsed.whatIsMissing
        ? `\nWat er in deze bronnen ONTBREEKT en waar jouw pagina het verschil kan maken: ${result.parsed.whatIsMissing}`
        : "");

    // Wegschrijven mag mislukken zonder gevolgen: dan betalen we hem de
    // volgende keer opnieuw, en dat is een tiende cent, geen pagina.
    try {
      await admin
        .from("source_analysis_cache")
        .upsert(
          { profile_id: args.profileId, cache_key: cacheKey, block, urls },
          { onConflict: "profile_id,cache_key" },
        );
    } catch (err) {
      console.warn(`Bronanalyse niet kunnen cachen: ${String(err)}`);
    }

    return { urls, block };
  } catch (err) {
    console.warn(`Bronanalyse mislukt voor analyse ${args.analysisId}:`, err);
    return empty;
  }
}
