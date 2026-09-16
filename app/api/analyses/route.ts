import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { buildAnalysisName } from "@/lib/url";
import { normaliseerLabelnaam, vindLabel } from "@/lib/cluster-labels";
import type { ClusterLabel } from "@/lib/types/database";

/**
 * POST /api/analyses, nieuwe analyse aanmaken (abcplan.md §6 A0, na de
 * klantprofiel-refactor). Vereist een bestaand, klaar klantprofiel + een
 * onderwerp (verplicht: zonder onderwerp voegt een analyse niets toe aan wat
 * het profiel al dekt). `url` wordt overgenomen van het profiel (snapshot).
 * Schrijven loopt via de service-role client MET expliciete ownership.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  let body: {
    profileId?: string;
    topic?: string;
    content_brief?: string;
    notify_by_email?: boolean;
    label_id?: string;
    label_name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const topic = body.topic?.trim() ? body.topic.trim() : null;
  if (!topic) {
    return NextResponse.json({ error: "Vul een product of onderwerp in." }, { status: 400 });
  }

  const contentBrief = body.content_brief?.trim() ? body.content_brief.trim() : null;
  // Standaard aan: wie een analyse start wil weten wanneer die klaar is.
  const notifyByEmail = body.notify_by_email !== false;

  const admin = createAdminClient();

  if (!body.profileId) {
    return NextResponse.json({ error: "Kies een merk." }, { status: 400 });
  }
  const profile = await getOwnedProfile(admin, body.profileId, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Merk niet gevonden." }, { status: 404 });
  }
  // ── De kostenrem die hier ontbrak (16 september 2026) ───────────────────
  //
  // ⚠️ Deze route was de ENIGE dure route zonder `mayTriggerCost`. Dat is geen
  // ontwerpkeuze geweest maar een gemiste regel: `lib/cost-rules.ts` schrijft in
  // zijn eigen toelichting dat "POST /api/profiles en POST /api/analyses
  // allebei een 201 gaven" en dat de eigenaar dat op 2 september 2026 heeft
  // teruggedraaid. Bij `/api/profiles` is die rem er die dag gekomen, hier niet,
  // en `analyse_starten` staat sindsdien wél in `STAFF_ONLY_ACTIONS`.
  //
  // Gevolg zolang het ontbrak: een klant kon via het vrije tekstveld op
  // /analyses/new betaald onderzoek starten (`prepare_analysis`), terwijl
  // hetzelfde onderwerp via het snelpad in `topics-panel.tsx` netjes werd
  // geweigerd. Twee wegen naar dezelfde taak, één ervan open.
  //
  // De melding nodigt uit in plaats van af te wijzen, precies zoals bij de
  // andere zes: de klant mag weten dat de functie bestaat en bij wie hij moet
  // zijn.
  if (!(await mayTriggerCost(user.id, "analyse_starten"))) {
    return NextResponse.json({ error: COST_DENIED.analyse_starten }, { status: 403 });
  }

  if (profile.status !== "klaar") {
    return NextResponse.json(
      { error: "ORBIT ENGINE is nog bezig met dit merk. Wacht tot het onderzoek klaar is." },
      { status: 409 },
    );
  }

  // ── Het label (migratie 0083) ────────────────────────────────────────────
  //
  // Twee wegen naar dezelfde uitkomst: een bestaand label kiezen (`label_id`)
  // of er hier één bedenken (`label_name`). Die tweede is "vind of maak", zodat
  // wie "Onderhoud" typt terwijl dat label al bestaat bij het bestaande label
  // uitkomt en niet bij een tweede groep met dezelfde naam.
  //
  // Een label dat niet lukt, blokkeert het aanmaken van het cluster niet: het
  // cluster is wat de klant wilde, het label is ordening. Vandaar `null` bij
  // twijfel (conventie 3) in plaats van een foutmelding over een woord.
  let labelId: string | null = null;
  if (typeof body.label_id === "string" && body.label_id) {
    const { data: label } = await admin
      .from("cluster_labels")
      .select("id")
      .eq("id", body.label_id)
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!label) {
      return NextResponse.json({ error: "Dit label hoort niet bij dit merk." }, { status: 400 });
    }
    labelId = body.label_id;
  } else {
    const naam = normaliseerLabelnaam(body.label_name);
    if (naam) {
      const { data: bestaand } = await admin
        .from("cluster_labels")
        .select("*")
        .eq("profile_id", profile.id);
      const alDaar = vindLabel((bestaand ?? []) as ClusterLabel[], naam);
      if (alDaar) {
        labelId = alDaar.id;
      } else {
        const { data: nieuw } = await admin
          .from("cluster_labels")
          .insert({ profile_id: profile.id, name: naam })
          .select("id")
          .single();
        labelId = (nieuw?.id as string | undefined) ?? null;
      }
    }
  }

  const name = buildAnalysisName(profile.url, topic);

  const { data, error } = await admin
    .from("analyses")
    .insert({
      notify_by_email: notifyByEmail,
      user_id: user.id,
      profile_id: profile.id,
      url: profile.url,
      topic,
      name,
      status: "bezig",
      content_brief: contentBrief,
      label_id: labelId,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Aanmaken is niet gelukt. Probeer het opnieuw." }, { status: 500 });
  }

  // Werk meteen inplannen (optimalisatie.md 1.5). Voorheen startte het
  // voortgangsscherm de voorbereiding; sloot de klant de tab direct na het
  // aanmaken, dan gebeurde er nooit iets. Nu hangt het aan de wachtrij.
  await enqueue(admin, {
    type: "prepare_analysis",
    payload: {},
    analysisId: data.id as string,
    dedupeKey: dedupe.prepareAnalysis(data.id as string),
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
