import Link from "next/link";
import { Icon } from "@/components/icon";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PLAN_STATUS_META, MONTH_STATUS_META, type StatusTone } from "@/lib/plan-status";
import { contentHref, formatDagNL } from "@/lib/plan-overview";
import { monthCalendar, isRunningMonth, maandIsVol } from "@/lib/plan-schedule";
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
}: {
  profileId: string;
  plan: ContentPlan;
  months: PlanMonth[];
  pages: PlannedPage[];
  topics: TopicWritingState[];
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
      <div className="card card-rail flex flex-col gap-1">
        <span className="mono-label">Wat er van jou gevraagd wordt</span>
        <p className="text-secondary">{stap}</p>
      </div>

      {deze && (
        <MaandKaart
          profileId={profileId}
          plan={plan}
          month={months.find((m) => m.id === deze.id)!}
          paginas={dezePaginas}
          analyseVanOnderwerp={analyseVanOnderwerp}
          lopend={lopend === deze.monthNumber}
          magVrijgeven
        />
      )}

      {volgende && (
        <MaandKaart
          profileId={profileId}
          plan={plan}
          month={months.find((m) => m.id === volgende.id)!}
          paginas={paginasVan(volgende.id)}
          analyseVanOnderwerp={analyseVanOnderwerp}
          lopend={false}
          magVrijgeven={false}
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
                    Maand {m.monthNumber}
                    {kalender && <span className="text-muted"> · {kalender.label}</span>}
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
        <Link href={`/merk/${profileId}/strategie/bibliotheek`} className="underline">
          bibliotheek
        </Link>{" "}
        om na te lezen en te publiceren. Wil je zelf schuiven met wat wanneer geschreven wordt, ga
        dan naar{" "}
        <Link href={`/merk/${profileId}/strategie/plan?weergave=plannen`} className="underline">
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
  lopend,
  magVrijgeven,
}: {
  profileId: string;
  plan: ContentPlan;
  month: PlanMonth;
  paginas: PlannedPage[];
  analyseVanOnderwerp: Map<string, string | null>;
  lopend: boolean;
  magVrijgeven: boolean;
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
    <div className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="type-body-emphasis">
            {lopend ? "Deze maand" : `Maand ${month.month_number}`}
            {kalender && <span className="text-muted"> · {kalender.label}</span>}
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

      {opDatum.length > 0 && (
        <ul className="flex flex-col">
          {opDatum.map((page) => {
            const meta = PLAN_STATUS_META[page.status];
            const href = contentHref(
              page.content_piece_id,
              page.topic_id ? (analyseVanOnderwerp.get(page.topic_id) ?? null) : null,
            );
            return (
              <li
                key={page.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--border-subtle)] py-2.5 first:border-t-0 first:pt-0"
              >
                <span className="mono-label w-20 shrink-0">
                  {page.scheduled_for ? formatDagNL(page.scheduled_for) : "geen datum"}
                </span>
                <span className="min-w-0 flex-1">
                  {href ? (
                    <Link href={href} className="font-medium hover:underline">
                      {page.title}
                    </Link>
                  ) : (
                    <span>{page.title}</span>
                  )}
                </span>
                {/* Bij `gepland` zegt de datum alles; de chip zou daar tien keer
                    per maand hetzelfde zeggen. Zelfde regel als op het bord. */}
                {page.status !== "gepland" && (
                  <span className={`${paginaChip(meta.tone)} shrink-0`}>{meta.label}</span>
                )}
                {href && meta.actionRequired && (
                  <Link href={href} className="btn-outline btn-sm shrink-0">
                    {page.status === "ter_goedkeuring" ? "Nakijken" : "Publiceren"}
                    <Icon naam="naar" size={14} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {magVrijgeven && month.status !== "goedgekeurd" && telling.echt > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
          <p className="text-sm text-secondary">
            Zolang deze maand niet vrijgegeven is, schrijft ORBIT ENGINE er niets van.
          </p>
          <ReleaseMonthButton
            profileId={profileId}
            monthId={month.id}
            monthNumber={month.month_number}
            paginas={telling.echt}
            eersteDatum={eerste?.scheduled_for ?? null}
          />
        </div>
      )}
    </div>
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
