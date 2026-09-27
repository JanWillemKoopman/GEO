/**
 * Het register van abonnees (G1, §6.5). Puur en getest, geen `server-only`: dit
 * bestand zelf leest of schrijft niets. Een concrete abonnee (met echte
 * database-aanroepen, dus wél `server-only`) registreert zichzelf hier via
 * `registreer()`, als import-bijwerking vanuit `lib/jobs/handlers.ts` (zo laadt
 * de werker hem, en test-unit.ts, dat dit bestand puur importeert, niet).
 *
 * G1 bouwde de laag zonder abonnee. G3 voegt de eerste toe (kansen op "te
 * herzien" of "vervallen" zetten, een melding bij een pagina); G4 volgt met de
 * bestaande verversingslogica.
 */
import type { Abonnee, GebeurtenisSoort } from "@/lib/gebeurtenissen/types";

export const ALLE_ABONNEES: Abonnee[] = [];

/** Idempotent: opnieuw registreren (een hot reload, een dubbele import) voegt niets dubbel toe. */
export function registreer(abonnee: Abonnee): void {
  if (ALLE_ABONNEES.some((a) => a.naam === abonnee.naam)) return;
  ALLE_ABONNEES.push(abonnee);
}

/** Welke abonnees reageren op deze soort gebeurtenis. */
export function abonneesVoor(
  soort: GebeurtenisSoort,
  abonnees: readonly Abonnee[] = ALLE_ABONNEES,
): Abonnee[] {
  return abonnees.filter((a) => a.soorten.includes(soort));
}
