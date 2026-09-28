import "server-only";

/**
 * DE AANBODBOOM VAN HET ONDERZOEK (K8 deel 4, besluit V22).
 *
 * De aanbodstap (`offering.ts`) legt de boom vast met `bewaarAanbodboom()` en
 * `hangKnoopOnder()`; de knopen gaan daarna als waargenomen of afgeleid de
 * kennislaag in (`legOnderzoekVast()`, K4). "Opnieuw onderzoeken" haalt de
 * knopen van het model weg met `wisOnderzoeksaanbod()`. Wat een mens aan de
 * boom doet, staat in `uit-aanbod.ts`. Samen de enige schrijvers van
 * `profile_offerings`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** De knopen van het onderzoek wegschrijven. Geeft de opgeslagen rijen terug, of een fout. */
export async function bewaarAanbodboom<T extends Record<string, unknown>>(
  admin: SupabaseClient,
  rijen: readonly T[],
): Promise<{ rijen: Record<string, unknown>[] | null; error: string | null }> {
  if (rijen.length === 0) return { rijen: [], error: null };
  const { data, error } = await admin.from("profile_offerings").insert(rijen as unknown as Record<string, unknown>[]).select("*");
  return { rijen: (data as Record<string, unknown>[] | null) ?? null, error: error ? error.message : null };
}

/** Een knoop onder zijn ouder hangen (tweede ronde van het onderzoek: het model noemt de ouder bij naam). */
export async function hangKnoopOnder(admin: SupabaseClient, knoopId: string, ouderId: string): Promise<{ error: string | null }> {
  const { error } = await admin.from("profile_offerings").update({ parent_id: ouderId }).eq("id", knoopId);
  return { error: error ? error.message : null };
}

/**
 * De knopen van het onderzoek weghalen voor een nieuwe onderzoeksronde (de knop
 * "opnieuw onderzoeken"). Wat een mens toevoegde of aanpaste, blijft. De
 * kennisitems van de oude knopen blijven ook: de nieuwe ronde herkent dezelfde
 * dienst aan zijn sleutel en legt hem niet dubbel vast. Geeft het aantal terug.
 */
export async function wisOnderzoeksaanbod(admin: SupabaseClient, profileId: string): Promise<number> {
  const { count } = await admin.from("profile_offerings").delete({ count: "exact" }).eq("profile_id", profileId).eq("source", "ai");
  return count ?? 0;
}
