"use client";

import { useState } from "react";
import { AnalyticsTable, type AnalyticsColumn } from "@/components/analytics-table";
import { Drawer } from "@/components/drawer";
import { ExternalLink } from "@/components/external-link";
import type { ImpactVerdict } from "@/lib/types/database";
import type { ImpactUitleg } from "@/lib/impact-uitleg";
import { hoogsteBewezenTrede, TREDE_SLEUTELS, type Trede, type TredeStatus } from "@/lib/meting/bewijsladder";

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
  /** De cijfers achter het oordeel, of `null` zolang er niet nagemeten is. */
  effectUitleg: ImpactUitleg | null;
  /** Chronologisch, oudste eerst, vanaf de publicatiedatum. */
  sindsPublicatie: { day: string; clicks: number }[];
  publishedAt: string | null;
  /** M4: de bewijsladder, altijd zeven tredes in vaste volgorde. */
  ladder: Trede[];
}

const TREDE_CHIP: Record<TredeStatus, string> = {
  bewezen: "chip-success",
  geen_verandering: "chip-neutral",
  te_weinig_gegevens: "chip-neutral",
  geen_gegevens: "chip-neutral",
};

const TREDE_STIP: Record<TredeStatus, string> = {
  bewezen: "●",
  geen_verandering: "○",
  te_weinig_gegevens: "○",
  geen_gegevens: "·",
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
      // M4: één woordoordeel ("gestegen") verving hier tot 28 september 2026
      // wat feitelijk zeven vragen zijn (gepubliceerd tot omzet, P7: nooit één
      // cijfer als opbrengst). Deze kolom toont de verste bewezen trede; de
      // volledige ladder staat in het detailpaneel (`LadderDetail`).
      key: "bewijs",
      header: "Bewijs",
      width: "13rem",
      sortValue: (r) => TREDE_SLEUTELS.indexOf(hoogsteBewezenTrede(r.ladder)?.sleutel ?? "publicatie"),
      render: (r) => {
        const hoogste = hoogsteBewezenTrede(r.ladder);
        return hoogste ? (
          <span className="flex flex-col items-start gap-0.5">
            <span className={`chip ${TREDE_CHIP[hoogste.status]}`}>{hoogste.label.toLowerCase()}</span>
            {hoogste.cijfer && <span className="type-caption text-muted">{hoogste.cijfer}</span>}
          </span>
        ) : (
          <span className="chip chip-neutral">nog geen bewijs</span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {toonTypeFilter && (
        <label className="flex items-center gap-2 text-sm">
          <span className="mono-label">Paginatype</span>
          <select className="field field-select" value={typeFilter ?? ""} onChange={(e) => setTypeFilter(e.target.value || null)}>
            <option value="">Alle types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      )}
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
      <Drawer
        open={gekozenRij !== null}
        titel={gekozenRij?.page ?? ""}
        onderschrift="sinds publicatie"
        onSluit={() => setGeselecteerd(null)}
      >
        {gekozenRij && <PaginaDetail rij={gekozenRij} />}
      </Drawer>
    </div>
  );
}

/**
 * De inhoud van het detailpaneel (plan V8, sinds M4 de bewijsladder in plaats
 * van één oordeel): de zeven tredes, en daaronder het verloop van de klikken.
 */
function PaginaDetail({ rij }: { rij: OnzePaginaRij }) {
  return (
    <div className="flex flex-col gap-6">
      <LadderDetail rij={rij} />
      <KlikkenDetail rij={rij} />
    </div>
  );
}

const TREDE_STATUS_LABEL: Record<TredeStatus, string> = {
  bewezen: "bewezen",
  geen_verandering: "geen verandering",
  te_weinig_gegevens: "te weinig gegevens",
  geen_gegevens: "geen gegevens",
};

/**
 * De zeven tredes van de bewijsladder (M4), elk met zijn eigen stand. Bij
 * "genoemd door AI" staat de volledige vergelijking met de controlegroep
 * eronder (`lib/impact-uitleg.ts`), want dat is de enige trede die op een
 * steekproef rust en dus om die onderbouwing vraagt (P7: nooit één cijfer als
 * opbrengst zonder de vergelijking ernaast).
 */
function LadderDetail({ rij }: { rij: OnzePaginaRij }) {
  const u = rij.effectUitleg;
  return (
    <div className="flex flex-col gap-3">
      <span className="mono-label">Bewijs, stap voor stap</span>
      <ul className="flex flex-col gap-3">
        {rij.ladder.map((trede) => (
          <li key={trede.sleutel} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span aria-hidden className="text-muted">{TREDE_STIP[trede.status]}</span>
              <span className="font-medium">{trede.label}</span>
              <span className={`chip ${TREDE_CHIP[trede.status]}`}>{TREDE_STATUS_LABEL[trede.status]}</span>
            </div>
            {trede.sleutel === "vermelding" && rij.effectOpAi && u ? (
              <div className="flex flex-col gap-1 pl-5 text-sm">
                <p>{u.doel}</p>
                {u.controle && <p>{u.controle}</p>}
                <p className="text-secondary">{u.conclusie}</p>
                <span className="type-caption text-muted">{u.moment}</span>
              </div>
            ) : (
              <p className="pl-5 text-sm text-secondary">{trede.uitleg}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KlikkenDetail({ rij }: { rij: OnzePaginaRij }) {
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
