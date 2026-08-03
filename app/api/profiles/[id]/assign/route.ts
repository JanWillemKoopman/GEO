import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Profiel toewijzen aan een klantaccount (docs/tasks/onboarding-2.0.md, blok A).
 *
 * ── DE FLOW WAAR DIT IN ZIT ─────────────────────────────────────────────────
 *
 * De superuser voert URL + bedrijfsnaam in, de pijplijn bouwt in ~6 minuten een
 * profiel op, en in het demogesprek wordt dat gecorrigeerd en aangevuld. Pas
 * daarna — na de verkoop — gaat het profiel naar het account van de klant.
 *
 * Accounts aanmaken hoort hier NIET. Dat doet de eigenaar in het
 * Supabase-dashboard. Deze route kiest uit gebruikers die al bestaan; hij maakt
 * er geen. Dat scheelt een uitnodigings-API, half-aangemaakte gebruikers en een
 * e-mailbezorging die de verkoop kan ophouden.
 *
 * ── WAAROM ANALYSES MEEVERHUIZEN ────────────────────────────────────────────
 *
 * `user_id` komt in precies twee tabellen voor: `profiles` (migratie 0004) en
 * `analyses` (0001). Nagelopen over alle migraties op 3 augustus 2026. Al het
 * andere — `prompts`, `tracking_runs`, `reports`, `content_pieces` — hangt via
 * `analysis_id` aan de analyse en verhuist vanzelf mee met de RLS-join.
 *
 * Zou je hier alleen `profiles` bijwerken, dan ziet de klant zijn merk maar
 * geen enkele analyse — en dat is precies het scherm waar hij voor betaalt.
 */

/** GET — welke gebruikers zijn er om aan toe te wijzen? Alleen voor beheerders. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    return NextResponse.json({ error: "Gebruikers ophalen mislukt." }, { status: 500 });
  }

  const users = data.users
    .map((u) => ({ id: u.id, email: u.email ?? "(geen e-mailadres)" }))
    .sort((a, b) => a.email.localeCompare(b.email, "nl"));

  return NextResponse.json({ users });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  // Bewust géén getOwnedProfile: toewijzen is een beheerdersactie, ook op een
  // profiel dat de beheerder zelf bezit. Een gewone klant mag zijn profiel niet
  // aan iemand anders geven — dat zou hem zijn eigen data laten weggeven.
  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const targetUserId = body.userId?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "Kies een gebruiker." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  // Bestaat de doelgebruiker écht? Een typefout in een uuid zou anders een
  // profiel toewijzen aan een account dat niet bestaat — onzichtbaar voor
  // iedereen, want de RLS-join levert dan gewoon niets op.
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetUserId);
  if (targetError || !target?.user) {
    return NextResponse.json({ error: "Deze gebruiker bestaat niet." }, { status: 400 });
  }

  if (profile.user_id === targetUserId) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const assignedAt = new Date().toISOString();

  const { error: profileError } = await admin
    .from("profiles")
    .update({ user_id: targetUserId, assigned_at: assignedAt })
    .eq("id", id);
  if (profileError) {
    return NextResponse.json({ error: "Toewijzen mislukt." }, { status: 500 });
  }

  // Postgres kent hier geen transactie over twee losse PostgREST-verzoeken. Zou
  // deze tweede update falen, dan staat het profiel op de klant en de analyses
  // nog op de beheerder — een half overgedragen account. Daarom draaien we het
  // profiel dan terug, zodat de toestand consistent blijft en de melding klopt.
  const { error: analysesError } = await admin
    .from("analyses")
    .update({ user_id: targetUserId })
    .eq("profile_id", id);
  if (analysesError) {
    await admin
      .from("profiles")
      .update({ user_id: profile.user_id, assigned_at: null })
      .eq("id", id);
    return NextResponse.json(
      { error: "Toewijzen mislukt bij de analyses; het profiel is teruggezet." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, email: target.user.email ?? null, assignedAt });
}
