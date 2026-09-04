/**
 * ADVISEREN OF HELPEN KIEZEN (V6 uit
 * `docs/tasks/contentkwaliteit-copywriterronde.md`).
 *
 * ── WAT ER MISGING ──────────────────────────────────────────────────────────
 *
 * Over de twaalf pagina's van 3 september 2026: 72 zinnen die beginnen met
 * "Vraag", "Controleer", "Laat", "Bespreek" of "Leg", waarvan 23 op één pagina.
 * Plus 120 slappe formuleringen op 13.605 woorden, één per 113 woorden, met
 * "mogelijk" (43), "hangt af van" (26) en "niet automatisch" (18) bovenaan. De
 * externe copywriter, regel 12: vermijd "kan passend zijn", "hangt af van",
 * "doorgaans", "over het algemeen" wanneer een concretere formulering mogelijk
 * is. En zijn ondergrens 5: disclaimertaal mag niet de dominante stem van een
 * commerciële pagina worden.
 *
 * Op drie pagina's sloeg dat door tot tekst die tegen de klant werkt: een
 * checklist om dakdekkers te vergelijken, en twee keer de oproep om de
 * registratie van de eigen therapeut na te trekken bij de beroepsvereniging.
 *
 * ── WAAROM DIT EEN GRENS IS EN GEEN VERBOD ──────────────────────────────────
 *
 * Een deel van die voorzichtigheid is terecht, zeker in de zorg: "vraag je
 * huisarts bij aanhoudende pijn" hoort er gewoon te staan. De grenzen liggen
 * daarom bij het DOORSLAAN en niet bij het eerste geval, en ze zijn ruim
 * gekozen ten opzichte van wat er gemeten is. Wat wél absoluut is, is de tekst
 * die de bezoeker wegstuurt: dat staat los in `checkZelfondermijning`.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

/** Werkwoorden waarmee een pagina de lezer huiswerk geeft. */
const GEBIEDEND = /(^|[.!?]\s+|\n)(Vraag|Controleer|Laat|Bespreek|Leg|Verzamel|Noteer|Regel)\s/g;

/** Formuleringen die een zin zijn zekerheid ontnemen (regel 12 van de copywriter). */
const SLAP = [
  "kan passend zijn",
  "kan relevant zijn",
  "hangt af van",
  "hangt onder meer af",
  "doorgaans",
  "over het algemeen",
  "in het algemeen",
  "niet automatisch",
  "in de meeste gevallen",
  "kan nodig zijn",
  "kan zinvol zijn",
  "eventueel",
  "mogelijk is",
  "waar mogelijk",
];

/**
 * Grenzen per honderd woorden, geijkt op de twaalf pagina's van 3 september 2026.
 *
 * ⚠️ De eerste poging stond op 0,35 en 0,5, en die sloeg aan op ELF van de
 * twaalf pagina's. Een controle die overal afgaat is geen signaal maar ruis, en
 * hij zou de reparatie van elke pagina met dezelfde bevinding vullen. De
 * grenzen liggen nu waar de uitschieters beginnen:
 *
 *   gebiedende zinnen per 100 woorden: 0,19 tot 1,50, mediaan ongeveer 0,39.
 *   Boven 0,6 zitten er drie: de isolatiepagina (0,61), de dakinspectiepagina
 *   (0,60) en de hoofdpagina over daklekkage (1,50, met 23 gebiedende zinnen).
 *
 *   slappe formuleringen per 100 woorden: 0,10 tot 1,12, mediaan ongeveer 0,58.
 *   Boven 0,8 zitten er twee: het gratis medisch consult (1,12) en de pagina
 *   over sportfysiotherapie (0,91). Precies de twee die de copywriter aanwees
 *   als te voorzichtig, waarvan hij er één "ABSOLUUT NIET" gaf.
 *
 * Gekozen op deze twaalf, dus een startwaarde en geen wet; zelfde afspraak als
 * bij `GOED_GENOEG` in `content-input-gate.ts`.
 */
export const GEBIEDEND_PER_HONDERD_MAX = 0.6;
export const SLAP_PER_HONDERD_MAX = 0.8;

export interface AdviestoonResult {
  gebiedend: number;
  slap: number;
  woorden: number;
  /** De eerste gevonden slappe formuleringen, voor de bevinding. */
  voorbeelden: string[];
  /**
   * De kop van de sectie waar het huiswerk zich ophoopt (optimalisatie 16).
   *
   * `null` als er geen secties zijn meegegeven of als er niets te wijzen valt.
   * ⚠️ Waarom dit erbij hoort: de telling stond op de hele pagina, en van de 72
   * gebiedende zinnen van 3 september stonden er 23 op één pagina en daarbinnen
   * in een handvol secties. Een bevinding zonder sectie stuurt de reparatie naar
   * de pagina als geheel, en dan raakt hij precies de alinea's die goed waren.
   */
  zwaarsteSectie: string | null;
  issues: string[];
}

export interface AdviestoonInput {
  tekst: string;
  /** De pagina in secties, om de bevinding een adres te geven (optimalisatie 16). */
  secties?: readonly { heading: string; body: string }[];
}

/** Hoeveel gebiedende zinnen staan er in deze tekst? */
function telGebiedend(tekst: string): number {
  return ((tekst ?? "").match(GEBIEDEND) ?? []).length;
}

