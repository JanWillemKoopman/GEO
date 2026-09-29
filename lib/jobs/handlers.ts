import "server-only";

/**
 * Wat elke taaksoort doet (optimalisatie.md 1.3), plus de KETENING: een handler
 * plant zelf het vervolg in (1.5).
 *
 * Dat laatste is de kern van deze fase. Voorheen startte de BROWSER het rapport
 * nadat de meting klaar was, sloot de klant de tab, dan gebeurde er niets meer.
 * Nu loopt de keten op de server:
 *
 *   prepare_analysis → generate_prompts → (wacht op goedkeuring van de klant)
 *   measure_prompt ×N → aggregate_week → generate_report → mail
 *   pagina_brief → pagina_schrijven → pagina_controle → pagina_herschrijven
 *   (docs/tasks/contentketen-opnieuw.md, vanaf WP5)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { nextInChain } from "@/lib/jobs/chain";
import { prepareProfile } from "@/lib/pipeline/prepare-profile";
import { discoverSite } from "@/lib/pipeline/discover";
import { runLightScanTick, MAX_LIGHT_SCAN_ROUNDS } from "@/lib/pipeline/light-scan";
import { buildOfferingTree } from "@/lib/pipeline/offering";
import { proposeTopics } from "@/lib/pipeline/propose-topics";
import { researchMarket } from "@/lib/pipeline/market";
import { runLlmBaseline } from "@/lib/pipeline/llm-baseline";
import { synthesiseProfile } from "@/lib/pipeline/synthesis";
import {
  prepareTopicResearch,
  generateAnalysisPrompts,
  finishPromptGeneration,
  calibratePromptVolumes,
} from "@/lib/pipeline/prepare";
import {
  measurePromptById,
  computeAggregates,
  measurementIsUsable,
} from "@/lib/pipeline/measure";
import { generateReport } from "@/lib/pipeline/report";
import { profileCompetitors } from "@/lib/pipeline/competitor-intel";
import { deelKennisIn } from "@/lib/kennis/indelen";
import { runAuditForProfile } from "@/lib/audit/store";
import { planImpactMeasurements, computeImpact } from "@/lib/pipeline/impact";
import { verifyPublication } from "@/lib/pipeline/publish";
import { runOffsiteScan } from "@/lib/offsite/scan";
import { syncSearchConsole } from "@/lib/search-console/sync";
import { legZoekverkeerBewijsVast } from "@/lib/kansen/uit-search-console";
import { recalibrateSearchVolume } from "@/lib/pipeline/search-demand";
import { startReputationRun } from "@/lib/pipeline/reputation-start";
import { runBrandBlock } from "@/lib/pipeline/reputation-brand";
import { runOfferingBlock } from "@/lib/pipeline/reputation-offering";
import { runCompareBlock } from "@/lib/pipeline/reputation-compare";
import { runSourcesBlock } from "@/lib/pipeline/reputation-sources";
import { runSynthesis } from "@/lib/pipeline/reputation-synthesis";
import { runMarketBlock } from "@/lib/pipeline/reputation-market";
import { runEvidenceBlock } from "@/lib/pipeline/reputation-evidence";
import { availableEngineIds } from "@/lib/engines/registry";
import { refreshInventory } from "@/lib/pipeline/refresh-inventory";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { verwerkGebeurtenis } from "@/lib/gebeurtenissen/verwerken";
// Registreert zichzelf bij het register (G3, G4); alleen om die bijwerking geïmporteerd.
import "@/lib/gebeurtenissen/abonnees/kennis-wijziging-impact";
import "@/lib/gebeurtenissen/abonnees/onderzoek-refresh";
import {
  voerBriefUit,
  briefGafOp,
  voerSchrijvenUit,
  schrijvenGafOp,
  voerControleUit,
  controleGafOp,
  voerHerschrijvenUit,
  herschrijvenGafOp,
} from "@/lib/pagina/taken";
import { countOpenPeriodicMeasurements } from "@/lib/jobs/pending";
import { measureAiOverviewById } from "@/lib/pipeline/measure-ai-overview";
import { measureLlmResponseById } from "@/lib/pipeline/measure-llm-response";
import type {
  JobType,
  JobPayloads,
  RecommendationPayload,
} from "@/lib/jobs/types";
import { MAX_ATTEMPTS } from "@/lib/jobs/types";
import { describeError } from "@/lib/errors";
import type { Job } from "@/lib/types/database";
import { requireCount } from "@/lib/require-count";
import { resolveMix } from "@/lib/prompt-mix";
import { PROMPT_CATEGORIES } from "@/lib/types/database";
import {
  discoveryBundle,
  discoveryCollect,
  discoveryExpand,
  discoverySift,
  markeerRondeMislukt,
} from "@/lib/pipeline/cluster-discovery";

type Admin = SupabaseClient;

export interface JobContext {
  admin: Admin;
  job: Job;
}

type Handler<T extends JobType> = (
  ctx: JobContext,
  payload: JobPayloads[T],
) => Promise<void>;

/**
 * Zijn alle meettaken voor deze analyse/week klaar? Zo ja, dan mag de aggregatie
 * ingepland worden.
 *
 * Twee werkers kunnen hier tegelijk "ja" concluderen. Dat is niet erg: de
 * dedupe-sleutel op de aggregatietaak zorgt dat er hoe dan ook maar één ontstaat
 * (de tweede insert botst op de unieke index en wordt stil genegeerd).
 */
async function scheduleAggregateIfLastPrompt(
  admin: Admin,
  analysisId: string,
  weekNo: number,
  currentJobId: string,
): Promise<void> {
  const { data: openJobs } = await admin
    .from("jobs")
    .select("id, payload_json, type")
    .eq("analysis_id", analysisId)
    // ⚠️ Alle drie de meetsoorten (20 september 2026). De kansen in het rapport
    // komen uit een meerderheidsregel over álle bronnen van een vraag
    // (`computeMissedPrompts`), dus een ronde is pas klaar als alle bronnen
    // binnen zijn. Zie lib/jobs/pending.ts voor waarom dat het oude bezwaar
    // ("laat een trage bron de analyse niet laten hangen") overleeft.
    .in("type", ["measure_prompt", "measure_ai_overview", "measure_llm_response"])
    .in("status", ["queued", "running"])
    // De taak die dit aanroept staat zélf nog op 'running'. Zonder deze
    // uitsluiting is `remaining` altijd minstens 1 en wordt de aggregatie
    // nooit ingepland.
    .neq("id", currentJobId);

  // De filtering op periode gebeurt hier en niet met `.contains()` in de query,
  // omdat een impactmeting óók `weekNo: 0` meedraagt, zie de toelichting in
  // lib/jobs/pending.ts, waar deze voorwaarde als testbare functie staat.
  if (countOpenPeriodicMeasurements(openJobs ?? [], weekNo) > 0) return;

  await enqueue(admin, {
    type: "aggregate_week",
    payload: { weekNo },
    analysisId,
    dedupeKey: dedupe.aggregateWeek(analysisId, weekNo),
  });
}

