import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { defaultAccountFor } from "@/lib/accounts";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUrl, checkUrlFormat } from "@/lib/url";
import { isReachable } from "@/lib/crawler";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudget } from "@/lib/spend-limit";
import { resolveScope } from "@/lib/pipeline/field-merge";
import { consultantFields } from "@/lib/profile-source";

/**
 * POST /api/profiles, nieuw klantprofiel aanmaken vanuit de onboarding-wizard
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
  /**
   * Klant heeft de "site onbereikbaar"-waarschuwing gezien en wil tóch door
   * (optimalisatie.md 0.12). Een site kan achter een firewall zitten of onze
   * bot weren en toch prima bestaan. Dat mag de klant niet blokkeren.
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
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  // ⚠️ Betaald werk start alleen de beheerder (besluit 18). Zie lib/cost-guard.ts
  // voor de rekensom eronder: zonder deze regel kan een klant op één middag
  // dollars uitgeven zonder dat iemand het merkt.
  if (!(await mayTriggerCost(user.id))) {
    return NextResponse.json({ error: COST_DENIED.merk_onderzoeken }, { status: 403 });
  }

  // ⚠️ De TWEEDE rem (F1, lib/spend-limit.ts). Hier alleen het DAGplafond, want
  // er is nog geen merk en dus nog geen account om op af te rekenen. Dat is
  // geen gat: de onboarding heeft al een eigen plafond van $2,15 per merk
  // (lib/pipeline/onboarding-budget.ts), en het dagplafond vangt het geval dat
  // iemand er twintig achter elkaar aanmaakt.
  const budget = await checkBudget(null);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.message }, { status: 402 });
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
  // harde blokkade, de klant kan bevestigen en doorgaan met `force`.
  if (!body.force) {
    const reachable = await isReachable(url);
    if (!reachable) {
      return NextResponse.json(
        {
          error:
            `We konden ${url} niet bereiken. Controleer of het adres klopt en of de site ` +
            `online is. Klopt het wel? Dan kun je gewoon doorgaan, want sommige sites weren ` +
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

  // ⚠️ Zonder account is een merk onvolledig: het contentplan vindt geen pakket
  // en een uitgenodigde klant ziet het niet. Zie `defaultAccountFor()`.
  const accountId = await defaultAccountFor(user.id);

  // ⚠️ Mensinvoer door dezelfde normalisatie als modeluitvoer (fase 2 van
  // onboarding 3.0). `resolveScope()` ontdubbelt de plaatsnamen en maakt van
  // 'lokaal' zonder één regio een `null`, want dat is een half antwoord waar de
  // promptgeneratie niets mee kan. Tot nu gold die regel alleen voor wat het
  // model teruggaf, terwijl `service_regions[0]` letterlijk in zes
  // kennistestvragen wordt geplakt.
  const bereik = resolveScope(
    VALID_SCOPES.includes(body.service_scope ?? "") ? body.service_scope : null,
    toStringList(body.service_regions),
  );

  const intake = {
    name,
    aliases: toStringList(body.aliases),
    industry: toTextOrNull(body.industry),
    products: toStringList(body.products),
    value_props: toStringList(body.value_props),
    competitors: toStringList(body.competitors),
    service_scope: bereik.scope,
    service_regions: bereik.regions,
    market_language: toTextOrNull(body.market_language),
    tone_of_voice: toTextOrNull(body.tone_of_voice),
    intake_description: toTextOrNull(body.intake_description),
    intake_audience: toTextOrNull(body.intake_audience),
  };

  const { data, error } = await admin
    .from("profiles")
    .insert({
      user_id: user.id,
      account_id: accountId,
      url,
      status: "bezig",
      ...intake,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Aanmaken is niet gelukt. Probeer het opnieuw." }, { status: 500 });
  }

  // ── Herkomst vastleggen bij het aanmaken (fase 2 van onboarding 3.0) ──────
  //
  // Deze route schreef nul rijen in `profile_field_sources` terwijl de
  // bijwerkroute het wél deed. Wat de consultant hier typt was daarmee niet te
  // onderscheiden van wat het model straks vindt, en het eerstvolgende
  // onderzoek mocht het overschrijven.
  //
  // ⚠️ Bron `consultant` en niet `klant`: dit is een onderbouwde aanname van
  // vóór het eerste contact, geen bevestigd feit. Voor de bescherming tegen
  // overschrijven telt hij als mens; de onderzoeksprompt behandelt hem als
  // startpunt dat tegengesproken mag worden (`profile-research.ts`).
  // `name` valt terug op het webadres als er niets getypt is, en zo'n terugval
  // is geen consultant-aanname. Vandaar de getypte waarde en niet de opgeslagen.
  const gezet = consultantFields({ ...intake, name: body.name?.trim() ?? "" });
  if (gezet.length > 0) {
    const { error: bronError } = await admin.from("profile_field_sources").insert(
      gezet.map((field) => ({
        profile_id: data.id as string,
        field,
        source: "consultant",
        confidence: 1,
        set_by: user.id,
      })),
    );
    // Bewust geen 500: het merk staat er en het onderzoek moet gewoon draaien.
    // Een mislukte herkomstregel terugmelden als "aanmaken is niet gelukt" zou
    // een tweede merk opleveren voor dezelfde site.
    if (bronError) {
      console.error(
        `Herkomst vastleggen mislukt bij het aanmaken van profiel ${data.id} ` +
          `(${gezet.length} veld(en) wél opgeslagen): ${bronError.message}`,
      );
    }
  }

  // Zie de analyse-route: het onderzoek hangt aan de wachtrij, niet aan een
  // openstaande browsertab (optimalisatie.md 1.5).
  // Fase 0 eerst (docs/tasks/onboarding-2.0.md blok B): de site uitkammen kost
  // niets en levert de context waar het onderzoek op leunt. Deze taak ketent
  // zelf door naar `profile_research`.
  await enqueue(admin, {
    type: "profile_discover",
    payload: {},
    profileId: data.id as string,
    dedupeKey: dedupe.profileDiscover(data.id as string),
  });

  // De technische audit stond hier ook, parallel aan het onderzoek. Sinds de
  // audit óók naar naamconsistentie en renderbaarheid kijkt (blok B fase 4)
  // heeft hij de uitkomst van fase 0 nodig, en parallel draaien betekende in de
  // praktijk dat hij eerder klaar was dan de crawl. `profile_discover` plant hem
  // nu zelf in zodra hij klaar is.

  return NextResponse.json({ id: data.id }, { status: 201 });
}
