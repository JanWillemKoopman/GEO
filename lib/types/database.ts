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
export type ContentStatus = "ready" | "archived" | "published";
export type JobStatus = "queued" | "running" | "done" | "failed";

/**
 * Canonieke prompt-categorieën (abcplan.md §6 A2). Klant mag afwijken (vrije tekst).
 * ALLE categorieën zijn MERKNEUTRAAL: een prompt mag nooit de eigen merknaam van de
 * klant bevatten, anders is een vermelding gegarandeerd en meet 'ie niets (zie
 * lib/pipeline/prompts.ts). Daarom is "Merkspecifiek" vervangen door "Aanbeveling/keuze".
 */
export const PROMPT_CATEGORIES = [
  "Oriëntatie",
  "Vergelijking",
  "Probleem→oplossing",
  "Lokaal/branche",
  "Aanbeveling/keuze",
] as const;
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number] | (string & {});

export interface Persona {
  name: string;
  needs: string[];
}

export interface Analysis {
  id: string;
  user_id: string;
  url: string;
  topic: string | null;
  name: string;
  status: AnalysisStatus;
  tracking_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandDna {
  id: string;
  analysis_id: string;
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
  edited_by_user: boolean;
  updated_at: string;
}

export interface Prompt {
  id: string;
  analysis_id: string;
  text: string;
  category: PromptCategory;
  intent: string | null;
  active: boolean;
  created_by: PromptOrigin;
  source_raw_json: unknown | null;
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
}

export interface TrackingRunMention {
  id: string;
  tracking_run_id: string;
  entity_name: string;
  is_own_brand: boolean;
  mentioned: boolean;
  position: number | null;
  sentiment: MentionSentiment | null;
  cited_sources: string[];
}

export interface VisibilityScore {
  id: string;
  analysis_id: string;
  week_no: number;
  score: number;
  share_of_voice: number | null;
  per_engine_json: unknown | null;
  computed_at: string;
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
  created_at: string;
}

export interface Job {
  id: string;
  analysis_id: string;
  type: string;
  payload_json: unknown | null;
  status: JobStatus;
  attempts: number;
  scheduled_for: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
