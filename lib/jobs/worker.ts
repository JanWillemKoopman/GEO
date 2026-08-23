import "server-only";

/**
 * De werker: claimt taken, voert ze uit, en regelt nieuwe pogingen
 * (optimalisatie.md 1.1/1.2).
 *
 * Wordt elke minuut door een cron aangeroepen. Draait binnen de tijdslimiet van
 * één route-aanroep, dus hij werkt met een TIJDBUDGET: zolang er tijd over is
 * pakt hij een volgende taak, en anders stopt hij netjes, de volgende aanroep
 * gaat verder. Zo is er geen enkele taak die "te lang" kan zijn voor het systeem
 * als geheel, alleen taken die te lang zijn voor één aanroep (en die bestaan
 * niet meer sinds meting per prompt en content in twee stappen gaan).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { runJob, scheduleFollowUpAfterFailure } from "@/lib/jobs/handlers";
import {
  HEAVY_JOB_TYPES,
  IO_BOUND_HEAVY_TYPES,
  IO_BOUND_PARALLELISM,
  MAX_ATTEMPTS,
  backoffMinutes,
  type JobType,
} from "@/lib/jobs/types";
import { workerTimeBudgetMs } from "@/lib/config";
import { describeError } from "@/lib/errors";
import type { Job } from "@/lib/types/database";

/**
 * Hoeveel wandkloktijd de werker zichzelf gunt. Instelbaar omdat de tijdslimiet
 * per platform en abonnement verschilt, zie workerTimeBudgetMs in lib/config.ts.
 * Ruim onder de limiet van de route blijven: een taak die als 'running' blijft
 * staan omdat het platform de functie afkapte, wordt pas door de reaper
 * teruggezet.
 */
const TIME_BUDGET_MS = workerTimeBudgetMs;

/**
 * Hoeveel tijd we vrijhouden voordat we aan een ZWARE taak beginnen.
 *
 * De vorige regel hier keek naar de helft van het tijdbudget. Dat werkte zolang
 * elke taak binnen een halve minuut klaar was, maar niet meer nu contentgeneratie
 * twee aanroepen van maximaal honderd seconden doet: die kon starten met te
 * weinig routetijd over en werd dan alsnog middenin afgekapt.
 *
 * Nu expliciet: alleen beginnen als de traagste zware taak er nog volledig in
 * past. Twee AI-aanroepen van 100s (de clienttimeout, lib/openai/client.ts) plus
 * marge voor het opslaan.
 */
const HEAVY_JOB_RESERVE_MS = 220_000;

/**
 * Hoeveel tijd we vrijhouden voordat we aan een GROEP netwerkgebonden zware
 * taken beginnen.
 *
 * Veel krapper dan de reservering hierboven, want deze taken bestaan uit korte
 * aanroepen. Het merkblok doet vijf gegronde vragen parallel van elk 20 tot 40
 * seconden; negentig seconden is daarvoor ruim. Loopt zo'n taak toch over het
 * budget, dan kost dat hooguit dat de laatste vraag opnieuw gesteld wordt, en de
 * idempotentie vangt af dat de rest niet dubbel betaald wordt.
 *
 * Dat is precies het verschil met contentgeneratie: daar kost een afgebroken
 * aanroep het duurste model twee keer, hier kost hij één goedkope vraag.
 */
const IO_BOUND_RESERVE_MS = 90_000;

/**
 * Hoeveel tijd er nog moet zijn voordat we een NIEUWE ronde taken claimen.
 *
 * Hier zat het gat dat de 504's op /api/cron/worker veroorzaakte. De zware
 * taken hadden een reservering, de lichte niet: de lus keek alleen of het budget
 * nog niet op wás, niet of het volgende werk er nog in past. Een ronde van vijf
 * metingen die op t = 239s geclaimd werd, liep dus door tot ver voorbij de 300
 * seconden die het platform de route geeft, en werd hard afgekapt, met vijf
 * taken die op 'running' bleven staan tot de reaper ze vijf minuten later
 * terugzette.
 *
 * 115 seconden = het totale budget van één AI-aanroep (CALL_BUDGET_MS, 105s in
 * lib/openai/client.ts) plus marge om de uitkomst nog weg te schrijven.
 */
