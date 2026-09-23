import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * De ontdekkingsrondes van één merk, voor het scherm Clusters ontdekken.
 *
 * ⚠️ Waarom dit een eigen functie is: de kostenkolommen van een ronde horen
 * niet in de broncode van een klantscherm (de controle "geen interne stof op
 * een klantscherm" in scripts/test-unit.ts zoekt letterlijk op die namen).
 * Het scherm toont de bedragen alleen aan de consultant; de klant krijgt ze
 * ook niet mee als het scherm ze zou weggooien.
 */
export interface Ronde {
  id: string;
  status: string;
  status_note: string | null;
  /** Het thema van de ronde; `null` voor rondes van vóór migratie 0111. */
  thema: string | null;
  created_at: string;
  finished_at: string | null;
  /** `null` voor een klant: bedragen zijn stafinformatie. */
  kosten: { zoekdata: number; ai: number } | null;
}

export async function leesRondes(
  client: SupabaseClient,
  profileId: string,
  metKosten: boolean,
  limiet = 6,
): Promise<Ronde[]> {
  const kolommen =
    "id, status, status_note, theme, created_at, finished_at" +
    (metKosten ? ", dataforseo_cost_usd, ai_cost_usd" : "");
  const { data } = await client
    .from("cluster_discovery_runs")
    .select(kolommen)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limiet);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    status: r.status as string,
    status_note: (r.status_note as string | null) ?? null,
    thema: (r.theme as string | null) ?? null,
    created_at: r.created_at as string,
    finished_at: (r.finished_at as string | null) ?? null,
    kosten: metKosten
      ? { zoekdata: Number(r.dataforseo_cost_usd ?? 0), ai: Number(r.ai_cost_usd ?? 0) }
      : null,
  }));
}
