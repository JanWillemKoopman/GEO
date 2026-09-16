/**
 * Deterministische controles vóór het opslaan van een handmatige bewerking
 * (blok C, punt 14, `docs/tasks/nova-vergelijking-verbeterpunten.md`).
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * Conventie 1: elke promptinstructie krijgt een deterministisch vangnet in
 * code. De schrijfpijplijn zelf heeft dat al, uitgebreid, via het
 * kwaliteitsraamwerk (`lib/pipeline/quality-issue.ts`,
 * `lib/content-final-gate.ts`). De handmatige bewerkroute (PATCH
 * `/api/analyses/[id]/content/[pieceId]`) niet: een klant kan met de hand een
 * lege meta-titel, een leeg H1 (de paginatitel) of een dode link opslaan, en
 * dat vindt niemand terug tot de volgende meting.
 *
 * Nova toetst bij opslaan op vijf dingen: lege meta-titel, lege H1, lege
 * meta-omschrijving, het belangrijkste zoekwoord dat nergens in titel, H1 of
 * tekst voorkomt, en een link zonder adres. ORBIT ENGINE heeft geen apart
 * H1-veld: de paginatitel (`title`) vervult die rol, dus die controle valt
 * hier samen met de titelcontrole. Het "belangrijkste zoekwoord" bestaat hier
 * niet als los veld; `cluster` is de dichtstbijzijnde tekst die er hetzelfde
 * over zegt (het onderwerp waar deze pagina op moet scoren), dus die controle
 * slaat over als `cluster` leeg is (conventie 3: onbekend is beter dan een
 * verkeerde aanname over wat het zoekwoord zou moeten zijn).
 *
 * Puur, dus testbaar (conventie 2): geen database, geen `server-only`.
 */

export interface ManualEditInput {
  title: string;
  bodyMarkdown: string;
  metaTitle: string;
  metaDescription: string;
  /** Het onderwerp waar deze pagina op moet scoren. `null` = geen controle. */
  cluster: string | null;
}

export interface ManualEditProblem {
  /** Kort en machineleesbaar, voor tests en foutafhandeling. */
  code:
    | "lege-titel"
    | "lege-meta-titel"
    | "lege-meta-omschrijving"
    | "zoekwoord-ontbreekt"
    | "lege-link";
  /** De zin die de gebruiker te zien krijgt. */
  message: string;
}

/** Markdown-linksyntax zonder adres: `[tekst]()` of `[tekst]( )`. */
const LEGE_LINK = /\[[^\]]*\]\(\s*\)/;

/**
 * Alle problemen, in de volgorde waarin Nova ze ook noemt. Leeg = niets aan
 * de hand, mag opgeslagen worden.
 */
export function checkManualEdit(input: ManualEditInput): ManualEditProblem[] {
  const problems: ManualEditProblem[] = [];

  if (!input.title.trim()) {
    problems.push({
      code: "lege-titel",
      message: "De titel is leeg. Die is ook de H1 van de pagina en mag niet leeg blijven.",
    });
  }
  if (!input.metaTitle.trim()) {
    problems.push({
      code: "lege-meta-titel",
      message: "De meta-title is leeg. Zoekmachines en AI-assistenten tonen die als kop in resultaten.",
    });
  }
  if (!input.metaDescription.trim()) {
    problems.push({
      code: "lege-meta-omschrijving",
      message: "De meta-description is leeg. Dat is de tekst die onder de titel in een zoekresultaat verschijnt.",
    });
  }

  if (input.cluster && input.cluster.trim()) {
    const zoekwoord = input.cluster.trim().toLowerCase();
    const gevonden = [input.title, input.metaTitle, input.bodyMarkdown]
      .join(" ")
      .toLowerCase()
      .includes(zoekwoord);
    if (!gevonden) {
      problems.push({
        code: "zoekwoord-ontbreekt",
        message: `"${input.cluster.trim()}" komt nergens voor in de titel, de meta-title of de tekst. Dat is waar deze pagina op moet scoren.`,
      });
    }
  }

  if (LEGE_LINK.test(input.bodyMarkdown)) {
    problems.push({
      code: "lege-link",
      message: "Er staat een link zonder adres in de tekst. Vul het adres in of verwijder de link.",
    });
  }

  return problems;
}
