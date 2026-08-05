import "server-only";

/**
 * Wie beheert de app? (docs/tasks/onboarding-2.0.md, blok A)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De app is verkoopgedreven geworden: de eigenaar zet een klantprofiel klaar
 * vóór het demogesprek en wijst het daarna toe aan het account van de klant.
 * Vanaf dat moment is hij niet meer de eigenaar van dat profiel, terwijl hij
 * de klant juist dán gaat begeleiden. Zonder een beheerdersrol zou hij het
 * profiel dat hij zelf opbouwde uit het oog verliezen op het moment dat de
 * samenwerking begint.
 *
 * ── DE GRENS ────────────────────────────────────────────────────────────────
 *
 * Dit geeft LEESTOEGANG tot alles en schrijftoegang via de API-routes. Het is
 * de breedste bevoegdheid in de applicatie. Twee dingen houden hem in toom:
 *
 *   1. `staff_users` heeft RLS aan en NUL policies (migratie 0038, net als
 *      `jobs`). Niemand kan via de API uitlezen wie beheerder is, en niemand
 *      kan zichzelf toevoegen. Dat gebeurt alleen in het Supabase-dashboard.
 *   2. Deze functie is de ENIGE plek die dat bepaalt. Elke ownership-check leest
 *      hem; er is geen tweede route naar dezelfde beslissing.
 */
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Is deze gebruiker beheerder? Gememoïseerd per request: `getOwnedProfile` en
 * `getOwnedAnalysis` roepen hem allebei aan, en een pagina die tien analyses
 * rendert zou anders tien identieke queries doen.
 *
 * Faalt zacht naar `false`. Een storing in deze query mag nooit iemand
 * onbedoeld beheerder maken, de veilige kant is "gewone gebruiker".
 */
export const isStaff = cache(async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("staff_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("Beheerderscontrole mislukt:", error.message);
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.error("Beheerderscontrole mislukt:", err);
    return false;
  }
});
