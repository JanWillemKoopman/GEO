import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { ProfileProgress } from "./profile-progress";
import { ProfileEditor } from "./profile-editor";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  return <ProfileEditor initial={profile} />;
}
