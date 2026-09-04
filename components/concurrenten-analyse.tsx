"use client";

import { useState } from "react";
import { AnalyticsTable, type AnalyticsColumn } from "@/components/analytics-table";
import { DetailPanel } from "@/components/detail-panel";
import { ExternalLink } from "@/components/external-link";
import type { BrandRankingRow } from "@/lib/pipeline/brand-rankings";

/**
 * De ranglijst, het bronnenlandschap en het detailpaneel op Concurrenten, als
 * één Client Component (plan analytics-herontwerp.md, C3, C4, C5, C6).
 *
 * Ze horen bij elkaar: een concurrent aanwijzen (C4) kleurt de bronnenlijst
 * eronder, en opent tegelijk het detailpaneel (C6, F4) met dezelfde bronnen
 * en de clusters waarin hij voorkomt. Dat kan alleen als ze gedeelde
 * clientstate delen, dus staan ze in één component. `page.tsx` blijft data
 * doorgeven (nooit functies, zie `analytics-cluster-table.tsx`).
 */
export interface BronRij {
  domain: string;
  citations: number;
  ownPresent: boolean | null;
  ownUrl: string | null;
  /** Genormaliseerd (lowercase, getrimd) voor het vergelijken met een merknaam. */
  competitorsGenormaliseerd: string[];
}

export interface ClusterVermelding {
  clusterName: string;
  mentionsCount: number;
  avgPosition: number | null;
}

function pct(waarde: number | null): string {
  return waarde === null ? "-" : `${waarde}%`;
}

function genormaliseerd(naam: string): string {
  return naam.trim().toLocaleLowerCase("nl");
}

