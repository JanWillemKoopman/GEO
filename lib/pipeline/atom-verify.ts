/**
 * Het vangnet onder de atomiseerstap (S1).
 *
 * ── WAAROM DIT EEN EIGEN BESTAND IS ─────────────────────────────────────────
 *
 * `fact-atomise.ts` doet de AI-aanroep en is dus `server-only` — niet te
 * importeren vanuit `scripts/test-unit.ts`. Deze controle bepaalt wélke feiten er
 * op de kaart belanden en is daarmee precies het soort logica dat volgens
 * werkafspraak 2 in een importeerbaar bestand hoort, samen met `position.ts`,
 * `question-share.ts` en `validate-claims.ts`.
 *
 * ── WAT HIJ BEWAAKT ─────────────────────────────────────────────────────────
 *
 * De atomiseerprompt zegt "neem de zin letterlijk over". Dat is een intentie.
 * Deze functie is de garantie: een teruggegeven zin moet na normalisatie in de
 * brontekst voorkomen, anders valt hij weg. Zonder die controle zou een
 * samengevatte of gladgestreken zin een F-nummer krijgen — en dan is de
 * citaatplicht (`isSupported`) uitgehold op precies de plek waar hij het hardst
 * nodig is. Onbekend is beter dan verkeerd: liever een kortere kaart.
 */
import { normalizeForQuote, type RawFact } from "@/lib/pipeline/factcard";
import type { CandidatePage } from "@/lib/pipeline/page-relevance";

/**
 * Bovengrens aan wat er van deze stap op de kaart belandt.
 *
 * Niet uit kostenoverweging — die zit in de aanroep, niet in het aantal zinnen —
 * maar omdat de feitenkaart leesbaar moet blijven voor het schrijfmodel. Met de
 * proof points erbij komt een kaart zo op ongeveer 30 feiten. Dat is een
 * hanteerbare gesloten lijst; bij honderd verliest "de enige toegestane bron"
 * z'n scherpte.
 */
export const MAX_ATOMS = 25;

/** Kortere zinnen zijn losse woorden of een menu-item, geen feit. */
const MIN_SENTENCE_CHARS = 25;

/**
 * Langere zijn een alinea die als "zin" verkocht wordt — precies het alibi
 * waarop de eerste briefingronde strandde (6 van de 7 beweringen wezen naar
 * hetzelfde blok van 400 tekens, dus nul vragen aan de klant).
 */
const MAX_SENTENCE_CHARS = 300;

/**
 * Houdt alleen de zinnen over die ECHT in de brontekst staan.
 *
 * Wat er afvalt, en waarom:
 *   • te kort  — losse woorden en menu-items zijn geen feit
 *   • te lang  — een alinea die als zin wordt aangeboden is het oude alibi terug
 *   • niet in de brontekst — samengevat of gladgestreken, dus niet na te trekken
 *   • dubbel   — dezelfde zin uit twee pagina's levert twee F-nummers voor één
 *                feit op, en dan is de traceerbaarheid weg
 */
export function verifyAtoms(
  atoms: { sentence: string; pageIndex: number }[],
  pages: CandidatePage[],
): RawFact[] {
  const genormaliseerdePaginas = pages.map((p) => normalizeForQuote(p.text ?? ""));
  const gezien = new Set<string>();
  const feiten: RawFact[] = [];

  for (const atom of atoms) {
    const zin = (atom.sentence ?? "").trim().replace(/\s+/g, " ");
    if (zin.length < MIN_SENTENCE_CHARS || zin.length > MAX_SENTENCE_CHARS) continue;

    const genormaliseerd = normalizeForQuote(zin);
    if (genormaliseerd.length < 12) continue;

    // Staat de zin echt op de pagina die het model aanwijst? Zo niet, dan
    // proberen we de andere pagina's nog — een verkeerd paginanummer is een
    // slordigheid, een verzonnen zin is een fout. Alleen het tweede is fataal.
    const aangewezen = Math.round(atom.pageIndex) - 1;
    let bron =
      genormaliseerdePaginas[aangewezen]?.includes(genormaliseerd) === true ? aangewezen : -1;
    if (bron === -1) {
      bron = genormaliseerdePaginas.findIndex((tekst) => tekst.includes(genormaliseerd));
    }
    if (bron === -1) continue;

    if (gezien.has(genormaliseerd)) continue;
    gezien.add(genormaliseerd);

    feiten.push({
      text: zin,
      source: `site ${pages[bron].url}`,
      allowed: true,
      // Dít is het punt van de hele stap: een letterlijke zin uit de eigen site
      // is atomair en natrekbaar, dus mag hij een F-nummer dragen.
      citable: true,
      kind: "site",
    });

    if (feiten.length >= MAX_ATOMS) break;
  }

  return feiten;
}
