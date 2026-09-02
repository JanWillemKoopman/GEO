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
 * ── WAT ER OP 2 SEPTEMBER 2026 BIJKWAM ──────────────────────────────────────
 *
 * Twee dingen, allebei uit `docs/tasks/paginakeuze-nieuw-of-verbeteren.md`, dat
 * dezelfde beslissing over 20 rapporten met 129 aanbevelingen natelde:
 *
 *   1. **Het adres wordt nu genormaliseerd.** Zegt het model "verbeteren" met
 *      een adres dat wél bestaat, dan bleef dat adres staan zoals het model het
 *      gaf. In productie was dat 5 van de 59 keer een PAD zonder domein
 *      (`/tarieven-2026/` waar de inventaris `https://fysi-unique.nl/tarieven-2026/`
 *      bevat). Dat is dezelfde pagina, dus de controle hieronder gaf terecht
 *      groen licht, maar wat er in de database belandde was een adres waarop de
 *      schrijfstap niets kon vinden en waar het scherm geen werkende link van
 *      kon maken. Nu wint altijd de URL uit de crawl.
 *
 *   2. **Onder de drempel waarschuwen we in plaats van te zwijgen.** Haalt een
 *      pagina de omzetdrempel niet, maar raakt hij het onderwerp wel duidelijk,
 *      dan blijft de aanbeveling `nieuw` en draagt hij die pagina mee als
 *      `relatedUrl`. Het rapportmodel wees zelf 13 keer zo'n pagina aan zonder
 *      dat iets in de keten hem las. Twee pagina's over dezelfde vraag
 *      concurreren met elkaar, dus de schrijver én de klant horen het te weten.
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
  /** Hoeveel van die termen in de TITEL of het ADRES staan (2 september 2026). */
  termsInHeading: number;
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
 * De lagere drempel voor "deze pagina raakt het onderwerp" (2 september 2026).
 *
 * Boven `EXISTING_PAGE_COVERAGE_THRESHOLD` wordt een aanbeveling omgezet naar
 * `verbeteren`: dan gaat die pagina er zó duidelijk over dat een tweede pagina
 * ernaast schadelijk is. Daartussenin ligt een gebied waarin omzetten te ver
 * gaat maar zwijgen ook: de pagina bestaat, gaat over hetzelfde thema, en de
 * nieuwe pagina moet zich ervan onderscheiden.
 *
 * ⚠️ Met een extra eis die de omzetdrempel niet heeft: minstens één term moet in
 * de TITEL of het ADRES staan. Op deze hoogte telt een lange pagina die alles
 * noemt anders bij elk onderwerp mee, en dan waarschuwt hij overal. Een term in
 * de kop zegt "deze pagina gaat hierover", een term in de lopende tekst zegt
 * alleen "hij komt voor" (zelfde redenering als de weging 3 om 1 in
 * `scorePage()`).
 */
export const EXISTING_PAGE_RELATED_THRESHOLD = 0.4;

/**
 * De pagina die dit onderwerp het beste dekt, of `null` als het onderwerp te
 * dun is om te beoordelen of geen pagina genoeg dekking haalt.
 */
export function findExistingPageMatch(
  topic: RecommendationTopic,
  pages: ExistingPageCandidate[],
  /** Vanaf welke dekking dit meetelt. Standaard de omzetdrempel. */
  threshold: number = EXISTING_PAGE_COVERAGE_THRESHOLD,
): ExistingPageMatch | null {
  const terms = topicTerms(topic.title, topic.targetIntent, topic.why);
  if (terms.length < MIN_ONDERWERPTERMEN) return null;

  let best: ExistingPageMatch | null = null;
  for (const page of pages) {
    if (!page.url?.trim()) continue;
    const kop = new Set(topicTerms(page.title, page.url));
    const body = new Set(topicTerms(page.text));
    let matched = 0;
    let inHeading = 0;
    for (const term of terms) {
      if (kop.has(term)) {
        matched++;
        inHeading++;
      } else if (body.has(term)) {
        matched++;
      }
    }
    const coverage = matched / terms.length;
    if (!best || coverage > best.coverage) {
      best = {
        url: page.url,
        title: page.title,
        coverage,
        termsMatched: matched,
        termsTotal: terms.length,
        termsInHeading: inHeading,
      };
    }
  }

  if (!best || best.coverage < threshold) return null;
  return best;
}

