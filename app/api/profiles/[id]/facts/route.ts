import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import type { FactRequest } from "@/lib/types/database";

/**
 * PATCH /api/profiles/[id]/facts — de klant beantwoordt (of slaat over) een
 * feitenvraag (optimalisatie.md 4.6).
 *
 * Waarom dit bestaat: de schrijfinstructie zegt "verzin geen feiten, blijf
 * algemeen bij twijfel". Bij een klant met een dunne website levert dat
 * gegarandeerd algemene tekst op — en algemeen is precies wat niet geciteerd
 * wordt. In plaats van die spanning te laten bestaan, vragen we het gewoon.
 *
 * Een antwoord gaat naar `profiles.proof_points` en verbetert daarmee ÉLKE
 * volgende pagina, niet alleen degene waarvoor de vraag ontstond. Dat is ook wat
 * het voor de klant de moeite waard maakt: één keer invullen, altijd profijt.
 */
const MAX_ANSWER_LENGTH = 500;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { factId?: unknown; answer?: unknown; skip?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const factId = typeof body.factId === "string" ? body.factId : "";
  if (!factId) return NextResponse.json({ error: "Welke vraag?" }, { status: 400 });

  const { data: factRow } = await admin
    .from("fact_requests")
    .select("*")
    .eq("id", factId)
    .eq("profile_id", id)
    .maybeSingle();
  if (!factRow) return NextResponse.json({ error: "Vraag niet gevonden." }, { status: 404 });
  const fact = factRow as FactRequest;

  // ── Overslaan ─────────────────────────────────────────────────────────────
  // Blijft als rij bestaan zodat we dezelfde vraag niet elk rapport opnieuw
  // stellen. Niets is vervelender dan een app die blijft zeuren.
  if (body.skip === true) {
    const { data } = await admin
      .from("fact_requests")
      .update({ status: "overgeslagen" })
      .eq("id", factId)
      .select("*")
      .single();
    return NextResponse.json(data);
  }

  const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, MAX_ANSWER_LENGTH) : "";
  if (!answer) return NextResponse.json({ error: "Vul een antwoord in." }, { status: 400 });

  const { data: updated, error } = await admin
    .from("fact_requests")
    .update({ answer, status: "beantwoord", answered_at: new Date().toISOString() })
    .eq("id", factId)
    .select("*")
    .single();
  if (error || !updated) return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });

  // Het antwoord ook als geverifieerd feit bij het profiel zetten. Dubbelop met
  // `fact_requests`, maar bewust: `proof_points` is waar de hele schrijfpijplijn
  // al naar kijkt, en de klant kan het daar zelf bijstellen of weghalen.
  const line = `${fact.question} ${answer}`;
  const existing = profile.proof_points ?? [];
  if (!existing.some((p) => p.trim().toLowerCase() === line.toLowerCase())) {
    await admin
      .from("profiles")
      .update({ proof_points: [...existing, line] })
      .eq("id", id);
  }

  return NextResponse.json(updated);
}
