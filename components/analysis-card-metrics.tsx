import type { AnalysisCardMetrics as Metrics } from "@/lib/dashboard";

/**
 * De vier kaartcijfers + metingen-telling op de regel van één analyse in "Mijn
 * analyses" (abcplan.md §3.4). Bewust vlak en klein: dit is de lijst, niet het
 * dossier, wie meer wil weten klikt door naar de analyse zelf.
 */
export function AnalysisCardMetrics({ metrics }: { metrics: Metrics }) {
  const { visibilityScore, openQuestions, suggestedArticles, writtenArticles, measurementCount } =
    metrics;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Metric
        value={visibilityScore != null ? `${Math.round(visibilityScore)}%` : "-"}
        label="Zichtbaarheid"
      />
      <Metric value={openQuestions != null ? String(openQuestions) : "-"} label="Openstaande vragen" />
      <Metric value={String(suggestedArticles)} label="Voorgesteld" />
      <Metric value={String(writtenArticles)} label="Geschreven" />
      <span className="mono-label" style={{ fontSize: "0.65rem" }}>
        {measurementCount === 0
          ? "Nog geen metingen"
          : measurementCount === 1
            ? "1 meting"
            : `${measurementCount} metingen`}
      </span>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <span className="mono-label" style={{ fontSize: "0.65rem" }}>
      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>{" "}
      {label}
    </span>
  );
}
