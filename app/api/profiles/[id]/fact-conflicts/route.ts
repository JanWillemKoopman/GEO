import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/jobs/queue";
import { dedupe } from "@/lib/jobs/dedupe";
import { losConflictOp, type Keuze } from "@/lib/pipeline/feitenregister";

/**
 * De conflictlijst van één merk (WP2 van contentpijplijn-publicatiewaardig.md, §8.3).
 *
 * Alleen voor medewerkers: de klant ziet het conflictscherm niet. Een klant
 * krijgt een 404 en geen 403, zelfde patroon als `assign/route.ts`: een 403
 * bevestigt dat er iets bestaat.
 *
 * Schrijven loopt hier, met de service-role key, nooit vanaf de client
 * (conventie 6). De eigendomscontrole is tweeledig: de gebruiker is medewerker,
 * en het conflict hoort bij dit merk (`losConflictOp()` filtert op beide ids).
 */

async function magHier(id: string) {
  const user = await getUser();
  if (!user) return { fout: NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 }) };
  if (!(await isStaff(user.id))) return { fout: NextResponse.json({ error: "Niet gevonden." }, { status: 404 }) };
  const admin = createAdminClient();
  const { data: profiel } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
  if (!profiel) return { fout: NextResponse.json({ error: "Niet gevonden." }, { status: 404 }) };
  return { user, admin };
}

/** POST: het register van dit merk (opnieuw) laten nalopen. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await magHier(id);
  if ("fout" in toegang) return toegang.fout;

  const { created } = await enqueue(toegang.admin, {
    type: "fact_register",
    payload: {},
    profileId: id,
    dedupeKey: dedupe.factRegister(id),
  });
  return NextResponse.json({ gestart: created });
}

/** PATCH: een conflict afhandelen. `{ conflictId, feitId }` of `{ conflictId, vraag: true }`. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await magHier(id);
  if ("fout" in toegang) return toegang.fout;

  let body: { conflictId?: unknown; feitId?: unknown; vraag?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  const conflictId = typeof body.conflictId === "string" ? body.conflictId : "";
  if (!conflictId) return NextResponse.json({ error: "Welk conflict?" }, { status: 400 });

  let keuze: Keuze;
  if (body.vraag === true) keuze = { vraag: true };
  else if (typeof body.feitId === "string" && body.feitId) keuze = { feitId: body.feitId };
  else return NextResponse.json({ error: "Kies een feit, of laat het de ondernemer vragen." }, { status: 400 });

  const fout = await losConflictOp(toegang.admin, {
    profileId: id,
    conflictId,
    userId: toegang.user.id,
    keuze,
  });
  if (fout) return NextResponse.json({ error: fout }, { status: 400 });
  return NextResponse.json({ ok: true });
}
