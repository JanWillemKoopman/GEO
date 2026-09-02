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
 * De aanleiding staat in `docs/logbook.md` als P3: er was tot 11
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
 * De twee plafonds, allebei in euro's, allebei per KALENDERDAG (UTC).
 *
 * ── WAAROM ER TWEE ZIJN EN NIET ÉÉN ─────────────────────────────────────────
 *
 * Ze vangen verschillende rampen. Het dagplafond per account vangt de klant die
 * structureel te veel kost op één dag: een drukke onboarding, een maand in één
 * keer goedgekeurd. Het dagplafond over alle accounts samen vangt het ongeluk:
 * een lus die doordraait, een cron die twintig keer vuurt, een fout die pas
 * zichtbaar wordt op de rekening. Eén plafond zou altijd één van die twee
 * missen.
 *
 * ── HERSTELPLAN NA AUDIT T5 (2 september 2026): VAN MAAND NAAR DAG ─────────
 *
 * Tot vandaag was het accountplafond een MAANDplafond van €50, gekozen op de
 * cijfers van 11 augustus 2026: een klant met vier onderwerpen kost ~€6 per
 * maand, dus €50 liet een factor acht ruimte. De eigenaar wil per klant een
 * DAGplafond van €20 in plaats daarvan: strenger op één dag, maar met tien
 * pagina's op ~$0,26 per reparatieronde (herstelplan T1.4) en een meting van
 * dertig vragen op ~€0,85 past een normale werkdag daar ruim onder, en een
 * onboarding van ~€0,25 al helemaal. Structureel tegen dit plafond aanlopen is
 * dus een teken dat er iets anders aan de hand is, niet dat de klant gewoon
 * druk is.
 *
 * Het totaalplafond was al een dagplafond en gaat van €150 naar €50: bij een
 * accountplafond van €20 per dag zou €150 zeventien klanten tegelijk tegen hun
 * eigen plafond aan moeten laten lopen voor het ooit zou raken. €50 vangt nog
 * altijd twee klanten die op dezelfde dag tegen hun plafond zitten, en blijft
 * daarmee de rem die een ontspoorde lus of cron eerder aanslaat dan voorheen.
 */
export const DEFAULT_ACCOUNT_DAILY_LIMIT_EUR = 20;
export const DEFAULT_TOTAL_DAILY_LIMIT_EUR = 50;

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

/**
 * Welk plafond geraakt is. Allebei een dagplafond sinds T5 (herstelplan na
 * audit); het onderscheid is WIE het plafond draagt, niet meer de periode.
 */
export type SpendScope = "account" | "totaal";

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
 * `spentUsd` is wat er vandaag al staat, `limitEur` het plafond. De
 * vergelijking is `>=`, niet `>`: staat er precies het plafond op, dan is het op.
 *
 * ── DE MELDING (T5.2, herstelplan na audit) ─────────────────────────────────
 *
 * Niet alleen "geweigerd", maar ook wat er nu moet gebeuren: allebei de
 * plafonds resetten om middernacht UTC, dus "wacht tot morgen" is voor beide
 * een geldig antwoord. Het verschil zit in het ANDERE antwoord. Bij het
 * accountplafond is dat "verhoog het voor dit ene account in het beheerscherm";
 * bij het totaalplafond, de noodrem tegen een ontspoorde taak, is dat "bel
 * iemand" zodra het overdag raakt, want dan is er vermoedelijk iets kapot en
 * geen klant die toevallig veel werk laat doen.
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
    scope === "account"
      ? `Het dagbudget van dit account is op: ${euro(spentEur)} van ${euro(limitEur)} gebruikt. ` +
        `Nieuw betaald werk start vanzelf weer morgen (00:00 uur), of meteen zodra je het dagplafond ` +
        `voor dit account verhoogt in het beheerscherm.`
      : `Het dagbudget van ORBIT ENGINE is op: ${euro(spentEur)} van ${euro(limitEur)} gebruikt over alle ` +
        `klanten samen. Dit is de noodrem tegen een taak die doordraait, geen normale drukte. Kijk in het ` +
        `beheerscherm wat er vandaag gedraaid heeft: is dat verklaarbaar, dan mag je het plafond verhogen en ` +
        `morgen (00:00 uur) gaat de teller vanzelf weer op nul; lijkt er iets vast te lopen, bel dan iemand ` +
        `voordat je het plafond verhoogt.`;

  return { ok: false, scope, message, spentEur, limitEur };
}

/**
 * Beide plafonds achter elkaar, en het totaalplafond gaat voor.
 *
 * ⚠️ De volgorde is niet willekeurig. Zit je tegen allebei aan, dan is het
 * totaalplafond het interessantere bericht: dat betekent dat er iets aan de
 * hand is over alle klanten heen, en dat wil je weten vóór je het dagplafond
 * van één account gaat verhogen.
 */
export function combinedVerdict(totaal: SpendVerdict, account: SpendVerdict): SpendVerdict {
  if (!totaal.ok) return totaal;
  return account;
}
