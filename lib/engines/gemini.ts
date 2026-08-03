import "server-only";

/**
 * Gemini als tweede engine (docs/tasks/onboarding-2.0.md, blok E).
 *
 * ── STATUS: GEBOUWD, NOG NOOIT AANGEROEPEN ──────────────────────────────────
 *
 * Er is nog geen `GEMINI_API_KEY`. Deze adapter is geschreven zodat hij werkt
 * zodra die er is, zónder codewijziging elders: `registry.ts` neemt hem pas op
 * als de sleutel bestaat, en tot dan draait alles precies zoals het draaide.
 *
 * Dat is een bewuste keuze en geen vooruitlopen. De alternatieven waren: de
 * meetlaag nu al per engine bouwen zonder tweede engine (dan is de abstractie
 * niet getoetst), of wachten tot de sleutel er is (dan moet de hele meetketen
 * later alsnog open). Zo staat de bedrading er, gedraagt de app zich ongewijzigd,
 * en is aanzetten een kwestie van één omgevingsvariabele.
 *
 * ⚠️ **Wat er bij het aanzetten nagerekend moet worden**, want dit is geschreven
 * zonder ooit een echt antwoord gezien te hebben:
 *
 *   1. De tarieven in `lib/openai/pricing.ts`. Tot die er staan valt Gemini op
 *      `FALLBACK_RATE` en overschat de kostenregistratie — de veilige kant, maar
 *      geen meetwaarde.
 *   2. Of `google_search` als tool daadwerkelijk zo heet in de versie van de API
 *      die dan geldt.
 *   3. De doorlooptijd, tegen `HEAVY_JOB_RESERVE_MS` in lib/jobs/worker.ts.
 *
 * ── GEEN SDK ────────────────────────────────────────────────────────────────
 *
 * Bewust rechtstreeks over HTTP in plaats van `@google/genai`. Eén afhankelijkheid
 * minder, en de REST-vorm van deze API is klein genoeg om te overzien. Zodra we
 * meer dan generateContent nodig hebben is een SDK het overwegen waard.
 */
import { z } from "zod";
import { logAiCall } from "@/lib/openai/ledger";
import { estimateCostUsd } from "@/lib/openai/pricing";
import type {
  EngineAdapter,
  EngineCallResult,
  EnginePlainOptions,
  EngineStructuredOptions,
  EngineStructuredResult,
} from "@/lib/engines/types";

/** Zelfde orde als de OpenAI-kant (lib/openai/client.ts) zodat de werker klopt. */
const TIMEOUT_MS = 100_000;

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-3-pro";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: GeminiUsage;
  responseId?: string;
}

function textOf(response: GeminiResponse): string {
  return (response.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

async function call(
  apiKey: string,
  body: Record<string, unknown>,
  model: string,
): Promise<GeminiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini gaf ${res.status}: ${detail.slice(0, 300)}`);
    }
    return (await res.json()) as GeminiResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Zet een Zod-schema om naar het JSON-Schema-dialect dat Gemini accepteert.
 *
 * Bewust met de hand en niet met `zod-to-json-schema`: Gemini kent maar een
 * kleine deelverzameling (geen `$ref`, geen `oneOf`, geen `additionalProperties`)
 * en een volledige omzetter produceert precies de constructies die hij weigert.
 * De schema's in `lib/schemas/` gebruiken alleen object, array, string, number,
 * boolean en enum — dat is wat hieronder staat.
 */
export function zodToGeminiSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const def = schema._def as { typeName?: string } & Record<string, unknown>;

  switch (def.typeName) {
    case "ZodObject": {
      const shape = (schema as unknown as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToGeminiSchema(value as z.ZodTypeAny);
      }
      return { type: "OBJECT", properties, required: Object.keys(properties) };
    }
    case "ZodArray":
      return { type: "ARRAY", items: zodToGeminiSchema(def.type as z.ZodTypeAny) };
    case "ZodEnum":
      return { type: "STRING", enum: def.values as string[] };
    case "ZodNumber":
      return { type: "NUMBER" };
    case "ZodBoolean":
      return { type: "BOOLEAN" };
    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
      return zodToGeminiSchema(def.innerType as z.ZodTypeAny);
    default:
      return { type: "STRING" };
  }
}

export function createGeminiEngine(apiKey: string | null): EngineAdapter {
  const model = DEFAULT_MODEL;

  function guard(): string {
    if (!apiKey) {
      throw new Error(
        "Gemini is aangevraagd maar er is geen GEMINI_API_KEY. Dit hoort niet te kunnen: " +
          "availableEngines() filtert engines zonder sleutel eruit.",
      );
    }
    return apiKey;
  }

  async function record(
    response: GeminiResponse,
    webSearch: boolean,
    meta: EnginePlainOptions["meta"],
  ) {
    const usage = response.usageMetadata ?? {};
    const inputTokens = usage.promptTokenCount ?? null;
    const outputTokens = usage.candidatesTokenCount ?? null;
    const costUsd = estimateCostUsd({ model, inputTokens, outputTokens, webSearch });
    if (meta) {
      await logAiCall({ ...meta, engine: "gemini" }, {
        model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null,
        webSearch,
        costUsd,
        responseId: response.responseId ?? null,
      });
    }
    return { responseId: response.responseId ?? null, inputTokens, outputTokens, costUsd };
  }

  return {
    info: {
      id: "gemini",
      label: "Gemini",
      available: Boolean(apiKey),
      supportsWebSearch: true,
    },

    async callPlain(opts: EnginePlainOptions): Promise<EngineCallResult> {
      const key = guard();
      const response = await call(
        key,
        {
          systemInstruction: { parts: [{ text: opts.system }] },
          contents: [{ role: "user", parts: [{ text: opts.user }] }],
          // Net als bij OpenAI: geen temperatuur, geen redeneerinstelling. We
          // meten wat de assistent op standaardinstellingen doet.
          ...(opts.webSearch ? { tools: [{ google_search: {} }] } : {}),
        },
        model,
      );
      const usage = await record(response, Boolean(opts.webSearch), opts.meta);
      return { text: textOf(response), raw: response, model, ...usage };
    },

    async callStructured<T>(opts: EngineStructuredOptions<T>): Promise<EngineStructuredResult<T>> {
      const key = guard();
      const response = await call(
        key,
        {
          systemInstruction: { parts: [{ text: opts.system }] },
          contents: [{ role: "user", parts: [{ text: opts.user }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: zodToGeminiSchema(opts.schema as z.ZodTypeAny),
            temperature: 0,
          },
          // Zoeken en gestructureerde output gaan bij Gemini niet samen: de API
          // weigert een responseSchema zodra er een tool aanstaat. Vandaar dat de
          // kennistest zijn gegronde blokken via callPlain doet.
        },
        model,
      );

      const text = textOf(response);
      let parsed: T;
      try {
        parsed = opts.schema.parse(JSON.parse(text));
      } catch (err) {
        throw new Error(
          `Gemini gaf geen geldig resultaat voor schema "${opts.schemaName}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      const usage = await record(response, false, opts.meta);
      return { parsed, raw: response, model, ...usage };
    },
  };
}
