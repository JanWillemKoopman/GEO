/**
 * DE ZOEKRESULTATEN VAN GOOGLE IN DE BRIEF: de regels (besluit B34 in
 * `docs/tasks/contentketen-opnieuw.md` §2).
 *
 * Voor een artikel, gids, FAQ of vergelijking (`SOORTEN` in `soorten.ts`) krijgt
 * de brief naast zijn eigen zoektocht op het web de echte resultatenpagina van
 * Google bij een handvol zoekopdrachten: de bovenste resultaten, de vragen die
 * mensen erbij stellen, de gerelateerde zoekopdrachten en het AI-overzicht. Geen
 * nieuwe stap en geen AI-aanroep: code haalt het op vóór de ene aanroep van de
 * brief, en het komt in zijn invoer als apart, gelabeld blok.
 *
 * ── DE GRENS: EXTERN BLIJFT EXTERN ──────────────────────────────────────────
 *
 * Wat Google over een bedrijf zegt, is nooit bedrijfskennis (eigenaar, 29
 * september 2026: "Bedrijf X biedt gratis installatie" mag nooit als feit over de
 * klant in een tekst komen). Drie vangnetten in code, onder de opdracht aan het
 * model (conventie 1):
 *   1. resultaten van de eigen site van de klant vallen weg, en een zin met de
 *      naam van de klant ook (`zonderEigenMerk()`): wat de klant over zichzelf
 *      zegt, hoort in de kennislaag, met herkomst;
 *   2. bekende concurrenten worden "een andere aanbieder" (`redactCompetitors`);
 *   3. niets hiervan wordt ooit in `klantkennis` geschreven (een test bewaakt
 *      dat), en de vakkennis die de brief ervan maakt gaat door hetzelfde filter
 *      als altijd (`overHetBedrijfZelf()` in `brief-regels.ts`), en telt bij de
 *      controle alleen als bron voor een zin die niet over het bedrijf gaat.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { redactCompetitors } from "@/lib/pipeline/redact";
import type { Resultatenpagina } from "@/lib/ai-overview/parse-serp";
import { normaliseerVraag } from "@/lib/pagina/brief-regels";

/**
 * Hoeveel zoekopdrachten per pagina. Acht, want een AI-overzicht met de
 * resultatenpagina kostte op productie gemiddeld $0,004 (1.732 aanroepen, 29
 * september 2026): acht kosten samen ongeveer $0,03, tegen $0,065 voor de brief
 * zelf en een grens van $0,50 per pagina (B4). De eigenaar vroeg om er ruim
 * gebruik van te maken. Ze draaien tegelijk, dus acht duren niet langer dan één.
 */
export const MAX_ZOEKOPDRACHTEN = 8;

/** Zoveel tekens per onderdeel gaan mee de brief in; genoeg voor de kern, niet voor een hele pagina. */
export const FRAGMENT_MAX = 300;
export const ANTWOORD_MAX = 500;
export const OVERZICHT_MAX = 2000;

export interface ZoekVoorPagina {
  titel: string;
  kernvraag: string | null;
  /** De doelvragen uit de meting: wat mensen AI-assistenten over dit onderwerp vragen. */
  doelvragen: readonly string[];
}

/**
 * De zoekopdrachten voor deze pagina: de titel, de kernvraag en de doelvragen,
 * zonder dubbelingen. Het AI-overzicht van Google verschijnt vooral bij een
 * vraag in gewone woorden, en precies dat zijn de doelvragen.
 */
