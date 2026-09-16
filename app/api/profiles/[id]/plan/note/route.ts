import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getOwnedProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_STRATEGY_NOTE_LENGTH } from "@/lib/plan-constants";

/**
 * PATCH /api/profiles/[id]/plan/note, de notitie voor de schrijver aanpassen
 * (blok D punt 22, `docs/tasks/nova-vergelijking-verbeterpunten.md`, gebouwd
 * naar Nova's `contentActions.rewrite.noteLabel`, "Content-creation note").
 *
 * ── WAAROM DIT EEN EIGEN ROUTE IS EN GEEN VELD OP `createPlan()` ────────────
 *
 * `content_plans.strategy_note` werd tot 16 september 2026 alleen bij het
 * aanmaken van een plan gezet: een klant die drie maanden later iets wilde
 * melden, kon dat niet zonder het hele plan opnieuw op te zetten. Nova zet dit
 * veld bewust los van het aanmaken: het is bewerkbaar vanuit "opnieuw
 * schrijven" op elke willekeurige pagina, op elk moment. Zie `revise-box.tsx`.
 *
 * ── HET SLOT ──────────────────────────────────────────────────────────────
 *
 * Nova's `noteStale`: "Someone else changed this domain's content-creation
 * note while this dialog was open, so nothing was saved." Zelfde soort
 * voorwaardelijke update als bij de contentstuk-editor (punt 17,
 * `content_pieces.updated_at`): de `WHERE updated_at = ...` bepaalt zelf of de
 * opslag lukt, geen aparte lees-dan-beslis-stap. `content_plans.updated_at`
 * heeft al een database-trigger die hem bijwerkt (migratie 0049), dus deze
 * route hoeft die kolom zelf niet te zetten.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (typeof body.updatedAt !== "string") {
    return NextResponse.json(
      { error: "Vernieuw de pagina en probeer het opnieuw." },
      { status: 400 },
    );
  }
  if (typeof body.note !== "string") {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const note = body.note.trim() || null;
  if (note && note.length > MAX_STRATEGY_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `De notitie mag hooguit ${MAX_STRATEGY_NOTE_LENGTH} tekens zijn.` },
      { status: 422 },
    );
  }

  const { data: planRow } = await admin
    .from("content_plans")
    .select("id, updated_at")
    .eq("profile_id", id)
    .neq("status", "gestopt")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!planRow) {
    return NextResponse.json({ error: "Er is nog geen contentplan voor dit merk." }, { status: 404 });
  }

  // ⚠️ Dezelfde voorwaardelijke-update-vergrendeling als `removePage()`
  // (lib/plans.ts) en de contentstuk-editor (punt 17): de `WHERE updated_at`
  // bepaalt zelf of de opslag lukt.
  const { data: opgeslagen, error } = await admin
    .from("content_plans")
    .update({ strategy_note: note })
    .eq("id", planRow.id as string)
    .eq("updated_at", planRow.updated_at as string)
    .select("strategy_note, updated_at")
    .maybeSingle();

  if (error) {
    console.error(`Notitie opslaan mislukt voor plan ${planRow.id}:`, error.message);
    return NextResponse.json(
      { error: "Opslaan is niet gelukt door een tijdelijke storing. Er is niets veranderd, probeer het opnieuw." },
      { status: 500 },
    );
  }
  if (!opgeslagen) {
    return NextResponse.json(
      {
        error:
          "Iemand anders heeft deze notitie ondertussen gewijzigd, dus is er niets opgeslagen. Vernieuw de pagina om de nieuwste tekst te zien.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    note: opgeslagen.strategy_note as string | null,
    updatedAt: opgeslagen.updated_at as string,
  });
}
