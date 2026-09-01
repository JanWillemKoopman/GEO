import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultAccountFor } from "@/lib/accounts";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { beoordeelStatus, type OutreachStand } from "@/lib/sales/workflow";

/**
 * POST /api/sales/outreach/[id]/convert, van prospect naar klant
 * (`docs/tasks/geo-prospect-engine.md` §17.4).
 *
 * ── DE ENIGE PLEK WAAR SALES DE KLANTOMGEVING RAAKT ─────────────────────────
 *
 * "Dit is de enige plek waar de Sales-module de klantomgeving raakt, en het
 * gebeurt expliciet." Er wordt een merkprofiel aangemaakt met het webadres, de
 * bedrijfsnaam en de naamvarianten die al in `sales_companies` staan, de
 * bestaande onboardingpijplijn start, en de outreach wordt gemarkeerd.
 *
 * ⚠️ **Dat de naamvarianten al bekend zijn is geen detail.** Dat is precies het
 * veld waar een verkeerde invulling later een te lage score oplevert, en de
 * Sales-module heeft ze tijdens de marktontdekking al geverifieerd. Ze mee laten
 * verhuizen scheelt de consultant werk én scheelt een meting die te laag uitvalt
 * omdat "Van X" en "Van X Makelaars" als twee merken tellen.
 *
 * ⚠️ En het gaat maar ÉÉN kant op: hier wordt in de klantomgeving geschreven,
 * en er komt niets uit de Sales-module op een klantscherm terecht (plan 4.3).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  // Een klant aanmaken is de zwaarste handeling van de module: er ontstaat een
  // merkprofiel en er start een betaalde onboarding. Alleen een sales admin.
  if (!(await isSalesAdmin(user.id))) return new NextResponse(null, { status: 404 });

  const admin = createAdminClient();

  const { data: outreach } = await admin
    .from("sales_outreach")
    .select("id, status, company_id, opportunity_id, market_id, sales_companies(name, domain, name_variants, city)")
    .eq("id", id)
    .maybeSingle();

  type Rij = {
    id: string;
    status: string;
    company_id: string;
    opportunity_id: string | null;
    market_id: string | null;
    sales_companies: {
      name: string;
      domain: string | null;
      name_variants: string[] | null;
      city: string | null;
    } | null;
  };
  const rij = outreach as unknown as Rij | null;

  if (!rij) return NextResponse.json({ error: "Deze outreach bestaat niet." }, { status: 404 });
  if (!rij.sales_companies) {
    return NextResponse.json({ error: "Dit bedrijf bestaat niet meer." }, { status: 404 });
  }

  // De statusmachine beslist of dit mag, en niet deze route (plan 17.1).
  const oordeel = beoordeelStatus(rij.status as OutreachStand, "klant", null);
  if (!oordeel.ok) return NextResponse.json({ error: oordeel.melding }, { status: 409 });

  const bedrijf = rij.sales_companies;
  if (!bedrijf.domain) {
    return NextResponse.json(
      {
        error:
          "Dit bedrijf heeft geen webadres in het systeem. Een merkprofiel zonder website kan niet " +
          "onderzocht worden. Vul eerst het adres aan.",
      },
      { status: 409 },
    );
  }

  const url = bedrijf.domain.startsWith("http") ? bedrijf.domain : `https://${bedrijf.domain}`;

  // Bestaat er al een merk op dit adres, dan wordt er geen tweede aangemaakt.
  // Twee profielen voor dezelfde site betekent twee metingen, twee rekeningen en
  // twee waarheden.
  const { data: bestaand } = await admin
    .from("profiles")
    .select("id")
    .eq("url", url)
    .maybeSingle();

  if (bestaand) {
    return NextResponse.json(
      { error: "Er bestaat al een merkprofiel voor dit webadres." },
      { status: 409 },
    );
  }

  const accountId = await defaultAccountFor(user.id);

  const { data: profiel, error } = await admin
    .from("profiles")
    .insert({
      user_id: user.id,
      account_id: accountId,
      url,
      name: bedrijf.name,
      brand_name: bedrijf.name,
      // De naamvarianten verhuizen mee. Zie de kop van dit bestand.
      aliases: bedrijf.name_variants ?? [],
      status: "bezig",
    })
    .select("id")
    .single();

  if (error || !profiel) {
    console.error(`Converteren van outreach ${id} mislukt:`, error?.message);
    return NextResponse.json({ error: "Het aanmaken van het merk is niet gelukt." }, { status: 500 });
  }

  const profileId = profiel.id as string;

  // De bestaande onboardingpijplijn, ongewijzigd. Geen aparte route voor een
  // klant die uit Sales komt: dan zijn er twee onboardingen die uit elkaar gaan
  // lopen.
  await enqueue(admin, {
    type: "profile_discover",
    payload: {},
    profileId,
    dedupeKey: dedupe.profileDiscover(profileId),
  });

  const nu = new Date().toISOString();
  await admin
    .from("sales_outreach")
    .update({ status: "klant", outcome: "klant", outcome_at: nu, updated_at: nu })
    .eq("id", id);

  await admin.from("sales_events").insert({
    company_id: rij.company_id,
    opportunity_id: rij.opportunity_id,
    outreach_id: id,
    market_id: rij.market_id,
    kind: "geconverteerd",
    van_status: rij.status,
    naar_status: "klant",
    actor_user_id: user.id,
    detail: { profileId } as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, profileId }, { status: 201 });
}
