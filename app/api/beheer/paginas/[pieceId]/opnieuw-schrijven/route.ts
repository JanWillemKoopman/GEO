import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/spoor";
import { schrijfOpnieuwMetZelfdeInvoer } from "@/lib/pagina/taken";

/**
 * POST /api/beheer/paginas/[pieceId]/opnieuw-schrijven: een geschreven pagina
 * opnieuw laten schrijven met dezelfde brief en dezelfde antwoorden, om een
 * wijziging van de keten eerlijk te toetsen (V0 van
 * `docs/tasks/pijplijnanalyse-contentketen.md`, besluit B27).
 *
 * Alleen voor beheerders. Een gewone gebruiker krijgt een 404, net als bij de
 * andere beheerroutes: een 403 bevestigt dat de route bestaat. Kost één
 * schrijfbeurt plus de controle, ongeveer $0,10 tot $0,15 per pagina.
 */
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isStaff(user.id))) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  if (!isUuid(pieceId)) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const uitkomst = await schrijfOpnieuwMetZelfdeInvoer(createAdminClient(), pieceId);
  switch (uitkomst.uitkomst) {
    case "gestart":
      return NextResponse.json({ nieuweVersie: uitkomst.nieuwId });
    case "geen_pagina":
      return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    case "nog_niet_geschreven":
      return NextResponse.json({ error: "Deze pagina is nog niet geschreven." }, { status: 409 });
    case "geen_brief":
      return NextResponse.json({ error: "Deze pagina heeft geen voorbereiding om opnieuw mee te schrijven." }, { status: 409 });
    default:
      return NextResponse.json({ error: `Opnieuw schrijven startte niet: ${uitkomst.fout ?? "onbekend"}.` }, { status: 500 });
  }
}
