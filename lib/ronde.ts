/**
 * De maand: de vijf stappen die ORBIT ENGINE en de klant samen elke maand
 * zetten, geteld over déze kalendermaand.
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Het product ís een kringloop: meten, plannen, schrijven, publiceren,
 * hermeten, en dan weer van voren af aan. Die volgorde zat overal in de app,
 * in de statussen, in de taken en in de teksten, maar stond op geen enkel
 * scherm getekend. Het menu is een kast met laden, en een kast vertelt niet dat
 * de laden samen één ronde zijn.
 *
 * ── ⚠️ SINDS 23 SEPTEMBER 2026 TELT DIT PER MAAND, NIET SINDS DE START ──────
 *
 * Het blok heette "Zo werkt je maand", maar elk getal erin telde de hele
 * looptijd. Bij Van den Udenhout stond er op 23 september "18 ingepland" (het
 * hele plan van twaalf maanden) met een vinkje bij Plannen, terwijl de 14
 * pagina's van september nog op het akkoord van de klant wachtten. En
 * "Schrijven ✓ 3 teksten" telde een pagina die nog op een briefing wachtte,
 * terwijl het blok eronder "0 geschreven" zei. Een blok met een maand in de
 * titel mag alleen tellen wat in die maand gebeurd is.
 *
 * Een maand is de kalendermaand in UTC, dezelfde klok als de meetcron
 * (`vercel.json`, `0 6 1 * *`, en `volgendeMeting()` in `lib/overview.ts`).
 * Omdat de meting op de 1e draait, valt "de periode tussen twee metingen"
 * vanaf de tweede maand precies samen met de kalendermaand. Alleen de eerste
 * maand is korter: die begint bij de nulmeting.
 *
 * ── WAAROM VIJF STAPPEN EN NIET ZES ─────────────────────────────────────────
 *
 * "Kansen" was een eigen stap, maar de kansen komen uit dezelfde meting, op
 * dezelfde dag, zonder dat iemand er iets voor doet. Als stap stond hij altijd
 * tegelijk met Meten op klaar en voegde hij alleen een kolom toe. Het aantal
 * kansen staat nu onder Meten.
 *
 * ── WAT EEN STAP "KLAAR" MAAKT ──────────────────────────────────────────────
 *
 * Een stap is klaar als het werk van déze maand gedaan is, niet als er ergens
 * iets gebeurd is. Met een plan betekent dat: alle pagina's van deze maand.
 * Daarom staat er "2 van de 14": die 14 heeft de klant zelf vrijgegeven, dus
 * het is zijn eigen afspraak en geen doel dat wij hem opleggen. Zonder plan
 * deze maand volstaat één tekst.
 *
 * Conventie 2: deze module rekent alleen, zonder `server-only`, zodat
 * `scripts/test-unit.ts` hem kan testen. Het ophalen staat in
 * `lib/overview-data.ts` (`loadMaandBronnen`).
 */

export type FaseId = "meten" | "plannen" | "schrijven" | "publiceren" | "hermeten";

export type AanZet = "jij" | "orbit" | "consultant";

/** Eén geplande pagina, smal: alleen wat de maand draagt. */
export interface MaandPlanPagina {
  /** De dag waarop hij live hoort te staan, `YYYY-MM-DD`. */
  scheduledFor: string | null;
  isBuffer: boolean;
  /** `planned_pages.status`. */
  status: string;
  /** `plan_months.status` van de maand waar hij in staat. */
  maandStatus: string;
  postedAt: string | null;
  contentPieceId: string | null;
}

/** Eén tekst (de huidige versie), smal. */
export interface MaandTekst {
  id: string;
  /** `content_pieces.status`: briefing, draft, ready, archived of published. */
  status: string;
  /**
   * ⚠️ De aanmaakdatum en niet de schrijfdatum: die bestaat niet als eigen
   * kolom. `updated_at` verschuift bij elke bewerking, ook bij publiceren, dus
   * die is slechter. Een tekst die eind augustus als briefing begon en begin
   * september geschreven werd, telt daardoor in augustus.
   */
  createdAt: string;
  publishedAt: string | null;
}

export interface MaandInput {
  now: Date;
  /** Hoeveel clusters dit merk heeft. Zonder cluster valt er niets te meten. */
  clusters: number;
  /** De meetdatum van elke meetronde (`BrandPeriod.gemetenOp`). */
  metingen: (string | null)[];
  /** Openstaande kansen uit het laatste rapport. */
  kansen: number;
  planPaginas: MaandPlanPagina[];
  teksten: MaandTekst[];
  /** De rekendatum van elke hermeting (`content_impact.computed_at`). */
  hermetingen: string[];
}

