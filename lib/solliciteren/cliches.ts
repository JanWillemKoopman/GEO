/**
 * Het deterministische vangnet onder de belangrijkste promptinstructie:
 * "schrijf geen AI-taal" (conventie 1).
 *
 * ── WAAROM DIT BESTAAT ─────────────────────────────────────────────────────
 *
 * De systeemprompt draagt het model op om een handvol standaardzinnen te
 * vermijden. Een promptinstructie is een verzoek, geen garantie: hoe langer het
 * gesprek wordt en hoe meer vervolgaanwijzingen erbij komen, hoe vaker het
 * model terugvalt op wat het altijd schrijft. Dat merk je pas als de brief er
 * al uit is.
 *
 * Deze module telt het na. Niet door de tekst te veranderen, want dat is hier
 * juist verkeerd: de persoon die solliciteert bepaalt zelf of "met veel
 * enthousiasme" in zíjn brief een cliché is of gewoon waar. ORBIT ENGINE knipt
 * gedachtestreepjes wél automatisch weg (`lib/pipeline/dash-guard.ts`), want
 * daar gaat de tekst zonder tussenkomst naar de site van een klant. Hier kijkt
 * er altijd nog iemand naar, dus wijzen is genoeg en ingrijpen te veel.
 *
 * Pure module zonder `server-only` (conventie 2): het scherm draait hem op elk
 * binnengekomen antwoord, en `scripts/test-unit.ts` rekent hem na.
 */

export interface Clichevondst {
  /** Wat er letterlijk in de tekst staat, zoals de eerste keer dat het voorkwam. */
  gevonden: string;
  /** Hoe vaak. */
  aantal: number;
  /** Waarom dit opvalt, in één regel voor op het scherm. */
  waarom: string;
}

interface Clicheregel {
  patroon: RegExp;
  waarom: string;
}

/**
 * De lijst. Twee soorten regels staan er door elkaar heen en dat is met opzet:
 *
 * 1. **Standaardzinnen** die in vrijwel elke door AI geschreven brief staan.
 *    Ze zijn niet fout, ze zijn alleen door zoveel mensen tegelijk gebruikt dat
 *    een lezer ze herkent als niet-geschreven.
 * 2. **Twee leestekens**, het gedachtestreepje en de schuine streep in "en/of".
 *    Dit zijn de twee sterkste verklikkers en ze staan om die reden ook in
 *    `docs/schrijfstijl.md` §10 als harde regel voor het hoofdproduct.
 *
 * Een vondst is geen fout. Het scherm zegt dus "kijk hier nog even naar", niet
 * "dit mag niet".
 */
