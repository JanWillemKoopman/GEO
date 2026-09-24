/**
 * KERNCIJFERS VAN DE SITE: het vangnet onder het merkonderzoek
 * (kwaliteitsdoorlichting 24 september 2026, punt 7).
 *
 * ── WAT ER MISGING ──────────────────────────────────────────────────────────
 *
 * De homepage van de rijschool zegt "Lovende reviews op Google en een
 * slagingspercentage van 93%". De crawl las die pagina, maar het getal stond
 * niet in het merkonderzoek, niet in het dossier en op geen enkele feitenkaart
 * die van de site kwam. De schrijver kreeg het argument niet mee dat een lezer
 * het meest overtuigt; het kwam pas op de kaart omdat de ondernemer het in het
 * gesprek herhaalde.
 *
 * ── WAT DEZE MODULE DOET ────────────────────────────────────────────────────
 *
 * Deterministisch zoeken naar zinnen met een cijfer dat iets over het bedrijf
 * zegt: een percentage, een aantal klanten of projecten, jaren ervaring, een
 * beoordeling. Alleen zinnen die over het bedrijf zelf gaan (homepage, of met
 * "wij", "onze" of de merknaam erin), want een blog over "de helft van de
 * kandidaten zakt" is geen bewijs voor de rijschool. Niet in plaats van het
 * onderzoek, maar ernaast (conventie 1).
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { segmentsOf } from "@/lib/crawl-urls";

/** Hoeveel kerncijfers er hooguit op de kaart gaan. */
export const MAX_KERNCIJFERS = 5;

const CIJFER = new RegExp(
  [
    String.raw`\d+(?:[.,]\d+)?\s?(?:%|procent)`,
    String.raw`\d[\d.]*\+?\s(?:tevreden\s)?(?:klanten|tuinen|projecten|leerlingen|cursisten|reviews|recensies|beoordelingen|monteurs|medewerkers|vakmensen|contracten|onderhoudscontracten|installaties|woningen|jaar ervaring|jaar)\b`,
    String.raw`\b\d[,.]\d\b[^.]{0,60}(?:google|reviews?|sterren|beoordeling|klantwaardering)`,
    String.raw`(?:google|reviews?|beoordeling|klantwaardering)[^.]{0,40}\b\d[,.]\d\b`,
    String.raw`(?:sinds|opgericht in|al sinds)\s(?:19|20)\d{2}`,
  ].join("|"),
  "i",
);

/** Cijfers die over iets anders gaan dan de prestaties van het bedrijf. */
const GEEN_BEWIJS = /\b(btw|korting|rente|subsidie|hypotheek|inflatie|cookies?|aanbetaling|annulering)\b/i;

const EIGEN = /\b(wij|we|onze|ons)\b/i;

function zinnen(tekst: string): string[] {
  return tekst
    .replace(/\u00ad/g, "") // zacht afbreekstreepje: "slagings" en "percentage" aan elkaar
    // Ook bij een los aanhalingsteken: een citaat uit een artikel begint vaak
    // midden in een regel ("CBR magazine, september 2022 “ Lovende reviews").
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])|\s[“"]\s?/)
    .map((z) => z.replace(/\s+/g, " ").trim().replace(/^[“"']+|[”"']+$/g, "").trim())
    .filter((z) => z.length >= 20 && z.length <= 220);
}

export interface Kerncijfer {
  text: string;
  url: string;
}

export function vindKerncijfers(
  pages: readonly { url: string; text: string | null }[],
  brandName: string | null | undefined,
): Kerncijfer[] {
  const merk = (brandName ?? "").trim().toLowerCase();
  const merkWoord = merk.split(/\s+/).find((w) => w.length >= 5) ?? null;
  const perZin = new Map<string, { k: Kerncijfer; paginas: number; home: boolean }>();

  for (const page of pages) {
    const home = segmentsOf(page.url).length === 0;
    for (const zin of zinnen(page.text ?? "")) {
      if (!CIJFER.test(zin) || GEEN_BEWIJS.test(zin)) continue;
      const laag = zin.toLowerCase();
      const overHetBedrijf = home || EIGEN.test(zin) || (merkWoord !== null && laag.includes(merkWoord));
      if (!overHetBedrijf) continue;
      const sleutel = laag.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      const bestaand = perZin.get(sleutel);
      if (bestaand) {
        bestaand.paginas++;
        bestaand.home ||= home;
      } else {
        perZin.set(sleutel, { k: { text: zin, url: page.url }, paginas: 1, home });
      }
    }
  }

  return [...perZin.values()]
    .sort((a, b) => Number(b.home) - Number(a.home) || b.paginas - a.paginas || a.k.text.length - b.k.text.length)
    .slice(0, MAX_KERNCIJFERS)
    .map((v) => v.k);
}
