/**
 * Sjabloondetectie: hoe is de site van de klant technisch opgebouwd?
 *
 * ── WAAROM DIT BESTAAT ───────────────────────────────────────────────────────
 *
 * Aura levert content als platte Markdown/HTML, ongeacht of de klant een
 * WordPress-site met een FAQ-accordion heeft of een custom site zonder ook maar
 * één uitklapblok. De klant plakt dan zelf iets dat er niet bij past, of moet
 * handmatig ombouwen. Dit bestand haalt drie dingen uit de HTML die de crawl
 * toch al binnenhaalt, zonder extra netwerkverkeer of AI-kosten:
 *
 *   1. Welk CMS de site waarschijnlijk gebruikt (WordPress, Shopify, Webflow,
 *      Wix, Squarespace), aan herkenbare asset-paden en scripts.
 *   2. Of de site al FAQ-accordions of citaatblokken gebruikt.
 *   3. Hoe diep de koppenstructuur gaat (H1 alleen, of ook H2/H3).
 *
 * ── PUUR, DUS TESTBAAR (conventie 2) ─────────────────────────────────────────
 *
 * Geen `server-only`, geen netwerk: HTML erin, signalen eruit. Zelfde opzet als
 * `structured-data.ts`, dat dezelfde soort werk doet voor JSON-LD.
 *
 * ── ONBEKEND IS EEN BETERE UITKOMST DAN EEN GOK (conventie 3) ────────────────
 *
 * Geen van de herkenningen doet een educated guess op basis van vage signalen:
 * een CMS telt pas als "herkend" bij een concreet, uniek asset-pad (bijvoorbeeld
 * `wp-content/`), niet bij een generiek patroon dat toevallig ook elders
 * voorkomt. Onherkend blijft `onbekend`, en de exportstap (`content-export.ts`)
 * biedt dan gewoon de bestaande platte export aan in plaats van iets te gokken.
 */

export type CmsHint = "wordpress" | "shopify" | "webflow" | "wix" | "squarespace" | "onbekend";

export const CMS_LABEL: Record<CmsHint, string> = {
  wordpress: "WordPress",
  shopify: "Shopify",
  webflow: "Webflow",
  wix: "Wix",
  squarespace: "Squarespace",
  onbekend: "een onbekend CMS",
};

/** Wat er op ÉÉN pagina te herkennen viel. */
export interface PageTemplateSignals {
  cms: CmsHint;
  /** `<details>/<summary>` of een veelvoorkomende accordion-classname. */
  heeftFaqAccordion: boolean;
  /** `<blockquote>` of een veelvoorkomende testimonial-classname. */
  heeftCitaatblok: boolean;
  /** Aantal verschillende kopniveaus dat voorkomt (H1 alleen = 1, H1+H2+H3 = 3). */
  headingNiveaus: number;
}

/**
 * CMS-vingerafdrukken: telkens een asset-pad of scriptnaam die in de praktijk
 * vrijwel nooit toevallig op een andere site voorkomt. Volgorde maakt niet uit,
 * er wordt niet vroegtijdig gestopt: mocht een site per ongeluk twee treffers
 * geven (zeldzaam), dan wint de eerste in deze lijst, altijd dezelfde volgorde.
 */
