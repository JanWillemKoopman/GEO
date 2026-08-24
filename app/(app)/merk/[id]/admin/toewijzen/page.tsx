import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { AssignBox } from "../../_components/assign-box";

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
    </div>
  );
}
