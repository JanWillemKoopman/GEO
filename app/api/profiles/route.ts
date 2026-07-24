import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUrl } from "@/lib/url";

/**
 * POST /api/profiles — nieuw klantprofiel aanmaken vanuit de onboarding-wizard
 * (abcplan.md §12.24). De klant-ingevulde velden worden meteen weggeschreven
 * (klant leidend); daarna vult de AI-research-flow de rest aan. Schrijven loopt
 * via de service-role client MET expliciete ownership (user_id op de ingelogde user).
 */
interface ProfileIntakeBody {
  name?: string;
  url?: string;
  aliases?: unknown;
  industry?: string;
  products?: unknown;
  value_props?: unknown;
  competitors?: unknown;
  service_scope?: string;
  service_regions?: unknown;
  market_language?: string;
  tone_of_voice?: string;
  intake_description?: string;
  intake_audience?: string;
  customer_questions?: unknown;
}

const VALID_SCOPES = ["lokaal", "landelijk", "internationaal"];

/** Maakt een schone string-lijst van willekeurige JSON-input (wizard stuurt string[]). */
function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
}

/** Getrimde string of null (lege invoer → null, zodat de AI 'm mag aanvullen). */
function toTextOrNull(value: string | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  let body: ProfileIntakeBody;
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
    .insert({
      user_id: user.id,
      name,
      url,
      status: "bezig",
      aliases: toStringList(body.aliases),
      industry: toTextOrNull(body.industry),
      products: toStringList(body.products),
      value_props: toStringList(body.value_props),
      competitors: toStringList(body.competitors),
      service_scope: VALID_SCOPES.includes(body.service_scope ?? "") ? body.service_scope : null,
      service_regions: toStringList(body.service_regions),
      market_language: toTextOrNull(body.market_language),
      tone_of_voice: toTextOrNull(body.tone_of_voice),
      intake_description: toTextOrNull(body.intake_description),
      intake_audience: toTextOrNull(body.intake_audience),
      customer_questions: toStringList(body.customer_questions),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Aanmaken mislukt. Probeer het opnieuw." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
