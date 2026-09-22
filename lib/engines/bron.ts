/**
 * De BRON-keuze op Zichtbaarheid in AI: ChatGPT of Google AI Overview.
 *
 * ── WAAROM DIT ÉÉN KEUZEKNOP IS EN NIET TWEE KOLOMMEN ───────────────────────
 *
 * De eigenaar wil de bronnen kunnen vergelijken, en nadrukkelijk nergens anders
 * in de app een tweede cijfer zien. Een keuzeknop doet precies dat: hij wisselt
 * wélk cijfer er staat, zonder ergens een tweede getal naast te zetten dat
 * iedereen moet gaan uitleggen.
 *
 * ── WAAR DE CIJFERS VANDAAN KOMEN ───────────────────────────────────────────
 *
 * De primaire bron (ChatGPT) leest de gewone kolommen van `visibility_scores`.
 * Dat is met opzet: die kolommen ZIJN de primaire engine sinds de aggregatie
 * engine-bewust werd, dus een klant die de knop nooit aanraakt ziet exact wat
 * hij altijd zag. Elke andere bron komt uit `per_engine_json`.
 *
 * ⚠️ Die twee plekken moeten dezelfde soort cijfer geven. Vandaar dat
 * `computeAggregates()` ook het GEWOGEN cijfer per bron wegschrijft: zou daar
 * alleen het ongewogen cijfer staan, dan vergelijkt deze knop een gewogen
 * ChatGPT-cijfer met een ongewogen Google-cijfer, en is het verschil deels een
 * rekenverschil in plaats van een verschil tussen de platformen.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure functies over al opgehaalde
 * rijen, getest vanuit `scripts/test-unit.ts` en gebruikt door zowel de
 * server-pagina als de clienttabel.
 */
import { PRIMARY_ENGINE, type EngineId } from "@/lib/engines/types";
import { AI_OVERVIEW_ENGINE } from "@/lib/ai-overview/types";
import { LLM_RESPONSE_GEMINI_ENGINE } from "@/lib/llm-responses/types";

/** Eén keuze in de knop. Uitbreiden is hier één regel erbij. */
export interface Bron {
  id: string;
  /** Zoals de klant de assistent kent (schrijfstijl §11: geen "engine"). */
  label: string;
}

export const BRONNEN: Bron[] = [
  { id: PRIMARY_ENGINE, label: "ChatGPT" },
  { id: AI_OVERVIEW_ENGINE, label: "Google AI Overview" },
  { id: LLM_RESPONSE_GEMINI_ENGINE, label: "Gemini" },
];

/**
 * Een toelichting die bij een bron hoort, of `null` als er niets bijzonders
 * te zeggen valt. Verschijnt onder de bronknop zodra die bron gekozen is.
 *
 * ⚠️ Gemini krijgt hier zijn eigen zin. Gemini kent geen Nederlandse
 * zoekcontext (`web_search_country_iso_code` bestaat niet bij deze bron,
 * hoofdstuk 3.1 van docs/tasks/vier-meetbronnen-en-ai-zoekvolume.md). Een lage
 * score is dus niet uit elkaar te trekken in "niet genoemd" en "Gemini keek
 * naar een ander land". Zonder deze zin leest een lage score hier als een
 * oordeel over het merk, en dat is precies wat `merkstrategie.md` §30
 * bijhoudt als een belofte die niet klopt.
 */
export function bronToelichting(id: string): string | null {
  if (id === LLM_RESPONSE_GEMINI_ENGINE) {
    return "Gemini kan niet gericht op Nederland zoeken. Een lage score hier kan ook betekenen dat Gemini naar een ander land keek, niet dat je merk daar niet genoemd wordt.";
  }
  return null;
}

/** Zonder keuze in het adres: de bron waar de score van de klant op rust. */
export const BRONFILTER_STANDAARD: string[] = [PRIMARY_ENGINE];

/**
 * Is dit een geldige, niet-lege verzameling bronnen?
 *
 * Zelfde vangnet als `leesLabelfilter` en `leesClusterfilter`: een onbekende of
 * lege waarde in het adres valt terug op de standaard in plaats van een leeg
 * scherm te tonen. Een geknipt en geplakt adres van een collega mag nooit een
 * lege pagina opleveren. `ruw` is een kommagescheiden lijst van bron-id's
 * (`?bron=chatgpt,google_ai_overview`), zodat meerdere bronnen tegelijk te
 * kiezen zijn (23 september 2026: eerder was dit een knop met één keuze).
 */
export function leesBronfilter(ruw: string | null | undefined, beschikbaar: Bron[] = BRONNEN): string[] {
  if (!ruw) return BRONFILTER_STANDAARD;
  const geldig = ruw.split(",").filter((id) => beschikbaar.some((b) => b.id === id));
  return geldig.length > 0 ? geldig : BRONFILTER_STANDAARD;
}

/**
 * De adreswaarde voor deze bronkeuze, of `null` als het de standaardkeuze is
 * (zo blijft het adres schoon voor de meeste klanten, die nooit aan dit filter
 * komen).
 */