const CMS_FINGERPRINTS: Array<[CmsHint, RegExp]> = [
  ["wordpress", /wp-content\/|wp-json\/|content=["']WordPress/i],
  ["shopify", /cdn\.shopify\.com|Shopify\.theme|shopify-features/i],
  ["webflow", /data-wf-site=|data-wf-page=|w-webflow-badge/i],
  ["wix", /static\.wixstatic\.com|wix-warmup-data|parastorage\.com/i],
  ["squarespace", /static1\.squarespace\.com|squarespace-cdn\.com|Squarespace\.SQUARESPACE_ROLLUPS/i],
];

const FAQ_ACCORDION_PATTERN =
  /<details[\s>]|class=["'][^"']*\b(accordion|faq-item|faq-question|elementor-accordion|toggle-content)\b/i;

const QUOTE_BLOCK_PATTERN = /<blockquote[\s>]|class=["'][^"']*\btestimonial\b/i;

function detectCms(html: string): CmsHint {
  for (const [cms, pattern] of CMS_FINGERPRINTS) {
    if (pattern.test(html)) return cms;
  }
  return "onbekend";
}

function countHeadingLevels(html: string): number {
  const levels = new Set<number>();
  const re = /<h([1-6])[\s>]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) levels.add(Number(m[1]));
  return levels.size;
}

/** Analyseert één pagina. Bewust op de RUWE HTML, vóór die wordt weggegooid. */
export function detectPageTemplate(html: string): PageTemplateSignals {
  return {
    cms: detectCms(html),
    heeftFaqAccordion: FAQ_ACCORDION_PATTERN.test(html),
    heeftCitaatblok: QUOTE_BLOCK_PATTERN.test(html),
    headingNiveaus: countHeadingLevels(html),
  };
}

/** Het sjabloonbeeld van de hele site, opgebouwd uit de losse paginasignalen. */
export interface SiteTemplateProfile {
  cms: CmsHint;
  heeftFaqAccordion: boolean;
  heeftCitaatblok: boolean;
  headingNiveaus: number;
  /** Op hoeveel pagina's dit beeld gebaseerd is. 0 = geen enkele geanalyseerd. */
  pagesAnalysed: number;
}

/**
 * Voegt de paginasignalen samen tot één sitebeeld.
 *
 * CMS: de vaakst voorkomende herkenning wint (bij een gelijkspel de eerste in
 * `CMS_FINGERPRINTS`-volgorde, via de insertievolgorde van de Map). Eén
 * afwijkende pagina (een ingesloten widget van een ander domein) mag het beeld
 * niet omgooien. De booleans zijn een OF over alle pagina's: één pagina met een
 * FAQ-accordion is genoeg om te weten dat de site dat patroon kent.
 */
export function aggregateTemplateProfile(pages: PageTemplateSignals[]): SiteTemplateProfile {
  if (pages.length === 0) {
    return { cms: "onbekend", heeftFaqAccordion: false, heeftCitaatblok: false, headingNiveaus: 0, pagesAnalysed: 0 };
  }

  const stemmen = new Map<CmsHint, number>();
  for (const p of pages) {
    if (p.cms === "onbekend") continue;
    stemmen.set(p.cms, (stemmen.get(p.cms) ?? 0) + 1);
  }
  let cms: CmsHint = "onbekend";
  let hoogsteAantal = 0;
  for (const [kandidaat, aantal] of stemmen) {
    if (aantal > hoogsteAantal) {
      cms = kandidaat;
      hoogsteAantal = aantal;
    }
  }

  return {
    cms,
    heeftFaqAccordion: pages.some((p) => p.heeftFaqAccordion),
    heeftCitaatblok: pages.some((p) => p.heeftCitaatblok),
    headingNiveaus: Math.max(0, ...pages.map((p) => p.headingNiveaus)),
    pagesAnalysed: pages.length,
  };
}

/** Leesbare samenvatting voor het profielscherm, zelfde stijl als `beschrijf()` in discover.ts. */
export function templateSummary(p: SiteTemplateProfile): string {
  if (p.pagesAnalysed === 0) return "Nog geen pagina's geanalyseerd op sjabloon.";

  const delen: string[] = [
    p.cms === "onbekend" ? "geen bekend CMS herkend" : `draait op ${CMS_LABEL[p.cms]}`,
    p.heeftFaqAccordion ? "gebruikt uitklapbare FAQ-blokken" : "geen FAQ-accordion gevonden",
  ];
  if (p.heeftCitaatblok) delen.push("gebruikt citaatblokken");
  delen.push(`${p.headingNiveaus} kopniveau${p.headingNiveaus === 1 ? "" : "s"} in gebruik`);

  return `${delen.join(", ")}.`;
}
