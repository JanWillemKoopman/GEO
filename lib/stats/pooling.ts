/**
 * Eén cijfer uit meerdere meetrondes, in plaats van uit de laatste ronde alleen.
 *
 * ── HET PROBLEEM ────────────────────────────────────────────────────────────
 *
 * Nagemeten op 20 september 2026 (docs/logbook.md 20 september (3)): een
 * vermelding is per vraag ongeveer een muntworp. Van de 11 vragen die binnen
 * dezelfde ronde drie keer gemeten werden en waar het merk ooit genoemd werd,
 * gaven er 6 een andere uitkomst bij de herhaling. Minuten na elkaar, zonder dat
 * er iets veranderd was.
 *
 * De onzekerheidsband rond één ronde (`lib/stats/uncertainty.ts`) zegt dat ook
 * eerlijk: bij 30 vragen is hij ±16 punten. Maar het hoofdgetal bovenaan het
 * scherm is één getal uit één ronde, en dat leest een klant als een stand. Meet
 * je een maand later opnieuw, dan verschuift dat getal binnen zijn eigen band en
 * denkt hij dat er iets gebeurd is.
 *
 * ── DE OPLOSSING, EN WAT HIJ KOST ───────────────────────────────────────────
 *
 * Meerdere rondes samenvoegen tot één schatting. De band zakt met de wortel uit
 * het aantal rondes: drie rondes samen geven een band die ongeveer 1,7 keer
 * smaller is dan één ronde. Dat kost **geen enkele extra meting**, want die
 * rondes zijn al gedaan en al betaald.
 *
 * ── ⚠️ DE VALKUIL, EN HOE DIE HIER DICHTGETIMMERD IS ────────────────────────
 *
 * Samenvoegen gaat ervan uit dat de rondes hetzelfde meten. Is de zichtbaarheid
 * écht gestegen, bijvoorbeeld doordat er een pagina gepubliceerd is, dan zou
 * blind middelen die stijging uitsmeren over drie rondes en de klant zijn
 * verdiende winst afpakken. Dat is precies het omgekeerde van wat dit product
 * moet doen.
 *
 * Vandaar: **we stoppen met samenvoegen zodra een oudere ronde betekenisvol
 * afwijkt van de nieuwste.** Die grens wordt niet hier bedacht maar opgehaald
 * bij `changeIsMeaningful()`, dezelfde functie die elders bepaalt of een pijltje
 * getoond mag worden. Eén feit, één eigenaar: als die drempel ooit verandert,
 * verandert deze module vanzelf mee.
 *
 * Gevolg in gewone taal: rustige maanden worden samengevoegd tot een steeds
 * zekerder cijfer, en zodra er echt iets gebeurt begint de teller opnieuw bij de
 * ronde waarin dat gebeurde.
 *
 * Bewust ZONDER `server-only`: pure rekenkunde, testbaar vanuit
 * `scripts/test-unit.ts` (conventie 2), en ook in de browser bruikbaar.
 */
import { changeIsMeaningful } from "@/lib/stats/uncertainty";

/** Eén meetronde, zoals `visibility_scores` hem oplevert. */
export interface PeriodEstimate {
  /** 0 tot 100. */
  score: number;
  /** Standaardfout in PROCENTPUNTEN, zelfde eenheid als uncertainty.ts. */
  stderr: number;
}

export interface PooledEstimate {
  /** De samengevoegde schatting, 0 tot 100. */
  score: number;
  /** De standaardfout daarvan, in procentpunten. Kleiner naarmate er meer rondes in zitten. */
  stderr: number;
  /** Hoeveel rondes er daadwerkelijk zijn samengevoegd. 1 betekent: alleen de laatste. */
  rounds: number;
}

/**
 * Hoeveel rondes er hoogstens worden samengevoegd.
 *
 * Drie en niet meer. Bij een maandelijkse cadans is dat een kwartaal, en dat is
 * de langste periode waarover je nog kunt volhouden dat het over "nu" gaat. De
 * winst neemt bovendien af met de wortel: van 1 naar 3 rondes scheelt 42% in de
 * band, van 3 naar 6 nog maar 29% daarbovenop.
 */
