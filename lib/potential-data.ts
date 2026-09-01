import "server-only";

/**
 * Ophaalkant van de potentiescore (docs/tasks/potentiescore.md). De rekenkant
 * staat in `lib/potential.ts`, zonder `server-only`, conventie 2.
 */
import { visibilityIndex, potentialScore, isConfident, type PotentialTriple } from "@/lib/potential";
import { binomialStderr } from "@/lib/stats/uncertainty";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type { PotentialTriple };

const LEEG: PotentialTriple = { visibility: null, volume: null, potential: null, confident: true };

/**
 * De drie getallen op ANALYSE-niveau (= onderwerp-niveau, want één analyse
 * hoort al bij precies één `profile_topics`-rij).
 *
 * Zichtbaarheid komt van `visibility_scores.score`, de ONGEWOGEN score (niet
 * `weighted_score`, die is al vermenigvuldigd met de grove volumeband en zou
 * het zoekvolume dubbel laten meetellen, zie de uitleg boven `lib/potential.ts`).
 */
export async function loadAnalysisPotential(
  admin: Admin,
  analysisId: string,
): Promise<PotentialTriple> {
  const [{ data: scoreRow }, volume] = await Promise.all([
    admin
      .from("visibility_scores")
      .select("score, score_stderr")
      .eq("analysis_id", analysisId)
      .order("week_no", { ascending: false })
      .limit(1)
      .maybeSingle(),
    volumeIndexOfAnalysis(admin, analysisId),
  ]);

  const visibility = (scoreRow?.score as number | null | undefined) ?? null;
  const stderr = (scoreRow?.score_stderr as number | null | undefined) ?? null;
  return {
    visibility,
    volume,
    potential: potentialScore(visibility, volume),
    confident: isConfident(stderr),
  };
}

/**
 * De drie getallen op CONTENT-niveau, voor één AL GESCHREVEN pagina
 * (`content_pieces`).
 *
 * Zoekvolume erft de pagina van haar onderwerp: twee pagina's over hetzelfde
 * onderwerp worden even vaak gezocht, zie de derde keuze in
 * docs/tasks/potentiescore.md §5. Zichtbaarheid wordt wél apart berekend, en
 * dat is het punt: twee pagina's binnen hetzelfde onderwerp targeten andere
 * vragen en kunnen dus een ander winpercentage hebben.
 */
export async function loadContentPotential(
  admin: Admin,
  contentPieceId: string,
): Promise<PotentialTriple> {
  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select("analysis_id")
    .eq("id", contentPieceId)
    .maybeSingle();
  const analysisId = pieceRow?.analysis_id as string | undefined;
  if (!analysisId) return LEEG;

  const { data: targetRows } = await admin
    .from("content_piece_targets")
    .select("prompt_id")
    .eq("content_piece_id", contentPieceId);
  const promptIds = uniquePromptIds((targetRows ?? []) as { prompt_id: string | null }[]);

  return loadPotentialForTargets(admin, analysisId, promptIds);
}

/**
 * De drie getallen voor een VOORGESTELDE pagina, vóórdat er een
 * `content_pieces`-rij bestaat (hoofdstuk 03, "Pagina's die ORBIT ENGINE voor je
 * schrijft"). Zelfde berekening als `loadContentPotential()`, alleen de bron
 * van de doelvragen is hier `RecommendationTarget[]` uit het rapport in plaats
 * van `content_piece_targets`.
 */
export async function loadRecommendationPotential(
  admin: Admin,
  analysisId: string,
  promptIds: (string | null)[],
): Promise<PotentialTriple> {
  return loadPotentialForTargets(admin, analysisId, uniquePromptIds(promptIds.map((prompt_id) => ({ prompt_id }))));
}

function uniquePromptIds(rows: { prompt_id: string | null }[]): string[] {
  return [...new Set(rows.map((t) => t.prompt_id).filter((id): id is string => Boolean(id)))];
}

async function volumeIndexOfAnalysis(admin: Admin, analysisId: string): Promise<number | null> {
  const { data: topicRow } = await admin
    .from("profile_topics")
    .select("search_volume_index")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  return (topicRow?.search_volume_index as number | null | undefined) ?? null;
}

/**
 * Gedeelde kern: gegeven een analyse en een set doelvragen, hoe zichtbaar is
 * dit merk daar nu, en wat is de potentie.
 */
async function loadPotentialForTargets(
  admin: Admin,
  analysisId: string,
  promptIds: string[],
): Promise<PotentialTriple> {
  const volume = await volumeIndexOfAnalysis(admin, analysisId);
  if (promptIds.length === 0) return { ...LEEG, volume };

  // Alleen de meest recente periodieke meting telt, dezelfde begrenzing als de
  // wekelijkse aggregatie (computeAggregates): impact- en controlemetingen
  // gaan over een handvol vragen en horen hier niet bij.
  const { data: scoreRow } = await admin
    .from("visibility_scores")
    .select("week_no")
    .eq("analysis_id", analysisId)
    .order("week_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const laatsteWeek = scoreRow?.week_no as number | undefined;
  if (laatsteWeek === undefined) return { ...LEEG, volume };

  const { data: runRows } = await admin
    .from("tracking_runs")
    .select("id, prompt_id")
    .eq("analysis_id", analysisId)
    .eq("week_no", laatsteWeek)
    .eq("purpose", "periodic")
    .in("prompt_id", promptIds);
  const runs = (runRows ?? []) as { id: string; prompt_id: string | null }[];
  if (runs.length === 0) return { ...LEEG, volume };

  const { data: mentionRows } = await admin
    .from("tracking_run_mentions")
    .select("tracking_run_id, mentioned")
    .in(
      "tracking_run_id",
      runs.map((r) => r.id),
    )
    .eq("is_own_brand", true);
  const mentionedByRun = new Map(
    ((mentionRows ?? []) as { tracking_run_id: string; mentioned: boolean }[]).map((m) => [
      m.tracking_run_id,
      m.mentioned,
    ]),
  );

  // Eén oordeel per vraag. Wordt een vraag toevallig twee keer gemeten in
  // dezelfde week, dan wint "genoemd" van "niet genoemd" (zelfde regel als
  // measure.ts): een gemiste beoordeling mag een echte winst niet wegstrepen.
  const perPrompt = new Map<string, boolean>();
  for (const r of runs) {
    if (!r.prompt_id) continue;
    const mentioned = mentionedByRun.get(r.id) ?? false;
    const huidig = perPrompt.get(r.prompt_id);
    if (huidig === undefined || (mentioned && !huidig)) perPrompt.set(r.prompt_id, mentioned);
  }

  const total = promptIds.filter((id) => perPrompt.has(id)).length;
  const mentionedCount = [...perPrompt.values()].filter(Boolean).length;
  const visibility = visibilityIndex(mentionedCount, total);
  // Dezelfde standaardfout als bij de score van een heel onderwerp
  // (measure.ts), nu over de enkele doelvragen van déze kans, meestal een veel
  // kleinere steekproef en dus een terecht bredere band.
  const stderr = total > 0 ? binomialStderr(mentionedCount, total) : null;
  return {
    visibility,
    volume,
    potential: potentialScore(visibility, volume),
    confident: isConfident(stderr),
  };
}