export function checkAdviestoon(invoer: string | AdviestoonInput): AdviestoonResult {
  const tekst = typeof invoer === "string" ? invoer : invoer.tekst;
  const secties = typeof invoer === "string" ? [] : (invoer.secties ?? []);
  const veilig = tekst ?? "";
  const woorden = veilig.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w)).length;

  const gebiedend = telGebiedend(veilig);

  // Waar zit het huiswerk? De sectie met de meeste gebiedende zinnen, en alleen
  // als het er meer dan één zijn: bij één zin is "de sectie aanwijzen" toeval.
  const perSectie = secties
    .map((sectie) => ({ heading: sectie.heading, aantal: telGebiedend(sectie.body) }))
    .sort((a, b) => b.aantal - a.aantal);
  const zwaarsteSectie =
    perSectie[0] && perSectie[0].aantal > 1 && perSectie[0].heading.trim()
      ? perSectie[0].heading
      : null;

  const laag = veilig.toLowerCase();
  const voorbeelden: string[] = [];
  let slap = 0;
  for (const term of SLAP) {
    const treffers = laag.split(term).length - 1;
    if (treffers > 0) {
      slap += treffers;
      voorbeelden.push(`"${term}" (${treffers}x)`);
    }
  }

  const issues: string[] = [];
  if (woorden >= 300) {
    const gPer = (gebiedend / woorden) * 100;
    const sPer = (slap / woorden) * 100;

    if (gPer > GEBIEDEND_PER_HONDERD_MAX) {
      issues.push(
        `${gebiedend} zinnen op deze pagina geven de lezer huiswerk ("Vraag ...", "Controleer ...", ` +
          `"Laat ... vastleggen")` +
          (zwaarsteSectie ? `, de meeste in "${zwaarsteSectie}"` : "") +
          `. Dat is advies over hoe je een aanbieder beoordeelt, en dit is de ` +
          `pagina van de aanbieder zelf. Zeg wat jullie doen in plaats van wat de lezer moet navragen.`,
      );
    }

    if (sPer > SLAP_PER_HONDERD_MAX) {
      issues.push(
        `${slap} keer een formulering die de zin zijn zekerheid ontneemt: ` +
          `${voorbeelden.slice(0, 3).join(", ")}. Schrijf concreet wat er geldt, of laat de zin weg.`,
      );
    }
  }

  return { gebiedend, slap, woorden, voorbeelden: voorbeelden.slice(0, 5), zwaarsteSectie, issues };
}

/**
 * Stuurt de pagina de bezoeker weg van de klant?
 *
 * ⚠️ Dit is de enige regel in deze module zonder grens: één zin is er al één te
 * veel. Op de site van MJB stond een checklist om dakdekkers eerlijk te
 * vergelijken, met de tip hem in twee plaatsen te gebruiken. Op twee pagina's
 * van Fysio Centrum Utrecht stond dat de bezoeker de registratie van de eigen
 * behandelaar moest natrekken, met een link naar de beroepsvereniging erbij.
 * Uitstekende consumentenvoorlichting, en de verkeerde pagina ervoor.
 */
const ZELFONDERMIJNING = [
  "vergelijk je dakdekkers",
  "vergelijk aanbieders",
  "vergelijk verschillende aanbieders",
  "vergelijk offertes van",
  "bij meerdere aanbieders",
  "controleerbare registratie",
  "controleer de actuele inschrijving",
  "controleer de registratie",
  "vraag naar de registratie",
  "is niet automatisch hetzelfde als registratie",
  "dezelfde checklist",
];

export interface ZelfondermijningResult {
  zinnen: string[];
  issues: string[];
}

export function checkZelfondermijning(tekst: string): ZelfondermijningResult {
  const zinnen = (tekst ?? "")
    .replace(/^#{1,6} .*$/gm, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((z) => z.trim())
    .filter((z) => {
      const laag = z.toLowerCase();
      return ZELFONDERMIJNING.some((t) => laag.includes(t));
    })
    .slice(0, 3);

  return {
    zinnen,
    issues: zinnen.map(
      (z) =>
        `Deze zin stuurt de bezoeker weg om de klant zelf te controleren of te vergelijken: "${z}". ` +
        `Dat hoort op een vergelijkingssite, niet op de site van de aanbieder. Zet er de reden voor ` +
        `in de plaats waarom hij verder niet hoeft te kijken.`,
    ),
  };
}

/** Het promptblok bij deze twee regels. */
export function adviestoonblok(): string {
  return (
    `\nDE TOON. Dit is de site van de ondernemer zelf, geen consumentengids. Twee dingen volgen ` +
    `daaruit:\n` +
    `- Schrijf niet wat de lezer moet navragen, controleren of laten vastleggen, maar wat dit ` +
    `bedrijf doet. "Vraag vooraf naar de prijs" wordt "u hoort de prijs voordat wij beginnen".\n` +
    `- Zet de lezer NOOIT aan om aanbieders te vergelijken of om de papieren van dit bedrijf na te ` +
    `trekken. Geen checklists om een vakman mee te beoordelen, geen links naar een beroepsregister.\n` +
    `Voorzichtig blijven mag waar het moet, zeker in de zorg, maar laat een voorbehoud nooit de ` +
    `dominante stem van de pagina worden.`
  );
}
