/**
 * Tone-of-voice-schuiven vertalen naar prompttaal (migratie 0045).
 *
 * Vier schuiven, 1-3, naar het voorbeeld van InSpace Nova's "Voice"-stap:
 * formality, energy, complexity, humor.
 * Waarom niet gewoon "3" naar het model sturen: een cijfer zonder context is
 * een gok voor een taalmodel, een woord ("informeel") is een instructie. Dit is
 * conventie 1 in zuivere vorm, het cijfer is de intentie van de klant, deze
 * module is de garantie dat het model iets leesbaars krijgt.
 *
 * Bewust ZONDER `server-only`: pure vertaling, geen database, testbaar vanuit
 * scripts/test-unit.ts, zelfde patroon als question-share.ts en period-change.ts.
 */

export type ToneSliderValue = 1 | 2 | 3 | null | undefined;

export interface ToneSliders {
  formality: ToneSliderValue;
  energy: ToneSliderValue;
  complexity: ToneSliderValue;
  humor: ToneSliderValue;
}

// Geëxporteerd (niet alleen intern gebruikt): het profielformulier toont
// dezelfde vier labels als knoptekst, zodat de UI en de schrijfprompt nooit
// uit elkaar kunnen lopen. Eén woordenlijst, twee gebruikers.
export const FORMALITY: Record<1 | 2 | 3, string> = {
  1: "informeel, je en jij, spreektaal",
  2: "gemiddeld formeel",
  3: "formeel, u en uw",
};

export const ENERGY: Record<1 | 2 | 3, string> = {
  1: "rustig en ingetogen",
  2: "gebalanceerd",
  3: "energiek en gedreven",
};

export const COMPLEXITY: Record<1 | 2 | 3, string> = {
  1: "eenvoudig, geen vakjargon, uitgelegd voor een leek",
  2: "toegankelijk voor een expert: vakjargon mag, licht toegelicht",
  3: "diepgaand expertniveau, vakjargon zonder uitleg",
};

export const HUMOR: Record<1 | 2 | 3, string> = {
  1: "geen humor",
  2: "af en toe een lichte, subtiele knipoog",
  3: "speels, met humor",
};

/**
 * Eén regel voor de schrijfprompt, of lege string als er niets ingesteld is.
 * Legt nooit vast wat een missende slider betekent: `tone_of_voice` (vrije
 * tekst) blijft dan de enige sturing, precies zoals vóór migratie 0045.
 */
export function describeToneSliders(sliders: ToneSliders): string {
  const parts: string[] = [];
  if (sliders.formality) parts.push(FORMALITY[sliders.formality]);
  if (sliders.energy) parts.push(ENERGY[sliders.energy]);
  if (sliders.complexity) parts.push(COMPLEXITY[sliders.complexity]);
  if (sliders.humor) parts.push(HUMOR[sliders.humor]);
  if (parts.length === 0) return "";
  return parts.join(", ");
}

/** Klemt een ruwe invoerwaarde (bv. uit een formulier) naar 1, 2, 3 of null. */
export function clampToneSlider(value: unknown): 1 | 2 | 3 | null {
  // Number("") is 0, geen NaN: een lege string moet expliciet als "niets
  // ingevuld" gelden, anders wordt een leeggemaakt veld stilzwijgend slider 1.
  if (value === "" || value === null || value === undefined) return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

/**
 * De emotionele lading (migratie 0048), de enige schuif met VIER standen:
 * neutraal, geruststellend, enthousiast, urgent. Nova heeft hem ook als enige
 * met vier (`emotional1` tot `emotional4`).
 *
 * Eigen functie en geen parameter op `clampToneSlider`: die is op tientallen
 * plekken in gebruik en zou met een optionele bovengrens stilzwijgend van
 * betekenis kunnen veranderen als iemand hem vergeet mee te geven.
 */
export function clampEmotional(value: unknown): 1 | 2 | 3 | 4 | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  if (n <= 1) return 1;
  if (n >= 4) return 4;
  return n as 2 | 3;
}

/**
 * De aanspreekvorm als promptregel
 * (contentronde-gasservice-brabant-1-september-2026.md, verbetering 11).
 *
 * ⚠️ `profiles.pronoun_preference` werd verzameld en was bewerkbaar, maar kwam
 * in de schrijfprompt nooit voor. Gemeten op 1 september 2026: het veld stond
 * voor Gasservice Brabant op "wij", en van twee pagina's uit dezelfde batch
 * schreef de ene "Leg vooraf uw adres, woningtype en bouwjaar klaar" en de
 * andere "of jouw woning". Twee aanspreekvormen bij één merk.
 *
 * De harde GEO-regel blijft onaangetast: over het BEDRIJF schrijven we de naam
 * en niet "wij", want een model dat "wij" leest weet niet wie het moet noemen.
 * Deze regel gaat over hoe de LEZER wordt aangesproken.
 */