export function bronfilterNaarAdres(bronfilter: string[]): string | null {
  const isStandaard =
    bronfilter.length === BRONFILTER_STANDAARD.length && bronfilter.every((id) => BRONFILTER_STANDAARD.includes(id));
  return isStandaard ? null : bronfilter.join(",");
}

/** Hoe de klant deze bron genoemd ziet. */
export function bronLabel(id: string): string {
  return BRONNEN.find((b) => b.id === id)?.label ?? id;
}

/** Het stukje `per_engine_json` van één bron, zoals `computeAggregates()` het wegschrijft. */
export interface BronCijfer {
  score: number | null;
  stderr: number | null;
  weighted_score?: number | null;
  weighted_stderr?: number | null;
  judged_runs?: number | null;
  winnable_runs?: number | null;
}

/** Wat een scorerij minimaal moet hebben om er een bron uit te kunnen lezen. */
export interface ScoreRijAchtig {
  score: number;
  score_stderr: number | null;
  weighted_score: number | null;
  weighted_stderr: number | null;
  per_engine_json: unknown | null;
}

/**
 * Het cijfer van één bron uit één meetronde, of `null` als die bron in deze
 * ronde niet gemeten is.
 *
 * ⚠️ `null` en niet 0. Een ronde van vóór deze bron heeft geen
 * `per_engine_json`, en een ronde waarin Google bij geen enkele vraag een
 * overzicht toonde heeft er geen cijfer in. Allebei betekenen "niet gemeten",
 * en dat is iets anders dan "nul procent" (conventie 3).
 */
export function cijferVoorBron(rij: ScoreRijAchtig, bron: string): { score: number; stderr: number } | null {
  if (bron === PRIMARY_ENGINE) {
    // De gewone kolommen ZIJN de primaire engine. Zelfde voorrangsregel als
    // `leidend()` op het scherm: gewogen als hij er is, anders ongewogen.
    const score = rij.weighted_score ?? rij.score;
    const stderr = (rij.weighted_score != null ? rij.weighted_stderr : rij.score_stderr) ?? 0;
    return { score, stderr };
  }

  const alle = (rij.per_engine_json ?? null) as Record<string, BronCijfer> | null;
  const cijfer = alle?.[bron];
  if (!cijfer) return null;

  const score = cijfer.weighted_score ?? cijfer.score;
  if (score == null) return null;

  const stderr = (cijfer.weighted_score != null ? cijfer.weighted_stderr : cijfer.stderr) ?? 0;
  return { score, stderr };
}

/**
 * Het cijfer over meerdere gekozen bronnen samen (23 september 2026): het
 * rekenkundige gemiddelde van de bronnen die in deze ronde daadwerkelijk
 * gemeten zijn. Een bron die deze ronde niet meemat telt niet mee, conventie 3:
 * onbekend is geen nul.
 *
 * ⚠️ Dit is bewust ÉÉN gemiddeld cijfer en geen cijfer per bron naast elkaar:
 * dezelfde regel als de rest van dit bestand, nooit een tweede getal dat
 * iedereen moet gaan uitleggen. Bij precies één bron is dit gelijk aan
 * `cijferVoorBron()`.
 */
export function cijferVoorBronnen(rij: ScoreRijAchtig, bronnen: string[]): { score: number; stderr: number } | null {
  const cijfers = bronnen
    .map((bron) => cijferVoorBron(rij, bron))
    .filter((c): c is { score: number; stderr: number } => c !== null);
  if (cijfers.length === 0) return null;

  const score = cijfers.reduce((som, c) => som + c.score, 0) / cijfers.length;
  // De onzekerheid van een gemiddelde van onafhankelijke schattingen: de
  // wortel van de som van de gekwadrateerde bijdragen, gedeeld door het
  // aantal. Zelfde formule als `gewogenGemiddelde()` op dit scherm, hier met
  // gelijk gewicht per bron in plaats van per aantal metingen.
  const stderr = Math.sqrt(cijfers.reduce((som, c) => som + c.stderr ** 2, 0)) / cijfers.length;
  return { score, stderr };
}

/**
 * Valt er iets te kiezen?
 *
 * Zelfde regel als de rest van de filterbalk: een keuzemenu met één optie is
 * ruis. Zolang er nooit via een tweede bron gemeten is, hoort de knop er niet te
 * staan, en verandert dit scherm dus niets voor bestaande klanten.
 */
export function beschikbareBronnen(rijen: ScoreRijAchtig[]): Bron[] {
  const gemeten = new Set<string>([PRIMARY_ENGINE]);
  for (const rij of rijen) {
    const alle = (rij.per_engine_json ?? null) as Record<string, BronCijfer> | null;
    for (const [id, cijfer] of Object.entries(alle ?? {})) {
      if ((cijfer?.weighted_score ?? cijfer?.score) != null) gemeten.add(id);
    }
  }
  return BRONNEN.filter((b) => gemeten.has(b.id));
}

export type { EngineId };
