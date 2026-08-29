/**
 * De acht opportunitytypes, deterministisch gedetecteerd
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 12).
 *
 * ── DIT IS HET HART VAN DE MODULE, EN HET MODEL KOMT ER NIET AAN TE PAS ─────
 *
 * Plan hoofdstuk 12, eerste alinea: "Detectie is deterministisch: het gebeurt in
 * een pure module die zonder database en zonder API-sleutel getest kan worden.
 * Het model schrijft later alleen de uitleg, en verzint nooit de conclusie zelf."
 *
 * De reden staat een hoofdstuk eerder. Wat hier uitkomt, wordt een zin in een
 * mail aan een ondernemer die zijn eigen markt kent. "Je concurrent wordt vier
 * keer vaker genoemd" is te controleren, en als het niet klopt is het gesprek
 * voorbij voordat het begonnen is. Een conclusie die uit een model komt, is niet
 * na te rekenen; een conclusie die uit deze regels komt wel.
 *
 * ── DE ENE ZIN DIE ALLES STUURT ─────────────────────────────────────────────
 *
 * "De laagste zichtbaarheid is niet automatisch de hoogste saleskans" (plan
 * hoofdstuk 2). Daarom staat er in dit bestand nergens een sortering op
 * zichtbaarheid. De detectie zegt WELKE soort kans er is; hoe interessant die is
 * staat in `lib/sales/opportunity-score.ts`, en dat is een andere rekensom met
 * andere signalen, waaronder of dit bedrijf überhaupt klant kan worden.
 *
 * ── DE DREMPELS ─────────────────────────────────────────────────────────────
 *
 * Alle drempels staan hier bij elkaar als constanten, niet verspreid door de
 * code (plan hoofdstuk 12). Ze zijn een startpunt en horen na de eerste echte
 * markt gekalibreerd te worden tegen het oordeel van New business.
 */
import { changeIsMeaningful } from "@/lib/stats/uncertainty";
import { MIN_VRAGEN_PER_INTENTIE } from "@/lib/sales/intents";

/** De acht types uit hoofdstuk 12, in de volgorde waarin ze daar staan. */
export const KANS_TYPES = [
  "onzichtbaar",
  "concurrent_gap",
  "intent_gap",
  "engine_gap",
  "information_gap",
  "source_gap",
  "sterk_met_zwakke_plek",
  "verlies",
] as const;

export type KansType = (typeof KANS_TYPES)[number];

/**
 * De volgorde waarin het primaire type gekozen wordt (plan 12.1).
 *
 * ⚠️ **Verlies staat bewust bovenaan.** Een aantoonbare, recente achteruitgang
 * verslaat elke statische observatie, ook als die op meer vragen rust. "Je bent
 * onzichtbaar" is een toestand waar een ondernemer al jaren mee leeft zonder het
 * te weten; "je bent sinds juni gezakt van achttien naar negen" is een
 * gebeurtenis, en die roept meteen de vraag op wat er veranderd is. Urgentie
 * wint van omvang.
 *
 * Onzichtbaar staat juist laag, en dat is dezelfde redenering andersom: het is
 * het type met het minste bewijs erachter (er ís niets gemeten om naar te
 * wijzen) en het minst specifieke gesprek.
 */
export const PRIMAIRE_VOLGORDE: KansType[] = [
  "verlies",
  "information_gap",
  "intent_gap",
  "concurrent_gap",
  "source_gap",
  "engine_gap",
  "onzichtbaar",
  "sterk_met_zwakke_plek",
];

/** Wat een salesmedewerker leest. Geen jargon (`docs/schrijfstijl.md`). */
export const KANS_LABEL: Record<KansType, string> = {
  onzichtbaar: "Onzichtbaar",
  concurrent_gap: "Concurrent loopt voor",
  intent_gap: "Mist één dienst",
  engine_gap: "Verschil tussen assistenten",
  information_gap: "Onjuiste informatie",
  source_gap: "Ontbreekt in de bronnen",
  sterk_met_zwakke_plek: "Sterk, met een zwakke plek",
  verlies: "Gezakt sinds de vorige meting",
};

