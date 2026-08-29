/**
 * Welk genoemd bedrijf hoort bij welk bedrijf uit de markt?
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 15 en 9.1)
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS EN NIET EEN REGEL IN DE MEETSTAP ─────────
 *
 * Bij een klantmeting gaat het om één merk: staat het er wel of niet in. Hier
 * gaan dertig bedrijven door hetzelfde antwoord heen, en elke fout werkt twee
 * kanten op door:
 *
 *   - Een gemiste koppeling maakt van een genoemd bedrijf een onzichtbaar
 *     bedrijf, en dat wordt een opportunity die niet bestaat. Die belandt in een
 *     verkoopmail, en de prospect weet zelf beter.
 *   - Een verkeerde koppeling geeft de vermelding aan de buurman. Dat is de
 *     vervelendste soort fout, want hij ziet er goed uit.
 *
 * Conventie 2: dit is rekenwerk, dus het staat puur en zonder `server-only`, en
 * `scripts/test-unit.ts` toetst het zonder database en zonder API-sleutel.
 *
 * ── DE REGEL: CONSERVATIEF, NET ALS BIJ DE MERKEN ───────────────────────────
 *
 * Geen fuzzy matching. `lib/entities/normalize.ts` legt uit waarom: "Bakkerij
 * Jansen" en "Bakkerij Hansen" zijn twee bedrijven, en twee bedrijven
 * samenvoegen vervalst de data stil. Wat hier bovenop komt is het domein, en
 * dat is de sterkste sleutel die er is: twee bedrijven met hetzelfde webadres
 * bestaan niet.
 */
import { normalizeEntityName, isSameEntity } from "@/lib/entities/normalize";

/** Wat er van een bedrijf nodig is om het te herkennen. */
export interface HerkenbaarBedrijf {
  id: string;
  name: string;
  /** De schrijfwijzen waarop de meting ook telt. */
  nameVariants?: string[];
  domain?: string | null;
}

/** Eén naam zoals de engine hem noemde. */
export interface GenoemdeNaam {
  naam: string;
  /** Het webadres dat de engine erbij noemde, als hij er een noemde. */
  domein?: string | null;
}

export interface MatchUitkomst {
  /** Het bedrijf uit de markt, of `null` als geen enkel bedrijf past. */
  companyId: string | null;
  /** Waarop de koppeling rust. Bewaard, want een koppeling zonder grond is een gok. */
  grond: "domein" | "naam" | "variant" | null;
}

/**
 * Het webadres terugbrengen tot zijn kern, zodat `https://www.vanx.nl/over-ons`
 * en `vanx.nl` hetzelfde zijn.
 *
 * ⚠️ Bewust GEEN eigen implementatie van het domeinbegrip: dit is exact wat
 * `normalizeEntityName` in stap 1 al doet, en twee plekken die "hetzelfde
 * domein" net anders definiëren, leveren gegarandeerd twee verschillende
 * antwoorden op dezelfde vraag.
 */
export function domeinSleutel(ruw: string | null | undefined): string {
  if (!ruw) return "";
  return normalizeEntityName(ruw);
}

/**
 * Bij welk bedrijf uit de markt hoort deze genoemde naam?
 *
 * De volgorde is de volgorde van betrouwbaarheid, en die volgorde is het hele
 * ontwerp: het domein wint van de naam, en de opgegeven naam wint van een
 * schrijfwijze die iemand later heeft toegevoegd.
 */
export function koppelNaam(genoemd: GenoemdeNaam, bedrijven: HerkenbaarBedrijf[]): MatchUitkomst {
  const leeg: MatchUitkomst = { companyId: null, grond: null };

  const naam = (genoemd.naam ?? "").trim();
  if (naam.length < 2) return leeg;

  // 1. Het domein. Twee bedrijven met hetzelfde webadres bestaan niet.
  const domein = domeinSleutel(genoemd.domein);
  if (domein) {
    const opDomein = bedrijven.find((b) => b.domain && domeinSleutel(b.domain) === domein);
    if (opDomein) return { companyId: opDomein.id, grond: "domein" };
  }

  // 2. De naam zelf, genormaliseerd. `isSameEntity` haalt rechtsvorm en
  //    domeinextensie eraf, dus "Van X Makelaars B.V." en "Van X Makelaars"
  //    vallen samen.
  const opNaam = bedrijven.find((b) => isSameEntity(b.name, naam));
  if (opNaam) return { companyId: opNaam.id, grond: "naam" };

  // 3. De schrijfwijzen. Die staan er juist voor dit geval: "Van X" is in deze
  //    markt hetzelfde als "Van X Makelaars", en dat weet alleen wie de markt
  //    heeft goedgekeurd.
  const opVariant = bedrijven.find((b) =>
    (b.nameVariants ?? []).some((v) => isSameEntity(v, naam)),
  );
  if (opVariant) return { companyId: opVariant.id, grond: "variant" };

  return leeg;
}

export interface KoppelResultaat {
  /** Per bedrijf uit de markt: is het genoemd, en met welke naam. */
  gekoppeld: { companyId: string; genoemdAls: string; grond: "domein" | "naam" | "variant" }[];
  /**
   * De namen die de engine noemde en die bij geen enkel bedrijf horen.
   *
   * ⚠️ **Dit is informatie en geen afval** (plan 9.1, laatste rij). Ofwel onze
   * marktinventarisatie was incompleet, ofwel de engine verzint een naam. Het
   * eerste betekent dat er een prospect ontbreekt, het tweede dat de meting
   * minder waard is dan hij lijkt. Allebei hoort de admin te zien.
   */
  onbekend: string[];
}

/**
 * Alle namen uit één antwoord koppelen aan de bedrijven van de markt.
 *
 * Een bedrijf kan maar één keer gekoppeld worden, ook als de engine het twee
 * keer noemt: `sales_mentions` heeft één rij per bedrijf per antwoord, en twee
 * vermeldingen in hetzelfde antwoord zijn nog steeds één antwoord waarin het
 * bedrijf voorkomt. Anders telt een engine die zichzelf herhaalt als betere
 * zichtbaarheid.
 */
export function koppelAntwoord(
  namen: GenoemdeNaam[],
  bedrijven: HerkenbaarBedrijf[],
): KoppelResultaat {
  const gekoppeld: KoppelResultaat["gekoppeld"] = [];
  const gezien = new Set<string>();
  const onbekend: string[] = [];
  const onbekendGezien = new Set<string>();

  for (const genoemd of namen) {
    const uit = koppelNaam(genoemd, bedrijven);
    if (uit.companyId && uit.grond) {
      if (gezien.has(uit.companyId)) continue;
      gezien.add(uit.companyId);
      gekoppeld.push({
        companyId: uit.companyId,
        genoemdAls: genoemd.naam.trim(),
        grond: uit.grond,
      });
      continue;
    }

    const sleutel = normalizeEntityName(genoemd.naam);
    if (!sleutel || onbekendGezien.has(sleutel)) continue;
    onbekendGezien.add(sleutel);
    onbekend.push(genoemd.naam.trim());
  }

  return { gekoppeld, onbekend };
}
