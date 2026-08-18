/**
 * De merkbrede bibliotheek: zoeken, filteren en pagineren over alle geschreven
 * pagina's van één merk heen.
 *
 * ── WAAROM DEZE BIBLIOTHEEK ER MOEST KOMEN ──────────────────────────────────
 *
 * Content stond per cluster in een eigen bibliotheek. Een klant met vier
 * clusters had dus vier bibliotheken en nergens een overzicht van wat hij
 * gekocht heeft. Dat is precies het verkeerde om te versnipperen: dit is het
 * eindproduct waar hij voor betaalt (besluit 5, 17 augustus 2026).
 *
 * De bibliotheek per cluster blijft bestaan als doorklik vanuit het dossier.
 * Dit scherm is de verzamelplek, niet de vervanging.
 *
 * ── WAAROM DE REKENKANT HIER STAAT EN NIET IN HET SCHERM ────────────────────
 *
 * Filteren en pagineren bepalen wát de klant ziet. Zit daar een fout in, dan
 * mist hij een pagina waarvoor hij betaald heeft, zonder dat er iets misgaat op
 * het scherm. Dat hoort dus in een pure, testbare module (conventie 2), en niet
 * verspreid over een paar `useMemo`-blokken.
 */

/** Alleen wat de lijst en de filters nodig hebben. Bewust smal: dit gaat naar de client. */
export interface LibraryRow {
  id: string;
  analysisId: string;
  /** De naam van het cluster waar deze pagina onder valt. */
  cluster: string;
  title: string;
  type: string;
  status: string;
  geoScore: number | null;
  publishedUrl: string | null;
  createdAt: string;
}

export interface LibraryFilters {
  /** Zoekt in titel én gepubliceerd adres. Hoofdletterongevoelig. */
  zoek: string;
  /** Lege string = alles. */
  type: string;
  status: string;
  cluster: string;
}

export const LEGE_FILTERS: LibraryFilters = { zoek: "", type: "", status: "", cluster: "" };

/**
 * Vanaf hoeveel rijen pagineren we?
 *
 * 25, net als Nova ("toon {n} per pagina"). Op productie stonden op 17 augustus
 * 2026 al 35 pagina's over twee merken, dus dit is nu al relevant en geen
 * voorbereiding op een schaal die nooit komt.
 */
export const PAGINA_GROOTTE = 25;

/**
 * Zoeken en filteren.
 *
 * ⚠️ Zoeken kijkt ook in het gepubliceerde adres. Een klant die een pagina
 * terugzoekt heeft vaker de URL bij de hand (uit zijn CMS, uit Search Console)
 * dan de exacte titel die ORBIT ENGINE eraan gaf.
 */
export function filterLibrary(rows: LibraryRow[], filters: LibraryFilters): LibraryRow[] {
  const q = filters.zoek.trim().toLowerCase();
  return rows.filter((r) => {
    if (filters.type && r.type !== filters.type) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.cluster && r.analysisId !== filters.cluster) return false;
    if (!q) return true;
    return (
      r.title.toLowerCase().includes(q) ||
      (r.publishedUrl ?? "").toLowerCase().includes(q)
    );
  });
}

export interface Paginering<T> {
  rijen: T[];
  pagina: number;
  paginas: number;
  totaal: number;
}

/**
 * Eén pagina uit de lijst snijden.
 *
 * ⚠️ De pagina wordt geklemd en niet afgekapt. Wie op pagina 3 staat en dan een
 * filter aanzet dat maar vier rijen overlaat, hoort die vier te zien en niet een
 * lege lijst met "geen resultaten". Dat laatste leest als "er is niets", terwijl
 * er gewoon iets is.
 */
export function pagineer<T>(rijen: T[], pagina: number, grootte = PAGINA_GROOTTE): Paginering<T> {
  const paginas = Math.max(1, Math.ceil(rijen.length / grootte));
  const veilig = Math.min(Math.max(1, Math.round(pagina) || 1), paginas);
  const start = (veilig - 1) * grootte;
  return {
    rijen: rijen.slice(start, start + grootte),
    pagina: veilig,
    paginas,
    totaal: rijen.length,
  };
}

export interface LibraryTotals {
  geschreven: number;
  klaarVoorVrijgave: number;
  gepubliceerd: number;
}

/**
 * De drie kerncijfers boven de lijst.
 *
 * ⚠️ `geschreven` is álles, ook wat al gepubliceerd is. Drie getallen die samen
 * het totaal vormen zou suggereren dat het drie losse stapels zijn, en dan telt
 * een klant ze op en komt uit op meer pagina's dan hij heeft. Dit is een trechter:
 * geschreven → klaar → live.
 */
export function libraryTotals(rows: LibraryRow[]): LibraryTotals {
  return {
    geschreven: rows.length,
    klaarVoorVrijgave: rows.filter((r) => r.status === "ready").length,
    gepubliceerd: rows.filter((r) => r.status === "published").length,
  };
}

/** De waarden die in deze lijst voorkomen, voor de filterknoppen. Leeg filter = geen knop. */
export function beschikbareWaarden(rows: LibraryRow[]): {
  types: string[];
  statussen: string[];
  clusters: { id: string; naam: string }[];
} {
  const clusters = new Map<string, string>();
  for (const r of rows) clusters.set(r.analysisId, r.cluster);
  return {
    types: [...new Set(rows.map((r) => r.type))].sort(),
    statussen: [...new Set(rows.map((r) => r.status))].sort(),
    clusters: [...clusters.entries()]
      .map(([id, naam]) => ({ id, naam }))
      .sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
  };
}
