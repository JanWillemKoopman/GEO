/**
 * Taaksoorten van de wachtrij (optimalisatie.md 1.3).
 *
 * Elke taak moet RUIM binnen de tijdslimiet van één werker-aanroep passen.
 * Vandaar dat de meting per PROMPT is opgeknipt in plaats van per analyse, en
 * contentgeneratie in twee stappen: één taak = hooguit één zware AI-aanroep.
 * Zo is "30 vragen meten" een kwestie van 30 taken plannen in plaats van een
 * architectuurwijziging. Precies wat fase 2 (drie metingen per vraag) nodig heeft.
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
   * goedkope aanroep, geen meting. Die volgt pas na goedkeuring.
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
  /**
   * Zoekcijfers van één merk ophalen bij Google Search Console (fase 5,
   * migratie 0052). Geen AI-aanroep: één HTTP-verzoek plus een bulk-upsert, dus
   * licht werk. Draait dagelijks per gekoppeld merk.
   */
  "gsc_sync",
  /**
   * Zoekvolume herberekenen over ALLE onderwerpen van een merk tegelijk
   * (docs/tasks/potentiescore.md). Draait per profiel, niet per analyse: zonder
   * dat zou elk onderwerp zijn eigen, niet-vergelijkbare schaal houden.
   * Getriggerd zodra een analyse haar eerste rapport krijgt.
   */
  "recalculate_potential",

  // ── Mijn reputatie (docs/tasks/mijn-reputatie.md §7) ─────────────────────
  //
  // Zes taaksoorten die op elkaar wachten. Dat is meer samenhang dan enig ander
  // onderdeel van de app heeft, en juist daar zaten zeven van de zeven fouten
  // van het vorige traject. De ketentests in `scripts/test-chain.ts` zijn hier
  // dus het zwaartepunt en niet het sluitstuk.
  /** Knopen en concurrenten kiezen, de scope vastleggen, de rest inplannen. Geen AI. */
  "reputation_start",
  /** Blok A: vijf merkbrede vragen parallel, plus de beoordelingen. */
  "reputation_brand",
  /** Blok B: de reputatievraag voor ÉÉN aanbodknoop, plus de beoordeling. */
  "reputation_offering",
  /**
   * Blok V: de vergelijking met de concurrenten, voor één knoop of merkbreed.
   *
   * ⚠️ Een EIGEN taaksoort en geen uitbreiding van `reputation_offering`
   * (conventie 7). Twee redenen, en de tweede weegt het zwaarst: met drie
   * rotaties zou één taak drie zware aanroepen doen náást de reputatievraag, en
   * dat past niet in één werker-aanroep. En de vergelijking moet als geheel
   * kunnen wegvallen als het budget vol loopt, zonder de basisanalyse mee te
   * nemen. Dat kan alleen als het een eigen taak is.
   */
  "reputation_compare",
  /** Blok C: de bronnen en de reviewcijfers, inclusief de crawl-controle. */
  "reputation_sources",
  /** Blok D: de getallen rekenen, de tekst schrijven, de run afsluiten. */
  "reputation_synthesis",

  // ── De Sales-module, sprint 2 (docs/tasks/geo-prospect-engine.md §8) ──────
  //
  // Vier taaksoorten, en maar één ervan roept een model aan. Dat is het ontwerp
  // uit plan 21.1: wat meeschaalt met het aantal bedrijven moet gratis zijn,
  // anders wordt een volledige markt duur en gaan mensen bedrijven wegsnijden.
  // Precies de onzichtbare bedrijven die deze module zoekt.
  /**
   * Welke bedrijven vormen deze markt? De enige betaalde stap: één
   * onderzoeksaanroep mét web-zoeken (conventie 7).
   */
  "sales_market_discover",
  /**
   * De bronpagina's uitlezen, ontdubbelen en de lijst vastleggen. Geen AI.
   *
   * ⚠️ Een EIGEN taaksoort en geen staart aan `sales_market_discover`. Die stap
   * doet een web-zoekactie van tientallen seconden; deze haalt tot twaalf
   * pagina's op. Samen passen ze niet betrouwbaar in één werker-aanroep, en dan
   * zou een tijdslimiet de dure aanroep opnieuw laten betalen.
   */
  "sales_market_verify",
  /** Klanten, lopende trajecten en afmeldingen eruit (plan 9.5). Geen AI. */
  "sales_market_suppress",
  /**
   * De site van ÉÉN bedrijf uitlezen. Geen AI, en één taak per bedrijf.
   *
   * Zelfde reden als bij `measure_prompt`: dertig sites in één taak past niet in
   * één werker-aanroep, en één onbereikbare site mag de andere negenentwintig
   * niet meenemen.
   */
  "sales_company_enrich",
  // ── Sprint 3: de meting (plan hoofdstuk 10 en 11) ─────────────────────────
  /**
   * Welke commerciële intenties heeft deze markt? Eén aanroep, geen web-zoeken.
   *
   * Draait ná de verrijking en niet ervoor: de intenties komen mede uit wat de
   * sites van déze bedrijven aanbieden, en niet alleen uit wat het model over de
   * branche weet (plan hoofdstuk 10).
   */
  "sales_market_intents",
  /**
   * De vragen schrijven op de plekken die de verdeling oplevert. Eén aanroep.
   *
   * ⚠️ Een EIGEN taaksoort en geen staart aan `sales_market_intents`. Twee
   * aanroepen in één taak is conventie 7 overtreden, en het zou betekenen dat een
   * mislukte vragenstap de intentiestap opnieuw laat betalen.
   */
  "sales_market_questions",
  /**
   * Eén vraag aan één engine stellen en het antwoord beoordelen.
   *
   * Precies de opzet van `measure_prompt`: de dure zoekactie en de goedkope
   * beoordeling in één taak, zodat een mislukte beoordeling de zoekactie niet
   * opnieuw laat betalen. Veertig vragen maal twee engines is tachtig taken, en
   * dat is waar ~95% van de kosten van een marktronde zit (plan 21.1).
   */
  "sales_measure_question",
  /** De meting omrekenen naar zichtbaarheid per bedrijf. Geen AI. */
  "sales_market_aggregate",
  // ── Sprint 4: de kansen (plan hoofdstuk 12 t/m 15) ────────────────────────
  /**
   * De acht opportunitytypes detecteren en scoren. Geen AI, en dat is het punt.
   *
   * Plan hoofdstuk 12: "Detectie is deterministisch. Het model schrijft later
   * alleen de uitleg, en verzint nooit de conclusie zelf." Wat hieruit komt
   * belandt in een mail aan een ondernemer die zijn eigen markt kent, en een
   * conclusie die uit een model komt is niet na te rekenen.
   */
  "sales_detect_opportunities",
  /**
   * De uitleg en de haak bij ÉÉN kans. Eén goedkope aanroep, geen web-zoeken.
   *
   * Eén taak per kans en niet één taak voor de hele markt: dertig haken in één
   * aanroep is één lang antwoord waarvan het staartje afgekapt raakt, en dan
   * missen de laatste bedrijven hun zin zonder dat iemand het ziet.
   */
  "sales_opportunity_explain",
  // ── Sprint 5: de outreach (plan hoofdstuk 16) ─────────────────────────────
  //
  // ⚠️ Deze twee draaien pas bij TOEWIJZING en niet bij detectie (plan §8.2b).
  // Voor dertig bedrijven een contactpersoon uitzoeken en een mail schrijven die
  // niemand verstuurt, is werk en geld dat niemand gebruikt.
  /** Wie mailen we bij dit bedrijf? Eén onderzoeksaanroep mét web-zoeken. */
  "sales_contact_find",
  /**
   * De conceptmail plus de gespreksvoorbereiding. Eén aanroep.
   *
   * ⚠️ Deze taak VERSTUURT NIETS, en dat kan hij ook niet: er is geen code in
   * deze module die een verbinding met een mailserver maakt (plan 16.3). Hij zet
   * een concept klaar dat de medewerker leest, aanpast en zelf verstuurt.
   */
  "sales_outreach_draft",
  /**
   * Blok M: de open koperssvraag die concurrenten ONTDEKT in plaats van ze op
   * te leggen. Vervangt de benoemde vergelijking als hoofdmechanisme, na de
   * eerste echte run waarin ChatGPT geen van beide echte concurrenten kende.
   */
  "reputation_market",
  /**
   * Blok E: één onderzoeksronde die het gedeelde bewijscorpus vult. Draait vóór
   * de dienstvragen, die zich daaruit beantwoorden in plaats van elk hun eigen
   * zoekactie te doen.
   */
  "reputation_evidence",
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
  /**
   * ⚠️ `chain: false` betekent: doe deze stap, maar plan zijn opvolger niet in.
   *
   * Nodig sinds de onboardingsessie (fase 4 van onboarding 3.0). Verandert er in
   * het gesprek iets waar alleen het marktonderzoek anders van wordt, dan mag
   * die ene stap draaien zonder de kennistest en de synthese mee te slepen; dat
   * zijn de twee duurste stappen van de onboarding. Weglaten betekent de hele
   * keten, zoals bij de eerste ronde.
   */
  profile_offering: { chain?: boolean };
  propose_topics: Record<string, never>;
  profile_market: { chain?: boolean };
  profile_llm_baseline: { chain?: boolean };
  profile_synthesis: Record<string, never>;
  prepare_analysis: Record<string, never>;
  /** Welke funnelfase deze taak opstelt (migratie 0054, splitsing per fase). */
  generate_prompts: {
    category: string;
    /**
     * De vragen van deze fase opnieuw opstellen, ook als er al vragen staan
     * (onboarding 3.0, fase 4). De oude gaan op inactief, ze worden niet
     * verwijderd: een `delete` zou de metingen meenemen.
     */
    regenerate?: boolean;
  };
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
    /**
     * De pagina uit het contentplan waar deze tekst bij hoort (fase 4).
     * Afwezig bij een schrijftaak die uit een rapport-aanbeveling komt; dat is
     * elke schrijftaak van vóór augustus 2026.
     *
     * Hierdoor kan de taak terugmelden: de plan-pagina krijgt zijn
     * `content_piece_id` en gaat van `schrijven` naar `ter_goedkeuring`. Zonder
     * dit veld schrijft de pijplijn wel, maar blijft de pagina in het plan op
     * "ORBIT ENGINE is bezig" staan tot iemand het handmatig opmerkt.
     */
    plannedPageId?: string;
  };
  content_revise: {
    userId: string;
    contentPieceId: string;
    recommendation: RecommendationPayload;
    /** Verbeterpunten uit de eerste beoordeling, sturen de herschrijfstap. */
    issues: string[];
    /** Zie `content_draft.plannedPageId`; de herschrijfstap meldt hetzelfde terug. */
    plannedPageId?: string;
  };
  technical_audit: Record<string, never>;
  verify_publication: { contentPieceId: string };
  measure_impact: { contentPieceId: string; wave: number };
  compute_impact: { contentPieceId: string; wave: number };
  offsite_scan: Record<string, never>;
  gsc_sync: Record<string, never>;
  recalculate_potential: Record<string, never>;

  // ── Mijn reputatie ────────────────────────────────────────────────────────
  //
  // ⚠️ Alles hangt aan `runId` en niet aan `profileId`. Een tweede scan over drie
  // maanden is NIEUW werk en geen duplicaat van de eerste, en dat moet uit de
  // sleutel én uit de payload blijken.
  reputation_start: { runId: string };
  reputation_brand: { runId: string };
  reputation_offering: { runId: string; offeringId: string };
  reputation_compare: {
    runId: string;
    /** Null = de merkbrede vergelijking, die altijd drie rotaties krijgt. */
    offeringId: string | null;
    /** De plek van deze knoop in de vastgelegde scope. Stuurt de rotatie. */
    slot: number;
    /** Hoeveel rotaties. Eén is indicatief, drie is een uitslag (§4.4). */
    rotations: number;
  };
  reputation_sources: { runId: string };
  reputation_synthesis: { runId: string };

  // ── De Sales-module ──────────────────────────────────────────────────────
  //
  // Alle vier dragen `marketId`, ook de taak die over één bedrijf gaat. Dat is
  // nodig voor het plafond per markt (`lib/sales/budget.ts`) en voor de vraag
  // "zijn alle bedrijven van deze markt klaar", die anders niet te stellen is.
  sales_market_discover: { marketId: string };
  sales_market_verify: { marketId: string };
  sales_market_suppress: { marketId: string };
  sales_company_enrich: { marketId: string; companyId: string };
  sales_market_intents: { marketId: string };
  sales_market_questions: { marketId: string; runId: string };
  sales_measure_question: {
    marketId: string;
    runId: string;
    questionId: string;
    engine: EngineId;
  };
  sales_market_aggregate: { marketId: string; runId: string };
  sales_detect_opportunities: { marketId: string; runId: string };
  sales_opportunity_explain: { marketId: string; runId: string; opportunityId: string };
  sales_contact_find: { marketId: string; companyId: string; outreachId: string };
  sales_outreach_draft: { marketId: string; outreachId: string };
  reputation_evidence: { runId: string };
  reputation_market: {
    runId: string;
    /** Null = merkbreed, over het bedrijf als geheel. */
    offeringId: string | null;
    /** Hoeveel keer de vraag gesteld wordt. Drie merkbreed, één per dienst. */
    repeats: number;
  };
}

