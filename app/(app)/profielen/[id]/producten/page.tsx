import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { OfferingsPanel } from "../offerings-panel";
import { assessStructureCoverage } from "@/lib/pipeline/structure-gap";
import type { ProfileOffering } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return {
    title: profile ? `Producten · ${profile.brand_name ?? profile.name}` : "Producten",
  };
}

/**
 * "Wat je aanbiedt" (optimalisatie.md blok B fase 1), sinds de herstructurering
 * van augustus 2026 een eigen subpagina onder Merkdossier in plaats van een blok
 * op die pagina zelf. Eén doel: laten zien wat ORBIT ENGINE als aanbod op de site vond,
 * en welke onderdelen daarvan nog geen eigen pagina hebben.
 */
export default async function ProductenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  const supabase = await createClient();
  const [{ data: pageRows }, { data: offeringRows }, { data: offeringFacetRow }] =
    await Promise.all([
      supabase.from("profile_pages").select("url, title").eq("profile_id", id),
      supabase.from("profile_offerings").select("*").eq("profile_id", id).order("sort_order"),
      supabase
        .from("profile_facets")
        .select("confidence")
        .eq("profile_id", id)
        .eq("facet", "aanbod")
        .maybeSingle(),
    ]);

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkdossier"
        title="Producten"
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
        description="Je diensten en producten zoals ORBIT ENGINE ze op je site vond, en welke nog geen eigen pagina hebben."
      />

      <OfferingsPanel
        profileId={id}
        offerings={(offeringRows ?? []) as ProfileOffering[]}
        inventory={profile.inventory_quality_json}
        confidence={offeringConfidence}
        coverage={coverage}
      />
    </div>
  );
}