// ── De drempels ─────────────────────────────────────────────────────────────

/** Onder dit aandeel heet een bedrijf onzichtbaar (plan type 1: vijf procent). */
export const ONZICHTBAAR_GRENS = 0.05;

/** Hoeveel vaker een concurrent genoemd moet worden (plan type 2: twee keer). */
export const CONCURRENT_FACTOR = 2;

/** Hoeveel procentpunt verschil tussen twee engines telt (plan type 4: twintig). */
export const ENGINE_GAP_GRENS = 0.2;

/** Hoeveel de top is: de eerste drie van de markt (plan type 7). */
export const TOP_POSITIE = 3;

/**
 * Hoeveel een intentie onder het eigen gemiddelde moet liggen om een gat te zijn.
 *
 * Een bedrijf dat overal 40% scoort en bij één intentie 35%, heeft geen gat maar
 * ruis. De helft van het eigen gemiddelde is een verschil dat een ondernemer
 * herkent, en het is groot genoeg om buiten de marge te vallen bij vijf vragen.
 */
export const INTENT_GAP_FACTOR = 0.5;

/** Hoeveel brondomeinen het marktbeeld bepalen (plan type 6). */
export const MARKT_BRONNEN_TOP = 5;

// ── De invoer ───────────────────────────────────────────────────────────────

export interface DeelScore {
  vragen: number;
  vermeldingen: number;
  share: number;
}

/** De uitkomst van één bedrijf op één engine, of op alle engines samen. */
export interface MeetScore {
  questionsTotal: number;
  mentions: number;
  share: number;
  weightedShare: number;
  /** De marge als breuk van 0 tot 1, net als de aandelen. */
  stderr: number;
  perIntent: Record<string, DeelScore>;
}

/** Eén fragment waarin het bedrijf genoemd werd. Dit is het bewijs. */
export interface Fragment {
  answerId: string;
  questionId: string;
  engine: string;
  snippet: string;
}

export interface BedrijfMeting {
  companyId: string;
  naam: string;
  domein: string | null;
  plaats: string | null;
  /** Wat de crawler op de site vond. Leeg als er geen site is of de crawl faalde. */
  secties: string[];
  /** De gecombineerde uitkomst over alle engines. */
  alle: MeetScore;
  /** Per engine apart. Nodig voor type 4, en type 8 leunt erop. */
  perEngine: Record<string, MeetScore>;
  /** De brondomeinen die dit bedrijf dragen. */
  bronnen: { domain: string; count: number }[];
  fragmenten: Fragment[];
  /** De vorige ronde van dezelfde markt, als die er is. Zonder dit geen type 8. */
  vorige?: {
    weightedShare: number;
    stderr: number;
    perEngine: Record<string, { weightedShare: number; stderr: number }>;
  } | null;
}

export interface MarktContext {
  /** De domeinen die deze markt bepalen, aflopend op frequentie. */
  bronnen: { domain: string; count: number }[];
  /** Het marktgemiddelde per intentie: hoe vaak wordt hier überhaupt iemand genoemd. */
  gemiddeldePerIntent: Record<string, number>;
  /** De engines die daadwerkelijk gemeten hebben. */
  engines: string[];
  /** De plaats van de markt, voor de controle op een verkeerde vestigingsplaats. */
  plaats: string;
}

export interface Kans {
  type: KansType;
  /** De vragen waar dit oordeel op rust. Leeg mag niet: geen bewijs is geen claim. */
  vragen: string[];
  /** De antwoorden waar dit oordeel op rust. */
  antwoorden: string[];
  /** De concurrent die het verschil maakt, bij type 2. */
  rivalCompanyId?: string | null;
  /** De intenties waar het gat zit, bij type 3 en 7. */
  intentLabels?: string[];
  /** De getallen die in de haak terecht mogen komen. Alles wat hier niet in staat, is een gok. */
  cijfers: Record<string, number>;
}

