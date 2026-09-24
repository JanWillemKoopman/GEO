/**
 * De URL-rekenkunde van de crawler, los van het netwerk.
 *
 * ── WAAROM DIT EEN EIGEN BESTAND IS ─────────────────────────────────────────
 *
 * Deze functies stonden in `lib/crawler.ts`, en die begint met
 * `import "server-only"`. Daardoor kon `scripts/test-unit.ts` er niet bij, en
 * dus had geen enkele van deze regels een test. Precies de valkuil die het
 * commentaar bij `isProductSitemap` zelf benoemt ("maar niet
 * product-category-sitemap.xml") was onbewaakt.
 *
 * Conventie 2: rekenkunde hoort in een pure module zonder `server-only`.
 * `crawler.ts` importeert alles hieronder en houdt zelf alleen het fetchen over.
 */

/** Zet een hostnaam (mediamarkt.nl) om naar een op te halen URL. */
export function toFetchUrl(host: string): string {
  return host.startsWith("http") ? host : `https://${host}`;
}

/** Zelfde domein (host, zonder www.) als de basis-URL? */
export function sameDomain(candidate: string, baseHost: string): boolean {
  try {
    const host = new URL(candidate).hostname.replace(/^www\./, "");
    return host === baseHost.replace(/^www\./, "");
  } catch {
    return false;
  }
}

/**
 * Is dit een webshop-PRODUCTpagina? Die willen we uitsluiten, een grote webshop
 * heeft er duizenden en ze zijn geen zinvolle GEO-content-doelen. We houden het
 * bewust strak op `/product/` en `/products/` (WooCommerce, Shopify): daarmee
 * blijven categorie-/`collections`- en `product-category`-pagina's WÉL behouden
 * (die zijn juist waardevol).
 */
export function isProductUrl(url: string): boolean {
  return /\/products?\//i.test(url);
}

/**
 * Is dit een sitemap die (bijna) alleen productpagina's bevat? Die slaan we in
 * z'n geheel over, scheelt vaak duizenden URL's in één keer. Matcht o.a.
 * Shopify (`sitemap_products_1.xml`) en Yoast/WooCommerce (`product-sitemap.xml`),
 * maar niet `product-category-sitemap.xml` (daar volgt na "product-" geen sitemap/cijfer).
 */
/**
 * Een sitemap met alleen archieven: categorieën, tags, auteurs, bijlagen. Yoast
 * maakt ze standaard aan; bij de hovenier waren het drie van de vijf sitemaps
 * (punt 10 van de kwaliteitsdoorlichting). Overslaan scheelt fetches en plekken.
 */
export function isArchiefSitemap(url: string): boolean {
  return /(^|\/)(category|post_tag|tag|author|attachment|post_format|format)-sitemap\d*\.xml/i.test(url);
}

export function isProductSitemap(url: string): boolean {
  return /products?[-_](sitemap|\d)/i.test(url) || /sitemap[-_]products?/i.test(url);
}

/**
 * Hoeveel pagina's de volgende batch tegelijk vraagt.
 *
 * Een time-out in een batch betekent bijna altijd een server die verzoeken na
 * elkaar afhandelt: acht tegelijk wachten dan allemaal op elkaar. Halveren, met
 * twee als ondergrens (punt 4 van de kwaliteitsdoorlichting: de hovenier deed
 * over één pagina 4 seconden en over acht tegelijk 30). Zonder time-outs blijft
 * het tempo gelijk; terug omhoog gaat het niet, een trage server wordt binnen
 * één crawl niet snel.
 */
export function volgendeBatchgrootte(huidig: number, timeouts: number): number {
  return timeouts > 0 ? Math.max(2, Math.floor(huidig / 2)) : huidig;
}

/**
 * Is dit een archief-, bijlage- of bestandsadres en geen echte pagina?
 *
 * ⚠️ Kwaliteitsdoorlichting 24 september 2026, punt 10 en 28. Van de 108 adressen
 * die de app van de rijschool kende, waren er tientallen WordPress-bijlagen
 * (`/autorijschool-pompert/cbr-peter-pompert-2/`,
 * `/ons-team-en-wagenpark/whatsapp-image-2022-06-21-at-4-42-28-pm/`), tag-,
 * categorie- en auteurspagina's. Ze aten plekken van de 150 op, en het rapport
 * adviseerde een fotobijlage te "verbeteren" met uitleg over het faalangstexamen.
 *
 * Op het adres alleen, dus vóór het ophalen: een archiefpagina kost anders een
 * plek én een fetch. Bijlagen die hier doorheen glippen (een foto die
 * "verkeersangst" heet) vangt `lijktBijlagepagina()` na het ophalen.
 */
