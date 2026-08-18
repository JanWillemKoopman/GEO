/**
 * Waar kwam de bezoeker vandaan, en waar wijst de terugknop dus heen?
 *
 * ── WAAROM DIT NODIG IS ─────────────────────────────────────────────────────
 *
 * Een contentpagina is sinds 17 augustus 2026 vanaf drie plekken te bereiken:
 * het clusterdossier, de merkbrede bibliotheek en het contentplan. Zonder
 * herkomst wijst de terugknop altijd naar dezelfde plek, en dan komt de klant
 * uit op een scherm waar hij niet vandaan kwam. Dat is precies het soort
 * kleine desoriëntatie waar de klacht "onoverzichtelijk" uit opgebouwd is.
 *
 * Nova lost dit op met een `origin`-parameter (`strategy` of `analytics`). Hier
 * heet hij `?van=` en kent hij drie waarden.
 *
 * ── WAAROM EEN PARAMETER EN GEEN REFERER ────────────────────────────────────
 *
 * De `Referer`-header valt weg bij een bladwijzer, bij een gedeelde link en bij
 * strengere browserinstellingen, en juist dán is de terugknop het enige wat de
 * klant heeft. Een parameter staat in de link zelf en overleeft alle drie.
 *
 * ⚠️ **De terugval is het clusterdossier**, niet de bibliotheek. Valt de
 * parameter weg, dan is het dossier het adres dat altijd bestaat en altijd bij
 * deze pagina hoort. Puur en zonder `server-only`, zodat de test erbij kan
 * (conventie 2).
 */

export const HERKOMSTEN = ["bibliotheek", "cluster", "plan"] as const;

export type Herkomst = (typeof HERKOMSTEN)[number];

/**
 * De waarde uit de querystring, of `null` als er niets bruikbaars staat.
 *
 * Onbekende waarden worden `null` en geen gok (conventie 3): een geplakte of
 * verouderde link mag geen terugknop opleveren die ergens anders heen wijst dan
 * hij zegt.
 */
export function leesHerkomst(raw: string | string[] | undefined): Herkomst | null {
  const waarde = Array.isArray(raw) ? raw[0] : raw;
  return (HERKOMSTEN as readonly string[]).includes(waarde ?? "")
    ? (waarde as Herkomst)
    : null;
}

export interface TerugLink {
  href: string;
  label: string;
}

/**
 * Waar wijst de terugknop heen?
 *
 * `profileId` mag `null` zijn: een cluster zonder merk is zeldzaam maar
 * mogelijk, en dan bestaan de merkbrede adressen niet. Terugvallen op het
 * dossier is dan het enige eerlijke antwoord.
 */
export function terugLink(
  herkomst: Herkomst | null,
  analysisId: string,
  profileId: string | null,
): TerugLink {
  if (profileId) {
    if (herkomst === "bibliotheek") {
      return { href: `/merk/${profileId}/strategie/bibliotheek`, label: "Bibliotheek" };
    }
    if (herkomst === "plan") {
      return { href: `/merk/${profileId}/strategie/plan`, label: "Contentplan" };
    }
  }
  return { href: `/analyses/${analysisId}/bibliotheek`, label: "Bibliotheek van dit cluster" };
}
