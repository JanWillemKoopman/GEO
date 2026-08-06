interface ComparisonRow {
  label: string;
  percent: number;
  isOwnBrand: boolean;
}

/**
 * "Jij vs. Concurrenten", horizontale vergelijkingsbalken. Bewust maar twee
 * kleuren (eigen merk = paars accent, concurrenten = neutraal): bij een open-
 * eindige, LLM-gedetecteerde concurrentenlijst is een categorische kleur per
 * concurrent zinloos (en een anti-pattern bij groeiende cardinaliteit), het
 * enige onderscheid dat ertoe doet is "wij" vs "de rest". Identiteit leunt
 * nooit op kleur alleen: naam + percentage staan altijd als tekst.
 */
export function EntityComparison({ rows }: { rows: ComparisonRow[] }) {
  const sorted = [...rows].sort((a, b) => b.percent - a.percent);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span
            className="w-28 shrink-0 truncate text-sm sm:w-36"
            style={{
              color: row.isOwnBrand ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: row.isOwnBrand ? 600 : 400,
            }}
            title={row.label}
          >
            {row.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(row.percent, 2)}%`,
                background: row.isOwnBrand ? "var(--intent-intelligence-solid)" : "var(--border-strong)",
              }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm text-secondary">{row.percent}%</span>
        </div>
      ))}
    </div>
  );
}
