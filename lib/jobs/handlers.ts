import "server-only";

/**
 * Wat elke taaksoort doet (optimalisatie.md 1.3), plus de KETENING: een handler
 * plant zelf het vervolg in (1.5).
 *
 * Dat laatste is de kern van deze fase. Voorheen startte de BROWSER het rapport
 * nadat de meting klaar was — sloot de klant de tab, dan gebeurde er niets meer.
 * Nu loopt de keten op de server:
 *
 *   prepare_analysis → (wacht op goedkeuring van de klant)
 *   measure_prompt ×N → aggregate_week → generate_report → mail
 *   content_draft → content_revise
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareProfile } from "@/lib/pipeline/prepare-profile";
import { prepareAnalysis } from "@/lib/pipeline/prepare";
import { measurePromptById, computeAggregates, measurementIsUsable } from "@/lib/pipeline/measure";
import { generateReport } from "@/lib/pipeline/report";
import { draftContentPiece, reviseContentPiece } from "@/lib/pipeline/content";
import { runAuditForProfile } from "@/lib/audit/store";
import { planImpactMeasurements, computeImpact } from "@/lib/pipeline/impact";
import { verifyPublication } from "@/lib/pipeline/publish";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import type { JobType, JobPayloads, RecommendationPayload } from "@/lib/jobs/types";
import type { Job } from "@/lib/types/database";

type Admin = SupabaseClient;

export interface JobContext {
  admin: Admin;
  job: Job;
}

type Handler<T extends JobType> = (ctx: JobContext, payload: JobPayloads[T]) => Promise<void>;

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
  const { count: remaining } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("analysis_id", analysisId)
    .eq("type", "measure_prompt")
    .in("status", ["queued", "running"])
    .contains("payload_json", { weekNo })
    // De taak die dit aanroept staat zélf nog op 'running' — zonder deze
    // uitsluiting is `remaining` altijd minstens 1 en wordt de aggregatie
    // nooit ingepland.
    .neq("id", currentJobId);

  if ((remaining ?? 0) > 0) return;

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
  const { count: remaining } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("analysis_id", analysisId)
    .eq("type", "measure_prompt")
    .in("status", ["queued", "running"])
    .contains("payload_json", { impact: { contentPieceId: impact.contentPieceId, wave: impact.wave } })
    .neq("id", currentJobId);

  if ((remaining ?? 0) > 0) return;

  await enqueue(admin, {
    type: "compute_impact",
    payload: { contentPieceId: impact.contentPieceId, wave: impact.wave },
    analysisId,
    dedupeKey: dedupe.computeImpact(impact.contentPieceId, impact.wave),
  });
}

const handlers: { [T in JobType]: Handler<T> } = {
  // ── Profielonderzoek ──────────────────────────────────────────────────────
  profile_research: async ({ job }) => {
    if (!job.profile_id) throw new Error("profile_research zonder profile_id.");
    await prepareProfile(job.profile_id);
  },

  // ── Voorbereiding: onderwerp-onderzoek + prompts ──────────────────────────
  // Géén automatisch vervolg: hierna wacht de analyse op goedkeuring van de
  // klant (de review-gate). Dat is een bewuste stop, geen ontbrekende schakel.
  prepare_analysis: async ({ job }) => {
    if (!job.analysis_id) throw new Error("prepare_analysis zonder analysis_id.");
    await prepareAnalysis(job.analysis_id);
  },

  // ── Eén vraag meten (3a + 3b) ─────────────────────────────────────────────
  measure_prompt: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("measure_prompt zonder analysis_id.");
    await measurePromptById(job.analysis_id, payload.promptId, payload.weekNo, payload.impact);

    // Een hermeting ná publicatie (optimalisatie.md 5.3) hoort bij een pagina,
    // niet bij een periode: hij ketent naar de effectberekening en NIET naar de
    // aggregatie, want hij mag de zichtbaarheidsscore niet raken.
    if (payload.impact) {
      await scheduleImpactIfLastRun(admin, job.analysis_id, payload.impact, job.id);
      return;
    }
    await scheduleAggregateIfLastPrompt(admin, job.analysis_id, payload.weekNo, job.id);
  },

  // ── Aggregatie (3c) — geen AI-aanroep ─────────────────────────────────────
  aggregate_week: async ({ admin, job }, payload) => {
    if (!job.analysis_id) throw new Error("aggregate_week zonder analysis_id.");
    const analysisId = job.analysis_id;
    const { weekNo } = payload;

    // Drempelcontrole (optimalisatie.md 0.4b) staat nu hier: de aggregatie is
    // het eerste moment waarop het volledige beeld bekend is.
    const { usable, measured, expected } = await measurementIsUsable(admin, analysisId, weekNo);
    if (!usable) {
      if (weekNo === 0) await admin.from("analyses").update({ status: "mislukt" }).eq("id", analysisId);
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

    // De nulmeting brengt de analyse naar 'gemeten' en ketent door naar het
    // rapport. Latere weken laten de status ongemoeid (fase 6 maakt daar ook
    // weekrapporten van; nu nog niet).
    if (weekNo === 0) {
      await admin.from("analyses").update({ status: "gemeten" }).eq("id", analysisId);
      await enqueue(admin, {
        type: "generate_report",
        payload: { weekNo },
        analysisId,
        dedupeKey: dedupe.generateReport(analysisId, weekNo),
      });
    }
  },

  // ── Rapport (B1 + B2) + mail ──────────────────────────────────────────────
  generate_report: async ({ job }, payload) => {
    if (!job.analysis_id) throw new Error("generate_report zonder analysis_id.");
    await generateReport(job.analysis_id, payload.weekNo);
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

    if (!result.needsRevise) return; // eerste versie kwam al door de poort

    await enqueue(admin, {
      type: "content_revise",
      payload: {
        userId: payload.userId,
        contentPieceId: result.contentPieceId,
        recommendation: payload.recommendation,
        issues: result.issues,
      },
      analysisId: job.analysis_id,
      dedupeKey: dedupe.contentRevise(result.contentPieceId),
    });
  },

  // ── Content stap 2: herschrijven + herbeoordelen ──────────────────────────
  content_revise: async ({ job }, payload) => {
    if (!job.analysis_id) throw new Error("content_revise zonder analysis_id.");
    await reviseContentPiece({
      analysisId: job.analysis_id,
      userId: payload.userId,
      contentPieceId: payload.contentPieceId,
      recommendation: toRecommendation(payload.recommendation),
      issues: payload.issues,
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
    if (!job.analysis_id) throw new Error("verify_publication zonder analysis_id.");
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
    // doorrekenen — anders blijft de golf eeuwig "bezig" zonder dat er ooit een
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

/** Voert één taak uit. Gooit bij mislukking — de werker regelt de nieuwe poging. */
export async function runJob(ctx: JobContext): Promise<void> {
  const type = ctx.job.type as JobType;
  const handler = handlers[type] as Handler<JobType> | undefined;
  if (!handler) throw new Error(`Onbekende taaksoort: ${ctx.job.type}`);
  await handler(ctx, (ctx.job.payload_json ?? {}) as JobPayloads[JobType]);
}
