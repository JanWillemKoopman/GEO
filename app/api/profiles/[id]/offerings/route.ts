import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { isStaff } from "@/lib/staff";
import { resolveWriteSource } from "@/lib/profile-source";
import { activeOfferings } from "@/lib/offerings";
import {
  isOfferingKind,
  normaliseOfferingName,
  normaliseOptionalText,
  nextSortOrder,
  wouldCreateCycle,
} from "@/lib/offerings-validate";
import type { ProfileOffering } from "@/lib/types/database";
import { haalKnopenWeg, voegKnoopToe, werkKnoopBij, zetKnoopTerug } from "@/lib/kennis/uit-aanbod";

/**
 * De aanbodboom bewerken (onboarding Ronde C, §16.3, migratie 0079).
 *
 * ── WAAROM DIT NU PAS KAN ────────────────────────────────────────────────────
 *
 * `OfferingsPanel` was tot deze ronde een leesscherm zonder JavaScript: geen
 * route, dus geen manier om een dienst die niet op de site staat (nieuw, of
 * alleen telefonisch verkocht) toe te voegen. Precies het gat dat het
 * onboardinggesprek zou moeten dichten, en het enige waar geen ander veld voor
 * bestaat (§15.1).
 *
 * ── CONVENTIE 1 EN 6 ─────────────────────────────────────────────────────────
 *
 * Service-role client, ownership-check, en de validatie hier in de route, niet
 * in het scherm: naam, soort en de lus-controle op `parentId` staan in
 * `lib/offerings-validate.ts` en worden hier afgedwongen, niet aangenomen.
 *
 * ── DE KENNISLAAG (K8 deel 4) ────────────────────────────────────────────────
 *
 * Schrijven gaat via `lib/kennis/uit-aanbod.ts`: die werkt de tabel bij (de
 * kopie die de onderwerpen en clusters lezen) en legt de wijziging vast als
 * kennis. Wat een mens toevoegt of aanpast, is verklaard; wat hij weghaalt,
 * wijst hij af.
 */

