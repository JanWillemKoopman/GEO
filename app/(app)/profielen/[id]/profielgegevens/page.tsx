import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ProfileEditor } from "../profile-editor";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return {
    title: profile ? `Profielgegevens · ${profile.brand_name ?? profile.name}` : "Profielgegevens",
  };
}

/**
 * De gegevens waar Aura mee rekent: naam, schrijfwijzen, werkgebied, toon.
 * Eigen subpagina sinds de herstructurering van augustus 2026: naslag, geen
 * verhaal, dus geen plek tussen de leesschermen van het dossier.
 */
export default async function ProfielgegevensPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  const supabase = await createClient();
  const { count } = await supabase
    .from("profile_pages")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkdossier"
        title="Profielgegevens"
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
        description="De gegevens waar Aura mee rekent: naam, schrijfwijzen, werkgebied en toon."
      />

      <ProfileEditor initial={profile} inventoryCount={count ?? 0} />
    </div>
  );
}
