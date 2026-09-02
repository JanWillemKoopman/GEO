/**
 * Concurrentnamen ontdubbelen op meer dan exacte tekst (herstelplan na audit,
 * T8.3).
 *
 * ── WAT ER MIS GING ──────────────────────────────────────────────────────────
 *
 * `lib/pipeline/market.ts` voegde concurrenten samen met `new Set` op de
 * EXACTE naam. Gemeten na één onboarding: negen concurrenten, waarvan er vier
 * dubbel waren, telkens dezelfde naam met en zonder plaatsnaam erachter:
 * "Cleyburch Tandartsen" naast "Cleyburch Tandartsen in Noordwijk", en zo ook
 * Dental4U, MondCleanic en De Voorstraat. Deze lijst stuurt de beoordeling van
 * elke meting aan (welk bedrijf telt als concurrent), dus een dubbele naam
 * telt dubbel mee.
 *
 * ── DE NORMALISATIE ──────────────────────────────────────────────────────────
 *
 * Twee namen zijn dezelfde concurrent als de ene, na het knippen van een
 * meegeplakte plaatsnaam ("... in <plaats>"), gelijk is aan de andere.
 * Bewaard wordt de KORTSTE vorm: die zonder plaatsnaam is de generieke naam
 * van het bedrijf, en dat is de vorm die de rest van de pijplijn (de
 * merkneutraliteitsregel bij het schrijven van meetvragen, R8.2) nodig heeft.
 *
 * ⚠️ Dit is een heuristiek en geen garantie: een landelijke keten met een
 * echt zelfstandige vestiging die toevallig "X in Y" heet, zou hier ook
 * samengevoegd worden. Voor concurrentanalyse (een richtinggevende lijst, geen
 * boekhouding) is dat de juiste kant om te missen: twee keer diezelfde
 * concurrent tellen vertekent de meting zeker, twee zelfstandige vestigingen
 * per ongeluk samenvoegen kost hooguit wat nuance.
 */

/** Knipt een meegeplakte plaatsnaam ("Naam in Plaats") van een concurrentnaam. */
function baseName(name: string): string {
  return name
    .trim()
    .replace(/\s+in\s+[\p{L}\s'-]+$/iu, "")
    .trim();
}

export function dedupeCompetitorNames(names: string[]): string[] {
  const result: string[] = [];
  const indexByBase = new Map<string, number>();

  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;

    const key = baseName(name).toLowerCase();
    const bestaandeIndex = indexByBase.get(key);

    if (bestaandeIndex === undefined) {
      indexByBase.set(key, result.length);
      result.push(name);
    } else if (name.length < result[bestaandeIndex].length) {
      // De kortere vorm (zonder plaatsnaam) is de generieke naam, en die
      // bewaren we in plaats van de eerst geziene vorm.
      result[bestaandeIndex] = name;
    }
  }

  return result;
}
