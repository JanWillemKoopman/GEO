import "server-only";

/**
 * De budgetpoort van de onboarding (docs/tasks/onboarding-2.0.md, blok B).
 *
 * ── WAAROM DIT EEN POORT IS EN GEEN SCHATTING ───────────────────────────────
 *
 * Het plafond is €2 (≈ $2,15) per onboarding. Dat is ruim: het volledige
 * onderzoek landt op $0,50–1,00. Maar "ruim" is geen garantie, een site met
 * 150 pagina's, een tweede engine erbij en een herhaalronde na een correctie
 * lopen samen wél op, en dan is de eerste die het merkt de creditcard.
 *
 * Dus wordt het geteld, niet geschat. `ai_calls` heeft sinds migratie 0012 een
 * `profile_id` en `cost_usd` per aanroep; dit is niets meer dan de som daarvan.
 *
 * ── OVERSLAAN IS EEN UITKOMST, GEEN STILTE ──────────────────────────────────
 *
 * Loopt het budget op, dan wordt een fase overgeslagen en wordt dát vastgelegd
 * (conventie 3 en 8). Nooit stil degraderen: een profiel waarvan de kennistest
 * niet gedraaid heeft, moet er anders uitzien dan een profiel waarvan de
 * kennistest niets vond.
 *
 * De volgorde van de pijplijn is daarop afgestemd, goedkoop en fundamenteel
 * eerst, duur en verrijkend laatst. "Budget op" is daardoor automatisch de
 * juiste keuze in plaats van een willekeurige.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;

/** Wat er tot nu toe aan dit profiel is uitgegeven, in USD. */
export async function spentOnProfileUsd(
  admin: Admin,
  profileId: string,
): Promise<number> {
  const { data, error } = await admin
    .from("ai_calls")
    .select("cost_usd")
    .eq("profile_id", profileId);

  if (error) {
    // Kan de poort niet tellen, dan doet hij niet alsof hij het weet. Nul
    // teruggeven zou de poort stil openzetten; dit laat hem juist sluiten,
    // want de aanroepers vergelijken met het plafond.
    console.error(
      `Kosten van profiel ${profileId} optellen mislukt: ${error.message}`,
    );
    return Number.POSITIVE_INFINITY;
  }

  return (data ?? []).reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);
}

/** Hoeveel er nog over is. Negatief = eroverheen. */
export async function remainingBudgetUsd(
  admin: Admin,
  profileId: string,
  budgetUsd: number,
): Promise<number> {
  const spent = await spentOnProfileUsd(admin, profileId);
  if (!Number.isFinite(spent)) return 0;
  return Number((budgetUsd - spent).toFixed(6));
}

/**
 * Past een fase van deze geschatte omvang er nog in?
 *
 * De schatting mag ruw zijn, hij hoeft alleen te voorkomen dat een dure fase
 * begint met een paar cent over. Te voorzichtig zijn kost een fase, te
 * optimistisch zijn kost geld; bij twijfel wint voorzichtig.
 */
export async function fitsInBudget(
  admin: Admin,
  profileId: string,
  budgetUsd: number,
  estimatedUsd: number,
): Promise<boolean> {
  return (
    (await remainingBudgetUsd(admin, profileId, budgetUsd)) >= estimatedUsd
  );
}
