import type { AnalysisStatus } from "@/lib/types/database";

export type StatusTone = "attention" | "progress" | "info" | "success" | "error";

/**
 * Bij wie de bal ligt (A.1, naar Nova's tweelaags-statustaal: een technische
 * staat naast een leesbare "Waiting in your CMS" of "Waiting for you").
 * De technische status (`AnalysisStatus`)
 * blijft de bron van waarheid; dit is de vertaling ernaast, niet in de plaats
 * ervan. `null` = niemand hoeft iets, de staat is af of informatief.
 */
export type WhoseTurn = "jij" | "orbit_engine" | null;

export const WHOSE_TURN_LABEL: Record<Exclude<WhoseTurn, null>, string> = {
  jij: "Wacht op jou",
  orbit_engine: "ORBIT ENGINE is bezig",
};

/**
 * Metadata per status voor de UI (abcplan.md §3.4). `concept_klaar` is bewust
 * "attention" + actionRequired: het enige moment waarop de klant iets MOET doen,
 * en wordt daarom bovenaan de lijst geprioriteerd.
 */
export const STATUS_META: Record<
  AnalysisStatus,
  { label: string; tone: StatusTone; actionRequired: boolean; whoseTurn: WhoseTurn }
> = {
  bezig: { label: "ORBIT ENGINE werkt…", tone: "progress", actionRequired: false, whoseTurn: "orbit_engine" },
  concept_klaar: {
    label: "Klaar voor jouw akkoord",
    tone: "attention",
    actionRequired: true,
    whoseTurn: "jij",
  },
  meten: { label: "Meting loopt…", tone: "progress", actionRequired: false, whoseTurn: "orbit_engine" },
  gemeten: {
    label: "Score binnen · rapport volgt",
    tone: "info",
    actionRequired: false,
    whoseTurn: "orbit_engine",
  },
  gereed: { label: "Gereed", tone: "success", actionRequired: false, whoseTurn: null },
  mislukt: { label: "Niet gelukt", tone: "error", actionRequired: false, whoseTurn: "jij" },
};

/**
 * Inline-stijl per tone, uit de betekenislaag (designsystem.md §2.3).
 *
 * ⚠️ Repareerd 6 augustus 2026: dit bestand had de kleuren-opruiming van de
 * vormgevingsronde gemist, de kleurcontrole draaide toen alleen over `.tsx`
 * en dit is een `.ts`-bestand. Er stonden nog vijf rauwe `rgba()`-kleuren in,
 * waarvan `info` en `success` letterlijk dezelfde waarde deelden (het oude
 * marketingsite-groen, zie designsystem.md bijlage A): een "score binnen, rapport volgt"-melding
 * was zo niet te onderscheiden van "gereed". Nu wijzen ze naar aparte
 * betekenissen: `information` (blauw) voor een mededeling, `growth` (groen)
 * voor een afgeronde, geslaagde staat.
 */
/**
 * Statusfilter boven de clusterlijst (`strategie/clusters`).
 *
 * Zelfde vorm als het labelfilter in `lib/cluster-labels.ts`: één stand
 * "alles" naast de zes technische statussen uit `AnalysisStatus`, gelezen uit
 * de URL en dus met hetzelfde wantrouwen tegen wat daarin kan staan. Een
 * eigen "wacht op mijn goedkeuring" bovenaan de lijst is er al via de
 * sortering op `whoseTurn`; dit filter kort de lijst juist in tot precies die
 * status, voor wie alleen dát wil zien.
 */
export const STATUSFILTER_ALLES = "alles";

export type Statusfilter = AnalysisStatus | typeof STATUSFILTER_ALLES;

/**
 * Een `?status=` uit het adres kan van alles zijn. Onbekend valt terug op
 * "alle statussen", net als bij het labelfilter: een leeg scherm zonder
 * uitleg leest als "mijn clusters zijn weg".
 */
export function leesStatusfilter(ruw: string | null | undefined): Statusfilter {
  if (ruw && ruw in STATUS_META) return ruw as AnalysisStatus;
  return STATUSFILTER_ALLES;
}

/** De clusters die bij deze filterstand horen. */
export function filterOpStatus<T extends { status: AnalysisStatus }>(
  clusters: T[],
  filter: Statusfilter,
): T[] {
  if (filter === STATUSFILTER_ALLES) return clusters;
  return clusters.filter((c) => c.status === filter);
}

/**
 * Hoeveel clusters er per status zijn, voor de aantallen in het uitklapmenu.
 * Een status die niet voorkomt, ontbreekt in het resultaat (0, niet vermeld).
 */
export function telPerStatus<T extends { status: AnalysisStatus }>(
  clusters: T[],
): Record<AnalysisStatus, number> {
  const telling = {} as Record<AnalysisStatus, number>;
  for (const c of clusters) {
    telling[c.status] = (telling[c.status] ?? 0) + 1;
  }
  return telling;
}

/**
 * De chipklasse per toon (`app/globals.css`).
 *
 * ⚠️ Tot 23 september 2026 stond hier een object met inline kleuren op de oude
 * Nova-namen, en `attention` ("actie nodig") wees via `intelligence` naar het
 * accent: een donkergroen label dat in de lichte stand nauwelijks te
 * onderscheiden was van "klaar" (#2b6d17 op #e9f4d1 tegenover #1d7a3f op
 * #e0f5e8). "Jij bent aan zet" is in de bibliotheek en het plan al oranje
 * (`STAND_CHIP` in `lib/pagina-stand.ts`), dus hier ook. De enige
 * uitzondering is het paginascherm zelf (`components/pagina/pagina-kop.tsx`),
 * waar oranje op besluit van de eigenaar voorbehouden is aan "Te verbeteren".
 */
export const TONE_CHIP: Record<StatusTone, string> = {
  attention: "chip chip-warning",
  progress: "chip chip-neutral",
  info: "chip chip-info",
  success: "chip chip-success",
  error: "chip chip-danger",
};
