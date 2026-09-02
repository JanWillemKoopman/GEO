import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";

/**
 * POST /api/analyses/[id]/archief, een cluster naar de prullenbak of eruit.
 *
 * ── WAAROM DIT GEEN `DELETE` IS ─────────────────────────────────────────────
 *
 * Onder een cluster hangen de vragen, elke meetronde, elke vermelding, de
 * rapporten en de geschreven pagina's. Dat is maanden meetdata die alleen
 * terugkomt door er opnieuw voor te betalen, ongeveer $0,82 per ronde. Een
 * prullenbak die echt wist, wist dus geld. Vandaar `archived_at` (migratie
 * 0044): uit beeld, in de database, terug te zetten.
 *
 * ── DE METINGEN STOPPEN, EN DAT IS AFGEDWONGEN EN GEEN BELOFTE ──────────────
 *
 * `/api/cron/tracking` haalt zijn lijst op via `activeOnly()` uit
 * `lib/archive.ts`, dus een gearchiveerd cluster valt per definitie uit de
 * maandelijkse meetronde. `lib/jobs/worker.ts` slaat bovendien taken over die
 * al klaarstonden op het moment van archiveren. Er is dus geen tweede knop
 * nodig om het meten te stoppen, en er is er ook bewust geen: twee schakelaars
 * voor één gevolg lopen uit elkaar.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { archived?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (typeof body.archived !== "boolean") {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const { error } = await admin
    .from("analyses")
    .update({ archived_at: body.archived ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: body.archived ? "Verplaatsen naar de prullenbak is niet gelukt." : "Terugzetten is niet gelukt." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, archived: body.archived });
}
