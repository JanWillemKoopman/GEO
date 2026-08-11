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
import { isMember } from "@/lib/accounts";
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
 *
 * ── DE DERDE LAAG, EN DE FOUT DIE HIJ REPAREERT ─────────────────────────────
 *
 * ⚠️ Gevonden op 11 augustus 2026, in de ketentest die het uitnodigingspad
 * naspeelt. `getOwnedProfile()` kreeg bij migratie 0046 een derde laag (lid van
 * het account) en deze functie niet. De RLS op `analyses` kreeg hem wél
 * (`analyses_select_account`), en dáárdoor was het bijna onzichtbaar: een
 * uitgenodigde klant zág zijn analyses gewoon, want lezen loopt over RLS.
 *
 * Maar élke schrijfactie loopt over deze functie: vragen bevestigen, content
 * laten schrijven, een pagina goedkeuren, archiveren. Die gaven allemaal 404
 * voor precies de persoon voor wie het product bedoeld is. In Nova's model is
 * "de klant keurt goed" de hele rol van de klant, en goedkeuren is een
 * schrijfactie.
 *
 * De volgorde is dezelfde als bij `getOwnedProfile`: eerst het account, dan de
 * eigenaar, dan de beheerder. Elk een eigen vraag met een eigen antwoord.
 */
export async function getOwnedAnalysis(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  userId: string,
): Promise<Analysis | null> {
  const { data } = await admin.from("analyses").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const analyse = data as Analysis;

  if (analyse.user_id === userId) return analyse;

  // Via het merk naar het account. Een analyse heeft zelf geen `account_id`:
  // hij hangt aan een merk, en het merk hangt aan een account. Die sprong hoort
  // hier en niet in een kolom, want een merk kan van account wisselen bij een
  // toewijzing en dan moeten de analyses vanzelf meeverhuizen.
  if (analyse.profile_id) {
    const { data: profielRij } = await admin
      .from("profiles")
      .select("account_id")
      .eq("id", analyse.profile_id)
      .maybeSingle();
    const accountId = (profielRij?.account_id as string | null) ?? null;
    if (await isMember(userId, accountId)) return analyse;
  }

  if (await isStaff(userId)) return analyse;
  return null;
}
