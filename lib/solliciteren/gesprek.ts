import "server-only";

/**
 * De enige plek waar de sollicitatieassistent OpenAI aanroept.
 *
 * ── WAAROM DIT NIET DOOR `lib/openai/structured.ts` LOOPT ──────────────────
 *
 * Die helper doet één ding heel goed: een aanroep met een Zod-schema eromheen,
 * die pas terugkomt als het hele antwoord er is, met de uitkomst in vaste
 * velden. Dat is precies wat de pijplijn van ORBIT ENGINE nodig heeft en precies
 * wat een gesprek niet nodig heeft. Hier is de uitvoer vrije tekst en moet hij
 * woord voor woord op het scherm komen, want een brief van 400 woorden duurt
 * tientallen seconden en een leeg scherm leest als een app die hangt.
 *
 * Wat wél gedeeld wordt, en dat is het deel dat ertoe doet: dezelfde SDK-client
 * met dezelfde sleutel (`lib/openai/client.ts`) en dezelfde kostenberekening
 * (`lib/openai/pricing.ts`). Zo staat er geen tweede tarieventabel in de app.
 *
 * ── DE AANROEP WORDT NIET IN `ai_calls` GEZET ──────────────────────────────
 *
 * Dat is een keuze en geen omissie. `ai_calls` is de kostenboekhouding van het
 * werk dat voor een KLANT gedaan wordt: elke rij hangt aan een merk, een
 * meetronde of een pagina, en daar worden de dagplafonds uit migratie 0089 op
 * gerekend. Een sollicitatiebrief van de eigenaar hoort in geen van die
 * sommen thuis, en hem er stilletjes bij zetten zou het budget van een klant
 * laten oplopen door iets wat die klant niet heeft gevraagd. De kosten van dit
 * zijproject staan per bericht in `sollicitatie_berichten.cost_usd`, met
 * dezelfde rekensom.
 */
import { getOpenAI } from "@/lib/openai/client";
import { estimateCostUsd } from "@/lib/openai/pricing";
import type { Aanroepparameters } from "@/lib/solliciteren/modellen";
import {
  bouwInvoer,
  type Bronteksten,
  type Gespreksbericht,
} from "@/lib/solliciteren/prompt";

export type { Gespreksbericht };

/**
 * Het tijdbudget van één antwoord.
 *
 * Bewust NIET `CALL_BUDGET_MS` (150s) uit `lib/openai/client.ts`. Dat getal is
 * afgestemd op de rekensom van de jobwachtrij: een zware taak plus zijn
 * kritiekaanroep moeten samen binnen de 300 seconden van de werkerroute passen.
 * Deze route is geen taak in die wachtrij en deelt zijn tijd met niemand.
 *
 * 240 seconden past binnen de `maxDuration = 300` van de route, met genoeg
 * marge om het afgekapte antwoord nog op te slaan in plaats van het platform de
 * functie halverwege te laten afknippen. Dat laatste is het verschil tussen een
 * brief die half op het scherm blijft staan en een brief die verdwijnt.
 */
const GESPREK_BUDGET_MS = 240_000;

/**
 * Hoe groot een ruwe response hoogstens mag zijn voordat we hem laten liggen.
 *
 * Conventie 8 wil de volledige ruwe JSON naast de uitgesplitste kolommen. Bij
 * een redeneermodel op stand `hoog` zitten daar de redeneerblokken in, en die
 * lopen in de tientallen kilobytes per bericht. 256 KB is ruim boven een normaal
 * antwoord en ver onder de grens waarop de tabel onwerkbaar wordt. Wordt hij
 * groter, dan bewaren we de vindplaats en niet de inhoud: dan is de rij nog
 * steeds na te trekken bij OpenAI zelf via het response-id.
 */
const MAX_RAW_BYTES = 256 * 1024;

export interface AntwoordResultaat {
  /** De volledige tekst, ook als de verbinding halverwege wegviel. */
  tekst: string;
  responseId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Geschatte kosten in USD, met dezelfde tabel als de rest van de app. */
  costUsd: number;
  /** De ruwe response, of een verwijzing als hij te groot was (conventie 8). */
  raw: unknown;
}

/**
 * Vraagt het antwoord op en geeft het woord voor woord door aan `onDelta`.
 *
 * Gooit alleen als er geen enkel woord is binnengekomen. Valt de verbinding
 * halverwege weg, dan komt de tekst terug die er wél was: een halve brief is
 * voor de schrijver meer waard dan een foutmelding, en de aanroep is toch al
 * betaald.
 */
export async function streamAntwoord(opts: {
  bron: Bronteksten;
  historie: readonly Gespreksbericht[];
  vraag: string;
  parameters: Aanroepparameters;
  onDelta: (stukje: string) => void;
}): Promise<AntwoordResultaat> {
  const openai = getOpenAI();
  const invoer = bouwInvoer({ bron: opts.bron, historie: opts.historie, vraag: opts.vraag });

  const stream = await openai.responses.create(
    {
      model: opts.parameters.model,
      input: invoer,
      temperature: opts.parameters.temperature,
      // Dezelfde cast als in `lib/openai/structured.ts`: de vastgezette SDK
      // (openai 4.104) kent alleen low/medium/high, terwijl GPT-5.6 ook `none`
      // accepteert. De waarde gaat ongewijzigd de HTTP-body in, dus dit is een
      // typegat en geen gedrag.
      reasoning: opts.parameters.reasoningEffort
        ? ({ effort: opts.parameters.reasoningEffort } as never)
        : undefined,
      stream: true,
    },
    { signal: AbortSignal.timeout(GESPREK_BUDGET_MS) },
  );

  let tekst = "";
  let responseId: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let raw: unknown = null;

  try {
    for await (const gebeurtenis of stream) {
      if (gebeurtenis.type === "response.output_text.delta") {
        tekst += gebeurtenis.delta;
        opts.onDelta(gebeurtenis.delta);
        continue;
      }
      if (gebeurtenis.type === "response.completed") {
        const response = gebeurtenis.response;
        responseId = response.id ?? null;
        inputTokens = response.usage?.input_tokens ?? null;
        outputTokens = response.usage?.output_tokens ?? null;
        raw = bewaarbaar(response);
      }
    }
  } catch (err) {
    // Niets binnengekregen betekent dat de aanroep zelf mislukt is; dat hoort de
    // route te melden. Wel iets binnengekregen betekent dat de brief er deels
    // is, en dan is doorgaan met wat er staat het juiste antwoord.
    if (!tekst) throw err;
  }

  return {
    tekst,
    responseId,
    inputTokens,
    outputTokens,
    costUsd: estimateCostUsd({
      model: opts.parameters.model,
      inputTokens,
      outputTokens,
      // Dit scherm zoekt niet op het web. Zou dat er ooit bij komen, dan hoort
      // deze vlag mee te bewegen, anders klopt het bedrag niet meer.
      webSearch: false,
    }),
    raw,
  };
}

/** Past de ruwe response in de kolom, of laat een verwijzing achter. */
function bewaarbaar(response: { id?: string | null }): unknown {
  try {
    const json = JSON.stringify(response);
    if (json.length <= MAX_RAW_BYTES) return JSON.parse(json);
    return {
      afgekapt: true,
      reden: `De ruwe response was ${json.length} bytes, meer dan de ${MAX_RAW_BYTES} die we bewaren.`,
      response_id: response.id ?? null,
    };
  } catch {
    return null;
  }
}
