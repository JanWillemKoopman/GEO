/**
 * DE KWALITEITSCONTROLE: de opdracht, het schema en de beslissingen erna
 * (`docs/tasks/contentketen-opnieuw.md` §6.6 en §6.7).
 *
 * Eén beoordeling, geen panel. De eindredacteur geeft een oordeel en hooguit
 * vijf concrete punten; hij herschrijft niet zelf. Wat code daarna beslist,
 * staat hier als pure functies:
 *
 *   - herschrijven of niet (`moetHerschrijven`);
 *   - na het herschrijven: wat de herschrijving aan ongedekte zinnen bijzette (`nieuwOngedekt`);
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

export const CONTROLE_SYSTEEM = `Je bent een ervaren eindredacteur. Je weet wat deze ondernemer wil: een pagina die klopt, die klinkt als zijn bedrijf, en waar een bezoeker echt iets aan heeft. Je krijgt de tekst, de metabeschrijving voor zoekmachines en de veelgestelde vragen (als die er zijn), en alle informatie die de schrijver had. Je herschrijft niets; je beoordeelt.

Twee vragen.

1. Klopt het? Staan er bedrijfsclaims, cijfers, prijzen, garanties, certificeringen of andere concrete beweringen over dit bedrijf in die niet uit de informatie blijken? Kijk naar de hele pagina: de tekst, de metabeschrijving én de veelgestelde vragen. Een verzonnen bedrag of belofte in een FAQ-antwoord of de metabeschrijving is net zo fout als in de tekst zelf. Zet elke zo'n zin letterlijk in verzonnen, met in één zin waarom. Algemene vakkennis is geen verzonnen claim zolang hij als algemene uitleg staat. Staat hij er als iets wat dit bedrijf doet, biedt, belooft, adviseert of hanteert, en blijkt dat niet uit de informatie over het bedrijf, dan is het wel een verzonnen claim. Je krijgt ook de zinnen die een controle in code niet in de informatie terugvond; beoordeel die zelf, ze zijn niet automatisch fout.

2. Is het goed? Is de hoofdvraag meteen beantwoord; is de zoekintentie afgedekt; is het prettig en natuurlijk geschreven en klinkt het als de stemvoorbeelden; is er onnodige herhaling; zijn er zinnen die de lezer niet helpen; zijn er zinnen letterlijk uit de stemvoorbeelden overgenomen; voelt het als echte content en niet als AI-content; staat er iets in dat echt van dit bedrijf komt; heeft de lezer er iets aan?

Oordeel "goed" als je deze pagina zo op de site van de ondernemer zou zetten. Anders "niet_goed", met hooguit ${MAX_PUNTEN} punten: waar in de tekst, wat het probleem is, en hoe het beter kan. Concreet, zodat een schrijver er direct mee verder kan. Geen punten over smaak als de tekst verder goed is.

Een punt schrapt, corrigeert, verplaatst of maakt korter, zoals een eindredacteur dat doet. Vraag nooit om een bedrag, een totaal, een voorwaarde, een uitzondering of een belofte die niet al in de informatie staat, en niet om een voorbehoud erbij.`;

export function controleInvoer(input: {
  informatie: string;
  tekst: string;
  /** Besluit B19: de eindredacteur krijgt de metabeschrijving en de FAQ mee. */
  metaBeschrijving?: string | null;
  faq?: { vraag: string; antwoord: string }[];
  ongedekt: string[];
}): string {
  return [
    `DE INFORMATIE DIE DE SCHRIJVER HAD\n${input.informatie}`,
    `DE TEKST\n"""${input.tekst.trim()}"""`,
    input.metaBeschrijving?.trim()
      ? `DE METABESCHRIJVING VOOR ZOEKMACHINES\n"""${input.metaBeschrijving.trim()}"""`
      : null,
    input.faq && input.faq.length > 0
      ? "DE VEELGESTELDE VRAGEN\n" + input.faq.map((f) => `Vraag: ${f.vraag}\nAntwoord: ${f.antwoord}`).join("\n\n")
      : null,
    input.ongedekt.length > 0
      ? "ZINNEN DIE DE CONTROLE IN CODE NIET IN DE INFORMATIE TERUGVOND\n" + input.ongedekt.map((z) => `- "${z}"`).join("\n")
      : "De controle in code vond geen zinnen met een harde bewering zonder bron.",
  ]
    .filter((x): x is string => x !== null)
    .join("\n\n");
}

