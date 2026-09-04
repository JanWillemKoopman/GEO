/**
 * DE FAQ ONDER EEN PAGINA (optimalisatie 9 uit
 * `docs/tasks/optimalisaties-expertronde-4-september-2026.md`).
 *
 * ── WAAROM HIER NOG NOOIT NAAR GEKEKEN IS ───────────────────────────────────
 *
 * Tien van de twaalf pagina's van 3 september 2026 hebben acht
 * vraag-en-antwoordblokken onderaan, de andere twee hebben er twee. Sommige zijn
 * een woordelijke kopie van een sectie die twintig regels hoger staat. Geen
 * enkele controle keek ernaar: `content-coverage.ts` telt de FAQ mee als DEKKING
 * (een deelvraag die in de FAQ beantwoord wordt, telt), en dat is precies de
 * reden dat een pagina die zichzelf herhaalt beter scoorde dan een die dat niet
 * deed.
 *
 * De externe copywriter, regel 16: een FAQ is geen vervanging voor een goed
 * verhaal. En zijn ondergrens 3: als vrijwel iedere alinea antwoord geeft op een
 * losse vraag, ontbreekt waarschijnlijk een verhaal.
 *
 * ── WAT DEZE MODULE MEET ────────────────────────────────────────────────────
 *
 * Eén ding, en niet de kwaliteit van de vragen: OVERLAPT dit antwoord met de
 * tekst erboven? Zo ja, dan is het blok geen aanvulling maar een herhaling, en
 * dan maakt het de pagina langer zonder hem completer te maken.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

/**
 * Vanaf welke woordoverlap een FAQ-antwoord een herhaling is.
 *
 * 0,7, en dus strenger dan de 0,6 waarmee `claimMatchesSentence()` en de
 * bewijspunten werken. Reden: daar is de vraag "heeft de schrijver deze zin
 * opgeschreven", en een herformulering telt daar terecht mee. Hier is de vraag
 * "staat dit er al", en twee antwoorden die 60 procent van hun woorden delen
 * kunnen nog steeds twee verschillende dingen zeggen. Bij 0,7 blijft er weinig
 * anders over dan dezelfde zin met andere voegwoorden.
 *
 * ⚠️ Gekozen en niet geijkt: er is geen reeks waarop dit getal gemeten is. Zodra
 * er een ronde ligt hoort de spreiding hier in het commentaar te staan, net als
 * bij de drempels van 3 september.
 */
export const FAQ_OVERLAP_MAX = 0.7;

/** Woorden die niets onderscheiden, zelfde lijst als in `bewijspunten.ts`. */
const STOPWOORDEN = new Set([
  "de", "het", "een", "en", "of", "van", "voor", "met", "in", "op", "te", "dat", "die", "is",
  "zijn", "wordt", "worden", "u", "uw", "je", "jouw", "we", "wij", "ons", "onze", "er", "bij",
  "aan", "naar", "als", "ook", "niet", "geen", "dan", "maar", "om", "over", "tot", "wat", "wie",
  "hoe", "kan", "kunt", "heeft", "hebben", "bent", "ben", "dit", "deze", "zo", "nog", "al", "per",
]);

function inhoudsWoorden(tekst: string): string[] {
  return (tekst ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9àâéèêëîïôûùüÿç\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWOORDEN.has(w));
}

/** Welk deel van de woorden uit dit antwoord staat al in de tekst erboven? */
export function overlapMetBody(antwoord: string, body: string): number {
  const woorden = inhoudsWoorden(antwoord);
  if (woorden.length === 0) return 0;
  const boven = new Set(inhoudsWoorden(body));
  const gevonden = woorden.filter((w) => boven.has(w)).length;
  return gevonden / woorden.length;
}

export interface FaqResult {
  /** Hoeveel blokken er staan. */
  aantal: number;
  /** De vragen waarvan het antwoord al boven de tekst staat. */
  herhalingen: string[];
  issues: string[];
}

/**
 * Rekent de FAQ na.
 *
 * `maxBlokken` komt uit het kwaliteitsprofiel van het paginatype: bij een
 * FAQ-pagina zijn de vragen het product en gelden andere getallen, dus dat
 * oordeel hoort niet in deze module maar bij het profiel.
 */
export function checkFaqBlokken(input: {
  faq: readonly { q: string; a: string }[];
  bodyMarkdown: string;
  /** Bij een FAQ-pagina staat de inhoud juist in de vragen: dan geen oordeel. */
  isFaqPagina: boolean;
}): FaqResult {
  const faq = (input.faq ?? []).filter((f) => f?.q?.trim() && f?.a?.trim());
  if (input.isFaqPagina || faq.length === 0) {
    return { aantal: faq.length, herhalingen: [], issues: [] };
  }

  const herhalingen = faq
    .filter((f) => overlapMetBody(f.a, input.bodyMarkdown) >= FAQ_OVERLAP_MAX)
    .map((f) => f.q.trim());

  const issues: string[] = [];

  // Meer dan de helft herhaalt: dan is de FAQ geen aanvulling meer maar een
  // tweede versie van de pagina. Onder die helft is een enkele herhaling
  // verdedigbaar, want een lezer die naar beneden scrolt mag zijn antwoord daar
  // ook vinden.
  if (herhalingen.length > 0 && herhalingen.length * 2 > faq.length) {
    issues.push(
      `${herhalingen.length} van de ${faq.length} vragen onderaan herhalen wat er in de tekst ` +
        `erboven al staat, waaronder "${herhalingen[0]}". Een vraag-en-antwoordblok hoort iets toe ` +
        `te voegen; laat de herhalingen weg of vervang ze door vragen die de tekst nog niet ` +
        `beantwoordt.`,
    );
  }

  return { aantal: faq.length, herhalingen, issues };
}
