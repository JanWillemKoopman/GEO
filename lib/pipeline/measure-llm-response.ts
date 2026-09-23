import "server-only";

/**
 * Eén meetvraag via Gemini (DataForSEO), opgeslagen als gewone meting.
 *
 * Zelfde opzet als `measure-ai-overview.ts`: de BEOORDELING is gedeeld
 * (`judgeRun()`), het OPHALEN is eigen. Bij deze bron is het ophalen wél een
 * gewoon gesprek (systeeminstructie plus vraag), maar toch geen tak in
 * `EngineAdapter`: DataForSEO is de leverancier, niet Google of OpenAI
 * rechtstreeks, en de faalgevallen zijn anders (zie `lib/llm-responses/types.ts`).
 *
 * ── ⚠️ DE REGEL DIE HIER HET ZWAARST WEEGT ─────────────────────────────────
 *
 * **Een leeg antwoord is geen nulscore.** Nagemeten op 20 september 2026: bij
 * de eerste verificatieronde kwamen alle vijf testantwoorden leeg terug
 * terwijl DataForSEO er wél voor liet betalen. Zou je zo'n antwoord als "merk
 * niet genoemd" wegschrijven, dan zakt de score van een merk doordat de bron
 * toevallig niets teruggaf, en dat is een cijfer dat liegt (conventie 3).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { haalLlmResponse } from "@/lib/llm-responses/client";
import { LLM_RESPONSE_GEMINI_ENGINE, LLM_RESPONSE_GEMINI_MODEL } from "@/lib/llm-responses/types";
import { judgeRun, loadMeasureContext, SIMULATE_SYSTEM } from "@/lib/pipeline/measure";
import { createAdminClient } from "@/lib/supabase/admin";
import { promptWeight } from "@/lib/pipeline/prompt-weight";
import { volumeBandOf } from "@/lib/pipeline/volume";
import { logAiCall } from "@/lib/openai/ledger";
import type { Analysis, Prompt, TrackingRun } from "@/lib/types/database";

type Admin = SupabaseClient;

/** Postgres-foutcode voor een geschonden unieke index (zelfde als in measure.ts). */
const UNIQUE_VIOLATION = "23505";

export interface LlmResponseMeting {
  /** Is er daadwerkelijk een meting opgeslagen en beoordeeld? */
  gemeten: boolean;
  /** Wat deze vraag gekost heeft, herkansingen inbegrepen. */
  kostenUsd: number;
  /** In gewone taal, voor de logregel. */
  melding: string;
}

