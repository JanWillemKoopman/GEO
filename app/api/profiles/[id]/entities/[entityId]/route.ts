import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { normalizeEntityName } from "@/lib/entities/normalize";
import type { Entity } from "@/lib/types/database";

/**
 * PATCH/DELETE /api/profiles/[id]/entities/[entityId] — één concurrent beheren
 * (optimalisatie.md 2.7). Geen AI-call.
 *
 * PATCH kent drie dingen, die elkaar niet uitsluiten:
 *   • `canonical_name`  — anders schrijven (de weergavenaam)
 *   • `confirmed` / `dismissed` — meetellen in het aandeel, of wegzetten
 *   • `mergeIntoId`     — "dit is dezelfde als…": deze entiteit gaat op in een
 *                         andere en verdwijnt
 */
type Admin = ReturnType<typeof createAdminClient>;

async function loadOwnedEntity(
  admin: Admin,
  profileId: string,
  entityId: string,
  userId: string,
): Promise<Entity | null> {
  if (!(await getOwnedProfile(admin, profileId, userId))) return null;
  const { data } = await admin
    .from("entities")
    .select("*")
    .eq("id", entityId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return (data as Entity | null) ?? null;
}

/**
 * Voegt `source` samen in `target`: alle schrijfwijzen verhuizen mee, alle
 * gemeten vermeldingen wijzen voortaan naar `target`, en `source` verdwijnt.
 *
 * De volgorde is niet vrijblijvend. Eerst de vermeldingen omhangen, dán pas de
 * bronrij verwijderen: andersom zou de foreign key ze op null zetten
 * (`on delete set null`) en waren de metingen hun entiteit kwijt — precies de
 * data die de klant probeerde op te ruimen.
 */
async function mergeEntities(admin: Admin, source: Entity, target: Entity) {
  const aliases = Array.from(
    new Set([...(target.aliases ?? []), ...(source.aliases ?? []), source.normalized]),
  ).filter((a) => a !== target.normalized);

  await admin.from("tracking_run_mentions").update({ entity_id: target.id }).eq("entity_id", source.id);
  await admin
    .from("entities")
    .update({ aliases, confirmed: target.confirmed || source.confirmed })
    .eq("id", target.id);
  await admin.from("entities").delete().eq("id", source.id);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  const { id, entityId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const entity = await loadOwnedEntity(admin, id, entityId, user.id);
  if (!entity) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // ── Samenvoegen ───────────────────────────────────────────────────────────
  if (typeof body.mergeIntoId === "string") {
    if (body.mergeIntoId === entityId) {
      return NextResponse.json({ error: "Een concurrent kan niet in zichzelf opgaan." }, { status: 400 });
    }
    const target = await loadOwnedEntity(admin, id, body.mergeIntoId, user.id);
    if (!target) return NextResponse.json({ error: "Doelconcurrent niet gevonden." }, { status: 404 });

    await mergeEntities(admin, entity, target);
    return NextResponse.json({ ok: true, mergedInto: target.id });
  }

  // ── Gewone wijzigingen ────────────────────────────────────────────────────
  const update: Record<string, unknown> = {};

  if (typeof body.canonical_name === "string") {
    const name = body.canonical_name.trim();
    if (!name) return NextResponse.json({ error: "Naam mag niet leeg zijn." }, { status: 400 });
    update.canonical_name = name;

    // De genormaliseerde vorm meeveranderen zou de koppeling met eerdere
    // metingen kunnen breken, dus die blijft staan — de oude vorm gaat als alias
    // mee zodat toekomstige metingen op beide schrijfwijzen aanhaken.
    const normalized = normalizeEntityName(name);
    if (normalized && normalized !== entity.normalized) {
      update.aliases = Array.from(new Set([...(entity.aliases ?? []), normalized]));
    }
  }

  if (typeof body.confirmed === "boolean") {
    update.confirmed = body.confirmed;
    // Bevestigen en weggezet-zijn spreken elkaar tegen; bevestigen wint.
    if (body.confirmed) update.dismissed = false;
  }
  if (typeof body.dismissed === "boolean") {
    update.dismissed = body.dismissed;
    if (body.dismissed) update.confirmed = false;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Niets om op te slaan." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("entities")
    .update(update)
    .eq("id", entityId)
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * Definitief verwijderen. Bewust NIET de standaardactie in de UI: wie een merk
 * weghaalt dat de meting daarna opnieuw tegenkomt, krijgt hem gewoon terug als
 * onbevestigde nieuwkomer. "Geen concurrent van mij" (dismissed) onthoudt de
 * keuze wél — vandaar dat dat in het scherm de prominente knop is.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; entityId: string }> },
) {
  const { id, entityId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await loadOwnedEntity(admin, id, entityId, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  const { error } = await admin.from("entities").delete().eq("id", entityId);
  if (error) return NextResponse.json({ error: "Verwijderen mislukt." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
