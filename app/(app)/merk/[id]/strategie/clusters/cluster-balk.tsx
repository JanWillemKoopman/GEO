"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { LABELFILTER_ALLES, LABELFILTER_GEEN, type Labelfilter } from "@/lib/cluster-labels";
import { STATUSFILTER_ALLES, STATUS_META, type Statusfilter } from "@/lib/analysis-status";
import type { AnalysisStatus, ClusterLabel } from "@/lib/types/database";
import { LabelBeheer } from "./label-beheer";

/**
 * Volgorde in het statusuitklapmenu: bewust niet op alfabet, maar dezelfde
 * volgorde als een cluster ze doorloopt, met "wacht op jou" (`concept_klaar`,
 * `mislukt`) vooraan. Dat is de reden dat iemand dit filter opent.
 */
const STATUS_VOLGORDE: AnalysisStatus[] = [
  "concept_klaar",
  "mislukt",
  "bezig",
  "meten",
  "gemeten",
  "gereed",
];

/**
 * De regel boven de clusterlijst: waar kijk je, en waarop filter je.
 *
 * ── VIER BEDIENINGEN OP ÉÉN REGEL ───────────────────────────────────────────
 *
 * Links twee knoppen die zeggen wélke lijst je ziet (alle clusters, of de
 * prullenbak), rechts de twee uitklapmenu's die die lijst inkorten: eerst
 * status (22 september 2026, "welke clusters wachten nog op mij"), dan label.
 * Dat is de volgorde waarin je ze leest: eerst welke verzameling, dan welk
 * deel ervan.
 *
 * ── WAAROM DE STAND IN HET ADRES ZIT EN NIET IN DE COMPONENT ────────────────
 *
 * `?weergave=prullenbak&label=<id>&status=<status>` staat in de URL, dus filteren gebeurt op de
 * server en de lijst die terugkomt is de lijst die klopt. Een filter in het
 * geheugen zou de kaartcijfers en de sortering van de serverpagina moeten
 * nabouwen, en dat is de tweede waarheid waar `lib/dashboard.ts` juist vanaf
 * wilde. Bijkomend: de stand overleeft verversen en is te delen.
 */
export function ClusterBalk({
  merkId,
  labels,
  filter,
  statusfilter,
  aantalPerLabel,
  aantalPerLabelTotaal,
  aantalPerStatus,
  aantalZonderLabel,
  aantalActief,
  aantalPrullenbak,
  inPrullenbak,
}: {
  merkId: string;
  labels: ClusterLabel[];
  filter: Labelfilter;
  statusfilter: Statusfilter;
  /** Per label, binnen de lijst die je nu ziet. Voor de aantallen in het filter. */
  aantalPerLabel: Record<string, number>;
  /**
   * Per label, over de actieve clusters én de prullenbak heen. Het beheerpaneel
   * gebruikt deze: staat je in de prullenbak, dan zou het andere getal bij elk
   * label "0 clusters" zeggen terwijl er tien onder hangen.
   */
  aantalPerLabelTotaal: Record<string, number>;
  /** Per status, binnen de lijst die het labelfilter al oplevert. */
  aantalPerStatus: Partial<Record<AnalysisStatus, number>>;
  aantalZonderLabel: number;
  aantalActief: number;
  aantalPrullenbak: number;
  inPrullenbak: boolean;
}) {
  const router = useRouter();
  const [beheer, setBeheer] = useState(false);
  const basis = `/merk/${merkId}/strategie/clusters`;

  // Label en status zijn twee losse URL-parameters (`filterOpLabel` en
  // `filterOpStatus` in de pagina zelf raken elkaar niet), dus wie de ene
  // wijzigt behoudt de andere.
  function bouwAdres(waarde: { label?: string; status?: string }) {
    const vraag = new URLSearchParams();
    if (inPrullenbak) vraag.set("weergave", "prullenbak");
    const nieuwLabel = waarde.label ?? filter;
    const nieuwStatus = waarde.status ?? statusfilter;
    if (nieuwLabel !== LABELFILTER_ALLES) vraag.set("label", nieuwLabel);
    if (nieuwStatus !== STATUSFILTER_ALLES) vraag.set("status", nieuwStatus);
    const staart = vraag.toString();
    router.push(staart ? `${basis}?${staart}` : basis);
  }

  function kiesLabel(waarde: string) {
    bouwAdres({ label: waarde });
  }

  function kiesStatus(waarde: string) {
    bouwAdres({ status: waarde });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={basis} className={inPrullenbak ? "btn-outline btn-sm" : "btn-primary btn-sm"}>
          Alle clusters ({aantalActief})
        </Link>
        <Link
          href={`${basis}?weergave=prullenbak`}
          className={inPrullenbak ? "btn-primary btn-sm" : "btn-outline btn-sm"}
        >
          <Icon naam="prullenbak" size={14} />
          Prullenbak ({aantalPrullenbak})
        </Link>

        {/* Rechts op dezelfde regel. `ml-auto` duwt het duo naar de rand zolang
            er ruimte is, en op een smal scherm valt het eronder in plaats van
            de knoppen weg te drukken. */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="btn-ghost btn-sm shrink-0 whitespace-nowrap"
            onClick={() => setBeheer((aan) => !aan)}
            aria-expanded={beheer}
          >
            <Icon naam="label" size={14} />
            Labels beheren
          </button>

          <select
            value={statusfilter}
            onChange={(e) => kiesStatus(e.target.value)}
            className="field field-select w-auto"
            aria-label="Filter op status"
          >
            <option value={STATUSFILTER_ALLES}>Alle statussen</option>
            {STATUS_VOLGORDE.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label} ({aantalPerStatus[status] ?? 0})
              </option>
            ))}
          </select>

          <select
            value={filter}
            onChange={(e) => kiesLabel(e.target.value)}
            className="field field-select w-auto"
            aria-label="Filter op label"
          >
            <option value={LABELFILTER_ALLES}>Alle labels</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({aantalPerLabel[l.id] ?? 0})
              </option>
            ))}
            {/* Zonder deze stand zijn de clusters die nog geen label hebben
                nergens meer terug te vinden zodra er tien labels zijn. */}
            <option value={LABELFILTER_GEEN}>Zonder label ({aantalZonderLabel})</option>
          </select>
        </div>
      </div>

      {beheer && (
        <LabelBeheer
          merkId={merkId}
          labels={labels}
          aantalPerLabel={aantalPerLabelTotaal}
          onSluiten={() => setBeheer(false)}
        />
      )}
    </div>
  );
}
