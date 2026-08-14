/**
 * Kansen als één lijst: wat is er te winnen, hoeveel, en met welke actie.
 *
 * ── HET PROBLEEM DAT DIT OPLOST ─────────────────────────────────────────────
 *
 * `docs/Nova.md` §7 fase 6: adviezen zitten nu verspreid over het rapport
 * (`gaps_json`, `recommendations_json`), de onderwerpenlijst en de technische
 * audit. Elk van die drie is op zichzelf begrijpelijk, maar samen beantwoorden
 * ze de enige vraag die de klant echt stelt niet: waar begin ik.
 *
 * Eén lijst, gesorteerd op wat het oplevert, met per regel de handeling erbij.
 *
 * ── HOEVEEL IS ER TE WINNEN, EN WANNEER ZEGGEN WE HET NIET ──────────────────
 *
 * Een aanbeveling draagt zijn doelvragen mee, elk met een gewicht: het aandeel
 * van de meting dat die vraag vertegenwoordigt (`RecommendationTarget.weight`).
 * De som daarvan is het eerlijkste antwoord op "hoeveel": zoveel procent van de
 * gemeten vragen kan deze pagina winnen.
 *
 * ⚠️ Waar dat gewicht ontbreekt, staat er GEEN getal. Conventie 3: onbekend is
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
   * Het aandeel van de gemeten vragen dat hiermee te winnen is, 0 tot 1.
   * `null` = niet te becijferen, en dan staat er geen getal op het scherm.
   * Vangnet-sortering zolang `potential` er nog niet is (zie boven).
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
      why: "Je robots.txt houdt de crawlers van AI-assistenten tegen. Zolang dat zo is, levert elke pagina die Aura schrijft niets op.",
      action: "Geef de AI-crawlers toegang in robots.txt",
      source: "techniek",
      share: null,
      potential: null,
      href: `/profielen/${input.profileId}/techniek`,
    });
  }

  for (const [i, r] of input.recommendations.entries()) {
    const gewichten = (r.targets ?? [])
      .map((t) => (typeof t.weight === "number" ? t.weight : null))
      .filter((w): w is number => w !== null);

    lijst.push({
      id: `aanbeveling-${i}`,
      title: r.title,
      why: r.why,
      action:
        r.action === "verbeteren" && r.existingUrl
          ? `Werk ${r.existingUrl} bij`
          : "Laat Aura deze pagina schrijven",
      source: "meting",
      // Geen gewichten betekent geen getal, niet nul: nul zou zeggen dat er
      // niets te winnen valt, en dat is iets anders dan "we weten het niet".
      share: gewichten.length > 0 ? som(gewichten) : null,
      potential: typeof r.potential === "number" ? r.potential : null,
      href: input.hasPlan ? `/profielen/${input.profileId}/plan` : null,
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
      share: null,
      potential: null,
      href: input.hasPlan ? `/profielen/${input.profileId}/plan` : null,
    });
  }

  for (const t of input.unmeasuredTopics) {
    lijst.push({
      id: `onderwerp-${t.id}`,
      title: `"${t.title}" is nog nooit gemeten`,
      why: "Aura weet niet hoe zichtbaar je bent rond dit onderwerp, en kan er dus ook niet gericht over schrijven.",
      action: "Start de meting van dit onderwerp",
      source: "onderwerp",
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

/** Het aandeel als leesbaar percentage, of null. */
export function shareLabel(share: number | null): string | null {
  if (share === null) return null;
  const procent = Math.round(share * 100);
  // Onder de 1% afronden naar 0 zou "niets te winnen" suggereren. Dan liever
  // de ondergrens noemen.
  return procent < 1 ? "minder dan 1% van de gemeten vragen" : `${procent}% van de gemeten vragen`;
}

function som(getallen: number[]): number {
  return getallen.reduce((a, b) => a + b, 0);
}
