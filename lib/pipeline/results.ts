import "server-only";

/**
 * Het resultaat samenvatten (optimalisatie.md 5.6/5.7).
 *
 * Eén plek, want dezelfde cijfers verschijnen op het overzicht, in de trechter
 * en in de export. Drie losse berekeningen zouden gegarandeerd uit elkaar gaan
 * lopen, en niets ondermijnt vertrouwen sneller dan twee schermen die een ander
 * getal noemen over hetzelfde.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentImpact, ContentPiece } from "@/lib/types/database";

type Db = SupabaseClient;

export interface PieceResult {
  pieceId: string;
  title: string;
  publishedAt: string;
  publishedUrl: string | null;
  /** De laatste golf die berekend is — golf 2 als die er is, anders golf 1. */
  impact: ContentImpact | null;
}

export interface ResultsSummary {
  /** Publicatietrechter (5.7): waar blijven de pagina's steken? */
  funnel: {
    generated: number;
    /** Klaar en zonder openstaande opmerkingen. */
    reviewed: number;
    published: number;
    /** Gepubliceerd én met een berekend effect. */
    measured: number;
  };
  pieces: PieceResult[];
  /** Opgeteld over alle gemeten pagina's — het getal voor bovenaan. */
  totals: {
    publishedPages: number;
    targetQuestions: number;
    beforeMentioned: number;
    afterMentioned: number;
    /** Gemiddelde verandering op de controlegroep, of null als die er niet is. */
    controlDelta: number | null;
  } | null;
}

export async function loadResults(db: Db, analysisId: string): Promise<ResultsSummary> {
  const [{ data: pieceRows }, { data: impactRows }] = await Promise.all([
    db
      .from("content_pieces")
      .select("id, title, status, needs_review, published_at, published_url, is_current")
      .eq("analysis_id", analysisId)
      .eq("is_current", true),
    db.from("content_impact").select("*").eq("analysis_id", analysisId),
  ]);

  const pieces = (pieceRows ?? []) as Pick<
    ContentPiece,
    "id" | "title" | "status" | "needs_review" | "published_at" | "published_url" | "is_current"
  >[];
  const impacts = (impactRows ?? []) as ContentImpact[];

  // Per pagina de LAATSTE golf: golf 2 zegt meer dan golf 1, want AI-systemen
  // pikken content niet in twee weken volledig op.
  const latestByPiece = new Map<string, ContentImpact>();
  for (const i of impacts.sort((a, b) => a.wave - b.wave)) {
    latestByPiece.set(i.content_piece_id, i);
  }

  const published = pieces.filter((p) => p.published_at);
  const results: PieceResult[] = published
    .map((p) => ({
      pieceId: p.id,
      title: p.title,
      publishedAt: p.published_at!,
      publishedUrl: p.published_url,
      impact: latestByPiece.get(p.id) ?? null,
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const funnel = {
    generated: pieces.length,
    // "Nagekeken" = klaar en zonder openstaande opmerkingen. Een pagina met
    // "even nakijken" is nog niet klaar om de deur uit te gaan.
    reviewed: pieces.filter((p) => p.status !== "draft" && !p.needs_review).length,
    published: published.length,
    measured: results.filter((r) => r.impact && r.impact.verdict !== "te_weinig_data").length,
  };

  const measured = results.filter((r) => r.impact && r.impact.target_total > 0);
  const totals =
    measured.length === 0
      ? null
      : {
          publishedPages: measured.length,
          targetQuestions: measured.reduce((n, r) => n + r.impact!.target_total, 0),
          beforeMentioned: measured.reduce((n, r) => n + r.impact!.target_before_mentioned, 0),
          afterMentioned: measured.reduce((n, r) => n + r.impact!.target_after_mentioned, 0),
          controlDelta: averageControlDelta(measured),
        };

  return { funnel, pieces: results, totals };
}

/**
 * De gemiddelde verandering op de controlegroep.
 *
 * Gewogen naar het aantal controlevragen, niet als plat gemiddelde van
 * percentages: een pagina met vijf controlevragen zegt meer dan een met één, en
 * die even zwaar laten tellen zou het cijfer laten bepalen door de kleinste
 * steekproef.
 */
function averageControlDelta(results: PieceResult[]): number | null {
  const withControl = results.filter((r) => r.impact && r.impact.control_total > 0);
  if (withControl.length === 0) return null;

  const totalQuestions = withControl.reduce((n, r) => n + r.impact!.control_total, 0);
  if (totalQuestions === 0) return null;

  const weighted = withControl.reduce(
    (sum, r) => sum + Number(r.impact!.control_delta ?? 0) * r.impact!.control_total,
    0,
  );
  return Math.round((weighted / totalQuestions) * 10) / 10;
}