// ── De detectie ─────────────────────────────────────────────────────────────

/**
 * Welke kansen ziet deze meting bij dit bedrijf?
 *
 * Een bedrijf kan aan meerdere types voldoen; die worden allemaal vastgelegd
 * (plan 12.1). Welke er primair is, bepaalt `kiesPrimair()` hieronder.
 */
export function detecteerKansen(
  bedrijf: BedrijfMeting,
  markt: MarktContext,
  concurrenten: BedrijfMeting[],
): Kans[] {
  const uit: Kans[] = [];

  const genoemdIn = bedrijf.fragmenten;
  const alleVragen = Array.from(new Set(genoemdIn.map((f) => f.questionId)));
  const alleAntwoorden = Array.from(new Set(genoemdIn.map((f) => f.answerId)));

  // Zonder metingen valt er niets te concluderen. Dat is geen kans van nul maar
  // een ontbrekende meting, en het verschil daartussen is conventie 3.
  if (bedrijf.alle.questionsTotal === 0) return uit;

  // ── Type 1 · Onzichtbaar ─────────────────────────────────────────────────
  //
  // ⚠️ De valkuil uit het plan staat NIET in deze regel maar in de score: een
  // eenmanszaak zonder website is onzichtbaar én geen prospect. Het
  // bedrijfssignaal weegt daarom mee in de score en niet in de detectie, anders
  // verdwijnt precies het soort bedrijf dat wel degelijk klant kan worden.
  if (bedrijf.alle.weightedShare < ONZICHTBAAR_GRENS) {
    uit.push({
      type: "onzichtbaar",
      // Het bewijs is hier de afwezigheid: alle vragen waarin het bedrijf niet
      // voorkomt. De vraag-ids staan op de meting zelf en niet op de fragmenten,
      // want er zijn geen fragmenten.
      vragen: [],
      antwoorden: [],
      cijfers: {
        aandeel: bedrijf.alle.weightedShare,
        vermeldingen: bedrijf.alle.mentions,
        vragen: bedrijf.alle.questionsTotal,
      },
    });
  }

  // ── Type 2 · Concurrent gap ──────────────────────────────────────────────
  //
  // Eén concurrent, de sterkste, en niet een lijstje (plan type 2). "Je
  // concurrent" is abstract, "Y Makelaars" is een gesprek.
  if (bedrijf.alle.mentions > 0 || bedrijf.alle.weightedShare >= 0) {
    const sterkste = concurrenten
      .filter((c) => c.companyId !== bedrijf.companyId && c.alle.questionsTotal > 0)
      .sort((a, b) => b.alle.weightedShare - a.alle.weightedShare)[0];

    if (
      sterkste &&
      sterkste.alle.weightedShare >= bedrijf.alle.weightedShare * CONCURRENT_FACTOR &&
      sterkste.alle.weightedShare > bedrijf.alle.weightedShare &&
      // ⚠️ Buiten de marge, anders is het geen verschil (plan hoofdstuk 15.2).
      // Dit is de fout die een verkoper voor schut zet in een gesprek.
      buitenDeMarge(
        { score: sterkste.alle.weightedShare, stderr: sterkste.alle.stderr },
        { score: bedrijf.alle.weightedShare, stderr: bedrijf.alle.stderr },
      )
    ) {
      // Het bewijs: de vragen waarin de concurrent wél en dit bedrijf niet
      // genoemd wordt. Dat is wat een verkoper laat zien, niet een percentage.
      const eigenVragen = new Set(alleVragen);
      const bewijs = sterkste.fragmenten.filter((f) => !eigenVragen.has(f.questionId));
      uit.push({
        type: "concurrent_gap",
        vragen: Array.from(new Set(bewijs.map((f) => f.questionId))).slice(0, 10),
        antwoorden: Array.from(new Set(bewijs.map((f) => f.answerId))).slice(0, 10),
        rivalCompanyId: sterkste.companyId,
        cijfers: {
          eigen_aandeel: bedrijf.alle.weightedShare,
          concurrent_aandeel: sterkste.alle.weightedShare,
          eigen_vermeldingen: bedrijf.alle.mentions,
          concurrent_vermeldingen: sterkste.alle.mentions,
          vragen: bedrijf.alle.questionsTotal,
        },
      });
    }
  }

  // ── Type 3 · Intent gap ──────────────────────────────────────────────────
  //
  // De scherpste haak die er is (plan type 3), want het bedrijf weet zelf dat
  // het die dienst levert. Het probleem is aantoonbaar niet dat de dienst
  // ontbreekt, en dat maakt het gesprek concreet in plaats van verwijtend.
  const gaten = intentGaten(bedrijf, markt);
  if (gaten.length > 0) {
    const vragenVanGat = genoemdIn.filter((f) => gaten.includes(f.questionId));
    uit.push({
      type: "intent_gap",
      // Het bewijs is de intentie waar het misgaat plus de pagina op de eigen
      // site. De vragen zelf staan in `intentLabels`; de fragmenten die er zijn,
      // gaan mee als illustratie van waar het wél goed gaat.
      vragen: vragenVanGat.map((f) => f.questionId).slice(0, 10),
      antwoorden: vragenVanGat.map((f) => f.answerId).slice(0, 10),
      intentLabels: gatenLabels(bedrijf, markt),
      cijfers: {
        eigen_aandeel: bedrijf.alle.weightedShare,
        ...gatCijfers(bedrijf, markt),
      },
    });
  }

  // ── Type 4 · Engine gap ──────────────────────────────────────────────────
  //
  // ⚠️ Alleen als BEIDE engines echt gemeten hebben (plan type 4, voorwaarde).
  // Een engine die wegviel levert een verschil van 100 procentpunt op, en dat is
  // geen engine gap maar een mislukte meting.
  const gemeten = markt.engines.filter(
    (e) => (bedrijf.perEngine[e]?.questionsTotal ?? 0) > 0,
  );
  if (gemeten.length >= 2) {
    const [hoog, laag] = gemeten
      .map((e) => ({ engine: e, score: bedrijf.perEngine[e] }))
      .sort((a, b) => b.score.weightedShare - a.score.weightedShare);

    const verschil = hoog.score.weightedShare - laag.score.weightedShare;
    if (
      verschil > ENGINE_GAP_GRENS &&
      buitenDeMarge(
        { score: hoog.score.weightedShare, stderr: hoog.score.stderr },
        { score: laag.score.weightedShare, stderr: laag.score.stderr },
      )
    ) {
      const bewijs = genoemdIn.filter((f) => f.engine === hoog.engine);
      uit.push({
        type: "engine_gap",
        vragen: Array.from(new Set(bewijs.map((f) => f.questionId))).slice(0, 10),
        antwoorden: Array.from(new Set(bewijs.map((f) => f.answerId))).slice(0, 10),
        cijfers: {
          hoogste_aandeel: hoog.score.weightedShare,
          laagste_aandeel: laag.score.weightedShare,
          verschil,
        },
      });
    }
  }

  // ── Type 5 · Information gap ─────────────────────────────────────────────
  //
  // ⚠️ ALLEEN BIJ EEN AANTOONBAAR VERSCHIL met een gecrawld feit (plan type 5).
  // "Een vermoeden is geen information gap, en een model dat 'dit lijkt
  // verouderd' zegt is geen bewijs."
  //
  // Wat hier gedetecteerd wordt is precies één geval: het antwoord zet het
  // bedrijf in een andere plaats dan waar het zit. Dat is te bewijzen met twee
  // stukken tekst naast elkaar, en het is de variant die het vaakst voorkomt.
  //
  // Wat NIET gedetecteerd wordt: een verouderde dienst of een niet meer bestaand
  // aanbod. Daarvoor is een feitenlaag per bedrijf nodig zoals de klantkant die
  // heeft (`brand_facts`), en die bestaat aan de saleskant niet. Dat is een
  // bewuste beperking en geen vergissing: liever één type dat klopt dan een
  // tweede dat op een vermoeden rust.
  const plaatsFout = plaatsConflict(bedrijf, markt);
  if (plaatsFout) {
    uit.push({
      type: "information_gap",
      vragen: [plaatsFout.questionId],
      antwoorden: [plaatsFout.answerId],
      cijfers: {},
    });
  }

  // ── Type 6 · Source gap ──────────────────────────────────────────────────
  //
  // Verlegt het gesprek van de eigen website naar het speelveld eromheen, en dat
  // is vaak nieuwe informatie voor de ondernemer (plan type 6).
  const marktTop = markt.bronnen.slice(0, MARKT_BRONNEN_TOP).map((b) => b.domain);
  const eigenBronnen = new Set(bedrijf.bronnen.map((b) => b.domain));
  const ontbreekt = marktTop.filter((d) => !eigenBronnen.has(d));
  const concurrentenInBronnen = concurrenten.filter(
    (c) =>
      c.companyId !== bedrijf.companyId &&
      c.bronnen.some((b) => marktTop.includes(b.domain)),
  );
  if (
    marktTop.length > 0 &&
    ontbreekt.length === marktTop.length &&
    // Minstens twee concurrenten worden er wél door gedragen. Bij één is het een
    // toevalligheid van die ene, en dan is er geen speelveld om over te praten.
    concurrentenInBronnen.length >= 2
  ) {
    uit.push({
      type: "source_gap",
      vragen: alleVragen.slice(0, 10),
      antwoorden: alleAntwoorden.slice(0, 10),
      cijfers: {
        bronnen_in_de_markt: marktTop.length,
        concurrenten_in_die_bronnen: concurrentenInBronnen.length,
      },
    });
  }

  // ── Type 7 · Strong position, weak spot ──────────────────────────────────
  //
  // Ook een winnaar heeft een reden om te praten, en een marktleider die zijn
  // positie kwijtraakt is commercieel de meest waardevolle klant die er is
  // (plan type 7). De toon van de mail is een andere, en dat staat in hoofdstuk 16.
  const rangschikking = [...concurrenten, bedrijf]
    .filter((c, i, arr) => arr.findIndex((x) => x.companyId === c.companyId) === i)
    .sort((a, b) => b.alle.weightedShare - a.alle.weightedShare);
  const positie = rangschikking.findIndex((c) => c.companyId === bedrijf.companyId) + 1;

  const heeftZwakkePlek =
    gaten.length > 0 || uit.some((k) => k.type === "engine_gap");
  if (positie > 0 && positie <= TOP_POSITIE && heeftZwakkePlek) {
    uit.push({
      type: "sterk_met_zwakke_plek",
      vragen: alleVragen.slice(0, 10),
      antwoorden: alleAntwoorden.slice(0, 10),
      intentLabels: gatenLabels(bedrijf, markt),
      cijfers: { positie, aandeel: bedrijf.alle.weightedShare },
    });
  }

  // ── Type 8 · Verlies ─────────────────────────────────────────────────────
  //
  // Het sterkste verkoopmoment dat er bestaat (plan type 8), en het bestaat pas
  // vanaf de tweede ronde.
  const daling = detecteerVerlies(bedrijf, markt);
  if (daling) {
    uit.push({
      type: "verlies",
      vragen: alleVragen.slice(0, 10),
      antwoorden: alleAntwoorden.slice(0, 10),
      cijfers: {
        nu: bedrijf.alle.weightedShare,
        eerder: bedrijf.vorige?.weightedShare ?? 0,
        daling: daling.delta,
      },
    });
  }

  return uit;
}

