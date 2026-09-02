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
 *   content_draft → content_revise
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { nextInChain } from "@/lib/jobs/chain";
import { prepareProfile } from "@/lib/pipeline/prepare-profile";
import { discoverSite } from "@/lib/pipeline/discover";
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
import { runBriefing } from "@/lib/pipeline/briefing";
import { generateReport } from "@/lib/pipeline/report";
import { profileCompetitors } from "@/lib/pipeline/competitor-intel";
import { draftContentPiece, reviseContentPiece } from "@/lib/pipeline/content";
import { planContentPiece } from "@/lib/pipeline/content-plan";
import { runAuditForProfile } from "@/lib/audit/store";
import { planImpactMeasurements, computeImpact } from "@/lib/pipeline/impact";
import { verifyPublication } from "@/lib/pipeline/publish";
import { runOffsiteScan } from "@/lib/offsite/scan";
import { syncSearchConsole } from "@/lib/search-console/sync";
import { recalibrateSearchVolume } from "@/lib/pipeline/search-demand";
import { startReputationRun } from "@/lib/pipeline/reputation-start";
import { runBrandBlock } from "@/lib/pipeline/reputation-brand";
import { runOfferingBlock } from "@/lib/pipeline/reputation-offering";
import { runCompareBlock } from "@/lib/pipeline/reputation-compare";
import { runSourcesBlock } from "@/lib/pipeline/reputation-sources";
import { runSynthesis } from "@/lib/pipeline/reputation-synthesis";
import { runMarketBlock } from "@/lib/pipeline/reputation-market";
import { runEvidenceBlock } from "@/lib/pipeline/reputation-evidence";
import { ontdekMarkt } from "@/lib/pipeline/sales-discover";
import { verifieerMarkt } from "@/lib/pipeline/sales-verify";
import { sluitUit } from "@/lib/pipeline/sales-suppress";
import { verrijkBedrijf } from "@/lib/pipeline/sales-enrich";
import { bepaalIntenties } from "@/lib/pipeline/sales-intents";
import { genereerVragen } from "@/lib/pipeline/sales-questions";
import { meetVraag } from "@/lib/pipeline/sales-measure";
import { aggregeerRonde } from "@/lib/pipeline/sales-aggregate";
import { detecteerVoorRonde } from "@/lib/pipeline/sales-detect";
import { schrijfUitleg } from "@/lib/pipeline/sales-explain";
import { zoekContact } from "@/lib/pipeline/sales-contact";
import { schrijfConcept } from "@/lib/pipeline/sales-draft";
import { schrijfRapport } from "@/lib/pipeline/sales-report";
import { VRAGEN_STANDAARD, type Intentie } from "@/lib/sales/intents";
import { raamMeetronde } from "@/lib/sales/budget";
import { availableEngineIds } from "@/lib/engines/registry";
import type { Kandidaat } from "@/lib/sales/discovery";
import { refreshInventory } from "@/lib/pipeline/refresh-inventory";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { countOpenPeriodicMeasurements } from "@/lib/jobs/pending";
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
 * Meldt een geschreven tekst terug aan de pagina in het contentplan (fase 4).
 *
 * ⚠️ Best-effort, met opzet. Mislukt deze koppeling, dan is er wél een tekst
 * geschreven, en die alsnog als mislukte taak markeren zou hem opnieuw laten
 * schrijven: een tweede betaalde aanroep op het duurste model om een
 * administratieve regel. De tekst staat onder de analyse en is daar te vinden;
 * het plan loopt dan achter, en dat is de goedkoopste van de twee fouten.
 */
async function linkPlannedPage(
  admin: Admin,
  plannedPageId: string | undefined,
  result: { contentPieceId: string; klaar: boolean },
): Promise<void> {
  if (!plannedPageId) return;
  try {
    await admin
      .from("planned_pages")
      .update({
        content_piece_id: result.contentPieceId,
        status: result.klaar ? "ter_goedkeuring" : "schrijven",
      })
      .eq("id", plannedPageId)
      // Een pagina die de klant intussen heeft afgewezen of zelf geplaatst
      // heeft, mag niet teruggezet worden door een taak die nog liep.
      .in("status", ["gepland", "schrijven"]);
  } catch (err) {
    console.error(`Plan-pagina ${plannedPageId} koppelen faalde:`, err);
  }
}

