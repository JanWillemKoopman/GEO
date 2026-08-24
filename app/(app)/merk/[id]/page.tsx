import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import {
  profileStage,
  STAGE_LABEL,
  STAGE_NEXT,
  type ProfileStage,
} from "@/lib/profile-stage";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { MilestonesBlock } from "@/components/milestones-block";
import { InsightLines, OpportunitiesBlock } from "@/components/loop-blocks";
import { CollapsibleSection } from "@/components/collapsible-section";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ProfileProgress } from "./_components/profile-progress";
import { LastUpdated } from "@/components/last-updated";
import { InfoHint } from "@/components/info-hint";
import { activeOnly } from "@/lib/archive";
import { loadMilestones } from "@/lib/milestones-data";
import { loadLoop } from "@/lib/insights-data";
import { loadWorkAcross, sortWork, workChipTone } from "@/lib/work";
import { confidenceBand } from "@/lib/stats/uncertainty";
import { activiteit, type AfgerondeTaak } from "@/lib/activity";
import {
  contentMix,
  funnelVoortgang,
  planTotalen,
  type Funnelfase,
  type VoortgangPagina,
} from "@/lib/plan-progress";
import type { VisibilityScore } from "@/lib/types/database";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";

/**
 * OVERZICHT: de startpagina van een merk, en de eerste die de app ooit had.
 *
 * ── WAAROM DIT SCHERM ER MOEST KOMEN ────────────────────────────────────────
 *
 * Er waren 26 schermen en geen enkele startpagina. `/analyses` deed half dienst
 * als dashboard, het merkdossier deed de andere helft, en wie inlogde wist niet
 * waar hij moest beginnen. Dit scherm beantwoordt vier vragen, in deze volgorde:
 * hoe sta ik ervoor, wat wacht op mij, waar begin ik, en pas daarna de
 * verdieping: wat leverde het op, ligt het plan op schema, wat is er gedaan.
 *
 * ── ⚠️ DE VOLGORDE IS OP 24 AUGUSTUS 2026 OMGEZET, EN DAT IS DE HELE INGREEP ─
 *
 * Het scherm telde tien blokken, allemaal open, allemaal even zwaar, in één
 * kolom. "Waar begin je" stond als tiende. `docs/ux-design.md` §5 zegt dat dit
 * scherm "hoe sta ik ervoor en wat moet ik nu doen" beantwoordt, en §1 vraagt
 * rust boven volledigheid. Wat de klant moet doen stond dus onder vijf blokken
 * toelichting.
 *
 * Nu: de stand, wat op je wacht, waar je begint. Daarna pas de verdieping, op
 * desktop in twee kolommen zodat een voortgangsbalk van 2px niet de volle 1024
 * pixels opeist.
 *
 * ── ⚠️ ÉÉN HOOFDGETAL, EN DAT WAS HET NIET ──────────────────────────────────
 *
 * De zichtbaarheid stond vier keer op één scherm: in de subkop ("in 0% van de
 * vragen"), in de stand-kaart ("0%"), in de mijlpalen ("0, zichtbaarheid in
 * AI-antwoorden") en in de maandinzichten ("de eerste meting staat op 0 van de
 * 100"). Drie schalen voor één cijfer. De subkop noemt het niet meer, de
 * inzichten staan nu ín de stand-kaart als duiding bij het cijfer, en
 * `lib/insights.ts` laat het getal bij een eerste meting weg.
 *
 * ── ⚠️ DE WACHTRIJ BLIJFT KORT, EN DAT IS NIET COSMETISCH ───────────────────
 *
 * Deze lijst stond hier eerder en is op 3 augustus 2026 verwijderd, omdat hij
 * bij meerdere clusters opliep tot tientallen regels in één kaart. Toen werd het
 * overzicht zélf de rommel die het moest oplossen (`docs/logbook.md` §13). Hij
 * komt nu terug met een harde grens: **maximaal vijf regels**, alleen de staat
 * `nu`, met een doorklik naar de rest. Zonder die grens herhalen we de fout.
 *
 * Blijkt hij in de praktijk tóch vol te lopen, dan is de volgende stap hem per
 * cluster te tonen in plaats van opgeteld, niet hem groter te maken.
 *
 * ── ⚠️ HET LAATSTE BLOK SUGGEREERT GEEN AUTONOMIE ───────────────────────────
 *
 * "Wat ORBIT ENGINE deze week deed" komt uit de takenwachtrij en niet uit een
 * animatie. Het product is sales-led: de beheerder start betaald werk, de klant
 * keurt per stap goed. Zie `lib/activity.ts`. Het staat ingeklapt, want het is
 * het enige blok waar geen handeling uit volgt.
 *
 * ── ⚠️ ELK BLOK STAAT IN ZIJN EIGEN FOUTOPVANG ──────────────────────────────
 *
 * Acht databronnen op de startpagina van de klant. Zonder `SectionErrorBoundary`
 * haalt één onverwachte datavorm het hele scherm weg, inclusief de knoppen
 * waarmee hij net iets wilde doen (`docs/ux-design.md` §4).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  return { title: profile ? (profile.brand_name ?? profile.name) : "Overzicht" };
}

/** Hoe ver terug blok 6 kijkt. Een week, want de kop belooft een week. */
const ACTIVITEIT_DAGEN = 7;

