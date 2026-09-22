/**
 * De kalenderweergave van het contentplan (blok A punt 6,
 * `docs/tasks/nova-vergelijking-verbeterpunten.md`).
 *
 * Nova heeft een schakelaar tussen "Table" en "Calendar"
 * (`strategy.calendar.layoutLabel`). Bij twaalf maanden met elk een handvol
 * pagina's is een kalender sneller te overzien dan een lijst, en een gat in de
 * spreiding (drie pagina's in de eerste week, daarna niets) valt in een
 * kalender meteen op, in een lijst pas als je de data naast elkaar legt.
 *
 * Puur, dus testbaar (conventie 2): dit groepeert alleen, het haalt niets op
 * en tekent niets. `plan-calendar-view.tsx` doet de weergave.
 */
import { LAATSTE_DAG } from "@/lib/plan-schedule";
import type { PlannedPageStatus } from "@/lib/types/database";

export interface CalendarPagina {
  id: string;
  title: string;
  status: PlannedPageStatus;
  contentPieceId: string | null;
  topicId: string | null;
}

export interface CalendarDag {
  /** 1 tot en met `LAATSTE_DAG`. */
  dag: number;
  paginas: CalendarPagina[];
}

/**
 * Verdeelt de pagina's van ÉÉN maand over zijn dagen.
 *
 * @param pages Alleen de pagina's van deze ene maand. Reservepagina's
 *   (`is_buffer`) hebben nooit een publicatiedatum (`herplanMaand()` sluit ze
 *   uit) en horen dus niet in een kalender die over publiceren gaat.
 */
export function calendarDagen(
  pages: {
    id: string;
    title: string;
    status: PlannedPageStatus;
    scheduled_for: string | null;
    is_buffer: boolean;
    content_piece_id?: string | null;
    topic_id?: string | null;
  }[],
): CalendarDag[] {
  const perDag = new Map<number, CalendarPagina[]>();

  for (const p of pages) {
    if (p.is_buffer || !p.scheduled_for) continue;
    const dag = Number(p.scheduled_for.slice(8, 10));
    if (!Number.isInteger(dag) || dag < 1 || dag > LAATSTE_DAG) continue;
    const lijst = perDag.get(dag) ?? [];
    lijst.push({
      id: p.id,
      title: p.title,
      status: p.status,
      contentPieceId: p.content_piece_id ?? null,
      topicId: p.topic_id ?? null,
    });
    perDag.set(dag, lijst);
  }

  return Array.from({ length: LAATSTE_DAG }, (_, i) => ({
    dag: i + 1,
    paginas: perDag.get(i + 1) ?? [],
  }));
}