/**
 * Was dit de laatste reputatietaak? Zo ja, dan mag de synthese draaien (§7).
 *
 * ── DEZELFDE CONSTRUCTIE ALS `scheduleAggregateIfLastPrompt()` ──────────────
 *
 * En met dezelfde valkuil, die daar één keer ingelopen is: de taak die dit
 * aanroept staat ZÉLF nog op 'running'. Zonder de uitsluiting op `currentJobId`
 * is het aantal openstaande taken altijd minstens één en wordt de synthese nooit
 * ingepland. De run blijft dan eeuwig op 'running' staan, met een
 * voortgangsscherm dat nooit verder komt.
 *
 * ── WAAROM DIT OP TAKEN TELT EN NIET OP ANTWOORDEN ─────────────────────────
 *
 * `reputation_runs.questions_planned` zegt hoeveel antwoorden er zouden komen,
 * en dat is het getal dat op het scherm staat. Maar een taak kan legitiem NUL
 * antwoorden opleveren: de budgetpoort slaat hem over, of de aanbodknoop is
 * intussen verdwenen. Zou de afteller op antwoorden tellen, dan komt hij in
 * precies die gevallen nooit op nul uit en blijft de run open, terwijl er niets
 * meer gaat gebeuren.
 *
 * Taken tellen kent dat probleem niet: een overgeslagen taak is nog steeds een
 * taak die klaar is. Vandaar dat de budgetpoort de status wél op `budget_op`
 * zet maar de taak gewoon laat slagen; de synthese draait daarna over wat er
 * wél gemeten is, en het scherm zegt wat er ontbreekt.
 */
const REPUTATION_STEPS: JobType[] = [
  "reputation_start",
  "reputation_evidence",
  "reputation_brand",
  "reputation_offering",
  "reputation_compare",
  "reputation_sources",
  "reputation_market",
];

async function scheduleSynthesisIfLast(
  admin: Admin,
  runId: string,
  currentJobId: string,
): Promise<void> {
  const { data: openJobs } = await admin
    .from("jobs")
    .select("id, payload_json")
    .in("type", REPUTATION_STEPS)
    .in("status", ["queued", "running"])
    .neq("id", currentJobId);

  // Filteren op de run gebeurt hier en niet met `.contains()` in de query: de
  // payloads verschillen per taaksoort en `contains` op jsonb zou per soort een
  // andere vorm nodig hebben. De lijst openstaande taken is klein genoeg om in
  // code te filteren.
  const nogOpen = ((openJobs ?? []) as { payload_json: unknown }[]).filter(
    (j) => (j.payload_json as { runId?: string } | null)?.runId === runId,
  );
  if (nogOpen.length > 0) return;

  await enqueue(admin, {
    type: "reputation_synthesis",
    payload: { runId },
    // Het merk staat op de run; de taak zelf hangt er via de payload aan.
    profileId: await profileOfRun(admin, runId),
    // Eén sleutel per run: er kunnen dus nooit twee synthesetaken ontstaan, ook
    // niet als twee taken tegelijk als laatste eindigen.
    dedupeKey: dedupe.reputationSynthesis(runId),
  });
}

async function profileOfRun(admin: Admin, runId: string): Promise<string | null> {
  const { data } = await admin
    .from("reputation_runs")
    .select("profile_id")
    .eq("id", runId)
    .maybeSingle();
  return (data?.profile_id as string | null) ?? null;
}

/**
 * Zijn alle hermetingen van deze golf klaar? Zo ja, dan mag het effect berekend
 * worden (optimalisatie.md 5.4).
 *
 * Zelfde patroon als bij de aggregatie, inclusief dezelfde valkuil: de taak die
 * dit aanroept staat zélf nog op 'running' en moet uitgesloten worden, anders
 * wordt de berekening nooit ingepland.
 */
async function scheduleImpactIfLastRun(
  admin: Admin,
  analysisId: string,
  impact: { contentPieceId: string; wave: number },
  currentJobId: string,
): Promise<void> {
  // ⚠️ Faalt deze telling, dan mag hij géén nul worden: dan zou de
  // effectmeting worden afgerond terwijl er nog metingen lopen, en dat levert
  // een impactcijfer op dat de klant te zien krijgt en dat niet klopt.
  //
  // Beide bronnen (M3, `van-pijplijn-naar-kennissysteem.md`): sinds AI Overview
  // ook een golf meet, telt een openstaande `measure_ai_overview`-taak net zo
  // goed mee als een openstaande `measure_prompt`-taak. Anders rekent
  // `computeImpact()` af terwijl de Google-metingen van deze golf nog lopen.
  const remaining = requireCount(
    await admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .in("type", ["measure_prompt", "measure_ai_overview"])
      .in("status", ["queued", "running"])
      .contains("payload_json", {
        impact: { contentPieceId: impact.contentPieceId, wave: impact.wave },
      })
      .neq("id", currentJobId),
    "de nog lopende metingen van deze effectmeting",
  );

  if (remaining > 0) return;

  await enqueue(admin, {
    type: "compute_impact",
    payload: { contentPieceId: impact.contentPieceId, wave: impact.wave },
    analysisId,
    dedupeKey: dedupe.computeImpact(impact.contentPieceId, impact.wave),
  });
}

/**
 * Hoeveel aanvulrondes een trage site hooguit krijgt. Vier rondes op
 * "langzaam" zijn samen ruim tien minuten lezen, genoeg voor de ~70 pagina's van
 * de hovenier uit de kwaliteitsdoorlichting (4 tot 10 seconden per pagina).
 */
const MAX_AANVULRONDES = 4;

