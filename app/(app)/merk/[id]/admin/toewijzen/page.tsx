import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { AssignBox } from "../../_components/assign-box";
import { PackageBox } from "../../_components/package-box";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Toewijzen" };

/**
 * Dit merk aan een klantaccount koppelen. Doe je ná het gesprek, niet tijdens,
 * vandaar een eigen scherm en niet een blok tussen wat de klant meeleest.
 *
 * ⚠️ Een klant krijgt hier een **404 en geen 403**. Een 403 bevestigt dat het
 * scherm bestaat, en dat is precies wat een klant niet hoort te weten. Zelfde
 * patroon als `app/(app)/beheer/page.tsx`.
 */
export default async function ToewijzenPage({
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

  // Het pakket hangt aan het account onder dit merk, niet aan het merk zelf.
  // Zie `app/(app)/merk/[id]/_components/package-box.tsx` voor waarom het juist
  // op dit scherm staat, en `lib/package-sizes.ts` voor de fout die het oplost.
  const account = profile.account_id
    ? (
        await createAdminClient()
          .from("accounts")
          .select("id, name, package_pages_per_month")
          .eq("id", profile.account_id)
          .maybeSingle()
      ).data
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Toewijzen"
        description="Dit merk aan een klantaccount koppelen."
      />

      <AssignBox
        profileId={id}
        currentUserId={profile.user_id}
        assignedAt={profile.assigned_at}
      />

      <PackageBox
        accountId={(account?.id as string | undefined) ?? null}
        accountName={(account?.name as string | undefined) ?? null}
        current={(account?.package_pages_per_month as number | null | undefined) ?? null}
      />
    </div>
  );
}
