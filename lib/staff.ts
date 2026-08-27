import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Is dit een account van ORBIT ENGINE zelf?
 *
 * ── HET ECHTE RECHT, LOS VAN DE KLANTWEERGAVE ───────────────────────────────
 *
 * Dit is de rauwe database-vraag: staat deze gebruiker in `staff_users`. Elke
 * ownership- en kostencontrole in de app hoort tegen `isStaff()` hieronder aan
 * te liggen, niet tegen deze functie: die twee zijn tot 27 augustus 2026
 * hetzelfde geweest en zijn toen uit elkaar getrokken (zie daar voor het
 * waarom). Deze functie bestaat om precies één ding te kunnen: de
 * wisselknop in de bovenbalk laten zien aan wie hem mag gebruiken, ook
 * terwijl die persoon zelf op de klantweergave staat.
 */
export const isStaffAccount = cache(async (userId: string): Promise<boolean> => {
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

/** De naam van de cookie die de klantweergave aanzet. Waarde "1" of afwezig. */
export const PREVIEW_COOKIE = "orbit_engine_klantweergave";

/**
 * Staat de klantweergave aan voor déze browser?
 *
 * ⚠️ Een cookie kan hier nooit iets ONGEOORLOOFDS mee doen: hij kan alleen een
 * echte beheerder tijdelijk laten lezen als klant, nooit een klant laten lezen
 * als beheerder. `isStaff()` hieronder combineert deze vlag met het echte recht
 * en de vlag wint alleen als het echte recht er al was. Vandaar dat deze
 * functie geen eigen slot nodig heeft: hij mag door iedereen gelezen worden,
 * want hij betekent voor een klant sowieso niets.
 *
 * ⚠️ Faalt zacht naar `false` buiten een echt verzoek. `cookies()` bestaat
 * alleen binnen de levenscyclus van een Next.js-verzoek; roept iets `isStaff()`
 * aan zonder dat verzoek (een achtergrondtaak, een script, een ketentest die
 * een route-handler rechtstreeks aanroept), dan gooit `cookies()` zelf een
 * fout. Dat mag nooit een dure of beheerdersactie laten struikelen op iets wat
 * met de klantweergave niets te maken heeft: buiten een verzoek bestaat de
 * klantweergave niet, dus is "niet aan het previewen" het enige zinnige
 * antwoord.
 */
export async function previewingAsClient(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.get(PREVIEW_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

/**
 * Mag deze gebruiker zich als beheerder gedragen, HIER EN NU?
 *
 * ── DE WISSELKNOP, EN WAAROM DIT DE ENIGE PLEK IS DIE HEM AFDWINGT ──────────
 *
 * Sinds 27 augustus 2026 kan een echte beheerder zichzelf tijdelijk laten
 * werken als klant: één knop rechtsboven in de bovenbalk
 * (`components/preview-toggle.tsx`), bedoeld om snel te zien wat een klant
 * ziet zonder in en uit te loggen. Elke plek in de app die "isStaff" vroeg,
 * vroeg feitelijk twee dingen tegelijk: hoort deze menu-groep, deze knop, deze
 * dure aanroep bij een beheerder, en is dat wat er nu op het scherm moet staan.
 * Die twee vragen door elkaar heen beantwoorden op tientallen plekken zou op
 * tientallen plekken apart de klantweergave moeten meenemen, en één vergeten
 * plek toont een klant iets dat hij niet zou moeten kunnen, of toont een
 * previewende beheerder iets dat de klant juist niet ziet en maakt de preview
 * zo onbetrouwbaar.
 *
 * Daarom zit de klantweergave op precies één plek: hier. Overal waar de app
 * zich al afvroeg "isStaff(user.id)", voor menu's, knoppen, 404's op
 * beheerschermen én de sloten in `lib/cost-guard.ts`, geldt nu automatisch ook
 * de klantweergave, zonder dat die plekken ervan hoeven te weten.
 *
 * Faalt zacht naar `false`: een storing in de controle mag nooit iemand
 * onbedoeld beheerdersrechten geven.
 */
export const isStaff = cache(async (userId: string): Promise<boolean> => {
  const echt = await isStaffAccount(userId);
  if (!echt) return false;
  return !(await previewingAsClient());
});
