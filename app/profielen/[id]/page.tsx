import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "./profile-progress";
import { ProfileEditor } from "./profile-editor";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("profile_pages")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", id);

  return <ProfileEditor initial={profile} inventoryCount={count ?? 0} />;
}
