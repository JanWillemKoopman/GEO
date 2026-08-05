import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { normalizeEntityName } from "@/lib/entities/normalize";

/**
 * GET/POST /api/profiles/[id]/entities, de concurrentenlijst van een profiel
 * (optimalisatie.md 2.7). Geen AI-call.
 *
 * Entiteiten hangen aan het PROFIEL en niet aan een analyse: dezelfde concurrent
 * duikt op bij meerdere onderwerpen van hetzelfde merk, en die moet dan één rij
 * zijn. Anders valt de vergelijking alsnog uiteen.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await getOwnedProfile(admin, id, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  const { data } = await admin
    .from("entities")
    .select("*")
    .eq("profile_id", id)
    .order("canonical_name");

  return NextResponse.json({ entities: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await getOwnedProfile(admin, id, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Naam ontbreekt." }, { status: 400 });

  const normalized = normalizeEntityName(name);
  if (!normalized) return NextResponse.json({ error: "Deze naam is niet bruikbaar." }, { status: 400 });

  // Bestaat hij al (mogelijk onder een andere schrijfwijze, of eerder weggezet)?
  // Dan geen tweede rij maken maar de bestaande bevestigen. Anders krijgt de
  // klant een duplicaat terwijl hij juist orde aan het scheppen is.
  const { data: existing } = await admin
    .from("entities")
    .select("*")
    .eq("profile_id", id)
    .eq("normalized", normalized)
    .maybeSingle();

  if (existing) {
    const { data: updated } = await admin
      .from("entities")
      .update({
        confirmed: true,
        dismissed: false,
        // Zelf toevoegen is een handmatig oordeel "dit is een concurrent van
        // mij", de automatische classificatie mag dat niet terugdraaien.
        entity_role: "concurrent",
        role_source: "handmatig",
        exclude_reason: null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    return NextResponse.json(updated ?? existing);
  }

  const { data, error } = await admin
    .from("entities")
    .insert({
      profile_id: id,
      canonical_name: name,
      normalized,
      confirmed: true,
      entity_role: "concurrent",
      role_source: "handmatig",
    })
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
