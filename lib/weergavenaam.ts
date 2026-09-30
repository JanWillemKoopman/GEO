/**
 * Hoe de gebruiker onderaan de zijbalk heet.
 *
 * De voornaam als die bekend is, anders het e-mailadres. Sinds 0136 vragen alle
 * uitnodigingen een voor- en achternaam, die bij het activeren in de metadata
 * van het account komen (`voornaam`, `achternaam`). Accounts van vóór die
 * datum hebben geen naam en tonen dus het adres. Onbekend is een betere waarde dan een gok
 * (conventie 3): een naam uit het stuk voor de @ afleiden zou "info" of "jw84"
 * als voornaam tonen.
 *
 * Bewust zonder `server-only`: pure rekenkunde, ook getest vanuit `test-unit.ts`.
 */

/** Sleutels waar een naam in kan staan, in volgorde van voorkeur. */
const NAAMSLEUTELS = ["voornaam", "first_name", "given_name", "full_name", "name"] as const;

export function weergaveNaam(
  metadata: Record<string, unknown> | null | undefined,
  email: string | null | undefined,
): string {
  for (const sleutel of NAAMSLEUTELS) {
    const waarde = metadata?.[sleutel];
    if (typeof waarde !== "string") continue;
    const voornaam = waarde.trim().split(/\s+/)[0];
    if (voornaam) return voornaam;
  }
  return email?.trim() ?? "";
}
