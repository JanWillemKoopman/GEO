import "server-only";

/**
 * Eigen crawler (abcplan.md §2/§6 A1): haalt de klant-website op met een simpele
 * fetch en zet de HTML om naar schone platte tekst. Géén API-kosten. Dit is
 * bewust Node.js-werk, geen OpenAI-tool. De tekst wordt als context meegegeven
 * aan de profiel-/onderwerp-onderzoekscalls.
 */

// T8.5, herstelplan na audit: verplaatst naar een pure module zonder
// `server-only` (conventie 2), zodat de entiteitdecodering testbaar is vanuit
// scripts/test-unit.ts. Her-exporteren zodat bestaande imports vanuit
// "@/lib/crawler" blijven werken.
import { htmlToText } from "@/lib/pipeline/html-text";
export { htmlToText };
import { stripChrome } from "@/lib/pipeline/page-text";
import {
  harvestStructuredData,
  assessRendering,
  type StructuredHarvest,
  type RenderAssessment,
} from "@/lib/pipeline/structured-data";
import { harvestTextFacts } from "@/lib/pipeline/text-facts";
import type { HarvestedFact } from "@/lib/pipeline/structured-data";
import { detectPageTemplate, type PageTemplateSignals } from "@/lib/pipeline/template-detect";
import {
  decodeXmlEntities,
  extractLocs,
  isProductSitemap,
  isProductUrl,
  isSitemapIndex,
  sameDomain,
  toFetchUrl,
} from "@/lib/crawl-urls";
import { scoreUrl, selectUrls, type UrlSelection } from "@/lib/pipeline/url-priority";
import { speedProfile, nextDelayMs, slowerThan, type CrawlSpeed } from "@/lib/crawl-speed";

export { decodeXmlEntities, extractLocs, isProductSitemap, isProductUrl, isSitemapIndex, sameDomain };

/** Eén plek voor de bot-identiteit, zodat een site ons kan herkennen en toelaten. */
export const USER_AGENT = "GEO-Tracker-Bot/1.0 (+https://geo-tracker.app)";

/**
 * Alleen voor `crawl_as_browser` (§17.3, migratie 0080): een klant kan
 * toestemming geven om zíjn EIGEN site als gewone browser te lezen, als zijn
 * firewall het bot-verkeer anders weert. Dit is geen vermomming om een
 * blokkade te omzeilen bij een site die niet van de klant is; die knop bestaat
 * bewust niet.
 */
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/**
 * Eén gedeelde headerset (§17.6, punt 2), zodat die niet op drie plekken los
 * wordt opgebouwd. Een volledige, kloppende set (`Accept-Language`,
 * `Accept-Encoding`) is onderdeel van "je gedragen als een nette bezoeker"
 * (§17.3); dat is iets anders dan verbergen wie we zijn, de `User-Agent`
 * blijft zichzelf identificeren tenzij `asBrowser` expliciet aan staat.
 */
export function requestHeaders(opts: { asBrowser?: boolean; referer?: string } = {}): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent": opts.asBrowser ? BROWSER_USER_AGENT : USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
  };
  if (opts.referer) headers.Referer = opts.referer;
  return headers;
}

const MAX_CHARS = 6000; // genoeg context, houdt de tokenkost laag
/**
 * Hoeveel tekst we per pagina bewaren bij de content-inventaris.
 *
 * ⚠️ Stond op 1500, en dat was bij een site met een groot menu precies het menu.
 * Gemeten op Gasservice Brabant (1 september 2026): 139 van de 148 opgeslagen
 * pagina's liepen tegen die grens aan terwijl het navigatiemenu er nog twee keer
 * in stond, dus de app had van 94% van de site alleen het menu. De pagina met
 * "maximaal €6000" leverde daardoor geen enkel bedrag op de feitenkaart.
 *
 * Twee dingen veranderd, in deze volgorde: het menu gaat er eerst uit
 * (`stripChrome`), en pas daarna knippen we, nu op 4000 tekens. De atomisering
 * stuurt er hoe dan ook maar 1500 naar het model (`fact-atomise.ts`), dus dit
 * kost geen extra tokens; het bepaalt alleen WELKE 1500 dat zijn. De rest is
 * voor de schrijver, die bij "verbeteren" de bestaande pagina meekrijgt.
 */
