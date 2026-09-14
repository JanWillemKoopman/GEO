/**
 * Welke woorden uit de vacature niet in je CV staan.
 *
 * ── WAAROM DIT ZONDER AI GEBEURT ───────────────────────────────────────────
 *
 * De opdracht vroeg om het uitlichten van ATS-sleutelwoorden. Een ATS
 * (het systeem waar een werkgever binnengekomen brieven doorheen haalt) zoekt
 * op letterlijke woorden. Dat is tellen, en tellen hoort in code en niet in een
 * taalmodel: het kost hier niets, het antwoord is elke keer hetzelfde, en het is
 * na te rekenen. Conventie 2 en conventie 1 in één: het model mag er in het
 * gesprek van alles over zeggen, maar de lijst op het scherm komt hiervandaan.
 *
 * ── WAT HET WEL EN NIET IS ─────────────────────────────────────────────────
 *
 * Dit is woordvergelijking, geen begrip. "Leidinggeven" en "teamlead" tellen
 * hier als twee verschillende woorden, terwijl een mens ziet dat het hetzelfde
 * is. Het scherm zegt daarom "kijk of je hier iets mee kunt", niet "dit mist in
 * je CV". Een lijst die stellig klinkt en er soms naast zit, is erger dan een
 * lijst die zegt wat hij is.
 */

/**
 * Woorden die in elke Nederlandse tekst staan en dus nooit een sleutelwoord
 * zijn. Bewust met de hand samengesteld en kort gehouden: het gaat om woorden
 * die een vacaturetekst aan elkaar praten.
 */
const STOPWOORDEN = new Set([
  "aan", "achter", "alle", "alleen", "allemaal", "als", "altijd", "ander", "andere", "bent",
  "bepaalde", "beter", "bied", "bieden", "bij", "binnen", "daar", "daarbij", "daarnaast", "dan",
  "dat", "deze", "die", "dit", "doen", "door", "eens", "elke", "een", "eerst", "eerste", "elkaar",
  "en", "enkele", "ervaring", "ervoor", "functie", "gaan", "gaat", "geen", "genoeg", "goed",
  "goede", "graag", "haar", "hebben", "heeft", "heel", "hem", "het", "hier", "hij", "hun", "iets",
  "ieder", "iedere", "als", "jaar", "jij", "jou", "jouw", "juist", "kan", "kandidaat", "kom",
  "komen", "krijg", "krijgen", "kun", "kunnen", "kunt", "maar", "maken", "meer", "meest", "met",
  "mee", "mensen", "mijn", "moet", "moeten", "naar", "naast", "niet", "niets", "nieuwe", "nodig",
  "nog", "ons", "onze", "ook", "op", "over", "per", "plek", "samen", "sluit", "sollicitatie",
  "solliciteren", "staat", "steeds", "tot", "tussen", "uit", "van", "vanuit", "veel", "verder",
  "voor", "vooral", "waar", "waarbij", "waarin", "wat", "wel", "welke", "werk", "werken", "wij",
  "wil", "willen", "wordt", "worden", "zal", "zeer", "zelf", "zijn", "zoals", "zodat", "zoek",
  "zoeken", "zorg", "zorgen", "zowel", "onder", "onze", "hebt", "deze", "daarom", "omdat", "door",
  "vacature", "organisatie", "bedrijf", "team", "collega", "collega's", "week", "uur", "salaris",
]);

/** Hoe kort een woord mag zijn om nog mee te tellen. */
const MINIMALE_LENGTE = 4;

/**
 * Hoeveel woorden het scherm hoogstens laat zien. Meer is geen lijst meer maar
 * de vacature nog een keer.
 */
export const MAX_SLEUTELWOORDEN = 25;

export interface Sleutelwoord {
  woord: string;
  /** Hoe vaak het in de vacaturetekst staat. Vaker is belangrijker. */
  aantalInVacature: number;
  /** Staat het (of een variant erop) ook in het CV? */
  staatInCv: boolean;
}

/**
 * Splits tekst in losse woorden, kleine letters, zonder leestekens.
 * `\p{L}` en niet `[a-z]`: anders vallen "financiën" en "coördinator" uit elkaar.
 */
function splitsInWoorden(tekst: string): string[] {
  return (tekst.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(Boolean);
}

/**
 * Staat dit vacaturewoord in het CV?
 *
 * Niet alleen letterlijk: een CV schrijft "adviseurs" waar de vacature
 * "adviseur" zegt, en dat is dezelfde ervaring. Een CV-woord telt daarom mee
 * zodra het met het vacaturewoord begint, of andersom bij minstens vijf letters
 * overlap. Die ondergrens voorkomt dat "lead" op "leadership" én "leading" én
 * "leaderboard" gaat matchen.
 */
function komtVoorInCv(woord: string, cvWoorden: Set<string>): boolean {
  if (cvWoorden.has(woord)) return true;
  for (const cvWoord of cvWoorden) {
    if (cvWoord.startsWith(woord)) return true;
    if (woord.length >= 5 && woord.startsWith(cvWoord) && cvWoord.length >= 5) return true;
  }
  return false;
}

/**
 * De sleutelwoorden uit de vacature, met per woord of het CV het al noemt.
 *
 * Gesorteerd op: eerst wat mist, dan wat het vaakst in de vacature staat. De
 * ontbrekende woorden zijn waar iemand iets aan heeft.
 */
export function vergelijkSleutelwoorden(vacature: string, cv: string): Sleutelwoord[] {
  if (!vacature || !vacature.trim()) return [];

  const cvWoorden = new Set(splitsInWoorden(cv));

  const tellingen = new Map<string, number>();
  for (const woord of splitsInWoorden(vacature)) {
    if (woord.length < MINIMALE_LENGTE) continue;
    if (STOPWOORDEN.has(woord)) continue;
    // Een los getal ("2026", "40") is geen sleutelwoord.
    if (/^\p{N}+$/u.test(woord)) continue;
    tellingen.set(woord, (tellingen.get(woord) ?? 0) + 1);
  }

  const lijst: Sleutelwoord[] = [...tellingen.entries()].map(([woord, aantal]) => ({
    woord,
    aantalInVacature: aantal,
    staatInCv: komtVoorInCv(woord, cvWoorden),
  }));

  return lijst
    .sort((a, b) => {
      if (a.staatInCv !== b.staatInCv) return a.staatInCv ? 1 : -1;
      if (b.aantalInVacature !== a.aantalInVacature) return b.aantalInVacature - a.aantalInVacature;
      return a.woord.localeCompare(b.woord, "nl");
    })
    .slice(0, MAX_SLEUTELWOORDEN);
}

/**
 * Hoeveel procent van de sleutelwoorden uit de vacature het CV al noemt.
 *
 * `null` en geen 0 als er niets te vergelijken valt (conventie 3): een leeg CV
 * en een CV dat nul woorden deelt zijn twee verschillende dingen, en 0% naast
 * een leeg veld zetten leest als een oordeel dat er niet is.
 */
export function dekkingspercentage(vacature: string, cv: string): number | null {
  if (!vacature.trim() || !cv.trim()) return null;
  const lijst = vergelijkSleutelwoorden(vacature, cv);
  if (lijst.length === 0) return null;
  const raak = lijst.filter((s) => s.staatInCv).length;
  return Math.round((raak / lijst.length) * 100);
}
