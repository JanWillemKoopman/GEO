import "server-only";

/**
 * De werker: claimt taken, voert ze uit, en regelt nieuwe pogingen
 * (optimalisatie.md 1.1/1.2).
 *
 * Wordt elke minuut door een cron aangeroepen. Draait binnen de tijdslimiet van
 * één route-aanroep, dus hij werkt met een TIJDBUDGET: zolang er tijd over is
 * pakt hij een volgende taak, en anders stopt hij netjes — de volgende aanroep
 * gaat verder. Zo is er geen enkele taak die "te lang" kan zijn voor het systeem
 * als geheel, alleen taken die te lang zijn voor één aanroep (en die bestaan
 * niet meer sinds meting per prompt en content in twee stappen gaan).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { runJob, scheduleFollowUpAfterFailure } from "@/lib/jobs/handlers";
import { HEAVY_JOB_TYPES, MAX_ATTEMPTS, backoffMinutes, type JobType } from "@/lib/jobs/types";
import { workerTimeBudgetMs } from "@/lib/config";
import { describeError } from "@/lib/errors";
import type { Job } from "@/lib/types/database";

/**
 * Hoeveel wandkloktijd de werker zichzelf gunt. Instelbaar omdat de tijdslimiet
 * per platform en abonnement verschilt — zie workerTimeBudgetMs in lib/config.ts.
 * Ruim onder de limiet van de route blijven: een taak die als 'running' blijft
 * staan omdat het platform de functie afkapte, wordt pas tien minuten later
 * door de reaper teruggezet.
 */
const TIME_BUDGET_MS = workerTimeBudgetMs;

/**
 * Hoeveel taken we per ronde claimen. Lichte taken (een meting is vooral
 * wachten op een netwerkantwoord) draaien PARALLEL binnen zo'n ronde — anders
 * zou één werker met een budget van 40s per minuut maar ~3 vragen aankunnen en
 * duurde een meting van 30 vragen meer dan tien minuten. Met parallelle
 * uitvoering is dat een paar minuten.
 *
 * Vijf tegelijk is ruim onder wat de meting vóór deze fase deed (alle prompts
 * tegelijk), dus rate-limits zijn geen zorg — en de OpenAI-client vangt een
 * incidentele 429 zelf al op.
 */
const CLAIM_BATCH = 5;

/**
 * Na hoeveel minuten geldt een 'running' taak als vastgelopen? Ruim boven de
 * langste taak (een profielonderzoek met crawl + web_search), zodat we nooit
 * iets terugzetten dat nog gewoon draait.
 */
const STUCK_AFTER_MINUTES = 10;

/**
 * Taken waarvan het definitief mislukken betekent dat de ANALYSE (of het
 * profiel) mislukt is. Contentgeneratie hoort daar bewust niet bij: die draait
 * ná het rapport en raakt de analysestatus niet. De technische audit evenmin:
 * een site die net plat lag mag niet het hele profiel op 'mislukt' zetten — dan
 * is de klant zijn onderzoek kwijt om een controle die hooguit een waarschuwing
 * had opgeleverd.
 */
const BLOCKING_JOB_TYPES: ReadonlySet<JobType> = new Set<JobType>([
  "profile_research",
  "prepare_analysis",
  "aggregate_week",
  "generate_report",
]);

export interface WorkerResult {
  reclaimed: number;
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
  results: { id: string; type: string; ok: boolean; error?: string }[];
}

export async function runWorker(): Promise<WorkerResult> {
  const admin = createAdminClient();
  const startedAt = Date.now();
  const out: WorkerResult = {
    reclaimed: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
    results: [],
  };

  // Eerst opruimen: taken van een afgebroken vorige werker terug in de rij.
  const { data: reclaimed } = await admin.rpc("reclaim_stuck_jobs", {
    p_older_than_minutes: STUCK_AFTER_MINUTES,
  });
  out.reclaimed = typeof reclaimed === "number" ? reclaimed : 0;

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const { data: claimed, error } = await admin.rpc("claim_jobs", { p_limit: CLAIM_BATCH });
    if (error) throw new Error(`Taken claimen mislukt: ${error.message}`);

    const jobs = (claimed ?? []) as Job[];
    if (jobs.length === 0) break; // niets te doen

    const heavy = jobs.filter((j) => HEAVY_JOB_TYPES.has(j.type as JobType));
    const light = jobs.filter((j) => !HEAVY_JOB_TYPES.has(j.type as JobType));

    // Lichte taken tegelijk: ze zijn I/O-gebonden en onafhankelijk.
    if (light.length > 0) {
      await Promise.all(light.map((job) => processJob(admin, job, out)));
    }

    // Zware taken één voor één, en alleen als er nog genoeg tijd is. Anders
    // teruggelegd: half beginnen aan een pagina die gpt-4.1 moet schrijven is
    // duur en levert niets op.
    for (const job of heavy) {
      if (Date.now() - startedAt > TIME_BUDGET_MS / 2 && out.processed > 0) {
        await releaseJob(admin, job);
        continue;
      }
      await processJob(admin, job, out);
      if (Date.now() - startedAt >= TIME_BUDGET_MS) break;
    }
  }

  return out;
}

