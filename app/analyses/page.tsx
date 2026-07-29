import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { ActionList, DashboardStats } from "@/components/action-list";
import { STATUS_META } from "@/lib/analysis-status";
import { loadDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AnalysesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Eén overzicht over alle analyses heen (optimalisatie.md bijlage A10).
  // Alles was per analyse: wie er drie had, moest negen schermen af om te weten
  // of er iets te doen was — en deed het dus niet.
  //
  // Lezen loopt rechtstreeks via RLS (SELECT-only, gefilterd op user_id); de
  // expliciete user-filter in loadDashboard is een tweede slot op dezelfde deur.
  const dashboard = await loadDashboard(supabase, user.id);
  const analyses = [...dashboard.analyses];

  // "Wacht op jouw goedkeuring" bovenaan (abcplan.md §3.4).
  analyses.sort((a, b) => {
    const aAction = STATUS_META[a.status].actionRequired ? 1 : 0;
    const bAction = STATUS_META[b.status].actionRequired ? 1 : 0;
    return bAction - aAction;
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mono-label">Mijn analyses</span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Overzicht</h1>
        </div>
        <Link href="/analyses/new" className="btn-primary">
          + Nieuwe analyse starten
        </Link>
      </div>

      {analyses.length > 0 && (
        <div className="flex flex-col gap-4">
          <ActionList work={dashboard.work} stats={dashboard.stats} />
          <DashboardStats stats={dashboard.stats} biggestChange={dashboard.biggestChange} />
        </div>
      )}

      {analyses.length > 1 && <span className="mono-label">Je analyses</span>}

      {analyses.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <span className="live-dot" />
          <h2 className="text-xl font-semibold">Nog geen analyses</h2>
          <p className="max-w-md text-secondary">
            Vul een website in (en optioneel een specifiek product of onderwerp) en zie hoe
            zichtbaar dat merk is in ChatGPT en andere AI-assistenten.
          </p>
          <Link href="/analyses/new" className="btn-primary mt-2">
            Start je eerste analyse
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {analyses.map((a) => (
            <li key={a.id}>
              <Link
                href={`/analyses/${a.id}`}
                className="card card-interactive flex flex-wrap items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{a.name}</p>
                  <p className="mono-label mt-1">Bijgewerkt {formatDate(a.updated_at)}</p>
                </div>
                <StatusBadge status={a.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
