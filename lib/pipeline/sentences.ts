/**
 * Zinnen knippen, één plek, want drie controles moeten het op dezelfde manier doen.
 *
 * Deze functie stond in `validate-claims.ts` (R1.3) en is daar ontstaan uit een
 * echte fout: de eerste versie splitste naïef op elke punt, waardoor "Bol.com"
 * uiteenviel in "Bol." en "com". Geen van beide helften bevatte de merknaam nog,
 * dus de claimvalidator zag hem niet en liet de onjuiste bewering staan. Precies
 * het geval dat hij moest vangen (gevonden op de echte rapporttekst van Coolblue).
 *
 * Sinds S3 knippen ook `claim-extract.ts` (welke zinnen zijn een bewering?) en
 * `geo-check.ts` (staat het antwoord in de eerste twee zinnen?) op zinsgrenzen.
 * Zouden die hun eigen splitser meenemen, dan zou "de eerste twee zinnen" voor de
 * ene controle iets anders betekenen dan voor de andere, en dan meten twee
 * cijfers over dezelfde tekst iets verschillends zonder dat iemand dat ziet.
 *
 * Bewust ZONDER `server-only`: pure tekstbewerking, testbaar in een kaal script.
 */

/**
 * Splitst op zinsgrenzen, met de interpunctie en de witruimte eraan vast.
 *
 * Een punt telt alleen als zinseinde wanneer er WITRUIMTE of het einde van de
 * tekst op volgt. Domeinnamen en getallen als "3.5" blijven zo heel. Afkortingen
 * met een punt gevolgd door een spatie ("bijv. ") splitsen nog steeds ten
 * onrechte; dat is hier het lichtste kwaad, want een zin te veel meenemen is
 * minder erg dan een onjuiste bewering missen.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (!".!?".includes(text[i])) continue;

    // Doorlopende interpunctie meenemen ("…", "?!").
    let end = i;
    while (end + 1 < text.length && ".!?".includes(text[end + 1])) end++;

    const next = text[end + 1];
    if (next !== undefined && !/\s/.test(next)) {
      i = end; // geen zinseinde: midden in "Bol.com" of "3.5"
      continue;
    }

    let after = end + 1;
    while (after < text.length && /\s/.test(text[after])) after++;

    out.push(text.slice(start, after));
    start = after;
    i = after - 1;
  }

  if (start < text.length) out.push(text.slice(start));
  return out.filter((s) => s.trim().length > 0);
}

/**
 * Markdown ontdoen van opmaak, zodat een controle de TEKST ziet en niet de tekens.
 *
 * Waarom dit nodig is: de openingszin van de Fysi-Unique-pagina staat er als
 * `**Fysi-Unique in Amersfoort biedt preventieve begeleiding…**`. Een controle die
 * op "begint de pagina met het antwoord" let, moet daar niet over de sterretjes
 * struikelen, en een merknaamcontrole niet over `[Fysi-Unique](/over-ons)`.
 *
 * Bewust ruw: koppen, nadruk, lijstbullets, links, code en horizontale lijnen
 * eruit. Wat overblijft is leesbare tekst met dezelfde zinsvolgorde.
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    // Codeblokken en inline code: de inhoud is geen proza.
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    // Links en afbeeldingen: houd het label, gooi het doel weg.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Kopregels, blokcitaten, lijstbullets en horizontale lijnen.
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/^\s{0,3}([-*_]\s*){3,}\s*$/gm, " ")
    // Nadruk. De tekens weg, de woorden blijven.
    .replace(/(\*\*|__|\*|_)/g, "")
    // Tabelpijpen worden spaties: een tabelrij is een opsomming, geen zin.
    .replace(/\|/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * De eerste `n` zinnen van een stuk markdown, als platte tekst.
 *
 * `answersTargetQuestionUpFront` en de doelvraag-echo (R8.2) draaien allebei om
 * "de eerste twee zinnen". Eén functie, zodat dat voor beide hetzelfde is.
 */
export function firstSentences(markdown: string, n: number): string {
  return splitSentences(stripMarkdown(markdown)).slice(0, n).join(" ").trim();
}