/** Voert één geclaimde taak uit en werkt de tellers bij. Gooit nooit. */
async function processJob(
  admin: ReturnType<typeof createAdminClient>,
  job: Job,
  out: WorkerResult,
): Promise<void> {
  out.processed++;
  try {
    await runJob({ admin, job });
    await admin
      .from("jobs")
      .update({ status: "done", finished_at: new Date().toISOString(), last_error: null })
      .eq("id", job.id);
    out.succeeded++;
    out.results.push({ id: job.id, type: job.type, ok: true });
  } catch (err) {
    const detail = describeError(err);
    const retried = await handleFailure(admin, job, detail);
    if (retried) out.retried++;
    else out.failed++;
    out.results.push({ id: job.id, type: job.type, ok: false, error: detail });
    console.error(`Taak ${job.type} (${job.id}) mislukt, poging ${job.attempts}: ${detail}`);
  }
}

/** Zet een geclaimde taak terug zonder een poging te verbruiken. */
async function releaseJob(admin: ReturnType<typeof createAdminClient>, job: Job): Promise<void> {
  await admin
    .from("jobs")
    .update({
      status: "queued",
      // De claim heeft `attempts` al opgehoogd; dat draaien we terug, want er is
      // niets geprobeerd. Anders zou een drukke werker het pogingenbudget
      // opsouperen zonder ooit werk te doen.
      attempts: Math.max(0, job.attempts - 1),
      started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

/**
 * Bepaalt of een mislukte taak opnieuw geprobeerd wordt (optimalisatie.md 1.2).
 * Geeft true terug als er een nieuwe poging is ingepland.
 */
async function handleFailure(
  admin: ReturnType<typeof createAdminClient>,
  job: Job,
  detail: string,
): Promise<boolean> {
  // `attempts` is bij het claimen al opgehoogd, dus dit is het aantal pogingen
  // dat DAADWERKELIJK gedaan is.
  if (job.attempts >= MAX_ATTEMPTS) {
    await admin
      .from("jobs")
      .update({ status: "failed", finished_at: new Date().toISOString(), last_error: detail })
      .eq("id", job.id);
    await markOwnerFailed(admin, job);

    // Opgeven is óók een uitkomst waar de keten mee verder moet. Was dit de
    // laatste openstaande meting, dan moet de aggregatie alsnog starten: die
    // beslist zelf of er genoeg gemeten is (de 70%-drempel). Zonder deze regel
    // blijft een analyse eeuwig op 'meten' staan omdat één vraag het niet deed.
    // Best-effort: een fout hier mag de foutafhandeling zelf niet omvergooien.
    try {
      await scheduleFollowUpAfterFailure(admin, job);
    } catch (err) {
      console.error(`Vervolg inplannen na definitief mislukte taak ${job.id} faalde:`, err);
    }
    return false;
  }

  const nextAt = new Date(Date.now() + backoffMinutes(job.attempts) * 60_000);
  await admin
    .from("jobs")
    .update({
      status: "queued",
      scheduled_for: nextAt.toISOString(),
      started_at: null,
      last_error: detail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  return true;
}

/**
 * Pas als een taak DEFINITIEF mislukt is, ziet de klant 'mislukt' — niet bij de
 * eerste tegenslag. Dat is het hele punt van de wachtrij: tijdelijke storingen
 * worden onzichtbaar afgehandeld.
 *
 * De pijplijnfuncties zetten die status zelf al bij een harde fout; dit is het
 * vangnet voor het geval een taak op een andere manier stukloopt.
 */
async function markOwnerFailed(
  admin: ReturnType<typeof createAdminClient>,
  job: Job,
): Promise<void> {
  // Alleen taken die de analyse zélf blokkeren. Een mislukte contentpagina is
  // vervelend, maar de analyse blijft gewoon 'gereed' — die op 'mislukt' zetten
  // zou de klant z'n rapport en score afpakken om een pagina die niet lukte.
  if (!BLOCKING_JOB_TYPES.has(job.type as JobType)) return;

  try {
    if (job.analysis_id) {
      await admin.from("analyses").update({ status: "mislukt" }).eq("id", job.analysis_id);
    } else if (job.profile_id) {
      await admin.from("profiles").update({ status: "mislukt" }).eq("id", job.profile_id);
    }
  } catch (err) {
    console.error(`Status op 'mislukt' zetten faalde voor taak ${job.id}:`, err);
  }
}
