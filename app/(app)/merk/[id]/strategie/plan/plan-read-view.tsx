import Link from "next/link";
import { CollapsibleSection } from "@/components/collapsible-section";
import { Lijst, LijstRegel } from "@/components/lijst";
import {
  PLAN_STATUS_META,
  MONTH_STATUS_META,
  PAGE_TYPE_LABEL,
  CONTENT_ACTION_LABEL,
  type StatusTone,
} from "@/lib/plan-status";
import { contentHref, formatDagNL } from "@/lib/plan-overview";
import { monthCalendar, isRunningMonth, maandIsVol, maandTitel } from "@/lib/plan-schedule";
import { leesMaandKeuze, maandRegel, planStap, telStatussen } from "@/lib/plan-read";
import type { TopicWritingState } from "@/lib/plan-writing";
import type { ContentPlan, PlanMonth, PlannedPage } from "@/lib/types/database";
import { ReleaseMonthButton } from "./release-month-button";

/**
 * Het contentplan zoals de klant het leest.
 *
 * Deze maand, volgende maand, en de rest van het jaar ingeklapt als naslag. Het
 * waarom staat bij `lib/plan-read.ts`; kort: het sleepbord beantwoordt de
 * planvraag, dit beantwoordt de leesvraag, en de klant komt meestal voor de
 * tweede.
 *
 * ⚠️ Eén handeling op dit scherm, en dat is met opzet: een maand vrijgeven.
 * Alles wat de indeling verandert (slepen, verplaatsen, data zetten, afwijzen)
 * staat op het bord, één klik verderop via de schakelaar bovenaan. Dit is dus
 * geen beperking maar een rustiger beginpunt: twee schermen die allebei half
 * kunnen plannen is erger dan één dat het helemaal kan en één dat leest.
 */