/** Payload → de vorm die de contentpijplijn verwacht. */
function toRecommendation(r: RecommendationPayload) {
  return {
    title: r.title,
    type: r.type,
    targetIntent: r.targetIntent,
    why: r.why,
    action: r.action,
    existingUrl: r.existingUrl,
    // Sinds fase 4 draagt de aanbeveling zijn doelvragen mee: welke gemiste
    // vraag deze pagina moet winnen (4.1) en wat de klant zelf anders wil (4.8).
    targets: r.targets ?? [],
    revisionNote: r.revisionNote ?? null,
  };
}

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
    .select("id, payload_json")
    .eq("analysis_id", analysisId)
    .eq("type", "measure_prompt")
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
 * Was dit de laatste plantaak van de batch? Zo ja, dan mag de briefing draaien.
 * (docs/tasks/vragen-voor-het-schrijven.md §3)
 *
 * ── DEZELFDE CONSTRUCTIE ALS `scheduleAggregateIfLastPrompt()` ──────────────
 *
 * Inclusief dezelfde valkuil, die daar één keer ingelopen is: de taak die dit
 * aanroept staat ZÉLF nog op 'running'. Zonder de uitsluiting op `currentJobId`
 * is het aantal openstaande plantaken altijd minstens één en wordt de briefing
 * nooit ingepland. De klant blijft dan wachten op vragen die niet komen.
 *
 * ── WAAROM DE BRIEFING PAS NA ALLE CONTRACTEN MAG ───────────────────────────
 *
 * De briefing haalt zijn vragen uit het VERSCHIL tussen het contract (wat de
 * pagina nodig heeft) en de feitenkaart (wat we hebben). Draait hij nadat er
 * pas twee van de vier contracten liggen, dan krijgen die twee andere pagina's
 * geen enkele vraag, en dat zijn juist de pagina's waarvan nog niemand weet hoe
 * dun ze zijn.
 *
 * ── WAAROM DIT OP TAKEN TELT EN NIET OP CONTRACTEN ─────────────────────────
 *
 * Een plantaak kan legitiem ZONDER contract eindigen: het onderzoek blijft
 * hangen op een externe bron, of het schema parst niet, en dan gaat hij bij de
 * laatste poging bewust door (zie de vangst in `content_plan` hierboven). Zou
 * de afteller op contracten tellen, dan komt hij in precies dat geval nooit op
 * nul uit en krijgt de klant nooit een vraag te zien. Een pagina zonder
 * contract levert straks een briefing zonder dekkingsmeting voor díé pagina op,
 * en dat is precies het oude gedrag: minder goed, niet stuk.
 *
 * De dedupe-sleutel op de briefing zorgt dat er hoe dan ook maar één ontstaat.
 */
