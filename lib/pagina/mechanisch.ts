/**
 * MECHANISCHE REPARATIE van een geschreven pagina
 * (`docs/tasks/contentketen-opnieuw.md` §6.5).
 *
 * Alleen regels die geen oordeel vragen: de verboden tekens uit
 * `docs/schrijfstijl.md` §10 en de lengte van metatitel en metabeschrijving.
 * Repareren, nooit blokkeren: een pagina die om een gedachtestreepje wordt
 * tegengehouden, is precies de starheid waar de vorige keten aan ten onder ging.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { pasSchrijfregelsToe } from "@/lib/schrijfregel-vangnet";
import { heelMetatitel, heelMetabeschrijving, MAX_METABESCHRIJVING } from "@/lib/pipeline/metatitel";

/** Google toont hoogstens zoveel tekens van de titel. */
export const MAX_METATITEL = 60;

/** Inkorten tot `max` tekens op een woordgrens, zonder half woord aan het eind. */
function opWoordgrens(tekst: string, max: number): string {
  if (tekst.length <= max) return tekst;
  const kort = tekst.slice(0, max + 1);
  const grens = kort.lastIndexOf(" ");
  return (grens > 0 ? kort.slice(0, grens) : tekst.slice(0, max)).replace(/[\s,;:|-]+$/, "");
}

/**
 * Een te lange metatitel: eerst het deel vóór " | " proberen (de bedrijfsnaam
 * valt dan weg, de gestructureerde gegevens dragen hem al), anders op een
 * woordgrens inkorten.
 */
function korteMetatitel(titel: string, bedrijfsnaam: string): string {
  const heel = heelMetatitel(titel, bedrijfsnaam);
  if (heel.length <= MAX_METATITEL) return heel;
  const voor = heel.split(" | ")[0]?.trim() ?? heel;
  return opWoordgrens(voor, MAX_METATITEL);
}

function korteMetabeschrijving(tekst: string, bedrijfsnaam: string): string {
  const heel = heelMetabeschrijving(tekst, bedrijfsnaam);
  if (heel.length <= MAX_METABESCHRIJVING) return heel;
  const kort = opWoordgrens(heel, MAX_METABESCHRIJVING - 1);
  return /[.!?]$/.test(kort) ? kort : `${kort}.`;
}

export interface PaginaTekst {
  titel: string;
  meta_titel: string;
  meta_beschrijving: string;
  tekst_markdown: string;
  faq: { vraag: string; antwoord: string }[];
}

/**
 * Een kastlijntje zonder spaties tussen twee woorden ("werk—en") is ook een
 * gedachtestreepje; tussen twee cijfers ("5–8") is het een bereik en blijft het
 * staan (de uitzondering uit §10).
 */
function schoon(tekst: string): string {
  return pasSchrijfregelsToe(tekst).replace(/(\p{L})[—–](\p{L})/gu, "$1, $2");
}

export function repareerMechanisch(p: PaginaTekst, bedrijfsnaam: string): PaginaTekst {
  return {
    titel: schoon(p.titel).trim(),
    meta_titel: korteMetatitel(schoon(p.meta_titel).trim(), bedrijfsnaam),
    meta_beschrijving: korteMetabeschrijving(schoon(p.meta_beschrijving).trim(), bedrijfsnaam),
    tekst_markdown: schoon(p.tekst_markdown).trim(),
    faq: p.faq
      .map((f) => ({ vraag: schoon(f.vraag).trim(), antwoord: schoon(f.antwoord).trim() }))
      .filter((f) => f.vraag && f.antwoord),
  };
}
