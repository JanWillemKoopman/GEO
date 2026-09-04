import type { EntityRole } from "@/lib/schemas/entity-classification";
import type { CrawlSpeed } from "@/lib/crawl-speed";
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
 * aanbevolen of alleen genoemd", het verschil dat klanten oplevert.
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

/**
 * Het contentplan (migratie 0049). Besluit 3: het kernobject waar het programma
 * aan hangt. De statuslabels en de "wie is er aan zet"-vertaling staan in
 * `lib/plan-status.ts`, niet hier: dat is een presentatiekeuze die mag
 * veranderen zonder migratie.
 */
export type PlanStatus = "concept" | "actief" | "gestopt";
export type PlanMonthStatus =
  | "concept"
  | "ter_goedkeuring"
  | "goedgekeurd"
  | "afgewezen";
export type PlannedPageStatus =
  | "gepland"
  | "schrijven"
  | "ter_goedkeuring"
  | "goedgekeurd"
  | "geplaatst"
  | "afgewezen"
  | "mislukt";
/** Nova's vier (`pageTypeCategory` en de drie andere). Globaal, niet per merk. */
export type PageType = "categorie" | "dienst" | "informatief" | "overig";

export interface FunnelStage {
  id: string;
  profile_id: string;
  label: string;
  sort_order: number;
  created_at: string;
}

