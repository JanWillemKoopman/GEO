/**
 * Gaat het antwoord op een vraag aan de klant ook naar `profiles.proof_points`?
 *
 * Bewust ZONDER `server-only` (conventie 2): testbaar vanuit
 * `scripts/test-unit.ts`. De toelichting staat in `answerFact()` in
 * `lib/facts.ts` (kwaliteitsdoorlichting, punt 41, 24 september 2026).
 *
 * Alleen een losse merkvraag zonder koppeling aan een bewering van de
 * voorbereiding gaat mee. Een antwoord op een vraag uit de voorbereiding
 * (`claim_key`) of op een vraag die aan één pagina hangt, bereikt de schrijver
 * al via `buildFactBase()` met de bron "klant, bevestigd", en hoort niet als
 * "site"-feit op de kaart van elke andere pagina.
 */
export function moetNaarProofPoints(fact: { claim_key?: string | null; scope?: string | null }): boolean {
  if (fact.claim_key) return false;
  if (fact.scope === "pagina") return false;
  return true;
}
