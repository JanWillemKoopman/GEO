import "server-only";

/**
 * Haalt één analyse op namens de ingelogde user. Dankzij RLS (SELECT-only,
 * gefilterd op user_id) geeft dit alleen een rij terug als de user 'm bezit —
 * dat is meteen de ownership-check voor lezen.
 */
import { createClient } from "@/lib/supabase/server";
import type { Analysis } from "@/lib/types/database";

export async function getAnalysis(id: string): Promise<Analysis | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("analyses").select("*").eq("id", id).maybeSingle();
  return (data as Analysis | null) ?? null;
}
