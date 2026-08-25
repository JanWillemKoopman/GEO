/**
 * De kalender onder het contentplan: welke maand is maand 4, en op welke dag
 * verschijnt de derde pagina daarin?
 *
 * ── WAAROM DIT NIET MEER UIT DE PAGINA'S KOMT ───────────────────────────────
 *
 * `monthCalendarLabel()` in `lib/plan-overview.ts` leidde de kalendermaand af
 * uit de vroegste publicatiedatum die in die maand stond. Dat werkte zolang elke
 * maand bij het opstellen al volgepland wérd. Sinds de voorraad (migratie 0065)
 * begint elke maand leeg, en een lege maand heeft dan geen naam meer: er stond
 * "Maand 7" zonder kalender, en dat is precies de maand waar iemand iets in wil
 * slepen.
 *
 * De waarheid stond altijd al ergens anders: `content_plans.started_on` plus het
 * maandnummer. Die twee samen geven de kalendermaand, ook als er nog geen
 * enkele pagina in staat.
 *
 * Puur en zonder `server-only` (conventie 2): het planscherm rekent hiermee in
 * de browser, en `scripts/test-unit.ts` moet erbij kunnen.
 */

const MAANDNAMEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
] as const;

/**
 * Binnen welke dagen van de maand plannen we?
 *
 * Tot en met 28, zodat februari geen uitzondering is. Overgenomen uit
 * `lib/plan-constants.ts`, waar dezelfde regel gold.
 */
const LAATSTE_DAG = 28;

export interface KalenderMaand {
  /** Nul-gebaseerd, zoals `Date.getUTCMonth()`. */
  maandIndex: number;
  jaar: number;
  /** "augustus 2026". */
  label: string;
}

/**
 * Welke kalendermaand is maand `monthNumber` van dit plan?
 *
 * Maand 1 is de maand waarin het plan startte, niet de maand erna: een plan dat
 * op 12 augustus begint heeft augustus als maand 1. Dat is hoe de klant het
 * telt, en het is ook wat de oude afleiding uit de publicatiedata opleverde.
 */
