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
import { SectionHeading } from "@/components/section-heading";
import { InsightLines, OpportunitiesBlock } from "@/components/loop-blocks";
import { CollapsibleSection } from "@/components/collapsible-section";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ProfileProgress } from "./_components/profile-progress";
import { InfoHint } from "@/components/info-hint";
import { loadGepubliceerd } from "@/lib/overview-data";
import { loadLoop } from "@/lib/insights-data";
import type { Insight } from "@/lib/insights";
import { loadWorkAcross, sortWork, workChipTone, workKindIcon, WORK_KIND_LABEL } from "@/lib/work";
import type { WorkItem } from "@/lib/work";
import { activiteit, type AfgerondeTaak } from "@/lib/activity";
import { formatDateShort, formatRelativeTime } from "@/lib/format";
import {
  isEersteMaand,
  overzichtCijfers,
  type OverzichtCijfer,
  planRegels,
  versheidsregel,
  volgendeMeting,
} from "@/lib/overview";
import {
  contentMix,
  funnelVoortgang,
  planTotalen,
  type Funnelfase,
  type VoortgangPagina,
} from "@/lib/plan-progress";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";

/**
 * OVERZICHT: de startpagina van een merk, en de bestemming na inloggen.
 *
 * ── WAAROM DIT SCHERM ER MOEST KOMEN ────────────────────────────────────────
 *
 * Er waren 26 schermen en geen enkele startpagina. `/analyses` deed half dienst
 * als dashboard, het merkdossier deed de andere helft, en wie inlogde wist niet
 * waar hij moest beginnen. Dit scherm beantwoordt vier vragen, in deze volgorde:
 * hoe sta ik ervoor, wat wacht op mij, waar begin ik, en pas daarna de
 * verdieping: wat leverde het op, ligt het plan op schema, wat is er gedaan.
 *
 * ── ⚠️ DIT IS HET EERSTE SCHERM VAN ELKE SESSIE ─────────────────────────────
 *
 * `app/page.tsx` stuurt na inloggen hierheen, en bij één merk zonder tussenstap.
 * Dat is geen detail voor de vormgeving maar de hoofdregel ervan: de vraag van
 * een terugkerende bezoeker is niet "hoe sta ik ervoor" maar "is er iets nieuws
 * sinds ik hier was". Er wordt maandelijks gemeten (`vercel.json`, `0 6 1 * *`)
 * en de klant kijkt vaker, dus zonder een meetdatum ziet hij vier weken achter
 * elkaar hetzelfde cijfer zonder te weten dát het hetzelfde is. Die regel staat
 * nu onder de merknaam (`lib/overview.ts`, `versheidsregel`).
 *
 * ── ⚠️ DE VOLGORDE IS OP 24 AUGUSTUS 2026 OMGEZET ───────────────────────────
 *
 * Het scherm telde tien blokken, allemaal open, allemaal even zwaar, in één
 * kolom. "Waar begin je" stond als tiende. Nu: de stand, wat op je wacht, waar
 * je begint. Daarna pas de verdieping, op desktop in twee kolommen.
 *
 * ── ⚠️ ÉÉN HOOFDGETAL, EN ÉÉN REKENSOM ERONDER (25 AUGUSTUS 2026) ───────────
 *
 * De zichtbaarheid stond niet alleen op meerdere plekken, hij stond er in
 * verschillende GETALLEN: de standkaart zei 57% (gewogen, gewogen gemiddeld over
 * de clusters), de duiding eronder zei "van 30 naar 60" en het opbrengstblok zei
 * "+30 punten", allebei uit de ongewogen score, ongewogen gemiddeld. Drie
 * rekensommen voor één begrip op één scherm. Sinds `lib/brand-score.ts` valt die
 * som één keer en voeden alle drie de blokken zich eruit.
 *
 * ── ⚠️ DE WACHTRIJ BLIJFT KORT, EN DAT IS NIET COSMETISCH ───────────────────
 *
 * Deze lijst stond hier eerder en is op 3 augustus 2026 verwijderd, omdat hij
 * bij meerdere clusters opliep tot tientallen regels in één kaart. Toen werd het
 * overzicht zélf de rommel die het moest oplossen (`docs/logbook.md` §13). Hij
 * komt nu terug met een harde grens: **maximaal vijf regels**, alleen de staat
 * `nu`, met een doorklik naar de rest. Zonder die grens herhalen we de fout.
 *
 * ── ⚠️ ÉÉN PRIMAIRE KNOP, EN DIE HOORT BIJ DE KLANT ─────────────────────────
 *
 * Er stond er geen enkele. De enige verzadigde kleur op het scherm was een chip,
 * en een chip is een etiket, geen knop: het scherm vroeg dus nergens om een
 * klik. De primaire knop staat nu bij wat er op de klant wacht, want dat is het
 * enige waar hij vandaag iets aan kan doen. De eerste kans krijgt bewust
 * `btn-outline` en niet nog een primaire knop.
 *
 * ── ⚠️ IN DE EERSTE MAAND VALT DE VERDIEPING WEG ────────────────────────────
 *
 * Bij één meting en zonder contentplan stonden hier drie mijlpalen op nul, vier
 * voortgangsbalken op nul en een ingeklapt blok zonder inhoud. Dat is het eerste
 * beeld dat een nieuwe klant van het product krijgt, en het meldde vooral wat er
 * nog niet was. Zie `isEersteMaand` in `lib/overview.ts`.
 *
 * ── ⚠️ HET LAATSTE BLOK SUGGEREERT GEEN AUTONOMIE ───────────────────────────
 *
 * "Wat ORBIT ENGINE deze week deed" komt uit de takenwachtrij en niet uit een
 * animatie. Het product is sales-led: de beheerder start betaald werk, de klant
 * keurt per stap goed. Zie `lib/activity.ts`.
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

/** Hoe ver terug het activiteitenblok kijkt. Een week, want de kop belooft een week. */
const ACTIVITEIT_DAGEN = 7;

