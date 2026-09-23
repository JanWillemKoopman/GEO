import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AnalyticsFilters } from "@/components/analytics-filters";
import { AnalyticsClusterTable } from "@/components/analytics-cluster-table";
import { AnalyticsPromptTable } from "@/components/analytics-prompt-table";
import { ClusterVisibilityGrid } from "@/components/cluster-visibility-grid";
import { loadPromptVisibility } from "@/lib/pipeline/prompt-visibility";
import { activeOnly } from "@/lib/archive";
import { confidenceBand } from "@/lib/stats/uncertainty";
import {
  beschikbareBronnen,
  cijferVoorBronnen,
  leesBronfilter,
  bronLabel,
  BRONFILTER_STANDAARD,
} from "@/lib/engines/bron";
import {
  bepaalPeriodes,
  beschikbareFunnelfasen,
  clustersVoorFilter,
  filterOpFunnel,
  FUNNELFILTER_ALLES,
  leesClusterfilter,
  leesFunnelfilter,
  leesLabelfilter,
  leesPeriodefilter,
  PERIODEFILTER_ACTUEEL,
} from "@/lib/analytics-filters";
import { sorteerLabels } from "@/lib/cluster-labels";
import { kortSamengevat } from "@/lib/pipeline/report-summary";
import type { AuditCheck } from "@/lib/audit/technical";
import type {
  ClusterLabel,
  TechnicalAudit as TechnicalAuditRow,
  VisibilityScore,
} from "@/lib/types/database";
import { legeStaat } from "@/lib/search-console/lege-staat";
import { berekenOpbrengst, type OpbrengstPagina } from "@/lib/search-console/opbrengst";
import { normaliseerUrl, type GscDag } from "@/lib/search-console/metrics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zichtbaarheid in AI" };

