/**
 * De vaste foutmeldingen van ORBIT ENGINE.
 *
 * Voor dezelfde boodschap stonden op 30 september 2026 vijf varianten in de
 * app: "We konden ORBIT ENGINE niet bereiken" (17 keer), "Controleer je
 * verbinding" naast "Controleer je internet", "Probeer het zo nog eens" naast
 * "Probeer het opnieuw", en "laat het ons dan weten" zonder dat iemand wist wie
 * "ons" was (docs/logbook.md, "30 september 2026: taalaudit"). Een nieuw scherm pakt zijn melding
 * hier, zodat er geen zesde variant bij komt.
 *
 * De stem volgt docs/schrijfstijl.md §3: ORBIT ENGINE is het onderwerp, en de
 * mens die helpt is je consultant (§12), nooit "we".
 */

/** Het verzoek kwam niet aan: geen internet, of de server was even weg. */
export const GEEN_VERBINDING = "Geen verbinding. Controleer je internet en probeer het opnieuw.";

/** Als losse titel en uitleg, voor een toast. */
export const GEEN_VERBINDING_TITEL = "Geen verbinding";
export const GEEN_VERBINDING_UITLEG = "Controleer je internet en probeer het opnieuw.";

/** De standaardzin als een handeling niet lukte: "Opslaan is niet gelukt. Probeer het opnieuw." */
export function nietGelukt(handeling: string): string {
  return `${handeling} is niet gelukt. Probeer het opnieuw.`;
}

/** De laatste zin als het blijft misgaan: wie helpt er (schrijfstijl.md §12). */
export const BLIJFT_MISGAAN = "Blijft het misgaan, laat het dan je consultant weten.";
