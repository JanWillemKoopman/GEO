/**
 * Welke verwijzing bedoelt een uitvraag? (1 september 2026)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * `sales_opportunities` wijst twee keer naar `sales_companies`: één keer naar
 * het bedrijf zelf (`company_id`) en één keer naar de concurrent die het
 * verschil maakt (`rival_company_id`). PostgREST kan dan niet raden welke van
 * de twee je bedoelt en weigert de hele uitvraag:
 *
 *     PGRST201: Could not embed because more than one relationship was found
 *     for 'sales_opportunities' and 'sales_companies'
 *
 * Wat dat op 1 september 2026 op productie deed: het Opportunities-scherm zei
 * "Nog geen kansen gevonden" terwijl er 43 kansen stonden, de knop om een kans
 * op te pakken antwoordde "Deze kans bestaat niet", en alle zestien taken die
 * de haak moesten schrijven mislukten definitief. Drie plekken, één oorzaak,
 * en op geen van de drie werd de foutmelding uitgelezen: de code zag alleen
 * lege gegevens en concludeerde "bestaat niet".
 *
 * Vandaar deze constante. Wie hem gebruikt, zegt expliciet welke kant hij op
 * wil, en wie hem vergeet wordt gepakt door de broncontrole in
 * `scripts/test-unit.ts`.
 *
 * Bewust ZONDER `server-only`: het is een stuk tekst, en de test leest hem na.
 */

/** Het bedrijf waar de kans over gaat, niet de concurrent. */
export const KANS_BEDRIJF = "sales_companies!sales_opportunities_company_id_fkey";

/** De concurrent die het verschil maakt, niet het bedrijf zelf. */
export const KANS_CONCURRENT = "sales_companies!sales_opportunities_rival_company_id_fkey";
