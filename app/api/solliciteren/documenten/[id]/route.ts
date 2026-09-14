import { NextResponse } from "next/server";
import { MAX_DOCUMENT_TEKENS, MAX_TITEL, isGeldigeSoort } from "@/lib/solliciteren/dossier";
import { laadEigenDocument } from "@/lib/solliciteren/toegang";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SollicitatieDocument } from "@/lib/types/database";

/**
 * Eén dossierstuk bijwerken of weggooien (migratie 0096).
 *
 * ⚠️ Een stuk weggooien raakt gesprekken die er al mee geschreven hebben. Dat
 * is geen probleem voor die brieven, die staan als tekst in
 * `sollicitatie_berichten`, en de namen van de gebruikte stukken staan in
 * `documenten_snapshot`. Vandaar geen archiefkolom: er gaat niets verloren wat
 * niet elders al vastligt.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await laadEigenDocument(id);
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  let body: { soort?: unknown; titel?: unknown; inhoud?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const wijziging: Record<string, string> = {};
  if (body.soort !== undefined) {
    if (!isGeldigeSoort(body.soort)) {
      return NextResponse.json({ error: "Dit soort kent de app niet." }, { status: 400 });
    }
    wijziging.soort = body.soort;
  }
  if (typeof body.titel === "string") {
    const titel = body.titel.trim().slice(0, MAX_TITEL);
    if (!titel) return NextResponse.json({ error: "Geef dit stuk een naam." }, { status: 400 });
    wijziging.titel = titel;
  }
  if (typeof body.inhoud === "string") {
    wijziging.inhoud = body.inhoud.slice(0, MAX_DOCUMENT_TEKENS);
  }

  if (Object.keys(wijziging).length === 0) {
    return NextResponse.json({ error: "Er viel niets bij te werken." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sollicitatie_documenten")
    .update(wijziging)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ document: data as SollicitatieDocument });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await laadEigenDocument(id);
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("sollicitatie_documenten").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Het verwijderen is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
