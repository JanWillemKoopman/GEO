import "server-only";

/**
 * Wie mag bij de Sales-module? (`docs/tasks/geo-prospect-engine.md` §4.2)
 *
 * ── WAAROM DIT NAAST `lib/staff.ts` STAAT EN ER NIET IN ZIT ─────────────────
 *
 * De beheerdersrol is de breedste bevoegdheid in de applicatie: alles zien, ook
 * de klantomgeving. De salesrol is smal en gaat één kant op. Een salesmedewerker
 * moet bij de opportunities kunnen, maar hoort niet ongevraagd in het
 * merkdossier van een bestaande klant te kunnen kijken. Twee rollen met twee
 * verschillende reikwijdtes horen niet in één functie, want dan verbreedt de
 * ene stilletjes met de andere mee.
 *
 * De andere kant op mag wél, en dat is bewust: een beheerder is automatisch ook
 * sales admin. Dat staat in de database (`is_sales()` roept `is_staff()` aan) en
 * hier, zodat de server en de RLS-policy hetzelfde antwoord geven. Zouden ze
 * uiteenlopen, dan ziet iemand een knop die de database weigert.
 *
 * ── DE GRENS ────────────────────────────────────────────────────────────────
 *
 * `sales_users` heeft RLS aan en NUL policies (migratie 0068, net als
 * `staff_users` en `jobs`). Niemand kan via de API uitlezen wie salesmedewerker
 * is, en niemand kan zichzelf toevoegen. Dat gebeurt alleen in het
 * Supabase-dashboard.
 */
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaff } from "@/lib/staff";

/**
 * De rij uit `sales_users`, of `null`. Gememoïseerd per request: een Sales-scherm
 * vraagt eerst of je binnen mag en daarna of je de dure knoppen mag indrukken,
 * en dat hoort één query te zijn.
 *
 * Faalt zacht naar `null`. Een storing in deze query mag nooit iemand onbedoeld
 * toegang geven; de veilige kant is "geen sales".
 */
const salesRij = cache(async (userId: string): Promise<{ is_admin: boolean } | null> => {
  if (!userId) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("sales_users")
      .select("is_admin")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("Salescontrole mislukt:", error.message);
      return null;
    }
    return data ? { is_admin: Boolean(data.is_admin) } : null;
  } catch (err) {
    console.error("Salescontrole mislukt:", err);
    return null;
  }
});

/**
 * Mag deze gebruiker de Sales-sectie zien?
 *
 * Een beheerder mag dat automatisch. Zonder die regel zou de eigenaar zichzelf
 * eerst in een tweede tabel moeten zetten om zijn eigen module te kunnen
 * openen, en dan is er een stand waarin de app zegt dat het scherm niet bestaat
 * terwijl hij het net gebouwd heeft.
 */
export async function isSales(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (await isStaff(userId)) return true;
  return (await salesRij(userId)) !== null;
}

/**
 * Mag deze gebruiker de knoppen indrukken die geld kosten of naar buiten gaan?
 *
 * Een markt starten, een meting herhalen, een rapport publiceren of intrekken.
 * Dat is dezelfde gedachte als besluit 18 aan de klantkant: wie betaalt, beslist
 * wanneer er betaald wordt.
 */
export async function isSalesAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (await isStaff(userId)) return true;
  return (await salesRij(userId))?.is_admin === true;
}
