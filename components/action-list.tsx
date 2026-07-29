import { InfoHint } from "@/components/info-hint";
import { WorkRow } from "@/components/work-list";
import { countNow } from "@/lib/work";
import type { DashboardData } from "@/lib/dashboard";

/**
 * "Wat moet ik deze week doen?" (optimalisatie.md bijlage A1/A10)
 *
 * De enige vraag waarmee een klant inlogt. Alles was per analyse verspreid: een
 * blokkade stond op de profielpagina, klaarliggende content in de bibliotheek,
 * off-site punten in het rapport. Wie drie analyses had, moest negen schermen af
 * om te weten of er iets te doen was — en deed het dus niet.
 *
 * Dit is de OPGEROLDE weergave van hetzelfde werkmodel dat het dossier per
 * analyse toont (`lib/work.ts`). Eén afleiding, twee schaalniveaus: het
 * dashboard kan niet meer iets anders beweren dan de analyse zelf. Voorheen
 * waren dat twee losse berekeningen die gegarandeerd uit elkaar gingen lopen.
 *
 * Alleen de staat "nu" komt hier. Wat loopt of op hermeting wacht hoort in het
 * dossier van die ene analyse, niet op een lijst die tot actie aanspoort.
 */
export function ActionList({ work, stats }: Pick<DashboardData, "work" | "stats">) {
  const now = work.filter((w) => w.state === "nu");
  const running = work.filter((w) => w.state === "loopt").length;

  if (now.length === 0) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label flex items-center gap-1.5">
          {running > 0 && <span className="live-dot" />}
          Wat je nu kunt doen
        </span>
        <p className="text-secondary">
          Niets — alles staat klaar en er wacht geen actie op jou. We meten maandelijks door en
          laten het weten zodra er iets verandert.
        </p>
        {running > 0 && (
          <p className="text-sm text-muted">
            {running === 1 ? "Eén ding draait" : `${running} dingen draaien`} nog op de achtergrond.
            Daar hoef je niet op te wachten.
          </p>
        )}
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
          {countNow(work)} {countNow(work) === 1 ? "punt" : "punten"}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {now.map((item, i) => (
          <li key={item.id}>
            {/* De eerste actie krijgt het accent: één duidelijke volgende stap,
                visueel dominant. Twee even zware regels naast elkaar is geen
                advies maar een keuzemenu. */}
            <WorkRow item={item} emphasis={i === 0} showAnalysis />
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
