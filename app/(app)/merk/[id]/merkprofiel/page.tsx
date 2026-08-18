import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "../_components/profile-progress";
import { LlmKnowledgePanel } from "../_components/llm-knowledge-panel";
import { MilestonesBlock } from "@/components/milestones-block";
import { InsightsBlock } from "@/components/loop-blocks";
import { loadLoop } from "@/lib/insights-data";
import { loadMilestones } from "@/lib/milestones-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfidenceChip } from "@/components/confidence-chip";
import { onboardingHeadline } from "@/lib/pipeline/onboarding-summary";
import type { BaselineVerdict, CategoryVerdict } from "@/lib/pipeline/baseline-verdict";
import { ProfileHero } from "../_components/profile-hero";
import { ProfileSection } from "../_components/profile-section";
import { ProfileReadinessPanel } from "../_components/profile-readiness-panel";
import { OfferingsPanel } from "../_components/offerings-panel";
import { assessStructureCoverage } from "@/lib/pipeline/structure-gap";
import type { ProfileLlmBaseline, ProfileOffering } from "@/lib/types/database";

export const metadata = { title: "Merkdossier" };

/**
 * HET MERKDOSSIER: het leesscherm, en verder niets.
 *
 * ── HERSTRUCTURERING VAN AUGUSTUS 2026 ───────────────────────────────────────
 *
 * Deze pagina was 525 regels en negen ongelijksoortige blokken: een leesscherm
 * ("wat weten we"), drie werkschermen ("vul aan", "corrigeer", "wijs toe") en
 * gereedschap ("techniek", "profielgegevens", "concurrenten") stonden allemaal
 * onder elkaar, met een primaire knop bovenaan die naar een heel ander scherm
 * verwees (het volgende onderwerp om te meten). Overweldigend, en met meer dan
 * één doel per pagina.
 *
 * Sinds 17 augustus 2026 staat dit op `/merk/[id]/merkprofiel` in plaats van op
 * `/profielen/[id]`; de toegangscontrole zit in de layout erboven, dus deze
 * pagina hoeft alleen nog te lezen. Zie `app/(app)/merk/[id]/layout.tsx`.
 */
export default async function MerkdossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  const supabase = await createClient();
  const [
    { data: baselineRows },
    { data: synthesisRow },
    { data: pageRows },
    { data: offeringRows },
    { data: offeringFacetRow },
  ] = await Promise.all([
    // Wat AI-assistenten al over dit merk weten (blok B fase 3).
    supabase
      .from("profile_llm_baseline")
      .select("*")
      .eq("profile_id", id)
      .order("measured_at"),
    // De synthese (fase 5): het dossier in gewone taal.
    supabase
      .from("profile_facets")
      .select("summary, confidence")
      .eq("profile_id", id)
      .eq("facet", "synthese")
      .maybeSingle(),
    // Blok 4, Aanbod: het aanbod zoals gevonden, en wat nog geen pagina heeft.
    supabase.from("profile_pages").select("url, title").eq("profile_id", id),
    supabase.from("profile_offerings").select("*").eq("profile_id", id).order("sort_order"),
    supabase
      .from("profile_facets")
      .select("confidence")
      .eq("profile_id", id)
      .eq("facet", "aanbod")
      .maybeSingle(),
  ]);

  // ── De kop: één zin en drie cijfers (ux-design.md regel 1) ───────────────
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
  const samenvatting = {
    brandName: merknaam,
    knowsVerdicts,
    categoryVerdicts,
    // Geen structurele dekkingsanalyse meer op dit scherm (die staat nu op
    // "Aanbod"), en `onboardingHeadline` gebruikt `coverage` niet in zijn
    // tekst. Leeg is dus correct, geen tweede query voor een ongebruikt veld.
    coverage: { coverage: [], missing: 0, weak: 0, assessed: 0 },
  };

  const dossier =
    (synthesisRow as { summary?: string | null } | null)?.summary ?? null;
  const dossierConfidence =
    (synthesisRow as { confidence?: number | null } | null)?.confidence ?? null;

  // Blok 4: welke onderdelen van het aanbod nog geen eigen pagina hebben.
  // Deterministisch, geen AI (`docs/architecture.md` §6, "Bewust géén AI").
  const coverage = assessStructureCoverage(
    (offeringRows ?? []) as ProfileOffering[],
    ((pageRows ?? []) as { url: string; title: string | null }[]).map((p) => ({
      url: p.url,
      title: p.title,
      text: "",
    })),
  );
  const offeringConfidence =
    (offeringFacetRow as { confidence?: number | null } | null)?.confidence ?? null;

  const beheerClient = createAdminClient();
  const mijlpalen = await loadMilestones(beheerClient, id, profile.account_id);
  const lus = await loadLoop(beheerClient, id);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Wie is dit, en hoe staat het ervoor ────────────────────────────
          Het scherm dat de consultant deelt in de demo. */}
      <ProfileHero brandName={merknaam} url={profile.url} headline={onboardingHeadline(samenvatting)} />

      {/* ── Wat dit tot nu toe opleverde ───────────────────────────────────
          Door besluit 7 (doorlopend opzegbaar) is dit het blok dat opzeggen
          tegenhoudt. Verhuist in fase 5 naar Overzicht. */}
      <MilestonesBlock milestones={mijlpalen} />

      {/* ── Wat er deze maand gebeurde ─────────────────────────────────────
          Fase 6. Drie zinnen, en de meetonzekerheid staat erin. */}
      <InsightsBlock insights={lus.insights} />

      {/* ── 1. Dossier compleet ─────────────────────────────────────────────
          Het profiel gaat op 'klaar' na stap 2 van 8. Dit blok toont eerst wat
          er nog binnenkomt, en daarna of het dossier compleet is. */}
      <ProfileReadinessPanel profileId={id} brandName={merknaam} />

      {/* ── 2. Het dossier ───────────────────────────────────────────────────
          Alles wat ORBIT ENGINE over de klant weet uit de nulmeting: de samenvatting in
          gewone taal, en de nulmeting zelf, uitgesplitst per vraag. */}
      {dossier && (
        <ProfileSection
          id="dossier"
          title="Het dossier"
          description="Wat ORBIT ENGINE van je website begreep, in gewone taal. De basis onder alles wat ORBIT ENGINE schrijft."
        >
          <div className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-label">Wat ORBIT ENGINE van je site begreep</span>
              <ConfidenceChip confidence={dossierConfidence} />
            </div>
            <p className="text-secondary">{dossier}</p>
          </div>
        </ProfileSection>
      )}

      <ProfileSection
        id="ai-kennis"
        title="Wat AI-assistenten over je weten"
        description="De nulmeting, uitgesplitst per vraag: wat ChatGPT antwoordde en waar dat vandaan kwam."
      >
        <LlmKnowledgePanel rows={baselines} />
      </ProfileSection>

      {/* ── 4. Aanbod ──────────────────────────────────────────────────────
          Verhuisd van `/profielen/[id]/producten` op 17 augustus 2026. Het is
          onderdeel van wat ORBIT ENGINE van het merk begreep, geen apart scherm. */}
      <ProfileSection
        id="aanbod"
        title="Aanbod"
        description="Je diensten en producten zoals ORBIT ENGINE ze op je site vond, en welke nog geen eigen pagina hebben."
      >
        <OfferingsPanel
          profileId={id}
          offerings={(offeringRows ?? []) as ProfileOffering[]}
          inventory={profile.inventory_quality_json}
          confidence={offeringConfidence}
          coverage={coverage}
        />
      </ProfileSection>
    </div>
  );
}
