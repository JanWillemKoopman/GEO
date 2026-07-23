import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { PrepareProgress } from "./prepare-progress";
import { MeasureProgress } from "./measure-progress";
import { ScorePanel } from "./score-panel";
import type { VisibilityScore, CompetitorBreakdown } from "@/lib/types/database";

/**
 * Overzicht-tab. Server-state-gedreven (abcplan.md §3.7):
 * - bezig/mislukt (zonder prompts) → live voortgang halte 1+2.
 * - concept_klaar → verwijzing naar het concept-scherm (review-gate).
 * - meten/mislukt (met prompts) → live voortgang halte 3 (de meting).
 * - gemeten/gereed → score + "jij vs. concurrenten".
 */
export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();

  if (analysis.status === "bezig" || analysis.status === "mislukt") {
    // Onderscheid mislukte VOORBEREIDING vs mislukte METING (zie prepare.ts/measure.ts).
    const { count: promptCount } = await supabase
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", id);

    if (analysis.status === "mislukt" && (promptCount ?? 0) > 0) {
      return <MeasureProgress analysisId={id} initialStatus={analysis.status} />;
    }
    return <PrepareProgress analysisId={id} initialStatus={analysis.status} />;
  }

  if (analysis.status === "concept_klaar") {
    return (
      <div className="card flex flex-col gap-4">
        <span className="mono-label">Concept klaar</span>
        <p className="text-secondary">
          Het Brand DNA en de prompts staan klaar. Bekijk en bevestig ze op het tabblad
          Instellingen om de meting te starten.
        </p>
        <Link href={`/analyses/${id}/instellingen`} className="btn-primary w-fit">
          Naar concept &amp; goedkeuring
        </Link>
      </div>
    );
  }

  if (analysis.status === "meten") {
    return <MeasureProgress analysisId={id} initialStatus={analysis.status} />;
  }

  // gemeten / gereed → score + concurrentievergelijking (week 0).
  const [{ data: scoreRow }, { data: competitorRows }, { count: activePromptCount }] = await Promise.all([
    supabase.from("visibility_scores").select("*").eq("analysis_id", id).eq("week_no", 0).maybeSingle(),
    supabase
      .from("competitor_breakdown")
      .select("*")
      .eq("analysis_id", id)
      .eq("week_no", 0)
      .order("mentions_count", { ascending: false }),
    supabase.from("prompts").select("id", { count: "exact", head: true }).eq("analysis_id", id).eq("active", true),
  ]);

  if (!scoreRow) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Zichtbaarheidsscore</span>
        <p className="text-secondary">Score en trendlijn verschijnen hier zodra de meting is uitgevoerd.</p>
      </div>
    );
  }

  return (
    <ScorePanel
      score={scoreRow as VisibilityScore}
      activePromptCount={activePromptCount ?? 0}
      competitors={(competitorRows ?? []) as CompetitorBreakdown[]}
    />
  );
}
