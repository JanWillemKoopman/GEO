/**
 * De bewaartermijn op prospects: twaalf maanden stilstand en dan weg.
 *
 * ── WAAROM DIT ER NU AL STAAT ───────────────────────────────────────────────
 *
 * Plan 24.2, en het staat er nadrukkelijk bij: "Dit hoort in de eerste migratie
 * ontworpen te zijn, niet later bedacht." De reden is niet netheid maar
 * rekenkunde. Een bewaartermijn die je achteraf toevoegt kan niet terugrekenen
 * over de periode dat hij ontbrak: je weet dan van geen enkel bedrijf wanneer er
 * voor het laatst iets mee gebeurde, en dan is "twaalf maanden stil" niet te
 * bepalen. Vandaar `last_activity_at` in migratie 0068, en vandaar deze module.
 *
 * ── WAT HIER WEL EN NIET IN ZIT ─────────────────────────────────────────────
 *
 * Wel: het oordeel. Staat dit bedrijf te lang stil, en tot wanneer mag het
 * blijven staan. Niet: het opruimen zelf. Dat is een taak in de wachtrij en die
 * komt in een latere sprint. Conventie 2 wil het oordeel los van de uitvoering,
 * zodat `scripts/test-unit.ts` het kan narekenen zonder database.
 *
 * ── WAAROM ANONIMISEREN EN NIET VERWIJDEREN ─────────────────────────────────
 *
 * Het bedrijf zelf is openbare bedrijfsinformatie en mag blijven staan; de
 * persoonsgegevens eromheen niet (plan 24.2). Als de rij helemaal verdween, dan
 * zou hetzelfde bedrijf bij de volgende marktronde weer als nieuwe kans
 * bovenkomen, inclusief de afwijzing die we een jaar eerder al kregen. Dan
 * benaderen we iemand opnieuw die al nee zei, en dat is precies wat de
 * bewaartermijn hoort te voorkomen.
 *
 * ⚠️ Een verwijderverzoek is iets anders en gaat vóór op deze termijn: dat
 * wordt meteen gehonoreerd, zonder discussie (plan 24.2). Deze module gaat
 * alleen over het automatisch opruimen van wat nergens toe leidde.
 */

/** Twaalf maanden stilstand (plan 24.2). Eén plek, zodat verlengen één regel is. */
export const BEWAARTERMIJN_MAANDEN = 12;

/** Wat de opruimregel van een bedrijf hoeft te weten. */
export interface BewaarRij {
  /** Wanneer er voor het laatst iets met dit bedrijf gebeurde. */
  last_activity_at: string | null;
  /** Gevuld = de persoonsgegevens zijn er al uit. */
  anonymised_at?: string | null;
  /** Een bedrijf dat zich heeft afgemeld blijft staan, juist om het uit te sluiten. */
  do_not_contact?: boolean | null;
}

/**
 * Tot wanneer mag deze rij blijven staan? `null` als dat niet te bepalen is.
 *
 * Conventie 3: zonder een laatste activiteit is er geen termijn te rekenen, en
 * dan geven we geen datum terug in plaats van vandaag te gokken. Een gegokte
 * datum zou hier een bedrijf te vroeg opruimen, en dat is onherstelbaar.
 */
export function bewaarTot(rij: BewaarRij): Date | null {
  if (!rij.last_activity_at) return null;
  const vanaf = new Date(rij.last_activity_at);
  if (Number.isNaN(vanaf.getTime())) return null;
  const tot = new Date(vanaf);
  tot.setMonth(tot.getMonth() + BEWAARTERMIJN_MAANDEN);
  return tot;
}

/**
 * Moet deze rij opgeruimd worden?
 *
 * Drie keer nee, en elke nee heeft een eigen reden:
 *
 *   1. Al geanonimiseerd. Twee keer opruimen levert niets nieuws op.
 *   2. `do_not_contact` staat aan. Die vlag is juist de reden dat de rij moet
 *      blijven: hij is het geheugen dat dit bedrijf niet benaderd mag worden.
 *      Zou hij verdwijnen, dan komt het bedrijf bij de volgende marktronde
 *      gewoon weer boven als nieuwe kans, en dan mailen we iemand die zich heeft
 *      afgemeld. Dat is de ergste fout die deze module kan maken.
 *   3. De termijn is nog niet om, of niet te bepalen.
 */
export function moetOpgeruimd(rij: BewaarRij, nu: Date): boolean {
  if (rij.anonymised_at) return false;
  if (rij.do_not_contact) return false;
  const tot = bewaarTot(rij);
  if (!tot) return false;
  return nu.getTime() >= tot.getTime();
}

/** Hoeveel hele dagen staat deze rij nog. Negatief betekent: de termijn is om. */
export function dagenTotOpruimen(rij: BewaarRij, nu: Date): number | null {
  const tot = bewaarTot(rij);
  if (!tot) return null;
  return Math.floor((tot.getTime() - nu.getTime()) / 86_400_000);
}
