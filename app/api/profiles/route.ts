import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUrl, checkUrlFormat } from "@/lib/url";
import { isReachable } from "@/lib/crawler";

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
  /**
   * Klant heeft de "site onbereikbaar"-waarschuwing gezien en wil tóch door
   * (optimalisatie.md 0.12). Een site kan achter een firewall zitten of onze
   * bot weren en toch prima bestaan — dat mag de klant niet blokkeren.
   */
  force?: boolean;
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

  // Formaatcontrole met een boodschap die de wizard kan tonen bij het veld.
  const format = checkUrlFormat(body.url ?? "");
  if (!format.ok) {
    return NextResponse.json({ error: format.message, field: "url" }, { status: 400 });
  }
  const url = normalizeUrl(body.url ?? "")!;

  // Bereikbaarheidscontrole (optimalisatie.md 0.12): liever nu ontdekken dat de
  // site niet te bereiken is dan minuten later via een mislukt profiel. Geen
  // harde blokkade — de klant kan bevestigen en doorgaan met `force`.
  if (!body.force) {
    const reachable = await isReachable(url);
    if (!reachable) {
      return NextResponse.json(
        {
          error:
            `We konden ${url} niet bereiken. Controleer of het adres klopt en of de site ` +
            `online is. Klopt het wel? Dan kun je gewoon doorgaan — sommige sites weren ` +
            `automatische bezoekers.`,
          field: "url",
          canForce: true,
        },
        { status: 400 },
      );
    }
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