export const MAX_POOLED_ROUNDS = 3;

/** Op 2 decimalen, zoals de kolommen in de database (numeric(5,2)). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Voeg de laatste rondes samen tot één schatting.
 *
 * `periods` staat OUD naar NIEUW, zoals de app ze uit de database leest. Er
 * wordt achteraan begonnen.
 *
 * Geeft `null` bij een lege lijst. Bij één ronde komt die ronde er onveranderd
 * uit, met `rounds: 1`, zodat een nieuwe klant exact ziet wat hij nu ook ziet.
 */
export function poolRecent(
  periods: PeriodEstimate[],
  maxRounds: number = MAX_POOLED_ROUNDS,
): PooledEstimate | null {
  if (periods.length === 0) return null;

  const nieuwste = periods[periods.length - 1];
  const mee: PeriodEstimate[] = [nieuwste];

  // Terug in de tijd, tot de grens of tot een ronde die echt anders was.
  for (let i = periods.length - 2; i >= 0 && mee.length < Math.max(1, maxRounds); i--) {
    const ouder = periods[i];
    if (changeIsMeaningful(nieuwste, ouder).changed) break;
    mee.push(ouder);
  }

  return poolAll(mee);
}

/**
 * De eigenlijke samenvoeging: wegen naar zekerheid (inverse variantie).
 *
 * Een ronde met een smalle band weegt zwaarder dan een ronde met een brede,
 * want die weet meer. Dat is de standaardmanier om metingen van hetzelfde ding
 * te combineren, en hij valt netjes terug op het gewone gemiddelde zodra alle
 * rondes even zeker zijn.
 *
 * Rondes met een standaardfout van 0 of minder doen niet mee aan de weging: die
 * zouden oneindig zwaar wegen. In de praktijk komt dat niet voor, want
 * `binomialStderr()` geeft door zijn plus-vier-correctie nooit 0 bij een
 * werkelijke meting. Blijft er zo niets over, dan geven we de nieuwste ronde
 * onveranderd terug in plaats van een verzonnen getal (conventie 3).
 */
function poolAll(rondes: PeriodEstimate[]): PooledEstimate {
  const bruikbaar = rondes.filter((r) => r.stderr > 0);

  // ⚠️ Altijd afgerond, ook bij één ronde (21 september 2026). `visibility_scores`
  // bewaart de score met volle precisie ("22.232558139534884"), en dat getal
  // ging tot vandaag ongerond door naar het scherm zodra er niets samen te
  // voegen viel. Overal elders in de app staat een percentage al heel; hier
  // hoort het niet anders te zijn.
  if (bruikbaar.length === 0) {
    return { score: Math.round(rondes[0].score), stderr: 0, rounds: 1 };
  }
  if (bruikbaar.length === 1) {
    return { score: Math.round(bruikbaar[0].score), stderr: round2(bruikbaar[0].stderr), rounds: 1 };
  }

  const gewichten = bruikbaar.map((r) => 1 / (r.stderr * r.stderr));
  const somGewicht = gewichten.reduce((s, w) => s + w, 0);
  const somScore = bruikbaar.reduce((s, r, i) => s + r.score * gewichten[i], 0);

  return {
    score: Math.round(somScore / somGewicht),
    stderr: round2(Math.sqrt(1 / somGewicht)),
    rounds: bruikbaar.length,
  };
}

/**
 * Wat er onder het hoofdgetal komt te staan.
 *
 * Bewust niet "gemiddelde van 3 metingen": dat klinkt als een afzwakking van het
 * echte cijfer. Het is het tegenovergestelde, het is het zekerste cijfer dat we
 * hebben, en de zin hoort dat te zeggen.
 */
export function describePooled(pooled: PooledEstimate): string {
  if (pooled.rounds <= 1) return "Gebaseerd op de laatste meting.";
  return `Gebaseerd op de laatste ${pooled.rounds} metingen samen, daardoor zekerder dan één losse meting.`;
}
