import { TONE_LABELS } from "@/lib/reputation/tone";
import type { ToneShape } from "@/lib/reputation/screen";

const LABEL_TEKST: Record<(typeof TONE_LABELS)[number], string> = {
  positief: "positief",
  overwegend_positief: "overwegend positief",
  neutraal: "neutraal",
  gemengd: "gemengd",
  negatief: "negatief",
  onbekend: "geen beeld",
};

const LABEL_KLEUR: Record<(typeof TONE_LABELS)[number], string> = {
  positief: "var(--intent-growth-solid)",
  overwegend_positief: "var(--intent-growth-solid)",
  neutraal: "var(--text-muted)",
  gemengd: "var(--intent-warning-solid)",
  negatief: "var(--intent-danger-solid)",
  onbekend: "var(--border-subtle)",
};

/**
 * De toon als verdeling, in plaats van als meter (plan analytics-herontwerp.md,
 * R2).
 *
 * ── WAAROM DIT HET GROOTSTE ELEMENT VERVANGT ────────────────────────────────
 *
 * Alle 22 bruikbare antwoorden bij Gasservice Brabant kregen het label
 * "gemengd", dus de toonindex is exact 0 en de meter (`tone-meter.tsx`) staat
 * per definitie in het midden. Het grootste en kleurrijkste element van het
 * scherm droeg daarmee de minste informatie. Deze balk toont de zes labels
 * naast elkaar: 22 keer hetzelfde label is dan meteen zichtbaar, in plaats van
 * verstopt achter een gemiddelde dat toevallig ook nul is.
 */
export function ReputationToneDistribution({ verdeling }: { verdeling: ToneShape | null }) {
  if (verdeling === null || verdeling.n === 0) {
    return (
      <p className="text-secondary">ChatGPT weet te weinig over je om er een toon aan te geven.</p>
    );
  }

  const totaal = verdeling.n;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-4 w-full overflow-hidden rounded-[var(--radius-pill)]" role="img" aria-label="Verdeling van de toon over de antwoorden">
        {TONE_LABELS.map((label) => {
          const aantal = verdeling.counts[label] ?? 0;
          if (aantal === 0) return null;
          return (
            <span
              key={label}
              style={{ width: `${(aantal / totaal) * 100}%`, background: LABEL_KLEUR[label] }}
              title={`${LABEL_TEKST[label]}: ${aantal} van de ${totaal}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {TONE_LABELS.map((label) => {
          const aantal = verdeling.counts[label] ?? 0;
          if (aantal === 0) return null;
          return (
            <span key={label} className="flex items-center gap-1.5 text-sm text-secondary">
              <span className="h-2 w-2 rounded-full" style={{ background: LABEL_KLEUR[label] }} aria-hidden />
              {LABEL_TEKST[label]} ({aantal})
            </span>
          );
        })}
      </div>
    </div>
  );
}
