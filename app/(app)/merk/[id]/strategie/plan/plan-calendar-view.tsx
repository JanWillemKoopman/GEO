"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PLAN_STATUS_META, CONTENT_ACTION_LABEL, type StatusTone } from "@/lib/plan-status";
import { monthCalendar } from "@/lib/plan-schedule";
import { contentHref } from "@/lib/plan-overview";
import { calendarDagen, type CalendarDag, type CalendarPagina } from "@/lib/plan-calendar";
import type { TopicWritingState } from "@/lib/plan-writing";
import type { ContentPlan, PlanMonth, PlannedPage } from "@/lib/types/database";

/**
 * Het contentplan als kalender, twaalf maanden naast elkaar (blok A punt 6,
 * `docs/tasks/nova-vergelijking-verbeterpunten.md`).
 *
 * ── WAAROM DIT NAAST DE LIJST STAAT, NIET ERIN ─────────────────────────────
 *
 * Overzicht (`PlanReadView`) en het bord (`PlanView`) beantwoorden allebei een
 * vraag over ÉÉN of TWEE maanden tegelijk: wat gebeurt er nu, wat moet ik
 * doen. Deze weergave beantwoordt een andere vraag: hoe is het hele jaar
 * verdeeld, en waar valt een gat. Dat zie je pas als alle twaalf maanden
 * tegelijk in beeld staan, dus geen "deze/volgende/rest"-inklapping zoals de
 * andere twee weergaven: hier is juist het geheel het punt.
 *
 * Alleen-lezen, net als Overzicht: slepen en verplaatsen blijft op het bord.
 * Een derde plek die ook nog kan plannen, is een derde plek waar de volgorde
 * uit de pas kan lopen met de andere twee.
 */
interface GekozenDag {
  label: string;
  paginas: CalendarPagina[];
}

export function PlanCalendarView({
  plan,
  months,
  pages,
  topics,
}: {
  plan: ContentPlan;
  months: PlanMonth[];
  pages: PlannedPage[];
  topics: TopicWritingState[];
}) {
  const [gekozenDag, setGekozenDag] = useState<GekozenDag | null>(null);
  const analyseVanOnderwerp = new Map(topics.map((t) => [t.topicId, t.analysisId]));

  const perMaand = new Map<string, PlannedPage[]>();
  for (const p of pages) {
    const lijst = perMaand.get(p.plan_month_id) ?? [];
    lijst.push(p);
    perMaand.set(p.plan_month_id, lijst);
  }

  const opNummer = [...months].sort((a, b) => a.month_number - b.month_number);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {opNummer.map((maand) => {
        const kalender = monthCalendar(plan.started_on, maand.month_number);
        const maandLabel = kalender?.label ?? `Maand ${maand.month_number}`;
        const dagen = calendarDagen(perMaand.get(maand.id) ?? []);
        const aantal = dagen.reduce((n, d) => n + d.paginas.length, 0);
        return (
          <div key={maand.id} className="card flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{maandLabel}</span>
              <span className="mono-label text-muted">{aantal}</span>
            </div>
            <MaandGrid
              dagen={dagen}
              onKiesDag={(dag) =>
                setGekozenDag({ label: `${dag.dag} ${maandLabel}`, paginas: dag.paginas })
              }
            />
          </div>
        );
      })}

      {gekozenDag && (
        <DagPopup
          gekozenDag={gekozenDag}
          analyseVanOnderwerp={analyseVanOnderwerp}
          onSluiten={() => setGekozenDag(null)}
        />
      )}
    </div>
  );
}

/**
 * Het popupje bij een dag met ingeplande content (de bal rechtsboven in het
 * vakje). Alleen-lezen, net als de rest van deze weergave: klikken opent een
 * lijst, geen editor.
 */
function DagPopup({
  gekozenDag,
  analyseVanOnderwerp,
  onSluiten,
}: {
  gekozenDag: GekozenDag;
  analyseVanOnderwerp: Map<string, string | null>;
  onSluiten: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onSluiten}
    >
      <div
        className="card flex w-full max-w-sm flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="type-body-emphasis">{gekozenDag.label}</h3>
          <button
            type="button"
            onClick={onSluiten}
            className="btn-ghost btn-icon btn-sm btn-rect"
            aria-label="Popup sluiten"
          >
            <Icon naam="sluiten" size={16} />
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {gekozenDag.paginas.map((p) => {
            const meta = PLAN_STATUS_META[p.status];
            const href = contentHref(p.contentPieceId, p.topicId ? (analyseVanOnderwerp.get(p.topicId) ?? null) : null);
            return (
              <li key={p.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  {href ? (
                    <Link href={href} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{p.title}</span>
                  )}
                  <span className={paginaChip(meta.tone)}>{meta.label}</span>
                </div>
                {p.recommendationAction && (
                  <span className="text-sm text-muted">{CONTENT_ACTION_LABEL[p.recommendationAction]}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** De prioriteit bij meerdere pagina's op één dag: wat om aandacht vraagt, wint. */
const TOON_VOLGORDE: StatusTone[] = ["wacht", "fout", "loopt", "klaar", "neutraal"];

function MaandGrid({ dagen, onKiesDag }: { dagen: CalendarDag[]; onKiesDag: (dag: CalendarDag) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1" role="grid">
      {dagen.map((d) => {
        if (d.paginas.length === 0) {
          return (
            <div
              key={d.dag}
              className="flex aspect-square items-center justify-center rounded-[var(--radius-lg)] text-[0.65rem] text-muted"
              style={{ background: "var(--bg-elevated)" }}
            >
              {d.dag}
            </div>
          );
        }

        const tonen = d.paginas.map((p) => PLAN_STATUS_META[p.status].tone);
        const tone = TOON_VOLGORDE.find((t) => tonen.includes(t)) ?? "neutraal";
        const titel = d.paginas.map((p) => `${p.title} (${PLAN_STATUS_META[p.status].label})`).join(", ");

        return (
          <button
            key={d.dag}
            type="button"
            title={titel}
            role="gridcell"
            aria-label={`${titel}, klik voor details`}
            onClick={() => onKiesDag(d)}
            className="relative flex aspect-square items-center justify-center rounded-[var(--radius-lg)] text-[0.65rem] font-medium"
            style={
              tone === "wacht"
                ? { background: "var(--intent-warning-surface)", color: "var(--intent-warning-text)" }
                : tone === "fout"
                  ? { background: "var(--intent-danger-surface)", color: "var(--intent-danger-text)" }
                  : tone === "klaar"
                    ? { background: "var(--trend-up-surface)", color: "var(--trend-up-text)" }
                    : { background: "var(--intent-intelligence-surface)", color: "var(--intent-intelligence-text)" }
            }
          >
            {d.dag}
            <span
              className="absolute -right-1 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full px-0.5 text-[0.55rem] font-semibold leading-none"
              style={{ background: "var(--bg-inverse)", color: "var(--text-inverse)" }}
            >
              {d.paginas.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function paginaChip(tone: StatusTone): string {
  if (tone === "wacht") return "chip chip-warning";
  if (tone === "klaar") return "chip chip-success";
  if (tone === "fout") return "chip chip-danger";
  return "chip chip-neutral";
}
