/**
 * Waar staat dit merk in de verkoopcyclus? (onboarding 3.0, deel B4)
 *
 * ── WAAROM AFGELEID EN NIET OPGESLAGEN ──────────────────────────────────────
 *
 * Alle vier de fases zijn af te leiden uit gegevens die er al liggen: staat er
 * nog onderzoek open, is het gesprek vastgelegd, is het merk overgedragen. Een
 * kolom die je met de hand bijhoudt loopt achter op de werkelijkheid, en dan
 * kijk je in een beheerscherm naar een status die niet meer klopt. Nul migraties
 * dus.
 *
 * ── WAAROM DIT ERTOE DOET ───────────────────────────────────────────────────
 *
 * `/beheer` sorteert vandaag op achterstand: hoeveel pagina's staan er te lang
 * op goedkeuring te wachten. Dat is de vraag van ná de verkoop. De vraag ervóór,
 * "welk merk kan ik nu demonstreren en welk merk wacht op een gesprek", was
 * nergens te zien, terwijl het product sales-led is en dát het werk van de dag
 * bepaalt.
 *
 * Puur, dus testbaar zonder database (conventie 2).
 *
 * ⚠️ AFWIJKING VAN HET PLAN, EN WAAROM. Deel B4 leidt "overgedragen" af uit
 * `account_id` én `assigned_at`. `account_id` is sinds migratie 0046 al bij het
 * AANMAKEN gevuld (`defaultAccountFor()`, anders vindt het contentplan geen
 * pakket), dus dat veld staat altijd, ook bij een merk waar nog nooit iemand
 * mee gesproken is. De overdracht zit in `assigned_at`, dat alleen door de
 * toewijsroute gezet wordt. Die is hier dus leidend.
 */

export type ProfileStage =
  | "voorbereiden"
  | "klaar_voor_gesprek"
  | "gesprek_gehad"
  | "overgedragen";

export interface StageInput {
  /** Openstaande onderzoekstaken van dit merk (queued of running). */
  openResearchJobs: number;
  /** Staat het profielonderzoek zelf op klaar? */
  researchDone: boolean;
  /** `profile_strategy.recorded_at`. Gevuld = het gesprek is vastgelegd. */
  recordedAt: string | null;
  /** `profiles.assigned_at`. Gevuld = het merk is aan de klant overgedragen. */
  assignedAt: string | null;
}

/**
 * De fase, in deze volgorde beoordeeld.
 *
 * ⚠️ De overdracht wint van alles, en het gesprek van het onderzoek. Dat is niet
 * willekeurig:
 *
 *   • Een merk kan overgedragen zijn zonder dat er ooit een gesprek is
 *     vastgelegd (de consultant vergat het, of de klant tekende na één mail).
 *     Dan is "wacht op een gesprek" onzin: hij werkt er al zelf in.
 *   • Ná het gesprek plant het afrondblok nieuw onderzoek in (fase 4). Er staat
 *     dan werk open terwijl het gesprek al geweest is, en dan is "voorbereiden"
 *     precies het verkeerde signaal.
 */
export function profileStage(input: StageInput): ProfileStage {
  if (input.assignedAt) return "overgedragen";
  if (input.recordedAt) return "gesprek_gehad";
  if (input.openResearchJobs > 0 || !input.researchDone) return "voorbereiden";
  return "klaar_voor_gesprek";
}

/** Wat er op het scherm staat. Kort, want het is een kolom. */
export const STAGE_LABEL: Record<ProfileStage, string> = {
  voorbereiden: "Voorbereiden",
  klaar_voor_gesprek: "Klaar voor het gesprek",
  gesprek_gehad: "Gesprek gehad",
  overgedragen: "Overgedragen",
};

/**
 * Wat jij eraan hebt, in gewone taal.
 *
 * Elke fase noemt de eerstvolgende handeling en niet de toestand. "Onderzoek
 * loopt" is een mededeling; "laat draaien, er is nu niets te doen" is een
 * antwoord op de vraag waarmee je het scherm opent.
 */
export const STAGE_NEXT: Record<ProfileStage, string> = {
  voorbereiden: "ORBIT ENGINE is nog bezig. Er is nu niets te doen.",
  klaar_voor_gesprek: "Dit merk kun je nu demonstreren.",
  gesprek_gehad: "Besproken. Klaar om over te dragen aan de klant.",
  overgedragen: "De klant werkt er zelf in.",
};

/** De volgorde waarin de fases in een filter of legenda staan. */
export const STAGE_ORDER: ProfileStage[] = [
  "voorbereiden",
  "klaar_voor_gesprek",
  "gesprek_gehad",
  "overgedragen",
];