/**
 * Herschrijven als het oordeel niet goed is, als de eindredacteur een zin
 * verzonnen noemt, of als er een woord in staat dat het merk niet wil (B16).
 *
 * ⚠️ Een zin die alleen de code niet in de informatie terugvond, is sinds
 * 29 september 2026 geen reden meer (V15, besluit B-e). Die zin wordt geel en
 * de ondernemer beslist (B1). In ronde 1 kwamen drie van de tien
 * herschrijvingen alleen daardoor, en bij de noodopening verloor de pagina er
 * drie bruikbare veelgestelde vragen door. Een verboden woord blijft wel een
 * reden: dat is een harde huisregel van de klant, geen twijfel over een feit.
 */
export function moetHerschrijven(beoordeling: Beoordeling | null, verboden: readonly string[] = []): boolean {
  // Een mislukte beoordeling herschrijft niet: dan worden de ongedekte zinnen geel.
  if (!beoordeling) return false;
  return beoordeling.oordeel === "niet_goed" || beoordeling.verzonnen.length > 0 || verboden.length > 0;
}

/**
 * De ongedekte zinnen van de herschrijving die er in de vorige versie niet
 * stonden.
 *
 * ⚠️ Tot 29 september 2026 koos de code hier tussen twee versies op het
 * AANTAL ongedekte zinnen, en gooide een betere herschrijving weg als die er
 * één meer had. Bij A6 in ronde 1 ging zo een versie weg die het ontbrekende
 * telefoonnummer had opgelost. Sinds V15 (besluit B-e) blijft de herschrijving
 * altijd; een nieuwe ongedekte zin wordt geel, zoals elke ongedekte zin, en
 * wordt hier apart bijgehouden zodat te zien is wat de herschrijving bijzette.
 */
export function nieuwOngedekt(vorige: readonly string[], nieuw: readonly string[]): string[] {
  const oud = new Set(vorige.map(plat));
  return nieuw.filter((z) => !oud.has(plat(z)));
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

/** Eén rij van `content_pieces.faq_json`. */
export interface FaqRij {
  q: string;
  a: string;
}

/** `faq_json` is onvertrouwde data uit de database: filtert alles behalve echte {q, a}-paren. */
export function faqRijen(raw: unknown): FaqRij[] {
  return (Array.isArray(raw) ? (raw as { q?: unknown; a?: unknown }[]) : [])
    .filter((f): f is { q: string; a: string } => typeof f?.q === "string" && typeof f?.a === "string")
    .map((f) => ({ q: f.q, a: f.a }));
}

/**
 * Alle tekst waar de controle op harde beweringen en verboden woorden overheen
 * loopt (besluit B19): de hoofdtekst, de metabeschrijving en de FAQ-antwoorden.
 * De FAQ-vragen zelf tellen niet mee: die beweren niets over het bedrijf.
 */
export function volledigeControletekst(tekst: string, metaBeschrijving: string | null, faqAntwoorden: readonly string[]): string {
  return [tekst, metaBeschrijving ?? "", ...faqAntwoorden].filter((t) => t.trim()).join("\n\n");
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
  /**
   * Alleen na een herschrijving. `behouden` is sinds V15 altijd "nieuw"; oudere
   * controles kunnen "vorige" dragen. `nieuw_ongedekt`: de ongedekte zinnen die
   * de herschrijving bijzette (afwezig bij oudere controles).
   */
  herschrijving?: { ongedekt_vorige: number; ongedekt_nieuw: number; behouden: "nieuw" | "vorige"; nieuw_ongedekt?: string[] };
  /** Wat de ondernemer moet nalopen voor hij goedkeurt. */
  gele_zinnen: string[];
  /**
   * V21 punt 3 (besluit B-h): harde gegevens van de huidige pagina die niet in
   * de nieuwe tekst staan. Alleen bij een verbeterpagina, en afwezig als er
   * niets ontbreekt. Houdt niets tegen.
   */
  verdwenen?: string[];
  /** De gele zinnen die de ondernemer bevestigde. */
  bevestigd: string[];
}

/** Zijn alle gele zinnen bevestigd? Onbekend (geen controle) telt als niet. */
export function allesBevestigd(c: Pick<ControleJson, "gele_zinnen" | "bevestigd"> | null): boolean {
  if (!c) return false;
  const bevestigd = new Set(c.bevestigd.map(plat));
  return c.gele_zinnen.every((z) => bevestigd.has(plat(z)));
}
