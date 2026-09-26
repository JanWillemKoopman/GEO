/**
 * DE VOLGORDE VAN KANSEN EN DE ZIN DIE ZE ONDERBOUWT (N1 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`, §6.2).
 *
 * Een kans is één te nemen actie op een klantbehoefte, met bewijs per bron
 * (tabellen `kansen` en `kans_bewijs`, migratie 0118). Deze module zegt welke
 * kans eerst komt en waarom, in code en nooit door een model (§4, P4): een
 * volgorde die een model bepaalt, is bij elke meting anders en niet uit te
 * leggen aan de klant die vraagt waarom pagina drie eerst ging.
 *
 * Puur, zonder `server-only` (conventie 2): testbaar vanuit `scripts/test-unit.ts`.
 *
 * ── DE VOLGORDE, EN WAAROM IN LAGEN EN NIET ALS ÉÉN SCORE ───────────────────
 *
 * Vier lagen, elk alleen beslissend als de vorige gelijk is:
 *   1. Commerciële waarde: voorrang, dan gewoon (of onbekend), dan minder.
 *   2. Hoeveel bronnen de kans steunen.
 *   3. De potentiescore (0 tot 100), onbekend achteraan.
 *   4. Het kennisgat: minder ontbrekende kennis eerst, onbekend achteraan.
 *
 * Een gewogen som (bijvoorbeeld 0,4 × waarde + 0,3 × potentie) is niet uit te
 * leggen zonder de gewichten te noemen, en gewichten zijn een gok zolang er geen
 * enkele gepubliceerde pagina is om ze aan te toetsen (nul op 26 september 2026,
 * §2). Lagen zijn in één zin te zeggen: "eerst de diensten waar je voorrang aan
 * geeft". Leren welke laag zwaarder moet wegen, is L2.
 *
 * Waarom commercieel eerst: een kans op een dienst die de ondernemer niet wil
 * verkopen, levert zichtbaarheid op die niets oplevert (P7). Waarom onbekend als
 * gewoon telt en niet als minder: onbekend is geen oordeel (conventie 3), en
 * "minder" is een uitspraak van de klant die we niet voor hem doen.
 *
 * Waarom het kennisgat als laatste en "minder ontbrekend eerst": bij gelijk bewijs
 * gaat de kans voor waarvan we al weten wat erop moet, want die kan zonder extra
 * vragen aan de klant geschreven worden. Het kennisgat zelf rekent N6 uit.
 *
 * ── WANNEER EEN BRON EEN KANS STEUNT ────────────────────────────────────────
 *
 * - ChatGPT en Gemini: bij minstens één gemeten vraag wordt het merk niet genoemd.
 * - AI Overview: idem, of Google citeert de eigen site niet.
 * - Search Console: er zijn vertoningen, dus mensen zoeken hiernaar.
 * - Structuur: een dienst zonder pagina. Het bestaan van de rij is het bewijs.
 * - Consultant: een mens zette hem erbij. Dat is een oordeel, en dat telt.
 *
 * Een bron zonder gegevens steunt niet en spreekt niet tegen: hij heet "geen
 * gegevens" (P7), nooit nul.
 */
import { formatNumber } from "@/lib/format";

export const KANS_BRONNEN = ["consultant", "chatgpt", "ai_overview", "gemini", "search_console", "structuur"] as const;
export type KansBron = (typeof KANS_BRONNEN)[number];

export const KANS_HANDELINGEN = ["nieuwe_pagina", "pagina_verbeteren"] as const;
export type KansHandeling = (typeof KANS_HANDELINGEN)[number];

export const KANS_STATUSSEN = [
  "open",
  "ingepland",
  "in_voorbereiding",
  "geschreven",
  "gepubliceerd",
  "vervallen",
  "te_herzien",
] as const;
export type KansStatus = (typeof KANS_STATUSSEN)[number];

export const COMMERCIELE_WAARDEN = ["voorrang", "gewoon", "minder"] as const;
export type CommercieleWaarde = (typeof COMMERCIELE_WAARDEN)[number];

/** Het bewijs van één bron, zoals in `kans_bewijs`. Leeg is geen gegevens. */
export interface KansBewijs {
  bron: KansBron;
  vragenGemeten?: number | null;
  vragenGenoemd?: number | null;
  concurrenten?: readonly string[] | null;
  eigenSiteGeciteerd?: boolean | null;
  vertoningen?: number | null;
  klikken?: number | null;
  positie?: number | null;
  periodeDagen?: number | null;
  toelichting?: string | null;
}

/** Wat de volgorde en de uitleg van een kans nodig hebben. */
export interface KansInvoer {
  id: string;
  titel: string;
  handeling: KansHandeling;
  commercieleWaarde: CommercieleWaarde | null;
  /** 0 tot 100, `null` = niet berekend. */
  potentie: number | null;
  bewijs: readonly KansBewijs[];
  /** `null` = het kennisgat is nog niet uitgerekend (N6); leeg = er ontbreekt niets. */
  kennisOntbreekt: readonly string[] | null;
}

