import "server-only";

/**
 * Voortgang afleiden uit de TAAKSTAND (optimalisatie.md 1.6/1.9/1.10).
 *
 * Voorheen leidde de UI voortgang af uit resultaten ("bestaat er al
 * onderwerp-onderzoek?"). Dat had twee problemen: het werkte alleen als de
 * browser het werk zelf had gestart, en het kon TERUGSPRINGEN: bij een nieuwe
 * poging verdween een afgevinkte stap weer.
 *
 * De taakstand lost allebei op: hij bestaat ook als de klant het scherm nooit
 * opende, en een afgeronde taak blijft afgerond.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobType } from "@/lib/jobs/types";
import type { Job } from "@/lib/types/database";

// Pure opmaak staat apart zodat hij zonder Next-omgeving testbaar is.
export { formatEta } from "@/lib/jobs/format";

type Admin = SupabaseClient;

/**
 * Hoe lang een taaksoort typisch duurt, in seconden. Voor de tijdsindicatie
 * (1.9). Die stond eerder als vaste tekst in de UI ("dit duurt doorgaans een
 * halve minuut") en klopte niet meer zodra het aantal vragen veranderde.
 *
 * Bewust conservatief (aan de hoge kant): een schatting die meevalt is prettig,
 * een die tegenvalt kost vertrouwen.
 */
const TYPICAL_SECONDS: Record<JobType, number> = {
  // Tot 150 pagina's in batches van 8. Geen AI, wel het meeste netwerk van de
  // hele pijplijn, bij een trage site loopt dit richting anderhalve minuut.
  profile_discover: 70,
  profile_research: 50, // sitemap-crawl + AI-onderzoek met web_search
  profile_offering: 45, // één aanroep over de hele sitetekst, geen web_search
  propose_topics: 12, // korte aanroep over alleen de aanbodboom
  profile_market: 35, // één gegrondde aanroep; web_search kost 20-40 s
  profile_llm_baseline: 60, // 6 parallelle aanroepen per engine, deels met web_search
  profile_synthesis: 55, // één aanroep op het premium model
  prepare_analysis: 30, // onderwerp-onderzoek: één gegrondde AI-aanroep
  generate_prompts: 40, // 3 parallelle prompt-calls, elk met een bijvul-ronde
  calibrate_volumes: 15, // één aanroep over alle vragen samen
  measure_prompt: 18, // één vraag stellen met web_search + beoordelen
  aggregate_week: 3, // puur rekenwerk
  profile_competitors: 15, // één destillatie-aanroep over de antwoordfragmenten
  generate_report: 25, // gap-analyse + rapport
  content_brief: 12, // één mini-aanroep voor de hele batch, geen web_search
  content_draft: 50, // het premium model schrijft een volledige pagina
  content_revise: 50,
  technical_audit: 10, // een handvol HTTP-verzoeken, geen AI
  verify_publication: 8, // één pagina ophalen en vergelijken
  measure_impact: 2, // plant alleen taken in
  compute_impact: 3, // puur rekenwerk
  offsite_scan: 40, // gegroundde aanroep + Wikidata/Wikipedia
  gsc_sync: 6, // één HTTP-verzoek naar Google plus een bulk-upsert, geen AI
  recalculate_potential: 15, // één aanroep over een handvol onderwerpen samen

  // ── Mijn reputatie ────────────────────────────────────────────────────────
  reputation_start: 4, // kiest en plant in, geen AI en geen netwerk
  reputation_brand: 55, // vijf parallelle aanroepen, vier met web_search
  reputation_offering: 30, // één gegronde vraag plus de beoordeling
  // ⚠️ De duurste taak van dit onderdeel: een vergelijking zoekt over VIER
  // bedrijven in plaats van één, dus eerder 40 dan 20 seconden per rotatie, en
  // merkbreed zijn dat er drie.
  reputation_compare: 50,
  reputation_sources: 60, // twee gegronde vragen, een indeling, plus zes crawls
  reputation_synthesis: 30, // rekenen is gratis, de tekst kost één aanroep
  // Vier gegronde zoekvragen parallel, plus het opknippen in fragmenten.
  reputation_evidence: 70,
  // Drie gegronde aanbevelingsvragen merkbreed, één per dienst.
  reputation_market: 50,

  // ── De Sales-module ──────────────────────────────────────────────────────
  // Eén gegronde onderzoeksaanroep met web-zoeken over een hele markt: dat is de
  // zwaarste enkele aanroep van de app, want hij zoekt naar tientallen bedrijven
  // in plaats van naar één.
  sales_market_discover: 75,
  // Tot twaalf bronpagina's ophalen. Geen AI, alleen netwerk.
  sales_market_verify: 30,
  // Twee query's en een vergelijking in geheugen.
  sales_market_suppress: 5,
  // Tot 25 pagina's van één site, in batches. Geen AI.
  sales_company_enrich: 20,
};

