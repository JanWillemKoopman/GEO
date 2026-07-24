import { EntityComparison } from "@/components/entity-comparison";
import type { VisibilityScore, CompetitorBreakdown } from "@/lib/types/database";

/**
 * Score + "jij vs. concurrenten" (abcplan.md §3.5 Overzicht). Trendlijn/historie
 * volgt pas zodra er meerdere weken data zijn (wekelijkse lus) — met alleen
 * week 0 is een grafiek nog niet zinvol, dus die komt in een latere sprint.
 */
export function ScorePanel({
  score,
  activePromptCount,
  competitors,
}: {
  score: VisibilityScore;
  activePromptCount: number;
  competitors: CompetitorBreakdown[];
}) {
  const rows = [
    { label: "Jij", percent: Math.round(score.score), isOwnBrand: true },
    ...competitors.map((c) => ({
      label: c.competitor_name,
      percent: activePromptCount > 0 ? Math.round((c.mentions_count / activePromptCount) * 100) : 0,
      isOwnBrand: false,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Zichtbaarheidsscore</span>
          <div className="flex items-end gap-3">
            <span className="text-6xl font-bold tracking-tight">{Math.round(score.score)}</span>
            <span className="mb-2 text-secondary">/ 100</span>
          </div>
          <p className="text-sm text-secondary">
            Zo vaak word jij genoemd als een AI-assistent een relevante vraag krijgt — elke vraag telt
            even zwaar.
          </p>
        </div>

        {score.weighted_score != null && (
          <div className="card flex flex-col gap-2">
            <span className="mono-label">Gewogen zichtbaarheid</span>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-bold tracking-tight">{Math.round(score.weighted_score)}</span>
              <span className="mb-2 text-secondary">/ 100</span>
            </div>
            <p className="text-sm text-secondary">
              Hetzelfde, maar populaire en koopklare vragen tellen zwaarder (naar verwacht zoekvolume ×
              commerciële waarde).
            </p>
          </div>
        )}
      </div>

      <div className="card flex flex-col gap-4">
        <span className="mono-label">Jij vs. concurrenten</span>
        {rows.length > 1 ? (
          <EntityComparison rows={rows} />
        ) : (
          <p className="text-secondary">Geen concurrenten gedetecteerd in deze meting.</p>
        )}
      </div>
    </div>
  );
}
