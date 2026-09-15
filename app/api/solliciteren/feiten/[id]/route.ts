import { NextResponse } from "next/server";
import { isGeldigeCategorie } from "@/lib/solliciteren/feiten";
import { laadEigenFeit } from "@/lib/solliciteren/toegang";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SollicitatieFeit } from "@/lib/types/database";

/**
 * Eén feit corrigeren of van de kaart halen (migratie 0097).
 *
 * ⚠️ Corrigeren zet `handmatig` aan, ook als het feit door het model is
 * aangeleverd. Vanaf dat moment is het van jou en overleeft het elke volgende
 * uitleesronde. Dat is de hele reden dat die kolom bestaat: een correctie die
 * bij de volgende ronde weer weg is, maak je één keer en daarna vertrouw je de
 * kaart niet meer.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await laadEigenFeit(id);
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  let body: { categorie?: unknown; tekst?: unknown; periode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const wijziging: Record<string, unknown> = { handmatig: true };

  if (body.categorie !== undefined) {
    if (!isGeldigeCategorie(body.categorie)) {
      return NextResponse.json({ error: "Deze categorie kent de app niet." }, { status: 400 });
    }
    wijziging.categorie = body.categorie;
  }
  if (typeof body.tekst === "string") {
    const tekst = body.tekst.trim().slice(0, 500);
    if (!tekst) return NextResponse.json({ error: "Schrijf op wat het feit is." }, { status: 400 });
    wijziging.tekst = tekst;
  }
  if (typeof body.periode === "string") {
    wijziging.periode = body.periode.trim() || null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sollicitatie_feiten")
    .update(wijziging)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ feit: data as SollicitatieFeit });
}

/**
 * ⚠️ Het nummer komt niet vrij. Een volgend feit krijgt het eerstvolgende hogere
 * nummer, want er kunnen brieven bewaard zijn die naar dit nummer verwijzen.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await laadEigenFeit(id);
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("sollicitatie_feiten").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Het verwijderen is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