export type Aanspreekvorm = "je" | "u" | "wij";

export interface AanspreekvormKeuze {
  vorm: Aanspreekvorm;
  /** Waar de keuze vandaan komt. Voor de logregel en voor het narekenen. */
  bron: "profiel" | "toon" | "bestaande pagina" | "standaard";
}

/**
 * Kies ALTIJD een aanspreekvorm (V2 uit contentkwaliteit-copywriterronde.md).
 *
 * ⚠️ `describePronoun` bestond al, maar schreef alleen een promptregel als
 * `profiles.pronoun_preference` gevuld was. Bij de twee klanten van de
 * benchmarkronde was dat niet zo, en het gevolg is geteld: over twaalf
 * pagina's 95 keer "je" naast 81 keer "u", bij ALLEBEI de klanten door elkaar,
 * en op de contactpagina van Fysio Centrum Utrecht slaat het binnen twee zinnen
 * om ("kun je rechtstreeks contact opnemen" gevolgd door "Wilt u meteen
 * boeken"). Zonder regel kiest het model per pagina opnieuw.
 *
 * Vier bronnen, in deze volgorde:
 *
 * 1. `profiel`           De klant koos zelf. Gaat altijd voor.
 * 2. `toon`              De formaliteitsschuif staat op 1 of 3, en die labels
 *                        noemen de vorm letterlijk ("informeel, je en jij" /
 *                        "formeel, u en uw"). Stand 2 zegt niets over de vorm
 *                        en telt hier dus niet mee.
 * 3. `bestaande pagina`  Wat er op de site van de klant zelf staat. Niet wat
 *                        hij zei, maar wat hij doet.
 * 4. `standaard`         Niets bekend: "u". Een ongevraagd "je" leest op een
 *                        zakelijke site als te amicaal, andersom is het hooguit
 *                        wat afstandelijk. En van de twee klanten die op
 *                        3 september gemeten zijn, schrijven ze allebei op hun
 *                        eigen site overwegend "u".
 */
export function kiesAanspreekvorm(input: {
  voorkeur?: string | null;
  formaliteit?: 1 | 2 | 3 | null;
  bestaandeTekst?: string | null;
}): AanspreekvormKeuze {
  const voorkeur = (input.voorkeur ?? "").trim();
  if (voorkeur === "je" || voorkeur === "u" || voorkeur === "wij") {
    return { vorm: voorkeur, bron: "profiel" };
  }

  if (input.formaliteit === 3) return { vorm: "u", bron: "toon" };
  if (input.formaliteit === 1) return { vorm: "je", bron: "toon" };

  const tekst = (input.bestaandeTekst ?? "").trim();
  if (tekst) {
    const { je, u } = telAanspreekvormen(tekst);
    // Een duidelijk verschil, geen nek-aan-nekrace: bij twee tegen drie zegt de
    // tekst niets en is de standaard eerlijker dan een muntje opgooien.
    if (je >= u * 2 && je >= 3) return { vorm: "je", bron: "bestaande pagina" };
    if (u >= je * 2 && u >= 3) return { vorm: "u", bron: "bestaande pagina" };
  }

  return { vorm: "u", bron: "standaard" };
}

/**
 * Tel beide aanspreekvormen in een tekst.
 *
 * Losse woorden, hoofdletterongevoelig. "u" en "je" zijn in het Nederlands
 * nauwelijks iets anders dan een aanspreekvorm, dus dit is nauwkeurig genoeg om
 * op te sturen, en het is te controleren door het zelf na te tellen.
 */
export function telAanspreekvormen(tekst: string): { je: number; u: number } {
  const veilig = tekst ?? "";
  return {
    je: (veilig.match(/\b(je|jij|jou|jouw)\b/gi) ?? []).length,
    u: (veilig.match(/\b(u|uw)\b/gi) ?? []).length,
  };
}

export function describePronoun(voorkeur: string | null | undefined): string {
  switch ((voorkeur ?? "").trim()) {
    case "je":
      return (
        "AANSPREEKVORM: spreek de lezer aan met 'je' en 'jouw'. Gebruik nergens 'u' of 'uw'."
      );
    case "u":
      return (
        "AANSPREEKVORM: spreek de lezer aan met 'u' en 'uw'. Gebruik nergens 'je', 'jij' of 'jouw'."
      );
    case "wij":
      return (
        "AANSPREEKVORM: spreek de lezer aan met 'je' en 'jouw', en schrijf over het bedrijf in de " +
        "wij-vorm waar een persoonlijke formulering nodig is. Blijf het bedrijf bij NAAM noemen " +
        "zodra je er iets feitelijks over zegt; 'wij' alleen is voor een AI-assistent onbruikbaar."
      );
    default:
      return "";
  }
}