/** De harde grens op de wachtrij. Zie de waarschuwing hierboven. */
const MAX_WACHTRIJ = 5;

export default async function OverzichtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();
  const user = await requireUser();

  // Zolang het onderzoek loopt is er nog niets om te overzien. Dan het
  // voortgangsscherm, hetzelfde als op het merkdossier.
  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ analyses, work }, mijlpalen, lus, { data: planRow }] = await Promise.all([
    loadWorkAcross(supabase, user.id),
    loadMilestones(admin, id, profile.account_id),
    loadLoop(admin, id),
    admin
      .from("content_plans")
      .select("id, version, created_at")
      .eq("profile_id", id)
      .neq("status", "gestopt")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // ── De fase van dit merk, alleen voor staf (deel B4) ─────────────────────
  //
  // Eén regel bovenaan met waar dit merk staat en wat de volgende handeling is.
  // Voor de klant verandert er niets: hij ziet zijn eigen merk, niet zijn plek
  // in onze verkoopcyclus.
  const staf = await isStaff(user.id);
  let fase: ProfileStage | null = null;
  if (staf) {
    const [{ data: strategieRij }, { count: openTaken }] = await Promise.all([
      admin
        .from("profile_strategy")
        .select("recorded_at")
        .eq("profile_id", id)
        .maybeSingle(),
      admin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", id)
        .in("status", ["queued", "running"]),
    ]);
    fase = profileStage({
      openResearchJobs: openTaken ?? 0,
      researchDone: profile.status === "klaar",
      recordedAt: (strategieRij as { recorded_at: string | null } | null)?.recorded_at ?? null,
      assignedAt: profile.assigned_at,
    });
  }

  const eigenClusters = analyses.filter((a) => a.profile_id === id);
  const eigenIds = new Set(eigenClusters.map((a) => a.id));

  // ── Blok 2: het hoofdcijfer ──────────────────────────────────────────────
  let scores: VisibilityScore[] = [];
  if (eigenIds.size > 0) {
    const { data: scoreRows } = await supabase
      .from("visibility_scores")
      .select("*")
      .in("analysis_id", [...eigenIds])
      .order("week_no");
    scores = (scoreRows ?? []) as VisibilityScore[];
  }
  const hoofdcijfer = merkCijfer(scores);

  // ── Blok 3: de wachtrij, alleen wat op de klant wacht ────────────────────
  const eigenWerk = sortWork(work.filter((w) => eigenIds.has(w.analysisId) && w.state === "nu"));
  const wachtrij = eigenWerk.slice(0, MAX_WACHTRIJ);
  const restWachtrij = eigenWerk.length - wachtrij.length;

  // ── Blok 4 en 5: het plan ────────────────────────────────────────────────
  const [{ data: paginaRijen }, { data: faseRijen }, { data: maandRijen }] = await Promise.all([
    admin
      .from("planned_pages")
      .select("funnel_stage_id, page_type, is_buffer, posted_at")
      .eq("profile_id", id),
    admin
      .from("profile_funnel_stages")
      .select("id, label, sort_order")
      .eq("profile_id", id)
      .order("sort_order"),
    planRow
      ? admin
          .from("plan_months")
          .select("month_number, status")
          .eq("plan_id", (planRow as { id: string }).id)
          .order("month_number")
      : Promise.resolve({ data: [] }),
  ]);

  const paginas = (paginaRijen ?? []) as VoortgangPagina[];
  const fases = (faseRijen ?? []) as Funnelfase[];
  const funnel = funnelVoortgang(paginas, fases);
  const mix = contentMix(paginas);
  const totalen = planTotalen(paginas);

  // ⚠️ "Maand 4 sinds de start", nooit "maand 4 van 12". Besluit 7 maakte het
  // abonnement doorlopend opzegbaar, en dan is een noemer van twaalf een belofte
  // over een looptijd die niet is afgesproken. `plan-view.tsx` schrijft het om
  // dezelfde reden zo.
  const maanden = (maandRijen ?? []) as { month_number: number; status: string }[];
  const lopendeMaand = maanden.filter((m) => m.status === "goedgekeurd").length;

  // ── Blok 6: wat ORBIT ENGINE deze week deed ──────────────────────────────
  const sinds = new Date(Date.now() - ACTIVITEIT_DAGEN * 86400000).toISOString();
  const { data: taakRijen } = await admin
    .from("jobs")
    .select("type, finished_at, profile_id, analysis_id")
    .eq("status", "done")
    .gte("finished_at", sinds)
    .order("finished_at", { ascending: false })
    .limit(300);

  // Taken hangen aan een merk óf aan een cluster van dat merk. Beide horen erbij,
  // want voor de klant is dat één en hetzelfde werk.
  const eigenTaken = ((taakRijen ?? []) as (AfgerondeTaak & {
    profile_id: string | null;
    analysis_id: string | null;
  })[]).filter((t) => t.profile_id === id || (t.analysis_id && eigenIds.has(t.analysis_id)));
  const regels = activiteit(eigenTaken);

  const merknaam = profile.brand_name ?? profile.name;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Kop ────────────────────────────────────────────────────────────
          ⚠️ Geen cijfer in de subkop. Het hoofdgetal staat één blok lager, en
          twee keer hetzelfde getal in twee formuleringen laat de klant zoeken
          welke van de twee nu de echte is (`docs/ux-design.md` §1). */}
      <PageHeader
        eyebrow={lopendeMaand > 0 ? `Maand ${lopendeMaand} sinds de start` : "Overzicht"}
        title={merknaam}
        description="Hoe zichtbaar je bent in AI-antwoorden, wat er op je wacht en waar je begint."
      />

      {/* ── De fase, alleen voor jou (deel B4) ────────────────────────────
          Een smalle regel en geen kaart: dit is stafinformatie en hoort niet
          even zwaar te wegen als de stand van het merk eronder. */}
      {fase && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="mono-label">Alleen jij ziet dit</span>
            <span
              className={fase === "klaar_voor_gesprek" ? "chip chip-success" : "chip chip-neutral"}
            >
              {STAGE_LABEL[fase]}
            </span>
            <span className="text-sm text-secondary">{STAGE_NEXT[fase]}</span>
          </span>
          {fase !== "overgedragen" && (
            <Link href={`/merk/${id}/admin/onboarding`} className="btn-outline btn-sm">
              Naar de onboarding
            </Link>
          )}
        </div>
      )}

      {/* ── 1. De stand: één cijfer, wat het betekent, en waar je het naleest
          De drie zinnen van `insights()` staan hierbinnen en niet in een eigen
          blok verderop: ze zijn de duiding bij dít getal. */}
      <SectionErrorBoundary label="Je zichtbaarheid">
        <div className="card flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {hoofdcijfer === null ? (
              <span className="flex flex-col gap-1">
                <span className="mono-label">Zichtbaarheid in AI</span>
                <span className="text-secondary">
                  ORBIT ENGINE heeft je merk in kaart. Start een cluster, dan meet ORBIT ENGINE
                  hoe vaak AI-assistenten je noemen bij de vragen van je klanten.
                </span>
              </span>
            ) : (
              <span className="flex flex-col gap-1">
                <span className="mono-label flex items-center gap-1">
                  Zichtbaarheid in AI
                  <InfoHint label="Hoe is dit gerekend?">
                    Het gemiddelde over je clusters, gewogen op het aantal vragen dat per cluster
                    gemeten is. Een cluster met vijf metingen telt lichter mee dan een met negentig.
                  </InfoHint>
                </span>
                <span className="flex flex-wrap items-baseline gap-3">
                  <span className="stat-value text-4xl">{Math.round(hoofdcijfer.waarde)}%</span>
                  {hoofdcijfer.band.margin > 0 && (
                    <span className="mono-label text-muted">
                      marge {Math.max(0, Math.round(hoofdcijfer.band.low))}% tot{" "}
                      {Math.min(100, Math.round(hoofdcijfer.band.high))}%
                    </span>
                  )}
                </span>
              </span>
            )}
            <Link
              href={
                hoofdcijfer === null
                  ? `/merk/${id}/strategie/clusters`
                  : `/merk/${id}/analytics`
              }
              className="btn-outline"
            >
              {hoofdcijfer === null ? "Naar je clusters" : "Bekijk je zichtbaarheid"}
            </Link>
          </div>
          <InsightLines insights={lus.insights} />
        </div>
      </SectionErrorBoundary>

      {/* ── 2. Wat er nu op jou wacht ───────────────────────────────────────
          Maximaal vijf regels. Zie de waarschuwing bovenaan dit bestand. */}
      <SectionErrorBoundary label="Wat er op je wacht">
        <div className="flex flex-col gap-2">
          <span className="mono-label">
            {eigenWerk.length === 0
              ? "Er wacht niets op jou"
              : eigenWerk.length === 1
                ? "1 ding wacht op jou"
                : `${eigenWerk.length} dingen wachten op jou`}
          </span>
          {wachtrij.length === 0 ? (
            <div className="card flex flex-col gap-1">
              <span className="mono-label">Niets te doen</span>
              <p className="text-secondary">
                ORBIT ENGINE meet maandelijks door en laat het weten zodra er iets beweegt.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {wachtrij.map((w) => (
                <li key={w.id}>
                  <Link
                    href={w.href}
                    className="card card-interactive flex flex-wrap items-center justify-between gap-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{w.title}</span>
                      <span className="mono-label">{w.analysisName}</span>
                    </span>
                    {/* De tint komt uit de soort werk (`workChipTone`). Alles
                        stond op amber, waardoor een cluster dat niet gelukt is
                        er precies zo uitzag als een pagina die nagekeken moet
                        worden (`docs/ux-design.md` §2). */}
                    <span className={`chip chip-${workChipTone(w.kind)} shrink-0`}>
                      {w.actionLabel ?? "Bekijken"}
                    </span>
                  </Link>
                </li>
              ))}
              {restWachtrij > 0 && (
                <li>
                  <Link
                    href={`/merk/${id}/strategie/clusters`}
                    className="mono-label inline-flex items-center gap-1.5 hover:underline"
                  >
                    Nog {restWachtrij} {restWachtrij === 1 ? "punt" : "punten"} in je clusters
                    <Icon naam="naar" size={12} />
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      </SectionErrorBoundary>

      {/* ── 3. Waar begin je ───────────────────────────────────────────────
          Stond als tiende blok en is de reden dat dit scherm bestaat. */}
      <SectionErrorBoundary label="Waar je begint">
        <div className="flex flex-col gap-2">
          <span className="mono-label">Waar begin je</span>
          <OpportunitiesBlock
            opportunities={lus.opportunities}
            restHref={`/merk/${id}/strategie/clusters`}
          />
        </div>
      </SectionErrorBoundary>

      {/* ── 4. Wat dit tot nu toe opleverde ─────────────────────────────────
          Blijft op dit scherm (besluit 7, `docs/logbook.md`), maar onder de
          handeling: in maand 1 zijn alle drie de getallen nul, en drie nullen
          pal onder een zichtbaarheid van 0% is geen argument om te blijven. */}
      <SectionErrorBoundary label="Wat dit tot nu toe opleverde">
        <div className="flex flex-col gap-2">
          <span className="mono-label">Wat dit tot nu toe opleverde</span>
          <MilestonesBlock milestones={mijlpalen} />
        </div>
      </SectionErrorBoundary>

      {/* ── 5 en 6. De verdieping, op desktop naast elkaar ──────────────────
          Allebei smal van inhoud: een voortgangsbalk en een lijst korte
          regels. Onder elkaar kostten ze samen bijna een halve pagina
          (`docs/ux-design.md` §7: desktop is het uitgangspunt). */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SectionErrorBoundary label="Je contentplan">
          <div className="flex flex-col gap-2">
            <span className="mono-label">Je contentplan</span>
            {funnel.length === 0 || totalen.gepland === 0 ? (
              <LeegPlan id={id} />
            ) : (
              <div className="card flex flex-col gap-4">
                <p className="text-secondary">
                  {totalen.geplaatst === 0
                    ? `Nog geen van je ${totalen.gepland} geplande pagina's staat live.`
                    : `${totalen.geplaatst} van je ${totalen.gepland} geplande pagina's staan live.`}
                </p>

                {/* Vier kaarten werden vier regels. De funnel houdt zijn eigen
                    volgorde, ook als een fase leeg is (`lib/plan-progress.ts`). */}
                <ul className="flex flex-col gap-3">
                  {funnel.map((f) => (
                    <li key={f.label} className="flex flex-col gap-1.5">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{f.label}</span>
                        <span className="mono-label">
                          {f.gepland === 0
                            ? "niets gepland"
                            : `${f.geplaatst} van de ${f.gepland} geplaatst`}
                        </span>
                      </span>
                      <span
                        className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)]"
                        style={{ background: "var(--bg-elevated)" }}
                      >
                        <span
                          className="block h-full rounded-[var(--radius-pill)]"
                          style={{
                            width: `${f.percentage ?? 0}%`,
                            background: "var(--intent-growth-solid)",
                          }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>

                {mix.length > 0 && (
                  <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
                    <span className="mono-label flex items-center gap-1">
                      Wat voor content er gepland staat
                      <InfoHint label="Welke types zijn dit?">
                        De indeling uit je contentplan: informatief, categorie en dienst. Dezelfde
                        as als bij &ldquo;klikken per paginatype&rdquo; op Zoekverkeer, zodat je
                        kunt zien welk soort content het meeste oplevert en je plan daarop kunt
                        bijstellen.
                      </InfoHint>
                    </span>
                    <span className="flex h-3 w-full overflow-hidden rounded-[var(--radius-pill)]">
                      {mix.map((m, i) => (
                        <span
                          key={m.type}
                          title={`${m.type}: ${m.aantal}`}
                          style={{
                            width: `${m.percentage}%`,
                            background: `var(--chart-${(i % 6) + 1})`,
                          }}
                        />
                      ))}
                    </span>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {mix.map((m, i) => (
                        <li key={m.type} className="mono-label flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="inline-block h-2 w-2 rounded-[var(--radius-pill)]"
                            style={{ background: `var(--chart-${(i % 6) + 1})` }}
                          />
                          <span className="capitalize">{m.type}</span>
                          <span className="text-muted">
                            {m.aantal} ({Math.round(m.percentage)}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                    {totalen.reserve > 0 && (
                      <p className="text-sm text-muted">
                        {totalen.reserve === 1
                          ? "Eén reservepagina staat klaar als er iets afvalt."
                          : `${totalen.reserve} reservepagina's staan klaar als er iets afvalt.`}{" "}
                        Ze tellen niet mee in je maandtotaal.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionErrorBoundary>

        {/* ── 6. Wat ORBIT ENGINE deze week deed ───────────────────────────
            Ingeklapt: het is het enige blok waar geen handeling uit volgt, en
            het was het langste van de pagina. */}
        <SectionErrorBoundary label="Wat ORBIT ENGINE deze week deed">
          <div className="flex flex-col gap-2">
            <span className="mono-label">Wat ORBIT ENGINE deze week deed</span>
            {regels.length === 0 ? (
              <div className="card flex flex-col gap-1">
                <span className="mono-label">Deze week niets gedraaid</span>
                <p className="text-secondary">
                  Er stond geen werk klaar. De volgende meetronde staat gepland voor de eerste van
                  de maand.
                </p>
              </div>
            ) : (
              <CollapsibleSection
                title="Het werk van deze week"
                badge={
                  regels.length === 1 ? "1 soort werk" : `${regels.length} soorten werk`
                }
                defaultOpen={false}
              >
                <ul className="flex flex-col gap-2">
                  {regels.map((r) => (
                    <li
                      key={r.tekst}
                      className="flex flex-wrap items-baseline justify-between gap-2"
                    >
                      <span className="text-sm text-secondary">
                        ORBIT ENGINE {r.tekst}
                        {r.aantal > 1 && <span className="text-muted"> ({r.aantal}×)</span>}
                      </span>
                      <LastUpdated at={r.laatst} className="mono-label" />
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}
          </div>
        </SectionErrorBoundary>
      </div>
    </div>
  );
}

function LeegPlan({ id }: { id: string }) {
  return (
    <div className="card flex flex-col gap-2">
      <span className="mono-label">Nog geen contentplan</span>
      <p className="text-secondary">
        Zodra er een contentplan staat, zie je hier hoeveel pagina&apos;s er per fase van de
        klantreis gepland zijn en hoeveel er al live staan.
      </p>
      <Link href={`/merk/${id}/strategie/plan`} className="btn-outline w-fit">
        Naar het contentplan
      </Link>
    </div>
  );
}

/**
 * Het merkcijfer, gewogen op het aantal gemeten vragen per cluster.
 *
 * ⚠️ Dezelfde rekensom als op `/merk/[id]/analytics`. Twee schermen die
 * hetzelfde getal anders berekenen is precies de fout die `lib/dashboard.ts`
 * ooit oploste, en dit scherm en dat scherm staan één klik uit elkaar.
 */
function merkCijfer(
  scores: VisibilityScore[],
): { waarde: number; band: { low: number; high: number; margin: number } } | null {
  const laatstePerCluster = new Map<string, VisibilityScore>();
  for (const s of scores) {
    const huidig = laatstePerCluster.get(s.analysis_id);
    if (!huidig || s.week_no > huidig.week_no) laatstePerCluster.set(s.analysis_id, s);
  }
  const actueel = [...laatstePerCluster.values()];
  if (actueel.length === 0) return null;

  let som = 0;
  let gewicht = 0;
  let varianceSom = 0;
  for (const s of actueel) {
    const w = Math.max(1, s.winnable_runs ?? 1);
    const waarde = s.weighted_score ?? s.score;
    const se = (s.weighted_score != null ? s.weighted_stderr : s.score_stderr) ?? 0;
    som += waarde * w;
    gewicht += w;
    varianceSom += (se * w) ** 2;
  }
  if (gewicht === 0) return null;

  const waarde = som / gewicht;
  return { waarde, band: confidenceBand(waarde, Math.sqrt(varianceSom) / gewicht) };
}