export function monthCalendar(
  startedOn: string,
  monthNumber: number,
): KalenderMaand | null {
  const start = new Date(startedOn);
  if (Number.isNaN(start.getTime())) return null;
  if (!Number.isFinite(monthNumber) || monthNumber < 1) return null;

  // ⚠️ Rekenen via UTC. `started_on` is een kale datum ("2026-08-12") die als
  // middernacht UTC binnenkomt; met lokale getters wordt dat in een negatieve
  // tijdzone de dag ervoor, en bij de eerste van de maand verschuift de hele
  // kop een maand terug.
  const d = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + (monthNumber - 1), 1),
  );
  return {
    maandIndex: d.getUTCMonth(),
    jaar: d.getUTCFullYear(),
    label: `${MAANDNAMEN[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
  };
}

/** Is maand `monthNumber` de maand waarin we vandaag leven? */
export function isRunningMonth(
  startedOn: string,
  monthNumber: number,
  now: Date = new Date(),
): boolean {
  const k = monthCalendar(startedOn, monthNumber);
  if (!k) return false;
  // De UTC-kalender van het plan naast de lokale kalender van de lezer: "welke
  // maand is het nu" is een vraag over de klok van de klant.
  return k.jaar === now.getFullYear() && k.maandIndex === now.getMonth();
}

/** Ligt deze maand volledig in het verleden? Bepaalt of je er nog in mag plannen. */
export function isPastMonth(
  startedOn: string,
  monthNumber: number,
  now: Date = new Date(),
): boolean {
  const k = monthCalendar(startedOn, monthNumber);
  if (!k) return false;
  const maandVanPlan = k.jaar * 12 + k.maandIndex;
  const maandVanNu = now.getFullYear() * 12 + now.getMonth();
  return maandVanPlan < maandVanNu;
}

/**
 * De publicatiedata voor `aantal` pagina's in één maand.
 *
 * Verspreid over dag 1 tot en met 28 in plaats van allemaal op de eerste: een
 * klant die twintig pagina's per maand afneemt wil niet twintig keer op dezelfde
 * ochtend iets moeten plaatsen, en een zoekmachine ziet liever een gestage
 * stroom.
 *
 * ⚠️ De spreiding hangt af van het AANTAL pagina's in de maand en niet van de
 * quota van het pakket. Dat is nieuw sinds de gebruiker zelf mag samenstellen
 * (besluit: geen enkele grens aan het aantal per maand): zet iemand er drie in,
 * dan staan ze op dag 1, 10 en 19, en niet op dag 1, 2 en 3 met de rest van de
 * maand leeg.
 *
 * ⚠️⚠️ IN DE LOPENDE MAAND BEGINT DE SPREIDING MORGEN, niet op de eerste.
 * Gevonden op het scherm van Gasservice Brabant: het plan werd op 25 augustus
 * opgesteld en maand 1 is augustus, dus alle tien de pagina's kregen een datum
 * tussen 1 en 28 augustus. Negen daarvan lagen al in het verleden, en het scherm
 * meldde bij elke regel "Stond gepland voor 1 augustus". Een planning die begint
 * met negen achterstallige regels is geen planning.
 */
export function spreadDates(
  startedOn: string,
  monthNumber: number,
  aantal: number,
  now: Date = new Date(),
): string[] {
  const k = monthCalendar(startedOn, monthNumber);
  if (!k || aantal < 1) return [];

  // In de lopende maand is de vroegste bruikbare dag morgen: vandaag schrijven
  // kan niet meer, de schrijfronde draait 's nachts.
  const eersteDag = isRunningMonth(startedOn, monthNumber, now)
    ? Math.min(LAATSTE_DAG, now.getDate() + 1)
    : 1;
  const ruimte = LAATSTE_DAG - eersteDag;

  const stap = aantal === 1 ? 0 : ruimte / (aantal - 1);
  const data: string[] = [];
  for (let i = 0; i < aantal; i++) {
    const dag = Math.min(LAATSTE_DAG, Math.max(1, Math.round(eersteDag + i * stap)));
    const d = new Date(Date.UTC(k.jaar, k.maandIndex, dag));
    data.push(d.toISOString().slice(0, 10));
  }
  return data;
}

export interface HerplanRij {
  id: string;
  sort_order: number;
  scheduled_for: string | null;
  /** Een pagina die al live staat, houdt zijn datum. */
  status: string;
}

export interface HerplanUpdate {
  id: string;
  sort_order: number;
  scheduled_for: string | null;
}

/**
 * De hele maand opnieuw doornummeren en dateren.
 *
 * Draait na elke wijziging in een maand: iets erbij gesleept, iets eruit
 * gehaald, iets verplaatst. De volgorde van de lijst die binnenkomt IS de
 * gewenste volgorde; deze functie hangt er alleen kloppende nummers en data aan.
 *
 * ⚠️ Een pagina die al geplaatst is, houdt zijn publicatiedatum. Die datum is de
 * werkelijkheid geworden en verzetten zou een leugen opleveren over wanneer er
 * iets live ging. Zelfde regel als in `lib/plan-order.ts`. Hij houdt wél zijn
 * plek in de nummering, anders springt hij bij het volgende verversen alsnog.
 */
export function resequenceMonth(
  startedOn: string,
  monthNumber: number,
  rijen: HerplanRij[],
  now: Date = new Date(),
): HerplanUpdate[] {
  const data = spreadDates(startedOn, monthNumber, rijen.length, now);
  const updates: HerplanUpdate[] = [];

  for (const [i, rij] of rijen.entries()) {
    const nieuweDatum = rij.status === "geplaatst" ? rij.scheduled_for : (data[i] ?? null);
    // Alleen wat echt verandert gaat naar de database. Scheelt bij een maand van
    // tien pagina's negen updates als er één kaart bij komt onderaan.
    if (rij.sort_order === i && rij.scheduled_for === nieuweDatum) continue;
    updates.push({ id: rij.id, sort_order: i, scheduled_for: nieuweDatum });
  }
  return updates;
}

/** "12 september", of een lege tekst bij een onbruikbare datum. */
export function formatDagNL(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MAANDNAMEN[d.getUTCMonth()]}`;
}