async function scheduleBriefingIfLastPlan(
  admin: Admin,
  analysisId: string,
  currentJobId: string,
  userId: string,
  recommendations: RecommendationPayload[],
): Promise<void> {
  const { data: openJobs } = await admin
    .from("jobs")
    .select("id, payload_json")
    .eq("analysis_id", analysisId)
    .eq("type", "content_plan")
    .in("status", ["queued", "running"])
    .neq("id", currentJobId);

  const nogBezig = ((openJobs ?? []) as { payload_json: { voorBriefing?: unknown } | null }[]).filter(
    (j) => Boolean(j.payload_json?.voorBriefing),
  ).length;
  if (nogBezig > 0) return;

  await enqueue(admin, {
    type: "content_brief",
    payload: { userId, recommendations },
    analysisId,
    dedupeKey: dedupe.contentBrief(
      analysisId,
      recommendations.map((r) => r.title),
    ),
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
  const remaining = requireCount(
    await admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .eq("type", "measure_prompt")
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

const handlers: { [T in JobType]: Handler<T> } = {
  // ── Profielonderzoek ──────────────────────────────────────────────────────
  // ── Fase 0: ontdekken. Nul AI-kosten, en het fundament onder al het
  // volgende (docs/tasks/onboarding-2.0.md blok B).
  profile_discover: async ({ admin, job }) => {
    if (!job.profile_id) throw new Error("profile_discover zonder profile_id.");
    await discoverSite(job.profile_id);

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

  // ── Contentbriefing: de vragenronde vóór het schrijven (R5.1) ─────────────
  //
  // Hierna stopt de pijplijn bewust. Er wordt niets ingepland: de klant beslist
  // wanneer er geschreven wordt, via het briefingscherm. Dat is hetzelfde
  // patroon als de review-gate tussen halte 2 en 3 (abcplan.md §3.6), nooit een
  // black box, altijd eerst kijken en bijsturen.
  content_brief: async ({ job }, payload) => {
    if (!job.analysis_id) throw new Error("content_brief zonder analysis_id.");
    const result = await runBriefing({
      analysisId: job.analysis_id,
      recommendations: payload.recommendations,
    });
    console.log(
      `Briefing ${job.analysis_id}: ${result.contentPieceIds.length} pagina's, ` +
        `${result.facts} bekende feiten, ${result.questions} vragen aan de klant.`,
    );
  },

  // ── Content stap 0: uitzoeken wat DEZE pagina nodig heeft (A1/A2) ─────────
  //
  // Het itemdossier plus het contentcontract, en daarna pas schrijven. Een eigen
  // taak omdat het onderzoek een web-zoekactie doet: die past niet vóór een
  // schrijfaanroep die zelf al tot 150 seconden mag duren (conventie 7).
  //
  // Faalt deze stap, dan faalt de taak en probeert de wachtrij hem opnieuw. Pas
  // als hij definitief mislukt gaat de pijplijn niet verder, en dat is bewust:
  // een pagina zonder contract is precies de dunne pagina die dit werk moest
  // oplossen. De uitzondering staat hieronder, in de vangst.
  content_plan: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("content_plan zonder analysis_id.");

    let voorbereid: {
      contract: unknown;
      dossier: unknown;
      explainers: unknown[];
    } | null = null;

    try {
      const result = await planContentPiece({
        analysisId: job.analysis_id,
        userId: payload.userId,
        recommendation: toRecommendation(payload.recommendation),
        force: payload.regenerate ?? false,
      });
      voorbereid = {
        contract: result.contract,
        dossier: result.dossier,
        explainers: result.explainers,
      };
      console.log(
        `Contentplan "${payload.recommendation.title}": ` +
          `${result.contract?.sections.length ?? 0} secties` +
          `${result.hergebruikt ? " (hergebruikt, geen nieuwe aanroep)" : ""}.`,
      );
    } catch (err) {
      // ⚠️ Bewust NIET opnieuw gooien bij de laatste poging. Deze taak is
      // voorbereiding; het schrijven is het product. Blijft het onderzoek
      // hangen op een externe bron of een schema dat niet parst, dan is een
      // pagina zonder contract nog altijd beter dan geen pagina. De pijplijn
      // valt dan terug op het gedrag van vóór dit werk, en dat gedrag werkt.
      if (job.attempts < MAX_ATTEMPTS - 1) throw err;
      console.warn(
        `Contentplan voor "${payload.recommendation.title}" bleef mislukken, ` +
          `we schrijven zonder contract: ${describeError(err)}`,
      );
    }

    // ── Draaide dit vóór de briefing? Dan schrijven we nog niet ─────────────
    //
    // Het contract is hier het IDEAAL waar de briefing zijn vragen uit haalt
    // (docs/tasks/vragen-voor-het-schrijven.md §3). De klant heeft nog niets
    // beantwoord en beslist zelf wanneer er geschreven wordt. Meteen schrijven
    // zou precies de pagina opleveren die dit werk moest voorkomen: een pagina
    // die om zijn eigen gaten heen praat.
    if (payload.voorBriefing) {
      await scheduleBriefingIfLastPlan(
        admin,
        job.analysis_id,
        job.id,
        payload.userId,
        payload.voorBriefing.recommendations,
      );
      return;
    }

    await enqueue(admin, {
      type: "content_draft",
      payload: {
        userId: payload.userId,
        recommendation: payload.recommendation,
        regenerate: payload.regenerate ?? false,
        plannedPageId: payload.plannedPageId,
        voorbereid,
      },
      analysisId: job.analysis_id,
      dedupeKey: dedupe.contentDraftNa(job.id),
    });
  },

  // ── Content stap 1: schrijven + beoordelen ────────────────────────────────
  content_draft: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("content_draft zonder analysis_id.");
    const result = await draftContentPiece({
      analysisId: job.analysis_id,
      userId: payload.userId,
      reportId: payload.recommendation.reportId,
      recommendation: toRecommendation(payload.recommendation),
      regenerate: payload.regenerate ?? false,
      voorbereid: payload.voorbereid
        ? {
            contract: (payload.voorbereid.contract ?? null) as never,
            dossier: (payload.voorbereid.dossier ?? null) as never,
            explainers: (payload.voorbereid.explainers ?? []) as never,
          }
        : null,
    });

    // Komt deze tekst uit het contentplan, dan hoort de plan-pagina te weten
    // welke tekst het geworden is. Meteen na het schrijven, niet pas na de
    // eventuele herschrijfronde: valt de werker daartussen om, dan is de tekst
    // nog steeds terug te vinden vanaf het plan.
    await linkPlannedPage(admin, payload.plannedPageId, {
      contentPieceId: result.contentPieceId,
      klaar: !result.needsRevise,
    });

    if (!result.needsRevise) return; // eerste versie kwam al door de poort

    await enqueue(admin, {
      type: "content_revise",
      payload: {
        userId: payload.userId,
        contentPieceId: result.contentPieceId,
        recommendation: payload.recommendation,
        issues: result.issues,
        plannedPageId: payload.plannedPageId,
      },
      analysisId: job.analysis_id,
      dedupeKey: dedupe.contentRevise(result.contentPieceId),
    });
  },

  // ── Content stap 2: herschrijven + herbeoordelen ──────────────────────────
  content_revise: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("content_revise zonder analysis_id.");
    const result = await reviseContentPiece({
      analysisId: job.analysis_id,
      userId: payload.userId,
      contentPieceId: payload.contentPieceId,
      recommendation: toRecommendation(payload.recommendation),
      issues: payload.issues,
    });

    // ── Nog een gerichte ronde? (A6) ────────────────────────────────────────
    //
    // Was: één herschrijving en klaar, ook als de bevindingen bleven staan. Nu
    // repareert elke ronde alleen de secties met een bevinding, dus is nog een
    // ronde goedkoper dan de ene volledige herschrijving van vroeger. De grens
    // (REPAIR_MAX) zit in `reviseContentPiece`: die kent de rondeteller op de
    // pagina, en die telling overleeft een taak die opnieuw geprobeerd wordt.
    if (!result.klaar) {
      await enqueue(admin, {
        type: "content_revise",
        payload: {
          userId: payload.userId,
          contentPieceId: payload.contentPieceId,
          recommendation: payload.recommendation,
          issues: result.issues,
          plannedPageId: payload.plannedPageId,
        },
        analysisId: job.analysis_id,
        dedupeKey: `${dedupe.contentRevise(payload.contentPieceId)}:r${result.ronde}`,
      });
      return;
    }

    // De gerepareerde versie is de definitieve: nu ligt de bal bij de klant.
    await linkPlannedPage(admin, payload.plannedPageId, {
      contentPieceId: payload.contentPieceId,
      klaar: true,
    });
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
        ? `Search Console ${job.profile_id}: ${result.rijen} rijen over ${result.start} tot ${result.eind}.`
        : `Search Console ${job.profile_id}: ${result.reason}`,
    );
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

  // ── De Sales-module, sprint 2 (docs/tasks/geo-prospect-engine.md §8) ──────
  //
  // De keten is: ontdekken → verifiëren → uitsluiten → POORT 1 → verrijken.
  // Alleen de eerste stap kost geld. De poort zit ertussen als een echte stop:
  // de verrijking wordt niet door een handler ingepland maar door de admin die
  // op goedkeuren drukt (`app/api/sales/markets/[id]/approve/route.ts`). Dat is
  // het verschil tussen een poort en een pauze.

  /**
   * Stap 1: welke bedrijven vormen deze markt?
   *
   * ⚠️ De ruwe uitkomst gaat naar de database vóórdat de volgende stap wordt
   * ingepland (conventie 8, en hier ook praktisch). Zou hij alleen in de payload
   * meegaan, dan zou een mislukte verificatiestap de dure zoekactie opnieuw laten
   * betalen. Nu is een tweede poging gratis.
   */
  sales_market_discover: async ({ admin }, payload) => {
    const uit = await ontdekMarkt(admin, payload.marketId);
    if (uit.skipped) return;

    if (uit.kandidaten.length === 0 && uit.bronpaginas.length === 0) {
      // Nul bedrijven én nul bronpagina's is geen lege markt maar een mislukte
      // zoekactie: elke branche in elke plaats heeft aanbieders. Dat zeggen we
      // hardop in plaats van een lege lijst aan poort 1 aan te bieden.
      await admin
        .from("sales_markets")
        .update({
          status: "mislukt",
          failure_reason:
            "Het onderzoek vond geen bedrijven en geen overzichtspagina's. " +
            "Controleer de branche en de plaats, en probeer het opnieuw.",
        })
        .eq("id", payload.marketId);
      return;
    }

    await admin
      .from("sales_markets")
      .update({
        discovery_json: {
          kandidaten: uit.kandidaten,
          bronpaginas: uit.bronpaginas,
        } as unknown as Record<string, unknown>,
        discovery_note: uit.kanttekening || null,
        discovered_at: new Date().toISOString(),
      })
      .eq("id", payload.marketId);

    await enqueue(admin, {
      type: "sales_market_verify",
      payload: { marketId: payload.marketId },
      salesMarketId: payload.marketId,
      dedupeKey: dedupe.salesVerify(payload.marketId),
    });
  },

  /** Stap 2: de bronpagina's uitlezen, ontdubbelen en vastleggen. Geen AI. */
  sales_market_verify: async ({ admin }, payload) => {
    const { data } = await admin
      .from("sales_markets")
      .select("discovery_json, discovery_note")
      .eq("id", payload.marketId)
      .maybeSingle();

    const bewaard = (data?.discovery_json ?? null) as {
      kandidaten?: Kandidaat[];
      bronpaginas?: { url: string; wat: string }[];
    } | null;
    if (!bewaard) {
      throw new Error(`Markt ${payload.marketId} heeft geen bewaarde ontdekking.`);
    }

    const uit = await verifieerMarkt(
      admin,
      payload.marketId,
      bewaard.kandidaten ?? [],
      (bewaard.bronpaginas ?? []).map((p) => p.url),
    );

    if (uit.bedrijven === 0) {
      await admin
        .from("sales_markets")
        .update({
          status: "mislukt",
          failure_reason:
            "Na het ontdubbelen bleef er geen enkel bedrijf over. " +
            "Waarschijnlijk stonden er alleen platforms en vergelijkingssites in de uitkomst.",
        })
        .eq("id", payload.marketId);
      return;
    }

    // De kanttekening groeit mee met wat er onderweg misging. Poort 1 hoort te
    // weten waar de lijst dun is, niet alleen hoe lang hij is.
    const extra: string[] = [];
    if (uit.bronpaginasMislukt > 0) {
      extra.push(
        uit.bronpaginasMislukt === 1
          ? "1 overzichtspagina was niet te openen."
          : `${uit.bronpaginasMislukt} overzichtspagina's waren niet te openen.`,
      );
    }
    if (uit.afgekapt.length > 0) {
      extra.push(
        `Deze pagina's waren te groot om helemaal te lezen: ${uit.afgekapt.join(", ")}.`,
      );
    }

    const bestaande = (data?.discovery_note as string | null) ?? "";
    const nieuweNotitie = [bestaande, ...extra].filter(Boolean).join(" ");

    await admin
      .from("sales_markets")
      .update({
        status: "bedrijven_gevonden",
        discovery_note: nieuweNotitie || null,
      })
      .eq("id", payload.marketId);

    await enqueue(admin, {
      type: "sales_market_suppress",
      payload: { marketId: payload.marketId },
      salesMarketId: payload.marketId,
      dedupeKey: dedupe.salesSuppress(payload.marketId),
    });
  },

  /**
   * Stap 2b: klanten, lopende trajecten en afmeldingen eruit.
   *
   * ⚠️ Deze stap zet de markt op `wacht_op_goedkeuring` en plant NIETS in. Dat
   * is poort 1: hier stopt de keten tot een mens gekeken heeft. Zou hij de
   * verrijking zelf inplannen, dan was de poort een pauze met een knop ernaast.
   */
  sales_market_suppress: async ({ admin }, payload) => {
    await sluitUit(admin, payload.marketId);
    await admin
      .from("sales_markets")
      .update({ status: "wacht_op_goedkeuring" })
      .eq("id", payload.marketId);
  },

  /**
   * Stap 3: de site van één goedgekeurd bedrijf uitlezen. Geen AI.
   *
   * ⚠️ De LAATSTE crawltaak plant de intentiestap in, niet elke taak. Zonder die
   * controle zou elk bedrijf een intentieronde starten, en dertig markten aan
   * intenties voor één markt kost dertig keer zoveel als het mag. Dezelfde
   * constructie als `scheduleSynthesisIfLast` bij de reputatieanalyse.
   */
  sales_company_enrich: async ({ admin, job }, payload) => {
    await verrijkBedrijf(admin, payload.companyId);
    await planIntentiesAlsLaatste(admin, payload.marketId, job.id);
  },

  /**
   * Stap 4: de commerciële intenties van deze markt (plan hoofdstuk 10).
   *
   * Deze stap maakt ook de meetronde aan. Dat hoort hier en niet bij de
   * goedkeuring van de bedrijvenlijst: een ronde zonder intenties heeft geen
   * vragen, en een lege ronde in de lijst is een ronde waarvan niemand weet of
   * hij nog komt.
   */
  sales_market_intents: async ({ admin }, payload) => {
    const uit = await bepaalIntenties(admin, payload.marketId, VRAGEN_STANDAARD);
    if (uit.skipped) {
      if (uit.melding) {
        await admin
          .from("sales_markets")
          .update({ status: "mislukt", failure_reason: uit.melding })
          .eq("id", payload.marketId);
      }
      return;
    }

    const runId = await maakRonde(admin, payload.marketId, uit.intenties, uit.kanttekening);

    await enqueue(admin, {
      type: "sales_market_questions",
      payload: { marketId: payload.marketId, runId },
      salesMarketId: payload.marketId,
      salesRunId: runId,
      dedupeKey: dedupe.salesQuestions(runId),
    });
  },

  /**
   * Stap 5: de vragen schrijven, en dan stoppen.
   *
   * ⚠️ Deze taak plant NIETS in. Dat is poort 2 (plan §8.1): hier stopt de keten
   * tot een mens de vragen en de kostenraming gezien heeft. Zou hij de meting
   * zelf inplannen, dan is de poort een pauze met een knop ernaast en wordt er
   * geld uitgegeven zonder dat iemand ja heeft gezegd.
   */
  sales_market_questions: async ({ admin }, payload) => {
    const { data: run } = await admin
      .from("sales_runs")
      .select("id, intents_json, notes")
      .eq("id", payload.runId)
      .maybeSingle();
    if (!run) throw new Error(`Meetronde ${payload.runId} bestaat niet.`);

    const intenties = ((run.intents_json as { intenties?: Intentie[] } | null)?.intenties ??
      []) as Intentie[];

    const uit = await genereerVragen(admin, payload.marketId, intenties, VRAGEN_STANDAARD);
    if (uit.vragen.length === 0) {
      await admin
        .from("sales_runs")
        .update({
          status: "mislukt",
          notes: [run.notes as string | null, uit.melding].filter(Boolean).join(" ") || null,
        })
        .eq("id", payload.runId);
      await admin
        .from("sales_markets")
        .update({
          status: "mislukt",
          failure_reason: uit.melding ?? "Er zijn geen vragen geschreven voor deze markt.",
        })
        .eq("id", payload.marketId);
      return;
    }

    const { error } = await admin.from("sales_questions").insert(
      uit.vragen.map((v) => ({
        run_id: payload.runId,
        text: v.text,
        intent_stage: v.stage,
        intent_label: v.intentLabel,
        weight: v.weight,
        position: v.position,
        source: "gegenereerd",
      })),
    );
    if (error) throw new Error(`Opslaan van de vragen mislukt: ${error.message}`);

    const engines = availableEngineIds();
    await admin
      .from("sales_runs")
      .update({
        status: "vragen_klaar",
        question_count: uit.vragen.length,
        engines,
        estimate_usd: raamMeetronde(uit.vragen.length, engines.length),
        notes: [run.notes as string | null, uit.melding].filter(Boolean).join(" ") || null,
      })
      .eq("id", payload.runId);

    await admin
      .from("sales_markets")
      .update({ status: "vragen_klaar" })
      .eq("id", payload.marketId);
  },

  /** Stap 6 en 7: één vraag op één engine, plus de beoordeling. */
  sales_measure_question: async ({ admin, job }, payload) => {
    await meetVraag(admin, payload.runId, payload.questionId, payload.engine);
    await planAggregatieAlsLaatste(admin, payload.marketId, payload.runId, job.id);
  },

  /**
   * Stap 8: de meting omrekenen naar zichtbaarheid per bedrijf. Geen AI.
   *
   * Ketent door naar de detectie. Die twee zijn allebei gratis en allebei
   * deterministisch, maar het blijven twee taken: de aggregatie leest álle
   * vermeldingen van de ronde, de detectie leest de uitkomst daarvan plus de
   * vorige ronde. Samen in één taak zou een mislukte detectie de hele
   * aggregatie opnieuw laten draaien.
   */
  sales_market_aggregate: async ({ admin }, payload) => {
    const uit = await aggregeerRonde(admin, payload.runId);
    // Zonder engine die gemeten heeft valt er niets te detecteren. Dat is geen
    // markt zonder kansen maar een mislukte ronde, en die twee horen niet
    // hetzelfde te zien te zijn.
    if (uit.engines.length === 0) return;

    await enqueue(admin, {
      type: "sales_detect_opportunities",
      payload: { marketId: payload.marketId, runId: payload.runId },
      salesMarketId: payload.marketId,
      salesRunId: payload.runId,
      dedupeKey: dedupe.salesDetect(payload.runId),
    });
  },

  /**
   * Stap 9: de acht types detecteren en scoren. Geen AI.
   *
   * Plant daarna één schrijftaak per kans in. Dat is de enige plek in deze
   * keten waar het aantal taken met het aantal BEDRIJVEN meeschaalt, en het is
   * meteen de enige plek waar dat geld kost. Vandaar dat de goedkoopste kansen
   * geen schrijftaak krijgen: zie hieronder.
   */
  sales_detect_opportunities: async ({ admin }, payload) => {
    await detecteerVoorRonde(admin, payload.runId);

    const { data: kansen } = await admin
      .from("sales_opportunities")
      .select("id, tier")
      .eq("run_id", payload.runId);

    for (const kans of (kansen ?? []) as { id: string; tier: string }[]) {
      // ⚠️ Alleen voor de kansen die een verkoper ook echt oppakt. Plan 21.3,
      // tweede rem: "voor bedrijven met een lage score een mail schrijven die
      // niemand verstuurt, is weggegooid geld". Een lage kans houdt zijn
      // sjabloonzin, en die is waar; hij is alleen minder mooi.
      if (kans.tier === "laag") continue;

      await enqueue(admin, {
        type: "sales_opportunity_explain",
        payload: {
          marketId: payload.marketId,
          runId: payload.runId,
          opportunityId: kans.id,
        },
        salesMarketId: payload.marketId,
        salesRunId: payload.runId,
        dedupeKey: dedupe.salesExplain(kans.id),
      });
    }
  },

  /** Stap 10: de uitleg en de haak bij één kans. */
  sales_opportunity_explain: async ({ admin }, payload) => {
    await schrijfUitleg(admin, payload.opportunityId);
  },

  /**
   * Stap 12: de contactpersoon zoeken, en daarna pas het concept.
   *
   * ⚠️ De volgorde is niet omkeerbaar. Het concept wordt ondertekend en gaat
   * naar een persoon; wie dat is, bepaalt de toon en soms de inhoud. Zouden ze
   * parallel draaien, dan schrijft de ene stap een mail aan een onbekende
   * terwijl de andere net de eigenaar vindt.
   *
   * Vindt de stap niemand, dan gaat het concept tóch door: de verkoper kan zelf
   * iemand opzoeken of bellen, en dan is een klaarliggend concept nuttiger dan
   * een lege regel (plan 9.4, regel 2).
   */
  sales_contact_find: async ({ admin }, payload) => {
    await zoekContact(admin, payload.marketId, payload.companyId, payload.outreachId);

    await enqueue(admin, {
      type: "sales_outreach_draft",
      payload: { marketId: payload.marketId, outreachId: payload.outreachId },
      salesMarketId: payload.marketId,
      dedupeKey: dedupe.salesDraft(payload.outreachId),
    });
  },

  /** Stap 13: de conceptmail en de gespreksvoorbereiding. Verstuurt niets. */
  sales_outreach_draft: async ({ admin }, payload) => {
    await schrijfConcept(admin, payload.outreachId);
  },

  /** Het publieke marktrapport schrijven. Publiceert niet. */
  sales_market_report: async ({ admin }, payload) => {
    await schrijfRapport(admin, payload.runId);
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
  crawl_inventory: async ({ job }, payload) => {
    if (!job.profile_id) throw new Error("crawl_inventory zonder profile_id.");
    await refreshInventory(job.profile_id, {
      mode: payload.mode,
      maxPages: payload.maxPages,
      speed: payload.speed,
      budgetMs: 180_000,
    });
  },
};

/**
 * De intentiestap inplannen zodra de laatste crawltaak van deze markt klaar is.
 *
 * ⚠️ De taak die dit aanroept staat zélf nog op `running`, dus die moet
 * uitgesloten worden. Zonder die uitsluiting is het aantal openstaande taken
 * altijd minstens één en wordt de vervolgstap nooit ingepland. Exact dezelfde
 * val als bij de weekaggregatie van de klantmeting, waar hij ook is
 * ingelopen.
 */
async function planIntentiesAlsLaatste(
  admin: Admin,
  marketId: string,
  currentJobId: string,
): Promise<void> {
  const { data: open } = await admin
    .from("jobs")
    .select("id")
    .eq("sales_market_id", marketId)
    .eq("type", "sales_company_enrich")
    .in("status", ["queued", "running"])
    .neq("id", currentJobId);

  if ((open ?? []).length > 0) return;

  await enqueue(admin, {
    type: "sales_market_intents",
    payload: { marketId },
    salesMarketId: marketId,
    dedupeKey: dedupe.salesIntents(marketId),
  });
}

/**
 * De aggregatie inplannen zodra de laatste meting van deze ronde klaar is.
 *
 * Dezelfde constructie, en dezelfde uitsluiting van de eigen taak. Er wordt op
 * de RONDE geteld en niet op de markt: bij een hermeting lopen er anders nog
 * taken van ronde één in de telling mee, en dan wacht ronde twee op werk dat
 * allang gedaan is.
 */
async function planAggregatieAlsLaatste(
  admin: Admin,
  marketId: string,
  runId: string,
  currentJobId: string,
): Promise<void> {
  const { data: open } = await admin
    .from("jobs")
    .select("id")
    .eq("sales_run_id", runId)
    .eq("type", "sales_measure_question")
    .in("status", ["queued", "running"])
    .neq("id", currentJobId);

  if ((open ?? []).length > 0) return;

  await enqueue(admin, {
    type: "sales_market_aggregate",
    payload: { marketId, runId },
    salesMarketId: marketId,
    salesRunId: runId,
    dedupeKey: dedupe.salesAggregate(runId),
  });
}

/**
 * De meetronde aanmaken, met de intenties erop.
 *
 * Het rondenummer telt door op wat er al staat. Dat is wat opportunitytype 8
 * (verlies) nodig heeft: "de vorige ronde" moet ook kloppen als er twee rondes
 * op één dag zijn, en dan is een datumvergelijking niet genoeg.
 */
async function maakRonde(
  admin: Admin,
  marketId: string,
  intenties: Intentie[],
  kanttekening: string,
): Promise<string> {
  const { data: bestaand } = await admin
    .from("sales_runs")
    .select("id, round_no, status")
    .eq("market_id", marketId)
    .order("round_no", { ascending: false })
    .limit(1);

  const laatste = (bestaand ?? [])[0] as { id: string; round_no: number; status: string } | undefined;

  // Een ronde die nog niet gemeten heeft, wordt hergebruikt in plaats van
  // gedupliceerd (conventie 9). Anders levert een tweede poging van de
  // intentiestap een tweede lege ronde op, en dan staan er twee rondes 1 in een
  // lijst waar de verkoper er één verwacht.
  if (laatste && (laatste.status === "concept" || laatste.status === "vragen_klaar")) {
    await admin
      .from("sales_runs")
      .update({
        intents_json: { intenties, kanttekening } as unknown as Record<string, unknown>,
      })
      .eq("id", laatste.id);
    return laatste.id;
  }

  const { data: nieuw, error } = await admin
    .from("sales_runs")
    .insert({
      market_id: marketId,
      round_no: (laatste?.round_no ?? 0) + 1,
      status: "concept",
      intents_json: { intenties, kanttekening } as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (error || !nieuw) throw new Error(`Meetronde aanmaken mislukt: ${error?.message}`);
  return nieuw.id as string;
}

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

  if ((job.type as JobType) !== "measure_prompt" || !job.analysis_id) return;

  const payload = (job.payload_json ?? {}) as JobPayloads["measure_prompt"];
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
}

/** Voert één taak uit. Gooit bij mislukking, de werker regelt de nieuwe poging. */
export async function runJob(ctx: JobContext): Promise<void> {
  const type = ctx.job.type as JobType;
  const handler = handlers[type] as Handler<JobType> | undefined;
  if (!handler) throw new Error(`Onbekende taaksoort: ${ctx.job.type}`);
  await handler(ctx, (ctx.job.payload_json ?? {}) as JobPayloads[JobType]);
}
