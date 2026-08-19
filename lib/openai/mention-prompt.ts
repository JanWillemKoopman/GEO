/**
 * De prompt voor halte 3b (mention-detectie), apart van de pijplijn.
 *
 * WAAROM APART: dit is de meest load-bearing prompt van het hele product, hij
 * bepaalt `mentioned`, `position`, `role` en `citedSources`, en dáár hangt
 * élk cijfer, élke gap en élke aanbeveling aan. Het evaluatiescript
 * (scripts/eval-mention.ts, optimalisatie.md 0.7) moet exact dezelfde prompt
 * testen als productie gebruikt. Zou het script een kopie bevatten, dan meet je
 * na de eerste promptwijziging iets anders dan er draait.
 *
 * Daarom heeft dit bestand bewust GEEN imports: geen `server-only`, geen
 * padaliassen, geen Supabase. Zo kan een standalone script het via een relatief
 * pad importeren zonder de Next.js-omgeving.
 */

export const MENTION_SYSTEM =
  "Je analyseert een AI-gegenereerd antwoord op vermeldingen van merken/bedrijven. Werk secuur en " +
  "feitelijk: baseer je uitsluitend op wat er daadwerkelijk in de tekst staat.";

export interface MentionPromptInput {
  /** Canonieke merknaam + onderwerp, bv. 'Golden Fingers (herenkapsel)'. */
  ownLabel: string;
  /** Andere schrijfwijzen die ook als het eigen merk tellen. */
  ownAliases: string[];
  /**
   * Gelijknamige partijen die het eigen merk juist NIET zijn (migratie 0060).
   *
   * De tegenhanger van `ownAliases`, en minstens zo belangrijk: zonder deze
   * lijst telt een vermelding van een gelijknamig bedrijf mee als de eigen
   * vermelding en valt de score te hoog uit. Dat is de vervelendste soort fout
   * in een meting, want hij ziet er goed uit. De lijst komt uit het gesprek, en
   * wordt voorgesteld door het verwarringblok van de kennistest.
   */
  ownExclusions?: string[];
  /** Het te beoordelen AI-antwoord. */
  rawResponse: string;
}

/**
 * PURE ONTDEKKING (migratie 0026). Deze prompt kreeg eerder een vooraf
 * gegenereerde concurrentenlijst mee, met de opdracht die namen expliciet te
 * beoordelen "ook als het antwoord ze niet noemt". Dat had twee kwalijke
 * gevolgen: elke vooraf bedachte naam kwam in élke meting terug (en dus met een
 * balk op 0% in de grafiek), en het model werd op díe namen gericht in plaats
 * van op wat er werkelijk stond.
 *
 * Nu wordt alleen het EIGEN merk expliciet uitgevraagd. Dat moet, want een
 * meting zonder eigen-merk-oordeel telt als onbeoordeeld en valt uit de score.
 * Alle andere merken komen uit de tekst zelf. Of zo'n merk een echte concurrent
 * is of een marktplaats/vergelijker, bepaalt de classificatie later
 * (lib/pipeline/classify-entities.ts), niet deze prompt.
 */
export function buildMentionUser(input: MentionPromptInput): string {
  const { ownLabel, ownAliases, ownExclusions = [], rawResponse } = input;
  return [
    `Eigen merk: ${ownLabel}`,
    ownAliases.length
      ? `Het eigen merk kan ook zo genoemd worden (tel deze als het EIGEN merk): ${ownAliases.join(", ")}`
      : "",
    ownExclusions.length
      ? `LET OP, deze partijen heten bijna hetzelfde maar zijn NIET het eigen merk ` +
        `(tel ze als een ander bedrijf): ${ownExclusions.join(", ")}`
      : "",
    "",
    "Doe twee dingen:",
    "",
    "1. Geef ALTIJD een oordeel over het EIGEN MERK hierboven, ook als het antwoord het niet noemt " +
      "(geef dan mentioned: false, position: null, role: null, citedSources: []). " +
      "Zet daarbij isOwnBrand op true.",
    "",
    "2. Voeg een aparte entiteit toe voor ELK ANDER merk, bedrijf, winkel, platform of organisatie " +
      "dat in het antwoord DAADWERKELIJK bij naam genoemd wordt, met isOwnBrand op false en " +
      "mentioned op true. Neem ze allemaal mee, ook webshops, marktplaatsen, vergelijkingssites, " +
      "brancheorganisaties en leveranciers; of ze een echte concurrent zijn wordt elders bepaald. " +
      "Verzin niets: een merk dat niet in de tekst staat, hoort er niet bij.",
    "",
    // R3: hoe PROMINENT staat een merk erin? Dit vervangt sentiment, dat in de
    // praktijk altijd 'neutral' opleverde. Het onderscheid dat er wél toe doet
    // is niet of er positief over je gesproken wordt, maar of je wordt
    // AANBEVOLEN of alleen genoemd.
    // De POSITIE stond al in het schema maar werd nergens uitgelegd. Gevolg: het
    // model wisselde tussen 0-based en 1-based en gaf zelfs -1 terug. Van de 521
    // vermeldingen in de eerste vijf analyses stonden er 215 op 0 en 2 op -1,
    // onbruikbaar als gemiddelde. Het veld werd nooit gebruikt, dus niemand zag
    // het. Sinds R3 telt het wél mee, dus staat de telling hier expliciet.
    "3. Geef de POSITIE als het hoeveelste merk dit in het antwoord genoemd wordt, " +
      "TELLEND VANAF 1: het eerst genoemde merk krijgt position 1, het tweede 2, enzovoort. " +
      "Gebruik nooit 0 of een negatief getal. Weet je het niet zeker, geef dan null.",
    "",
    "4. Geef per genoemd merk de ROL die het in dit antwoord speelt:",
    '   - "eerste_aanbeveling": wordt als eerste, beste of meest aanbevolen keuze gepresenteerd.',
    '   - "een_van_meerdere": staat in een rijtje gelijkwaardige opties, zonder voorkeur.',
    '   - "zijdelings": komt terloops voorbij (als voorbeeld, bron of context), niet als aanbeveling.',
    "   Bij twijfel tussen de eerste twee: kies een_van_meerdere. Alleen wie er echt uitspringt " +
      "krijgt eerste_aanbeveling. Merken die niet genoemd worden krijgen role: null.",
    "",
    "AI-antwoord om te analyseren:",
    '"""',
    rawResponse,
    '"""',
  ].join("\n");
}
