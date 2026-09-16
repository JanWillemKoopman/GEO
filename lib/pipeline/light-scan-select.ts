/**
 * De rekenkunde van het vooronderzoek, los van het netwerk (migratie 0102).
 *
 * Zelfde reden als `lib/crawl-urls.ts` bij `crawler.ts`: `light-scan.ts` begint
 * met `import "server-only"`, dus geen enkele functie daaruit is bereikbaar
 * vanuit `scripts/test-unit.ts`, ook niet een pure functie zonder netwerk of
 * database. Dit bestand bestaat om precies dat gat niet te laten ontstaan.
 */

/**
 * Welke kandidaten missen nog een signaal.
 *
 * Dit is de kern van de herneembaarheid van `profile_light_scan`: een ronde is
 * pas klaar als deze lijst leeg is. `crawlHeads()` (lib/crawler.ts, migratie
 * 0102) schrijft sinds deze ronde ook een rij voor een pagina die niets
 * opleverde, juist zodat zo'n pagina hier niet elke ronde opnieuw als
 * "openstaand" terugkomt.
 */
export function openCandidates(
  candidates: readonly string[],
  alreadyScanned: ReadonlySet<string>,
): string[] {
  return candidates.filter((url) => !alreadyScanned.has(url));
}
