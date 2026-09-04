import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { membersOf } from "@/lib/accounts";
import { listPendingInvites } from "@/lib/invites";
import { PageHeader } from "@/components/page-header";
import { AssignBox } from "../../_components/assign-box";
import { PackageBox } from "../../_components/package-box";
import { TeamBox } from "@/app/(app)/instellingen/team-box";
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

  // Meerdere mensen bij hetzelfde merk: dat loopt via het account eronder
  // (`account_users`, migratie 0046), niet via het merk zelf. `AssignBox`
  // hierboven kiest de hoofdeigenaar en het account; dit blok laat de
  // beheerder daarna extra mensen bij dát account uitnodigen, met dezelfde
  // route als `/instellingen` (`POST /api/accounts/[id]/invites`), die een
  // beheerder van ORBIT ENGINE altijd toelaat (`mayInvite` in
  // lib/invite-rules.ts).
  const accountId = (account?.id as string | undefined) ?? null;
  const [members, pending] = accountId
    ? await Promise.all([membersOf(accountId, user.id), listPendingInvites(accountId)])
    : [[], []];

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

      {accountId ? (
        <TeamBox
          accountId={accountId}
          accountName={(account?.name as string | undefined) ?? "dit account"}
          members={members}
          pending={pending}
          mayInvite
        />
      ) : (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Wie er bij dit merk kan</span>
          <p className="text-sm text-secondary">
            Wijs dit merk eerst toe aan een klantaccount hierboven. Daarna kun je hier extra
            mensen voor dat account uitnodigen.
          </p>
        </div>
      )}

      <PackageBox
        accountId={accountId}
        accountName={(account?.name as string | undefined) ?? null}
        current={(account?.package_pages_per_month as number | null | undefined) ?? null}
      />
    </div>
  );
}
