/**
 * De property-naam van Search Console, gecontroleerd voordat hij Google in gaat.
 *
 * ── WAAROM DIT EEN EIGEN FUNCTIE IS ─────────────────────────────────────────
 *
 * Search Console kent twee soorten property, en ze zien er anders uit dan een
 * webadres:
 *
 *   • `sc-domain:voorbeeld.nl`   het hele domein, inclusief subdomeinen
 *   • `https://voorbeeld.nl/`    één exact adres, mét protocol en slotstreep
 *
 * Wie "voorbeeld.nl" invult, krijgt van Google een 404 zonder uitleg. Dat is
 * precies het soort fout waarbij iemand denkt dat de koppeling stuk is terwijl
 * er een teken mist. Deze functie vangt de bekende vergissingen af en zegt wat
 * eraan schort, in plaats van de fout door te laten naar Google.
 *
 * Puur, dus testbaar (conventie 2).
 */

export type PropertyResult =
  | { ok: true; property: string }
  | { ok: false; reason: string };

export function normalizeProperty(ruw: string): PropertyResult {
  const s = ruw.trim();
  if (s.length === 0) {
    return { ok: false, reason: "Vul de property in zoals hij in Search Console staat." };
  }

  if (s.startsWith("sc-domain:")) {
    const domein = s.slice("sc-domain:".length).trim().toLowerCase();
    if (!domein || !domein.includes(".")) {
      return { ok: false, reason: "Achter sc-domain: hoort een domein te staan, bijvoorbeeld sc-domain:voorbeeld.nl." };
    }
    if (domein.includes("/")) {
      return { ok: false, reason: "Een domein-property heeft geen pad. Gebruik sc-domain:voorbeeld.nl, zonder schuine strepen." };
    }
    return { ok: true, property: `sc-domain:${domein}` };
  }

  if (s.startsWith("http://") || s.startsWith("https://")) {
    let url: URL;
    try {
      url = new URL(s);
    } catch {
      return { ok: false, reason: "Dit is geen geldig webadres." };
    }
    // ⚠️ Google eist de slotstreep bij een URL-property. Zonder is het een
    // andere property, en het antwoord is een 404 die niets uitlegt.
    const pad = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    return { ok: true, property: `${url.protocol}//${url.host}${pad}` };
  }

  // De meest gemaakte vergissing: het kale domein. Zeg wat de twee vormen zijn
  // in plaats van "ongeldig".
  return {
    ok: false,
    reason: `Search Console kent twee vormen. Bedoel je het hele domein, vul dan sc-domain:${s.toLowerCase()} in. Bedoel je één adres, dan https://${s.toLowerCase()}/ met de schuine streep aan het eind.`,
  };
}
