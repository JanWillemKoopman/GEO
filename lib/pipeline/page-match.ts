/**
 * Welke bestaande pagina hoort bij deze aanbeveling, en klopt de handeling?
 * (docs/tasks/paginakeuze-nieuw-of-verbeteren.md O1 en O2)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De keuze tussen een nieuwe pagina en het verbeteren van een bestaande viel tot
 * 2 september 2026 volledig in de rapportaanroep, op één zin instructie, zonder
 * vangnet in code. Dat is de uitzondering die conventie 1 verbiedt, en de
 * productiecijfers van 1 september laten zien wat het kostte (20 rapporten, 129
 * aanbevelingen):
 *
 *   • 32 van de 70 aanbevelingen met handeling `nieuw` droegen tóch een adres,
 *     tegen de instructie in. Bij 13 daarvan bestond die pagina echt. Niets in
 *     de keten las dat adres: `content.ts` kijkt alleen bij `verbeteren`, en het
 *     scherm toont bij `nieuw` alleen de chip "Nieuwe pagina". Drie losse
 *     aanbevelingen van Van den Udenhout wezen alle drie naar dezelfde
 *     bestaande private-leasepagina en werden alle drie een nieuwe pagina.
 *
 *   • 8 van de 59 verbeter-adressen matchten niet op `profile_pages.url`, want
 *     dat is een exacte stringvergelijking. Vijf daarvan waren puur notatie: het
 *     model gaf `/tarieven-2026/` terug waar de inventaris
 *     `https://fysi-unique.nl/tarieven-2026/` bevat. Die pagina's zijn
 *     geschreven zonder één woord van de bestaande tekst, terwijl het scherm de
 *     klant vertelde de bestaande pagina te overschrijven.
 *
 *   • De drie overige waren verzinsels, waaronder tweemaal
 *     `/udenhout.nl/leasen/private-lease`: een pad met het domein erin dat nooit
 *     heeft bestaan. Migratie 0025 ruimde datzelfde adres met de hand op.
 *
 * ── GEEN TWEEDE MATCHINGALGORITME ───────────────────────────────────────────
 *
 * `page-relevance.ts` scoort al termen tegen pagina's, met de stemmer en de
 * stopwoordenlijst die daar op echte data zijn afgesteld, en `structure-gap.ts`
 * gebruikt dezelfde functies om te bepalen of een dienst een eigen pagina heeft.
 * Dit hergebruikt beide. Een eigen algoritme zou een derde plek opleveren die
 * het oneens kan worden met de andere twee over dezelfde vraag.
 *
 * Bewust ZONDER `server-only`: pure selectielogica, testbaar in een kaal script
 * (conventie 2).
 */
import {
  canonicalPath,
  coversTopic,
  scorePage,
  topicTerms,
  type CandidatePage,
} from "@/lib/pipeline/page-relevance";
import type { StoredRecommendation } from "@/lib/pipeline/recommendation";

/**
 * Het adres van het model oplossen tegen de echte inventaris.
 *
 * Vergelijkt op het canonieke PAD en niet op de hele URL. Dat repareert de vijf
 * gevallen hierboven in één keer: schema, `www`, een afsluitende schuine streep
 * en een taalsegment doen er niet toe, want geen daarvan maakt het een andere
 * pagina. Wat overblijft aan mismatches zijn adressen die echt niet bestaan, en
 * die horen ook niet te matchen.
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
 * Welk deel van de onderwerptermen een pagina moet raken voordat hij "gaat hier
 * al over" heet.
 *
 * De helft, dezelfde maat als `WEAK_TERM_RATIO` in `structure-gap.ts`, en om
 * dezelfde reden: één gedeeld vakwoord zegt niets. Op de site van een
 * fysiotherapiepraktijk komt "therapie" op elke pagina voor.
 *
 * ⚠️ Bovenop die verhouding geldt een tweede eis: minstens één term moet in de
 * TITEL of het ADRES staan. Een pagina die het onderwerp alleen in zijn lopende
 * tekst aanstipt, gaat er niet over; een pagina met het woord in zijn kop wel.
 * Zonder die eis zou een lange homepage die alles noemt bij elk onderwerp als
 * dekking gelden.
 */
const DEKKINGSRATIO = 0.5;

/** De pagina die dit onderwerp al draagt, of `null`. Sterkste eerst. */
export function findCoveringPage<T extends CandidatePage>(
  terms: string[],
  pages: T[],
): { page: T; strength: "eigen_pagina" | "raakt_onderwerp" } | null {
  if (terms.length === 0) return null;

  // 1. De naam staat compleet in de titel of het adres: dit ís de pagina.
  const eigen = pages.find((p) => coversTopic(p, terms));
  if (eigen) return { page: eigen, strength: "eigen_pagina" };

  // 2. Anders: de helft van de termen geraakt, waarvan minstens één in de kop.
  const nodig = Math.max(1, Math.ceil(terms.length * DEKKINGSRATIO));
  const gescoord = pages
    .map((p) => {
      const kop = new Set(topicTerms(p.title, canonicalPath(p.url)));
      const body = new Set(topicTerms(p.text));
      const inKop = terms.filter((t) => kop.has(t)).length;
      const geraakt = terms.filter((t) => kop.has(t) || body.has(t)).length;
      return { page: p, inKop, geraakt, score: scorePage(p, terms) };
    })
    .filter((x) => x.inKop >= 1 && x.geraakt >= nodig)
    .sort((a, b) => b.score - a.score || a.page.url.localeCompare(b.page.url));

  return gescoord[0] ? { page: gescoord[0].page, strength: "raakt_onderwerp" } : null;
}

