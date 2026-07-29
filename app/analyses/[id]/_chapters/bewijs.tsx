import { createClient } from "@/lib/supabase/server";
import { CompetitorCard, AlsoMentionedCard } from "../score-panel";
import type { Analysis, CompetitorBreakdown, Entity, VisibilityScore } from "@/lib/types/database";

/**
 * Hoofdstuk 02 — "Waar je wint en mist".
 *
 * De onderbouwing van het cijfer uit hoofdstuk 01: tegen wie je het opneemt en,
 * verderop, op welke vragen precies. Dat stond eerder verdeeld over drie
 * plekken — de concurrentiebalken op tabblad 1, de gemiste vragen op tabblad 2
 * en de gaten-analyse op tabblad 3, met links heen en weer daartussen.
 *
 * Die links waren het signaal: het rapport moest je naar een ander tabblad
 * sturen om zijn eigen bewering te onderbouwen. Dan hoort het bij elkaar.
 */
export async function BewijsChapter({
  analysis,
  weekNo,
}: {
  analysis: Analysis;
  weekNo: number | null;
}) {
  if (weekNo === null) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Nog geen metingen</span>
        <p className="text-secondary">
          Zodra de meting gedraaid heeft staan hier de letterlijke antwoorden die een AI-assistent
          op jouw vragen gaf, met daarin gemarkeerd waar jij en je concurrenten genoemd worden.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: scoreRow }, { data: competitorRows }, { count: runCount }, { data: entityRows }] =
    await Promise.all([
      supabase
        .from("visibility_scores")
        .select("*")
        .eq("analysis_id", analysis.id)
        .eq("week_no", weekNo)
        .maybeSingle(),
      supabase
        .from("competitor_breakdown")
        .select("*")
        .eq("analysis_id", analysis.id)
        .eq("week_no", weekNo)
        .order("mentions_count", { ascending: false }),
      supabase
        .from("tracking_runs")
        .select("id", { count: "exact", head: true })
        .eq("analysis_id", analysis.id)
        .eq("week_no", weekNo)
        .eq("purpose", "periodic"),
      // Nieuw ontdekte merken die nog op bevestiging wachten (2.5/2.7). Ze tellen
      // niet mee in het aandeel, maar de klant moet ze wél zien — anders is een
      // lager aandeel niet te verklaren.
      supabase
        .from("entities")
        .select("*")
        .eq("profile_id", analysis.profile_id)
        .eq("confirmed", false)
        .eq("dismissed", false)
        .order("canonical_name"),
    ]);

  const score = scoreRow as VisibilityScore | null;
  if (!score) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Nog geen metingen</span>
        <p className="text-secondary">Voor deze periode zijn nog geen metingen beschikbaar.</p>
      </div>
    );
  }

  return (
    <>
      <CompetitorCard
        score={score}
        measuredRunCount={runCount ?? 0}
        competitors={(competitorRows ?? []) as CompetitorBreakdown[]}
      />
      <AlsoMentionedCard
        alsoMentioned={(entityRows ?? []) as Entity[]}
        profileId={analysis.profile_id}
      />
    </>
  );
}
