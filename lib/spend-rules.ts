/**
 * Het budgetplafond: hoeveel er nog uitgegeven mag worden, en wat je leest als
 * het op is.
 *
 * ── WAAROM DEZE REM APART STAAT VAN DE ANDERE ───────────────────────────────
 *
 * `lib/cost-guard.ts` beantwoordt de vraag WIE er betaald werk mag starten
 * (besluit 18: alleen de beheerder). Deze module beantwoordt HOEVEEL er nog
 * over is. Dat zijn twee onafhankelijke remmen en ze horen allebei te gelden:
 * een beheerder die zich vergist in een lus kan net zo goed een rekening
 * opblazen als een klant die alle knoppen indrukt. Besluit 18 haalde de ene
 * risicobron weg en liet de andere staan.
 *
 * De aanleiding staat in `docs/tasks/lanceerplan.md` §0b als P3: er was tot 11
 * augustus 2026 precies één plafond in de hele app, en dat gold alleen de
 * onboarding van één merk ($2,15, `lib/pipeline/onboarding-budget.ts`). Alles
 * daarna, de metingen, het schrijven, het herschrijven, kon ongelimiteerd
 * doorlopen.
 *
 * ── WAT DEZE REM WEL EN NIET IS ─────────────────────────────────────────────
 *
 * Hij blokkeert hard. Een waarschuwing die je kunt wegklikken houdt geen enkele
 * uitgave tegen, en dat is precies wat er nodig was. De melding zegt daarom
 * wát het plafond is, hoeveel er al op staat en wie het kan verhogen, want een
 * blokkade zonder uitweg is een storing en geen rem.
 *
 * Hij is GEEN exacte boekhouding. De grens wordt gecontroleerd vóór een taak
 * begint, niet tijdens; een meetronde die al loopt wordt niet halverwege
 * afgekapt. Een enkele ronde kan het plafond dus met ~$1 overschrijden. Dat is
 * de bedoeling: halverwege stoppen laat een analyse in een halve toestand
 * achter, en dat is een groter probleem dan een dollar.
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */

/**
 * Van dollars naar euro's, en waarom dat hier met een vaste koers mag.
 *
 * Het kostenlogboek (`ai_calls.cost_usd`) rekent in dollars, want dat is wat
 * OpenAI factureert. De eigenaar denkt en begroot in euro's. Ergens moet die
 * vertaling staan, en een echte wisselkoers ophalen zou betekenen dat een
 * netwerkstoring de rem laat falen. Dat is de verkeerde afhankelijkheid voor
 * een veiligheidsmechanisme.
 *
 * Een vaste koers is hier goed genoeg omdat dit een REM is en geen factuur:
 * zit hij er 5% naast, dan staat het plafond 5% hoger of lager dan bedoeld, en
 * dat verandert niets aan wat hij tegenhoudt. Voor de echte boekhouding staan
 * de dollars onaangetast in `ai_calls` (conventie 8).
 */
export const USD_PER_EUR = 1.08;

export function usdToEur(usd: number): number {
  return usd / USD_PER_EUR;
}

/**
 * De twee plafonds, allebei in euro's.
 *
 * ── WAAROM ER TWEE ZIJN EN NIET ÉÉN ─────────────────────────────────────────
 *
 * Ze vangen verschillende rampen. Het maandplafond per account vangt de klant
 * die structureel te veel kost: acht onderwerpen, elke maand opnieuw gemeten en
 * geschreven. Het dagplafond over alle accounts samen vangt het ongeluk: een
 * lus die doordraait, een cron die twintig keer vuurt, een fout die pas
 * zichtbaar wordt op de rekening. Eén plafond zou altijd één van die twee
 * missen.
 *
 * De standaardbedragen zijn gekozen op de echte cijfers van 11 augustus 2026.
 * Een klant met vier onderwerpen kost ~$3,30 per maand aan metingen plus ~$2,80
 * aan tien pagina's, dus ruwweg €6. Het plafond van €50 laat daarmee een factor
 * acht ruimte: het raakt een normale klant nooit en stopt een ontspoorde wel.
 *
 * Het dagplafond van €150 is bewust hoger dan het maandplafond van één account:
 * het gaat over alle klanten samen, en het hoort een ramp te vangen, geen drukke
 * dag. Twintig klanten die tegelijk hun maand goedgekeurd krijgen is ~€52 en
 * moet gewoon door kunnen.
 */
export const DEFAULT_MONTHLY_LIMIT_EUR = 50;
export const DEFAULT_DAILY_LIMIT_EUR = 150;

/** Leest een plafond uit een omgevingsvariabele, met de standaard als terugval. */
export function limitFromEnv(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  // Onbruikbaar of onzinnig (negatief, NaN) valt terug op de standaard in
  // plaats van de rem uit te zetten: een typefout in Vercel mag geen open
  // kraan opleveren. Nul is wél geldig, dat is "alles op slot".
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export type SpendScope = "maand" | "dag";

export interface SpendVerdict {
  ok: boolean;
  /** Welk plafond geraakt is. Null zolang het goed gaat. */
  scope: SpendScope | null;
  /** Wat de klant of de beheerder leest. Null zolang het goed gaat. */
  message: string | null;
  /** Uitgegeven in euro's, afgerond op centen. Voor het beheerpaneel. */
  spentEur: number;
  limitEur: number;
}

function euro(n: number): string {
  // Nederlandse notatie: komma als decimaalteken. `toLocaleString` met een
  // vaste locale in plaats van de locale van de server, want die is in Vercel
  // niet Nederlands en het bedrag hoort er voor iedereen hetzelfde uit te zien.
  return `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Past deze uitgave nog binnen het plafond?
 *
 * `spentUsd` is wat er in de periode al staat, `limitEur` het plafond. De
 * vergelijking is `>=`, niet `>`: staat er precies het plafond op, dan is het op.
 *
 * De melding noemt drie dingen, en alle drie met opzet (K2 uit het lanceerplan,
 * elke foutmelding is specifiek): het bedrag dat er staat, het plafond, en waar
 * je het verhoogt. Een blokkade zonder die derde zin is een doodlopende weg.
 */
export function spendVerdict(
  scope: SpendScope,
  spentUsd: number,
  limitEur: number,
): SpendVerdict {
  const spentEur = round2(usdToEur(spentUsd));
  if (spentEur < limitEur) {
    return { ok: true, scope: null, message: null, spentEur, limitEur };
  }

  const message =
    scope === "maand"
      ? `Het maandbudget van dit account is op: ${euro(spentEur)} van ${euro(limitEur)} gebruikt. ` +
        `Nieuw betaald werk start pas weer volgende maand, of zodra je het plafond verhoogt in het beheerscherm.`
      : `Het dagbudget van Aura is op: ${euro(spentEur)} van ${euro(limitEur)} gebruikt over alle klanten samen. ` +
        `Dit is de noodrem tegen een taak die doordraait. Kijk in het beheerscherm wat er vandaag gedraaid heeft ` +
        `voordat je het plafond verhoogt.`;

  return { ok: false, scope, message, spentEur, limitEur };
}

/**
 * Beide plafonds achter elkaar, en het dagplafond gaat voor.
 *
 * ⚠️ De volgorde is niet willekeurig. Zit je tegen allebei aan, dan is het
 * dagplafond het interessantere bericht: dat betekent dat er iets aan de hand is
 * over alle klanten heen, en dat wil je weten vóór je het maandplafond van één
 * account gaat verhogen.
 */
export function combinedVerdict(dag: SpendVerdict, maand: SpendVerdict): SpendVerdict {
  if (!dag.ok) return dag;
  return maand;
}
