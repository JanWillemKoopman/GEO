/**
 * Staat dit citaat echt op die pagina?
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * Dezelfde regel werd op twee plekken toegepast en op één plek vergeten. In
 * `synthesis.ts` bepaalt hij welke dossierfeiten overleven (`verifyDossierFacts`
 * in de geest van `verifyAtoms`), en daar stond hij als lokale `normalise()`.
 * In `offering.ts`, waar elke aanbodknoop óók een `evidenceQuote` meekrijgt,
 * werd hij nooit toegepast: elke knoop kreeg `confidence: null`.
 *
 * Eén regel, één plek, en importeerbaar zonder `server-only` zodat
 * `scripts/test-unit.ts` erbij kan (conventie 2).
 *
 * ── DE DREMPEL VAN TWAALF TEKENS ────────────────────────────────────────────
 *
 * Overgenomen uit `synthesis.ts`. Korter dan dat is geen citaat maar een woord,
 * en een los woord staat toevallig op bijna elke pagina. Dat zou een
 * bevestiging opleveren die niets bevestigt.
 */

/**
 * Witruimte gelijktrekken vóór het vergelijken. Een citaat dat over twee regels
 * liep zou anders niet matchen terwijl het er letterlijk staat, en dan gooien
 * we een goed feit weg om een opmaakverschil.
 */
export function normaliseQuote(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Hoe kort een citaat mag zijn en nog iets bewijzen. */
export const MIN_QUOTE_CHARS = 12;

export function quoteOnPage(quote: string, pageText: string): boolean {
  const citaat = normaliseQuote(quote);
  if (citaat.length < MIN_QUOTE_CHARS) return false;
  return normaliseQuote(pageText).includes(citaat);
}

/**
 * Zekerheid van een knoop die met een citaat onderbouwd is.
 *
 * Drie standen, en `null` is er één van (conventie 3):
 *   • 1.00, het citaat staat er letterlijk. Geen afleiding maar een vondst.
 *   • 0.50, de bron-URL klopt, het citaat niet terug te vinden. Bruikbaar,
 *            maar een mens moet er nog naar kijken (`ConfidenceChip` → onzeker).
 *   • null, er is helemaal geen citaat gegeven; dan valt er niets te wegen.
 */
export function quoteConfidence(
  quote: string | null | undefined,
  pageText: string,
): number | null {
  const citaat = (quote ?? "").trim();
  if (citaat === "") return null;
  return quoteOnPage(citaat, pageText) ? 1 : 0.5;
}
