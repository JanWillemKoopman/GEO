import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { DashboardStats } from "@/components/dashboard-stats";
import { AnalysisCardMetrics } from "@/components/analysis-card-metrics";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { activeOnly } from "@/lib/archive";
import { STATUS_META } from "@/lib/analysis-status";
import { loadDashboard } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn analyses" };

export default async function AnalysesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Eén overzicht over alle analyses heen (optimalisatie.md bijlage A10).
  // Alles was per analyse: wie er drie had, moest negen schermen af om te weten
  // of er iets te doen was, en deed het dus niet.
  //
  // Lezen loopt rechtstreeks via RLS (SELECT-only, gefilterd op user_id); de
  // expliciete user-filter in loadDashboard is een tweede slot op dezelfde deur.
  // Bestaat er al een merk? Zonder merk is "start een analyse" een belofte die
  // de app niet kan nakomen: die knop leidde naar een pagina die zei dat je
  // eerst een klantprofiel nodig had. Drie schermen en twee knoppen voordat de
  // eerste échte stap begon. Precies de fout die de onboarding zelf zo
  // zorgvuldig vermijdt.
  const [dashboard, { count: profileCount }] = await Promise.all([
    loadDashboard(supabase, user.id),
    activeOnly(supabase.from("profiles").select("id", { count: "exact", head: true })),
  ]);
  const hasProfile = (profileCount ?? 0) > 0;
  const analyses = [...dashboard.analyses];

  // "Wacht op jouw goedkeuring" bovenaan (abcplan.md §3.4).
  analyses.sort((a, b) => {
    const aAction = STATUS_META[a.status].actionRequired ? 1 : 0;
    const bAction = STATUS_META[b.status].actionRequired ? 1 : 0;
    return bAction - aAction;
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Aura · altijd aan"
        title="Analyses"
        action={
          hasProfile ? (
            <Link href="/analyses/new" className="btn-primary">
              + Nieuwe analyse
            </Link>
          ) : null
        }
      />

      {analyses.length > 0 && (
        <DashboardStats stats={dashboard.stats} biggestChange={dashboard.biggestChange} />
      )}

      {analyses.length > 1 && <span className="mono-label">Je analyses</span>}

      {analyses.length === 0 ? (
        <EmptyState
          title={hasProfile ? "Nog geen analyses" : "Welkom bij Aura"}
          action={
            hasProfile
              ? { href: "/analyses/new", label: "Start je eerste analyse" }
              : { href: "/profielen/nieuw", label: "Merk toevoegen" }
          }
        >
          {hasProfile
            ? "Kies een merk en het product of onderwerp dat je wilt meten. Aura stelt de vragen die jouw klanten aan een AI stellen, en telt hoe vaak jij in het antwoord staat."
            : "Begin met je merk. Aura onderzoekt het één keer grondig. Daarna meet je er onbeperkt onderwerpen op. Twee velden, verder niets."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {analyses.map((a) => (
            <li key={a.id}>
              <Link
                href={`/analyses/${a.id}`}
                className="card card-interactive flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{a.name}</p>
                    <p className="mono-label mt-1">Bijgewerkt {formatRelativeTime(a.updated_at)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <AnalysisCardMetrics metrics={dashboard.cardMetrics[a.id]} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
