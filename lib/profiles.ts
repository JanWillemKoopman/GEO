import "server-only";

/**
 * Haalt profielen op namens de ingelogde user. Zelfde patroon als lib/analyses.ts:
 * lezen loopt via RLS (SELECT-only, gefilterd op user_id), schrijven altijd via
 * de service-role client met expliciete ownership-check.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaff } from "@/lib/staff";
import type { Profile } from "@/lib/types/database";

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile | null) ?? null;
}

/**
 * Mag deze gebruiker aan dit profiel schrijven? Eigenaar, of beheerder.
 *
 * De beheerdersuitweg is nodig omdat de superuser een profiel opbouwt vóór het
 * demogesprek en het daarna toewijst aan de klant (migratie 0038). Zonder deze
 * regel kon hij het profiel dat hij zelf aanmaakte niet meer bijwerken zodra
 * hij het had overgedragen — precies wanneer de begeleiding begint.
 *
 * ⚠️ Dit is samen met `getOwnedAnalysis()` de enige poort tussen een verzoek en
 * andermans data. Een `||` er verkeerd neerzetten geeft iedereen toegang tot
 * alles. Daarom is de eigenaarscontrole eerst en volledig, en is de
 * beheerderscontrole een aparte, expliciete tweede vraag.
 */
export async function getOwnedProfile(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  userId: string,
): Promise<Profile | null> {
  const { data } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  if (data.user_id === userId) return data as Profile;
  if (await isStaff(userId)) return data as Profile;
  return null;
}
