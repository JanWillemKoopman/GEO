/**
 * Staat dit getal, dit jaartal, deze naam ergens in je materiaal?
 *
 * ── WAAROM DEZE CONTROLE ER IS, EN WAAROM HIJ NIETS VERBIEDT ───────────────
 *
 * Tot 15 september 2026 stond de feitenkaart in de prompt als GESLOTEN lijst:
 * alles wat er niet op stond mocht de brief niet beweren. Dat patroon komt uit
 * `lib/pipeline/factcard.ts` en hoort daar thuis, want die tekst gaat zonder
 * tussenkomst naar de site van een klant. Hier leest de schrijver elke brief na
 * en is hij zelf het onderwerp, dus de grens kocht weinig en kostte veel: wat de
 * uitleesronde miste was voor de brief weg, en een model dat per zin moet
 * verantwoorden schrijft vlakker.
 *
 * Deze module doet hetzelfde werk aan de andere kant. Het model schrijft vrij
 * uit het volledige dossier; achteraf wordt opgezocht of de CONTROLEERBARE
 * details ook echt ergens staan. Verbieden vooraf kost creativiteit, aanwijzen
 * achteraf kost niets.
 *
 * ── WAAROM JUIST GETALLEN EN NAMEN ─────────────────────────────────────────
 *
 * Dat is de categorie die misgaat. Een model verzint zelden een houding, het
 * verzint een cijfer: een omzetstijging, een teamgrootte, een jaartal, een
 * werkgever. Precies die twee soorten zijn woordelijk op te zoeken, en een
 * bewering als "ik werk graag in een team" is dat niet. Wat deze module niet
 * kan, kan een mens wel, en die leest de brief toch.
 *
 * ── DE AANHEF EN DE ONDERTEKENING TELLEN NIET MEE ──────────────────────────
 *
 * Nagekeken op een proefbrief op 15 september 2026: de controle wees vier namen
 * aan, en dat waren "De Vries" uit de aanhef en "Jan Willem Koopman" uit de
 * ondertekening. Allebei terecht in de zin dat ze niet in het dossier staan, en
 * allebei volstrekt nutteloos: je eigen naam staat zelden in je eigen CV-tekst,
 * en de naam van de ontvanger typ je zelf. Vier valse treffers op een goede
 * brief is genoeg om de hele controle weg te klikken, en dan vangt hij ook het
 * verzonnen bedrag niet meer. Vandaar dat de begroeting en alles vanaf de
 * afsluiting buiten de naamcontrole vallen. Getallen worden er wél geteld: een
 * jaartal in een ondertekening is ongewoon genoeg om naar te kijken.
 *
 * ── WAT HIJ NIET VINDT, EN DAT HOORT OP HET SCHERM ─────────────────────────
 *
 * Een getal dat voluit geschreven staat ("van negen naar vijf dagen") wordt niet
 * gevonden, want het staat als woord in de brief en misschien als cijfer in het
 * dossier, of andersom. Een lijst die belooft alles te vinden is gevaarlijker
 * dan een lijst die zegt wat hij doet, dus zegt het scherm het erbij.
 *
 * Pure module zonder `server-only` (conventie 2): draait in de browser op elk
 * binnengekomen antwoord, kost niets, en wordt nagerekend in
 * `scripts/test-unit.ts`.
 */
import { splitsInZinnen } from "@/lib/solliciteren/woorden";

export interface Onvindbaar {
  soort: "getal" | "naam";
  /** Wat er in de brief staat. */
  waarde: string;
  /** De zin eromheen, zodat je meteen ziet waar het over gaat. */
  zin: string;
}

/**
 * Hoeveel er hoogstens aangewezen wordt. Boven de acht is het geen aanwijzing
 * meer maar een tweede brief, en dan leest niemand hem.
 */
export const MAX_ONVINDBAAR = 8;

/**
 * Woorden die met een hoofdletter beginnen zonder een naam te zijn. Zonder deze
 * lijst wijst de controle bij elke brief "Geachte" en "Met" aan, en dan klikt
 * iemand hem na twee keer weg.
 */
const GEEN_NAAM = new Set([
  "de", "het", "een", "ik", "mijn", "u", "uw", "je", "jouw", "wij", "ons", "onze", "hij", "zij",
  "geachte", "heer", "mevrouw", "beste", "met", "vriendelijke", "groet", "hoogachtend", "betreft",
  "bijlage", "curriculum", "vitae", "nederlands", "engels", "duits", "maandag", "dinsdag",
  "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag", "januari", "februari", "maart",
  "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december",
  "dat", "dit", "die", "deze", "daarom", "daarnaast", "toen", "nu", "ook", "als", "in", "bij",
  "voor", "na", "van", "op", "om", "en", "maar", "want", "dus", "zo", "wat", "waar", "hoe",
  "graag", "kort", "eerst", "sinds", "tijdens", "samen", "door", "tot", "uit", "over", "onder",
]);

