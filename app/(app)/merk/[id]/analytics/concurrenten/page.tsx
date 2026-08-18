import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EntitiesManager } from "../../_components/entities-manager";
import type { Entity } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Concurrenten" };

/**
 * CONCURRENTEN: wie er nog meer in de antwoorden staat.
 *
 * Verhuisde op 17 augustus 2026 van het merkdossier naar Analytics. De reden is
 * de vraag die het scherm beantwoordt: dit gaat niet over wie het merk ís maar
 * over hoe het zich verhoudt tot anderen, en dat is een cijfervraag.
 *
 * Fase 4 van `docs/tasks/appstructuur.md` zet er twee blokken bovenop: de
 * ranglijst over dezelfde noemer (`lib/pipeline/brand-rankings.ts`) en het
 * bronnenlandschap. Het entiteitenbeheer hieronder is blok 3.
 */
export default async function ConcurrentenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const supabase = await createClient();
  const { data: entityRows } = await supabase
    .from("entities")
    .select("*")
    .eq("profile_id", id)
    .order("canonical_name");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Concurrenten"
        backHref={`/merk/${id}/analytics`}
        backLabel="Zichtbaarheid in AI"
        description="Elk merk dat een AI-assistent in zijn antwoorden noemt, deelt ORBIT ENGINE automatisch in. Alleen echte concurrenten tellen mee in je aandeel."
      />

      <EntitiesManager profileId={id} initial={(entityRows ?? []) as Entity[]} />
    </div>
  );
}
