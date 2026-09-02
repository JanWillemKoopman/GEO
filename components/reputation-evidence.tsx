import type { ReputationSource } from "@/lib/types/database";

const SOORT_LABEL: Record<string, string> = {
  review: "reviewplatform",
  vakpers: "vakpers",
  eigen: "je eigen site",
  sociaal: "sociale media",
  register: "register",
  overig: "overig",
};

const SOORT_KLEUR: Record<string, string> = {
  review: "var(--chart-1)",
  vakpers: "var(--chart-2)",
  eigen: "var(--chart-3)",
  sociaal: "var(--chart-4)",
  register: "var(--chart-5, var(--text-muted))",
  overig: "var(--border-strong)",
};

/**
 * De samenstelling van de bewijskracht (plan analytics-herontwerp.md, R5).
 *
 * "Stevig onderbouwd" rust bij Gasservice Brabant op 19 bronnen waarvan er 9
 * in de categorie "overig" vallen: geen bewijs dus, alleen materiaal dat
 * nergens anders onder past. Dit balkje toont die samenstelling; de meting
 * (`evidence_score`) zelf verandert niet, alleen wat het scherm erover zegt.
 */
export function ReputationEvidence({ sources }: { sources: ReputationSource[] }) {
  if (sources.length === 0) return null;

  const perSoort = new Map<string, number>();
  for (const s of sources) perSoort.set(s.kind, (perSoort.get(s.kind) ?? 0) + 1);
  const overig = perSoort.get("overig") ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-[var(--radius-pill)]" role="img" aria-label="Samenstelling van de bronnen">
        {[...perSoort.entries()].map(([soort, aantal]) => (
          <span
            key={soort}
            style={{ width: `${(aantal / sources.length) * 100}%`, background: SOORT_KLEUR[soort] ?? "var(--border-strong)" }}
            title={`${SOORT_LABEL[soort] ?? soort}: ${aantal}`}
          />
        ))}
      </div>
      <p className="type-caption text-muted">
        {[...perSoort.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([soort, aantal]) => `${aantal} ${SOORT_LABEL[soort] ?? soort}`)
          .join(", ")}
        {overig > 0 && overig / sources.length >= 0.3 && (
          <> · bijna {overig === sources.length ? "alle" : "de helft van de"} bronnen zijn niet ingedeeld</>
        )}
      </p>
    </div>
  );
}
