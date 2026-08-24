/**
 * Kansen als één lijst: wat is er te winnen, hoeveel, en met welke actie.
 *
 * ── HET PROBLEEM DAT DIT OPLOST ─────────────────────────────────────────────
 *
 * Fase 6, "de lus sluiten" (`docs/logbook.md`): adviezen zitten nu verspreid over het rapport
 * (`gaps_json`, `recommendations_json`), de onderwerpenlijst en de technische
 * audit. Elk van die drie is op zichzelf begrijpelijk, maar samen beantwoorden
 * ze de enige vraag die de klant echt stelt niet: waar begin ik.
 *
 * Eén lijst, gesorteerd op wat het oplevert, met per regel de handeling erbij.
 *
 * ── HOEVEEL IS ER TE WINNEN, EN WANNEER ZEGGEN WE HET NIET ──────────────────
 *
 * Een aanbeveling draagt zijn doelvragen mee. Het getal op het scherm is het
 * AANTAL daarvan, afgezet tegen het aantal vragen dat in dat cluster gemeten is:
 * "raakt 4 van de 30 gemeten vragen". Dat is te tellen, dus het kan niet
 * uiteenlopen met wat hoofdstuk 02 van het dossier laat zien.
 *
 * ⚠️ **Hier stond tot 24 augustus 2026 een percentage, en dat was onmogelijk.**
 * Het rekende met `RecommendationTarget.weight`, en dat gewicht is geen aandeel
 * maar volumeband × koopwaarde per vraag, 0,02 tot 1,0
 * (`lib/pipeline/prompt-weight.ts`). Vier koopklare vragen tellen op tot 2,4, en
 * op het overzicht van Van den Udenhout stond daardoor letterlijk "240% van de
 * gemeten vragen", naast een zichtbaarheid van 0%. `docs/ux-design.md` §1: geen
 * schijnprecisie. De som van de gewichten blijft bestaan als SORTEERSLEUTEL
 * (`share`), want daarvoor was hij bruikbaar, maar hij komt nooit meer in beeld.
 *
 * ⚠️ Waar de doelvragen ontbreken, staat er GEEN getal. Conventie 3: onbekend is
 * een betere waarde dan een verkeerde. Een verzonnen percentage naast een advies
 * is precies het soort cijfer dat een klant onthoudt en later terugvraagt.
 *
 * ── FASE 2 VAN docs/tasks/potentiescore.md ──────────────────────────────────
 *
 * `share` was tot 13 augustus het enige getal, en het is eigenlijk een
 * benadering van precies wat de potentiescore nu ECHT uitrekent: hoeveel is
 * hier te winnen. Het verschil: `share` weegt met de oude, grove volumeband
 * (`promptWeight()`) en is niet vergelijkbaar tussen analyses; de potentiescore
 * (`lib/potential.ts`) weegt met de profielbrede, herkalibreerde zoekvolume-index
 * en IS vergelijkbaar. Waar de potentiescore bekend is (`potential`, aangeleverd
 * door de aanroeper, want dat vergt een databasequery, conventie 2), sorteert en
 * toont deze lijst op dat getal. Waar hij nog onbekend is (het merk heeft nog
 * geen enkele profielbrede herberekening gehad), valt de sortering terug op
 * `share`, dat blijft dus bestaan als vangnet en niet als doel op zich.
 *
 * Puur, dus testbaar (conventie 2).
 */
import { leesbaarWaarom } from "@/lib/recommendation-text";

/** Waar een kans vandaan komt. Bepaalt de toon en de knop. */
export type OpportunitySource =
  | "meting"        // een gemiste vraag uit het rapport
  | "onderwerp"     // een onderwerp dat nog nooit gemeten is
  | "techniek"      // een AI-crawler komt er niet in
  | "plan";         // een pagina die klaarstaat maar niet gepubliceerd is

export interface Opportunity {
  id: string;
  title: string;
  /** Waarom dit een kans is, in gewone taal. */
  why: string;
  /** Wat je moet doen. Eén handeling, geen lijstje. */
  action: string;
  source: OpportunitySource;
  /**
   * Hoeveel gemeten vragen deze kans raakt. `null` = de aanbeveling draagt geen
   * doelvragen mee, en dan staat er geen getal op het scherm.
   */
  raakt: number | null;
  /**
   * Hoeveel vragen er in het cluster achter deze kans gemeten zijn, de noemer
   * bij `raakt`. `null` = onbekend, en dan noemt het scherm alleen de teller.
   */
  gemeten: number | null;
  /**
   * ⚠️ SORTEERSLEUTEL, NOOIT EEN GETAL OP HET SCHERM. De som van de bevroren
   * gewichten van de doelvragen. Bruikbaar om twee kansen te vergelijken,
   * onbruikbaar als mededeling: hij loopt op boven de 1 en is dus geen aandeel.
   * Zie de waarschuwing bovenaan dit bestand.
   */
  share: number | null;
  /**
   * De potentiescore (docs/tasks/potentiescore.md): zichtbaarheidsgat ×
   * profielbreed herkalibreerd zoekvolume, 0-100. `null` zolang dit merk nog
   * geen enkele herberekening had, of voor kansen waar geen analyse achter zit
   * (techniek, onderwerp zonder meting).
   */
  potential: number | null;
  /** Waar de knop heen gaat. Null = er is geen scherm voor. */
  href: string | null;
}

