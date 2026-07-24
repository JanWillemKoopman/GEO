import "server-only";

/**
 * Halte 2 — Prompt-generatie (abcplan.md §6 A2). Eén call per FUNNELFASE
 * (Oriëntatie/Overweging/Beslissing), PARALLEL afgevuurd, model gpt-4.1-mini,
 * geen web_search. Aantal per fase is configureerbaar (lib/config.ts).
 *
 * KERNPRINCIPE (merk- én concurrent-neutraliteit): een gegenereerde prompt mag
 * NOOIT de eigen merknaam/het domein van de klant bevatten, en ook GEEN
 * concurrerend bedrijf uit de concurrentenlijst. Anders is een vermelding
 * gegarandeerd (de naam staat immers al in de vraag) en meet de prompt niets —
 * het vervuilt de zichtbaarheid/share-of-voice. De meting moet SPONTANE
 * vermeldingen meten: wat vraagt iemand die de merken NOG NIET kent? Generieke
 * productmerken/categorieën (bv. "Nike-schoenen") mogen wél — die staan niet in
 * de concurrentenlijst en zijn geen concurrerend bedrijf van de klant.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { PromptSet } from "@/lib/schemas/prompts";
import { PROMPT_CATEGORIES, type PromptIntentType, type PromptSpecificity } from "@/lib/types/database";
import { promptsPerFunnelStage } from "@/lib/config";

/** Korte, sturende omschrijving per FUNNELFASE — merk- én concurrent-neutraal. */
const CATEGORY_BRIEF: Record<string, string> = {
  Oriëntatie:
    "AWARENESS: brede oriëntatievragen van iemand die zich net op het onderwerp inleest en nog geen aanbieder kent " +
    "(bv. 'Waar moet ik op letten bij het kiezen van X?').",
  Overweging:
    "CONSIDERATION: vragen waarin iemand opties/aanpakken/type-aanbieders vergelijkt vóór een aankoop, ZONDER een merk " +
    "of bedrijf te noemen (bv. 'Ketenzaak of zelfstandige specialist: wat is beter voor X?').",
  Beslissing:
    "DECISION: vragen van iemand die klaar is om te kiezen/kopen/boeken (bv. 'Waar koop ik X in [plaats]?', " +
    "'Welke X-specialist is aan te raden?') — nog steeds zonder een concurrerend bedrijf bij naam te noemen.",
};

export interface BrandContext {
  brandName: string | null;
  industry: string | null;
  products: string[];
  competitors: string[];
  toneOfVoice: string | null;
  summary: string | null;
  /** Werkgebied & markt (§12.24) — sturen lokale/marktgerichte prompts. */
  serviceScope?: string | null;
  serviceRegions?: string[];
  marketLanguage?: string | null;
}

export interface GeneratedPrompt {
  text: string;
  category: string; // funnelfase
  intent: string;
  intentType: PromptIntentType;
  specificity: PromptSpecificity;
  purchaseIntent: boolean;
  cluster: string;
  volumeEstimate: number;
  sourceRawJson: unknown;
}

/**
 * Bouwt de lijst met "verboden" tokens: de canonieke merknaam, het domein-label
 * (zonder TLD) én elke concurrent uit de concurrentenlijst. Deze mogen niet in
 * een prompt voorkomen. We houden het op DISTINCTIEVE tokens (lengte > 3) om te
 * voorkomen dat we legitieme categoriewoorden wegfilteren. Generieke productmerken
 * staan NIET in de concurrentenlijst en blijven dus toegestaan.
 */
function forbiddenTokens(url: string, brandName: string | null, competitors: string[]): string[] {
  const tokens: string[] = [];
  const domainLabel = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[./]/)[0];
  if (domainLabel && domainLabel.length > 3) tokens.push(domainLabel.toLowerCase());
  if (brandName && brandName.trim().length > 2) tokens.push(brandName.trim().toLowerCase());
  for (const c of competitors) {
    const t = c.trim().toLowerCase();
    if (t.length > 3) tokens.push(t);
  }
  return Array.from(new Set(tokens));
}

/** Bevat de prompt (case-insensitief) een verboden merk-/concurrent-token? */
function containsForbidden(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.some((t) => lower.includes(t));
}

function geoLine(brand: BrandContext): string {
  const parts: string[] = [];
  if (brand.serviceScope) parts.push(`bereik: ${brand.serviceScope}`);
  if (brand.serviceRegions?.length) parts.push(`regio's: ${brand.serviceRegions.join(", ")}`);
  if (brand.marketLanguage) parts.push(`markt: ${brand.marketLanguage}`);
  return parts.length ? `Werkgebied & markt: ${parts.join("; ")}\n` : "";
}

