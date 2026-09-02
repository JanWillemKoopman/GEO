"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CLUSTERFILTER_ALLES,
  LABELFILTER_ALLES,
  LABELFILTER_GEEN,
  PERIODEFILTER_ACTUEEL,
  type Periodeoptie,
} from "@/lib/analytics-filters";
import type { Labelachtig } from "@/lib/cluster-labels";

/**
 * De ene filterbalk voor alle vier de Analytics-schermen (plan
 * analytics-herontwerp.md, F2). Periode, Label en Cluster, in die volgorde;
 * Fase komt pas in ronde 3, en tot die tijd staat hij hier niet: een filter
 * tonen dat nog niets doet is erger dan hem weglaten.
 *
 * De keuze staat in het adres en niet in clientstate (`?periode=`, `?label=`,
 * `?cluster=`), dus een gefilterd beeld is te delen en te bewaren. Elke
 * dropdown verschijnt alleen als er iets te kiezen valt: één cluster of één
 * label heeft geen keuzemenu nodig, net als `PeriodPicker` dat al deed.
 */
export function AnalyticsFilters({
  periodes,
  labels,
  clustersBijLabel,
  periodefilter,
  labelfilter,
  clusterfilter,
}: {
  periodes: Periodeoptie[];
  labels: Labelachtig[];
  /** De clusters die bij het huidige labelfilter horen (`clustersVoorFilter()`). */
  clustersBijLabel: Labelachtig[];
  periodefilter: string;
  labelfilter: string;
  clusterfilter: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (periodes.length < 2 && labels.length === 0 && clustersBijLabel.length <= 1) {
    return null;
  }

  function navigeer(wijzigingen: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [sleutel, waarde] of Object.entries(wijzigingen)) {
      if (waarde === null) params.delete(sleutel);
      else params.set(sleutel, waarde);
    }
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div
      className="analytics-filterbalk no-print sticky top-[var(--header-h)] z-20 -mx-6 flex flex-wrap items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-base-blur)] px-6 py-3 backdrop-blur-md"
      role="group"
      aria-label="Filters"
    >
      {periodes.length >= 2 && (
        <Filter label="Periode">
          <select
            className="field"
            value={periodefilter}
            onChange={(e) => navigeer({ periode: e.target.value === PERIODEFILTER_ACTUEEL ? null : e.target.value })}
          >
            <option value={PERIODEFILTER_ACTUEEL}>Actueel</option>
            {periodes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Filter>
      )}

      {labels.length > 0 && (
        <Filter label="Label">
          <select
            className="field"
            value={labelfilter}
            // Een gekozen label beperkt de clusterlijst (F2); een nieuwe keuze
            // die niet meer bij dat label hoort is verwarrender dan de
            // clusterkeuze meteen terug te zetten op "alle clusters".
            onChange={(e) =>
              navigeer({
                label: e.target.value === LABELFILTER_ALLES ? null : e.target.value,
                cluster: null,
              })
            }
          >
            <option value={LABELFILTER_ALLES}>Alle labels</option>
            <option value={LABELFILTER_GEEN}>Zonder label</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Filter>
      )}

      {clustersBijLabel.length > 1 && (
        <Filter label="Cluster">
          <select
            className="field"
            value={clusterfilter}
            onChange={(e) => navigeer({ cluster: e.target.value === CLUSTERFILTER_ALLES ? null : e.target.value })}
          >
            <option value={CLUSTERFILTER_ALLES}>Alle clusters</option>
            {clustersBijLabel.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Filter>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="mono-label">{label}</span>
      {children}
    </label>
  );
}
