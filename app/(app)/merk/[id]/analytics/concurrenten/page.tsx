import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InfoHint } from "@/components/info-hint";
import { ExternalLink } from "@/components/external-link";
import { EntitiesManager } from "../../_components/entities-manager";
import { activeOnly } from "@/lib/archive";
import { buildBrandRankings, ownMentionCount } from "@/lib/pipeline/brand-rankings";
import type {
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();
  await requireUser();

  const supabase = await createClient();
  const [{ data: entityRows }, { data: analysisRows }] = await Promise.all([
    supabase.from("entities").select("*").eq("profile_id", id).order("canonical_name"),
    activeOnly(supabase.from("analyses").select("id, name").eq("profile_id", id)),
  ]);

  const clusters = (analysisRows ?? []) as { id: string; name: string }[];
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

  // Per cluster de laatste periode. Oudere periodes optellen zou hetzelfde merk
  // meerdere keren tellen en het beeld naar het verleden trekken.
  const laatstePerCluster = new Map<string, number>();
  for (const s of scores) {
    const huidig = laatstePerCluster.get(s.analysis_id);
    if (huidig === undefined || s.week_no > huidig) laatstePerCluster.set(s.analysis_id, s.week_no);
  }
  const actueleScores = scores.filter((s) => laatstePerCluster.get(s.analysis_id) === s.week_no);
  const actueleBreakdown = breakdown.filter(
    (c) => laatstePerCluster.get(c.analysis_id) === c.week_no,
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Concurrenten"
        backHref={`/merk/${id}/analytics`}
        backLabel="Zichtbaarheid in AI"
        description="Wie er nog meer genoemd wordt als je klanten een AI-assistent iets vragen."
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
        <div className="card flex flex-col gap-3">
          <span className="mono-label flex items-center gap-1">
            Merken op een rij
            <InfoHint label="Hoe is dit geteld?">
              Elk merk op dezelfde manier: als percentage van de {gemetenVragen} vragen die deze
              periode over al je clusters gesteld zijn, ook de vragen waarin de AI niemand noemde.
              Dat is een strengere noemer dan het hoofdcijfer op Zichtbaarheid, en precies daarom
              de eerlijke manier om jezelf tussen je concurrenten te zetten.
            </InfoHint>
          </span>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-1 pr-4 font-normal">Merk</th>
                  <th className="py-1 pr-4 font-normal">Genoemd</th>
                  <th className="py-1 pr-4 font-normal">Positie</th>
                  <th className="py-1 pr-4 font-normal">Als eerste</th>
                  <th className="py-1 font-normal">Bron</th>
                </tr>
              </thead>
              <tbody>
                {rankings.rows.map((r) => (
                  <tr
                    key={r.name}
                    className="border-t border-[var(--border-subtle)]"
                    style={r.isOwnBrand ? { background: "var(--bg-elevated)" } : undefined}
                  >
                    <td className="py-1.5 pr-4 font-medium">{r.name}</td>
                    <td className="py-1.5 pr-4">
                      <span className="stat-value">{pct(r.mentionRate)}</span>
                      <span className="text-muted"> ({r.mentions})</span>
                    </td>
                    <td className="py-1.5 pr-4 stat-value">
                      {r.avgPosition === null ? "-" : r.avgPosition.toFixed(1)}
                    </td>
                    <td className="py-1.5 pr-4 stat-value">{pct(r.recommendationRate)}</td>
                    <td className="py-1.5 stat-value">{pct(r.citationRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rankings.omitted > 0 && (
            <p className="text-sm text-muted">
              {rankings.omitted === 1
                ? "Eén merk kwam maar één keer voor en staat er niet bij"
                : `${rankings.omitted} merken kwamen maar één keer voor en staan er niet bij`}
              : één vermelding is toeval, geen patroon.
            </p>
          )}
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

      {/* ── 3. Entiteitenbeheer ────────────────────────────────────────────
          Verhuisd van het merkdossier: dit bepaalt de noemer van je aandeel
          hierboven, dus het hoort op hetzelfde scherm als dat aandeel. */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Welke merken tellen mee</span>
        <p className="text-sm text-muted">
          Elk merk dat een AI-assistent noemt, deelt ORBIT ENGINE automatisch in. Alleen echte
          concurrenten tellen mee in je aandeel; een marktplaats of brancheorganisatie niet.
        </p>
        <EntitiesManager profileId={id} initial={(entityRows ?? []) as Entity[]} />
      </div>
    </div>
  );
}

function pct(waarde: number | null): string {
  return waarde === null ? "-" : `${waarde}%`;
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
