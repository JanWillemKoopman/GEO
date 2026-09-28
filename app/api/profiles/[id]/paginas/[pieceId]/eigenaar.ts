import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Hoort deze pagina bij dit merk? De eigendomscontrole van de routes dekt het
 * merk; deze dekt de pagina (conventie 6). Geeft de analyse terug, of null.
 */
export async function analyseVanPagina(admin: SupabaseClient, profileId: string, pieceId: string): Promise<string | null> {
  const { data: stuk } = await admin.from("content_pieces").select("analysis_id").eq("id", pieceId).maybeSingle();
  const analysisId = (stuk as { analysis_id?: string } | null)?.analysis_id;
  if (!analysisId) return null;
  const { data: analyse } = await admin.from("analyses").select("profile_id").eq("id", analysisId).maybeSingle();
  return (analyse as { profile_id?: string } | null)?.profile_id === profileId ? analysisId : null;
}
