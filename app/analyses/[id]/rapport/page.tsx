import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { determineStage } from "@/lib/pipeline/stage";
import { EmptyState } from "@/components/empty-state";
import { ReportProgress } from "../report-progress";
import type { Report } from "@/lib/types/database";

interface ReportGap {
  cluster: string;
  problem: string;
  evidenceRunIds: string[];
}

interface ReportRecommendation {
  title: string;
  type: string;
  targetIntent: string;
  why: string;
  priority: number;
}

/**
 * Rapport-tab (abcplan.md §7/§9). Tussen 'gemeten' en 'gereed' toont dit tabblad
 * een korte "wordt opgesteld"-status i.p.v. een lege of foutieve staat.
 */
export default async function RapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  if (analysis.status === "bezig" || analysis.status === "concept_klaar") {
    return (
      <EmptyState title="Nog geen rapport">
        Eerst moet de meting starten. Ga naar het tabblad Overzicht om verder te gaan.
      </EmptyState>
    );
  }

  if (analysis.status === "meten") {
    return (
      <EmptyState title="Meting loopt nog">
        Zodra de meting klaar is, stellen we automatisch het rapport op — geen actie nodig.
      </EmptyState>
    );
  }

  if (analysis.status === "gemeten") {
    return <ReportProgress analysisId={id} />;
  }

  const supabase = await createClient();

  if (analysis.status === "mislukt") {
    const stage = await determineStage(supabase, id);
    if (stage !== "report") {
      return (
        <EmptyState title="Nog geen rapport">
          Er ging iets mis in een eerdere stap. Ga naar het tabblad Overzicht om dit op te lossen.
        </EmptyState>
      );
    }
    return <ReportProgress analysisId={id} initialStatus="mislukt" />;
  }

  // status === "gereed"
  const { data: reportRow } = await supabase
    .from("reports")
    .select("*")
    .eq("analysis_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!reportRow) {
    return <ReportProgress analysisId={id} />;
  }

  const report = reportRow as Report;
  const gaps = (report.gaps_json ?? []) as ReportGap[];
  const recommendations = [...((report.recommendations_json ?? []) as ReportRecommendation[])].sort(
    (a, b) => a.priority - b.priority,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Samenvatting</span>
        <p className="text-secondary">{report.summary}</p>
      </div>

      {gaps.length > 0 && (
        <div className="card flex flex-col gap-4">
          <span className="mono-label">Waar je zichtbaarheid mist</span>
          <ul className="flex flex-col gap-3">
            {gaps.map((g, i) => (
              <li
                key={i}
                className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="chip">{g.cluster}</span>
                  {g.evidenceRunIds?.length > 0 && (
                    <span className="mono-label">{g.evidenceRunIds.length}× aangetoond</span>
                  )}
                </div>
                <p className="text-secondary">{g.problem}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="card flex flex-col gap-4">
          <span className="mono-label">Aanbevelingen</span>
          <ul className="flex flex-col gap-3">
            {recommendations.map((r, i) => (
              <li
                key={i}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <span className="chip chip-green">{r.type}</span>
                </div>
                <p className="text-sm text-secondary">{r.why}</p>
                <span className="mono-label w-fit rounded-full border border-[var(--border-subtle)] px-3 py-1">
                  Content genereren volgt in de volgende ontwikkelstap
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
