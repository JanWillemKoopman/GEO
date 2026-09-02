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
import { enkelOfMeervoud } from "@/lib/format";

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
   * Een bestaande pagina die dit onderwerp AL raakt, terwijl de handeling toch
   * `nieuw` is (`existing-page-match.ts`).
   *
   * Dit is geen tweede `existingUrl`. `existingUrl` zegt "deze pagina wordt
   * vervangen"; `relatedUrl` zegt "hier staat al iets, doe het niet nog eens
   * over". Het verschil bepaalt wat de schrijver moet doen: voortbouwen tegenover
   * onderscheiden. Nagerekend op productie op 1 september 2026 wees het
   * rapportmodel 13 keer zo'n pagina aan zonder dat iets in de keten hem las.
   *
   * `null` bij `verbeteren`: dan is de bestaande pagina de pagina zelf.
   */
  relatedUrl: string | null;
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
      // Wordt door `reconcileRecommendations()` gevuld, ná deze stap: het model
      // levert hem niet, hij komt uit de vergelijking met de inventaris.
      relatedUrl: null,
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
 * Getallen tot en met twaalf voluit, zoals `docs/schrijfstijl.md` voorschrijft
 * voor lopende tekst ("Eén van de zes" leest beter dan "1 van de 6").
 * Cijfers erboven blijven cijfers: niemand schrijft "zeventien" in een zin.
 */
const TELWOORDEN = [
  "nul", "één", "twee", "drie", "vier", "vijf", "zes",
  "zeven", "acht", "negen", "tien", "elf", "twaalf",
] as const;

function telwoord(n: number): string {
  return n >= 0 && n < TELWOORDEN.length ? TELWOORDEN[n] : String(n);
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
    const onderwerp = nieuw === 1 ? "De ene aanbeveling" : `Alle ${telwoord(nieuw)} aanbevelingen`;
    const werkwoord = enkelOfMeervoud(nieuw, "is een nieuwe pagina", "zijn nieuwe pagina's");
    return `${onderwerp} ${werkwoord}: geen van de bestaande pagina's dekte een gemeten gemis al goed genoeg om te verbeteren.`;
  }
  if (nieuw === 0) {
    const onderwerp = verbeteren === 1 ? "De ene aanbeveling" : `Alle ${telwoord(verbeteren)} aanbevelingen`;
    const werkwoord = enkelOfMeervoud(verbeteren, "verbetert", "verbeteren");
    return `${onderwerp} ${werkwoord} een bestaande pagina: de site dekt de gemeten onderwerpen al, maar nog niet overtuigend genoeg.`;
  }

  // Het gemengde geval: allebei minstens één. Precies hier zat de fout, want
  // "1 van de 6" is bij nul en veel altijd het begin van een correcte zin,
  // maar bij precies één aan een van beide kanten niet.
  const nieuwOnderwerp = nieuw === 1 ? "Eén" : telwoord(nieuw);
  const nieuwWerkwoord = enkelOfMeervoud(nieuw, "is een nieuwe pagina", "zijn nieuwe pagina's");
  // Bij precies één is "de andere" al enkelvoud: "de andere 1 verbeteren" had
  // zowel een overbodig cijfer als het verkeerde werkwoord.
  const verbeterenAantal = verbeteren === 1 ? "" : ` ${telwoord(verbeteren)}`;
  const verbeterenWerkwoord = enkelOfMeervoud(verbeteren, "verbetert", "verbeteren");
  return (
    `${nieuwOnderwerp} van de ${telwoord(recommendations.length)} aanbevelingen ${nieuwWerkwoord}, ` +
    `de andere${verbeterenAantal} ${verbeterenWerkwoord} een bestaande pagina die het onderwerp al ` +
    `gedeeltelijk dekt.`
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
      // Rapporten van vóór 2 september 2026 hebben dit veld niet. Dan gedraagt
      // de keten zich als voorheen in plaats van te struikelen.
      relatedUrl: rec.relatedUrl ?? null,
      targets: Array.isArray(rec.targets) ? rec.targets : [],
    };
  });
}
