import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";
import { isStaff } from "@/lib/staff";
import { AFWIJSREDENEN } from "@/lib/cluster-discovery";

/**
 * Clusters ontdekken (docs/tasks/clusters-ontdekken.md, migratie 0109).
 *
 * POST: een ontdekkingsronde starten. Alleen de consultant: het is dezelfde
 * handeling als de oude knop "Stel nieuwe clusters voor", dus dezelfde
 * kostenregel (`clusters_aanvullen` in lib/cost-rules.ts), en geen tweede,
 * bijna gelijke regel ernaast.
 *
 * PATCH: iets doen met één kandidaat.
 *   - `aanvragen` / `intrekken`: de klant zegt "dit wil ik" (besluit 1 van
 *     23 september 2026). Kost niets en start niets; de consultant ziet het.
 *   - `toevoegen`: de consultant zet hem bij Voorgesteld op Mijn clusters. De
 *     meting start daarna via de bestaande startknop daar, met de verdeling en
 *     de clustervelden: één manier om een cluster te starten, niet twee.
 *   - `afwijzen`: de consultant, met een reden. Die reden gaat mee in elke
 *     volgende ronde als "vermijd dit".
 *
 * Schrijven loopt hier met de service-role key en een expliciete
 * eigendomscontrole (conventie 6).
 */

