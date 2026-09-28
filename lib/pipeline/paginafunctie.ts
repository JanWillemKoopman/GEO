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

export type FunctieSoort = "homepage" | "prijzen" | "contact" | "over" | "overzicht" | "onderwerp";

/** Pagina's die het hele bedrijf dragen en nooit één onderwerp mogen worden. */
export const NIET_TE_VERVANGEN: readonly FunctieSoort[] = ["homepage", "contact", "over"];

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
  onderwerp:
    "Het onderwerp van deze pagina blijft wat het nu is, voor dezelfde lezer.",
};

/**
 * Het promptblok voor de opzet en de schrijver: wat deze pagina nu is, als
 * vaste eis. Leeg zonder bestaande pagina.
 */
export function functieblok(url: string | null | undefined, titel: string | null | undefined): string {
  if (!url) return "";
  const soort = paginaSoort(url);
  const huidig = (titel ?? "").trim();
  return (
    `DE FUNCTIE VAN DEZE PAGINA (vaste eis, gaat vóór de doelvraag): ${EIS[soort]}` +
    (huidig ? ` De huidige titel is "${huidig}"; de nieuwe tekst gaat over hetzelfde.` : "") +
    ` De vraag die de pagina moet winnen, wordt een sectie op deze pagina en niet het nieuwe onderwerp ervan. ` +
    `Noem in doel en doelgroep dus de lezer van deze pagina, niet alleen de vrager van die ene vraag.`
  );
}
