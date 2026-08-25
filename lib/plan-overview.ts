/**
 * Het contentplan als overzicht: welke maand valt wanneer, wat staat er open,
 * en wat mag er dicht.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * `lib/plan-status.ts` beantwoordt de vraag per pagina (wie is aan zet, en
 * wanneer). Dat is niet genoeg zodra er 120 pagina's staan: Van den Udenhout
 * heeft er tien per maand, twaalf maanden lang, en dat is in de weergave
 * "Alles" ongeveer twaalf schermlengtes scrollen langs kaarten die er allemaal
 * hetzelfde uitzien. De vraag is dan niet meer "wat is de status van deze
 * pagina" maar "waar ben ik, en waar moet ik zijn".
 *
 * Drie dingen lossen dat op, en alle drie zijn ze rekenkunde en geen opmaak:
 *
 *   1. een maand krijgt zijn echte kalendermaand ("Maand 4 · december 2026"),
 *      afgeleid uit de vroegste publicatiedatum die erin staat. Het plan zelf
 *      slaat alleen `month_number` op, geteld vanaf de start (besluit 7), dus
 *      de kalender moet uit de pagina's komen;
 *   2. een maand staat standaard dicht, behalve de lopende maand en elke maand
 *      die iets van de klant vraagt;
 *   3. elk filter draagt zijn eigen aantal, zodat een leeg tabblad al leeg
 *      oogt vóór je erop klikt in plaats van erna.
 *
 * Puur en zonder `server-only` (conventie 2): de plan-lijst draait in de
 * browser, en `scripts/test-unit.ts` moet erbij kunnen.
 */
import type { PlannedPageStatus } from "@/lib/types/database";
import { PLAN_STATUS_META } from "@/lib/plan-status";

/** De vier standen van het filter boven de lijst. */
export type PlanFilter = "actie" | "gepland" | "live" | "alles";

export const PLAN_FILTERS = ["actie", "gepland", "live", "alles"] as const;

/**
 * Hoort deze pagina bij dit filter?
 *
 * Stond hiervoor als drie losse `filter()`-aanroepen in de weergave zelf. Hier
 * kan de teller boven het tabblad dezelfde regel gebruiken als de lijst
 * eronder, en dat is precies wat je wil: een teller die anders telt dan de
 * lijst toont, is erger dan geen teller.
 */
export function matchesFilter(
  page: { status: PlannedPageStatus },
  filter: PlanFilter,
): boolean {
  switch (filter) {
    case "alles":
      return true;
    case "actie":
      return PLAN_STATUS_META[page.status].actionRequired;
    case "live":
      return page.status === "geplaatst";
    case "gepland":
      return page.status === "gepland" || page.status === "schrijven";
  }
}

/** Het aantal per filter, in één keer, zodat alle vier de tabbladen een getal dragen. */
export function filterCounts(
  pages: { status: PlannedPageStatus }[],
): Record<PlanFilter, number> {
  return {
    actie: pages.filter((p) => matchesFilter(p, "actie")).length,
    gepland: pages.filter((p) => matchesFilter(p, "gepland")).length,
    live: pages.filter((p) => matchesFilter(p, "live")).length,
    alles: pages.length,
  };
}

const MAANDNAMEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
] as const;

/**
 * De vroegste publicatiedatum in een reeks pagina's.
 *
 * ⚠️ Leest met UTC-getters. `scheduled_for` is een kale datum ("2026-12-01")
 * die als middernacht UTC binnenkomt; met lokale getters wordt dat in een
 * negatieve tijdzone 30 november, en dan verschuift de maandkop een hele maand.
 */
function vroegste(pages: { scheduled_for: string | null }[]): Date | null {
  let beste: Date | null = null;
  for (const p of pages) {
    if (!p.scheduled_for) continue;
    const d = new Date(p.scheduled_for);
    if (Number.isNaN(d.getTime())) continue;
    if (!beste || d < beste) beste = d;
  }
  return beste;
}

/**
 * "december 2026" bij de maand waar die pagina's in zitten, of `null`.
 *
 * Conventie 3: geen datum is beter dan een gegokte datum. Een maand waarvan
 * geen enkele pagina een publicatiedatum heeft, houdt gewoon zijn nummer.
 */
