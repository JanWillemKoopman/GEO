import "server-only";

/**
 * Haalt profielen op namens de ingelogde user. Zelfde patroon als lib/analyses.ts:
 * lezen loopt via RLS (SELECT-only, gefilterd op user_id), schrijven altijd via
 * de service-role client met expliciete ownership-check.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getOwnedProfile(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  userId: string,
): Promise<Profile | null> {
  const { data } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return data as Profile;
}