/** Wat er aan één aanbeveling veranderd is, voor de logregel en de tests. */
export interface ActionFix {
  title: string;
  van: string;
  naar: string;
  reden: string;
}

export interface ReconcileResult {
  recommendations: StoredRecommendation[];
  fixes: ActionFix[];
}

/**
 * De handeling van elke aanbeveling narekenen tegen de echte inventaris.
 *
 * Vier gevallen, en alle vier komen ze in productie voor:
 *
 *   1. `verbeteren` met een adres dat (op pad) bestaat: het adres wordt
 *      vervangen door de echte URL uit de inventaris, zodat de schrijfstap hem
 *      terugvindt en het scherm naar iets klikbaars wijst.
 *   2. `verbeteren` met een adres dat niet bestaat: terug naar `nieuw`. Een
 *      verbetering zonder pagina om te verbeteren is geen verbetering, en het
 *      scherm mag de klant niet vragen een pagina te overschrijven die er niet
 *      is.
 *   3. `nieuw` met een adres dat wél bestaat: de handeling blijft `nieuw`, maar
 *      de pagina gaat mee als `relatedUrl`. Dit is bewust GEEN automatische
 *      omzetting naar `verbeteren`: het model heeft de tekst van die pagina niet
 *      gezien (de rapportprompt krijgt alleen adressen en titels), dus "hij gaat
 *      hierover" is hier een vermoeden en geen oordeel. Wat het wél is: een
 *      waarschuwing die de schrijver en de klant horen te zien, want twee
 *      pagina's over dezelfde vraag concurreren met elkaar.
 *   4. `nieuw` zónder adres: dan zoeken we er zelf een, met de titel en de
 *      doelvragen als termen. Dat is de dertien gevallen uit de meting van
 *      1 september omgedraaid: het model wees ze aan zonder dat iemand keek, nu
 *      kijken we ook als het model zwijgt.
 */
export function reconcileRecommendations(args: {
  recommendations: StoredRecommendation[];
  pages: CandidatePage[];
}): ReconcileResult {
  const { recommendations, pages } = args;
  const fixes: ActionFix[] = [];

  const uitkomst = recommendations.map((rec): StoredRecommendation => {
    const genoemd = matchExistingPage(rec.existingUrl, pages);

    if (rec.action === "verbeteren") {
      if (genoemd) {
        if (genoemd.url !== rec.existingUrl) {
          fixes.push({
            title: rec.title,
            van: rec.existingUrl ?? "",
            naar: genoemd.url,
            reden: "adres genormaliseerd naar de pagina uit de inventaris",
          });
        }
        return { ...rec, existingUrl: genoemd.url, relatedUrl: null };
      }
      fixes.push({
        title: rec.title,
        van: `verbeteren ${rec.existingUrl ?? ""}`,
        naar: "nieuw",
        reden: "die pagina staat niet in de inventaris van deze site",
      });
      return { ...rec, action: "nieuw", existingUrl: null, relatedUrl: null };
    }

    // Vanaf hier: handeling `nieuw`.
    const termen = topicTerms(rec.title, ...rec.targets.map((t) => t.text));
    const gevonden = genoemd ?? findCoveringPage(termen, pages)?.page ?? null;
    if (!gevonden) return { ...rec, existingUrl: null, relatedUrl: null };

    fixes.push({
      title: rec.title,
      van: "nieuw",
      naar: "nieuw, met bestaande pagina erbij",
      reden: `${gevonden.url} gaat al over dit onderwerp`,
    });
    return { ...rec, existingUrl: null, relatedUrl: gevonden.url };
  });

  return { recommendations: uitkomst, fixes };
}

/**
 * De waarschuwing die de schrijfprompt krijgt als er een pagina bestaat die het
 * onderwerp al raakt terwijl we een NIEUWE pagina maken.
 *
 * Zonder deze regel schrijft het model een tweede pagina over hetzelfde
 * onderwerp zonder het te weten, en `similarity.ts` legt uit waarom dat schadelijk
 * is: twee pagina's die hetzelfde zeggen concurreren om dezelfde vraag, en geen
 * van beide wordt de duidelijke bron.
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
 * Voorkeursvolgorde, en die volgorde is het hele punt van deze module:
 *
 *   1. de verse tekst uit de planstap (6000 tekens, van vandaag);
 *   2. anders het crawl-excerpt (1500 tekens, tot weken oud);
 *   3. anders niets.
 *
 * Stap 2 is de terugval en geen gelijkwaardig alternatief. Hij bestaat voor de
 * pagina's die vóór migratie 0083 geschreven zijn en voor een site die op het
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
