import { escapeHtml } from "@/lib/markdown";

/**
 * De zinnen met een verbeterpunt, gemarkeerd in de leestekst.
 *
 * ── WAAROM (23 september 2026) ──────────────────────────────────────────────
 *
 * Op de contentpagina stond de lijst met punten in een smalle kolom naast de
 * tekst, en elk punt citeerde zijn zin opnieuw. Wie wilde zien WAAR in de tekst
 * dat stond, moest zelf zoeken: op de pagina van Van den Udenhout vijf zinnen in
 * een tekst van ruim 1.100 woorden. Het punt hoort in de tekst zelf zichtbaar
 * te zijn, en de lijst ernaast wijst ernaar.
 *
 * De bron is `issue.evidence`: bij een punt over een bewering zonder bron is dat
 * op productie letterlijk de zin uit de tekst (gecontroleerd op 23 september
 * 2026, beide blokkades van pagina c4db492e).
 *
 * ── WAT ER GEBEURT ALS EEN ZIN NIET GEVONDEN WORDT ──────────────────────────
 *
 * Staat er opmaak midden in de zin (een link, een vetgedrukt woord), dan staat
 * hij in de HTML niet als één stuk tekst en vindt deze functie hem niet. Dan
 * komt er geen markering en meldt `gevonden` dat, zodat de lijst ernaast geen
 * knop toont die nergens heen gaat (conventie 3). Beter geen markering dan een
 * markering op de verkeerde plek.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
export function markeerZinnen(
  html: string,
  zinnen: readonly string[],
): { html: string; gevonden: boolean[] } {
  let uit = html;
  const gevonden = zinnen.map((zin, i) => {
    const schoon = zin.trim().replace(/^["“„']+|["”']+$/g, "").trim();
    // Een te kort stuk vindt de verkeerde plek: "Ja." staat overal.
    if (schoon.length < 12) return false;
    const gezocht = escapeHtml(schoon);
    const plek = zoekBuitenTags(uit, gezocht);
    if (plek < 0) return false;
    uit =
      uit.slice(0, plek) +
      `<mark class="tekst-punt" id="punt-${i}">` +
      gezocht +
      "</mark>" +
      uit.slice(plek + gezocht.length);
    return true;
  });
  return { html: uit, gevonden };
}

/**
 * De eerste plek waar `naald` in tekst staat en niet in een tag. Een zin die
 * toevallig in een `href` of een eerdere `<mark>` staat, mag daar niet gesplitst
 * worden: dan breekt de HTML.
 */
function zoekBuitenTags(html: string, naald: string): number {
  let vanaf = 0;
  while (vanaf <= html.length) {
    const plek = html.indexOf(naald, vanaf);
    if (plek < 0) return -1;
    const laatsteOpen = html.lastIndexOf("<", plek);
    const laatsteDicht = html.lastIndexOf(">", plek);
    const inTag = laatsteOpen > laatsteDicht;
    const inMark = html.lastIndexOf('<mark class="tekst-punt"', plek) > html.lastIndexOf("</mark>", plek);
    if (!inTag && !inMark) return plek;
    vanaf = plek + 1;
  }
  return -1;
}

/**
 * Waar een zin in de brontekst (markdown) staat, voor "Pas zelf aan": dan
 * springt het tekstvak naar die zin en selecteert hem. `null` als hij er niet
 * letterlijk in staat.
 */
export function zinInBron(markdown: string, zin: string): { begin: number; eind: number } | null {
  const schoon = zin.trim().replace(/^["“„']+|["”']+$/g, "").trim();
  if (schoon.length < 12) return null;
  const begin = markdown.indexOf(schoon);
  return begin < 0 ? null : { begin, eind: begin + schoon.length };
}
