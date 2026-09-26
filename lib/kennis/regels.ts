/**
 * DE REGELS VAN DE KENNISLAAG (`docs/tasks/van-pijplijn-naar-kennissysteem.md`,
 * K1 en §6.1).
 *
 * Code, geen AI. Drie vragen, elk met één antwoord op één plek:
 *   1. Mag dit item zo worden vastgelegd? (`controleerItem`)
 *   2. Waar mag het heen: een pagina, vragen en kansen, het kennisoverzicht?
 *      (`magInBlokA`, `setVoorBlokA`, `magVoorVragenEnKansen`, `rolInOverzicht`)
 *   3. Mag de status veranderen, en door wie? (`magOvergaan`)
 * Plus: wanneer is een item verlopen (`isVerlopen`).
 *
 * ── WAAROM DIT HIER STAAT EN NIET IN DE PROMPT ──────────────────────────────
 *
 * De vorige opbouw vertrouwde erop dat een model onderscheid maakte tussen wat
 * het op de site las en wat het dacht. Bij de proef van 26 september 2026 ging
 * `value_props`, een oordeel van het merkonderzoek zonder citaat, als "waar het
 * bedrijf voor staat" naar de schrijver (`kennismodel-inventaris.md` §3 punt 5).
 * Dit is een mechanische regel, dus hij krijgt een vangnet in code (conventie 1).
 * De vier belangrijkste staan daarnaast als check-constraint in migratie 0116.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

export const DOMEINEN = [
  "identiteit",
  "aanbod",
  "doelgroep",
  "positionering",
  "bewijs",
  "stem",
  "verhaal",
  "grens",
  "geleerd",
] as const;
export type Domein = (typeof DOMEINEN)[number];

export const STATUSSEN = ["waargenomen", "verklaard", "bevestigd", "afgeleid"] as const;
export type KennisStatus = (typeof STATUSSEN)[number];

export const BRONNEN = ["website", "klant", "gesprek", "document", "extern", "meting", "ai"] as const;
export type KennisBron = (typeof BRONNEN)[number];

export const GEBRUIK = ["content", "intern", "verboden"] as const;
export type KennisGebruik = (typeof GEBRUIK)[number];

export type Bewijskracht = "geen" | "gewoon" | "sterk";

/**
 * Wie een handeling doet. Het verschil tussen `model` en `code` is de kern van P2:
 * een model mag alleen iets vastleggen wat het denkt (afgeleid). Wat een model op
 * een pagina vond, wordt pas waargenomen als de CODE het citaat letterlijk op die
 * pagina terugvond, en dan is de code de actor.
 */
export type Actor = "mens" | "code" | "model";

/** De velden die de regels nodig hebben. De rest van de rij doet er hier niet toe. */
export interface KennisRegelItem {
  domein: string;
  bewering: string;
  status: string;
  bron: string;
  gebruik: string;
  bron_url?: string | null;
  citaat?: string | null;
  bevestigd_door?: string | null;
  bevestigd_op?: string | null;
  vastgelegd_door?: string | null;
  vastgelegd_door_taak?: string | null;
  verloopt_op?: string | null;
  vervangen_door?: string | null;
  bewijskracht?: string | null;
}

function gevuld(tekst: string | null | undefined): boolean {
  return typeof tekst === "string" && tekst.trim().length > 0;
}

function isEen<T extends string>(lijst: readonly T[], waarde: string): waarde is T {
  return (lijst as readonly string[]).includes(waarde);
}

// ── 1. Mag dit item zo worden vastgelegd? ────────────────────────────────────

/**
 * Alle redenen waarom dit item niet vastgelegd mag worden. Een lege lijst is goed.
 *
 * Een lijst en geen eerste fout: wie een item met drie gebreken aanlevert, wil
 * ze alle drie in één keer zien in plaats van drie keer opnieuw te proberen.
 */
