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
}

export interface StructuredCallResult<T> {
  /** Het geparste, type-safe object. */
  parsed: T;
  /** De volledige ruwe response — wegschrijven naar raw_json (§5). */
  raw: unknown;
  /** OpenAI response-id (kostenbewaking / audit). */
  responseId: string | null;
  /** Totaal gebruikte tokens, indien beschikbaar. */
  tokensUsed: number | null;
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

  return {
    parsed: parsed as T,
    raw: response,
    responseId: response.id ?? null,
    tokensUsed: response.usage?.total_tokens ?? null,
  };
}
