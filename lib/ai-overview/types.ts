/**
 * Google AI Overview als derde meetbron.
 *
 * ── WAT DIT IS, EN WAT HET NADRUKKELIJK NIET IS ─────────────────────────────
 *
 * Een AI Overview is het antwoord dat Google zelf bovenaan de zoekresultaten
 * zet, vóór de blauwe links. Hij noemt concrete bedrijven met hun eigen site
 * als bron, en is dus op dezelfde manier meetbaar als een ChatGPT-antwoord.
 *
 * ⚠️ **Het is geen engine in de zin van `lib/engines/types.ts`.** Die interface
 * verwacht een gesprek: een systeemprompt en een gebruikersvraag. Hier gaat een
 * zoekopdracht naar een zoekmachine en komt een resultatenpagina terug. Erin
 * wringen zou de betekenis breken die `EngineAdapter` expliciet vastlegt.
 *
 * In de OPSLAG is het wél gewoon een bron naast de andere: `tracking_runs` krijgt
 * `engine = 'google_ai_overview'`, en daarmee erft deze bron de hele
 * beoordelings- en aggregatieketen. Die twee dingen, hoe je het ophaalt en wat
 * voor soort antwoord het is, zijn niet hetzelfde, en dat onderscheid is de hele
 * reden dat deze map bestaat naast `lib/engines/`.
 *
 * ── WAT ER GEMETEN IS VOORDAT DIT GEBOUWD WERD ──────────────────────────────
 *
 * Alle 90 vragen van Van den Udenhout, twee volledige rondes, 20 september 2026
 * (docs/tasks/ai-overview-als-tweede-meetbron.md hoofdstuk 3):
 *
 *   • 91% van de geslaagde aanroepen levert een bruikbare AI Overview op
 *   • $0,0037 per geslaagde aanroep, tegen $0,017 voor een ChatGPT-meting
 *   • bijna een derde mislukt bij de eerste poging, en zo'n mislukking kost
 *     tóch $0,002
 *   • ⚠️ en hij is NIET stabieler dan ChatGPT: van de 28 vragen waar het merk
 *     ooit genoemd werd wisselde de uitkomst bij 17 tussen twee rondes een half
 *     uur na elkaar
 *
 * Dat laatste bepaalt het ontwerp: deze bron wordt vanaf dag één met
 * herhalingen gemeten, want de prijs is de enige reden dat hij de moeite is.
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */

/** De engine-waarde waarmee deze bron in `tracking_runs` landt. */
export const AI_OVERVIEW_ENGINE = "google_ai_overview";

/**
 * Hoe een poging afliep. Drie uitkomsten, en het verschil tussen de laatste
 * twee is wezenlijk.
 *
 * `geen_overview` betekent: Google toonde er geen. Dat is een NIET-METING, geen
 * nulscore (conventie 3). Er wordt niets opgeslagen, en de vraag telt die ronde
 * niet mee in de noemer van deze bron. Zou je hem als "merk niet genoemd"
 * wegschrijven, dan zakt de score van een merk doordat Google geen antwoord gaf,
 * en dat is een cijfer dat liegt.
 *
 * `mislukt` betekent: de aanroep zelf ging stuk. Ook geen meting, maar wel iets
 * om opnieuw te proberen.
 */
export type AiOverviewStatus = "gemeten" | "geen_overview" | "mislukt";

export interface AiOverviewResultaat {
  status: AiOverviewStatus;
  /** De tekst van het overzicht, zoals de beoordelaar hem te zien krijgt. Leeg tenzij `gemeten`. */
  tekst: string;
  /** De domeinen die Google bij dit overzicht aanhaalde. */
  bronnen: string[];
  /** Wat deze aanroep kostte, ook als hij mislukte: een mislukking kost $0,002. */
  kostenUsd: number;
  /** Waarom het niet lukte, voor de logregel. Leeg bij succes. */
  melding: string | null;
}

/**
 * Hoe vaak elke vraag gemeten wordt bij deze bron.
 *
 * Drie, en niet één. De meting van 20 september 2026 liet zien dat één losse
 * uitkomst ongeveer een muntworp is: 17 van de 28 vragen gaven een andere
 * uitkomst bij een tweede ronde een half uur later. Bij $0,0037 per aanroep
 * kost drie keer meten van dertig vragen ongeveer $0,38, nog steeds de helft van
 * één ChatGPT-ronde ($0,76). De prijs is de enige reden dat deze bron de moeite
 * is, en die prijs wordt hier uitgegeven aan zekerheid.
 *
 * `shareByRun()` in de aggregatie zorgt dat die drie metingen samen precies één
 * vraag wegen, en niet drie.
 */
export const AI_OVERVIEW_REPEATS = 3;

/**
 * Hoe vaak een mislukte aanroep opnieuw geprobeerd wordt binnen één meting.
 *
 * Eén keer. Bijna een derde van de aanroepen geeft `40101 Internal SE Server
 * Error` bij de eerste poging, en in de meting van 20 september slaagden alle 54
 * herkansingen. Meer dan één herkansing hier zou de kosten opdrijven zonder
 * bewijs dat het helpt; blijft het misgaan, dan pakt de takenlaag het later op.
 */
export const AI_OVERVIEW_POGINGEN = 2;
