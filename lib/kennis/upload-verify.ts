/**
 * Het vangnet onder de handmatige upload (30 september 2026).
 *
 * ── EEN PROMPTINSTRUCTIE IS EEN INTENTIE, CODE IS EEN GARANTIE ──────────────
 *
 * Uit een upload komen feiten die meteen naar de schrijver gaan (status
 * verklaard, gebruik content, zoals bij het merkdossier). Het model mag ze dus
 * niet bijschaven. Drie regels, in code (conventie 1):
 *
 *   1. Bij "staat er" moet het citaat letterlijk in het materiaal staan.
 *      Anders is het geen feit maar een vermoeden, en een vermoeden van het
 *      model heeft een andere status. Zo'n item wordt weggelaten, niet
 *      stilletjes omgezet: dan zou het model zijn eigen twijfel kunnen verstoppen.
 *   2. Elk getal in de bewering staat ook in het citaat (bij "staat er") of in
 *      het materiaal (bij een vermoeden). Een bedrag, termijn of aantal dat het
 *      model zelf optelt of afrondt valt dus weg.
 *   3. Stijl en toon krijgen geen controle (conventie 1): een bewering in eigen
 *      woorden is de bedoeling, anders is elke zin een kopie.
 *
 * Puur en zonder `server-only` (conventie 2), getest in `scripts/test-unit.ts`.
 */
import { normalizeForQuote } from "@/lib/pipeline/factcard";
import { tabVoorDomein, type KennisTab } from "@/lib/kennis/overzicht";
import type { UploadItem } from "@/lib/schemas/upload-kennis";

/** Hoeveel items er per upload doorkomen: meer is geen controle meer maar een muur tekst. */
export const MAX_UPLOAD_ITEMS = 40;


const MIN_BEWERING = 8;
const MAX_BEWERING = 400;
/** Een citaat korter dan dit (genormaliseerd) bewijst niets: "ja" staat overal. */
const MIN_CITAAT = 12;
/** Zes maanden, zoals `VERIFY_AFTER_MONTHS` in `lib/pipeline/dossier-verify.ts`. */
const VERLOOPT_NA_MAANDEN = 6;

export interface GecontroleerdUploadItem {
  domein: UploadItem["domein"];
  soort: string | null;
  bewering: string;
  /** Een feit of kennis die er staat is verklaard; een vermoeden is afgeleid. */
  status: "verklaard" | "afgeleid";
  /** Een vermoeden mag niet op een pagina (`controleerItem()`), dus intern. */
  gebruik: "content" | "intern";
  citaat: string | null;
  verlooptOp: string | null;
  tab: KennisTab;
}

export interface UploadControle {
  items: GecontroleerdUploadItem[];
  /** Hoeveel voorstellen vielen af, voor de melding en de logregel. */
  weggelaten: number;
}

/** De losse getallen in een tekst, zonder scheidingstekens: "€ 45,00" geeft ["45", "00"]. */
function getallen(tekst: string): string[] {
  return normalizeForQuote(tekst).split(" ").filter((w) => /^\d+$/.test(w));
}

function heeftAlleGetallen(bewering: string, bron: string): boolean {
  const aanwezig = new Set(getallen(bron));
  return getallen(bewering).every((g) => aanwezig.has(g));
}

function verlooptOp(nu: Date): string {
  const d = new Date(nu.getTime());
  d.setMonth(d.getMonth() + VERLOOPT_NA_MAANDEN);
  return d.toISOString().slice(0, 10);
}

export function controleerUpload(voorstellen: readonly UploadItem[], materiaal: string, nu: Date = new Date()): UploadControle {
  const tekst = normalizeForQuote(materiaal);
  const gezien = new Set<string>();
  const items: GecontroleerdUploadItem[] = [];
  let weggelaten = 0;

  for (const v of voorstellen) {
    if (items.length >= MAX_UPLOAD_ITEMS) {
      weggelaten++;
      continue;
    }
    const bewering = v.bewering.trim().replace(/\s+/g, " ");
    const sleutel = normalizeForQuote(bewering);
    if (bewering.length < MIN_BEWERING || bewering.length > MAX_BEWERING || !sleutel || gezien.has(sleutel)) {
      weggelaten++;
      continue;
    }
    const citaat = v.citaat.trim();
    const citaatNorm = normalizeForQuote(citaat);
    const citaatKlopt = citaatNorm.length >= MIN_CITAAT && tekst.includes(citaatNorm);
    const soort = v.soort.trim().toLowerCase() || null;

    if (v.zekerheid === "staat_er") {
      if (!citaatKlopt || !heeftAlleGetallen(bewering, citaat)) {
        weggelaten++;
        continue;
      }
    } else if (!heeftAlleGetallen(bewering, materiaal)) {
      weggelaten++;
      continue;
    }

    gezien.add(sleutel);
    const staatEr = v.zekerheid === "staat_er";
    items.push({
      domein: v.domein,
      soort,
      bewering,
      status: staatEr ? "verklaard" : "afgeleid",
      gebruik: staatEr ? "content" : "intern",
      // Bij een vermoeden blijft het citaat alleen staan als het echt in het
      // materiaal staat: een verzonnen bewijsplek is erger dan geen.
      citaat: citaatKlopt ? citaat : null,
      verlooptOp: staatEr && v.verloopt ? verlooptOp(nu) : null,
      tab: tabVoorDomein(v.domein),
    });
  }
  return { items, weggelaten };
}

export interface UploadTelling {
  feiten: number;
  kennis: number;
  vermoedens: number;
  /** Stond er al (of de mens wees het eerder af): niets geschreven. */
  alBekend: number;
  geweigerd: number;
}

export function nieuweUploadTelling(): UploadTelling {
  return { feiten: 0, kennis: 0, vermoedens: 0, alBekend: 0, geweigerd: 0 };
}
