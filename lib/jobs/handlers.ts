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
import { runAuditForProfile } from "@/lib/audit/store";
import { planImpactMeasurements, computeImpact } from "@/lib/pipeline/impact";
import { verifyPublication } from "@/lib/pipeline/publish";
import { runOffsiteScan } from "@/lib/offsite/scan";
import { syncSearchConsole } from "@/lib/search-console/sync";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { countOpenPeriodicMeasurements } from "@/lib/jobs/pending";
import type {
  JobType,
  JobPayloads,
  RecommendationPayload,
} from "@/lib/jobs/types";
import type { Job } from "@/lib/types/database";
import { requireCount } from "@/lib/require-count";

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

  profile_offering: async ({ admin, job }) => {
    if (!job.profile_id) throw new Error("profile_offering zonder profile_id.");
    const { nodes } = await buildOfferingTree(job.profile_id);

    // Het marktonderzoek draagt de rest van de keten: het ketent zelf door naar
    // de kennistest, die op zijn beurt naar de synthese ketent. Bewust NIET
    // achter de topics gehangen. Die vallen weg zonder aanbodboom, en dan zou
    // de hele staart verdwijnen bij precies de klanten waar de crawl weinig
    // opleverde. En dat zijn er niet weinig.
    await enqueue(admin, {
      type: "profile_market",
      payload: {},
      profileId: job.profile_id,
      dedupeKey: dedupe.profileMarket(job.profile_id),
    });

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

  profile_market: async ({ admin, job }) => {
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
    await enqueue(admin, {
      type: "profile_llm_baseline",
      payload: {},
      profileId: job.profile_id,
      dedupeKey: dedupe.llmBaseline(job.profile_id),
    });
  },

  profile_llm_baseline: async ({ admin, job }) => {
    if (!job.profile_id)
      throw new Error("profile_llm_baseline zonder profile_id.");
    await runLlmBaseline(job.profile_id);

    // De synthese sluit de keten. Als laatste omdat hij op het dure model
    // draait: is het budget op, dan valt hij als eerste terug of weg.
    await enqueue(admin, {
      type: "profile_synthesis",
      payload: {},
      profileId: job.profile_id,
      dedupeKey: dedupe.profileSynthesis(job.profile_id),
    });
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

    await enqueue(admin, {
      type: "generate_prompts",
      payload: {},
      analysisId: job.analysis_id,
      dedupeKey: dedupe.generatePrompts(job.analysis_id),
    });
  },

  // ── Voorbereiding stap 2: de vragen opstellen ─────────────────────────────
  // Hierna wacht de analyse op goedkeuring van de klant (de review-gate); dat
  // is een bewuste stop. De kalibratie die nog volgt is een verfijning van de
  // volumebanden en houdt de klant niet tegen.
  generate_prompts: async ({ admin, job }) => {
    if (!job.analysis_id)
      throw new Error("generate_prompts zonder analysis_id.");
    await generateAnalysisPrompts(job.analysis_id);

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

  // ── Content stap 1: schrijven + beoordelen ────────────────────────────────
  content_draft: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("content_draft zonder analysis_id.");
    const result = await draftContentPiece({
      analysisId: job.analysis_id,
      userId: payload.userId,
      reportId: payload.recommendation.reportId,
      recommendation: toRecommendation(payload.recommendation),
      regenerate: payload.regenerate ?? false,
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
    await reviseContentPiece({
      analysisId: job.analysis_id,
      userId: payload.userId,
      contentPieceId: payload.contentPieceId,
      recommendation: toRecommendation(payload.recommendation),
      issues: payload.issues,
    });

    // De herschreven versie is de definitieve: nu ligt de bal bij de klant.
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

  // ── Effect berekenen (5.4/5.5) — geen AI-aanroep ──────────────────────────
  compute_impact: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("compute_impact zonder analysis_id.");
    await computeImpact(admin, {
      analysisId: job.analysis_id,
      contentPieceId: payload.contentPieceId,
      wave: payload.wave,
    });
  },
};

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
export async function scheduleFollowUpAfterFailure(
  admin: Admin,
  job: Job,
): Promise<void> {
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