const handlers: { [T in JobType]: Handler<T> } = {
  // ── Profielonderzoek ──────────────────────────────────────────────────────
  /**
   * Vooronderzoek (migratie 0102): één ronde van de lichte titel+meta-scan.
   * Plant zichzelf met een hogere ronde opnieuw in als er nog kandidaten open
   * staan, tot `MAX_LIGHT_SCAN_ROUNDS` rondes; daarna (of zodra alles gescand
   * is) gaat het verder naar `profile_discover`, die de opgebouwde signalen
   * leest (`lib/pipeline/discover.ts`).
   */
  profile_light_scan: async ({ admin, job }, payload) => {
    if (!job.profile_id) throw new Error("profile_light_scan zonder profile_id.");
    const round = payload.round ?? 0;
    const { done } = await runLightScanTick(job.profile_id);

    if (done || round >= MAX_LIGHT_SCAN_ROUNDS - 1) {
      await enqueue(admin, {
        type: "profile_discover",
        payload: {},
        profileId: job.profile_id,
        dedupeKey: dedupe.profileDiscover(job.profile_id),
      });
      return;
    }

    await enqueue(admin, {
      type: "profile_light_scan",
      payload: { round: round + 1 },
      profileId: job.profile_id,
      dedupeKey: dedupe.profileLightScan(job.profile_id, round + 1),
    });
  },

  // ── Fase 0: ontdekken. Nul AI-kosten, en het fundament onder al het
  // volgende (docs/tasks/onboarding-2.0.md blok B).
  profile_discover: async ({ admin, job }) => {
    if (!job.profile_id) throw new Error("profile_discover zonder profile_id.");
    const ontdekt = await discoverSite(job.profile_id);

    // Een trage site: de pagina's die niet op tijd kwamen, alsnog rustig lezen
    // in de achtergrond (punt 4 van de kwaliteitsdoorlichting). Aanvullen en
    // niet vervangen, één pagina tegelijk.
    if (ontdekt.traagNietGelezen > 0) {
      await enqueue(admin, {
        type: "crawl_inventory",
        payload: { mode: "meer", maxPages: ontdekt.traagNietGelezen, speed: "langzaam", aanvulronde: 1 },
        profileId: job.profile_id,
        dedupeKey: `${dedupe.crawlInventory(job.profile_id)}:aanvul1`,
      });
    }

    // Het onderzoek volgt hier pas ná, en niet parallel zoals voorheen. Dat is
    // het hele punt: `prepare-profile.ts` startte de inventaris naast de
    // AI-aanroep en sloeg hem pas erna op, waardoor die 60 pagina's het
    // onderzoek nooit in kwamen. Nu staan ze er al als het onderzoek begint.
    await enqueue(admin, {
      type: "profile_research",
      payload: {},
      profileId: job.profile_id,
      dedupeKey: dedupe.profileResearch(job.profile_id),
    });

    // De technische audit hoort hier en niet parallel aan de crawl: hij leest de
    // naamvarianten, de schema-dekking en de renderbaarheid die fase 0 zojuist
    // heeft vastgesteld. Een lichte taak, dus hij loopt gewoon naast het
    // onderzoek mee in dezelfde werker-aanroep.
    await enqueue(admin, {
      type: "technical_audit",
      payload: {},
      profileId: job.profile_id,
      dedupeKey: dedupe.technicalAudit(job.profile_id),
    });
  },

  profile_research: async ({ admin, job }) => {
    if (!job.profile_id) throw new Error("profile_research zonder profile_id.");
    await prepareProfile(job.profile_id);

    // Het aanbod erachteraan: dat leunt op `business_model`, dat hierboven pas
    // gezet wordt. Een eigen taak omdat het een tweede zware aanroep is over
    // dezelfde 55.000 tekens, samen passen ze niet in één werker-aanroep.
    await enqueue(admin, {
      type: "profile_offering",
      payload: {},
      profileId: job.profile_id,
      dedupeKey: dedupe.profileOffering(job.profile_id),
    });
  },

  profile_offering: async ({ admin, job }, payload) => {
    if (!job.profile_id) throw new Error("profile_offering zonder profile_id.");
    const { nodes } = await buildOfferingTree(job.profile_id);

    // Het marktonderzoek draagt de rest van de keten: het ketent zelf door naar
    // de kennistest, die op zijn beurt naar de synthese ketent. Bewust NIET
    // achter de topics gehangen. Die vallen weg zonder aanbodboom, en dan zou
    // de hele staart verdwijnen bij precies de klanten waar de crawl weinig
    // opleverde. En dat zijn er niet weinig.
    //
    // ⚠️ Welke stap dat is, staat sinds 19 augustus 2026 in `lib/jobs/chain.ts`
    // en niet meer hier. Reden: dezelfde tabel wordt gebruikt als deze stap
    // DEFINITIEF MISLUKT, en zonder dat kapte een mislukte aanbodstap de halve
    // onderzoeksketen af zonder één foutmelding (hij telt als niet-blokkerend).
    if (payload.chain !== false) {
      await enqueueNext(admin, "profile_offering", job.profile_id);
    }

    // Geen boom, geen topics. Voorstellen op basis van alleen een branchenaam
    // levert generieke onderwerpen op die precies niet over deze klant gaan.
    if (nodes === 0) return;

    await enqueue(admin, {
      type: "propose_topics",
      payload: {},
      profileId: job.profile_id,
      dedupeKey: dedupe.proposeTopics(job.profile_id),
    });
  },

  propose_topics: async ({ job }) => {
    if (!job.profile_id) throw new Error("propose_topics zonder profile_id.");
    await proposeTopics(job.profile_id);
  },

  profile_market: async ({ admin, job }, payload) => {
    if (!job.profile_id) throw new Error("profile_market zonder profile_id.");

    // Verrijking, geen voorwaarde (zelfde patroon als profile_competitors bij
    // het rapport): de fout wordt gelogd, maar de keten loopt door. Zou hij hier
    // breken, dan zou een mislukt marktonderzoek ook de kennistest en de
    // synthese meenemen, en dat zijn de twee stappen waar de klant voor komt.
    try {
      await researchMarket(job.profile_id);
    } catch (err) {
      console.error(
        `Marktonderzoek mislukt voor profiel ${job.profile_id}:`,
        err,
      );
    }

    // De kennistest is de duurste stap (~$0,30) en staat daarom laat: is het
    // budget op, dan hoort hij als eerste te sneuvelen. De volgorde ís de
    // prioritering.
    if (payload.chain !== false) {
      await enqueueNext(admin, "profile_market", job.profile_id);
    }
  },

  profile_llm_baseline: async ({ admin, job }, payload) => {
    if (!job.profile_id)
      throw new Error("profile_llm_baseline zonder profile_id.");
    await runLlmBaseline(job.profile_id);

    // De synthese sluit de keten. Als laatste omdat hij op het dure model
    // draait: is het budget op, dan valt hij als eerste terug of weg.
    if (payload.chain !== false) {
      await enqueueNext(admin, "profile_llm_baseline", job.profile_id);
    }
  },

  profile_synthesis: async ({ job }) => {
    if (!job.profile_id)
      throw new Error("profile_synthesis zonder profile_id.");
    await synthesiseProfile(job.profile_id);
  },

  // ── Voorbereiding stap 1: onderwerp-onderzoek ─────────────────────────────
  // Bewust los van de promptgeneratie: samen passen ze niet binnen de zestig
  // seconden van één werker-aanroep (zie de toelichting in lib/pipeline/prepare.ts).
  prepare_analysis: async ({ admin, job }) => {
    if (!job.analysis_id)
      throw new Error("prepare_analysis zonder analysis_id.");
    const { needsPrompts } = await prepareTopicResearch(job.analysis_id);
    if (!needsPrompts) return;

    // ⚠️ Eén taak PER FUNNELFASE sinds 12 augustus 2026. De gezamenlijke taak
    // liep op productie één keer 228 seconden van de 300 die hij heeft, en met
    // de verdeling per analyse instelbaar (migratie 0054) kan het aantal vragen
    // omhoog. Fasen met nul vragen krijgen geen taak: dat is een geldige keuze
    // en geen werk.
    const { data: analyseRij } = await admin
      .from("analyses")
      .select("prompts_orientatie, prompts_overweging, prompts_beslissing")
      .eq("id", job.analysis_id)
      .maybeSingle();
    const mix = resolveMix(analyseRij);

    for (const fase of PROMPT_CATEGORIES) {
      if (mix[fase] === 0) continue;
      await enqueue(admin, {
        type: "generate_prompts",
        payload: { category: fase },
        analysisId: job.analysis_id,
        dedupeKey: dedupe.generatePrompts(job.analysis_id, fase),
      });
    }
  },

  // ── Voorbereiding stap 2: de vragen opstellen ─────────────────────────────
  // Hierna wacht de analyse op goedkeuring van de klant (de review-gate); dat
  // is een bewuste stop. De kalibratie die nog volgt is een verfijning van de
  // volumebanden en houdt de klant niet tegen.
  generate_prompts: async ({ admin, job }, payload) => {
    if (!job.analysis_id)
      throw new Error("generate_prompts zonder analysis_id.");
    if (!payload.category)
      throw new Error("generate_prompts zonder funnelfase.");

    await generateAnalysisPrompts(job.analysis_id, payload.category, payload.regenerate);

    // ⚠️ Alleen de LAATSTE fase opent de poort. Deze taak weet niet of hij de
    // laatste is, de wachtrij wel: tel hoeveel fasetaken er nog openstaan voor
    // deze analyse, deze taak zelf niet meegerekend (die staat op dit moment nog
    // op 'running'). Dezelfde vorm als `scheduleImpactIfLastRun`.
    //
    // `requireCount` en niet `?? 0`: gaat deze telling stuk en wordt hij nul,
    // dan gaat de analyse naar 'concept_klaar' terwijl er nog twee fasen aan het
    // genereren zijn, en ziet de klant een derde van zijn vragen.
    const openstaand = requireCount(
      await admin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("analysis_id", job.analysis_id)
        .eq("type", "generate_prompts")
        .in("status", ["queued", "running"])
        .neq("id", job.id),
      "de nog lopende funnelfasen van deze analyse",
    );
    if (openstaand > 0) return;

    await finishPromptGeneration(job.analysis_id);

    await enqueue(admin, {
      type: "calibrate_volumes",
      payload: {},
      analysisId: job.analysis_id,
      dedupeKey: dedupe.calibrateVolumes(job.analysis_id),
    });
  },

  // ── Nabewerking: zoekvolume relatief kalibreren ───────────────────────────
  calibrate_volumes: async ({ job }) => {
    if (!job.analysis_id)
      throw new Error("calibrate_volumes zonder analysis_id.");
    await calibratePromptVolumes(job.analysis_id);
  },

  // ── Eén vraag meten via Google AI Overview ────────────────────────────────
  //
  // ⚠️ Deze taak ketent WÉL naar de aggregatie, net als `measure_prompt`. Dat
  // is geen symmetrie om de symmetrie: de kansen die de klant te zien krijgt
  // komen uit `computeMissedPrompts()`, dat per VRAAG telt met een
  // meerderheidsregel over álle metingen van die vraag. Een vraag die bij
  // ChatGPT gemist wordt en bij Google drie keer raak is, is dus geen gemiste
  // kans. Dat werkt alleen als beide bronnen binnen zijn vóór het rapport.
  //
  // `scheduleAggregateIfLastPrompt()` plant de aggregatie hooguit één keer in
  // (de dedupe-sleutel is de periode), dus negentig taken die allemaal "ben ik
  // de laatste?" vragen leveren één aggregatie op, geen negentig.
  measure_ai_overview: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("measure_ai_overview zonder analysis_id.");
    const uitkomst = await measureAiOverviewById(
      job.analysis_id,
      payload.promptId,
      payload.weekNo,
      payload.repeatIndex ?? 0,
      payload.impact,
    );
    // Een vraag zonder AI-overzicht is geen fout maar wel iets om te kunnen
    // terugzien: bij ongeveer één vraag op de tien gebeurt dit, en als dat
    // aandeel plots oploopt is dat een signaal over Google, niet over het merk.
    if (!uitkomst.gemeten) console.log(uitkomst.melding);

    // Een hermeting ná publicatie (M3) hoort bij een pagina, niet bij een
    // periode: zelfde tak als bij `measure_prompt`, en om dezelfde reden mag
    // hij de zichtbaarheidsscore niet raken.
    if (payload.impact) {
      await scheduleImpactIfLastRun(admin, job.analysis_id, payload.impact, job.id);
      return;
    }

    // ⚠️ Ook déze taak kan de laatste van de ronde zijn. Zou alleen
    // `measure_prompt` de aggregatie aansturen, dan blijft een ronde waarvan de
    // Google-metingen als laatste binnenkomen voorgoed op 'meten' staan.
    await scheduleAggregateIfLastPrompt(admin, job.analysis_id, payload.weekNo, job.id);
  },

  // ── Eén vraag meten via Gemini (DataForSEO) ───────────────────────────────
  //
  // Zelfde reden als bij `measure_ai_overview`: ketent naar de aggregatie, want
  // de kansen wachten op alle bronnen (hoofdstuk 5 van
  // docs/tasks/vier-meetbronnen-en-ai-zoekvolume.md).
  measure_llm_response: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("measure_llm_response zonder analysis_id.");
    const uitkomst = await measureLlmResponseById(
      job.analysis_id,
      payload.promptId,
      payload.weekNo,
      payload.repeatIndex ?? 0,
    );
    // Een leeg antwoord is geen fout maar wel iets om te kunnen terugzien.
    if (!uitkomst.gemeten) console.log(uitkomst.melding);

    await scheduleAggregateIfLastPrompt(admin, job.analysis_id, payload.weekNo, job.id);
  },

  // ── Eén vraag meten (3a + 3b) ─────────────────────────────────────────────
  measure_prompt: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("measure_prompt zonder analysis_id.");
    await measurePromptById(
      job.analysis_id,
      payload.promptId,
      payload.weekNo,
      payload.impact,
      payload.repeatIndex ?? 0,
      payload.engine ?? "openai",
    );

    // Een hermeting ná publicatie (optimalisatie.md 5.3) hoort bij een pagina,
    // niet bij een periode: hij ketent naar de effectberekening en NIET naar de
    // aggregatie, want hij mag de zichtbaarheidsscore niet raken.
    if (payload.impact) {
      await scheduleImpactIfLastRun(
        admin,
        job.analysis_id,
        payload.impact,
        job.id,
      );
      return;
    }
    await scheduleAggregateIfLastPrompt(
      admin,
      job.analysis_id,
      payload.weekNo,
      job.id,
    );
  },

  // ── Aggregatie (3c) — geen AI-aanroep ─────────────────────────────────────
  aggregate_week: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("aggregate_week zonder analysis_id.");
    const analysisId = job.analysis_id;
    const { weekNo } = payload;

    // Drempelcontrole (optimalisatie.md 0.4b) staat nu hier: de aggregatie is
    // het eerste moment waarop het volledige beeld bekend is.
    const { usable, measured, expected } = await measurementIsUsable(
      admin,
      analysisId,
      weekNo,
    );
    if (!usable) {
      if (weekNo === 0)
        await admin
          .from("analyses")
          .update({ status: "mislukt" })
          .eq("id", analysisId);
      throw new Error(
        `Te weinig vragen gemeten om een score op te baseren: ${measured} van ${expected}.`,
      );
    }
    if (measured < expected) {
      console.warn(
        `Analyse ${analysisId} week ${weekNo}: ${measured} van ${expected} vragen gemeten; ` +
          `score wordt op dat deel gebaseerd.`,
      );
    }

    await computeAggregates(admin, analysisId, weekNo);

    // De nulmeting brengt de analyse naar 'gemeten'; latere periodes laten de
    // status op 'gereed' staan. Beide ketenen door naar een rapport
    // (optimalisatie.md 6.1), voorheen alleen periode 0, waardoor er twaalf
    // periodes aan meetkosten gemaakt werden voor data die niemand ooit zag.
    if (weekNo === 0) {
      await admin
        .from("analyses")
        .update({ status: "gemeten" })
        .eq("id", analysisId);
    }

    // Eerst de concurrenten profileren (R4.2), dán pas het rapport: B1/B2
    // gebruiken de gedestilleerde eigenschappen om te kunnen zeggen WAAROP de
    // klant verliest, niet alleen dát hij verliest.
    await enqueue(admin, {
      type: "profile_competitors",
      payload: { weekNo },
      analysisId,
      dedupeKey: dedupe.competitorIntel(analysisId, weekNo),
    });
  },

  // ── Waarom winnen die concurrenten? (R4.2) ────────────────────────────────
  // Verrijking, geen voorwaarde: mislukt dit, dan houdt de klant zijn cijfers en
  // zijn rapport, alleen zonder de "waarom"-laag. Vandaar dat de fout hier
  // gevangen wordt en de keten hoe dan ook doorloopt naar het rapport.
  profile_competitors: async ({ admin, job }, payload) => {
    if (!job.analysis_id)
      throw new Error("profile_competitors zonder analysis_id.");
    const analysisId = job.analysis_id;

    try {
      const { profiled } = await profileCompetitors(
        admin,
        analysisId,
        payload.weekNo,
      );
      console.log(
        `Analyse ${analysisId} periode ${payload.weekNo}: ${profiled} concurrenten geprofileerd.`,
      );
    } catch (err) {
      console.error(
        `Concurrenten profileren mislukt voor analyse ${analysisId}:`,
        err,
      );
    }

    await enqueue(admin, {
      type: "generate_report",
      payload: { weekNo: payload.weekNo },
      analysisId,
      dedupeKey: dedupe.generateReport(analysisId, payload.weekNo),
    });
  },

  // ── Rapport (B1 + B2) + mail ──────────────────────────────────────────────
  generate_report: async ({ job }, payload) => {
    if (!job.analysis_id)
      throw new Error("generate_report zonder analysis_id.");
    await generateReport(job.analysis_id, payload.weekNo);
  },

  // ── Sitefeiten indelen in de kennislaag (WP2, sinds K8 deel 2) ────────────
  // De naam `fact_register` bleef: de wachtrij en de taaklijsten kennen hem.
  fact_register: async ({ admin, job }) => {
    if (!job.profile_id) throw new Error("fact_register zonder profile_id.");
    await deelKennisIn(admin, job.profile_id);
  },

  // ── De contentketen (docs/tasks/contentketen-opnieuw.md §7.4) ────────────
  pagina_brief: async ({ admin }, payload) => {
    await voerBriefUit(admin, payload);
  },
  pagina_schrijven: async ({ admin, job }, payload) => {
    await voerSchrijvenUit(admin, job, payload);
  },
  pagina_controle: async ({ admin }, payload) => {
    await voerControleUit(admin, payload);
  },
  pagina_herschrijven: async ({ admin, job }, payload) => {
    await voerHerschrijvenUit(admin, job, payload);
  },

  // ── Technische GEO-audit (optimalisatie.md 3B) ────────────────────────────
  // Geen AI-aanroep, alleen HTTP-verzoeken. Draait bij het aanmaken van een
  // profiel en daarna bij elke maandelijkse meting (3.8): een blokkade kan er
  // morgen zijn na een aanpassing door de webbouwer.
  technical_audit: async ({ admin, job }) => {
    if (!job.profile_id) throw new Error("technical_audit zonder profile_id.");
    await runAuditForProfile(admin, job.profile_id);
  },

  // ── Publicatie controleren (optimalisatie.md 5.2) ─────────────────────────
  // Geen AI-aanroep: één pagina ophalen en de tekst vergelijken. Vindt hij niets,
  // dan is dat geen mislukking van de taak maar een bevinding voor de klant.
  verify_publication: async ({ admin, job }, payload) => {
    if (!job.analysis_id)
      throw new Error("verify_publication zonder analysis_id.");
    await verifyPublication(admin, payload.contentPieceId);
  },

  // ── Eén golf hermetingen plannen (5.3) ────────────────────────────────────
  measure_impact: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("measure_impact zonder analysis_id.");
    const { planned } = await planImpactMeasurements(admin, {
      analysisId: job.analysis_id,
      contentPieceId: payload.contentPieceId,
      wave: payload.wave,
    });

    // Niets in te plannen (alles al gemeten, of geen doelvragen)? Dan meteen
    // doorrekenen. Anders blijft de golf eeuwig "bezig" zonder dat er ooit een
    // meettaak is die de berekening aftrapt.
    if (planned === 0) {
      await enqueue(admin, {
        type: "compute_impact",
        payload: { contentPieceId: payload.contentPieceId, wave: payload.wave },
        analysisId: job.analysis_id,
        dedupeKey: dedupe.computeImpact(payload.contentPieceId, payload.wave),
      });
    }
  },

  // ── Off-site scan (optimalisatie.md fase 7) ───────────────────────────────
  // Draait ná het rapport: dan is er meetdata om het landschap uit af te
  // leiden. Geen blokkerende taak, faalt hij, dan mist de klant het off-site
  // advies maar houdt hij zijn rapport.
  offsite_scan: async ({ admin, job }) => {
    if (!job.analysis_id) throw new Error("offsite_scan zonder analysis_id.");
    await runOffsiteScan(admin, job.analysis_id);
  },

  // ── Zoekcijfers ophalen bij Google (fase 5, migratie 0052) ────────────────
  //
  // ⚠️ Gooit bewust NIET bij een fout van Google. De reden staat vastgelegd op
  // het profiel (`gsc_last_error`) en het scherm toont hem; de taak opnieuw
  // laten proberen helpt niet als de klant ons adres nog moet toevoegen, en na
  // vier pogingen zou het merk in het CSM-paneel onder "Vastgelopen" belanden
  // voor iets wat aan de kant van de klant ligt.
  gsc_sync: async ({ admin, job }) => {
    if (!job.profile_id) throw new Error("gsc_sync zonder profile_id.");
    const result = await syncSearchConsole(admin, job.profile_id);
    console.log(
      result.ok
        ? `Search Console ${job.profile_id}: ${result.rijen} rijen over ${result.start} tot ${result.eind}` +
          (result.queryRijen === null ? ", zoekopdrachten mislukt." : `, ${result.queryRijen} zoekopdrachten.`)
        : `Search Console ${job.profile_id}: ${result.reason}`,
    );
    // N3: pas de nieuwe cijfers op de kansen van dit merk toepassen als de
    // zoekopdrachten ook echt zijn opgehaald. Zonder queryRijen is er niets om
    // te matchen, en een mislukte bijwerking van het bewijs mag de geslaagde
    // synchronisatie van de ruwe cijfers niet als mislukt laten gelden.
    if (result.ok && result.queryRijen !== null) {
      await legZoekverkeerBewijsVast(admin, job.profile_id);
    }
  },

  // ── Zoekvolume herberekenen over het hele merk (docs/tasks/potentiescore.md) ─
  //
  // Getriggerd vanuit generate_report zodra een analyse haar eerste rapport
  // krijgt. Loopt over ALLE onderwerpen van het profiel, niet alleen de nieuwe
  // analyse: precies dat maakt de index eerlijk over analyses heen.
  recalculate_potential: async ({ job }) => {
    if (!job.profile_id) throw new Error("recalculate_potential zonder profile_id.");
    const result = await recalibrateSearchVolume(job.profile_id);
    console.log(
      `Zoekvolume-herkalibratie profiel ${job.profile_id}: ${result.updated} onderwerpen bijgewerkt.`,
    );
  },

  // ── Effect berekenen (5.4/5.5) — geen AI-aanroep ──────────────────────────
  compute_impact: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("compute_impact zonder analysis_id.");
    await computeImpact(admin, {
      analysisId: job.analysis_id,
      contentPieceId: payload.contentPieceId,
      wave: payload.wave,
    });  },

  // ── Mijn reputatie (docs/tasks/mijn-reputatie.md §7) ──────────────────────
  //
  // Vijf van de zes taken eindigen met dezelfde vraag: was ik de laatste? De
  // zesde is de synthese, en die start pas als het antwoord ja is. Zie
  // `scheduleSynthesisIfLast()` hieronder voor waarom dat op TAKEN telt en niet
  // op antwoorden.

  reputation_start: async ({ admin }, payload) => {
    await startReputationRun(admin, payload.runId);
  },

  reputation_brand: async ({ admin, job }, payload) => {
    await runBrandBlock(admin, payload.runId);
    await scheduleSynthesisIfLast(admin, payload.runId, job.id);
  },

  reputation_offering: async ({ admin, job }, payload) => {
    await runOfferingBlock(admin, payload.runId, payload.offeringId);
    await scheduleSynthesisIfLast(admin, payload.runId, job.id);
  },

  reputation_compare: async ({ admin, job }, payload) => {
    await runCompareBlock(
      admin,
      payload.runId,
      payload.offeringId,
      payload.slot,
      payload.rotations,
    );
    await scheduleSynthesisIfLast(admin, payload.runId, job.id);
  },

  reputation_sources: async ({ admin, job }, payload) => {
    await runSourcesBlock(admin, payload.runId);
    await scheduleSynthesisIfLast(admin, payload.runId, job.id);
  },

  reputation_synthesis: async ({ admin }, payload) => {
    await runSynthesis(admin, payload.runId);
  },

  // ── Clusters ontdekken (lib/pipeline/cluster-discovery.ts) ────────────────
  // Elke stap plant zijn opvolger zelf in; de ronde draagt de status.
  discovery_collect: async ({ admin }, payload) => {
    await discoveryCollect(admin, payload.runId);
  },
  discovery_expand: async ({ admin }, payload) => {
    await discoveryExpand(admin, payload.runId);
  },
  discovery_sift: async ({ admin }, payload) => {
    await discoverySift(admin, payload.runId);
  },
  discovery_bundle: async ({ admin }, payload) => {
    await discoveryBundle(admin, payload.runId);
  },

  /**
   * ⚠️ Deze taak plant de dienstvragen in NADAT hij klaar is, en niet andersom.
   * De dienstvragen lezen het corpus dat hier gevuld wordt; zouden ze parallel
   * draaien, dan treffen de eerste een leeg corpus aan en vallen die terug op
   * zelf zoeken. Dan is de helft van de diensten op een andere manier gemeten
   * dan de andere helft, en dat is precies de onvergelijkbaarheid die dit blok
   * moet wegnemen.
   */
  reputation_evidence: async ({ admin, job }, payload) => {
    await runEvidenceBlock(admin, payload.runId);
    await scheduleOfferingQuestions(admin, payload.runId);
    await scheduleSynthesisIfLast(admin, payload.runId, job.id);
  },

  reputation_market: async ({ admin, job }, payload) => {
    await runMarketBlock(admin, payload.runId, payload.offeringId, payload.repeats);
    await scheduleSynthesisIfLast(admin, payload.runId, job.id);
  },

  /**
   * Crawlbeheer (onboarding Ronde D, §17.7). `budgetMs` is een vaste,
   * behoudende marge: de werker start deze taak alleen als er nog
   * `HEAVY_JOB_RESERVE_MS` (200s) over is in het tijdbudget, en dit blijft daar
   * ruim onder. Loopt de crawl tegen die grens aan, dan stopt hij netjes met
   * wat hij tot dan toe vond in plaats van de platformlimiet van 300s te
   * raken; de consultant kan de knop gewoon nog een keer gebruiken, "meer"
   * pakt automatisch verder waar deze ronde bleef steken.
   */
  crawl_inventory: async ({ admin, job }, payload) => {
    if (!job.profile_id) throw new Error("crawl_inventory zonder profile_id.");
    const uitkomst = await refreshInventory(job.profile_id, {
      mode: payload.mode,
      maxPages: payload.maxPages,
      speed: payload.speed,
      budgetMs: 180_000,
    });
    // Een aanvulronde na een trage ontdekking gaat door tot alles gelezen is,
    // met een plafond zodat een site die nooit antwoordt geen eindeloze reeks
    // taken oplevert. Een eigen sleutel per ronde: de lopende taak houdt de
    // gewone sleutel nog bezet.
    const ronde = payload.aanvulronde ?? 0;
    if (ronde > 0 && ronde < MAX_AANVULRONDES && uitkomst.remaining > 0 && !uitkomst.blocked) {
      await enqueue(admin, {
        type: "crawl_inventory",
        payload: { mode: "meer", maxPages: uitkomst.remaining, speed: "langzaam", aanvulronde: ronde + 1 },
        profileId: job.profile_id,
        dedupeKey: `${dedupe.crawlInventory(job.profile_id)}:aanvul${ronde + 1}`,
      });
    }
  },

  // ── De gebeurtenissenlaag (van-pijplijn-naar-kennissysteem.md, G1) ────────
  gebeurtenis_verwerken: async ({ admin }, payload) => {
    await verwerkGebeurtenis(admin, payload.gebeurtenisId, payload.abonnee);
  },
};