/**
 * Taken waarvan het mislukken de klant niet raakt, en die dus geen foutmelding
 * op een voortgangsscherm mogen veroorzaken.
 *
 * De volume-kalibratie verfijnt alleen de banden ("vaak gesteld" / "gemiddeld"
 * / "weinig gesteld"); lukt dat niet, dan staat elke vraag op 'midden' en werkt
 * de hele analyse gewoon. De schermen kijken naar het TOTAAL aantal mislukte
 * taken van een analyse, dus zonder deze uitzondering zou zo'n cosmetische
 * misser als "de meting is misgelopen" gemeld worden.
 */
const NON_BLOCKING_TYPES: ReadonlySet<JobType> = new Set<JobType>([
  "calibrate_volumes",
  // De aanbodboom is VERRIJKING, geen voorwaarde (zelfde redenering als
  // competitor_intel bij het rapport). Het profiel staat al op 'klaar' als
  // deze taak begint; mislukt hij, dan mist de klant zijn dienstenoverzicht en
  // de topicvoorstellen, vervelend, maar zijn merk is bruikbaar en elke
  // analyse werkt. Een rood kruis op het voortgangsscherm zou suggereren dat
  // het onderzoek is misgelopen, en dat is niet zo.
  //
  // ⚠️ DIT KLOPTE TOT 19 AUGUSTUS 2026 NIET. De Teamsessie van 18 augustus
  // wees erop dat deze stap zelf de MARKT inplande, en dat de markt de
  // kennistest en de synthese draagt. Mislukte hij definitief, dan verdween de
  // halve onderzoeksketen én zweeg het scherm erover, want de taak telt hier
  // als niet-blokkerend. Het besluit sneuvelde dus op zijn eigen argument.
  // Sinds `lib/jobs/chain.ts` hangt de opvolger niet meer aan het slagen van
  // deze stap, en klopt de onderbouwing hierboven weer.
  "profile_offering",
  // Zelfde redenering: zonder topicvoorstellen typt de klant zijn onderwerp
  // gewoon zelf in, zoals hij dat altijd deed.
  "propose_topics",
  // Ook verrijking: zonder kennisbasislijn mist de klant het antwoord op "wat
  // weet ChatGPT al over mij", maar zijn profiel en al zijn analyses werken.
  "profile_llm_baseline",
  // Verrijking, zelfde afspraak als competitor_intel bij het rapport: zonder
  // dit houdt de klant zijn concurrentenlijst, alleen zonder het "waarom".
  "profile_market",
  // De synthese is de laatste verrijking: valt hij weg, dan mist de klant zijn
  // samenvattende dossier maar staan alle facetten er nog, elk met een eigen
  // samenvatting.
  "profile_synthesis",
  // Zoekcijfers zijn een bewijsstuk náást de AI-meting, geen voorwaarde ervoor
  // (besluit 4). Lukt het ophalen niet, dan mist de klant zijn kliklijn en staat
  // de reden op zijn merkdossier; zijn analyses en zijn contentplan werken
  // gewoon door. Een rood kruis op het voortgangsscherm zou het tegendeel
  // suggereren.
  "gsc_sync",
  // De zoekvolume-index is verrijking op het rapport, geen voorwaarde: mislukt
  // de herberekening, dan blijft het rapport gewoon staan en toont het scherm
  // "nog niet te bepalen" bij het zoekvolume, precies zoals vóór de eerste
  // geslaagde herberekening.
  "recalculate_potential",
  // ── Mijn reputatie ────────────────────────────────────────────────────────
  //
  // Een reputatierun draagt zijn eigen status (`reputation_runs.status`) en
  // heeft zijn eigen scherm; daar staat wat er misging en wat er wél gemeten is.
  // Deze taken hangen wel aan een merk, dus zonder deze uitzondering zou één
  // mislukte dienstvraag als een rood kruis op het MERKSCHERM verschijnen, en
  // dan lijkt het alsof de onboarding is misgelopen terwijl er niets aan de hand
  // is met het merk.
  //
  // ⚠️ `reputation_synthesis` staat er bewust NIET bij. Mislukt die definitief,
  // dan blijft de run op 'running' staan zonder cijfer, en dat is precies het
  // geval waarin een foutmelding hoort te verschijnen.
  //
  // ⚠️ `reputation_start` staat er wél bij, en dat is de regel die op 19 augustus
  // 2026 bij `profile_offering` sneuvelde: een stap die iets DRAAGT mag niet
  // stil mislukken, en deze stap plant alle andere in. Hier is dat wél veilig,
  // maar alleen dankzij `scheduleFollowUpAfterFailure()`: die zet bij een
  // definitieve mislukking alsnog de synthese klaar, die vindt nul antwoorden,
  // en de run eindigt op 'mislukt' met de reden erbij op zijn eigen scherm. De
  // klant blijft dus niet in het ongewisse; alleen het MERKSCHERM zwijgt
  // erover, en daar hoort het ook niet.
  "reputation_start",
  "reputation_brand",
  "reputation_offering",
  "reputation_compare",
  "reputation_sources",
  "reputation_market",
  // ⚠️ `reputation_evidence` staat er bewust NIET bij. Mislukt die, dan hebben
  // alle dienstvragen geen corpus en vallen ze terug op zelf zoeken; dat werkt
  // nog wel maar het is duurder en de diensten worden onderling onvergelijkbaar.
  // Dat hoort zichtbaar te zijn.
]);

