/**
 * Taaksoorten van de wachtrij (optimalisatie.md 1.3).
 *
 * Elke taak moet RUIM binnen de tijdslimiet van één werker-aanroep passen.
 * Vandaar dat de meting per PROMPT is opgeknipt in plaats van per analyse, en
 * contentgeneratie in twee stappen: één taak = hooguit één zware AI-aanroep.
 * Zo is "30 vragen meten" een kwestie van 30 taken plannen in plaats van een
 * architectuurwijziging — precies wat fase 2 (drie metingen per vraag) nodig heeft.
 */
import type { ContentAction, ContentType, EngineId } from "@/lib/types/database";
import type { RecommendationTarget } from "@/lib/pipeline/recommendation";

export const JOB_TYPES = [
  /**
   * Fase 0 van de onboarding: de site uitkammen zonder één AI-aanroep
   * (docs/tasks/onboarding-2.0.md blok B). Crawlt tot 150 pagina's, oogst
   * JSON-LD/OpenGraph, beoordeelt de inventaris en meet of de tekst überhaupt
   * zonder JavaScript zichtbaar is. Ketent naar profile_research.
   */
  "profile_discover",
  /** Eenmalig profielonderzoek: crawl + merk/branche/concurrenten. */
  "profile_research",
  /**
   * Fase 1 van de onboarding: het aanbod als boom (blok B). Bij een
   * dienstverlener de dienstverlening, bij een productverkoper het assortiment.
   * Voedt straks de core topics.
   */
  "profile_offering",
  /**
   * Fase 1c: 5-8 core topics voorstellen uit de aanbodboom (blok D). Eén
   * goedkope aanroep, geen meting — die volgt pas na goedkeuring.
   */
  "propose_topics",
  /**
   * Fase 2: markt en concurrentie verdiepen (blok B). Waarom winnen die
   * concurrenten, en welke domeinen bepalen deze markt?
   */
  "profile_market",
  /**
   * Fase 3: wat weten AI-assistenten al over dit merk, en klopt dat? (blok B)
   * Draait per beschikbare engine; het oordeel is deterministisch en komt niet
   * van het model zelf.
   */
  "profile_llm_baseline",
  /**
   * Fase 5: alles samenbrengen tot een leesbaar dossier en citeerbare feiten
   * (blok B). De enige onboarding-stap op het dure model.
   */
  "profile_synthesis",
  /** Onderwerp-onderzoek voor één analyse. Ketent naar generate_prompts. */
  "prepare_analysis",
  /** Promptgeneratie voor één analyse (2e helft van de voorbereiding). */
  "generate_prompts",
  /** Zoekvolume relatief kalibreren over alle vragen. Verfijning ná de review-gate. */
  "calibrate_volumes",
  /** Eén vraag stellen en het antwoord beoordelen (3a + 3b). Eén per prompt. */
  "measure_prompt",
  /** Pure aggregatie over alle metingen van een week (3c). Geen AI-aanroep. */
  "aggregate_week",
  /** Waarom worden concurrenten genoemd? Destilleert eigenschappen uit de meting (R4.2). */
  "profile_competitors",
  /** Gap-analyse + rapport (B1 + B2) en de rapportmail. */
  "generate_report",
  /** Contentbriefing: feitenindex + claim-audit → vragen aan de klant (R5.1). */
  "content_brief",
  /** Contentgeneratie stap 1: schrijven + beoordelen. */
  "content_draft",
  /** Contentgeneratie stap 2: herschrijven + herbeoordelen. */
  "content_revise",
  /** Technische GEO-audit: mag een AI-crawler de site überhaupt bezoeken? */
  "technical_audit",
  /** Controleren of een gepubliceerde pagina er echt staat (optimalisatie.md 5.2). */
  "verify_publication",
  /** Eén golf hermetingen plannen na publicatie (5.3). */
  "measure_impact",
  /** Het effect van één gepubliceerde pagina berekenen (5.4/5.5). Geen AI-aanroep. */
  "compute_impact",
  /** Bronnenlandschap + aanwezigheid + entiteitscontrole (optimalisatie.md fase 7). */
  "offsite_scan",
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
  profile_discover: Record<string, never>;
  profile_research: Record<string, never>;
  profile_offering: Record<string, never>;
  propose_topics: Record<string, never>;
  profile_market: Record<string, never>;
  profile_llm_baseline: Record<string, never>;
  profile_synthesis: Record<string, never>;
  prepare_analysis: Record<string, never>;
  generate_prompts: Record<string, never>;
  calibrate_volumes: Record<string, never>;
  measure_prompt: {
    promptId: string;
    weekNo: number;
    /**
     * Hoeveelste herhaling van deze vraag binnen deze periode (R6.1, migratie
     * 0031). Afwezig of 0 = de eerste meting. Alleen de zwaarstwegende vragen
     * krijgen herhalingen; de aggregatie rekent per VRAAG zodat die vragen niet
     * zwaarder gaan meetellen dan de rest.
     */
    repeatIndex?: number;
    /**
     * Alleen bij een hermeting ná publicatie (optimalisatie.md 5.3). Zonder dit
     * veld is het een gewone periodieke meting.
     */
    impact?: { purpose: "impact" | "control"; contentPieceId: string; wave: number };
    /**
     * Welke AI-assistent deze vraag beantwoordt (migratie 0041, blok E).
     * Afwezig = 'openai', wat élke meting tot augustus 2026 was.
     */
    engine?: EngineId;
  };
  aggregate_week: { weekNo: number };
  profile_competitors: { weekNo: number };
  generate_report: { weekNo: number };
  content_brief: {
    userId: string;
    /** De hele batch gekozen pagina's: één briefing voor alles samen (§2). */
    recommendations: RecommendationPayload[];
  };
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
  verify_publication: { contentPieceId: string };
  measure_impact: { contentPieceId: string; wave: number };
  compute_impact: { contentPieceId: string; wave: number };
  offsite_scan: Record<string, never>;
}

