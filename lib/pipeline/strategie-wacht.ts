import "server-only";

/**
 * Een pagina die op een conflict wacht (docs/tasks/contentpijplijn-publicatiewaardig.md
 * §8.3, WP3).
 *
 * Houdt de conflictpoort een pagina tegen, dan wordt er niet geschreven. De
 * strategie blijft bewaard, met de opdracht om later opnieuw te beginnen
 * (`wacht.payload`). Zodra alle conflicten die de pagina tegenhielden zijn
 * opgelost, start de pagina vanzelf opnieuw bij `content_strategy`: de
 * strategie moet dan opnieuw, want er staat een ander feit op de kaart.
 *
 * Het opnieuw starten wordt aangeroepen na elk besluit van de adviseur en aan
 * het eind van elke register-run (een beantwoorde vraag, of een klantantwoord
 * dat vanzelf wint).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue } from "@/lib/jobs/queue";
import type { JobPayloads } from "@/lib/jobs/types";
import type { StrategieRecord } from "@/lib/pipeline/page-strategy";

type Admin = SupabaseClient;

export interface Wachtstand {
  sinds: string;
  payload: JobPayloads["content_strategy"];
}

/** De strategie met een wachtstand bewaren bij de pagina. */
export async function zetWacht(
  admin: Admin,
  pieceId: string,
  record: StrategieRecord,
  payload: JobPayloads["content_strategy"],
): Promise<void> {
  const wacht: Wachtstand = { sinds: new Date().toISOString(), payload: { ...payload, ophalen: undefined } };
  const { error } = await admin
    .from("content_pieces")
    .update({ strategy_json: { ...record, wacht } as never })
    .eq("id", pieceId);
  if (error) throw new Error(`Wachtstand opslaan mislukt: ${error.message}`);
}

/**
 * Start elke wachtende pagina van dit merk opnieuw waarvan alle tegenhoudende
 * conflicten intussen opgelost zijn. Geeft het aantal herstarte pagina's.
 */
export async function herstartWachtendePaginas(admin: Admin, profileId: string): Promise<number> {
  const { data: analyses } = await admin.from("analyses").select("id").eq("profile_id", profileId);
  const analyseIds = ((analyses ?? []) as { id: string }[]).map((a) => a.id);
  if (analyseIds.length === 0) return 0;

  const { data: stukken } = await admin
    .from("content_pieces")
    .select("id, analysis_id, strategy_json")
    .in("analysis_id", analyseIds)
    .eq("is_current", true)
    .not("strategy_json", "is", null);

  let herstart = 0;
  for (const stuk of (stukken ?? []) as { id: string; analysis_id: string; strategy_json: unknown }[]) {
    const record = stuk.strategy_json as (StrategieRecord & { wacht?: Wachtstand | null }) | null;
    if (!record?.wacht) continue;
    const ids = (record.tegengehouden ?? []).map((t) => t.conflictId);
    if (ids.length > 0) {
      const { data: open } = await admin
        .from("fact_conflicts")
        .select("id")
        .in("id", ids)
        .in("status", ["open", "gevraagd"]);
      if ((open ?? []).length > 0) continue;
    }

    await enqueue(admin, {
      type: "content_strategy",
      payload: record.wacht.payload,
      analysisId: stuk.analysis_id,
      dedupeKey: `content_strategy_herstart:${stuk.id}:${record.invoerSleutel}`,
    });
    await admin
      .from("content_pieces")
      .update({ strategy_json: { ...record, wacht: null } as never })
      .eq("id", stuk.id);
    herstart++;
  }
  return herstart;
}
