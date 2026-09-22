import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { AnalysisCardMetrics } from "@/components/analysis-card-metrics";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { STATUS_META } from "@/lib/analysis-status";
import { loadDashboard } from "@/lib/dashboard";
import { LastUpdated } from "@/components/last-updated";
import { TopicsPanel } from "../../_components/topics-panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAnalysisPotential, type PotentialTriple } from "@/lib/potential-data";
import { isStaff } from "@/lib/staff";
import { KLANT_ZONDER_CLUSTERS } from "@/lib/cluster-start";
import type { Analysis, ClusterLabel, ProfileTopic } from "@/lib/types/database";
import {
  LABELFILTER_ALLES,
  filterOpLabel,
  leesLabelfilter,
  sorteerLabels,
  telPerLabel,
} from "@/lib/cluster-labels";
import { ClusterBalk } from "./cluster-balk";
import { ClusterKaart } from "./cluster-kaart";
import { NieuweClusterKnop } from "./nieuwe-cluster-knop";
import { LanceringMelding } from "./lancering-melding";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clusters" };

/**
 * CLUSTERS van één merk.
 *
 * Sinds 17 augustus 2026 hoort deze lijst bij het merk en niet bij de app als
 * geheel: `/analyses?merk=x` filterde een globale lijst, en dat leest als data
 * die weg is zodra de lijst korter blijkt dan verwacht. Nu is het merk de
 * context van het adres zelf.
 *
 * ⚠️ Dit scherm is sinds 22 september 2026 de thuisbasis van een cluster. Het
 * clusterdossier op `/analyses/[id]` bestond tot die dag en verwees daar de
 * uitslag van de meting; dat adres verwijst nu hierheen terug
 * (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`). De diepe routes
 * eronder (concept, briefing, bibliotheek, contentdetail, instellingen) blijven
 * wél op dat adres staan: dat zijn de meest gelinkte routes van de app, en
 * verplaatsen levert daar alleen cosmetiek op.
 *
 * Wat dat voor dit scherm betekent: hier staat wat een cluster doet (lopen,
 * wachten op akkoord, vastlopen) en hier staan de knoppen die daarbij horen.
 * De cijfers staan op Analytics, de vragen bij Openstaande vragen, de
 * voorgestelde pagina's in het Contentplan.
 *
 * Het derde blok, Voorgestelde clusters, stond tot 17 augustus 2026 op een
 * eigen adres (`/analyses/aanbevolen`).
 *
 * ── LABELS EN DE PRULLENBAK (1 september 2026, migratie 0083) ───────────────
 *
 * Bij vier clusters is een lijst een lijst. Bij dertig is het een muur, en dan
 * is de vraag niet "welk cluster staat hier" maar "waar staan mijn clusters
 * over onderhoud". Daarom een label per cluster en een filter erop.
 *
 * De prullenbak is `archived_at` uit migratie 0044, die er al lag maar nooit
 * een knop had. Een cluster daarin verdwijnt uit deze lijst én uit de
 * maandelijkse meetronde, want `/api/cron/tracking` leest via `activeOnly()`.
 * Het meten stopt dus per definitie, en niet omdat een scherm dat belooft.
 */
