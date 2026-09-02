/**
 * Labels boven de clusters van één merk (migratie 0083).
 *
 * ── WAT EEN LABEL IS, EN WAT HET NIET IS ────────────────────────────────────
 *
 * Ordening en verder niets. Een merk met dertig clusters heeft een overzicht
 * nodig waarin "cv-ketel onderhoud" en "cv-ketel vervangen" bij elkaar staan.
 * Het label gaat nergens de pijplijn in, staat in geen enkele prompt, en
 * beïnvloedt geen enkel cijfer. Dat is bewust: zodra een label iets aanstuurt,
 * verandert het hernoemen ervan de uitkomst van een meting.
 *
 * Bewust ZONDER `server-only` (conventie 2): dit zijn pure functies over
 * tekst en lijstjes, en ze worden zowel op de server (het overzicht) als in de
 * browser (het uitklapmenu) gebruikt, plus in `scripts/test-unit.ts`.
 */

/** Langer past niet op een chip naast een clusternaam zonder af te kappen. */
export const MAX_LABELNAAM = 40;

/**
 * De twee standen van het uitklapmenu die geen label-id zijn.
 *
 * `"alles"` is de standaard, `"geen"` selecteert juist de clusters zonder
 * label. Die tweede is er omdat een filter zonder die stand een gat laat: met
 * tien labels en drie clusters die er nog geen hebben, zijn precies die drie
 * nergens meer te vinden.
 */
export const LABELFILTER_ALLES = "alles";
export const LABELFILTER_GEEN = "geen";

export type Labelfilter = string;

export interface Labelachtig {
  id: string;
  name: string;
}

/**
 * De ingetypte labelnaam opschonen, of `null` als er niets bruikbaars overblijft.
 *
 * Spaties aan de randen eraf en dubbele spaties binnenin samengevouwen: zonder
 * dat zijn "Onderhoud" en "Onderhoud " twee labels in het uitklapmenu, en dat
 * verschil ziet niemand. Conventie 3: onbruikbare invoer wordt `null` en geen
 * lege naam die daarna als label door het leven gaat.
 */
export function normaliseerLabelnaam(ruw: string | null | undefined): string | null {
  if (typeof ruw !== "string") return null;
  const schoon = ruw.replace(/\s+/g, " ").trim();
  if (!schoon) return null;
  return schoon.slice(0, MAX_LABELNAAM);
}

/**
 * Zijn dit voor een mens twee keer hetzelfde label?
 *
 * Hoofdletterongevoelig, want de gebruiker die "Onderhoud" typt waar al
 * "onderhoud" staat, bedoelt het bestaande label. Dezelfde regel als de unieke
 * index in migratie 0083, hier zodat de app het al vóór de database ziet.
 */
export function zelfdeLabelnaam(a: string, b: string): boolean {
  return a.toLocaleLowerCase("nl") === b.toLocaleLowerCase("nl");
}

/** Het bestaande label met deze naam, of `null`. Voor "kies of maak nieuw". */
export function vindLabel<T extends Labelachtig>(labels: T[], naam: string): T | null {
  return labels.find((l) => zelfdeLabelnaam(l.name, naam)) ?? null;
}

/**
 * Labels op alfabet, hoofdletterongevoelig.
 *
 * Niet op aanmaakmoment: het uitklapmenu is een zoeklijst, en daarin zoek je op
 * de eerste letter en niet op wanneer je het label bedacht.
 */
export function sorteerLabels<T extends Labelachtig>(labels: T[]): T[] {
  return [...labels].sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" }));
}

/**
 * Is dit een geldige keuze in het uitklapmenu?
 *
 * Het vangnet onder de URL: `?label=` komt uit het adres en kan van alles zijn,
 * ook een label van een ánder merk. Een onbekende waarde valt terug op "alle
 * clusters" in plaats van een lege lijst te tonen, want een leeg scherm zonder
 * uitleg leest als "mijn clusters zijn weg".
 */
export function leesLabelfilter(ruw: string | null | undefined, labels: Labelachtig[]): Labelfilter {
  if (ruw === LABELFILTER_GEEN) return LABELFILTER_GEEN;
  if (ruw && labels.some((l) => l.id === ruw)) return ruw;
  return LABELFILTER_ALLES;
}

/** De clusters die bij deze filterstand horen. */
export function filterOpLabel<T extends { label_id: string | null }>(
  clusters: T[],
  filter: Labelfilter,
): T[] {
  if (filter === LABELFILTER_ALLES) return clusters;
  if (filter === LABELFILTER_GEEN) return clusters.filter((c) => c.label_id === null);
  return clusters.filter((c) => c.label_id === filter);
}

/**
 * Hoeveel clusters er per label zijn, plus de stand "geen label".
 *
 * Het uitklapmenu toont die aantallen: "Onderhoud (4)" zegt vooraf of filteren
 * iets oplevert, en dat scheelt de klik waarna een lege lijst verschijnt.
 */
export function telPerLabel<T extends { label_id: string | null }>(
  clusters: T[],
): { perLabel: Record<string, number>; zonderLabel: number } {
  const perLabel: Record<string, number> = {};
  let zonderLabel = 0;
  for (const c of clusters) {
    if (c.label_id === null) zonderLabel += 1;
    else perLabel[c.label_id] = (perLabel[c.label_id] ?? 0) + 1;
  }
  return { perLabel, zonderLabel };
}