/**
 * Hoeveel lichte taken de werker gelijktijdig afwerkt. Moet overeenkomen met
 * CLAIM_BATCH in lib/jobs/worker.ts. Anders liegt de tijdsindicatie.
 */
const PARALLELISM = 5;

/** De cron draait elke minuut; werk dat nu binnenkomt start hooguit zo laat. */
const SCHEDULING_LAG_SECONDS = 60;

export interface JobProgress {
  /** Openstaand werk (in de rij of nu bezig). */
  pending: number;
  /** Nu daadwerkelijk bezig. */
  running: number;
  /** Definitief mislukt na alle pogingen. */
  failed: number;
  /** Staat er een nieuwe poging gepland na een tegenslag? */
  retrying: boolean;
  /**
   * Hoeveelste poging loopt er nu (E, "pogingen tonen")? 0 zolang niets een
   * eerdere tegenslag had. Het hoogste aantal onder de openstaande taken: een
   * klant die naar één voortgangsscherm kijkt met meerdere taken erachter wil
   * weten hoe ver de meest problematische ervan is, niet het gemiddelde.
   */
  attempts: number;
  /** Verwachte resterende tijd in seconden, null als er niets openstaat. */
  etaSeconds: number | null;
  /** Aantal openstaande taken per soort, voor een fijnere stappenweergave. */
  pendingByType: Partial<Record<JobType, number>>;
}

const EMPTY: JobProgress = {
  pending: 0,
  running: 0,
  failed: 0,
  retrying: false,
  attempts: 0,
  etaSeconds: null,
  pendingByType: {},
};

function summarize(jobs: Job[]): JobProgress {
  if (jobs.length === 0) return EMPTY;

  const open = jobs.filter((j) => j.status === "queued" || j.status === "running");
  const failed = jobs.filter(
    (j) => j.status === "failed" && !NON_BLOCKING_TYPES.has(j.type as JobType),
  );

  const pendingByType: Partial<Record<JobType, number>> = {};
  let workSeconds = 0;
  for (const j of open) {
    const type = j.type as JobType;
    pendingByType[type] = (pendingByType[type] ?? 0) + 1;
    workSeconds += TYPICAL_SECONDS[type] ?? 30;
  }

  // Een taak met een geplande starttijd in de toekomst wacht op een nieuwe
  // poging na een tegenslag. Dat is geen stilstand maar wél extra wachttijd,
  // dus die telt mee in de schatting.
  const now = Date.now();
  const soonest = open
    .map((j) => new Date(j.scheduled_for).getTime())
    .filter((t) => t > now)
    .sort((a, b) => a - b)[0];
  const retryWait = soonest ? Math.round((soonest - now) / 1000) : 0;

  return {
    pending: open.length,
    running: open.filter((j) => j.status === "running").length,
    failed: failed.length,
    retrying: retryWait > 0,
    attempts: open.reduce((max, j) => Math.max(max, j.attempts ?? 0), 0),
    etaSeconds:
      open.length === 0
        ? null
        : Math.round(workSeconds / PARALLELISM) + SCHEDULING_LAG_SECONDS + retryWait,
    pendingByType,
  };
}

/** Taakvoortgang van één analyse. Vereist de service-role client (jobs is deny-all). */
export async function analysisProgress(admin: Admin, analysisId: string): Promise<JobProgress> {
  const { data } = await admin
    .from("jobs")
    .select("id, type, status, scheduled_for, attempts")
    .eq("analysis_id", analysisId)
    .in("status", ["queued", "running", "failed"]);
  return summarize((data ?? []) as Job[]);
}

/** Taakvoortgang van één klantprofiel. */
export async function profileProgress(admin: Admin, profileId: string): Promise<JobProgress> {
  const { data } = await admin
    .from("jobs")
    .select("id, type, status, scheduled_for, attempts")
    .eq("profile_id", profileId)
    .in("status", ["queued", "running", "failed"]);
  return summarize((data ?? []) as Job[]);
}
