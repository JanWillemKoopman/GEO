"use client";

import { useState } from "react";
import { AnalyticsTable, type AnalyticsColumn } from "@/components/analytics-table";
import { DetailPanel } from "@/components/detail-panel";
import { ExternalLink } from "@/components/external-link";
import type { ImpactVerdict } from "@/lib/types/database";

/**
 * De tabel van onze eigen pagina's op Zoekverkeer (plan analytics-herontwerp.md,
 * V3, V6, V8), als Client Component om dezelfde reden als
 * `analytics-cluster-table.tsx`: de kolommen dragen functies.
 */
export interface OnzePaginaRij {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
  type: string | null;
  effectOpAi: ImpactVerdict | null;
  /** Chronologisch, oudste eerst, vanaf de publicatiedatum. */
  sindsPublicatie: { day: string; clicks: number }[];
  publishedAt: string | null;
}

const VERDICT_LABEL: Record<ImpactVerdict, { text: string; chip: string }> = {
  gestegen: { text: "gestegen", chip: "chip-success" },
  gelijk: { text: "gelijk gebleven", chip: "chip-neutral" },
  gedaald: { text: "gedaald", chip: "chip-danger" },
  te_weinig_data: { text: "te weinig data", chip: "chip-neutral" },
};

function procent(waarde: number | null): string {
  return waarde === null ? "-" : `${(waarde * 100).toFixed(1)}%`;
}

export function ZoekverkeerPaginas({ rows }: { rows: OnzePaginaRij[] }) {
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const gekozenRij = rows.find((r) => r.page === geselecteerd) ?? null;

  // V6: pas vanaf tien pagina's wordt het paginatype een filter, en geen
  // aparte kaart.
  const types = [...new Set(rows.map((r) => r.type).filter((t): t is string => t !== null))];
  const toonTypeFilter = rows.length >= 10 && types.length > 1;
  const zichtbareRijen = typeFilter ? rows.filter((r) => r.type === typeFilter) : rows;

  const kolommen: AnalyticsColumn<OnzePaginaRij>[] = [
    {
      key: "pagina",
      header: "Pagina",
      sortValue: (r) => r.page,
      render: (r) => (
        <ExternalLink href={r.page} className="break-url hover:underline">
          {r.page}
        </ExternalLink>
      ),
    },
    {
      key: "klikken",
      header: "Klikken",
      numeriek: true,
      width: "7rem",
      sortValue: (r) => r.clicks,
      render: (r) => r.clicks.toLocaleString("nl-NL"),
    },
    {
      key: "vertoningen",
      header: "Vertoningen",
      numeriek: true,
      width: "8rem",
      sortValue: (r) => r.impressions,
      render: (r) => r.impressions.toLocaleString("nl-NL"),
    },
    {
      key: "ctr",
      header: "CTR",
      numeriek: true,
      width: "6rem",
      sortValue: (r) => r.ctr,
      render: (r) => procent(r.ctr),
    },
    {
      key: "positie",
      header: "Positie",
      numeriek: true,
      width: "6rem",
      sortValue: (r) => r.position,
      render: (r) => (r.position === null ? "-" : r.position.toFixed(1)),
    },
    {
      key: "effect",
      header: "Effect op AI",
      width: "9rem",
      sortValue: (r) => r.effectOpAi,
      render: (r) =>
        r.effectOpAi ? (
          <span className={`chip ${VERDICT_LABEL[r.effectOpAi].chip}`}>{VERDICT_LABEL[r.effectOpAi].text}</span>
        ) : (
          <span className="chip chip-neutral">nog niet gemeten</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {toonTypeFilter && (
        <label className="flex items-center gap-2 text-sm">
          <span className="mono-label">Paginatype</span>
          <select className="field" value={typeFilter ?? ""} onChange={(e) => setTypeFilter(e.target.value || null)}>
            <option value="">Alle types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className={`grid grid-cols-1 gap-4 ${gekozenRij ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
        <div className="card">
          <AnalyticsTable
            rows={zichtbareRijen}
            rowKey={(r) => r.page}
            defaultSortKey="klikken"
            defaultSortDir="desc"
            columns={kolommen}
            onRowClick={(r) => setGeselecteerd(r.page === geselecteerd ? null : r.page)}
            selectedKey={geselecteerd}
          />
        </div>
        {gekozenRij && (
          <DetailPanel title={gekozenRij.page} subtitle="sinds publicatie" onClose={() => setGeselecteerd(null)}>
            <PaginaDetail rij={gekozenRij} />
          </DetailPanel>
        )}
      </div>
    </div>
  );
}

/** De inhoud van het detailpaneel (plan V8): het verloop sinds publicatie. */
function PaginaDetail({ rij }: { rij: OnzePaginaRij }) {
  if (rij.sindsPublicatie.length === 0) {
    return <p className="text-secondary">Nog geen klikken gemeten sinds publicatie.</p>;
  }
  const max = Math.max(1, ...rij.sindsPublicatie.map((p) => p.clicks));
  return (
    <div className="flex flex-col gap-2">
      <span className="mono-label">
        {rij.publishedAt
          ? `Live sinds ${new Date(rij.publishedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}`
          : "Publicatiedatum onbekend"}
      </span>
      <div className="flex h-24 items-end gap-px">
        {rij.sindsPublicatie.map((p) => (
          <span
            key={p.day}
            className="flex-1 rounded-t-[2px]"
            style={{ height: `${Math.max(2, (p.clicks / max) * 100)}%`, background: "var(--chart-2)" }}
            title={`${p.day}: ${p.clicks} klikken`}
          />
        ))}
      </div>
      <span className="type-caption text-muted">
        {rij.sindsPublicatie.reduce((s, p) => s + p.clicks, 0)} klikken over{" "}
        {rij.sindsPublicatie.length} {rij.sindsPublicatie.length === 1 ? "dag" : "dagen"}
      </span>
    </div>
  );
}
