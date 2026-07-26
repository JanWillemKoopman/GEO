import "server-only";

/**
 * Technische GEO-audit (optimalisatie.md 3B).
 *
 * Waarom dit bestaat: nergens in de app werd gecontroleerd of AI-crawlers de
 * site überhaupt mogen bezoeken. We konden dus perfecte content laten schrijven
 * voor een site die ChatGPT de deur wijst — de klant betaalt voor teksten die
 * nooit gelezen worden. Deze audit kijkt of de deur openstaat vóórdat we hem
 * adviseren om te gaan schrijven.
 *
 * Geen AI-aanroep: dit zijn HTTP-verzoeken en tekstinspectie. Kosten: nul.
 */
import { USER_AGENT, fetchText, htmlToText } from "@/lib/crawler";
import { parseRobots, isAllowed, sitemapsFrom } from "@/lib/audit/robots";
import { AI_CRAWLERS } from "@/lib/audit/ai-crawlers";

const TIMEOUT_MS = 8000;

/**
 * `blocker` — hier loopt de kernbelofte op vast; niets doen is geen optie.
 * `warning` — je laat bereik liggen, maar het werkt.
 * `ok`      — in orde.
 * `unknown` — niet vast te stellen (site onbereikbaar, of geen bron beschikbaar).
 */
export type AuditSeverity = "blocker" | "warning" | "ok" | "unknown";

export interface AuditCheck {
  id: string;
  label: string;
  severity: AuditSeverity;
  /** Wat we aantroffen, feitelijk. */
  finding: string;
  /** Wat er moet gebeuren, in gewone taal. Null als er niets te doen is. */
  fix: string | null;
  /** Wie dat meestal kan doen — de klant weet vaak niet bij wie hij moet zijn. */
  who: string | null;
}

export interface TechnicalAudit {
  checkedAt: string;
  siteUrl: string;
  checks: AuditCheck[];
  blockers: number;
  warnings: number;
}

function toUrl(host: string): string {
  return host.startsWith("http") ? host : `https://${host}`;
}

/** Haalt een URL op en geeft status + body terug. Faalt zacht. */
async function fetchRaw(url: string): Promise<{ status: number; body: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
    });
    return { status: res.status, body: await res.text() };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── 3.5 Crawler-toegang ─────────────────────────────────────────────────────

function crawlerChecks(robotsText: string | null): AuditCheck[] {
  // Géén robots.txt betekent: alles mag. Dat is geen tekortkoming, dat is de
  // standaard — en het is de meest voorkomende situatie bij kleine sites.
  if (robotsText === null) {
    return [
      {
        id: "crawler.all",
        label: "Toegang voor AI-crawlers",
        severity: "ok",
        finding: "Je site heeft geen robots.txt, dus alle AI-crawlers mogen binnen.",
        fix: null,
        who: null,
      },
    ];
  }

  const groups = parseRobots(robotsText);

  return AI_CRAWLERS.map((crawler) => {
    const allowed = isAllowed(groups, crawler.userAgent, "/");
    return {
      id: `crawler.${crawler.userAgent.toLowerCase()}`,
      label: crawler.label,
      severity: allowed ? ("ok" as const) : crawler.impact,
      finding: allowed
        ? `Mag je site bezoeken. ${crawler.purpose}`
        : `Wordt geweigerd door je robots.txt. ${crawler.purpose}`,
      fix: allowed
        ? null
        : `Haal de regel weg die "${crawler.userAgent}" blokkeert in robots.txt, of vervang 'm door "Allow: /".`,
      who: allowed ? null : "Je webbouwer of websitebeheerder.",
    };
  });
}

// ── 3.6 Overige technische controles ────────────────────────────────────────

function llmsTxtCheck(found: boolean): AuditCheck {
  return {
    id: "llms-txt",
    label: "llms.txt",
    severity: found ? "ok" : "warning",
    finding: found
      ? "Gevonden. AI-assistenten kunnen in één oogopslag zien wat je aanbiedt."
      : "Niet gevonden. Dit is een bestandje dat in gewone taal samenvat wat je site aanbiedt en waar de belangrijkste pagina's staan.",
    fix: found
      ? null
      : "Zet een llms.txt op de hoofdmap van je site. Nog geen officiële standaard, maar goedkoop en steeds breder ondersteund.",
    who: found ? null : "Je webbouwer — of wij kunnen een voorzet maken.",
  };
}

/**
 * Levert de site zinvolle tekst zonder JavaScript?
 *
 * We vergelijken de hoeveelheid leesbare tekst met de omvang van de HTML. Een
 * pagina van 300 kB die 200 woorden oplevert, is een pagina die pas ná het
 * uitvoeren van JavaScript inhoud krijgt — en dat doet lang niet elke AI-crawler.
 * Bewust een grove verhouding en geen headless browser: een browser draaien kost
 * geheugen en seconden, en voor "is dit een leeg omhulsel?" is dat overkill.
 */
