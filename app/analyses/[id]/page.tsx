import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { determineStage } from "@/lib/pipeline/stage";
import { PrepareProgress } from "./prepare-progress";
import { MeasureProgress } from "./measure-progress";
import { ScorePanel } from "./score-panel";
import { ResultsPanel } from "@/components/results-panel";
import { loadResults } from "@/lib/pipeline/results";
import type { VisibilityScore, CompetitorBreakdown, Entity } from "@/lib/types/database";

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
  // De noemer voor de concurrentiepercentages is het aantal METINGEN van deze
  // week, niet het huidige aantal actieve prompts (optimalisatie.md 0.1). Die
  // twee lopen uiteen zodra de klant een prompt uitzet: de tellingen komen uit
  // historische runs, dus met een gekrompen noemer schoten de balken boven 100%.
  // De LAATSTE twee periodes, niet vast periode 0: sinds de maandelijkse
  // hermeting (fase 2.0) is week 0 de nulmeting en niet meer het actuele beeld.
  // De vorige periode is nodig voor de verandering (optimalisatie.md 2.3).
  const { data: scoreRows } = await supabase
    .from("visibility_scores")
    .select("*")
    .eq("analysis_id", id)
    .order("week_no", { ascending: false })
    .limit(2);

  const scores = (scoreRows ?? []) as VisibilityScore[];
  const scoreRow = scores[0] ?? null;
  const previousScore = scores[1] ?? null;

  if (!scoreRow) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Zichtbaarheidsscore</span>
        <p className="text-secondary">Score en trendlijn verschijnen hier zodra de meting is uitgevoerd.</p>
      </div>
    );
  }

  const weekNo = scoreRow.week_no;

  const [{ data: competitorRows }, { count: runCount }, { data: entityRows }] = await Promise.all([
    supabase
      .from("competitor_breakdown")
      .select("*")
      .eq("analysis_id", id)
      .eq("week_no", weekNo)
      .order("mentions_count", { ascending: false }),
    supabase
      .from("tracking_runs")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", id)
      .eq("week_no", weekNo)
      .eq("purpose", "periodic"),
    // Nieuw ontdekte merken die nog op bevestiging wachten (optimalisatie.md
    // 2.5/2.7). Ze tellen niet mee in het aandeel, maar de klant moet ze wél
    // zien — anders is een lager aandeel niet te verklaren.
    supabase
      .from("entities")
      .select("*")
      .eq("profile_id", analysis.profile_id)
      .eq("confirmed", false)
      .eq("dismissed", false)
      .order("canonical_name"),
  ]);

  const alsoMentioned = (entityRows ?? []) as Entity[];

  // Het resultaatpaneel (optimalisatie.md 5.6) staat BOVEN de score: zodra er
  // iets gepubliceerd is, is "wat heeft het opgeleverd" de vraag waarvoor de
  // klant hier komt. De score eronder is de context.
  const results = await loadResults(supabase, id);

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
      <ResultsPanel analysisId={id} results={results} />

      <ScorePanel
        score={scoreRow}
        previous={previousScore}
        measuredRunCount={runCount ?? 0}
        competitors={(competitorRows ?? []) as CompetitorBreakdown[]}
        alsoMentioned={alsoMentioned}
        profileId={analysis.profile_id}
      />
    </div>
  );
}
