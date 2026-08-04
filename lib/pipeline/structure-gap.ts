/**
 * Welke pagina's mist deze site? (docs/tasks/inspace-optimalisaties-1-4.md, 1)
 *
 * ── WAAROM DIT ANDERS IS DAN WAT WE AL DEDEN ────────────────────────────────
 *
 * Onze aanbevelingen komen uit GEMISTE VRAGEN: de meting stelt 30 vragen, bij 17
 * wordt de klant niet genoemd, daar volgen pagina's uit. Dat is reactief, en het
 * heeft een blinde vlek die met de aanbodboom pas zichtbaar werd. Levert een
 * klant twaalf diensten en raakt de meting er toevallig vier, dan hoort hij over
 * acht diensten niets — ook al heeft hij er geen pagina voor en is dat precies
 * de reden dat een assistent hem daar niet kan noemen.
 *
 * Deze module draait het om: eerst vaststellen wat de STRUCTUUR mist, dan pas
 * kijken wat de meting zag. Dat is wat InSpace als hun moeilijke deel omschrijft
 * ("everyone is building AI that writes blogs"), en sinds `profile_offerings`
 * ligt de data ervoor klaar. Het is één vergelijking die we nog niet maakten.
 *
 * ── GEEN OPSLAG, GEEN MIGRATIE ──────────────────────────────────────────────
 *
 * De dekking is volledig afgeleid uit twee tabellen die allebei klein zijn, en
 * hij verandert zodra er een pagina bijkomt. Opslaan zou een vierde plek
 * opleveren die kan verouderen — precies de wildgroei waar dit project van af
 * wilde. Berekenen bij het lezen.
 *
 * ── DEZELFDE MATCHING ALS DE FEITENKAART ────────────────────────────────────
 *
 * `page-relevance.ts` doet dit al: termen uit een onderwerp scoren tegen een
 * pagina, mét de stemmer en de stopwoordenlijst die daar op echte data zijn
 * afgesteld. Een tweede matchingalgoritme zou twee plekken opleveren die het
 * oneens kunnen worden over dezelfde vraag.
 *
 * Puur, dus testbaar (conventie 2).
 */
import {
  canonicalPath,
  scorePage,
  topicTerms,
  type CandidatePage,
} from "@/lib/pipeline/page-relevance";
import type { ProfileOffering } from "@/lib/types/database";

/**
 * Drie uitkomsten en niet twee, want het verschil bepaalt het advies dat de
 * klant krijgt: een zwak gedekte dienst hoort een bestaande pagina te
 * verbeteren, een ontbrekende hoort een nieuwe pagina te worden.
 */
export type PaginaDekking = "eigen_pagina" | "zwak_gedekt" | "ontbreekt";

export interface OfferingCoverage {
  offeringId: string;
  name: string;
  kind: ProfileOffering["kind"];
  dekking: PaginaDekking;
  /** De pagina die er het dichtst bij komt. Null bij `ontbreekt`. */
  matchedUrl: string | null;
  /** Waarom dit als match geldt. Voor de uitleg op het scherm. */
  reason: string;
}

export interface StructureCoverage {
  coverage: OfferingCoverage[];
  missing: number;
  weak: number;
  /** Hoeveel knopen er überhaupt beoordeeld zijn (dus zonder merken). */
  assessed: number;
}

/**
 * Hoeveel van de termen van de dienstnaam een pagina in zijn tekst moet raken
 * voordat we hem "zwak gedekt" noemen.
 *
 * `scorePage()` geeft 3 punten voor een term in titel of URL en 1 in de body.
 * Een dienst van twee woorden waarvan er één in de lopende tekst voorkomt haalt
 * dus 1 — en dat is te weinig: "therapie" komt op elke pagina van een praktijk
 * voor. Vandaar de eis dat de MEERDERHEID van de termen geraakt wordt.
 */
const WEAK_TERM_RATIO = 0.5;

/**
 * Heeft deze pagina de dienstnaam in zijn URL of titel staan? Dan is het een
 * eigen pagina en geen vermelding in een opsomming.
 *
 * Bewust op de canonieke slug en niet op de hele URL: `/en/services/massage` en
 * `/diensten/massage` zijn dezelfde pagina, en de taalvariant mag niet als
 * tweede dekking meetellen.
 */
function isOwnPage(page: CandidatePage, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const kop = new Set(topicTerms(page.title, canonicalPath(page.url)));
  return terms.every((t) => kop.has(t));
}

/**
 * Beoordeelt per aanbodknoop of de site er een pagina voor heeft.
 *
 * ⚠️ HET VANGNET: EEN CATEGORIE MET KINDEREN TELT ÉÉN KEER
 *
 * Zonder deze regel adviseert de app vijf pagina's waar er één hoort. Een
 * categorie "Specialismen" met negen subdiensten eronder zou anders als
 * "ontbreekt" gelden zodra er geen `/specialismen`-pagina is, én elk kind
 * afzonderlijk — tien gaten voor wat in de praktijk één beslissing is.
 *
 * Dus: een `categorie` die zelf kinderen heeft wordt overgeslagen, en de
 * kinderen worden beoordeeld. Een categorie zonder kinderen is in de praktijk
 * gewoon een dienst en telt wél mee.
 *
 * En `kind: "merk"` valt er helemaal buiten: een retailer hoeft geen pagina per
 * gevoerd merk, en die als gat rapporteren zou een assortimentslijst in honderd
 * aanbevelingen veranderen.
 */