/**
 * Zet de dienstvragen klaar zodra het bewijscorpus er is.
 *
 * Ze staan niet meteen in de rij omdat ze het corpus nodig hebben. De scope
 * ligt al vast in `reputation_runs.scope_json`, dus welke knopen het worden is
 * niet meer aan het toeval.
 */
async function scheduleOfferingQuestions(admin: Admin, runId: string): Promise<void> {
  const { data: run } = await admin
    .from("reputation_runs")
    .select("profile_id, scope_json")
    .eq("id", runId)
    .maybeSingle();
  if (!run) return;

  const knopen =
    ((run.scope_json as { nodes?: { id: string }[] } | null)?.nodes ?? []).filter(
      (n) => typeof n.id === "string",
    );

  for (const n of knopen) {
    await enqueue(admin, {
      type: "reputation_offering",
      payload: { runId, offeringId: n.id },
      profileId: run.profile_id as string,
      dedupeKey: dedupe.reputationOffering(runId, n.id),
    });
  }
}

/**
 * De keten doorzetten nadat een taak DEFINITIEF mislukt is (na alle pogingen).
 *
 * Zonder dit blijft een analyse voorgoed hangen zodra één van de dertig vragen
 * niet te meten valt. De keten hangt namelijk aan de GESLAAGDE meting: die kijkt
 * of ze de laatste was en plant dan de aggregatie in. Is de laatste openstaande
 * taak juist de taak die opgeeft, dan doet niemand dat meer, de analyse blijft
 * op 'meten' staan met een voortgangsscherm dat nooit verder komt.
 *
 * Dat terwijl de drempelcontrole (MIN_SUCCESS_RATIO, zie measurementIsUsable)
 * 29 van de 30 ruimschoots goedkeurt. Die controle zit alleen ín de
 * aggregatietaak, en die ontstond dus nooit. Deze functie repareert precies dat
 * gat: mislukken is een uitkomst waar de keten mee door kan, niet een stilstand.
 *
 * Wordt aangeroepen NADAT de taak op 'failed' staat, dus hij telt niet meer mee
 * als openstaand werk.
 */
