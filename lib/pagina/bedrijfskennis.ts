/**
 * BLOK A: wat we zeker weten over het bedrijf
 * (`docs/tasks/contentketen-opnieuw.md` §5 en §6.4, besluit B20).
 *
 * Sinds K6 (27 september 2026) komt blok A uit de kennislaag: welke kennis mee
 * gaat, beslist `kiesVoorBlokA()` in `lib/kennis/blok-a.ts`, en `kennisVoor()`
 * haalt hem per pagina op. Dit bestand is alleen nog de vorm waarin de brief en
 * de schrijver hem krijgen.
 *
 * Wat daarmee verviel: de feiten uit `brand_facts` met een filter op woorden in
 * `geldt_voor` (nu de dienst van de kans), de losse profielvelden (verhalen,
 * bezwaren, onderscheid, bewijs buiten de site: nu kennisitems met herkomst),
 * de antwoorden op eerdere vragen (idem, besluit B17 blijft gelden), en "waar
 * het bedrijf voor staat" uit `value_props`: een oordeel van het merkonderzoek
 * zonder citaat, dat nooit in blok A mocht (P3).
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { blokAUitKennis, type KennisVoorBlokA } from "@/lib/kennis/blok-a";

export interface BedrijfsInvoer {
  bedrijfsnaam: string;
  /** De kennis voor deze pagina, al gekozen en op volgorde (`kiesVoorBlokA()`). */
  kennis: KennisVoorBlokA[];
  /** Verboden woorden en onderwerpen uit de kennislaag: gaan als verbod mee, niet als bewering. */
  verbodenWoorden: string[];
  verbodenOnderwerpen: string[];
  /** Het vaste contactblok (`contactBlok()`, V3), of null als er niets bekend is. */
  contact?: string | null;
}

/** Blok A als tekst voor de schrijver. Lege onderdelen vallen weg. */
export function blokA(invoer: BedrijfsInvoer): string {
  return blokAUitKennis(invoer.bedrijfsnaam, invoer.kennis, invoer.contact ?? null);
}
