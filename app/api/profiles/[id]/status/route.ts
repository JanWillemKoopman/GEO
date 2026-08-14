import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { profileProgress, formatEta } from "@/lib/jobs/progress";
import { buildSteps } from "@/lib/pipeline/research-steps";
import { scopeSummary } from "@/lib/pipeline/field-merge";

/**
 * GET /api/profiles/[id]/status, poll-endpoint voor het onderzoeksscherm.
 * Zie de analyse-variant: voortgang komt uit de taakstand (optimalisatie.md 1.6).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile)
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const progress = await profileProgress(admin, id);
  const bereik = scopeSummary(profile.service_scope, profile.service_regions);

  // De stappen mét tussenresultaten (docs/tasks/onboarding-2.0.md §8). Het
  // profiel gaat al op `klaar` na de tweede van zes taken, dus zonder dit ziet
  // de klant lege kaarten terwijl er nog vier taken draaien.
  const [
    { data: facetRows },
    { count: topics },
    { data: auditRow },
    { count: pages },
    { count: offerings },
    { count: baselineRows },
    { count: openFacts },
  ] = await Promise.all([
    // `raw_json` staat erbij voor de open punten uit de synthese, zie onderaan.
    admin
      .from("profile_facets")
      .select("facet, summary, raw_json")
      .eq("profile_id", id),
    admin
      .from("profile_topics")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id),
    admin
      .from("technical_audits")
      .select("checks_json")
      .eq("profile_id", id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // De vier tellingen hieronder zijn er voor `assessReadiness()`: het scherm
    // moet kunnen zeggen "dit dossier is af" zonder acht panelen zelf na te
    // lopen. Alle vier `head: true`, dus dit zijn tellingen en geen rijen.
    admin
      .from("profile_pages")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id),
    admin
      .from("profile_offerings")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id),
    admin
      .from("profile_llm_baseline")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id),
    // Alleen de vragen uit de onboarding zelf tellen hier mee: dat is wat de
    // subpagina "Aanvullen" toont. Vragen die een latere analyse opwierp
    // (`analysis_id` gezet) horen bij die analyse, niet bij de afrondingsstatus
    // van het merkdossier.
    admin
      .from("fact_requests")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id)
      .is("analysis_id", null)
      .eq("status", "open"),
  ]);

  const facetSummaries: Record<string, string | null> = {};
  for (const row of facetRows ?? []) {
    facetSummaries[row.facet as string] =
      (row.summary as string | null) ?? null;
  }

  const steps = buildSteps({
    pendingByType: progress.pendingByType,
    facetSummaries,
    counts: {
      topics: topics ?? 0,
      auditChecks: Array.isArray(auditRow?.checks_json)
        ? auditRow.checks_json.length
        : 0,
      researchDone: profile.status === "klaar",
    },
  });

  // De synthese draagt de open punten die het onderzoek zélf niet kon
  // vaststellen. Ze staan in dezelfde rij als de samenvatting, dus dit is geen
  // extra query maar een tweede blik op wat er al opgehaald is.
  const synthese = (facetRows ?? []).find((r) => r.facet === "synthese");
  const researchGaps = Array.isArray(
    (synthese as { raw_json?: { gaps?: unknown } } | undefined)?.raw_json?.gaps,
  )
    ? ((synthese as { raw_json: { gaps: unknown[] } }).raw_json.gaps.filter(
        (g) => typeof g === "string" && g.trim().length > 0,
      ).length as number)
    : 0;

  return NextResponse.json({
    status: profile.status,
    pendingJobs: progress.pending,
    runningJobs: progress.running,
    failedJobs: progress.failed,
    retrying: progress.retrying,
    attempts: progress.attempts,
    etaText: formatEta(progress.etaSeconds),
    steps,
    // Alles wat `assessReadiness()` nodig heeft, zodat het afrondingsblok
    // meebeweegt met de polling in plaats van pas na een harde herlaadbeurt.
    counts: {
      profileId: id,
      pages: pages ?? 0,
      offerings: offerings ?? 0,
      topics: topics ?? 0,
      auditChecks: Array.isArray(auditRow?.checks_json)
        ? auditRow.checks_json.length
        : 0,
      baselineRows: baselineRows ?? 0,
      dossier: Boolean(synthese?.summary),
      openFactRequests: openFacts ?? 0,
      researchGaps,
      // Het werkgebied (spoor R6). Zonder dit veld vuurt de regionale
      // promptregel niet, en dan meet een lokaal merk vragen die het per
      // definitie niet kan winnen. Zie lib/pipeline/field-merge.ts.
      scopeKnown: bereik.known,
      scopeDetail: bereik.detail,
    },
  });
}