const LIGHT_JOB_RESERVE_MS = 115_000;

/**
 * Hoeveel taken we per ronde claimen. Lichte taken (een meting is vooral
 * wachten op een netwerkantwoord) draaien PARALLEL binnen zo'n ronde. Anders
 * zou één werker met een budget van 40s per minuut maar ~3 vragen aankunnen en
 * duurde een meting van 30 vragen meer dan tien minuten. Met parallelle
 * uitvoering is dat een paar minuten.
 *
 * Vijf tegelijk is ruim onder wat de meting vóór deze fase deed (alle prompts
 * tegelijk), dus rate-limits zijn geen zorg, en de OpenAI-client vangt een
 * incidentele 429 zelf al op.
 */
const CLAIM_BATCH = 5;

/**
 * Na hoeveel minuten geldt een 'running' taak als vastgelopen?
 *
 * De route waarin de werker draait wordt door het platform na 60 seconden
 * afgekapt (`maxDuration` in app/api/cron/worker/route.ts). Een taak die daarna
 * nog steeds op 'running' staat, drááít dus niet meer. Die hoort bij een
 * aanroep die halverwege is doodgeslagen. Vijf minuten is ruim een factor vijf
 * boven die harde grens (veilig), maar half zo lang als de tien minuten die
 * hier eerst stonden: zo lang staat de klant naar een voortgangsscherm te
 * kijken waarachter niets meer gebeurt.
 */
const STUCK_AFTER_MINUTES = 5;

/**
 * Taken waarvan het definitief mislukken betekent dat de ANALYSE (of het
 * profiel) mislukt is. Contentgeneratie hoort daar bewust niet bij: die draait
 * ná het rapport en raakt de analysestatus niet. De technische audit evenmin:
 * een site die net plat lag mag niet het hele profiel op 'mislukt' zetten. Dan
 * is de klant zijn onderzoek kwijt om een controle die hooguit een waarschuwing
 * had opgeleverd.
 */
