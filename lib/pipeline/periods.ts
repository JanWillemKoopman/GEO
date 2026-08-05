import "server-only";

/**
 * De meetperiodes van één analyse.
 *
 * ── WAAROM DIT EEN GEDEELDE HELPER IS ───────────────────────────────────────
 *
 * De periodekiezer zat vast aan het rapport-tabblad (`?periode=`) en gold
 * alleen daar. Het tabblad ernaast toonde ondertussen gewoon de nieuwste score.
 * Je kon dus een rapport van april lezen terwijl de score van juli ernaast
 * stond, zonder dat iets dat aangaf. Twee periodes tegelijk op één analyse.
 *
 * In het dossier is de periode een eigenschap van de hele pagina. Alle
 * hoofdstukken lezen hem hier, zodat ze niet uit elkaar kunnen lopen.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient;

export interface PeriodOption {
  weekNo: number;
  /** "Nulmeting" of een korte datum, wat de klant op de knop ziet. */
  label: string;
  measuredAt: string;
}

/** Nieuwste eerst. Leeg zolang er nog niet gemeten is. */
export async function loadPeriods(db: Db, analysisId: string): Promise<PeriodOption[]> {
  const { data } = await db
    .from("visibility_scores")
    .select("week_no, computed_at")
    .eq("analysis_id", analysisId)
    .order("week_no", { ascending: false });

  return (data ?? []).map((row) => {
    const weekNo = row.week_no as number;
    const measuredAt = row.computed_at as string;
    return {
      weekNo,
      measuredAt,
      label:
        weekNo === 0
          ? "Nulmeting"
          : new Date(measuredAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    };
  });
}

/**
 * Welke periode tonen we? De gevraagde, als die bestaat. Anders de nieuwste.
 *
 * Een link uit een oude mail naar een periode die niet meer bestaat mag geen
 * leeg scherm opleveren; hij valt terug op het actuele beeld.
 */
export function resolvePeriod(periods: PeriodOption[], requested?: string | null): number | null {
  if (periods.length === 0) return null;
  if (requested != null && requested !== "") {
    const asNumber = Number(requested);
    if (Number.isFinite(asNumber) && periods.some((p) => p.weekNo === asNumber)) return asNumber;
  }
  return periods[0].weekNo;
}