export function PlanReadView({
  profileId,
  plan,
  months,
  pages,
  topics,
  clusterNaam,
  staff,
}: {
  profileId: string;
  plan: ContentPlan;
  months: PlanMonth[];
  pages: PlannedPage[];
  topics: TopicWritingState[];
  clusterNaam: Record<string, string | null>;
  /** Mag deze gebruiker zelf een maand vrijgeven? Zie `ReleaseMonthButton`. */
  staff: boolean;
}) {
  const nu = new Date();
  const analyseVanOnderwerp = new Map(topics.map((t) => [t.topicId, t.analysisId]));

  const lopend =
    months.find((m) => isRunningMonth(plan.started_on, m.month_number, nu))?.month_number ?? null;

  const { deze, volgende, rest } = leesMaandKeuze(
    months.map((m) => ({ id: m.id, monthNumber: m.month_number, status: m.status })),
    lopend,
  );

  const paginasVan = (monthId: string | undefined) =>
    monthId ? pages.filter((p) => p.plan_month_id === monthId && !p.is_buffer) : [];

  // De stand over het héle plan, niet alleen over de maand die je bekijkt: een
  // tekst van vorige maand die nog niet live staat, is nog steeds wat er van
  // de klant gevraagd wordt.
  const alles = telStatussen(pages);
  const dezePaginas = paginasVan(deze?.id);
  const stap = planStap({
    maandStatus: deze?.status ?? "concept",
    paginas: dezePaginas.length,
    terGoedkeuring: alles.terGoedkeuring,
    teplaatsen: alles.teplaatsen,
  });

  return (
    <div className="flex flex-col gap-5">
      {/* ── Wat er van jou gevraagd wordt ─────────────────────────────────
          Bovenaan en in gewone taal. Het planbord opende met "pakket 10 per
          maand · 12 ingepland · 40 content beschikbaar", en dat is de taal van
          degene die het plan maakt, niet van degene die ermee moet werken. */}
      {/* Sinds 1 oktober 2026 een zin direct onder de kop en geen kaart met een
          label meer: hij staat al bovenaan, en een kader eromheen maakte er een
          blok van naast de maanden in plaats van de inleiding erop. */}
      <p className="type-body max-w-[44rem]">
        <span className="font-medium">Van jou gevraagd: </span>
        <span className="text-secondary">{stap}</span>
      </p>

      {deze && (
        <MaandKaart
          profileId={profileId}
          plan={plan}
          month={months.find((m) => m.id === deze.id)!}
          paginas={dezePaginas}
          analyseVanOnderwerp={analyseVanOnderwerp}
          clusterNaam={clusterNaam}
          lopend={lopend === deze.monthNumber}
          magVrijgeven
          staff={staff}
        />
      )}

      {volgende && (
        <MaandKaart
          profileId={profileId}
          plan={plan}
          month={months.find((m) => m.id === volgende.id)!}
          paginas={paginasVan(volgende.id)}
          analyseVanOnderwerp={analyseVanOnderwerp}
          clusterNaam={clusterNaam}
          lopend={false}
          magVrijgeven={false}
          staff={staff}
        />
      )}

      {/* ── De rest van het jaar ───────────────────────────────────────────
          Naslag, dus dicht (`docs/ux-design.md` §5). Wel met de aantallen
          erbij: de klant heeft een pakket gekocht en mag zien dat het hele
          jaar ingevuld is. */}
      {rest.length > 0 && (
        <CollapsibleSection
          title="De rest van je jaar"
          badge={rest.length === 1 ? "1 maand" : `${rest.length} maanden`}
          defaultOpen={false}
        >
          <ul className="flex flex-col gap-2">
            {rest.map((m) => {
              const kalender = monthCalendar(plan.started_on, m.monthNumber);
              const aantal = paginasVan(m.id).length;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-sm font-medium">
                    {maandTitel(plan.started_on, m.monthNumber)}
                  </span>
                  <span className="mono-label">
                    {aantal === 0
                      ? "nog leeg"
                      : `${aantal} ${aantal === 1 ? "pagina" : "pagina's"}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </CollapsibleSection>
      )}

      <p className="text-sm text-muted">
        ORBIT ENGINE begint tien dagen voor elke publicatiedatum met schrijven. Zodra een tekst
        klaar is, staat hij in je{" "}
        <Link href={`/merk/${profileId}/strategie/bibliotheek`} className="link">
          bibliotheek
        </Link>{" "}
        om na te lezen en op je site te zetten. Wil je zelf schuiven met wat wanneer geschreven wordt, ga
        dan naar{" "}
        <Link href={`/merk/${profileId}/strategie/plan?weergave=plannen`} className="link">
          Plannen
        </Link>
        .
      </p>
    </div>
  );
}

function MaandKaart({
  profileId,
  plan,
  month,
  paginas,
  analyseVanOnderwerp,
  clusterNaam,
  lopend,
  magVrijgeven,
  staff,
}: {
  profileId: string;
  plan: ContentPlan;
  month: PlanMonth;
  paginas: PlannedPage[];
  analyseVanOnderwerp: Map<string, string | null>;
  clusterNaam: Record<string, string | null>;
  lopend: boolean;
  magVrijgeven: boolean;
  staff: boolean;
}) {
  const kalender = monthCalendar(plan.started_on, month.month_number);
  const maandMeta = MONTH_STATUS_META[month.status];
  const telling = telStatussen(paginas);

  const opDatum = [...paginas].sort((a, b) => {
    if (a.scheduled_for && b.scheduled_for) return a.scheduled_for.localeCompare(b.scheduled_for);
    if (a.scheduled_for) return -1;
    if (b.scheduled_for) return 1;
    return a.sort_order - b.sort_order;
  });
  const eerste = opDatum.find((p) => p.scheduled_for && p.status !== "geplaatst");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="type-section">
            {lopend ? "Deze maand" : maandTitel(plan.started_on, month.month_number)}
            {lopend && kalender && <span className="text-muted"> · {kalender.label}</span>}
          </h2>
          <span className={maandChip(maandMeta.tone)}>{maandMeta.label}</span>
        </div>
        <p className="text-secondary">
          {maandRegel({
            paginas: telling.echt,
            geplaatst: telling.geplaatst,
            eersteDatum: eerste?.scheduled_for ? formatDagNL(eerste.scheduled_for) : null,
            leegDoorRuimtegebrek: telling.echt === 0 && maandIsVol(plan.started_on, month.month_number),
          })}
        </p>
      </div>

      {/* Een lijst en geen tabel (1 oktober 2026). De tabel had zes kolommen
          (een ervan zonder inhoud) en schoof op een telefoon zijwaarts. Nu
          staat per pagina de titel, daaronder datum, cluster, nieuw of
          bestaand en soort, en rechts de stand of de handeling. Zelfde vorm
          als de Bibliotheek (`components/lijst.tsx`). */}
      {opDatum.length > 0 && (
        <Lijst label={lopend ? "Pagina's van deze maand" : `Pagina's van ${maandTitel(plan.started_on, month.month_number)}`}>
          {opDatum.map((page) => {
            const meta = PLAN_STATUS_META[page.status];
            const href = contentHref(
              page.content_piece_id,
              page.topic_id ? (analyseVanOnderwerp.get(page.topic_id) ?? null) : null,
            );
            const cluster = page.source_analysis_id
              ? (clusterNaam[page.source_analysis_id] ?? null)
              : null;
            const bijzaak = [
              page.scheduled_for ? formatDagNL(page.scheduled_for) : "geen datum",
              cluster,
              page.recommendation_action ? CONTENT_ACTION_LABEL[page.recommendation_action] : null,
              PAGE_TYPE_LABEL[page.page_type],
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <LijstRegel
                key={page.id}
                titel={
                  href ? (
                    <Link href={href} className="hover:underline">
                      {page.title}
                    </Link>
                  ) : (
                    page.title
                  )
                }
                bijzaak={bijzaak}
                rechts={
                  page.status !== "gepland" || (href && meta.actionRequired) ? (
                    <>
                      {/* "Gepland" staat er niet bij: het geldt voor bijna elke
                          regel en zou per maand tien keer hetzelfde zeggen. */}
                      {page.status !== "gepland" && (
                        <span className={paginaChip(meta.tone)}>{meta.label}</span>
                      )}
                      {href && meta.actionRequired && (
                        <Link href={href} className="btn-outline btn-sm">
                          {page.status === "ter_goedkeuring" ? "Nakijken" : "Plaatsen"}
                        </Link>
                      )}
                    </>
                  ) : undefined
                }
              />
            );
          })}
        </Lijst>
      )}

      {magVrijgeven && month.status !== "goedgekeurd" && telling.echt > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-secondary">
            Zolang deze maand niet gestart is, schrijft ORBIT ENGINE er niets van.
          </p>
          <ReleaseMonthButton
            profileId={profileId}
            monthId={month.id}
            monthNumber={month.month_number}
            maandNaam={maandTitel(plan.started_on, month.month_number)}
            paginas={telling.echt}
            eersteDatum={eerste?.scheduled_for ?? null}
            staff={staff}
          />
        </div>
      )}
    </section>
  );
}

function maandChip(tone: StatusTone): string {
  if (tone === "wacht") return "chip chip-warning";
  if (tone === "klaar") return "chip chip-success";
  return "chip chip-neutral";
}

function paginaChip(tone: StatusTone): string {
  if (tone === "wacht") return "chip chip-warning";
  if (tone === "klaar") return "chip chip-success";
  if (tone === "fout") return "chip chip-danger";
  return "chip chip-neutral";
}