export function ConcurrentenAnalyse({
  rankingRows,
  bronnen,
  vermeldingenPerConcurrent,
  omitted,
}: {
  rankingRows: BrandRankingRow[];
  bronnen: BronRij[];
  /** Concurrentnaam → in welke clusters hij voorkomt (C6). */
  vermeldingenPerConcurrent: Record<string, ClusterVermelding[]>;
  /** Merken die maar één keer voorkwamen en niet in `rankingRows` staan. */
  omitted: number;
}) {
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);
  const gekozenRij = rankingRows.find((r) => r.name === geselecteerd) ?? null;
  const genormaliseerdeSelectie = geselecteerd ? genormaliseerd(geselecteerd) : null;

  // ── C5: het bronnenlandschap als kanslijst ──────────────────────────────
  // Een kans is een bron waar je zelf BEVESTIGD niet op staat (niet "onbekend":
  // conventie 3) en waar bevestigde concurrenten wél staan. Score: hoe vaker
  // aangehaald, keer hoeveel concurrenten er staan.
  const concurrentNamenGenormaliseerd = new Set(
    rankingRows.filter((r) => !r.isOwnBrand).map((r) => genormaliseerd(r.name)),
  );
  const bronnenMetScore = bronnen.map((b) => {
    const matchendeConcurrenten = b.competitorsGenormaliseerd.filter((c) => concurrentNamenGenormaliseerd.has(c));
    const kansScore = b.ownPresent === false ? b.citations * matchendeConcurrenten.length : 0;
    return { bron: b, kansScore, aantalConcurrenten: matchendeConcurrenten.length };
  });
  const kansen = bronnenMetScore
    .filter((b) => b.kansScore > 0)
    .sort((a, b) => b.kansScore - a.kansScore)
    .slice(0, 3);
  const kansDomeinen = new Set(kansen.map((k) => k.bron.domain));
  const overig = bronnenMetScore.filter((b) => !kansDomeinen.has(b.bron.domain));

  const kolommen: AnalyticsColumn<BrandRankingRow>[] = [
    { key: "merk", header: "Merk", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "genoemd",
      header: "Genoemd",
      numeriek: true,
      width: "16rem",
      sortValue: (r) => r.mentionRate,
      render: (r) => (
        <span className="flex items-center justify-end gap-2">
          <span className="h-2 w-24 overflow-hidden rounded-[var(--radius-pill)]" style={{ background: "var(--bg-elevated)" }} aria-hidden>
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

  return (
    <div className="flex flex-col gap-6">
      <div className={`grid grid-cols-1 gap-4 ${gekozenRij ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
        <div className="card">
          <AnalyticsTable
            rows={rankingRows}
            rowKey={(r) => r.name}
            isOwnRow={(r) => r.isOwnBrand}
            columns={kolommen}
            stickyOffset="calc(var(--header-h) + 3.5rem)"
            onRowClick={(r) => !r.isOwnBrand && setGeselecteerd(r.name === geselecteerd ? null : r.name)}
            selectedKey={geselecteerd}
          />
        </div>
        {gekozenRij && (
          <DetailPanel title={gekozenRij.name} onClose={() => setGeselecteerd(null)}>
            <ConcurrentDetail
              vermeldingen={vermeldingenPerConcurrent[gekozenRij.name] ?? []}
              bronnen={bronnen.filter((b) => b.competitorsGenormaliseerd.includes(genormaliseerd(gekozenRij.name)))}
            />
          </DetailPanel>
        )}
      </div>

      {omitted > 0 && (
        <p className="text-sm text-muted">
          {omitted === 1
            ? "Eén merk kwam maar één keer voor en staat er niet bij"
            : `${omitted} merken kwamen maar één keer voor en staan er niet bij`}
          : één vermelding is toeval, geen patroon.
        </p>
      )}

      {/* ── 2. Bronnenlandschap, als kanslijst (C4, C5) ─────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Bronnenlandschap</span>
        <p className="text-sm text-muted">
          {geselecteerd
            ? `Gekleurd: waar ${geselecteerd} op staat.`
            : kansen.length > 0
              ? "De bronnen waar de meeste concurrenten wel op staan en jij niet. Hier kun je beginnen."
              : "De sites die een AI-assistent aanhaalt als hij over jouw onderwerpen praat."}
        </p>
        {bronnen.length === 0 ? (
          <div className="card flex flex-col gap-1">
            <span className="mono-label">Nog niet in kaart</span>
            <p className="text-secondary">
              ORBIT ENGINE brengt dit in kaart tijdens de meting. Zodra de eerste ronde klaar is,
              staat hier welke sites de AI aanhaalt.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {(kansen.length > 0 ? kansen.map((k) => k.bron) : bronnenMetScore.slice(0, 5).map((b) => b.bron)).map(
                (b) => (
                  <BronRegel
                    key={b.domain}
                    bron={b}
                    gemarkeerd={genormaliseerdeSelectie !== null && b.competitorsGenormaliseerd.includes(genormaliseerdeSelectie)}
                    isKans={kansDomeinen.has(b.domain)}
                  />
                ),
              )}
            </ul>
            {(kansen.length > 0 ? overig : bronnenMetScore.slice(5)).length > 0 && (
              <details className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
                <summary className="cursor-pointer text-sm text-secondary">
                  {kansen.length > 0 ? overig.length : bronnenMetScore.length - 5} overige bronnen
                </summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {(kansen.length > 0 ? overig : bronnenMetScore.slice(5)).map((b) => (
                    <BronRegel
                      key={b.bron.domain}
                      bron={b.bron}
                      gemarkeerd={genormaliseerdeSelectie !== null && b.bron.competitorsGenormaliseerd.includes(genormaliseerdeSelectie)}
                      isKans={false}
                    />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BronRegel({ bron: b, gemarkeerd, isKans }: { bron: BronRij; gemarkeerd: boolean; isKans: boolean }) {
  return (
    <li
      className="card flex flex-wrap items-center justify-between gap-3"
      style={gemarkeerd ? { borderColor: "var(--intent-intelligence-border)", background: "var(--intent-intelligence-surface)" } : undefined}
    >
      <span className="min-w-0 flex-1">
        <span className="break-url block font-medium">{b.domain}</span>
        <span className="mono-label">
          {b.citations === 1 ? "1 keer aangehaald" : `${b.citations} keer aangehaald`}
        </span>
      </span>
      <span className="flex items-center gap-2">
        {isKans && <span className="chip chip-attention">kans</span>}
        {b.ownPresent === null ? (
          <span className="chip chip-neutral">nog niet gecontroleerd</span>
        ) : b.ownPresent ? (
          <span className="chip chip-success">
            {b.ownUrl ? <ExternalLink href={b.ownUrl}>je staat erop</ExternalLink> : "je staat erop"}
          </span>
        ) : (
          <span className="chip chip-warning">je staat er niet op</span>
        )}
      </span>
    </li>
  );
}

/** De inhoud van het detailpaneel per concurrent (plan C6). */
function ConcurrentDetail({ vermeldingen, bronnen }: { vermeldingen: ClusterVermelding[]; bronnen: BronRij[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="mono-label">In welke clusters hij je passeert</span>
        {vermeldingen.length === 0 ? (
          <p className="type-compact text-muted">Geen van je clusters, bij deze filters.</p>
        ) : (
          vermeldingen.map((v) => (
            <div key={v.clusterName} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-secondary">{v.clusterName}</span>
              <span className="stat-value shrink-0">
                {v.mentionsCount}× {v.avgPosition !== null && `· plek ${v.avgPosition.toFixed(1)}`}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="mono-label">Op welke bronnen hij staat</span>
        {bronnen.length === 0 ? (
          <p className="type-compact text-muted">Geen bekende bron.</p>
        ) : (
          bronnen.slice(0, 10).map((b) => (
            <span key={b.domain} className="break-url text-sm text-secondary">
              {b.domain}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
