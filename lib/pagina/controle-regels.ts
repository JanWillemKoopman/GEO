/**
 * DE KWALITEITSCONTROLE: de opdracht, het schema en de beslissingen erna
 * (`docs/tasks/contentketen-opnieuw.md` §6.6 en §6.7).
 *
 * Eén beoordeling, geen panel. De eindredacteur geeft een oordeel en hooguit
 * vijf concrete punten; hij herschrijft niet zelf. Wat code daarna beslist,
 * staat hier als pure functies:
 *
 *   - herschrijven of niet (`moetHerschrijven`);
 *   - na het herschrijven: de nieuwe of de vorige versie (`kiesVersie`);
 *   - welke zinnen geel worden (`geleZinnenNa`).
 *
 * Geen score, geen drempel, geen tweede beoordeling (§3).
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { z } from "zod";
import { normaliseerVraag } from "@/lib/pagina/brief-regels";
import { splitsZinnen } from "@/lib/pagina/harde-beweringen";

export const MAX_PUNTEN = 5;

export const ControleSchema = z.object({
  oordeel: z.enum(["goed", "niet_goed"]),
  verzonnen: z.array(z.object({ zin: z.string(), waarom: z.string() })),
  punten: z.array(z.object({ waar: z.string(), probleem: z.string(), hoe: z.string() })),
});

export type Beoordeling = z.infer<typeof ControleSchema>;

export const CONTROLE_SYSTEEM = `Je bent een ervaren eindredacteur. Je weet wat deze ondernemer wil: een pagina die klopt, die klinkt als zijn bedrijf, en waar een bezoeker echt iets aan heeft. Je krijgt de tekst en alle informatie die de schrijver had. Je herschrijft niets; je beoordeelt.

Twee vragen.

1. Klopt het? Staan er bedrijfsclaims, cijfers, prijzen, garanties, certificeringen of andere concrete beweringen over dit bedrijf in die niet uit de informatie blijken? Zet elke zo'n zin letterlijk in verzonnen, met in één zin waarom. Algemene vakkennis is geen verzonnen claim zolang hij als algemene uitleg staat. Staat hij er als iets wat dit bedrijf doet, biedt, belooft, adviseert of hanteert, en blijkt dat niet uit de informatie over het bedrijf, dan is het wel een verzonnen claim. Je krijgt ook de zinnen die een controle in code niet in de informatie terugvond; beoordeel die zelf, ze zijn niet automatisch fout.

2. Is het goed? Is de hoofdvraag meteen beantwoord; is de zoekintentie afgedekt; is het prettig en natuurlijk geschreven en klinkt het als de stemvoorbeelden; is er genoeg diepgang; is er onnodige herhaling; zijn er zinnen letterlijk uit de stemvoorbeelden overgenomen; voelt het als echte content en niet als AI-content; staat er iets in dat echt van dit bedrijf komt; heeft de lezer er iets aan?

Oordeel "goed" als je deze pagina zo op de site van de ondernemer zou zetten. Anders "niet_goed", met hooguit ${MAX_PUNTEN} punten: waar in de tekst, wat het probleem is, en hoe het beter kan. Concreet, zodat een schrijver er direct mee verder kan. Geen punten over smaak als de tekst verder goed is.`;

export function controleInvoer(input: { informatie: string; tekst: string; ongedekt: string[] }): string {
  return [
    `DE INFORMATIE DIE DE SCHRIJVER HAD\n${input.informatie}`,
    `DE TEKST\n"""${input.tekst.trim()}"""`,
    input.ongedekt.length > 0
      ? "ZINNEN DIE DE CONTROLE IN CODE NIET IN DE INFORMATIE TERUGVOND\n" + input.ongedekt.map((z) => `- "${z}"`).join("\n")
      : "De controle in code vond geen zinnen met een harde bewering zonder bron.",
  ].join("\n\n");
}

/** Herschrijven als het oordeel niet goed is, of als er verzonnen of ongedekte zinnen zijn (§6.6). */
export function moetHerschrijven(beoordeling: Beoordeling | null, ongedekt: readonly string[]): boolean {
  // Een mislukte beoordeling herschrijft niet: dan worden de ongedekte zinnen geel.
  if (!beoordeling) return false;
  return beoordeling.oordeel === "niet_goed" || beoordeling.verzonnen.length > 0 || ongedekt.length > 0;
}

/** De nieuwe versie blijft, tenzij hij meer ongedekte zinnen heeft dan de vorige (§6.7). */
export function kiesVersie(ongedektVorige: number, ongedektNieuw: number): "nieuw" | "vorige" {
  return ongedektNieuw > ongedektVorige ? "vorige" : "nieuw";
}

function plat(t: string): string {
  return normaliseerVraag(t);
}

/**
 * De gele zinnen: wat de code ongedekt vond, plus de zinnen die de
 * beoordeling verzonnen noemde en die er nog staan. Zonder dubbelingen, in de
 * volgorde waarin ze voorkomen.
 */
export function geleZinnenNa(tekst: string, ongedekt: readonly string[], verzonnen: readonly string[]): string[] {
  const inTekst = plat(tekst);
  const uit: string[] = [];
  const gezien = new Set<string>();
  for (const z of [...ongedekt, ...verzonnen.filter((v) => plat(v) && inTekst.includes(plat(v)))]) {
    const sleutel = plat(z);
    if (!sleutel || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push(z);
  }
  return uit;
}

/**
 * Zinnen met een woord dat het merk niet wil gebruiken (`profiles.taboo_phrases`,
 * besluit B16). Een uitzondering tussen haakjes ("gratis (behalve bij de
 * offerte)") telt niet mee in het zoeken: de code kan die afweging niet maken,
 * dus de zin wordt geel en de ondernemer beslist. Liever onterecht geel.
 */
export function zinnenMetVerbodenWoord(tekst: string, woorden: readonly string[]): string[] {
  const patronen = woorden
    .map((w) => w.replace(/\([^)]*\)/g, "").trim().toLowerCase())
    .filter((w) => w.length >= 3)
    .map((w) => new RegExp(`(?<![\\p{L}\\d])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\d])`, "iu"));
  if (patronen.length === 0) return [];
  return splitsZinnen(tekst).filter((zin) => patronen.some((re) => re.test(zin)));
}

/** Wat er in `content_pieces.controle_json` staat. */
export interface ControleJson {
  /** Zinnen die de code na het schrijven ongedekt vond. */
  ongedekt: string[];
  /** Zinnen met een woord dat het merk niet wil gebruiken (B16). Afwezig bij oudere controles. */
  verboden?: string[];
  /** Null als de beoordeling definitief mislukte. */
  beoordeling: Beoordeling | null;
  herschreven: boolean;
  /** Alleen na een herschrijving: welke versie bleef, en waarom. */
  herschrijving?: { ongedekt_vorige: number; ongedekt_nieuw: number; behouden: "nieuw" | "vorige" };
  /** Wat de ondernemer moet nalopen voor hij goedkeurt. */
  gele_zinnen: string[];
  /** De gele zinnen die de ondernemer bevestigde. */
  bevestigd: string[];
}

/** Zijn alle gele zinnen bevestigd? Onbekend (geen controle) telt als niet. */
export function allesBevestigd(c: Pick<ControleJson, "gele_zinnen" | "bevestigd"> | null): boolean {
  if (!c) return false;
  const bevestigd = new Set(c.bevestigd.map(plat));
  return c.gele_zinnen.every((z) => bevestigd.has(plat(z)));
}
