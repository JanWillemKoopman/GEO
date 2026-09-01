"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { LABELFILTER_ALLES, LABELFILTER_GEEN, type Labelfilter } from "@/lib/cluster-labels";
import type { ClusterLabel } from "@/lib/types/database";

/**
 * De regel boven de clusterlijst: waar kijk je, en waarop filter je.
 *
 * ── DRIE BEDIENINGEN OP ÉÉN REGEL ───────────────────────────────────────────
 *
 * Links twee knoppen die zeggen wélke lijst je ziet (alle clusters, of de
 * prullenbak), rechts het uitklapmenu dat die lijst inkort. Dat is de volgorde
 * waarin je ze leest: eerst welke verzameling, dan welk deel ervan.
 *
 * ── WAAROM DE STAND IN HET ADRES ZIT EN NIET IN DE COMPONENT ────────────────
 *
 * `?weergave=prullenbak&label=<id>` staat in de URL, dus filteren gebeurt op de
 * server en de lijst die terugkomt is de lijst die klopt. Een filter in het
 * geheugen zou de kaartcijfers en de sortering van de serverpagina moeten
 * nabouwen, en dat is de tweede waarheid waar `lib/dashboard.ts` juist vanaf
 * wilde. Bijkomend: de stand overleeft verversen en is te delen.
 */
export function ClusterBalk({
  merkId,
  labels,
  filter,
  aantalPerLabel,
  aantalZonderLabel,
  aantalActief,
  aantalPrullenbak,
  inPrullenbak,
}: {
  merkId: string;
  labels: ClusterLabel[];
  filter: Labelfilter;
  aantalPerLabel: Record<string, number>;
  aantalZonderLabel: number;
  aantalActief: number;
  aantalPrullenbak: number;
  inPrullenbak: boolean;
}) {
  const router = useRouter();
  const basis = `/merk/${merkId}/strategie/clusters`;

  function kiesLabel(waarde: string) {
    const vraag = new URLSearchParams();
    if (inPrullenbak) vraag.set("weergave", "prullenbak");
    if (waarde !== LABELFILTER_ALLES) vraag.set("label", waarde);
    const staart = vraag.toString();
    router.push(staart ? `${basis}?${staart}` : basis);
  }

  return (
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

      {/* Rechts op dezelfde regel. `ml-auto` duwt hem naar de rand zolang er
          ruimte is, en op een smal scherm valt hij eronder in plaats van de
          knoppen weg te drukken. */}
      <label className="ml-auto flex items-center gap-2">
        <span className="mono-label">
          <Icon naam="label" size={14} />
          Label
        </span>
        <select
          value={filter}
          onChange={(e) => kiesLabel(e.target.value)}
          className="field w-auto"
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
      </label>
    </div>
  );
}