export interface OpportunityInput {
  profileId: string;
  /** De aanbevelingen van het laatste rapport. */
  recommendations: {
    title: string;
    why: string;
    action?: string | null;
    existingUrl?: string | null;
    targets?: { weight?: number | null }[] | null;
    /** Vooraf berekend door de aanroeper (`loadRecommendationPotential`). */
    potential?: number | null;
    /**
     * Hoeveel vragen er in het cluster van deze aanbeveling gemeten zijn, de
     * noemer bij het aantal doelvragen. Weet de aanroeper het niet, dan noemt
     * het scherm alleen de teller.
     */
    measured?: number | null;
  }[];
  /** Onderwerpen die nog geen analyse hebben: nooit gemeten, dus onbekend terrein. */
  unmeasuredTopics: { id: string; title: string }[];
  /** Blokkeert de site AI-crawlers? Uit `lib/audit/`. */
  crawlerBlocked: boolean;
  /** Pagina's die geschreven zijn en op publicatie wachten. */
  readyToPublish: number;
  /** Naar welk plan de knop wijst, als er een plan is. */
  hasPlan: boolean;
}

/**
 * De lijst, gesorteerd op wat het oplevert.
 *
 * ⚠️ De techniek staat bovenaan als de crawler geblokkeerd is, ongeacht het
 * getal. Dat is geen sorteertruc maar de werkelijkheid: zolang een AI-assistent
 * de site niet kan lezen, levert élke geschreven pagina niets op. Een lijst die
 * dat als vierde item toont, laat iemand eerst maanden schrijven voor de prullenbak.
 */
export function opportunities(input: OpportunityInput): Opportunity[] {
  const lijst: Opportunity[] = [];

  if (input.crawlerBlocked) {
    lijst.push({
      id: "techniek",
      title: "AI-assistenten kunnen je site niet lezen",
      why: "Je robots.txt houdt de crawlers van AI-assistenten tegen. Zolang dat zo is, levert elke pagina die ORBIT ENGINE schrijft niets op.",
      action: "Geef de AI-crawlers toegang in robots.txt",
      source: "techniek",
      raakt: null,
      gemeten: null,
      share: null,
      potential: null,
      href: `/merk/${input.profileId}/analytics`,
    });
  }

  for (const [i, r] of input.recommendations.entries()) {
    const gewichten = (r.targets ?? [])
      .map((t) => (typeof t.weight === "number" ? t.weight : null))
      .filter((w): w is number => w !== null);

    const doelvragen = (r.targets ?? []).length;

    lijst.push({
      id: `aanbeveling-${i}`,
      title: r.title,
      // ⚠️ Het vangnet op de modeltekst (conventie 1). Zonder dit stond er "V1
      // en V2 hebben gewicht 0,60" op het scherm van de klant.
      why: leesbaarWaarom(r.why) ?? "",
      action:
        r.action === "verbeteren" && r.existingUrl
          ? `Werk ${r.existingUrl} bij`
          : "Laat ORBIT ENGINE deze pagina schrijven",
      source: "meting",
      // Geen doelvragen betekent geen getal, niet nul: nul zou zeggen dat er
      // niets te winnen valt, en dat is iets anders dan "we weten het niet".
      raakt: doelvragen > 0 ? doelvragen : null,
      gemeten: typeof r.measured === "number" && r.measured > 0 ? r.measured : null,
      share: gewichten.length > 0 ? som(gewichten) : null,
      potential: typeof r.potential === "number" ? r.potential : null,
      href: input.hasPlan ? `/merk/${input.profileId}/strategie/plan` : null,
    });
  }

  if (input.readyToPublish > 0) {
    lijst.push({
      id: "publiceren",
      title:
        input.readyToPublish === 1
          ? "Er staat een pagina klaar die nog niet live is"
          : `Er staan ${input.readyToPublish} pagina's klaar die nog niet live zijn`,
      // ⚠️ Dit is de goedkoopste kans die er is: het werk is al gedaan en
      // betaald. Een geschreven pagina die niet gepubliceerd wordt, levert per
      // definitie nul op.
      why: "Deze pagina's zijn geschreven en goedgekeurd. Zolang ze niet online staan, kan geen enkele AI-assistent ze vinden.",
      action: "Publiceer ze en markeer ze als geplaatst",
      source: "plan",
      raakt: null,
      gemeten: null,
      share: null,
      potential: null,
      href: input.hasPlan ? `/merk/${input.profileId}/strategie/plan` : null,
    });
  }

  for (const t of input.unmeasuredTopics) {
    lijst.push({
      id: `onderwerp-${t.id}`,
      title: `"${t.title}" is nog nooit gemeten`,
      why: "ORBIT ENGINE weet niet hoe zichtbaar je bent rond dit onderwerp, en kan er dus ook niet gericht over schrijven.",
      action: "Start de meting van dit onderwerp",
      source: "onderwerp",
      raakt: null,
      gemeten: null,
      share: null,
      potential: null,
      href: `/analyses/aanbevolen?merk=${input.profileId}`,
    });
  }

  return sorteer(lijst);
}

