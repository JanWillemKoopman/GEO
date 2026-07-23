import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";

/**
 * Overzicht-tab. In Sprint 2A staat elke nieuwe analyse op 'bezig' (de meet-
 * pipeline volgt in 2B). Dit scherm is server-state-gedreven (abcplan.md §3.7):
 * het leidt de weergave af van analyses.status, niet van een client-animatie.
 */
const PIPELINE_STEPS = ["Website lezen", "Merk analyseren", "Prompts opstellen"];

export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  if (analysis.status === "bezig") {
    return (
      <div className="card flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="live-dot" />
          <span className="mono-label">Analyse wordt voorbereid</span>
        </div>
        <ul className="flex flex-col gap-3">
          {PIPELINE_STEPS.map((step) => (
            <li key={step} className="flex items-center gap-3 text-secondary">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--border-strong)" }}
              />
              {step}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          De automatische meet-pipeline (website lezen → Brand DNA → 30 prompts) wordt in de
          volgende stap gekoppeld. Zodra die draait, verschijnt hier je zichtbaarheidsscore.
        </p>
      </div>
    );
  }

  // Placeholder voor latere statussen (score/trendlijn komen in Sprint 4).
  return (
    <div className="card flex flex-col gap-2">
      <span className="mono-label">Zichtbaarheidsscore</span>
      <p className="text-secondary">
        Score en trendlijn verschijnen hier zodra de meting is uitgevoerd.
      </p>
    </div>
  );
}
