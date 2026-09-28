/**
 * WAT GING ER NAAR DE AI? De invoer van één aanroep, klaar voor `ai_calls.input_json`
 * (migratie 0112).
 *
 * ── WAAROM ──────────────────────────────────────────────────────────────────
 *
 * Tot 23 september 2026 bewaarde `ai_calls` het model, de tokens, de kosten en
 * het antwoord, maar niet de opdracht. Achteraf was dus te lezen WAT een stap
 * opleverde, maar niet WAAROM: welke systeemopdracht gold, welke gegevens er in
 * de gebruikersopdracht zaten, en met welke redeneerinspanning. Voor de
 * kwaliteitsdoorlichting (`docs/tasks/kwaliteitsdoorlichting-pijplijn.md`) is dat
 * het halve werk: een zwakke pagina is pas te verklaren als je ziet wat de
 * schrijver te lezen kreeg. Besluit van de eigenaar: altijd bewaren, niet alleen
 * voor een demo. Zelfde redenering als conventie 8 voor de uitvoer.
 *
 * Opslag, gemeten 23 september 2026: `ai_calls` was 5,5 MB. Een schrijfopdracht
 * is gemiddeld 22.853 invoertokens, ongeveer 90 KB; een meetvraag een paar
 * honderd bytes. Ruim te dragen.
 *
 * ── DE VINGERAFDRUK ─────────────────────────────────────────────────────────
 *
 * `promptHash` is een korte SHA-256 van de SYSTEEMopdracht alleen. De
 * gebruikersopdracht verschilt per aanroep (andere klant, andere pagina), de
 * systeemopdracht alleen als iemand de prompt in de code wijzigt. Twee rondes
 * met een verschillende hash bij dezelfde `kind` zijn dus met een andere prompt
 * gedraaid, en dat is precies wat je bij een voor-en-navergelijking wilt zien.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure functie, testbaar vanuit
 * `scripts/test-unit.ts`.
 */
import { createHash } from "node:crypto";

/** Wat een aanroepplek meegeeft over zijn invoer. Alles optioneel: onbekend is beter dan geraden. */
export interface AiCallInput {
  /** De systeemopdracht, letterlijk. */
  system?: string | null;
  /** De gebruikersopdracht, letterlijk: alle gegevens die het model te lezen kreeg. */
  user?: string | null;
  /** Naam van het uitvoerschema bij gestructureerde uitvoer. */
  schemaName?: string | null;
  /** Soort werk uit `lib/openai/sampling.ts`. */
  work?: string | null;
  /** De redeneerinspanning zoals hij werkelijk verstuurd is. */
  reasoningEffort?: string | null;
  /** De temperatuur zoals hij werkelijk verstuurd is; `null` = niet meegestuurd. */
  temperature?: number | null;
  /** Zoeken op het web aan of uit. */
  webSearch?: boolean;
  /**
   * Voor een bron die geen opdracht in tekst kent (DataForSEO, een losse
   * zoekvraag): het verzoek zoals het de deur uitging.
   */
  request?: unknown;
}

export interface InvoerOpname {
  inputJson: Record<string, unknown>;
  promptHash: string | null;
}

/** 16 hextekens: 64 bits, ruim genoeg om een handvol promptversies uit elkaar te houden. */
export function promptHash(system: string | null | undefined): string | null {
  if (!system) return null;
  return createHash("sha256").update(system).digest("hex").slice(0, 16);
}

/**
 * Zet de invoer om naar wat de database bewaart. Velden die de aanroepplek niet
 * kent, komen er als `null` in en niet als lege tekst: een lege opdracht en een
 * onbekende opdracht zijn niet hetzelfde (conventie 3).
 */
export function bouwInvoerOpname(input: AiCallInput | null | undefined): InvoerOpname | null {
  if (!input) return null;
  return {
    inputJson: {
      system: input.system ?? null,
      user: input.user ?? null,
      schemaName: input.schemaName ?? null,
      work: input.work ?? null,
      reasoningEffort: input.reasoningEffort ?? null,
      temperature: input.temperature ?? null,
      webSearch: input.webSearch ?? null,
      request: input.request === undefined ? null : input.request,
      tekensSysteem: input.system?.length ?? null,
      tekensGebruiker: input.user?.length ?? null,
    },
    promptHash: promptHash(input.system),
  };
}
