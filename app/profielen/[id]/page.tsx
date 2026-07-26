import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "./profile-progress";
import { ProfileEditor } from "./profile-editor";
import { EntitiesManager } from "./entities-manager";
import type { Entity } from "@/lib/types/database";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  const supabase = await createClient();
  const [{ count }, { data: entityRows }] = await Promise.all([
    supabase.from("profile_pages").select("id", { count: "exact", head: true }).eq("profile_id", id),
    // Concurrenten horen bij het PROFIEL, niet bij één analyse (optimalisatie.md
    // 2.4/2.7): dezelfde concurrent duikt op bij meerdere onderwerpen van
    // hetzelfde merk, en die moet dan één rij zijn.
    supabase.from("entities").select("*").eq("profile_id", id).order("canonical_name"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <ProfileEditor initial={profile} inventoryCount={count ?? 0} />
      <EntitiesManager profileId={id} initial={(entityRows ?? []) as Entity[]} />
    </div>
  );
}