/**
 * Hoe zwaar is deze taaksoort? De werker gebruikt dit om te bepalen hoeveel
 * taken hij in één aanroep durft op te pakken: een reeks lichte taken kan
 * samen, één zware taak vult de aanroep in z'n eentje.
 */
export const HEAVY_JOB_TYPES: ReadonlySet<JobType> = new Set<JobType>([
  // Geen AI-aanroep, maar wel tot 150 pagina's ophalen in batches van 8. Bij een
  // trage site is dat ruim een minuut netwerk — zwaar in tijd, niet in geld.
  "profile_discover",
  "profile_research", // crawlt de hele site + AI-onderzoek met web_search
  "profile_offering",
  /**
   * Fase 1c: 5-8 core topics voorstellen uit de aanbodboom (blok D). Eén
   * goedkope aanroep, geen meting — die volgt pas na goedkeuring.
   */
  "propose_topics",
  /**
   * Fase 2: markt en concurrentie verdiepen (blok B). Waarom winnen die
   * concurrenten, en welke domeinen bepalen deze markt?
   */
  "profile_market",
  /**
   * Fase 3: wat weten AI-assistenten al over dit merk, en klopt dat? (blok B)
   * Draait per beschikbare engine; het oordeel is deterministisch en komt niet
   * van het model zelf.
   */
  "profile_llm_baseline",
  /**
   * Fase 5: alles samenbrengen tot een leesbaar dossier en citeerbare feiten
   * (blok B). De enige onboarding-stap op het dure model.
   */
  "profile_synthesis", // één aanroep over 55.000 tekens sitetekst
  "prepare_analysis", // onderwerp-onderzoek: één gegrondde AI-aanroep
  "generate_prompts", // 3 parallelle prompt-calls, elk met een bijvul-ronde
  "profile_competitors", // destilleert eigenschappen uit alle antwoordfragmenten
  "content_brief", // claim-audit over de hele batch, plus alle winnende antwoorden
  "content_draft", // het premium model schrijft een volledige pagina
  "content_revise", // idem
  "offsite_scan", // crawlt niets maar doet wel een gegroundde AI-aanroep + externe API's
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
