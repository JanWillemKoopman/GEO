/**
 * Taaksoorten van de wachtrij (optimalisatie.md 1.3).
 *
 * Elke taak moet RUIM binnen de tijdslimiet van één werker-aanroep passen.
 * Vandaar dat de meting per PROMPT is opgeknipt in plaats van per analyse, en
 * contentgeneratie in twee stappen: één taak = hooguit één zware AI-aanroep.
 * Zo is "30 vragen meten" een kwestie van 30 taken plannen in plaats van een
 * architectuurwijziging — precies wat fase 2 (drie metingen per vraag) nodig heeft.
 */
import type { ContentAction, ContentType } from "@/lib/types/database";
import type { RecommendationTarget } from "@/lib/pipeline/recommendation";

export const JOB_TYPES = [
  /** Eenmalig profielonderzoek: crawl + merk/branche/concurrenten. */
  "profile_research",
  /** Onderwerp-onderzoek + promptgeneratie voor één analyse. */
  "prepare_analysis",
  /** Eén vraag stellen en het antwoord beoordelen (3a + 3b). Eén per prompt. */
  "measure_prompt",
  /** Pure aggregatie over alle metingen van een week (3c). Geen AI-aanroep. */
  "aggregate_week",
  /** Gap-analyse + rapport (B1 + B2) en de rapportmail. */
  "generate_report",
  /** Contentgeneratie stap 1: schrijven + beoordelen. */
  "content_draft",
  /** Contentgeneratie stap 2: herschrijven + herbeoordelen. */
  "content_revise",
  /** Technische GEO-audit: mag een AI-crawler de site überhaupt bezoeken? */
  "technical_audit",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

/** De aanbeveling waar een contentpagina uit voortkomt (spiegelt RecommendationInput). */
export interface RecommendationPayload {
  title: string;
  type: ContentType;
  targetIntent: string;
  why: string;
  action: ContentAction;
  existingUrl: string | null;
  reportId: string | null;
  /** De gemiste vragen die deze pagina moet winnen (optimalisatie.md 4.1). */
  targets?: RecommendationTarget[];
  /** Wat de klant zelf anders wil (optimalisatie.md 4.8). */
  revisionNote?: string | null;
}

/** Wat elke taaksoort in `payload_json` meekrijgt. */
export interface JobPayloads {
  profile_research: Record<string, never>;
  prepare_analysis: Record<string, never>;
  measure_prompt: { promptId: string; weekNo: number };
  aggregate_week: { weekNo: number };
  generate_report: { weekNo: number };
  content_draft: {
    userId: string;
    recommendation: RecommendationPayload;
    /** Opnieuw genereren bovenop een afgeronde versie (optimalisatie.md 4.7). */
    regenerate?: boolean;
  };
  content_revise: {
    userId: string;
    contentPieceId: string;
    recommendation: RecommendationPayload;
    /** Verbeterpunten uit de eerste beoordeling — sturen de herschrijfstap. */
    issues: string[];
  };
  technical_audit: Record<string, never>;
}

/**
 * Hoe zwaar is deze taaksoort? De werker gebruikt dit om te bepalen hoeveel
 * taken hij in één aanroep durft op te pakken: een reeks lichte taken kan
 * samen, één zware taak vult de aanroep in z'n eentje.
 */
export const HEAVY_JOB_TYPES: ReadonlySet<JobType> = new Set<JobType>([
  "profile_research", // crawlt de hele site + AI-onderzoek met web_search
  "prepare_analysis", // onderwerp-onderzoek + 3 parallelle prompt-calls + kalibratie
  "content_draft", // gpt-4.1 schrijft een volledige pagina
  "content_revise", // idem
]);

/**
 * Maximaal aantal pogingen vóórdat een taak definitief mislukt is
 * (optimalisatie.md 1.2). Vier pogingen met oplopende wachttijd overbrugt een
 * storing van ruim een kwartier zonder dat de klant er iets van merkt.
 */
export const MAX_ATTEMPTS = 4;

/**
 * Wachttijd vóór de volgende poging: 2, 4, 8 minuten. Bewust in minuten en niet
 * in seconden — de fouten die hier overblijven zijn er al doorheen gekomen
 * ondanks de retries in de OpenAI-client zelf (die dekken de seconde-schaal af,
 * zie lib/openai/client.ts), dus dit zijn storingen van langere duur.
 */
export function backoffMinutes(attempts: number): number {
  return Math.min(2 ** attempts, 16);
}
