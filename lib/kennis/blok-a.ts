/**
 * BLOK A UIT DE KENNISLAAG (K6 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`,
 * besluit B20 van `docs/tasks/contentketen-opnieuw.md`).
 *
 * Welke kennis de schrijver over het bedrijf krijgt, en in welke vorm. Puur,
 * zonder `server-only` (conventie 2); het ophalen staat in `voor-pagina.ts`.
 *
 * ── WAT ERIN MAG ────────────────────────────────────────────────────────────
 *
 * Alleen wat `setVoorBlokA()` toestaat (`lib/kennis/regels.ts`, §6.1): gezien met
 * een citaat, gezegd door de klant of het gesprek, of bevestigd door een mens,
 * met het gebruik "content" en nog actueel. Nooit iets wat alleen een model
 * denkt (§4 regel 4). Verboden woorden en onderwerpen gaan apart mee, als
 * verbod. Bevestigd eerst, dan verklaard, dan waargenomen; daarbinnen sterk
 * bewijs eerst. Hooguit `MAX_KENNIS` items: bij een groot merk wordt de invoer
 * anders duur en afleidend (contentketen §11 risico 10, dezelfde grens als het
 * oude blok A).
 *
 * ── WAT BIJ DEZE PAGINA HOORT ───────────────────────────────────────────────
 *
 *   - voor één pagina (`content_piece_id`): alleen als het een versie van deze
 *     pagina is (gevonden in K5: een herschreven pagina krijgt een nieuw id);
 *   - voor één cluster (`analysis_id`): alleen bij een pagina uit dat cluster;
 *   - voor een dienst of regio (`geldt_voor`): alleen als de pagina daarvoor
 *     geldt. Welke diensten dat zijn, zegt de kans achter de pagina (N2), met
 *     alles wat eronder hangt; zonder kans de diensten waarvan de naam in de
 *     titel of de zoekintentie staat (zoals het oude blok A het deed). Een
 *     dienst of categorie zelf alleen als hij daarbij hoort;
 *   - anders: merkbreed, dus altijd.
 *
 * Wat op de conflictlijst staat of daar verloor, gaat niet mee (`betwist.ts`).
 *
 * Een antwoord dat al in blok B staat (een vraag aan deze pagina), gaat niet
 * nog eens in blok A: twee keer hetzelfde antwoord in de invoer maakt het niet
 * beter (zelfde regel als het oude `antwoordenVoorBlokA`).
 */
import { setVoorBlokA, type KennisRegelItem } from "@/lib/kennis/regels";

export const MAX_KENNIS = 150;

/** Een kennisitem met alles wat nodig is om te kiezen en te schrijven. */
export interface KennisVoorBlokA extends KennisRegelItem {
  id: string;
  soort: string | null;
  geldt_voor: readonly string[];
  analysis_id: string | null;
  content_piece_id: string | null;
  herkomst_tabel: string | null;
  herkomst_id: string | null;
}

export interface PaginaVoorBlokA {
  analysisId: string;
  /** Alle versies van deze pagina. */
  paginaIds: readonly string[];
  titel: string;
  zoekintentie: string | null;
  /** De kennisitems (dienst, regio) van de kans achter de pagina; `null` = geen kans. */
  kansGeldtVoor: readonly string[] | null;
  /** De vragen die in blok B staan (aan een versie van deze pagina). */
  vragenInBlokB: readonly string[];
  /** Kennis die nu niet mee mag, van een tegenstrijdigheid (`blokkadesVan()` in `betwist.ts`). */
  geblokkeerd?: ReadonlySet<string>;
}

function woorden(tekst: string): string[] {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
}

/** De naam van een dienst uit zijn bewering ("Rijsimulatorles: oefenen met ..."). */
function dienstNaam(bewering: string): string {
  return bewering.split(":")[0] ?? bewering;
}

/**
 * De diensten en regio's waarvoor deze pagina geldt, met alles wat eronder hangt
 * (een dienst onder een categorie, een categorie onder een categorie).
 */
