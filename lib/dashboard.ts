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
 * af. Het is een dunne bovenlaag: het werk komt uit `loadBrandWork()`, hier
 * komen alleen de cijfers bij die je pas over analyses heen kunt berekenen.
 * Zo kan het dashboard niet meer iets anders zeggen dan het dossier zegt over
 * hetzelfde item. Dat waren voorheen twee losse waarheden.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadBrandWork, type WorkItem } from "@/lib/work";
import { readRecommendations } from "@/lib/pipeline/recommendation";
import type { Analysis, VisibilityScore } from "@/lib/types/database";

type Db = SupabaseClient;

/**
 * De vier kerncijfers per analyse op het kaartje in "Mijn analyses" (abcplan.md
 * §3.4, herzien): zichtbaarheidsscore, aantal zoekopdrachten, voorgestelde en
 * geschreven pagina's, plus het aantal metingen dat eraan ten grondslag ligt.
 * `null` betekent "nog niet meetbaar", niet "nul".
 */
export interface AnalysisCardMetrics {
  visibilityScore: number | null;
  /**
   * Hoeveel verschillende prompts de laatste meting van dit cluster gebruikte.
   * Stond hier eerder als "openstaande vragen" (`winnable_runs - mentioned`),
   * maar dat cijfer botste met de gelijknamige, echte vragenlijst op
   * `/merk/[id]/strategie/vragen`: twee heel verschillende dingen onder
   * hetzelfde woord op hetzelfde scherm. `null` zolang er niet gemeten is.
   */
  searchQueries: number | null;
  suggestedArticles: number;
  writtenArticles: number;
  measurementCount: number;
}

export interface DashboardData {
  analyses: Analysis[];
  /** Al het werk binnen dit merk, hetzelfde model als in het dossier. */
  work: WorkItem[];
  /**
   * ⚠️ Hier stonden `stats` en `biggestChange`: drie tellingen en de grootste
   * verandering, allebei OVER ALLE MERKEN HEEN. Ze werden getoond door
   * `DashboardStats` op de losse clusterlijst, en die lijst is op 27 augustus
   * 2026 een doorverwijzing geworden. Daarmee waren het aggregaten zonder
   * scherm, en een aggregaat over merken heen dat blijft rondslingeren is
   * precies wat er per ongeluk terugkomt op een klantscherm. De git-historie
   * is het archief.
   */
  /** De kaartcijfers van 3.4, per analyse-id. */
  cardMetrics: Record<string, AnalysisCardMetrics>;
}

/**
 * ⚠️ Per merk, en het merk is verplicht. Zie `loadBrandWork()` voor het waarom:
 * een klant ziet nooit gegevens van meer dan één merk tegelijk, en die regel
 * hoort in de query te staan en niet in een filter op het scherm.
 */
export async function loadDashboard(
  db: Db,
  userId: string,
  profileId: string,
): Promise<DashboardData> {
  const { analyses, work } = await loadBrandWork(db, userId, profileId);

  if (analyses.length === 0) {
    return { analyses, work, cardMetrics: {} };
  }

  const ids = analyses.map((a) => a.id);
  const [{ data: pieceRows }, { data: scoreRows }, { data: reportRows }, { data: runRows }] =
    await Promise.all([
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
      // Voor het kaartcijfer "zoekopdrachten": alleen 'periodic', want een
      // impact- of controlemeting bevraagt maar een handvol prompts en zou dat
      // cijfer laten kelderen op precies het moment dat er net een pagina
      // gepubliceerd is.
      db
        .from("tracking_runs")
        .select("analysis_id, prompt_id, week_no")
        .in("analysis_id", ids)
        .eq("purpose", "periodic"),
    ]);

  const pieces = pieceRows ?? [];
  const scores = (scoreRows ?? []) as VisibilityScore[];

  return {
    analyses,
    work,
    cardMetrics: buildCardMetrics(
      ids,
      pieces,
      scores,
      (reportRows ?? []) as { analysis_id: string; week_no: number; recommendations_json: unknown }[],
      (runRows ?? []) as { analysis_id: string; prompt_id: string | null; week_no: number }[],
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
  runs: { analysis_id: string; prompt_id: string | null; week_no: number }[],
): Record<string, AnalysisCardMetrics> {
  const piecesByAnalysis = new Map<string, typeof pieces>();
  for (const p of pieces) {
    piecesByAnalysis.set(p.analysis_id, [...(piecesByAnalysis.get(p.analysis_id) ?? []), p]);
  }

  const scoresByAnalysis = new Map<string, VisibilityScore[]>();
  for (const s of scores) {
    scoresByAnalysis.set(s.analysis_id, [...(scoresByAnalysis.get(s.analysis_id) ?? []), s]);
  }

  const runsByAnalysis = new Map<string, typeof runs>();
  for (const r of runs) {
    runsByAnalysis.set(r.analysis_id, [...(runsByAnalysis.get(r.analysis_id) ?? []), r]);
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

    // Unieke prompts van de laatste meetronde: dezelfde week_no als de laatste
    // score, zodat dit cijfer altijd bij de zichtbaarheid ernaast hoort en niet
    // meerdere metingen door elkaar telt.
    let searchQueries: number | null = null;
    if (latest) {
      const ownRuns = (runsByAnalysis.get(id) ?? []).filter((r) => r.week_no === latest.week_no);
      const uniquePrompts = new Set(ownRuns.map((r) => r.prompt_id).filter((p): p is string => p !== null));
      // Nul unieke prompts ondanks metingrijen betekent oude rijen zonder
      // prompt_id, geen meting zonder vragen (conventie 3).
      searchQueries = uniquePrompts.size > 0 ? uniquePrompts.size : null;
    }

    result[id] = {
      visibilityScore: latest ? (latest.weighted_score ?? latest.score) : null,
      searchQueries,
      suggestedArticles,
      writtenArticles,
      measurementCount: ownScores.length,
    };
  }

  return result;
}