export type Steun = "steunt" | "steunt_niet" | "geen_gegevens";

const AI_BRONNEN: readonly KansBron[] = ["chatgpt", "ai_overview", "gemini"];

const NAAM: Record<KansBron, string> = {
  consultant: "je consultant",
  chatgpt: "ChatGPT",
  ai_overview: "Google AI Overview",
  gemini: "Gemini",
  search_console: "Google Search Console",
  structuur: "de opbouw van je site",
};

function getal(n: number | null | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Steunt deze bron de kans, niet, of weten we het niet? */
export function steunVan(b: KansBewijs): Steun {
  if (b.bron === "consultant" || b.bron === "structuur") return "steunt";
  if (b.bron === "search_console") {
    const v = getal(b.vertoningen);
    if (v === null) return "geen_gegevens";
    return v > 0 ? "steunt" : "steunt_niet";
  }
  const gemeten = getal(b.vragenGemeten);
  const genoemd = getal(b.vragenGenoemd);
  const gemist = gemeten !== null && gemeten > 0 && genoemd !== null ? genoemd < gemeten : null;
  const nietGeciteerd = b.bron === "ai_overview" && b.eigenSiteGeciteerd === false;
  if (gemist === true || nietGeciteerd) return "steunt";
  if (gemist === false) return "steunt_niet";
  // Alleen de citatie bekend, en die is er: dat spreekt de kans tegen.
  if (b.bron === "ai_overview" && b.eigenSiteGeciteerd === true) return "steunt_niet";
  return "geen_gegevens";
}

/** De bronnen van een kans, elk één keer, in vaste volgorde. Vervangt een kolom `bronnen` (die zou kunnen afwijken). */
export function bronnenVan(bewijs: readonly KansBewijs[]): KansBron[] {
  const aanwezig = new Set(bewijs.map((b) => b.bron));
  return KANS_BRONNEN.filter((b) => aanwezig.has(b));
}

/** Hoeveel verschillende bronnen de kans steunen. */
export function bewijsSterkte(bewijs: readonly KansBewijs[]): number {
  return new Set(bewijs.filter((b) => steunVan(b) === "steunt").map((b) => b.bron)).size;
}

const WAARDE_RANG: Record<CommercieleWaarde, number> = { voorrang: 0, gewoon: 1, minder: 2 };

function waardeRang(w: CommercieleWaarde | null): number {
  return w === null ? WAARDE_RANG.gewoon : WAARDE_RANG[w];
}

/** Negatief als `a` voor `b` komt. Deterministisch: bij volledige gelijkheid beslissen titel en id. */
export function vergelijkKansen(a: KansInvoer, b: KansInvoer): number {
  const waarde = waardeRang(a.commercieleWaarde) - waardeRang(b.commercieleWaarde);
  if (waarde !== 0) return waarde;

  const sterkte = bewijsSterkte(b.bewijs) - bewijsSterkte(a.bewijs);
  if (sterkte !== 0) return sterkte;

  const pa = getal(a.potentie);
  const pb = getal(b.potentie);
  if (pa !== pb) {
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pb - pa;
  }

  const ga = a.kennisOntbreekt?.length ?? null;
  const gb = b.kennisOntbreekt?.length ?? null;
  if (ga !== gb) {
    if (ga === null) return 1;
    if (gb === null) return -1;
    return ga - gb;
  }

  return a.titel.localeCompare(b.titel, "nl") || a.id.localeCompare(b.id);
}

/** De kansen op volgorde. Geeft een nieuwe lijst; de invoer blijft zoals hij was. */
export function ordenKansen<T extends KansInvoer>(kansen: readonly T[]): T[] {
  return [...kansen].sort(vergelijkKansen);
}

// ── De uitleg ────────────────────────────────────────────────────────────────

const TELWOORD = ["nul", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien", "elf", "twaalf"];

function telwoord(n: number): string {
  return n >= 0 && n < TELWOORD.length ? TELWOORD[n]! : formatNumber(n);
}

function hoofdletter(zin: string): string {
  return zin.charAt(0).toUpperCase() + zin.slice(1);
}

function opsomming(delen: readonly string[]): string {
  if (delen.length <= 1) return delen.join("");
  return `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;
}

/** "ChatGPT noemt je bij 0 van de 4 vragen en noemt twee concurrenten wel", of null zonder gegevens. */
function aiDeel(b: KansBewijs): string | null {
  const naam = NAAM[b.bron];
  const gemeten = getal(b.vragenGemeten);
  const genoemd = getal(b.vragenGenoemd);
  const delen: string[] = [];

  if (gemeten !== null && gemeten > 0 && genoemd !== null) {
    if (gemeten === 1) {
      delen.push(genoemd === 0 ? `${naam} noemt je niet bij de enige gemeten vraag` : `${naam} noemt je al bij de enige gemeten vraag`);
    } else {
      delen.push(`${naam} noemt je ${genoemd === gemeten ? "al " : ""}bij ${genoemd} van de ${gemeten} vragen`);
    }
    const concurrenten = (b.concurrenten ?? []).filter((c) => c.trim() !== "");
    if (genoemd < gemeten && concurrenten.length > 0) {
      delen.push(`noemt ${telwoord(concurrenten.length)} ${concurrenten.length === 1 ? "concurrent" : "concurrenten"} wel`);
    }
  }
  if (b.bron === "ai_overview" && typeof b.eigenSiteGeciteerd === "boolean") {
    const citaat = b.eigenSiteGeciteerd ? "citeert je site wel" : "citeert je site niet";
    delen.push(delen.length === 0 ? `${naam} ${citaat}` : citaat);
  }
  return delen.length > 0 ? delen.join(" en ") : null;
}

/** "Mensen zoeken hiernaar (240 vertoningen in Google in 28 dagen)", of null zonder gegevens. */
function zoekDeel(b: KansBewijs): { tekst: string; steunt: boolean } | null {
  const v = getal(b.vertoningen);
  if (v === null) return null;
  const dagen = getal(b.periodeDagen);
  const periode = dagen !== null ? ` in ${formatNumber(dagen)} ${dagen === 1 ? "dag" : "dagen"}` : "";
  if (v === 0) return { tekst: `In Google zien we hier nog geen zoekverkeer (0 vertoningen${periode})`, steunt: false };
  return {
    tekst: `Mensen zoeken hiernaar (${formatNumber(v)} ${v === 1 ? "vertoning" : "vertoningen"} in Google${periode})`,
    steunt: true,
  };
}

function metPunt(tekst: string): string {
  const t = tekst.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/**
 * De zin die de kans onderbouwt, in gewone taal en alleen uit het bewijs.
 *
 * Voorbeeld uit §8 van het plan: *"Mensen zoeken hiernaar (240 vertoningen in
 * Google in 28 dagen), maar ChatGPT noemt je bij 0 van de 4 vragen en noemt twee
 * concurrenten wel. Je huidige pagina gaat er deels over."*
 *
 * Elke bron zonder gegevens wordt bij naam genoemd als "geen gegevens", zodat
 * een lege meting nooit leest als een slechte (P7).
 */
export function uitlegVan(kans: Pick<KansInvoer, "handeling" | "bewijs">): string {
  const perBron = new Map<KansBron, KansBewijs>();
  for (const b of kans.bewijs) if (!perBron.has(b.bron)) perBron.set(b.bron, b);

  const zinnen: string[] = [];
  const zonderGegevens: KansBron[] = [];

  const zoek = perBron.get("search_console");
  const zoekTekst = zoek ? zoekDeel(zoek) : null;
  if (zoek && !zoekTekst) zonderGegevens.push("search_console");

  const aiZinnen: { tekst: string; steunt: boolean }[] = [];
  for (const bron of AI_BRONNEN) {
    const b = perBron.get(bron);
    if (!b) continue;
    const tekst = aiDeel(b);
    if (tekst === null) zonderGegevens.push(bron);
    else aiZinnen.push({ tekst, steunt: steunVan(b) === "steunt" });
  }

  // Vraag en gemis in één zin, zoals in het voorbeeld: "..., maar ChatGPT noemt je bij 0 van de 4".
  if (zoekTekst?.steunt && aiZinnen[0]?.steunt) {
    const eerste = aiZinnen.shift()!;
    zinnen.push(`${zoekTekst.tekst}, maar ${eerste.tekst}.`);
  } else if (zoekTekst) {
    zinnen.push(`${zoekTekst.tekst}.`);
  }
  for (const z of aiZinnen) zinnen.push(`${hoofdletter(z.tekst)}.`);

  // Alleen bij een nieuwe pagina: bij verbeteren staat er per definitie al een.
  if (perBron.has("structuur") && kans.handeling === "nieuwe_pagina") {
    zinnen.push("Je biedt dit aan, maar er staat nog geen pagina over op je site.");
  }

  const consultant = perBron.get("consultant");
  if (consultant) {
    const waarom = consultant.toelichting?.trim();
    zinnen.push(waarom ? `Je consultant zette deze kans erbij: ${metPunt(waarom)}` : "Je consultant zette deze kans erbij.");
  }

  if (zonderGegevens.length > 0) {
    zinnen.push(`Van ${opsomming(zonderGegevens.map((b) => NAAM[b]))} zijn er nog geen gegevens.`);
  }
  if (kans.bewijs.length === 0) zinnen.push("Voor deze kans zijn er nog geen gegevens.");

  if (kans.handeling === "pagina_verbeteren") zinnen.push("Je huidige pagina gaat er deels over.");

  return zinnen.join(" ");
}
