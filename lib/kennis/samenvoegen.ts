/**
 * ONTDUBBELEN EN BOTSINGEN VINDEN op de kennislaag (K2 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Code, geen AI (§4 regel 1). Hergebruikt twee bestaande, geteste stukken:
 *   - `claimKey()` (factcard.ts) voor de ontdubbelsleutel: dezelfde bewering in
 *     een andere woordvolgorde wordt één item;
 *   - `vindKandidaten()` (conflict-detect.ts) voor botsingen: zelfde soort, zelfde
 *     geldigheid, een andere waarde die te vergelijken is. Bij de proef van
 *     september 2026 vond dat drie paren in zes feiten, waarvan twee echt botsten.
 *
 * Het oordeel "botsing of twee varianten" velt hier geen model maar de
 * consultant, op het kennisoverzicht (besluit V14, 26 september 2026).
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { claimKey } from "@/lib/pipeline/factcard";
import { FEIT_SOORTEN, vindKandidaten, ernstVan, type FeitSoort, type FeitWaarde, type RegisterFeit } from "@/lib/pipeline/conflict-detect";

/** Wat de sleutel en de botsingen van een item nodig hebben. */
export interface SamenvoegItem {
  id: string;
  domein: string;
  soort: string | null;
  bewering: string;
  waarde: unknown | null;
  geldt_voor: readonly string[] | null;
  analysis_id: string | null;
  content_piece_id: string | null;
  sleutel: string | null;
  vervangen_door?: string | null;
  afgewezen_op?: string | null;
}

/**
 * De ontdubbelsleutel: domein, soort, reikwijdte en de kern van de bewering.
 *
 * De soort zit erin omdat "Eindhoven" als werkgebied iets anders zegt dan
 * "Eindhoven" als groeiregio (gevonden bij het terugvullen, K3): zonder soort
 * zou de tweede stil in de eerste opgaan.
 *
 * De reikwijdte zit erin omdat hetzelfde zinnetje voor één pagina iets anders
 * is dan voor het hele merk: het verhaal bij de open vraag van pagina A mag niet
 * samenvallen met een merkbreed item, anders wordt het stil merkbreed (V13).
 *
 * Heeft de bewering geen woorden van meer dan twee letters ("je", "RT", "€ 45"),
 * dan is de letterlijke tekst de kern, met een "=" ervoor. Zonder sleutel zou
 * elke run van het terugvullen zo'n item opnieuw vastleggen (conventie 9).
 * Alleen een lege bewering heeft geen sleutel.
 */
export function kennisSleutel(
  item: Pick<SamenvoegItem, "domein" | "bewering" | "analysis_id" | "content_piece_id"> & { soort?: string | null },
): string | null {
  const letterlijk = item.bewering.toLowerCase().replace(/\s+/g, " ").trim();
  const kern = claimKey(item.bewering) || (letterlijk ? `=${letterlijk}` : "");
  if (!kern) return null;
  return [item.domein, (item.soort ?? "").trim().toLowerCase(), item.analysis_id ?? "", item.content_piece_id ?? "", kern].join("|");
}

function isFeitSoort(soort: string | null): soort is FeitSoort {
  return soort !== null && (FEIT_SOORTEN as readonly string[]).includes(soort);
}

function isWaarde(waarde: unknown): waarde is FeitWaarde {
  if (!waarde || typeof waarde !== "object" || Array.isArray(waarde)) return false;
  const w = waarde as FeitWaarde;
  return typeof w.min === "number" || (typeof w.tekst === "string" && w.tekst.trim().length > 0);
}

/**
 * De geldigheid als één vergelijkbare tekst: waarvoor het geldt, voor welk
 * onderwerp en welke pagina. Gesorteerd, zodat [dienst, regio] en [regio,
 * dienst] hetzelfde zijn.
 */
export function geldigheid(item: Pick<SamenvoegItem, "geldt_voor" | "analysis_id" | "content_piece_id">): string {
  return [
    [...(item.geldt_voor ?? [])].sort().join(" "),
    item.analysis_id ?? "",
    item.content_piece_id ?? "",
  ].join(" ").trim();
}

function naarRegister(item: SamenvoegItem): RegisterFeit {
  return {
    id: item.id,
    text: item.bewering,
    kind: "kennis",
    factKey: item.sleutel ?? item.id,
    soort: isFeitSoort(item.soort) ? item.soort : null,
    waarde: isWaarde(item.waarde) ? item.waarde : null,
    geldtVoor: geldigheid(item),
    stand: null,
    bewijskracht: null,
  };
}

export interface KennisBotsing {
  /** Het nieuwe item en het bestaande waarmee het botst. */
  nieuwId: string;
  bestaandId: string;
  soort: FeitSoort;
  ernst: "blokkerend" | "waarschuwing";
  /** Voor `fact_conflicts.paar_sleutel`; het voorvoegsel houdt hem apart van de feitenparen. */
  paarSleutel: string;
}

/**
 * Met welke actuele items botst dit nieuwe item? Alleen paren waar het nieuwe
 * item in zit: de oude botsingen onderling zijn al eerder gevonden.
 */
export function botsingenMet(nieuw: SamenvoegItem, bestaand: readonly SamenvoegItem[]): KennisBotsing[] {
  const actueel = bestaand.filter((b) => b.id !== nieuw.id && !b.vervangen_door && !b.afgewezen_op);
  return vindKandidaten([naarRegister(nieuw), ...actueel.map(naarRegister)])
    .filter((k) => k.a.id === nieuw.id || k.b.id === nieuw.id)
    .map((k) => {
      const ander = k.a.id === nieuw.id ? k.b : k.a;
      return {
        nieuwId: nieuw.id,
        bestaandId: ander.id,
        soort: k.soort,
        ernst: ernstVan(k.soort),
        paarSleutel: `kennis:${[nieuw.id, ander.id].sort().join("|")}`,
      };
    });
}
