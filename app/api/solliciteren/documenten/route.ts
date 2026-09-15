import { NextResponse } from "next/server";
import { MAX_DOCUMENT_TEKENS, MAX_TITEL, isGeldigeSoort } from "@/lib/solliciteren/dossier";
import { eisBeheerder } from "@/lib/solliciteren/toegang";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SollicitatieDocument } from "@/lib/types/database";

/**
 * Een stuk aan het dossier toevoegen (migratie 0096).
 *
 * Het dossier hangt aan de PERSOON en niet aan een gesprek, dus deze route
 * kent geen gesprek-id: `eisBeheerder()` levert de gebruiker en dat is de hele
 * eigenaarscontrole die hier nodig is (conventie 6).
 */
export async function POST(request: Request) {
  const toegang = await eisBeheerder();
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  let body: { soort?: unknown; titel?: unknown; inhoud?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!isGeldigeSoort(body.soort)) {
    return NextResponse.json({ error: "Kies eerst wat voor stuk dit is." }, { status: 400 });
  }

  const titel = typeof body.titel === "string" ? body.titel.trim().slice(0, MAX_TITEL) : "";
  if (!titel) {
    return NextResponse.json({ error: "Geef dit stuk een naam." }, { status: 400 });
  }

  const inhoud =
    typeof body.inhoud === "string" ? body.inhoud.slice(0, MAX_DOCUMENT_TEKENS) : "";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sollicitatie_documenten")
    .insert({ user_id: toegang.userId, soort: body.soort, titel, inhoud })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ document: data as SollicitatieDocument }, { status: 201 });
}
