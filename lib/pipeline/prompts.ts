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
import { PromptSet, VolumeCalibration } from "@/lib/schemas/prompts";
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
  contentBrief?: string | null;
}): Promise<GeneratedPrompt[]> {
  const { category, url, topic, brand, count, tokens, contentBrief } = args;

  const scopeRule = `Alle prompts gaan UITSLUITEND over "${topic}" binnen deze branche.`;

  // Content-brief van de klant (§6/§7/§8): stuurt de vragen naar de gewenste hoek/doelgroep.
  const briefRule = contentBrief?.trim()
    ? `GEWENSTE HOEK/DOELGROEP (van de klant): ${contentBrief.trim()}. Laat de gegenereerde vragen deze ` +
      `hoek en doelgroep weerspiegelen — schrijf de vragen zoals díe specifieke zoeker ze zou stellen.`
    : "";

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
    (briefRule ? `${briefRule}\n\n` : "") +
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
      volumeEstimate: 50, // voorlopig; wordt relatief gekalibreerd over alle prompts (zie calibrateVolumes)
      sourceRawJson: result.raw, // audit-trail per fase (abcplan.md §5)
    }));
}

/**
 * Kalibreert het geschatte zoekvolume RELATIEF over alle prompts van de analyse
 * in één call (abcplan.md §6 A2) — consistenter dan losse per-prompt-schattingen.
 * Geeft per prompt een 0-100-waarde terug (op input-volgorde). Faalt de call,
 * dan vallen we terug op een neutrale 50 (blokkeert de analyse niet).
 */
async function calibrateVolumes(prompts: GeneratedPrompt[]): Promise<number[]> {
  if (prompts.length === 0) return [];
  const numbered = prompts.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
  try {
    const result = await callStructured({
      model: MODELS.quality,
      system:
        "Je bent een zoekgedrag-analist. Schat hoe vaak elke onderstaande vraag door echte mensen aan een " +
        "AI-assistent/zoekmachine gesteld wordt, RELATIEF ten opzichte van elkaar. Gebruik de VOLLE schaal 0-100: " +
        "de meest gezochte, brede vragen richting 100, de meest specifieke/niche-vragen richting 0-10. Dit is een " +
        "schatting, geen echte index. Antwoord voor ELKE vraag met haar nummer (index) en een volume 0-100.",
      user: `Vragen:\n${numbered}`,
      schema: VolumeCalibration,
      schemaName: "volume_calibration",
      webSearch: false,
    });
    const byIndex = new Map<number, number>();
    for (const w of result.parsed.weights) {
      byIndex.set(Math.round(w.index), Math.max(0, Math.min(100, Math.round(w.volume))));
    }
    return prompts.map((_, i) => byIndex.get(i + 1) ?? 50);
  } catch {
    return prompts.map(() => 50);
  }
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
  contentBrief?: string | null;
}): Promise<GeneratedPrompt[]> {
  const tokens = forbiddenTokens(args.url, args.brand.brandName, args.brand.competitors);
  const perStage = await Promise.all(
    PROMPT_CATEGORIES.map((category) =>
      generateForFunnelStage({ ...args, category, count: promptsPerFunnelStage, tokens }),
    ),
  );
  const prompts = perStage.flat();

  // Relatieve volume-kalibratie over alle prompts samen (consistenter).
  const volumes = await calibrateVolumes(prompts);
  return prompts.map((p, i) => ({ ...p, volumeEstimate: volumes[i] }));
}
