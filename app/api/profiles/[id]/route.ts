import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { MAX_PAGES_HARD_CAP } from "@/lib/crawler";

/**
 * PATCH /api/profiles/[id], klantprofiel bewerken. Geen AI-call: pure CRUD op
 * al bestaande data. Zet edited_by_user = true. Zelfde patroon als de vroegere
 * brand-dna-route. `sitemap_url` en `max_inventory_pages` zijn de crawl-
 * instellingen voor de content-inventaris (§12.23).
 */
const EDITABLE_FIELDS = [
  "name",
  "industry",
  // Het bedrijfsmodel (R8.5, migratie 0032). Bewerkbaar omdat de klant beter
  // weet dan het model of hij een retailer of een fabrikant is, en omdat deze
  // waarde stuurt welke briefingvragen hij straks krijgt. De database-constraint
  // bewaakt de toegestane waarden.
  "business_model",
  "tone_of_voice",
  "summary",
  "products",
  "value_props",
  "competitors",
  "personas",
  "intake_description",
  "intake_audience",
  "aliases",
  "service_scope",
  "service_regions",
  "market_language",
  "sitemap_url",
] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const update: Record<string, unknown> = { edited_by_user: true };
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  // sitemap_url: lege string → null (dan valt de crawler terug op auto-detectie).
  if ("sitemap_url" in update) {
    const raw = typeof update.sitemap_url === "string" ? update.sitemap_url.trim() : "";
    update.sitemap_url = raw || null;
  }
  // max_inventory_pages: geheel getal, geklemd binnen [5, harde bovengrens].
  if ("max_inventory_pages" in body) {
    const n = Math.round(Number(body.max_inventory_pages));
    if (Number.isFinite(n)) {
      update.max_inventory_pages = Math.min(Math.max(n, 5), MAX_PAGES_HARD_CAP);
    }
  }

  const { error } = await admin.from("profiles").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });
  }

  // ── Herkomst vastleggen (3 aug 2026) ──────────────────────────────────────
  //
  // `edited_by_user = true` zegt dát er iets met de hand is aangepast, niet WÁT.
  // `filterProtectedFields()` in prepare-profile.ts beslist per veld, en leest
  // daarvoor `profile_field_sources`. Die tabel werd tot nu alleen gevuld door
  // de strategieroute, en dan nog uitsluitend voor aliassen en werkgebied uit de
  // contextfactoren.
  //
  // Gevolg: dit, de gewone manier waarop iemand een profiel corrigeert, liet
  // geen spoor achter, en de knop "onderzoek opnieuw" zou elke correctie zonder
  // waarschuwing overschrijven. Precies het scenario waar migratie 0039 voor
  // gemaakt is, en precies het scenario dat hij niet dekte.
  //
  // 'klant' als de eigenaar zelf bewerkt, 'gesprek' als de consultant het voor
  // hem doet. Allebei menselijk (`isHumanSet`), dus voor de bescherming maakt
  // het niet uit, voor de vraag "wie zei dit?" een halfjaar later wel.
  const bewerkteVelden = EDITABLE_FIELDS.filter((f) => f in body);
  if (bewerkteVelden.length > 0) {
    const bron = profile.user_id === user.id ? "klant" : "gesprek";
    const nu = new Date().toISOString();
    const { error: bronError } = await admin.from("profile_field_sources").upsert(
      bewerkteVelden.map((field) => ({
        profile_id: id,
        field,
        source: bron,
        confidence: 1,
        set_by: user.id,
        set_at: nu,
      })),
      { onConflict: "profile_id,field" },
    );
    // Bewust geen 500: het profiel ís opgeslagen. Een mislukte herkomstregel
    // teruggeven als "opslaan mislukt" zou de klant zijn wijziging laten
    // overtypen terwijl hij er al staat.
    if (bronError) {
      console.error(
        `Herkomst vastleggen mislukt voor profiel ${id} ` +
          `(${bewerkteVelden.length} veld(en) wél opgeslagen): ${bronError.message}`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