export function controleerItem(item: KennisRegelItem): string[] {
  const fouten: string[] = [];
  if (!gevuld(item.bewering)) fouten.push("Een kennisitem heeft een bewering nodig.");
  if (!isEen(DOMEINEN, item.domein)) fouten.push(`Onbekend domein: "${item.domein}".`);
  if (!isEen(STATUSSEN, item.status)) fouten.push(`Onbekende status: "${item.status}".`);
  if (!isEen(BRONNEN, item.bron)) fouten.push(`Onbekende bron: "${item.bron}".`);
  if (!isEen(GEBRUIK, item.gebruik)) fouten.push(`Onbekend gebruik: "${item.gebruik}".`);
  if (item.bewijskracht != null && !["geen", "gewoon", "sterk"].includes(item.bewijskracht)) {
    fouten.push(`Onbekende bewijskracht: "${item.bewijskracht}".`);
  }

  if (item.status === "waargenomen" && !(gevuld(item.citaat) && gevuld(item.bron_url))) {
    fouten.push("Waargenomen kan alleen met een bronadres en een letterlijk citaat.");
  }
  if (item.bron === "ai" && (item.status === "verklaard" || item.status === "bevestigd")) {
    fouten.push("Een model kan niets verklaren of bevestigen; wat een model denkt is afgeleid.");
  }
  if (item.status === "bevestigd" && !(gevuld(item.bevestigd_door) && gevuld(item.bevestigd_op))) {
    fouten.push("Bevestigd kan alleen met wie en wanneer het bevestigde.");
  }
  if (item.status === "afgeleid" && item.gebruik === "content") {
    fouten.push("Afgeleid is geen feit en mag niet op een pagina; kies intern of verboden.");
  }
  if (!gevuld(item.vastgelegd_door) && !gevuld(item.vastgelegd_door_taak)) {
    fouten.push("Zeg wie het vastlegde: een mens of een taak.");
  }
  return fouten;
}

// ── 2. Waar mag het heen? ─────────────────────────────────────────────────────

/**
 * Is het item verlopen? Een prijs die al een maand over zijn datum is, is een
 * gok, en onbekend is beter dan verkeerd (conventie 3). `verloopt_op` is een
 * datum zonder tijd: op de dag zelf geldt hij nog.
 */
export function isVerlopen(item: Pick<KennisRegelItem, "verloopt_op">, nu: Date): boolean {
  if (!item.verloopt_op) return false;
  const vandaag = nu.toISOString().slice(0, 10);
  return item.verloopt_op.slice(0, 10) < vandaag;
}

/** Actueel: niet vervangen en niet verlopen. */
export function isActueel(item: KennisRegelItem, nu: Date): boolean {
  return !item.vervangen_door && !isVerlopen(item, nu);
}

/**
 * Mag dit item als bewering in blok A, de bedrijfskennis voor de schrijver?
 *
 * Alleen wat gezien, gezegd of bevestigd is, met het gebruik "content", en nog
 * actueel. Een waargenomen item zonder citaat komt er ook niet in, ook al zou de
 * database dat al tegenhouden: een rij van vóór een regelwijziging mag niet
 * alsnog doorglippen. Afgeleid komt er nooit in (§4 regel 4). Verboden items gaan
 * niet als bewering mee, maar als verbod (`setVoorBlokA`).
 */
export function magInBlokA(item: KennisRegelItem, nu: Date): boolean {
  if (!isActueel(item, nu)) return false;
  if (item.gebruik !== "content") return false;
  if (item.status === "afgeleid") return false;
  if (item.status === "waargenomen" && !(gevuld(item.citaat) && gevuld(item.bron_url))) return false;
  if (item.bron === "ai" && item.status !== "waargenomen") return false;
  return item.status === "waargenomen" || item.status === "verklaard" || item.status === "bevestigd";
}

const STATUS_VOLGORDE: Record<string, number> = { bevestigd: 0, verklaard: 1, waargenomen: 2 };
const KRACHT_VOLGORDE: Record<string, number> = { sterk: 0, gewoon: 1, geen: 2 };

export interface BlokASet<T> {
  /** De beweringen, bevestigd eerst, daarbinnen het sterkste bewijs eerst. */
  beweringen: T[];
  /** Wat de klant niet wil. Gaat naar de schrijver als verbod, nooit als bewering. */
  verboden: T[];
}

/**
 * De set voor blok A: wat mag, in de volgorde waarin het mag.
 *
 * "Bevestigd eerst" komt uit §6.1 van het plan. Daarbinnen gaat verklaard vóór
 * waargenomen: wat de ondernemer zelf zei is dichter bij de waarheid dan wat op
 * een misschien verouderde pagina staat. Bij gelijke status beslist de
 * bewijskracht (besluit V12), zoals `kiesFeiten()` dat nu doet.
 */
