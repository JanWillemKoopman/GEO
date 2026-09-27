import "server-only";

/**
 * VAN EEN OUDE VERSIE NAAR DE ACTUELE (K8 deel 4).
 *
 * Een kans verwijst in `geldt_voor` naar de dienst waar hij over gaat. Krijgt die
 * dienst een nieuwe versie (een mens paste de naam aan op het kennisoverzicht of
 * in de aanbodboom), dan wijst de kans nog naar de oude, en die telt nergens meer
 * mee. `lib/kennis/` mag `kansen` niet schrijven (alleen `lib/kansen/`), dus de
 * lezer volgt hier de keten `vervangen_door` tot de actuele versie. Een afgewezen
 * versie aan het eind van de keten valt weg: daar geldt niets meer voor.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_STAPPEN = 10;

export async function naarActueleVersies(admin: SupabaseClient, profileId: string, ids: readonly string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const uit = new Set<string>();
  let open = [...new Set(ids)];
  for (let stap = 0; stap < MAX_STAPPEN && open.length > 0; stap++) {
    const { data } = await admin.from("klantkennis").select("id, vervangen_door, afgewezen_op").eq("profile_id", profileId).in("id", open);
    const rijen = (data ?? []) as { id: string; vervangen_door: string | null; afgewezen_op: string | null }[];
    const volgende: string[] = [];
    for (const r of rijen) {
      if (r.vervangen_door) volgende.push(r.vervangen_door);
      else if (!r.afgewezen_op) uit.add(r.id);
    }
    open = [...new Set(volgende)].filter((id) => !uit.has(id));
  }
  return [...uit];
}
