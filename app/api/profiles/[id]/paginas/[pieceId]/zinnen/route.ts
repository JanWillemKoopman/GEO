import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { bevestigZin } from "@/lib/pagina/goedkeuren";
import { analyseVanPagina } from "../eigenaar";

/**
 * POST /api/profiles/[id]/paginas/[pieceId]/zinnen: één gele zin bevestigen
 * (`docs/tasks/contentketen-opnieuw.md` §6.9). Alleen zinnen die echt geel zijn.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; pieceId: string }> }) {
  const { id, pieceId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  const analysisId = await analyseVanPagina(admin, id, pieceId);
  if (!analysisId) return NextResponse.json({ error: "Pagina niet gevonden." }, { status: 404 });

  let body: { zin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  const zin = typeof body.zin === "string" ? body.zin.trim() : "";
  if (!zin) return NextResponse.json({ error: "Er is geen zin meegegeven." }, { status: 400 });

  const uitkomst = await bevestigZin(admin, { pieceId, analysisId, zin });
  if (!uitkomst.ok) return NextResponse.json({ error: uitkomst.error }, { status: uitkomst.status });
  return NextResponse.json({ ok: true, bevestigd: uitkomst.bevestigd });
}