export default async function ClustersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ weergave?: string; label?: string; gelanceerd?: string }>;
}) {
  const { id } = await params;
  const { weergave, label: labelUitAdres, gelanceerd } = await searchParams;
  const inPrullenbak = weergave === "prullenbak";
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  const staff = await isStaff(user.id);
  const supabase = await createClient();
  // Per merk, en het merk gaat mee de query in (`lib/work.ts`, `loadBrandWork`):
  // een klant ziet nooit clusters van een ander merk in deze lijst.
  const dashboard = await loadDashboard(supabase, user.id, id);

  const analyses = [...dashboard.analyses];

  // "Wacht op jouw goedkeuring" bovenaan (abcplan.md §3.4). Sinds E ("centrale
  // foutmeldingenplek") telt ook `whoseTurn === "jij"` mee, niet alleen
  // `actionRequired`: een mislukt cluster wacht net zo goed op de klant, maar
  // stond voorheen ergens middenin de lijst, even onopvallend als een cluster
  // dat gewoon nog loopt.
  analyses.sort((a, b) => {
    const aAction = STATUS_META[a.status].whoseTurn === "jij" ? 1 : 0;
    const bAction = STATUS_META[b.status].whoseTurn === "jij" ? 1 : 0;
    return bAction - aAction;
  });

  const failed = analyses.filter((a) => a.status === "mislukt");

  // ── De labels en de prullenbak (migratie 0083) ───────────────────────────
  //
  // De prullenbak leest zijn eigen rijen: `loadDashboard()` levert per definitie
  // alleen de actieve clusters (`activeOnly()`), en dat filter hoort daar te
  // blijven staan. Alleen de kolommen die het kaartje toont, want de
  // kaartcijfers van een gearchiveerd cluster hebben geen lezer.
  const { data: labelRijen } = await supabase
    .from("cluster_labels")
    .select("*")
    .eq("profile_id", id);
  const labels = sorteerLabels((labelRijen ?? []) as ClusterLabel[]);

  const { data: archiefRijen } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", user.id)
    .eq("profile_id", id)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });
  const gearchiveerd = (archiefRijen ?? []) as Analysis[];

  // Een `?label=` uit het adres kan van alles zijn, ook een label van een ander
  // merk. Onbekend valt terug op "alle labels" (`lib/cluster-labels.ts`).
  const labelfilter = leesLabelfilter(labelUitAdres, labels);
  const zichtbaar = filterOpLabel(inPrullenbak ? gearchiveerd : analyses, labelfilter);
  const telling = telPerLabel(inPrullenbak ? gearchiveerd : analyses);
  // Het beheerpaneel telt over beide lijsten heen: een label dat alleen nog
  // clusters in de prullenbak heeft, is niet leeg.
  const tellingTotaal = telPerLabel([...analyses, ...gearchiveerd]);

  // ── Blok 3: de voorstellen uit de nulmeting ──────────────────────────────
  // Besluit 6: dit stond op een eigen adres ("Voorgestelde clusters"), en dat
  // waren twee menu-items voor twee toestanden van hetzelfde ding. Een voorstel
  // wordt een cluster zodra je op "meet dit" klikt; dan hoort het in dezelfde
  // lijst te staan als waar het naartoe gaat.
  const { data: topicRows } = await supabase
    .from("profile_topics")
    .select("*")
    .eq("profile_id", id)
    .order("priority", { ascending: false });
  const topics = (topicRows ?? []) as ProfileTopic[];

  const admin = createAdminClient();
  const potenties: Record<string, PotentialTriple> = {};
  await Promise.all(
    topics
      .filter((t) => t.analysis_id)
      .map(async (t) => {
        potenties[t.id] = await loadAnalysisPotential(admin, t.analysis_id!);
      }),
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Strategie"
        title="Clusters"
        description="Elk cluster is één onderwerp waarop ORBIT ENGINE je zichtbaarheid volgt."
        // Het merk gaat mee in de link: dan staat het goede merk al
        // voorgeselecteerd én weet dat scherm waar "terug" heen moet.
        // ⚠️ Zichtbaar voor iedereen sinds 21 september 2026, ook voor de
        // klant. Het echte slot blijft op de server staan (`analyse_starten`
        // in `STAFF_ONLY_ACTIONS`): `NieuweClusterKnop` laat een klant hier
        // niet naar `/analyses/new` linken, maar toont dezelfde uitleg als op
        // het lege clusterscherm. Zie de toelichting in dat bestand.
        action={<NieuweClusterKnop merkId={id} staff={staff} />}
      />

      {/* Net een cluster gestart? Dan is dit het scherm waarop je terugkomt, met
          één melding die zegt wat er loopt (22 september 2026). */}
      {gelanceerd === "1" && <LanceringMelding merkId={id} />}

      {/* ── 1. Storingen ───────────────────────────────────────────────────
          Vroeger stond een mislukt cluster alleen op de eigen pagina, dus wie
          niet net dáár keek zag hem niet. Deze lijst is de plek waar de klant
          komt kijken "moet ik iets", dus hier hoort een storing meteen te staan.

          Niet in de prullenbak: daar is een mislukt cluster geen openstaand
          werk meer, want er wordt niets meer aan gemeten. */}
      {!inPrullenbak && failed.length > 0 && (
        <div className="card card-danger flex flex-col gap-2">
          <span className="chip chip-danger w-fit">
            {failed.length === 1 ? "1 cluster niet gelukt" : `${failed.length} clusters niet gelukt`}
          </span>
          <ul className="flex flex-col gap-1">
            {/* ⚠️ Geen link meer naar `/analyses/[id]`: dat adres verwijst sinds
                22 september 2026 hierheen terug. De knop om het opnieuw te
                proberen staat op het kaartje van het cluster zelf. */}
            {failed.map((a) => (
              <li key={a.id} className="text-sm text-secondary">
                {a.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 2. Mijn clusters ─────────────────────────────────────────────────
          De balk staat er ook als er nog niets te filteren valt: hij vertelt
          dan dat de prullenbak leeg is, en dat is precies de vraag die iemand
          stelt die net een cluster heeft weggehaald. */}
      <div className="flex flex-col gap-3">
        <ClusterBalk
          merkId={id}
          labels={labels}
          filter={labelfilter}
          aantalPerLabel={telling.perLabel}
          aantalPerLabelTotaal={tellingTotaal.perLabel}
          aantalZonderLabel={telling.zonderLabel}
          aantalActief={analyses.length}
          aantalPrullenbak={gearchiveerd.length}
          inPrullenbak={inPrullenbak}
        />

        {inPrullenbak ? (
          zichtbaar.length === 0 ? (
            <div className="card flex flex-col gap-1">
              <span className="mono-label">
                {gearchiveerd.length === 0 ? "De prullenbak is leeg" : "Geen clusters met dit label"}
              </span>
              <p className="text-secondary">
                {gearchiveerd.length === 0
                  ? "Clusters die je hier neerzet verdwijnen uit je overzicht en worden niet meer gemeten. Ze blijven wel bewaard, dus terugzetten kan altijd."
                  : "Er staat wel iets in de prullenbak, alleen niet onder dit label. Kies een ander label om het te zien."}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {zichtbaar.map((a) => (
                <li key={a.id}>
                  <ClusterKaart analyse={a} labels={labels} gearchiveerd />
                </li>
              ))}
            </ul>
          )
        ) : analyses.length === 0 ? (
          staff ? (
            <EmptyState
              title="Nog geen clusters voor dit merk"
              action={{ href: `/analyses/new?merk=${id}`, label: "Start het eerste cluster" }}
            >
              Kies het product of onderwerp dat gemeten moet worden. ORBIT ENGINE stelt de vragen
              die klanten aan een AI stellen, en telt hoe vaak dit merk in het antwoord staat.
            </EmptyState>
          ) : (
            // De klant kan dit zelf niet starten, dus hoort hier te staan wie
            // dat wel doet en wat er daarna komt. Een lege staat die naar een
            // knop wijst die weigert, is erger dan geen knop.
            <EmptyState title={KLANT_ZONDER_CLUSTERS.titel}>{KLANT_ZONDER_CLUSTERS.uitleg}</EmptyState>
          )
        ) : zichtbaar.length === 0 ? (
          <div className="card flex flex-col gap-1">
            <span className="mono-label">Geen clusters met dit label</span>
            <p className="text-secondary">
              Je hebt {analyses.length === 1 ? "één cluster" : `${analyses.length} clusters`}, maar
              geen enkele onder dit label. Kies een ander label, of hang er hieronder een cluster
              aan.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {zichtbaar.map((a) => (
              <li key={a.id}>
                <ClusterKaart
                  analyse={a}
                  metrics={dashboard.cardMetrics[a.id]}
                  labels={labels}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 3. Voorgestelde clusters ───────────────────────────────────────
          Onderaan en niet bovenaan: wat loopt gaat voor wat nog een voorstel
          is. Een paneel dat niets te tonen heeft verdwijnt niet maar zegt
          waaróm het leeg is (`docs/ux-design.md` §4).

          In de prullenbak staat het er niet: die lijst gaat over wat je hebt
          weggehaald, en een voorstel om iets nieuws te beginnen hoort daar
          niet tussen. */}
      {!inPrullenbak && (
        <div className="flex flex-col gap-3">
          <span className="mono-label">Voorgesteld</span>
          {topics.length === 0 ? (
            <div className="card flex flex-col gap-1">
              <span className="mono-label">Nog geen voorstellen</span>
              <p className="text-secondary">
                ORBIT ENGINE heeft voor {profile.brand_name ?? profile.name} nog geen onderwerpen
                voorgesteld. Zodra de nulmeting daar iets over zegt, staat het hier.
              </p>
            </div>
          ) : (
            <TopicsPanel
              profileId={id}
              initial={topics}
              potenties={potenties}
              staff={staff}
              serviceRegionCount={profile.service_regions.length}
            />
          )}
        </div>
      )}
    </div>
  );
}
