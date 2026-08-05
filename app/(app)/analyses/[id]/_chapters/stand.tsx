import { createClient } from "@/lib/supabase/server";
import { ScoreCard } from "../score-panel";
import { TrendChart } from "@/components/trend-chart";
import { loadTrend } from "@/lib/pipeline/trend";
import type { Analysis, Report, VisibilityScore } from "@/lib/types/database";

/**
 * Hoofdstuk 01, "Hoe je ervoor staat".
 *
 * Het cijfer met zijn marge, de verandering sinds de vorige meting, de duiding
 * in woorden, en de lijn over de tijd. Meer niet: dit hoofdstuk beantwoordt één
 * vraag, en de onderbouwing volgt in hoofdstuk 02.
 *
 * De samenvatting van het rapport staat hier en niet op een eigen tabblad. Dat
 * was de vreemdste scheiding van allemaal: het cijfer stond op tabblad 1 en de
 * zin die uitlegt wát dat cijfer betekent op tabblad 3.
 */
export async function StandChapter({
  analysis,
  weekNo,
}: {
  analysis: Analysis;
  /** De gekozen periode; null zolang er nog niet gemeten is. */
  weekNo: number | null;
}) {
  const supabase = await createClient();

  if (weekNo === null) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Nog geen meting</span>
        <p className="text-secondary">
          Zodra de eerste meting gedraaid heeft, staan je score en de lijn over de tijd hier.
        </p>
      </div>
    );
  }

  const [{ data: scoreRows }, { data: reportRow }, { count: runCount }, trend] = await Promise.all([
    // Deze periode én de vorige: de vorige is nodig voor de verandering (2.3).
    supabase
      .from("visibility_scores")
      .select("*")
      .eq("analysis_id", analysis.id)
      .lte("week_no", weekNo)
      .order("week_no", { ascending: false })
      .limit(2),
    supabase
      .from("reports")
      .select("*")
      .eq("analysis_id", analysis.id)
      .eq("week_no", weekNo)
      .maybeSingle(),
    // De noemer voor percentages is het aantal METINGEN van deze periode, niet
    // het huidige aantal actieve vragen (optimalisatie.md 0.1).
    supabase
      .from("tracking_runs")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysis.id)
      .eq("week_no", weekNo)
      .eq("purpose", "periodic"),
    loadTrend(supabase, analysis.id),
  ]);

  const scores = (scoreRows ?? []) as VisibilityScore[];
  const score = scores[0] ?? null;
  const previous = scores[1] ?? null;
  const report = reportRow as Report | null;

  if (!score) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Nog geen score</span>
        <p className="text-secondary">
          Voor deze periode is nog geen score berekend. Zodra de meting gedraaid heeft, staat hij
          hier.
        </p>
      </div>
    );
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("brand_name")
    .eq("id", analysis.profile_id)
    .maybeSingle();

  return (
    <>
      <ScoreCard score={score} previous={previous} measuredRunCount={runCount ?? 0} />

      {report?.summary && (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Wat dit betekent</span>
          <p className="text-secondary">{report.summary}</p>
        </div>
      )}

      <TrendChart data={trend} ownLabel={(profileRow?.brand_name as string | null) ?? "Jouw merk"} />
    </>
  );
}