/**
 * Hoe zwaar is deze taaksoort? De werker gebruikt dit om te bepalen hoeveel
 * taken hij in één aanroep durft op te pakken: een reeks lichte taken kan
 * samen, één zware taak vult de aanroep in z'n eentje.
 */
export const HEAVY_JOB_TYPES: ReadonlySet<JobType> = new Set<JobType>([
  // Geen AI-aanroep, maar wel tot 150 pagina's ophalen in batches van 8. Bij een
  // trage site is dat ruim een minuut netwerk, zwaar in tijd, niet in geld.
  "profile_discover",
  "profile_research", // crawlt de hele site + AI-onderzoek met web_search
  "profile_offering",
  /**
   * Fase 1c: 5-8 core topics voorstellen uit de aanbodboom (blok D). Eén
   * goedkope aanroep, geen meting. Die volgt pas na goedkeuring.
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
  "generate_prompts", // één funnelfase, met bijvul- en geo-rondes
  "profile_competitors", // destilleert eigenschappen uit alle antwoordfragmenten
  "content_brief", // claim-audit over de hele batch, plus alle winnende antwoorden
  "content_draft", // het premium model schrijft een volledige pagina
  "content_revise", // idem
  "offsite_scan", // crawlt niets maar doet wel een gegroundde AI-aanroep + externe API's
  // Mijn reputatie. `reputation_start` staat er bewust NIET bij: die doet geen
  // enkele AI-aanroep en leest alleen wat er al staat.
  "reputation_brand", // vijf gegronde vragen parallel, plus vijf beoordelingen
  "reputation_offering", // één gegronde vraag plus de beoordeling
  "reputation_compare", // één tot drie gegronde vergelijkingen, elk over vier bedrijven
  "reputation_sources", // twee gegronde vragen, een indeling, plus zes crawls
  "reputation_synthesis", // één aanroep over alles wat de run opleverde
  "reputation_market", // één tot drie gegronde aanbevelingsvragen
  "reputation_evidence", // vier gegronde zoekvragen plus het opknippen
]);

/**
 * Zware taken die op het NETWERK wachten in plaats van op één lange aanroep.
 *
 * ── ⚠️ WAAROM DIT ONDERSCHEID ER MOEST KOMEN (23 augustus 2026) ─────────────
 *
 * `HEAVY_JOB_RESERVE_MS` houdt 220 van de 240 seconden vrij voordat de werker
 * aan een zware taak begint. Die reservering is er voor contentgeneratie: één
 * aanroep waarin het duurste model een volledige pagina schrijft, en die je niet
 * halverwege kunt afbreken zonder de tokens twee keer te betalen.
 *
 * Maar de eerste echte reputatierun liet zien wat die regel doet met werk van
 * een ander soort: **exact één zware taak per minuut**, dertien taken in
 * dertien minuten, waardoor een run van 28 taken op 31,6 minuten uitkwam in
 * plaats van de geschatte 6 tot 9. De reputatietaken zijn geen lange aanroep
 * maar een handvol korte die op OpenAI staan te wachten. Twee daarvan tegelijk
 * kost geen extra rekenkracht, alleen twee open verbindingen.
 *
 * Deze verzameling zegt: bij dit soort zwaar werk mag de werker er meer dan één
 * tegelijk oppakken. De reservering blijft onaangetast voor alles wat er niet in
 * staat, dus contentgeneratie merkt er niets van.
 */
export const IO_BOUND_HEAVY_TYPES: ReadonlySet<JobType> = new Set<JobType>([
  "reputation_brand",
  "reputation_offering",
  "reputation_compare",
  "reputation_sources",
  "reputation_market",
  "reputation_evidence",
]);

/**
 * Hoeveel netwerkgebonden zware taken er tegelijk mogen draaien.
 *
 * Drie, en dat is bewust behoudend. Elke taak doet zelf al parallelle aanroepen
 * (het merkblok doet er vijf tegelijk), dus drie taken kunnen samen vijftien
 * open verbindingen naar OpenAI hebben. Daarboven loop je tegen
 * snelheidsbegrenzing aan, en een 429 midden in een betaalde ronde kost meer dan
 * hij oplevert.
 */
export const IO_BOUND_PARALLELISM = 3;

/**
 * Maximaal aantal pogingen vóórdat een taak definitief mislukt is
 * (optimalisatie.md 1.2). Vier pogingen met oplopende wachttijd overbrugt een
 * storing van ruim een kwartier zonder dat de klant er iets van merkt.
 */
export const MAX_ATTEMPTS = 4;

/**
 * Wachttijd vóór de volgende poging: 2, 4, 8 minuten. Bewust in minuten en niet
 * in seconden, de fouten die hier overblijven zijn er al doorheen gekomen
 * ondanks de retries in de OpenAI-client zelf (die dekken de seconde-schaal af,
 * zie lib/openai/client.ts), dus dit zijn storingen van langere duur.
 */
export function backoffMinutes(attempts: number): number {
  return Math.min(2 ** attempts, 16);
}
