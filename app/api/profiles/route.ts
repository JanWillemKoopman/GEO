import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUrl } from "@/lib/url";

/**
 * POST /api/profiles — nieuw klantprofiel aanmaken. Schrijven loopt via de
 * service-role client MET expliciete ownership (user_id op de ingelogde user),
 * zelfde patroon als POST /api/analyses.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  let body: { name?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const url = normalizeUrl(body.url ?? "");
  if (!url) {
    return NextResponse.json(
      { error: "Vul een geldige website in, bijvoorbeeld mediamarkt.nl." },
      { status: 400 },
    );
  }

  const name = body.name?.trim() ? body.name.trim() : url;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .insert({ user_id: user.id, name, url, status: "bezig" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Aanmaken mislukt. Probeer het opnieuw." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
