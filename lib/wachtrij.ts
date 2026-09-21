/**
 * De wachtrij op het overzicht, gegroepeerd per onderwerp.
 *
 * ── WAAROM DIT EEN EIGEN, PURE MODULE IS ────────────────────────────────────
 *
 * Tot 21 september 2026 stond "wat er op je wacht" als platte lijst van
 * hooguit vijf items, zonder groepering. Bij meer dan één cluster stonden
 * daardoor taken over verschillende onderwerpen door elkaar, en kon een klant
 * niet in één oogopslag zien welk onderwerp de meeste aandacht vraagt. De
 * groepering bepaalt welke items zichtbaar zijn en welke achter "nog X
 * bekijken" schuilgaan: een fout hierin is op het scherm onzichtbaar
 * (conventie 2, dus puur en apart van `lib/work.ts`, dat `server-only` is).
 */
import type { WorkItem } from "@/lib/work";

export interface WachtrijGroep {
  /** De naam van het cluster waar deze taken bij horen (`WorkItem.analysisName`). */
  onderwerp: string;
  items: WorkItem[];
}

/**
 * Groepeert op onderwerp, in de volgorde waarin het onderwerp voor het eerst
 * voorkomt. `items` moet al gesorteerd zijn (`sortWork()`): binnen een groep
 * blijft die volgorde staan, dus het dringendste werk van een onderwerp staat
 * ook binnen zijn groep bovenaan.
 */
export function groepeerPerOnderwerp(items: WorkItem[]): WachtrijGroep[] {
  const volgorde: string[] = [];
  const perOnderwerp = new Map<string, WorkItem[]>();

  for (const item of items) {
    if (!perOnderwerp.has(item.analysisName)) {
      perOnderwerp.set(item.analysisName, []);
      volgorde.push(item.analysisName);
    }
    perOnderwerp.get(item.analysisName)!.push(item);
  }

  return volgorde.map((onderwerp) => ({ onderwerp, items: perOnderwerp.get(onderwerp)! }));
}