export function zoekopdrachtenVoor(p: ZoekVoorPagina, max = MAX_ZOEKOPDRACHTEN): string[] {
  const gezien = new Set<string>();
  const uit: string[] = [];
  for (const ruw of [p.titel, p.kernvraag ?? "", ...p.doelvragen]) {
    const tekst = ruw.replace(/\s+/g, " ").trim();
    const sleutel = normaliseerVraag(tekst);
    if (!sleutel || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push(tekst);
    if (uit.length >= max) break;
  }
  return uit;
}

export interface MerkVoorZoeken {
  /** De hoofd-URL of hostnaam van de klant. */
  url: string;
  /** De naam en andere schrijfwijzen van de klant. */
  namen: readonly string[];
  /** Bekende concurrenten, die "een andere aanbieder" worden. */
  concurrenten: readonly string[];
}

function hostVan(url: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isEigenDomein(domein: string, eigen: string | null): boolean {
  const d = domein.toLowerCase().replace(/^www\./, "");
  return !!eigen && !!d && (d === eigen || d.endsWith(`.${eigen}`));
}

/**
 * Een tekst zonder de zinnen waarin de naam van de klant staat. Liever een zin
 * te veel weg dan een belofte over de klant die van een ander komt. Namen korter
 * dan vier tekens tellen niet: die zitten in te veel gewone woorden.
 */
export function zonderEigenMerk(tekst: string, namen: readonly string[]): string {
  const laag = namen.map((n) => n.trim().toLowerCase()).filter((n) => n.length >= 4);
  if (laag.length === 0) return tekst.trim();
  return tekst
    .split(/(?<=[.!?])\s+/)
    .filter((zin) => !laag.some((n) => zin.toLowerCase().includes(n)))
    .join(" ")
    .trim();
}

/** Eén resultatenpagina, schoon voor de brief. */
export function schoonResultaten(pagina: Resultatenpagina, merk: MerkVoorZoeken): Resultatenpagina {
  const eigen = hostVan(merk.url);
  const schoon = (t: string) => redactCompetitors(zonderEigenMerk(t, merk.namen), [...merk.concurrenten]).trim();
  return {
    organisch: pagina.organisch
      .filter((r) => !isEigenDomein(r.domein, eigen))
      .map((r) => ({ ...r, titel: schoon(r.titel), fragment: schoon(r.fragment) }))
      .filter((r) => r.titel),
    vragen: pagina.vragen
      .map((v) => ({
        vraag: schoon(v.vraag),
        antwoord: v.antwoord ? schoon(v.antwoord) || null : null,
        bronUrl: v.bronUrl && hostVan(v.bronUrl) && isEigenDomein(hostVan(v.bronUrl) as string, eigen) ? null : v.bronUrl,
      }))
      .filter((v) => v.vraag),
    gerelateerd: pagina.gerelateerd.map(schoon).filter(Boolean),
    aiOverzicht: pagina.aiOverzicht
      ? (() => {
          const tekst = schoon(pagina.aiOverzicht.tekst);
          const bronnen = pagina.aiOverzicht.bronnen.filter((b) => !isEigenDomein(b, eigen));
          return tekst ? { tekst, bronnen } : null;
        })()
      : null,
  };
}

export interface Zoekopdrachtuitkomst {
  zoekopdracht: string;
  status: "gelukt" | "mislukt";
  pagina: Resultatenpagina | null;
  melding: string | null;
}

/** Wat er in `content_pieces.brief_json.zoekresultaten` komt: het complete geschoonde onderzoek, voor de audit. */
export interface BriefZoekresultaten {
  opgehaaldOp: string;
  kostenUsd: number;
  zoekopdrachten: Zoekopdrachtuitkomst[];
}

function kort(tekst: string, max: number): string {
  return tekst.length > max ? `${tekst.slice(0, max).trimEnd()}...` : tekst;
}

/**
 * Het blok voor de invoer van de brief, of null als er niets bruikbaars is.
 * De uitleg staat in het blok zelf en niet in de vaste opdracht van de brief:
 * zo blijft de invoer van een dienstpagina, die geen zoekresultaten krijgt,
 * letter voor letter gelijk (B34).
 */
export function zoekresultatenBlok(z: BriefZoekresultaten | null): string | null {
  const gelukt = (z?.zoekopdrachten ?? []).filter((q) => q.status === "gelukt" && q.pagina);
  const delen: string[] = [];
  for (const q of gelukt) {
    const p = q.pagina as Resultatenpagina;
    const regels: string[] = [];
    if (p.aiOverzicht) {
      regels.push(
        `AI-overzicht van Google (bronnen: ${p.aiOverzicht.bronnen.join(", ") || "onbekend"}):\n"""${kort(p.aiOverzicht.tekst, OVERZICHT_MAX)}"""`,
      );
    }
    if (p.organisch.length > 0) {
      regels.push(
        "Bovenste resultaten:\n" +
          p.organisch.map((r) => `${r.positie}. ${r.titel} (${r.url})${r.fragment ? `\n   ${kort(r.fragment, FRAGMENT_MAX)}` : ""}`).join("\n"),
      );
    }
    if (p.vragen.length > 0) {
      regels.push(
        "Andere mensen vroegen ook:\n" +
          p.vragen
            .map((v) => `- ${v.vraag}${v.antwoord ? `\n  Antwoord bij Google${v.bronUrl ? ` (${v.bronUrl})` : ""}: ${kort(v.antwoord, ANTWOORD_MAX)}` : ""}`)
            .join("\n"),
      );
    }
    if (p.gerelateerd.length > 0) regels.push(`Gerelateerde zoekopdrachten: ${p.gerelateerd.join("; ")}`);
    if (regels.length > 0) delen.push(`Zoekopdracht: "${q.zoekopdracht}"\n${regels.join("\n")}`);
  }
  if (delen.length === 0) return null;
  return [
    "ZOEKRESULTATEN VAN GOOGLE (extern onderzoek, niet over dit bedrijf)",
    "Dit is wat Google laat zien bij zoekopdrachten over dit onderwerp. Gebruik het om te zien wat mensen willen weten, welke vragen ze stellen en wat de pagina's bovenaan behandelen. Het is extern: wat hier over een bedrijf staat, zegt niets over dit bedrijf. Neem een punt alleen als vakkennis over als je het webadres van de bron hebt; het AI-overzicht zelf is geen bron. Resultaten van de eigen site van dit bedrijf en zinnen met zijn naam zijn weggelaten.",
    ...delen,
  ].join("\n\n");
}
