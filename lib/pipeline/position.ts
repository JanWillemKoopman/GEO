/**
 * De positie van een merk in een AI-antwoord, betrouwbaar gemaakt
 * (implementatieplan.md R3.2).
 *
 * ── WAT HIER MIS GING ───────────────────────────────────────────────────────
 *
 * `position` zat vanaf het begin in het mention-schema, maar de prompt legde
 * nergens uit hoe er geteld moest worden. Het model deed dus maar wat: van de
 * 521 vermeldingen in de eerste vijf analyses stonden er 215 op 0, twee op -1,
 * en de rest netjes op 1 tot en met 10. Dat is geen conventie maar een mengsel.
 *
 * Niemand merkte het, want het veld werd nergens gebruikt. Precies de reden dat
 * R3 het gaat gebruiken én dat het eerst gerepareerd moest worden.
 *
 * Uit zo'n mengsel is achteraf niet te herleiden wat "0" betekende: eerste plek
 * (0-based) of "geen idee". Daarom niet gokken en niet verschuiven, maar eerlijk
 * op null. Onbekend is een betere waarde dan een verkeerde: zo verzwakt één
 * ontspoorde meting hooguit het gemiddelde in plaats van het te vervalsen.
 *
 * De prompt zegt sinds R3 expliciet "tel vanaf 1" (lib/openai/mention-prompt.ts);
 * dit is het vangnet daaronder, want een instructie is geen garantie.
 *
 * Bewust ZONDER `server-only`: pure rekenkunde, testbaar in een kaal script.
 */

/** Geldige positie (1 of hoger, afgerond) of null als de waarde onbruikbaar is. */
export function normalizePosition(position: number | null | undefined): number | null {
  if (position == null || !Number.isFinite(position)) return null;
  const rounded = Math.round(position);
  return rounded >= 1 ? rounded : null;
}

/**
 * Gemiddelde positie over een reeks metingen, of null als er niets bruikbaars
 * tussen zit.
 *
 * Alleen over vermeldingen die er echt zijn: een merk dat niet genoemd wordt
 * heeft geen positie, en die als 0 óf als maximum meetellen zou het gemiddelde
 * allebei op een andere manier vervalsen.
 */
export function averagePosition(positions: (number | null | undefined)[]): number | null {
  return weightedAveragePosition(positions.map((position) => ({ position, weight: 1 })));
}

/**
 * Hetzelfde gemiddelde, maar met een gewicht per meting (R6.1).
 *
 * Nodig omdat de zwaarstwegende vragen sinds R6.1 meerdere keren gemeten worden.
 * Zou elke meting even zwaar tellen, dan bepaalde zo'n vraag in z'n eentje drie
 * plekken van het gemiddelde. Met gewicht 1/herhalingen telt elke VRAAG één keer
 * mee, en is de bijdrage van een herhaalde vraag z'n eigen gemiddelde positie.
 */
export function weightedAveragePosition(
  metingen: { position: number | null | undefined; weight: number }[],
): number | null {
  const geldig = metingen
    .map((m) => ({ position: normalizePosition(m.position), weight: m.weight }))
    .filter((m): m is { position: number; weight: number } => m.position !== null && m.weight > 0);
  if (geldig.length === 0) return null;

  const totaalGewicht = geldig.reduce((sum, m) => sum + m.weight, 0);
  if (totaalGewicht <= 0) return null;
  const som = geldig.reduce((sum, m) => sum + m.position * m.weight, 0);
  return Math.round((som / totaalGewicht) * 10) / 10;
}
