"use client";

import Link from "next/link";
import { AnalyticsTable, type AnalyticsColumn } from "@/components/analytics-table";
import { Icon } from "@/components/icon";
import { confidenceBand, changeIsMeaningful } from "@/lib/stats/uncertainty";
import { poolRecent } from "@/lib/stats/pooling";
import { cijferVoorBron, BRONFILTER_STANDAARD } from "@/lib/engines/bron";
import type { VisibilityScore } from "@/lib/types/database";

/**
 * De clustertabel op Zichtbaarheid (plan analytics-herontwerp.md, Z3), als
 * eigen Client Component.
 *
 * ⚠️ **Waarom dit niet gewoon in `page.tsx` staat.** De kolommen van
 * `AnalyticsTable` dragen `render`/`sortValue`-functies, en een Server
 * Component mag geen functies als prop doorgeven aan een Client Component:
 * React serialiseert de props over die grens, en een functie is niet te
 * serialiseren. `page.tsx` blijft dus alleen data doorgeven (`rows`,
 * `labelNaamPerId`, allebei gewone data), en de kolommen met hun functies
 * worden hier, aan de clientkant, gebouwd.
 */
export interface ClusterRij {
  cluster: { id: string; name: string; label_id: string | null };
  reeks: VisibilityScore[];
  laatste: VisibilityScore | null;
  vorige: VisibilityScore | null;
}

/**
 * De score van de gekozen BRON (20 september 2026). Zonder keuze is dat de
 * primaire engine, en dan leest deze functie gewoon de kolommen die er altijd
 * al stonden. Zie lib/engines/bron.ts.
 */
function leidend(s: VisibilityScore, bron: string = BRONFILTER_STANDAARD): number {
  return cijferVoorBron(s, bron)?.score ?? 0;
}

function stderrVan(s: VisibilityScore, bron: string = BRONFILTER_STANDAARD): number {
  return cijferVoorBron(s, bron)?.stderr ?? 0;
}

/**
 * Het cijfer van een cluster uit de laatste drie rondes samen (20 september 2026).
 *
 * ⚠️ De kolom "Verandering" blijft bewust de LOSSE rondes vergelijken. Dat zijn
 * twee verschillende vragen: dit is "waar sta je", die is "is er iets gebeurd".
 * Ze spreken elkaar niet tegen, want zodra er écht iets gebeurt stopt
 * `poolRecent()` met samenvoegen en is dit cijfer gelijk aan de laatste ronde.
 */
function samengevoegd(r: ClusterRij, bron: string) {
  return poolRecent(r.reeks.map((s) => ({ score: leidend(s, bron), stderr: stderrVan(s, bron) })));
}

/** De band hoort bij het getoonde cijfer, dus bij de samengevoegde schatting. */
function bandVan(r: ClusterRij, bron: string) {
  const p = samengevoegd(r, bron);
  return p
    ? confidenceBand(p.score, p.stderr)
    : confidenceBand(leidend(r.laatste!, bron), stderrVan(r.laatste!, bron));
}

export function AnalyticsClusterTable({
  rows,
  labelNaamPerId,
  merkId,
  bron = BRONFILTER_STANDAARD,
}: {
  rows: ClusterRij[];
  labelNaamPerId: Map<string, string>;
  /** Het merk waar dit scherm bij hoort: de clusternaam linkt naar zijn eigen filter. */
  merkId: string;
  /** De gekozen meetbron. Zie lib/engines/bron.ts. */
  bron?: string;
}) {
  return (
    <div className="card">
      <AnalyticsTable
        rows={rows}
        rowKey={(r) => r.cluster.id}
        defaultSortKey="zichtbaarheid"
        defaultSortDir="asc"
        columns={clusterKolommen(labelNaamPerId, bron, merkId)}
        stickyOffset="calc(var(--header-h) + 3.5rem)"
      />
    </div>
  );
}

/** De kolommen van de clustertabel (plan Z3): label, cluster, zichtbaarheid,
 * marge, verandering, gemeten vragen, laatst gemeten. Gesorteerd op zwakste
 * eerst. */
function clusterKolommen(
  labelNaamPerId: Map<string, string>,
  bron: string,
  merkId: string,
): AnalyticsColumn<ClusterRij>[] {
  return [
    {
      key: "label",
      header: "Label",
      width: "9rem",
      sortValue: (r) => (r.cluster.label_id ? labelNaamPerId.get(r.cluster.label_id) ?? null : null),
      render: (r) =>
        r.cluster.label_id ? (
          labelNaamPerId.get(r.cluster.label_id) ?? "Onbekend label"
        ) : (
          <span className="text-muted">Zonder label</span>
        ),
    },
    {
      key: "cluster",
      header: "Cluster",
      sortValue: (r) => r.cluster.name,
      render: (r) => (
        <Link
          href={`/merk/${merkId}/analytics?cluster=${r.cluster.id}`}
          className="font-medium hover:underline"
        >
          {r.cluster.name}
        </Link>
      ),
    },
    {
      key: "zichtbaarheid",
      header: "Zichtbaarheid",
      numeriek: true,
      width: "8rem",
      sortValue: (r) => samengevoegd(r, bron)?.score ?? leidend(r.laatste!, bron),
      render: (r) => `${samengevoegd(r, bron)?.score ?? Math.round(leidend(r.laatste!, bron))}%`,
    },
    {
      key: "marge",
      header: "Marge",
      numeriek: true,
      width: "7rem",
      sortValue: (r) => bandVan(r, bron).margin,
      render: (r) => {
        const band = bandVan(r, bron);
        return band.margin > 0 ? `± ${band.margin}` : "-";
      },
    },
    {
      key: "verandering",
      header: "Verandering",
      numeriek: true,
      width: "9rem",
      sortValue: (r) => (r.vorige ? leidend(r.laatste!, bron) - leidend(r.vorige, bron) : null),
      render: (r) => {
        if (!r.vorige) return <span className="chip chip-neutral">eerste meting</span>;
        const nu = leidend(r.laatste!, bron);
        const toen = leidend(r.vorige, bron);
        const betekenisvol = changeIsMeaningful(
          { score: nu, stderr: stderrVan(r.laatste!, bron) },
          { score: toen, stderr: stderrVan(r.vorige, bron) },
        ).changed;
        const delta = nu - toen;
        if (!betekenisvol) return <span className="chip chip-neutral">gelijk</span>;
        return (
          <span className={delta > 0 ? "chip chip-success" : "chip chip-danger"}>
            <Icon naam={delta > 0 ? "stijging" : "daling"} size={12} />
            {Math.abs(Math.round(delta))}
          </span>
        );
      },
    },
    {
      key: "gemeten",
      header: "Gemeten vragen",
      numeriek: true,
      width: "8rem",
      sortValue: (r) => r.laatste!.judged_runs ?? null,
      render: (r) => r.laatste!.judged_runs ?? "-",
    },
    {
      key: "laatstgemeten",
      header: "Laatst gemeten",
      width: "9rem",
      sortValue: (r) => r.laatste!.computed_at ?? null,
      render: (r) =>
        r.laatste!.computed_at
          ? new Date(r.laatste!.computed_at).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "-",
    },
  ];
}
