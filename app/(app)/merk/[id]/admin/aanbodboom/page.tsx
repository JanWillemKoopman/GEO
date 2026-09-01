import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "../../_components/profile-progress";
import { PageHeader } from "@/components/page-header";
import { OfferingsPanel } from "../../_components/offerings-panel";
import { assessStructureCoverage } from "@/lib/pipeline/structure-gap";
import { activeOfferings, removedOfferings } from "@/lib/offerings";
import type { ProfileOffering } from "@/lib/types/database";

export const metadata = { title: "Aanbodboom" };

/**
 * DE AANBODBOOM: diensten en producten zoals ORBIT ENGINE ze op de site vond,
 * alleen voor jou.
 *
 * ── HERKOMST ─────────────────────────────────────────────────────────────────
 *
 * Tot 1 september 2026 was dit het blok "Aanbod" op het merkdossier
 * (`/merk/[id]/merkprofiel`). Net als de rest van dat scherm (zie
 * `../0-meting`) bleek dit stafgereedschap: de consultant richt de boom in
 * vóór het demogesprek, een klant bewerkt hem niet zelfstandig. Vandaar een
 * eigen bestemming onder Admin.
 *
 * ⚠️ **Een klant krijgt hier een 404 en geen 403.** Zelfde patroon als
 * `app/(app)/merk/[id]/admin/toewijzen/page.tsx`.
 */
export default async function AanbodboomPage({
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
  const [{ data: pageRows }, offeringRows, verwijderdeOfferings, { data: offeringFacetRow }] =
    await Promise.all([
      // Blok 4, Aanbod: het aanbod zoals gevonden, en wat nog geen pagina heeft.
      supabase.from("profile_pages").select("url, title, source").eq("profile_id", id),
      // `activeOfferings()`/`removedOfferings()` (onboarding Ronde C, §16.4 en
      // §16.7): het scherm toont de actieve boom, met de verwijderde knopen
      // achter "tonen" in plaats van stil weg.
      activeOfferings(supabase, id),
      removedOfferings(supabase, id),
      supabase
        .from("profile_facets")
        .select("confidence")
        .eq("profile_id", id)
        .eq("facet", "aanbod")
        .maybeSingle(),
    ]);

  // Deterministisch, geen AI (`docs/architecture.md` §6, "Bewust géén AI").
  const coverage = assessStructureCoverage(
    offeringRows as ProfileOffering[],
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Aanbodboom"
        description="De diensten en producten zoals ORBIT ENGINE ze op de site vond, en welke nog geen eigen pagina hebben."
      />

      <OfferingsPanel
        profileId={id}
        offerings={offeringRows as ProfileOffering[]}
        removedOfferings={verwijderdeOfferings as ProfileOffering[]}
        inventory={profile.inventory_quality_json}
        confidence={offeringConfidence}
        coverage={coverage}
        manualPages={handmatigePaginas}
        priorityPaths={profile.crawl_priority_paths ?? []}
      />
    </div>
  );
}
