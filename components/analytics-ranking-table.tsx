"use client";

import { AnalyticsTable, type AnalyticsColumn } from "@/components/analytics-table";
import type { BrandRankingRow } from "@/lib/pipeline/brand-rankings";

/**
 * De ranglijst op Concurrenten (plan analytics-herontwerp.md, C3), als eigen
 * Client Component. Zelfde reden als `analytics-cluster-table.tsx`: de
 * kolommen dragen functies, en die mogen niet als prop van de Server
 * Component `page.tsx` naar `AnalyticsTable` ("use client") oversteken.
 */
function pct(waarde: number | null): string {
  return waarde === null ? "-" : `${waarde}%`;
}

export function AnalyticsRankingTable({ rows }: { rows: BrandRankingRow[] }) {
  return (
    <AnalyticsTable
      rows={rows}
      rowKey={(r) => r.name}
      isOwnRow={(r) => r.isOwnBrand}
      columns={rankingKolommen}
      stickyOffset="calc(var(--header-h) + 3.5rem)"
    />
  );
}

/** De kolommen van de ranglijst (plan C3): merk, genoemd met staafje, positie,
 * als eerste, bron. */
const rankingKolommen: AnalyticsColumn<BrandRankingRow>[] = [
  {
    key: "merk",
    header: "Merk",
    render: (r) => <span className="font-medium">{r.name}</span>,
  },
  {
    key: "genoemd",
    header: "Genoemd",
    numeriek: true,
    width: "16rem",
    sortValue: (r) => r.mentionRate,
    render: (r) => (
      <span className="flex items-center justify-end gap-2">
        <span
          className="h-2 w-24 overflow-hidden rounded-[var(--radius-pill)]"
          style={{ background: "var(--bg-elevated)" }}
          aria-hidden
        >
          <span
            className="block h-full rounded-[var(--radius-pill)]"
            style={{ width: `${r.mentionRate ?? 0}%`, background: "var(--chart-2)" }}
          />
        </span>
        <span className="stat-value">{pct(r.mentionRate)}</span>
        <span className="text-muted">({r.mentions})</span>
      </span>
    ),
  },
  {
    key: "positie",
    header: "Positie",
    numeriek: true,
    width: "7rem",
    sortValue: (r) => r.avgPosition,
    render: (r) => (r.avgPosition === null ? "-" : r.avgPosition.toFixed(1)),
  },
  {
    key: "alseerste",
    header: "Als eerste",
    numeriek: true,
    width: "8rem",
    sortValue: (r) => r.recommendationRate,
    render: (r) => pct(r.recommendationRate),
  },
  {
    key: "bron",
    header: "Bron",
    numeriek: true,
    width: "7rem",
    sortValue: (r) => r.citationRate,
    render: (r) => pct(r.citationRate),
  },
];
