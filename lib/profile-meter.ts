/**
 * De volledigheidsmeter van de onboardingsessie: drie getallen, geen percentage.
 *
 * ── WAAROM DRIE EN NIET ÉÉN ─────────────────────────────────────────────────
 *
 * "78% compleet" verbergt precies het verschil dat in een gesprek telt: hoeveel
 * er door een mens is bevestigd en hoeveel er nog een aanname van een model is.
 * Twee merken op 78% kunnen een heel ander gesprek vragen, en dat mag het getal
 * niet wegpoetsen. Vandaar bevestigd, gevonden en open naast elkaar.
 *
 * ── DE DRIE BAKKEN, EN WAAROM EEN VELD IN PRECIES ÉÉN VALT ──────────────────
 *
 *   bevestigd  een mens zette hem (`klant` of `gesprek`), OF hij staat bewust
 *              op niet van toepassing. Behandeld is behandeld.
 *   gevonden   er staat iets, maar niemand heeft het bevestigd: modeluitvoer,
 *              of een aanname van de consultant van vóór het gesprek.
 *   open       er staat niets en het is niet als n.v.t. afgedaan.
 *
 * ⚠️ Een `consultant`-waarde telt hier als GEVONDEN en niet als bevestigd. Hij
 * is door een mens getypt, maar door niemand bevestigd; dat is nu juist het
 * verschil waarvoor die vierde herkomst bestaat (migratie 0060). Zou hij als
 * bevestigd tellen, dan ziet een merk waar nog nooit iemand mee gesproken is
 * eruit als een merk dat je al hebt doorgenomen.
 *
 * Puur, dus testbaar (conventie 2).
 */
import { BRAND_FIELDS, isFilled, type BrandStep } from "@/lib/pipeline/brand-fields";
import type { FieldSource, Profile } from "@/lib/types/database";

/** Wat er per veld aan herkomst bekend is. */
export interface FieldState {
  source?: FieldSource;
  notApplicable?: boolean;
}

export interface SessionMeter {
  bevestigd: number;
  gevonden: number;
  open: number;
  totaal: number;
}

/**
 * ⚠️ De contactvelden tellen NIET mee. Ze zeggen niets over hoe goed ORBIT
 * ENGINE het merk kent, en een compleet merkdossier waar alleen het
 * telefoonnummer nog ontbreekt hoort niet als onvolledig te tonen.
 */
export const METER_STEPS: BrandStep[] = BRAND_FIELDS.map((f) => f.step).filter(
  (s, i, all) => s !== "contact" && all.indexOf(s) === i,
);

export function sessionMeter(
  profile: Partial<Profile>,
  states: Record<string, FieldState | undefined>,
  steps: BrandStep[] = METER_STEPS,
): SessionMeter {
  const velden = BRAND_FIELDS.filter((f) => steps.includes(f.step));

  let bevestigd = 0;
  let gevonden = 0;
  let open = 0;

  for (const veld of velden) {
    const stand = states[veld.key as string];
    const gevuld = isFilled(profile[veld.key]);
    const doorEenMens = stand?.source === "klant" || stand?.source === "gesprek";

    if (stand?.notApplicable || (gevuld && doorEenMens)) bevestigd++;
    else if (gevuld) gevonden++;
    else open++;
  }

  return { bevestigd, gevonden, open, totaal: velden.length };
}

/** Welke velden staan op niet van toepassing? Voor `findGaps()`. */
export function notApplicableFields(
  states: Record<string, FieldState | undefined>,
): string[] {
  return Object.entries(states)
    .filter(([, s]) => s?.notApplicable)
    .map(([field]) => field);
}
