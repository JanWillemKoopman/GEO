import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { SearchConsoleBox } from "../search-console-box";
import { serviceAccountEmail } from "@/lib/search-console/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return {
    title: profile ? `Search console · ${profile.brand_name ?? profile.name}` : "Search console",
  };
}

/**
 * Zoekdata uit Google koppelen (fase 5, `docs/tasks/zoekdata-koppeling.md`).
 *
 * Besluit 4: AI-zichtbaarheid is het verhaal, Google is het bewijsstuk. Eigen
 * subpagina sinds de herstructurering van augustus 2026: koppelen is een
 * eenmalige handeling met een eigen instructie, geen blok tussen leesstof.
 */
export default async function SearchConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  const admin = createAdminClient();
  const { count: gscDagen } = await admin
    .from("search_console_days")
    .select("day", { count: "exact", head: true })
    .eq("profile_id", id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkdossier"
        title="Search console"
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
        description="De klikken uit Google naast je zichtbaarheid in AI-antwoorden. Het bewijsstuk onder het verhaal."
      />

      <SearchConsoleBox
        profileId={id}
        property={profile.gsc_property}
        verifiedAt={profile.gsc_verified_at}
        lastError={profile.gsc_last_error}
        serviceAccountEmail={serviceAccountEmail()}
        dagen={gscDagen ?? 0}
      />
    </div>
  );
}
