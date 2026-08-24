/**
 * De soort werk: het etiket, de tint en de tekening.
 *
 * ── WAAROM DIT LOS STAAT VAN `lib/work.ts` ──────────────────────────────────
 *
 * `lib/work.ts` haalt werk uit vijf tabellen op en begint daarom met
 * `import "server-only"`. Alles wat daarin staat is onbereikbaar voor
 * `scripts/test-unit.ts`, en dat gold ook voor de twee beslissingen die niets
 * met de database te maken hebben: welke tint krijgt de chip, en welke tekening
 * staat ervoor. Conventie 2: wat de uitkomst bepaalt hoort in een pure,
 * importeerbare module, anders is het niet te testen.
 *
 * `lib/work.ts` exporteert alles hieronder onveranderd door, dus voor de rest
 * van de app verandert er niets aan waar je het vandaan haalt.
 */
import type { IcoonNaam } from "@/lib/icons";

/** Wat voor werk het is. Bepaalt het etiket, niet de plek in de lijst. */
export type WorkKind =
  | "blokkade" // technische blokkade, hierdoor werkt al het andere niet
  | "goedkeuring" // het concept bevestigen, daarna start de meting
  | "herstel" // er ging iets mis in de pijplijn
  | "feit" // een feitenvraag over het bedrijf
  | "pagina" // een aanbevolen of geschreven pagina voor de eigen site
  | "offsite"; // een actie buiten de eigen site

export const WORK_KIND_LABEL: Record<WorkKind, string> = {
  blokkade: "Blokkade",
  goedkeuring: "Goedkeuring",
  herstel: "Herstel",
  feit: "Feitenvraag",
  pagina: "Pagina",
  offsite: "Buiten je site",
};

/**
 * De tint van de chip achter een werkregel.
 *
 * ── WAAROM DIT NIET ÉÉN KLEUR MAG ZIJN ──────────────────────────────────────
 *
 * Op het overzicht kregen alle vijf de werksoorten dezelfde amber chip. "Bekijk
 * wat er mis is" (een cluster dat niet gelukt is) zag er daardoor precies zo uit
 * als "Beantwoorden" (zes vragen over je bedrijf). Dat is de ene regel uit
 * `docs/ux-design.md` §2 die het duidelijkst is: `--intent-attention` is "vraagt
 * een keuze, is niet fout", `--intent-danger` is "blokkade, mislukt". Een
 * storing die eruitziet als een routineklus blijft liggen.
 *
 * Geen veld op `WorkItem`, want de soort zegt het al. Een tweede plek waar
 * hetzelfde besluit valt, loopt vroeg of laat uit de pas.
 */
export function workChipTone(kind: WorkKind): "danger" | "attention" {
  return kind === "blokkade" || kind === "herstel" ? "danger" : "attention";
}

/**
 * Het icoon voor een werkregel.
 *
 * ── WAAROM DIT DE CHIP NIET VERDUBBELT ──────────────────────────────────────
 *
 * De chip rechts zegt wat je gaat DOEN ("Beantwoorden", "Nakijken"), het icoon
 * links zegt waar het OVER gaat (een feitenvraag, een pagina, een blokkade).
 * Dat zijn twee verschillende dingen, en op het overzicht van Gasservice
 * Brabant stond de tweede nergens: vijf regels met dezelfde vorm, waarvan je
 * pas na het lezen van de titel wist of het om je website ging of om een vraag
 * over je bedrijf.
 *
 * ⚠️ Eén soort leent bewust de tekening van een ander: `blokkade` krijgt
 * `letop`, want een blokkade is de enige werksoort waarbij niets anders zin
 * heeft, en dat is precies wat een waarschuwingsdriehoek zegt. Komt er ooit een
 * derde soort bij die ook leent, dan onderscheidt het icoon niets meer; een
 * test in `scripts/test-unit.ts` bewaakt die grens.
 */
export function workKindIcon(kind: WorkKind): IcoonNaam {
  return WORK_KIND_ICON[kind];
}

const WORK_KIND_ICON: Record<WorkKind, IcoonNaam> = {
  blokkade: "letop",
  goedkeuring: "goedkeuring",
  herstel: "herstel",
  feit: "feit",
  pagina: "paginabijwerken",
  offsite: "offsite",
};
