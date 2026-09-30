/**
 * HET KENNISOVERZICHT: indeling, woorden en welke handeling kan (K7 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Puur, zonder `server-only` (conventie 2): het scherm en de route gebruiken
 * dezelfde regels, en de tests ook. Wat een handeling in de database doet, staat
 * in `uit-overzicht.ts`.
 *
 * ── DE INDELING ─────────────────────────────────────────────────────────────
 *
 * Per domein wat we weten (gezien, gezegd of bevestigd), apart wat we alleen
 * denken (afgeleid, §6.1: "als 'we denken', met knop bevestigen of afwijzen"),
 * en apart wat een mens afwees: bewaard, telt nergens meer mee, maar de
 * consultant moet kunnen zien dat het er was.
 *
 * ── DE VIER HANDELINGEN ─────────────────────────────────────────────────────
 *
 *   bevestigen      de klant bevestigde het in het gesprek (V6: de consultant
 *                   legt het vast); de hoogste status, alleen van een mens
 *   aanpassen       een nieuwe tekst, als nieuwe versie; wat de consultant noteert
 *                   is wat de klant in het gesprek zei, dus verklaard
 *   dit klopt niet  afwijzen: bewaard, telt niet meer mee, komt niet stil terug
 *   niet op de site het gebruik wordt "intern": het mag vragen en kansen voeden,
 *                   maar komt niet op een pagina (§6.1)
 */
import { isAfgewezen, magOvergaan, type KennisRegelItem } from "@/lib/kennis/regels";

export type OverzichtActie = "bevestigen" | "aanpassen" | "afwijzen" | "niet_op_site";
export const OVERZICHT_ACTIES: readonly OverzichtActie[] = ["bevestigen", "aanpassen", "afwijzen", "niet_op_site"];

export interface OverzichtItem extends KennisRegelItem {
  id: string;
  soort: string | null;
  vastgelegd_op?: string | null;
  /** Waarom de schrijver dit nu niet krijgt (`BLOKKADE_ZIN` in `betwist.ts`), of niets. */
  blokkade?: string | null;
}

export const DOMEIN_KOP: Record<string, string> = {
  identiteit: "Het bedrijf",
  aanbod: "Aanbod, prijzen en werkwijze",
  doelgroep: "Klanten en hun bezwaren",
  positionering: "Wat het bedrijf anders doet",
  bewijs: "Bewijs",
  verhaal: "Verhalen van de ondernemer",
  stem: "Hoe het bedrijf klinkt",
  grens: "Wat niet op de site mag",
  geleerd: "Wat eerdere pagina's opleverden",
};

const DOMEIN_VOLGORDE = Object.keys(DOMEIN_KOP);

export const STATUS_LABEL: Record<string, string> = {
  bevestigd: "Bevestigd",
  verklaard: "Volgens de klant",
  waargenomen: "Gezien op de site",
  afgeleid: "Vermoeden",
};

const BRON_LABEL: Record<string, string> = {
  website: "de website",
  klant: "een antwoord van de klant",
  gesprek: "het gesprek",
  document: "een document",
  extern: "een externe bron",
  meting: "een meting",
  ai: "het onderzoek door ORBIT ENGINE",
};

export const GEBRUIK_LABEL: Record<string, string> = {
  content: "Mag op een pagina",
  intern: "Alleen intern",
  verboden: "Verboden op de site",
};