export function setVoorBlokA<T extends KennisRegelItem>(items: readonly T[], nu: Date): BlokASet<T> {
  const beweringen = items
    .filter((i) => magInBlokA(i, nu))
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (STATUS_VOLGORDE[a.item.status] ?? 9) - (STATUS_VOLGORDE[b.item.status] ?? 9) ||
        (KRACHT_VOLGORDE[a.item.bewijskracht ?? "gewoon"] ?? 1) - (KRACHT_VOLGORDE[b.item.bewijskracht ?? "gewoon"] ?? 1) ||
        a.index - b.index,
    )
    .map(({ item }) => item);
  // Een verbod geldt ook als het verlopen is: "zeg nooit gratis" veroudert niet.
  const verboden = items.filter((i) => !i.vervangen_door && i.gebruik === "verboden");
  return { beweringen, verboden };
}

/**
 * Mag dit item vragen en kansen voeden? Ja, ook afgeleid (als hypothese), behalve
 * wat verboden is: een onderwerp dat de klant niet wil, hoort geen kans te worden.
 */
export function magVoorVragenEnKansen(item: KennisRegelItem, nu: Date): boolean {
  if (item.vervangen_door) return false;
  if (item.gebruik === "verboden") return false;
  return isEen(STATUSSEN, item.status) && !isVerlopen(item, nu);
}

/**
 * Hoe het item in het kennisoverzicht (K7) staat. Alles staat erin, ook wat
 * verlopen is: de consultant moet juist zien wat opnieuw bevestigd moet worden.
 */
export type OverzichtRol = "met bron" | "volgens de klant" | "bevestigd" | "we denken" | "verboden" | "verlopen" | "vervangen";

export function rolInOverzicht(item: KennisRegelItem, nu: Date): OverzichtRol {
  if (item.vervangen_door) return "vervangen";
  if (item.gebruik === "verboden") return "verboden";
  if (isVerlopen(item, nu)) return "verlopen";
  switch (item.status) {
    case "bevestigd":
      return "bevestigd";
    case "verklaard":
      return "volgens de klant";
    case "waargenomen":
      return "met bron";
    default:
      return "we denken";
  }
}

// ── 3. Mag de status veranderen? ─────────────────────────────────────────────

/**
 * Mag de status van `van` naar `naar`, door deze actor?
 *
 *   - Een model zet nooit een status; wat een model vindt, is een nieuw afgeleid
 *     item, of wordt door de code waargenomen als het citaat klopt.
 *   - Verklaard en bevestigd komen alleen van een mens (§4 regel 2): de klant zegt
 *     het in het gesprek, de consultant legt het vast (besluit V6).
 *   - Waargenomen vereist een citaat, en mag van de code (die het citaat
 *     controleerde) of van een mens.
 *   - Terug naar afgeleid bestaat niet. Wat niet meer klopt, wordt afgewezen of
 *     vervangen door een nieuw item, zodat de geschiedenis blijft (`vervangen_door`).
 *   - Bevestigd is het eindpunt. Veranderen gaat via een nieuw item.
 */
export function magOvergaan(
  van: KennisStatus,
  naar: KennisStatus,
  door: Actor,
  item: Pick<KennisRegelItem, "citaat" | "bron_url">,
): boolean {
  if (van === naar) return false;
  if (door === "model") return false;
  if (van === "bevestigd") return false;
  if (naar === "afgeleid") return false;
  if (naar === "verklaard" || naar === "bevestigd") return door === "mens";
  if (naar === "waargenomen") {
    if (van !== "afgeleid") return false;
    return gevuld(item.citaat) && gevuld(item.bron_url);
  }
  return false;
}

/**
 * Welke status een nieuw item van deze actor en bron hooguit mag krijgen. Voor
 * K2 (`legVast()`): een model levert altijd afgeleid; de code waargenomen of
 * afgeleid, en verklaard alleen als hij iets overneemt wat een mens zei (een
 * antwoord, het gesprek, een geplakt document, zoals het terugvullen van K3);
 * een mens alles behalve bevestigd (bevestigen is een eigen handeling met
 * `bevestig()`).
 */
export function magNieuwMetStatus(status: KennisStatus, door: Actor, bron: KennisBron): boolean {
  if (door === "model") return status === "afgeleid";
  if (status === "bevestigd") return false;
  if (bron === "ai") return status === "afgeleid" || status === "waargenomen";
  if (status === "verklaard") return bron === "klant" || bron === "gesprek" || bron === "document";
  return true;
}
