import "server-only";

/**
 * Halte 2 — Prompt-generatie (abcplan.md §6 A2). 5 aparte calls (één per
 * categorie), PARALLEL afgevuurd, model gpt-4.1-mini, geen web_search. Aantal
 * per categorie is configureerbaar (lib/config.ts) — 2 in de bouwfase (=10), 6 in productie (=30).
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { PromptSet } from "@/lib/schemas/prompts";
import { PROMPT_CATEGORIES } from "@/lib/types/database";
import { promptsPerCategory } from "@/lib/config";

/** Korte, sturende omschrijving per categorie (abcplan.md §6 A2, voorbeeldkolom). */
const CATEGORY_BRIEF: Record<string, string> = {
  Oriëntatie: "brede oriëntatievragen van iemand die zich op het onderwerp aan het inlezen is (bv. 'Waar koop ik het beste X?').",
  Vergelijking: "vragen waarin het merk met concurrenten wordt vergeleken (bv. 'Merk A vs Merk B: wat is beter?').",
  "Probleem→oplossing": "vragen die vanuit een concreet probleem naar een oplossing zoeken (bv. 'Mijn X is kapot, waar laat ik dit maken?').",
  "Lokaal/branche": "lokale of branchegerichte vragen (bv. 'Beste X-reparatie in [regio]?').",
  Merkspecifiek: "vragen die direct over het merk gaan (bv. 'Is Merk betrouwbaar voor X?').",
};

export interface BrandContext {
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

function buildContextBlock(url: string, topic: string | null, brand: BrandContext): string {
  return (
    `Merk/website: ${url}\n` +
    `Onderwerp/scope: ${topic ?? "(hele website — dek alle diensten/producten)"}\n` +
    `Branche: ${brand.industry ?? "onbekend"}\n` +
    `Producten/diensten: ${brand.products.join(", ") || "onbekend"}\n` +
    `Concurrenten: ${brand.competitors.join(", ") || "onbekend"}\n` +
    `Samenvatting: ${brand.summary ?? ""}`
  );
}

async function generateForCategory(args: {
  category: string;
  url: string;
  topic: string | null;
  brand: BrandContext;
  count: number;
}): Promise<GeneratedPrompt[]> {
  const { category, url, topic, brand, count } = args;

  const scopeRule = topic
    ? `Alle prompts gaan UITSLUITEND over "${topic}" binnen de context van dit merk.`
    : `De prompts samen dekken de belangrijkste diensten/producten van de website.`;

  const system =
    `Je bedenkt realistische vragen ("prompts") die een echte koper aan een AI-assistent zoals ChatGPT stelt. ` +
    `Schrijf natuurlijke, gesproken vragen — geen losse zoekwoorden. Varieer in toon en specificiteit. Nederlands.`;

  const user =
    `${buildContextBlock(url, topic, brand)}\n\n` +
    `Genereer precies ${count} prompts in de categorie "${category}": ${CATEGORY_BRIEF[category] ?? ""}\n` +
    `${scopeRule}\n` +
    `Geef per prompt ook de onderliggende intentie (de job-to-be-done) mee.`;

  const result = await callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: PromptSet,
    schemaName: "prompt_set",
    webSearch: false,
  });

  return result.parsed.prompts.slice(0, count).map((p) => ({
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
  topic: string | null;
  brand: BrandContext;
}): Promise<GeneratedPrompt[]> {
  const perCategory = await Promise.all(
    PROMPT_CATEGORIES.map((category) =>
      generateForCategory({ ...args, category, count: promptsPerCategory }),
    ),
  );
  return perCategory.flat();
}