/**
 * ZICHTBAARHEID IN AI, over alle clusters van dit merk heen.
 *
 * ── WAAROM DE BLOKKADEBANNER HIER STAAT, DE VOLLEDIGE DIAGNOSE NIET MEER ────
 *
 * Besluit 7 van 17 augustus 2026 zette de volledige technische diagnose
 * (checklijst per categorie) onderaan dit scherm, naast het cijfer dat ze
 * verklaart. Op 21 september 2026 is die checklijst hier weer weggehaald: hij
 * herhaalde wat de losse blokkadebanner al zegt zonder er iets aan toe te
 * voegen. De banner blijft wel staan, en blijft bovenaan: die verklaart het
 * cijfer dat eronder staat, en dat moet je lezen vóór het cijfer en niet erna.
 * De ruwe auditdata blijft wel bewaard in `technical_audits` (audit-trail,
 * conventie 8), en is als ruwe JSON te zien op Admin (staffscherm), maar de
 * opgemaakte checklijst per categorie staat nergens meer in de klant-UI.
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
  searchParams: Promise<{ periode?: string; label?: string; cluster?: string; bron?: string; funnel?: string }>;
}) {
  const { id } = await params;
  const {
    periode: periodeUitAdres,
    label: labelUitAdres,
    cluster: clusterUitAdres,
    bron: bronUitAdres,
    funnel: funnelUitAdres,
  } = await searchParams;
  const profile = await getProfile(id);
  if (!profile) notFound();
  await requireUser();

  const supabase = await createClient();
  const [{ data: auditRow }, { data: analysisRows }, { data: labelRows }] = await Promise.all([
    // Kolommen bij naam: `technical_audits.raw_json` is de ruwe uitvoer van de
    // audit en hoort op Admin (besluit 4). Met een `*` reist hij mee naar de
    // browser, ook al gebruikt dit scherm alleen de blokkades eruit.
    supabase
      .from("technical_audits")
      .select("checks_json, checked_at, site_url, blockers")
      .eq("profile_id", id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    activeOnly(supabase.from("analyses").select("id, name, label_id").eq("profile_id", id)),
    supabase.from("cluster_labels").select("*").eq("profile_id", id),
  ]);

  const clusters = (analysisRows ?? []) as { id: string; name: string; label_id: string | null }[];
  const labels = sorteerLabels((labelRows ?? []) as ClusterLabel[]);
  const analysisIdsVoorOpbrengst = clusters.map((c) => c.id);

  // ── §7: wat ORBIT ENGINE tot nu toe oplevert, merkbreed en NIET gefilterd ──
  // op cluster of label: dit blok gaat over het hele merk, net als de
  // publicatie- en plancijfers eronder niets met de filterbalk te maken hebben.
  const [{ data: pieceRows }, { data: gscRows }, { data: planPageRows }] = await Promise.all([
    analysisIdsVoorOpbrengst.length > 0
      ? supabase
          .from("content_pieces")
          .select("published_url, published_at")
          .in("analysis_id", analysisIdsVoorOpbrengst)
          .not("published_url", "is", null)
      : Promise.resolve({ data: [] }),
    supabase
      .from("search_console_days")
      .select("day, page, clicks, impressions, position")
      .eq("profile_id", id)
      // ⚠️ Zonder expliciete limiet stopt Supabase stil bij 1000 rijen
      // (PostgREST-standaard). Bij 89 dagen over honderden pagina's is dat al
      // bereikt, en dan rekent de opbrengst hieronder op een steekproef in
      // plaats van het volledige bereik. Gevonden 22 september 2026 bij het
      // naverifiëren van de eerste echte koppeling (Van den Udenhout).
      .limit(200000),
    supabase
      .from("planned_pages")
      .select("status")
      .eq("profile_id", id)
      .eq("is_buffer", false),
  ]);

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
  // ── De BRON-keuze (20 september 2026) ────────────────────────────────────
  //
  // ⚠️ Alleen dit scherm kent hem, en dat is een besluit van de eigenaar: de
  // tweede meetbron mag nergens anders in de app een tweede cijfer opleveren.
  // `beschikbareBronnen()` kijkt of er daadwerkelijk via meer dan één bron
  // gemeten is; zo niet, dan verschijnt de knop niet en verandert er niets.
  const bronnen = beschikbareBronnen(scores);
  const bronfilter = bronnen.length > 1 ? leesBronfilter(bronUitAdres, bronnen) : BRONFILTER_STANDAARD;

  // ── De conclusie van de meting, als er één cluster gekozen is ────────────
  //
  // ⚠️ Deze kaart stond tot 22 september 2026 op de resultatenpagina van het
  // cluster ("Wat dit cluster laat zien"). Die pagina is weggehaald omdat ze
  // cijfers herhaalde die hier al stonden
  // (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`). De conclusie in
  // gewone taal stond er echter NIET al: dit scherm kon rekenen en vergelijken,
  // maar niet in één zin zeggen wat de meting betekent. Vandaar dat dit stuk
  // wél meeverhuisd is.
  //
  // Tot dezelfde datum stond hier ook nog een lijst met elke gemiste vraag
  // eronder (`gaps_json`), soms wel vijftien regels: precies het "hele
  // verhaal" waar een gebruiker die één cluster aanvinkt niet om vroeg. Die
  // lijst staat al op "Wat ORBIT ENGINE nog van je wil weten" (link
  // hieronder); hier blijft alleen de samenvatting over, ingekort tot
  // maximaal 5 zinnen (`kortSamengevat`, conventie 1: het model krijgt de
  // instructie kort te schrijven, maar "kort" is geen getal).
  //
  // Alleen bij één gekozen cluster: een samenvatting van cluster A boven de
  // cijfers van A tot en met F leest als een uitspraak over alles.
  let clusterConclusie: { samenvatting: string } | null = null;
  if (clusterfilter !== "alles") {
    const { data: rapportRij } = await supabase
      .from("reports")
      .select("summary")
      .eq("analysis_id", clusterfilter)
      .order("week_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      rapportRij &&
      typeof rapportRij.summary === "string" &&
      rapportRij.summary.trim() !== ""
    ) {
      clusterConclusie = { samenvatting: kortSamengevat(rapportRij.summary) };
    }
  }

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
        // ⚠️ Alleen rondes waarin DEZE bron daadwerkelijk gemeten heeft. Een
        // ronde van vóór de tweede bron, of een ronde waarin Google bij geen
        // enkele vraag een overzicht toonde, hoort niet als 0% in de grafiek:
        // dat is niet gemeten, geen nul (conventie 3).
        .filter((s) => cijferVoorBronnen(s, bronfilter) !== null)
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
    .sort((a, b) => leidend(b.laatste!, bronfilter) - leidend(a.laatste!, bronfilter));

  // ── De prompttabel: elke gemeten vraag, over alle zichtbare clusters heen ─
  //
  // Dezelfde ronde per cluster als in "Per cluster" (`r.laatste.week_no`), dus
  // nooit een ander getal dan de tabel ernaast.
  const promptVisibility = await loadPromptVisibility(
    supabase,
    perCluster.map((r) => ({
      analysisId: r.cluster.id,
      clusterName: r.cluster.name,
      weekNo: r.laatste!.week_no,
    })),
    bronfilter,
  );

  // ── Het funnelfilter: alleen de prompttabel, elke vraag heeft een fase ────
  const funnelfasen = beschikbareFunnelfasen(promptVisibility);
  const funnelfilter = funnelfasen.length > 1 ? leesFunnelfilter(funnelUitAdres, funnelfasen) : FUNNELFILTER_ALLES;
  const promptVisibilityGefilterd = filterOpFunnel(promptVisibility, funnelfilter);

  // ── Het merkcijfer: gewogen op het aantal metingen per cluster ───────────
  //
  // Niet het rekenkundige gemiddelde van de clusterscores. Een cluster met 5
  // metingen zou dan even zwaar tellen als een met 90, en dan verspringt het
  // merkcijfer zodra iemand een klein cluster start.
  const laatsten = perCluster.map((r) => r.laatste!);
  const merkScore = gewogenGemiddelde(laatsten, bronfilter);

  const audit = auditRow as TechnicalAuditRow | null;
  const checks = (audit?.checks_json ?? []) as AuditCheck[];
  const blokkades = checks.filter((c) => c.severity === "blocker");
  const labelNaamPerId = new Map(labels.map((l) => [l.id, l.name]));

  // ── Z1, Z2: het hoofdbeeld, per cluster ───────────────────────────────────
  const visibilityGridData = perCluster.map((r) => ({
    id: r.cluster.id,
    name: r.cluster.name,
    punten: r.reeks.map((s) => ({
      waarde: leidend(s, bronfilter),
      marge: confidenceBand(leidend(s, bronfilter), stderrVan(s, bronfilter)).margin,
    })),
    volgendeMeetronde: r.reeks.length < 3 ? volgendeMeetronde(r.laatste!.computed_at) : null,
  }));

  // ── Z4: de ene duidende zin boven de tabel ────────────────────────────────
  const duidendeZin =
    perCluster.length >= 2
      ? (() => {
          const zwakste = perCluster[perCluster.length - 1];
          const sterkste = perCluster[0];
          const verschil = Math.round(
            leidend(sterkste.laatste!, bronfilter) - leidend(zwakste.laatste!, bronfilter),
          );
          return verschil > 0
            ? `${zwakste.cluster.name} blijft het meest achter: ${Math.round(leidend(zwakste.laatste!, bronfilter))}%, ${verschil} punten onder je sterkste cluster (${sterkste.cluster.name}).`
            : null;
        })()
      : null;

  // ── §7.2/§7.5: het opbrengstblok, of de lege staat die zegt wie aan zet is ──
  const opbrengstPaginas: OpbrengstPagina[] = ((pieceRows ?? []) as { published_url: string; published_at: string | null }[]).map(
    (p) => ({ page: p.published_url, publishedAt: p.published_at }),
  );
  const gscRijen = (gscRows ?? []) as GscDag[];
  const planPaginas = (planPageRows ?? []) as { status: string }[];
  const paginasGepland = planPaginas.filter((p) => p.status !== "geplaatst").length;

  const opbrengstLeeg = legeStaat({
    heeftProperty: Boolean(profile.gsc_property),
    geverifieerdOp: profile.gsc_verified_at,
    laatsteFout: profile.gsc_last_error,
    gepubliceerdePaginas: opbrengstPaginas.length,
    dagenVoorOnzePaginas: gscRijen.filter((r) =>
      opbrengstPaginas.some((p) => normaliseerUrl(p.page) === normaliseerUrl(r.page)),
    ).length,
  });

  const opbrengst = opbrengstLeeg ? null : berekenOpbrengst(opbrengstPaginas, gscRijen, paginasGepland);

  // ── §7.3, niveau 3: onze pagina's tegenover de controlegroep ────────────
  //
  // ⚠️ Alleen als BEIDE kanten een echte vergelijking hebben én de vorige
  // periode niet op nul klikken stond: een percentage over "0 naar 4" is
  // oneindig en zegt niets (conventie 3, geen schijnprecisie).
  let controlegroepZin: string | null = null;
  if (
    opbrengst?.vergelijkingOns?.vergelijkbaar &&
    opbrengst.vergelijkingControlegroep?.vergelijkbaar &&
    opbrengst.vergelijkingOns.vorige.clicks > 0 &&
    opbrengst.vergelijkingControlegroep.vorige.clicks > 0
  ) {
    const onsPercentage = Math.round(
      (opbrengst.vergelijkingOns.verschil.clicks! / opbrengst.vergelijkingOns.vorige.clicks) * 100,
    );
    const restPercentage = Math.round(
      (opbrengst.vergelijkingControlegroep.verschil.clicks! /
        opbrengst.vergelijkingControlegroep.vorige.clicks) *
        100,
    );
    const teken = (n: number) => (n > 0 ? "+" : "");
    controlegroepZin =
      onsPercentage > restPercentage
        ? `Onze pagina's groeiden ${teken(onsPercentage)}${onsPercentage}% deze periode, de rest van de site ${teken(restPercentage)}${restPercentage}%. Dat verschil is aan ons toe te schrijven.`
        : `Onze pagina's groeiden ${teken(onsPercentage)}${onsPercentage}% deze periode, ongeveer gelijk op met de rest van de site (${teken(restPercentage)}${restPercentage}%). De markt bewoog mee, meer dan dat wij dat deden.`;
  }

  return (
    // `wil-data`: deze pagina heeft een brede tabel (redesign2026.md §8.4), dus
    // geen plafond op 1440px. Zie `.stand` in app/globals.css.
    <div className="flex flex-col gap-6 wil-data">
      <PageHeader
        eyebrow="Analytics"
        title="Zichtbaarheid in AI"
        description="Hoe vaak AI-assistenten je noemen, over al je clusters heen, en wat dat cijfer verklaart."
      />

      {/* ── §7.5: wat ORBIT ENGINE tot nu toe opleverde ──────────────────────
          Merkbreed en bovenaan: dit is de eerste vraag van de eigenaar, vóór
          de AI-zichtbaarheidsscore, want het is het bewijs dat er iets
          gebeurt, niet de meting van hoe goed het gaat. */}
      {opbrengstLeeg ? (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">{opbrengstLeeg.kop}</span>
          <p className="text-secondary">{opbrengstLeeg.uitleg}</p>
          {opbrengstLeeg.geruststelling && (
            <p className="text-sm text-muted">{opbrengstLeeg.geruststelling}</p>
          )}
        </div>
      ) : (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Wat ORBIT ENGINE tot nu toe opleverde</span>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="data-card-label">Pagina&apos;s live</span>
              <span className="data-card-waarde">
                {opbrengst!.paginasLive}
                {opbrengst!.paginasGepland > 0 && (
                  <span className="text-sm font-normal text-muted"> · {opbrengst!.paginasGepland} in het plan</span>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="data-card-label">Klikken sinds de start</span>
              <span className="data-card-waarde">
                {opbrengst!.klikkenSindsStart === null
                  ? "-"
                  : opbrengst!.klikkenSindsStart.toLocaleString("nl-NL")}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="data-card-label">Deze 28 dagen</span>
              {opbrengst!.vergelijkingOns ? (
                <>
                  <span className="data-card-waarde">
                    {opbrengst!.vergelijkingOns.nu.clicks.toLocaleString("nl-NL")} klikken
                  </span>
                  {!controlegroepZin && (
                    <span className="text-sm text-muted">Nog niet genoeg geschiedenis voor een vergelijking.</span>
                  )}
                </>
              ) : (
                <span className="text-secondary">Nog geen klikken gemeten.</span>
              )}
            </div>
          </div>
          {/* ── §7.3, niveau 3: de rest van de site als controlegroep ────── */}
          {controlegroepZin && <p className="text-sm text-secondary">{controlegroepZin}</p>}
          {opbrengst!.jongePaginas > 0 && (
            <p className="text-sm text-muted">
              {opbrengst!.jongePaginas === 1
                ? "1 pagina staat korter dan 28 dagen online en is bij Google nog nauwelijks vertoond."
                : `${opbrengst!.jongePaginas} pagina's staan korter dan 28 dagen online en zijn bij Google nog nauwelijks vertoond.`}
            </p>
          )}
          <Link href={`/merk/${id}/analytics/zoekverkeer`} className="link w-fit text-sm">
            Bekijk per pagina
          </Link>
        </div>
      )}

      <AnalyticsFilters
        periodes={periodes}
        labels={labels}
        clustersBijLabel={clustersBijLabel}
        bronnen={bronnen}
        bronfilter={bronfilter}
        funnelfasen={funnelfasen}
        funnelfilter={funnelfilter}
        periodefilter={periodefilter}
        labelfilter={labelfilter}
        clusterfilter={clusterfilter}
      />

      {/* ── De conclusie van het gekozen cluster ────────────────────────────
          Onder de filterbalk en boven de cijfers: eerst wat het betekent, dan
          waar het vandaan komt. De twee links eronder wijzen naar de plekken
          waar het werk uit deze meting staat; sinds 22 september 2026 is dat
          de enige plek waar een klant dat verband nog te zien krijgt. */}
      {clusterConclusie && (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Wat dit cluster laat zien</span>
          <p className="text-secondary">{clusterConclusie.samenvatting}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={`/merk/${id}/strategie/vragen`} className="link type-caption">
              Wat ORBIT ENGINE nog van je wil weten
            </Link>
            <Link href={`/merk/${id}/strategie/plan`} className="link type-caption">
              De pagina&apos;s die hieruit volgen
            </Link>
          </div>
        </div>
      )}

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

      {/* ── 2. De score, met het hoofdbeeld ernaast (plan Z1, Z2) ────────────
          Eén hoofdgetal (`docs/ux-design.md` §1), met de onzekerheidsmarge
          zichtbaar en niet alleen in een comment. Het raster ernaast groeit
          zelf mee met de data: staven bij één of twee metingen, een lijn
          vanaf drie (`components/cluster-visibility-grid.tsx`). */}
      {merkScore === null ? (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Nog niet gemeten</span>
          <p className="text-secondary">
            Zodra de eerste meetronde klaar is, staat je zichtbaarheid hier.{" "}
            <Link href={`/merk/${id}/strategie/clusters`} className="link">
              Start een cluster
            </Link>{" "}
            om te laten meten waar je klanten naar vragen.
          </p>
        </div>
      ) : (
        <ClusterVisibilityGrid clusters={visibilityGridData} />
      )}

      {/* ── 3. Per cluster, als tabel (plan Z3) ──────────────────────────────
          Was een lijst kaarten, één grafiek per stuk. Bij 329 rijen in de
          beheerlijst op Concurrenten en soortgelijke aantallen elders is een
          kaart per rij geen overzicht meer maar een muur; een tabel met vaste
          kolommen wél. */}
      {perCluster.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="mono-label">Per cluster</span>
          {/* ── Z4: de ene duidende zin, uit de cijfers zelf gerekend ────── */}
          {duidendeZin && <p className="text-secondary">{duidendeZin}</p>}
          <AnalyticsClusterTable
            rows={perCluster}
            labelNaamPerId={labelNaamPerId}
            merkId={id}
            bron={bronfilter}
          />
        </div>
      )}

      {/* ── 4. Per prompt: elke gemeten vraag, sterkste zichtbaarheid boven ── */}
      {promptVisibility.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="mono-label">Prompts</span>
          <AnalyticsPromptTable
            rows={promptVisibilityGefilterd}
            merkId={id}
            ownTerms={[profile.brand_name, ...(profile.aliases ?? [])].filter(
              (t): t is string => Boolean(t && t.trim()),
            )}
          />
        </div>
      )}
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
function leidend(s: VisibilityScore, bron: string[] = BRONFILTER_STANDAARD): number {
  return cijferVoorBronnen(s, bron)?.score ?? 0;
}