function buildContextBlock(url: string, topic: string, brand: BrandContext): string {
  return (
    `Website: ${url}\n` +
    (brand.brandName ? `Eigen merknaam (NIET in prompts gebruiken): ${brand.brandName}\n` : "") +
    `Onderwerp/scope: ${topic}\n` +
    `Branche: ${brand.industry ?? "onbekend"}\n` +
    `Producten/diensten: ${brand.products.join(", ") || "onbekend"}\n` +
    `Concurrerende bedrijven — NOOIT bij naam noemen in een prompt: ${brand.competitors.join(", ") || "(geen bekend)"}\n` +
    geoLine(brand) +
    `Samenvatting: ${brand.summary ?? ""}`
  );
}

async function generateForFunnelStage(args: {
  category: string;
  url: string;
  topic: string;
  brand: BrandContext;
  count: number;
  tokens: string[];
}): Promise<GeneratedPrompt[]> {
  const { category, url, topic, brand, count, tokens } = args;

  const scopeRule = `Alle prompts gaan UITSLUITEND over "${topic}" binnen deze branche.`;

  // Lokaal bereik met bekende regio's → laat de vragen (deels) een plaatsnaam
  // bevatten, zoals een echte lokale zoeker die zou stellen (§12.24).
  const geoRule =
    brand.serviceScope === "lokaal" && brand.serviceRegions?.length
      ? `Dit is een LOKAAL bedrijf (${brand.serviceRegions.join(", ")}): verwerk in een deel van de prompts een ` +
        `van deze plaatsen/regio's, zoals een lokale zoeker dat zou doen.`
      : "";

  const neutralityRule =
    `HARDE REGEL: gebruik NOOIT de eigen merknaam${brand.brandName ? ` ("${brand.brandName}")` : ""} of het domein van de klant, ` +
    `en noem ook NOOIT een concurrerend bedrijf bij naam${brand.competitors.length ? ` (zoals: ${brand.competitors.join(", ")})` : ""}. ` +
    `Generieke productmerken of -categorieën (bv. "Nike-schoenen") mag je WÉL gebruiken. ` +
    `Schrijf de vraag zoals iemand die deze bedrijven NOG NIET kent 'm zou stellen. Een prompt met een eigen of concurrent-bedrijfsnaam is ONGELDIG.`;

  const system =
    `Je bedenkt realistische vragen ("prompts") die een echte koper aan een AI-assistent zoals ChatGPT stelt. ` +
    `Schrijf natuurlijke, gesproken vragen — geen losse zoekwoorden. Varieer in toon en specificiteit. Nederlands. ` +
    neutralityRule;

  const user =
    `${buildContextBlock(url, topic, brand)}\n\n` +
    `Genereer precies ${count} prompts voor de FUNNELFASE "${category}": ${CATEGORY_BRIEF[category] ?? ""}\n` +
    `${scopeRule}\n${geoRule ? `${geoRule}\n` : ""}${neutralityRule}\n` +
    `Geef per prompt mee: de onderliggende intentie (job-to-be-done); intentType ` +
    `(informational/commercial/transactional); specificity (head = korte brede vraag, long_tail = lange specifieke vraag); ` +
    `purchaseIntent (koopintentie true/false); cluster (kort thema-label); en volumeEstimate — jouw SCHATTING van hoe ` +
    `populair deze vraag is op een schaal 0-100 (0 = zeer specifiek/zelden, 100 = zeer populair/breed). Dit is een schatting, geen echte index.`;

  const result = await callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: PromptSet,
    schemaName: "prompt_set",
    webSearch: false,
  });

  // Vangnet: gooi prompts weg die tóch de eigen merknaam of een concurrent bevatten
  // (het model verspreekt zich zelden dankzij de harde regel; de review-gate is de
  // menselijke backstop). Clamp de volumeschatting op 0-100.
  return result.parsed.prompts
    .filter((p) => !containsForbidden(p.text, tokens))
    .slice(0, count)
    .map((p) => ({
      text: p.text,
      category,
      intent: p.intent,
      intentType: p.intentType,
      specificity: p.specificity,
      purchaseIntent: p.purchaseIntent,
      cluster: p.cluster,
      volumeEstimate: Math.max(0, Math.min(100, Math.round(p.volumeEstimate))),
      sourceRawJson: result.raw, // audit-trail per fase (abcplan.md §5)
    }));
}

/**
 * Vuurt alle funnelfase-calls parallel af (geen onderlinge afhankelijkheid) en
 * bundelt het resultaat. Faalt één fase, dan faalt de hele batch — de
 * orchestratie (prepare.ts) markeert de analyse dan als 'mislukt' met retry.
 */
export async function generatePrompts(args: {
  url: string;
  topic: string;
  brand: BrandContext;
}): Promise<GeneratedPrompt[]> {
  const tokens = forbiddenTokens(args.url, args.brand.brandName, args.brand.competitors);
  const perStage = await Promise.all(
    PROMPT_CATEGORIES.map((category) =>
      generateForFunnelStage({ ...args, category, count: promptsPerFunnelStage, tokens }),
    ),
  );
  return perStage.flat();
}
