import { NextResponse } from "next/server";
import { MAX_VACATURE_TEKENS } from "@/lib/solliciteren/prompt";
import { laadEigenGesprek } from "@/lib/solliciteren/toegang";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SollicitatieChat } from "@/lib/types/database";

/** Hoe lang een gesprekstitel mag zijn. Hij staat in een lijst, dus kort. */
const MAX_TITEL = 120;

/**
 * De vacature van één gesprek bijwerken, of het gesprek weggooien.
 *
 * ⚠️ Sinds migratie 0096 gaat deze route alleen nog over de VACATURE. Het CV,
 * de eerdere brieven en de projecten zijn naar `sollicitatie_documenten`
 * verhuisd en hangen aan de persoon; die lopen via
 * `app/api/solliciteren/documenten/`. Dat is de hele reden van die migratie: je
 * loopbaan hoort niet bij één vacature te staan.
 *
 * ── WAAROM "KOPPELEN" EEN EIGEN HANDELING BLIJFT ───────────────────────────
 *
 * De vacature gaat bij elk bericht opnieuw mee de aanroep in. Zou het veld bij
 * elke toetsaanslag opslaan, dan zou half geplakte tekst meteen meetellen in
 * het volgende antwoord. Vandaar één knop en één moment, met
 * `context_bijgewerkt_op` als het bewijs dat het gebeurd is.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await laadEigenGesprek(id);
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  let body: { vacature?: unknown; titel?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const wijziging: Record<string, string> = {};

  if (typeof body.vacature === "string") {
    wijziging.vacature_tekst = body.vacature.slice(0, MAX_VACATURE_TEKENS);
    wijziging.context_bijgewerkt_op = new Date().toISOString();
  }

  // De titel verandert los van de vacature, en dan hoort het moment van
  // koppelen niet mee te verschuiven: dan zou hernoemen de melding "de
  // assistent kent je nieuwe tekst" opleveren zonder dat er iets gekoppeld is.
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
 * Je dossier blijft staan, dat hangt aan jou en niet aan dit gesprek.
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
