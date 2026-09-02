import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InfoHint } from "@/components/info-hint";
import { ExternalLink } from "@/components/external-link";
import { AnalyticsFilters } from "@/components/analytics-filters";
import { AnalyticsRankingTable } from "@/components/analytics-ranking-table";
import { activeOnly } from "@/lib/archive";
import { buildBrandRankings, ownMentionCount } from "@/lib/pipeline/brand-rankings";
import {
  bepaalPeriodes,
  clustersVoorFilter,
  leesClusterfilter,
  leesLabelfilter,
  leesPeriodefilter,
  selecteerPerCluster,
} from "@/lib/analytics-filters";
import { sorteerLabels } from "@/lib/cluster-labels";
import type {
  ClusterLabel,
  CompetitorBreakdown,
  Entity,
  SourceLandscapeRow,
  VisibilityScore,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Concurrenten" };

/**
 * CONCURRENTEN: wie er nog meer in de antwoorden staat, over al je clusters heen.
 *
 * Verhuisde op 17 augustus 2026 van het merkdossier naar Analytics. De reden is
 * de vraag die het scherm beantwoordt: dit gaat niet over wie het merk ís maar
 * over hoe het zich verhoudt tot anderen, en dat is een cijfervraag.
 *
 * ⚠️ **DE NOEMER IS HIER AL EEN KEER MISGEGAAN.** De balk van "Jij" toonde het
 * percentage van de hoofdscore en de concurrenten dat van álle gemeten vragen,
 * en dan staat je eigen merk er kunstmatig boven. `lib/pipeline/brand-rankings.ts`
 * rekent iedereen over dezelfde noemer en is de enige plek waar dat gebeurt.
 * Bouw hier geen tweede telling.
 *
 * ⚠️ **Optellen over clusters mag alleen op de tellingen, niet op de
 * percentages.** Twee clusters met 40% over 10 vragen en 20% over 90 vragen
 * geven samen geen 30%. Daarom worden hier eerst de vermeldingen en de gestelde
 * vragen opgeteld, en pas dáárna gaat er één keer een percentage overheen.
 */
export default async function ConcurrentenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periode?: string; label?: string; cluster?: string }>;
}) {
  const { id } = await params;
  const { periode: periodeUitAdres, label: labelUitAdres, cluster: clusterUitAdres } = await searchParams;
  const profile = await getProfile(id);
  if (!profile) notFound();
  await requireUser();

  const supabase = await createClient();
  const [{ data: entityRows }, { data: analysisRows }, { data: labelRows }] = await Promise.all([
    supabase.from("entities").select("*").eq("profile_id", id).order("canonical_name"),
    activeOnly(supabase.from("analyses").select("id, name, label_id").eq("profile_id", id)),
    supabase.from("cluster_labels").select("*").eq("profile_id", id),
  ]);

  const clusters = (analysisRows ?? []) as { id: string; name: string; label_id: string | null }[];
  const labels = sorteerLabels((labelRows ?? []) as ClusterLabel[]);
  const clusterIds = clusters.map((c) => c.id);

  let scores: VisibilityScore[] = [];
  let breakdown: CompetitorBreakdown[] = [];
  let bronnen: SourceLandscapeRow[] = [];
  if (clusterIds.length > 0) {
    const [{ data: scoreRows }, { data: compRows }, { data: sourceRows }] = await Promise.all([
      supabase.from("visibility_scores").select("*").in("analysis_id", clusterIds),
      supabase.from("competitor_breakdown").select("*").in("analysis_id", clusterIds),
      supabase
        .from("source_landscape")
        .select("*")
        .in("analysis_id", clusterIds)
        .order("citations", { ascending: false }),
    ]);
    scores = (scoreRows ?? []) as VisibilityScore[];
    breakdown = (compRows ?? []) as CompetitorBreakdown[];
    bronnen = (sourceRows ?? []) as SourceLandscapeRow[];
  }

  // ── F2: de filterbalk ────────────────────────────────────────────────────
  const periodes = bepaalPeriodes(scores.map((s) => ({ analysis_id: s.analysis_id, computed_at: s.computed_at })));
  const periodefilter = leesPeriodefilter(periodeUitAdres, periodes);
  const labelfilter = leesLabelfilter(labelUitAdres, labels);
  const clustersBijLabel = clustersVoorFilter(clusters, labelfilter);
  const clusterfilter = leesClusterfilter(clusterUitAdres, clustersBijLabel);
  const zichtbareClusterIds = new Set(
    (clusterfilter === "alles" ? clustersBijLabel : clustersBijLabel.filter((c) => c.id === clusterfilter)).map(
      (c) => c.id,
    ),
  );

  // Per cluster één periode, bepaald door de filterbalk. Oudere periodes
  // optellen zou hetzelfde merk meerdere keren tellen en het beeld naar het
  // verleden trekken; `selecteerPerCluster` kiest daarom precies één rij per
  // cluster (`lib/analytics-filters.ts`).
  const scoresBinnenFilter = scores.filter((s) => zichtbareClusterIds.has(s.analysis_id));
  const actueleScores = selecteerPerCluster(scoresBinnenFilter, periodefilter);
  const weekPerCluster = new Map(actueleScores.map((s) => [s.analysis_id, s.week_no]));
  const actueleBreakdown = breakdown.filter(
    (c) => weekPerCluster.get(c.analysis_id) === c.week_no,
  );

  // ── Optellen op tellingen, nooit op percentages ─────────────────────────
  const eigenVermeldingen = actueleScores.reduce(
    (som, s) => som + ownMentionCount(s.score, s.winnable_runs ?? 0),
    0,
  );
  const winbaar = actueleScores.reduce((som, s) => som + (s.winnable_runs ?? 0), 0);
  const gemetenVragen = actueleScores.reduce((som, s) => som + (s.judged_runs ?? 0), 0);

  const perConcurrent = new Map<
    string,
    { mentionsCount: number; posSom: number; posGewicht: number; first: number; citaties: number | null }
  >();
  for (const c of actueleBreakdown) {
    const bestaand = perConcurrent.get(c.competitor_name) ?? {
      mentionsCount: 0,
      posSom: 0,
      posGewicht: 0,
      first: 0,
      citaties: null,
    };
    bestaand.mentionsCount += c.mentions_count;
    if (c.avg_position !== null) {
      bestaand.posSom += c.avg_position * c.mentions_count;
      bestaand.posGewicht += c.mentions_count;
    }
    bestaand.first += c.first_mention_count ?? 0;
    // `null` blijft `null`: dat betekent "nog niet berekend", niet "geen
    // citaties gevonden" (conventie 3, migratie 0058).
    if (c.citation_count !== null) {
      bestaand.citaties = (bestaand.citaties ?? 0) + c.citation_count;
    }
    perConcurrent.set(c.competitor_name, bestaand);
  }

  const rankings =
    gemetenVragen > 0
      ? buildBrandRankings({
          own: {
            name: "Jij",
            score: winbaar > 0 ? (eigenVermeldingen / winbaar) * 100 : 0,
            winnableRuns: winbaar,
            avgPosition: gewogen(actueleScores.map((s) => [s.avg_position, s.winnable_runs ?? 0])),
            firstMentionCount: actueleScores.reduce((s, x) => s + (x.first_mention_count ?? 0), 0),
            citationCount: actueleScores.reduce((s, x) => s + (x.citation_count ?? 0), 0),
          },
          competitors: [...perConcurrent.entries()].map(([name, v]) => ({
            name,
            mentionsCount: v.mentionsCount,
            avgPosition: v.posGewicht > 0 ? v.posSom / v.posGewicht : null,
            firstMentionCount: v.first,
            citationCount: v.citaties,
          })),
          measuredRunCount: gemetenVragen,
        })
      : null;

  const alleEntities = (entityRows ?? []) as Entity[];
  const meetellend = alleEntities.filter((e) => !e.dismissed && e.entity_role === "concurrent").length;
  const nietMeetellend = alleEntities.length - meetellend;
  const eigenPlaats =
    rankings && !rankings.fragmented ? rankings.rows.findIndex((r) => r.isOwnBrand) + 1 : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Concurrenten"
        description="Wie er nog meer genoemd wordt als je klanten een AI-assistent iets vragen."
      />

      <AnalyticsFilters
        periodes={periodes}
        labels={labels}
        clustersBijLabel={clustersBijLabel}
        periodefilter={periodefilter}
        labelfilter={labelfilter}
        clusterfilter={clusterfilter}
      />

      {/* ── 1. Ranglijst ───────────────────────────────────────────────────── */}
      {rankings === null || rankings.fragmented ? (
        <div className="card flex flex-col gap-1">
          <span className="mono-label">
            {rankings === null ? "Nog niet gemeten" : "Een versnipperde markt"}
          </span>
          <p className="text-secondary">
            {rankings === null
              ? "Zodra de eerste meetronde klaar is, staat hier wie er naast jou genoemd wordt."
              : "Geen enkele concurrent kwam vaker dan één keer voor. Er is in jouw markt dus geen partij die de AI standaard noemt, en dat is een kans in plaats van een probleem."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* ── C2: het hoofdcijfer is een plaats, geen tweede percentage
              naast Zichtbaarheid. De percentages blijven staan, maar dan in de
              tabel eronder, als vergelijkingsmaat tussen merken. */}
          <div className="card card-rail flex flex-col gap-1">
            <span className="mono-label">Jouw plaats</span>
            <span className="stat-value text-5xl">
              {eigenPlaats} van de {rankings.rows.length}
            </span>
            <span className="text-sm text-muted">
              {rankings.rows.length === 1 ? "1 merk" : `${rankings.rows.length} merken`} kwam terug in de{" "}
              {gemetenVragen} vragen die deze periode gesteld zijn.
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="mono-label flex items-center gap-1">
              Merken op een rij
              <InfoHint label="Hoe is dit geteld?">
                Elk merk op dezelfde manier: als percentage van de {gemetenVragen} vragen die deze
                periode over al je clusters gesteld zijn, ook de vragen waarin de AI niemand noemde.
                Dat is een strengere noemer dan het hoofdcijfer op Zichtbaarheid, en precies daarom
                de eerlijke manier om jezelf tussen je concurrenten te zetten.
              </InfoHint>
            </span>
            <AnalyticsRankingTable rows={rankings.rows} />
            {rankings.omitted > 0 && (
              <p className="text-sm text-muted">
                {rankings.omitted === 1
                  ? "Eén merk kwam maar één keer voor en staat er niet bij"
                  : `${rankings.omitted} merken kwamen maar één keer voor en staan er niet bij`}
                : één vermelding is toeval, geen patroon.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 2. Bronnenlandschap ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Bronnenlandschap</span>
        <p className="text-sm text-muted">
          De sites die een AI-assistent aanhaalt als hij over jouw onderwerpen praat. Sta je daar
          niet op, dan is dat een plek waar je kunt beginnen.
        </p>
        {bronnen.length === 0 ? (
          <div className="card flex flex-col gap-1">
            <span className="mono-label">Nog niet in kaart</span>
            <p className="text-secondary">
              ORBIT ENGINE brengt dit in kaart tijdens de meting. Zodra de eerste ronde klaar is,
              staat hier welke sites de AI aanhaalt.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {bronnen.slice(0, 15).map((b) => (
              <li
                key={b.id}
                className="card flex flex-wrap items-center justify-between gap-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="break-url block font-medium">{b.domain}</span>
                  <span className="mono-label">
                    {b.citations === 1 ? "1 keer aangehaald" : `${b.citations} keer aangehaald`}
                  </span>
                </span>
                {/* Conventie 3: nog niet gecontroleerd is iets anders dan
                    "je staat er niet op". */}
                {b.own_present === null ? (
                  <span className="chip chip-neutral">nog niet gecontroleerd</span>
                ) : b.own_present ? (
                  <span className="chip chip-success">
                    {b.own_url ? (
                      <ExternalLink href={b.own_url}>je staat erop</ExternalLink>
                    ) : (
                      "je staat erop"
                    )}
                  </span>
                ) : (
                  <span className="chip chip-warning">je staat er niet op</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 3. Voetnoot over de noemer (plan C1) ─────────────────────────────
          Het indelen zelf is beheerwerk en geen analyse: dat verhuisde naar
          een stafscherm onder Admin. Hier blijft alleen de uitleg staan die
          het percentage hierboven verklaart. */}
      {alleEntities.length > 0 && (
        <p className="type-caption text-muted">
          {meetellend === 1 ? "1 merk telt" : `${meetellend} merken tellen`} mee in je aandeel,{" "}
          {nietMeetellend === 1 ? "1 merk is" : `${nietMeetellend} zijn`} ingedeeld als marktplaats,
          vakblad, leverancier of niet relevant.
        </p>
      )}
    </div>
  );
}

/** Gewogen gemiddelde van waarde-gewichtparen. `null` als er niets te wegen valt. */
function gewogen(paren: [number | null, number][]): number | null {
  let som = 0;
  let gewicht = 0;
  for (const [waarde, w] of paren) {
    if (waarde === null || w <= 0) continue;
    som += waarde * w;
    gewicht += w;
  }
  return gewicht > 0 ? som / gewicht : null;
}
