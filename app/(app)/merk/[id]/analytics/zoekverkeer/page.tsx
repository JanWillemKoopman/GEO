import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { SearchConsoleBox } from "../../_components/search-console-box";
import { serviceAccountEmail } from "@/lib/search-console/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zoekverkeer" };

/**
 * ZOEKVERKEER: de klikken uit Google naast de zichtbaarheid in AI-antwoorden.
 *
 * Besluit 4: AI-zichtbaarheid is het verhaal, Google is het bewijsstuk. Dit
 * scherm stond tot 17 augustus 2026 op `/profielen/[id]/search-console` en was
 * toen alleen de koppeling; de cijfers waren nergens te zien.
 *
 * Fase 4 van `docs/tasks/appstructuur.md` bouwt hier de zes blokken: de vier
 * kerncijfers, het verloop over tijd, de kliklijn naast de zichtbaarheidslijn,
 * de beste en zwakste pagina, klikken per paginatype en de paginatabel. Het
 * instelgedeelte hieronder verhuist dan naar `/instellingen/koppelingen`.
 */
export default async function ZoekverkeerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const admin = createAdminClient();
  const { count: gscDagen } = await admin
    .from("search_console_days")
    .select("day", { count: "exact", head: true })
    .eq("profile_id", id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Zoekverkeer"
        backHref={`/merk/${id}/analytics`}
        backLabel="Zichtbaarheid in AI"
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
