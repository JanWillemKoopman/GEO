/**
 * De drie vormen waarin een geschreven pagina het klembord op gaat.
 *
 * ── WAAROM DIT ERBIJ MOEST ──────────────────────────────────────────────────
 *
 * Tot 16 september 2026 had de bibliotheek één kopieerknop, en die zette
 * Markdown op het klembord. Dat is voor bijna elk CMS het verkeerde antwoord:
 * een WordPress-blok wil HTML, een gewone editor wil tekst zonder tekens, en
 * alleen een Markdown-editor wil Markdown. De klant plakte dus sterretjes en
 * hekjes op zijn eigen site, of hij haalde ze met de hand weg.
 *
 * Het is de laatste handeling vóór de klant zijn eigen site aanraakt, en daarom
 * de plek waar een verkeerd formaat het meest kost: alles wat de pijplijn aan
 * kwaliteit heeft opgebouwd, staat er daarna scheef op.
 *
 * InSpace Nova lost dit op met een keuzedialoog en één regel eronder: *"Choose
 * the format that matches the CMS workflow."* Dat is de vondst, en niet de
 * dialoog zelf: de klant hoeft niet te wéten wat HTML is, hij moet kunnen zien
 * welke bij zijn situatie hoort. Vandaar dat elke vorm hier een `waarvoor`
 * heeft die over zíjn CMS gaat en niet over het formaat.
 *
 * ── DIT IS GEEN VIERDE `stripMarkdown` ──────────────────────────────────────
 *
 * `lib/pipeline/sentences.ts`, `content-gate.ts` en `validate-claims.ts` hebben
 * elk een `stripMarkdown`, en het samenvoegen daarvan staat als open werk in
 * `docs/tasks/contentkwaliteit-framework.md` §10. `plattetekst()` hieronder is
 * daar bewust géén vierde kopie van, want hij doet iets anders:
 *
 *   `stripMarkdown`   voert tekst aan een CONTROLE. Structuur mag weg, links
 *                     mogen hun adres verliezen, witruimte klapt in.
 *   `plattetekst`     voert tekst aan een MENS die hem gaat plakken. Koppen,
 *                     opsommingen en witregels moeten juist blijven staan, en
 *                     een link verliest zijn adres nooit: die komt er als
 *                     "label (https://…)" achter te staan.
 *
 * Gooi je die twee op één hoop, dan verliest de klant bij elke kopieeractie
 * zijn linkadressen. Dat is precies het soort stille schade dat niemand meldt.
 *
 * Puur en zonder `server-only` (conventie 2): dit bepaalt wat er op het
 * klembord komt, dus het hoort onder test en niet in een clientcomponent.
 */

/** Welke vorm. De volgorde hieronder is de volgorde op het scherm. */
export type Kopieervorm = "html" | "tekst" | "markdown";

export interface KopieerOptie {
  vorm: Kopieervorm;
  /** Wat er op de knop staat. */
  label: string;
  /** Wanneer je deze kiest, in één regel, over het CMS van de klant. */
  waarvoor: string;
  /** Wat er op het klembord komt. Leeg betekent: deze vorm niet tonen. */
  waarde: string;
}

/**
 * Markdown naar tekst die je in een gewone editor kunt plakken.
 *
 * Wat eruit gaat: de opmaaktekens. Wat blijft: de woorden, de regelindeling,
 * de opsommingstekens en het adres achter elke link.
 *
 * ⚠️ **De opsommingstekens blijven met opzet staan.** Ze weghalen levert een
 * muur tekst op waarin de lezer de stappen niet meer ziet, en bijna elke editor
 * maakt van een regel die met "- " begint vanzelf een opsomming. Hetzelfde
 * geldt voor de nummers: "1. " blijft "1. ".
 */
export function plattetekst(markdown: string): string {
  const regels = markdown.replace(/\r\n/g, "\n").split("\n");
  const uit: string[] = [];

  for (const regel of regels) {
    let r = regel.trimEnd();

    // Horizontale lijnen dragen in platte tekst niets bij: de witregel eromheen
    // doet het werk al. Weghalen in plaats van omzetten naar streepjes, want
    // drie streepjes op een lege regel maken in sommige editors een kop van de
    // regel erboven.
    if (/^\s{0,3}([-*_]\s*){3,}\s*$/.test(r)) {
      uit.push("");
      continue;
    }

    // Kop: de hekjes eruit, de tekst blijft op zijn eigen regel staan.
    r = r.replace(/^(\s{0,3})#{1,6}\s+/, "$1");
    // Blokcitaat: het teken eruit, de zin blijft.
    r = r.replace(/^(\s{0,3})>\s?/, "$1");

    uit.push(zonderInlineOpmaak(r));
  }

  // Hooguit één lege regel achter elkaar, en geen lege regels aan begin of eind.
  // Zonder dit levert een pagina met een horizontale lijn tussen twee alinea's
  // drie witregels op, en dat ziet er in een editor uit als een fout.
  return uit
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Nadruk, code en links binnen één regel.
 *
 * De link is het enige geval waarin er iets BIJ komt in plaats van af: het
 * adres wordt tussen haakjes achter het label gezet. Een klant die de tekst
 * plakt en daarna zijn links terug moet zoeken, is een klant die ze niet
 * terugzet.
 */
function zonderInlineOpmaak(regel: string): string {
  return (
    regel
      // Afbeelding: alleen het bijschrift heeft in platte tekst betekenis.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Link: label plus adres. Is het label al het adres, dan niet verdubbelen.
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) =>
        label.trim() === url.trim() ? label : `${label} (${url})`,
      )
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2")
  );
}

/**
 * De opties die het scherm toont, in de volgorde waarin een klant ze
 * tegenkomt: eerst het formaat dat de meeste CMS'en willen.
 *
 * Een vorm met een lege waarde valt weg. Dat gebeurt in de praktijk alleen bij
 * een pagina waarvan de tekst nog niet gegenereerd is, en dan hoort er geen
 * kopieerknop te staan die niets doet.
 */
export function kopieeropties(markdown: string, html: string): KopieerOptie[] {
  const opties: KopieerOptie[] = [
    {
      vorm: "html",
      label: "Kopieer als HTML",
      waarvoor:
        "Voor een CMS dat opmaak overneemt, zoals een WordPress-blok of een HTML-veld. " +
        "Koppen, opsommingen en links komen mee.",
      waarde: html.trim(),
    },
    {
      vorm: "tekst",
      label: "Kopieer als platte tekst",
      waarvoor:
        "Voor een editor waarin je zelf opmaakt. De tekst blijft leesbaar, " +
        "de opmaaktekens gaan eruit en achter elke link staat het adres.",
      waarde: plattetekst(markdown),
    },
    {
      vorm: "markdown",
      label: "Kopieer als Markdown",
      waarvoor: "Alleen als je editor Markdown begrijpt en de hekjes en sterretjes zelf omzet.",
      waarde: markdown.trim(),
    },
  ];
  return opties.filter((o) => o.waarde.length > 0);
}
