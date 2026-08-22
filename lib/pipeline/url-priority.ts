/**
 * Wélke pagina's ORBIT ENGINE ophaalt als een site groter is dan het plafond.
 *
 * ── WAT HIER MIS GING ───────────────────────────────────────────────────────
 *
 * De crawl nam de eerste 150 URL's in sitemapvolgorde (`crawler.ts`, de
 * `slice(0, maxPages)` aan het eind van `collectSitemapPageUrls`). Bij een
 * WordPress-site met Yoast staat `post-sitemap.xml` vóór `page-sitemap.xml`, dus
 * een site met 2000 blogartikelen en 12 dienstenpagina's leverde 150
 * blogartikelen op en geen enkele dienstenpagina. Het aanbod van die klant kwam
 * daarna uit een model dat alleen blogs had gezien.
 *
 * Meer pagina's ophalen lost dat niet op. Andere pagina's ophalen wel.
 *
 * ── DE TWEE STAPPEN ─────────────────────────────────────────────────────────
 *
 *   1. **Score per URL.** Deterministisch, uit het pad. Een pagina onder
 *      `/diensten` telt zwaarder dan een pagina onder `/blog`, en de homepage
 *      wint altijd.
 *   2. **Verdelen over de secties.** Elke sectie krijgt eerst een eigen quotum,
 *      pas daarna gaan de overgebleven plekken naar de hoogste scores. Zonder
 *      die eerste stap wint de grootste sectie alles: een blog van 2000 pagina's
 *      levert nu eenmaal meer hoog scorende URL's op dan een dienstensectie van
 *      12, ook als elke losse dienstenpagina belangrijker is.
 *
 * Puur, dus testbaar (conventie 2). Geen netwerk, geen database, geen AI.
 */
import { looksLikeProductPage } from "@/lib/pipeline/inventory-quality";
import { canonicalKey, sectionOf, segmentsOf } from "@/lib/crawl-urls";

/**
 * Secties die het aanbod dragen. Op WOORDNIVEAU vergeleken en niet op de hele
 * segmentnaam, want geen enkele site heet zijn map precies `/dienst`: het is
 * `/onze-diensten`, `/wat-we-doen`, `/behandelingen-en-tarieven`.
 */
const AANBOD_WOORDEN = new Set([
  "dienst", "diensten", "service", "services", "aanbod", "aanbiedingen",
  "behandeling", "behandelingen", "producten", "productgroepen", "assortiment",
  "oplossing", "oplossingen", "specialisme", "specialismen", "expertise",
  "expertises", "vakgebied", "vakgebieden", "branche", "branches", "sector",
  "sectoren", "categorie", "categorieen", "categorieën", "collections",
  "cursus", "cursussen", "opleiding", "opleidingen", "training", "trainingen",
  "pakket", "pakketten", "abonnement", "abonnementen", "tarieven", "prijzen",
  "prijslijst", "doen", "leveren", "bieden",
]);

/**
 * Pagina's die het bedrijf beschrijven maar niet het aanbod. Waardevol voor het
 * merkprofiel (adres, team, werkwijze), minder voor de aanbodboom. Vandaar een
 * kleinere bonus dan het aanbod zelf, maar wel een bonus: bij Fysi-Unique stond
 * het telefoonnummer op de contactpagina en verder nergens.
 */
const STEUN_WOORDEN = new Set([
  "over", "about", "ons", "onze", "team", "medewerkers", "mensen", "praktijk",
  "contact", "locatie", "locaties", "vestiging", "vestigingen", "werkwijze",
  "aanpak", "methode", "faq", "veelgestelde", "vragen", "kennisbank",
  "klanten", "cases", "referenties", "projecten", "portfolio",
]);

/**
 * Secties die veel pagina's opleveren en weinig over het aanbod zeggen. Alleen
 * op het EERSTE segment getoetst: `/blog/onze-diensten-uitgelegd` is een
 * blogartikel, ook al staat het woord "diensten" in de titel.
 */
const RUIS_WOORDEN = new Set([
  "blog", "nieuws", "news", "actueel", "actualiteit", "artikel", "artikelen",
  "post", "posts", "tag", "tags", "auteur", "author", "archief", "archive",
  "agenda", "events", "evenementen", "vacature", "vacatures", "werken",
  "privacy", "cookies", "voorwaarden", "disclaimer", "algemene", "sitemap",
  "winkelwagen", "checkout", "kassa", "account", "inloggen", "mijn",
]);

