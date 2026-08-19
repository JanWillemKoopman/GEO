import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { OnboardingSession } from "../../_components/onboarding-session";
import { parseContextFactors } from "@/lib/pipeline/context-factors";
import type { FieldState } from "@/lib/profile-meter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Onboarding" };

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
  const [{ data: bronRijen }, { data: strategieRij }] = await Promise.all([
    admin
      .from("profile_field_sources")
      // ⚠️ Bewust niet het bewijs erbij (`evidence_quote`, `evidence_url`): dat
      // is onderzoeksdetail en de klant kijkt mee.
      .select("field, source, not_applicable")
      .eq("profile_id", id),
    admin
      .from("profile_strategy")
      .select("strategy_notes, context_factors, recorded_at")
      .eq("profile_id", id)
      .maybeSingle(),
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

  const merknaam = profile.brand_name ?? profile.name;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Onboarding"
        backHref={`/merk/${id}`}
        backLabel="Overzicht"
        description={`Samen nalopen wat ORBIT ENGINE over ${merknaam} heeft gevonden, aanvullen wat een website niet kan vertellen, en vastleggen wat we afspreken.`}
      />

      <OnboardingSession
        profileId={id}
        brandName={merknaam}
        initial={profile}
        initialStates={states}
        strategyNotes={strategie?.strategy_notes ?? null}
        strategyFactors={parseContextFactors(strategie?.context_factors)}
        recordedAt={strategie?.recorded_at ?? null}
      />
    </div>
  );
}
