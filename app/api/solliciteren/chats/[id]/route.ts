import { NextResponse } from "next/server";
import { MAX_CONTEXT_TEKENS } from "@/lib/solliciteren/prompt";
import { laadEigenGesprek } from "@/lib/solliciteren/toegang";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SollicitatieChat } from "@/lib/types/database";

/** Hoe lang een gesprekstitel mag zijn. Hij staat in een lijst, dus kort. */
const MAX_TITEL = 120;

/**
 * De bronteksten van één gesprek bijwerken, of het gesprek weggooien.
 *
 * ── WAAROM "KOPPELEN" EEN EIGEN HANDELING IS ───────────────────────────────
 *
 * De drie tekstvakken zouden ook bij elke toetsaanslag kunnen opslaan. Dat is
 * hier verkeerd: de assistent krijgt de bronteksten bij elk bericht opnieuw
 * mee, dus half geplakte tekst zou meteen meetellen in het volgende antwoord.
 * Vandaar één knop en één moment, met `context_bijgewerkt_op` als het bewijs
 * dat het gebeurd is. Het scherm laat zien of wat er in de vakken staat
 * hetzelfde is als wat de assistent kent.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await laadEigenGesprek(id);
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  let body: { cv?: unknown; brieven?: unknown; vacature?: unknown; titel?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const tekst = (waarde: unknown): string | null =>
    typeof waarde === "string" ? waarde.slice(0, MAX_CONTEXT_TEKENS) : null;

  const wijziging: Record<string, string> = {};
  const cv = tekst(body.cv);
  const brieven = tekst(body.brieven);
  const vacature = tekst(body.vacature);
  if (cv !== null) wijziging.cv_tekst = cv;
  if (brieven !== null) wijziging.brieven_tekst = brieven;
  if (vacature !== null) wijziging.vacature_tekst = vacature;

  // De titel verandert los van de bronteksten, en dan hoort het moment van
  // koppelen niet mee te verschuiven: dan zou hernoemen de melding "de
  // assistent kent je nieuwe tekst" opleveren zonder dat er iets gekoppeld is.
  const raaktContext = Object.keys(wijziging).length > 0;
  if (raaktContext) wijziging.context_bijgewerkt_op = new Date().toISOString();

  if (typeof body.titel === "string") {
    const titel = body.titel.trim().slice(0, MAX_TITEL);
    if (titel) wijziging.titel = titel;
  }

  if (Object.keys(wijziging).length === 0) {
    return NextResponse.json({ error: "Er viel niets bij te werken." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sollicitatie_chats")
    .update(wijziging)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ chat: data as SollicitatieChat });
}

/**
 * Weg is weg: de berichten gaan mee via `on delete cascade` (migratie 0095).
 *
 * Geen archiefkolom zoals `analyses.archived_at` in het hoofdproduct. Daar is
 * een cluster maanden meetdata waard en is weggooien onherstelbaar duur; hier is
 * het een gesprek over een brief die iemand zelf ook nog heeft.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await laadEigenGesprek(id);
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("sollicitatie_chats").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Het verwijderen is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
