/**
 * Tekst in stukken knippen: woorden, zinnen, alinea's.
 *
 * Eén eigenaar voor het knipwerk, omdat drie modules van het zijproject
 * hetzelfde nodig hebben en op elkaars uitkomst rekenen: de
 * sleutelwoordvergelijking, de stemmeting en de cliché-controle. Zouden ze elk
 * hun eigen splitsing hebben, dan telt de een 14 woorden per zin waar de ander
 * er 16 telt, en dan klopt geen enkel getal op het scherm meer met elkaar.
 *
 * Pure module zonder `server-only` (conventie 2): alles hieronder draait ook in
 * de browser, terwijl je typt, en wordt nagerekend in `scripts/test-unit.ts`.
 */

/**
 * Gewone Nederlandse woorden die in elke tekst staan en dus nooit iets
 * kenmerkends zijn. Bewust met de hand samengesteld en kort gehouden: dit is
 * de algemene lijst, en wie een lijst nodig heeft die op vacatureteksten is
 * toegesneden, vult hem aan bij zichzelf in plaats van hier.
 */
export const STOPWOORDEN: ReadonlySet<string> = new Set([
  "aan", "achter", "alle", "allemaal", "alleen", "als", "altijd", "ander", "andere", "bent",
  "bepaalde", "beter", "bij", "binnen", "daar", "daarbij", "daarna", "daarnaast", "daarom", "dan",
  "dat", "deze", "die", "dit", "doen", "door", "eens", "eerst", "eerste", "elkaar", "elke", "een",
  "enkele", "ervoor", "gaan", "gaat", "geen", "genoeg", "goed", "goede", "graag", "haar", "hebben",
  "hebt", "heeft", "heel", "hem", "het", "hier", "hij", "hun", "iets", "ieder", "iedere", "jaar",
  "jij", "jou", "jouw", "juist", "kan", "kom", "komen", "krijg", "krijgen", "kun", "kunnen", "kunt",
  "maar", "maken", "meer", "meest", "mee", "met", "mijn", "moet", "moeten", "naar", "naast", "niet",
  "niets", "nieuwe", "nodig", "nog", "omdat", "onder", "ons", "onze", "ook", "over", "per", "samen",
  "staat", "steeds", "tot", "tussen", "uit", "van", "vanuit", "veel", "verder", "voor", "vooral",
  "waar", "waarbij", "waarin", "wat", "wel", "welke", "wij", "wil", "willen", "wordt", "worden",
  "zal", "zeer", "zelf", "zijn", "zoals", "zodat", "zoek", "zoeken", "zowel",
]);

/**
 * Tekst in losse woorden, kleine letters, zonder leestekens.
 *
 * `\p{L}` en niet `[a-z]`: anders vallen "financiën" en "coördinator" middenin
 * uit elkaar en tellen ze als twee woorden.
 */
export function splitsInWoorden(tekst: string): string[] {
  return (tekst.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(Boolean);
}

/**
 * Tekst in zinnen.
 *
 * ⚠️ Dit is knippen op leestekens en geen taalkunde. "bijv." en "dhr." breken
 * een zin hier ten onrechte af, en 3,5 blijft juist wel heel omdat er geen
 * spatie achter de komma staat. Voor waar dit voor gebruikt wordt, het meten
 * van gemiddelde zinslengte over een paar honderd zinnen, valt dat in het niet;
 * voor het aanwijzen van één specifieke zin zou het te grof zijn. Vandaar dat
 * `lib/solliciteren/stem.ts` gemiddelden toont en geen losse zinnen aanwijst.
 */
export function splitsInZinnen(tekst: string): string[] {
  return tekst
    .split(/(?<=[.!?])\s+/)
    .map((zin) => zin.trim())
    .filter((zin) => zin.length > 0 && /\p{L}/u.test(zin));
}

/** Tekst in alinea's: een lege regel is de scheiding. */
export function splitsInAlineas(tekst: string): string[] {
  return tekst
    .split(/\n\s*\n/)
    .map((stuk) => stuk.trim())
    .filter((stuk) => stuk.length > 0);
}

/** Het aantal woorden in een tekst, met dezelfde telling als overal elders. */
export function telWoorden(tekst: string): number {
  return splitsInWoorden(tekst).length;
}
