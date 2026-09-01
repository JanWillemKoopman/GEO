/**
 * Een pagina in secties knippen en er één sectie in vervangen
 * (docs/tasks/contentpijplijn-herontwerp.md A6).
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De herschrijfronde liet het dure model de HELE pagina opnieuw schrijven, ook
 * als er één bevinding was ("noem het bedrijf bij naam in de tweede alinea").
 * Dat kost twee dingen. Geld: gemeten op productie 4204 uitvoertokens à $30 per
 * miljoen, dus $0,162 per herschrijving, en op de vijf pagina's van 26 augustus
 * kreeg elke pagina er één. En kwaliteit: een volledige herschrijving mag ook
 * de passages aanraken die in ronde 1 juist goed waren, en niets in de pijplijn
 * merkte het als dat gebeurde.
 *
 * Met deze module herschrijft het model alleen de secties waar een bevinding op
 * zit, en zet code de nieuwe sectie terug op de plek van de oude. Dat is
 * precies conventie 1: het model belóóft niet dat het de rest met rust laat,
 * het krijgt de rest niet in handen.
 *
 * Bewust ZONDER `server-only` (conventie 2): puur tekstwerk, testbaar vanuit
 * `scripts/test-unit.ts`.
 */

/** Eén sectie van een pagina: de kop plus alles tot de volgende kop. */
export interface PageSection {
  /** De kop zonder hekjes. Leeg bij de aanhef vóór de eerste kop. */
  heading: string;
  /** Hoeveel hekjes de kop had. 0 bij de aanhef. */
  level: number;
  /** De tekst ONDER de kop, zonder de kopregel zelf. */
  body: string;
}

/**
 * Kopregels herkennen we alleen als ATX-koppen aan het begin van een regel
 * (`## Zo werkt het`). Dat is wat het model levert, en het is de enige vorm die
 * je zonder markdown-parser betrouwbaar terugvindt.
 */
const HEADING = /^(#{1,6})\s+(.+?)\s*$/;

/** Kop-vergelijking: hoofdletters, leestekens en dubbele spaties doen niet mee. */
export function normalizeHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[#*_`]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Knipt de pagina in secties.
 *
 * De tekst vóór de eerste kop komt als sectie met een lege kop terug. Die is
 * belangrijk genoeg om apart te houden: daar staat het directe antwoord op de
 * doelvraag, en dat is de zin waar de hele GEO-poort op let.
 */
export function splitSections(bodyMarkdown: string): PageSection[] {
  const regels = (bodyMarkdown ?? "").split("\n");
  const secties: PageSection[] = [];
  let huidig: PageSection = { heading: "", level: 0, body: "" };
  const regelsVanHuidig: string[] = [];

  const sluit = () => {
    huidig.body = regelsVanHuidig.join("\n").replace(/^\n+|\n+$/g, "");
    // De lege aanhef van een pagina die meteen met een kop begint slaan we over;
    // een lege sectie mét kop blijft staan, want dat is een echte bevinding.
    if (huidig.heading || huidig.body) secties.push(huidig);
    regelsVanHuidig.length = 0;
  };

  for (const regel of regels) {
    const match = HEADING.exec(regel);
    if (match) {
      sluit();
      huidig = { heading: match[2].trim(), level: match[1].length, body: "" };
      continue;
    }
    regelsVanHuidig.push(regel);
  }
  sluit();

  return secties;
}

/** Zet de secties weer om naar markdown, in dezelfde vorm als ze binnenkwamen. */
export function joinSections(secties: PageSection[]): string {
  return secties
    .map((s) => (s.heading ? `${"#".repeat(s.level || 2)} ${s.heading}\n\n${s.body}` : s.body))
    .filter((blok) => blok.trim().length > 0)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Eén vervangende sectie zoals het model hem aanlevert. */
export interface SectionPatch {
  /** De kop van de sectie die vervangen wordt. Leeg = de aanhef. */
  heading: string;
  /** De volledige nieuwe sectie, zonder de kopregel. */
  markdown: string;
}

export interface PatchResult {
  bodyMarkdown: string;
  /** Koppen die daadwerkelijk vervangen zijn. */
  vervangen: string[];
  /**
   * Koppen die nergens in de tekst voorkwamen en dus achteraan zijn
   * toegevoegd. Dit is een signaal, geen fout: het model mag een sectie
   * toevoegen die het contract eist maar die de eerste versie oversloeg.
   */
  toegevoegd: string[];
}

/**
 * Vervangt de genoemde secties en laat de rest letterlijk staan.
 *
 * Matcht op de genormaliseerde kop. Komt de kop niet voor, dan wordt de sectie
 * onderaan toegevoegd in plaats van weggegooid: een ontbrekende sectie is
 * precies wat de dekkingspoort aan het repareren is.
 */
export function applySectionPatch(bodyMarkdown: string, patches: SectionPatch[]): PatchResult {
  const secties = splitSections(bodyMarkdown);
  const vervangen: string[] = [];
  const toegevoegd: string[] = [];

  for (const patch of patches) {
    const nieuweTekst = (patch.markdown ?? "").trim();
    if (!nieuweTekst) continue;

    const doel = normalizeHeading(patch.heading ?? "");
    const index = secties.findIndex((s) => normalizeHeading(s.heading) === doel);

    if (index >= 0) {
      secties[index] = { ...secties[index], body: nieuweTekst };
      vervangen.push(patch.heading);
      continue;
    }

    // Geen kop meegegeven en geen aanhef gevonden: dan is dit de aanhef.
    if (!patch.heading.trim()) {
      secties.unshift({ heading: "", level: 0, body: nieuweTekst });
      toegevoegd.push("(aanhef)");
      continue;
    }

    secties.push({ heading: patch.heading.trim(), level: 2, body: nieuweTekst });
    toegevoegd.push(patch.heading);
  }

  return { bodyMarkdown: joinSections(secties), vervangen, toegevoegd };
}
