/**
 * Stub voor het `server-only`-pakket, uitsluitend voor de ketentest.
 *
 * Next.js levert `server-only` als bouwtijd-grendel: importeer je een module met
 * die regel bovenaan vanuit een client-component, dan faalt de build. Buiten
 * Next bestaat het pakket niet, en de ketentest draait bewust buiten Next — hij
 * roept de jobhandlers rechtstreeks aan, precies zoals de werker dat doet.
 *
 * Zonder deze stub zou de test alleen pure modules kunnen importeren, en dat is
 * exact wat `test-unit.ts` al kan. De grendel zelf blijft in productie gewoon
 * werken: `npm run build` gebruikt het echte pakket van Next.
 */
module.exports = {};
