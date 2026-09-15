/**
 * De twee vaste getallen onder het contentplan.
 *
 * ── WAT HIER STOND, EN WAAROM HET WEG IS ────────────────────────────────────
 *
 * Dit bestand heette `lib/pipeline/plan-build.ts` en bevatte `buildPlan()`: de
 * jaarverdeling die twaalf maanden vooruit vulde door elk onderwerp met elke
 * funnelfase te combineren. Op 25 augustus 2026 is die verdeling vervangen door
 * een voorraad die de gebruiker zelf over de maanden verdeelt (migratie 0065).
 *
 * De reden staat in `docs/logbook.md` en kort samengevat hier: bij Gasservice
 * Brabant leverde de verdeling 120 rijen op uit 28 unieke titels, en 103 daarvan
 * hingen aan een cluster dat nooit gemeten was en dus nooit geschreven kon
 * worden. De rekenkunde klopte, de aanname eronder niet: dat er genoeg te
 * schrijven vált zodra er onderwerpen zijn.
 *
 * Wat overblijft zijn twee constanten die niets met die verdeling te maken
 * hadden en nog steeds gelden.
 */

/** Hoeveel maanden een plan vooruit kijkt. */
export const MONTHS_AHEAD = 12;

/**
 * Hoeveel pagina's een maand krijgt bovenop de pakketquota, als wisselgeld
 * (blok A, punt 3, `docs/tasks/nova-vergelijking-verbeterpunten.md`). Nova:
 * "a few extra, as a buffer: extra pages ready to swap in whenever you want
 * to change what's scheduled."
 *
 * Eén, niet "een paar": buffers vullen zichzelf lazy bij, bij elke
 * schermopening (`vulOpenMaanden()`, `lib/plans.ts`). Eén is genoeg om de
 * eerstvolgende verwijdering of terugsleep in die maand meteen op te vangen;
 * een tweede volgt vanzelf zodra er weer voorraad is. Meer vooraf zou alleen
 * sneller aan de voorraad knagen zonder dat er iets mee gedaan wordt tot iemand
 * daadwerkelijk iets uit die maand haalt.
 */
export const BUFFER_PER_MONTH = 1;

/**
 * De standaard funnelfasen voor een merk dat er nog geen heeft.
 *
 * Vier, want dat zit midden in Nova's toegestane drie tot vijf, en het is de
 * indeling die een MKB'er herkent zonder uitleg. Ze bepalen sinds de voorraad
 * niet meer de verdeling, maar nog wél waar een pagina in de klantreis zit.
 */
export const DEFAULT_FUNNELS = [
  "Oriëntatie",
  "Vergelijken",
  "Kiezen",
  "Klant blijven",
];
