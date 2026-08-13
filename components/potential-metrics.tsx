import { InfoHint } from "@/components/info-hint";
import {
  potentialBand,
  POTENTIAL_BAND_LABEL,
  potentialExplanation,
  type PotentialTriple,
} from "@/lib/potential";

/**
 * De potentiescore, in drie tegels (docs/tasks/potentiescore.md).
 *
 * Bewust een eigen, herkenbaar blok en geen extra kolom op de bestaande
 * scorekaart (`score-panel.tsx`): dat cijfer daar is de gewogen
 * zichtbaarheidsscore, en die is al vermenigvuldigd met een grove
 * volumeschatting. Deze drie tegels vertellen een ander, scherper verhaal,
 * "hoeveel mis je nog, hoe vaak wordt het gezocht, wat levert het op", en dat
 * verdient een eigen plek in plaats van ertussen te staan.
 */
export function PotentialMetrics({
  triple,
  level,
}: {
  triple: PotentialTriple;
  /** Bepaalt alleen de toelichtingstekst: over dit onderwerp, of over deze pagina. */
  level: "analyse" | "pagina";
}) {
  const band = potentialBand(triple.potential);
  const toon = triple.potential === null ? undefined : band === "hoog" ? "up" : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          label="Zichtbaarheid"
          value={triple.visibility}
          hint={
            level === "analyse"
              ? "Van de gemeten vragen van dit onderwerp: bij welk aandeel wordt dit merk in de laatste " +
                "meting genoemd? 100 = overal genoemd, 0 = nergens."
              : "Van de vragen die deze pagina moet winnen: bij welk aandeel wordt dit merk in de laatste " +
                "meting genoemd? 100 = overal genoemd, 0 = nergens."
          }
        />
        <MetricTile
          label="Zoekvolume"
          value={triple.volume}
          hint={
            "Hoe vaak dit onderwerp gezocht wordt, geschat door Aura. Geen meting: een onderbouwde " +
            "schatting die opnieuw wordt berekend zodra er een analyse van dit merk bij komt, zodat het " +
            "getal eerlijk blijft ten opzichte van je andere onderwerpen."
          }
        />
        <MetricTile
          label="Potentie"
          value={triple.potential}
          tone={toon}
          hint={
            "Zichtbaarheid en zoekvolume samen: hoeveel is hier te winnen. Een onderwerp met veel " +
            "zoekvolume waar dit merk nog niet zichtbaar is, scoort hoog. Een onderwerp waar dit merk " +
            "al overal genoemd wordt, scoort laag, hoe vaak het ook gezocht wordt: er is dan niets meer " +
            "te winnen."
          }
        />
      </div>
      <p className="text-sm text-secondary">
        {band !== "onbekend" && (
          <span className="font-medium text-[var(--text-primary)]">{POTENTIAL_BAND_LABEL[band]}. </span>
        )}
        {potentialExplanation(triple.visibility, triple.volume)}
      </p>
    </div>
  );
}

/**
 * Compacte variant voor een lijst met veel regels tegelijk (hoofdstuk 03, de
 * voorgestelde pagina's): één regel in plaats van drie tegels, met dezelfde
 * drie getallen erin.
 */
export function PotentialInline({ triple }: { triple: PotentialTriple }) {
  const band = potentialBand(triple.potential);
  if (triple.visibility === null && triple.volume === null) return null;

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary">
      <span>
        Zichtbaarheid <strong className="text-[var(--text-primary)]">{fmt(triple.visibility)}</strong>
      </span>
      <span>
        Zoekvolume <strong className="text-[var(--text-primary)]">{fmt(triple.volume)}</strong>
      </span>
      <span>
        Potentie{" "}
        <strong
          className="text-[var(--text-primary)]"
          style={band === "hoog" ? { color: "var(--status-success)" } : undefined}
        >
          {fmt(triple.potential)}
        </strong>
        {band !== "onbekend" && <> ({POTENTIAL_BAND_LABEL[band].replace(" potentie", "")})</>}
      </span>
    </span>
  );
}

function fmt(value: number | null): string {
  return value === null ? "onbekend" : `${value}/100`;
}

function MetricTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | null;
  hint: string;
  tone?: "up";
}) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="mono-label flex items-center gap-1" style={{ fontSize: "0.65rem" }}>
        {label}
        <InfoHint label={label}>{hint}</InfoHint>
      </span>
      <span
        className="text-3xl font-bold tracking-tight"
        style={tone === "up" ? { color: "var(--status-success)" } : undefined}
      >
        {value === null ? "—" : value}
        {value !== null && (
          <span className="text-muted" style={{ fontSize: "0.9rem", fontWeight: 400 }}>
            {" "}
            /100
          </span>
        )}
      </span>
    </div>
  );
}
