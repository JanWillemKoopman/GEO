import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AuditPanel } from "@/components/audit-panel";
import {
  parseContextFactors,
  technicalAdviceStale,
  staleAdviceNotice,
} from "@/lib/pipeline/context-factors";
import type { AuditCheck } from "@/lib/audit/technical";
import type { TechnicalAudit as TechnicalAuditRow } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return {
    title: profile ? `Techniek · ${profile.brand_name ?? profile.name}` : "Techniek",
  };
}

/**
 * De technische controle (optimalisatie.md 3B): of AI-assistenten je site
 * mogen lezen, en of je gegevens overal hetzelfde zijn. Sinds de
 * herstructurering van augustus 2026 een eigen subpagina: gereedschap om bij
 * te pakken als je iets moet nakijken, niet iets dat op het dossier meeleest.
 */
export default async function TechniekPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  const supabase = await createClient();
  const [{ data: auditRow }, { data: strategyRow }] = await Promise.all([
    supabase
      .from("technical_audits")
      .select("*")
      .eq("profile_id", id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profile_strategy")
      .select("context_factors")
      .eq("profile_id", id)
      .maybeSingle(),
  ]);

  const audit = auditRow as TechnicalAuditRow | null;
  const factors = parseContextFactors(
    (strategyRow as { context_factors?: unknown } | null)?.context_factors,
  );
  const staleFactor = technicalAdviceStale(factors);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkdossier"
        title="Techniek"
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
        description="Of AI-assistenten je site mogen lezen, en of je gegevens overal hetzelfde zijn."
      />

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
          <span className="mono-label">Technische controle · loopt</span>
          <p className="text-secondary">
            Aura controleert nog of AI-assistenten je site mogen lezen. De uitslag staat hier
            zodra dat klaar is. Jij hoeft niets te doen.
          </p>
        </div>
      )}
    </div>
  );
}
