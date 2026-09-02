/**
 * Stelt dit rapport iets voor dat de klant al (ongeveer) op zijn website heeft?
 * (docs/tasks/roadmap.md §7, "existingUrl-conventie afdwingen"; docs/logbook.md
 * 1 september 2026)
 *
 * ── WAAROM DIT EEN VANGNET IS EN GEEN VERTROUWEN OP HET MODEL ───────────────
 *
 * `REPORT_SYSTEM` (report.ts) draagt het model al op: kies "verbeteren" met een
 * URL uit de paginalijst als een bestaande pagina het onderwerp al dekt, anders
 * "nieuw". Dat is een instructie, geen garantie (conventie 1), en in productie
 * is hij op twee manieren misgegaan:
 *
 *   - Gasservice Brabant: het model gaf bij een NIEUWE aanbeveling toch een
 *     `existingUrl` op, letterlijk `":"` (lib/plan-backlog-data.ts, schoonAdres).
 *   - Udenhout: het model claimde `action: "verbeteren"` met `existingUrl:
 *     "/udenhout.nl/skoda"`, een pad dat nergens in de crawl voorkomt
 *     (lib/pipeline/briefing-select.ts).
 *
 * Geen van beide is aangetoond onmogelijk gemaakt: `schoonAdres()` filtert een
 * overduidelijk kapotte string eruit, maar een overtuigend ogende maar verzonnen
 * URL glipt erdoorheen, en het omgekeerde geval (het model zegt "nieuw" terwijl
 * de site het onderwerp al dekt) werd nergens gecontroleerd.
 *
 * Dit bestand is dat vangnet: het herrekent zelf, uit de gecrawlde pagina's
 * (`profile_pages`), of een aanbeveling een bestaand onderwerp dekt, en
 * corrigeert `action`/`existingUrl` waar de twee uit elkaar lopen. Puur en
 * zonder AI-aanroep, dus gratis en op elke pagina van elke klant te toetsen,
 * niet alleen op de tien die met de hand nagelopen zijn.
 *
 * ── WAAROM TERMOVERLAP EN GEEN VIJF-GRAMMEN ─────────────────────────────────
 *
 * `similarity.ts` vergelijkt twee volledige teksten van vergelijkbare lengte
 * (een geschreven pagina tegen een zusterpagina). Hier vergelijken we een korte
 * titel plus intentie (een paar zinnen) met de tekst van een gecrawlde pagina
 * (soms duizenden woorden); vijf woorden op rij die toevallig letterlijk
 * overeenkomen zijn dan zeldzaam, ook als de pagina exact over hetzelfde
 * onderwerp gaat. `page-relevance.ts` heeft dit probleem al opgelost voor
 * dezelfde invoer (onderwerp → welke gecrawlde pagina's horen erbij) met
 * termoverlap op woordstammen, en dat hergebruiken we hier ongewijzigd: minder
 * code, en dezelfde uitleg voor twee vraagstukken die in de kern hetzelfde zijn
 * ("gaat deze pagina hierover?").
 *
 * Bewust ZONDER `server-only`: pure vergelijkingslogica, testbaar vanuit
 * `scripts/test-unit.ts` (conventie 2).
 */
import { topicTerms, canonicalPath } from "@/lib/pipeline/page-relevance";
import type { ContentAction } from "@/lib/types/database";

export interface ExistingPageCandidate {
  url: string;
  title: string | null;
  text: string | null;
}

export interface RecommendationTopic {
  title: string;
  targetIntent: string;
  why: string;
}

export interface ExistingPageMatch {
  url: string;
  title: string | null;
  /** Aandeel van de onderwerptermen dat deze pagina raakt, 0 tot 1. */
  coverage: number;
  termsMatched: number;
  termsTotal: number;
}

/**
 * Onder dit aantal termen is een onderwerp te dun om een oordeel op te bouwen:
 * "prijzen" alleen raakt de helft van elke website. Dan liever geen oordeel
 * (conventie 3) dan een vals alarm op een woord dat overal voorkomt.
 */
export const MIN_ONDERWERPTERMEN = 3;

/**
 * De drempel waarboven we zeggen "dit staat er al". Bewust ruim: `scorePage()`
 * telt een term in de titel driemaal zo zwaar als in de body, dus een pagina
 * die het onderwerp alleen zijdelings noemt (in de lopende tekst, niet de
 * titel) haalt 0,7 dekking niet snel. Net als bij `DUPLICATE_THRESHOLD` geldt:
 * de gemeten dekking wordt altijd teruggegeven (`ExistingPageMatch.coverage`),
 * dus na een paar echte rapporten is dit op data bij te stellen in plaats van
 * op gevoel.
 */
