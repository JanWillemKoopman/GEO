/**
 * De prompt voor halte 3b (mention-detectie), apart van de pijplijn.
 *
 * WAAROM APART: dit is de meest load-bearing prompt van het hele product — hij
 * bepaalt `mentioned`, `position`, `sentiment` en `citedSources`, en dáár hangt
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
 * Nu wordt alleen het EIGEN merk expliciet uitgevraagd — dat moet, want een
 * meting zonder eigen-merk-oordeel telt als onbeoordeeld en valt uit de score.
 * Alle andere merken komen uit de tekst zelf. Of zo'n merk een echte concurrent
 * is of een marktplaats/vergelijker, bepaalt de classificatie later
 * (lib/pipeline/classify-entities.ts) — niet deze prompt.
 */
export function buildMentionUser(input: MentionPromptInput): string {
  const { ownLabel, ownAliases, rawResponse } = input;
  return [
    `Eigen merk: ${ownLabel}`,
    ownAliases.length
      ? `Het eigen merk kan ook zo genoemd worden (tel deze als het EIGEN merk): ${ownAliases.join(", ")}`
      : "",
    "",
    "Doe twee dingen:",
    "",
    "1. Geef ALTIJD een oordeel over het EIGEN MERK hierboven, ook als het antwoord het niet noemt " +
      '(geef dan mentioned: false, position: null, sentiment: "neutral", citedSources: []). ' +
      "Zet daarbij isOwnBrand op true.",
    "",
    "2. Voeg een aparte entiteit toe voor ELK ANDER merk, bedrijf, winkel, platform of organisatie " +
      "dat in het antwoord DAADWERKELIJK bij naam genoemd wordt, met isOwnBrand op false en " +
      "mentioned op true. Neem ze allemaal mee — ook webshops, marktplaatsen, vergelijkingssites, " +
      "brancheorganisaties en leveranciers; of ze een echte concurrent zijn wordt elders bepaald. " +
      "Verzin niets: een merk dat niet in de tekst staat, hoort er niet bij.",
    "",
    "AI-antwoord om te analyseren:",
    '"""',
    rawResponse,
    '"""',
  ].join("\n");
}
