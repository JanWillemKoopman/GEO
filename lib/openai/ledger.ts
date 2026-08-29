import "server-only";

/**
 * Kostenlogboek: schrijft één regel per OpenAI-aanroep naar `ai_calls`
 * (optimalisatie.md 0.6, migratie 0012).
 *
 * BEST-EFFORT, ALTIJD. Kostenregistratie is boekhouding, geen functionaliteit:
 * een mislukte logregel mag NOOIT een meting, rapport of contentgeneratie laten
 * falen. Vandaar dat alles hier in een try/catch zit en er hooguit een
 * console-melding uitkomt.
 *
 * Wordt aangeroepen vanuit lib/openai/structured.ts, zodat élke aanroep die een
 * `meta` meekrijgt automatisch geregistreerd wordt en een aanroepplek het niet
 * kan vergeten.
 */
import { createAdminClient } from "@/lib/supabase/admin";

/** Waar hoort deze aanroep bij, en welke stap in de pijplijn is het? */
export interface CallMeta {
  /** Pijplijnstap, bv. 'measure_simulate' of 'content_draft'. Zie migratie 0012. */
  kind: string;
  analysisId?: string | null;
  profileId?: string | null;
  /**
   * Welke AI-assistent (migratie 0041). Weglaten = 'openai', want dat is wat
   * élke aanroep tot augustus 2026 was, de kolom heeft dezelfde default, zodat
   * de historie klopt zonder terugwerkende invulling.
   */
  engine?: string;
  /**
   * Bij welke reputatieanalyse hoort deze aanroep (migratie 0062)?
   *
   * Zonder dit veld is niet te tellen wat één run heeft gekost, en dan is het
   * plafond van €3 uit `lib/reputation/budget.ts` niet af te dwingen. Migratie
   * 0053 deed hetzelfde met `account_id`, met dezelfde onderbouwing: een logboek
   * hoort de dimensie te dragen waarop je afrekent.
   */
  reputationRunId?: string | null;
  /**
   * Bij welke marktanalyse van de Sales-module hoort deze aanroep (migratie 0069)?
   *
   * Zelfde onderbouwing als `reputationRunId` hierboven: zonder dit veld is niet
   * te tellen wat één markt heeft gekost, en dan is het plafond van 10 euro per
   * markt uit `lib/sales/budget.ts` niet af te dwingen.
   */
  salesMarketId?: string | null;
}

export interface LoggedCall {
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  webSearch: boolean;
  costUsd: number;
  responseId: string | null;
}

export async function logAiCall(meta: CallMeta, call: LoggedCall): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("ai_calls").insert({
      analysis_id: meta.analysisId ?? null,
      profile_id: meta.profileId ?? null,
      kind: meta.kind,
      engine: meta.engine ?? "openai",
      model: call.model,
      input_tokens: call.inputTokens,
      output_tokens: call.outputTokens,
      total_tokens: call.totalTokens,
      web_search: call.webSearch,
      cost_usd: call.costUsd,
      openai_response_id: call.responseId,
      reputation_run_id: meta.reputationRunId ?? null,
      sales_market_id: meta.salesMarketId ?? null,
    });
  } catch (err) {
    // Bewust alleen loggen: zie de best-effort-regel bovenaan dit bestand.
    console.error(`Kosten registreren mislukt (kind: ${meta.kind}):`, err);
  }
}
