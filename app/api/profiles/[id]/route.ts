import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { MAX_PAGES_HARD_CAP } from "@/lib/crawler";

/**
 * PATCH /api/profiles/[id] — klantprofiel bewerken. Geen AI-call: pure CRUD op
 * al bestaande data. Zet edited_by_user = true. Zelfde patroon als de vroegere
 * brand-dna-route. `sitemap_url` en `max_inventory_pages` zijn de crawl-
 * instellingen voor de content-inventaris (§12.23).
 */
const EDITABLE_FIELDS = [
  "name",
  "industry",
  // Het bedrijfsmodel (R8.5, migratie 0032). Bewerkbaar omdat de klant beter
  // weet dan het model of hij een retailer of een fabrikant is — en omdat deze
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
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

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
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
