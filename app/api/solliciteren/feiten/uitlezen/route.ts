import { NextResponse } from "next/server";
import type { Dossierstuk } from "@/lib/solliciteren/dossier";
import { leesDossierUit } from "@/lib/solliciteren/feiten-uitlezen";
import { STANDAARD_MODEL, isGeldigModel } from "@/lib/solliciteren/modellen";
import { eisBeheerder } from "@/lib/solliciteren/toegang";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SollicitatieDocument, SollicitatieFeit } from "@/lib/types/database";

/**
 * Het dossier uitlezen tot een feitenkaart (migratie 0097).
 *
 * ── WAT ER MET EEN BESTAANDE KAART GEBEURT ─────────────────────────────────
 *
 * Feiten die jij zelf hebt gezet of gecorrigeerd (`handmatig`) blijven staan en
 * worden nooit overschreven. De rest wordt vervangen. Zelfde afspraak als
 * `profile_field_sources` in het hoofdproduct: een correctie die bij de
 * eerstvolgende ronde verdwijnt is erger dan geen correctie, want je maakt hem
 * één keer en vertrouwt daarna de kaart.
 *
 * Nieuwe feiten die woordelijk gelijk zijn aan een handmatig feit worden
 * overgeslagen, anders staat jouw correctie naast de versie van het model.
 *
 * ── DE NUMMERS LOPEN DOOR EN BEGINNEN NIET OPNIEUW ─────────────────────────
 *
 * Een nieuw feit krijgt het eerstvolgende vrije nummer, ook als er nummers zijn
 * vrijgekomen. F7 hoort bij één bewering en bij geen andere, want er liggen
 * brieven naast die naar F7 verwijzen.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const toegang = await eisBeheerder();
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  let model: unknown = STANDAARD_MODEL;
  try {
    const body = (await request.json()) as { model?: unknown };
    if (body.model !== undefined) model = body.model;
  } catch {
    // Zonder body draait hij op het standaardmodel. Dat is geen fout.
  }
  if (!isGeldigModel(model)) {
    return NextResponse.json({ error: "Dit model kent de app niet." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: documentData } = await admin
    .from("sollicitatie_documenten")
    .select("id, soort, titel, inhoud")
    .eq("user_id", toegang.userId);
  const dossier = ((documentData ?? []) as Pick<
    SollicitatieDocument,
    "id" | "soort" | "titel" | "inhoud"
  >[]) as Dossierstuk[];

  if (dossier.every((stuk) => !stuk.inhoud.trim())) {
    return NextResponse.json(
      { error: "Je dossier is nog leeg. Zet er eerst je CV en je projecten in." },
      { status: 400 },
    );
  }

  const { data: bestaandData } = await admin
    .from("sollicitatie_feiten")
    .select("*")
    .eq("user_id", toegang.userId);
  const bestaand = (bestaandData ?? []) as SollicitatieFeit[];
  const handmatig = bestaand.filter((f) => f.handmatig);

  let uitkomst;
  try {
    uitkomst = await leesDossierUit({ dossier, model });
  } catch {
    return NextResponse.json(
      { error: "Het uitlezen is niet gelukt. Probeer het opnieuw." },
      { status: 502 },
    );
  }

  // Alles wat niet met de hand is gezet gaat eruit, daarna komt de nieuwe oogst
  // erin. Verwijderen vóór het nummeren, zodat de nummers van de vervangen
  // feiten niet opnieuw gebruikt worden: het hoogste nummer telt gewoon door.
  const teVerwijderen = bestaand.filter((f) => !f.handmatig).map((f) => f.id);
  if (teVerwijderen.length > 0) {
    await admin.from("sollicitatie_feiten").delete().in("id", teVerwijderen);
  }

  const alGezegd = new Set(handmatig.map((f) => f.tekst.trim().toLowerCase()));
  let volgend = bestaand.reduce((hoogste, f) => Math.max(hoogste, f.nummer), 0) + 1;

  const rijen = uitkomst.feiten
    .filter((feit) => !alGezegd.has(feit.tekst.trim().toLowerCase()))
    .map((feit) => ({
      user_id: toegang.userId,
      nummer: volgend++,
      categorie: feit.categorie,
      tekst: feit.tekst,
      periode: feit.periode,
      bronzin: feit.bronzin,
      handmatig: false,
    }));

  if (rijen.length > 0) {
    const { error } = await admin.from("sollicitatie_feiten").insert(rijen);
    if (error) {
      return NextResponse.json({ error: "De feiten opslaan is niet gelukt." }, { status: 500 });
    }
  }

  const { data: kaart } = await admin
    .from("sollicitatie_feiten")
    .select("*")
    .eq("user_id", toegang.userId)
    .order("nummer", { ascending: true });

  return NextResponse.json({
    feiten: (kaart ?? []) as SollicitatieFeit[],
    // Wat het model aanleverde tegenover wat de bronzincontrole overliet. Dat
    // verschil is de enige manier om te zien dat het vangnet iets doet.
    aangeleverd: uitkomst.aangeleverd,
    aangenomen: uitkomst.feiten.length,
    behouden: handmatig.length,
    costUsd: uitkomst.costUsd,
  });
}
