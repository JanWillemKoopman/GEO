import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "./profile-progress";
import { ProfileEditor } from "./profile-editor";
import { EntitiesManager } from "./entities-manager";
import { AuditPanel } from "@/components/audit-panel";
import { FactRequests } from "./fact-requests";
import { ProfileGaps } from "./profile-gaps";
import { AssignBox } from "./assign-box";
import { TopicsPanel } from "./topics-panel";
import type { AuditCheck } from "@/lib/audit/technical";
import type {
  Entity,
  FactRequest,
  ProfileTopic,
  TechnicalAudit as TechnicalAuditRow,
} from "@/lib/types/database";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  // De toewijsknop is een beheerdersding: een klant mag zijn eigen merk niet
  // weggeven. Zie lib/staff.ts.
  const user = await requireUser();
  const staff = await isStaff(user.id);

  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  const supabase = await createClient();
  const [
    { count },
    { data: entityRows },
    { data: auditRow },
    { data: factRows },
    { data: topicRows },
  ] = await Promise.all([
    supabase
      .from("profile_pages")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id),
    // Concurrenten horen bij het PROFIEL, niet bij één analyse (optimalisatie.md
    // 2.4/2.7): dezelfde concurrent duikt op bij meerdere onderwerpen van
    // hetzelfde merk, en die moet dan één rij zijn.
    supabase
      .from("entities")
      .select("*")
      .eq("profile_id", id)
      .order("canonical_name"),
    // De laatste technische controle (optimalisatie.md 3B).
    supabase
      .from("technical_audits")
      .select("*")
      .eq("profile_id", id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Feitenvragen uit het rapport (optimalisatie.md 4.6). Overgeslagen vragen
    // blijven weg: één keer "weet ik niet" is genoeg.
    supabase
      .from("fact_requests")
      .select("*")
      .eq("profile_id", id)
      .in("status", ["open", "beantwoord"])
      .order("created_at"),
    // De core topics (blok D): afgeleid uit de aanbodboom, handmatig aan/uit.
    supabase
      .from("profile_topics")
      .select("*")
      .eq("profile_id", id)
      .order("priority", { ascending: false }),
  ]);

  const audit = auditRow as TechnicalAuditRow | null;

  return (
    <div className="flex flex-col gap-4">
      {/* Waarde vóór inspanning (bijlage A9): de onboarding vraagt alleen naam
          en website; de rest vragen we hier, nu de klant het onderzoek heeft
          zien draaien en weet waar het voor dient. */}
      <ProfileGaps profile={profile} />

      {staff && (
        <AssignBox
          profileId={id}
          currentUserId={profile.user_id}
          assignedAt={profile.assigned_at}
        />
      )}

      <TopicsPanel
        profileId={id}
        initial={(topicRows ?? []) as ProfileTopic[]}
      />

      <ProfileEditor initial={profile} inventoryCount={count ?? 0} />
      {audit ? (
        <AuditPanel
          checks={(audit.checks_json ?? []) as AuditCheck[]}
          checkedAt={audit.checked_at}
          siteUrl={audit.site_url}
        />
      ) : (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Technische controle</span>
          <p className="text-secondary">
            We controleren nog of AI-assistenten je site mogen lezen. De uitslag
            verschijnt hier zodra dat klaar is — je hoeft niets te doen.
          </p>
        </div>
      )}
      <FactRequests
        profileId={id}
        initial={(factRows ?? []) as FactRequest[]}
      />
      <EntitiesManager
        profileId={id}
        initial={(entityRows ?? []) as Entity[]}
      />
    </div>
  );
}