async function loadForCycleCheck(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
): Promise<Pick<ProfileOffering, "id" | "parent_id">[]> {
  const { data } = await admin
    .from("profile_offerings")
    .select("id, parent_id")
    .eq("profile_id", profileId);
  return (data ?? []) as Pick<ProfileOffering, "id" | "parent_id">[];
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const staf = await isStaff(user.id);
  const bron = resolveWriteSource({
    requested: undefined,
    isStaff: staf,
    isOwner: profile.user_id === user.id,
  });
  if (!bron.ok) return NextResponse.json({ error: bron.error }, { status: bron.status });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const name = normaliseOfferingName(body.name);
  if (!name) {
    return NextResponse.json({ error: "Vul een naam in." }, { status: 400 });
  }
  if (!isOfferingKind(body.kind)) {
    return NextResponse.json({ error: "Ongeldig soort." }, { status: 400 });
  }

  const bestaand = await loadForCycleCheck(admin, id);
  let parentId: string | null = null;
  if (typeof body.parentId === "string" && body.parentId) {
    if (!bestaand.some((o) => o.id === body.parentId)) {
      return NextResponse.json(
        { error: "De bovenliggende knoop hoort niet bij dit merk." },
        { status: 400 },
      );
    }
    parentId = body.parentId;
  }

  const actief = await activeOfferings(admin, id);
  const sortOrder = nextSortOrder(actief);

  const door = { actor: "mens" as const, gebruikerId: user.id };
  const { id: nieuwId, error } = await voegKnoopToe(admin, {
    profileId: id,
    rij: {
      parent_id: parentId,
      kind: body.kind,
      name,
      description: normaliseOptionalText(body.description),
      audience: normaliseOptionalText(body.audience),
      price_indication: normaliseOptionalText(body.priceIndication),
      note: normaliseOptionalText(body.note),
      source: bron.source,
      sort_order: sortOrder,
      updated_by: user.id,
    },
  }, door);

  if (error || !nieuwId) {
    return NextResponse.json({ error: "Toevoegen is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ id: nieuwId });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const staf = await isStaff(user.id);
  const bron = resolveWriteSource({
    requested: undefined,
    isStaff: staf,
    isOwner: profile.user_id === user.id,
  });
  if (!bron.ok) return NextResponse.json({ error: bron.error }, { status: bron.status });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const offeringId = typeof body.id === "string" ? body.id : null;
  if (!offeringId) return NextResponse.json({ error: "Geen knoop opgegeven." }, { status: 400 });

  const bestaand = await loadForCycleCheck(admin, id);
  if (!bestaand.some((o) => o.id === offeringId)) {
    return NextResponse.json({ error: "Deze knoop hoort niet bij dit merk." }, { status: 404 });
  }

  const update: Record<string, unknown> = { updated_by: user.id, source: bron.source };

  if ("name" in body) {
    const name = normaliseOfferingName(body.name);
    if (!name) return NextResponse.json({ error: "Vul een naam in." }, { status: 400 });
    update.name = name;
  }
  if ("kind" in body) {
    if (!isOfferingKind(body.kind)) {
      return NextResponse.json({ error: "Ongeldig soort." }, { status: 400 });
    }
    update.kind = body.kind;
  }
  if ("description" in body) update.description = normaliseOptionalText(body.description);
  if ("audience" in body) update.audience = normaliseOptionalText(body.audience);
  if ("priceIndication" in body) update.price_indication = normaliseOptionalText(body.priceIndication);
  if ("note" in body) update.note = normaliseOptionalText(body.note);

  if ("parentId" in body) {
    const raw = body.parentId;
    const parentId = typeof raw === "string" && raw ? raw : null;
    if (parentId && !bestaand.some((o) => o.id === parentId)) {
      return NextResponse.json(
        { error: "De bovenliggende knoop hoort niet bij dit merk." },
        { status: 400 },
      );
    }
    // Lus-controle (§16.3, punt 2): een knoop mag niet onder zichzelf of onder
    // zijn eigen nakomeling hangen, anders loopt de boomopbouw voor altijd door.
    if (wouldCreateCycle(bestaand, offeringId, parentId)) {
      return NextResponse.json(
        { error: "Deze knoop kan niet onder zijn eigen tak hangen." },
        { status: 400 },
      );
    }
    update.parent_id = parentId;
  }

  const { error } = await werkKnoopBij(admin, { profileId: id, knoopId: offeringId, wijziging: update }, { actor: "mens", gebruikerId: user.id });
  if (error) return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const offeringId = typeof body.id === "string" ? body.id : null;
  if (!offeringId) return NextResponse.json({ error: "Geen knoop opgegeven." }, { status: 400 });

  // Herzetten: dezelfde route, met `restore: true`. Geen tweede endpoint voor
  // "3 verwijderd, tonen" met een terugzet-knop (§16.7).
  const door = { actor: "mens" as const, gebruikerId: user.id };
  if (body.restore === true) {
    const { error } = await zetKnoopTerug(admin, { profileId: id, knoopId: offeringId }, door);
    if (error) return NextResponse.json({ error: "Terugzetten is niet gelukt." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const alleKnopen = await loadForCycleCheck(admin, id);
  if (!alleKnopen.some((o) => o.id === offeringId)) {
    return NextResponse.json({ error: "Deze knoop hoort niet bij dit merk." }, { status: 404 });
  }

  // Onderliggende knopen gaan mee (§16.3, punt 3): anders blijft een kind
  // achter zonder ouder, en dat is geen boom meer.
  const nakomelingen = new Set<string>();
  let frontier = [offeringId];
  while (frontier.length > 0) {
    const kinderen = alleKnopen.filter((o) => o.parent_id && frontier.includes(o.parent_id));
    frontier = kinderen.map((k) => k.id);
    for (const k of frontier) nakomelingen.add(k);
  }

  const alleIds = [offeringId, ...nakomelingen];
  const { error } = await haalKnopenWeg(admin, { profileId: id, knoopIds: alleIds }, door);

  if (error) return NextResponse.json({ error: "Verwijderen is niet gelukt." }, { status: 500 });

  return NextResponse.json({ ok: true, kinderen: nakomelingen.size });
}
