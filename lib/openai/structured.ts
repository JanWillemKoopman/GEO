import "server-only";

/**
 * Helper rond de OpenAI **Responses API** met **structured output** (Zod) en de
 * optionele **web_search**-tool. Dit is het enige aanroeppunt dat de hele
 * pipeline gebruikt (abcplan.md §2/§6/§7/§8).
 *
 * Kernprincipe (§5): we bewaren ALLES. Daarom geeft deze helper naast het
 * geparste object ook de volledige ruwe response terug, zodat de aanroeper die
 * in de bijbehorende `raw_json`-kolom kan wegschrijven.
 */
import type { ZodType } from "zod";
import type OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI } from "@/lib/openai/client";
import { estimateCostUsd } from "@/lib/openai/pricing";
import { logAiCall, type CallMeta } from "@/lib/openai/ledger";

export type { CallMeta };

/**
 * Haalt de tokenaantallen uit een Responses-antwoord. De SDK-typering dekt niet
 * elke veldnaam die de API teruggeeft, vandaar de defensieve uitlezing: liever
 * een ontbrekend getal dan een harde fout in de kostenregistratie.
 */
function readUsage(usage: unknown): {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
} {
  const u = (usage ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
  return {
    inputTokens: num(u.input_tokens),
    outputTokens: num(u.output_tokens),
    totalTokens: num(u.total_tokens),
  };
}

/**
 * Web-search-tool op de Responses API.
 * ⚠️ OpenAI/de SDK gebruikt hiervoor momenteel de naam `web_search_preview`
 * (eerdere/latere SDK-versies kunnen `web_search` verwachten). Eén constante,
 * één plek om bij te stellen. Zie ook scripts/test-openai.ts.
 */
export const WEB_SEARCH_TOOL: OpenAI.Responses.Tool = { type: "web_search_preview" };

export interface StructuredCallOptions<T> {
  model: string;
  /** Systeem-/rolinstructie (de "wie ben je en wat moet je doen"). */
  system: string;
  /** De concrete gebruikersinput/context (crawltekst, Brand DNA, meetdata, ...). */
  user: string;
  /** Zod-schema dat de output afdwingt (de contracten in lib/schemas). */
  schema: ZodType<T>;
  /** Naam van het schema (verplicht voor de Responses API). */
  schemaName: string;
  /** web_search-tool aanzetten? Alleen waar echt nodig (§10 kostenknop). */
  webSearch?: boolean;
  /**
   * Temperatuur — kies er één uit TEMPERATURES (lib/openai/models.ts), zodat de
   * keuze op één plek vastligt (optimalisatie.md 0.5). Weglaten = het
   * model-default, wat je alleen wilt bij de simulatie-call (halte 3a).
   */
  temperature?: number;
  /**
   * Waar hoort deze aanroep bij (optimalisatie.md 0.6)? Meegeven → de aanroep
   * wordt automatisch geregistreerd in `ai_calls`. Weglaten → geen registratie
   * (bv. in scripts/test-openai.ts, dat geen database nodig heeft).
   */
  meta?: CallMeta;
}

/** Tokens + geschatte kosten van één aanroep — gedeeld door beide call-varianten. */
export interface CallUsage {
  /** OpenAI response-id (kostenbewaking / audit). */
  responseId: string | null;
  /** Totaal gebruikte tokens, indien beschikbaar. */
  tokensUsed: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Geschatte kosten in USD — zie lib/openai/pricing.ts. */
  costUsd: number;
}

export interface StructuredCallResult<T> extends CallUsage {
  /** Het geparste, type-safe object. */
  parsed: T;
  /** De volledige ruwe response — wegschrijven naar raw_json (§5). */
  raw: unknown;
}

export async function callStructured<T>(
  opts: StructuredCallOptions<T>,
): Promise<StructuredCallResult<T>> {
  const openai = getOpenAI();

  const response = await openai.responses.parse({
    model: opts.model,
    input: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    tools: opts.webSearch ? [WEB_SEARCH_TOOL] : undefined,
    temperature: opts.temperature,
    text: {
      format: zodTextFormat(opts.schema, opts.schemaName),
    },
  });

  const parsed = response.output_parsed;
  if (parsed == null) {
    throw new Error(
      `OpenAI gaf geen geldig geparst resultaat voor schema "${opts.schemaName}". ` +
        `Ruwe status: ${response.status ?? "onbekend"}.`,
    );
  }

  const usage = await recordUsage(opts.model, Boolean(opts.webSearch), response, opts.meta);

  return { parsed: parsed as T, raw: response, ...usage };
}

/**
 * Leest de tokens uit, schat de kosten en registreert de aanroep (als er `meta`
 * is). Gedeeld door callStructured en callPlain zodat er maar één plek is waar
 * kosten berekend worden.
 */
async function recordUsage(
  model: string,
  webSearch: boolean,
  response: { id?: string | null; usage?: unknown },
  meta?: CallMeta,
): Promise<CallUsage> {
  const { inputTokens, outputTokens, totalTokens } = readUsage(response.usage);
  const costUsd = estimateCostUsd({ model, inputTokens, outputTokens, webSearch });
  const responseId = response.id ?? null;

  if (meta) {
    await logAiCall(meta, {
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      webSearch,
      costUsd,
      responseId,
    });
  }

  return { responseId, tokensUsed: totalTokens, inputTokens, outputTokens, costUsd };
}

export interface PlainCallOptions {
  model: string;
  system: string;
  user: string;
  webSearch?: boolean;
  /** Zie StructuredCallOptions.temperature. Bewust leeg laten bij halte 3a. */
  temperature?: number;
  /** Zie StructuredCallOptions.meta. */
  meta?: CallMeta;
}

export interface PlainCallResult extends CallUsage {
  /** De vrije-tekst antwoordinhoud. */
  text: string;
  raw: unknown;
}

/**
 * Vrije-tekst call (GEEN structured output) — voor halte 3a (abcplan.md §6 A3):
 * simuleert wat een AI-assistent een echte klant zou antwoorden. Structured
 * output zou het model dwingen tot JSON i.p.v. een natuurlijk antwoord.
 */
export async function callPlain(opts: PlainCallOptions): Promise<PlainCallResult> {
  const openai = getOpenAI();

  const response = await openai.responses.create({
    model: opts.model,
    input: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    tools: opts.webSearch ? [WEB_SEARCH_TOOL] : undefined,
    temperature: opts.temperature,
  });

  const usage = await recordUsage(opts.model, Boolean(opts.webSearch), response, opts.meta);

  return { text: response.output_text ?? "", raw: response, ...usage };
}
