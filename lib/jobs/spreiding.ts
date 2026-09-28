/**
 * Taken over de tijd spreiden, puur en zonder `server-only` (conventie 2).
 * Gebruikt door `enqueueLlmResponseMeasurement()` in `lib/jobs/queue.ts`.
 */

/**
 * Afstand tussen twee Gemini-taken. Vier seconden is vijftien per minuut: een
 * cluster van dertig vragen is in twee minuten door, drie clusters in zes.
 * Gekozen en niet gemeten; de limiet van de leverancier is niet gepubliceerd.
 */
export const GEMINI_AFSTAND_MS = 4_000;

/**
 * De starttijden voor `aantal` taken: vanaf nu, of direct achter de laatste
 * die al klaarstaat als die later ligt, met `afstandMs` ertussen. Puur, zodat
 * de rekenkunde testbaar is.
 */
export function spreidTijden(
  nu: Date,
  laatsteGepland: Date | null,
  aantal: number,
  afstandMs: number,
): Date[] {
  const begin = laatsteGepland && laatsteGepland.getTime() + afstandMs > nu.getTime()
    ? laatsteGepland.getTime() + afstandMs
    : nu.getTime();
  return Array.from({ length: aantal }, (_, i) => new Date(begin + i * afstandMs));
}
