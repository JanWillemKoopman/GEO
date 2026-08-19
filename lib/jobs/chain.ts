/**
 * Wie plant wie in, in de onboardingketen.
 *
 * ── WAAROM DIT UIT `handlers.ts` GETROKKEN IS ───────────────────────────────
 *
 * De keten stond alleen in de geslaagde tak van elke handler: `profile_offering`
 * plant `profile_market` in, die plant de kennistest in, en die de synthese. Dat
 * werkt zolang elke stap slaagt, en precies daar zat het gat dat de Teamsessie
 * van 18 augustus 2026 vond:
 *
 *   `profile_offering` staat in `NON_BLOCKING_TYPES` met als onderbouwing dat de
 *   klant bij een mislukking alleen zijn dienstenoverzicht en zijn
 *   topicvoorstellen mist. Dat klopt niet: die stap plant de MARKT in, en de
 *   markt draagt de kennistest en de synthese. Mislukt de aanbodstap definitief,
 *   dan wordt de halve onderzoeksketen nooit ingepland én verschijnt er geen
 *   foutmelding, want de taak telt als niet-blokkerend.
 *
 * Het besluit sneuvelde dus op zijn eigen argument. De reparatie is niet een
 * nieuw statusmodel maar deze tabel: de opvolger staat los van de stap die hem
 * uitvoert, en `handlers.ts` gebruikt hem in de geslaagde tak terwijl
 * `scheduleFollowUpAfterFailure()` hem gebruikt als een stap definitief opgeeft.
 * Opgeven is ook een uitkomst waar de keten mee verder moet.
 *
 * Puur en zonder `server-only`, zodat de test hem kan lezen (conventie 2).
 */
import type { JobType } from "@/lib/jobs/types";

/**
 * De opvolger per stap van de onderzoeksketen.
 *
 * ⚠️ `propose_topics` staat er bewust NIET in. Die hangt aan de aanbodboom en
 * heeft er zonder knopen niets te zoeken: onderwerpen voorstellen op basis van
 * alleen een branchenaam levert generieke voorstellen op die precies niet over
 * deze klant gaan. Mislukt de aanbodstap, dan is het overslaan van de
 * topicvoorstellen de juiste uitkomst; het doorzetten van markt, kennistest en
 * synthese niet.
 *
 * `profile_research` staat er ook niet in: die is blokkerend. Mislukt hij, dan
 * gaat het profiel op 'mislukt' en hoort er niets meer achteraan te komen.
 */
export const ONBOARDING_NEXT: Partial<Record<JobType, JobType>> = {
  profile_offering: "profile_market",
  profile_market: "profile_llm_baseline",
  profile_llm_baseline: "profile_synthesis",
};

/** Wat er na deze stap hoort te draaien, of niets. */
export function nextInChain(type: JobType): JobType | null {
  return ONBOARDING_NEXT[type] ?? null;
}
