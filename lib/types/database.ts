import type { EntityRole } from "@/lib/schemas/entity-classification";
/**
 * TypeScript-representatie van het datamodel (abcplan.md §5).
 * Handgeschreven (in plaats van gegenereerd) zodat de scaffolding zonder
 * live Supabase-project al type-safe is. Zodra het project draait kun je
 * desgewenst `supabase gen types typescript` gebruiken en deze vervangen.
 */

export type AnalysisStatus =
  | "bezig"
  | "concept_klaar"
  | "meten"
  | "gemeten"
  | "gereed"
  | "mislukt";

export type PromptOrigin = "system" | "user";
export type MentionSentiment = "positive" | "neutral" | "negative";

/**
 * Hoe prominent een merk in een AI-antwoord staat (implementatieplan.md R3).
 * Vervangt sentiment als derde kenmerk van een vermelding: niet "hoe wordt
 * erover gesproken" (waar geen variatie in bleek te zitten) maar "word je
 * aanbevolen of alleen genoemd" — het verschil dat klanten oplevert.
 */
export type MentionRole = "eerste_aanbeveling" | "een_van_meerdere" | "zijdelings";
export type ContentType = "article" | "faq" | "landing" | "comparison";
/** `draft` = tussenstand tijdens generatie (migratie 0013): stap 1 klaar, stap 2 nog niet. */
/**
 * `briefing` = door de klant gekozen, wacht op zijn antwoorden vóórdat er ook
 * maar één zin geschreven wordt (contentbriefing.md §10, migratie 0024). Een
 * rij in deze status heeft nog geen `body_markdown`; de bibliotheek toont hem
 * apart en linkt naar het briefingscherm in plaats van naar een lege pagina.
 */
export type ContentStatus = "briefing" | "draft" | "ready" | "archived" | "published";
export type JobStatus = "queued" | "running" | "done" | "failed";
export type ProfileStatus = "bezig" | "klaar" | "mislukt";
export type ContentAction = "nieuw" | "verbeteren";

/**
 * Prompt-hoofd-as = de FUNNELFASE (abcplan.md §6 A2). Klant mag afwijken (vrije tekst).
 * ALLE prompts zijn MERK- én CONCURRENT-NEUTRAAL: een prompt mag nooit de eigen
 * merknaam of een concurrerend bedrijf bevatten, anders is een vermelding
 * gegarandeerd en meet 'ie niets (zie lib/pipeline/prompts.ts). Generieke
 * productmerken (bv. Nike) mogen wél.
 */
export const PROMPT_CATEGORIES = ["Oriëntatie", "Overweging", "Beslissing"] as const;
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number] | (string & {});

/** Fijnere prompt-tags (abcplan.md §6 A2) — elk een eigen kolom voor analyse. */
export type PromptIntentType = "informational" | "commercial" | "transactional";
export type PromptSpecificity = "head" | "long_tail";

/**
 * Hoe vaak een vraag gesteld wordt, in banden (optimalisatie.md 2.6, migratie 0017).
 * Zie lib/pipeline/volume.ts voor de labels en de wegingsfactoren.
 */
export type VolumeBand = "hoog" | "midden" | "laag";
export type VolumeSource = "geschat" | "klant";

export interface Persona {
  name: string;
  needs: string[];
}

