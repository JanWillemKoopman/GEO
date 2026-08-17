import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { MAX_PAGES_HARD_CAP } from "@/lib/crawler";
import { clampToneSlider, clampEmotional } from "@/lib/pipeline/tone-sliders";
import { EDITABLE_PROFILE_FIELDS } from "@/lib/profile-editable";

/**
 * PATCH /api/profiles/[id], klantprofiel bewerken. Geen AI-call: pure CRUD op
 * al bestaande data. Zet edited_by_user = true. Zelfde patroon als de vroegere
 * brand-dna-route. `sitemap_url` en `max_inventory_pages` zijn de crawl-
 * instellingen voor de content-inventaris (§12.23).
 */
const EDITABLE_FIELDS = EDITABLE_PROFILE_FIELDS;

/** Lijstvelden: lege en niet-tekstuele items eruit, de rest getrimd. */
const LIST_FIELDS = [
  "taboo_phrases",
  "key_messages",
  "identity_keywords",
  "signature_phrases",
] as const;

/** Vrije tekst: een leeg veld wordt `null`, nooit een lege string. */
const NULLABLE_TEXT_FIELDS = [
  "compliance_notes",
  "brand_mission",
  "brand_positioning",
  "usp",
  "differentiator",
  "audience_secondary",
  "author_photo_url",
  "author_facebook_url",
  "author_other_url",
] as const;

/** De aanspreekvorm van de CONTENT, niet van ORBIT ENGINE's eigen interface. */
const PRONOUNS = ["je", "u", "wij"] as const;

/** Velden die als 1-3 geklemd worden in plaats van rechtstreeks opgeslagen. */
const TONE_SLIDER_FIELDS = ["tone_formality", "tone_energy", "tone_complexity", "tone_humor"] as const;

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
  // Tone-sliders: geklemd naar 1-3, of null bij een lege/ontbrekende waarde.
  // Nooit rechtstreeks een client-getal doorlaten naar de databaseconstraint.
  for (const field of TONE_SLIDER_FIELDS) {
    if (field in update) {
      const raw = update[field];
      update[field] = raw === null || raw === "" || raw === undefined ? null : clampToneSlider(raw);
    }
  }
  // Het kennisniveau van de doelgroep loopt óók van 1 tot 3, dus dezelfde klem.
  if ("audience_knowledge_level" in update) {
    const raw = update.audience_knowledge_level;
    update.audience_knowledge_level =
      raw === null || raw === "" || raw === undefined ? null : clampToneSlider(raw);
  }
  // De emotionele lading is de enige met vier standen (migratie 0048).
  if ("tone_emotional" in update) {
    update.tone_emotional = clampEmotional(update.tone_emotional);
  }
  // Aanspreekvorm: alleen de drie bekende waarden, anders null. Nooit een
  // client-string rechtstreeks naar de databaseconstraint.
  if ("pronoun_preference" in update) {
    const raw = String(update.pronoun_preference ?? "");
    update.pronoun_preference = (PRONOUNS as readonly string[]).includes(raw) ? raw : null;
  }
  // Lijstvelden: lege of niet-tekstuele items eruit, net als TagListEditor
  // dat elders al doet voor products/value_props/competitors.
  for (const field of LIST_FIELDS) {
    if (field in update) {
      const raw = update[field];
      update[field] = Array.isArray(raw)
        ? raw
            .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
            .map((v) => v.trim())
        : [];
    }
  }
  // Vrije tekst: leeg wordt null. Conventie 3, en het scheelt overal een
  // controle op twee soorten leegte.
  for (const field of NULLABLE_TEXT_FIELDS) {
    if (field in update) {
      const raw = update[field];
      update[field] = typeof raw === "string" && raw.trim() ? raw.trim() : null;
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