/**
 * De volgende stap van de onderzoeksketen inplannen.
 *
 * Eén plek waar de sleutel per taaksoort staat, zodat de geslaagde tak en de
 * definitief-mislukte tak niet uit elkaar kunnen lopen.
 */
async function enqueueNext(
  admin: Admin,
  na: JobType,
  profileId: string,
): Promise<void> {
  const type = nextInChain(na);
  if (!type) return;
  const sleutel: Partial<Record<JobType, string>> = {
    profile_discover: dedupe.profileDiscover(profileId),
    profile_market: dedupe.profileMarket(profileId),
    profile_llm_baseline: dedupe.llmBaseline(profileId),
    profile_synthesis: dedupe.profileSynthesis(profileId),
  };
  const dedupeKey = sleutel[type];
  if (!dedupeKey) return;
  await enqueue(admin, { type, payload: {}, profileId, dedupeKey });
}

export async function scheduleFollowUpAfterFailure(
  admin: Admin,
  job: Job,
): Promise<void> {
  // ── De onderzoeksketen loopt door, ook als een stap opgeeft ──────────────
  //
  // ⚠️ Dit is de reparatie van het punt uit de Teamsessie van 18 augustus 2026.
  // `profile_offering` telt als niet-blokkerend omdat de klant bij een
  // mislukking alleen zijn dienstenoverzicht mist, maar diezelfde stap plande
  // de markt in, en de markt draagt de kennistest en de synthese. Mislukte hij
  // definitief, dan verdween de halve keten zonder één foutmelding.
  //
  // De opvolger hangt daarom niet meer aan het slagen van de stap maar aan de
  // tabel in `lib/jobs/chain.ts`, en die geldt in beide takken.
  // ── Een opgegeven brief houdt de rij en de pagina niet op (§6.1) ─────────
  // En een opgegeven schrijf-, controle- of herschrijftaak laat de pagina niet
  // eeuwig op "ORBIT ENGINE is bezig" staan (§6.6 en §6.7).
  const gafOp: Partial<Record<JobType, (a: Admin, j: Job) => Promise<void>>> = {
    pagina_brief: briefGafOp,
    pagina_schrijven: schrijvenGafOp,
    pagina_controle: controleGafOp,
    pagina_herschrijven: herschrijvenGafOp,
  };
  const naOpgeven = gafOp[job.type as JobType];
  if (naOpgeven) {
    await naOpgeven(admin, job);
    return;
  }

  const volgende = nextInChain(job.type as JobType);
  if (volgende && job.profile_id) {
    // Alleen als deze stap wél in de keten stond. Een stap die los is
    // ingepland vanuit het gesprek (`chain: false`) hoort ook bij een
    // mislukking niets achter zich aan te trekken.
    const payload = (job.payload_json ?? {}) as { chain?: boolean };
    if (payload.chain !== false) {
      await enqueueNext(admin, job.type as JobType, job.profile_id);
      console.warn(
        `Taak ${job.type} gaf definitief op voor profiel ${job.profile_id}; ` +
          `${volgende} is alsnog ingepland zodat de keten niet afkapt.`,
      );
    }
  }

  // ── Een opgegeven reputatietaak mag de synthese niet ophouden ────────────
  //
  // ⚠️ Precies dezelfde fout als hierboven, één laag dieper. De afteller van de
  // synthese hangt aan de GESLAAGDE taak: die kijkt of ze de laatste was en
  // plant dan de synthese in. Is de laatste openstaande taak juist de taak die
  // opgeeft, dan doet niemand dat meer en blijft de run voorgoed op 'running'
  // staan, met een voortgangsscherm dat nooit verder komt.
  //
  // De synthese kan prima zonder die ene vraag: hij rekent over wat er wél
  // staat, en `runIsUsable()` bepaalt of dat genoeg was. Een run die op
  // 'mislukt' eindigt met een uitleg is een uitkomst; een run die blijft hangen
  // is een storing.
  // ── Een opgegeven ontdekkingsstap sluit de ronde af ─────────────────────
  //
  // Elke stap plant zijn opvolger pas in als hij slaagt. Geeft hij op, dan
  // doet niemand dat meer, en zonder deze regel blijft de ronde voorgoed op
  // "verbreden" staan terwijl het scherm een voortgangsbalk toont. Anders dan
  // bij de reputatierun valt er niets af te maken met wat er wél is: zonder
  // zoektermen geen bundeling. Dus: mislukt, met een zin voor het scherm.
  if ((job.type as string).startsWith("discovery_")) {
    const runId = (job.payload_json as { runId?: string } | null)?.runId;
    if (runId) {
      await markeerRondeMislukt(
        admin,
        runId,
        "een stap lukte na vier pogingen niet. Start een nieuwe ronde; de kosten tot nu toe staan hieronder.",
      );
    }
    return;
  }

  if (REPUTATION_STEPS.includes(job.type as JobType)) {
    const runId = (job.payload_json as { runId?: string } | null)?.runId;
    if (runId) {
      await scheduleSynthesisIfLast(admin, runId, job.id);
      console.warn(
        `Taak ${job.type} gaf definitief op in reputatierun ${runId}; ` +
          `de synthese rekent over wat er wél gemeten is.`,
      );
    }
    return;
  }

  // ⚠️ Alle drie de meetsoorten, niet alleen `measure_prompt`. Sinds 20 september
  // 2026 wacht de aggregatie op álle bronnen (`scheduleAggregateIfLastPrompt`),
  // maar deze tak kende alleen de ChatGPT-meting. Gevolg, gemeten op 24 september
  // 2026 in de kwaliteitsdoorlichting: alle 90 Gemini-taken van drie clusters
  // gaven op wegens een limiet van DataForSEO, en de drie analyses bleven op
  // 'meten' staan zonder dat er ooit een rapport kwam.
  if (
    !job.analysis_id ||
    !["measure_prompt", "measure_ai_overview", "measure_llm_response"].includes(job.type)
  ) {
    return;
  }

  // Een hermeting ná publicatie (M3): zelfde tak voor `measure_prompt` en
  // `measure_ai_overview`, gecontroleerd op de PAYLOAD en niet op het
  // taaktype. Zonder dit gaf een definitief mislukte Google-meting van een
  // impactgolf de gewone (periodieke) aggregatie een seintje in plaats van de
  // effectberekening, en bleef die golf voorgoed op 'meten' staan.
  const payload = (job.payload_json ?? {}) as
    | JobPayloads["measure_prompt"]
    | JobPayloads["measure_ai_overview"]
    | JobPayloads["measure_llm_response"];
  if ("impact" in payload && payload.impact) {
    await scheduleImpactIfLastRun(admin, job.analysis_id, payload.impact, job.id);
    return;
  }
  await scheduleAggregateIfLastPrompt(admin, job.analysis_id, payload.weekNo, job.id);
}

/** Voert één taak uit. Gooit bij mislukking, de werker regelt de nieuwe poging. */
export async function runJob(ctx: JobContext): Promise<void> {
  const type = ctx.job.type as JobType;
  const handler = handlers[type] as Handler<JobType> | undefined;
  if (!handler) throw new Error(`Onbekende taaksoort: ${ctx.job.type}`);
  await handler(ctx, (ctx.job.payload_json ?? {}) as JobPayloads[JobType]);
}
