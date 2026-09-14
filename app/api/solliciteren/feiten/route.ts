import { NextResponse } from "next/server";
import { isGeldigeCategorie } from "@/lib/solliciteren/feiten";
import { eisBeheerder } from "@/lib/solliciteren/toegang";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SollicitatieFeit } from "@/lib/types/database";

/**
 * Zelf een feit aan de kaart toevoegen (migratie 0097).
 *
 * Komt binnen als `handmatig`, en overleeft daarmee elke volgende uitleesronde.
 * De bronzin mag hier leeg blijven: jij bent de bron, en een verplichte
 * bronverwijzing naar je eigen geheugen is een veld dat mensen vullen met
 * "klopt".
 */
export async function POST(request: Request) {
  const toegang = await eisBeheerder();
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  let body: { categorie?: unknown; tekst?: unknown; periode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!isGeldigeCategorie(body.categorie)) {
    return NextResponse.json({ error: "Kies eerst wat voor feit dit is." }, { status: 400 });
  }
  const tekst = typeof body.tekst === "string" ? body.tekst.trim().slice(0, 500) : "";
  if (!tekst) {
    return NextResponse.json({ error: "Schrijf op wat het feit is." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Het eerstvolgende vrije nummer. De unieke index uit 0097 is het vangnet:
  // twee tabbladen die tegelijk een feit toevoegen komen daar tot stilstand in
  // plaats van allebei "F12" te worden.
  const { data: hoogste } = await admin
    .from("sollicitatie_feiten")
    .select("nummer")
    .eq("user_id", toegang.userId)
    .order("nummer", { ascending: false })
    .limit(1);
  const nummer = ((hoogste ?? [])[0]?.nummer ?? 0) + 1;

  const { data, error } = await admin
    .from("sollicitatie_feiten")
    .insert({
      user_id: toegang.userId,
      nummer,
      categorie: body.categorie,
      tekst,
      periode: typeof body.periode === "string" && body.periode.trim() ? body.periode.trim() : null,
      bronzin: "",
      handmatig: true,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ feit: data as SollicitatieFeit }, { status: 201 });
}