export interface ContentPlan {
  id: string;
  profile_id: string;
  /** Waar "maand 4 sinds de start" op rekent. Géén looptijd: besluit 7. */
  started_on: string;
  /** Gekopieerd uit het pakket, niet verwezen: een upgrade verandert een lopend plan niet. */
  pages_per_month: number;
  status: PlanStatus;
  /** Vrije context die met de agent meegaat bij het (her)opstellen. */
  strategy_note: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PlanMonth {
  id: string;
  plan_id: string;
  /** 1 tot 12, geteld vanaf de start en niet vanaf januari. */
  month_number: number;
  status: PlanMonthStatus;
  approved_at: string | null;
  approved_by_user_id: string | null;
  created_at: string;
}

export interface PlannedPage {
  id: string;
  plan_month_id: string;
  /** Gedenormaliseerd, zie de toelichting in migratie 0049. */
  profile_id: string;
  title: string;
  url_path: string | null;
  page_type: PageType;
  funnel_stage_id: string | null;
  topic_id: string | null;
  status: PlannedPageStatus;
  sort_order: number;
  /** Reserve die inschuift als er een pagina sneuvelt. Telt niet mee in het maandtotaal. */
  is_buffer: boolean;
  scheduled_for: string | null;
  /** Migratie 0067: de gebruiker koos deze datum zelf, dus herplannen laat hem staan. */
  scheduled_manual: boolean;
  content_piece_id: string | null;
  posted_at: string | null;
  posted_url: string | null;
  /** Besluit 8: zowel de eigenaar als de klant mag plaatsen, en we leggen vast wie. */
  posted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Twee rollen binnen een account, niet meer. Net als Nova (`roleAdmin`,
 * `roleMember`). Dit is iets anders dan `staff_users`: dat gaat over wie ORBIT ENGINE
 * beheert, dit over wie bij de gegevens van één klant mag.
 */
export type AccountRole = "admin" | "member";

/**
 * Het account: de klant of het bureau (migratie 0046).
 *
 * De facturatievelden komen uit de veldeninventaris (migratie 0046),
 * overgenomen van wat InSpace in hun onboarding uitvraagt. Allemaal nullable:
 * een account bestaat zodra er een merk aan hangt, de gegevens komen pas bij de
 * verkoop (conventie 3).
 */
export interface Account {
  id: string;
  /** Werknaam, wat er in de merkkiezer staat. */
  name: string;
  legal_name: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  vat_number: string | null;
  /**
   * Nova's "I don't have a VAT number"-vinkje. Het verschil tussen "nog niet
   * ingevuld" en "bestaat niet" is hier echt; `null` zou die twee op één hoop
   * gooien.
   */
  vat_not_applicable: boolean;
  invoice_email: string | null;
  contact_person: string | null;
  /** ⚠️ Dit is ook het inlogadres. Nova waarschuwt daar expliciet voor. */
  contact_email: string | null;
  contact_phone: string | null;
  /** Het pakket (besluit 6): 10, 20 of 40 pagina's per maand. Null = nog niet gekozen. */
  package_pages_per_month: 10 | 20 | 40 | null;
  /** Waar de teller "maand 4 sinds de start" op rekent (besluit 7). */
  started_at: string | null;
  /** Opzeggen verwijdert niets (besluit 14). Zie `isActiveAccount()`. */
  cancelled_at: string | null;
  /**
   * Wat één punt extra AI-zichtbaarheid dit account per maand waard is, in euro
   * (migratie 0051, besluit 16). Bewust geen standaardwaarde: een gemiddelde
   * invullen zet een bedrag op het scherm dat de klant als belofte leest.
   *
   * ⚠️ **Wordt sinds 26 augustus 2026 op geen enkel scherm getoond.** Het enige
   * blok dat hem las was het opbrengstblok op het merkoverzicht, en dat is er
   * afgehaald (`docs/logbook.md`). De kolom blijft staan: de data is er, hij is
   * te bewerken via `lib/account-editable.ts`, en het besluit erachter is niet
   * teruggedraaid. Komt er een scherm dat over rendement gaat, dan hoort hij daar.
   */
  value_per_mention_eur: number | null;
  created_at: string;
  updated_at: string;
}

export interface AccountUser {
  account_id: string;
  user_id: string;
  role: AccountRole;
  created_at: string;
}
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

/** Fijnere prompt-tags (abcplan.md §6 A2), elk een eigen kolom voor analyse. */
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
  content_brief: string | null; // vrije toelichting: gewenste hoek en doelgroep van de content (§6/§7/§8)
  /** Mail sturen zodra het rapport klaar is (optimalisatie.md 1.8). */
  notify_by_email: boolean;
  /**
   * Aantal vragen per funnelfase (migratie 0054). Null per fase = de standaard
   * van 10 uit `lib/prompt-mix.ts`. Per ANALYSE en niet per merk, want de juiste
   * verdeling hangt aan het onderwerp: bij "cv-ketel onderhoud" wil je vooral
   * beslissingsvragen, bij "warmtepomp subsidie" juist oriëntatievragen.
   */
  prompts_orientatie: number | null;
  prompts_overweging: number | null;
  prompts_beslissing: number | null;
  /** Eenmalige herinnering bij klaarliggende, niet-gepubliceerde content (5.8). */
  publish_reminder_sent_at: string | null;
  /**
   * Het label waaronder dit cluster in het overzicht staat (migratie 0083).
   * Null = geen label, en dat is een geldige stand: labels zijn optioneel en
   * dienen alleen om te groeperen. Zie `lib/cluster-labels.ts`.
   */
  label_id: string | null;
  /**
   * Gearchiveerd op (migratie 0044). Verborgen uit alle lijsten én uit de
   * maandelijkse meetronde, zodat een onzichtbare analyse geen kosten meer
   * maakt. Zie lib/archive.ts.
   */
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Een onderwerpgroep boven de clusters van één merk (migratie 0083).
 *
 * Puur ordening: het label stuurt geen pijplijnstap aan en gaat nooit mee de
 * prompt in. Zie `lib/cluster-labels.ts` voor de regels eromheen.
 */
export interface ClusterLabel {
  id: string;
  profile_id: string;
  name: string;
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

/** Klantprofiel (accountniveau): het grondige, bedrijfsbrede onderzoek, één keer per merk. */
export interface Profile {
  id: string;
  user_id: string;
  /**
   * Het account waar dit merk bij hoort (migratie 0046). Nullable zolang de
   * historische eigenaarscontrole (`user_id`) nog meedoet als tweede laag; zie
   * `getOwnedProfile()`.
   */
  account_id: string | null;
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
  /** Search Console (migratie 0052). Leeg = niet gekoppeld. */
  gsc_property: string | null;
  /** Wanneer ORBIT ENGINE voor het laatst kon lezen. Leeg mét property = de klant moet ons adres nog toevoegen. */
  gsc_verified_at: string | null;
  /** De laatste fout in gewone taal, zodat het scherm kan zeggen wát er mis is. */
  gsc_last_error: string | null;
  gsc_last_sync_at: string | null;
  /** De eerste dag met cijfers. Het nulpunt van "sinds de start". */
  gsc_first_day: string | null;
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
   * Hoeveel niet-product-URL's de sitemap opleverde vóór het afkappen
   * (migratie 0061). Null = nog niet gemeten. Dit is het cijfer waarmee
   * "de site heeft precies 150 pagina's" te onderscheiden is van "de site
   * heeft er 8.000 en we lazen er 150".
   */
  sitemap_total_urls: number | null;
  /**
   * Welke sitesecties voorrang krijgen bij het verdelen van de beschikbare
   * crawlplekken, bijvoorbeeld `['/diensten', '/behandelingen']`. Gevuld door
   * `crawl-focus.ts` als de site te groot is, en te overschrijven door de
   * consultant. Leeg = alleen de deterministische score van `url-priority.ts`.
   */
  crawl_priority_paths: string[];
  /**
   * Crawlbeheer (onboarding Ronde D, §17, migratie 0080): hoeveel, hoe vaak en
   * hoe rustig. `crawl_speed` stuurt `lib/crawl-speed.ts`.
   */
  crawl_speed: CrawlSpeed;
  /** Standaard uit. Alleen aan met toestemming van de klant voor zijn EIGEN domein. */
  crawl_as_browser: boolean;
  crawl_last_run_at: string | null;
  crawl_last_mode: "meer" | "opnieuw" | null;
  /** Wanneer de site voor het laatst met 403 antwoordde. */
  crawl_last_blocked_at: string | null;
  /**
   * Entiteitsaanwezigheid (optimalisatie.md 7.4, migratie 0022). Of een merk in
   * Wikidata/Wikipedia voorkomt is een van de sterkste signalen waarmee
   * AI-systemen een bedrijf als bestaande entiteit herkennen.
   */
  wikidata_id: string | null;
  wikipedia_url: string | null;
  entity_checked_at: string | null;
  /**
   * Eigenaarschap en toewijzing (migratie 0038). De superuser maakt het profiel
   * aan vóór het demogesprek en is dan zelf `user_id`; na de verkoop gaat
   * `user_id` naar de klant en blijft `created_by_user_id` op de superuser
   * staan, zodat zichtbaar blijft dat het een voorbereid profiel was.
   */
  created_by_user_id: string | null;
  assigned_at: string | null;
  /**
   * Gearchiveerd op (migratie 0044). Null = zichtbaar in de app. Gevuld =
   * verborgen uit alle lijsten en tellingen, maar volledig aanwezig in de
   * database. Zie lib/archive.ts.
   */
  archived_at: string | null;
  /**
   * Inventariskwaliteit (migratie 0039, was R6.2/0033). Bol had 1 pagina in de
   * inventaris en HEMA 40 productpagina's; in beide gevallen degradeerde het
   * rapport zonder foutmelding. Null = nog niet beoordeeld.
   */
  inventory_quality_json: InventoryQuality | null;
  /** Kostenplafond van het onboarding-onderzoek in USD. $2,15 ≈ €2. */
  onboarding_budget_usd: number;
  /** Wanneer het uitgebreide onderzoek (blok B) voor het laatst draaide. */
  deep_research_at: string | null;
  /** Welke engines meedoen (migratie 0041). Doorsnede met de beschikbare sleutels. */
  engines_enabled: EngineId[];
  /**
   * Verboden woorden en tone-of-voice-sliders (migratie 0045), naar het
   * voorbeeld van InSpace Nova's "Words & language" en "Voice"-onboardingstap.
   * Verboden woorden gaan als harde regel
   * de schrijfprompt in (`lib/pipeline/content.ts`) en worden na het schrijven
   * deterministisch teruggecontroleerd (`lib/pipeline/content-gate.ts`,
   * conventie 1). De sliders zijn 1-3 of `null` (niet ingesteld); de vertaling
   * naar prompttaal staat in `lib/pipeline/tone-sliders.ts`, nooit het cijfer
   * zelf naar het model.
   */
  taboo_phrases: string[];
  compliance_notes: string | null;
  author_name: string | null;
  author_role: string | null;
  author_bio: string | null;
  author_linkedin_url: string | null;
  tone_formality: 1 | 2 | 3 | null;
  tone_energy: 1 | 2 | 3 | null;
  tone_complexity: 1 | 2 | 3 | null;
  tone_humor: 1 | 2 | 3 | null;
  /**
   * Het merkprofiel compleet (migratie 0048). De laatste dertien velden uit de
   * inventaris: wat InSpace uitvraagt en ORBIT ENGINE nog niet
   * had. Alles wat al een eigenaar had staat er bewust niet nóg een keer bij;
   * de vertaaltabel staat bovenaan die migratie.
   */
  brand_mission: string | null;
  brand_positioning: string | null;
  /** Het ene ding waarop je wint. Apart van `value_props`: dat zijn er meerdere. */
  usp: string | null;
  key_messages: string[];
  identity_keywords: string[];
  /** Nova's "Us vs. Them". */
  differentiator: string | null;
  /** De primaire doelgroep staat in `intake_audience`; dit is de tweede. */
  audience_secondary: string | null;
  /** 1 = weinig, 2 = redelijk wat, 3 = vakgenoot. */
  audience_knowledge_level: 1 | 2 | 3 | null;
  /** De vijfde schuif, en de enige met vier standen. */
  tone_emotional: 1 | 2 | 3 | 4 | null;
  signature_phrases: string[];
  /**
   * ⚠️ Hoe de CONTENT de lezer aanspreekt, niet hoe ORBIT ENGINE zijn eigen gebruiker
   * aanspreekt. `docs/schrijfstijl.md` legt "je en jij" vast voor de interface;
   * een advocatenkantoor wil dat ORBIT ENGINE vóór hem "u" schrijft.
   */
  pronoun_preference: "je" | "u" | "wij" | null;
  author_photo_url: string | null;
  author_facebook_url: string | null;
  author_other_url: string | null;
  /**
   * De commerciële laag (migratie 0060, onboarding 3.0 deel D1). Twaalf velden
   * die een website niet kan zeggen en die de consultant mét de klant invult.
   * Elk veld heeft precies één lezer in de pijplijn; die staat per kolom in het
   * commentaar van de migratie. Een veld zonder lezer hoort hier niet.
   */
  priority_offerings: string[];
  deprioritised_offerings: string[];
  /** Waar het merk heen WIL. `service_regions` is waar het nu al werkt. */
  growth_regions: string[];
  target_segments: string[];
  /** 'onbekend' = gevraagd en de klant weet het niet. `null` = nooit gevraagd. */
  deal_value_band: DealValueBand | null;
  seasonality: string | null;
  sales_objections: string[];
  forbidden_topics: string[];
  /**
   * ⚠️ Staat naast `proof_points` en vervangt hem niet: die zijn per definitie
   * letterlijk uit de site geëxtraheerd (contentkwaliteit A2), dit is juist
   * bewijs dat nergens op de site staat.
   */
  offline_proof: string[];
  /** De tegenhanger van `aliases`: gelijknamige bedrijven die NIET dit merk zijn. */
  name_exclusions: string[];
  /** Null = niet vastgesteld. `false` zou "verzin gerust nieuwe pagina's" betekenen. */
  respect_site_structure: boolean | null;
  goal_12m: string | null;
  /**
   * Met wie we aan tafel zaten (migratie 0060, deel D2). Telt bewust NIET mee in
   * de volledigheidsmeter van het merkprofiel: het zegt niets over hoe goed
   * ORBIT ENGINE het merk kent.
   */
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

/** Wat een klant ongeveer waard is (migratie 0060). Weegt mee in de potentiescore. */
export type DealValueBand = "onbekend" | "klein" | "midden" | "groot";

/** Onderwerp-onderzoek (per analyse): alleen wat specifiek is voor dít product of thema. */
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
 * Welke AI-engine een meting of onderzoeksstap uitvoerde (migratie 0041).
 * `tracking_runs.engine` bestond al sinds 0001 met default 'openai'; pas nu
 * kan er ook echt iets anders in staan.
 */
export type EngineId = "openai" | "gemini";

/**
 * Herkomst van een profielveld (migratie 0039, uitgebreid in 0060). Alleen `ai`
 * mag door een volgende onderzoeksronde overschreven worden, wat een mens zette
 * blijft staan. Zie lib/pipeline/field-merge.ts.
 *
 * ⚠️ `consultant` is niet hetzelfde als `klant`: wat de consultant vóór het
 * gesprek invult is een onderbouwde aanname, geen bevestigd feit. Voor de
 * bescherming tegen overschrijven telt hij als mens; voor de onderzoeksprompt
 * is hij een startpunt dat tegengesproken mag worden.
 */
export type FieldSource = "ai" | "klant" | "gesprek" | "consultant";

/** Oordeel over de content-inventaris (migratie 0039, R6.2). */
export interface InventoryQuality {
  /** Hoeveel pagina's er daadwerkelijk gelezen zijn. */
  pages: number;
  /**
   * Hoeveel pagina's de site in totaal had, vóór het afkappen op het
   * paginamaximum (migratie 0061). Ontbreekt bij profielen die vóór 22 augustus
   * 2026 gecrawld zijn: die weten het niet, en dat is iets anders dan nul.
   */
  totalFound?: number;
  /** Aandeel pagina's met bruikbare tekst (>= 200 tekens), 0-1. */
  usableTextRatio: number;
  /** Aandeel vermoedelijke productpagina's, 0-1. Bij HEMA was dat ~1,0. */
  productPageRatio: number;
  /**
   * voldoende = bruikbaar · dun = te weinig pagina's ·
   * vervuild = overwegend productpagina's · afgekapt = de site is groter dan
   * wat we mochten lezen, dus het beeld klopt maar is niet compleet.
   */
  verdict: "voldoende" | "dun" | "vervuild" | "afgekapt";
  /** Wat de klant of consultant eraan kan doen. Leeg bij 'voldoende'. */
  advice: string | null;
}

/** Eén onderzoeksfacet van het uitgebreide profiel (migratie 0039). */
export interface ProfileFacet {
  id: string;
  profile_id: string;
  facet: "identiteit" | "aanbod" | "markt" | "llm_kennis" | "techniek" | "synthese";
  summary: string | null;
  raw_json: unknown | null;
  confidence: number | null;
  sources: string[];
  model_used: string | null;
  engine: EngineId;
  cost_usd: number | null;
  researched_at: string;
}

/** Eén knoop in de aanbodboom (migratie 0039). */
export interface ProfileOffering {
  id: string;
  profile_id: string;
  parent_id: string | null;
  kind: "dienst" | "product" | "categorie" | "merk" | "vestiging";
  name: string;
  description: string | null;
  audience: string | null;
  price_indication: string | null;
  evidence_url: string | null;
  evidence_quote: string | null;
  confidence: number | null;
  source: FieldSource;
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** Vrije context uit het gesprek, bijvoorbeeld "levert 40% van de omzet" (migratie 0079). */
  note: string | null;
  /** Verwijderen is uitzetten, niet wissen (conventie 8, migratie 0079). Null = actief. */
  removed_at: string | null;
  removed_by: string | null;
  /** Wie de knoop voor het laatst wijzigde via de schrijfroute (migratie 0079). */
  updated_by: string | null;
}

/** Herkomst per profielveld (migratie 0039). */
export interface ProfileFieldSource {
  profile_id: string;
  field: string;
  source: FieldSource;
  confidence: number | null;
  evidence_url: string | null;
  evidence_quote: string | null;
  set_by: string | null;
  set_at: string;
  /**
   * Bewust niet van toepassing voor dit merk (migratie 0060). Een merk zonder
   * auteur heeft geen auteursbio, en dat is geen gat. De volledigheidsmeter telt
   * gevuld + n.v.t. als behandeld.
   */
  not_applicable: boolean;
}

export type TopicStatus = "voorgesteld" | "goedgekeurd" | "afgewezen";

/** Een voorgesteld core topic (migratie 0040). */
export interface ProfileTopic {
  id: string;
  profile_id: string;
  title: string;
  rationale: string | null;
  offering_ids: string[];
  /**
   * Dezelfde knopen op NAAM (migratie 0043). Een herhaalronde bouwt de
   * aanbodboom opnieuw op met nieuwe id's; hiermee legt `offering.ts` de
   * koppeling terug.
   */
  offering_names: string[];
  priority: number;
  /**
   * Legacy vrij tekstveld (migratie 0040), vóór de drie clusterlaagvelden
   * hieronder bestonden. Blijft bewaard (conventie 4), overrulet de
   * AI-prioritering net als altijd. `lib/pipeline/topic-brief.ts` valt hierop
   * terug zolang geen van de drie nieuwe velden is ingevuld.
   */
  client_note: string | null;
  /** Clusterlaag (migratie 0075): wat klanten hierover het vaakst vragen. */
  client_questions: string | null;
  /** Clusterlaag (migratie 0075): wat er op dit onderwerp vaak misgaat. */
  client_friction: string | null;
  /** Clusterlaag (migratie 0075): onderscheid met de concurrent op dit onderwerp. */
  client_edge: string | null;
  status: TopicStatus;
  /**
   * concept: voorgesteld vóór het strategisch gesprek, ter voorbereiding,
   * niet te starten. definitief: te goedkeuren en te starten (migratie 0074).
   */
  stage: "concept" | "definitief";
  /**
   * Herkomst op het moment van voorstellen (migratie 0076): aanbod, of aanbod
   * plus het strategisch gesprek. Null voor onderwerpen van vóór 0076.
   */
  origin: "aanbod" | "aanbod_en_gesprek" | null;
  /** Stond er gemeten bewijs in de aanroep die dit onderwerp opleverde (migratie 0077)? */
  origin_uses_measurement: boolean;
  /** Waarom dit onderwerp is afgewezen (migratie 0077), instructie voor een volgende ronde. */
  rejection_reason: string | null;
  analysis_id: string | null;
  /**
   * Zoekvolume 0-100, profielbreed herkalibreerd (docs/tasks/potentiescore.md,
   * migratie 0057). Null tot de eerste herberekening.
   */
  search_volume_index: number | null;
  /** Eén zin van het model erbij, voor de tooltip. */
  search_volume_reasoning: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Wat de pijplijn niet kan waarnemen (migratie 0040). Gestructureerd en niet
 * vrij, omdat elke soort gevolg heeft, zie lib/pipeline/context-factors.ts.
 */
export type ContextFactorKind =
  | "nieuwe_website"
  | "rebranding"
  | "naamswijziging"
  | "nieuwe_dienst"
  | "gestopte_dienst"
  | "nieuwe_regio"
  | "overig";

export interface ContextFactor {
  kind: ContextFactorKind;
  description: string;
  /** ISO-datum, of null als de klant het niet wist. */
  effective_from: string | null;
}

export interface ProfileStrategy {
  profile_id: string;
  strategy_notes: string | null;
  context_factors: ContextFactor[];
  recorded_by: string | null;
  recorded_at: string | null;
  updated_at: string;
}

/** Eén meting uit de LLM-kennisbasislijn (migratie 0041). */
export interface ProfileLlmBaseline {
  id: string;
  profile_id: string;
  engine: EngineId;
  block: "kent" | "klopt" | "citeert" | "verwarring" | "categorie";
  question: string;
  raw_response: string | null;
  verdict_json: unknown | null;
  web_search: boolean;
  model_used: string | null;
  cost_usd: number | null;
  measured_at: string;
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
  /**
   * Waar deze pagina vandaan komt (migratie 0061). Een pagina met bron
   * `handmatig` is door een mens toegevoegd en overleeft een nieuwe crawl;
   * `crawl` wordt bij elke ronde vervangen.
   */
  source: PageSource;
  created_at: string;
}

export type PageSource = "crawl" | "handmatig";

export interface Prompt {
  id: string;
  analysis_id: string;
  text: string;
  category: PromptCategory; // funnelfase: Oriëntatie | Overweging | Beslissing
  intent: string | null; // vrije-tekst job-to-be-done
  active: boolean;
  created_by: PromptOrigin;
  source_raw_json: unknown | null;
  // Fijnere tags (§6 A2), elk een eigen kolom, nullable voor handmatige prompts.
  intent_type: PromptIntentType | null;
  specificity: PromptSpecificity | null;
  purchase_intent: boolean | null;
  cluster: string | null;
  /**
   * Ruwe schatting van het model, 0-100. Blijft staan als audit-trail, dít gaf
   * het model terug, maar weegt en toont niet meer mee (optimalisatie.md 2.6).
   */
  volume_estimate: number | null;
  /** 'hoog' | 'midden' | 'laag', wat er wél weegt en wat de klant ziet. */
  volume_band: VolumeBand | null;
  /** 'geschat' door het model, of 'klant' als hij de band zelf bijstelde. */
  volume_source: VolumeSource;
  /**
   * Levert deze vraag antwoorden op waarin aanbieders genoemd worden
   * (implementatieplan.md R2, migratie 0028)? 'nee' pas na twee metingen zonder
   * enige aanbieder. Dan wordt de vraag bij vervolgperiodes overgeslagen, want
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
   * genoemd werd. Geen gemiste kans, maar een vraag waar niemand de standaard
   * is. Samen tellen ze op tot `judged_runs`.
   */
  winnable_runs: number | null;
  brandless_runs: number | null;
  /**
   * Zichtbaarheidsprofiel (implementatieplan.md R3, migratie 0029). Naast
   * "genoemd, ja of nee": waar in het antwoord sta je (`avg_position`, lager is
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
   * 'concurrent' telt mee in 'Jij vs. Concurrenten' en in share_of_voice, een
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
   * meer of een merk meetelt. Dat doet `entity_role`. Blijft bestaan als
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
   * Hetzelfde profiel als voor het eigen merk (R3, migratie 0029). Zonder deze
   * twee valt er niets te vergelijken: even vaak genoemd maar structureel later
   * in het antwoord is een heel ander verhaal dan even vaak én even prominent.
   */
  avg_position: number | null;
  first_mention_count: number | null;
  /**
   * Hoe vaak deze concurrent zijn EIGEN site als bron zag gebruikt (migratie
   * 0058). Herkend op naam, niet op een opgeslagen domein: `citesOwnSite()`
   * (lib/entities/normalize.ts) normaliseert het geciteerde domein tegen de
   * merknaam. `null` = deze periode is aangemaakt vóór migratie 0058 of nog
   * niet opnieuw geaggregeerd, NIET "geen citaties gevonden" (conventie 3).
   */
  citation_count: number | null;
  /**
   * Waaróm wordt deze concurrent genoemd (implementatieplan.md R4.2, migratie
   * 0030)? `attributes_json` bevat per eigenschap een letterlijk citaat uit de
   * meting als bewijs; `why_summary` is één leesbare zin voor de klant.
   *
   * De eigenschappen zijn de lat voor de contentstap. De NAAM van de concurrent
   * gaat daarbij nooit mee, alleen de eigenschap; klantcontent noemt nooit een
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
  /** Wanneer de mail hierover de deur uit ging, null = nooit (6.7). */
  emailed_at: string | null;
  summary: string | null;
  gaps_json: unknown | null;
  recommendations_json: unknown | null;
  /** [{cluster, problem, reason}] (migratie 0078), gemeten gemissen zonder aanbeveling, met waarom. */
  declined_json: unknown | null;
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
  /** V9, migratie 0093: per gekozen feit wat het voor de lezer betekent. */
  proof_points_json: unknown;
  /** Migratie 0094: de redactionele keuze vóór het schrijven (optimalisatie 5). */
  writer_brief_json: unknown;
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
  /**
   * De bestaande pagina zoals hij was op het moment van plannen (migratie 0083).
   *
   * Vers opgehaald, tot 6000 tekens, in plaats van het op 1500 tekens afgekapte
   * `profile_pages.text_excerpt` uit de laatste crawl. Bewaard omdat het
   * verschilscherm hem nodig heeft en omdat een herschrijfronde een week later
   * niet stilletjes een andere bron mag krijgen.
   */
  existing_page_text: string | null;
  existing_page_fetched_at: string | null;
  /**
   * Een bestaande pagina die dit onderwerp al raakt terwijl dit tóch een NIEUWE
   * pagina is (migratie 0083). Geen tweede `existing_url`: die wordt vervangen,
   * deze moet juist blijven bestaan naast de nieuwe pagina.
   */
  related_url: string | null;
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
   * wat de kwaliteitspoort ook automatisch zet. Zonder deze kolom zijn "de
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
   * die gaf in de praktijktest voor alle drie de pagina's 100, ook voor de
   * pagina met vijf verzonnen feiten.
   */
  claims_json: unknown | null;
  briefing_snapshot_json: unknown | null;
  brief_instruction: string | null;
  source_coverage: number | null;
  /**
   * Het contentcontract en het itemdossier (migratie 0082,
   * docs/tasks/contentpijplijn-herontwerp.md A1/A2/A3/A6).
   *
   * `dossier_json` = wat dit ENE item nodig heeft: de deelvragen van de lezer,
   * de vervolgvragen, en de algemene begrippen met geverifieerde uitleg.
   * `contract_json` = de secties die de pagina moet hebben, met per sectie de
   * deelvraag en de verplichte F-nummers. `coverage_score` = hoeveel procent
   * daarvan de tekst afdekt, bewust los van `geo_score` zodat die reeks
   * vergelijkbaar blijft. `repair_round` = hoeveel gerichte reparatierondes er
   * al geweest zijn.
   */
  dossier_json?: unknown | null;
  contract_json?: unknown | null;
  coverage_score?: number | null;
  repair_round?: number;
  /**
   * Het kwaliteitsraamwerk (migratie 0091,
   * `docs/tasks/contentkwaliteit-framework.md`).
   *
   * `quality_json` = de volledige evaluatie: dimensiescores, alle bevindingen
   * als getypeerde objecten, de blokkades en de root-cause-analyse.
   * `quality_verdict` = `pass`, `repair` of `block`; bewust naast en niet in
   * plaats van `needs_review`, want die boolean staat in zes schermen.
   * `quality_confidence` = hoe zeker de app van dat oordeel is (0-100); daalt
   * zodra een beoordelaar uitvalt, zodat een gevallen keuring niet als
   * goedkeuring leest.
   * `weighted_evidence_coverage` en `critical_evidence_coverage` staan naast
   * `input_coverage`, dat ongewogen is en vergelijkbaar moet blijven.
   *
   * Alle zes optioneel: een pagina van vóór 0091 heeft ze niet, en krijgt geen
   * oordeel dat op ontbrekende data rust (conventie 3).
   */
  quality_json?: unknown | null;
  quality_verdict?: "pass" | "repair" | "block" | null;
  quality_confidence?: number | null;
  weighted_evidence_coverage?: number | null;
  critical_evidence_coverage?: number | null;
  quality_profile?: string | null;
  /** De onderbouwingsgraad vóór het schrijven (migratie 0087). */
  input_coverage?: number | null;
  write_mode?: string | null;
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

/**
 * Eén kwaliteitsbeoordeling van één ronde (migratie 0091).
 *
 * `repair_round` 0 is het eerste concept. De rij bestaat om drie vragen te
 * kunnen beantwoorden die tot nu toe alleen in een ongestructureerde blob
 * stonden: welke versie was de beste, waarom, en werd de pagina van elke ronde
 * beter of slechter.
 */
export interface ContentQualityRun {
  id: string;
  content_piece_id: string;
  analysis_id: string | null;
  repair_round: number;
  quality_profile: string | null;
  score: number | null;
  confidence: number | null;
  verdict: "pass" | "repair" | "block" | null;
  dimensions_json: unknown | null;
  issues_json: unknown | null;
  root_cause_json: unknown | null;
  blocking_count: number;
  issue_count: number;
  /** Is de tekst van DEZE ronde bewaard, of bleef een eerdere versie staan? */
  retained: boolean;
  word_count: number | null;
  cost_usd: number | null;
  created_at: string;
}

/** Hoeveel handmatig werk een pagina nog kost volgens de beoordelaar. */
export type CorrectionEffort = "geen" | "licht" | "zwaar" | "opnieuw";

/**
 * De menselijke beoordeling van een gegenereerde pagina (migratie 0091).
 *
 * Voor de meting bestaat een evaluatieset (`npm run eval:mention`); voor het
 * schrijven bestond niets, en daardoor was elke wijziging aan de
 * schrijfinstructie een gok. Deze rijen zijn de meetlat, en met
 * `benchmark_set` vormen ze een benchmark zonder dat er een aparte structuur
 * naast merk, cluster en pagina hoeft te bestaan.
 */
export interface ContentQualityReview {
  id: string;
  content_piece_id: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  benchmark_set: string | null;
  /** De zes maten uit het raamwerk, elk 1 tot 5. `null` = niet beoordeeld. */
  copywriter_equivalence: number | null;
  company_specificity: number | null;
  /** Hoe generiek de tekst aanvoelt. 1 = heel generiek, 5 = helemaal eigen. */
  generic_ai_feel: number | null;
  persuasiveness: number | null;
  brand_representation: number | null;
  correction_effort: CorrectionEffort | null;
  would_send: boolean | null;
  first_thing_to_change: string | null;
  notes: string | null;
  /** De gouden referentie: hoe een mens deze pagina geschreven zou hebben. */
  reference_markdown: string | null;
  reference_source: string | null;
  created_at: string;
  updated_at: string;
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
  /**
   * De herkomst van de rij (migratie 0024). Optioneel, want de meeste plekken
   * hebben hem niet nodig en lang niet elke rij vult hem. `bron:
   * 'synthese-gap'` markeert een open punt uit de synthese, en dat bepaalt hoe
   * het antwoord wordt opgeslagen (`isGapQuestion()`).
   */
  raw_json?: { bron?: string } | null;
  /**
   * Op welk niveau dit antwoord herbruikbaar is (migratie 0024): merk = elke
   * analyse van deze klant, analyse = dit cluster, pagina = dit ene
   * `content_piece`. Optioneel gelezen: rijen van vóór 0024 hebben de
   * kolomdefault ('analyse'), maar niet elke lezer heeft hem nodig.
   */
  scope?: "merk" | "analyse" | "pagina";
  /** Aan welke pagina('s) deze vraag hangt, naast eventueel `analysis_id`. */
  content_piece_ids?: string[];
  /** De vraagsoort (contentbriefing.md §5), voor groepering in het scherm. */
  kind?: "verificatie" | "aanvulling" | "onderscheid" | "bewijs" | "praktisch" | "grenzen";
  /**
   * Bepaalt het invoerveld in het scherm (migratie 0024, claim-audit.ts).
   * Ontbreekt hij op een oudere rij, dan valt de UI terug op 'tekst_kort'.
   */
  answer_type?: "ja_nee" | "bedrag" | "getal" | "tekst_kort" | "tekst_lang" | "keuze" | "url" | "lijst";
  /** Alleen gevuld bij `answer_type === 'keuze'`. */
  options?: string[];
  /** Concept-antwoord uit bekende data; bevestigen is goedkoper dan formuleren. */
  suggested_answer?: string | null;
  /** Zonder dit antwoord blijft de bewering die de vraag opriep onbewezen. */
  required?: boolean;
  claim_key?: string | null;
  fact_ref?: string | null;
  verify_after?: string | null;
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
 * Geen gegenereerde pagina maar een taak. Zonder status blijft off-site advies
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
 * `analysis_id` en `profile_id` zijn allebei nullable maar nooit allebei leeg,
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

// ════════════════════════════════════════════════════════════════════════════
// Mijn reputatie (migratie 0062, docs/tasks/mijn-reputatie.md)
// ════════════════════════════════════════════════════════════════════════════

/** Hoe diep de analyse kijkt. Bepaalt het aantal knopen en de herhalingen (§2.3). */
export type ReputationDepth = "standaard" | "diep";

/**
 * De stand van een run.
 *
 * ⚠️ `budget_op` staat naast `klaar` en niet in plaats van `mislukt`. Een run die
 * het plafond raakte heeft wél een uitkomst, alleen op minder vragen, en dat
 * verschil hoort de klant te zien. Stil degraderen naar `klaar` zou een cijfer
 * opleveren dat doet alsof er niets aan de hand was.
 */
export type ReputationStatus = "queued" | "running" | "klaar" | "mislukt" | "budget_op";

/**
 * Welk blok uit §4 deze vraag stelde.
 *
 * `markt` en `bewijs` kwamen erbij op 23 augustus 2026, na de eerste echte run.
 * `markt` is de open koperssvraag die concurrenten ontdekt in plaats van ze op
 * te leggen; `bewijs` is de onderzoeksronde die het gedeelde corpus vult waar de
 * dienstvragen zich uit beantwoorden.
 */
export type ReputationBlock =
  | "merk"
  | "aanbod"
  | "vergelijking"
  | "bron"
  | "markt"
  | "bewijs";

/**
 * De vier criteria van de vergelijking (§4.4). Vast en niet vrij: liet je het
 * model zelf criteria bedenken, dan levert elke run andere assen op en is geen
 * enkele herhaling en geen enkele vergelijking tussen twee diensten nog iets
 * waard.
 */
export const REPUTATION_CRITERIA = [
  "dienstverlening",
  "kwaliteit",
  "prijs_kwaliteit",
  "betrouwbaarheid",
] as const;

export type ReputationCriterion = (typeof REPUTATION_CRITERIA)[number];

/** Wat de klant per criterium leest. Nooit de sleutel zelf op het scherm. */
export const CRITERION_LABEL: Record<ReputationCriterion, string> = {
  dienstverlening: "Dienstverlening",
  kwaliteit: "Kwaliteit",
  prijs_kwaliteit: "Prijs-kwaliteitverhouding",
  betrouwbaarheid: "Betrouwbaarheid",
};

/**
 * Het label bij een criterium dat uit de DATABASE komt.
 *
 * ⚠️ Defensief, en niet uit voorzichtigheid maar omdat `wins_on` en `loses_on`
 * `text[]`-kolommen zijn. Alleen onze eigen code vult ze, maar een rij uit een
 * oudere run of een handmatige correctie in Supabase kan er iets anders in
 * zetten, en dan zou een kale opzoeking `undefined` op het scherm van de klant
 * tonen. De sleutel zelf tonen is lelijk maar eerlijk (conventie 3).
 */
export function criterionLabel(value: string): string {
  return (CRITERION_LABEL as Record<string, string>)[value] ?? value;
}

/** Waar het oordeel op rust (§4.7). `geen` haalt het antwoord uit het merkcijfer. */
export type ReputationGrounding =
  | "reviews"
  | "eigen_site"
  | "pers"
  | "sociale_media"
  | "geen"
  | "onbekend";

/** Wat voor bron dit domein is (§4.5, blok C5). */
export type ReputationSourceKind =
  | "review"
  | "vakpers"
  | "eigen"
  | "sociaal"
  | "register"
  | "overig";

/** Eén reputatieanalyse. */
export interface ReputationRun {
  id: string;
  profile_id: string;
  engine: string;
  depth: ReputationDepth;
  status: ReputationStatus;
  started_by: string | null;
  started_at: string;
  finished_at: string | null;
  /** -100 tot 100. ⚠️ null = geen oordeel te vellen. Nul is neutraal en dus iets anders. */
  tone_index: number | null;
  /** 0 tot 100. Nul IS een uitkomst: er ligt geen enkele bron onder. */
  evidence_score: number | null;
  /** 0 tot 100, alleen gevuld bij herhalingen (diepe modus). */
  consistency: number | null;
  /** De verdeling van de toonoordelen. Tien keer gemengd is geen tien keer neutraal. */
  tone_distribution: unknown | null;
  /** 0 tot 100. Hoe verdeeld het beeld is, naast hoe positief het gemiddeld is. */
  tone_spread: number | null;
  /** Standaardfout van de toonindex, in punten. Null bij te weinig herhalingen. */
  tone_stderr: number | null;
  /** Plek in de open marktvraag. ⚠️ null = niet genoemd, geen lage plaats. */
  market_position: number | null;
  market_of: number | null;
  /** Bij welk aandeel van de marktvragen de klant voorkwam, 0 tot 1. */
  market_hit_rate: number | null;
  /** De noemer onder die trefkans: hoeveel marktvragen er bruikbaar waren. */
  market_answers: number | null;
  /** De concurrenten die AI zélf noemde. Betrouwbaarder dan de opgelegde set. */
  market_rivals: string[];
  /** Model plus promptversie. Twee runs met verschillende sleutels zijn niet vergelijkbaar. */
  instrument_version: string | null;
  /** 0 tot 100. null bij minder dan twee bekende partijen: eerste van één is geen uitslag. */
  rank_score: number | null;
  rank_position: number | null;
  rank_of: number | null;
  rank_indicative: boolean;
  rivals: string[];
  wins_on: string[];
  loses_on: string[];
  /** Het gemeten volgorde-effect (§4.4). null = te weinig vergelijkingen ervoor. */
  order_bias: number | null;
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  questions_planned: number;
  questions_done: number;
  cost_usd: number;
  budget_eur: number;
  scope_json: unknown | null;
  notes: string[];
  created_at: string;
}

/** Eén gestelde vraag, met het ruwe antwoord én het oordeel erover. */
export interface ReputationAnswer {
  id: string;
  run_id: string;
  block: ReputationBlock;
  offering_id: string | null;
  question: string;
  web_search: boolean;
  repeat_index: number;
  answer_text: string | null;
  raw_json: unknown | null;
  cited_urls: string[];
  /** De volgorde waarin de partijen de vraag in gingen. Zonder dit geen `order_bias`. */
  party_order: string[];
  /** null = de beoordeling is nog niet gelukt en mag opnieuw, zonder de dure vraag. */
  verdict_json: unknown | null;
  tone: string | null;
  tone_score: number | null;
  pros: string[];
  cons: string[];
  grounding: ReputationGrounding | null;
  mentions_brand: boolean | null;
  model: string | null;
  cost_usd: number;
  created_at: string;
}

/** Eén partij, op één criterium, in één vergelijking. */
export interface ReputationRank {
  id: string;
  run_id: string;
  answer_id: string;
  offering_id: string | null;
  criterion: ReputationCriterion;
  party_name: string;
  entity_id: string | null;
  is_own_brand: boolean;
  /** null als het model de partij niet kende. Niet "laatste". */
  position: number | null;
  /** Hoeveel partijen er in DÍT oordeel meededen, niet in de run. */
  of_parties: number;
  known: boolean;
  reason: string | null;
  sources: string[];
  created_at: string;
}

/** De uitkomst per aanbodknoop. */
export interface ReputationOfferingScore {
  id: string;
  run_id: string;
  offering_id: string | null;
  /** Staat naast `offering_id`: een herhaalonderzoek kan de boom herschrijven. */
  offering_name: string;
  offering_kind: string | null;
  tone_index: number | null;
  evidence_score: number | null;
  answers: number;
  rank_score: number | null;
  rank_position: number | null;
  rank_of: number | null;
  rank_indicative: boolean;
  wins_on: string[];
  loses_on: string[];
  summary: string | null;
  top_pros: string[];
  top_cons: string[];
  source_domains: string[];
  /** Uit de bestaande meting, als die er is. Nul extra kosten. */
  visibility_score: number | null;
  tone_spread: number | null;
  market_position: number | null;
  market_of: number | null;
  market_rivals: string[];
  created_at: string;
}

/** Eén bedrijf dat AI zelf noemde bij de open marktvraag (migratie 0063). */
export interface ReputationMarketRow {
  id: string;
  run_id: string;
  answer_id: string;
  offering_id: string | null;
  party_name: string;
  entity_id: string | null;
  is_own_brand: boolean;
  position: number;
  of_parties: number;
  reason: string | null;
  created_at: string;
}

/** Eén fragment uit het gedeelde bewijscorpus (migratie 0063). */
export interface ReputationEvidenceRow {
  id: string;
  run_id: string;
  query: string;
  url: string | null;
  domain: string | null;
  excerpt: string;
  created_at: string;
}

/** Eén domein dat AI aanhaalde over dit merk. */
export interface ReputationSource {
  id: string;
  run_id: string;
  domain: string;
  kind: ReputationSourceKind;
  citations: number;
  url: string | null;
  rating: number | null;
  rating_count: number | null;
  /** Alleen `true` na controle door de eigen crawler plus JSON-LD (§2.4). */
  verified: boolean;
  first_seen_block: string | null;
  created_at: string;
}