function javascriptCheck(html: string | null): AuditCheck {
  if (html === null) {
    return {
      id: "no-js-content",
      label: "Leesbaar zonder JavaScript",
      severity: "unknown",
      finding: "We konden je homepage niet ophalen, dus dit konden we niet controleren.",
      fix: null,
      who: null,
    };
  }

  const text = htmlToText(html);
  const words = text.split(/\s+/).filter(Boolean).length;
  const ratio = html.length > 0 ? text.length / html.length : 0;

  // Twee signalen die allebei fout moeten zijn: weinig woorden ÉN een lage
  // verhouding. Een korte maar echte landingspagina heeft weinig woorden maar
  // een normale verhouding; een React-omhulsel heeft allebei laag.
  const emptyShell = words < 120 && ratio < 0.05;

  return {
    id: "no-js-content",
    label: "Leesbaar zonder JavaScript",
    severity: emptyShell ? "blocker" : "ok",
    finding: emptyShell
      ? `Je homepage levert maar ${words} woorden tekst op bij ${Math.round(html.length / 1024)} kB aan code. Dat wijst erop dat de inhoud pas verschijnt nadat JavaScript is uitgevoerd — en dat doen veel AI-crawlers niet.`
      : `Je homepage levert ${words} woorden leesbare tekst op zonder JavaScript.`,
    fix: emptyShell
      ? "Laat de belangrijkste tekst meekomen in de HTML zelf (server-side rendering of pre-rendering). Voor de meeste bouwers is dit een instelling, geen verbouwing."
      : null,
    who: emptyShell ? "Je webbouwer." : null,
  };
}

/** Gestructureerde data: staat er JSON-LD op de pagina, en zo ja, wat voor type? */
function structuredDataCheck(html: string | null): AuditCheck {
  if (html === null) {
    return {
      id: "structured-data",
      label: "Gestructureerde data",
      severity: "unknown",
      finding: "We konden je homepage niet ophalen, dus dit konden we niet controleren.",
      fix: null,
      who: null,
    };
  }

  const blocks = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  );

  const types = new Set<string>();
  for (const [, raw] of blocks) {
    try {
      const parsed: unknown = JSON.parse(raw.trim());
      // @type kan een string of een lijst zijn, en het geheel kan een @graph zijn.
      const collect = (node: unknown) => {
        if (Array.isArray(node)) return node.forEach(collect);
        if (!node || typeof node !== "object") return;
        const obj = node as Record<string, unknown>;
        const t = obj["@type"];
        if (typeof t === "string") types.add(t);
        if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
        if (Array.isArray(obj["@graph"])) collect(obj["@graph"]);
      };
      collect(parsed);
    } catch {
      // Kapotte JSON-LD telt niet mee; dat is precies zo goed als geen JSON-LD.
    }
  }

  const found = types.size > 0;
  return {
    id: "structured-data",
    label: "Gestructureerde data",
    severity: found ? "ok" : "warning",
    finding: found
      ? `Gevonden op je homepage: ${Array.from(types).slice(0, 6).join(", ")}.`
      : "Geen bruikbare gestructureerde data op je homepage. Dat is de machineleesbare samenvatting van wie je bent en wat je aanbiedt.",
    fix: found
      ? null
      : "Voeg JSON-LD toe met minimaal Organization en, waar van toepassing, LocalBusiness, Product of FAQPage.",
    who: found ? null : "Je webbouwer; in WordPress doet een SEO-plugin dit meestal al.",
  };
}

/**
 * Sitemap: bestaat hij, en is hij nog actueel?
 *
 * "Actueel" leiden we af uit de nieuwste `<lastmod>`. Staat die op meer dan een
 * jaar geleden, dan is de sitemap waarschijnlijk niet meer bijgewerkt — en een
 * sitemap die de nieuwe pagina's niet noemt is erger dan geen sitemap, want hij
 * wekt de indruk dat hij compleet is.
 */
async function sitemapCheck(base: string, robotsText: string | null): Promise<AuditCheck> {
  const candidates = [
    ...(robotsText ? sitemapsFrom(robotsText) : []),
    `${base}/sitemap.xml`,
    `${base}/sitemap_index.xml`,
  ];

  for (const url of Array.from(new Set(candidates))) {
    const xml = await fetchText(url);
    if (!xml || !/<(urlset|sitemapindex)[\s>]/i.test(xml)) continue;

    const dates = Array.from(xml.matchAll(/<lastmod>\s*([^<\s]+)/gi))
      .map((m) => Date.parse(m[1]))
      .filter((t) => !Number.isNaN(t));
    const newest = dates.length > 0 ? Math.max(...dates) : null;
    const daysOld = newest != null ? Math.round((Date.now() - newest) / 86_400_000) : null;
    const stale = daysOld != null && daysOld > 365;

    return {
      id: "sitemap",
      label: "Sitemap",
      severity: stale ? "warning" : "ok",
      finding: stale
        ? `Gevonden op ${url}, maar de laatste wijziging staat op ${daysOld} dagen geleden. Waarschijnlijk wordt hij niet meer bijgewerkt.`
        : `Gevonden op ${url}${daysOld != null ? `, laatst bijgewerkt ${daysOld} dagen geleden` : ""}.`,
      fix: stale
        ? "Laat je sitemap automatisch bijwerken bij het publiceren van een pagina. Elk gangbaar systeem kan dat."
        : null,
      who: stale ? "Je webbouwer." : null,
    };
  }

  return {
    id: "sitemap",
    label: "Sitemap",
    severity: "warning",
    finding: "Geen sitemap gevonden. Zoekmachines en AI-crawlers moeten je pagina's dan zelf bij elkaar zoeken.",
    fix: "Publiceer een sitemap.xml en verwijs ernaar vanuit robots.txt.",
    who: "Je webbouwer; de meeste systemen genereren er automatisch een.",
  };
}