const PAGE_MAX_CHARS = 4000;
const FETCH_TIMEOUT_MS = 12000;
/** Korter dan een gewone fetch: dit blokkeert een formulier, dus snel antwoord telt. */
const REACHABLE_TIMEOUT_MS = 6000;

// ── Content-inventaris (abcplan.md §12.23) ─────────────────────────────────
// We ontdekken WELKE pagina's er bestaan (URL-lijst via sitemaps) en halen voor
// die pagina's titel + tekst op. Het aantal pagina's is per profiel instelbaar
// (max_inventory_pages), begrensd door een harde bovengrens om de 60s-route te
// beschermen. Het crawlen zelf is API-gratis (eigen server, geen OpenAI).
export const DEFAULT_MAX_PAGES = 60; // fallback als een profiel (nog) geen instelling heeft
export const MAX_PAGES_HARD_CAP = 150; // absolute bovengrens (timeout-bescherming)
const CRAWL_BATCH_SIZE = 8; // parallelle fetches per batch (niet alles tegelijk)
const MAX_SITEMAPS = 50; // recursie-plafond bij sitemap-index'en
/** Parallelle sitemap-fetches per ronde. Zelfde reden als CRAWL_BATCH_SIZE. */
const SITEMAP_BATCH_SIZE = 8;

/**
 * Hoeveel URL's we in de index vasthouden vóór het kiezen.
 *
 * ⚠️ Dit is NIET het crawlplafond. We LEZEN de sitemaps nu volledig uit, ook bij
 * 8.000 pagina's, want alleen dan weten we hoe groot de site werkelijk is en
 * kunnen we de 150 plekken eerlijk over de secties verdelen. Alleen de URL-tekst
 * wordt vastgehouden, geen HTML: 10.000 URL's is ongeveer een halve megabyte, en
 * die is na het kiezen weer weg.
 */
const MAX_INDEXED_URLS = 10_000;

/** Hoeveel pagina's we bij de link-fallback openen om dieper te kijken. */
const LINK_FALLBACK_SEEDS = 10;

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]).trim() || null : null;
}

export interface CrawlResult {
  url: string;
  text: string;
  ok: boolean;
}

/**
 * Haalt de homepage op en extraheert de tekst. Faalt zacht: bij een fout geven
 * we een lege tekst terug zodat de Brand-DNA-call alsnog kan draaien op alleen
 * de web_search-context (de call krijgt dan minder, maar niet niets).
 */
