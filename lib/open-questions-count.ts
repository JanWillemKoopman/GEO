/**
 * De optelling achter "3 openstaande vragen".
 *
 * Puur en zonder `server-only` (conventie 2): dit getal staat sinds 28 augustus
 * 2026 op drie plekken tegelijk (de bovenbalk, de zijbalk en de kop van de
 * vragenpagina) en moet op alle drie hetzelfde zijn. Het ophalen staat in
 * `lib/open-questions.ts`.
 */

/**
 * Wat de klant nog kan doen: onbeantwoorde feitenvragen plus open punten in het
 * profiel met een knop erachter.
 *
 * ⚠️ Overgeslagen vragen tellen niet mee. Overslaan is een antwoord ("weet ik
 * niet"), en een teller die daarop blijft staan vraagt om werk dat niemand meer
 * kan doen.
 */
export function openVragenTotaal({
  openFacts,
  gaps,
}: {
  openFacts: number;
  gaps: number;
}): number {
  return Math.max(0, openFacts) + Math.max(0, gaps);
}

/**
 * De tekst naast het groene bolletje in de bovenbalk.
 *
 * Enkelvoud en meervoud, want dit getal staat vaak op 1. Nul levert `null` op:
 * dan verdwijnt de hele melding, inclusief het bolletje. Een teller die "0
 * openstaande vragen" meldt vraagt aandacht voor niets, en hij staat naast élk
 * scherm van de app.
 */
export function openVragenLabel(totaal: number): string | null {
  if (totaal <= 0) return null;
  return totaal === 1 ? "1 openstaande vraag" : `${totaal} openstaande vragen`;
}