export function dienstenVanPagina(pagina: PaginaVoorBlokA, kennis: readonly KennisVoorBlokA[]): Set<string> {
  const gekozen = new Set<string>();
  // De plaatsen van de kans (besluit B32: een kans hangt niet meer aan een
  // dienst, wel aan de plaatsen die hij letterlijk noemt).
  for (const id of pagina.kansGeldtVoor ?? []) gekozen.add(id);
  // De diensten waarvan de naam in de titel of de zoekintentie staat. Sinds
  // B32 altijd zo, ook met een kans: er is geen koppeling aan het aanbod meer.
  const context = new Set(woorden(`${pagina.titel} ${pagina.zoekintentie ?? ""}`));
  for (const k of kennis) {
    if (k.soort !== "dienst" && k.soort !== "categorie") continue;
    if (woorden(dienstNaam(k.bewering)).some((w) => context.has(w))) gekozen.add(k.id);
  }
  // Naar beneden: wat onder een gekozen dienst of categorie hangt, hoort er ook bij.
  let groeit = true;
  while (groeit) {
    groeit = false;
    for (const k of kennis) {
      if ((k.soort === "dienst" || k.soort === "categorie") && !gekozen.has(k.id) && k.geldt_voor.some((g) => gekozen.has(g))) {
        gekozen.add(k.id);
        groeit = true;
      }
    }
  }
  return gekozen;
}

/**
 * Een knoop van de aanbodboom (dienst of categorie) hoort alleen bij de pagina
 * als hij bij de kans hoort, ook als hij nergens onder hangt.
 *
 * ⚠️ Gevonden bij het herschrijven op productie (27 september 2026): een
 * categorie zonder ouder telde als merkbreed, en dan kreeg de warmtepomppagina
 * van Keeris ook airco, zinkwerk en waterontharders als "wat we zeker weten".
 * Het oude blok A had de aanbodboom helemaal niet; de schrijver kent het aanbod
 * al uit de kans en de brief.
 */
function isAanbodKnoop(item: KennisVoorBlokA): boolean {
  return (item.soort === "dienst" || item.soort === "categorie") && item.herkomst_tabel === "profile_offerings";
}

export function hoortBijPagina(item: KennisVoorBlokA, pagina: PaginaVoorBlokA, diensten: ReadonlySet<string>): boolean {
  if (item.herkomst_tabel === "fact_requests" && item.herkomst_id && pagina.vragenInBlokB.includes(item.herkomst_id)) return false;
  // Een antwoord van vóór V17 hangt nog aan de diensten of plaatsen van de kans.
  // Via die omweg kwam het in ronde 1 op pagina's waar het niet hoorde (het
  // hoornaarantwoord op de mollenpagina). Zo'n antwoord bereikt zijn eigen
  // pagina via blok B, en een andere pagina alleen als de brief het koppelt.
  if (item.herkomst_tabel === "fact_requests" && item.geldt_voor.length > 0) return false;
  if (isAanbodKnoop(item)) return diensten.has(item.id);
  if (item.content_piece_id) return pagina.paginaIds.includes(item.content_piece_id);
  if (item.analysis_id && item.analysis_id !== pagina.analysisId) return false;
  if (item.geldt_voor.length > 0) return item.geldt_voor.some((g) => diensten.has(g)) || diensten.has(item.id);
  return true;
}

export interface KeuzeVoorBlokA {
  beweringen: KennisVoorBlokA[];
  verbodenWoorden: string[];
  verbodenOnderwerpen: string[];
}

export function kiesVoorBlokA(kennis: readonly KennisVoorBlokA[], pagina: PaginaVoorBlokA, nu: Date): KeuzeVoorBlokA {
  const diensten = dienstenVanPagina(pagina, kennis);
  // De stem gaat apart mee (de stemvoorbeelden en de aanspreekvorm): een hele
  // pagina van de site als "wat we zeker weten" leidt alleen af.
  // Wat op een open conflict staat of het verloor, gaat niet mee (K7): twee
  // versies van een prijs op dezelfde pagina is precies wat de conflictlijst
  // moet voorkomen.
  const passend = kennis.filter((k) => k.domein !== "stem" && !pagina.geblokkeerd?.has(k.id) && hoortBijPagina(k, pagina, diensten));
  const { beweringen } = setVoorBlokA(passend, nu);
  // Een verbod geldt altijd, voor elke pagina: ook als het aan een dienst hangt.
  const alleVerboden = setVoorBlokA(kennis, nu).verboden;
  const tekst = (soort: string) => [...new Set(alleVerboden.filter((v) => v.soort === soort).map((v) => v.bewering.trim()))];
  return {
    beweringen: beweringen.slice(0, MAX_KENNIS),
    verbodenWoorden: tekst("verboden woord"),
    verbodenOnderwerpen: tekst("verboden onderwerp"),
  };
}

