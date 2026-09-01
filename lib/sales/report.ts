/**
 * Het publieke marktrapport: wat er wél en niet op mag
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 20 en 23).
 *
 * ── HET RAPPORT IS BEWIJS EN GEEN PRODUCT ───────────────────────────────────
 *
 * "De prospect hoeft het hele marktrapport niet te lezen; hij komt binnen via een
 * mail die al vertelt wat er aan de hand is. Het rapport is de controle, niet de
 * introductie." Dat bepaalt de vorm: kort, feitelijk, en met de meetverantwoording
 * erbij, want iemand die hier komt kijken wil weten of het klopt.
 *
 * ── EN DRIE DINGEN DIE ER NOOIT OP MOGEN ────────────────────────────────────
 *
 * 1. **Geen persoonsgegevens.** De contactpersonen uit `sales_contacts` zijn
 *    persoonsgegevens, ook als ze publiek op een website staan (plan 9.4). Ze
 *    verschijnen nooit op een publieke pagina.
 * 2. **Geen bedrijf dat om verwijdering vroeg.** Zonder discussie, direct
 *    (plan hoofdstuk 20). Het bedrijf blijft wel in de meting staan, anders komt
 *    het bij de volgende ronde gewoon weer boven.
 * 3. **Geen oordeel over een bedrijf.** Wat er staat is wat de AI-assistenten
 *    antwoordden. "Bedrijf X wordt weinig genoemd" is een meting; "bedrijf X doet
 *    aan slechte marketing" is een belediging met een grafiek eromheen, en die
 *    staat straks op een pagina die de ondernemer zelf leest.
 *
 * Bewust ZONDER `server-only` (conventie 2): de controle op wat er publiek mag,
 * is het belangrijkste stuk van dit hoofdstuk om te kunnen testen.
 */
import { getallenInZin } from "@/lib/sales/hook";

/** Het adres van een markt. Ook het publieke adres (plan 7.1 en les A uit 23). */
export function marktAdres(slug: string): string {
  return `/markt/${slug}`;
}

export interface RapportBedrijf {
  companyId: string;
  naam: string;
  /** Breuk van 0 tot 1. */
  aandeel: number;
  vermeldingen: number;
  vragen: number;
  /** Op verzoek verwijderd van elke publieke pagina. */
  verborgen: boolean;
}

export interface RapportInvoer {
  markt: string;
  plaats: string;
  branche: string;
  bedrijven: RapportBedrijf[];
  vragen: number;
  engines: string[];
  gemetenOp: string | null;
}

/**
 * Welke bedrijven mogen op de publieke pagina?
 *
 * ⚠️ Eén regel, en hij is absoluut: wie om verwijdering vroeg, staat er niet op.
 * Niet geanonimiseerd, niet als "een bedrijf in deze markt", niet in een totaal
 * dat hem impliciet zichtbaar maakt. Weg is weg.
 */
export function publiekeBedrijven(bedrijven: RapportBedrijf[]): RapportBedrijf[] {
  return bedrijven
    .filter((b) => !b.verborgen)
    .sort((a, b) => b.aandeel - a.aandeel || a.naam.localeCompare(b.naam, "nl"));
}

export interface RapportOordeel {
  ok: boolean;
  bezwaren: string[];
}

/**
 * Mag deze markt gepubliceerd worden?
 *
 * Drie voorwaarden, en de derde is de minst voor de hand liggende: onder de vijf
 * zichtbare bedrijven is een marktrapport geen marktbeeld maar een lijstje waarin
 * elk bedrijf herkenbaar is aan zijn positie. Dan is "anoniem verwijderd" een
 * illusie, en dan kan de pagina beter niet bestaan.
 */
export function magPubliceren(invoer: RapportInvoer): RapportOordeel {
  const bezwaren: string[] = [];
  const zichtbaar = publiekeBedrijven(invoer.bedrijven);

  if (invoer.vragen < 10) {
    bezwaren.push(
      `Deze markt is op ${invoer.vragen} vragen gemeten. Dat is te weinig om er publiek een ` +
        "uitspraak over te doen.",
    );
  }
  if (invoer.engines.length === 0) {
    bezwaren.push("Er heeft geen enkele AI-assistent gemeten in deze ronde.");
  }
  if (zichtbaar.length < 5) {
    bezwaren.push(
      `Er blijven ${zichtbaar.length} bedrijven over voor de publieke pagina. Onder de vijf is elk ` +
        "bedrijf herkenbaar aan zijn plek in de lijst, en dan is verwijderen op verzoek een " +
        "loze belofte.",
    );
  }

  return { ok: bezwaren.length === 0, bezwaren };
}

/**
 * Controleert de rapporttekst op dezelfde regel als de haak en de mail.
 *
 * Elk getal moet uit de meting komen. Bij een publieke pagina weegt dat het
 * zwaarst van alle drie: hij staat er maanden, hij is door iedereen te vinden,
 * en de ondernemer over wie het gaat leest hem zelf.
 */
