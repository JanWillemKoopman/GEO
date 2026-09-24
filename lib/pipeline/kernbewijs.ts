/**
 * HET STERKSTE BEWIJS: wat de ondernemer in het gesprek vertelde, hoort in de
 * tekst (kwaliteitsdoorlichting 24 september 2026, punt 47).
 *
 * ── WAT ER MISGING ──────────────────────────────────────────────────────────
 *
 * De rijschool: "Slagingspercentage 93 procent bij de eerste poging over 2025"
 * stond als bevestigd klantfeit op de feitenkaart van alle acht pagina's en
 * kwam in geen enkele tekst voor. De installateur: "Meer dan 1.800
 * onderhoudscontracten" en "Twaalf monteurs in dienst" op de kaart van alle vier
 * de pagina's, in geen enkele tekst, ook niet op de onderhoudspagina. Alle drie
 * de blinde lezers noemden dit als eerste wat een ondernemer zou toevoegen.
 *
 * De oorzaak: de schrijver kiest zelf drie tot vijf bewijspunten op "wat de
 * lezer zich afvraagt", en dat werden procesfeiten ("je kunt vooraf vertellen
 * wat je spannend vindt"). Het onderscheidende cijfer viel buiten de vijf.
 *
 * ── WAT DEZE MODULE DOET ────────────────────────────────────────────────────
 *
 * De feiten uit het gesprek (`offline_proof`, bron "opgegeven in het gesprek")
 * krijgen een eigen blok in de schrijfopdracht, los van de vijf bewijspunten,
 * en achteraf wordt geteld of er minstens één in de tekst staat. Niet
 * blokkerend: een tekst zonder dat cijfer is niet onwaar, alleen minder sterk.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { betekenisStaatInTekst } from "@/lib/pipeline/bewijspunten";

/** De bron die `offlineProofFacts()` (commercial-context.ts) aan deze feiten geeft. */
export const GESPREK_BRON = "opgegeven in het gesprek";

/** Meer dan vier is geen kern meer. */
export const MAX_KERNBEWIJS = 4;

export interface KernFeit {
  ref: string;
  text: string;
  source: string;
  allowed: boolean;
}

/** De feiten uit het gesprek die de schrijver mag gebruiken. */
export function vindKernbewijs<T extends KernFeit>(facts: readonly T[]): T[] {
  return facts.filter((f) => f.allowed && f.source === GESPREK_BRON).slice(0, MAX_KERNBEWIJS);
}

/** Het promptblok. Leeg als er niets uit het gesprek is. */
export function kernbewijsblok(kern: readonly KernFeit[]): string {
  if (kern.length === 0) return "";
  return (
    `\nHET STERKSTE BEWIJS VAN DIT BEDRIJF (door de ondernemer zelf verteld, bevestigd):\n` +
    kern.map((f) => `- ${f.ref}: ${f.text}`).join("\n") +
    `\nDit kan geen concurrent zeggen. Zet er MINSTENS ÉÉN van in de tekst, met het getal zoals het ` +
    `hier staat, op een plek waar het de keuze van de lezer onderbouwt. Kies het feit dat het best ` +
    `bij deze pagina past en maak het bij voorkeur ook een van je bewijspunten. Dit komt bovenop de ` +
    `bewijspunten, niet in plaats ervan.`
  );
}

const TELWOORDEN = [
  "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien", "elf", "twaalf",
  "dertien", "veertien", "vijftien", "twintig", "dertig", "veertig", "vijftig", "honderd",
];

/** De getallen in een tekst, zonder duizendtalpunt: "1.800" en "1800" zijn hetzelfde. */
function getallen(tekst: string): string[] {
  return (tekst.match(/\d[\d.,]*/g) ?? [])
    .map((g) => g.replace(/[.,](?=\d{3}\b)/g, "").replace(/[.,]$/, ""))
    .filter(Boolean);
}

/** Staat dit feit in de tekst? Op het getal als het er een heeft, anders op de woorden. */
export function kernFeitInTekst(feit: string, tekst: string): boolean {
  // Een jaartal is context, geen bewijs: "93 procent bij de eerste poging over
  // 2025" staat er ook in als de tekst "vorig jaar" zegt. Alleen als het jaartal
  // het enige getal is, telt het.
  const alle = getallen(feit);
  const zonderJaar = alle.filter((g) => !/^(19|20)\d{2}$/.test(g));
  const inFeit = zonderJaar.length > 0 ? zonderJaar : alle;
  if (inFeit.length > 0) {
    const inTekst = new Set(getallen(tekst));
    return inFeit.every((g) => inTekst.has(g));
  }
  const laag = tekst.toLowerCase();
  const telwoord = TELWOORDEN.find((t) => new RegExp(`\\b${t}\\b`, "i").test(feit));
  if (telwoord && !new RegExp(`\\b${telwoord}\\b`, "i").test(laag)) return false;
  return betekenisStaatInTekst(feit, tekst);
}

export interface KernbewijsResult {
  kern: KernFeit[];
  /** Het eerste kernfeit dat in de tekst staat, of `null`. */
  gebruikt: KernFeit | null;
  issues: string[];
}

export function checkKernbewijs(input: { kern: readonly KernFeit[]; tekst: string }): KernbewijsResult {
  const kern = [...input.kern];
  if (kern.length === 0) return { kern, gebruikt: null, issues: [] };
  const gebruikt = kern.find((f) => kernFeitInTekst(f.text, input.tekst)) ?? null;
  const issues = gebruikt
    ? []
    : [
        `Het sterkste bewijs dat de ondernemer zelf gaf, staat niet in de tekst: ` +
          kern.map((f) => `"${f.text}"`).join(", ") +
          `. Zet er minstens één in, met het getal, waar het de keuze van de lezer onderbouwt.`,
      ];
  return { kern, gebruikt, issues };
}
