import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EntitiesManager } from "../../_components/entities-manager";
import type { Entity } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Concurrenten indelen" };

/**
 * Merken indelen als concurrent, vergelijkingssite, brancheorganisatie of iets
 * anders. Verhuisd van Analytics → Concurrenten op 2 september 2026 (plan
 * analytics-herontwerp.md, C1): 329 rijen met een uitklapmenu en drie keuzes
 * zijn beheer en geen analyse, en dat was nooit werk voor de klant (het
 * product is sales-led). Op Concurrenten blijft alleen de voetnoot staan die
 * de noemer van het aandeel verklaart.
 *
 * ⚠️ Een klant krijgt hier een **404 en geen 403**, zelfde patroon als
 * `app/(app)/merk/[id]/admin/toewijzen/page.tsx`.
 */
export default async function AdminConcurrentenPage({
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

  const supabase = await createClient();
  const { data: entityRows } = await supabase
    .from("entities")
    .select("*")
    .eq("profile_id", id)
    .order("canonical_name");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Concurrenten indelen"
        description="Welke merken meetellen in het aandeel van dit merk op Concurrenten."
      />
      <EntitiesManager profileId={id} initial={(entityRows ?? []) as Entity[]} />
    </div>
  );
}
