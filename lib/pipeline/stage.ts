import "server-only";

/**
 * Bepaalt welke pipeline-fase een status 'mislukt' daadwerkelijk betreft, zodat
 * elke tab de juiste retry-UI toont. Zonder dit onderscheid kan 'mislukt' drie
 * totaal verschillende situaties (A1/A2 voorbereiding, A3 meting, B1/B2 rapport)
 * niet uit elkaar houden.
 *
 * Werkt via de garanties van de state-machine zelf, geen extra schema-kolom nodig:
 * - prompts bestaan alleen als A1/A2 al gelukt zijn.
 * - visibility_scores (week 0) bestaat alleen als A3 al gelukt is.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type PipelineStage = "prepare" | "measure" | "report";

/**
 * ⚠️ Neemt sinds 22 september 2026 elke Supabase-client aan, en niet alleen de
 * server-client onder RLS. De herstelroute (`/api/analyses/[id]/hervatten`)
 * leest dezelfde twee tellingen met de service-role client, en twee versies van
 * deze functie zouden twee antwoorden op dezelfde vraag betekenen.
 */
export async function determineStage(
  supabase: SupabaseClient,
  analysisId: string,
): Promise<PipelineStage> {
  // ⚠️ Deze telling gebruikt BEWUST geen `requireCount` (F5, 12 augustus 2026),
  // en dat is de enige plek waar dat zo is. Overal elders betekent een
  // haperende telling dat er duur werk dubbel gedaan wordt of dat de klant een
  // verkeerd getal ziet; daar hoort de taak te stoppen.
  //
  // Hier niet. Deze functie kiest alleen wélk voortgangsscherm er getoond
  // wordt, en beide schermen blijven daarna zelf de stand ophalen. Faalt de
  // telling, dan zie je een tel lang het verkeerde voortgangsscherm en corrigeert
  // het zichzelf. Een fout gooien zou dat inruilen voor een pagina die het
  // helemaal niet doet, en dat is de slechtere ruil.
  const { count: promptCount } = await supabase
    .from("prompts")
    .select("id", { count: "exact", head: true })
    .eq("analysis_id", analysisId);
  if (!promptCount) return "prepare";

  const { data: score } = await supabase
    .from("visibility_scores")
    .select("id")
    .eq("analysis_id", analysisId)
    .eq("week_no", 0)
    .maybeSingle();
  if (!score) return "measure";

  return "report";
}
