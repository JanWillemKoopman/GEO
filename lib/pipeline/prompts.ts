import "server-only";

/**
 * Halte 2 — Prompt-generatie (abcplan.md §6 A2). 5 aparte calls (één per
 * categorie), PARALLEL afgevuurd, model gpt-4.1-mini, geen web_search. Aantal
 * per categorie is configureerbaar (lib/config.ts) — 2 in de bouwfase (=10), 6 in productie (=30).
 *
 * KERNPRINCIPE (merkneutraliteit): een gegenereerde prompt mag NOOIT de eigen
 * merknaam/het domein van de klant bevatten. Anders is een vermelding gegarandeerd
 * (de merknaam staat immers al in de vraag) en meet de prompt niets — het blaast
 * de zichtbaarheidsscore kunstmatig op. De meting moet spontane vermeldingen
 * meten: wat vraagt iemand die het merk NOG NIET kent? Concurrenten noemen mag wél.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { PromptSet } from "@/lib/schemas/prompts";
import { PROMPT_CATEGORIES } from "@/lib/types/database";
import { promptsPerCategory } from "@/lib/config";

/** Korte, sturende omschrijving per categorie — ALLE merkneutraal (abcplan.md §6 A2). */
const CATEGORY_BRIEF: Record<string, string> = {
  Oriëntatie:
    "brede oriëntatievragen van iemand die zich op het onderwerp aan het inlezen is (bv. 'Waar koop ik het beste X?').",
  Vergelijking:
    "vragen die concurrenten of type-aanbieders binnen de categorie vergelijken, ZONDER het eigen merk te noemen (bv. 'Ketenzaak of zelfstandige specialist: wat is beter voor X?').",
  "Probleem→oplossing":
    "vragen die vanuit een concreet probleem naar een oplossing zoeken (bv. 'Mijn X is kapot, waar laat ik dit maken?').",
  "Lokaal/branche": "lokale of branchegerichte vragen (bv. 'Beste X-reparatie in [regio]?').",
  "Aanbeveling/keuze":
    "vragen waarin iemand om een aanbeveling of keuze vraagt binnen de categorie, zonder een merk te noemen (bv. 'Welke X-specialist in [plaats] is aan te raden?').",
};

export interface BrandContext {
  brandName: string | null;
  industry: string | null;
  products: string[];
  competitors: string[];
  toneOfVoice: string | null;
  summary: string | null;
}

export interface GeneratedPrompt {
  text: string;
  category: string;
  intent: string;
  sourceRawJson: unknown;
}

/**
 * Bouwt de lijst met "verboden" merk-tokens: de canonieke merknaam en het
 * domein-label (zonder TLD). Deze mogen niet in een prompt voorkomen. We houden
 * het bewust op DISTINCTIEVE, volledige tokens (geen losse woorden als "barber"
 * of "shop") om te voorkomen dat we legitieme categoriewoorden wegfilteren.
 */
function brandTokens(url: string, brandName: string | null): string[] {
  const tokens: string[] = [];
  const domainLabel = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[./]/)[0];
  if (domainLabel && domainLabel.length > 3) tokens.push(domainLabel.toLowerCase());
  if (brandName && brandName.trim().length > 2) tokens.push(brandName.trim().toLowerCase());
  return tokens;
}

/** Bevat de prompt (case-insensitief) een verboden merk-token? */
function containsBrand(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.some((t) => lower.includes(t));
}

function buildContextBlock(url: string, topic: string, brand: BrandContext): string {
  return (
    `Website: ${url}\n` +
    (brand.brandName ? `Eigen merknaam (NIET in prompts gebruiken): ${brand.brandName}\n` : "") +
    `Onderwerp/scope: ${topic}\n` +
    `Branche: ${brand.industry ?? "onbekend"}\n` +
    `Producten/diensten: ${brand.products.join(", ") || "onbekend"}\n` +
    `Concurrenten (mogen wél genoemd worden): ${brand.competitors.join(", ") || "onbekend"}\n` +
    `Samenvatting: ${brand.summary ?? ""}`
  );
}

async function generateForCategory(args: {
  category: string;
  url: string;
  topic: string;
  brand: BrandContext;
  count: number;
  tokens: string[];
}): Promise<GeneratedPrompt[]> {
  const { category, url, topic, brand, count, tokens } = args;

  const scopeRule = `Alle prompts gaan UITSLUITEND over "${topic}" binnen deze branche.`;

  const brandRule =
    `HARDE REGEL: gebruik NOOIT de eigen merknaam${brand.brandName ? ` ("${brand.brandName}")` : ""} of het domein van de klant in een prompt. ` +
    `Schrijf de vraag zoals iemand die het merk NOG NIET kent 'm zou stellen. Een prompt met de eigen merknaam erin is ONGELDIG.`;

  const system =
    `Je bedenkt realistische vragen ("prompts") die een echte koper aan een AI-assistent zoals ChatGPT stelt. ` +
    `Schrijf natuurlijke, gesproken vragen — geen losse zoekwoorden. Varieer in toon en specificiteit. Nederlands. ` +
    brandRule;

  const user =
    `${buildContextBlock(url, topic, brand)}\n\n` +
    `Genereer precies ${count} prompts in de categorie "${category}": ${CATEGORY_BRIEF[category] ?? ""}\n` +
    `${scopeRule}\n${brandRule}\n` +
    `Geef per prompt ook de onderliggende intentie (de job-to-be-done) mee.`;

  const result = await callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: PromptSet,
    schemaName: "prompt_set",
    webSearch: false,
  });

  // Vangnet: gooi prompts weg die tóch de merknaam bevatten (het model verspreekt
  // zich zelden dankzij de harde regel; de review-gate is de menselijke backstop).
  return result.parsed.prompts
    .filter((p) => !containsBrand(p.text, tokens))
    .slice(0, count)
    .map((p) => ({
      text: p.text,
      category,
      intent: p.intent,
      sourceRawJson: result.raw, // audit-trail per categorie (abcplan.md §5)
    }));
}

/**
 * Vuurt alle categorie-calls parallel af (geen onderlinge afhankelijkheid) en
 * bundelt het resultaat. Faalt één categorie, dan faalt de hele batch — de
 * orchestratie (prepare.ts) markeert de analyse dan als 'mislukt' met retry.
 */
export async function generatePrompts(args: {
  url: string;
  topic: string;
  brand: BrandContext;
}): Promise<GeneratedPrompt[]> {
  const tokens = brandTokens(args.url, args.brand.brandName);
  const perCategory = await Promise.all(
    PROMPT_CATEGORIES.map((category) =>
      generateForCategory({ ...args, category, count: promptsPerCategory, tokens }),
    ),
  );
  return perCategory.flat();
}
