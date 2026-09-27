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