/**
 * Is de daling een echte daling? (plan type 8, twee vangnetten)
 *
 * 1. Een daling die binnen de marge valt is geen daling. Dat is precies de fout
 *    die een verkoper voor schut zet: hij belt over een achteruitgang die er
 *    statistisch niet is, en de ondernemer vraagt hoe zeker dat is.
 * 2. Een daling die alleen bij één engine zichtbaar is terwijl de andere gelijk
 *    bleef, is een engine gap en geen verlies. De ene engine veranderde zijn
 *    bronnen, het bedrijf veranderde niets.
 */
export function detecteerVerlies(
  bedrijf: BedrijfMeting,
  markt: MarktContext,
): { delta: number } | null {
  const vorige = bedrijf.vorige;
  if (!vorige) return null;

  const oordeel = changeIsMeaningful(
    { score: bedrijf.alle.weightedShare * 100, stderr: bedrijf.alle.stderr * 100 },
    { score: vorige.weightedShare * 100, stderr: vorige.stderr * 100 },
  );
  if (!oordeel.changed || oordeel.delta >= 0) return null;

  // Het tweede vangnet: gebeurde het bij alle engines, of maar bij één?
  const gemeten = markt.engines.filter(
    (e) => (bedrijf.perEngine[e]?.questionsTotal ?? 0) > 0 && vorige.perEngine[e],
  );
  if (gemeten.length >= 2) {
    const gedaald = gemeten.filter((e) => {
      const nu = bedrijf.perEngine[e];
      const toen = vorige.perEngine[e];
      const per = changeIsMeaningful(
        { score: nu.weightedShare * 100, stderr: nu.stderr * 100 },
        { score: toen.weightedShare * 100, stderr: toen.stderr * 100 },
      );
      return per.changed && per.delta < 0;
    });
    if (gedaald.length < 2) return null;
  }

  return { delta: Math.abs(oordeel.delta) / 100 };
}

