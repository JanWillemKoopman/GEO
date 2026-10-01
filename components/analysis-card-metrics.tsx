import type { AnalysisCardMetrics as Metrics } from "@/lib/dashboard";

/**
 * De vier kaartcijfers + metingen-telling op de regel van één analyse in "Mijn
 * analyses" (abcplan.md §3.4). Bewust vlak en klein: dit is de lijst, niet het
 * dossier, wie meer wil weten klikt door naar de analyse zelf.
 *
 * Sinds 1 oktober 2026 één leesbare regel ("38% zichtbaarheid · 4 geschreven")
 * en niet meer vijf labels in kapitalen naast elkaar. Elk cijfer stond als
 * los etiket, en de regel las als een dashboard in plaats van als een zin.
 */
export function AnalysisCardMetrics({ metrics }: { metrics: Metrics }) {
  const { visibilityScore, searchQueries, suggestedArticles, writtenArticles, measurementCount } =
    metrics;

  if (measurementCount === 0) {
    return (
      <span className="type-compact text-muted">Nog geen metingen</span>
    );
  }

  return (
    <p className="type-compact flex flex-wrap items-center gap-x-2 gap-y-1 text-secondary">
      <Metric
        value={visibilityScore != null ? `${Math.round(visibilityScore)}%` : "-"}
        label="zichtbaarheid"
      />
      <Punt />
      <Metric value={searchQueries != null ? String(searchQueries) : "-"} label="zoekopdrachten" />
      <Punt />
      <Metric value={String(suggestedArticles)} label="voorgesteld" />
      <Punt />
      <Metric value={String(writtenArticles)} label="geschreven" />
      <Punt />
      <span className="text-muted">
        {measurementCount === 1 ? "1 meting" : `${measurementCount} metingen`}
      </span>
    </p>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <span>
      <span className="tabular font-medium text-[var(--text-primary)]">{value}</span> {label}
    </span>
  );
}

function Punt() {
  return (
    <span className="text-muted" aria-hidden>
      ·
    </span>
  );
}