/**
 * Staat deze URL echt in de crawl? Zo ja, geef het adres terug ZOALS DE CRAWL
 * HEM KENT, en niet zoals het model hem opschreef.
 *
 * Vergelijken doen we op het canonieke pad, dus schema, `www`, een afsluitende
 * schuine streep en een taalsegment maken niet uit: geen daarvan maakt het een
 * andere pagina. Maar wat we BEWAREN moet het volledige adres uit de crawl zijn,
 * anders belandt er een pad zonder domein in de database. Dat gebeurde in
 * productie 5 van de 59 keer, en dan vindt de schrijfstap de pagina niet en kan
 * het scherm er geen werkende link van maken (2 september 2026).
 */
function knownUrl(url: string | null, pages: ExistingPageCandidate[]): string | null {
  if (!url?.trim()) return null;
  const canon = canonicalPath(url);
  const treffer = pages.find((p) => p.url?.trim() && canonicalPath(p.url) === canon);
  return treffer?.url ?? null;
}

export interface ActionOverride {
  title: string;
  from: ContentAction;
  to: ContentAction;
  /**
   * Waarom gecorrigeerd is: het model gaf een pad dat niet bestaat, het miste
   * een echte match, het adres moest naar de vorm uit de crawl (2 september
   * 2026), of er staat een pagina naast die het onderwerp raakt zonder hem te
   * dekken.
   */
  reason:
    | "onbevestigde_url"
    | "gevonden_gelijkenis"
    | "adres_genormaliseerd"
    | "verwante_pagina";
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
  T extends {
    title: string;
    targetIntent: string;
    why: string;
    action: ContentAction;
    existingUrl: string | null;
    relatedUrl?: string | null;
  },
>(
  recommendations: T[],
  pages: ExistingPageCandidate[],
): { recommendations: T[]; overrides: ActionOverride[] } {
  const overrides: ActionOverride[] = [];

  const result = recommendations.map((r) => {
    const match = findExistingPageMatch(r, pages);

    if (r.action === "verbeteren") {
      const bekend = knownUrl(r.existingUrl, pages);
      if (bekend) {
        // Bevestigd adres: de handeling blijft, maar het adres wordt de vorm uit
        // de crawl. Verschilt hij niet, dan is dit een no-op.
        if (bekend === r.existingUrl) return { ...r, relatedUrl: null };
        overrides.push({
          title: r.title,
          from: "verbeteren",
          to: "verbeteren",
          reason: "adres_genormaliseerd",
          url: bekend,
          coverage: null,
        });
        return { ...r, existingUrl: bekend, relatedUrl: null };
      }
      if (match) {
        overrides.push({
          title: r.title,
          from: "verbeteren",
          to: "verbeteren",
          reason: "onbevestigde_url",
          url: match.url,
          coverage: match.coverage,
        });
        return { ...r, existingUrl: match.url, relatedUrl: null };
      }
      overrides.push({
        title: r.title,
        from: "verbeteren",
        to: "nieuw",
        reason: "onbevestigde_url",
        url: null,
        coverage: null,
      });
      return { ...r, action: "nieuw" as ContentAction, existingUrl: null, relatedUrl: null };
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
      return {
        ...r,
        action: "verbeteren" as ContentAction,
        existingUrl: match.url,
        relatedUrl: null,
      };
    }

    // ── Onder de omzetdrempel: waarschuwen in plaats van zwijgen ──────────
    //
    // Deze pagina blijft nieuw, maar er staat al iets dat het onderwerp raakt.
    // De schrijver krijgt de opdracht zich ervan te onderscheiden
    // (`relatedPageWarning()`), en de klant ziet het op het rapportscherm. Wel
    // met de kop-eis erbij: zonder die eis waarschuwt een lange homepage bij elk
    // onderwerp.
    const verwant = findExistingPageMatch(r, pages, EXISTING_PAGE_RELATED_THRESHOLD);
    if (verwant && verwant.termsInHeading >= 1) {
      overrides.push({
        title: r.title,
        from: "nieuw",
        to: "nieuw",
        reason: "verwante_pagina",
        url: verwant.url,
        coverage: verwant.coverage,
      });
      return { ...r, relatedUrl: verwant.url };
    }

    return { ...r, relatedUrl: null };
  });

  return { recommendations: result, overrides };
}

/**
 * Het adres van het model oplossen tegen de inventaris, voor de stappen ná het
 * rapport (2 september 2026).
 *
 * `reconcileExistingPageActions()` zet het adres bij het opstellen van het
 * rapport al recht, maar niet elke schrijfopdracht komt daarlangs: een pagina
 * uit de contentvoorraad, een handmatige aanroep of een rapport van vóór 1
 * september draagt nog het oorspronkelijke adres. Daarom zoekt de schrijfstap
 * zelf ook op canoniek pad in plaats van op de letterlijke tekst.
 */
export function matchExistingPage<T extends { url: string }>(
  url: string | null | undefined,
  pages: T[],
): T | null {
  const gezocht = (url ?? "").trim();
  if (!gezocht) return null;

  const pad = canonicalPath(gezocht);
  // Een leeg pad ("/" na normalisatie) alleen accepteren als het adres zelf ook
  // de homepage aanwees. Anders zou "." of "" van het model op elke site de
  // homepage aanwijzen, en dat is geen keuze maar een gok. In productie stond
  // driemaal precies zo'n waarde in `existingUrl`.
  if (pad === "/" && !/^(https?:\/\/[^/]+)?\/?$/i.test(gezocht)) return null;

  return pages.find((p) => canonicalPath(p.url) === pad) ?? null;
}

/**
 * De waarschuwing die de schrijfprompt krijgt als er een pagina bestaat die het
 * onderwerp al raakt terwijl we een NIEUWE pagina maken.
 *
 * Zonder deze regel schrijft het model een tweede pagina over hetzelfde
 * onderwerp zonder het te weten, en `similarity.ts` legt uit waarom dat
 * schadelijk is: twee pagina's die hetzelfde zeggen concurreren om dezelfde
 * vraag, en geen van beide wordt de duidelijke bron.
 */
export function relatedPageWarning(url: string | null): string {
  if (!url?.trim()) return "";
  return (
    `\nLET OP, ER STAAT AL EEN PAGINA OVER DIT ONDERWERP: ${url}\nDeze nieuwe pagina moet ` +
    `duidelijk iets ANDERS doen dan die pagina. Herhaal niet wat daar al staat, ga dieper op de ` +
    `vraag hierboven in, en verwijs één keer naar die pagina in plaats van hem over te doen.`
  );
}

/**
 * Hoeveel tekens er van de bestaande pagina meegaan naar de prompts.
 *
 * 6000, dezelfde maat als `MAX_CHARS` voor de homepage in `crawler.ts`. Dat is
 * ongeveer 900 woorden, ruim boven de langste pagina die wij schrijven (1200
 * woorden voor een artikel is een bovengrens die zelden gehaald wordt), en het
 * houdt de schrijfprompt hanteerbaar. Een webshoppagina met honderd producten
 * eronder wordt hiermee afgekapt, en dat is de juiste keuze: de eerste 6000
 * tekens zijn waar de inhoud staat.
 *
 * Ter vergelijking: het crawl-excerpt is 1500 tekens (`PAGE_MAX_CHARS`), en 667
 * van de 738 gecrawlde pagina's op productie staan precies op die grens.
 */
export const EXISTING_PAGE_MAX_CHARS = 6000;

/**
 * Welke tekst de schrijfstap van de bestaande pagina gebruikt.
 *
 * Voorkeursvolgorde, en die volgorde is het hele punt:
 *
 *   1. de verse tekst uit de planstap (6000 tekens, van vandaag);
 *   2. anders het crawl-excerpt (1500 tekens, tot weken oud);
 *   3. anders niets.
 *
 * Stap 2 is de terugval en geen gelijkwaardig alternatief. Hij bestaat voor de
 * pagina's die vóór migratie 0086 geschreven zijn en voor een site die op het
 * moment van schrijven even onbereikbaar is. Puur, dus testbaar (conventie 2):
 * daarom staat de keuze hier als losse functie en niet verstopt in de opbouw
 * van de prompt.
 */
export function chooseExistingText(args: {
  fresh: string | null | undefined;
  excerpt: string | null | undefined;
}): { text: string; bron: "vers" | "crawl" } | null {
  const vers = (args.fresh ?? "").trim();
  if (vers.length > 0) return { text: vers, bron: "vers" };
  const excerpt = (args.excerpt ?? "").trim();
  if (excerpt.length > 0) return { text: excerpt, bron: "crawl" };
  return null;
}
