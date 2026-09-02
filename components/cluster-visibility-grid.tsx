import { Sparkline } from "@/components/sparkline";

/**
 * De grafiek die meegroeit met de data, als raster van kleine grafiekjes,
 * één per cluster (plan analytics-herontwerp.md, Z1 en Z2).
 *
 * ── WAAROM ÉÉN COMPONENT VOOR TWEE PLANPUNTEN ───────────────────────────────
 *
 * Z1 vraagt één hoofdgrafiek die meegroeit (staven bij één of twee metingen,
 * een lijn vanaf drie), Z2 vraagt daarnaast een raster van kleine
 * grafiekjes. Het plan zelf legt uit waarom Z2 nodig is: "tien lijnen door
 * elkaar is een kluwen, tien grafiekjes naast elkaar is een vergelijking."
 * Een gecombineerde grafiek met alle clusters als losse lijnen ZOU dus
 * precies het probleem zijn dat Z2 oplost. Dit raster is daarom het
 * hoofdbeeld: elk kaartje groeit zelf mee (staven → lijn, Z1's regel), en
 * samen vormen ze het overzicht dat Z2 vraagt. Geen aparte, onleesbare
 * gecombineerde grafiek ernaast.
 *
 * Bij minder dan drie metingen tekent `Sparkline` niets (`nog geen verloop`);
 * die ruimte gebruiken we voor de staven met marge en, bij één meting, de
 * datum van de volgende meetronde (Z1: "een punt is een belofte, geen
 * gebrek").
 */
export interface ClusterVisibilityReeks {
  id: string;
  name: string;
  /** Chronologisch, oudste eerst. */
  punten: { waarde: number; marge: number }[];
  /** Alleen relevant bij één meting: wanneer komt de volgende. */
  volgendeMeetronde: string | null;
}

export function ClusterVisibilityGrid({ clusters }: { clusters: ClusterVisibilityReeks[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {clusters.map((c) => (
        <div key={c.id} className="card flex flex-col gap-2 p-3">
          <span className="truncate text-sm font-medium" title={c.name}>
            {c.name}
          </span>
          {c.punten.length >= 3 ? (
            <div className="flex items-center justify-between gap-2">
              <Sparkline
                values={c.punten.map((p) => p.waarde)}
                label={`Zichtbaarheid van ${c.name}`}
              />
              <span className="stat-value text-lg">{Math.round(c.punten[c.punten.length - 1].waarde)}%</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {c.punten.map((p, i) => (
                <Balk key={i} waarde={p.waarde} marge={p.marge} />
              ))}
              {c.volgendeMeetronde && (
                <span className="mono-label text-muted">
                  volgende meting rond{" "}
                  {new Date(c.volgendeMeetronde).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Eén liggende staaf met de marge als lichtere kap eromheen. */
function Balk({ waarde, marge }: { waarde: number; marge: number }) {
  const laag = Math.max(0, waarde - marge);
  const hoog = Math.min(100, waarde + marge);
  return (
    <span className="flex items-center gap-2">
      <span className="relative h-3 w-full overflow-hidden rounded-[var(--radius-pill)]" style={{ background: "var(--bg-elevated)" }}>
        <span
          className="absolute inset-y-0 rounded-[var(--radius-pill)]"
          style={{ left: `${laag}%`, width: `${hoog - laag}%`, background: "var(--chart-own-muted, var(--bg-muted))" }}
          aria-hidden
        />
        <span
          className="absolute inset-y-0 left-0 rounded-[var(--radius-pill)]"
          style={{ width: `${waarde}%`, background: "var(--chart-own)" }}
        />
      </span>
      <span className="stat-value w-10 shrink-0 text-right text-sm">{Math.round(waarde)}%</span>
    </span>
  );
}
