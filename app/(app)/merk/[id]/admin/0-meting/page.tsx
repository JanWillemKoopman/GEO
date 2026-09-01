import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "../../_components/profile-progress";
import { LlmKnowledgePanel } from "../../_components/llm-knowledge-panel";
import { ConfidenceChip } from "@/components/confidence-chip";
import { onboardingHeadline } from "@/lib/pipeline/onboarding-summary";
import type { BaselineVerdict, CategoryVerdict } from "@/lib/pipeline/baseline-verdict";
import { ProfileHero } from "../../_components/profile-hero";
import { ProfileSection } from "../../_components/profile-section";
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
  const [{ data: baselineRows }, { data: synthesisRow }, { data: entityRows }] =
    await Promise.all([
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
    // "Aanbodboom"), en `onboardingHeadline` gebruikt `coverage` niet in zijn
    // tekst. Leeg is dus correct, geen tweede query voor een ongebruikt veld.
    coverage: { coverage: [], missing: 0, weak: 0, assessed: 0 },
  };

  const dossier =
    (synthesisRow as { summary?: string | null } | null)?.summary ?? null;
  const dossierConfidence =
    (synthesisRow as { confidence?: number | null } | null)?.confidence ?? null;

  // Twee bronnen, één lijst: wat de meting tegenkwam (`entities`) en wat de
  // klant zelf noteerde (`profiles.competitors`). Ze overlappen deels, en twee
  // lijsten naast elkaar tonen laat je zich afvragen welke de echte is.
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
          description="Wat ORBIT ENGINE van de website begreep, in gewone taal. De basis onder alles wat ORBIT ENGINE schrijft."
        >
          <div className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-label">Wat ORBIT ENGINE van de site begreep</span>
              <ConfidenceChip confidence={dossierConfidence} />
            </div>
            <p className="text-secondary">{dossier}</p>
          </div>
        </ProfileSection>
      )}

      <ProfileSection
        id="ai-kennis"
        title="Wat AI-assistenten over dit merk weten"
        description="De nulmeting, uitgesplitst per vraag: wat ChatGPT antwoordde en waar dat vandaan kwam."
      >
        <LlmKnowledgePanel rows={baselines} />
      </ProfileSection>

      {/* ── Concurrenten ────────────────────────────────────────────────────
          Lezend, zoals het merk ze kent. Het beheer (welk genoemd merk telt
          echt als concurrent) zit bij Analytics: dat is een cijfervraag, en
          het bepaalt de noemer van het aandeel. Hier hoort alleen de lijst. */}
      <ProfileSection
        id="concurrenten"
        title="Concurrenten"
        description="De partijen waar de klant ook naar kijkt, en die ORBIT ENGINE in AI-antwoorden tegenkomt."
      >
        <div className="card flex flex-col gap-3">
          {concurrenten.length === 0 ? (
            <>
              <span className="mono-label">Nog geen concurrenten vastgelegd</span>
              <p className="text-secondary">
                ORBIT ENGINE vult deze lijst zelf aan zodra het merken in AI-antwoorden tegenkomt.
                Staan er nu al een paar bekend, zet ze dan bij{" "}
                <Link href={`/merk/${id}/merkprofiel/bewerken`} className="underline">
                  Merkdossier
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
                Welke van deze merken meetellen in het aandeel bepaal je bij{" "}
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
