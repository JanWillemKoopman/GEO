import "server-only";

/**
 * De trend over de periodes (optimalisatie.md 6.4).
 *
 * Eén query-set voor de hele grafiek. Per periode: de score, de gewogen score,
 * de bandbreedte en het aandeel — plus de concurrentlijnen en de momenten waarop
 * er iets gepubliceerd is. Die laatste maken van een grafiek een verhaal:
 * zonder markering is een stijging een toevalligheid, met markering een gevolg.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { confidenceBand } from "@/lib/stats/uncertainty";
import type { VisibilityScore, CompetitorBreakdown } from "@/lib/types/database";

type Db = SupabaseClient;

export interface TrendPoint {
  weekNo: number;
  /** Het leidende getal: de gewogen score als die er is, anders de ongewogen. */
  score: number;
  weighted: number | null;
  unweighted: number;
  /** Onder- en bovengrens van de 95%-band, voor de schaduw om de lijn. */
  low: number;
  high: number;
  shareOfVoice: number | null;
  judgedRuns: number | null;
  measuredAt: string | null;
}

export interface TrendCompetitor {
  name: string;
  /** Per periode het percentage van de metingen waarin dit merk voorkwam. */
  points: { weekNo: number; percent: number }[];
}

export interface PublicationMarker {
  weekNo: number;
  titles: string[];
}

export interface TrendData {
  points: TrendPoint[];
  competitors: TrendCompetitor[];
  publications: PublicationMarker[];
}

/** Hoeveel concurrentlijnen we tekenen. Meer is een kluwen, geen grafiek. */
const MAX_COMPETITOR_LINES = 3;

export async function loadTrend(db: Db, analysisId: string): Promise<TrendData> {
  const [{ data: scoreRows }, { data: breakdownRows }, { data: runRows }, { data: pieceRows }] =
    await Promise.all([
      db.from("visibility_scores").select("*").eq("analysis_id", analysisId).order("week_no"),
      db.from("competitor_breakdown").select("*").eq("analysis_id", analysisId).order("week_no"),
      // Wanneer elke periode gemeten is, en met hoeveel vragen — dat laatste is
      // de noemer voor de concurrentpercentages.
      db
        .from("tracking_runs")
        .select("week_no, ran_at")
        .eq("analysis_id", analysisId)
        .eq("purpose", "periodic"),
      db
        .from("content_pieces")
        .select("title, published_at")
        .eq("analysis_id", analysisId)
        .not("published_at", "is", null),
    ]);

  const scores = (scoreRows ?? []) as VisibilityScore[];
  const breakdown = (breakdownRows ?? []) as CompetitorBreakdown[];
  const runs = (runRows ?? []) as { week_no: number; ran_at: string }[];

  // Per periode: hoeveel metingen, en wanneer de laatste liep. Dat tweede is de
  // datum die op de x-as hoort — een periode-index zegt de klant niets.
  const runsPerWeek = new Map<number, { count: number; last: string }>();
  for (const r of runs) {
    const cur = runsPerWeek.get(r.week_no);
    if (!cur) runsPerWeek.set(r.week_no, { count: 1, last: r.ran_at });
    else {
      cur.count++;
      if (r.ran_at > cur.last) cur.last = r.ran_at;
    }
  }

  const points: TrendPoint[] = scores.map((s) => {
    const lead = s.weighted_score ?? s.score;
    const stderr = (s.weighted_score != null ? s.weighted_stderr : s.score_stderr) ?? 0;
    const band = confidenceBand(lead, Number(stderr));
    return {
      weekNo: s.week_no,
      score: Math.round(lead),
      weighted: s.weighted_score,
      unweighted: Math.round(s.score),
      low: band.low,
      high: band.high,
      shareOfVoice: s.share_of_voice,
      judgedRuns: s.judged_runs,
      measuredAt: runsPerWeek.get(s.week_no)?.last ?? null,
    };
  });

  // ── Concurrentlijnen (6.6) ────────────────────────────────────────────────
  // "Ik loop in" is een sterker signaal dan een absoluut getal, dus de
  // concurrenten horen in dezelfde grafiek. We kiezen degene die over alle
  // periodes samen het vaakst genoemd zijn — dat zijn de merken die ertoe doen,
  // niet degene die één keer toevallig langskwamen.
  const totalByName = new Map<string, number>();
  for (const b of breakdown) {
    totalByName.set(b.competitor_name, (totalByName.get(b.competitor_name) ?? 0) + b.mentions_count);
  }
  const topNames = Array.from(totalByName.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_COMPETITOR_LINES)
    .map(([name]) => name);

  const competitors: TrendCompetitor[] = topNames.map((name) => ({
    name,
    points: breakdown
      .filter((b) => b.competitor_name === name)
      .map((b) => {
        const denominator = runsPerWeek.get(b.week_no)?.count ?? 0;
        return {
          weekNo: b.week_no,
          // Afkappen op 100: ook met de juiste noemer kan een merk theoretisch
          // vaker geteld worden dan er metingen zijn.
          percent: denominator > 0 ? Math.min(100, Math.round((b.mentions_count / denominator) * 100)) : 0,
        };
      })
      .sort((a, b) => a.weekNo - b.weekNo),
  }));

  // ── Publicatiemomenten (6.5) ──────────────────────────────────────────────
  // Aan de periode gekoppeld waarin ze vallen: gepubliceerd ná de meting van
  // periode 2 hoort bij periode 2, want dat is waar de lijn hem laat zien.
  const publications = groupPublications(
    (pieceRows ?? []) as { title: string; published_at: string }[],
    points,
  );

  return { points, competitors, publications };
}

function groupPublications(
  pieces: { title: string; published_at: string }[],
  points: TrendPoint[],
): PublicationMarker[] {
  if (pieces.length === 0 || points.length === 0) return [];

  const byWeek = new Map<number, string[]>();
  for (const piece of pieces) {
    // De laatste periode die vóór de publicatie gemeten is; daarna wordt het
    // effect zichtbaar.
    const week =
      points
        .filter((p) => p.measuredAt && p.measuredAt <= piece.published_at)
        .map((p) => p.weekNo)
        .pop() ?? points[0].weekNo;

    byWeek.set(week, [...(byWeek.get(week) ?? []), piece.title]);
  }

  return Array.from(byWeek.entries())
    .map(([weekNo, titles]) => ({ weekNo, titles }))
    .sort((a, b) => a.weekNo - b.weekNo);
}
