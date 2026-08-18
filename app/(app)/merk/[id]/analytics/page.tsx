import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
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
export const metadata = { title: "Zichtbaarheid in AI" };

/**
 * ZICHTBAARHEID IN AI, over alle clusters van dit merk heen.
 *
 * ── WAAROM DE TECHNISCHE DIAGNOSE HIER STAAT EN NIET BIJ INSTELLINGEN ───────
 *
 * Besluit 7 van 17 augustus 2026. De audit stond op `/profielen/[id]/techniek`,
 * als gereedschap. Maar een klant die zich afvraagt waarom zijn score laag is
 * kijkt niet in Instellingen: hij kijkt naar het cijfer. Een dichte robots.txt
 * is de meest voorkomende verklaring van een lage score, dus hoort de diagnose
 * naast dat cijfer te staan.
 *
 * Fase 4 van `docs/tasks/appstructuur.md` zet de blokken 1 tot en met 4 hierboven
 * neer: de blokkade, de score met foutmarge, de trendlijn en de tabel per
 * cluster. De technische diagnose is blok 5 en staat er nu al, omdat het oude
 * adres er permanent naartoe verwijst.
 */
export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

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
        eyebrow="Analytics"
        title="Zichtbaarheid in AI"
        backHref={`/merk/${id}`}
        backLabel="Overzicht"
        description="Hoe vaak AI-assistenten je noemen, en wat dat cijfer verklaart."
      />

      {staleFactor && (
        <p className="card text-sm text-[var(--status-warning)]" role="status">
          {staleAdviceNotice(staleFactor)}
        </p>
      )}

      {/* ── 5. Technische diagnose (besluit 7) ─────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Technische diagnose</span>
        <p className="text-sm text-muted">
          Of AI-assistenten je site mogen lezen, en of je gegevens overal hetzelfde zijn. Staat
          je site dicht, dan is dat de verklaring van een lage score.
        </p>
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
              ORBIT ENGINE controleert nog of AI-assistenten je site mogen lezen. De uitslag staat
              hier zodra dat klaar is. Jij hoeft niets te doen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
