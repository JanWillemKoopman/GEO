import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { defaultAccountFor } from "@/lib/accounts";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Profiel toewijzen aan een klantaccount (docs/tasks/onboarding-2.0.md, blok A).
 *
 * ── DE FLOW WAAR DIT IN ZIT ─────────────────────────────────────────────────
 *
 * De superuser voert URL + bedrijfsnaam in, de pijplijn bouwt in ~6 minuten een
 * profiel op, en in het demogesprek wordt dat gecorrigeerd en aangevuld. Pas
 * daarna, na de verkoop, gaat het profiel naar het account van de klant.
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
 * andere, `prompts`, `tracking_runs`, `reports`, `content_pieces`, hangt via
 * `analysis_id` aan de analyse en verhuist vanzelf mee met de RLS-join.
 *
 * Zou je hier alleen `profiles` bijwerken, dan ziet de klant zijn merk maar
 * geen enkele analyse, en dat is precies het scherm waar hij voor betaalt.
 *
 * ── DE ACCOUNTLAAG GAAT MEE, NIET ALLEEN `user_id` (doorloop-huyberts.md,
 * kleiner punt B) ───────────────────────────────────────────────────────────
 *
 * De toegangsregel is drielaags (`lib/accounts.ts`): laag 1, het account waar
 * het merk aan hangt, is de hoofdregel; laag 2, `profiles.user_id`, is de
 * historische terugval die blijft bestaan zolang niet elk merk een account
 * heeft. Deze route verplaatste tot 26 augustus 2026 alleen `user_id` en liet
 * `profiles.account_id` op het account van de beheerder staan: de toegewezen
 * klant kwam zo binnen via laag 2 in plaats van via laag 1. Geen zichtbare
 * fout (laag 2 vangt het op), maar wel dezelfde stille degradatie als de fout
 * die `defaultAccountFor()` destijds al repareerde voor NIEUWE profielen: het
 * contentplan vindt geen pakket omdat de quota aan het account hangt, en het
 * CSM-paneel toont het merk zonder klantnaam.
 *
 * `defaultAccountFor(targetUserId)` is dezelfde functie die een nieuw profiel
 * al gebruikt: hoort de klant al bij een account, dat account; hoort hij bij
 * meerdere (een bureau), het oudste; hoort hij nergens bij, dan wordt er één
 * op zijn e-mailadres aangemaakt en wordt hij daar beheerder van. Eén plek
 * voor de regel, in plaats van een tweede kopie die kan uitzakken.
 */

/** GET: welke gebruikers zijn er om aan toe te wijzen? Alleen voor beheerders. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    return NextResponse.json({ error: "De gebruikers konden niet worden opgehaald." }, { status: 500 });
  }

  const users = data.users
    .map((u) => ({ id: u.id, email: u.email ?? "(geen e-mailadres)" }))
    .sort((a, b) => a.email.localeCompare(b.email, "nl"));

  return NextResponse.json({ users });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  // Bewust géén getOwnedProfile: toewijzen is een beheerdersactie, ook op een
  // profiel dat de beheerder zelf bezit. Een gewone klant mag zijn profiel niet
  // aan iemand anders geven. Dat zou hem zijn eigen data laten weggeven.
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
    .select("id, user_id, account_id")
    .eq("id", id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  // Bestaat de doelgebruiker écht? Een typefout in een uuid zou anders een
  // profiel toewijzen aan een account dat niet bestaat, onzichtbaar voor
  // iedereen, want de RLS-join levert dan gewoon niets op.
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetUserId);
  if (targetError || !target?.user) {
    return NextResponse.json({ error: "Deze gebruiker bestaat niet." }, { status: 400 });
  }

  // Het account van de doelgebruiker, aangemaakt als hij er nog geen heeft
  // (dezelfde regel als een nieuw profiel gebruikt, zie hierboven).
  const targetAccountId = await defaultAccountFor(targetUserId);

  // ⚠️ Bewust NIET meer gátend op alleen `profile.user_id === targetUserId`.
  // Een profiel dat al eerder is toegewezen (vóór deze fix) kan `user_id` al
  // goed hebben staan terwijl `account_id` nog op het account van de
  // beheerder staat: precies de stille degradatie hierboven. Zo'n profiel
  // moet de accountlaag alsnog bijgewerkt krijgen, ook als er verder niets
  // verandert.
  if (profile.user_id === targetUserId && profile.account_id === targetAccountId) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const assignedAt = new Date().toISOString();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      user_id: targetUserId,
      assigned_at: assignedAt,
      // `null` alleen als defaultAccountFor() zelf mislukte (faalt zacht,
      // zie lib/accounts.ts): dan blijft het profiel op zijn huidige account
      // staan in plaats van de koppeling kwijt te raken.
      ...(targetAccountId ? { account_id: targetAccountId } : {}),
    })
    .eq("id", id);
  if (profileError) {
    return NextResponse.json({ error: "Toewijzen is niet gelukt." }, { status: 500 });
  }

  // Postgres kent hier geen transactie over twee losse PostgREST-verzoeken. Zou
  // deze tweede update falen, dan staat het profiel op de klant en de analyses
  // nog op de beheerder, een half overgedragen account. Daarom draaien we het
  // profiel dan terug, zodat de toestand consistent blijft en de melding klopt.
  const { error: analysesError } = await admin
    .from("analyses")
    .update({ user_id: targetUserId })
    .eq("profile_id", id);
  if (analysesError) {
    await admin
      .from("profiles")
      .update({ user_id: profile.user_id, account_id: profile.account_id, assigned_at: null })
      .eq("id", id);
    return NextResponse.json(
      { error: "Toewijzen is bij de analyses misgegaan; het merk is teruggezet." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, email: target.user.email ?? null, assignedAt });
}
