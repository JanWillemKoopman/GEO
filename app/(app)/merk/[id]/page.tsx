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
import { loadContentTotalen, loadMaandBronnen } from "@/lib/overview-data";
import { loadLoop } from "@/lib/insights-data";
import { loadBrandWork, sortWork } from "@/lib/work";
import { groepeerPerSectie } from "@/lib/wachtrij";
import { WachtrijLijst } from "./_components/wachtrij-lijst";
import { enkelOfMeervoud } from "@/lib/format";
import { totalenZin, versheidsregel } from "@/lib/overview";
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
 * ── ⚠️ HET SCHERM EINDIGT BIJ WAT ER OP JE WACHT (23 september 2026) ────────
 *
 * Onder de wachtrij stond "Je contentplan": twee voortgangsbalken en de mix van
 * paginatypes. Bij Van den Udenhout zei dat blok "18 pagina's gepland, nog geen
 * live", terwijl de ronde bovenaan al "18 ingepland" en de cijferrij "0
 * gepubliceerd" meldde. Drie keer hetzelfde feit, en het laatste blok van het
 * scherm trok de aandacht weg van de taken erboven. Het contentplan zelf staat op
 * Strategie → Contentplan. Daarmee verviel ook de regel voor de eerste maand
 * (`isEersteMaand`): die kondigde alleen aan wat dat blok later zou tonen, en de
 * datum van de volgende meting staat al onder de merknaam.
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

  // De meetreeks bepaalt hoe vers de kop is en wat het hoofdgetal zegt.
  // `lus.periods` komt uit dezelfde bundel als de inzichten, dus dit scherm doet
  // zijn eigen scorequery niet.
  const periodes = lus.periods;
  const laatste = periodes.length > 0 ? periodes[periodes.length - 1] : null;

  // ⚠️ Hier stond tot de UX-audit van 23 september 2026 (P1.1) een rij van vier
  // grote tellingen. Het zijn nu dezelfde vier getallen in één zin, zie
  // `totalenZin()` in `lib/overview.ts` voor het waarom.
  const totalen = totalenZin({
    clusters: eigenClusters.length,
    geschreven: contentTotalen.geschreven,
    geoptimaliseerd: contentTotalen.geoptimaliseerd,
    gepubliceerd: contentTotalen.gepubliceerd,
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
  // ⚠️ Geen query meer op `profile_funnel_stages` (weggehaald 21 september
  // 2026) en sinds 23 september 2026 ook niet meer op alle `planned_pages` van
  // dit merk: die voedden alleen het contentplanblok, dat van dit scherm is, en
  // `totalen.gepland` in de ronde. De ronde haalt nu zelf alleen het lopende
  // plan op (`loadMaandBronnen`).
  const planId = (planRow as { id: string } | null)?.id ?? null;
  const maandBronnen = await loadMaandBronnen(admin, id, planId);

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

  // Wat er op de klant wacht, als die lijst leeg is: één regel onder het cijfer
  // in plaats van een eigen blok met een kop die zegt dat er niets is.
  const rustRegel =
    bijOns > 0
      ? `Er wacht niets op jou. ORBIT ENGINE is bezig met ${bijOns} ${enkelOfMeervoud(bijOns, "taak", "taken")} en laat het weten zodra er iets beweegt.`
      : "Er wacht niets op jou. ORBIT ENGINE meet maandelijks door en laat het weten zodra er iets beweegt.";

  return (
    // ⚠️ 32 pixels tussen de secties en 12 binnen een sectie.
    //
    // ── DE VOLGORDE (UX-AUDIT 23 SEPTEMBER 2026, P1.1) ──────────────────────
    //
    // Kop, dan wat er op jou wacht, dan het cijfer, dan de maand. Tot die dag
    // stond de wachtrij onderaan, onder de maandbalk en een kaart met score,
    // marge, vier tellers, drie inzichtzinnen en een knop. Dit is het scherm
    // van elke sessie, en de enige handeling die de klant hier kan doen zakte
    // onder twee drukke blokken. De maandbalk stond bovenaan sinds 27 augustus
    // 2026 ("eerst hoe het werkt"); hij blijft, maar als naslag onderaan: wie
    // wil weten waar het toe leidt, scrolt; wie iets moet doen, hoeft dat niet.
    <div className="flex flex-col gap-8">
      {/* ── Kop ────────────────────────────────────────────────────────────
          Geen cijfer in de subkop: het hoofdgetal staat verderop, en twee keer
          hetzelfde getal laat de klant zoeken welke de echte is. De regel zegt
          hoe vers de meting is (`docs/ux-design.md` §5). */}
      <PageHeader
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
        <div className="vlak flex flex-wrap items-center justify-between gap-3 py-2">
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

      {/* ── 1. Wat er nu op jou wacht ─────────────────────────────────────
          Alleen als er iets is. Ingedeeld naar Cluster, Contentplan,
          Openstaande vragen en Bibliotheek, zie `lib/wachtrij.ts`. De ene
          primaire knop van het scherm staat op de dringendste regel. */}
      {eigenWerk.length > 0 && (
        <SectionErrorBoundary label="Wat er op je wacht">
          <div className="flex flex-col gap-3">
            <SectionHeading
              title="Wat er op jou wacht"
              badge={
                // Neutraal en niet groen (P2.1): groen betekent "gelukt", en
                // open werk is dat nog niet.
                <span className="chip chip-neutral">
                  {eigenWerk.length} open {enkelOfMeervoud(eigenWerk.length, "taak", "taken")}
                </span>
              }
              meta={bijOns > 0 ? `Bij ORBIT ENGINE · ${bijOns}` : undefined}
            />
            <WachtrijLijst overzicht={wachtrijOverzicht} eersteId={eigenWerk[0]?.id} />
          </div>
        </SectionErrorBoundary>
      )}

      {/* ── 2. Hoe het ervoor staat ────────────────────────────────────────
          Het hoofdgetal met zijn marge, de duiding in drie zinnen, en de
          totalen van het programma in één zin eronder. De stang links is
          altijd groen (`.card-rail-success`, sinds 21 september 2026). */}
      <SectionErrorBoundary label="Je programma">
        <div className="card card-rail card-rail-success flex flex-col gap-5">
          {laatste && band && samengevoegd && (
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
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
                      verandering. Zelfde regel als op Analytics. */}
                  {verschil?.changed ? (
                    <span className={verschil.delta > 0 ? "chip chip-stijging" : "chip chip-daling"}>
                      <Icon naam={verschil.delta > 0 ? "stijging" : "daling"} size={12} />
                      {Math.abs(Math.round(verschil.delta))} sinds de vorige meting
                    </span>
                  ) : (
                    <span className="chip chip-neutral">
                      {vorige === null ? "eerste meting" : "gelijk gebleven"}
                    </span>
                  )}
                  {laatste.vragen > 0 && (
                    <span className="mono-label">over {laatste.vragen} AI-vragen</span>
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

          <div className="flex flex-wrap items-start justify-between gap-4 border-t border-[var(--border-subtle)] pt-4">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <InsightLines insights={lus.insights} />
              <p className="text-sm text-muted">{totalen}</p>
              {eigenWerk.length === 0 && <p className="text-sm text-secondary">{rustRegel}</p>}
            </div>
            <Link
              href={
                laatste === null
                  ? `/merk/${id}/strategie/clusters`
                  : `/merk/${id}/analytics`
              }
              className="btn-outline shrink-0"
            >
              {/* Het icoon van het hoofdstuk waar de knop heen gaat, dezelfde
                  tekening als in de zijbalk. */}
              <Icon naam={laatste === null ? "clusters" : "analytics"} size={18} />
              {laatste === null ? "Naar je clusters" : "Bekijk je zichtbaarheid"}
            </Link>
          </div>
        </div>
      </SectionErrorBoundary>

      {/* ── 3. Deze maand ──────────────────────────────────────────────────
          De vijf stappen van de ronde, met wie er aan zet is. Zie
          `lib/ronde.ts`. Onderaan sinds de UX-audit (zie de volgorde hierboven). */}
      <SectionErrorBoundary label="Deze maand">
        <RondeBalk ronde={maand} />
      </SectionErrorBoundary>
    </div>
  );
}
