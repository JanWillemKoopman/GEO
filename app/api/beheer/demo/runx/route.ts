import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAPPEN, PROFIEL_ID, voerStapUit } from "@/lib/demo/runx/laden";

/**
 * POST /api/beheer/demo/runx, het voorbeeldaccount RunX inladen of verjongen
 * (`docs/tasks/demo-account-runx.md` §9.4 en §9.5).
 *
 * Eén stap per verzoek (`{ "stap": "basis" }`), en het antwoord zegt welke stap
 * de volgende is. De knop op het beheerscherm loopt ze achter elkaar af. Zo
 * blijft elke stap ruim binnen de tijdslimiet: het grootste cluster is 13
 * meetmomenten van 30 vragen, met 13 keer de echte scoreberekening.
 *
 * Kost niets: geen enkele stap doet een AI-aanroep, en de laatste stap
 * controleert dat er nul aanroepen op het merk staan. Opnieuw draaien is veilig
 * en is precies hoe de demo verjongt: elke rij heeft een vast id en alle datums
 * zijn relatief aan vandaag.
 *
 * Alleen voor beheerders; een ander krijgt een 404, zoals bij de andere
 * beheerroutes.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isStaff(user.id))) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let stap: string = STAPPEN[0];
  try {
    const body = (await request.json()) as { stap?: string };
    if (body?.stap) stap = body.stap;
  } catch {
    // Geen body: begin bij het begin.
  }
  if (!(STAPPEN as readonly string[]).includes(stap)) {
    return NextResponse.json({ error: `Onbekende stap: ${stap}` }, { status: 400 });
  }

  try {
    const verslag = await voerStapUit(createAdminClient(), stap, { gebruikerId: user.id });
    return NextResponse.json({ ...verslag, profielId: PROFIEL_ID, totaal: STAPPEN.length });
  } catch (err) {
    const melding = err instanceof Error ? err.message : String(err);
    console.error(`Voorbeeldaccount RunX, stap ${stap} mislukt:`, err);
    return NextResponse.json({ error: `Stap "${stap}" is niet gelukt: ${melding}` }, { status: 500 });
  }
}
