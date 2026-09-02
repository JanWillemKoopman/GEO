import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { normaliseerLabelnaam, sorteerLabels, vindLabel, MAX_LABELNAAM } from "@/lib/cluster-labels";
import type { ClusterLabel } from "@/lib/types/database";

/**
 * De labels van één merk (migratie 0083).
 *
 * GET geeft de lijst voor het uitklapmenu, POST maakt er één bij. Schrijven
 * loopt via de service-role met een expliciete eigenaarscontrole, nooit
 * rechtstreeks vanaf de client (conventie 6).
 *
 * ⚠️ POST is bewust "vind of maak" en geeft bij een bestaande naam gewoon dat
 * bestaande label terug, met status 200. Twee tabbladen die tegelijk "Onderhoud"
 * aanmaken, horen bij hetzelfde label uit te komen; een foutmelding zou de
 * gebruiker vragen iets op te lossen wat de app zelf weet.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Merk niet gevonden." }, { status: 404 });

  const { data } = await admin.from("cluster_labels").select("*").eq("profile_id", id);
  return NextResponse.json({ labels: sorteerLabels((data ?? []) as ClusterLabel[]) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Merk niet gevonden." }, { status: 404 });

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

  const { data: bestaand } = await admin.from("cluster_labels").select("*").eq("profile_id", id);
  const alDaar = vindLabel((bestaand ?? []) as ClusterLabel[], naam);
  if (alDaar) return NextResponse.json({ label: alDaar });

  const { data, error } = await admin
    .from("cluster_labels")
    .insert({ profile_id: id, name: naam })
    .select("*")
    .single();

  // De unieke index van 0083 is het vangnet: twee gelijktijdige aanvragen komen
  // hier uit, en dan is het label er intussen wél. Hem opnieuw opzoeken is het
  // goede antwoord, een foutmelding niet.
  if (error) {
    const { data: opnieuw } = await admin.from("cluster_labels").select("*").eq("profile_id", id);
    const gevonden = vindLabel((opnieuw ?? []) as ClusterLabel[], naam);
    if (gevonden) return NextResponse.json({ label: gevonden });
    return NextResponse.json({ error: "Label aanmaken is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ label: data as ClusterLabel }, { status: 201 });
}