const REGELS: readonly Clicheregel[] = [
  {
    patroon: /\bin (?:een|de) (?:wereld|tijd|markt|branche) (?:waarin|die|waar)\b/gi,
    waarom: "Opening die niets zegt. Begin bij de vacature of bij jezelf.",
  },
  {
    patroon: /\bmet (?:veel|groot(?:e)?) (?:enthousiasme|interesse|belangstelling|plezier)\b/gi,
    waarom: "Staat in vrijwel elke sollicitatiebrief. Zeg liever waaróm.",
  },
  {
    patroon: /\bik ben ervan overtuigd dat\b/gi,
    waarom: "Vult ruimte. De zin erna is het punt, begin daar.",
  },
  {
    patroon: /\bspreekt mij (?:enorm |bijzonder |erg )?aan\b/gi,
    waarom: "Zegt dat je iets vindt, niet wat. Noem het onderdeel.",
  },
  {
    patroon: /\b(?:naadloos|perfect|uitstekend) (?:aansluit|aansluiten|past|passen|aansluitend)\b/gi,
    waarom: "Een claim zonder bewijs. Laat de overlap zien in plaats van hem te noemen.",
  },
  {
    patroon: /\bde? (?:ideale|perfecte) (?:kandidaat|match|aanvulling)\b/gi,
    waarom: "Dat oordeel is aan de lezer. Geef hem waar hij het mee kan vellen.",
  },
  {
    patroon: /\bbrengt? (?:mij|me) (?:de|een) (?:kans|mogelijkheid|gelegenheid)\b/gi,
    waarom: "Gaat over wat jij eruit haalt. De lezer zoekt wat hij eruit haalt.",
  },
  {
    patroon: /\b(?:een )?(?:echte |ware )?(?:teamspeler|doorzetter|aanpakker|duizendpoot)\b/gi,
    waarom: "Etiket zonder voorbeeld. Eén situatie vertelt meer.",
  },
  {
    patroon: /\bproactie(?:f|ve)\b/gi,
    waarom: "Staat in zoveel brieven dat een lezer er overheen leest.",
  },
  {
    patroon: /\bhands-on\b/gi,
    waarom: "Leenwoord dat overal op slaat en daardoor nergens.",
  },
  {
    patroon: /\bde juiste persoon op de juiste plek\b/gi,
    waarom: "Uitdrukking uit een personeelsadvertentie, niet uit een brief.",
  },
  {
    patroon: /\bik zie (?:er\s*)?(?:enorm |erg )?naar uit om\b/gi,
    waarom: "Afsluiting die iedereen gebruikt. Een concrete vervolgstap werkt beter.",
  },
  {
    patroon: /\bgraag licht ik (?:dit|een en ander|het bovenstaande) (?:persoonlijk |graag )?toe\b/gi,
    waarom: "Standaardslot. Zeg wat je in een gesprek zou laten zien.",
  },
  {
    patroon: /\bbovendien\b/gi,
    waarom: "Stapelwoord. Vaak staat er een opsomming achter die geen opsomming hoeft te zijn.",
  },
  {
    patroon: /\bmiddels\b/gi,
    waarom: "Ambtelijk. \"Met\" of \"via\" zegt hetzelfde.",
  },
  {
    patroon: /\bdiverse (?:werkzaamheden|taken|aspecten)\b/gi,
    waarom: "Vaag meervoud. Noem er twee die ertoe doen.",
  },
  {
    patroon: /[—–]/g,
    waarom:
      "Gedachtestreepje. Het sterkste teken dat een tekst uit een taalmodel komt. Knip de zin doormidden.",
  },
  {
    // Twee woorden met een schuine streep ertussen ("en/of", "product/dienst").
    // De blikken vooruit en achteruit houden webadressen en bestandspaden
    // erbuiten: in "linkedin.com/in/jan" staat voor "com" een punt en voor "in"
    // een schuine streep, en dan slaat de regel niet aan.
    patroon: /(?<![./\w])[a-zà-ÿ]{2,}\/[a-zà-ÿ]{2,}(?![./\w])/gi,
    waarom: "Schrijf de schuine streep voluit als \"en of\". Zo leest het als een formulier.",
  },
];

/**
 * Zoek de standaardzinnen in een tekst.
 *
 * Geeft de vondsten terug op volgorde van vaakst voorkomend, zodat het scherm
 * de bovenste drie kan tonen zonder zelf te hoeven sorteren.
 */
export function zoekCliches(tekst: string): Clichevondst[] {
  if (!tekst || !tekst.trim()) return [];

  const vondsten: Clichevondst[] = [];
  for (const regel of REGELS) {
    // Een nieuwe RegExp per aanroep: `lastIndex` van een globale RegExp blijft
    // anders staan tussen twee teksten door, en dan mist de tweede brief wat de
    // eerste wel vond. Dat is het soort fout dat alleen bij de tweede aanroep
    // opvalt en dus nooit.
    const zoeker = new RegExp(regel.patroon.source, regel.patroon.flags);
    const treffers = tekst.match(zoeker);
    if (!treffers || treffers.length === 0) continue;
    vondsten.push({
      gevonden: treffers[0].trim(),
      aantal: treffers.length,
      waarom: regel.waarom,
    });
  }

  return vondsten.sort((a, b) => b.aantal - a.aantal);
}

/** Hoeveel standaardzinnen staan er in totaal in? Eén getal voor boven de lijst. */
export function telCliches(tekst: string): number {
  return zoekCliches(tekst).reduce((som, v) => som + v.aantal, 0);
}
