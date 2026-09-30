import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "../../_components/profile-progress";
import { LlmKnowledgePanel } from "../../_components/llm-knowledge-panel";
import { onboardingHeadline } from "@/lib/pipeline/onboarding-summary";
import { summariseKnows } from "@/lib/pipeline/baseline-verdict";
import { engineLabel } from "@/lib/engines/label";
import type { BaselineVerdict, CategoryVerdict } from "@/lib/pipeline/baseline-verdict";
import { PageHeader } from "@/components/page-header";
import type { ProfileLlmBaseline } from "@/lib/types/database";

export const metadata = { title: "0-meting" };

/**
 * DE 0-METING: wat ORBIT ENGINE bij aanvang over het merk te weten kwam, alleen
 * voor jou.
 *
 * ── HERKOMST ─────────────────────────────────────────────────────────────────
 *
 * Tot 1 september 2026 was dit het leesscherm van het merkdossier
 * (`/merk/[id]/merkprofiel`), en zag de klant het zelf. Het bleek in de praktijk
 * geen klantscherm: het is de nulmeting die de consultant gebruikt om het
 * profiel vóór het demogesprek klaar te zetten (het product is sales-led,
 * `docs/logbook.md` §15), niet iets waar een klant zelfstandig doorheen
 * bladert. Het scherm is daarom naar Admin verhuisd, met de aanbodboom
 * (`../aanbodboom`) als aparte bestemming ernaast. Wat de klant zelf nog
 * bewerkt staat op `/merk/[id]/merkprofiel/bewerken`, nu "Merkdossier" in de
 * zijbalk.
 *
 * ⚠️ **Een klant krijgt hier een 404 en geen 403.** Zelfde patroon als
 * `app/(app)/merk/[id]/admin/toewijzen/page.tsx`.
 */
export default async function NulmetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  const staff = await isStaff(user.id);
  if (!staff) notFound();

  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  const supabase = await createClient();
  const { data: baselineRows } = await supabase
    .from("profile_llm_baseline")
    .select("*")
    .eq("profile_id", id)
    .order("measured_at");

  const baselines = (baselineRows ?? []) as ProfileLlmBaseline[];
  const knowsVerdicts = baselines
    .filter((r) => r.block === "kent")
    .map((r) => r.verdict_json as BaselineVerdict | null)
    .filter((v): v is BaselineVerdict => v !== null);
  const categoryVerdicts = baselines
    .filter((r) => r.block === "categorie")
    .map((r) => r.verdict_json as CategoryVerdict | null)
    .filter((v): v is CategoryVerdict => v !== null);

  const merknaam = profile.brand_name ?? profile.name;
  const kent = summariseKnows(knowsVerdicts);
  const genoemd = categoryVerdicts.filter((v) => v.mentioned).length;
  const onjuist = knowsVerdicts.flatMap((v) =>
    v.checks.filter((c) => c.verdict === "tegengesproken"),
  ).length;
  const engines = [...new Set(baselines.map((r) => r.engine))];
  const gemetenOp = baselines.length
    ? new Date(baselines[baselines.length - 1].measured_at).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const kop = onboardingHeadline({
    brandName: merknaam,
    knowsVerdicts,
    categoryVerdicts,
    // `onboardingHeadline` gebruikt `coverage` niet in zijn tekst.
    coverage: { coverage: [], missing: 0, weak: 0, assessed: 0 },
  });

  // Drie cijfers en niets meer. Elk antwoordt op één vraag van de klant, en het
  // eerste (kent hij je) is een woord, geen getal, omdat "3 van de 6" zonder
  // uitleg niets zegt.
  const tegels = [
    {
      vraag: "Kent de AI-assistent het merk?",
      antwoord:
        kent.asked === 0
          ? "Niet gemeten"
          : kent.level === "kent"
            ? "Ja"
            : kent.level === "wisselend"
              ? "Soms"
              : "Nee",
      toelichting: kent.asked === 0 ? null : `Herkend bij ${kent.recognised} van ${kent.asked} manieren van vragen.`,
    },
    {
      vraag: "Wordt het merk genoemd bij een koopvraag?",
      antwoord: categoryVerdicts.length === 0 ? "Niet gemeten" : `${genoemd} van ${categoryVerdicts.length}`,
      toelichting:
        categoryVerdicts.length === 0
          ? null
          : "Vragen als een klant ze stelt, zonder de merknaam. Dit is het getal dat later moet stijgen.",
    },
    {
      vraag: "Zegt de assistent iets wat niet klopt?",
      antwoord: kent.asked === 0 ? "Niet gemeten" : onjuist === 0 ? "Nee" : `${onjuist} gegeven${onjuist === 1 ? "" : "s"}`,
      toelichting: kent.asked === 0 ? null : "Vergeleken met wat er op de eigen site staat.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="0-meting"
        description={`De stand van zaken voordat ORBIT ENGINE aan het werk gaat: wat een AI-assistent nu over ${merknaam} weet. Later meten we hetzelfde opnieuw, zodat je het verschil kunt laten zien.`}
      />

      {baselines.length === 0 ? (
        <LlmKnowledgePanel rows={baselines} />
      ) : (
        <>
          {kop && <p className="max-w-2xl text-secondary">{kop}</p>}

          <div className="grid gap-4 md:grid-cols-3">
            {tegels.map((t) => (
              <div key={t.vraag} className="card flex flex-col gap-2">
                <span className="mono-label">{t.vraag}</span>
                <span className="text-2xl font-medium">{t.antwoord}</span>
                {t.toelichting && <p className="text-sm text-muted">{t.toelichting}</p>}
              </div>
            ))}
          </div>

          <p className="text-sm text-muted">
            Gemeten op {gemetenOp} met {engines.map(engineLabel).join(", ")}, in {baselines.length}{" "}
            vragen. De vragen en de volledige antwoorden staan hieronder.
          </p>

          <LlmKnowledgePanel rows={baselines} />
        </>
      )}
    </div>
  );
}
