/**
 * Welke bevindingen gaan er mee naar de reparatie, en in welke volgorde?
 * (contentronde-gasservice-brabant-1-september-2026.md, verbetering 5)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De reparatiestap kreeg ALLE bevindingen tegelijk. Gemeten op 1 september 2026:
 * 68 en 119 punten op het eerste concept van twee pagina's, en na drie rondes
 * nog 63 en 96. Met 119 opdrachten over 25 secties is er niets gerichts meer aan
 * een "gerichte sectiereparatie": het model raakt vrijwel elke sectie aan, en de
 * uitvoer werd dan ook groter dan die van de oorspronkelijke schrijfaanroep
 * (6.245 tegen 6.042 tokens, $0,2525 per ronde).
 *
 * Een korte, geordende lijst is bovendien niet alleen goedkoper maar beter: de
 * kwaliteitsscore van pagina A liep 67, 74, 68, 48. Elke ronde die alles
 * tegelijk probeerde op te lossen, maakte de tekst slechter.
 *
 * ── DE VOLGORDE ─────────────────────────────────────────────────────────────
 *
 * Van zwaar naar licht, en zwaar betekent hier: wat gaat er mis voor de klant
 * als dit blijft staan?
 *
 *   1. Een bewering zonder bevestigd feit. Dat is een geloofwaardigheidsrisico
 *      onder de naam van de klant, en de enige categorie waar de oude
 *      contentronde echte fabricages in vond.
 *   2. De opening. Dat is de zin die een AI-assistent overneemt.
 *   3. Een sectie die er niet is. Ontbrekende inhoud gaat vóór dunne inhoud.
 *   4. Een sectie die zijn vraag niet beantwoordt, en de GEO-criteria.
 *   5. Te dun, een ongebruikt feit, een onbeantwoorde deelvraag.
 *   6. Uitleg en FAQ.
 *   7. De vraag die een lezer overhoudt. Bewust als laatste: die lijst is per
 *      definitie oneindig (de beoordelaar krijgt de opdracht hem altijd te
 *      vullen) en is de reden dat een pagina nooit op nul bevindingen uitkomt.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure sortering, testbaar vanuit
 * `scripts/test-unit.ts`.
 */

/** Hoeveel bevindingen er hoogstens in één reparatieronde meegaan. */
export const MAX_BEVINDINGEN_PER_RONDE = 10;

/** Van zwaar (laag getal) naar licht. De eerste die past, wint. */
const GEWICHTEN: { patroon: RegExp; gewicht: number }[] = [
  { patroon: /bewering zonder bevestigd feit|zonder bron|niet herleiden/i, gewicht: 0 },
  { patroon: /leest als een belofte/i, gewicht: 1 },
  { patroon: /begint niet met het afgesproken directe antwoord|opening/i, gewicht: 1 },
  { patroon: /verboden|mag hier niet over/i, gewicht: 1 },
  { patroon: /ontbreekt\. Voeg hem toe/i, gewicht: 2 },
  { patroon: /staat geen zin die deze vraag beantwoordt/i, gewicht: 3 },
  { patroon: /^GEO:/i, gewicht: 3 },
  { patroon: /is te dun/i, gewicht: 4 },
  { patroon: /horen deze bevestigde feiten thuis/i, gewicht: 4 },
  { patroon: /wordt op de pagina niet beantwoord/i, gewicht: 4 },
  { patroon: /wordt dit begrip gebruikt zonder uitleg/i, gewicht: 5 },
  { patroon: /horen in de FAQ/i, gewicht: 5 },
  { patroon: /houdt deze vraag over na het lezen/i, gewicht: 9 },
];

function gewichtVan(bevinding: string): number {
  for (const { patroon, gewicht } of GEWICHTEN) {
    if (patroon.test(bevinding)) return gewicht;
  }
  // Alles wat we niet herkennen komt in het midden terecht: redactionele
  // punten van het panel horen daar thuis, en een nieuw soort bevinding hoort
  // niet stilletjes onderaan of bovenaan te belanden.
  return 6;
}

/**
 * De zwaarste bevindingen eerst, hooguit `max` stuks.
 *
 * Stabiel binnen hetzelfde gewicht: de volgorde waarin de poorten en de
 * beoordelaars ze aanleverden blijft staan, en die volgt de pagina van boven
 * naar beneden.
 */
export function prioriteerBevindingen(
  issues: readonly string[],
  max: number = MAX_BEVINDINGEN_PER_RONDE,
): string[] {
  const schoon = issues.filter((i) => i?.trim());
  return schoon
    .map((tekst, index) => ({ tekst, index, gewicht: gewichtVan(tekst) }))
    .sort((a, b) => a.gewicht - b.gewicht || a.index - b.index)
    .slice(0, Math.max(max, 0))
    .map((i) => i.tekst);
}
