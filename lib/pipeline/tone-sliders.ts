/**
 * Tone-of-voice-schuiven vertalen naar prompttaal (migratie 0045).
 *
 * Vier schuiven, 1-3, naar het voorbeeld van InSpace Nova's "Voice"-stap
 * (`docs/tasks/nova-analyse.md` §3.3: formality, energy, complexity, humor).
 * Waarom niet gewoon "3" naar het model sturen: een cijfer zonder context is
 * een gok voor een taalmodel, een woord ("informeel") is een instructie. Dit is
 * conventie 1 in zuivere vorm, het cijfer is de intentie van de klant, deze
 * module is de garantie dat het model iets leesbaars krijgt.
 *
 * Bewust ZONDER `server-only`: pure vertaling, geen database, testbaar vanuit
 * scripts/test-unit.ts, zelfde patroon als question-share.ts en period-change.ts.
 */

export type ToneSliderValue = 1 | 2 | 3 | null | undefined;

export interface ToneSliders {
  formality: ToneSliderValue;
  energy: ToneSliderValue;
  complexity: ToneSliderValue;
  humor: ToneSliderValue;
}

const FORMALITY: Record<1 | 2 | 3, string> = {
  1: "informeel, je en jij, spreektaal",
  2: "gemiddeld formeel",
  3: "formeel, u en uw",
};

const ENERGY: Record<1 | 2 | 3, string> = {
  1: "rustig en ingetogen",
  2: "gebalanceerd",
  3: "energiek en gedreven",
};

const COMPLEXITY: Record<1 | 2 | 3, string> = {
  1: "eenvoudig, geen vakjargon, uitgelegd voor een leek",
  2: "toegankelijk voor een expert: vakjargon mag, licht toegelicht",
  3: "diepgaand expertniveau, vakjargon zonder uitleg",
};

const HUMOR: Record<1 | 2 | 3, string> = {
  1: "geen humor",
  2: "af en toe een lichte, subtiele knipoog",
  3: "speels, met humor",
};

/**
 * Eén regel voor de schrijfprompt, of lege string als er niets ingesteld is.
 * Legt nooit vast wat een missende slider betekent: `tone_of_voice` (vrije
 * tekst) blijft dan de enige sturing, precies zoals vóór migratie 0045.
 */
export function describeToneSliders(sliders: ToneSliders): string {
  const parts: string[] = [];
  if (sliders.formality) parts.push(FORMALITY[sliders.formality]);
  if (sliders.energy) parts.push(ENERGY[sliders.energy]);
  if (sliders.complexity) parts.push(COMPLEXITY[sliders.complexity]);
  if (sliders.humor) parts.push(HUMOR[sliders.humor]);
  if (parts.length === 0) return "";
  return parts.join(", ");
}

/** Klemt een ruwe invoerwaarde (bv. uit een formulier) naar 1, 2, 3 of null. */
export function clampToneSlider(value: unknown): 1 | 2 | 3 | null {
  // Number("") is 0, geen NaN: een lege string moet expliciet als "niets
  // ingevuld" gelden, anders wordt een leeggemaakt veld stilzwijgend slider 1.
  if (value === "" || value === null || value === undefined) return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}
