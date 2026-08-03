import "server-only";

/**
 * OpenAI als engine (docs/tasks/onboarding-2.0.md, blok E).
 *
 * Dit is bewust een dunne schil om `lib/openai/structured.ts` en geen kopie
 * ervan. Daar zitten dingen in die je niet twee keer wilt hebben: het
 * tijdbudget over alle retries heen (`CALL_BUDGET_MS`), de terugval als de API
 * de temperatuur weigert, de kostenregistratie in `ai_calls`, en het
 * injectiepunt voor de ketentest. Een tweede implementatie zou al die
 * eigenschappen stilletjes missen.
 *
 * De engine-laag voegt precies één ding toe: welke assistent het was.
 */
import { callPlain, callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import type {
  EngineAdapter,
  EngineCallResult,
  EnginePlainOptions,
  EngineStructuredOptions,
  EngineStructuredResult,
} from "@/lib/engines/types";

export function createOpenAiEngine(available: boolean): EngineAdapter {
  return {
    info: {
      id: "openai",
      label: "ChatGPT",
      available,
      supportsWebSearch: true,
    },

    async callPlain(opts: EnginePlainOptions): Promise<EngineCallResult> {
      const r = await callPlain({
        model: MODELS.quality,
        system: opts.system,
        user: opts.user,
        webSearch: opts.webSearch,
        // Géén `work`: dat is precies de bedoeling bij een simulatie. We meten
        // wat een assistent op standaardinstellingen doet, niet wat hij doet als
        // wij aan de knoppen zitten.
        meta: opts.meta,
      });
      return {
        text: r.text,
        raw: r.raw,
        model: MODELS.quality,
        responseId: r.responseId,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        costUsd: r.costUsd,
      };
    },

    async callStructured<T>(opts: EngineStructuredOptions<T>): Promise<EngineStructuredResult<T>> {
      const r = await callStructured({
        model: MODELS.quality,
        system: opts.system,
        user: opts.user,
        schema: opts.schema,
        schemaName: opts.schemaName,
        webSearch: opts.webSearch,
        work: "deterministic",
        meta: opts.meta,
      });
      return {
        parsed: r.parsed,
        raw: r.raw,
        model: MODELS.quality,
        responseId: r.responseId,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        costUsd: r.costUsd,
      };
    },
  };
}
