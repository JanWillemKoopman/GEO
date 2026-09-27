/**
 * Het register van abonnees (G1, §6.5). Puur en getest, geen `server-only`: een
 * abonnee koppelt alleen een naam en een soort aan een verwerkfunctie, zonder
 * zelf iets te lezen of te schrijven.
 *
 * G1 bouwt de laag zonder abonnee: die begint pas bij G3 (kansen op "te
 * herzien" zetten) en G4 (de bestaande verversingslogica overnemen). Nieuwe
 * modules voegen hun abonnee hier toe.
 */
import type { Abonnee, GebeurtenisSoort } from "@/lib/gebeurtenissen/types";

export const ALLE_ABONNEES: readonly Abonnee[] = [];

/** Welke abonnees reageren op deze soort gebeurtenis. */
export function abonneesVoor(
  soort: GebeurtenisSoort,
  abonnees: readonly Abonnee[] = ALLE_ABONNEES,
): Abonnee[] {
  return abonnees.filter((a) => a.soorten.includes(soort));
}