/**
 * GET: de stand van de nieuwste ronde, voor het voortgangsblok dat pollt.
 * Alleen lezen, dus eigendom is genoeg; ook de klant mag zien dat er gezocht
 * wordt.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  const { data } = await admin
    .from("cluster_discovery_runs")
    .select("id, status")
    .eq("profile_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ status: (data?.status as string | undefined) ?? "geen", runId: data?.id ?? null });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  if (!(await mayTriggerCost(user.id, "clusters_aanvullen"))) {
    return NextResponse.json({ error: COST_DENIED.clusters_aanvullen }, { status: 403 });
  }
  const budget = await checkBudgetForProfile(id);
  if (!budget.ok) return NextResponse.json({ error: budget.message }, { status: 402 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  if (profile.status !== "klaar") {
    return NextResponse.json(
      { error: "ORBIT ENGINE is nog bezig met het onderzoek van dit merk. Wacht tot dat klaar is." },
      { status: 409 },
    );
  }

  // Een tweede ronde naast een lopende betaalt dezelfde zoekdata twee keer.
  const { data: lopend } = await admin
    .from("cluster_discovery_runs")
    .select("id")
    .eq("profile_id", id)
    .in("status", ["verzamelen", "verbreden", "schiften", "bundelen"])
    .limit(1)
    .maybeSingle();
  if (lopend) {
    return NextResponse.json({ error: "Er loopt al een ontdekkingsronde voor dit merk." }, { status: 409 });
  }

  const { data: run, error } = await admin
    .from("cluster_discovery_runs")
    .insert({ profile_id: id, started_by: user.id, status: "verzamelen" })
    .select("id")
    .single();
  if (error || !run) {
    return NextResponse.json({ error: "De ronde kon niet gestart worden. Probeer het opnieuw." }, { status: 500 });
  }

  await enqueue(admin, {
    type: "discovery_collect",
    payload: { runId: run.id as string },
    profileId: id,
    dedupeKey: dedupe.discovery("discovery_collect", run.id as string),
  });

  return NextResponse.json({ ok: true, runId: run.id });
}

type Actie = "aanvragen" | "intrekken" | "toevoegen" | "afwijzen";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  let body: { candidateId?: string; actie?: Actie; reden?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  if (!body.candidateId || !body.actie) {
    return NextResponse.json({ error: "Geen kandidaat of handeling." }, { status: 400 });
  }

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const { data: kandidaat } = await admin
    .from("cluster_discovery_candidates")
    .select("*")
    .eq("id", body.candidateId)
    .eq("profile_id", id)
    .maybeSingle();
  if (!kandidaat) return NextResponse.json({ error: "Kandidaat niet gevonden." }, { status: 404 });

  const staff = await isStaff(user.id);
  const nu = new Date().toISOString();

  if (body.actie === "aanvragen" || body.actie === "intrekken") {
    if (kandidaat.status === "toegevoegd" || kandidaat.status === "afgewezen") {
      return NextResponse.json({ error: "Over dit onderwerp is al besloten." }, { status: 409 });
    }
    const patch =
      body.actie === "aanvragen"
        ? { status: "aangevraagd", requested_by: user.id, requested_at: nu }
        : { status: "nieuw", requested_by: null, requested_at: null };
    await admin.from("cluster_discovery_candidates").update(patch).eq("id", kandidaat.id);
    return NextResponse.json({ ok: true, status: patch.status });
  }

  // Toevoegen en afwijzen sturen betaald werk aan (een meting, of wat een
  // volgende ronde vermijdt), dus die zijn van de consultant. De knoppen staan
  // bij een klant niet op het scherm; dit is de garantie (conventie 1).
  if (!staff) {
    return NextResponse.json({ error: COST_DENIED.clusters_aanvullen }, { status: 403 });
  }

  if (body.actie === "afwijzen") {
    const reden = body.reden?.trim() ?? "";
    if (!(AFWIJSREDENEN as readonly string[]).includes(reden) && reden.length < 3) {
      return NextResponse.json({ error: "Kies een reden." }, { status: 400 });
    }
    await admin
      .from("cluster_discovery_candidates")
      .update({ status: "afgewezen", rejection_reason: reden.slice(0, 200), decided_at: nu })
      .eq("id", kandidaat.id);
    return NextResponse.json({ ok: true, status: "afgewezen" });
  }

  if (body.actie !== "toevoegen") {
    return NextResponse.json({ error: "Onbekende handeling." }, { status: 400 });
  }
  if (kandidaat.topic_id) return NextResponse.json({ ok: true, status: "toegevoegd", topicId: kandidaat.topic_id });

  // Zelfde poort als de voorstelknop (lib/pipeline/propose-more-topics.ts):
  // zonder vastgelegd gesprek is een voorstel een concept, ter voorbereiding.
  const [{ data: strategie }, { data: knopen }] = await Promise.all([
    admin.from("profile_strategy").select("recorded_at").eq("profile_id", id).maybeSingle(),
    admin.from("profile_offerings").select("id, name").eq("profile_id", id).is("removed_at", null),
  ]);
  const heeftGesprek = Boolean((strategie as { recorded_at: string | null } | null)?.recorded_at);
  const namen = (kandidaat.offering_names ?? []) as string[];
  const idPerNaam = new Map(((knopen ?? []) as { id: string; name: string }[]).map((k) => [k.name.toLowerCase(), k.id]));

  const { data: topic, error } = await admin
    .from("profile_topics")
    .insert({
      profile_id: id,
      title: kandidaat.title,
      rationale: kandidaat.rationale,
      offering_names: namen,
      offering_ids: namen.map((n) => idPerNaam.get(n.toLowerCase())).filter((x): x is string => Boolean(x)),
      // Bovenaan de voorstellen: iemand heeft dit net bewust gekozen.
      priority: 100,
      status: "voorgesteld",
      stage: heeftGesprek ? "definitief" : "concept",
      origin: "ontdekking",
      origin_uses_measurement: false,
      discovery_candidate_id: kandidaat.id,
    })
    .select("id")
    .single();

  if (error || !topic) {
    const dubbel = error?.message.includes("profile_topics_unique_title");
    return NextResponse.json(
      {
        error: dubbel
          ? "Er staat al een voorgesteld onderwerp met precies deze naam op Mijn clusters."
          : "Toevoegen is niet gelukt. Probeer het opnieuw.",
      },
      { status: dubbel ? 409 : 500 },
    );
  }

  await admin
    .from("cluster_discovery_candidates")
    .update({ status: "toegevoegd", topic_id: topic.id, decided_at: nu })
    .eq("id", kandidaat.id);

  return NextResponse.json({ ok: true, status: "toegevoegd", topicId: topic.id });
}
