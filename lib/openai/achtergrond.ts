/**
 * Wanneer gaat een zware aanroep naar de achtergrondmodus van de API?
 * (docs/tasks/contentpijplijn-publicatiewaardig.md §4.3 en §13, aandachtspunt 1)
 *
 * De paginastrategie en de eindredactie draaien op Sol met denktijd hoog. Een
 * aanroep mag hoogstens 150 seconden duren (`CALL_BUDGET_MS`); de traagste
 * geslaagde schrijfaanroep op denktijd medium duurde 98,8 seconden. Het plan:
 * meet de duur van elke aanroep, en zodra één van beide in productie boven de
 * 120 seconden komt, gaat die soort aanroep in de achtergrondmodus. Dan kan een
 * time-out nooit meer de duurste aanroep dubbel laten betalen.
 *
 * Eén uitschieter is genoeg: een aanroep van 121 seconden zit binnen 30 seconden
 * van de harde grens, en de volgende kan erover gaan. Terug naar direct gaat de
 * modus niet vanzelf; wie dat wil, zet `ACHTERGROND_ALTIJD` terug en past de
 * grens aan na een nieuwe meting.
 *
 * Puur (conventie 2): de databasevraag staat in de aanroeper.
 */

/** Boven deze duur gaat de soort aanroep naar de achtergrond (besluit in het plan, §4.3). */
export const ACHTERGROND_GRENS_MS = 120_000;

/** Hoeveel recente aanroepen per soort meetellen. Genoeg om een uitschieter te zien, niet zo veel dat een oude meting blijft hangen. */
export const ACHTERGROND_VENSTER = 50;

/**
 * Zet een soort aanroep hier om hem altijd in de achtergrond te draaien, los van
 * de meting. Leeg bij de bouw: er is nog geen enkele gemeten aanroep op denktijd
 * hoog, en de achtergrondmodus kost een tweede taakronde per pagina.
 */
export const ACHTERGROND_ALTIJD: ReadonlySet<string> = new Set<string>();

/**
 * Moet deze soort aanroep in de achtergrond? `duren` zijn de gemeten duren in
 * milliseconden van de recentste aanroepen van die soort; een onbekende duur
 * telt niet mee (conventie 3).
 */
export function moetAchtergrond(soort: string, duren: readonly (number | null | undefined)[]): boolean {
  if (ACHTERGROND_ALTIJD.has(soort)) return true;
  return duren.some((d) => typeof d === "number" && d > ACHTERGROND_GRENS_MS);
}

/**
 * Wanneer de vervolgtaak het resultaat weer probeert op te halen. Oplopend, want
 * de meeste aanroepen zijn binnen twee minuten klaar en een lange denkronde
 * hoeft niet elke dertig seconden gewekt te worden.
 */
export function ophaalVertragingSeconden(poging: number): number {
  return Math.min(30 * 2 ** Math.max(0, poging), 240);
}

/** Na zoveel ophaalpogingen (samen ruim een half uur) geven we de aanroep op. */
export const MAX_OPHAALPOGINGEN = 10;