export function isArchiefOfBijlage(url: string): boolean {
  const pad = pathOf(url).toLowerCase();
  if (/\/(tag|tags|category|categorie|author|auteur|attachment|feed|comments)(\/|$)/.test(pad)) return true;
  if (/\/page\/\d+\/?$/.test(pad)) return true;
  if (/^\/wp-(content|json|admin|includes)\//.test(pad)) return true;
  if (/\.(jpe?g|png|gif|webp|svg|pdf|docx?|xlsx?|zip|mp4|mp3|woff2?|ico|webmanifest|xml|css|js)$/.test(pad)) {
    return true;
  }
  const segmenten = segmentsOf(url);
  if (segmenten.length < 2) return false;
  const laatste = segmenten[segmenten.length - 1].toLowerCase();
  // Bestandsnamen van foto's, zoals een CMS ze als bijlagepagina onder een
  // bericht hangt. Alleen onder een ouderpagina: `/foto-galerij/` op het
  // hoogste niveau is een echte pagina.
  return (
    /^(img|dsc|dscn|dcim|image|whatsapp-image|screenshot|schermafbeelding|pexels-photo|photo|foto)([-_]|\d|$)/.test(laatste) ||
    /_\d+(-\d+)?$/.test(laatste) ||
    /^\d{6,}_/.test(laatste)
  );
}

/**
 * Is deze opgehaalde HTML een bijlagepagina? WordPress zet dat in de klassen van
 * `<body>` (`single-attachment`, `attachmentid-534`), en dat is betrouwbaarder
 * dan elke gok op de tekst: een echte korte pagina en een fotobijlage zijn na
 * het wegknippen van het menu even kort. Gecontroleerd op de rijschool
 * (`/alles-over-verkeersangst/verkeersangst/`, een foto die geen
 * bestandsnaam draagt, punt 10 van de kwaliteitsdoorlichting).
 */
export function isBijlageHtml(html: string): boolean {
  const body = html.match(/<body\b[^>]*>/i)?.[0] ?? "";
  return /class=["'][^"']*\b(single-attachment|attachmentid-\d+)\b/i.test(body);
}

/** Decodeert de paar XML-entiteiten die in sitemap-<loc>-URL's voorkomen. */
export function decodeXmlEntities(s: string): string {
  return s.replace(/&amp;/gi, "&").replace(/&#38;/g, "&");
}

export function extractLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => decodeXmlEntities(m[1]));
}

/** Een <sitemapindex> wijst naar andere sitemaps; een <urlset> bevat pagina's. */
export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

/**
 * Het pad van een URL, of de URL zelf als hij onparseerbaar is.
 *
 * Gedeeld door `url-priority.ts` en `inventory-quality.ts`: die vielen allebei
 * terug op hun eigen kopie van deze vier regels, en twee kopieën van dezelfde
 * afhandeling lopen uit elkaar zodra er één wordt aangepast.
 */
export function pathOf(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
  } catch {
    return url;
  }
}

/** De padsegmenten zonder lege delen: "/diensten/massage/" → ["diensten", "massage"]. */
export function segmentsOf(url: string): string[] {
  return pathOf(url).split("/").filter(Boolean);
}

/**
 * De sectie waar een URL in valt: het eerste padsegment, of "/" voor de
 * wortelpagina's. Dit is de eenheid waarop de crawl zijn plekken verdeelt en
 * waarop `buildTaxonomy()` groepeert; beide moeten dezelfde grens hanteren,
 * anders verdeelt de crawl over andere hokjes dan het model te zien krijgt.
 */
export function sectionOf(url: string): string {
  const segments = segmentsOf(url);
  return segments.length === 0 ? "/" : `/${segments[0]}`;
}

/**
 * De sleutel waarop twee URL's dezelfde pagina zijn.
 *
 * ── WAAROM DIT NODIG IS ─────────────────────────────────────────────────────
 *
 * De sitemap van udenhout.nl bevat zowel `https://udenhout.nl` als
 * `https://udenhout.nl/`. Dat is één pagina, en zonder deze sleutel kost hij
 * twee plekken van de 150, wordt hij twee keer opgehaald en staat hij twee keer
 * in de prompt van de aanbodboom. Bij de vier Engelstalige duplicaten van de
 * Coolblue-homepage was precies dát het probleem (`docs/logbook.md`).
 *
 * Bewust NIET de query weglaten: `?categorie=ketels` is bij veel sites een
 * echte, andere pagina. Alleen wat aantoonbaar hetzelfde adres is, valt samen.
 */
