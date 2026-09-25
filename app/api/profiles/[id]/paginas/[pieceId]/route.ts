import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { keurGoed } from "@/lib/pagina/goedkeuren";
import { checkBudgetForProfile } from "@/lib/spend-limit";
import { analyseVanPagina } from "./eigenaar";

/** Zo lang mag een verzoek om een aanpassing zijn. */
const MAX_NOTITIE = 2000;

/**
 * POST /api/profiles/[id]/paginas/[pieceId]: het goedkeuringsscherm
 * (`docs/tasks/contentketen-opnieuw.md` §6.9).
 *
 *   { actie: "goedkeuren" }                  kan pas als elke gele zin bevestigd is
 *   { actie: "aanpassing", notitie: "..." }  een nieuwe versie, zonder nieuwe beoordeling
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

  let body: { actie?: unknown; notitie?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (body.actie === "goedkeuren") {
    const uitkomst = await keurGoed(admin, { pieceId, analysisId, userId: user.id });
    if (!uitkomst.ok) return NextResponse.json({ error: uitkomst.error }, { status: uitkomst.status });
    return NextResponse.json({ ok: true, reviewedAt: uitkomst.reviewedAt });
  }

  if (body.actie === "aanpassing") {
    const notitie = typeof body.notitie === "string" ? body.notitie.trim().slice(0, MAX_NOTITIE) : "";
    if (!notitie) return NextResponse.json({ error: "Schrijf wat er anders moet." }, { status: 400 });
    // Een aanpassing is een aanroep op het sterke model; het dagplafond geldt.
    const budget = await checkBudgetForProfile(id);
    if (!budget.ok) return NextResponse.json({ error: budget.message }, { status: 402 });
    const { created } = await enqueue(admin, {
      type: "pagina_herschrijven",
      payload: { pieceId, klantNotitie: notitie },
      analysisId,
      dedupeKey: dedupe.paginaHerschrijven(pieceId),
    });
    if (!created) {
      return NextResponse.json({ error: "Er loopt al een aanpassing voor deze pagina." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Onbekende handeling." }, { status: 400 });
}
