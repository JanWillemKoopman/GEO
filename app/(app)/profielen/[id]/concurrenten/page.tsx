import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EntitiesManager } from "../entities-manager";
import type { Entity } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return {
    title: profile ? `Concurrenten · ${profile.brand_name ?? profile.name}` : "Concurrenten",
  };
}

/**
 * Concurrenten beheren (optimalisatie.md 2.7). Eigen subpagina sinds de
 * herstructurering van augustus 2026: dit hoort bij het merk als geheel, niet
 * bij één analyse, en is naslag om bij te stellen, geen deel van het verhaal.
 */
export default async function ConcurrentenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  const supabase = await createClient();
  const { data: entityRows } = await supabase
    .from("entities")
    .select("*")
    .eq("profile_id", id)
    .order("canonical_name");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkdossier"
        title="Concurrenten"
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
        description="Elk merk dat een AI-assistent in zijn antwoorden noemt, deelt ORBIT ENGINE automatisch in. Alleen echte concurrenten tellen mee in je aandeel."
      />

      <EntitiesManager profileId={id} initial={(entityRows ?? []) as Entity[]} />
    </div>
  );
}