/**
 * Vindbaarheid via Bing — met een eerlijke beperking.
 *
 * ChatGPT-zoeken leunt op de index van Bing, dus dit is geen detail. Maar of een
 * site daadwerkelijk in die index staat, kun je alleen betrouwbaar vaststellen
 * via een betaalde API of via Bing Webmaster Tools van de klant zelf. De
 * zoekpagina van Bing leegtrekken is fragiel en niet netjes, dus dat doen we
 * niet: we melden wat we wél weten (mag Bingbot binnen, en is er een sitemap
 * voor hem) en zijn expliciet over wat we niet kunnen zien. Liever een eerlijke
 * beperking dan een cijfer waar niemand op kan bouwen.
 */
function bingCheck(bingbotAllowed: boolean, hasSitemap: boolean): AuditCheck {
  if (!bingbotAllowed) {
    return {
      id: "bing-index",
      label: "Vindbaarheid via Bing",
      severity: "blocker",
      finding:
        "Bingbot wordt geweigerd, dus je site kan niet in de index van Bing staan. ChatGPT-zoeken put daaruit — zonder Bing kom je daar nauwelijks voor.",
      fix: "Geef Bingbot toegang in robots.txt en meld je site aan bij Bing Webmaster Tools.",
      who: "Je webbouwer.",
    };
  }

  return {
    id: "bing-index",
    label: "Vindbaarheid via Bing",
    severity: hasSitemap ? "ok" : "warning",
    finding: hasSitemap
      ? "Bingbot mag binnen en er is een sitemap. Of je site echt in de index staat, kunnen we van buitenaf niet zien — dat lees je af in Bing Webmaster Tools."
      : "Bingbot mag binnen, maar er is geen sitemap om hem de weg te wijzen. Of je site echt in de index staat, kunnen we van buitenaf niet zien.",
    fix: hasSitemap
      ? null
      : "Publiceer een sitemap en dien 'm in bij Bing Webmaster Tools — gratis, en het versnelt de indexering aanzienlijk.",
    who: hasSitemap ? null : "Je webbouwer.",
  };
}

// ── De audit zelf ───────────────────────────────────────────────────────────

/**
 * Draait alle controles voor één site. Faalt nooit hard: elke controle die niet
 * uitgevoerd kan worden komt als `unknown` terug. Een audit die crasht omdat de
 * site even plat lag, zou de hele analyse blokkeren.
 */
export async function runTechnicalAudit(host: string): Promise<TechnicalAudit> {
  const base = toUrl(host).replace(/\/+$/, "");

  const [robotsRes, homeRes, llmsRes] = await Promise.all([
    fetchRaw(`${base}/robots.txt`),
    fetchRaw(base),
    fetchRaw(`${base}/llms.txt`),
  ]);

  // Een 404 op robots.txt is "geen robots.txt" (alles mag). Een 500 is iets
  // anders, maar het effect voor een crawler is hetzelfde: geen regels.
  const robotsText =
    robotsRes && robotsRes.status < 400 && /(?:user-agent|disallow|allow|sitemap)\s*:/i.test(robotsRes.body)
      ? robotsRes.body
      : null;

  const html = homeRes && homeRes.status < 400 ? homeRes.body : null;

  // Een 404-pagina die HTML teruggeeft telt niet als llms.txt; die moet plat
  // tekst zijn en geen `<html>` bevatten.
  const llmsFound = Boolean(
    llmsRes && llmsRes.status < 400 && llmsRes.body.trim().length > 0 && !/<html[\s>]/i.test(llmsRes.body),
  );

  const crawlers = crawlerChecks(robotsText);
  const sitemap = await sitemapCheck(base, robotsText);
  const bingbotAllowed = robotsText === null || isAllowed(parseRobots(robotsText), "Bingbot", "/");

  const checks: AuditCheck[] = [
    ...crawlers,
    bingCheck(bingbotAllowed, sitemap.severity === "ok"),
    javascriptCheck(html),
    structuredDataCheck(html),
    sitemap,
    llmsTxtCheck(llmsFound),
  ];

  // De Bing-controle en de Bingbot-crawlercontrole zouden anders hetzelfde
  // tweemaal melden; de crawlerregel voor Bingbot laten we vallen zodra de
  // uitgebreidere Bing-controle er iets over zegt.
  const deduped = checks.filter((c) => c.id !== "crawler.bingbot");

  return {
    checkedAt: new Date().toISOString(),
    siteUrl: base,
    checks: deduped,
    blockers: deduped.filter((c) => c.severity === "blocker").length,
    warnings: deduped.filter((c) => c.severity === "warning").length,
  };
}
