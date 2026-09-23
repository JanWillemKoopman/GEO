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
import { InsightLines } from "@/components/loop-blocks";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ProfileProgress } from "./_components/profile-progress";
import { InfoHint } from "@/components/info-hint";
import { loadContentTotalen, loadMaandBronnen } from "@/lib/overview-data";
import { loadLoop } from "@/lib/insights-data";
import { loadBrandWork, sortWork } from "@/lib/work";
import { groepeerPerSectie } from "@/lib/wachtrij";
import { WachtrijLijst } from "./_components/wachtrij-lijst";
import { enkelOfMeervoud } from "@/lib/format";
import {
  isEersteMaand,
  overzichtCijfers,
  totalenKop,
  type OverzichtCijfer,
  planRegels,
  versheidsregel,
  volgendeMeting,
} from "@/lib/overview";
import { contentMix, planTotalen, type VoortgangPagina } from "@/lib/plan-progress";
import { Icon } from "@/components/icon";
import { ronde } from "@/lib/ronde";
import { RondeBalk } from "./_components/ronde-balk";
import { confidenceBand, changeIsMeaningful } from "@/lib/stats/uncertainty";
import { poolRecent, describePooled } from "@/lib/stats/pooling";

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

  const [{ analyses, work }, contentTotalen, lus, { data: planRow }] = await Promise.all([
    loadBrandWork(supabase, user.id, id),
    loadContentTotalen(admin, id),
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

  // ⚠️ `loadBrandWork` haalt sinds 27 augustus 2026 alléén dit merk op, dus hier
  // valt niets meer te filteren. Dat is het punt: de grens staat in de query en
  // niet in een filter dat een volgend scherm kan vergeten.
  const eigenClusters = analyses;

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
  //
  // ⚠️ Sinds 28 augustus 2026 tellen drie van de vier cijfers wat er GEMAAKT is
  // en niet meer wat er voorgesteld is. "Nieuwe pagina's" en "Optimalisaties"
  // kwamen hiervoor uit `lus.opportunities`, dus uit de kansenlijst: bij Van den
  // Udenhout stond de rij daardoor op 0 · 0 · 7 · 5 terwijl er nog niets gedaan
  // was. Die voorstellen staan nog steeds op dit scherm, in het kansenblok
  // eronder, want dáár gaan ze over wat je kunt doen.
  const gepubliceerd = contentTotalen.gepubliceerd;
  const cijfers = overzichtCijfers({
    clusters: eigenClusters.length,
    geschreven: contentTotalen.geschreven,
    geoptimaliseerd: contentTotalen.geoptimaliseerd,
    gepubliceerd,
  });

  // ── De wachtrij, alleen wat op de klant wacht, ingedeeld in de vaste
  //    secties Cluster, Contentplan, Openstaande vragen en Bibliotheek ──────
  const eigenAlleWerk = work;
  const eigenWerk = sortWork(eigenAlleWerk.filter((w) => w.state === "nu"));
  const wachtrijOverzicht = groepeerPerSectie(eigenWerk);

  // ── Wat bij ORBIT ENGINE loopt, niet bij de klant (punt 27 uit
  //    docs/tasks/nova-vergelijking-verbeterpunten.md) ─────────────────────
  //
  // `lib/work.ts` maakt dit onderscheid al in het datamodel (`WorkState`:
  // "nu" versus "loopt"/"wacht"), maar dit scherm toonde alleen "nu". Een
  // klant die hier niets ziet weet dus niet of dat komt doordat alles klaar
  // is, of doordat er iets bij ons ligt te wachten. Nova maakt dat verschil
  // met drie zichtbare emmers ("On track" / "Needs you" / "Failed"); hier
  // volstaat één teller naast de kop, want een tweede lijst zou dubbel werk
  // doen met de bestaande statuskaarten per pagina.
  const bijOns = eigenAlleWerk.filter((w) => w.state === "loopt" || w.state === "wacht").length;

  // ── Het plan ─────────────────────────────────────────────────────────────
  // ⚠️ Geen query meer op `profile_funnel_stages`: die voedde alleen "Per fase
  // van de klantreis", en dat blok is op 21 september 2026 weggehaald omdat
  // `planned_pages.funnel_stage_id` toen nooit gevuld werd (zie `PlanKaart`
  // hieronder).
  const planId = (planRow as { id: string } | null)?.id ?? null;
  const [{ data: paginaRijen }, maandBronnen] = await Promise.all([
    admin
      .from("planned_pages")
      .select("page_type, is_buffer, posted_at")
      .eq("profile_id", id),
    loadMaandBronnen(admin, id, planId),
  ]);

  const paginas = (paginaRijen ?? []) as VoortgangPagina[];
  const mix = contentMix(paginas);
  const totalen = planTotalen(paginas);

  // ── De maand bovenaan (`lib/ronde.ts`) ─────────────────────────────────────
  //
  // ⚠️ Hier stond tot 23 september 2026 ook "Maand 4 sinds de start" boven de
  // merknaam, geteld uit de vrijgegeven maanden van het contentplan. Dat is
  // een andere maandtelling dan de kalendermaand in "Je september" eronder,
  // en twee maandtellingen die iets anders betekenen op één scherm laten de
  // klant zoeken welke de echte is. De maand staat nu op één plek.
  const nu = new Date();
  const maand = ronde({
    now: nu,
    // Zonder cluster valt er niets te meten, en dan is de consultant aan zet en
    // niet ORBIT ENGINE.
    clusters: eigenClusters.length,
    metingen: periodes.map((p) => p.gemetenOp),
    kansen: lus.opportunities.length,
    ...maandBronnen,
  });

  // ⚠️ Het hoofdgetal stond tot 26 augustus 2026 hier en verhuisde toen naar
  // Analytics. Daarmee opende een meetproduct met vier productietellingen, en
  // moest de klant een klik verder voor het enige cijfer waarvoor hij betaalt.
  // Het staat nu weer bovenaan, met de marge erbij en met dezelfde
  // terughoudendheid als overal: een verschil binnen de marge is geen verschil.
  const vorige = periodes.length > 1 ? periodes[periodes.length - 2] : null;
  // ⚠️ Het hoofdgetal komt uit de laatste DRIE rondes samen, niet uit de laatste
  // alleen (20 september 2026). Eén ronde is een steekproef met een band van
  // ±16 punten bij 30 vragen, en die band is groter dan het verschil dat een
  // klant als vooruitgang of verval leest. `poolRecent()` stopt met samenvoegen
  // zodra een oudere ronde betekenisvol afwijkt, dus een échte stijging wordt
  // nooit uitgesmeerd; zie lib/stats/pooling.ts.
  const samengevoegd = poolRecent(periodes);
  const band = samengevoegd ? confidenceBand(samengevoegd.score, samengevoegd.stderr) : null;
  const verschil =
    laatste && vorige
      ? changeIsMeaningful(
          { score: laatste.score, stderr: laatste.stderr },
          { score: vorige.score, stderr: vorige.stderr },
        )
      : null;

  const merknaam = profile.brand_name ?? profile.name;
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
        title={merknaam}
        description={versheidsregel({
          metingen: periodes.length,
          gemetenOp: laatste?.gemetenOp ?? null,
          now: nu,
        })}
      />

      {/* ── De maand ───────────────────────────────────────────────────────
          Het eerste blok van de app, en met opzet vóór de cijfers: eerst wat
          er deze maand gedaan is en nog moet, dan pas hoe het ervoor staat.
          Zie `lib/ronde.ts`. */}
      <SectionErrorBoundary label={`Je ${maand.maand}`}>
        <RondeBalk ronde={maand} />
      </SectionErrorBoundary>

      {/* ── De fase, alleen voor jou (deel B4) ────────────────────────────
          Een smalle regel en geen kaart: dit is stafinformatie en hoort niet
          even zwaar te wegen als de stand van het merk eronder. */}
      {fase && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] px-4 py-2.5">
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
          steeds over de meting, en de knop ernaast gaat naar het cijfer zelf.

          ⚠️ De stang links is sinds 21 september 2026 altijd groen (#25a750) en
          niet meer afhankelijk van `insights()`. Dit is het hoofdgetal van het
          hele scherm en verdient dezelfde nadruk ongeacht de richting van de
          laatste meting; `railKlasse()` bestaat daarom niet meer. */}
      <SectionErrorBoundary label="Je programma">
        <div
          className="card card-rail flex flex-col gap-5"
          style={{ borderLeftColor: "#25a750" }}
        >
          {laatste && band && samengevoegd && (
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-[var(--border-subtle)] pb-5">
              {/* ⚠️ Weer een percentage als hoofdgetal (21 september 2026), na
                  de band-in-antwoorden van 20 september. De marge staat er nog
                  wel bij, in de regel eronder. */}
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="mono-label">Zichtbaarheid in AI</span>
                <span className="stat-value text-5xl">{samengevoegd.score}%</span>
                <span className="text-sm text-muted">
                  AI-antwoorden waarin je merk voorkomt
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
                <span className="flex flex-wrap items-center gap-2">
                  {/* Een verandering binnen de onzekerheidsmarge is geen
                      verandering. Hem tonen als winst is de belofte die het
                      product niet kan waarmaken. Zelfde regel als op
                      Analytics. */}
                  {verschil?.changed ? (
                    <span className={verschil.delta > 0 ? "chip chip-success" : "chip chip-danger"}>
                      <Icon naam={verschil.delta > 0 ? "stijging" : "daling"} size={12} />
                      {Math.abs(Math.round(verschil.delta))} sinds de vorige meting
                    </span>
                  ) : (
                    <span className="chip chip-neutral">
                      {vorige === null ? "eerste meting" : "gelijk gebleven"}
                    </span>
                  )}
                  {laatste.vragen > 0 && (
                    <span className="mono-label">over {laatste.vragen} vragen</span>
                  )}
                </span>
                {band.margin > 0 && (
                  <span className="text-sm text-muted">
                    Met een marge van {band.low}% tot {band.high}%. {describePooled(samengevoegd)}
                  </span>
                )}
              </div>
            </div>
          )}

          <CijferRij cijfers={cijfers} kop={totalenKop()} />

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

      {/* ── 2. Wat er nu op jou wacht, ingedeeld naar Cluster, Contentplan,
          Openstaande vragen en Bibliotheek. Zie `lib/wachtrij.ts`. */}
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
            meta={bijOns > 0 ? `Bij ORBIT ENGINE · ${bijOns}` : undefined}
          />
          {eigenWerk.length === 0 ? (
            <div className="card">
              <p className="text-secondary">
                {bijOns > 0
                  ? `ORBIT ENGINE is bezig met ${bijOns} ${enkelOfMeervoud(bijOns, "taak", "taken")}. Je hoeft daar niets voor te doen; ORBIT ENGINE laat het weten zodra er iets beweegt.`
                  : "ORBIT ENGINE meet maandelijks door en laat het weten zodra er iets beweegt."}
              </p>
            </div>
          ) : (
            <WachtrijLijst overzicht={wachtrijOverzicht} />
          )}
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
        /* ── 3. Het contentplan, over de volle breedte ─────────────────────
            ⚠️ Stond tot 26 augustus 2026 in een kolom van de helft, naast het
            activiteitenblok dat op 21 september 2026 helemaal is verdwenen
            (`docs/logbook.md`, "Wat ORBIT ENGINE deed"). Over de volle breedte
            staan de voortgang en de mix naast elkaar in plaats van onder
            elkaar. */
        <SectionErrorBoundary label="Je contentplan">
          <div className="flex flex-col gap-3">
            <SectionHeading title="Je contentplan" />
            {totalen.gepland === 0 ? (
              <LeegPlan id={id} />
            ) : (
              <PlanKaart mix={mix} totalen={totalen} gepubliceerdTotaal={gepubliceerd} />
            )}
          </div>
        </SectionErrorBoundary>
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
function CijferRij({ cijfers, kop }: { cijfers: OverzichtCijfer[]; kop: string }) {
  return (
    <div className="flex flex-col gap-3">
      {/* ⚠️ Deze regel is geen versiering. Drie van de vier getallen gaan over de
          hele looptijd van de klant, en zonder die regel leest iemand met twaalf
          geschreven pagina's ze als "deze maand". Het eerste cijfer is de
          uitzondering, en dat staat in zijn eigen toelichting ("Nu actief"):
          een tweede regel erbij om die uitzondering uit te leggen zou meer
          uitleg zijn dan de rij zelf. */}
      <span className="mono-label">{kop}</span>
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
 * ── ⚠️ "PER FASE VAN DE KLANTREIS" IS OP 21 SEPTEMBER 2026 VERWIJDERD ───────
 *
 * Dat blok stond hier tot vandaag, en toonde bij ÉLK merk "niets gepland" voor
 * alle vier fasen, ook bij een plan van 18 pagina's. Nagerekend op productie:
 * `planned_pages.funnel_stage_id` staat op nul rijen ingevuld. Sinds de
 * jaarverdeling op 25 augustus 2026 verdween (`createPlan()` in `lib/plans.ts`)
 * kiest niets in de pijplijn nog een fase per pagina; de kolom bestaat nog,
 * maar wordt nergens meer geschreven. Een blok dat gegarandeerd "niets
 * gepland" zegt terwijl er wél gepland is, is een grotere leugen dan geen
 * blok.
 *
 * Sinds 23 september 2026 vult `syncBacklog()` de fase wel, uit de doelvragen
 * van de pagina (`lib/plan-funnel.ts`). Het blok komt toch niet terug: op
 * productie kreeg 32 van de 42 pagina's een fase, de rest heeft een gelijkspel
 * tussen twee fasen, en een los toegevoegde pagina heeft geen doelvragen. Een
 * telling per fase zou dus nog steeds te laag uitvallen.
 *
 * Nu draagt één balk de voortgang van het hele plan (wat ervan live staat),
 * met daarboven een tweede balk voor de omvang van het plan zelf (hoeveel
 * pagina's er in totaal ingepland staan). De mix eronder staat over de volle
 * breedte in plaats van naast een kapotte kolom.
 */
function PlanKaart({
  mix,
  totalen,
  gepubliceerdTotaal,
}: {
  mix: ReturnType<typeof contentMix>;
  totalen: ReturnType<typeof planTotalen>;
  gepubliceerdTotaal: number;
}) {
  const percentage = totalen.gepland > 0 ? (totalen.geplaatst / totalen.gepland) * 100 : 0;

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {/* De omvang van het plan: hoeveel pagina's staan er in totaal
            ingepland, los van hoeveel daarvan al live staan. */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="mono-label">Aantal ingeplande pagina&apos;s</span>
            <span className="text-sm font-medium">
              {totalen.gepland} {totalen.gepland === 1 ? "pagina" : "pagina's"}
            </span>
          </div>
          <span
            className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)]"
            style={{ background: "var(--bg-elevated)" }}
          >
            <span
              className="block h-full rounded-[var(--radius-pill)]"
              style={{ width: "100%", background: "var(--border-emphasis)" }}
            />
          </span>
        </div>

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
            style={{ width: `${percentage}%`, background: "var(--trend-up)" }}
          />
        </span>
      </div>

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
        <Icon naam="strategie" size={18} />
        Naar het contentplan
      </Link>
    </div>
  );
}