/**
 * Waar de ondertekening begint. Alles daarna telt niet mee voor de
 * naamcontrole, want daar staat per definitie je eigen naam.
 */
const AFSLUITINGEN = [
  "met vriendelijke groet",
  "met hartelijke groet",
  "hoogachtend",
  "met de meeste hoogachting",
];

/** Waar de begroeting mee begint. Die regel telt niet mee voor de naamcontrole. */
const BEGROETINGEN = ["geachte", "beste", "aan "];

/**
 * Knipt de aanhef en de ondertekening eraf, voor de naamcontrole.
 *
 * Geeft de tekst terug zonder die twee stukken. Vindt hij ze niet, dan komt de
 * hele brief terug: liever één naam te veel aangewezen dan de helft van de
 * brief stilzwijgend overslaan.
 */
export function zonderAanhefEnOndertekening(brief: string): string {
  const regels = brief.split("\n");

  const eersteInhoud = regels.findIndex((r) => r.trim().length > 0);
  if (eersteInhoud >= 0) {
    const eerste = regels[eersteInhoud].trim().toLowerCase();
    if (BEGROETINGEN.some((b) => eerste.startsWith(b))) regels[eersteInhoud] = "";
  }

  const afsluiting = regels.findIndex((r) => {
    const klein = r.trim().toLowerCase();
    return AFSLUITINGEN.some((a) => klein.startsWith(a));
  });

  return (afsluiting >= 0 ? regels.slice(0, afsluiting) : regels).join("\n");
}

/** Kleine letters, leestekens weg, meerdere spaties tot één. */
function normaliseer(tekst: string): string {
  return tekst.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Getallen los van hun scheidingstekens, zodat "40.000" en "40000" hetzelfde
 * getal zijn, en "€ 2.500,-" en "2500" ook.
 */
function kaleGetallen(tekst: string): string[] {
  return (tekst.match(/\d[\d.,]*/g) ?? [])
    .map((g) => g.replace(/[.,]/g, "").replace(/^0+(?=\d)/, ""))
    .filter((g) => g.length > 0);
}

/**
 * Legt een geschreven brief naast het bronmateriaal.
 *
 * `bronnen` is alles wat er ligt: het dossier én de vacature. De vacature hoort
 * erbij, want de naam van het bedrijf en de functietitel komen daarvandaan en
 * zijn geen verzinsel.
 */
export function zoekOnvindbaar(brief: string, bronnen: string): Onvindbaar[] {
  if (!brief.trim() || !bronnen.trim()) return [];

  const bronTekst = normaliseer(bronnen);
  const bronGetallen = new Set(kaleGetallen(bronnen));
  const gevonden: Onvindbaar[] = [];
  const gezien = new Set<string>();

  // Namen worden alleen in de romp gezocht. Zie de toelichting bovenaan.
  const romp = new Set(splitsInZinnen(zonderAanhefEnOndertekening(brief)));

  for (const zin of splitsInZinnen(brief)) {
    // ── Getallen ────────────────────────────────────────────────────────
    for (const ruw of zin.match(/\d[\d.,]*/g) ?? []) {
      const kaal = ruw.replace(/[.,]/g, "").replace(/^0+(?=\d)/, "");
      if (!kaal) continue;
      // Eén cijfer is bijna altijd een opsomming of een spelling ("in 3 jaar"
      // tegenover "3 monteurs") en levert te veel loos alarm.
      if (kaal.length < 2) continue;
      if (bronGetallen.has(kaal)) continue;
      if (gezien.has(`getal:${kaal}`)) continue;
      gezien.add(`getal:${kaal}`);
      gevonden.push({ soort: "getal", waarde: ruw, zin });
    }

    // ── Namen ───────────────────────────────────────────────────────────
    //
    // Alleen woorden met een hoofdletter die NIET aan het begin van de zin
    // staan: daar is een hoofdletter gewoon interpunctie en zegt hij niets.
    // En alleen in de romp, niet in de aanhef of de ondertekening.
    if (!romp.has(zin)) continue;
    const woorden = zin.split(/\s+/);
    for (let i = 1; i < woorden.length; i += 1) {
      const woord = woorden[i].replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      if (woord.length < 3) continue;
      if (!/^\p{Lu}/u.test(woord)) continue;
      if (GEEN_NAAM.has(woord.toLowerCase())) continue;
      if (bronTekst.includes(woord.toLowerCase())) continue;
      if (gezien.has(`naam:${woord.toLowerCase()}`)) continue;
      gezien.add(`naam:${woord.toLowerCase()}`);
      gevonden.push({ soort: "naam", waarde: woord, zin });
    }

    if (gevonden.length >= MAX_ONVINDBAAR) break;
  }

  return gevonden.slice(0, MAX_ONVINDBAAR);
}