const BLOCKING_JOB_TYPES: ReadonlySet<JobType> = new Set<JobType>([
  "profile_research",
  "prepare_analysis",
  "generate_prompts",
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

  // E, "logging bij reclaim": een teruggevorderde taak betekent dat een vorige
  // werker-aanroep het niet afmaakte, platform-timeout, crash, of een taak die
  // langer duurde dan STUCK_AFTER_MINUTES. `out.reclaimed` werd al jaren
  // geteld maar nergens gelogd, dus dit soort incident was alleen zichtbaar
  // als de klant zelf een vastgelopen scherm meldde. Een teller kwam nooit
  // ergens uit.
  if (out.reclaimed > 0) {
    console.warn(
      `${out.reclaimed} taak/taken teruggevorderd van een eerdere, kennelijk vastgelopen werker-aanroep ` +
        `(ouder dan ${STUCK_AFTER_MINUTES} minuten in 'running').`,
    );
  }

  // Claim alleen zolang de traagste taak die we terug kunnen krijgen er nog
  // helemaal in past, zie LIGHT_JOB_RESERVE_MS. De eerste ronde mag altijd:
  // anders zou een werker met een krap ingesteld budget nooit iets doen.
  let eersteRonde = true;
  while (eersteRonde || Date.now() - startedAt + LIGHT_JOB_RESERVE_MS <= TIME_BUDGET_MS) {
    eersteRonde = false;
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

    // ── Netwerkgebonden zware taken mogen samen ──────────────────────────
    //
    // ⚠️ Zie IO_BOUND_HEAVY_TYPES in lib/jobs/types.ts voor het waarom. Kort: de
    // reservering hieronder is gemaakt voor contentgeneratie, één lange aanroep
    // die je niet halverwege kunt afbreken. Werk dat uit korte aanroepen bestaat
    // en op het netwerk wacht, hoeft die reservering niet, en met die regel
    // erop deed een reputatierun exact één taak per minuut en duurde hij 31
    // minuten in plaats van 9.
    //
    // De tijdcontrole blijft wél gelden, alleen op de GROEP: er moet genoeg tijd
    // zijn voor één zo'n taak, en dan draaien er hooguit drie tegelijk.
    const ioBound = heavy.filter((j) => IO_BOUND_HEAVY_TYPES.has(j.type as JobType));
    const langlopend = heavy.filter((j) => !IO_BOUND_HEAVY_TYPES.has(j.type as JobType));

    for (let i = 0; i < ioBound.length; i += IO_BOUND_PARALLELISM) {
      const groep = ioBound.slice(i, i + IO_BOUND_PARALLELISM);
      if (Date.now() - startedAt + IO_BOUND_RESERVE_MS > TIME_BUDGET_MS && out.processed > 0) {
        for (const job of groep) await releaseJob(admin, job);
        continue;
      }
      // `allSettled` en niet `all`: één mislukte taak in de groep mag de andere
      // twee niet meenemen. `processJob` vangt zelf al af en markeert, dus een
      // afwijzing hier is een bug en geen normaal pad, maar hem laten
      // doorslaan zou de hele werker-aanroep laten falen.
      await Promise.allSettled(groep.map((job) => processJob(admin, job, out)));
      if (Date.now() - startedAt >= TIME_BUDGET_MS) break;
    }

    // Zware taken één voor één, en alleen als er nog genoeg tijd is. Anders
    // teruggelegd: half beginnen aan een pagina die het premium model moet schrijven is
    // duur en levert niets op.
    for (const job of langlopend) {
      // Past deze taak nog volledig binnen het budget? Zo niet: terugleggen. De
      // uitzondering is een lege ronde. Dan is dit de eerste taak van deze
      // aanroep en heeft hij de volle tijd, dus dan altijd beginnen. Zonder die
      // uitzondering zou een taak die langer duurt dan het budget nóóit starten.
      if (Date.now() - startedAt + HEAVY_JOB_RESERVE_MS > TIME_BUDGET_MS && out.processed > 0) {
        await releaseJob(admin, job);
        continue;
      }
      await processJob(admin, job, out);
      if (Date.now() - startedAt >= TIME_BUDGET_MS) break;
    }
  }

  return out;
}

/**
 * Is het merk of de analyse van deze taak gearchiveerd?
 *
 * Faalt zacht naar `false`: kunnen we het niet vaststellen, dan draait de taak
 * gewoon. Dat is de kant waarop deze controle hoort te falen, want het
 * alternatief is een wachtrij die stilvalt omdat één query hapert. Het ergste
 * geval hier is dat er één ronde te veel draait voor een merk dat uit beeld is;
 * het ergste geval andersom is dat er niets meer gebeurt voor iedereen.
 */
async function isArchived(
  admin: ReturnType<typeof createAdminClient>,
  job: Job,
): Promise<boolean> {
  try {
    if (job.analysis_id) {
      const { data } = await admin
        .from("analyses")
        .select("archived_at")
        .eq("id", job.analysis_id)
        .maybeSingle();
      if (data?.archived_at) return true;
    }
    if (job.profile_id) {
      const { data } = await admin
        .from("profiles")
        .select("archived_at")
        .eq("id", job.profile_id)
        .maybeSingle();
      if (data?.archived_at) return true;
    }
    return false;
  } catch (err) {
    console.error(`Archiefcontrole mislukt voor taak ${job.id}, taak draait door:`, err);
    return false;
  }
}

/**
 * Vinkt een gelukte taak af, en geeft niet op na één poging.
 *
 * ── WAAROM DIT DE DUURSTE STILLE FOUT VAN DE HELE APP WAS ───────────────────
 *
 * ⚠️ Gevonden op 12 augustus 2026 in de stille-fout-ronde (F5). Het afvinken
 * stond er als een kale `await` zonder foutcontrole. Mislukt die ene update, dan
 * blijft de taak op `running` staan, pakt `reclaim_stuck_jobs` hem later terug,
 * en wordt het werk OPNIEUW gedaan. Bij een meting is dat dertig betaalde
 * web-zoekacties voor een uitkomst die er al was.
 *
 * ── WAAROM HET NIET GOOIT ───────────────────────────────────────────────────
 *
 * Het werk is op dat moment al gelukt. Een fout gooien zou hem in `handleFailure`
 * laten belanden, die hem als mislukt markeert en opnieuw inplant, en dan
 * betalen we precies wat we wilden voorkomen. De juiste reactie is de
 * BOEKHOUDING opnieuw proberen, niet het werk.
 *
 * Lukt het na drie pogingen nog niet, dan blijft er niets anders over dan hard
 * loggen: de wachtrij zal hem terugpakken en het werk overdoen, en dan hoort er
 * tenminste een regel te staan die uitlegt waarom er twee keer betaald is.
 */
async function markDone(admin: ReturnType<typeof createAdminClient>, job: Job): Promise<void> {
  for (let poging = 1; poging <= 3; poging++) {
    const { error } = await admin
      .from("jobs")
      .update({ status: "done", finished_at: new Date().toISOString(), last_error: null })
      .eq("id", job.id);
    if (!error) return;

    if (poging === 3) {
      console.error(
        `⚠️ Taak ${job.type} (${job.id}) is GELUKT maar kon na 3 pogingen niet op 'done' gezet ` +
          `worden: ${error.message}. De wachtrij pakt hem terug en doet het werk opnieuw, dus dit ` +
          `wordt dubbel betaald.`,
      );
      return;
    }
    // Korte oplopende pauze: een tijdelijke hapering is meestal binnen een
    // seconde over, en langer wachten kost de werker zijn tijdslimiet.
    await new Promise((r) => setTimeout(r, poging * 200));
  }
}

/** Voert één geclaimde taak uit en werkt de tellers bij. Gooit nooit. */
async function processJob(
  admin: ReturnType<typeof createAdminClient>,
  job: Job,
  out: WorkerResult,
): Promise<void> {
  out.processed++;
  try {
    // ⚠️ Archiveren gebeurt met SQL en niet met een knop, dus dit is geen fout
    // die een klant kan uitlokken. Maar zonder deze controle loopt een merk dat
    // net uit beeld is gehaald zijn hele wachtrij nog leeg, en dat is betaald
    // werk waarvan de uitkomst nergens meer te zien is. De maandronde filtert
    // gearchiveerde analyses al; de taken die er op dat moment al stonden niet.
    if (await isArchived(admin, job)) {
      await markDone(admin, job);
      out.succeeded++;
      out.results.push({ id: job.id, type: job.type, ok: true });
      console.log(
        `Taak ${job.type} (${job.id}) overgeslagen: het merk of de analyse is gearchiveerd.`,
      );
      return;
    }

    await runJob({ admin, job });
    await markDone(admin, job);
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

/**
 * Een definitief mislukte schrijftaak zichtbaar maken in het contentplan (fase 4).
 *
 * ⚠️ Dit staat bewust NAAST `markOwnerFailed`, dat alleen taken meeneemt die de
 * analyse zelf blokkeren. Een mislukte contentpagina laat de analyse met rust,
 * maar in het plan is hij wél het enige dat telt: zonder deze regel blijft de
 * pagina op "ORBIT ENGINE is bezig" staan terwijl er niets meer gebeurt, en dat is de
 * ergste van alle statussen, want hij vraagt om geduld dat nergens toe leidt.
 */
async function markPlannedPageFailed(
  admin: ReturnType<typeof createAdminClient>,
  job: Job,
): Promise<void> {
  const payload = job.payload_json as { plannedPageId?: string } | null;
  const pageId = payload?.plannedPageId;
  if (!pageId) return;

  try {
    await admin
      .from("planned_pages")
      .update({ status: "mislukt" })
      .eq("id", pageId)
      .in("status", ["gepland", "schrijven"]);
  } catch (err) {
    console.error(`Plan-pagina ${pageId} op 'mislukt' zetten faalde:`, err);
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
 *
 * Geëxporteerd omdat de ketentest hem rechtstreeks aanroept: wat er bij een
 * DEFINITIEVE mislukking gebeurt (de analyse op 'mislukt', de plan-pagina op
 * 'mislukt', het vervolg alsnog inplannen) is samenhang tussen drie tabellen, en
 * die is niet te bereiken via `runWorker()` zonder vier echte pogingen te doen.
 */
export async function handleFailure(
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
    await markPlannedPageFailed(admin, job);

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
 * Pas als een taak DEFINITIEF mislukt is, ziet de klant 'mislukt', niet bij de
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
  // vervelend, maar de analyse blijft gewoon 'gereed'. Die op 'mislukt' zetten
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
