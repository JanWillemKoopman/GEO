import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "../_components/profile-progress";
import { LlmKnowledgePanel } from "../_components/llm-knowledge-panel";
import { ConfidenceChip } from "@/components/confidence-chip";
import { onboardingHeadline } from "@/lib/pipeline/onboarding-summary";
import type { BaselineVerdict, CategoryVerdict } from "@/lib/pipeline/baseline-verdict";
import { ProfileHero } from "../_components/profile-hero";
import { ProfileSection } from "../_components/profile-section";
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
    { data: entityRows },
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
    supabase.from("profile_pages").select("url, title, source").eq("profile_id", id),
    supabase.from("profile_offerings").select("*").eq("profile_id", id).order("sort_order"),
    supabase
      .from("profile_facets")
      .select("confidence")
      .eq("profile_id", id)
      .eq("facet", "aanbod")
      .maybeSingle(),
    // Blok 5, Concurrenten: alleen wat écht als concurrent geldt. Een
    // marktplaats of brancheorganisatie komt wél uit de meting maar hoort niet
    // in deze lijst (migratie 0024/0026, `entity_role`).
    supabase
      .from("entities")
      .select("canonical_name, entity_role")
      .eq("profile_id", id)
      .eq("entity_role", "concurrent")
      .order("canonical_name"),
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

  // Alleen de pagina's die een mens toevoegde (migratie 0061): die kun je hier
  // ook weer weghalen, de gecrawlde niet. Een gecrawlde pagina weghalen zou een
  // lege plek achterlaten die de volgende ronde gewoon weer vult.
  const handmatigePaginas = (
    (pageRows ?? []) as { url: string; title: string | null; source?: string }[]
  )
    .filter((p) => p.source === "handmatig")
    .map((p) => ({ url: p.url, title: p.title }));

  // Twee bronnen, één lijst: wat de meting tegenkwam (`entities`) en wat de
  // klant zelf noteerde (`profiles.competitors`). Ze overlappen deels, en twee
  // lijsten naast elkaar tonen laat de klant zich afvragen welke de echte is.
  const concurrenten = [
    ...new Set([
      ...((entityRows ?? []) as { canonical_name: string }[]).map((e) => e.canonical_name),
      ...profile.competitors,
    ]),
  ].sort((a, b) => a.localeCompare(b, "nl"));

  return (
    <div className="flex flex-col gap-6">
      {/* ── Wie is dit, en hoe staat het ervoor ────────────────────────────
          Het scherm dat de consultant deelt in de demo. */}
      <ProfileHero brandName={merknaam} url={profile.url} headline={onboardingHeadline(samenvatting)} />

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
          manualPages={handmatigePaginas}
          priorityPaths={profile.crawl_priority_paths ?? []}
        />
      </ProfileSection>

      {/* ── 5. Concurrenten ────────────────────────────────────────────────
          Lezend, zoals de klant ze kent. Het beheer (welk genoemd merk telt
          echt als concurrent) zit bij Analytics: dat is een cijfervraag, en
          het bepaalt de noemer van je aandeel. Hier hoort alleen de lijst. */}
      <ProfileSection
        id="concurrenten"
        title="Concurrenten"
        description="De partijen waar je klant ook naar kijkt, en die ORBIT ENGINE in AI-antwoorden tegenkomt."
      >
        <div className="card flex flex-col gap-3">
          {concurrenten.length === 0 ? (
            <>
              <span className="mono-label">Nog geen concurrenten vastgelegd</span>
              <p className="text-secondary">
                ORBIT ENGINE vult deze lijst zelf aan zodra het merken in AI-antwoorden tegenkomt.
                Weet je er nu al een paar, zet ze dan bij{" "}
                <Link href={`/merk/${id}/merkprofiel/bewerken`} className="underline">
                  Bewerken
                </Link>{" "}
                onder &ldquo;Met wie je vergeleken wordt&rdquo;.
              </p>
            </>
          ) : (
            <>
              <ul className="flex flex-wrap gap-2">
                {concurrenten.map((naam) => (
                  <li key={naam} className="chip">
                    {naam}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">
                Welke van deze merken meetellen in je aandeel bepaal je bij{" "}
                <Link href={`/merk/${id}/analytics/concurrenten`} className="underline">
                  Analytics
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </ProfileSection>
    </div>
  );
}
