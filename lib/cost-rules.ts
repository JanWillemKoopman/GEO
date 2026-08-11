/**
 * Welke handelingen geld kosten, en wat de klant leest als hij ze niet mag.
 *
 * ── WAAROM DIT LOS STAAT VAN `cost-guard.ts` ────────────────────────────────
 *
 * Conventie 2: alles wat de uitkomst bepaalt hoort in een pure, importeerbare
 * module zonder `server-only`, anders is het niet te testen vanuit
 * `scripts/test-unit.ts`. De vraag "wie mag dit" is serverwerk en staat in
 * `lib/cost-guard.ts`; de lijst handelingen en hun meldingen is data en staat
 * hier.
 */

/** Elke handeling die een betaalde AI-aanroep in gang zet. */
export type CostlyAction =
  | "merk_onderzoeken"
  | "analyse_starten"
  | "meting_starten"
  | "content_schrijven"
  | "plan_goedkeuren";

/**
 * De melding die de klant ziet als hij het tóch probeert.
 *
 * Per handeling een eigen zin (K2 uit `docs/tasks/lanceerplan.md`: elke
 * foutmelding is specifiek). "Geen toegang" zou hier het verkeerde beeld geven:
 * hij mág het zien, het is geen fout van hem, en het is simpelweg werk dat de
 * consultant in gang zet. Elke zin zegt daarom wát er gebeurt en bij wie hij
 * moet zijn, en geen enkele klinkt als een deur die dichtslaat.
 */
export const COST_DENIED: Record<CostlyAction, string> = {
  merk_onderzoeken:
    "Een nieuw merk onderzoeken doet je consultant voor je. Neem contact op, dan zetten we het klaar.",
  analyse_starten:
    "Een nieuw onderwerp meten doet je consultant voor je. Laat weten welk onderwerp je erbij wilt, dan starten we het.",
  meting_starten:
    "De meting wordt door je consultant gestart. Zo weet je zeker dat hij op het juiste moment draait.",
  content_schrijven:
    "Het schrijven wordt door je consultant in gang gezet. Jij bepaalt wél wat er geschreven wordt: keur de maand goed en de rest gaat vanzelf.",
  plan_goedkeuren:
    "Deze maand goedkeuren doet je consultant samen met jou. Laat weten dat je akkoord bent.",
};
