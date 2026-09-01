import "server-only";

/**
 * De actieve aanbodboom van een merk, op één plek opgehaald (onboarding
 * Ronde C, `documentatie/onboarding_optimalisatie.md` §16.4).
 *
 * ── WAAROM DIT ÉÉN FUNCTIE IS EN GEEN ZES QUERY'S ───────────────────────────
 *
 * Migratie 0079 voegt `removed_at` toe: verwijderen is uitzetten, niet wissen
 * (conventie 8). Zes bestanden lazen tot dan `profile_offerings` rechtstreeks
 * voor onderwerpkeuze, marktonderzoek, de meetknopenselectie, het merkdossier
 * en de idempotentiecontrole van de aanbodstap zelf. Elk van die zes moest het
 * filter `removed_at is null` erbij krijgen, en zes plekken die dat los doen
 * lopen gegarandeerd uit elkaar: vergeet je er één, dan komt een net
 * verwijderde dienst alsnog terug in een onderwerpvoorstel of een meetronde.
 *
 * Vandaar één functie die het filter kent, en die alle zes aanroepen
 * (`propose-topics.ts`, `propose-more-topics.ts`, `llm-baseline.ts`,
 * `reputation-start.ts`, en het merkdossier). `scripts/test-unit.ts` bewaakt
 * met een grep-achtige controle dat geen van die bestanden `profile_offerings`
 * nog rechtstreeks selecteert.
 *
 * ── EN WAAROM DEZE MODULE NIET PUUR IS ──────────────────────────────────────
 *
 * Dit voert de Supabase-query zelf uit, dus `server-only`, in tegenstelling
 * tot `lib/offerings-validate.ts` ernaast: de validatie, de lus-controle op
 * `parentId` en de `sort_order`-berekening zijn wél puur en staan daar
 * (conventie 2), zodat `scripts/test-unit.ts` erbij kan zonder database.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileOffering } from "@/lib/types/database";
import { requireCount } from "@/lib/require-count";

type Client = Pick<SupabaseClient, "from">;

/** Alle knopen van dit merk die niet verwijderd zijn, in boomvolgorde. */
export async function activeOfferings(
  client: Client,
  profileId: string,
): Promise<ProfileOffering[]> {
  const { data } = await client
    .from("profile_offerings")
    .select("*")
    .eq("profile_id", profileId)
    .is("removed_at", null)
    .order("sort_order");
  return (data ?? []) as ProfileOffering[];
}

/**
 * De verwijderde knopen, nieuwste eerst. Voor het scherm: "3 verwijderd,
 * tonen" (§16.7), zodat een handmatige verwijdering terug te draaien is
 * zonder dat de knoop stilzwijgend weg is.
 */
export async function removedOfferings(
  client: Client,
  profileId: string,
): Promise<ProfileOffering[]> {
  const { data } = await client
    .from("profile_offerings")
    .select("*")
    .eq("profile_id", profileId)
    .not("removed_at", "is", null)
    .order("removed_at", { ascending: false });
  return (data ?? []) as ProfileOffering[];
}

/** Hoeveel actieve knopen dit merk heeft. Voor `buildSnapshot()` in propose-more-topics.ts. */
export async function activeOfferingCount(client: Client, profileId: string): Promise<number> {
  return requireCount(
    await client
      .from("profile_offerings")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .is("removed_at", null),
    "de actieve aanbodknopen van dit merk",
  );
}