/**
 * Bij welke intenties zit een gat, en welke vragen dragen dat?
 *
 * Drie voorwaarden, en alle drie moeten kloppen (plan type 3):
 *
 * 1. Er zijn genoeg vragen over die intentie om er iets over te zeggen. Bij drie
 *    vragen is "nul van de drie" nog toeval.
 * 2. Het bedrijf zit er ver onder zijn eigen gemiddelde. Overal 40% en bij één
 *    intentie 35% is geen gat maar ruis.
 * 3. **De eigen website beschrijft die dienst wel.** Dit is de voorwaarde die het
 *    type zijn scherpte geeft: het probleem is aantoonbaar niet dat de dienst
 *    ontbreekt. Zonder deze controle is het een verwijt in plaats van een kans.
 */
function intentGatLabels(bedrijf: BedrijfMeting, markt: MarktContext): string[] {
  const eigen = bedrijf.alle;
  if (eigen.questionsTotal === 0) return [];

  const uit: string[] = [];
  for (const [label, deel] of Object.entries(eigen.perIntent)) {
    if (deel.vragen < MIN_VRAGEN_PER_INTENTIE) continue;
    if (deel.share >= eigen.share * INTENT_GAP_FACTOR) continue;
    // Er moet in deze markt überhaupt iemand genoemd worden bij deze intentie,
    // anders is het geen gat van dit bedrijf maar een vraag die niemand raakt.
    if ((markt.gemiddeldePerIntent[label] ?? 0) <= 0) continue;
    if (!siteBeschrijftDienst(bedrijf, label)) continue;
    uit.push(label);
  }
  return uit;
}

