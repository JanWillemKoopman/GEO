/**
 * Het opbrengstblok: wat het abonnement tot nu toe heeft opgeleverd.
 *
 * ── WAAROM DIT GEEN LEUK EXTRAATJE IS ───────────────────────────────────────
 *
 * `docs/Nova.md` §1.1: Nova's `analytics.milestones.growingSince` ("Growing with
 * NOVA since") maakt van de lóóptijd zelf een prestatie. De les eronder is dat
 * een gereedschap wordt opgezegd zodra de gebruiker even geen tijd heeft, en een
 * programma dat loopt niet. Door besluit 7 (doorlopend opzegbaar) is dit blok
 * daarom het middel dat opzeggen tegenhoudt, en niet een sierstuk in een
 * analysescherm. Het staat op het overzicht.
 *
 * ── DRIE GETALLEN, MEER NIET ────────────────────────────────────────────────
 *
 * Nova heeft er drie: hoe lang je meedoet, hoeveel je zichtbaarheid groeide,
 * hoeveel pagina's er staan. Een vierde zou de lezer laten kiezen welk getal hij
 * gelooft. ORBIT ENGINE's tweede getal is een ander getal dan dat van Nova, en dat is
 * het hele punt van het product: zij tellen kliks uit Google, ORBIT ENGINE telt hoe vaak
 * een merk genoemd wordt in AI-antwoorden. Zodra Search Console eraan hangt komt
 * die kliklijn erbij als bewijsstuk, niet als vervanging (besluit 4).
 *
 * ── DE WAARDE PER BEZOEKER IS OPTIONEEL (BESLUIT 16) ────────────────────────
 *
 * `null` toont aantallen, een bedrag toont geld. Zo hoeft er geen scherm om
 * zodra de prijzen er zijn: dezelfde functie, één parameter erbij.
 *
 * Puur, dus testbaar (conventie 2).
 */

export interface MilestoneInput {
  /** Wanneer het abonnement begon. `null` = nooit gestart. */
  startedAt: string | null;
  /** De zichtbaarheidsscore bij de eerste meting, 0 tot 100. */
  eersteScore: number | null;
  /** De meest recente zichtbaarheidsscore, 0 tot 100. */
  laatsteScore: number | null;
  /** Hoeveel metingen er onder die twee scores liggen. */
  metingen: number;
  /** Pagina's die live staan. */
  gepubliceerd: number;
  /**
   * Wat één extra vermelding waard is, in euro. `null` = onbekend, en dan toont
   * het blok aantallen. Nooit een gok: conventie 3, onbekend is een betere
   * waarde dan een verkeerde.
   */
  waardePerVermelding?: number | null;
  now?: Date;
}

export interface Milestone {
  /** Het cijfer, groot. */
  waarde: string;
  /** Waar het cijfer over gaat. */
  label: string;
  /** Eén zin eronder. Null als er niets zinnigs bij te zeggen valt. */
  detail: string | null;
}

/**
 * De drie mijlpalen.
 *
 * ⚠️ Geeft altijd drie blokken terug, ook als er nog niets te vieren valt. Een
 * blok dat verdwijnt zodra het getal nul is, laat de klant precies op het moment
 * dat hij twijfelt een leeg scherm zien. `docs/ux-design.md` §4: een paneel dat
 * niets te tonen heeft, toont waaróm het leeg is.
 */
export function milestones(input: MilestoneInput): Milestone[] {
  const now = input.now ?? new Date();
  return [
    duurMilestone(input.startedAt, now),
    groeiMilestone(input),
    paginaMilestone(input.gepubliceerd),
  ];
}

function duurMilestone(startedAt: string | null, now: Date): Milestone {
  if (!startedAt) {
    return {
      waarde: "Nog niet",
      label: "Actief sinds",
      detail: "Het abonnement is nog niet gestart.",
    };
  }
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) {
    return { waarde: "Onbekend", label: "Actief sinds", detail: null };
  }

  const dagen = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
  return {
    waarde: start.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    label: "Actief sinds",
    detail: dagen < 31 ? `${dagen} dagen onderweg` : `Maand ${maandNummer(start, now)} sinds de start`,
  };
}

/**
 * De groei in zichtbaarheid.
 *
 * ⚠️ Bij één meting is er geen groei, alleen een startpunt. Dat opschrijven als
 * "0%" zou suggereren dat er niets gebeurde, terwijl er nog niets te vergelijken
 * is. Conventie 3: onbekend is een betere waarde dan een verkeerde.
 */
function groeiMilestone(input: MilestoneInput): Milestone {
  const { eersteScore, laatsteScore, metingen } = input;

  if (eersteScore === null || laatsteScore === null || metingen < 2) {
    return {
      waarde: laatsteScore === null ? "Nog geen" : `${Math.round(laatsteScore)}`,
      label: "Zichtbaarheid in AI-antwoorden",
      detail:
        laatsteScore === null
          ? "De eerste meting moet nog draaien."
          : "Dit is het startpunt. Na de volgende meting staat hier de groei.",
    };
  }

  const verschil = laatsteScore - eersteScore;
  const teken = verschil > 0 ? "+" : "";
  const waarde = `${teken}${Math.round(verschil)}`;

  const geld =
    typeof input.waardePerVermelding === "number" && verschil > 0
      ? ` Dat is ongeveer ${euro(verschil * input.waardePerVermelding)} aan extra waarde per maand.`
      : "";

  return {
    waarde: `${waarde} punten`,
    label: "Zichtbaarheid in AI-antwoorden",
    detail:
      verschil > 0
        ? `Van ${Math.round(eersteScore)} naar ${Math.round(laatsteScore)} sinds de start.${geld}`
        : verschil === 0
          ? `Gelijk gebleven op ${Math.round(laatsteScore)} sinds de start.`
          : `Van ${Math.round(eersteScore)} naar ${Math.round(laatsteScore)} sinds de start.`,
  };
}

function paginaMilestone(gepubliceerd: number): Milestone {
  return {
    waarde: String(gepubliceerd),
    label: gepubliceerd === 1 ? "Pagina gepubliceerd" : "Pagina's gepubliceerd",
    detail:
      gepubliceerd === 0
        ? "Zodra de eerste pagina live staat, telt hij hier mee."
        : "Geschreven door ORBIT ENGINE, gepubliceerd door jou.",
  };
}

/** De hoeveelste maand loopt dit, vanaf 1. */
function maandNummer(start: Date, now: Date): number {
  const maanden =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const naDeDag = now.getDate() >= start.getDate();
  return Math.max(1, maanden + (naDeDag ? 1 : 0));
}

/** Hele euro's, want een bedrag met centen suggereert een nauwkeurigheid die er niet is. */
function euro(bedrag: number): string {
  return `€ ${Math.round(bedrag).toLocaleString("nl-NL")}`;
}
