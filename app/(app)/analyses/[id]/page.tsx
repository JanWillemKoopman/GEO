import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { determineStage } from "@/lib/pipeline/stage";
import { PrepareProgress } from "./prepare-progress";
import { MeasureProgress } from "./measure-progress";
import { ChapterSkeleton } from "@/components/skeleton";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { InhoudChapter } from "./_chapters/inhoud";

export const dynamic = "force-dynamic";

/**
 * HET CLUSTER: één tabblad, geen hoofdstukken.
 *
 * ── VAN VIER HOOFDSTUKKEN NAAR ÉÉN SCHERM (16 september 2026) ───────────────
 *
 * Tot deze datum was dit vier tabbladen (Stand, Waar je wint en mist, Wat je
 * moet doen, Opgeleverd), zelf al een verbetering op de doorlopende
 * scrollpagina van 26 augustus 2026 daarvoor. Op verzoek van de eigenaar gaan
 * de cijfers uit de eerste drie hoofdstukken (de score, de trend, de
 * concurrentietabellen) naar Analytics (`/merk/[id]/analytics`), die al een
 * cluster-filter heeft. Hoofdstuk 04 was al volledig gedupliceerd: dezelfde
 * `content_impact`-cijfers staan sinds V3 van `docs/tasks/analytics-herontwerp.md`
 * op Analytics → Zoekverkeer.
 *
 * Wat overblijft is precies wat een cluster nog uniek te bieden heeft: de
 * vertaalslag van een meting naar content. Dat is nu `InhoudChapter`
 * (`_chapters/inhoud.tsx`), zonder tabbalk, zonder periodekiezer.
 */
export default async function DossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  // Wacht het concept op goedkeuring, dan is dát het scherm, één taak, geen
  // inhoud die toch nog leeg is.
  if (analysis.status === "concept_klaar") redirect(`/analyses/${id}/concept`);

  const supabase = await createClient();

  // Loopt de voorbereiding of de meting nog, dan is er geen inhoud om te tonen
  // maar voortgang om te volgen. Dat is geen inhoud maar een andere toestand
  // van hetzelfde scherm.
  if (analysis.status === "bezig" || analysis.status === "mislukt") {
    const stage = await determineStage(supabase, id);
    if (stage === "prepare") {
      return <PrepareProgress analysisId={id} initialStatus={analysis.status} />;
    }
    if (stage === "measure") {
      return <MeasureProgress analysisId={id} initialStatus={analysis.status} />;
    }
    // stage === "report": de meting is gelukt, val door naar de inhoud.
  }

  if (analysis.status === "meten") {
    return <MeasureProgress analysisId={id} initialStatus={analysis.status} />;
  }

  return (
    <SectionErrorBoundary label="Cluster">
      <Suspense fallback={<ChapterSkeleton blocks={3} />}>
        <InhoudChapter analysis={analysis} />
      </Suspense>
    </SectionErrorBoundary>
  );
}
