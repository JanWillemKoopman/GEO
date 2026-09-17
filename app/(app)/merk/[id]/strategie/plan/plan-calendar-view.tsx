import { PLAN_STATUS_META, type StatusTone } from "@/lib/plan-status";
import { monthCalendar } from "@/lib/plan-schedule";
import { calendarDagen, type CalendarDag } from "@/lib/plan-calendar";
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
export function PlanCalendarView({
  plan,
  months,
  pages,
}: {
  plan: ContentPlan;
  months: PlanMonth[];
  pages: PlannedPage[];
}) {
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
        const dagen = calendarDagen(perMaand.get(maand.id) ?? []);
        const aantal = dagen.reduce((n, d) => n + d.paginas.length, 0);
        return (
          <div key={maand.id} className="card flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{kalender?.label ?? `Maand ${maand.month_number}`}</span>
              <span className="mono-label text-muted">{aantal}</span>
            </div>
            <MaandGrid dagen={dagen} />
          </div>
        );
      })}
    </div>
  );
}

/** De prioriteit bij meerdere pagina's op één dag: wat om aandacht vraagt, wint. */
const TOON_VOLGORDE: StatusTone[] = ["wacht", "fout", "loopt", "klaar", "neutraal"];

function MaandGrid({ dagen }: { dagen: CalendarDag[] }) {
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
          <div
            key={d.dag}
            title={titel}
            role="gridcell"
            aria-label={titel}
            className="flex aspect-square items-center justify-center rounded-[var(--radius-lg)] text-[0.65rem] font-medium"
            style={
              tone === "wacht"
                ? { background: "var(--intent-warning-surface)", color: "var(--intent-warning-text)" }
                : tone === "fout"
                  ? { background: "var(--intent-danger-surface)", color: "var(--intent-danger-text)" }
                  : tone === "klaar"
                    ? { background: "var(--intent-growth-surface)", color: "var(--intent-growth-text)" }
                    : { background: "var(--intent-intelligence-surface)", color: "var(--intent-intelligence-text)" }
            }
          >
            {d.dag}
          </div>
        );
      })}
    </div>
  );
}