export interface RondeFase {
  id: FaseId;
  label: string;
  /** Kort, met het getal erin. Staat als label onder de stapnaam. */
  stand: string;
  /** Een halve zin eronder. Leeg als de stand alles al zegt. */
  detail: string | null;
  klaar: boolean;
  /** De eerste stap die nog niet klaar is. Hooguit één van de vijf. */
  actief: boolean;
  /**
   * Wie moet er iets doen voordat deze stap verdergaat? `"consultant"` bestaat
   * sinds 16 september 2026: zonder cluster of zonder plan kan de klant niets
   * starten, en dan zou het scherm hem laten wachten op iets dat nooit vanzelf
   * komt.
   */
  aanZet: AanZet;
  /** Wat er in deze stap te doen is, voor de zin onder de balk. */
  wat: string;
}

export interface RondeMaand {
  /** "september" */
  maand: string;
  /** "sinds je nulmeting op 20 september", alleen in de eerste maand. */
  periode: string | null;
  /** "Volgende meting op 1 oktober, over 8 dagen" */
  volgende: string;
  fases: RondeFase[];
  /** Eén zin onder de balk: waar sta je, en wie is er aan zet. */
  zin: string;
  /**
   * "In augustus: 3 teksten geschreven en 2 live gezet." Staat er zodat een klant
   * op 2 oktober niet denkt dat zijn werk van september verdwenen is. `null`
   * als er vorige maand niets gebeurde.
   */
  vorigeMaand: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rekenen met maanden
// ─────────────────────────────────────────────────────────────────────────────

interface Venster {
  start: Date;
  eind: Date;
}

function venster(now: Date, verschuiving = 0): Venster {
  const j = now.getUTCFullYear();
  const m = now.getUTCMonth() + verschuiving;
  return { start: new Date(Date.UTC(j, m, 1)), eind: new Date(Date.UTC(j, m + 1, 1)) };
}

function binnen(iso: string | null, v: Venster): boolean {
  if (!iso) return false;
  // Een kale datum ("2026-09-26") lees je als middernacht UTC van die dag.
  const t = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).getTime();
  return Number.isFinite(t) && t >= v.start.getTime() && t < v.eind.getTime();
}

function maandNaam(d: Date): string {
  return d.toLocaleDateString("nl-NL", { month: "long", timeZone: "UTC" });
}

function dagEnMaand(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", timeZone: "UTC" });
}

function meervoud(n: number, een: string, meer: string): string {
  return n === 1 ? `${n} ${een}` : `${n} ${meer}`;
}

/** Een tekst is geschreven zodra hij niet meer op antwoorden wacht en niet meer in de pen zit. */
const GESCHREVEN_TEKST = new Set(["ready", "archived", "published"]);
/** Hetzelfde, vanaf de kant van het plan (`planned_pages.status`). */
const GESCHREVEN_PLAN = new Set(["ter_goedkeuring", "goedgekeurd", "geplaatst"]);

/**
 * De meetcron draait op de 1e om 06:00 UTC. Op 2 november om 12:00 zijn het er
 * dus 29 tot 1 december, niet 28: afronden naar boven, want "over 0 dagen"
 * terwijl het morgen is, klopt niet.
 */