export function monthCalendarLabel(
  pages: { scheduled_for: string | null }[],
): string | null {
  const d = vroegste(pages);
  if (!d) return null;
  return `${MAANDNAMEN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Valt vandaag in deze maand?
 *
 * Bepaalt samen met `vraagtActie` welke maanden opengeklapt beginnen. De
 * vergelijking zet de UTC-kalender van de planning naast de lokale kalender van
 * de lezer; dat is de juiste kant op, want "welke maand is het nu" is een vraag
 * over de klok van de klant.
 */
export function isCurrentMonth(
  pages: { scheduled_for: string | null }[],
  now: Date = new Date(),
): boolean {
  const d = vroegste(pages);
  if (!d) return false;
  return (
    d.getUTCFullYear() === now.getFullYear() && d.getUTCMonth() === now.getMonth()
  );
}

export interface MonthOverview {
  id: string;
  /** Pagina's die door het actieve filter komen. Nul betekent: deze maand staat er niet. */
  zichtbaar: number;
  /** Wacht er iets in deze maand op de klant? */
  vraagtActie: boolean;
  /** Is dit de lopende kalendermaand? */
  isLopend: boolean;
}

/**
 * Welke maanden staan open als het scherm laadt?
 *
 * De lopende maand en alles wat om een handeling vraagt. De rest begint dicht:
 * een dichtgeklapte maandregel met naam, aantal en status is het overzicht dat
 * er in de weergave "Alles" niet was.
 *
 * ⚠️ De terugval telt. Klapt deze regel alles dicht, dan kijkt de klant naar
 * een stapel gesloten regels zonder enige inhoud, en dat is precies zo
 * onbruikbaar als de muur die het moest oplossen. Staat er niets open, dan gaat
 * de eerste maand met inhoud alsnog open.
 */
export function openMonthIds(maanden: MonthOverview[]): string[] {
  const metInhoud = maanden.filter((m) => m.zichtbaar > 0);
  const open = metInhoud
    .filter((m) => m.vraagtActie || m.isLopend)
    .map((m) => m.id);
  if (open.length > 0) return open;
  return metInhoud.length > 0 ? [metInhoud[0].id] : [];
}

/**
 * Wanneer verschijnt de eerstvolgende pagina?
 *
 * Alleen wat nog moet komen: een pagina die al live staat of uit het plan is
 * gehaald, telt niet mee. Geeft de kale ISO-datum terug; opmaken doet
 * `formatDagNL()`, zodat de test op de datum kan testen en niet op de opmaak.
 */
export function nextPublication(
  pages: { status: PlannedPageStatus; scheduled_for: string | null }[],
  now: Date = new Date(),
): string | null {
  const vandaag = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  let beste: string | null = null;
  for (const p of pages) {
    if (p.status === "geplaatst" || p.status === "afgewezen") continue;
    if (!p.scheduled_for) continue;
    const d = new Date(p.scheduled_for);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getTime() < vandaag) continue;
    if (!beste || d < new Date(beste)) beste = p.scheduled_for;
  }
  return beste;
}

/** "12 september", of een lege tekst bij een onbruikbare datum. */
export function formatDagNL(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MAANDNAMEN[d.getUTCMonth()]}`;
}

/**
 * Waar staat de tekst die ORBIT ENGINE voor deze pagina schreef?
 *
 * ⚠️ Dit was het gat in het scherm: een pagina met de status "wacht op jouw
 * akkoord" toonde een goedkeurknop en geen enkele manier om te lezen wat je
 * goedkeurde. De verwijzing lag er wél (`planned_pages.content_piece_id`,
 * gevuld door `linkPlannedPage()` in `lib/jobs/handlers.ts`) en het leesscherm
 * bestond ook, alleen legde niemand de link.
 *
 * De analyse komt van het ONDERWERP en niet van de pagina: de contentpijplijn
 * schrijft onder `besluit.analysisId` uit `writeDecision()`, en dat is de
 * `analysis_id` van het onderwerp (`app/api/cron/plan/route.ts`). `?van=plan`
 * is de herkomst uit `lib/origin.ts`, zodat de terugknop hierheen wijst en niet
 * naar de bibliotheek.
 */
export function contentHref(
  contentPieceId: string | null,
  analysisId: string | null,
): string | null {
  if (!contentPieceId || !analysisId) return null;
  return `/analyses/${analysisId}/bibliotheek/${contentPieceId}?van=plan`;
}

/**
 * De melding die voor de HELE maand geldt, in plaats van tien keer per maand.
 *
 * ── HET PROBLEEM DAT DIT OPLOST ─────────────────────────────────────────────
 *
 * Op het scherm van Gasservice Brabant stond bij elk van de tien regels van
 * maand 1 dezelfde oranje zin: "ORBIT ENGINE schrijft pas als deze maand is
 * vrijgegeven". Dat is geen eigenschap van die regel maar van de maand, en tien
 * keer dezelfde zin leest een mens één keer en negeert hij daarna. Erger: hij
 * verdringt de meldingen die wél per regel verschillen, zoals "start eerst de
 * meting van dit onderwerp".
 *
 * Deze functie zegt welke melding door ALLE regels gedeeld wordt. Die gaat naar
 * de maandkop; de rest blijft per regel staan.
 *
 * ⚠️ Alleen bij unanimiteit. Geldt de melding voor negen van de tien regels, dan
 * is hij géén eigenschap van de maand en blijft hij per regel staan, want anders
 * verhuist er een mededeling naar de kop die voor één regel niet klopt.
 *
 * Puur, dus testbaar (conventie 2).
 */
export function sharedNotice(meldingen: (string | null)[]): string | null {
  if (meldingen.length === 0) return null;
  const eerste = meldingen[0];
  if (!eerste) return null;
  return meldingen.every((m) => m === eerste) ? eerste : null;
}
