import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { AnalysisCardMetrics } from "@/components/analysis-card-metrics";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { STATUS_META } from "@/lib/analysis-status";
import { loadDashboard } from "@/lib/dashboard";
import { LastUpdated } from "@/components/last-updated";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clusters" };

/**
 * CLUSTERS van één merk.
 *
 * Sinds 17 augustus 2026 hoort deze lijst bij het merk en niet bij de app als
 * geheel: `/analyses?merk=x` filterde een globale lijst, en dat leest als data
 * die weg is zodra de lijst korter blijkt dan verwacht. Nu is het merk de
 * context van het adres zelf.
 *
 * ⚠️ Het clusterdossier blijft op `/analyses/[id]` staan. Dat is de ene bewuste
 * uitzondering op besluit 8: een cluster is een globaal object met tien diepe
 * routes eronder (bibliotheek, concept, briefing, antwoorden, rapport,
 * instellingen, contentdetail), en die allemaal verplaatsen raakt de meest
 * gelinkte routes van de app voor alleen cosmetiek.
 *
 * Fase 3 van `docs/tasks/appstructuur.md` zet hier het derde blok onder:
 * Voorgestelde clusters, nu nog op `/analyses/aanbevolen`.
 */
export default async function ClustersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  const supabase = await createClient();
  const dashboard = await loadDashboard(supabase, user.id);

  const analyses = dashboard.analyses.filter((a) => a.profile_id === id);

  // "Wacht op jouw goedkeuring" bovenaan (abcplan.md §3.4). Sinds E ("centrale
  // foutmeldingenplek") telt ook `whoseTurn === "jij"` mee, niet alleen
  // `actionRequired`: een mislukt cluster wacht net zo goed op de klant, maar
  // stond voorheen ergens middenin de lijst, even onopvallend als een cluster
  // dat gewoon nog loopt.
  analyses.sort((a, b) => {
    const aAction = STATUS_META[a.status].whoseTurn === "jij" ? 1 : 0;
    const bAction = STATUS_META[b.status].whoseTurn === "jij" ? 1 : 0;
    return bAction - aAction;
  });

  const failed = analyses.filter((a) => a.status === "mislukt");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Strategie"
        title="Clusters"
        backHref={`/merk/${id}`}
        backLabel="Overzicht"
        description="Elk cluster is één onderwerp waarop ORBIT ENGINE je zichtbaarheid volgt."
        action={
          <Link href="/analyses/new" className="btn-primary">
            + Nieuw cluster
          </Link>
        }
      />

      {/* ── 1. Storingen ───────────────────────────────────────────────────
          Vroeger stond een mislukt cluster alleen op de eigen pagina, dus wie
          niet net dáár keek zag hem niet. Deze lijst is de plek waar de klant
          komt kijken "moet ik iets", dus hier hoort een storing meteen te staan. */}
      {failed.length > 0 && (
        <div className="card card-danger flex flex-col gap-2">
          <span className="chip chip-danger w-fit">
            {failed.length === 1 ? "1 cluster niet gelukt" : `${failed.length} clusters niet gelukt`}
          </span>
          <ul className="flex flex-col gap-1">
            {failed.map((a) => (
              <li key={a.id}>
                <Link href={`/analyses/${a.id}`} className="text-sm underline">
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 2. Mijn clusters ───────────────────────────────────────────────── */}
      {analyses.length === 0 ? (
        <EmptyState
          title="Nog geen clusters voor dit merk"
          action={{ href: "/analyses/new", label: "Start je eerste cluster" }}
        >
          Kies het product of onderwerp dat je wilt meten. ORBIT ENGINE stelt de vragen die jouw
          klanten aan een AI stellen, en telt hoe vaak jij in het antwoord staat.
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
                    <LastUpdated at={a.updated_at} className="mono-label mt-1 block" />
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