/** "Uit het gesprek, 26 sep 2026." De herkomst in één zin, zonder technische woorden. */
export function herkomstZin(item: Pick<OverzichtItem, "bron" | "vastgelegd_op">): string {
  const bron = BRON_LABEL[item.bron] ?? item.bron;
  const datum = item.vastgelegd_op
    ? new Date(item.vastgelegd_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
    : null;
  return datum ? `Uit ${bron}, ${datum}.` : `Uit ${bron}.`;
}

/** Welke handelingen kunnen bij dit item? Leeg bij een afgewezen of vervangen item. */
export function handelingenVoor(item: OverzichtItem): OverzichtActie[] {
  if (item.vervangen_door || isAfgewezen(item)) return [];
  const uit: OverzichtActie[] = [];
  if (magOvergaan(item.status as never, "bevestigd", "mens", item)) uit.push("bevestigen");
  // Een verbod pas je aan of wijs je af; "niet op de site" zegt het al.
  uit.push("aanpassen");
  uit.push("afwijzen");
  if (item.gebruik === "content") uit.push("niet_op_site");
  return uit;
}

/**
 * Het gebruik van de aangepaste versie. Een verbod blijft een verbod, en wat de
 * consultant eerder van de site haalde blijft eraf. Een vermoeden stond alleen op
 * intern omdat het een vermoeden was (`controleerItem()`); zodra de klant het in
 * eigen woorden zegt, mag het op een pagina.
 */
export function nieuwGebruikBijAanpassen(item: Pick<OverzichtItem, "status" | "gebruik">): "content" | "intern" | "verboden" {
  if (item.gebruik === "verboden") return "verboden";
  if (item.gebruik === "intern" && item.status !== "afgeleid") return "intern";
  return "content";
}

export interface OverzichtGroep {
  domein: string;
  kop: string;
  items: OverzichtItem[];
}

export interface Overzicht {
  weten: OverzichtGroep[];
  denken: OverzichtGroep[];
  afgewezen: OverzichtItem[];
  aantallen: { weten: number; denken: number; afgewezen: number; bevestigd: number };
}

const STATUS_VOLGORDE: Record<string, number> = { bevestigd: 0, verklaard: 1, waargenomen: 2, afgeleid: 3 };

function groepeer(items: readonly OverzichtItem[]): OverzichtGroep[] {
  return DOMEIN_VOLGORDE.map((domein) => ({
    domein,
    kop: DOMEIN_KOP[domein]!,
    items: items
      .filter((i) => i.domein === domein)
      .sort((a, b) => (STATUS_VOLGORDE[a.status] ?? 9) - (STATUS_VOLGORDE[b.status] ?? 9) || a.bewering.localeCompare(b.bewering, "nl")),
  })).filter((g) => g.items.length > 0);
}

/** De actuele kennis van één merk, ingedeeld voor het scherm. Vervangen versies vallen weg. */
export function maakOverzicht(items: readonly OverzichtItem[]): Overzicht {
  const actueel = items.filter((i) => !i.vervangen_door);
  const afgewezen = actueel.filter((i) => isAfgewezen(i));
  const levend = actueel.filter((i) => !isAfgewezen(i));
  const weten = levend.filter((i) => i.status !== "afgeleid");
  const denken = levend.filter((i) => i.status === "afgeleid");
  return {
    weten: groepeer(weten),
    denken: groepeer(denken),
    afgewezen,
    aantallen: {
      weten: weten.length,
      denken: denken.length,
      afgewezen: afgewezen.length,
      bevestigd: weten.filter((i) => i.status === "bevestigd").length,
    },
  };
}

// ── Feiten en kennis: twee tabbladen op één scherm (30 september 2026) ───────
//
// Het scherm `merkprofiel/feiten-en-kennis` verving `admin/kennis` en
// `admin/feiten`. De eigenaar wil "Feiten" en "Kennis" als twee tabbladen. De
// kennislaag kent geen onderscheid tussen die twee woorden, dus dit is de
// indeling die we erop leggen, op het domein en niet op de soort: elk item heeft
// een domein, terwijl `soort` pas na het indelen van de sitefeiten gevuld is
// (`indelen.ts`) en bij een antwoord van de klant leeg blijft.
//
//   Feiten   wat je kunt nalopen tegen de werkelijkheid: wie het bedrijf is,
//            wat het aanbiedt tegen welke prijs en termijn, welk bewijs er is,
//            en wat niet op de site mag (de vier harde domeinen, waar de
//            botsingen van `samenvoegen.ts` ook in optreden)
//   Kennis   hoe het bedrijf zich verhoudt tot zijn markt: klanten en
//            bezwaren, wat het anders doet, verhalen, stem en wat eerdere
//            pagina's opleverden
//
// Een nieuw domein zonder plek hier valt in Kennis (`tabVoorDomein`), zodat
// niets stilletjes van het scherm verdwijnt.

export type KennisTab = "feiten" | "kennis";
export const KENNIS_TABS: readonly KennisTab[] = ["feiten", "kennis"];

export const FEITEN_DOMEINEN: readonly string[] = ["identiteit", "aanbod", "bewijs", "grens"];

export function tabVoorDomein(domein: string): KennisTab {
  return FEITEN_DOMEINEN.includes(domein) ? "feiten" : "kennis";
}

/** Een onbekende of ontbrekende `?tab=` valt terug op Feiten. */
export function leesTab(waarde: string | null | undefined): KennisTab {
  return waarde === "kennis" ? "kennis" : "feiten";
}

/**
 * Het filter boven de lijst: één woord per stand van een item.
 * "alles" is alles wat meetelt, dus zonder wat een mens afwees.
 */
export type KennisFilter = "alles" | "bevestigd" | "site" | "klant" | "vermoeden" | "afgewezen";
export const KENNIS_FILTERS: readonly KennisFilter[] = ["alles", "bevestigd", "site", "klant", "vermoeden", "afgewezen"];

export const FILTER_LABEL: Record<KennisFilter, string> = {
  alles: "Alles",
  bevestigd: "Bevestigd",
  site: "Van de site",
  klant: "Volgens de klant",
  vermoeden: "Vermoedens",
  afgewezen: "Afgewezen",
};

/** In welk filter valt dit item, buiten "alles"? */
export function standVan(item: Pick<OverzichtItem, "status" | "afgewezen_op">): Exclude<KennisFilter, "alles"> {
  if (isAfgewezen(item)) return "afgewezen";
  if (item.status === "bevestigd") return "bevestigd";
  if (item.status === "waargenomen") return "site";
  if (item.status === "verklaard") return "klant";
  return "vermoeden";
}

export function pastInFilter(item: Pick<OverzichtItem, "status" | "afgewezen_op">, filter: KennisFilter): boolean {
  const stand = standVan(item);
  return filter === "alles" ? stand !== "afgewezen" : stand === filter;
}

export type Telling = Record<KennisFilter, number>;

export function telPerFilter(items: readonly Pick<OverzichtItem, "status" | "afgewezen_op">[]): Telling {
  const t: Telling = { alles: 0, bevestigd: 0, site: 0, klant: 0, vermoeden: 0, afgewezen: 0 };
  for (const i of items) {
    const stand = standVan(i);
    t[stand] += 1;
    if (stand !== "afgewezen") t.alles += 1;
  }
  return t;
}

/** De items van één tabblad, zonder vervangen versies (geschiedenis, geen kennis). */
export function itemsVoorTab(items: readonly OverzichtItem[], tab: KennisTab): OverzichtItem[] {
  return items.filter((i) => !i.vervangen_door && tabVoorDomein(i.domein) === tab);
}

/**
 * De items van een tabblad onder één filter, per domein. Binnen een domein
 * staat bevestigd bovenaan en vermoedens onderaan, zoals op het oude
 * kennisoverzicht, en daarna alfabetisch zodat de volgorde bij elke verversing
 * gelijk blijft.
 */
export function groepenVoorFilter(items: readonly OverzichtItem[], filter: KennisFilter): OverzichtGroep[] {
  return groepeer(items.filter((i) => pastInFilter(i, filter)));
}

// ── De open punten van het onderzoek (A3) ────────────────────────────────────

export interface OpenPunt {
  /** Uit welke stap het punt komt. */
  bron: "samenvatting" | "aanbod" | "werkgebied";
  punt: string;
}

/**
 * Woorden die een streek of regio aanduiden en geen plaats. Bewust kort: een
 * plaats die toevallig zo heet ("Heerhugowaard") telt niet, want de regel kijkt
 * naar losse woorden en naar het begin van het woord.
 */
const STREEK =
  /^(regio|omgeving|streek|provincie)\b|\b(en omstreken|e\.o\.|en omgeving)\b|^(noord|zuid|oost|west|midden)[- ]?(nederland|holland|brabant|limburg)\b|^(brabant|limburg|zeeland|friesland|drenthe|overijssel|gelderland|flevoland|noord-holland|zuid-holland|randstad|achterhoek|twente|veluwe|betuwe|de kempen|west-friesland|alblasserwaard|vijfheerenlanden|krimpenerwaard|hoeksche waard|het gooi)$/i;

/** Is dit werkgebied een streek en geen plaats? */
export function isStreek(naam: string): boolean {
  return STREEK.test(naam.trim());
}

/**
 * V10 van `docs/tasks/pijplijnanalyse-contentketen.md`: het werkgebied in
 * plaatsen. Staat er een streek in het werkgebied, dan is "welke plaatsen
 * precies?" het eerste open punt van het gesprek, want de meetvragen en de
 * pagina's noemen straks die plaatsen. Een onbekend bedrijfsmodel is ook een
 * open punt in plaats van een stille keuze: het stuurt welke vragen de brief
 * stelt.
 */
export function werkgebiedPunten(profiel: { service_scope: string | null; service_regions: readonly string[] | null; business_model: string | null }): OpenPunt[] {
  const uit: OpenPunt[] = [];
  const streken = (profiel.service_regions ?? []).filter(isStreek);
  if (profiel.service_scope === "lokaal" && streken.length > 0) {
    uit.push({ bron: "werkgebied", punt: `Welke plaatsen vallen precies onder ${streken.join(" en ")}? Daar zoeken klanten op.` });
  }
  if (!profiel.business_model || profiel.business_model === "overig") {
    uit.push({ bron: "werkgebied", punt: "Wat voor bedrijf is dit: een dienstverlener, een winkel, een platform of een maker van eigen producten?" });
  }
  return uit;
}

/**
 * Wat het onderzoek niet kon vaststellen, uit de verslagen van de samenvatting
 * en de aanbodboom (`profile_facets`, facet `synthese` en `aanbod`). Tot A3
 * werden de punten van de samenvatting losse vragen aan de klant; sinds besluit
 * V3 vraagt alleen de voorbereiding van een pagina, en staan deze punten hier,
 * voor de consultant, als onderwerp voor het gesprek (A3).
 */
export function openPuntenUitOnderzoek(facetten: readonly { facet: string; raw_json: unknown }[]): OpenPunt[] {
  const uit: OpenPunt[] = [];
  const gezien = new Set<string>();
  for (const f of facetten) {
    const bron = f.facet === "synthese" ? "samenvatting" : f.facet === "aanbod" ? "aanbod" : null;
    if (!bron || !f.raw_json || typeof f.raw_json !== "object") continue;
    const raw = f.raw_json as { gaps?: unknown; output_parsed?: { gaps?: unknown } };
    const lijst = Array.isArray(raw.gaps) ? raw.gaps : Array.isArray(raw.output_parsed?.gaps) ? raw.output_parsed!.gaps : [];
    for (const p of lijst as unknown[]) {
      const punt = typeof p === "string" ? p.replace(/^\s*[-*•]\s*/, "").trim() : "";
      if (!punt || gezien.has(punt.toLowerCase())) continue;
      gezien.add(punt.toLowerCase());
      uit.push({ bron, punt });
    }
  }
  return uit;
}