export const EXISTING_PAGE_COVERAGE_THRESHOLD = 0.7;

/**
 * De pagina die dit onderwerp het beste dekt, of `null` als het onderwerp te
 * dun is om te beoordelen of geen pagina genoeg dekking haalt.
 */
export function findExistingPageMatch(
  topic: RecommendationTopic,
  pages: ExistingPageCandidate[],
): ExistingPageMatch | null {
  const terms = topicTerms(topic.title, topic.targetIntent, topic.why);
  if (terms.length < MIN_ONDERWERPTERMEN) return null;

  let best: ExistingPageMatch | null = null;
  for (const page of pages) {
    if (!page.url?.trim()) continue;
    const kop = new Set(topicTerms(page.title, page.url));
    const body = new Set(topicTerms(page.text));
    let matched = 0;
    for (const term of terms) {
      if (kop.has(term) || body.has(term)) matched++;
    }
    const coverage = matched / terms.length;
    if (!best || coverage > best.coverage) {
      best = { url: page.url, title: page.title, coverage, termsMatched: matched, termsTotal: terms.length };
    }
  }

  if (!best || best.coverage < EXISTING_PAGE_COVERAGE_THRESHOLD) return null;
  return best;
}

/** Staat deze URL echt in de crawl, of is hij door het model verzonnen? */
function isKnownUrl(url: string | null, pages: ExistingPageCandidate[]): boolean {
  if (!url?.trim()) return false;
  const canon = canonicalPath(url);
  return pages.some((p) => p.url?.trim() && canonicalPath(p.url) === canon);
}

export interface ActionOverride {
  title: string;
  from: ContentAction;
  to: ContentAction;
  /** Waarom gecorrigeerd is: het model gaf een pad dat niet bestaat, of miste een echte match. */
  reason: "onbevestigde_url" | "gevonden_gelijkenis";
  url: string | null;
  coverage: number | null;
}

/**
 * Rekent `action`/`existingUrl` van elke aanbeveling na tegen de echte crawl.
 *
 * Twee correcties, allebei in de richting van "niet dupliceren wat er al is":
 *
 *   1. Het model zegt "verbeteren" met een URL die niet in de crawl voorkomt.
 *      Vinden we zelf een pagina die het onderwerp goed dekt, dan vervangt die
 *      de verzonnen URL. Vinden we niets, dan valt de aanbeveling terug op
 *      "nieuw" zonder URL: een niet te bevestigen adres tonen aan de klant is
 *      erger dan een aanbeveling die voorzichtig "nieuw" zegt (conventie 3,
 *      net als `schoonAdres()` in lib/plan-backlog-data.ts).
 *   2. Het model zegt "nieuw", maar een gecrawlde pagina dekt het onderwerp al
 *      ruim boven de drempel. Dan wordt het alsnog "verbeteren" met die URL:
 *      dit is precies het geval dat de klant niet wil, een voorstel voor iets
 *      dat hij al heeft.
 *
 * Zegt het model "verbeteren" met een URL die wél in de crawl staat, dan blijft
 * die aanbeveling ongemoeid: bevestigde informatie corrigeren we niet op basis
 * van een grovere eigen meting.
 */
export function reconcileExistingPageActions<
  T extends { title: string; targetIntent: string; why: string; action: ContentAction; existingUrl: string | null },
>(
  recommendations: T[],
  pages: ExistingPageCandidate[],
): { recommendations: T[]; overrides: ActionOverride[] } {
  const overrides: ActionOverride[] = [];

  const result = recommendations.map((r) => {
    const match = findExistingPageMatch(r, pages);

    if (r.action === "verbeteren") {
      if (isKnownUrl(r.existingUrl, pages)) return r;
      if (match) {
        overrides.push({
          title: r.title,
          from: "verbeteren",
          to: "verbeteren",
          reason: "onbevestigde_url",
          url: match.url,
          coverage: match.coverage,
        });
        return { ...r, existingUrl: match.url };
      }
      overrides.push({
        title: r.title,
        from: "verbeteren",
        to: "nieuw",
        reason: "onbevestigde_url",
        url: null,
        coverage: null,
      });
      return { ...r, action: "nieuw" as ContentAction, existingUrl: null };
    }

    if (match) {
      overrides.push({
        title: r.title,
        from: "nieuw",
        to: "verbeteren",
        reason: "gevonden_gelijkenis",
        url: match.url,
        coverage: match.coverage,
      });
      return { ...r, action: "verbeteren" as ContentAction, existingUrl: match.url };
    }

    return r;
  });

  return { recommendations: result, overrides };
}