export function controleerRapport(tekst: string, invoer: RapportInvoer): RapportOordeel {
  const bezwaren: string[] = [];

  const toegestaan = new Set<number>([invoer.vragen, invoer.engines.length]);
  for (const b of invoer.bedrijven) {
    toegestaan.add(b.vermeldingen);
    toegestaan.add(b.vragen);
    toegestaan.add(Math.round(b.aandeel * 100));
  }
  const zichtbaar = publiekeBedrijven(invoer.bedrijven);
  toegestaan.add(zichtbaar.length);
  toegestaan.add(invoer.bedrijven.length);
  // Hoeveel bedrijven er überhaupt genoemd worden. Dat is de zin die elk rapport
  // maakt ("van de negen bedrijven worden er vier genoemd"), en zonder dit getal
  // in de lijst valt het eigen sjabloon door zijn eigen controle.
  toegestaan.add(zichtbaar.filter((b) => b.vermeldingen > 0).length);

  const onbekend = getallenInZin(tekst).filter((g) => !toegestaan.has(Math.round(g)));
  if (onbekend.length > 0) {
    bezwaren.push(
      `Deze cijfers staan niet in de meting: ${onbekend.join(", ")}. Op een publieke pagina is dat ` +
        "een fout die iedereen kan narekenen.",
    );
  }

  // Regel 3: geen oordeel over een bedrijf. Deze woorden zijn niet uitputtend en
  // dat hoeft ook niet: ze vangen de vormen die een model kiest zodra het van een
  // meting een verhaal maakt.
  const oordelen = ["slecht", "achterlijk", "amateuristisch", "faalt", "verwaarloosd", "dom"];
  const gevonden = oordelen.filter((w) => new RegExp(`\\b${w}`, "i").test(tekst));
  if (gevonden.length > 0) {
    bezwaren.push(
      `Er staat een oordeel in over een bedrijf (${gevonden.join(", ")}). Deze pagina zegt wat de ` +
        "AI-assistenten antwoordden, en niets over de kwaliteit van een bedrijf.",
    );
  }

  return { ok: bezwaren.length === 0, bezwaren };
}

/**
 * De sjabloontekst: wat er staat als het model niets bruikbaars levert.
 *
 * Zelfde rol als bij de haak en de mail. Saai, kort, waar, en volledig
 * samengesteld uit gecontroleerde getallen.
 */
export function sjabloonRapport(invoer: RapportInvoer): {
  intro: string;
  methode: string;
  bevindingen: string;
} {
  const zichtbaar = publiekeBedrijven(invoer.bedrijven);
  const genoemd = zichtbaar.filter((b) => b.vermeldingen > 0).length;

  return {
    intro:
      `Steeds meer mensen vragen een AI-assistent om een aanbeveling in plaats van een zoekmachine. ` +
      `Deze pagina laat zien welke ${invoer.branche} in ${invoer.plaats} daarbij genoemd worden.`,
    methode:
      `Wij stelden ${invoer.vragen} vragen die iemand zou stellen die in ${invoer.plaats} op zoek is ` +
      `naar een ${invoer.branche}. Die vragen gingen naar ${invoer.engines.length} AI-assistent` +
      `${invoer.engines.length === 1 ? "" : "en"}. Per antwoord is geteld welke bedrijven genoemd ` +
      "werden. De bedrijvenlijst komt uit openbare bronnen en is met de hand nagelopen.",
    bevindingen:
      `Van de ${zichtbaar.length} bedrijven in deze lijst worden er ${genoemd} minstens één keer ` +
      "genoemd. De rest komt in geen enkel antwoord voor. Dat zegt niets over de kwaliteit van hun " +
      "werk: het zegt iets over wat een AI-assistent over ze weet.",
  };
}

/** De opdracht aan het model. Apart, zodat de test hem kan nalezen. */
export function bouwRapportVraag(invoer: RapportInvoer): string {
  const zichtbaar = publiekeBedrijven(invoer.bedrijven);
  const regels = zichtbaar
    .slice(0, 30)
    .map((b) => `- ${b.naam}: ${b.vermeldingen} van de ${b.vragen} vragen (${Math.round(b.aandeel * 100)}%)`)
    .join("\n");

  return [
    `Markt: ${invoer.markt}`,
    `Branche: ${invoer.branche}`,
    `Plaats: ${invoer.plaats}`,
    `Gemeten met ${invoer.vragen} vragen op ${invoer.engines.length} AI-assistenten.`,
    "",
    "De uitkomst per bedrijf:",
    regels,
    "",
    "Schrijf drie korte stukken voor een openbare pagina:",
    "1. Een inleiding van twee zinnen over waarom dit gemeten is.",
    "2. Een verantwoording van de methode: wat er precies gevraagd is en hoe er geteld is.",
    "3. De bevindingen: wat er opvalt in deze markt.",
    "",
    "Regels:",
    "- Gebruik alleen de cijfers hierboven. Verzin er geen enkel bij, ook geen afronding.",
    "- Schrijf wat de AI-assistenten antwoordden. Geef geen oordeel over een bedrijf en zeg " +
      "nooit dat een bedrijf iets slecht doet.",
    "- Noem geen personen en geen contactgegevens.",
    "- Geen verkooppraat en geen uitleg over ons eigen product.",
    "- Nederlands, zakelijk, samen hooguit 300 woorden.",
  ].join("\n");
}
