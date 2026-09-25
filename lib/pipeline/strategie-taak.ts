import "server-only";

/**
 * De taak `content_strategy` (WP3 van docs/tasks/contentpijplijn-publicatiewaardig.md):
 * tussen `content_plan` en `content_draft`.
 *
 * Drie routes:
 *   1. Er ligt al een strategie op precies deze invoer: hergebruiken, geen
 *      aanroep (conventie 9).
 *   2. Direct: één aanroep op Sol met denktijd hoog, duur vastgelegd.
 *   3. Achtergrond (`moetAchtergrond()`): de aanroep starten, het response-id in
 *      een vervolgtaak meegeven, en die haalt het resultaat op. Een nieuwe poging
 *      haalt op in plaats van opnieuw te starten.
 *
 * Daarna: de strategie bij de pagina bewaren, en óf wachten op een conflict
 * (`strategie-wacht.ts`), óf het schrijven inplannen.
 *
 * Lukt de strategie definitief niet (vierde poging, of OpenAI brak de
 * achtergrondaanroep af), dan schrijft de pagina zonder strategie, precies zoals
 * vóór WP3. Zelfde keuze als bij `content_plan`: dit is voorbereiding, het
 * schrijven is het product.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue } from "@/lib/jobs/queue";
import { dedupe } from "@/lib/jobs/dedupe";
import { MAX_ATTEMPTS, type JobPayloads } from "@/lib/jobs/types";
import type { Job } from "@/lib/types/database";
import {
  callStructured,
  startStructuredAchtergrond,
  haalStructuredOp,
} from "@/lib/openai/structured";
import {
  moetAchtergrond,
  ophaalVertragingSeconden,
  ACHTERGROND_VENSTER,
  MAX_OPHAALPOGINGEN,
} from "@/lib/openai/achtergrond";
import {
  bereidStrategieVoor,
  strategieOpties,
  verwerkStrategie,
  STRATEGIE_KIND,
  type StrategieRecord,
  type StrategieVoorbereiding,
} from "@/lib/pipeline/page-strategy";
import { zetWacht } from "@/lib/pipeline/strategie-wacht";
import type { RecommendationInput } from "@/lib/pipeline/content";

type Admin = SupabaseClient;
type Payload = JobPayloads["content_strategy"];

/** De recentste gemeten duren van één soort aanroep, voor het achtergrondbesluit. */
export async function recenteDuren(admin: Admin, kind: string): Promise<number[]> {
  const { data } = await admin
    .from("ai_calls")
    .select("duration_ms")
    .eq("kind", kind)
    .not("duration_ms", "is", null)
    .order("created_at", { ascending: false })
    .limit(ACHTERGROND_VENSTER);
  return ((data ?? []) as { duration_ms: number | null }[])
    .map((r) => r.duration_ms)
    .filter((d): d is number => typeof d === "number");
}

/** Wat een vervolgtaak nodig heeft om het resultaat te verwerken. */
type OpgeslagenVoorbereiding = Omit<StrategieVoorbereiding, "bestaand">;

export async function draaiStrategietaak(
  admin: Admin,
  job: Job,
  payload: Payload,
  rec: RecommendationInput,
): Promise<void> {
  if (!job.analysis_id) throw new Error("content_strategy zonder analysis_id.");
  const analysisId = job.analysis_id;

  // ── Route 3b: een achtergrondaanroep ophalen ──────────────────────────────
  if (payload.ophalen) {
    const v = payload.ophalen.voorbereiding as OpgeslagenVoorbereiding;
    const uitkomst = await haalStructuredOp(payload.ophalen.responseId, strategieOpties(v), payload.ophalen.gestartOp);
    if (uitkomst.stand === "bezig") {
      const poging = payload.ophalen.poging + 1;
      if (poging > MAX_OPHAALPOGINGEN) {
        console.warn(`Strategie ${payload.ophalen.responseId} bleef na ${poging} pogingen bezig; schrijven zonder strategie.`);
        await planSchrijven(admin, job, analysisId, payload, null);
        return;
      }
      await enqueue(admin, {
        type: "content_strategy",
        payload: { ...payload, ophalen: { ...payload.ophalen, poging } },
        analysisId,
        dedupeKey: dedupe.contentStrategyOphalen(payload.ophalen.responseId, poging),
        scheduledFor: new Date(Date.now() + ophaalVertragingSeconden(poging) * 1000),
      });
      return;
    }
    if (uitkomst.stand === "mislukt") {
      console.warn(`Strategie ${payload.ophalen.responseId} mislukt (${uitkomst.fout}); schrijven zonder strategie.`);
      await planSchrijven(admin, job, analysisId, payload, null);
      return;
    }
    const duur = Date.now() - new Date(payload.ophalen.gestartOp).getTime();
    const record = verwerkStrategie(v, uitkomst.result.parsed, { duurMs: duur, achtergrond: true, feitIds: v.feitIds });
    logDuur(rec.title, record);
    await rondAf(admin, job, analysisId, payload, v.pieceId, record);
    return;
  }

  let v: StrategieVoorbereiding;
  try {
    v = await bereidStrategieVoor(admin, {
      analysisId,
      userId: payload.userId,
      recommendation: rec,
      voorbereid: payload.voorbereid
        ? {
            contract: (payload.voorbereid.contract ?? null) as never,
            dossier: (payload.voorbereid.dossier ?? null) as never,
            explainers: (payload.voorbereid.explainers ?? []) as never,
            existingText: payload.voorbereid.existingText ?? null,
            existingFetchedAt: payload.voorbereid.existingFetchedAt ?? null,
          }
        : null,
    });
  } catch (err) {
    if (job.attempts < MAX_ATTEMPTS - 1) throw err;
    console.warn(`Strategie voor "${rec.title}" kon niet voorbereid worden; schrijven zonder: ${String(err)}`);
    await planSchrijven(admin, job, analysisId, payload, null);
    return;
  }

  // ── Route 1: hergebruiken ─────────────────────────────────────────────────
  if (v.bestaand && !payload.regenerate) {
    console.log(`Strategie "${rec.title}": hergebruikt, geen nieuwe aanroep.`);
    await rondAf(admin, job, analysisId, payload, v.pieceId, v.bestaand);
    return;
  }

  // ── Route 3a: in de achtergrond starten ───────────────────────────────────
  if (moetAchtergrond(STRATEGIE_KIND, await recenteDuren(admin, STRATEGIE_KIND))) {
    const { responseId } = await startStructuredAchtergrond(strategieOpties(v));
    const { bestaand: _weg, ...rest } = v;
    void _weg;
    await enqueue(admin, {
      type: "content_strategy",
      payload: {
        ...payload,
        ophalen: { responseId, gestartOp: new Date().toISOString(), poging: 0, voorbereiding: rest },
      },
      analysisId,
      dedupeKey: dedupe.contentStrategyOphalen(responseId, 0),
      scheduledFor: new Date(Date.now() + ophaalVertragingSeconden(0) * 1000),
    });
    console.log(`Strategie "${rec.title}": in de achtergrond gestart (${responseId}).`);
    return;
  }

  // ── Route 2: direct ───────────────────────────────────────────────────────
  let record: StrategieRecord;
  try {
    const res = await callStructured(strategieOpties(v));
    record = verwerkStrategie(v, res.parsed, {
      duurMs: res.durationMs,
      achtergrond: false,
      feitIds: v.feitIds,
    });
  } catch (err) {
    if (job.attempts < MAX_ATTEMPTS - 1) throw err;
    console.warn(`Strategie voor "${rec.title}" bleef mislukken; schrijven zonder: ${String(err)}`);
    await planSchrijven(admin, job, analysisId, payload, null);
    return;
  }
  logDuur(rec.title, record);
  await rondAf(admin, job, analysisId, payload, v.pieceId, record);
}