export interface Analysis {
  id: string;
  user_id: string;
  profile_id: string;
  url: string;
  topic: string;
  name: string;
  status: AnalysisStatus;
  tracking_enabled: boolean;
  content_brief: string | null; // vrije toelichting: gewenste hoek/doelgroep van de content (§6/§7/§8)
  /** Mail sturen zodra het rapport klaar is (optimalisatie.md 1.8). */
  notify_by_email: boolean;
  /** Eenmalige herinnering bij klaarliggende, niet-gepubliceerde content (5.8). */
  publish_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Het bedrijfsmodel van een klant (migratie 0032, R8.5).
 *
 * Het onderscheid dat ertoe doet is niet de branche maar hóé het bedrijf zijn
 * geld verdient: een webshop met eigen producten heeft één adres, een
 * marktplaats niet.
 */
export type BusinessModel = "retailer" | "platform" | "dienstverlener" | "fabrikant" | "overig";

/** Klantprofiel (accountniveau): het grondige, bedrijfsbrede onderzoek — één keer per merk. */
export interface Profile {
  id: string;
  user_id: string;
  name: string;
  url: string;
  brand_name: string | null;
  industry: string | null;
  /**
   * Bedrijfsmodel (migratie 0032, R8.5). Bepaalt welke vaste briefingvragen
   * zinvol zijn: een platform of keten heeft geen enkelvoudig adres of
   * telefoonnummer. `null` = onbekend, dan valt de briefing terug op het
   * standaardgedrag.
   */
  business_model: BusinessModel | null;
  tone_of_voice: string | null;
  summary: string | null;
  products: string[];
  value_props: string[];
  competitors: string[];
  personas: Persona[];
  proof_points: string[]; // ✅ contentkwaliteit (A2): citeerbare feiten uit de site
  style_samples: string[]; // ✅ contentkwaliteit (A3): letterlijke stijlvoorbeelden
  raw_json: unknown | null;
  status: ProfileStatus;
  edited_by_user: boolean;
  /** Onboarding-intake (§12.24): vrije-tekst seeds die de klant zelf aanleverde. */
  intake_description: string | null;
  intake_audience: string | null;
  /** Uitgebreide onboarding-velden (§12.24), doorgevoerd in meting/prompts/content. */
  aliases: string[];
  service_scope: string | null; // 'lokaal' | 'landelijk' | 'internationaal'
  service_regions: string[];
  market_language: string | null;
  /** Crawl-instellingen voor de content-inventaris (§12.23), bewerkbaar door de klant. */
  sitemap_url: string | null;
  max_inventory_pages: number;
  /**
   * Entiteitsaanwezigheid (optimalisatie.md 7.4, migratie 0022). Of een merk in
   * Wikidata/Wikipedia voorkomt is een van de sterkste signalen waarmee
   * AI-systemen een bedrijf als bestaande entiteit herkennen.
   */
  wikidata_id: string | null;
  wikipedia_url: string | null;
  entity_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Onderwerp-onderzoek (per analyse): alleen wat specifiek is voor dít product/thema. */
export interface TopicResearch {
  id: string;
  analysis_id: string;
  content_summary: string | null;
  competitors: string[];
  raw_json: unknown | null;
  edited_by_user: boolean;
  updated_at: string;
}

/**
 * Content-inventaris van het profiel (beperkte crawl, sitemap-based): welke
 * pagina's bestaan er al op de site, zodat het rapport kan kiezen tussen een
 * bestaande pagina verbeteren of een nieuwe pagina voorstellen.
 */
export interface ProfilePage {
  id: string;
  profile_id: string;
  url: string;
  title: string | null;
  text_excerpt: string | null;
  created_at: string;
}

export interface Prompt {
  id: string;
  analysis_id: string;
  text: string;
  category: PromptCategory; // funnelfase: Oriëntatie | Overweging | Beslissing
  intent: string | null; // vrije-tekst job-to-be-done
  active: boolean;
  created_by: PromptOrigin;
  source_raw_json: unknown | null;
  // Fijnere tags (§6 A2) — elk een eigen kolom, nullable voor handmatige prompts.
  intent_type: PromptIntentType | null;
  specificity: PromptSpecificity | null;
  purchase_intent: boolean | null;
  cluster: string | null;
  /**
   * Ruwe schatting van het model, 0-100. Blijft staan als audit-trail — dít gaf
   * het model terug — maar weegt en toont niet meer mee (optimalisatie.md 2.6).
   */
  volume_estimate: number | null;
  /** 'hoog' | 'midden' | 'laag' — wat er wél weegt en wat de klant ziet. */
  volume_band: VolumeBand | null;
  /** 'geschat' door het model, of 'klant' als hij de band zelf bijstelde. */
  volume_source: VolumeSource;
  /**
   * Levert deze vraag antwoorden op waarin aanbieders genoemd worden
   * (implementatieplan.md R2, migratie 0028)? 'nee' pas na twee metingen zonder
   * enige aanbieder — dan wordt de vraag bij vervolgperiodes overgeslagen, want
   * elke meting is een betaalde web-zoekactie.
   */
  brand_eliciting: "ja" | "nee" | "onbekend" | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingRun {
  id: string;
  analysis_id: string;
  prompt_id: string | null;
  prompt_text_snapshot: string;
  prompt_category_snapshot: string;
  engine: string;
  model_used: string | null;
  week_no: number;
  ran_at: string;
  raw_response: string | null;
  raw_response_received_at: string | null;
  mention_json: unknown | null;
  openai_response_id: string | null;
  tokens_used: number | null;
  cost_usd: number | null;
  prompt_weight: number | null; // gewicht (volume × waarde), bevroren op meetmoment (§6 A3)
  /**
   * Waarvoor deze meting gedaan is (optimalisatie.md 5.3, migratie 0020).
   * Alleen 'periodic' telt mee in de zichtbaarheidsscore; een impactmeting van
   * drie vragen mag nooit als score over drie vragen het dashboard op.
   */
  purpose: TrackingRunPurpose;
  content_piece_id: string | null;
  impact_wave: number | null;
  /**
   * Hoeveel verschillende aanbieders dit antwoord bij naam noemde, INCLUSIEF het
   * eigen merk (implementatieplan.md R2.1, migratie 0028). 0 = de AI noemde er
   * geen enkele; die meting telt niet mee in de score, want daar viel niets te
   * winnen. Null = nog niet geteld (meting van vóór R2).
   */
  brands_in_answer: number | null;
}

export type TrackingRunPurpose = "periodic" | "impact" | "control";

export type ImpactVerdict = "gestegen" | "gelijk" | "gedaald" | "te_weinig_data";

/**
 * Het gemeten effect van één gepubliceerde pagina (optimalisatie.md 5.4/5.5,
 * migratie 0020). Bewaard en niet herrekend: een cijfer dat de klant vandaag
 * ziet moet morgen nog hetzelfde zijn.
 */
export interface ContentImpact {
  id: string;
  content_piece_id: string;
  analysis_id: string;
  wave: number;
  target_total: number;
  target_before_mentioned: number;
  target_after_mentioned: number;
  control_total: number;
  control_before_mentioned: number;
  control_after_mentioned: number;
  target_delta: number | null;
  control_delta: number | null;
  delta_threshold: number | null;
  verdict: ImpactVerdict;
  computed_at: string;
}

export interface TrackingRunMention {
  id: string;
  tracking_run_id: string;
  entity_name: string;
  /** Koppeling naar de samengevoegde entiteit (migratie 0016). */
  entity_id: string | null;
  is_own_brand: boolean;
  mentioned: boolean;
  position: number | null;
  /**
   * VERVALLEN sinds R3 (migratie 0029): wordt niet meer gevuld. In 650 metingen
   * kwam 'negative' geen enkele keer voor en de waarde werd nergens getoond.
   * Blijft bestaan voor de historie van bestaande metingen.
   */
  sentiment: MentionSentiment | null;
  /** Hoe prominent dit merk in het antwoord staat (R3). Null als niet genoemd. */
  mention_role: MentionRole | null;
  cited_sources: string[];
}

export interface VisibilityScore {
  id: string;
  analysis_id: string;
  /** Periode-index: 0 = nulmeting, daarna elke maandelijkse hermeting (§6 A3). */
  week_no: number;
  score: number; // ongewogen: % prompts waarin het merk genoemd wordt (elke prompt telt gelijk)
  weighted_score: number | null; // gewogen naar volume × commerciële waarde (§6 A3)
  share_of_voice: number | null;
  per_engine_json: unknown | null;
  /** Onzekerheid van de meting (optimalisatie.md 2.2, migratie 0016). */
  judged_runs: number | null; // aantal metingen waarop de score rust
  /**
   * Meetbaarheid (implementatieplan.md R2, migratie 0028). `winnable_runs` is de
   * NOEMER van score/weighted_score: alleen metingen waarin de AI minstens één
   * aanbieder noemde. `brandless_runs` zijn de metingen waarin er geen enkele
   * genoemd werd — geen gemiste kans, maar een vraag waar niemand de standaard
   * is. Samen tellen ze op tot `judged_runs`.
   */
  winnable_runs: number | null;
  brandless_runs: number | null;
  /**
   * Zichtbaarheidsprofiel (implementatieplan.md R3, migratie 0029). Naast
   * "genoemd ja/nee": waar in het antwoord sta je (`avg_position`, lager is
   * beter), hoe vaak wordt je site als bron geciteerd (`citation_count`) en hoe
   * vaak word je als eerste aanbevolen (`first_mention_count`).
   */
  avg_position: number | null;
  citation_count: number | null;
  first_mention_count: number | null;
  score_stderr: number | null; // standaardfout in procentpunten; 95%-band = ±1,96×
  weighted_stderr: number | null;
  share_basis_count: number | null; // aantal entiteiten in de noemer van het aandeel
  computed_at: string;
}

/**
 * Eén bedrijf, met al z'n schrijfwijzen (optimalisatie.md 2.4, migratie 0016).
 * Per PROFIEL, want dezelfde concurrent duikt op bij meerdere onderwerpen.
 */
export interface Entity {
  id: string;
  profile_id: string;
  canonical_name: string;
  normalized: string;
  aliases: string[];
  /**
   * Wat dit merk IS ten opzichte van de klant (migratie 0024/0026). Alleen
   * 'concurrent' telt mee in 'Jij vs. concurrenten' en in share_of_voice — een
   * marktplaats of brancheorganisatie komt wél uit de meting maar hoort daar
   * niet tussen.
   */
  entity_role: EntityRole;
  /**
   * Waar `entity_role` vandaan komt. 'onbepaald' = nog te classificeren;
   * 'ai' = automatisch bepaald tijdens de aggregatie; 'handmatig' = door de
   * klant gezet en wordt nooit automatisch overschreven.
   */
  role_source: "onbepaald" | "ai" | "handmatig";
  /** Korte reden waarom dit merk géén concurrent is. Null bij een concurrent. */
  exclude_reason: string | null;
  /**
   * Door de klant gezien en goedgekeurd. Sinds migratie 0026 bepaalt dit niet
   * meer of een merk meetelt — dat doet `entity_role`. Blijft bestaan als
   * signaal dat de klant er zelf naar gekeken heeft.
   */
  confirmed: boolean;
  /** Door de klant weggezet als "geen concurrent van mij". */
  dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompetitorScore {
  entity_name: string;
  mentions_count: number;
}

export interface CompetitorBreakdown {
  id: string;
  analysis_id: string;
  week_no: number;
  competitor_name: string;
  mentions_count: number;
  mentions_by_category_json: unknown | null;
  top_cited_sources: string[];
  winning_run_ids: string[];
  losing_run_ids: string[];
  /**
   * Hetzelfde profiel als voor het eigen merk (R3, migratie 0029) — zonder deze
   * twee valt er niets te vergelijken: even vaak genoemd maar structureel later
   * in het antwoord is een heel ander verhaal dan even vaak én even prominent.
   */
  avg_position: number | null;
  first_mention_count: number | null;
  /**
   * Waaróm wordt deze concurrent genoemd (implementatieplan.md R4.2, migratie
   * 0030)? `attributes_json` bevat per eigenschap een letterlijk citaat uit de
   * meting als bewijs; `why_summary` is één leesbare zin voor de klant.
   *
   * De eigenschappen zijn de lat voor de contentstap. De NAAM van de concurrent
   * gaat daarbij nooit mee — alleen de eigenschap; klantcontent noemt nooit een
   * concurrent (lib/pipeline/content.ts).
   */
  attributes_json: { attribute: string; evidence: string }[] | null;
  why_summary: string | null;
  computed_at: string;
}

export interface Report {
  id: string;
  analysis_id: string;
  period: string | null;
  /** Periode-index (migratie 0021). Rapporten zijn sinds fase 6 een REEKS. */
  week_no: number;
  /** Wat er veranderd is t.o.v. de vorige periode (optimalisatie.md 6.2). */
  change_json: unknown | null;
  /** Wanneer de mail hierover de deur uit ging — null = nooit (6.7). */
  emailed_at: string | null;
  summary: string | null;
  gaps_json: unknown | null;
  recommendations_json: unknown | null;
  gap_analysis_raw_json: unknown | null;
  raw_json: unknown | null;
  generated_at: string;
}

export interface ContentPiece {
  id: string;
  analysis_id: string;
  report_id: string | null;
  type: ContentType;
  title: string;
  target_intent: string | null;
  cluster: string | null;
  body_markdown: string | null;
  meta_title: string | null;
  meta_description: string | null;
  schema_jsonld: string | null;
  faq_json: unknown | null;
  raw_json: unknown | null;
  critique_raw_json: unknown | null; // ✅ contentkwaliteit (C3): ruwe redactie-output
  quality_score: number | null; // ✅ contentkwaliteit (C3/F1): rubric-score 0-100
  needs_review: boolean; // ✅ contentkwaliteit (F1): onder drempel of regel-risico
  status: ContentStatus;
  word_count: number | null;
  action: ContentAction;
  existing_url: string | null;
  /** Versiebeheer (optimalisatie.md 4.7, migratie 0019). */
  version: number;
  is_current: boolean;
  supersedes_id: string | null;
  /** Wat de klant zelf vroeg te veranderen (4.8). */
  revision_note: string | null;
  /**
   * Wanneer een mens deze pagina heeft vrijgegeven (S6, migratie 0034).
   *
   * `null` = nog nooit bekeken. Dat is iets anders dan `needs_review = false`,
   * wat de kwaliteitspoort ook automatisch zet — zonder deze kolom zijn "de
   * controles vonden niets" en "iemand heeft gekeken" niet te onderscheiden.
   */
  reviewed_at: string | null;
  reviewed_by: string | null;
  /** GEO-beoordeling: zou een AI deze pagina citeren? (4.5) */
  geo_score: number | null;
  geo_json: unknown | null;
  /** Wat de eindredacteur nog zag, in gewone taal (4.13). */
  review_notes: string[];
  /**
   * Contentbriefing (migratie 0024, implementatieplan.md R5.1/R5.3).
   *
   * `claims_json` = per concrete bewering in de tekst het F-nummer dat hem dekt.
   * `briefing_snapshot_json` = de feitenkaart en de aanbeveling zoals gebruikt
   * bij het schrijven, bevroren. `source_coverage` = welk deel van de
   * beweringen herleidbaar is; vervangt `geo_score` als kwaliteitsmaat, want
   * die gaf in de praktijktest voor alle drie de pagina's 100 — ook voor de
   * pagina met vijf verzonnen feiten.
   */
  claims_json: unknown | null;
  briefing_snapshot_json: unknown | null;
  brief_instruction: string | null;
  source_coverage: number | null;
  /** Heeft de klant de tekst zelf bijgewerkt? (4.12) */
  edited_by_user: boolean;
  /** Publicatie (optimalisatie.md 5.1/5.2, migratie 0020). */
  published_at: string | null;
  published_url: string | null;
  publish_check_json: unknown | null;
  publish_checked_at: string | null;
  created_at: string;
}

/**
 * Welke gemiste vraag moet deze pagina winnen? (optimalisatie.md 4.1, migratie 0019)
 * De spil tussen meting en content: zonder deze koppeling is niet te zeggen of
 * een gegenereerde pagina iets uithaalt.
 */
export interface ContentPieceTarget {
  id: string;
  content_piece_id: string;
  prompt_id: string | null;
  tracking_run_id: string | null;
  prompt_text: string;
  cluster: string | null;
  created_at: string;
}

export type FactRequestStatus = "open" | "beantwoord" | "overgeslagen";

/**
 * Een gerichte vraag aan de klant om een concreet feit (optimalisatie.md 4.6,
 * migratie 0019). Antwoorden gaan naar `profiles.proof_points` en verbeteren
 * élke volgende pagina.
 */
export interface FactRequest {
  id: string;
  profile_id: string;
  analysis_id: string | null;
  question: string;
  reason: string | null;
  answer: string | null;
  status: FactRequestStatus;
  answered_at: string | null;
  created_at: string;
}

/**
 * Kostenregistratie per AI-aanroep (optimalisatie.md 0.6, migratie 0012).
 * Deny-all in RLS: uitsluitend te lezen via een service-role route.
 */
export interface AiCall {
  id: string;
  analysis_id: string | null;
  profile_id: string | null;
  kind: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  web_search: boolean;
  cost_usd: number | null;
  openai_response_id: string | null;
  created_at: string;
}

export type OffsiteTaskStatus = "open" | "bezig" | "gedaan" | "niet_relevant";
export type OffsiteTaskKind = "platform" | "wikidata" | "wikipedia" | "overig";

/**
 * Eén domein dat deze markt bepaalt (optimalisatie.md 7.1, migratie 0022).
 * Per DOMEIN en niet per URL: drie pagina's van hetzelfde reviewplatform zijn
 * één signaal, niet drie.
 */
export interface SourceLandscapeRow {
  id: string;
  analysis_id: string;
  domain: string;
  citations: number;
  prompt_count: number;
  competitors: string[];
  /** null = nog niet gecontroleerd. "We weten het niet" is een echt antwoord. */
  own_present: boolean | null;
  own_url: string | null;
  checked_at: string | null;
  updated_at: string;
}

/**
 * Een off-site actie met een status (optimalisatie.md 7.6, migratie 0022).
 * Geen gegenereerde pagina maar een taak — zonder status blijft off-site advies
 * hangen als goede bedoeling.
 */
export interface OffsiteTask {
  id: string;
  analysis_id: string;
  kind: OffsiteTaskKind;
  domain: string | null;
  title: string;
  why: string;
  action: string | null;
  status: OffsiteTaskStatus;
  priority: number;
  created_at: string;
  updated_at: string;
}

/**
 * Uitslag van de technische GEO-audit (optimalisatie.md 3B, migratie 0018).
 * Eén rij per uitvoering, zodat zichtbaar is sinds wanneer een blokkade er is.
 * De vorm van `checks_json` staat in lib/audit/technical.ts (AuditCheck[]).
 */
export interface TechnicalAudit {
  id: string;
  profile_id: string;
  checked_at: string;
  site_url: string;
  blockers: number;
  warnings: number;
  checks_json: unknown;
  created_at: string;
}

/**
 * Eén taak in de wachtrij (migratie 0013, optimalisatie.md fase 1).
 * `analysis_id` en `profile_id` zijn allebei nullable maar nooit allebei leeg —
 * profielonderzoek hangt aan een profiel, de rest aan een analyse.
 */
export interface Job {
  id: string;
  analysis_id: string | null;
  profile_id: string | null;
  type: string;
  payload_json: unknown | null;
  status: JobStatus;
  attempts: number;
  scheduled_for: string;
  last_error: string | null;
  /** Voorkomt dubbel inplannen zolang de taak openstaat (unieke index). */
  dedupe_key: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}
