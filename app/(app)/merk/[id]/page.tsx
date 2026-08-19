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
import { InsightsBlock, OpportunitiesBlock } from "@/components/loop-blocks";
import { ProfileProgress } from "./_components/profile-progress";
import { LastUpdated } from "@/components/last-updated";
import { InfoHint } from "@/components/info-hint";
import { activeOnly } from "@/lib/archive";
import { loadMilestones } from "@/lib/milestones-data";
import { loadLoop } from "@/lib/insights-data";
import { loadWorkAcross, sortWork } from "@/lib/work";
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

export const dynamic = "force-dynamic";

/**
 * OVERZICHT: de startpagina van een merk, en de eerste die de app ooit had.
 *
 * ── WAAROM DIT SCHERM ER MOEST KOMEN ────────────────────────────────────────
 *
 * Er waren 26 schermen en geen enkele startpagina. `/analyses` deed half dienst
 * als dashboard, het merkdossier deed de andere helft, en wie inlogde wist niet
 * waar hij moest beginnen. Dit scherm beantwoordt vier vragen, in deze volgorde:
 * hoe sta ik ervoor, wat wacht op mij, ligt het plan op schema, waar begin ik.
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
 * ── ⚠️ BLOK 6 SUGGEREERT GEEN AUTONOMIE ─────────────────────────────────────
 *
 * "Wat ORBIT ENGINE deze week deed" komt uit de takenwachtrij en niet uit een
 * animatie. Het product is sales-led: de beheerder start betaald werk, de klant
 * keurt per stap goed. Zie `lib/activity.ts`.
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
      {/* ── 1. Kop ─────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow={lopendeMaand > 0 ? `Maand ${lopendeMaand} sinds de start` : "Overzicht"}
        title={merknaam}
        description={
          hoofdcijfer === null
            ? "ORBIT ENGINE heeft je merk in kaart. Start een cluster om te laten meten waar je klanten naar vragen."
            : `AI-assistenten noemen je in ${Math.round(hoofdcijfer.waarde)}% van de vragen waarin ze een aanbieder noemen.`
        }
      />

      {/* ── De fase, alleen voor jou (deel B4) ────────────────────────────── */}
      {fase && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <span className="flex flex-wrap items-center gap-2">
            <span className="mono-label">Alleen jij ziet dit</span>
            <span
              className={fase === "klaar_voor_gesprek" ? "chip chip-success" : "chip chip-neutral"}
            >
              {STAGE_LABEL[fase]}
            </span>
            <span className="text-secondary">{STAGE_NEXT[fase]}</span>
          </span>
          {fase !== "overgedragen" && (
            <Link href={`/merk/${id}/admin/onboarding`} className="btn-outline">
              Naar de onboarding
            </Link>
          )}
        </div>
      )}

      {/* ── 2. Hoe sta je ervoor ───────────────────────────────────────────── */}
      {hoofdcijfer !== null && (
        <div className="card flex flex-wrap items-end justify-between gap-4">
          <span className="flex flex-col gap-1">
            <span className="mono-label flex items-center gap-1">
              Zichtbaarheid in AI
              <InfoHint label="Hoe is dit gerekend?">
                Het gemiddelde over je clusters, gewogen op het aantal vragen dat per cluster
                gemeten is. Een cluster met vijf metingen telt lichter mee dan een met negentig.
              </InfoHint>
            </span>
            <span className="stat-value text-4xl">{Math.round(hoofdcijfer.waarde)}%</span>
            {hoofdcijfer.band.margin > 0 && (
              <span className="mono-label text-muted">
                marge {Math.max(0, Math.round(hoofdcijfer.band.low))}% tot{" "}
                {Math.min(100, Math.round(hoofdcijfer.band.high))}%
              </span>
            )}
          </span>
          <Link href={`/merk/${id}/analytics`} className="btn-outline">
            Naar Analytics
          </Link>
        </div>
      )}

      <MilestonesBlock milestones={mijlpalen} />

      {/* ── 3. Wat er nu op jou wacht ───────────────────────────────────────
          Maximaal vijf regels. Zie de waarschuwing bovenaan dit bestand. */}
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
                  <span className="chip chip-warning shrink-0">
                    {w.actionLabel ?? "Bekijken"}
                  </span>
                </Link>
              </li>
            ))}
            {restWachtrij > 0 && (
              <li>
                <Link
                  href={`/merk/${id}/strategie/clusters`}
                  className="mono-label hover:underline"
                >
                  Nog {restWachtrij} {restWachtrij === 1 ? "punt" : "punten"} in je clusters →
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── 4. Funnel-voortgang ─────────────────────────────────────────────
          Verdwijnt niet als er geen plan is: dan staat er waaróm hij leeg is en
          wat de volgende stap is (`docs/ux-design.md` §4). */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Waar je content staat in de klantreis</span>
        {funnel.length === 0 || totalen.gepland === 0 ? (
          <LeegPlan id={id} />
        ) : (
          <ul className="flex flex-col gap-2">
            {funnel.map((f) => (
              <li key={f.label} className="card flex flex-col gap-2">
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{f.label}</span>
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
        )}
      </div>

      {/* ── 5. Contentmix ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label flex items-center gap-1">
          Wat voor content er gepland staat
          <InfoHint label="Welke types zijn dit?">
            De indeling uit je contentplan: informatief, categorie en dienst. Dezelfde as als bij
            &ldquo;klikken per paginatype&rdquo; op Zoekverkeer, zodat je kunt zien welk soort
            content het meeste oplevert en je plan daarop kunt bijstellen.
          </InfoHint>
        </span>
        {mix.length === 0 ? (
          <LeegPlan id={id} />
        ) : (
          <div className="card flex flex-col gap-3">
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
            <ul className="flex flex-wrap gap-4">
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
                  ? "Eén reservepagina staat klaar om in te schuiven"
                  : `${totalen.reserve} reservepagina's staan klaar om in te schuiven`}{" "}
                als er iets afvalt. Die tellen niet mee in het maandtotaal.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── 6. Wat ORBIT ENGINE deze week deed ─────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Wat ORBIT ENGINE deze week deed</span>
        {regels.length === 0 ? (
          <div className="card flex flex-col gap-1">
            <span className="mono-label">Deze week niets gedraaid</span>
            <p className="text-secondary">
              Er stond geen werk klaar. De volgende meetronde staat gepland voor de eerste van de
              maand.
            </p>
          </div>
        ) : (
          <ul className="card flex flex-col gap-2">
            {regels.map((r) => (
              <li key={r.tekst} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-secondary">
                  ORBIT ENGINE {r.tekst}
                  {r.aantal > 1 && <span className="text-muted"> ({r.aantal}×)</span>}
                </span>
                <LastUpdated at={r.laatst} className="mono-label" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <InsightsBlock insights={lus.insights} />

      {/* ── 7. Waar begin je ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Waar begin je</span>
        <OpportunitiesBlock opportunities={lus.opportunities} />
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