/** De duur altijd in de log, naast `ai_calls.duration_ms` (aandachtspunt 1 van §13). */
function logDuur(titel: string, record: StrategieRecord): void {
  console.log(
    `Strategie "${titel}": ${record.duurMs == null ? "duur onbekend" : `${(record.duurMs / 1000).toFixed(1)}s`}` +
      `${record.achtergrond ? " (achtergrond)" : ""}, ${record.strategie.prioriteitsfeiten.length} prioriteitsfeiten, ` +
      `budget ${record.strategie.lengtebudget.woorden} woorden, ${record.correcties.length} correcties` +
      `${record.tegengehouden.length ? `, tegengehouden door ${record.tegengehouden.length === 1 ? "één conflict" : `${record.tegengehouden.length} conflicten`}` : ""}.`,
  );
}

async function rondAf(
  admin: Admin,
  job: Job,
  analysisId: string,
  payload: Payload,
  pieceId: string | null,
  record: StrategieRecord,
): Promise<void> {
  // Bij een nieuwe versie (`regenerate`) is de huidige rij de VORIGE versie: die
  // houdt zijn eigen strategie (conventie 8). De nieuwe rij krijgt de strategie
  // bij het schrijven, via de payload. Alleen om te kunnen wachten op een
  // conflict schrijven we hem toch op de huidige rij.
  if (pieceId && (!payload.regenerate || record.tegengehouden.length > 0)) {
    const { error } = await admin
      .from("content_pieces")
      .update({ strategy_json: record as never })
      .eq("id", pieceId);
    if (error) console.warn(`Strategie opslaan bij ${pieceId} mislukt: ${error.message}`);
  }

  // ── De conflictpoort ──────────────────────────────────────────────────────
  if (record.tegengehouden.length > 0) {
    if (pieceId) {
      await zetWacht(admin, pieceId, record, { ...payload, ophalen: undefined });
      console.log(
        `Pagina ${pieceId} wacht op tegenstrijdige feiten: ` +
          record.tegengehouden.map((t) => `${t.ref} (${t.soort})`).join(", "),
      );
      return;
    }
    // Zonder rij kan de pagina nergens wachten. De betwiste feiten staan niet op
    // de kaart (`zonderBetwisteFeiten`), dus schrijven zonder ze is veilig; de
    // adviseur ziet het conflict op zijn scherm.
    console.warn(`Strategie wil wachten op een conflict, maar de pagina heeft nog geen rij; schrijven zonder het feit.`);
  }

  await planSchrijven(admin, job, analysisId, payload, record);
}

async function planSchrijven(
  admin: Admin,
  job: Job,
  analysisId: string,
  payload: Payload,
  record: StrategieRecord | null,
): Promise<void> {
  await enqueue(admin, {
    type: "content_draft",
    payload: {
      userId: payload.userId,
      recommendation: payload.recommendation,
      regenerate: payload.regenerate ?? false,
      plannedPageId: payload.plannedPageId,
      voorbereid: payload.voorbereid
        ? { ...payload.voorbereid, strategie: record ?? undefined }
        : record
          ? { contract: null, dossier: null, explainers: [], strategie: record }
          : null,
    },
    analysisId,
    dedupeKey: dedupe.contentDraftNa(job.id),
  });
}
