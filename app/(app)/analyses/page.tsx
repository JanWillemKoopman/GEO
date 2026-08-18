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
import { LastUpdated } from "@/components/last-updated";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn clusters" };

export default async function AnalysesPage({
  searchParams,
}: {
  searchParams: Promise<{ merk?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  // De merk-werkruimte (besluit 1). `?merk=` filtert deze lijst tot één merk;
  // de zijbalk zet die parameter erop. Bewust een querystring en niet de cookie:
  // "alle analyses" en "analyses van dit merk" zijn twee bestemmingen die naast
  // elkaar in de zijbalk staan, en dan moet je aan de link kunnen zien welke je
  // krijgt. De cookie bepaalt alleen wélk merk de zijbalk aanbiedt.
  const { merk } = await searchParams;

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

  // Filteren gebeurt ná het laden en niet in de query: `loadDashboard` berekent
  // ook de cijfers over analyses heen, en die horen bij het merk dat je aankijkt.
  // Een merk-id dat niets oplevert leidt tot een lege lijst met uitleg, niet tot
  // een foutmelding: dat overkomt iemand die een merk archiveert en een oude
  // link nog open heeft staan.
  const alleAnalyses = [...dashboard.analyses];
  const analyses = merk
    ? alleAnalyses.filter((a) => a.profile_id === merk)
    : alleAnalyses;

  // "Wacht op jouw goedkeuring" bovenaan (abcplan.md §3.4). Sinds E ("centrale
  // foutmeldingenplek") telt ook `whoseTurn === "jij"` mee, niet alleen
  // `actionRequired`: een mislukte analyse wacht net zo goed op de klant (een
  // nieuwe poging, of contact), maar stond voorheen ergens middenin de lijst,
  // even onopvallend als een analyse die gewoon nog loopt. Wie drie analyses
  // heeft en er één mislukt, moet dat kunnen zien zonder alle drie te openen.
  analyses.sort((a, b) => {
    const aAction = STATUS_META[a.status].whoseTurn === "jij" ? 1 : 0;
    const bAction = STATUS_META[b.status].whoseTurn === "jij" ? 1 : 0;
    return bAction - aAction;
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={merk ? "Eén merk" : "ORBIT ENGINE · altijd aan"}
        title={merk ? "Mijn clusters" : "Alle clusters"}
        description={
          merk
            ? `${analyses.length} van je ${alleAnalyses.length} clusters horen bij dit merk.`
            : undefined
        }
        action={
          hasProfile ? (
            <Link href="/analyses/new" className="btn-primary">
              + Nieuw cluster
            </Link>
          ) : null
        }
      />

      {/* "Waar begin je" stond hier tot 14 augustus 2026. Het bleek geen
          samenvatting over deze lijst maar per cluster andere content, dus
          staat het nu bij het cluster zelf (hoofdstuk 03, "Wat je nu moet
          doen"), inclusief de potentie per aanbeveling. Zie docs/logbook.md. */}

      {/* E, "centrale foutmeldingenplek": vroeger stond een mislukt cluster
          alleen op de eigen pagina, dus wie niet net dáár keek zag hem niet.
          Bij meer dan één cluster is dit overzicht de plek waar de klant komt
          kijken "moet ik iets", dus hier hoort een storing meteen te staan. */}
      {(() => {
        const failed = analyses.filter((a) => a.status === "mislukt");
        if (failed.length === 0) return null;
        return (
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
        );
      })()}

      {analyses.length > 0 && (
        <DashboardStats stats={dashboard.stats} biggestChange={dashboard.biggestChange} />
      )}

      {/* Zichtbaar maken dát er gefilterd is, en hoe je eruit komt. Een lijst
          die stilletjes korter is dan je verwacht leest als data die weg is. */}
      {merk && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="chip">Alleen dit merk</span>
          <Link href="/analyses" className="text-sm text-secondary hover:underline">
            Toon alle {alleAnalyses.length} clusters
          </Link>
        </div>
      )}

      {analyses.length > 1 && <span className="mono-label">Mijn clusters</span>}

      {analyses.length === 0 ? (
        <EmptyState
          title={
            merk
              ? "Nog geen clusters voor dit merk"
              : hasProfile
                ? "Nog geen clusters"
                : "Welkom bij ORBIT ENGINE"
          }
          action={
            hasProfile
              ? { href: "/analyses/new", label: "Start je eerste cluster" }
              : { href: "/merk/nieuw", label: "Merk toevoegen" }
          }
        >
          {hasProfile
            ? "Kies een merk en het product of onderwerp dat je wilt meten. ORBIT ENGINE stelt de vragen die jouw klanten aan een AI stellen, en telt hoe vaak jij in het antwoord staat."
            : "Begin met je merk. ORBIT ENGINE onderzoekt het één keer grondig. Daarna meet je er onbeperkt onderwerpen op. Twee velden, verder niets."}
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