export function assessStructureCoverage(
  offerings: ProfileOffering[],
  pages: CandidatePage[],
): StructureCoverage {
  const heeftKinderen = new Set(
    offerings.map((o) => o.parent_id).filter((id): id is string => Boolean(id)),
  );

  const teBeoordelen = offerings.filter((o) => {
    if (o.kind === "merk") return false;
    if (o.kind === "categorie" && heeftKinderen.has(o.id)) return false;
    return true;
  });

  const coverage = teBeoordelen.map((o): OfferingCoverage => {
    const terms = topicTerms(o.name);

    // 1. Een eigen pagina: de naam staat compleet in de titel of de slug.
    const eigen = pages.find((p) => isOwnPage(p, terms));
    if (eigen) {
      return {
        offeringId: o.id,
        name: o.name,
        kind: o.kind,
        dekking: "eigen_pagina",
        matchedUrl: eigen.url,
        reason: `De naam staat in de titel of het adres van ${canonicalPath(eigen.url)}.`,
      };
    }

    // 2. Zwak gedekt: de dienst komt in de tekst van een pagina voor, maar die
    //    pagina gaat ergens anders over.
    const gescoord = pages
      .map((p) => ({ page: p, score: scorePage(p, terms) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.page.url.localeCompare(b.page.url));

    const drempel = Math.max(1, Math.ceil(terms.length * WEAK_TERM_RATIO));
    const beste = gescoord[0];
    if (beste && beste.score >= drempel) {
      return {
        offeringId: o.id,
        name: o.name,
        kind: o.kind,
        dekking: "zwak_gedekt",
        matchedUrl: beste.page.url,
        reason: `Komt wel voor op ${canonicalPath(beste.page.url)}, maar die pagina gaat ergens anders over.`,
      };
    }

    return {
      offeringId: o.id,
      name: o.name,
      kind: o.kind,
      dekking: "ontbreekt",
      matchedUrl: null,
      reason: "Nergens op de site als eigen onderwerp gevonden.",
    };
  });

  return {
    coverage,
    missing: coverage.filter((c) => c.dekking === "ontbreekt").length,
    weak: coverage.filter((c) => c.dekking === "zwak_gedekt").length,
    assessed: coverage.length,
  };
}

/**
 * De regel die boven de aanbodlijst komt te staan.
 *
 * Met de noemer erbij, net als bij de koopvragen: "8 van je 12" zegt hoe hard de
 * uitspraak is, "8 diensten missen een pagina" niet.
 */
export function describeCoverage(c: StructureCoverage): string {
  if (c.assessed === 0) return "Nog geen aanbod in kaart gebracht.";
  if (c.missing === 0 && c.weak === 0) {
    return `Alle ${c.assessed} onderdelen van je aanbod hebben een eigen pagina.`;
  }

  const delen: string[] = [];
  if (c.missing > 0) {
    delen.push(
      `${c.missing} van je ${c.assessed} onderdelen heeft geen eigen pagina`,
    );
  }
  if (c.weak > 0) {
    delen.push(
      `${c.weak} wordt alleen zijdelings genoemd op een pagina over iets anders`,
    );
  }
  return `${delen.join(" · ")}.`;
}

/**
 * Het blok dat de rapportgeneratie meekrijgt.
 *
 * Dit is waar het verschil gemaakt wordt: zonder deze lijst baseert B2 zijn
 * aanbevelingen alleen op de vragen die de meting toevallig stelde. Bewust
 * afgekapt — een lijst van dertig gaten is geen agenda maar een verwijt.
 */
const MAX_IN_REPORT = 12;

export function formatCoverageForReport(c: StructureCoverage): string {
  const relevant = c.coverage.filter((x) => x.dekking !== "eigen_pagina");
  if (relevant.length === 0) return "";

  const regels = relevant
    .slice(0, MAX_IN_REPORT)
    .map(
      (x) =>
        `- ${x.name} (${x.kind}): ${
          x.dekking === "ontbreekt"
            ? "GEEN eigen pagina"
            : `alleen zijdelings op ${canonicalPath(x.matchedUrl ?? "")}`
        }`,
    );

  const rest =
    relevant.length > MAX_IN_REPORT
      ? `\n(en nog ${relevant.length - MAX_IN_REPORT} andere)`
      : "";

  return (
    `\n\nSTRUCTURELE GATEN IN DE SITE — dit komt uit het aanbod van de klant zelf, ` +
    `niet uit de meting. Een dienst zonder eigen pagina kan door een assistent niet ` +
    `genoemd worden, ook al is er nooit een vraag over gesteld. Weeg deze mee in je ` +
    `aanbevelingen:\n${regels.join("\n")}${rest}`
  );
}
