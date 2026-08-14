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
 * hetzelfde item. Dat waren voorheen twee losse waarheden.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { changeIsMeaningful } from "@/lib/stats/uncertainty";
import { loadWorkAcross, type WorkItem } from "@/lib/work";
import { readRecommendations } from "@/lib/pipeline/recommendation";
import type { Analysis, VisibilityScore } from "@/lib/types/database";

type Db = SupabaseClient;

/**
 * De vier kerncijfers per analyse op het kaartje in "Mijn analyses" (abcplan.md
 * §3.4, herzien): zichtbaarheidsscore, openstaande vragen, voorgestelde en
 * geschreven pagina's, plus het aantal metingen dat eraan ten grondslag ligt.
 * `null` betekent "nog niet meetbaar", niet "nul".
 */
export interface AnalysisCardMetrics {
  visibilityScore: number | null;
  openQuestions: number | null;
  suggestedArticles: number;
  writtenArticles: number;
  measurementCount: number;
}

export interface DashboardData {
  analyses: Analysis[];
  /** Al het werk, over alle analyses heen, hetzelfde model als in het dossier. */
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
  /** De kaartcijfers van 3.4, per analyse-id. */
  cardMetrics: Record<string, AnalysisCardMetrics>;
}

export async function loadDashboard(db: Db, userId: string): Promise<DashboardData> {
  const { analyses, work } = await loadWorkAcross(db, userId);

  if (analyses.length === 0) {
    return {
      analyses,
      work,
      stats: { publishedThisMonth: 0, waitingToPublish: 0, openOffsiteTasks: 0 },
      biggestChange: null,
      cardMetrics: {},
    };
  }

  const ids = analyses.map((a) => a.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: pieceRows }, { data: scoreRows }, { data: reportRows }] = await Promise.all([
    db
      .from("content_pieces")
      .select("analysis_id, title, status, published_at")
      .in("analysis_id", ids)
      .eq("is_current", true),
    db.from("visibility_scores").select("*").in("analysis_id", ids).order("week_no"),
    db
      .from("reports")
      .select("analysis_id, week_no, recommendations_json")
      .in("analysis_id", ids)
      .order("week_no"),
  ]);

  const pieces = pieceRows ?? [];
  const scores = (scoreRows ?? []) as VisibilityScore[];

  let publishedThisMonth = 0;
  let waitingToPublish = 0;
  for (const p of pieces) {
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
    biggestChange: findBiggestChange(scores, new Map(analyses.map((a) => [a.id, a]))),
    cardMetrics: buildCardMetrics(
      ids,
      pieces,
      scores,
      (reportRows ?? []) as { analysis_id: string; week_no: number; recommendations_json: unknown }[],
    ),
  };
}

/**
 * Per analyse de vier kaartcijfers + het aantal metingen, dezelfde bronnen als
 * hoofdstuk 03 van het dossier (`lib/work.ts`), maar dan de laatste stand in
 * plaats van de losse werkpunten, zodat het kaartje nooit iets anders beweert
 * dan de analyse zelf verderop laat zien.
 */
function buildCardMetrics(
  ids: string[],
  pieces: { analysis_id: string; title: string; status: string }[],
  scores: VisibilityScore[],
  reports: { analysis_id: string; week_no: number; recommendations_json: unknown }[],
): Record<string, AnalysisCardMetrics> {
  const piecesByAnalysis = new Map<string, typeof pieces>();
  for (const p of pieces) {
    piecesByAnalysis.set(p.analysis_id, [...(piecesByAnalysis.get(p.analysis_id) ?? []), p]);
  }

  const scoresByAnalysis = new Map<string, VisibilityScore[]>();
  for (const s of scores) {
    scoresByAnalysis.set(s.analysis_id, [...(scoresByAnalysis.get(s.analysis_id) ?? []), s]);
  }

  // Laatste rapport per analyse, eerdere aanbevelingen zijn achterhaald zodra
  // er opnieuw gemeten is (zie ook `_chapters/werk.tsx`).
  const latestReportByAnalysis = new Map<string, (typeof reports)[number]>();
  for (const r of reports) {
    const current = latestReportByAnalysis.get(r.analysis_id);
    if (!current || r.week_no > current.week_no) latestReportByAnalysis.set(r.analysis_id, r);
  }

  const result: Record<string, AnalysisCardMetrics> = {};

  for (const id of ids) {
    const ownPieces = piecesByAnalysis.get(id) ?? [];
    // 'briefing' heeft nog geen tekst, pas daarna telt een pagina als geschreven
    // (zie lib/jobs/content-jobs.ts, planContentDraft).
    const writtenArticles = ownPieces.filter((p) => p.status !== "briefing").length;

    const report = latestReportByAnalysis.get(id);
    const recommendations = report ? readRecommendations(report.recommendations_json) : [];
    const generatedTitles = new Set(ownPieces.filter((p) => p.status !== "draft").map((p) => p.title));
    const suggestedArticles = recommendations.filter((r) => !generatedTitles.has(r.title)).length;

    const ownScores = [...(scoresByAnalysis.get(id) ?? [])].sort((a, b) => a.week_no - b.week_no);
    const latest = ownScores[ownScores.length - 1] ?? null;

    let openQuestions: number | null = null;
    if (latest && latest.winnable_runs != null) {
      // score = % van de winnable_runs waarin het merk genoemd wordt (ongewogen,
      // zie VisibilityScore.score), omgekeerd terug te rekenen naar een telling
      // zonder een aparte query op tracking_run_mentions nodig te hebben.
      const mentioned = Math.round((latest.score / 100) * latest.winnable_runs);
      openQuestions = Math.max(0, latest.winnable_runs - mentioned);
    }

    result[id] = {
      visibilityScore: latest ? (latest.weighted_score ?? latest.score) : null,
      openQuestions,
      suggestedArticles,
      writtenArticles,
      measurementCount: ownScores.length,
    };
  }

  return result;
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
        analysisName: byAnalysis.get(analysisId)?.name ?? "Cluster",
        delta: change.delta,
      };
    }
  }

  return best;
}
