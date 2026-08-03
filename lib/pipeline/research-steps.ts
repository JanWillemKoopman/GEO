/**
 * De onderzoeksfases als leesbare stappen (docs/tasks/onboarding-2.0.md §8).
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De onboarding duurt ~7 minuten en toonde een spinner. Erger nog: het profiel
 * gaat al op `klaar` na de tweede van zes taken (`prepare-profile.ts` zet die
 * status), dus de klant belandt op de profielpagina terwijl de aanbodboom, de
 * topics en de kennistest nog draaien — en ziet daar lege kaarten zonder uitleg.
 *
 * Zeven minuten naar een draaiend wieltje kijken is lang. Zeven minuten zien
 * binnenkomen wát er gevonden wordt, is een demo op zich: "31 pagina's
 * gevonden", "12 diensten in kaart", "ChatGPT kent je merk niet". Dat is precies
 * het gesprek dat de consultant wil voeren.
 *
 * Puur, dus testbaar (conventie 2). Invoer: welke taken staan open en welke
 * facetten zijn al opgeslagen. Uitvoer: een rijtje stappen met een stand.
 */
import type { JobType } from "@/lib/jobs/types";

export type StepState = "klaar" | "bezig" | "wacht" | "overgeslagen";

export interface ResearchStep {
  /** De taaksoort waar deze stap aan hangt. */
  job: JobType;
  label: string;
  state: StepState;
  /** Wat er gevonden is. Alleen bij `klaar`, en alleen als er iets te melden is. */
  result: string | null;
}

/** De keten, in de volgorde waarin hij draait. */
const STEPS: { job: JobType; label: string; facet: string | null }[] = [
  { job: "profile_discover", label: "De website uitlezen", facet: "techniek" },
  { job: "profile_research", label: "Merk en markt onderzoeken", facet: null },
  {
    job: "profile_offering",
    label: "Diensten en producten in kaart brengen",
    facet: "aanbod",
  },
  { job: "technical_audit", label: "Technische controle", facet: null },
  { job: "propose_topics", label: "Onderwerpen voorstellen", facet: null },
  {
    job: "profile_llm_baseline",
    label: "Testen wat AI-assistenten al weten",
    facet: "llm_kennis",
  },
];

export interface StepInput {
  /** Openstaand werk per taaksoort (uit `profileProgress`). */
  pendingByType: Partial<Record<JobType, number>>;
  /** Samenvatting per facet, uit `profile_facets.summary`. */
  facetSummaries: Record<string, string | null>;
  /** Losse tellingen die geen eigen facet hebben. */
  counts: { topics: number; auditChecks: number; researchDone: boolean };
}

/**
 * Bepaalt per stap de stand.
 *
 * De regel: staat er werk open van deze soort, dan is hij bezig. Staat er werk
 * open van een EERDERE soort, dan wacht hij. Anders is hij geweest — en of daar
 * iets uitkwam, blijkt uit het resultaat.
 *
 * Dat laatste onderscheid is bewust: een stap die draaide maar niets vond
 * (`overgeslagen`) moet er anders uitzien dan een stap die iets vond. Anders
 * leest "0 diensten gevonden" als een geslaagde stap, en dat is precies het
 * stille degraderen waar dit project vangnetten tegen bouwt.
 */
export function buildSteps(input: StepInput): ResearchStep[] {
  const { pendingByType, facetSummaries, counts } = input;

  let eersteOpenstaande = -1;
  STEPS.forEach((s, i) => {
    if (eersteOpenstaande === -1 && (pendingByType[s.job] ?? 0) > 0)
      eersteOpenstaande = i;
  });

  return STEPS.map((s, i) => {
    const openstaand = (pendingByType[s.job] ?? 0) > 0;
    const result = resultFor(s.job, s.facet, facetSummaries, counts);

    let state: StepState;
    if (openstaand) {
      state = "bezig";
    } else if (eersteOpenstaande !== -1 && i > eersteOpenstaande) {
      state = "wacht";
    } else {
      state = result === null ? "overgeslagen" : "klaar";
    }

    return { job: s.job, label: s.label, state, result };
  });
}

function resultFor(
  job: JobType,
  facet: string | null,
  facetSummaries: Record<string, string | null>,
  counts: StepInput["counts"],
): string | null {
  if (facet) return facetSummaries[facet]?.trim() || null;
  if (job === "profile_research")
    return counts.researchDone ? "Merkprofiel opgebouwd." : null;
  if (job === "technical_audit") {
    return counts.auditChecks > 0
      ? `${counts.auditChecks} controlepunten nagelopen.`
      : null;
  }
  if (job === "propose_topics") {
    return counts.topics > 0
      ? `${counts.topics} onderwerpen voorgesteld.`
      : null;
  }
  return null;
}

/** Draait er nog iets van de onderzoeksketen? */
export function researchRunning(steps: ResearchStep[]): boolean {
  return steps.some((s) => s.state === "bezig" || s.state === "wacht");
}
