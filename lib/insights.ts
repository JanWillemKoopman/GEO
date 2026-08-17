/**
 * Drie zinnen: wat er deze periode gebeurde, en wat de volgende stap is.
 *
 * ── WAAROM DIT GEEN AI-AANROEP IS ───────────────────────────────────────────
 *
 * `docs/Nova.md` §7 fase 6 noemt dit "Nova insights". De verleiding is om er een
 * model op te zetten, maar de drie zinnen die ertoe doen volgen rechtstreeks uit
 * cijfers die er al staan: is de score veranderd, is dat verschil groter dan de
 * ruis, en wat ligt er open. Een model zou daar taal omheen verzinnen en soms
 * iets anders concluderen dan de cijfers zeggen. Conventie 1 in zijn zuiverste
 * vorm: dit hoort een garantie te zijn, geen intentie.
 *
 * ── DE RUIS IS HIER DE HOOFDREGEL ───────────────────────────────────────────
 *
 * ⚠️ Met 30 gemeten vragen is de drempel voor "er is écht iets veranderd" zo'n
 * 23 punten (`lib/stats/uncertainty.ts`). Bij Fysi-Unique ging de score van 18
 * naar 36 naar 38: die eerste sprong van 18 punten ziet eruit als een
 * verdubbeling en valt tóch binnen de ruis. Een zin als "je zichtbaarheid is
 * verdubbeld" zou daar een leugen zijn met een grafiekje eromheen.
 *
 * Puur, dus testbaar (conventie 2).
 */
import { changeIsMeaningful } from "@/lib/stats/uncertainty";

export interface InsightInput {
  /** De scores per periode, oplopend. Leeg = nog nooit gemeten. */
  scores: { period: number; score: number; stderr: number }[];
  /** Hoeveel pagina's er deze maand live gingen. */
  gepubliceerdDezeMaand: number;
  /** Hoeveel er geschreven klaarstaan maar nog niet live zijn. */
  klaarOmTePubliceren: number;
  /** Hoeveel kansen er openstaan (`lib/opportunities.ts`). */
  openKansen: number;
  /** Blokkeert de site AI-crawlers? Dat overstemt alles. */
  crawlerBlocked: boolean;
}

export interface Insight {
  /** De zin zelf. */
  text: string;
  /** `goed` kleurt groen, `let_op` oranje, `neutraal` grijs. */
  toon: "goed" | "let_op" | "neutraal";
}

/**
 * Precies drie zinnen: wat er gebeurde, wat dat betekent, wat de volgende stap
 * is. Nooit meer, want een lijstje van zeven leest niemand, en nooit minder,
 * want dan zou het blok soms verdwijnen.
 */
export function insights(input: InsightInput): Insight[] {
  return [watGebeurde(input), watDatBetekent(input), wateNu(input)];
}

function watGebeurde(input: InsightInput): Insight {
  const s = input.scores;
  if (s.length === 0) {
    return { text: "Er is nog geen meting gedaan, dus er valt nog niets te vergelijken.", toon: "neutraal" };
  }
  if (s.length === 1) {
    return {
      text: `De eerste meting staat op ${Math.round(s[0].score)} van de 100. Dat is het startpunt waartegen alles hierna wordt afgezet.`,
      toon: "neutraal",
    };
  }

  const laatste = s[s.length - 1];
  const vorige = s[s.length - 2];
  const verschil = changeIsMeaningful(laatste, vorige);

  if (!verschil.changed) {
    return {
      // ⚠️ Het getal noemen én zeggen dat het ruis is. Alleen "gelijk gebleven"
      // zonder cijfer voelt als iets verzwijgen; alleen het cijfer zonder de
      // drempel is een belofte die de volgende meting kan breken.
      text: `Je zichtbaarheid ging van ${Math.round(vorige.score)} naar ${Math.round(laatste.score)}. Dat verschil is kleiner dan de meetonzekerheid van ${verschil.threshold} punten, dus het telt als gelijk gebleven.`,
      toon: "neutraal",
    };
  }

  return {
    text:
      verschil.delta > 0
        ? `Je zichtbaarheid steeg van ${Math.round(vorige.score)} naar ${Math.round(laatste.score)}. Dat is meer dan de meetonzekerheid, dus dit is een echte stijging.`
        : `Je zichtbaarheid daalde van ${Math.round(vorige.score)} naar ${Math.round(laatste.score)}. Dat is meer dan de meetonzekerheid, dus dit is een echte daling.`,
    toon: verschil.delta > 0 ? "goed" : "let_op",
  };
}

function watDatBetekent(input: InsightInput): Insight {
  if (input.crawlerBlocked) {
    return {
      // Dit overstemt alles: zolang de crawler eruit ligt, is de rest theorie.
      text: "AI-assistenten kunnen je site op dit moment niet lezen. Zolang dat zo is, kan geen enkele pagina die ORBIT ENGINE schrijft je zichtbaarheid verbeteren.",
      toon: "let_op",
    };
  }
  if (input.gepubliceerdDezeMaand > 0) {
    return {
      text:
        input.gepubliceerdDezeMaand === 1
          ? "Er ging deze maand één pagina live. Het effect daarvan is over ongeveer een maand meetbaar."
          : `Er gingen deze maand ${input.gepubliceerdDezeMaand} pagina's live. Het effect daarvan is over ongeveer een maand meetbaar.`,
      toon: "goed",
    };
  }
  if (input.klaarOmTePubliceren > 0) {
    return {
      text:
        input.klaarOmTePubliceren === 1
          ? "Er staat één geschreven pagina klaar die nog niet online is. Zolang hij niet gepubliceerd is, kan geen enkele AI-assistent hem vinden."
          : `Er staan ${input.klaarOmTePubliceren} geschreven pagina's klaar die nog niet online zijn. Zolang ze niet gepubliceerd zijn, kan geen enkele AI-assistent ze vinden.`,
      toon: "let_op",
    };
  }
  return {
    text: "Er ging deze maand niets nieuws live, dus de meting weerspiegelt nog de situatie van daarvoor.",
    toon: "neutraal",
  };
}

function wateNu(input: InsightInput): Insight {
  if (input.crawlerBlocked) {
    return { text: "Begin bij de techniek: geef de AI-crawlers toegang in robots.txt.", toon: "let_op" };
  }
  if (input.klaarOmTePubliceren > 0) {
    return { text: "Zet de pagina's die klaarstaan online en markeer ze als geplaatst.", toon: "let_op" };
  }
  if (input.openKansen > 0) {
    return {
      text:
        input.openKansen === 1
          ? "Er staat één kans open. Die vind je hieronder, met de handeling erbij."
          : `Er staan ${input.openKansen} kansen open. Die vind je hieronder, gesorteerd op wat ze opleveren.`,
      toon: "neutraal",
    };
  }
  return { text: "Er staat niets open. De volgende meetronde draait vanzelf.", toon: "goed" };
}
