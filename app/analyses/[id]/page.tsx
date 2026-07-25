import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { determineStage } from "@/lib/pipeline/stage";
import { PrepareProgress } from "./prepare-progress";
import { MeasureProgress } from "./measure-progress";
import { ScorePanel } from "./score-panel";
import type { VisibilityScore, CompetitorBreakdown } from "@/lib/types/database";

/**
 * Overzicht-tab. Server-state-gedreven (abcplan.md §3.7):
 * - bezig, of mislukt in de voorbereidingsfase → live voortgang halte 1+2.
 * - concept_klaar → verwijzing naar het concept-scherm (review-gate).
 * - meten, of mislukt tijdens de meting → live voortgang halte 3.
 * - gemeten/gereed, of mislukt tijdens het RAPPORT → score + "jij vs.
 *   concurrenten" (de meting zelf is dan al gelukt; het rapport-retry-scherm
 *   leeft op het tabblad Rapport, niet hier).
 */
export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();
  let reportFailedNotice = false;

  if (analysis.status === "bezig" || analysis.status === "mislukt") {
    const stage = await determineStage(supabase, id);
    if (stage === "prepare") {
      return <PrepareProgress analysisId={id} initialStatus={analysis.status} />;
    }
    if (stage === "measure") {
      return <MeasureProgress analysisId={id} initialStatus={analysis.status} />;
    }
    // stage === "report": de meting is gelukt — val door naar de score-weergave.
    reportFailedNotice = analysis.status === "mislukt";
  }

  if (analysis.status === "concept_klaar") {
    return (
      <div className="card flex flex-col gap-4">
        <span className="mono-label">Concept klaar</span>
        <p className="text-secondary">
          Het onderwerp-onderzoek en de prompts staan klaar. Bekijk en bevestig ze op het tabblad
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

  // gemeten / gereed / mislukt-tijdens-rapport → score + concurrentievergelijking (week 0).
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
    <div className="flex flex-col gap-4">
      {reportFailedNotice && (
        <div className="card" style={{ borderColor: "rgba(229,72,77,0.4)" }}>
          <p className="text-secondary">
            Het rapport kon niet worden opgesteld. Ga naar het tabblad{" "}
            <Link href={`/analyses/${id}/rapport`} className="underline">
              Rapport
            </Link>{" "}
            om het opnieuw te proberen.
          </p>
        </div>
      )}
      <ScorePanel
        score={scoreRow as VisibilityScore}
        activePromptCount={activePromptCount ?? 0}
        competitors={(competitorRows ?? []) as CompetitorBreakdown[]}
      />
    </div>
  );
}