/** De homepage wint altijd, en met een marge die geen enkele bonus haalt. */
export const HOMEPAGE_SCORE = 1000;

/** Wat een expliciet door een mens gekozen sectie waard is. Overstemt alles behalve de homepage. */
const VOORRANG_BONUS = 300;

/** Splitst een padsegment in woorden: "onze-diensten" → ["onze", "diensten"]. */
function woordenVan(segment: string): string[] {
  return segment
    .toLowerCase()
    .replace(/\.(html?|php|aspx?)$/i, "")
    .split(/[-_.]+/)
    .filter(Boolean);
}

/**
 * Hoe waardevol is deze pagina voor het in kaart brengen van het aanbod?
 *
 * Geen 0-100 schaal: het getal wordt alleen met andere scores vergeleken, nooit
 * aan een drempel gehouden. Een schaal zou suggereren dat 50 iets betekent.
 */
export function scoreUrl(url: string, priorityPaths: readonly string[] = []): number {
  const segments = segmentsOf(url);
  if (segments.length === 0) return HOMEPAGE_SCORE;

  let score = 0;
  if (priorityPaths.includes(sectionOf(url))) score += VOORRANG_BONUS;

  const eersteWoorden = woordenVan(segments[0]);
  if (eersteWoorden.some((w) => RUIS_WOORDEN.has(w))) {
    // Ruis in de sectie sluit de aanbodbonus uit, anders scoort
    // `/blog/onze-diensten-uitgelegd` hoger dan `/contact`.
    score -= 80;
  } else {
    const alleWoorden = segments.flatMap(woordenVan);
    if (alleWoorden.some((w) => AANBOD_WOORDEN.has(w))) score += 120;
    else if (alleWoorden.some((w) => STEUN_WOORDEN.has(w))) score += 60;
  }

  // Een losse productpagina die door het filter van de crawler heen kwam
  // (`/producten/fiets` matcht `isProductUrl` niet) is nog steeds geen goed
  // contentdoel. Wel blijft hij boven een blogartikel uitkomen als hij onder een
  // aanbodsectie hangt, en dat klopt: dan zegt hij iets over het assortiment.
  if (looksLikeProductPage(url)) score -= 60;

  // Hoe dieper, hoe specifieker, hoe minder representatief voor het geheel.
  score -= 12 * (segments.length - 1);

  return score;
}

/** Vaste volgorde: hoogste score eerst, dan ondiep vóór diep, dan alfabetisch. */
function vergelijk(a: string, b: string, priorityPaths: readonly string[]): number {
  const verschil = scoreUrl(b, priorityPaths) - scoreUrl(a, priorityPaths);
  if (verschil !== 0) return verschil;
  const diepte = segmentsOf(a).length - segmentsOf(b).length;
  if (diepte !== 0) return diepte;
  return a.localeCompare(b);
}

/** Hoeveel er in een sectie gevonden zijn en hoeveel er gekozen zijn. */
export interface SectionPick {
  segment: string;
  found: number;
  selected: number;
}

export interface UrlSelection {
  /** De gekozen URL's, belangrijkste eerst, zodat een afgebroken crawl het minste kwijt is. */
  urls: string[];
  /** Hoeveel unieke URL's er te kiezen waren. Dit is het cijfer dat nergens werd bewaard. */
  totalFound: number;
  /** Waren het er meer dan we mochten ophalen? */
  truncated: boolean;
  /** Per sectie het resultaat, grootste sectie eerst. Voedt het scherm en de logregel. */
  sections: SectionPick[];
}

/**
 * Kiest `max` URL's uit alles wat de sitemap opleverde.
 *
 * ── WAAROM EERST EEN QUOTUM PER SECTIE ──────────────────────────────────────
 *
 * Zou je puur op score kiezen, dan wint de grootste sectie. Een blog van 2000
 * artikelen bevat gegarandeerd 150 artikelen die net iets hoger scoren dan de
 * onderste dienstenpagina, ook al is elke dienstenpagina belangrijker dan elk
 * artikel. Het quotum garandeert dat élke sectie aan bod komt; de vrije plekken
 * daarna gaan alsnog naar de hoogste scores, dus een grote relevante sectie
 * wordt niet afgeknepen.
 */
