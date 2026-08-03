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
import { LlmKnowledgePanel } from "./llm-knowledge-panel";
import { StrategyBox } from "./strategy-box";
import { ResearchStepsStrip } from "./research-steps-strip";
import { OfferingsPanel } from "./offerings-panel";
import { ConfidenceChip } from "@/components/confidence-chip";
import {
  parseContextFactors,
  technicalAdviceStale,
  staleAdviceNotice,
} from "@/lib/pipeline/context-factors";
import type { AuditCheck } from "@/lib/audit/technical";
import type {
  Entity,
  FactRequest,
  ProfileLlmBaseline,
  ProfileOffering,
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
    { data: baselineRows },
    { data: strategyRow },
    { data: offeringRows },
    { data: offeringFacetRow },
    { data: synthesisRow },
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
    // Wat AI-assistenten al over dit merk weten (blok B fase 3).
    supabase
      .from("profile_llm_baseline")
      .select("*")
      .eq("profile_id", id)
      .order("measured_at"),
    // Wat er uit het gesprek kwam (blok C).
    supabase
      .from("profile_strategy")
      .select("*")
      .eq("profile_id", id)
      .maybeSingle(),
    // De aanbodboom uit fase 1 — met bron per knoop, zodat een verkeerde dienst
    // te corrigeren is zonder handmatig uit te zoeken waar hij vandaan kwam.
    supabase
      .from("profile_offerings")
      .select("*")
      .eq("profile_id", id)
      .order("sort_order"),
    // De zekerheid van de aanbodboom: het aandeel knopen dat een geldige bron
    // overleefde (fase 1). Onder de drempel hoort daar een markering bij.
    supabase
      .from("profile_facets")
      .select("confidence")
      .eq("profile_id", id)
      .eq("facet", "aanbod")
      .maybeSingle(),
    // De synthese (fase 5): het dossier in gewone taal plus de gespreksagenda.
    supabase
      .from("profile_facets")
      .select("summary, raw_json, confidence")
      .eq("profile_id", id)
      .eq("facet", "synthese")
      .maybeSingle(),
  ]);

  const audit = auditRow as TechnicalAuditRow | null;

  // Een aanstaande sitemigratie maakt het technische advies tijdelijk
  // waardeloos: die bevindingen gaan over pagina's die straks niet bestaan.
  // Dat hoort bóven de audit te staan, niet als notitie ergens anders.
  const factors = parseContextFactors(
    (strategyRow as { context_factors?: unknown } | null)?.context_factors,
  );
  const staleFactor = technicalAdviceStale(factors);
  const offeringConfidence =
    (offeringFacetRow as { confidence?: number | null } | null)?.confidence ??
    null;

  const dossier =
    (synthesisRow as { summary?: string | null } | null)?.summary ?? null;
  const dossierConfidence =
    (synthesisRow as { confidence?: number | null } | null)?.confidence ?? null;
  const researchGaps = (
    ((synthesisRow as { raw_json?: { gaps?: unknown } } | null)?.raw_json
      ?.gaps ?? []) as unknown[]
  ).filter((g): g is string => typeof g === "string" && g.trim().length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Het profiel gaat op 'klaar' na stap 2 van 6; deze strip laat zien wat
          er nog binnenkomt en verdwijnt zodra alles er is. */}
      <ResearchStepsStrip profileId={id} />

      {/* Waarde vóór inspanning (bijlage A9): de onboarding vraagt alleen naam
          en website; de rest vragen we hier, nu de klant het onderzoek heeft
          zien draaien en weet waar het voor dient. */}
      {dossier && (
        <div className="card flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-label">Het dossier</span>
            <ConfidenceChip confidence={dossierConfidence} />
          </div>
          <p className="text-secondary">{dossier}</p>
        </div>
      )}

      <ProfileGaps profile={profile} researchGaps={researchGaps} />

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
      {staleFactor && (
        <p className="card text-sm text-[var(--status-warning)]" role="status">
          {staleAdviceNotice(staleFactor)}
        </p>
      )}
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