export function canonicalKey(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const pad = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${pad}${u.search}`;
  } catch {
    return url;
  }
}

/** Eén afgekeurde regel uit een geplakte lijst, met de reden in gewone taal. */
export interface RejectedUrl {
  value: string;
  reason: string;
}

export interface ParsedUrlList {
  urls: string[];
  rejected: RejectedUrl[];
}

/**
 * Leest een geplakte lijst adressen uit: één per regel, komma's of spaties
 * ertussen mag ook.
 *
 * ── WAAROM DIT NIET IN DE ROUTE STAAT ───────────────────────────────────────
 *
 * Het is precies het soort werk dat er simpel uitziet en dat stil verkeerd
 * gaat: een geplakte lijst uit een spreadsheet heeft aanhalingstekens, een
 * lijst uit een e-mail heeft opsommingstekens, en een consultant die haast
 * heeft plakt een adres zonder `https://`. Puur, dus getest (conventie 2).
 *
 * ── EN WAAROM AFGEKEURDE REGELS TERUGKOMEN ──────────────────────────────────
 *
 * Conventie 3, in de gebruikersvorm: vijftien van de zestien adressen
 * toevoegen en over de zestiende zwijgen is erger dan niets toevoegen. Dan
 * denkt de consultant dat de pagina erin zit.
 *
 * @param baseHost De host van het merk. Adressen op een ander domein worden
 *   afgekeurd: de aanbodboom eist een citaat van de site van de klant zelf, dus
 *   een pagina van een ander domein zou toch nooit een knoop kunnen dragen.
 */
export function parseUrlList(raw: string, baseHost: string, max = 100): ParsedUrlList {
  const urls: string[] = [];
  const rejected: RejectedUrl[] = [];
  const gezien = new Set<string>();

  const regels = raw
    .split(/[\s,;]+/)
    .map((r) => r.trim().replace(/^["'<([]+|["'>)\].,]+$/g, ""))
    // Opsommingstekens uit een e-mail of document.
    .map((r) => r.replace(/^[-*•·]+\s*/, ""))
    .filter(Boolean);

  for (const regel of regels) {
    if (urls.length >= max) {
      rejected.push({ value: regel, reason: `Meer dan ${max} adressen in één keer gaat niet.` });
      continue;
    }

    let genormaliseerd: string;
    try {
      const u = new URL(regel.startsWith("http") ? regel : `https://${regel}`);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        rejected.push({ value: regel, reason: "Alleen http- en https-adressen." });
        continue;
      }
      // ⚠️ `new URL("https://dit")` slaagt: een hostnaam zonder punt is geldig
      // voor de constructor. Zonder deze controle wordt elk los woord uit een
      // geplakte zin afgekeurd met "staat niet op dat domein", en dat is de
      // verkeerde uitleg: het is helemaal geen adres.
      if (!u.hostname.includes(".")) {
        rejected.push({ value: regel, reason: "Dit is geen webadres." });
        continue;
      }
      u.hash = "";
      genormaliseerd = u.toString();
    } catch {
      rejected.push({ value: regel, reason: "Dit is geen webadres." });
      continue;
    }

    if (!sameDomain(genormaliseerd, baseHost)) {
      rejected.push({ value: regel, reason: `Staat niet op ${baseHost.replace(/^www\./, "")}.` });
      continue;
    }
    if (gezien.has(genormaliseerd)) continue;

    gezien.add(genormaliseerd);
    urls.push(genormaliseerd);
  }

  return { urls, rejected };
}

/** Alle zelfde-domein-links uit één stuk HTML, absoluut gemaakt. */
export function linksIn(html: string, base: string, baseHost: string): string[] {
  return Array.from(html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi))
    .map((m) => {
      try {
        return new URL(m[1], base).toString();
      } catch {
        return null;
      }
    })
    .filter(
      (u): u is string =>
        u !== null && sameDomain(u, baseHost) && !isProductUrl(u) && !isArchiefOfBijlage(u),
    );
}

/**
 * De links uit het menu van een pagina: binnen `<nav>` en `<header>`, plus de
 * menu-items van WordPress (`<li class="menu-item ...">`). Die tweede vorm is
 * geen luxe: bij de rijschool stond het hoofdmenu met de faalangstpagina in
 * zulke items buiten elke `<nav>` (punt 28 van de kwaliteitsdoorlichting).
 * Heeft de pagina geen van drieën, dan alle links, want dan is er geen
 * onderscheid te maken en is "alles op de homepage" de beste benadering.
 */
export function menuLinks(html: string, base: string, baseHost: string): string[] {
  const blokken = Array.from(html.matchAll(/<(nav|header)\b[^>]*>([\s\S]*?)<\/\1>/gi)).map((m) => m[2]);
  const menuItems = Array.from(
    html.matchAll(/<li\b[^>]*class=["'][^"']*\bmenu-item\b[^"']*["'][^>]*>\s*(<a\s[^>]*>)/gi),
  ).map((m) => m[1]);
  const delen = [...blokken, ...menuItems];
  const bron = delen.length > 0 ? delen.join("\n") : html;
  const uit = new Map<string, string>();
  for (const u of linksIn(bron, base, baseHost)) {
    const sleutel = canonicalKey(u);
    if (!uit.has(sleutel)) uit.set(sleutel, u);
  }
  return [...uit.values()];
}
