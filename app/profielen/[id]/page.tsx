import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "./profile-progress";
import { ProfileEditor } from "./profile-editor";
import { EntitiesManager } from "./entities-manager";
import { AuditPanel } from "@/components/audit-panel";
import { FactRequests } from "./fact-requests";
import type { AuditCheck } from "@/lib/audit/technical";
import type { Entity, FactRequest, TechnicalAudit as TechnicalAuditRow } from "@/lib/types/database";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  const supabase = await createClient();
  const [{ count }, { data: entityRows }, { data: auditRow }, { data: factRows }] = await Promise.all([
    supabase.from("profile_pages").select("id", { count: "exact", head: true }).eq("profile_id", id),
    // Concurrenten horen bij het PROFIEL, niet bij één analyse (optimalisatie.md
    // 2.4/2.7): dezelfde concurrent duikt op bij meerdere onderwerpen van
    // hetzelfde merk, en die moet dan één rij zijn.
    supabase.from("entities").select("*").eq("profile_id", id).order("canonical_name"),
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
  ]);

  const audit = auditRow as TechnicalAuditRow | null;

  return (
    <div className="flex flex-col gap-4">
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
            We controleren nog of AI-assistenten je site mogen lezen. De uitslag verschijnt hier
            zodra dat klaar is — je hoeft niets te doen.
          </p>
        </div>
      )}
      <FactRequests profileId={id} initial={(factRows ?? []) as FactRequest[]} />
      <EntitiesManager profileId={id} initial={(entityRows ?? []) as Entity[]} />
    </div>
  );
}
