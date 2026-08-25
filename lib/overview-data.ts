import "server-only";

/**
 * De tellingen onder de vier cijfers van de startpagina.
 *
 * De rekenkant staat in `lib/overview.ts`, zonder `server-only` (conventie 2).
 * Hier staat alleen het ophalen.
 *
 * ── ⚠️ DIT VERVANGT `lib/milestones-data.ts` (26 AUGUSTUS 2026) ─────────────
 *
 * Het opbrengstblok ("Actief sinds", "+30 punten", "1 pagina gepubliceerd") is
 * van de startpagina gehaald. Van die drie getallen blijft er één over, en die
 * staat nu bovenaan tussen de vier programmacijfers. De rest van dat blok, plus
 * de waarde per vermelding uit besluit 16, staat in de git-historie; zie
 * `docs/logbook.md` voor waarom het er ooit stond.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { activeOnly } from "@/lib/archive";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Hoeveel pagina's van dit merk staan live?
 *
 * ⚠️ Uit `content_pieces.published_at` en niet uit `planned_pages.posted_at`.
 * Dat zijn twee verschillende verzamelingen: een pagina die geschreven is
 * vóórdat het contentplan bestond, hangt aan geen enkele planregel. Het
 * contentplan telt zijn eigen pagina's en benoemt het verschil
 * (`lib/overview.ts`, `planRegels`).
 */
export async function loadGepubliceerd(admin: Admin, profileId: string): Promise<number> {
  const { data: analysisRows } = await activeOnly(
    admin.from("analyses").select("id").eq("profile_id", profileId),
  );
  const analysisIds = ((analysisRows ?? []) as { id: string }[]).map((a) => a.id);
  if (analysisIds.length === 0) return 0;

  const { count } = await admin
    .from("content_pieces")
    .select("id", { count: "exact", head: true })
    .in("analysis_id", analysisIds)
    .not("published_at", "is", null);

  return count ?? 0;
}
