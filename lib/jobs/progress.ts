import "server-only";

/**
 * Voortgang afleiden uit de TAAKSTAND (optimalisatie.md 1.6/1.9/1.10).
 *
 * Voorheen leidde de UI voortgang af uit resultaten ("bestaat er al
 * onderwerp-onderzoek?"). Dat had twee problemen: het werkte alleen als de
 * browser het werk zelf had gestart, en het kon TERUGSPRINGEN — bij een nieuwe
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
 * (1.9) — die stond eerder als vaste tekst in de UI ("dit duurt doorgaans een
 * halve minuut") en klopte niet meer zodra het aantal vragen veranderde.
 *
 * Bewust conservatief (aan de hoge kant): een schatting die meevalt is prettig,
 * een die tegenvalt kost vertrouwen.
 */
const TYPICAL_SECONDS: Record<JobType, number> = {
  profile_research: 50, // sitemap-crawl + AI-onderzoek met web_search
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
const NON_BLOCKING_TYPES: ReadonlySet<JobType> = new Set<JobType>(["calibrate_volumes"]);

/**
 * Hoeveel lichte taken de werker gelijktijdig afwerkt. Moet overeenkomen met
 * CLAIM_BATCH in lib/jobs/worker.ts — anders liegt de tijdsindicatie.
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
  /** Verwachte resterende tijd in seconden — null als er niets openstaat. */
  etaSeconds: number | null;
  /** Aantal openstaande taken per soort, voor een fijnere stappenweergave. */
  pendingByType: Partial<Record<JobType, number>>;
}

const EMPTY: JobProgress = {
  pending: 0,
  running: 0,
  failed: 0,
  retrying: false,
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
    .select("id, type, status, scheduled_for")
    .eq("analysis_id", analysisId)
    .in("status", ["queued", "running", "failed"]);
  return summarize((data ?? []) as Job[]);
}

/** Taakvoortgang van één klantprofiel. */
export async function profileProgress(admin: Admin, profileId: string): Promise<JobProgress> {
  const { data } = await admin
    .from("jobs")
    .select("id, type, status, scheduled_for")
    .eq("profile_id", profileId)
    .in("status", ["queued", "running", "failed"]);
  return summarize((data ?? []) as Job[]);
}
