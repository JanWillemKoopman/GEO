import "server-only";

/**
 * Kansen op "te herzien" of "vervallen" zetten als de kennis waarop ze leunen
 * verandert (G3 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`). Aangeroepen
 * door de abonnee `kennis_wijziging_impact`
 * (`lib/gebeurtenissen/abonnees/kennis-wijziging-impact.ts`), niet rechtstreeks:
 * dat bestand bepaalt wélke kansen het raakt (via `afhankelijkVan()`), dit
 * bestand is de enige plek die daarna in `kansen` schrijft (naast
 * `lib/kansen/uit-rapport.ts` en `handmatig.ts` voor het aanmaken zelf).
 *
 * Niets draait vanzelf opnieuw (§4 regel 5): dit zet alleen een status, het
 * herschrijft geen pagina en meet niets opnieuw. Een kans die al vervallen is,
 * blijft dat; twee kennisitems die na elkaar veranderen, zetten hem niet heen
 * en weer.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;

export async function markeerKansenGeraakt(
  admin: Admin,
  kansIds: readonly string[],
  vervallen: boolean,
): Promise<void> {
  const ids = [...new Set(kansIds)];
  if (ids.length === 0) return;
  const { error } = await admin
    .from("kansen")
    .update({ status: vervallen ? "vervallen" : "te_herzien", updated_at: new Date().toISOString() })
    .in("id", ids)
    .neq("status", "vervallen");
  if (error) console.warn(`Kansen markeren als geraakt mislukt (${ids.join(", ")}):`, error.message);
}

/**
 * Bovengrens per pagina die opnieuw geschreven zou moeten worden, uit de proef
 * van 26 september 2026 ($0,10 tot $0,17 per pagina, `docs/architecture.md`
 * §6). Een schatting mag te hoog uitvallen, nooit te laag: dat maakt van een
 * bevestiging een verrassing (zelfde regel als `lib/pipeline/onboarding-
 * refresh.ts`).
 */
export const HERSCHRIJF_KOSTEN_USD_PER_PAGINA = 0.17;

export interface GeraaktKans {
  id: string;
  titel: string;
  status: "te_herzien" | "vervallen";
}

export interface GeraaktPagina {
  id: string;
  titel: string;
  kennisGewijzigdOp: string;
}

export interface GeraaktOverzicht {
  kansen: GeraaktKans[];
  paginas: GeraaktPagina[];
  /** `null` = niets geraakt, geen kosten om te noemen (conventie 3). */
  geschatteKostenUsd: number | null;
}

/**
 * Wat is er geraakt door een recente kenniswijziging, voor het kennisoverzicht
 * (G3 klaar-als: "de consultant ziet wat er geraakt is en wat opnieuw draaien
 * zou kosten"). Twee platte uitvragen, geen geneste selectie: dezelfde reden
 * als `lib/kennis/voor-pagina.ts`, de ketentest draait tegen een shim die geen
 * joins nabootst.
 */
export async function geraaktOverzicht(admin: Admin, profileId: string): Promise<GeraaktOverzicht> {
  const [{ data: kansRows }, { data: analyseRows }] = await Promise.all([
    admin
      .from("kansen")
      .select("id, titel, status, ruw")
      .eq("profile_id", profileId)
      .in("status", ["te_herzien", "vervallen"])
      .order("updated_at", { ascending: false }),
    admin.from("analyses").select("id").eq("profile_id", profileId),
  ]);

  const analysisIds = ((analyseRows ?? []) as { id: string }[]).map((a) => a.id);
  const { data: paginaRows } = analysisIds.length
    ? await admin
        .from("content_pieces")
        .select("id, title, kennis_gewijzigd_op")
        .in("analysis_id", analysisIds)
        .eq("is_current", true)
        .not("kennis_gewijzigd_op", "is", null)
        .order("kennis_gewijzigd_op", { ascending: false })
    : { data: [] };

  const kansen = ((kansRows ?? []) as { id: string; titel: string; status: string; ruw: { samengevoegdMet?: unknown } | null }[])
    // V7 en V20: een kans die als bewijs bij een andere kans ging, staat op
    // "vervallen" maar is niet door een kenniswijziging geraakt.
    .filter((k) => !k.ruw?.samengevoegdMet)
    .map((k) => ({
    id: k.id,
    titel: k.titel,
    status: k.status as "te_herzien" | "vervallen",
  }));
  const paginas = ((paginaRows ?? []) as { id: string; title: string; kennis_gewijzigd_op: string }[]).map((p) => ({
    id: p.id,
    titel: p.title,
    kennisGewijzigdOp: p.kennis_gewijzigd_op,
  }));

  return {
    kansen,
    paginas,
    geschatteKostenUsd: paginas.length > 0 ? paginas.length * HERSCHRIJF_KOSTEN_USD_PER_PAGINA : null,
  };
}