/** De onzekerheid die bij `leidend()` hoort. De twee horen altijd bij elkaar. */
function stderrVan(s: VisibilityScore, bron: string[] = BRONFILTER_STANDAARD): number {
  return cijferVoorBronnen(s, bron)?.stderr ?? 0;
}

/**
 * Een schatting van de volgende meetronde (plan Z1), voor de belofte bij één
 * of twee metingen. De maandronde draait op de eerste van de maand
 * (`app/api/cron/tracking/route.ts`), dus de eerste van de maand ná de
 * laatste meting is geen gok maar het echte cronritme.
 */
function volgendeMeetronde(laatsteMeting: string | null): string | null {
  if (!laatsteMeting) return null;
  const datum = new Date(laatsteMeting);
  return new Date(Date.UTC(datum.getUTCFullYear(), datum.getUTCMonth() + 1, 1)).toISOString();
}

/** Het merkcijfer, gewogen op het aantal gemeten vragen per cluster. */
function gewogenGemiddelde(
  scores: VisibilityScore[],
  bron: string[] = BRONFILTER_STANDAARD,
): { waarde: number; stderr: number; clusters: number } | null {
  if (scores.length === 0) return null;

  let som = 0;
  let gewicht = 0;
  let varianceSom = 0;
  for (const s of scores) {
    const w = Math.max(1, s.winnable_runs ?? 1);
    som += leidend(s, bron) * w;
    gewicht += w;
    varianceSom += (stderrVan(s, bron) * w) ** 2;
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