/** De harde grens op de wachtrij. Zie de waarschuwing hierboven. */
const MAX_WACHTRIJ = 5;

/** Hoeveel activiteitsregels er open staan voordat de rest inklapt. */
const ACTIVITEIT_ZICHTBAAR = 5;

/**
 * Hoeveel regels er in totaal te zien zijn, uitgeklapt.
 *
 * ⚠️ Een harde grens, om dezelfde reden als `MAX_WACHTRIJ`. `activiteit()`
 * groepeert per taaksoort en er zijn er 32 (`lib/jobs/types.ts`), dus in een
 * drukke week kan deze lijst zonder grens langer worden dan al het andere op de
 * pagina samen. Dit blok is het enige waar geen handeling uit volgt; het hoort
 * nooit het langste te zijn.
 */
const ACTIVITEIT_MAX = 15;

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

  const [{ analyses, work }, gepubliceerd, lus, { data: planRow }] = await Promise.all([
    loadWorkAcross(supabase, user.id),
    loadGepubliceerd(admin, id),
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

  // ── De vier cijfers bovenaan ─────────────────────────────────────────────
  //
  // ⚠️ Het zichtbaarheidspercentage stond hier tot 26 augustus 2026 als
  // hoofdgetal. Zie `overzichtCijfers()` in `lib/overview.ts` voor waarom het
  // verhuisd is naar Analytics en wat ervoor in de plaats komt.
  //
  // De meetreeks blijft nodig: hij bepaalt hoe vers de kop is en of dit merk nog
  // in zijn eerste maand zit. `lus.periods` komt uit dezelfde bundel als de
  // inzichten, dus dit scherm doet zijn eigen scorequery niet.
  const periodes = lus.periods;
  const laatste = periodes.length > 0 ? periodes[periodes.length - 1] : null;
  const cijfers = overzichtCijfers({
    gepubliceerd,
    clusters: eigenClusters.length,
    nieuwePaginas: lus.opportunities.filter((o) => o.handeling === "nieuwe_pagina").length,
    optimalisaties: lus.opportunities.filter((o) => o.handeling === "pagina_bijwerken").length,
  });

  // ── De wachtrij, alleen wat op de klant wacht ────────────────────────────
  const eigenWerk = sortWork(work.filter((w) => eigenIds.has(w.analysisId) && w.state === "nu"));
  const wachtrij = eigenWerk.slice(0, MAX_WACHTRIJ);
  const restWachtrij = eigenWerk.length - wachtrij.length;

  // ── Het plan ─────────────────────────────────────────────────────────────
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

  // ── Wat ORBIT ENGINE deze week deed ──────────────────────────────────────
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
  const nu = new Date();
  const eersteMaand = isEersteMaand({
    metingen: periodes.length,
    geplandePaginas: totalen.gepland,
  });

  return (
    // ⚠️ 32 pixels tussen de secties en 12 binnen een sectie. Het was overal 24,
    // dus nergens was in witruimte uitgedrukt dat zes kansen bij elkaar horen en
    // het opbrengstblok een nieuw hoofdstuk is.
    <div className="flex flex-col gap-8">
      {/* ── Kop ────────────────────────────────────────────────────────────
          ⚠️ Geen cijfer in de subkop. Het hoofdgetal staat één blok lager, en
          twee keer hetzelfde getal in twee formuleringen laat de klant zoeken
          welke van de twee nu de echte is (`docs/ux-design.md` §1).

          De beschrijving was een opsomming van de blokken eronder ("hoe
          zichtbaar je bent, wat er op je wacht en waar je begint"), dus hij zei
          op elk bezoek hetzelfde. Nu zegt hij of dit bezoek iets nieuws
          oplevert. */}
      <PageHeader
        eyebrow={lopendeMaand > 0 ? `Maand ${lopendeMaand} sinds de start` : undefined}
        title={merknaam}
        description={versheidsregel({
          metingen: periodes.length,
          gemetenOp: laatste?.gemetenOp ?? null,
          now: nu,
        })}
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
              <Icon naam="naar" size={14} />
            </Link>
          )}
        </div>
      )}

      {/* ── 1. De stand: vier tellingen, en wat de meting ervan zegt ───────
          ⚠️ Hier stond tot 26 augustus 2026 het zichtbaarheidspercentage als
          hoofdgetal, met de marge, het verschil en het verloop eromheen. Zie
          `overzichtCijfers()` in `lib/overview.ts` voor het waarom van de
          verhuizing. De duiding blijft: de drie zinnen van `insights()` gaan nog
          steeds over de meting, en de knop ernaast gaat naar het cijfer zelf. */}
      <SectionErrorBoundary label="Je programma">
        <div className={`card ${railKlasse(lus.insights)} flex flex-col gap-5`}>
          <CijferRij cijfers={cijfers} />

          <div className="flex flex-wrap items-start justify-between gap-4 border-t border-[var(--border-subtle)] pt-4">
            <div className="min-w-0 flex-1">
              <InsightLines insights={lus.insights} />
            </div>
            <Link
              href={
                laatste === null
                  ? `/merk/${id}/strategie/clusters`
                  : `/merk/${id}/analytics`
              }
              className="btn-outline shrink-0"
            >
              {/* Het icoon van het hoofdstuk waar de knop heen gaat: Strategie
                  of Analytics, dezelfde tekening als in de zijbalk. Zo wijst de
                  knop naar een plek die de klant herkent voordat hij klikt, in
                  plaats van naar een woord. */}
              <Icon naam={laatste === null ? "strategie" : "analytics"} size={18} />
              {laatste === null ? "Naar je clusters" : "Bekijk je zichtbaarheid"}
            </Link>
          </div>
        </div>
      </SectionErrorBoundary>

      {/* ── 2. Wat er nu op jou wacht ───────────────────────────────────────
          Maximaal vijf regels. Zie de waarschuwing bovenaan dit bestand. */}
      <SectionErrorBoundary label="Wat er op je wacht">
        <div className="flex flex-col gap-3">
          <SectionHeading
            title={
              eigenWerk.length === 0
                ? "Er wacht niets op jou"
                : eigenWerk.length === 1
                  ? "Eén ding wacht op jou"
                  : `${eigenWerk.length} dingen wachten op jou`
            }
          />
          {wachtrij.length === 0 ? (
            <div className="card">
              <p className="text-secondary">
                ORBIT ENGINE meet maandelijks door en laat het weten zodra er iets beweegt.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {wachtrij.map((w) => (
                <li key={w.id}>
                  <WachtrijKaart item={w} />
                </li>
              ))}
              {restWachtrij > 0 && (
                <li>
                  <Link
                    href={`/merk/${id}/strategie/clusters`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                  >
                    Nog {restWachtrij} {restWachtrij === 1 ? "punt" : "punten"} in je clusters
                    <Icon naam="naar" size={14} />
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
        <div className="flex flex-col gap-3">
          <SectionHeading title="Waar je begint" />
          <OpportunitiesBlock
            opportunities={lus.opportunities}
            restHref={`/merk/${id}/strategie/clusters`}
          />
        </div>
      </SectionErrorBoundary>

      {/* ── De verdieping ──────────────────────────────────────────────────
          In de eerste maand staan hier alleen nullen, en dat is precies het
          moment waarop een nieuwe klant besluit of dit serieus is. Dan één
          regel over wat er gaat gebeuren, en verder niets. */}
      {eersteMaand ? (
        <p className="text-sm text-muted">
          ORBIT ENGINE meet opnieuw op{" "}
          {volgendeMeting(nu).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          })}
          . Dan staat hier wat je zichtbaarheid gedaan heeft, en hoe ver je contentplan is.
        </p>
      ) : (
        <>
          {/* ── 4. Het contentplan, over de volle breedte ───────────────────
              ⚠️ Stond tot 26 augustus 2026 in een kolom van de helft, naast het
              activiteitenblok. Dat was ooit bedoeld om twee smalle blokken te
              laten passen, maar het plan is het enige blok met vier soorten
              inhoud (voortgang, fases, mix, reservepagina's) en het werd daar
              geknepen. Over de volle breedte staan de voortgang en de mix naast
              elkaar in plaats van onder elkaar. */}
          <SectionErrorBoundary label="Je contentplan">
            <div className="flex flex-col gap-3">
              <SectionHeading title="Je contentplan" />
              {funnel.length === 0 || totalen.gepland === 0 ? (
                <LeegPlan id={id} />
              ) : (
                <PlanKaart
                  funnel={funnel}
                  mix={mix}
                  totalen={totalen}
                  gepubliceerdTotaal={gepubliceerd}
                />
              )}
            </div>
          </SectionErrorBoundary>

          {/* ── 5. Wat ORBIT ENGINE deed ────────────────────────────────────
              Eronder en niet ernaast, ook over de volle breedte: een lijst van
              korte regels met een tijdstip rechts leest beter breed dan smal,
              want dan valt het tijdstip niet op een eigen regel. */}
          <SectionErrorBoundary label="Wat ORBIT ENGINE deze week deed">
            <div className="flex flex-col gap-3">
              <SectionHeading title="Wat ORBIT ENGINE deed" meta="Afgelopen week" />
              <ActiviteitKaart regels={regels} />
            </div>
          </SectionErrorBoundary>
        </>
      )}
    </div>
  );
}

/**
 * De vier cijfers boven aan het scherm, over de volle breedte van hun kaart.
 *
 * ── ⚠️ VIER KOLOMMEN IN ÉÉN KAART, GEEN VIER KAARTEN ────────────────────────
 *
 * Zelfde vorm als het opbrengstblok dat hier tot 26 augustus 2026 onderaan stond:
 * één kaart met scheidingslijnen ertussen. Vier kaders naast elkaar die samen
 * één ding zeggen, is de kaartinflatie waar `docs/ux-design.md` §1 voor
 * waarschuwt. Op mobiel zakken ze naar twee kolommen, want vier getallen naast
 * elkaar op 375 pixels is per kolom nog geen 90 pixels.
 *
 * ⚠️ De getallen staan in `stat-value` (cijfermono, tabellarisch), zodat ze
 * onder elkaar uitlijnen als er een cijfer bij komt. De labels niet: die zijn
 * tekst.
 */
function CijferRij({ cijfers }: { cijfers: OverzichtCijfer[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
      {cijfers.map((c, i) => (
        <div
          key={c.label}
          className={`flex min-w-0 flex-col gap-0.5 ${
            // De scheidingslijn hoort tussen de kolommen en niet eromheen. Op
            // twee kolommen valt hij op de even posities, op vier op alles
            // behalve de eerste.
            i % 2 === 1 ? "border-l border-[var(--border-subtle)] pl-6" : ""
          } ${i > 0 ? "lg:border-l lg:border-[var(--border-subtle)] lg:pl-6" : "lg:border-l-0 lg:pl-0"}`}
        >
          <span className="stat-value text-3xl">{c.waarde}</span>
          <span className="text-sm font-medium">{c.label}</span>
          <span className="text-sm text-muted">{c.detail}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Eén regel werk dat op de klant wacht.
 *
 * ── ⚠️ DE HELE KAART WAS EEN LINK, MET EEN CHIP ERIN (25 AUGUSTUS 2026) ─────
 *
 * Twee dingen gingen daar mis. De chip rechts ("Beantwoorden") was de enige
 * verzadigde kleur van het hele scherm, dus de blik ging er als eerste heen,
 * maar een chip is een etiket: hij zag eruit als een status en niet als een
 * knop. En onder de titel stond `analysisName`, wat in de praktijk een rauw
 * adres in hoofdletters is ("HTTPS://GASSERVICE-BRABANT.NL · CV-KETEL
 * ONDERHOUD"), terwijl `WorkItem.why` de zin bevat die zegt waaróm dit ertoe
 * doet. Het scherm toonde het minst bruikbare veld en gooide het bruikbaarste
 * weg.
 *
 * Nu: de zin staat er, de handeling is een echte knop, en de kaart zelf is geen
 * link meer. Eén doel per regel, en geen knop genest in een link.
 */
function WachtrijKaart({ item }: { item: WorkItem }) {
  // ⚠️ De toon van de soort werk zit nu op de KAART en niet meer op een chip.
  // Alle vijf de werksoorten stonden ooit op amber, waardoor een cluster dat
  // niet gelukt is er precies zo uitzag als een pagina die nagekeken moet
  // worden (`docs/ux-design.md` §2). Dat onderscheid blijft, maar het draagt
  // nu verder: een blokkade kleurt zijn hele rand in plaats van één etiket van
  // 60 pixels, en de soort staat er in woorden bij.
  const blokkerend = workChipTone(item.kind) === "danger";

  return (
    <div className={`card ${blokkerend ? "card-danger" : ""} flex flex-wrap items-start gap-4`}>
      {/* De soort werk, links van de titel. De knop rechts zegt wat je gaat
          DOEN, deze tekening zegt waar het OVER gaat (`lib/work.ts`,
          `workKindIcon`). In de leeskleur, want het icoon versnelt het
          terugvinden en draagt de betekenis niet (`docs/designsystem.md`
          §6b.3). */}
      <span className="pt-0.5 text-secondary">
        <Icon naam={workKindIcon(item.kind)} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{item.title}</span>
          {blokkerend && <span className="chip chip-danger">{WORK_KIND_LABEL[item.kind]}</span>}
        </span>
        <span className="text-sm text-secondary">{item.why}</span>
        {item.meta && <span className="mono-label">{item.meta}</span>}
      </div>
      {/* De enige primaire knop van dit scherm. Zie de waarschuwing bovenaan. */}
      <Link href={item.href} className="btn-primary btn-sm shrink-0">
        {item.actionLabel ?? "Bekijken"}
        <Icon naam="naar" size={14} />
      </Link>
    </div>
  );
}

/**
 * Het contentplan: hoe ver is het, en waar zit het.
 *
 * ── ⚠️ VIER VOORTGANGSBALKEN WERDEN ÉÉN (25 AUGUSTUS 2026) ──────────────────
 *
 * Elke funnelfase had een eigen balk over de volle breedte. Bij Gasservice
 * Brabant stonden die alle vier op 0%, dus er stonden vier lege grijze banen
 * onder elkaar en vijf keer het woord nul. Een voortgangsbalk die nul toont,
 * toont niets: het cijfer ernaast zei het al.
 *
 * Nu draagt één balk de voortgang van het hele plan, en staan de fases eronder
 * als tellingen. Dat is dezelfde informatie in een derde van de hoogte, en het
 * scheelt de tweede gestapelde balk pal naast de contentmix, die er al staat en
 * wél een verdeling toont.
 */
function PlanKaart({
  funnel,
  mix,
  totalen,
  gepubliceerdTotaal,
}: {
  funnel: ReturnType<typeof funnelVoortgang>;
  mix: ReturnType<typeof contentMix>;
  totalen: ReturnType<typeof planTotalen>;
  gepubliceerdTotaal: number;
}) {
  const percentage = totalen.gepland > 0 ? (totalen.geplaatst / totalen.gepland) * 100 : 0;

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {/* ⚠️ Twee tellingen die elkaar tegenspraken, staan nu naast elkaar met
            hun verschil erbij (`lib/overview.ts`, `planRegels`). */}
        {planRegels({
          gepland: totalen.gepland,
          geplaatst: totalen.geplaatst,
          gepubliceerdTotaal,
        }).map((regel, i) => (
          <p key={i} className={i === 0 ? "text-secondary" : "text-sm text-muted"}>
            {regel}
          </p>
        ))}
        <span
          className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)]"
          style={{ background: "var(--bg-elevated)" }}
        >
          <span
            className="block h-full rounded-[var(--radius-pill)]"
            style={{ width: `${percentage}%`, background: "var(--intent-growth-solid)" }}
          />
        </span>
      </div>

      {/* ⚠️ Twee kolommen sinds 26 augustus 2026, want dit blok staat nu over de
          volle breedte. De fases en de mix onder elkaar zetten op 940 pixels
          levert twee regels met heel veel wit ertussen op; naast elkaar vullen
          ze de breedte en blijft de kaart half zo hoog. */}
      <div className="grid gap-x-8 gap-y-4 border-t border-[var(--border-subtle)] pt-4 md:grid-cols-2">
        {/* De funnel houdt zijn eigen volgorde, ook als een fase leeg is
            (`lib/plan-progress.ts`). Als telling, niet als balk: een fase van
            nul is geen achterstand om te tekenen. */}
        <div className="flex flex-col gap-2">
          <span className="mono-label">Per fase van de klantreis</span>
          <ul className="flex flex-col gap-2">
            {funnel.map((f) => (
              <li key={f.label} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{f.label}</span>
                <span className="mono-label">
                  {f.gepland === 0 ? "niets gepland" : `${f.geplaatst} van de ${f.gepland}`}
                </span>
              </li>
            ))}
          </ul>
        </div>

      {mix.length > 0 && (
        <div className="flex flex-col gap-3">
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
    </div>
  );
}

/**
 * Wat ORBIT ENGINE deze week deed.
 *
 * ── ⚠️ HET WAS ÉÉN INGEKLAPTE BALK NAAST EEN KAART VAN 500 PIXELS ───────────
 *
 * De rechterkolom bestond uit één dichte accordeon met daaronder een gat van
 * zo'n 400 pixels. Dat oogt als een fout in de indeling, niet als een keuze. De
 * regels zijn er wel: het waren er tien bij Gasservice Brabant.
 *
 * Nu staan de eerste drie open en klapt de rest uit. Het blok vult zijn kolom
 * met informatie die er al was, in plaats van hem leeg te laten.
 *
 * ⚠️ Nog steeds geen animatie en geen voortgangsbalk die uit zichzelf beweegt.
 * Het product is sales-led en dit blok belooft geen autonomie (`lib/activity.ts`).
 */
function ActiviteitKaart({ regels }: { regels: ReturnType<typeof activiteit> }) {
  if (regels.length === 0) {
    return (
      <div className="card flex flex-col gap-1">
        <span className="mono-label">Deze week niets gedraaid</span>
        <p className="text-secondary">
          Er stond geen werk klaar. De volgende meetronde staat gepland voor de eerste van
          de maand.
        </p>
      </div>
    );
  }

  const open = regels.slice(0, ACTIVITEIT_ZICHTBAAR);
  const rest = regels.slice(ACTIVITEIT_ZICHTBAAR, ACTIVITEIT_MAX);
  const buitenBeeld = Math.max(0, regels.length - ACTIVITEIT_MAX);

  return (
    <div className="card flex flex-col gap-4">
      <ActiviteitRegels regels={open} />
      {rest.length > 0 && (
        <CollapsibleSection
          title="Ouder werk van deze week"
          badge={rest.length === 1 ? "1 soort werk" : `${rest.length} soorten werk`}
          defaultOpen={false}
        >
          <ActiviteitRegels regels={rest} />
          {buitenBeeld > 0 && (
            <p className="text-sm text-muted">
              Er draaide nog {buitenBeeld} {buitenBeeld === 1 ? "andere soort" : "andere soorten"}{" "}
              werk deze week.
            </p>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}

function ActiviteitRegels({ regels }: { regels: ReturnType<typeof activiteit> }) {
  return (
    <ul className="flex flex-col gap-2">
      {regels.map((r) => (
        <li key={r.tekst} className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 text-sm text-secondary">
            ORBIT ENGINE {r.tekst}
            {r.aantal > 1 && <span className="text-muted"> ({r.aantal}×)</span>}
          </span>
          {/* Alleen de tijd, zonder "laatst bijgewerkt" ervoor: in een lijst van
              tien regels is dat voorvoegsel tien keer hetzelfde woord. De
              volledige datum staat in de tooltip. */}
          <span className="mono-label shrink-0" title={formatDateShort(r.laatst)}>
            {formatRelativeTime(r.laatst)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * De tint van de stang links op de standkaart.
 *
 * ── WAAROM DE KLEUR NIET VASTSTAAT ──────────────────────────────────────────
 *
 * De stang markeert het hoofdgetal van dit scherm, en dat mag geen versiering
 * zijn: `docs/designsystem.md` §2.3 zegt dat een kleur een betekenis draagt.
 * Een vaste groene stang boven een zichtbaarheid van 8% zou dus een uitspraak
 * doen die het cijfer niet waarmaakt.
 *
 * De eerste zin van `insights()` is precies de duiding bij dít getal: hij zegt
 * of de score écht gestegen is, écht gedaald, of binnen de meetruis bleef
 * (`lib/insights.ts`). Die toon bepaalt de tint. Zonder inzichten, of bij een
 * eerste meting, blijft de stang grijs: hij markeert dan wél waar je moet
 * kijken, maar belooft niets over de richting.
 *
 * ⚠️ Er is precies één stang per scherm, plus die op de eerste kans in
 * `OpportunitiesBlock`. Een derde en de stang markeert niets meer.
 */
function railKlasse(inzichten: Insight[]): string {
  const toon = inzichten[0]?.toon;
  if (toon === "goed") return "card-rail-success";
  if (toon === "let_op") return "card-rail-warning";
  return "card-rail";
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
        <Icon naam="strategie" size={18} />
        Naar het contentplan
      </Link>
    </div>
  );
}
