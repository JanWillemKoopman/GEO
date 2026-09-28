/**
 * Is het bewijscitaat van een dienst een ADVIES in plaats van een aanbod?
 * (punt 9 van de kwaliteitsdoorlichting, 24 september 2026)
 *
 * De installateur schrijft op zijn site "het ventilatiesysteem moet regelmatig
 * worden schoongemaakt". De aanbodboom maakte daar de dienst "ventilatie laten
 * schoonmaken" van, en die werd een onderwerp en een pagina: een belofte die
 * het bedrijf niet doet. Een advies zegt wat de lezer moet doen, een aanbod wat
 * het bedrijf levert.
 *
 * Streng in één richting: alleen als het citaat een adviesvorm heeft EN geen
 * enkel teken van aanbod ("wij", "bij ons", "u kunt ... laten"), is het advies.
 * Puur en zonder `server-only` (conventie 2).
 */
const ADVIES = /\b(moet|moeten|dient|dienen|is het verstandig|is het belangrijk|raden (?:we|wij) aan|zorg dat|vergeet niet|het is raadzaam|laat .* regelmatig)\b/i;
const AANBOD = /\b(wij|we|ons|onze|bij ons|u kunt|je kunt|kunt u|kun je|bieden|leveren|verzorgen|installeren|plaatsen|voeren .* uit|onderhouden)\b/i;

export function isAdviesCitaat(citaat: string | null | undefined): boolean {
  const tekst = (citaat ?? "").trim();
  if (!tekst) return false;
  return ADVIES.test(tekst) && !AANBOD.test(tekst);
}