export function selectUrls(
  all: readonly string[],
  max: number,
  priorityPaths: readonly string[] = [],
): UrlSelection {
  // Ontdubbelen op de canonieke sleutel en niet op de letterlijke tekst: de
  // sitemap van udenhout.nl bevat zowel `https://udenhout.nl` als
  // `https://udenhout.nl/`, en dat is één pagina die anders twee plekken kost.
  // De eerst gevonden schrijfwijze wint, zodat de URL blijft zoals de site hem
  // opgeeft en een bewijscitaat er straks op matcht.
  const perSleutel = new Map<string, string>();
  for (const url of all) {
    const sleutel = canonicalKey(url);
    if (!perSleutel.has(sleutel)) perSleutel.set(sleutel, url);
  }
  const uniek = [...perSleutel.values()];
  const totalFound = uniek.length;

  const perSectie = new Map<string, string[]>();
  for (const url of uniek) {
    const key = sectionOf(url);
    const lijst = perSectie.get(key) ?? [];
    lijst.push(url);
    perSectie.set(key, lijst);
  }
  for (const lijst of perSectie.values()) {
    lijst.sort((a, b) => vergelijk(a, b, priorityPaths));
  }

  const secties = [...perSectie.entries()].sort((a, b) => {
    // Op de beste pagina in de sectie, niet op het gemiddelde: één
    // dienstenpagina in een verder saaie sectie moet die sectie omhoog trekken.
    const verschil =
      scoreUrl(b[1][0], priorityPaths) - scoreUrl(a[1][0], priorityPaths);
    if (verschil !== 0) return verschil;
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0].localeCompare(b[0]);
  });

  const gekozen = new Set<string>();

  if (totalFound > max) {
    /**
     * Vult een sectie aan TOT `doel` gekozen pagina's, en voegt er niet `doel`
     * bij. Dat verschil telt: een voorrangsectie is in stap 1 al gevuld, en
     * stap 2 mag daar niet nog eens een quotum bovenop leggen.
     */
    const vulAanTot = (lijst: readonly string[], doel: number) => {
      let inSectie = lijst.reduce((n, u) => (gekozen.has(u) ? n + 1 : n), 0);
      for (const url of lijst) {
        if (gekozen.size >= max || inSectie >= doel) break;
        if (gekozen.has(url)) continue;
        gekozen.add(url);
        inSectie++;
      }
    };

    // ── Stap 1: wat een mens (of het model) expliciet aanwees ───────────────
    //
    // Deze ronde stond er eerst niet in, en zonder hem deed voorrang geen
    // enkel werk: bij twee secties en 50 plekken kreeg elke sectie er 25,
    // ongeacht wat de consultant had ingevuld. De score-bonus verandert dan
    // alleen de VOLGORDE binnen een sectie, niet hoeveel die sectie krijgt.
    //
    // Het budget is alles behalve één plek per overige sectie. Een expliciete
    // keuze krijgt dus zoveel als hij wil, maar mag geen enkel ander deel van
    // de site volledig het zwijgen opleggen: dat gat zou pas opvallen als het
    // aanbod al gebouwd is.
    const voorrang = secties.filter(([segment]) => priorityPaths.includes(segment));
    if (voorrang.length > 0) {
      const overige = secties.length - voorrang.length;
      const budget = Math.max(voorrang.length, max - overige);
      const quotum = Math.max(1, Math.floor(budget / voorrang.length));
      for (const [, lijst] of voorrang) vulAanTot(lijst, quotum);
    }

    // ── Stap 2: het gewone quotum, ten minste één per sectie ────────────────
    const quotum = Math.max(1, Math.floor(max / Math.max(1, secties.length)));
    for (const [, lijst] of secties) {
      if (gekozen.size >= max) break;
      vulAanTot(lijst, quotum);
    }

    // ── Stap 3: de vrije plekken naar de hoogste scores over de hele site ───
    if (gekozen.size < max) {
      for (const url of [...uniek].sort((a, b) => vergelijk(a, b, priorityPaths))) {
        if (gekozen.size >= max) break;
        gekozen.add(url);
      }
    }
  } else {
    for (const url of uniek) gekozen.add(url);
  }

  const urls = [...gekozen].sort((a, b) => vergelijk(a, b, priorityPaths));

  return {
    urls,
    totalFound,
    truncated: totalFound > max,
    sections: secties
      .map(([segment, lijst]) => ({
        segment,
        found: lijst.length,
        selected: lijst.filter((u) => gekozen.has(u)).length,
      }))
      .sort((a, b) => b.found - a.found || a.segment.localeCompare(b.segment)),
  };
}
