"use client";

import Link from "next/link";
import { useState } from "react";
import { AnalyticsTable, type AnalyticsColumn } from "@/components/analytics-table";
import { DetailPanel } from "@/components/detail-panel";
import { Icon } from "@/components/icon";
import { confidenceBand, changeIsMeaningful } from "@/lib/stats/uncertainty";
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

function leidend(s: VisibilityScore): number {
  return s.weighted_score ?? s.score;
}

function stderrVan(s: VisibilityScore): number {
  return (s.weighted_score != null ? s.weighted_stderr : s.score_stderr) ?? 0;
}

export function AnalyticsClusterTable({
  rows,
  labelNaamPerId,
}: {
  rows: ClusterRij[];
  labelNaamPerId: Map<string, string>;
}) {
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);
  const gekozenRij = rows.find((r) => r.cluster.id === geselecteerd) ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <AnalyticsTable
        rows={rows}
        rowKey={(r) => r.cluster.id}
        defaultSortKey="zichtbaarheid"
        defaultSortDir="asc"
        columns={clusterKolommen(labelNaamPerId)}
        stickyOffset="calc(var(--header-h) + 3.5rem)"
        onRowClick={(r) => setGeselecteerd(r.cluster.id === geselecteerd ? null : r.cluster.id)}
        selectedKey={geselecteerd}
      />
      {gekozenRij && (
        <DetailPanel title={gekozenRij.cluster.name} onClose={() => setGeselecteerd(null)}>
          <ClusterDetail rij={gekozenRij} />
        </DetailPanel>
      )}
    </div>
  );
}

/** De inhoud van het detailpaneel (plan Z8): de gemeten vragen en de laatste
 * drie metingen. De verdeling over de drie fasen staat hier bewust niet bij:
 * die rust op een optelling uit `tracking_runs` die nog niet gebouwd is
 * (F5, zie `docs/tasks/analytics-herontwerp.md`). */
function ClusterDetail({ rij }: { rij: ClusterRij }) {
  const laatsteDrie = [...rij.reeks].reverse().slice(0, 3);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mono-label">Gemeten vragen</span>
        <p className="stat-value text-lg">{rij.laatste?.judged_runs ?? "-"}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="mono-label">Laatste metingen</span>
        {laatsteDrie.map((s) => (
          <div key={s.week_no} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted">
              {s.computed_at
                ? new Date(s.computed_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
                : "-"}
            </span>
            <span className="stat-value">{Math.round(leidend(s))}%</span>
          </div>
        ))}
      </div>
      <Link href={`/analyses/${rij.cluster.id}`} className="text-sm underline">
        Naar het clusterdossier
      </Link>
    </div>
  );
}

/** De kolommen van de clustertabel (plan Z3): label, cluster, zichtbaarheid,
 * marge, verandering, gemeten vragen, laatst gemeten. Gesorteerd op zwakste
 * eerst. */
function clusterKolommen(labelNaamPerId: Map<string, string>): AnalyticsColumn<ClusterRij>[] {
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
        <Link href={`/analyses/${r.cluster.id}`} className="font-medium hover:underline">
          {r.cluster.name}
        </Link>
      ),
    },
    {
      key: "zichtbaarheid",
      header: "Zichtbaarheid",
      numeriek: true,
      width: "8rem",
      sortValue: (r) => leidend(r.laatste!),
      render: (r) => `${Math.round(leidend(r.laatste!))}%`,
    },
    {
      key: "marge",
      header: "Marge",
      numeriek: true,
      width: "7rem",
      sortValue: (r) => confidenceBand(leidend(r.laatste!), stderrVan(r.laatste!)).margin,
      render: (r) => {
        const band = confidenceBand(leidend(r.laatste!), stderrVan(r.laatste!));
        return band.margin > 0 ? `± ${band.margin}` : "-";
      },
    },
    {
      key: "verandering",
      header: "Verandering",
      numeriek: true,
      width: "9rem",
      sortValue: (r) => (r.vorige ? leidend(r.laatste!) - leidend(r.vorige) : null),
      render: (r) => {
        if (!r.vorige) return <span className="chip chip-neutral">eerste meting</span>;
        const nu = leidend(r.laatste!);
        const toen = leidend(r.vorige);
        const betekenisvol = changeIsMeaningful(
          { score: nu, stderr: stderrVan(r.laatste!) },
          { score: toen, stderr: stderrVan(r.vorige) },
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
