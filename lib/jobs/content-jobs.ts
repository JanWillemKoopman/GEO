import "server-only";

/**
 * Contenttaken inplannen (optimalisatie.md 4.7/4.8/4.9).
 *
 * Eén plek, omdat er nu vier ingangen zijn die allemaal hetzelfde werk starten:
 * de knop per aanbeveling, "genereer alles", opnieuw genereren, en herschrijven
 * met feedback van de klant. Als die vier hun eigen payload in elkaar zetten,
 * lopen ze uit elkaar — en dan schrijft de ene ingang mét doelvragen en de
 * andere zonder, zonder dat iemand dat merkt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import type { RecommendationPayload } from "@/lib/jobs/types";
import type { StoredRecommendation } from "@/lib/pipeline/recommendation";
import type { ContentType, ContentAction } from "@/lib/types/database";

type Admin = SupabaseClient;

export const VALID_CONTENT_TYPES: ContentType[] = ["article", "faq", "landing", "comparison"];

/** Een opgeslagen aanbeveling → de payload van een schrijftaak. */
export function toPayload(
  rec: StoredRecommendation,
  reportId: string | null,
  revisionNote: string | null = null,
): RecommendationPayload {
  return {
    title: rec.title,
    type: VALID_CONTENT_TYPES.includes(rec.type) ? rec.type : "article",
    targetIntent: rec.targetIntent,
    why: rec.why,
    action: (rec.action === "verbeteren" ? "verbeteren" : "nieuw") as ContentAction,
    existingUrl: rec.existingUrl,
    reportId,
    targets: rec.targets,
    revisionNote,
  };
}

/**
 * De HUIDIGE versie van een pagina met deze titel.
 *
 * Sinds versiebeheer (4.7) kunnen er meerdere rijen met dezelfde titel zijn;
 * `maybeSingle()` op alleen de titel zou daar op klappen. Precies het soort
 * fout dat pas opduikt zodra iemand voor de tweede keer op "opnieuw" drukt.
 */
export async function currentPiece(
  admin: Admin,
  analysisId: string,
  title: string,
): Promise<{ id: string; status: string; version: number } | null> {
  const { data } = await admin
    .from("content_pieces")
    .select("id, status, version")
    .eq("analysis_id", analysisId)
    .eq("title", title)
    .eq("is_current", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: string; status: string; version: number } | null) ?? null;
}

export interface PlanResult {
  planned: number;
  skipped: number;
}

/**
 * Plant het schrijven van één pagina in.
 *
 * De dedupe-sleutel bevat de versie, zodat opnieuw genereren niet botst op de
 * sleutel van de vorige poging. Zonder dat zou "opnieuw proberen" na een
 * geslaagde generatie stil niets doen — de sleutel bestond immers al.
 */
export async function planContentDraft(
  admin: Admin,
  args: {
    analysisId: string;
    userId: string;
    recommendation: RecommendationPayload;
    regenerate?: boolean;
  },
): Promise<{ created: boolean; alreadyDone: boolean }> {
  const { analysisId, userId, recommendation, regenerate = false } = args;

  const existing = await currentPiece(admin, analysisId, recommendation.title);
  if (existing && existing.status !== "draft" && !regenerate) {
    return { created: false, alreadyDone: true };
  }

  const nextVersion = existing ? (regenerate ? existing.version + 1 : existing.version) : 1;

  const { created } = await enqueue(admin, {
    type: "content_draft",
    payload: { userId, recommendation, regenerate },
    analysisId,
    dedupeKey: `${dedupe.contentDraft(analysisId, recommendation.title)}:v${nextVersion}`,
  });

  return { created, alreadyDone: false };
}

/**
 * Alles in één klik (optimalisatie.md 4.9).
 *
 * De belofte van het product heet "1-click content generatie", maar het waren n
 * klikken over maximaal drie aanbevelingen. Met de werkverdeler uit fase 1 kan
 * dat gewoon in één keer: alle aanbevelingen als losse taken in de rij. De
 * werker pakt ze één voor één op, dus dit legt niets plat en de klant kan het
 * scherm sluiten.
 */
export async function planAllRecommendations(
  admin: Admin,
  args: {
    analysisId: string;
    userId: string;
    reportId: string | null;
    recommendations: StoredRecommendation[];
  },
): Promise<PlanResult> {
  let planned = 0;
  let skipped = 0;

  for (const rec of args.recommendations) {
    if (!rec.title?.trim()) continue;
    const { created, alreadyDone } = await planContentDraft(admin, {
      analysisId: args.analysisId,
      userId: args.userId,
      recommendation: toPayload(rec, args.reportId),
    });
    if (created) planned++;
    else if (alreadyDone) skipped++;
  }

  return { planned, skipped };
}