export async function crawlSite(host: string): Promise<CrawlResult> {
  const url = toFetchUrl(host);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { url, text: "", ok: false };
    const html = await res.text();
    const text = htmlToText(html).slice(0, MAX_CHARS);
    return { url, text, ok: text.length > 0 };
  } catch {
    return { url, text: "", ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Snelle bereikbaarheidscontrole vóór het aanmaken van een profiel
 * (optimalisatie.md 0.12). Bewust apart van crawlSite: die haalt de hele pagina
 * op en faalt zacht, terwijl we hier binnen een paar seconden een ja of nee willen
 * kunnen tonen op het formulier.
 *
 * Eerst HEAD (geen body downloaden), en bij een methode-fout alsnog GET,
 * niet elke server accepteert HEAD. Elke 2xx/3xx telt als bereikbaar; een 403
 * ook, want dat betekent "de server is er, maar weert onze bot" en dat is geen
 * reden om de klant tegen te houden.
 */
export async function isReachable(host: string): Promise<boolean> {
  const url = toFetchUrl(host);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REACHABLE_TIMEOUT_MS);

  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml",
  };

  try {
    let res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow", headers });
    // 405/501: server kent HEAD niet, nog één keer met GET.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", signal: controller.signal, redirect: "follow", headers });
    }
    return res.status < 400 || res.status === 403;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml,text/xml",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verzamelt ALLE pagina-URL's uit de sitemap(s): vindt de ingang(en) via een
 * door de klant opgegeven sitemap-URL (indien aanwezig, met voorrang),
 * robots.txt (Sitemap:-regels) plus de standaardlocaties, en volgt
 * sitemap-index'en recursief. Product-sitemaps en losse product-URL's worden
 * overgeslagen. Alleen zelfde domein, gededupliceerd.
 *
 * ── WAAROM HIER NIET MEER AFGEKAPT WORDT (22 augustus 2026) ─────────────────
 *
 * Deze functie stopte zodra hij `maxPages` URL's had en gaf `slice(0, maxPages)`
 * terug: de eerste 150 in sitemapvolgorde. Bij Yoast staat `post-sitemap.xml`
 * vóór `page-sitemap.xml`, dus een site met 2.000 blogartikelen leverde 150
 * blogartikelen op en geen enkele dienstenpagina. Het kiezen gebeurt nu in
 * `url-priority.ts`, ná het volledig uitlezen, en dat kan alleen als hier alles
 * langskomt.
 *
 * ── EN WAAROM PARALLEL ──────────────────────────────────────────────────────
 *
 * Volledig uitlezen betekent meer sitemaps ophalen, en die gingen één voor één
 * met een time-out van 12 seconden. Vijftig trage sitemaps zijn dan tien
 * minuten, tegen een taakreservering van 220 seconden (`lib/jobs/worker.ts`).
 * In rondes van acht is dat ruim een factor acht sneller, en het is dezelfde
 * aanpak die `crawlPages` al voor de pagina's zelf gebruikte.
 */
async function collectSitemapPageUrls(
  base: string,
  baseHost: string,
  sitemapUrl?: string | null,
): Promise<string[]> {
  const entryPoints: string[] = [];
  // Door de klant opgegeven sitemap krijgt voorrang (staat vooraan in de queue).
  if (sitemapUrl && sitemapUrl.trim()) entryPoints.push(sitemapUrl.trim());

  const robots = await fetchText(`${base}/robots.txt`);
  if (robots) {
    for (const m of robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)) entryPoints.push(m[1].trim());
  }
  entryPoints.push(`${base}/sitemap.xml`, `${base}/sitemap_index.xml`);

  let queue = Array.from(new Set(entryPoints)).filter((u) => !isProductSitemap(u));
  const seen = new Set<string>();
  const pageUrls = new Set<string>();
  let fetched = 0;

  while (queue.length > 0 && fetched < MAX_SITEMAPS && pageUrls.size < MAX_INDEXED_URLS) {
    const ronde = queue.slice(0, SITEMAP_BATCH_SIZE).filter((sm) => !seen.has(sm));
    queue = queue.slice(SITEMAP_BATCH_SIZE);
    if (ronde.length === 0) continue;
    for (const sm of ronde) seen.add(sm);

    const xmls = await Promise.all(ronde.map((sm) => fetchText(sm)));
    fetched += ronde.length;

    for (const xml of xmls) {
      if (!xml) continue;
      const locs = extractLocs(xml);
      if (isSitemapIndex(xml)) {
        for (const loc of locs) {
          if (!seen.has(loc) && !isProductSitemap(loc)) queue.push(loc);
        }
      } else {
        for (const loc of locs) {
          if (pageUrls.size >= MAX_INDEXED_URLS) break;
          if (sameDomain(loc, baseHost) && !isProductUrl(loc)) pageUrls.add(loc);
        }
      }
    }
  }

  return Array.from(pageUrls);
}

