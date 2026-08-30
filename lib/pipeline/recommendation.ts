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

/**
 * Twee aanbevelingen die op dezelfde zwaarste gemiste vraag mikken, samenvoegen
 * (werkpakket B §4.2, eis 4: "overlapt niet inhoudelijk met een andere
 * aanbeveling in dit rapport").
 *
 * ── WAAROM DE ZWAARSTE DOELVRAAG DE SLEUTEL IS EN NIET DE TITEL ─────────────
 *
 * Titels vergelijken ("Wasmachine kopen" tegenover "Een wasmachine aanschaffen")
 * is een taalprobleem en geen datavraag; twee modellen die er onafhankelijk
 * naar kijken zouden het oneens kunnen zijn. `resolveTargets()` sorteert de
 * doelvragen van elke aanbeveling al op gewicht (zwaarste eerst), dus
 * `targets[0].promptId` is de vraag die de aanbeveling in de kern moet winnen.
 * Twee aanbevelingen die dezelfde zwaarste vraag als kern hebben, beantwoorden
 * per definitie hetzelfde gemis, ook als de titels verschillen. Dat is een
 * garantie in code (conventie 1): de instructie vraagt het model al om niet te
 * overlappen, maar de instructie is een intentie.
 *
 * Aanbevelingen ZONDER doelvraag (geen enkele match op een V-code) doen niet
 * mee: die kunnen niet vergeleken worden en horen niet per ongeluk samen te
 * vallen met iets willekeurigs.
 */
export function mergeOverlappingRecommendations(
  recommendations: StoredRecommendation[],
): StoredRecommendation[] {
  const zonderDoelvraag = recommendations.filter((r) => r.targets.length === 0);
  const metDoelvraag = recommendations.filter((r) => r.targets.length > 0);

  const perZwaarsteVraag = new Map<string, StoredRecommendation>();
  const volgorde: string[] = [];

  for (const rec of metDoelvraag) {
    const sleutel = rec.targets[0].promptId;
    if (!sleutel) {
      // Geen prompt-id (bv. een verwijderde prompt): niet te groeperen, blijft
      // gewoon een eigen aanbeveling.
      zonderDoelvraag.push(rec);
      continue;
    }
    const bestaand = perZwaarsteVraag.get(sleutel);
    if (!bestaand) {
      perZwaarsteVraag.set(sleutel, { ...rec });
      volgorde.push(sleutel);
      continue;
    }
    // De belangrijkste (laagste priority-getal) blijft de hoofdaanbeveling; de
    // andere levert alleen zijn extra doelvragen in, niet zijn titel of tekst.
    const winnaar = rec.priority < bestaand.priority ? rec : bestaand;
    const verliezer = winnaar === rec ? bestaand : rec;
    const samengevoegdeTargets = [...winnaar.targets];
    for (const t of verliezer.targets) {
      if (!samengevoegdeTargets.some((x) => x.promptId === t.promptId)) {
        samengevoegdeTargets.push(t);
      }
    }
    perZwaarsteVraag.set(sleutel, {
      ...winnaar,
      targets: samengevoegdeTargets.sort((a, b) => b.weight - a.weight),
    });
  }

  return [...volgorde.map((s) => perZwaarsteVraag.get(s)!), ...zonderDoelvraag];
}

/**
 * De verhouding nieuw tegenover verbeteren, in een zin (werkpakket B §4.3).
 *
 * Geen vast percentage: de verhouding is de UITKOMST van hoeveel bestaande
 * pagina's het model al goed genoeg vond om te verbeteren in plaats van een
 * nieuwe te beginnen, en dat volgt weer uit hoe goed de site vandaag meedoet
 * in de metingen. Deze functie herhaalt alleen wat er al is besloten, in
 * gewone taal; ze beslist niets.
 */
export function describeActionRatio(recommendations: StoredRecommendation[]): string | null {
  if (recommendations.length === 0) return null;
  const nieuw = recommendations.filter((r) => r.action === "nieuw").length;
  const verbeteren = recommendations.length - nieuw;

  if (verbeteren === 0) {
    const zin = nieuw === 1 ? "De ene aanbeveling is een nieuwe pagina" : `Alle ${nieuw} aanbevelingen zijn nieuwe pagina's`;
    return (
      `${zin}: geen van de bestaande pagina's dekte een gemeten gemis al goed genoeg om te verbeteren.`
    );
  }
  if (nieuw === 0) {
    const zin =
      verbeteren === 1
        ? "De ene aanbeveling verbetert een bestaande pagina"
        : `Alle ${verbeteren} aanbevelingen verbeteren een bestaande pagina`;
    return `${zin}: de site dekt de gemeten onderwerpen al, maar nog niet overtuigend genoeg.`;
  }
  return (
    `${nieuw} van de ${recommendations.length} aanbevelingen zijn nieuwe pagina's, de andere ` +
    `${verbeteren} verbeteren een bestaande pagina die het onderwerp al gedeeltelijk dekt.`
  );
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
