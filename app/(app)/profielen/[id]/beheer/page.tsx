import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { AssignBox } from "../assign-box";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return {
    title: profile ? `Toewijzen · ${profile.brand_name ?? profile.name}` : "Toewijzen",
  };
}

/**
 * Dit merk aan een klantaccount koppelen. Doe je ná het gesprek, niet
 * tijdens — vandaar een eigen subpagina en niet een blok tussen wat de klant
 * meeleest. Alleen voor beheerders; een klant krijgt hier een 404, zoals
 * eerder op `page.tsx` toen dit nog een blok was.
 */
export default async function BeheerPage({
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
        eyebrow="Merkdossier"
        title="Toewijzen"
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
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