export async function meetViaLlmResponse(
  admin: Admin,
  analysis: Analysis,
  ownLabel: string,
  ownAliases: string[],
  ownExclusions: string[],
  prompt: Prompt,
  weekNo: number,
  repeatIndex: number,
): Promise<LlmResponseMeting> {
  // Idempotent, net als bij de andere twee bronnen: staat de meting er al, dan
  // hooguit de beoordeling opnieuw. Meten is de betaalde stap.
  const { data: bestaand } = await admin
    .from("tracking_runs")
    .select("*")
    .eq("analysis_id", analysis.id)
    .eq("prompt_id", prompt.id)
    .eq("engine", LLM_RESPONSE_GEMINI_ENGINE)
    .eq("week_no", weekNo)
    .eq("purpose", "periodic")
    .eq("repeat_index", repeatIndex)
    .maybeSingle();

  let run = bestaand as TrackingRun | null;

  if (!run) {
    const uitkomst = await haalLlmResponse(prompt.text, SIMULATE_SYSTEM);

    // ⚠️ De kosten worden ALTIJD gelogd, ook als er niets gemeten is: een leeg
    // antwoord kost bij deze bron net zo goed geld als een gemeten antwoord.
    await logAiCall(
      {
        kind: "measure_llm_response",
        analysisId: analysis.id,
        profileId: analysis.profile_id,
        engine: LLM_RESPONSE_GEMINI_ENGINE,
      },
      {
        model: LLM_RESPONSE_GEMINI_MODEL,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        webSearch: true,
        costUsd: uitkomst.kostenUsd,
        responseId: null,
        raw: {
          status: uitkomst.status,
          aantalBronvermeldingen: uitkomst.aantalBronvermeldingen,
          melding: uitkomst.melding,
        },
        input: { system: SIMULATE_SYSTEM, user: prompt.text, webSearch: true },
      },
    );

    if (uitkomst.status === "mislukt") {
      // Gooien, niet stil overslaan: de takenlaag probeert het later opnieuw.
      throw new Error(
        `Gemini-via-DataForSEO ophalen mislukt voor vraag ${prompt.id}: ${uitkomst.melding ?? "onbekend"}.`,
      );
    }

    if (uitkomst.status === "leeg") {
      return {
        gemeten: false,
        kostenUsd: uitkomst.kostenUsd,
        melding: `Gemini gaf geen bruikbaar antwoord bij vraag ${prompt.id}; niet gemeten.`,
      };
    }

    const { data: nieuw, error } = await admin
      .from("tracking_runs")
      .insert({
        analysis_id: analysis.id,
        prompt_id: prompt.id,
        prompt_text_snapshot: prompt.text,
        prompt_category_snapshot: prompt.category,
        // Zelfde bevriezing als bij de andere twee bronnen: een gewicht dat met
        // terugwerkende kracht verandert maakt de trend onvergelijkbaar.
        prompt_weight: promptWeight(volumeBandOf(prompt), prompt.intent_type),
        engine: LLM_RESPONSE_GEMINI_ENGINE,
        model_used: LLM_RESPONSE_GEMINI_MODEL,
        week_no: weekNo,
        purpose: "periodic",
        repeat_index: repeatIndex,
        raw_response: uitkomst.tekst,
        raw_response_received_at: new Date().toISOString(),
        cost_usd: uitkomst.kostenUsd,
      })
      .select("*")
      .single();

    if (error || !nieuw) {
      // Een gelijktijdige tweede poging was ons net voor. De aanroep is al
      // betaald; de bestaande rij overnemen voorkomt dat we hem nog eens doen.
      if (error?.code === UNIQUE_VIOLATION) {
        const { data: naRace } = await admin
          .from("tracking_runs")
          .select("*")
          .eq("analysis_id", analysis.id)
          .eq("prompt_id", prompt.id)
          .eq("engine", LLM_RESPONSE_GEMINI_ENGINE)
          .eq("week_no", weekNo)
          .eq("purpose", "periodic")
          .eq("repeat_index", repeatIndex)
          .maybeSingle();
        if (!naRace) throw new Error(`Meting opslaan mislukt voor vraag ${prompt.id}: ${error.message}`);
        run = naRace as TrackingRun;
      } else {
        throw new Error(`Meting opslaan mislukt voor vraag ${prompt.id}: ${error?.message}`);
      }
    } else {
      run = nieuw as TrackingRun;
    }
  }

  await judgeRun(admin, analysis, ownLabel, ownAliases, ownExclusions, run);

  return {
    gemeten: true,
    kostenUsd: Number(run.cost_usd ?? 0),
    melding: `Gemini-via-DataForSEO gemeten voor vraag ${prompt.id}.`,
  };
}

/**
 * De taakingang: context laden en meten. Zelfde opzet als
 * `measureAiOverviewById()`.
 */
export async function measureLlmResponseById(
  analysisId: string,
  promptId: string,
  weekNo: number,
  repeatIndex = 0,
): Promise<LlmResponseMeting> {
  const admin = createAdminClient();
  const ctx = await loadMeasureContext(admin, analysisId);

  const { data: promptRow } = await admin.from("prompts").select("*").eq("id", promptId).single();
  if (!promptRow) throw new Error(`Vraag ${promptId} niet gevonden.`);

  return meetViaLlmResponse(
    admin,
    ctx.analysis,
    ctx.ownLabel,
    ctx.ownAliases,
    ctx.ownExclusions,
    promptRow as Prompt,
    weekNo,
    repeatIndex,
  );
}
