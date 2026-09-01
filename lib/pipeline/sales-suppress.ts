import "server-only";

/**
 * Stap 2b: wie hoort hier niet in (`docs/tasks/geo-prospect-engine.md` 9.5).
 *
 * ── DE ENIGE PLEK WAAR SALES DE KLANTOMGEVING LEEST ─────────────────────────
 *
 * Plan 4.3, regel 1: geen enkele Sales-route leest of schrijft in `profiles` of
 * `analyses` van bestaande klanten, met één uitzondering. Dit is die
 * uitzondering, en het verkeer gaat maar één kant op: Sales kijkt wie er klant is
 * om die eruit te houden. Er wordt niets in de klantomgeving geschreven, en er
 * komt niets van hier op een klantscherm.
 *
 * De query leest daarom ook maar drie velden. Geen scores, geen dossiers, geen
 * contactpersonen: het webadres, de naam en of het merk aan een klant is
 * toegewezen. Meer is er niet nodig om te bepalen of iemand met rust gelaten
 * moet worden.
 *
 * ── GEEN AI-AANROEP, EN BIJ ELKE RONDE OPNIEUW ──────────────────────────────
 *
 * Twee query's en een vergelijking. Draait bij elke meetronde opnieuw, want een
 * markt waar vandaag geen klant zit kan er over drie maanden wel een hebben.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeUrl } from "@/lib/url";
import {
  bepaalUitsluitingen,
  marktWaarschuwing,
  type BekendMerk,
  type TeToetsenBedrijf,
} from "@/lib/sales/suppression";

type Admin = SupabaseClient;

export interface UitsluitUitkomst {
  bekeken: number;
  uitgesloten: number;
  waarschuwing: string | null;
}

export async function sluitUit(admin: Admin, marketId: string): Promise<UitsluitUitkomst> {
  // ── De bedrijven in deze markt ──────────────────────────────────────────
  const { data: leden } = await admin
    .from("sales_market_companies")
    .select("company_id, sales_companies (id, domain, do_not_contact)")
    .eq("market_id", marketId);

  type Lid = {
    company_id: string;
    sales_companies: { id: string; domain: string | null; do_not_contact: boolean } | null;
  };

  const bedrijven: TeToetsenBedrijf[] = ((leden ?? []) as unknown as Lid[])
    .map((l) => l.sales_companies)
    .filter((c): c is NonNullable<Lid["sales_companies"]> => Boolean(c))
    .map((c) => ({
      companyId: c.id,
      domein: c.domain,
      doNotContact: Boolean(c.do_not_contact),
    }));

  if (bedrijven.length === 0) {
    return { bekeken: 0, uitgesloten: 0, waarschuwing: null };
  }

  // ── Wie er al klant is, of al klaarstaat ────────────────────────────────
  //
  // `assigned_at` is het verschil tussen een klant en een voorbereid traject
  // (migratie 0038). Het product is sales-led: de consultant zet een merkprofiel
  // klaar vóór het demogesprek en wijst het pas ná de verkoop toe. Beide zijn een
  // reden om er vanuit Sales niet ook achteraan te gaan, met een andere reden
  // erbij.
  const { data: merken } = await admin
    .from("profiles")
    .select("id, name, brand_name, url, assigned_at");

  const bekend: BekendMerk[] = ((merken ?? []) as {
    id: string;
    name: string | null;
    brand_name: string | null;
    url: string | null;
    assigned_at: string | null;
  }[]).map((m) => ({
    profileId: m.id,
    domein: normalizeUrl(m.url ?? ""),
    naam: m.brand_name || m.name || "een merk van ons",
    toegewezen: Boolean(m.assigned_at),
  }));

  const uitsluitingen = bepaalUitsluitingen(bedrijven, bekend);

  for (const u of uitsluitingen) {
    // ⚠️ De uitsluiting hangt aan het BEDRIJF en niet aan de markt: een klant van
    // ons is in elke markt een klant van ons. Dat is de reden dat de unieke index
    // op `(company_id, kind)` staat en niet op `(market_id, company_id, kind)`.
    const { error } = await admin.from("sales_suppressions").insert({
      company_id: u.companyId,
      kind: u.kind,
      reason: u.reason,
      related_profile_id: u.relatedProfileId,
    });
    // Al vastgelegd bij een vorige ronde. Precies wat de index moet doen.
    if (error && error.code !== "23505") {
      console.error(`Uitsluiting vastleggen mislukt (${u.companyId}):`, error.message);
    }

    // Een uitgesloten bedrijf gaat uit de lijst, met de reden erbij. Het blijft
    // staan (9.5, laatste alinea): zou het verdwijnen, dan komt het bij de
    // volgende ronde weer boven als nieuwe kans.
    await admin
      .from("sales_market_companies")
      .update({ included: false, excluded_reason: u.reason })
      .eq("market_id", marketId)
      .eq("company_id", u.companyId);
  }

  const waarschuwing = marktWaarschuwing(uitsluitingen);
  await admin
    .from("sales_markets")
    .update({ conflict_note: waarschuwing })
    .eq("id", marketId);

  // Ook de markt-brede waarschuwing wordt vastgelegd, niet alleen getoond. Een
  // waarschuwing die alleen op een scherm staat, verdwijnt bij de volgende ronde.
  if (waarschuwing) {
    const { error } = await admin.from("sales_suppressions").insert({
      market_id: marketId,
      kind: "concurrent_van_klant",
      reason: waarschuwing,
    });
    if (error && error.code !== "23505") {
      console.error(`Marktwaarschuwing vastleggen mislukt (${marketId}):`, error.message);
    }
  }

  return {
    bekeken: bedrijven.length,
    uitgesloten: uitsluitingen.length,
    waarschuwing,
  };
}
