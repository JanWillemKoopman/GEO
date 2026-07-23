import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { PrepareProgress } from "./prepare-progress";

/**
 * Overzicht-tab. Server-state-gedreven (abcplan.md §3.7):
 * - bezig/mislukt → het live voortgangsscherm dat halte 1+2 aandrijft.
 * - concept_klaar → verwijzing naar het concept-scherm (review-gate, Sprint 3).
 * - meten/gemeten/gereed → score/trendlijn (komt in Sprint 4).
 */
export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  if (analysis.status === "bezig" || analysis.status === "mislukt") {
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
    return (
      <div className="card flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="live-dot" />
          <span className="mono-label">Meten…</span>
        </div>
        <p className="text-secondary">
          Je hebt de meting bevestigd. De prompts worden binnenkort tegen de AI-assistenten
          getest — deze stap wordt in de volgende ontwikkelfase gekoppeld. Kom hier later terug
          voor je zichtbaarheidsscore.
        </p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-2">
      <span className="mono-label">Zichtbaarheidsscore</span>
      <p className="text-secondary">
        Score en trendlijn verschijnen hier zodra de meting is uitgevoerd.
      </p>
    </div>
  );
}
