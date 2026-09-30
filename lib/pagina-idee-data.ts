import "server-only";

/**
 * Wat het venster "Nieuw pagina-idee" nodig heeft (`components/pagina/nieuw-pagina-idee.tsx`):
 * de diensten en werkgebieden uit de kennislaag, en de maanden van het plan met
 * hoeveel er al in staat. Eén lader voor de bibliotheek en het bord, zodat het
 * venster op allebei hetzelfde voorstelt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPastMonth, maandTitel } from "@/lib/plan-schedule";
import type { KennisOptie } from "@/components/pagina/nieuw-pagina-idee";
import type { MaandVoorIdee } from "@/lib/pagina-idee";

export interface IdeeVenster {
  kennisOpties: KennisOptie[];
  maanden: MaandVoorIdee[];
  perMaand: number;
}

export async function kennisOptiesVoor(admin: SupabaseClient, profileId: string): Promise<KennisOptie[]> {
  const { data } = await admin
    .from("klantkennis")
    .select("id, soort, bewering")
    .eq("profile_id", profileId)
    .in("soort", ["dienst", "werkgebied"])
    .is("vervangen_door", null)
    .is("afgewezen_op", null)
    .order("soort");
  return (data ?? []) as KennisOptie[];
}

/** Het venster voor dit merk, of null als er geen lopend plan is. */
export async function laadIdeeVenster(admin: SupabaseClient, profileId: string): Promise<IdeeVenster | null> {
  const { data: planRow } = await admin
    .from("content_plans")
    .select("id, started_on, pages_per_month")
    .eq("profile_id", profileId)
    .neq("status", "gestopt")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = planRow as { id: string; started_on: string; pages_per_month: number } | null;
  if (!plan) return null;

  const [{ data: maandRows }, { data: paginaRows }, kennisOpties] = await Promise.all([
    admin.from("plan_months").select("id, month_number").eq("plan_id", plan.id).order("month_number"),
    admin.from("planned_pages").select("plan_month_id").eq("profile_id", profileId).eq("is_buffer", false).not("plan_month_id", "is", null),
    kennisOptiesVoor(admin, profileId),
  ]);
  const perMaand = new Map<string, number>();
  for (const r of (paginaRows ?? []) as { plan_month_id: string }[]) {
    perMaand.set(r.plan_month_id, (perMaand.get(r.plan_month_id) ?? 0) + 1);
  }
  const maanden = ((maandRows ?? []) as { id: string; month_number: number }[]).map((m) => ({
    id: m.id,
    titel: maandTitel(plan.started_on, m.month_number),
    aantal: perMaand.get(m.id) ?? 0,
    voorbij: isPastMonth(plan.started_on, m.month_number),
  }));
  return { kennisOpties, maanden, perMaand: plan.pages_per_month };
}
