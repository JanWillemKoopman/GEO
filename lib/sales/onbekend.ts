/**
 * De namen die de AI noemde en die niet in onze lijst stonden
 * (`docs/tasks/geo-prospect-engine.md` 9.1, laatste rij van de brontabel).
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * Het plan noemt dit een vangnet: "noemt de AI tijdens de meting een bedrijf dat
 * in geen enkele bron zat, dan is dat op zichzelf informatie. Ofwel onze
 * inventarisatie was incompleet, ofwel de AI verzint een naam."
 *
 * Bij de eerste twee echte markten was het vooral het eerste, en dat bleef
 * liggen. In Warmtepomp Eindhoven noemde ChatGPT **Feenstra drie keer**, en
 * Feenstra stond niet in onze lijst. Daarmee was de best zichtbare partij van
 * die markt onzichtbaar voor de kansdetectie: het type "concurrent loopt voor"
 * kon nooit tegen de echte marktleider afgaan.
 *
 * Het scherm toonde die namen wel, maar als één ongesorteerde rij waarin
 * `Feenstra` tussen `Daikin`, `Werkspot` en `Milieu Centraal` stond, zonder
 * aantallen en zonder knop. Deze module maakt er drie dingen van: hoe vaak,
 * welke soort, en of het de moeite waard is om hem toe te voegen.
 *
 * Bewust ZONDER `server-only` (conventie 2): het is tellen en sorteren, en dat
 * hoort testbaar te zijn zonder database.
 */

/**
 * Namen die geen prospect zijn, ook al noemt de AI ze als partij.
 *
 * Drie soorten, en ze staan bewust door elkaar in één lijst omdat ze op het
 * scherm hetzelfde doen: ze horen niet in de bedrijvenlijst van een lokale
 * markt.
 *
 * ⚠️ Net als `GEEN_PROSPECT_DOMEINEN` groeit deze lijst per markt, en dat is
 * goedkoper dan een slimme regel. Een fabrikant herkennen aan zijn gedrag vraagt
 * data die we hier niet hebben, en een te slimme regel gooit precies de lokale
 * installateur weg die we zoeken. Wat hieronder staat, komt uit de twee markten
 * van 1 september 2026.
 */
export const GEEN_PROSPECT_NAMEN = [
  // Fabrikanten en merken. Ze worden genoemd omdat het antwoord over producten
  // gaat, niet omdat ze een lokale aanbieder zijn.
  "daikin", "mitsubishi", "mitsubishi electric", "mitsubishi heavy industries",
  "panasonic", "lg", "toshiba", "samsung", "vaillant", "remeha", "intergas",
  "nefit", "bosch", "atag", "itho", "itho daalderop", "nibe", "stiebel eltron",
  "viessmann", "alklima", "quatt", "tesla", "zonneplan",
  // Energieleveranciers en landelijke dienstverleners.
  "essent", "eneco", "vattenfall", "greenchoice", "budget energie", "engie",
  "feenstra thuis",
  // Platforms, vergelijkers en marktplaatsen.
  "werkspot", "trustoo", "solvari", "offerte.nl", "bouwoffertes", "homedeal",
  "echteinstallateur.nl", "warmtepompgids", "warmtepomp.ai", "wtw.nl",
  // Voorlichting, overheid en brancheorganisaties.
  "milieu centraal", "verbeterjehuis", "rvo", "rijksdienst voor ondernemend nederland",
  "consumentenbond", "vereniging eigen huis", "eigen huis", "techniek nederland",
  "nvkl", "installq", "centraal register techniek", "mkb nederland",
  "mkb servicedesk", "kvk", "isde",
];

export type OnbekendSoort = "mogelijk_bedrijf" | "merk_of_bron";

export interface OnbekendeNaam {
  naam: string;
  /** Hoe vaak de AI hem noemde in deze ronde. */
  keer: number;
  soort: OnbekendSoort;
}

/** Is dit een fabrikant, een platform of een voorlichter in plaats van een prospect? */
export function isMerkOfBron(naam: string): boolean {
  const schoon = naam.trim().toLowerCase().replace(/[.,]+$/, "");
  if (schoon.length === 0) return true;
  return GEEN_PROSPECT_NAMEN.some((n) => schoon === n || schoon.startsWith(`${n} `));
}

/**
 * Telt, sorteert en sorteert uit.
 *
 * De volgorde is het hele punt: wie het vaakst genoemd wordt en op een bedrijf
 * lijkt, staat bovenaan. Dat is de partij waar de kansen van deze markt zich
 * tegen zouden moeten meten, en die hoort niet onderaan een alfabetische lijst
 * te staan tussen de fabrikanten.
 */
export function groepeerOnbekend(namen: readonly string[]): OnbekendeNaam[] {
  const teller = new Map<string, { naam: string; keer: number }>();

  for (const ruw of namen) {
    const naam = (ruw ?? "").trim();
    if (naam.length < 2) continue;
    const sleutel = naam.toLowerCase();
    const bestaand = teller.get(sleutel);
    if (bestaand) bestaand.keer += 1;
    else teller.set(sleutel, { naam, keer: 1 });
  }

  return [...teller.values()]
    .map((t) => ({
      naam: t.naam,
      keer: t.keer,
      soort: (isMerkOfBron(t.naam) ? "merk_of_bron" : "mogelijk_bedrijf") as OnbekendSoort,
    }))
    .sort((a, b) => {
      // Mogelijke bedrijven eerst, daarbinnen op aantal, daarbinnen op naam.
      if (a.soort !== b.soort) return a.soort === "mogelijk_bedrijf" ? -1 : 1;
      if (b.keer !== a.keer) return b.keer - a.keer;
      return a.naam.localeCompare(b.naam, "nl");
    });
}
