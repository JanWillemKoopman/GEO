import "server-only";

/**
 * DE ENIGE SCHRIJVER VAN DE KENNISVELDEN OP `profiles` (K8 deel 3, besluit V22).
 *
 * Wie een kennisveld van het merkprofiel wil zetten, doet dat via
 * `lib/kennis/`: het gesprek via `slaProfielOp()` (`uit-gesprek.ts`), het
 * onderzoek via `legOnderzoeksveldenVast()` (`uit-onderzoek.ts`), de
 * stemvoorbeelden via `uit-stem.ts`. Die leggen de kennis vast en schrijven met
 * deze functie de kopie die de meting leest. Een test in `scripts/test-unit.ts`
 * faalt als code buiten `lib/kennis/` een kennisveld op `profiles` schrijft.
 *
 * Andere kolommen (crawlinstellingen, boekhouding van een ronde) mogen in
 * dezelfde update mee: één schrijfactie per handeling, zoals het was.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Klantkennis } from "@/lib/types/database";
import { KENNISVELDEN, kopieNaHandeling, type KopieWijziging } from "@/lib/kennis/profielvelden";

export async function schrijfProfiel(
  admin: SupabaseClient,
  profileId: string,
  kolommen: Record<string, unknown>,
): Promise<{ error: string | null }> {
  if (Object.keys(kolommen).length === 0) return { error: null };
  const { error } = await admin.from("profiles").update(kolommen).eq("id", profileId);
  return { error: error ? error.message : null };
}

/**
 * De kopie volgt wat een mens op het kennisoverzicht deed (K8 deel 3): wees de
 * consultant een naam, plaats of concurrent af, of paste hij die aan, dan
 * verandert dezelfde waarde op het profiel. Anders zou de meting blijven tellen
 * op iets wat volgens de kennislaag niet klopt. Alleen als de oude tekst in
 * precies één veld staat (`kopieNaHandeling()`); gooit nooit een fout, want de
 * handeling in de kennislaag is dan al gelukt.
 */
export async function werkKopieBij(
  admin: SupabaseClient,
  oud: Pick<Klantkennis, "profile_id" | "domein" | "soort" | "bewering" | "herkomst_tabel">,
  nieuw: string | null,
): Promise<KopieWijziging | null> {
  try {
    if (oud.herkomst_tabel !== "profiles" && oud.herkomst_tabel !== "profile_facets") return null;
    const { data } = await admin.from("profiles").select(KENNISVELDEN.join(", ")).eq("id", oud.profile_id).maybeSingle();
    if (!data) return null;
    const wijziging = kopieNaHandeling(data as unknown as Record<string, unknown>, oud, nieuw);
    if (!wijziging) return null;
    const { error } = await schrijfProfiel(admin, oud.profile_id, { [wijziging.veld]: wijziging.waarde });
    if (error) {
      console.warn(`Kopie op het profiel bijwerken mislukt voor merk ${oud.profile_id}: ${error}`);
      return null;
    }
    return wijziging;
  } catch (err) {
    console.warn(`Kopie op het profiel bijwerken mislukt voor merk ${oud.profile_id}: ${String(err)}`);
    return null;
  }
}
