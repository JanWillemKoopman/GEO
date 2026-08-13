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
  /** Hoger telt eerder. Komt uit `profile_topics.priority`, de dag-1-gok van het model. */
  priority: number;
  /**
   * De potentiescore (docs/tasks/potentiescore.md, fase 3), 0-100, of `null`
   * zolang dit onderwerp nog geen gemeten analyse en/of nog geen profielbrede
   * herberekening heeft gehad. Weegt zwaarder dan `priority` bij het sorteren:
   * zie regel 1 hieronder.
   */
  potential?: number | null;
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
 * 1. **De potentiescore eerst, de dag-1-gok als vangnet.** Onderwerpen met de
 *    hoogste potentiescore belanden in de eerste maanden: dat is een gemeten
 *    combinatie van zichtbaarheidsgat en zoekvolume, en dus een sterker signaal
 *    dan de eenmalige LLM-inschatting waar `priority` op rust. Heeft een
 *    onderwerp nog geen potentiescore (nog geen analyse gehad, of dit merk had
 *    nog geen profielbrede herberekening), dan valt de sortering terug op
 *    `priority`, en een onderwerp MET potentiescore gaat altijd voor een
 *    onderwerp zonder: gemeten weegt zwaarder dan gegokt. Een klant die na drie
 *    maanden opzegt (besluit 7: dat kan) moet de béste drie maanden gehad
 *    hebben, niet een willekeurige greep.
 *
 *    ⚠️ Dit raakt alleen een NIEUW gebouwd plan (`createPlan()`), nooit een al
 *    aan de klant getoond jaarplan met eigen data. Een al bestaand plan
 *    herordenen zonder dat de klant iets deed, zou een schema dat hij al
 *    gezien heeft onder hem laten verschuiven, en dat is verwarrend, geen
 *    verduidelijking. Bouwt de consultant het plan opnieuw (wat al kon, en
 *    zet de vorige versie op `gestopt`, conventie 8), dan telt de actuele
 *    potentiescore mee.
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
 *    ⚠️⚠️ En dat was niet genoeg. Bij het echte plan van Van den Udenhout stond
 *    "Auto financieren · Oriëntatie" alsnog twee keer in maand 1, op plek 1 en
 *    plek 9. Oorzaak: acht onderwerpen en vier fasen, en beide tellers liepen
 *    één omhoog per pagina. Dan zit het paar (onderwerp, fase) na acht pagina's
 *    weer op zijn beginstand, want 8 is deelbaar door 4. `funnelShift()` haalt
 *    ze uit de pas, en `uniekeTitel()` is het vangnet voor het geval er écht
 *    meer plekken zijn dan combinaties (conventie 1: een regel in code, geen
 *    aanname). De unittest hield 7 onderwerpen aan; 7 en 4 vallen toevallig
 *    goed uit, en daarom zag de test niets.
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

  // Regel 1: hoogste potentiescore eerst, `priority` als vangnet en als
  // tiebreaker. Bij een echte gelijke stand de oorspronkelijke volgorde
  // aanhouden (stabiele sort), zodat twee runs op dezelfde data hetzelfde plan
  // geven.
  const topics = [...input.topics].sort((a, b) => {
    const pa = a.potential ?? null;
    const pb = b.potential ?? null;
    if (pa !== null && pb !== null && pa !== pb) return pb - pa;
    // Gemeten (potentiescore bekend) gaat altijd voor gegokt (nog niet bekend).
    if ((pa === null) !== (pb === null)) return pa === null ? 1 : -1;
    return b.priority - a.priority;
  });
  const funnels = [...input.funnels].sort((a, b) => a.sortOrder - b.sortOrder);

  const pages: PlannedPageDraft[] = [];
  const shift = funnelShift(topics.length, funnels.length);
  // De teller loopt door over de maandgrens heen. Zou hij per maand resetten,
  // dan kreeg fase 1 structureel de meeste pagina's bij een maandtotaal dat
  // niet deelbaar is door het aantal fasen.
  let n = 0;

  for (let m = 1; m <= months; m++) {
    const perMaand = input.pagesPerMonth + BUFFERS_PER_MONTH;
    // Regel 3: binnen één maand mag geen titel twee keer voorkomen.
    const titelsDezeMaand = new Map<string, number>();

    for (let i = 0; i < perMaand; i++) {
      const isBuffer = i >= input.pagesPerMonth;
      // Regel 3: rondlopen door de onderwerpen.
      const topic = topics[n % topics.length];
      // Regel 2: de fasen roteren, maar één stap per pagina is niet genoeg. Elke
      // keer dat de onderwerpenlijst rondgaat schuift de fase een extra stap op,
      // zodat het paar pas na alle combinaties terugkomt.
      const ronde = Math.floor(n / topics.length);
      const funnel = funnels[(n + ronde * shift) % funnels.length];
      n++;

      pages.push({
        monthNumber: m,
        // De invalshoek hoort in de titel, zie regel 3. Dit is een werktitel:
        // de definitieve kop komt uit de schrijfstap, die het onderwerp en de
        // fase samen als briefing krijgt.
        title: uniekeTitel(`${topic.title} · ${funnel.label}`, titelsDezeMaand),
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
 * Hoeveel schuift de fase op als de onderwerpenlijst rondgaat?
 *
 * ── HET REKENSOMMETJE ───────────────────────────────────────────────────────
 *
 * Pagina `n` krijgt onderwerp `n mod T` en fase `(n + ronde·s) mod F`, waarbij
 * `ronde = n div T`. Hetzelfde paar komt pas terug als `n` een veelvoud van `T`
 * is én `ronde·(T + s)` deelbaar is door `F`. Kies `s` zó dat `T + s` geen
 * deler gemeen heeft met `F`, en dat gebeurt pas na `T · F` pagina's: alle
 * combinaties zijn dan geweest.
 *
 * Zo'n `s` bestaat altijd. Tussen 1 en `F` liggen `F` opeenvolgende waarden van
 * `T + s`, dus daar zit er gegarandeerd één bij die 1 is modulo `F`, en 1 heeft
 * met niets een deler gemeen.
 *
 * Bij Van den Udenhout (8 onderwerpen, 4 fasen) geeft dat `s = 1` en een cyclus
 * van 32 in plaats van 8. Elf pagina's per maand passen daar ruim in.
 */
function funnelShift(topicCount: number, funnelCount: number): number {
  for (let s = 1; s <= funnelCount; s++) {
    if (gcd(topicCount + s, funnelCount) === 1) return s;
  }
  return 1; // onbereikbaar, maar een functie hoort altijd iets terug te geven
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/**
 * Het vangnet voor het geval er meer plekken zijn dan combinaties.
 *
 * Bij 40 pagina's per maand, 8 onderwerpen en 4 fasen zijn er 32 combinaties en
 * 41 plekken. Dan is herhaling rekenkundig onvermijdelijk, en de vraag is alleen
 * nog hoe je hem toont. Twee regels die letterlijk hetzelfde heten leest als een
 * fout in het plan; "(deel 2)" leest als een tweede artikel over hetzelfde, en
 * dat is precies wat het is.
 */
function uniekeTitel(basis: string, gezien: Map<string, number>): string {
  const eerder = gezien.get(basis) ?? 0;
  gezien.set(basis, eerder + 1);
  return eerder === 0 ? basis : `${basis} (deel ${eerder + 1})`;
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
