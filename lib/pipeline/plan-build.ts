/**
 * Hoe uit een quota een jaarplan rolt.
 *
 * ── WAT DIT WEL EN NIET DOET ────────────────────────────────────────────────
 *
 * Dit is de VERDELING, niet de bedenkerij. Welke onderwerpen er zijn komt uit
 * `propose_topics` (die draait al en levert onderwerpen mét prioriteit). Wat
 * hier gebeurt is het rekenwerk eromheen: hoeveel pagina's per maand, van welk
 * type, in welke funnelfase, en op welke datum.
 *
 * Dat onderscheid volgt uit de analyse in `docs/Nova.md` §11.1. Nova laat een
 * agent het hele plan opstellen; Aura heeft de bedenkkant al staan en had alleen
 * de verdeling nog niet. Dat scheelt een zware AI-stap (conventie 7: één taak is
 * hooguit één zware aanroep, en deze taak heeft er nul nodig).
 *
 * Puur, dus testbaar (conventie 2). Dit bepaalt wat een klant een jaar lang
 * krijgt, dus het hoort onder test te staan en niet in een route.
 */
import type { PageType } from "@/lib/types/database";

/** Nova's vier paginatypen (`pageTypeCategory` en de drie andere). */
export const PAGE_TYPES: PageType[] = ["categorie", "dienst", "informatief", "overig"];

export const MONTHS_AHEAD = 12;

/** Nova eist er drie tot vijf vóór ze een plan laten maken. */
export const MIN_FUNNELS = 3;
export const MAX_FUNNELS = 5;

/**
 * Hoeveel reservepagina's per maand?
 *
 * Nova heeft ze (`common.buffer`, "+{count} buffer") maar zegt nergens hoeveel.
 * Eén per maand is de keuze hier, en de redenering: een buffer bestaat om één
 * geschrapte pagina op te vangen zonder dat het maandtotaal daalt. Twee zou
 * betekenen dat je structureel meer bedenkt dan je gebruikt, en dat is bedenkwerk
 * dat nooit gelezen wordt.
 */
export const BUFFERS_PER_MONTH = 1;

export interface TopicInput {
  id: string;
  title: string;
  /** Hoger telt eerder. Komt uit `profile_topics.priority`. */
  priority: number;
}

export interface FunnelInput {
  id: string;
  label: string;
  sortOrder: number;
}

export interface PlannedPageDraft {
  monthNumber: number;
  title: string;
  pageType: PageType;
  funnelStageId: string | null;
  topicId: string | null;
  sortOrder: number;
  isBuffer: boolean;
  /** ISO-datum (yyyy-mm-dd). */
  scheduledFor: string;
}

export interface BuildInput {
  startedOn: Date;
  pagesPerMonth: number;
  topics: TopicInput[];
  funnels: FunnelInput[];
  months?: number;
}

export interface BuildResult {
  pages: PlannedPageDraft[];
  /** Wat er misging, in gewone taal. Leeg = het plan is bruikbaar. */
  problems: string[];
}

/**
 * Bouwt het jaarplan.
 *
 * ── DE VIER REGELS ──────────────────────────────────────────────────────────
 *
 * 1. **Prioriteit eerst.** Onderwerpen met de hoogste prioriteit belanden in de
 *    eerste maanden. Een klant die na drie maanden opzegt (besluit 7: dat kan)
 *    moet de béste drie maanden gehad hebben, niet een willekeurige greep.
 *
 * 2. **Funnelfasen roteren.** Elke maand raakt alle fasen aan in plaats van
 *    eerst drie maanden bewustwording en dan drie maanden beslissing. Anders
 *    ziet de klant pas in maand zeven een pagina die iets oplevert.
 *
 * 3. **Onderwerpen mogen terugkomen, maar nooit met dezelfde titel.** Zijn er
 *    minder onderwerpen dan plekken, dan begint de lijst opnieuw. Dat is nodig,
 *    want een half plan is erger dan herhaling: bij acht onderwerpen en tien
 *    pagina's per maand is de tweede ronde al in maand één aan de beurt.
 *
 *    ⚠️ Dat viel op bij de praktijkcheck tegen Van den Udenhout: "Auto
 *    financieren" stond twee keer in dezelfde maand, met exact dezelfde titel.
 *    Een plan waarin twee regels hetzelfde heten is een plan waarvan de klant
 *    denkt dat er iets dubbel staat. De titel draagt daarom de funnelfase als
 *    invalshoek: hetzelfde onderwerp bekeken vanuit oriëntatie is een andere
 *    pagina dan vanuit kiezen.
 *
 * 4. **De buffer staat achteraan de maand.** Hij telt niet mee in het
 *    maandtotaal en schuift pas in als er iets sneuvelt.
 */
