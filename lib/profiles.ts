import "server-only";

/**
 * Haalt profielen op namens de ingelogde user. Zelfde patroon als lib/analyses.ts:
 * lezen loopt via RLS (SELECT-only, gefilterd op user_id), schrijven altijd via
 * de service-role client met expliciete ownership-check.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAccess } from "@/lib/access";
import type { Profile } from "@/lib/types/database";

/**
 * Gememoïseerd per request (net als `isStaff`, zie lib/staff.ts): de
 * profielpagina en `generateMetadata` (A.4, paginatitels) roepen dit allebei
 * voor hetzelfde profiel aan, zonder cache twee keer dezelfde query.
 */
export const getProfile = cache(async (id: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile | null) ?? null;
});

/**
 * Mag deze gebruiker aan dit profiel schrijven? Drie lagen, in deze volgorde.
 *
 *   1. hij zit in het account waar het merk aan hangt   (migratie 0046)
 *   2. of hij is de historische eigenaar                 (`profiles.user_id`)
 *   3. of hij is beheerder van ORBIT ENGINE                      (`isStaff`)
 *
 * Laag 1 is nieuw en is de hoofdregel: sinds besluit 9 en 10 kan een klant een
 * bureau zijn met meerdere merken, en dan is "eigenaar" geen bruikbaar begrip
 * meer. Laag 2 blijft bewust staan zolang niet op productie is nageteld dat élk
 * merk een account heeft; hem nu weghalen zou betekenen dat de backfill van
 * 0046 foutloos moet zijn geweest voordat er iemand inlogt.
 *
 * Laag 3 is nodig omdat de eigenaar een profiel opbouwt vóór het demogesprek en
 * het daarna toewijst aan de klant (migratie 0038). Zonder die regel kon hij het
 * profiel dat hij zelf aanmaakte niet meer bijwerken zodra hij het had
 * overgedragen. Precies wanneer de begeleiding begint.
 *
 * ⚠️ Dit is samen met `getOwnedAnalysis()` de enige poort tussen een verzoek en
 * andermans data. Een `||` er verkeerd neerzetten geeft iedereen toegang tot
 * alles. Daarom is elke laag een aparte, expliciete vraag met een eigen
 * `return`, en staat er nergens één samengestelde voorwaarde.
 */
export async function getOwnedProfile(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  userId: string,
): Promise<Profile | null> {
  const { data } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const profile = data as Profile;

  // Het oordeel staat in `lib/access.ts` en niet hier: deze functie en
  // `getOwnedAnalysis` dreven precies op dit punt uit elkaar. Zie de kop van
  // dat bestand voor wat dat kostte.
  const ok = await hasAccess(userId, {
    ownerId: profile.user_id,
    accountId: profile.account_id,
  });
  return ok ? profile : null;
}
