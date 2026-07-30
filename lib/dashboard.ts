import "server-only";

/**
 * Eén overzicht over alle analyses heen (optimalisatie.md bijlage A10).
 *
 * Alles was per analyse: elke analyse had een eigen bibliotheek, eigen rapport,
 * eigen score. Een klant met drie analyses had geen enkel scherm dat antwoord
 * gaf op de enige vraag waarmee hij inlogt: *"hoe sta ik ervoor en wat moet ik
 * deze week doen?"*
 *
 * Sinds het werkmodel (`lib/work.ts`) leidt dit bestand het werk niet meer zelf
 * af. Het is een dunne bovenlaag: het werk komt uit `loadWorkAcross()`, hier
 * komen alleen de cijfers bij die je pas over analyses heen kunt berekenen.
 * Zo kan het dashboard niet meer iets anders zeggen dan het dossier zegt over
 * hetzelfde item — dat waren voorheen twee losse waarheden.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { changeIsMeaningful } from "@/lib/stats/uncertainty";
import { loadWorkAcross, type WorkItem } from "@/lib/work";
import type { Analysis, VisibilityScore } from "@/lib/types/database";

type Db = SupabaseClient;

export interface DashboardData {
  analyses: Analysis[];
  /** Al het werk, over alle analyses heen — hetzelfde model als in het dossier. */
  work: WorkItem[];
  stats: {
    /** Pagina's die deze maand live zijn gegaan. */
    publishedThisMonth: number;
    /** Klaargezette pagina's die nog niet gepubliceerd zijn. */
    waitingToPublish: number;
    /** Openstaande off-site taken. */
    openOffsiteTasks: number;
  };
  /** De grootste betekenisvolle verandering over alle analyses heen. */
  biggestChange: {
    analysisId: string;
    analysisName: string;
    delta: number;
  } | null;
}

export async function loadDashboard(db: Db, userId: string): Promise<DashboardData> {
  const { analyses, work } = await loadWorkAcross(db, userId);

  if (analyses.length === 0) {
    return {
      analyses,
      work,
      stats: { publishedThisMonth: 0, waitingToPublish: 0, openOffsiteTasks: 0 },
      biggestChange: null,
    };
  }

  const ids = analyses.map((a) => a.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: pieceRows }, { data: scoreRows }] = await Promise.all([
    db
      .from("content_pieces")
      .select("status, published_at")
      .in("analysis_id", ids)
      .eq("is_current", true),
    db.from("visibility_scores").select("*").in("analysis_id", ids).order("week_no"),
  ]);

  let publishedThisMonth = 0;
  let waitingToPublish = 0;
  for (const p of pieceRows ?? []) {
    if (p.published_at) {
      if (new Date(p.published_at as string) >= monthStart) publishedThisMonth++;
    } else if (p.status === "ready") {
      waitingToPublish++;
    }
  }

  return {
    analyses,
    work,
    stats: {
      publishedThisMonth,
      waitingToPublish,
      openOffsiteTasks: work.filter((w) => w.kind === "offsite" && w.state === "nu").length,
    },
    biggestChange: findBiggestChange(
      (scoreRows ?? []) as VisibilityScore[],
      new Map(analyses.map((a) => [a.id, a])),
    ),
  };
}

/**
 * De grootste BETEKENISVOLLE verandering over alle analyses heen.
 *
 * Betekenisvol, niet grootst: een sprong van veertig punten op een analyse met
 * vijf vragen is ruis, en die bovenaan een dashboard zetten is het tegendeel van
 * informeren. Dezelfde drempel als overal elders (2.3).
 */
function findBiggestChange(
  scores: VisibilityScore[],
  byAnalysis: Map<string, Analysis>,
): DashboardData["biggestChange"] {
  const byAnalysisId = new Map<string, VisibilityScore[]>();
  for (const s of scores) {
    byAnalysisId.set(s.analysis_id, [...(byAnalysisId.get(s.analysis_id) ?? []), s]);
  }

  let best: DashboardData["biggestChange"] = null;

  for (const [analysisId, list] of byAnalysisId) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.week_no - b.week_no);
    const current = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];

    const lead = (s: VisibilityScore) => s.weighted_score ?? s.score;
    const stderr = (s: VisibilityScore) =>
      (s.weighted_score != null ? s.weighted_stderr : s.score_stderr) ?? 0;

    const change = changeIsMeaningful(
      { score: lead(current), stderr: stderr(current) },
      { score: lead(previous), stderr: stderr(previous) },
    );
    if (!change.changed) continue;

    if (!best || Math.abs(change.delta) > Math.abs(best.delta)) {
      best = {
        analysisId,
        analysisName: byAnalysis.get(analysisId)?.name ?? "Analyse",
        delta: change.delta,
      };
    }
  }

  return best;
}