/** Alle zelfde-domein-links uit één stuk HTML, absoluut gemaakt. */
function linksIn(html: string, base: string, baseHost: string): string[] {
  return Array.from(html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi))
    .map((m) => {
      try {
        return new URL(m[1], base).toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => u !== null && sameDomain(u, baseHost) && !isProductUrl(u));
}

/**
 * Geen bruikbare sitemap? Dan links volgen, en twee niveaus diep in plaats van
 * één.
 *
 * Eén niveau leverde alleen wat er in het hoofdmenu staat. Bij een site waar de
 * diensten achter een overzichtspagina hangen (`/diensten` → de losse diensten)
 * is dat precies één pagina te ondiep: je vindt de ingang wel, maar geen van de
 * diensten erachter. De tien best scorende pagina's van niveau 1 worden daarom
 * geopend om ook hún links op te halen.
 */
async function discoverByLinks(base: string, baseHost: string): Promise<string[]> {
  const html = await fetchText(base);
  if (!html) return [base];

  const niveau1 = Array.from(new Set([base, ...linksIn(html, base, baseHost)]));
  if (niveau1.length <= 1) return niveau1;

  // Alleen de kansrijkste pagina's openen: dit kost per stuk een echte fetch.
  const zaden = niveau1
    .filter((u) => u !== base)
    .sort((a, b) => scoreUrl(b) - scoreUrl(a) || a.localeCompare(b))
    .slice(0, LINK_FALLBACK_SEEDS);

  const pagina2 = await Promise.all(zaden.map((u) => fetchText(u)));
  const alles = new Set(niveau1);
  for (let i = 0; i < zaden.length; i++) {
    const h = pagina2[i];
    if (!h) continue;
    for (const u of linksIn(h, zaden[i], baseHost)) {
      if (alles.size >= MAX_INDEXED_URLS) break;
      alles.add(u);
    }
  }
  return Array.from(alles);
}

/**
 * Ontdekt zo compleet mogelijk welke pagina's er op de site staan (content-
 * inventaris, abcplan.md §12.23) en kiest daaruit de `maxPages` die het meeste
 * over het aanbod zeggen. Productpagina's uitgesloten.
 *
 * Geeft naast de gekozen URL's ook terug hoeveel er te kiezen waren, want dat
 * cijfer werd nergens bewaard en zonder dat cijfer is "de site is te groot" niet
 * van "de site is klein" te onderscheiden.
 */
export async function discoverPageIndex(
  host: string,
  maxPages = DEFAULT_MAX_PAGES,
  sitemapUrl?: string | null,
  priorityPaths: readonly string[] = [],
): Promise<UrlSelection & { source: UrlSource }> {
  const { urls, source } = await collectPageUrls(host, sitemapUrl);
  return { ...selectUrls(urls, maxPages, priorityPaths), source };
}

export type UrlSource = "sitemap" | "links";

/**
 * Alle pagina-URL's die de site prijsgeeft, zónder te kiezen.
 *
 * Apart van `discoverPageIndex` omdat fase 0 ertussen moet kunnen: die bouwt uit
 * deze volledige lijst eerst de sectie-indeling, laat die zo nodig door een
 * model wegen (`crawl-focus.ts`) en kiest pas daarna. Zou het kiezen hier al
 * gebeuren, dan zou dat oordeel over een al afgekapte lijst gaan en dus precies
 * de secties missen die het moest redden.
 */
export async function collectPageUrls(
  host: string,
  sitemapUrl?: string | null,
): Promise<{ urls: string[]; source: UrlSource }> {
  const base = toFetchUrl(host);
  const baseHost = new URL(base).hostname;

  const sitemapUrls = await collectSitemapPageUrls(base, baseHost, sitemapUrl);
  if (sitemapUrls.length > 0) return { urls: sitemapUrls, source: "sitemap" };

  return { urls: await discoverByLinks(base, baseHost), source: "links" };
}

/** Alleen de gekozen URL's. Voor aanroepers die de dekkingscijfers niet nodig hebben. */
export async function discoverPageUrls(
  host: string,
  maxPages = DEFAULT_MAX_PAGES,
  sitemapUrl?: string | null,
  priorityPaths: readonly string[] = [],
): Promise<string[]> {
  const index = await discoverPageIndex(host, maxPages, sitemapUrl, priorityPaths);
  return index.urls;
}

export interface CrawledPage {
  url: string;
  title: string | null;
  text: string;
  /**
   * Wat er aan gestructureerde data op deze pagina stond (fase 0 van de
   * onboarding). Alleen gevuld als `crawlPages` met `harvest: true` draait.
   *
   * Bewust HIER berekend en niet later uit bewaarde HTML: 150 pagina's ruwe
   * HTML vasthouden is tientallen megabytes voor gegevens waarvan we maar een
   * handvol regels nodig hebben. De HTML wordt gelezen, uitgekamd en meteen
   * losgelaten.
   */
  harvest?: StructuredHarvest;
  rendering?: RenderAssessment;
  /**
   * Telefoon, adres, e-mail en KvK uit de LOPENDE TEKST (`text-facts.ts`).
   *
   * ⚠️ Hier berekend en niet in `discover.ts`, om dezelfde reden als
   * `rendering`: `text` hierboven is afgekapt op PAGE_MAX_CHARS (1500), en bij
   * Fysi-Unique zit het telefoonnummer op de contactpagina ná die grens, de
   * pagina begint met een navigatiemenu van ruim duizend tekens. Op de afgekapte
   * tekst oogsten leverde alleen het e-mailadres op, terwijl telefoonnummer én
   * adres er gewoon staan. Gemeten op 4 augustus 2026, tweede poging.
   */
  textFacts?: HarvestedFact[];
  /**
   * Hoe deze pagina technisch is opgebouwd: welk CMS, of er FAQ-accordions of
   * citaatblokken zijn (`template-detect.ts`). Zelfde reden als bij `harvest`
   * hierboven, alleen op de RUWE HTML te herkennen, en die wordt na deze batch
   * meteen losgelaten.
   */
  template?: PageTemplateSignals;
}

export interface CrawlPagesOptions {
  /** Gestructureerde data en renderbaarheid meenemen (fase 0). Kost geen netwerk. */
  harvest?: boolean;
  /**
   * De VOLLEDIGE tekst teruggeven, ongeknipt en ongeschoond.
   *
   * Voor de bronverificatie van de algemene uitleg (`explainer-verify.ts`): daar
   * zoeken we een letterlijk citaat terug, en dat kan overal op de pagina staan.
   * Met de standaardgrens van 1500 tekens keurde die controle op 1 september
   * 2026 18 van de 35 uitleggen af, terwijl er minstens één bij zat waarvan het
   * citaat gewoon klopte: het stond op teken 10.696 van 21.141.
   *
   * Ongeschoond, en dat is bewust: het menu wegknippen maakt de tekst leesbaarder
   * maar kan in het slechtste geval net het stuk raken waar het citaat staat. Bij
   * zoeken telt volledigheid, bij bewaren leesbaarheid.
   */
  fullText?: boolean;
}

/**
 * Haalt meerdere pagina's op in batches (niet alles tegelijk, voorkomt dat we
 * een site platleggen of de 60s-route overschrijden). Faalt per pagina zacht.
 */
export async function crawlPages(
  urls: string[],
  opts: CrawlPagesOptions = {},
): Promise<CrawledPage[]> {
  const out: CrawledPage[] = [];
  for (let i = 0; i < urls.length; i += CRAWL_BATCH_SIZE) {
    const batch = urls.slice(i, i + CRAWL_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (url): Promise<CrawledPage | null> => {
        const html = await fetchText(url);
        if (!html) return null;
        const volledigeTekst = htmlToText(html);
        // Wat we BEWAREN is de tekst zonder menu, koptekst en voettekst; wat we
        // METEN (renderbaarheid, telefoonnummers) blijft de volledige tekst,
        // anders verschuift de drempel van 600 tekens onder ons vandaan.
        const inhoudTekst = htmlToText(stripChrome(html));
        const page: CrawledPage = {
          url,
          title: extractTitle(html),
          text: opts.fullText ? volledigeTekst : inhoudTekst.slice(0, PAGE_MAX_CHARS),
        };
        if (opts.harvest) {
          page.harvest = harvestStructuredData(html);
          // Op de VOLLEDIGE tekst, niet op de afgekapte: PAGE_MAX_CHARS is 1500
          // en de drempel voor "verdacht weinig tekst" ligt op 600. Meten op de
          // afgekapte tekst zou elke lange pagina op precies 1500 zetten en de
          // verhouding met de scriptomvang zinloos maken.
          page.rendering = assessRendering(html, volledigeTekst.length);
          // Ook op de volledige tekst, zie de toelichting bij `textFacts`.
          page.textFacts = harvestTextFacts([{ url, text: volledigeTekst }]);
          // Op de RUWE HTML: het CMS en accordion-patronen zitten in tags en
          // classnamen, niet in de platte tekst.
          page.template = detectPageTemplate(html);
        }
        return page;
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value && r.value.text.length > 0) out.push(r.value);
    }
  }
  return out;
}

export interface InventoryPage {
  url: string;
  title: string | null;
  text: string | null;
}

/** Absolute bovengrens voor een crawl die als achtergrondtaak draait (§17.7), ruimer dan `MAX_PAGES_HARD_CAP`. */
export const MAX_PAGES_BACKGROUND = 500;

export interface InventoryOptions {
  /** Max aantal pagina's in de inventaris (per profiel instelbaar). */
  maxPages?: number;
  /** Door de klant opgegeven sitemap-URL (voorrang boven auto-detectie). */
  sitemapUrl?: string | null;
  /** Sitesecties die voorrang krijgen bij het verdelen van de plekken. */
  priorityPaths?: readonly string[];
  /** Hoe hard er gecrawld wordt (§17.2). Standaard `normaal`. */
  speed?: CrawlSpeed;
  /** URL's die al in de inventaris staan (modus "meer", §17.8): niet opnieuw kiezen of ophalen. */
  exclude?: readonly string[];
  /** Alleen met toestemming van de klant, voor zijn EIGEN domein (§17.3). */
  asBrowser?: boolean;
  /**
   * Hoeveel wandkloktijd deze aanroep zichzelf gunt, in milliseconden. Een
   * achtergrondtaak geeft hier haar resterende werkbudget mee, zodat een grote
   * "langzaam"-crawl zichzelf op tijd afbreekt in plaats van de platformlimiet
   * van 300 seconden te raken (§17.7). Onbeperkt als niet meegegeven, voor de
   * bestaande synchrone aanroepers die al binnen 150 pagina's blijven.
   */
  budgetMs?: number;
}

export interface InventoryResult {
  pages: InventoryPage[];
  /** Hoeveel URL's er te kiezen waren. Groter dan `pages.length` = afgekapt. */
  totalFound: number;
  truncated: boolean;
  /** Kwam er een 403 voorbij? Dan is gestopt in plaats van doorgegaan met lege pagina's. */
  blocked: boolean;
  /** De stand waarmee daadwerkelijk gecrawld is (kan door een 429/503 een stand lager zijn dan gevraagd). */
  usedSpeed: CrawlSpeed;
  /**
   * Geselecteerde URL's die niet meer aan de beurt kwamen: door een 403, of
   * omdat `budgetMs` op was. Leeg = de ronde is volledig afgerond. Een
   * achtergrondtaak plant zichzelf hiermee opnieuw in (§17.7).
   */
  remaining: string[];
}

/** Eén batch ophalen met de headers en de status van de speed-aware crawl, i.p.v. `fetchText()`'s "null bij elke fout". */
async function fetchPageStatus(
  url: string,
  timeoutMs: number,
  opts: { asBrowser?: boolean; referer?: string },
): Promise<{ status: number; retryAfterMs: number | null; html: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: requestHeaders(opts),
    });
    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader && /^\d+$/.test(retryAfterHeader)
      ? Number(retryAfterHeader) * 1000
      : null;
    if (!res.ok) return { status: res.status, retryAfterMs, html: null };
    return { status: res.status, retryAfterMs, html: await res.text() };
  } catch {
    // Time-out of netwerkfout: geen HTTP-status om op te reageren, behandeld
    // als een gewone mislukte pagina, niet als een blokkade.
    return { status: 0, retryAfterMs: null, html: null };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Bouwt de content-inventaris van een site: ontdekt de (niet-product) pagina-URL's
 * en haalt daarvan titel + tekst op, tot `maxPages` (begrensd door de harde
 * bovengrens, of door `MAX_PAGES_BACKGROUND` als `budgetMs` is meegegeven).
 * Een pagina waarvan de fetch faalt komt met titel/tekst = null in de lijst,
 * zodat de URL-lijst niettemin de gevonden pagina's weerspiegelt.
 *
 * ── HET TEMPO EN DE TERUGVAL (§17.3, §17.6) ─────────────────────────────────
 *
 * `speedProfile()` bepaalt de batchgrootte en de pauze. Antwoordt de site met
 * `429` of `503`, dan respecteert dit een `Retry-After` en gaat het tempo
 * automatisch één stand omlaag (`slowerThan()`) voor de rest van deze ronde.
 * Antwoordt hij met `403`, dan stopt de crawl: doorgaan zou een resultaat vol
 * lege pagina's opleveren dat eruitziet als een geslaagde, dunne crawl.
 */
export async function crawlInventory(
  host: string,
  opts: InventoryOptions = {},
): Promise<InventoryResult> {
  const hardCap = opts.budgetMs !== undefined ? MAX_PAGES_BACKGROUND : MAX_PAGES_HARD_CAP;
  const maxPages = Math.min(Math.max(opts.maxPages ?? DEFAULT_MAX_PAGES, 1), hardCap);

  // Modus "meer" (§17.8): het uitsluiten gebeurt VÓÓR het kiezen, niet erna.
  // Zou `selectUrls()` eerst de beste `maxPages` kiezen en pas daarna de al
  // bekende URL's eruit filteren, dan levert een site waarvan de topplekken
  // allemaal al gecrawld zijn een lege aanvulling op, ook als er nog honderden
  // ongelezen pagina's zijn.
  const { urls: alleUrls } = await collectPageUrls(host, opts.sitemapUrl);
  // `selectUrls()` filtert `exclude` VÓÓR het kiezen (§17.8) en telt
  // `totalFound` over de volledige, ongefilterde lijst, dus "meer" bij een
  // grotendeels gecrawlde site toont nog steeds de ware omvang van de site.
  const exclude = new Set(opts.exclude ?? []);
  const index = selectUrls(alleUrls, maxPages, opts.priorityPaths, exclude);
  const teCrawlen = index.urls;

  let speed = opts.speed ?? "normaal";
  let profile = speedProfile(speed);
  const start = Date.now();
  const base = toFetchUrl(host);

  const gehaald = new Map<string, { title: string | null; text: string }>();
  let blocked = false;
  let remaining: string[] = [];

  for (let i = 0; i < teCrawlen.length; i += profile.batchSize) {
    if (blocked) {
      remaining = teCrawlen.slice(i);
      break;
    }
    if (opts.budgetMs !== undefined && Date.now() - start > opts.budgetMs) {
      remaining = teCrawlen.slice(i);
      break;
    }

    const batch = teCrawlen.slice(i, i + profile.batchSize);
    const referer = i === 0 ? base : teCrawlen[Math.max(0, i - 1)];
    const results = await Promise.all(
      batch.map((url) => fetchPageStatus(url, profile.timeoutMs, { asBrowser: opts.asBrowser, referer })),
    );

    let vertraagIets = false;
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const url = batch[j];
      if (r.status === 403) {
        blocked = true;
        continue;
      }
      if (r.status === 429 || r.status === 503) {
        vertraagIets = true;
        if (r.retryAfterMs) await sleep(r.retryAfterMs);
        continue;
      }
      if (r.html) {
        // Zelfde keuze als in `crawlPages`: het menu eruit vóór het knippen.
        const inhoudTekst = htmlToText(stripChrome(r.html));
        if (inhoudTekst.length > 0) {
          gehaald.set(url, { title: extractTitle(r.html), text: inhoudTekst.slice(0, PAGE_MAX_CHARS) });
        }
      }
    }

    if (vertraagIets) {
      speed = slowerThan(speed);
      profile = speedProfile(speed);
    }
    if (!blocked && i + profile.batchSize < teCrawlen.length) {
      await sleep(nextDelayMs(profile));
    }
  }

  return {
    pages: teCrawlen
      .filter((u) => !remaining.includes(u))
      .map((url) => {
        const c = gehaald.get(url);
        return { url, title: c?.title ?? null, text: c?.text ?? null };
      }),
    totalFound: index.totalFound,
    truncated: index.truncated,
    blocked,
    usedSpeed: speed,
    remaining,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
