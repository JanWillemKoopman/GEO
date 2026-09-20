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

/** Eén keuze in de knop. Uitbreiden is hier één regel erbij. */
export interface Bron {
  id: string;
  /** Zoals de klant de assistent kent (schrijfstijl §11: geen "engine"). */
  label: string;
}

export const BRONNEN: Bron[] = [
  { id: PRIMARY_ENGINE, label: "ChatGPT" },
  { id: AI_OVERVIEW_ENGINE, label: "Google AI Overview" },
];

/** Zonder keuze in het adres: de bron waar de score van de klant op rust. */
export const BRONFILTER_STANDAARD: string = PRIMARY_ENGINE;

/**
 * Is dit een geldige bron?
 *
 * Zelfde vangnet als `leesLabelfilter` en `leesClusterfilter`: een onbekende
 * waarde in het adres valt terug op de standaard in plaats van een leeg scherm
 * te tonen. Een geknipt en geplakt adres van een collega mag nooit een lege
 * pagina opleveren.
 */
export function leesBronfilter(ruw: string | null | undefined): string {
  return ruw && BRONNEN.some((b) => b.id === ruw) ? ruw : BRONFILTER_STANDAARD;
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
