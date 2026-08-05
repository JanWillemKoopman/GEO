import "server-only";

/**
 * Welke engines draaien er in deze omgeving? (blok E)
 *
 * ── DE REGEL DIE ALLES BEPAALT ──────────────────────────────────────────────
 *
 * Een engine doet mee als er (a) een API-sleutel voor is én (b) hij op het
 * profiel aanstaat. Ontbreekt de sleutel, dan valt hij eruit, stil voor de
 * klant, luid in de logs. Zonder `GEMINI_API_KEY` is de uitkomst dus
 * `['openai']` en gedraagt de hele app zich exact zoals hij deed.
 *
 * Dat is geen degradatiepad maar de normale toestand tot de sleutel er is.
 * Vandaar dat het geen waarschuwing op het scherm oplevert: er is niets stuk.
 *
 * ── WAAROM DE DOORSNEDE EN NIET ALLEEN DE PROFIELINSTELLING ─────────────────
 *
 * `profiles.engines_enabled` is een wens, geen feit. Zou de code die wens
 * blindelings volgen, dan valt een meetronde om zodra iemand `gemini` aanvinkt
 * op een omgeving zonder sleutel, of erger: hij valt half om, met dertig
 * gelukte OpenAI-metingen en dertig mislukte taken die vier keer opnieuw
 * proberen. Een engine overslaan is altijd beter dan een halve meetronde.
 */
import { createOpenAiEngine } from "@/lib/engines/openai";
import { createGeminiEngine } from "@/lib/engines/gemini";
import type { EngineAdapter, EngineId } from "@/lib/engines/types";

function geminiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function openAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Alle bekende engines, ook die zonder sleutel, voor de UI en de instellingen. */
export function allEngines(): EngineAdapter[] {
  return [createOpenAiEngine(openAiKey()), createGeminiEngine(geminiKey())];
}

/** Alleen de engines die daadwerkelijk aangeroepen kunnen worden. */
export function availableEngineIds(): EngineId[] {
  return allEngines()
    .filter((e) => e.info.available)
    .map((e) => e.info.id);
}

export function getEngine(id: EngineId): EngineAdapter {
  const engine = allEngines().find((e) => e.info.id === id);
  if (!engine) throw new Error(`Onbekende engine: ${id}`);
  return engine;
}

/**
 * De engines die voor dít profiel moeten draaien: de doorsnede van wat het
 * profiel wil en wat er beschikbaar is.
 *
 * Valt er iets af, dan wordt dat gelogd. Blijft er niets over, een profiel dat
 * alleen `gemini` wil op een omgeving zonder sleutel. Dan valt hij terug op
 * OpenAI in plaats van op een lege lijst. Nul engines betekent nul metingen, en
 * dat is een stille storing van het ergste soort: de analyse "slaagt" met een
 * leeg resultaat.
 */
export function enginesForProfile(wanted: EngineId[] | null | undefined): EngineAdapter[] {
  const beschikbaar = availableEngineIds();
  const gevraagd = wanted && wanted.length > 0 ? wanted : (["openai"] as EngineId[]);

  const overgeslagen = gevraagd.filter((id) => !beschikbaar.includes(id));
  if (overgeslagen.length > 0) {
    console.warn(
      `Engine(s) overgeslagen, geen API-sleutel: ${overgeslagen.join(", ")}. ` +
        `Beschikbaar: ${beschikbaar.join(", ") || "geen"}.`,
    );
  }

  const gekozen = gevraagd.filter((id) => beschikbaar.includes(id));
  if (gekozen.length === 0) {
    console.error(
      "Geen enkele gevraagde engine is beschikbaar; teruggevallen op OpenAI. " +
        "Controleer OPENAI_API_KEY.",
    );
    return [createOpenAiEngine(true)];
  }

  return gekozen.map(getEngine);
}
