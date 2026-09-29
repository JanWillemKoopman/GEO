/**
 * DE FUNCTIE VAN EEN BESTAANDE PAGINA blijft staan bij een verbetering
 * (kwaliteitsdoorlichting 24 september 2026, punt 45).
 *
 * ── WAT ER MISGING ──────────────────────────────────────────────────────────
 *
 * "Maak de bestaande hoofdpagina concreter over complete tuinen en bestrating"
 * werd een tekst "Complete tuin met bestrating in Helmond", bedoeld voor het
 * adres van de homepage: wie hem publiceert, vervangt de homepage van een
 * hovenier met zeven werkplaatsen en vijftien diensten door een pagina over één
 * plaats en één dienst. Bij de rijschool werd de prijzenpagina "Losse rijles bij
 * faalangst in Eindhoven", zonder proefles, automaat en simulatorcursus. De
 * blinde lezers zeiden bij 5 van de 16 teksten "past niet bij het adres".
 *
 * De oorzaak: de opzet nam de zwaarste doelvraag als onderwerp, en niet het
 * soort pagina dat er stond.
 *
 * ── WAT DEZE MODULE DOET ────────────────────────────────────────────────────
 *
 * Twee dingen, allebei deterministisch:
 *
 *   1. De homepage, de contactpagina en de over-ons-pagina worden nooit
 *      vervangen door een onderwerppagina. Wijst een aanbeveling er een aan, dan
 *      wordt het een nieuwe pagina met die pagina als verwante pagina
 *      (`existing-page-match.ts`).
 *   2. Bij elke andere verbetering krijgt de opzet de huidige functie mee als
 *      vaste eis, met de doelvraag als aanvulling (`functieblok()`).
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { segmentsOf } from "@/lib/crawl-urls";

export type FunctieSoort = "homepage" | "prijzen" | "contact" | "over" | "overzicht" | "verzameling" | "bericht" | "onderwerp";

/**
 * Pagina's die nooit één onderwerp mogen worden. Sinds 29 september 2026 ook
 * een verzamelpagina (tips, blog, kennisbank, nieuws) en een los nieuwsbericht:
 * in ronde 1 werd de tipspagina van De Waard (een wespenvanger en mieren) een
 * pagina over mollen, en een nieuwsbericht over één nest een dienstpagina (V21
 * van `pijplijnanalyse-contentketen.md`). Zo'n aanbeveling wordt een nieuwe
 * pagina met de bestaande als verwante pagina.
 */
export const NIET_TE_VERVANGEN: readonly FunctieSoort[] = ["homepage", "contact", "over", "verzameling", "bericht"];

/** De eerste stap van het pad van een verzameling van berichten of artikelen. */
const VERZAMELING = /^(tips|blog|blogs|nieuws|actueel|kennisbank|artikelen|news|nieuwsberichten|werkzaamheden-en-nieuws|projecten)$/;

export function paginaSoort(url: string): FunctieSoort {
  const segmenten = segmentsOf(url);
  if (segmenten.length === 0) return "homepage";
  const pad = segmenten.join("/").toLowerCase();
  if (/(^|[-/])(prijs|prijzen|tarief|tarieven|kosten|lespakket|lespakketten|pakketten)([-/]|$)/.test(pad)) {
    return "prijzen";
  }
  if (segmenten.length === 1 && /^contact(-\d+)?$|^contactgegevens$/.test(pad)) return "contact";
  if (segmenten.length === 1 && /^(over-ons|over|wie-zijn-wij|ons-team.*|team)$/.test(pad)) return "over";
  if (segmenten.length === 1 && /^(diensten|aanbod|onze-diensten|werkzaamheden|services)$/.test(pad)) {
    return "overzicht";
  }
  const eerste = (segmenten[0] ?? "").toLowerCase();
  if (VERZAMELING.test(eerste)) {
    if (segmenten.length === 1) return "verzameling";
    // Een los bericht onder nieuws of blog; een artikel in een kennisbank of een
    // tip is een onderwerp op zich en mag verbeterd worden.
    if (/^(nieuws|actueel|news|nieuwsberichten|werkzaamheden-en-nieuws|blog|blogs)$/.test(eerste)) return "bericht";
  }
  return "onderwerp";
}

/** Een pagina die we bij een verbetering niet mogen vervangen door een onderwerppagina. */
export function isFunctiepagina(url: string | null | undefined): boolean {
  return !!url && NIET_TE_VERVANGEN.includes(paginaSoort(url));
}

const EIS: Record<FunctieSoort, string> = {
  homepage:
    "Dit is de HOMEPAGE. Hij blijft het hele aanbod en het hele werkgebied dekken. Maak er nooit een pagina over één plaats of één dienst van.",
  prijzen:
    "Dit is de PRIJZENPAGINA. Alle prijzen en pakketten die er nu op staan, blijven erop. De doelvraag komt erbij, hij vervangt niets.",
  contact:
    "Dit is de CONTACTPAGINA. Hij blijft gaan over hoe je het bedrijf bereikt.",
  over: "Dit is de pagina OVER HET BEDRIJF. Hij blijft over het bedrijf en de mensen gaan.",
  overzicht:
    "Dit is het OVERZICHT VAN HET AANBOD. Alle diensten die er nu op staan, blijven erop.",
  verzameling:
    "Dit is een VERZAMELPAGINA met berichten of artikelen. Hij blijft een overzicht van wat er nu op staat.",
  bericht: "Dit is een NIEUWSBERICHT over één gebeurtenis. Hij blijft over die gebeurtenis gaan.",
  onderwerp:
    "Het onderwerp van deze pagina blijft wat het nu is, voor dezelfde lezer.",
};

/**
 * Wat de schrijver van een verbeterpagina over die pagina meekrijgt: wat de
 * pagina nu is, als vaste eis, en dat de concrete gegevens erop blijven. Leeg
 * zonder bestaande pagina.
 *
 * ⚠️ Deze functie werd na de ombouw van de contentketen (25 september 2026)
 * nergens meer aangeroepen. In ronde 1 werd de prijspagina van de software van
 * Myfinance daardoor een pagina over de boekhoudservice, precies de fout
 * waarvoor dit ooit gebouwd werd. Nu roept `schrijfInvoer()` hem weer aan (V21
 * van `pijplijnanalyse-contentketen.md`); een test bewaakt dat.
 */
export function functieblok(url: string | null | undefined, titel: string | null | undefined): string {
  if (!url) return "";
  const soort = paginaSoort(url);
  const huidig = (titel ?? "").trim();
  return (
    `${EIS[soort]}` +
    (huidig ? ` De huidige titel is "${huidig}"; de nieuwe tekst gaat over hetzelfde.` : "") +
    ` Wat de bezoeker volgens de zoekintentie wil weten, krijgt een plek op deze pagina en wordt niet het nieuwe onderwerp ervan.` +
    ` De concrete gegevens die er nu op staan (prijzen, pakketten, voorwaarden, contactgegevens) blijven erop, tenzij de bedrijfskennis zegt dat ze niet meer kloppen.`
  );
}
