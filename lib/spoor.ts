/**
 * De bladzijde-instellingen van de spoorexport (`app/api/beheer/spoor/[profileId]`).
 *
 * Bewust ZONDER `server-only` (conventie 2): pure functie, testbaar vanuit
 * `scripts/test-unit.ts`. Onbruikbare invoer valt terug op de standaard in plaats
 * van een fout te geven; een tijd die niet te lezen is, wordt genegeerd en niet
 * geraden (conventie 3).
 */

/** Standaard 50 aanroepen per bladzijde: met opdrachten erbij al gauw een paar MB. */
export const SPOOR_STANDAARD = 50;
/** Hooguit 200, zodat één antwoord nooit tientallen MB wordt. */
export const SPOOR_MAX = 200;

export function spoorPaginering(zoek: URLSearchParams): {
  na: string | null;
  aantal: number;
  metInvoer: boolean;
} {
  // Een `+` in een webadres wordt een spatie; in een tijdzone ("+00:00") hoort hij terug.
  const ruwNa = zoek.get("na")?.replace(/ /g, "+") ?? null;
  // Ongewijzigd doorgeven: `created_at` heeft microseconden, en afronden naar
  // milliseconden zou de laatste rij van de vorige bladzijde opnieuw meenemen.
  const na = ruwNa && !Number.isNaN(Date.parse(ruwNa)) ? ruwNa : null;
  const ruwAantal = Number(zoek.get("aantal"));
  const aantal =
    Number.isFinite(ruwAantal) && ruwAantal >= 1
      ? Math.min(Math.floor(ruwAantal), SPOOR_MAX)
      : SPOOR_STANDAARD;
  return { na, aantal, metInvoer: zoek.get("invoer") !== "0" };
}

/** Een merk-id gaat letterlijk een filter in, dus alleen een echte uuid komt erdoor. */
export function isUuid(waarde: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(waarde);
}