function volgendeRegel(now: Date): string {
  const volgende = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 6));
  const dagen = Math.ceil((volgende.getTime() - now.getTime()) / 86_400_000);
  const wanneer = dagen <= 1 ? "morgen" : `over ${dagen} dagen`;
  return `Volgende meting op ${dagEnMaand(volgende)}, ${wanneer}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// De vijf stappen
// ─────────────────────────────────────────────────────────────────────────────

type Stap = Omit<RondeFase, "actief">;

function meten(input: MaandInput, v: Venster): Stap {
  const basis = { id: "meten" as const, label: "Meten" };
  if (input.clusters <= 0) {
    return {
      ...basis,
      stand: "nog geen onderwerp",
      detail: null,
      klaar: false,
      aanZet: "consultant",
      wat: "je consultant kiest samen met jou het eerste onderwerp",
    };
  }
  const dezeMaand = input.metingen
    .filter((m): m is string => binnen(m, v))
    .sort()
    .at(-1);
  if (!dezeMaand) {
    return {
      ...basis,
      stand: "nog niet gemeten",
      detail: "de meting draait op de 1e",
      klaar: false,
      aanZet: "orbit",
      wat: "ORBIT ENGINE stelt de vragen van jouw klanten aan AI-assistenten",
    };
  }
  return {
    ...basis,
    stand: dagEnMaand(new Date(dezeMaand)),
    detail:
      input.kansen > 0 ? `${meervoud(input.kansen, "kans", "kansen")} gevonden` : "geen nieuwe kansen",
    klaar: true,
    aanZet: "orbit",
    wat: "ORBIT ENGINE stelt de vragen van jouw klanten aan AI-assistenten",
  };
}

function plannen(paginas: MaandPlanPagina[], heeftPlan: boolean): Stap {
  const basis = { id: "plannen" as const, label: "Plannen" };
  const n = paginas.length;
  if (n === 0) {
    return {
      ...basis,
      stand: heeftPlan ? "niets ingepland" : "nog geen plan",
      detail: null,
      klaar: false,
      aanZet: "consultant",
      wat: "je consultant zet de pagina's voor deze maand klaar",
    };
  }
  const aantal = meervoud(n, "pagina", "pagina's");
  if (paginas.some((p) => p.maandStatus === "ter_goedkeuring")) {
    return {
      ...basis,
      stand: aantal,
      detail: "wachten op je akkoord",
      klaar: false,
      aanZet: "jij",
      wat: `geef de ${aantal} van deze maand vrij in je contentplan`,
    };
  }
  if (paginas.every((p) => p.maandStatus === "goedgekeurd")) {
    return { ...basis, stand: aantal, detail: "vrijgegeven", klaar: true, aanZet: "jij", wat: "" };
  }
  // Concept of afgewezen: het plan ligt bij ons, niet bij de klant.
  return {
    ...basis,
    stand: aantal,
    detail: "je consultant maakt het plan af",
    klaar: false,
    aanZet: "consultant",
    wat: "je consultant maakt het plan voor deze maand af",
  };
}

function schrijven(paginas: MaandPlanPagina[], buitenPlan: MaandTekst[], v: Venster): Stap {
  const basis = { id: "schrijven" as const, label: "Schrijven", aanZet: "orbit" as const };
  const extra = buitenPlan.filter((t) => GESCHREVEN_TEKST.has(t.status) && binnen(t.createdAt, v)).length;
  if (paginas.length > 0) {
    const gedaan = paginas.filter((p) => GESCHREVEN_PLAN.has(p.status)).length;
    return {
      ...basis,
      stand: `${gedaan} van de ${paginas.length}`,
      detail: extra > 0 ? `en ${extra} buiten het plan` : "geschreven",
      klaar: gedaan >= paginas.length,
      wat: "ORBIT ENGINE schrijft de pagina's van deze maand",
    };
  }
  return {
    ...basis,
    stand: extra === 0 ? "nog niets" : meervoud(extra, "tekst", "teksten"),
    detail: extra === 0 ? null : "geschreven",
    klaar: extra > 0,
    wat: "ORBIT ENGINE schrijft de pagina's die de gemiste vragen moeten winnen",
  };
}

function publiceren(
  paginas: MaandPlanPagina[],
  buitenPlan: MaandTekst[],
  v: Venster,
): Stap {
  const basis = { id: "publiceren" as const, label: "Publiceren", aanZet: "jij" as const };
  const extra = buitenPlan.filter((t) => binnen(t.publishedAt, v)).length;
  // Wat nu al klaarstaat om te plaatsen, ongeacht de maand waarin het
  // geschreven is: dat is werk dat vandaag op de klant wacht.
  const teplaatsen = buitenPlan.filter((t) => t.status === "ready" && !t.publishedAt).length;
  const wachtregel =
    teplaatsen > 0 ? `${meervoud(teplaatsen, "tekst staat", "teksten staan")} klaar` : null;

  if (paginas.length > 0) {
    const live = paginas.filter((p) => p.postedAt !== null || p.status === "geplaatst").length;
    return {
      ...basis,
      stand: `${live} van de ${paginas.length} live`,
      detail: extra > 0 ? `en ${extra} buiten het plan` : wachtregel,
      klaar: live >= paginas.length,
      wat: "zet de geschreven pagina's op je site en vul de link in",
    };
  }
  return {
    ...basis,
    stand: extra === 0 ? "nog niets live" : `${extra} live`,
    detail: extra === 0 ? wachtregel : null,
    klaar: extra > 0,
    wat:
      teplaatsen > 0
        ? `zet de ${meervoud(teplaatsen, "klare tekst", "klare teksten")} op je site en vul de link in`
        : "zet de tekst op je site en vul de link in",
  };
}

function hermeten(input: MaandInput, v: Venster): Stap {
  const basis = { id: "hermeten" as const, label: "Hermeten", aanZet: "orbit" as const };
  const n = input.hermetingen.filter((h) => binnen(h, v)).length;
  const ooitLive = input.teksten.some((t) => t.publishedAt !== null);
  return {
    ...basis,
    // ⚠️ Een hermeting valt twee en vier weken ná publicatie, dus vaak in de
    // volgende maand. Een leeg rondje zonder uitleg las als achterstand; nu
    // staat er wanneer hij komt.
    // Eén rij per golf: een pagina die na twee én na vier weken gemeten is,
    // telt twee keer. Daarom "hermetingen" en niet "pagina's nagemeten".
    stand: n > 0 ? meervoud(n, "hermeting", "hermetingen") : "nog niets",
    detail: n > 0 ? null : ooitLive ? "2 weken na publicatie" : "start na je eerste publicatie",
    klaar: n > 0,
    wat: "na twee en vier weken meet ORBIT ENGINE of het geholpen heeft",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// De maand
// ─────────────────────────────────────────────────────────────────────────────

/** Plan en teksten gesplitst voor één venster. Gedeeld door deze en vorige maand. */
function splits(input: MaandInput, v: Venster) {
  const echt = input.planPaginas.filter((p) => !p.isBuffer);
  const aanPlan = new Set(echt.map((p) => p.contentPieceId).filter((id): id is string => !!id));
  return {
    paginas: echt.filter((p) => binnen(p.scheduledFor, v)),
    heeftPlan: echt.length > 0,
    buitenPlan: input.teksten.filter((t) => !aanPlan.has(t.id)),
  };
}

export function ronde(input: MaandInput): RondeMaand {
  const v = venster(input.now);
  const { paginas, heeftPlan, buitenPlan } = splits(input, v);

  const stappen: Stap[] = [
    meten(input, v),
    plannen(paginas, heeftPlan),
    schrijven(paginas, buitenPlan, v),
    publiceren(paginas, buitenPlan, v),
    hermeten(input, v),
  ];
  const eersteOpen = stappen.findIndex((s) => !s.klaar);
  const fases: RondeFase[] = stappen.map((s, i) => ({ ...s, actief: i === eersteOpen }));

  const maand = maandNaam(v.start);
  const eerste = input.metingen.filter((m): m is string => !!m).sort()[0];
  const periode =
    eerste && binnen(eerste, v) && new Date(eerste).getUTCDate() > 1
      ? `sinds je nulmeting op ${dagEnMaand(new Date(eerste))}`
      : null;

  return {
    maand,
    periode,
    volgende: volgendeRegel(input.now),
    fases,
    zin: rondeZin(fases, maand, input.now),
    vorigeMaand: vorigeMaandRegel(input),
  };
}

/**
 * ⚠️ Nooit "je bent klaar". Een maand die rond is, begint op de 1e opnieuw, en
 * een klant die leest dat hij klaar is, komt niet terug.
 */
function rondeZin(fases: RondeFase[], maand: string, now: Date): string {
  const actief = fases.find((f) => f.actief);
  if (!actief) {
    const volgende = dagEnMaand(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
    return `Je ${maand} is rond. Op ${volgende} meet ORBIT ENGINE opnieuw en zet het nieuw werk voor je klaar.`;
  }
  if (actief.aanZet === "jij") {
    return `Jij bent aan zet: ${actief.wat}. Het staat hieronder bij wat er op je wacht.`;
  }
  if (actief.aanZet === "consultant") {
    return `Je consultant is aan zet: ${actief.wat}. Je hoeft daar zelf niets voor te doen.`;
  }
  return `ORBIT ENGINE is aan zet: ${actief.wat}. Je hoeft daar zelf niets voor te doen.`;
}

/**
 * Wat er vorige maand gebeurd is, in één regel.
 *
 * Hier tellen de teksten zelf en niet de planregels: de vraag is "wat is er
 * gedaan", niet "hoe ver was het plan". Een planpagina die live staat en aan
 * een tekst hangt, telt één keer: via de tekst als die een publicatiedatum
 * heeft, anders via de planregel.
 */
function vorigeMaandRegel(input: MaandInput): string | null {
  const v = venster(input.now, -1);
  const geschreven = input.teksten.filter(
    (t) => GESCHREVEN_TEKST.has(t.status) && binnen(t.createdAt, v),
  ).length;
  const liveTekst = new Set(input.teksten.filter((t) => binnen(t.publishedAt, v)).map((t) => t.id));
  const livePlan = input.planPaginas.filter(
    (p) => !p.isBuffer && binnen(p.postedAt, v) && !(p.contentPieceId && liveTekst.has(p.contentPieceId)),
  ).length;
  const live = liveTekst.size + livePlan;
  const nagemeten = input.hermetingen.filter((h) => binnen(h, v)).length;

  const delen = [
    geschreven > 0 ? `${meervoud(geschreven, "tekst", "teksten")} geschreven` : null,
    live > 0 ? `${live} live gezet` : null,
    nagemeten > 0 ? meervoud(nagemeten, "hermeting", "hermetingen") : null,
  ].filter((d): d is string => d !== null);
  if (delen.length === 0) return null;

  const lijst =
    delen.length === 1 ? delen[0] : `${delen.slice(0, -1).join(", ")} en ${delen.at(-1)}`;
  return `In ${maandNaam(v.start)}: ${lijst}.`;
}