function gatenLabels(bedrijf: BedrijfMeting, markt: MarktContext): string[] {
  return intentGatLabels(bedrijf, markt);
}

function gatCijfers(bedrijf: BedrijfMeting, markt: MarktContext): Record<string, number> {
  const labels = intentGatLabels(bedrijf, markt);
  const uit: Record<string, number> = {};
  for (const label of labels) {
    const deel = bedrijf.alle.perIntent[label];
    if (!deel) continue;
    uit[`${label}_vragen`] = deel.vragen;
    uit[`${label}_vermeldingen`] = deel.vermeldingen;
  }
  return uit;
}

/** De vraag-ids die bij de gaten horen. Leeg als er geen gaten zijn. */
function intentGaten(bedrijf: BedrijfMeting, markt: MarktContext): string[] {
  return intentGatLabels(bedrijf, markt).length > 0
    ? bedrijf.fragmenten.map((f) => f.questionId)
    : [];
}

/**
 * Beschrijft de eigen website deze dienst?
 *
 * Woordvergelijking en geen model: het intentielabel is kleingeschreven met
 * liggende streepjes (`aankoopbegeleiding`, `energielabel`), en de secties van de
 * crawl zijn stukjes URL-pad en paginatitels. Als een van de woorden uit het
 * label in een sectie voorkomt, beschrijft de site die dienst.
 *
 * ⚠️ Bewust streng aan de ONDERkant: geen match betekent geen intent gap. Dat
 * kost kansen die er misschien wel zijn, en dat is de goede kant om fout te
 * zitten. Een intent gap zónder die pagina is precies het verwijt dat het type
 * moet vermijden.
 */
