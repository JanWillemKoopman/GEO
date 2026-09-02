import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AuditPanel } from "@/components/audit-panel";
import { InfoHint } from "@/components/info-hint";
import { AnalyticsFilters } from "@/components/analytics-filters";
import { AnalyticsTable, type AnalyticsColumn } from "@/components/analytics-table";
import { activeOnly } from "@/lib/archive";
import { confidenceBand, changeIsMeaningful } from "@/lib/stats/uncertainty";
import {
  bepaalPeriodes,
  clustersVoorFilter,
  leesClusterfilter,
  leesLabelfilter,
  leesPeriodefilter,
  PERIODEFILTER_ACTUEEL,
} from "@/lib/analytics-filters";
import { sorteerLabels } from "@/lib/cluster-labels";
import {
  parseContextFactors,
  technicalAdviceStale,
  staleAdviceNotice,
} from "@/lib/pipeline/context-factors";
import type { AuditCheck } from "@/lib/audit/technical";
import type {
  ClusterLabel,
  TechnicalAudit as TechnicalAuditRow,
  VisibilityScore,
} from "@/lib/types/database";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zichtbaarheid in AI" };

/**
 * ZICHTBAARHEID IN AI, over alle clusters van dit merk heen.
 *
 * ── WAAROM DE TECHNISCHE DIAGNOSE ONDERAAN DIT SCHERM STAAT ─────────────────
 *
 * Besluit 7 van 17 augustus 2026. De audit stond op `/profielen/[id]/techniek`,
 * als gereedschap. Maar een klant die zich afvraagt waarom zijn score laag is
 * kijkt niet in Instellingen: hij kijkt naar het cijfer. Een dichte robots.txt
 * is de meest voorkomende verklaring van een lage score, dus hoort de diagnose
 * naast dat cijfer te staan.
 *
 * Een blokkade staat daarom bovenáán en niet onderaan: die verklaart het cijfer
 * dat eronder staat, en dat moet je lezen vóór het cijfer en niet erna.
 *
 * ⚠️ **De score wordt hier niet opnieuw berekend.** Hij komt uit dezelfde
 * `visibility_scores`-rijen als hoofdstuk 01 van het clusterdossier, met
 * dezelfde `confidenceBand()` eromheen. Twee schermen die hetzelfde getal
 * anders berekenen is precies de fout die `lib/dashboard.ts` ooit oploste.
 */
