import Link from "next/link";
import { InfoHint } from "@/components/info-hint";
import type { DashboardData } from "@/lib/dashboard";

/**
 * "Wat moet ik deze week doen?" (optimalisatie.md bijlage A1/A10)
 *
 * De enige vraag waarmee een klant inlogt. Alles was per analyse verspreid: een
 * blokkade stond op de profielpagina, klaarliggende content in de bibliotheek,
 * off-site punten in het rapport. Wie drie analyses had, moest negen schermen af
 * om te weten of er iets te doen was — en deed het dus niet.
 *
 * De VOLGORDE is het advies. Bovenaan staat waar de app stilligt te wachten op
 * de klant, onderaan waar iets te winnen valt. Wie van boven naar beneden werkt,
 * doet automatisch het juiste eerst.
 */
export function ActionList({ actions, stats }: Pick<DashboardData, "actions" | "stats">) {
  if (actions.length === 0) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Wat je nu kunt doen</span>
        <p className="text-secondary">
          Niets — alles staat klaar en er wacht geen actie op jou. We meten maandelijks door en
          laten het weten zodra er iets verandert.
        </p>
        {stats.publishedThisMonth > 0 && (
          <p className="text-sm text-muted">
            Deze maand publiceerde je {stats.publishedThisMonth}{" "}
            {stats.publishedThisMonth === 1 ? "pagina" : "pagina's"}. Het effect daarvan meten we
            twee en vier weken later.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Wat je nu kunt doen
          <InfoHint label="Volgorde">
            Op volgorde van belang. Bovenaan staat waar het vastloopt zonder jou; daaronder waar
            het meeste te winnen valt.
          </InfoHint>
        </span>
        <span className="mono-label">
          {actions.length} {actions.length === 1 ? "punt" : "punten"}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {actions.map((action, i) => (
          <li key={`${action.href}-${i}`}>
            <Link
              href={action.href}
              className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 transition-colors hover:border-[var(--border-strong)]"
              // De eerste actie krijgt het accent: één duidelijke volgende stap,
              // visueel dominant (bijlage A1). Twee even zware knoppen naast
              // elkaar is geen advies maar een keuzemenu.
              style={i === 0 ? { borderColor: "rgba(165,120,240,0.5)" } : undefined}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{action.title}</span>
                <span className="mono-label" style={{ fontSize: "0.65rem" }}>
                  {action.analysisName}
                </span>
              </div>
              <span className="text-sm text-secondary">{action.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * De cijfers van deze maand. Bewust drie en niet acht: een dashboard vol tegels
 * is een dashboard dat niemand leest.
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
        label="Gepubliceerd deze maand"
        hint={stats.publishedThisMonth === 0 ? "Nog niets live gezet" : undefined}
      />
      <StatTile
        value={String(stats.waitingToPublish)}
        label="Ligt klaar om te publiceren"
        hint={stats.waitingToPublish > 0 ? "Levert pas iets op als het online staat" : undefined}
      />
      {biggestChange ? (
        <StatTile
          value={`${biggestChange.delta > 0 ? "+" : ""}${biggestChange.delta}`}
          label="Grootste verandering"
          hint={biggestChange.analysisName}
          tone={biggestChange.delta > 0 ? "up" : "down"}
        />
      ) : (
        <StatTile value="—" label="Grootste verandering" hint="Nog geen tweede meting" />
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
