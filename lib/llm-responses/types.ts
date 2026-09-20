/**
 * Gemini via DataForSEO als derde meetbron
 * (docs/tasks/vier-meetbronnen-en-ai-zoekvolume.md).
 *
 * ── WAT DIT IS, EN WAAROM ALLEEN GEMINI ─────────────────────────────────────
 *
 * DataForSEO's `llm_responses`-endpoint simuleert een echt gesprek met een
 * LLM inclusief web search, voor zowel ChatGPT als Gemini. De eigenaar heeft
 * op 20 september 2026 besloten alleen Gemini via deze weg toe te voegen: de
 * eigen ChatGPT-route bestaat al, en ChatGPT via DataForSEO kost meer dan de
 * eigen route voor hetzelfde soort antwoord. Gemini heeft geen eigen route
 * (`lib/engines/gemini.ts` wacht nog op een `GEMINI_API_KEY`), dus dit IS de
 * enige manier om Gemini's marktbeeld voor Nederland te meten.
 *
 * ── WAT ER GEMETEN IS VOORDAT DIT GEBOUWD WERD (hoofdstuk 6 van het plan) ────
 *
 *   • Van de 12 geteste Gemini-modellen zit geen enkele betrouwbaar onder de
 *     $0,03 per meting die het plan als grens stelde. De kosten wisselen per
 *     VRAAG, niet stabiel per model (gemiddeld $0,039 over 15 metingen).
 *   • De eigenaar accepteert die kosten expliciet (hoofdstuk 6.3): een goed
 *     beeld van de Nederlandse markt weegt zwaarder.
 *   • ⚠️ Gemini kent geen `web_search_country_iso_code`. Een lage score hier
 *     is niet uit elkaar te trekken in "merk niet genoemd" en "Gemini keek
 *     naar een ander land". Dat is precies waarom deze bron nooit het cijfer
 *     van de klant mag dragen (zie `PRIMARY_ENGINE`).
 *
 * ⚠️ **Het is geen engine in de zin van `lib/engines/types.ts`.** Diezelfde
 * reden als bij `lib/ai-overview/types.ts`: hier gaat het niet om een gewone
 * `EngineAdapter`-aanroep maar om een aparte pijplijnstap met eigen
 * faalgevallen. In de OPSLAG is het wél gewoon een bron naast de andere:
 * `tracking_runs.engine = 'dataforseo_gemini'`, en zo erft hij de hele
 * beoordelings- en aggregatieketen (`tracking_runs.engine` is vrije tekst).
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */

/** De engine-waarde waarmee deze bron in `tracking_runs` landt. */
export const LLM_RESPONSE_GEMINI_ENGINE = "dataforseo_gemini";

/**
 * Het model dat vastgezet is na de verificatie van 20 september 2026
 * (hoofdstuk 6.2 van het plan): geen van de 12 geteste modellen zat
 * betrouwbaar onder de kostengrens, dus is dit niet de goedkoopste losse
 * meting maar het model met het beste gemiddelde over meerdere vragen.
 *
 * In code en niet in een omgevingsvariabele (conventie 1 / open vraag in het
 * plan): een modelwissel hoort een commit te zijn, geen instelling die
 * stilletjes het meetresultaat verandert.
 */
export const LLM_RESPONSE_GEMINI_MODEL = "gemini-3.6-flash";

/**
 * Hoe vaak elke vraag gemeten wordt bij deze bron.
 *
 * Eén, niet drie zoals bij Google AI Overview (keuze 2 van de eigenaar,
 * hoofdstuk 1 van het plan). Bij $0,02 tot $0,065 per meting is drie keer
 * meten van dertig vragen al snel duurder dan de hele rest van de meetronde
 * samen. De prijs van die keuze: één losse uitkomst wiebelt (hoofdstuk 8 van
 * het plan), en dat is een geaccepteerd risico, geen bug.
 */
export const LLM_RESPONSE_REPEATS = 1;

/**
 * Hoe vaak een mislukte aanroep opnieuw geprobeerd wordt binnen één meting.
 *
 * Twee, zelfde orde als Google AI Overview. Nog niet nagemeten hoe vaak deze
 * aanroep de eerste keer al mislukt (dat gebeurt pas bij een echte meetronde,
 * zie hoofdstuk 9 van het plan), maar zonder herkansing zou elke tijdelijke
 * hik een vraag stilletjes uit de noemer van deze bron laten vallen.
 */
export const LLM_RESPONSE_POGINGEN = 2;

/**
 * Onder hoeveel tekens een antwoord geen meting is. Zelfde grens als
 * `measure.ts` en `measure-ai-overview.ts`: minder dan 40 tekens is geen
 * inhoudelijk antwoord, eerder een geweigerd of afgekapt antwoord.
 */
export const MIN_ANTWOORD_TEKENS = 40;

/**
 * Hoe een poging afliep. Drie uitkomsten, zelfde onderscheid als
 * `lib/ai-overview/types.ts`.
 *
 * `leeg` betekent: DataForSEO gaf een antwoord terug, maar dat antwoord was te
 * kort om een meting te zijn (conventie 3: een leeg antwoord is geen
 * nulscore). Nagemeten op 20 september 2026: dit gebeurde bij de eerste
 * verificatieronde op ALLE vijf testvragen, terwijl dezelfde vraag een tweede
 * keer wél een rijk antwoord gaf. Dus geen randgeval maar iets dat de code
 * moet kunnen opvangen zonder een vraag verkeerd te scoren.
 *
 * `mislukt` betekent: de aanroep zelf ging stuk (HTTP-fout, DataForSEO gaf een
 * foutstatus, of het gekozen model ondersteunt een van de velden niet).
 */
export type LlmResponseStatus = "gemeten" | "leeg" | "mislukt";

export interface LlmResponseResultaat {
  status: LlmResponseStatus;
  /** De tekst van het antwoord, zoals de beoordelaar hem te zien krijgt. Leeg tenzij `gemeten`. */
  tekst: string;
  /**
   * Hoeveel bronvermeldingen het antwoord meekreeg. Alleen het AANTAL is
   * nagemeten (20 september 2026); de vorm van één vermelding niet, dus wordt
   * hier geen domeinnaam uit gedestilleerd zoals bij Google AI Overview wél
   * kan (`lib/ai-overview/parse.ts`).
   */
  aantalBronvermeldingen: number;
  /** Wat deze aanroep werkelijk kostte, uit `money_spent` in de DataForSEO-respons. */
  kostenUsd: number;
  /** Waarom het niet lukte of leeg bleef, voor de logregel. Leeg bij succes. */
  melding: string | null;
}
