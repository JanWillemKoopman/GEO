import "server-only";

/**
 * Haalt één analyse op namens de ingelogde user. Dankzij RLS (SELECT-only,
 * gefilterd op user_id) geeft dit alleen een rij terug als de user 'm bezit —
 * dat is meteen de ownership-check voor lezen.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Analysis } from "@/lib/types/database";

export async function getAnalysis(id: string): Promise<Analysis | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("analyses").select("*").eq("id", id).maybeSingle();
  return (data as Analysis | null) ?? null;
}

/**
 * Ownership-check voor schrijfroutes (§5/§12.20): haalt de analyse op met de
 * service-role client (die RLS omzeilt) en geeft alleen iets terug als de
 * analyse écht van deze user is. Geeft null bij "niet gevonden" ÉN "niet van jou"
 * — geen onderscheid, om niet te lekken of een id bestaat.
 */
export async function getOwnedAnalysis(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  userId: string,
): Promise<Analysis | null> {
  const { data } = await admin.from("analyses").select("*").eq("id", id).maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return data as Analysis;
}
