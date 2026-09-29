/**
 * Was dit een antwoord dat niet als JSON te lezen was? (V12 van
 * `docs/tasks/pijplijnanalyse-contentketen.md`)
 *
 * Alleen dat soort fout rechtvaardigt een tweede poging met meer redeneertijd:
 * het model schreef zijn gedachten als antwoord ("We need ou..."). Een netwerk-
 * of limietfout is iets anders en gaat naar de gewone herkansing van de taak.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
export function isOnleesbaarAntwoord(err: unknown): boolean {
  const tekst = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? "");
  return /is not valid JSON|Unexpected token|Unexpected end of JSON|geen geldig geparst resultaat|paste niet op het schema/i.test(tekst);
}
