import { NextResponse } from "next/server";
import { MAX_BESTAND_BYTES, leesTekstUitBestand } from "@/lib/solliciteren/bestand";
import { eisBeheerder } from "@/lib/solliciteren/toegang";

/**
 * Tekst uit een geüpload bestand halen, zodat je een CV niet hoeft te plakken.
 *
 * Deze route SLAAT NIETS OP. Hij geeft de tekst terug, het scherm zet hem in
 * het veld, en pas als je op opslaan drukt gaat hij naar de database. Dat is
 * een keuze: een PDF die half goed uitleest hoor je te zien voordat hij in je
 * dossier staat, en er komt geen bestand op een schijf te staan die daarna
 * opgeruimd moet worden.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  const toegang = await eisBeheerder();
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  let bestand: File | null = null;
  try {
    const formulier = await request.formData();
    const waarde = formulier.get("bestand");
    if (waarde instanceof File) bestand = waarde;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!bestand || bestand.size === 0) {
    return NextResponse.json({ error: "Er zat geen bestand bij." }, { status: 400 });
  }
  if (bestand.size > MAX_BESTAND_BYTES) {
    return NextResponse.json({ error: "Dit bestand is te groot. Tot 10 MB gaat goed." }, { status: 413 });
  }

  const uitkomst = await leesTekstUitBestand(bestand);
  if (!uitkomst.ok) {
    return NextResponse.json({ error: uitkomst.melding ?? "Dit bestand liet zich niet lezen." }, { status: 422 });
  }

  return NextResponse.json({ tekst: uitkomst.tekst, naam: bestand.name });
}
