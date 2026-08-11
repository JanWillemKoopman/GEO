import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPlan } from "@/lib/plans";
import { PageHeader } from "@/components/page-header";
import { PlanView } from "./plan-view";
import { CreatePlanBox } from "./create-plan-box";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return {
    title: profile ? `Contentplan · ${profile.brand_name ?? profile.name}` : "Contentplan",
  };
}

/**
 * Het contentplan van één merk.
 *
 * Twee toestanden: er is een plan, of er is er nog geen. Dat tweede is geen lege
 * lijst maar een eigen scherm dat uitlegt wat er gaat gebeuren en wat ervoor
 * nodig is (`docs/ux-design.md` §4: een paneel dat niets te tonen heeft,
 * verdwijnt niet, het toont waaróm het leeg is).
 */
export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();
  await requireUser();

  const admin = createAdminClient();
  const bundle = await loadPlan(admin, id);

  // Het pakket bepaalt de quota, en zonder pakket is er geen plan te maken.
  // Dat hoort het scherm te zeggen in plaats van een knop te tonen die faalt.
  const { data: account } = profile.account_id
    ? await admin
        .from("accounts")
        .select("package_pages_per_month, name")
        .eq("id", profile.account_id)
        .maybeSingle()
    : { data: null };

  const quota = (account?.package_pages_per_month as number | null) ?? null;

  const [{ count: topicCount }] = await Promise.all([
    admin
      .from("profile_topics")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id)
      .neq("status", "afgewezen"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Contentplan"
        title={profile.brand_name ?? profile.name}
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
        description="Twaalf maanden vooruit. Je keurt per maand goed, en Aura begint tien dagen voor elke publicatiedatum met schrijven."
      />

      {bundle ? (
        <PlanView
          profileId={id}
          plan={bundle.plan}
          months={bundle.months}
          pages={bundle.pages}
          funnels={bundle.funnels}
          topics={bundle.topics}
        />
      ) : (
        <CreatePlanBox
          profileId={id}
          quota={quota}
          topicCount={topicCount ?? 0}
          accountName={(account?.name as string | undefined) ?? null}
        />
      )}
    </div>
  );
}
