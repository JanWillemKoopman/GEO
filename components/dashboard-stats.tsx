import type { DashboardData } from "@/lib/dashboard";

/**
 * De cijfers van deze maand. Bewust drie en niet acht: een dashboard vol tegels
 * is een dashboard dat niemand leest.
 *
 * De vroegere "Wat je nu kunt doen"-lijst (het opgerolde werkmodel over alle
 * analyses heen) stond hierboven op dit dashboard. Met meerdere analyses liep
 * die op tientallen punten — precies de rommel die het werkmodel per analyse
 * (`_chapters/werk.tsx`, hoofdstuk 03) juist moest voorkomen. Die lijst hoort
 * bij de analyse waar het werk vandaan komt, niet opgestapeld op het overzicht
 * ervoor; dit dashboard toont alleen nog de status.
 */
export function DashboardStats({
  stats,
  biggestChange,
}: Pick<DashboardData, "stats" | "biggestChange">) {
  const hasAnything =
    stats.publishedThisMonth > 0 || stats.waitingToPublish > 0 || biggestChange !== null;
  if (!hasAnything) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile
        value={String(stats.publishedThisMonth)}
        label="Live deze maand"
        hint={stats.publishedThisMonth === 0 ? "Nog niets gepubliceerd" : undefined}
      />
      <StatTile
        value={String(stats.waitingToPublish)}
        label="Klaar om te publiceren"
        hint={stats.waitingToPublish > 0 ? "Telt pas mee zodra het online staat" : undefined}
      />
      {biggestChange ? (
        <StatTile
          value={`${biggestChange.delta > 0 ? "+" : ""}${biggestChange.delta}`}
          label="Grootste verandering"
          hint={biggestChange.analysisName}
          tone={biggestChange.delta > 0 ? "up" : "down"}
        />
      ) : (
        <StatTile value="—" label="Grootste verandering" hint="Pas zichtbaar na de tweede meting" />
      )}
    </div>
  );
}

function StatTile({
  value,
  label,
  hint,
  tone,
}: {
  value: string;
  label: string;
  hint?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="card flex flex-col gap-1">
      <span
        className="text-3xl font-bold tracking-tight"
        style={
          tone === "up"
            ? { color: "var(--status-success)" }
            : tone === "down"
              ? { color: "var(--status-error)" }
              : undefined
        }
      >
        {value}
      </span>
      <span className="mono-label" style={{ fontSize: "0.65rem" }}>
        {label}
      </span>
      {hint && (
        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
          {hint}
        </span>
      )}
    </div>
  );
}
