import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { normaliseerLabelnaam, vindLabel, zelfdeLabelnaam, MAX_LABELNAAM } from "@/lib/cluster-labels";
import type { ClusterLabel } from "@/lib/types/database";

/**
 * Eén label hernoemen (PATCH) of weggooien (DELETE), migratie 0083.
 *
 * ── WAAROM HERNOEMEN ÉÉN RIJ RAAKT EN NIETS ANDERS ──────────────────────────
 *
 * Precies waarvoor `cluster_labels` een tabel is en geen tekstkolom op
 * `analyses`. De clusters wijzen naar het label-id, dus "Onderhoud" wordt
 * "Onderhoud en storing" met één update, en elk cluster eronder verhuist mee.
 * Met een tekstkolom was dit een update over alle clusters heen die halverwege
 * kon stranden.
 *
 * ── WEGGOOIEN NEEMT NOOIT EEN CLUSTER MEE ───────────────────────────────────
 *
 * `on delete set null` in migratie 0083: de clusters onder dit label blijven
 * staan, ze hebben daarna alleen geen label meer. Het cluster draagt maanden
 * meetdata, het label draagt een woord, en die twee horen niet aan hetzelfde
 * touwtje te hangen.
 */
async function labelVanEigenMerk(profileId: string, labelId: string, userId: string) {
  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, profileId, userId);
  if (!profile) return { admin, label: null as ClusterLabel | null };

  // ⚠️ Het merk staat in de query en niet alleen in de controle erboven: zonder
  // dat kan iemand met twee merken een label-id van merk B meesturen op het
  // adres van merk A, en dat label dan hernoemen of weggooien.
  const { data } = await admin
    .from("cluster_labels")
    .select("*")
    .eq("id", labelId)
    .eq("profile_id", profileId)
    .maybeSingle();

  return { admin, label: (data ?? null) as ClusterLabel | null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> },
) {
  const { id, labelId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const { admin, label } = await labelVanEigenMerk(id, labelId, user.id);
  if (!label) return NextResponse.json({ error: "Label niet gevonden." }, { status: 404 });

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const naam = normaliseerLabelnaam(typeof body.name === "string" ? body.name : null);
  if (!naam) {
    return NextResponse.json(
      { error: `Vul een labelnaam in van maximaal ${MAX_LABELNAAM} tekens.` },
      { status: 400 },
    );
  }

  // Alleen andere hoofdletters is geen botsing maar precies wat iemand bedoelt
  // die "onderhoud" met een hoofdletter wil schrijven.
  if (!zelfdeLabelnaam(label.name, naam)) {
    const { data: alle } = await admin.from("cluster_labels").select("*").eq("profile_id", id);
    const botsing = vindLabel((alle ?? []) as ClusterLabel[], naam);
    if (botsing) {
      return NextResponse.json(
        { error: `Je hebt al een label "${botsing.name}". Kies een andere naam.` },
        { status: 409 },
      );
    }
  }

  const { data, error } = await admin
    .from("cluster_labels")
    .update({ name: naam })
    .eq("id", labelId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Hernoemen is niet gelukt." }, { status: 500 });
  return NextResponse.json({ label: data as ClusterLabel });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> },
) {
  const { id, labelId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const { admin, label } = await labelVanEigenMerk(id, labelId, user.id);
  if (!label) return NextResponse.json({ error: "Label niet gevonden." }, { status: 404 });

  const { error } = await admin.from("cluster_labels").delete().eq("id", labelId);
  if (error) return NextResponse.json({ error: "Verwijderen is niet gelukt." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
