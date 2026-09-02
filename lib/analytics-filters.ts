/**
 * Filterlogica voor de vier Analytics-schermen (plan analytics-herontwerp.md, F2).
 *
 * ── ÉÉN FILTERBALK, GEEN VIER EIGEN IMPLEMENTATIES ──────────────────────────
 *
 * Hetzelfde patroon als `lib/cluster-labels.ts` op de clusterlijst: de keuze
 * staat in het adres (`?label=`, `?cluster=`, `?periode=`), niet in
 * clientstate, dus een gefilterd beeld is te delen en te bewaren. Label en
 * Cluster hergebruiken de labellogica hier bovenop; Periode staat apart, want
 * die rust op meetmomenten en niet op een vaste lijst.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure functies over al opgehaalde
 * rijen, getest vanuit `scripts/test-unit.ts` en herbruikt door de
 * server-pagina's én `components/analytics-filters.tsx`.
 */
import { filterOpLabel, type Labelachtig, type Labelfilter } from "@/lib/cluster-labels";

export { LABELFILTER_ALLES, LABELFILTER_GEEN, filterOpLabel, leesLabelfilter } from "@/lib/cluster-labels";
export type { Labelfilter } from "@/lib/cluster-labels";

/** Geen keuze op de clusterlijst: toon ze allemaal. */
export const CLUSTERFILTER_ALLES = "alles";

export interface Clusterachtig extends Labelachtig {
  label_id: string | null;
}

/**
 * De clusters die in het uitklapmenu staan bij dit labelfilter.
 *
 * Een gekozen label beperkt deze lijst; de omgekeerde regel geldt niet: een
 * gekozen cluster laat het labelfilter met rust (F2). Dat betekent dat een
 * cluster-keuze die niet meer bij het huidige label hoort geen fout is, maar
 * gewoon een combinatie die niets oplevert, zoals elke AND van twee filters.
 */
export function clustersVoorFilter<T extends Clusterachtig>(
  clusters: T[],
  labelfilter: Labelfilter,
): T[] {
  return filterOpLabel(clusters, labelfilter);
}

/**
 * Is dit een geldige keuze in het clusteruitklapmenu?
 *
 * Zelfde vangnet als `leesLabelfilter`: een onbekende waarde in het adres valt
 * terug op "alle clusters" in plaats van een leeg scherm te tonen.
 */
export function leesClusterfilter(
  ruw: string | null | undefined,
  clustersBijLabel: Clusterachtig[],
): string {
  if (ruw && clustersBijLabel.some((c) => c.id === ruw)) return ruw;
  return CLUSTERFILTER_ALLES;
}

/** De rijen die bij deze clusterkeuze horen. */
export function filterOpCluster<T extends { analysis_id: string } | { id: string }>(
  items: T[],
  clusterfilter: string,
  clusterIdVan: (item: T) => string,
): T[] {
  if (clusterfilter === CLUSTERFILTER_ALLES) return items;
  return items.filter((item) => clusterIdVan(item) === clusterfilter);
}

// ── Periode ──────────────────────────────────────────────────────────────
//
// Anders dan Label en Cluster is Periode geen vaste lijst: elk cluster meet op
// zijn eigen ritme (`week_no` telt per analyse, zie `app/api/cron/tracking`),
// dus twee clusters van hetzelfde merk hebben zelden dezelfde periode-index.
// Wat ze wél delen is de kalender: de maandelijkse ronde draait voor het hele
// merk rond dezelfde datum. Een "periode" is daarom een meetdatum, en de
// keuze selecteert per cluster de laatste meting OP OF VÓÓR die datum, nooit
// een latere: dat zou een meting uit de toekomst van dat cluster tonen.

export const PERIODEFILTER_ACTUEEL = "actueel";

export interface Periodeoptie {
  /** Een datum, `YYYY-MM-DD`. */
  id: string;
  label: string;
}

export interface GemetenPunt {
  analysis_id: string;
  computed_at: string | null;
}

/**
 * De data waarop ergens in dit merk gemeten is, nieuwste eerst.
 *
 * Een rij zonder `computed_at` levert geen periode op: conventie 3, onbekend
 * is beter dan een gegokte datum.
 */
export function bepaalPeriodes(rijen: GemetenPunt[]): Periodeoptie[] {
  const dagen = new Set<string>();
  for (const r of rijen) {
    if (r.computed_at) dagen.add(r.computed_at.slice(0, 10));
  }
  return [...dagen]
    .sort((a, b) => b.localeCompare(a))
    .map((dag) => ({
      id: dag,
      label: new Date(`${dag}T00:00:00Z`).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    }));
}

/** Onbekend of leeg valt terug op "actueel", net als bij Label en Cluster. */
export function leesPeriodefilter(
  ruw: string | null | undefined,
  periodes: Periodeoptie[],
): string {
  if (ruw && periodes.some((p) => p.id === ruw)) return ruw;
  return PERIODEFILTER_ACTUEEL;
}

/**
 * Per cluster (`analysis_id`) precies één rij: bij "actueel" de nieuwste, bij
 * een gekozen periode de nieuwste rij op of vóór die datum.
 *
 * Heeft een cluster nog geen meting op of vóór de gekozen datum, dan levert
 * dat cluster niets op voor deze periode. Terugvallen op zijn nieuwste meting
 * zou een stand van vandaag tonen alsof hij bij een datum in het verleden
 * hoort, en dat is precies de fout die dit filter moet voorkomen.
 */
export function selecteerPerCluster<T extends GemetenPunt>(
  rijen: T[],
  periodefilter: string,
): T[] {
  const perCluster = new Map<string, T[]>();
  for (const r of rijen) {
    const bestaand = perCluster.get(r.analysis_id) ?? [];
    bestaand.push(r);
    perCluster.set(r.analysis_id, bestaand);
  }

  const resultaat: T[] = [];
  for (const reeks of perCluster.values()) {
    const gesorteerd = [...reeks].sort((a, b) =>
      (a.computed_at ?? "").localeCompare(b.computed_at ?? ""),
    );
    if (periodefilter === PERIODEFILTER_ACTUEEL) {
      resultaat.push(gesorteerd[gesorteerd.length - 1]);
      continue;
    }
    const passend = gesorteerd.filter(
      (r) => r.computed_at !== null && r.computed_at.slice(0, 10) <= periodefilter,
    );
    if (passend.length > 0) resultaat.push(passend[passend.length - 1]);
  }
  return resultaat;
}
