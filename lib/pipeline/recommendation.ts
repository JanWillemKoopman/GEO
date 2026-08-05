/**
 * De aanbeveling zoals hij in `reports.recommendations_json` staat
 * (optimalisatie.md 4.1).
 *
 * Dit is bewust een eigen type en niet het Zod-schema uit `schemas/report.ts`.
 * Het model geeft vraagCODES terug (V1, V2, …); vóór opslag lossen we die op
 * naar echte `prompt_id`/`tracking_run_id`-verwijzingen. Wat er in de database
 * belandt is dus rijker dan wat het model teruggaf, en het rapportscherm, de
 * generatieroute en de schrijfpijplijn lezen allemaal dezelfde vorm, zodat die
 * drie niet uit elkaar kunnen lopen.
 *
 * Bewust ZONDER `server-only`: het rapportscherm is een client-boundary en moet
 * dit type ook kunnen gebruiken.
 */
import type { ContentAction, ContentType } from "@/lib/types/database";

/** Eén gemiste vraag die deze pagina moet gaan winnen. */
export interface RecommendationTarget {
  promptId: string | null;
  /** De meting die aantoont dát de vraag gemist werd, het bewijs. */
  runId: string | null;
  text: string;
  cluster: string | null;
  weight: number;
}

export interface StoredRecommendation {
  title: string;
  type: ContentType;
  targetIntent: string;
  why: string;
  priority: number;
  action: ContentAction;
  existingUrl: string | null;
  /**
   * Opgelost uit de vraagcodes. Leeg betekent dat het model geen enkele vraag
   * aanwees of alleen onbekende codes noemde. Dan valt de schrijver terug op
   * het oude gedrag (thematische inspiratie), wat minder goed is maar niet stuk.
   */
  targets: RecommendationTarget[];
}

/** Wat het model teruggaf: vraagCODES in plaats van verwijzingen. */
export interface RawRecommendation {
  title: string;
  type: ContentType;
  targetIntent: string;
  why: string;
  priority: number;
  action: ContentAction;
  existingUrl: string | null;
  targetQuestionIds: string[];
}

/** Een gemiste vraag met de code waarmee het rapport hem kan aanwijzen. */
export interface CodedMissedPrompt {
  code: string;
  promptId: string | null;
  runId: string;
  text: string;
  cluster: string | null;
  weight: number;
}

/**
 * Zet de vraagcodes van het model om in echte verwijzingen (optimalisatie.md 4.1).
 *
 * Onbekende codes worden stil weggegooid, een model dat "V23" verzint terwijl
 * er twaalf gemiste vragen zijn, mag geen kapotte koppeling opleveren. Wijst een
 * aanbeveling nergens naar, dan blijft `targets` leeg en valt de schrijver terug
 * op het oude gedrag: minder goed, maar niet stuk.
 */
export function resolveTargets(
  recommendations: RawRecommendation[],
  missed: CodedMissedPrompt[],
): StoredRecommendation[] {
  const byCode = new Map(missed.map((m) => [m.code.trim().toUpperCase(), m]));

  return recommendations.map((r) => {
    const targets: RecommendationTarget[] = [];
    const seen = new Set<string>();

    for (const raw of r.targetQuestionIds ?? []) {
      const code = String(raw).trim().toUpperCase();
      const hit = byCode.get(code);
      if (!hit || seen.has(code)) continue;
      seen.add(code);
      targets.push({
        promptId: hit.promptId,
        runId: hit.runId,
        text: hit.text,
        cluster: hit.cluster,
        weight: hit.weight,
      });
    }

    return {
      title: r.title,
      type: r.type,
      targetIntent: r.targetIntent,
      why: r.why,
      priority: r.priority,
      action: r.action,
      existingUrl: r.existingUrl,
      // Zwaarste vraag eerst: die bepaalt waar de pagina over moet gaan.
      targets: targets.sort((a, b) => b.weight - a.weight),
    };
  });
}

/** Leest de opgeslagen aanbevelingen defensief: oude rapporten missen `targets`. */
export function readRecommendations(value: unknown): StoredRecommendation[] {
  if (!Array.isArray(value)) return [];
  return value.map((r) => {
    const rec = (r ?? {}) as Partial<StoredRecommendation>;
    return {
      title: rec.title ?? "",
      type: (rec.type ?? "article") as ContentType,
      targetIntent: rec.targetIntent ?? "",
      why: rec.why ?? "",
      priority: typeof rec.priority === "number" ? rec.priority : 99,
      action: (rec.action ?? "nieuw") as ContentAction,
      existingUrl: rec.existingUrl ?? null,
      targets: Array.isArray(rec.targets) ? rec.targets : [],
    };
  });
}
