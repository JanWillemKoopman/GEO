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
export type ContentType = "article" | "faq" | "landing" | "comparison";
/** `draft` = tussenstand tijdens generatie (migratie 0013): stap 1 klaar, stap 2 nog niet. */
export type ContentStatus = "draft" | "ready" | "archived" | "published";
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
  created_at: string;
  updated_at: string;
}

/** Klantprofiel (accountniveau): het grondige, bedrijfsbrede onderzoek — één keer per merk. */
export interface Profile {
  id: string;
  user_id: string;
  name: string;
  url: string;
  brand_name: string | null;
  industry: string | null;
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
  customer_questions: string[];
  /** Crawl-instellingen voor de content-inventaris (§12.23), bewerkbaar door de klant. */
  sitemap_url: string | null;
  max_inventory_pages: number;
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
  sentiment: MentionSentiment | null;
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
  /** Door de klant gezien en goedgekeurd? Alleen bevestigde tellen in het aandeel. */
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
  computed_at: string;
}

export interface Report {
  id: string;
  analysis_id: string;
  period: string | null;
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