/**
 * De volgorde: eerst wat alles blokkeert, dan wat al betaald is, dan wat het
 * meeste oplevert.
 *
 * ── WAAROM NIET SIMPELWEG OP OMVANG ─────────────────────────────────────────
 *
 * ⚠️ Dit ging de eerste keer mis, en de test ving het. Sorteren op het aandeel
 * zette een aanbeveling van 30% boven "er staan twee geschreven pagina's die
 * nog niet online zijn". Maar die aanbeveling kost nog een schrijfronde op het
 * duurste model; die twee pagina's zijn al geschreven, al goedgekeurd en al
 * betaald, en leveren zolang ze offline staan gegarandeerd nul op. Werk dat af
 * is, gaat vóór werk dat nog moet beginnen.
 *
 * Vandaar twee groepen. `techniek` en `plan` staan altijd bovenaan, in die
 * volgorde. Daarbinnen, en in de tweede groep, telt eerst de potentiescore
 * (fase 2, docs/tasks/potentiescore.md): die weegt zichtbaarheidsgat én
 * zoekvolume tegelijk en is vergelijkbaar over alle onderwerpen van het merk.
 * Ontbreekt hij (dit merk had nog geen profielbrede herberekening), dan valt
 * de sortering terug op `share`. Kansen zonder ENIG getal komen achteraan,
 * want een onbekende omvang is niet te vergelijken.
 */
function sorteer(lijst: Opportunity[]): Opportunity[] {
  const bronRang: Record<OpportunitySource, number> = {
    techniek: 0,
    plan: 1,
    meting: 2,
    onderwerp: 3,
  };
  /** Blokkerend of al betaald: dat gaat altijd voor. */
  const eersteGroep = (o: Opportunity) => o.source === "techniek" || o.source === "plan";

  return [...lijst].sort((a, b) => {
    if (eersteGroep(a) !== eersteGroep(b)) return eersteGroep(a) ? -1 : 1;
    if (eersteGroep(a)) return bronRang[a.source] - bronRang[b.source];

    if (a.potential !== null && b.potential !== null && a.potential !== b.potential) {
      return b.potential - a.potential;
    }
    if ((a.potential === null) !== (b.potential === null)) return a.potential === null ? 1 : -1;

    if (a.share !== null && b.share !== null && a.share !== b.share) {
      return b.share - a.share;
    }
    if ((a.share === null) !== (b.share === null)) return a.share === null ? 1 : -1;
    return bronRang[a.source] - bronRang[b.source];
  });
}

/**
 * Hoeveel gemeten vragen deze kans raakt, in gewone taal, of `null` als er niets
 * te tellen valt.
 *
 * ⚠️ Beide getallen zijn tellingen en geen schatting. Dat is het hele verschil
 * met het percentage dat hier tot 24 augustus 2026 stond: dat was een som van
 * gewichten die tot boven de 100% opliep, en dus een cijfer dat niet kon
 * kloppen. Zie de waarschuwing bovenaan dit bestand.
 */
export function reachLabel(raakt: number | null, gemeten: number | null): string | null {
  if (raakt === null || raakt <= 0) return null;
  // De noemer alleen noemen als hij klopt. Meer doelvragen dan gemeten vragen
  // kan niet, en als het tóch gebeurt is de noemer de onbetrouwbare helft.
  if (gemeten === null || gemeten < raakt) {
    return raakt === 1 ? "raakt 1 gemeten vraag" : `raakt ${raakt} gemeten vragen`;
  }
  // ⚠️ Met een noemer erbij is het altijd meervoud: het zelfstandig naamwoord
  // hoort bij de noemer, niet bij de teller. "1 van de 30 gemeten vraag" is
  // geen Nederlands.
  return `raakt ${raakt} van de ${gemeten} gemeten vragen`;
}

function som(getallen: number[]): number {
  return getallen.reduce((a, b) => a + b, 0);
}