export default async function AnalyticsPage({
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
  const [{ data: auditRow }, { data: strategyRow }, { data: analysisRows }, { data: labelRows }] =
    await Promise.all([
      // Kolommen bij naam: `technical_audits.raw_json` is de ruwe uitvoer van de
      // audit en hoort op Admin (besluit 4). Met een `*` reist hij mee naar de
      // browser, ook al toont dit scherm alleen de nette checklijst.
      supabase
        .from("technical_audits")
        .select("checks_json, checked_at, site_url, blockers")
        .eq("profile_id", id)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("profile_strategy")
        .select("context_factors")
        .eq("profile_id", id)
        .maybeSingle(),
      activeOnly(supabase.from("analyses").select("id, name, label_id").eq("profile_id", id)),
      supabase.from("cluster_labels").select("*").eq("profile_id", id),
    ]);

  const clusters = (analysisRows ?? []) as { id: string; name: string; label_id: string | null }[];
  const labels = sorteerLabels((labelRows ?? []) as ClusterLabel[]);

  let scores: VisibilityScore[] = [];
  if (clusters.length > 0) {
    const { data: scoreRows } = await supabase
      .from("visibility_scores")
      .select("*")
      .in(
        "analysis_id",
        clusters.map((c) => c.id),
      )
      .order("week_no");
    scores = (scoreRows ?? []) as VisibilityScore[];
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

  // Per cluster de reeks op periodevolgorde, en daaruit de stand die bij de
  // gekozen periode hoort: bij "actueel" de laatste meting, anders de laatste
  // op of vóór die datum (`lib/analytics-filters.ts`).
  const perCluster = clusters
    .filter((c) => zichtbareClusterIds.has(c.id))
    .map((c) => {
      const reeks = scores
        .filter((s) => s.analysis_id === c.id)
        .sort((a, b) => a.week_no - b.week_no);
      const totAanPeriode =
        periodefilter === PERIODEFILTER_ACTUEEL
          ? reeks
          : reeks.filter((s) => s.computed_at !== null && s.computed_at.slice(0, 10) <= periodefilter);
      const laatste = totAanPeriode[totAanPeriode.length - 1] ?? null;
      const vorige = totAanPeriode[totAanPeriode.length - 2] ?? null;
      return { cluster: c, reeks: totAanPeriode, laatste, vorige };
    })
    .filter((r) => r.laatste !== null)
    .sort((a, b) => leidend(b.laatste!) - leidend(a.laatste!));

  // ── Het merkcijfer: gewogen op het aantal metingen per cluster ───────────
  //
  // Niet het rekenkundige gemiddelde van de clusterscores. Een cluster met 5
  // metingen zou dan even zwaar tellen als een met 90, en dan verspringt het
  // merkcijfer zodra iemand een klein cluster start.
  const laatsten = perCluster.map((r) => r.laatste!);
  const merkScore = gewogenGemiddelde(laatsten);
  const band = merkScore !== null ? confidenceBand(merkScore.waarde, merkScore.stderr) : null;

  const audit = auditRow as TechnicalAuditRow | null;
  const checks = (audit?.checks_json ?? []) as AuditCheck[];
  const blokkades = checks.filter((c) => c.severity === "blocker");
  const factors = parseContextFactors(
    (strategyRow as { context_factors?: unknown } | null)?.context_factors,
  );
  const staleFactor = technicalAdviceStale(factors);
  const labelNaamPerId = new Map(labels.map((l) => [l.id, l.name]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Zichtbaarheid in AI"
        description="Hoe vaak AI-assistenten je noemen, over al je clusters heen, en wat dat cijfer verklaart."
      />

      <AnalyticsFilters
        periodes={periodes}
        labels={labels}
        clustersBijLabel={clustersBijLabel}
        periodefilter={periodefilter}
        labelfilter={labelfilter}
        clusterfilter={clusterfilter}
      />

      {/* ── 1. Blokkade, alleen als die er is ───────────────────────────────
          Bovenaan, want dit verklaart het cijfer eronder. Onderaan zetten
          betekent dat de klant eerst zijn score leest en pas daarna waarom hij
          niet kan kloppen. */}
      {blokkades.length > 0 && (
        <div className="card card-danger flex flex-col gap-2">
          <span className="chip chip-danger w-fit">
            {blokkades.length === 1
              ? "AI-assistenten mogen je site niet lezen"
              : `${blokkades.length} blokkades op je site`}
          </span>
          <p className="text-secondary">
            Zolang dit zo staat, kan een AI-assistent je pagina&apos;s niet ophalen. Je score
            hieronder is daardoor lager dan hij zou zijn, en nieuwe content verandert daar niets
            aan.
          </p>
          <ul className="flex flex-col gap-1">
            {blokkades.map((b) => (
              <li key={b.id} className="text-sm">
                <span className="font-medium">{b.label}</span>
                {b.fix && <span className="text-secondary">: {b.fix}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 2. De score ─────────────────────────────────────────────────────
          Eén hoofdgetal (`docs/ux-design.md` §1), met de onzekerheidsmarge
          zichtbaar en niet alleen in een comment. */}
      {merkScore === null ? (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Nog niet gemeten</span>
          <p className="text-secondary">
            Zodra de eerste meetronde klaar is, staat je zichtbaarheid hier.{" "}
            <Link href={`/merk/${id}/strategie/clusters`} className="underline">
              Start een cluster
            </Link>{" "}
            om te laten meten waar je klanten naar vragen.
          </p>
        </div>
      ) : (
        // De stang links markeert het hoofdgetal van dit scherm, net als op het
        // overzicht. Grijs en niet groen: hier staat geen zin bij die zegt of
        // het cijfer echt gestegen is, en dan mag de kleur dat ook niet zeggen
        // (`docs/designsystem.md` §5.5).
        <div className="card card-rail flex flex-col gap-2">
          <span className="mono-label flex items-center gap-1">
            Zichtbaarheid over {merkScore.clusters === 1 ? "1 cluster" : `${merkScore.clusters} clusters`}
            <InfoHint label="Hoe is dit gerekend?">
              Het gemiddelde over je clusters, gewogen op het aantal vragen dat per cluster
              gemeten is. Een cluster met vijf metingen telt dus lichter mee dan een met negentig.
            </InfoHint>
          </span>
          <span className="stat-value text-5xl">{Math.round(merkScore.waarde)}%</span>
          {band && band.margin > 0 && (
            <span className="text-sm text-muted">
              Onzekerheidsmarge {Math.max(0, Math.round(band.low))}% tot{" "}
              {Math.min(100, Math.round(band.high))}%. Dat is geen slordigheid: het is een
              steekproef, en dit is hoe breed hij is.
            </span>
          )}
        </div>
      )}

      {/* ── 3. Per cluster, als tabel (plan Z3) ──────────────────────────────
          Was een lijst kaarten, één grafiek per stuk. Bij 329 rijen in de
          beheerlijst op Concurrenten en soortgelijke aantallen elders is een
          kaart per rij geen overzicht meer maar een muur; een tabel met vaste
          kolommen wél. */}
      {perCluster.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="mono-label">Per cluster</span>
          <AnalyticsTable
            rows={perCluster}
            rowKey={(r) => r.cluster.id}
            defaultSortKey="zichtbaarheid"
            defaultSortDir="asc"
            columns={clusterKolommen(labelNaamPerId)}
            stickyOffset="calc(var(--header-h) + 3.5rem)"
          />
        </div>
      )}

      {/* ── 5. Technische diagnose (besluit 7) ─────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Technische diagnose</span>
        <p className="text-sm text-muted">
          Of AI-assistenten je site mogen lezen, en of je gegevens overal hetzelfde zijn.
        </p>
        {staleFactor && (
          <p className="card text-sm text-[var(--status-warning)]" role="status">
            {staleAdviceNotice(staleFactor)}
          </p>
        )}
        {audit ? (
          <AuditPanel checks={checks} checkedAt={audit.checked_at} siteUrl={audit.site_url} />
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

/**
 * De score die telt: de gewogen variant als die er is, anders de ongewogen.
 *
 * Dezelfde keuze als `score-panel.tsx` in het clusterdossier maakt. Zou dit
 * scherm de andere kiezen, dan tonen twee schermen een ander getal voor
 * dezelfde periode.
 */
function leidend(s: VisibilityScore): number {
  return s.weighted_score ?? s.score;
}

/** De onzekerheid die bij `leidend()` hoort. De twee horen altijd bij elkaar. */
function stderrVan(s: VisibilityScore): number {
  return (s.weighted_score != null ? s.weighted_stderr : s.score_stderr) ?? 0;
}

interface ClusterRij {
  cluster: { id: string; name: string; label_id: string | null };
  reeks: VisibilityScore[];
  laatste: VisibilityScore | null;
  vorige: VisibilityScore | null;
}

/** De kolommen van de clustertabel (plan Z3): label, cluster, zichtbaarheid,
 * marge, verandering, gemeten vragen, laatst gemeten. Gesorteerd op zwakste
 * eerst (`page.tsx` zet `defaultSortDir="asc"` op de zichtbaarheidskolom). */
function clusterKolommen(labelNaamPerId: Map<string, string>): AnalyticsColumn<ClusterRij>[] {
  return [
    {
      key: "label",
      header: "Label",
      width: "9rem",
      sortValue: (r) => (r.cluster.label_id ? labelNaamPerId.get(r.cluster.label_id) ?? null : null),
      render: (r) =>
        r.cluster.label_id ? (
          labelNaamPerId.get(r.cluster.label_id) ?? "Onbekend label"
        ) : (
          <span className="text-muted">Zonder label</span>
        ),
    },
    {
      key: "cluster",
      header: "Cluster",
      sortValue: (r) => r.cluster.name,
      render: (r) => (
        <Link href={`/analyses/${r.cluster.id}`} className="font-medium hover:underline">
          {r.cluster.name}
        </Link>
      ),
    },
    {
      key: "zichtbaarheid",
      header: "Zichtbaarheid",
      numeriek: true,
      width: "8rem",
      sortValue: (r) => leidend(r.laatste!),
      render: (r) => `${Math.round(leidend(r.laatste!))}%`,
    },
    {
      key: "marge",
      header: "Marge",
      numeriek: true,
      width: "7rem",
      sortValue: (r) => confidenceBand(leidend(r.laatste!), stderrVan(r.laatste!)).margin,
      render: (r) => {
        const band = confidenceBand(leidend(r.laatste!), stderrVan(r.laatste!));
        return band.margin > 0 ? `± ${band.margin}` : "-";
      },
    },
    {
      key: "verandering",
      header: "Verandering",
      numeriek: true,
      width: "9rem",
      sortValue: (r) => (r.vorige ? leidend(r.laatste!) - leidend(r.vorige) : null),
      render: (r) => {
        if (!r.vorige) return <span className="chip chip-neutral">eerste meting</span>;
        const nu = leidend(r.laatste!);
        const toen = leidend(r.vorige);
        const betekenisvol = changeIsMeaningful(
          { score: nu, stderr: stderrVan(r.laatste!) },
          { score: toen, stderr: stderrVan(r.vorige) },
        ).changed;
        const delta = nu - toen;
        if (!betekenisvol) return <span className="chip chip-neutral">gelijk</span>;
        return (
          <span className={delta > 0 ? "chip chip-success" : "chip chip-danger"}>
            <Icon naam={delta > 0 ? "stijging" : "daling"} size={12} />
            {Math.abs(Math.round(delta))}
          </span>
        );
      },
    },
    {
      key: "gemeten",
      header: "Gemeten vragen",
      numeriek: true,
      width: "8rem",
      sortValue: (r) => r.laatste!.judged_runs ?? null,
      render: (r) => r.laatste!.judged_runs ?? "-",
    },
    {
      key: "laatstgemeten",
      header: "Laatst gemeten",
      width: "9rem",
      sortValue: (r) => r.laatste!.computed_at ?? null,
      render: (r) =>
        r.laatste!.computed_at
          ? new Date(r.laatste!.computed_at).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "-",
    },
  ];
}

/** Het merkcijfer, gewogen op het aantal gemeten vragen per cluster. */
function gewogenGemiddelde(
  scores: VisibilityScore[],
): { waarde: number; stderr: number; clusters: number } | null {
  if (scores.length === 0) return null;

  let som = 0;
  let gewicht = 0;
  let varianceSom = 0;
  for (const s of scores) {
    const w = Math.max(1, s.winnable_runs ?? 1);
    som += leidend(s) * w;
    gewicht += w;
    varianceSom += (stderrVan(s) * w) ** 2;
  }
  if (gewicht === 0) return null;

  return {
    waarde: som / gewicht,
    // De onzekerheid van een gewogen som: de wortel van de som van de
    // gekwadrateerde bijdragen. Optellen van de losse marges zou de band ruim
    // twee keer te breed maken bij vier clusters.
    stderr: Math.sqrt(varianceSom) / gewicht,
    clusters: scores.length,
  };
}
