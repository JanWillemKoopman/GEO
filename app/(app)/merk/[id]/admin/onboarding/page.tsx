import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { OnboardingSession } from "../../_components/onboarding-session";
import { parseContextFactors } from "@/lib/pipeline/context-factors";
import { loadOpenQuestions } from "@/lib/open-questions";
import { activeOnly } from "@/lib/archive";
import type { FieldState } from "@/lib/profile-meter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Onboardinggesprek" };

/**
 * DE ONBOARDINGSESSIE, het werk mét de klant.
 *
 * ── ⚠️ HET ENIGE STAFSCHERM DAT GEDEELD WORDT ──────────────────────────────
 *
 * Deze pagina staat onder `admin/` omdat dat segment de afscherming al heeft en
 * een klant die het adres raadt een 404 krijgt in plaats van een 403. Een 403
 * bevestigt dat het scherm bestaat, en dat is precies wat hij niet hoort te
 * weten.
 *
 * Maar anders dan de rest van `admin/` is dit scherm bedoeld om te DELEN: de
 * klant zit ernaast en kijkt mee. Wat daaruit volgt staat in
 * `onboarding-session.tsx` en wordt door een test bewaakt: geen taaknamen, geen
 * bedragen, geen foutcodes.
 *
 * ── DE SCHEIDING MET DIAGNOSE ───────────────────────────────────────────────
 *
 *   Onboarding = het werk mét de klant.
 *   Diagnose   = wat er technisch gebeurde, alleen voor jou.
 *
 * Daarom zijn de volledigheidsmeter en het gespreksblok van `admin/page.tsx`
 * hierheen verhuisd: dat is werk en geen diagnose.
 */
export default async function OnboardingSessiePagina({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const admin = createAdminClient();
  const [{ data: bronRijen }, { data: strategieRij }, { data: analyseRijen }, vragen, { data: alleAnalyses }] =
    await Promise.all([
      admin
        .from("profile_field_sources")
        // ⚠️ Bewust niet het bewijs erbij (`evidence_quote`, `evidence_url`): dat
        // is onderzoeksdetail en de klant kijkt mee.
        .select("field, source, not_applicable, set_at")
        .eq("profile_id", id),
      admin
        .from("profile_strategy")
        .select("strategy_notes, context_factors, recorded_at")
        .eq("profile_id", id)
        .maybeSingle(),
      // Analyses waarvan de vragen nog opnieuw opgesteld kunnen worden. Bij een
      // analyse die al gemeten is zou een nieuwe vragenset de trendlijn breken.
      admin
        .from("analyses")
        .select("id")
        .eq("profile_id", id)
        .is("archived_at", null)
        .in("status", ["bezig", "concept_klaar"]),
      // Onboarding ronde B, stap B6: dezelfde loader als de vragenpagina
      // (`/strategie/vragen`), zodat er geen tweede telling ontstaat.
      loadOpenQuestions(admin, profile),
      // Voor het groepsfilter van `FactRequests`: alle actieve clusters, niet
      // alleen de twee statussen hierboven, want een vraag kan bij elk cluster
      // horen dat nog niet is gearchiveerd.
      activeOnly(admin.from("analyses").select("id, topic").eq("profile_id", id)),
    ]);

  const states: Record<string, FieldState> = {};
  for (const rij of (bronRijen ?? []) as {
    field: string;
    source: string;
    not_applicable: boolean;
  }[]) {
    states[rij.field] = {
      source: rij.source as FieldState["source"],
      notApplicable: rij.not_applicable,
    };
  }

  const strategie = strategieRij as {
    strategy_notes: string | null;
    context_factors: unknown;
    recorded_at: string | null;
  } | null;

  // Wat er sinds de laatste onderzoeksronde door een mens is gezet. Bepaalt
  // welke stappen het afrondblok aanbiedt om opnieuw te draaien.
  const gewijzigd = profile.deep_research_at
    ? ((bronRijen ?? []) as { field: string; source: string; set_at: string }[])
        .filter((r) => r.source !== "ai" && r.set_at > profile.deep_research_at!)
        .map((r) => r.field)
    : [];

  const merknaam = profile.brand_name ?? profile.name;

  // Zelfde filter en groepering als de vragenpagina: een vraag uit een
  // gearchiveerd cluster is geen werk meer, en het merk staat voorop omdat die
  // antwoorden élke pagina van élk cluster verbeteren.
  const analyses = (alleAnalyses ?? []) as { id: string; topic: string | null }[];
  const actieveIds = new Set(analyses.map((a) => a.id));
  const factGroepen = [
    { id: "merk", naam: "Over je merk" },
    ...analyses
      .map((a) => ({ id: a.id, naam: a.topic ?? "Cluster" }))
      .sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
  ];
  const factRequests = vragen.facts.filter(
    (f) => f.analysis_id === null || actieveIds.has(f.analysis_id),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Onboardinggesprek"
        description={`Samen nalopen wat ORBIT ENGINE over ${merknaam} heeft gevonden, aanvullen wat een website niet kan vertellen, en vastleggen wat we afspreken. Alles wat je hier invult wordt meteen bewaard.`}
      />

      <OnboardingSession
        profileId={id}
        brandName={merknaam}
        initial={profile}
        initialStates={states}
        strategyNotes={strategie?.strategy_notes ?? null}
        strategyFactors={parseContextFactors(strategie?.context_factors)}
        recordedAt={strategie?.recorded_at ?? null}
        changedSinceResearch={gewijzigd}
        openAnalyses={(analyseRijen ?? []).length}
        factRequests={factRequests}
        factGroepen={factGroepen}
      />
    </div>
  );
}
