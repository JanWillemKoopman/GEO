/**
 * Het navigatiemenu, de koptekst en de voettekst uit een pagina halen
 * (contentronde-gasservice-brabant-1-september-2026.md, verbetering 4).
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De content-inventaris bewaart per pagina een fragment van de platte tekst
 * (`PAGE_MAX_CHARS` in `lib/crawler.ts`). Bij een site met een groot menu is dat
 * fragment het menu. Gemeten op Gasservice Brabant, 1 september 2026: van de 148
 * opgeslagen pagina's liepen er 139 (94%) tegen de grens van 1500 tekens aan
 * terwijl het navigatiemenu er nog twee keer in stond. Het opgeslagen fragment
 * van `/hybride-warmtepomp/` bestond voor 100% uit het menu.
 *
 * Wat dat kostte: de feitenkaart van de pagina over prijzen bevatte geen enkel
 * bedrag, terwijl de eigen kennisbankpagina van de klant "maximaal €6000" en
 * "gemiddeld tussen de €500 en €2500" subsidie noemt. De pagina die ORBIT ENGINE
 * eruit schreef opende met "Er is geen gecontroleerde, concrete prijs ...
 * beschikbaar". Dezelfde grens liet de bronverificatie van de algemene uitleg 18
 * van de 35 citaten afkeuren: het citaat stond in één nagerekend geval op teken
 * 10.696 van een pagina van 21.141 tekens.
 *
 * ── WAAROM ALLEEN SEMANTISCHE TAGS ──────────────────────────────────────────
 *
 * Alleen `<nav>`, `<footer>` en een `<header>` die zelf een menu bevat gaan
 * eruit, plus een voorkeur voor `<main>` of `<article>` als die er zijn. Geen
 * class- of id-patronen: het einde van een `<div class="menu">` is met een
 * reguliere expressie niet betrouwbaar te vinden, en een verkeerde gok knipt
 * echte inhoud weg. Op de site van Gasservice Brabant is dit genoeg: die
 * gebruikt tien keer `<nav>`, één `<header>` en één `<footer>`.
 *
 * ── HET VANGNET ─────────────────────────────────────────────────────────────
 *
 * Blijft er na het schonen bijna niets over, dan geven we de ORIGINELE HTML
 * terug. Een pagina die alles in een `<header>` zet mag door deze functie niet
 * onzichtbaar worden: minder tekst is erger dan ruis (conventie 3, onbekend is
 * een betere waarde dan een verkeerde, en hier zou de verkeerde waarde "deze
 * pagina heeft geen inhoud" zijn).
 *
 * Bewust ZONDER `server-only` (conventie 2): pure tekstbewerking, testbaar
 * vanuit `scripts/test-unit.ts`. `lib/crawler.ts` begint wél met `server-only`,
 * en dat is precies waarom deze regels hier staan en niet daar.
 */

/** Hoeveel tekst er minstens moet overblijven voordat we het schonen vertrouwen. */
const MIN_TEKENS_NA_SCHONEN = 200;

/** En welk deel van het origineel, zodat een te gretige knip opvalt. */
const MIN_AANDEEL_NA_SCHONEN = 0.1;

/**
 * Ruwe schatting van de hoeveelheid LEESBARE tekst in een stuk HTML.
 *
 * ⚠️ Script- en stijlblokken gaan er eerst uit. Zonder die stap telt de
 * JavaScript mee: een pagina van 257 kB waarvan 4 kB tekst is, meet dan als
 * 200.000 tekens, en het vangnet hieronder concludeert dat het schonen te
 * gretig was terwijl het precies goed ging. Dat gebeurde bij de kennisbank van
 * Gasservice Brabant, de pagina met het bedrag dat we misten.
 */
function tekstLengte(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

function verwijderBlok(html: string, tag: string): string {
  return html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"), " ");
}

/**
 * Haalt menu, koptekst en voettekst weg en geeft bij voorkeur alleen de
 * hoofdinhoud terug.
 *
 * Werkt op HTML, niet op platte tekst: op platte tekst is een menu niet meer van
 * een opsomming te onderscheiden.
 */
export function stripChrome(html: string): string {
  const origineel = html ?? "";
  if (!origineel.trim()) return origineel;

  let schoon = origineel;

  // 1. Het menu en de voettekst, altijd.
  schoon = verwijderBlok(schoon, "nav");
  schoon = verwijderBlok(schoon, "footer");

  // 2. Een `<header>` alleen als hij zelf een menu bevat. Veel pagina's zetten
  //    juist de H1 in de header, en die is de titel van de inhoud.
  schoon = schoon.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, (blok) =>
    /<nav\b|role\s*=\s*["']navigation["']/i.test(blok) ? " " : blok,
  );

  // 3. Is er een expliciete hoofdinhoud, gebruik dan alleen die.
  const hoofd = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(schoon) ?? /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(schoon);
  if (hoofd && tekstLengte(hoofd[1]) >= MIN_TEKENS_NA_SCHONEN) {
    schoon = hoofd[1];
  }

  // 4. Het vangnet: nooit minder overhouden dan de moeite waard is.
  const lengteNa = tekstLengte(schoon);
  const lengteVoor = tekstLengte(origineel);
  if (lengteNa < MIN_TEKENS_NA_SCHONEN && lengteVoor >= MIN_TEKENS_NA_SCHONEN) return origineel;
  if (lengteVoor > 0 && lengteNa / lengteVoor < MIN_AANDEEL_NA_SCHONEN) return origineel;

  return schoon;
}
