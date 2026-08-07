import "server-only";

/**
 * Haalt één analyse op namens de ingelogde user. Dankzij RLS (SELECT-only,
 * gefilterd op user_id) geeft dit alleen een rij terug als de user 'm bezit,
 * dat is meteen de ownership-check voor lezen.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaff } from "@/lib/staff";
import type { Analysis } from "@/lib/types/database";

/**
 * Gememoïseerd per request (net als `isStaff`, zie lib/staff.ts): het
 * analyselayout en `generateMetadata` (A.4, paginatitels) roepen dit allebei
 * voor dezelfde analyse aan, zonder cache twee keer dezelfde query.
 */
export const getAnalysis = cache(async (id: string): Promise<Analysis | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("analyses").select("*").eq("id", id).maybeSingle();
  return (data as Analysis | null) ?? null;
});

/**
 * Ownership-check voor schrijfroutes (§5/§12.20): haalt de analyse op met de
 * service-role client (die RLS omzeilt) en geeft alleen iets terug als de
 * analyse écht van deze user is. Geeft null bij "niet gevonden" ÉN "niet van jou"
 *. Geen onderscheid, om niet te lekken of een id bestaat.
 *
 * Sinds migratie 0038 is er een tweede uitweg: de beheerder. Die begeleidt de
 * klant ná de toewijzing en moet dus bij analyses kunnen die niet van hem zijn.
 * Zie lib/staff.ts voor waarom die rol bestaat en wat hem in toom houdt.
 */
export async function getOwnedAnalysis(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  userId: string,
): Promise<Analysis | null> {
  const { data } = await admin.from("analyses").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  if (data.user_id === userId) return data as Analysis;
  if (await isStaff(userId)) return data as Analysis;
  return null;
}