export function buildPlan(input: BuildInput): BuildResult {
  const problems: string[] = [];
  const months = input.months ?? MONTHS_AHEAD;

  if (input.pagesPerMonth < 1) {
    problems.push("Er is geen pakket gekozen, dus Aura weet niet hoeveel pagina's per maand.");
  }
  if (input.topics.length === 0) {
    problems.push("Er zijn nog geen onderwerpen. Aura stelt die voor tijdens het merkonderzoek.");
  }
  if (input.funnels.length < MIN_FUNNELS) {
    problems.push(
      `Er zijn ${input.funnels.length} funnelfasen; er moeten er minstens ${MIN_FUNNELS} zijn.`,
    );
  }
  if (input.funnels.length > MAX_FUNNELS) {
    problems.push(
      `Er zijn ${input.funnels.length} funnelfasen; meer dan ${MAX_FUNNELS} maakt het plan onleesbaar.`,
    );
  }
  if (problems.length > 0) return { pages: [], problems };

  // Regel 1: hoogste prioriteit eerst. Bij gelijke prioriteit de oorspronkelijke
  // volgorde aanhouden, zodat twee runs op dezelfde data hetzelfde plan geven.
  const topics = [...input.topics].sort((a, b) => b.priority - a.priority);
  const funnels = [...input.funnels].sort((a, b) => a.sortOrder - b.sortOrder);

  const pages: PlannedPageDraft[] = [];
  let topicCursor = 0;
  let funnelCursor = 0;

  for (let m = 1; m <= months; m++) {
    const perMaand = input.pagesPerMonth + BUFFERS_PER_MONTH;

    for (let i = 0; i < perMaand; i++) {
      const isBuffer = i >= input.pagesPerMonth;
      // Regel 3: rondlopen door de onderwerpen.
      const topic = topics[topicCursor % topics.length];
      topicCursor++;
      // Regel 2: de fasen roteren, en ze lopen door over de maandgrens heen.
      // Zou de teller per maand resetten, dan kreeg fase 1 structureel de meeste
      // pagina's bij een maandtotaal dat niet deelbaar is door het aantal fasen.
      const funnel = funnels[funnelCursor % funnels.length];
      funnelCursor++;

      pages.push({
        monthNumber: m,
        // De invalshoek hoort in de titel, zie regel 3. Dit is een werktitel:
        // de definitieve kop komt uit de schrijfstap, die het onderwerp en de
        // fase samen als briefing krijgt.
        title: `${topic.title} · ${funnel.label}`,
        pageType: typeForFunnel(funnel, funnels.length),
        funnelStageId: funnel.id,
        topicId: topic.id,
        sortOrder: i,
        isBuffer,
        // Regel 4: buffers krijgen geen datum. Ze worden pas gepland als ze
        // inschuiven, en een datum zou ze in de cron laten meelopen.
        scheduledFor: isBuffer
          ? ""
          : dayInMonth(input.startedOn, m, i, input.pagesPerMonth),
      });
    }
  }

  return { pages, problems: [] };
}

/**
 * Welk paginatype past bij een funnelfase?
 *
 * Vuistregel en geen wetenschap: vroeg in de funnel is informatief (iemand
 * oriënteert zich), laat in de funnel is een dienst- of categoriepagina (iemand
 * kiest). De consultant kan het per pagina wijzigen; dit is de startwaarde.
 */
function typeForFunnel(funnel: FunnelInput, totaal: number): PageType {
  const positie = funnel.sortOrder;
  if (totaal <= 1) return "informatief";
  const deel = positie / (totaal - 1);
  if (deel < 0.4) return "informatief";
  if (deel < 0.75) return "categorie";
  return "dienst";
}

/**
 * De publicatiedatum van pagina `index` in maand `monthNumber`.
 *
 * Verspreid over de maand in plaats van allemaal op de eerste: een klant die
 * twintig pagina's per maand afneemt wil niet twintig keer op dezelfde ochtend
 * iets moeten plaatsen, en een zoekmachine ziet liever een gestage stroom.
 */
function dayInMonth(
  startedOn: Date,
  monthNumber: number,
  index: number,
  perMonth: number,
): string {
  const basis = new Date(
    Date.UTC(startedOn.getUTCFullYear(), startedOn.getUTCMonth() + (monthNumber - 1), 1),
  );
  // Binnen dag 1 tot en met 28, zodat februari geen uitzondering is.
  const spreiding = Math.max(1, Math.floor(28 / Math.max(1, perMonth)));
  const dag = Math.min(28, 1 + index * spreiding);
  basis.setUTCDate(dag);
  return basis.toISOString().slice(0, 10);
}

/**
 * De standaard funnelfasen voor een merk dat er nog geen heeft.
 *
 * Vier, want dat zit midden in Nova's toegestane drie tot vijf, en het is de
 * indeling die een MKB'er herkent zonder uitleg.
 */
export const DEFAULT_FUNNELS = [
  "Oriëntatie",
  "Vergelijken",
  "Kiezen",
  "Klant blijven",
];
