import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "./profile-progress";
import { LlmKnowledgePanel } from "./llm-knowledge-panel";
import { MilestonesBlock } from "@/components/milestones-block";
import { InsightsBlock } from "@/components/loop-blocks";
import { loadLoop } from "@/lib/insights-data";
import { loadMilestones } from "@/lib/milestones-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfidenceChip } from "@/components/confidence-chip";
import { onboardingHeadline } from "@/lib/pipeline/onboarding-summary";
import type { BaselineVerdict, CategoryVerdict } from "@/lib/pipeline/baseline-verdict";
import { ProfileHero } from "./profile-hero";
import { ProfileSection } from "./profile-section";
import { ProfileReadinessPanel } from "./profile-readiness-panel";
import type { ProfileLlmBaseline } from "@/lib/types/database";

// A.4: geen layout.tsx boven deze route, dus de titel staat direct op de
// pagina. `getProfile` is gememoïseerd (lib/profiles.ts), dus dit is geen
// tweede query naast de pagina zelf.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return {};
  return { title: profile.brand_name ?? profile.name };
}

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
 * Nu twee blokken, precies wat het woord "dossier" belooft:
 *
 *   1. Is het compleet?             (`ProfileReadinessPanel`)
 *   2. Wat weet Aura over de klant, uit de nulmeting? (dossier + AI-kennis)
 *
 * Alles wat een werkscherm is (aanvullen, corrigeren, toewijzen) of gereedschap
 * (techniek, profielgegevens, concurrenten) heeft een eigen subpagina onder
 * "Merkdossier" in de zijbalk, zie `lib/nav.ts`. Wat output van een analyse is
 * (aanbevolen onderwerpen, "waar begin je") staat bij "Clusters", niet hier.
 */
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  const supabase = await createClient();
  const [{ data: baselineRows }, { data: synthesisRow }] = await Promise.all([
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
    // "Producten"), en `onboardingHeadline` gebruikt `coverage` niet in zijn
    // tekst. Leeg is dus correct, geen tweede query voor een ongebruikt veld.
    coverage: { coverage: [], missing: 0, weak: 0, assessed: 0 },
  };

  const dossier =
    (synthesisRow as { summary?: string | null } | null)?.summary ?? null;
  const dossierConfidence =
    (synthesisRow as { confidence?: number | null } | null)?.confidence ?? null;

  const beheerClient = createAdminClient();
  const mijlpalen = await loadMilestones(beheerClient, id, profile.account_id);

  // De lus (fase 6): drie zinnen over wat er gebeurde. De kansenlijst
  // ("waar begin je") staat sinds deze herstructurering bij "Clusters": dat is
  // output over analyses heen, geen deel van wat Aura over het merk weet.
  const lus = await loadLoop(beheerClient, id);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Wie is dit, en hoe staat het ervoor ────────────────────────────
          Het scherm dat de consultant deelt in de demo. */}
      <ProfileHero brandName={merknaam} url={profile.url} headline={onboardingHeadline(samenvatting)} />

      {/* ── Wat dit tot nu toe opleverde ───────────────────────────────────
          `docs/Nova.md` §5: door besluit 7 (doorlopend opzegbaar) is dit het
          blok dat opzeggen tegenhoudt. Het staat daarom hoog en niet weggestopt
          in een analysescherm. */}
      <MilestonesBlock milestones={mijlpalen} />

      {/* ── Wat er deze maand gebeurde ─────────────────────────────────────
          Fase 6. Drie zinnen, en de meetonzekerheid staat erin. */}
      <InsightsBlock insights={lus.insights} />

      {/* ── 1. Dossier compleet ─────────────────────────────────────────────
          Het profiel gaat op 'klaar' na stap 2 van 8. Dit blok toont eerst wat
          er nog binnenkomt, en daarna of het dossier compleet is. */}
      <ProfileReadinessPanel profileId={id} brandName={merknaam} />

      {/* ── 2. Het dossier ───────────────────────────────────────────────────
          Alles wat Aura over de klant weet uit de nulmeting: de samenvatting in
          gewone taal, en de nulmeting zelf, uitgesplitst per vraag. */}
      {dossier && (
        <ProfileSection
          id="dossier"
          title="Het dossier"
          description="Wat Aura van je website begreep, in gewone taal. De basis onder alles wat Aura schrijft."
        >
          <div className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-label">Wat Aura van je site begreep</span>
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
    </div>
  );
}