/** De koppen van blok A, per domein, in deze volgorde. */
const KOPPEN: [string, string][] = [
  ["identiteit", "Over het bedrijf"],
  ["aanbod", "Aanbod, prijzen en werkwijze"],
  ["doelgroep", "Klanten en hun bezwaren, met het antwoord van de ondernemer"],
  ["positionering", "Wat het bedrijf anders doet"],
  ["bewijs", "Bewijs"],
  ["verhaal", "Verhalen van de ondernemer"],
  ["geleerd", "Wat eerdere pagina's opleverden"],
];

/** Zoveel tekens moet een antwoord hebben om zonder zijn vraag te begrijpen te zijn. */
export const ZELFSTANDIG_ANTWOORD = 40;

function plat(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Hoe één item in blok A staat (V3 van `pijplijnanalyse-contentketen.md`).
 *
 * Een antwoord van de klant is bewaard als "vraag, nieuwe regel, antwoord". De
 * vraag was voor de ondernemer ("Welke actuele totaalprijs mag de schrijver
 * noemen ...?"), niet voor de schrijver: bij een antwoord dat op zichzelf te
 * begrijpen is, gaat alleen het antwoord mee. Een kort antwoord ("Ja") houdt
 * zijn vraag, anders zegt het niets.
 */
export function regelVoorBlokA(item: Pick<KennisVoorBlokA, "bewering" | "herkomst_tabel" | "soort">): string {
  const tekst = item.bewering.trim();
  if (item.herkomst_tabel === "fact_requests" && item.soort !== "eigen verhaal") {
    const [vraag, ...rest] = tekst.split("\n");
    const antwoord = rest.join(" ").trim();
    if (antwoord.length >= ZELFSTANDIG_ANTWOORD) return antwoord;
    if (antwoord) return `${(vraag ?? "").trim()} ${antwoord}`;
  }
  return tekst.replace(/\n+/g, "\n  ");
}

/**
 * Blok A als tekst voor de schrijver. Lege domeinen vallen weg.
 *
 * V3 van `pijplijnanalyse-contentketen.md`: eerst een vast contactblok (in ronde
 * 1 stond bij nul van de achttien pagina's een telefoonnummer in de invoer),
 * geen dubbelingen (de vestiging stond twee keer), en een bezwaar zonder antwoord
 * van de ondernemer onder een eigen kop, zodat de schrijver er geen antwoord bij
 * verzint.
 */
export function blokAUitKennis(bedrijfsnaam: string, beweringen: readonly KennisVoorBlokA[], contact: string | null = null): string {
  const delen: string[] = [`Bedrijf: ${bedrijfsnaam}`];
  if (contact?.trim()) delen.push(contact.trim());
  const gezien = new Set<string>();
  const uniek = beweringen.filter((b) => {
    const sleutel = plat(regelVoorBlokA(b));
    if (!sleutel || gezien.has(sleutel)) return false;
    gezien.add(sleutel);
    return true;
  });
  const zonderAntwoord = uniek.filter((b) => b.soort === "bezwaar");
  for (const [domein, kop] of KOPPEN) {
    const regels = uniek
      .filter((b) => b.domein === domein && b.soort !== "bezwaar")
      .map((b) => `- ${regelVoorBlokA(b)}`);
    if (regels.length > 0) delen.push(`${kop}:\n${regels.join("\n")}`);
  }
  if (zonderAntwoord.length > 0) {
    delen.push(
      `Twijfels die klanten hebben (de ondernemer gaf hier geen antwoord op; beantwoord ze niet namens hem):\n${zonderAntwoord.map((b) => `- ${regelVoorBlokA(b)}`).join("\n")}`,
    );
  }
  return delen.join("\n\n");
}
