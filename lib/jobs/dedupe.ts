/**
 * Dedupe-sleutels van de wachtrij (optimalisatie.md 1.3, migratie 0013).
 *
 * ── WAAROM DIT EEN EIGEN BESTAND IS, ZONDER `server-only` ───────────────────
 *
 * Conventie 2: alles wat de uitkomst bepaalt hoort in een pure, importeerbare
 * module — anders is het niet te testen vanuit `scripts/test-unit.ts`. Deze
 * sleutels zijn precies zulke logica: een partiële unieke index op
 * `(dedupe_key)` voor status `queued|running` bepaalt of werk dubbel wordt
 * ingepland. Eén tekenverschil in een sleutel is het verschil tussen een
 * genegeerde dubbele taak en een tweede betaalde web-zoekactie per vraag.
 *
 * Stond tot augustus 2026 in `queue.ts`, en was daardoor onbereikbaar voor de
 * unittests — dat viel op toen de engine erbij kwam (migratie 0041) en juist
 * die sleutel getoetst moest worden.
 */
import type { EngineId } from "@/lib/types/database";

export const dedupe = {
  profileDiscover: (profileId: string) => `profile_discover:${profileId}`,
  profileResearch: (profileId: string) => `profile_research:${profileId}`,
  profileOffering: (profileId: string) => `profile_offering:${profileId}`,
  proposeTopics: (profileId: string) => `propose_topics:${profileId}`,
  llmBaseline: (profileId: string) => `llm_baseline:${profileId}`,
  profileSynthesis: (profileId: string) => `profile_synthesis:${profileId}`,
  prepareAnalysis: (analysisId: string) => `prepare:${analysisId}`,
  generatePrompts: (analysisId: string) => `prompts:${analysisId}`,
  calibrateVolumes: (analysisId: string) => `volumes:${analysisId}`,
  // De herhalingsindex hoort in de sleutel (R6.1): drie metingen van dezelfde
  // vraag in dezelfde periode zijn drie verschillende taken, geen duplicaat.
  // Index 0 houdt bewust de OUDE sleutelvorm, zodat taken die al in de wachtrij
  // stonden bij het uitrollen van R6.1 niet ineens als nieuw werk gelden.
  /**
   * De engine hoort in de sleutel (migratie 0041, blok E) — anders zou een
   * Gemini-meting van dezelfde vraag als dubbele taak worden weggefilterd.
   *
   * `openai` levert bewust de OUDE sleutel zonder achtervoegsel op. Er staan
   * taken en dedupe-sleutels in de database van vóór deze wijziging; zou de
   * standaardengine nu een andere sleutel krijgen, dan zou een lopende meetronde
   * bij de eerstvolgende poging alles opnieuw inplannen — en dat is een tweede
   * betaalde web-zoekactie per vraag.
   */
  measurePrompt: (
    analysisId: string,
    promptId: string,
    weekNo: number,
    repeat = 0,
    engine: EngineId = "openai",
  ) => {
    const basis =
      repeat === 0
        ? `measure:${analysisId}:${promptId}:w${weekNo}`
        : `measure:${analysisId}:${promptId}:w${weekNo}:r${repeat}`;
    return engine === "openai" ? basis : `${basis}:e${engine}`;
  },
  aggregateWeek: (analysisId: string, weekNo: number) => `aggregate:${analysisId}:w${weekNo}`,
  competitorIntel: (analysisId: string, weekNo: number) => `compintel:${analysisId}:w${weekNo}`,
  generateReport: (analysisId: string, weekNo: number) => `report:${analysisId}:w${weekNo}`,
  // Content is idempotent op de aanbeveling, niet op de pagina: twee keer op
  // dezelfde knop drukken mag niet twee pagina's opleveren.
  contentDraft: (analysisId: string, title: string) => `content:${analysisId}:${title}`,
  // Eén briefing per BATCH (contentbriefing.md §2), dus de sleutel is de set
  // gekozen titels — niet één titel. Kiest de klant dezelfde drie pagina's nog
  // een keer, dan is dat dezelfde briefing; kiest hij er een vierde bij, dan is
  // het een nieuwe vragenronde.
  contentBrief: (analysisId: string, titles: string[]) =>
    `brief:${analysisId}:${[...titles].sort().join("|")}`,
  contentRevise: (contentPieceId: string) => `content_revise:${contentPieceId}`,
  // Per DAG, niet per profiel: de audit draait bij het aanmaken én maandelijks,
  // en moet dan echt opnieuw kijken. Zonder de datum erin zou een afgeronde
  // audit van vorig jaar de hermeting van deze maand blokkeren.
  technicalAudit: (profileId: string, day = new Date().toISOString().slice(0, 10)) =>
    `audit:${profileId}:${day}`,
  // Publicatie en effect (optimalisatie.md fase 5). De golf zit in de sleutel:
  // golf 1 en golf 2 zijn twee verschillende metingen van dezelfde vragen.
  verifyPublication: (contentPieceId: string) => `verify:${contentPieceId}`,
  measureImpact: (contentPieceId: string, wave: number) => `impact:${contentPieceId}:w${wave}`,
  measureImpactPrompt: (contentPieceId: string, wave: number, promptId: string) =>
    `impact_run:${contentPieceId}:w${wave}:${promptId}`,
  computeImpact: (contentPieceId: string, wave: number) => `impact_calc:${contentPieceId}:w${wave}`,
  // Per DAG: de scan mag opnieuw draaien na een nieuwe meting, maar niet twee
  // keer op dezelfde dag — de aanwezigheidscontrole kost een web-zoekactie.
  offsiteScan: (analysisId: string, day = new Date().toISOString().slice(0, 10)) =>
    `offsite:${analysisId}:${day}`,
};
