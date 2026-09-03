/**
 * Zinnen knippen, één plek, want drie controles moeten het op dezelfde manier doen.
 *
 * Deze functie stond in `validate-claims.ts` (R1.3) en is daar ontstaan uit een
 * echte fout: de eerste versie splitste naïef op elke punt, waardoor "Bol.com"
 * uiteenviel in "Bol." en "com". Geen van beide helften bevatte de merknaam nog,
 * dus de claimvalidator zag hem niet en liet de onjuiste bewering staan. Precies
 * het geval dat hij moest vangen (gevonden op de echte rapporttekst van Coolblue).
 *
 * ⚠️ **Die ene plek is het niet.** Hier stond dat `claim-extract.ts` en
 * `geo-check.ts` hier ook op knippen. Nagerekend op 3 september 2026:
 * `geo-check.ts` bestaat niet, en van de rest gebruikt alleen
 * `claim-extract.ts` deze module. `content-gate.ts` (`stripMarkdown`,
 * `bewerendeZinnen`) en `validate-claims.ts` hebben elk hun eigen kopie. De
 * belofte hierboven werd dus door niets afgedwongen, en de fout van R0 zat
 * daardoor in twee van de drie kopieën tegelijk.
 *
 * De kopie in `content-gate.ts` is bij die reparatie bewust niet meegenomen:
 * daar voedt het knippen alleen een noemer en een "is er een citeerbare zin",
 * dus geen blokkade, en hem meeveranderen verschuift de poortuitkomst van elke
 * bestaande pagina. Het samenvoegen staat als open werk in
 * `docs/tasks/contentkwaliteit-framework.md` §10, R0.
 *
 * Bewust ZONDER `server-only`: pure tekstbewerking, testbaar in een kaal script.
 */

/**
 * Is de punt op positie `i` het nummer van een opsommingsteken, en dus géén
 * zinseinde? (R0, gevonden 3 september 2026)
 *
 * ── WAAROM DIT MOET ─────────────────────────────────────────────────────────
 *
 * `stripMarkdown` haalt "1. " alleen weg aan het BEGIN van een regel. Zet het
 * schrijvende model de opsomming achter een dubbele punt op dezelfde regel, dan
 * blijft het cijfer staan:
 *
 *   "Spreek deze volgorde af: 1. meld de lekkage, 2. beperk de schade, 3. laat…"
 *
 * De oude splitser zag in "1. " een punt met witruimte erachter, dus een
 * zinseinde, en knipte de opsomming in fragmenten die eindigen op het cijfer van
 * het VOLGENDE item ("meld de lekkage, 2."). Die fragmenten gingen als bewering
 * naar `detectClaimSentences()` en werden daar blokkerend afgekeurd, want een
 * fragment kan nooit naar een feit op de kaart wijzen. Op de benchmarkronde van
 * 3 september 2026 leverde dat, samen met de koppen hieronder, 30 van de 123
 * blokkerende bevindingen op, en alle twaalf pagina's op `block`.
 *
 * ── WAAROM ZO SMAL ──────────────────────────────────────────────────────────
 *
 * "Wij bestaan sinds 1995. Daarom…" moet WEL splitsen. Twee eisen houden die
 * heel: het getal is hooguit tweecijferig (een opsommingsnummer, geen jaartal),
 * en er volgt een kleine letter (een lijstitem loopt door, een nieuwe zin begint
 * met een hoofdletter).
 */
function isOpsommingsnummer(text: string, punt: number): boolean {
  // Terug over de cijfers vlak vóór de punt.
  let cijferStart = punt;
  while (cijferStart > 0 && /\d/.test(text[cijferStart - 1])) cijferStart--;

  const cijfers = punt - cijferStart;
  if (cijfers < 1 || cijfers > 2) return false;

  // Ervoor moet een grens staan: regelbegin, of witruimte na een leesteken dat
  // een opsomming inleidt. Zonder deze eis zou "versie 2." ook meetellen.
  const ervoor = text.slice(0, cijferStart).replace(/[ \t]+$/, "");
  if (ervoor !== "" && !/[:;,\n]$/.test(ervoor)) return false;

  // Erna een kleine letter: het lijstitem loopt door.
  const erna = text.slice(punt + 1).match(/^\s*(\S)/);
  return erna !== null && erna[1] === erna[1].toLowerCase() && /\p{L}/u.test(erna[1]);
}

/**
 * Splitst op zinsgrenzen, met de interpunctie en de witruimte eraan vast.
 *
 * Een punt telt alleen als zinseinde wanneer er WITRUIMTE of het einde van de
 * tekst op volgt. Domeinnamen en getallen als "3.5" blijven zo heel. Afkortingen
 * met een punt gevolgd door een spatie ("bijv. ") splitsen nog steeds ten
 * onrechte; dat is hier het lichtste kwaad, want een zin te veel meenemen is
 * minder erg dan een onjuiste bewering missen.
 *
 * Een WITREGEL is óók een zinsgrens (R0). Een kop eindigt niet op een punt, dus
 * zonder die regel plakte "## Snel hulp in Zutphen" aan de alinea eronder vast
 * en werd het samen één "zin". Die zin bevatte de merknaam, gold dus als
 * bewering, en kon per definitie niet onderbouwd worden. 27 van de 123
 * blokkerende bevindingen van 3 september 2026 waren dit.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    // ── Een witregel: paragraafgrens, dus zinsgrens ────────────────────────
    if (text[i] === "\n") {
      const witregel = /^\n[ \t]*\n\s*/.exec(text.slice(i));
      if (witregel) {
        out.push(text.slice(start, i + witregel[0].length));
        start = i + witregel[0].length;
        i = start - 1;
        continue;
      }
    }

    if (!".!?".includes(text[i])) continue;

    if (text[i] === "." && isOpsommingsnummer(text, i)) continue;

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
    //
    // ⚠️ De kop houdt een WITREGEL achter zich (R0). Alleen de hekjes weghalen
    // liet een kop achter zonder eindpunt, en `splitSentences` plakte hem dan
    // aan de alinea eronder vast. Staat er in de markdown al een witregel, dan
    // wordt het er één te veel en dat maakt niets uit: de splitser slikt
    // meerdere lege regels als één grens.
    .replace(/^\s{0,3}#{1,6}\s+(.*)$/gm, "$1\n")
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