export function siteBeschrijftDienst(bedrijf: BedrijfMeting, intentLabel: string): boolean {
  if (bedrijf.secties.length === 0) return false;
  const woorden = intentLabel
    .split(/[_\-\s]+/)
    .filter((w) => w.length >= 5);
  if (woorden.length === 0) return false;

  const tekst = bedrijf.secties.join(" ").toLowerCase();
  return woorden.some((w) => tekst.includes(w));
}

/**
 * Zet een antwoord dit bedrijf in de verkeerde plaats?
 *
 * De enige variant van type 5 die deterministisch te bewijzen is. Twee
 * voorwaarden, en allebei nodig:
 *
 * 1. We weten waar het bedrijf zit (uit de marktontdekking, niet uit een model).
 * 2. Het fragment noemt de plaats van de MARKT terwijl het bedrijf daar niet
 *    zit, of andersom.
 *
 * Zonder de eerste voorwaarde is er niets om tegen af te zetten, en dan is het
 * een vermoeden. Conventie 3: onbekend is een betere waarde dan een verkeerde.
 */
export function plaatsConflict(
  bedrijf: BedrijfMeting,
  markt: MarktContext,
): Fragment | null {
  const eigenPlaats = (bedrijf.plaats ?? "").trim().toLowerCase();
  const marktPlaats = markt.plaats.trim().toLowerCase();
  if (!eigenPlaats || !marktPlaats || eigenPlaats === marktPlaats) return null;

  // Het bedrijf zit ergens anders dan de markt, en het antwoord zet het in de
  // markt. Dat is precies "een verkeerde plaats" uit plan type 5.
  return (
    bedrijf.fragmenten.find(
      (f) =>
        f.snippet.toLowerCase().includes(marktPlaats) &&
        !f.snippet.toLowerCase().includes(eigenPlaats),
    ) ?? null
  );
}

/**
 * Valt het verschil tussen twee scores buiten de gecombineerde marge?
 *
 * ⚠️ Deze functie roept `changeIsMeaningful` uit `lib/stats/` aan in plaats van
 * zelf te vergelijken (plan 15.2, tweede vangnet). Twee plekken die "significant"
 * net anders rekenen, geven twee verschillende antwoorden op dezelfde vraag, en
 * één ervan belandt in een verkoopmail.
 */
export function buitenDeMarge(
  a: { score: number; stderr: number },
  b: { score: number; stderr: number },
): boolean {
  return changeIsMeaningful(
    { score: a.score * 100, stderr: a.stderr * 100 },
    { score: b.score * 100, stderr: b.stderr * 100 },
  ).changed;
}

/**
 * Welk type bepaalt de haak? (plan 12.1)
 *
 * De vaste volgorde uit `PRIMAIRE_VOLGORDE`, en niets anders. Geen score, geen
 * bewijsomvang, geen voorkeur van de verkoper: één volgorde die in code staat en
 * getest is, zodat twee bedrijven met dezelfde soort kans dezelfde soort mail
 * krijgen.
 */
export function kiesPrimair(kansen: Kans[]): Kans | null {
  for (const type of PRIMAIRE_VOLGORDE) {
    const gevonden = kansen.find((k) => k.type === type);
    if (gevonden) return gevonden;
  }
  return null;
}
