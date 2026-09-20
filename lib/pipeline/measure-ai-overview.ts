import "server-only";

/**
 * Eén meetvraag via Google AI Overview, opgeslagen als gewone meting.
 *
 * ── WAT DIT WEL EN NIET DEELT MET `measure.ts` ──────────────────────────────
 *
 * Gedeeld: de BEOORDELING. `judgeRun()` uit `measure.ts` kijkt naar de tekst en
 * bepaalt wie er genoemd wordt. Dat moet dezelfde beoordelaar zijn, anders meten
 * we het verschil tussen twee beoordelaars in plaats van tussen ChatGPT en
 * Google, en is geen enkele vergelijking tussen de bronnen nog iets waard.
 *
 * Eigen: het OPHALEN. Een AI Overview komt niet uit een gesprek maar uit een
 * zoekopdracht, en past daarom niet in `EngineAdapter` (zie
 * `lib/ai-overview/types.ts`). Vandaar deze aparte stap naast `measureOnePrompt`
 * in plaats van een tak erbinnen.
 *
 * ── ⚠️ DE REGEL DIE HIER HET ZWAARST WEEGT ─────────────────────────────────
 *
 * **Geen overzicht is geen nulscore.** Toont Google bij een vraag geen AI
 * Overview, dan is die vraag die ronde niet gemeten, punt. Er wordt geen rij
 * opgeslagen. Zou je hem als "merk niet genoemd" wegschrijven, dan zakt de
 * score van een merk doordat Google toevallig geen antwoord gaf, en dat is een
 * cijfer dat liegt (conventie 3).
 *
 * Nagemeten op 20 september 2026: 9% van de geslaagde aanroepen levert geen
 * bruikbaar overzicht op. Dat is dus geen randgeval maar bijna één vraag op de
 * tien.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { haalAiOverview } from "@/lib/ai-overview/client";
import { AI_OVERVIEW_ENGINE } from "@/lib/ai-overview/types";
import { judgeRun, loadMeasureContext } from "@/lib/pipeline/measure";
import { createAdminClient } from "@/lib/supabase/admin";
import { promptWeight } from "@/lib/pipeline/prompt-weight";
import { volumeBandOf } from "@/lib/pipeline/volume";
import { logAiCall } from "@/lib/openai/ledger";
import type { Analysis, Prompt, TrackingRun } from "@/lib/types/database";

type Admin = SupabaseClient;

/** Postgres-foutcode voor een geschonden unieke index (zelfde als in measure.ts). */
const UNIQUE_VIOLATION = "23505";

/** Onder hoeveel tekens een overzicht geen meting is. Zelfde grens als `measure.ts`. */
const MIN_ANTWOORD_TEKENS = 40;

/** Wat er in `model_used` en in het kostenlogboek komt te staan als herkomst. */
const MODEL_NAAM = "dataforseo/serp-google-organic";

export interface AiOverviewMeting {
  /** Is er daadwerkelijk een meting opgeslagen en beoordeeld? */
  gemeten: boolean;
  /** Wat deze vraag gekost heeft, herkansingen inbegrepen. */
  kostenUsd: number;
  /** In gewone taal, voor de logregel. */
  melding: string;
}

export async function meetViaAiOverview(
  admin: Admin,
  analysis: Analysis,
  ownLabel: string,
  ownAliases: string[],
  ownExclusions: string[],
  prompt: Prompt,
  weekNo: number,
  repeatIndex: number,
): Promise<AiOverviewMeting> {
  // Idempotent, net als bij `measureOnePrompt`: staat de meting er al, dan
  // hooguit de beoordeling opnieuw. Meten is de betaalde stap.
  const { data: bestaand } = await admin
    .from("tracking_runs")
    .select("*")
    .eq("analysis_id", analysis.id)
    .eq("prompt_id", prompt.id)
    .eq("engine", AI_OVERVIEW_ENGINE)
    .eq("week_no", weekNo)
    .eq("purpose", "periodic")
    .eq("repeat_index", repeatIndex)
    .maybeSingle();

  let run = bestaand as TrackingRun | null;

  if (!run) {
    const uitkomst = await haalAiOverview(prompt.text);

    // ⚠️ De kosten worden ALTIJD gelogd, ook als er niets gemeten is. Bijna een
    // derde van de aanroepen mislukt bij de eerste poging en zo'n mislukking
    // kost $0,002. Alleen de geslaagde aanroepen loggen maakt elke kostenraming
    // van deze bron structureel te laag.
    await logAiCall(
      {
        kind: "measure_ai_overview",
        analysisId: analysis.id,
        profileId: analysis.profile_id,
        engine: AI_OVERVIEW_ENGINE,
      },
      {
        model: MODEL_NAAM,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        // Geen model-aanroep maar wel een zoekactie: dezelfde soort kostenpost
        // als de web_search bij een ChatGPT-meting, en zo hoort hij ook in het
        // overzicht te staan.
        webSearch: true,
        costUsd: uitkomst.kostenUsd,
        responseId: null,
        raw: { status: uitkomst.status, bronnen: uitkomst.bronnen, melding: uitkomst.melding },
      },
    );

    if (uitkomst.status === "mislukt") {
      // Gooien, niet stil overslaan: de takenlaag probeert het later opnieuw.
      // Stil overslaan zou deze vraag uit de noemer laten verdwijnen zonder dat
      // iemand het merkt, en dat is precies de stille degradatie die de rest van
      // dit project met vangnetten bestrijdt.
      throw new Error(
        `AI Overview ophalen mislukt voor vraag ${prompt.id}: ${uitkomst.melding ?? "onbekend"}.`,
      );
    }

    if (uitkomst.status === "geen_overview" || uitkomst.tekst.trim().length < MIN_ANTWOORD_TEKENS) {
      return {
        gemeten: false,
        kostenUsd: uitkomst.kostenUsd,
        melding: `Google toonde geen bruikbaar AI-overzicht bij vraag ${prompt.id}; niet gemeten.`,
      };
    }

    const { data: nieuw, error } = await admin
      .from("tracking_runs")
      .insert({
        analysis_id: analysis.id,
        prompt_id: prompt.id,
        prompt_text_snapshot: prompt.text,
        prompt_category_snapshot: prompt.category,
        // Zelfde bevriezing als bij de ChatGPT-meting, en om dezelfde reden: een
        // gewicht dat met terugwerkende kracht verandert maakt de trend
        // onvergelijkbaar.
        prompt_weight: promptWeight(volumeBandOf(prompt), prompt.intent_type),
        engine: AI_OVERVIEW_ENGINE,
        model_used: MODEL_NAAM,
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
          .eq("engine", AI_OVERVIEW_ENGINE)
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
    melding: `AI Overview gemeten voor vraag ${prompt.id}.`,
  };
}

/**
 * De taakingang: context laden en meten.
 *
 * Zelfde opzet als `measurePromptById()` in `measure.ts`, inclusief het per taak
 * opnieuw laden van de merkgegevens: past de klant halverwege zijn aliassen aan,
 * dan meten de resterende vragen meteen tegen de nieuwe gegevens.
 */
export async function measureAiOverviewById(
  analysisId: string,
  promptId: string,
  weekNo: number,
  repeatIndex = 0,
): Promise<AiOverviewMeting> {
  const admin = createAdminClient();
  const ctx = await loadMeasureContext(admin, analysisId);

  const { data: promptRow } = await admin.from("prompts").select("*").eq("id", promptId).single();
  if (!promptRow) throw new Error(`Vraag ${promptId} niet gevonden.`);

  return meetViaAiOverview(
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
