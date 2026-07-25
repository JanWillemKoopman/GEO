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
  /** Bekende concurrenten waarover expliciet een oordeel gevraagd wordt. */
  competitors: string[];
  /** Het te beoordelen AI-antwoord. */
  rawResponse: string;
}

export function buildMentionUser(input: MentionPromptInput): string {
  const { ownLabel, ownAliases, competitors, rawResponse } = input;
  return [
    `Eigen merk: ${ownLabel}`,
    ownAliases.length
      ? `Het eigen merk kan ook zo genoemd worden (tel deze als het EIGEN merk): ${ownAliases.join(", ")}`
      : "",
    competitors.length ? `Bekende concurrenten: ${competitors.join(", ")}` : "Bekende concurrenten: (geen bekend)",
    "",
    "Evalueer voor het EIGEN MERK en voor ELK van de bekende concurrenten hierboven expliciet of ze in " +
      "onderstaand antwoord genoemd worden — ook als het antwoord ze niet noemt (geef dan mentioned: false, " +
      'position: null, sentiment: "neutral", citedSources: []). Voeg daarnaast als aparte entiteiten eventuele ' +
      "andere merken toe die wél genoemd worden maar niet in de lijst hierboven staan.",
    "",
    "AI-antwoord om te analyseren:",
    '"""',
    rawResponse,
    '"""',
  ].join("\n");
}
