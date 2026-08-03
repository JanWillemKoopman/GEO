/**
 * De enginelaag (docs/tasks/onboarding-2.0.md, blok E).
 *
 * ── WAT EEN ENGINE IS, EN WAT NIET ──────────────────────────────────────────
 *
 * Een "engine" is een AI-assistent zoals een échte gebruiker hem zou
 * raadplegen: ChatGPT, Gemini. Het is uitdrukkelijk NIET hetzelfde als een
 * model. `gpt-5.6-luna` en `gpt-5.6-sol` zijn twee modellen van één engine.
 *
 * Dat onderscheid is de kern van het product. De meting simuleert wat een koper
 * te zien krijgt, en die koper kiest een assistent — geen model. Vandaar dat
 * `tracking_runs` sinds migratie 0001 een `engine`-kolom heeft naast
 * `model_used`.
 *
 * ── DE ENIGE PLEK WAAR HET UITMAAKT WELKE ENGINE ────────────────────────────
 *
 * Alleen halte 3a (de simulatie) en de LLM-kennistest draaien per engine. Alle
 * BEOORDELING — de mention-classificatie, de claim-audit, de contentpoort —
 * blijft op één vast model, ongeacht wie het antwoord produceerde.
 *
 * Zonder die scheiding meet je het verschil tussen twee BEOORDELAARS in plaats
 * van tussen twee ENGINES, en is geen enkele vergelijking tussen ChatGPT en
 * Gemini nog iets waard. `lib/openai/mention-prompt.ts` noemt zichzelf "de
 * meest load-bearing prompt van het product"; die blijft precies waar hij is.
 */
import type { ZodType } from "zod";
import type { CallMeta } from "@/lib/openai/ledger";
import type { EngineId } from "@/lib/types/database";

export type { EngineId };

/** Wat een engine over zichzelf moet vertellen. */
export interface EngineInfo {
  id: EngineId;
  /** Zoals de klant hem kent. Verschijnt in de UI. */
  label: string;
  /** Is er een API-sleutel voor deze engine in deze omgeving? */
  available: boolean;
  /** Kan deze engine tijdens het antwoorden zoeken? */
  supportsWebSearch: boolean;
}

export interface EnginePlainOptions {
  system: string;
  user: string;
  webSearch?: boolean;
  meta?: CallMeta;
}

export interface EngineStructuredOptions<T> {
  system: string;
  user: string;
  schema: ZodType<T>;
  schemaName: string;
  webSearch?: boolean;
  meta?: CallMeta;
}

export interface EngineCallResult {
  text: string;
  raw: unknown;
  model: string;
  responseId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number;
}

export interface EngineStructuredResult<T> extends Omit<EngineCallResult, "text"> {
  parsed: T;
}

/**
 * Wat elke engine moet kunnen. Bewust klein gehouden: alleen wat de meting en de
 * kennistest nodig hebben. Alles wat maar op één engine draait — content
 * schrijven, redigeren, classificeren — loopt gewoon via
 * `lib/openai/structured.ts` en hoort hier niet in.
 */
export interface EngineAdapter {
  readonly info: EngineInfo;

  /**
   * Vrije tekst, zoals een gebruiker hem zou krijgen. Bewust ZONDER
   * temperatuur- of redeneerinstelling: we meten wat een assistent op
   * standaardinstellingen doet (`work: "simulation"` in de bestaande code).
   */
  callPlain(opts: EnginePlainOptions): Promise<EngineCallResult>;

  /** Gestructureerde output. Voor de kennistest, niet voor de meting. */
  callStructured<T>(opts: EngineStructuredOptions<T>): Promise<EngineStructuredResult<T>>;
}
