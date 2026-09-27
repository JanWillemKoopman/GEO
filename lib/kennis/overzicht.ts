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

// ── De open punten van het onderzoek (A3) ────────────────────────────────────

export interface OpenPunt {
  /** Uit welke stap het punt komt. */
  bron: "samenvatting" | "aanbod";
  punt: string;
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
