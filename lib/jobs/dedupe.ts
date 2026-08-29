/**
 * Dedupe-sleutels van de wachtrij (optimalisatie.md 1.3, migratie 0013).
 *
 * ── WAAROM DIT EEN EIGEN BESTAND IS, ZONDER `server-only` ───────────────────
 *
 * Conventie 2: alles wat de uitkomst bepaalt hoort in een pure, importeerbare
 * module. Anders is het niet te testen vanuit `scripts/test-unit.ts`. Deze
 * sleutels zijn precies zulke logica: een partiële unieke index op
 * `(dedupe_key)` voor status `queued|running` bepaalt of werk dubbel wordt
 * ingepland. Eén tekenverschil in een sleutel is het verschil tussen een
 * genegeerde dubbele taak en een tweede betaalde web-zoekactie per vraag.
 *
 * Stond tot augustus 2026 in `queue.ts`, en was daardoor onbereikbaar voor de
 * unittests. Dat viel op toen de engine erbij kwam (migratie 0041) en juist
 * die sleutel getoetst moest worden.
 */
import type { EngineId } from "@/lib/types/database";

export const dedupe = {
  profileDiscover: (profileId: string) => `profile_discover:${profileId}`,
  profileResearch: (profileId: string) => `profile_research:${profileId}`,
  profileOffering: (profileId: string) => `profile_offering:${profileId}`,
  proposeTopics: (profileId: string) => `propose_topics:${profileId}`,
  profileMarket: (profileId: string) => `profile_market:${profileId}`,
  llmBaseline: (profileId: string) => `llm_baseline:${profileId}`,
  profileSynthesis: (profileId: string) => `profile_synthesis:${profileId}`,
  prepareAnalysis: (analysisId: string) => `prepare:${analysisId}`,
  /**
   * Sinds 12 augustus 2026 één taak per funnelfase, dus de fase hoort in de
   * sleutel. Zonder dat zou de tweede fase gezien worden als een dubbele van de
   * eerste en nooit ingepland worden, en had de analyse tien vragen in plaats
   * van dertig.
   */
  generatePrompts: (analysisId: string, category: string) =>
    `prompts:${analysisId}:${category}`,
  calibrateVolumes: (analysisId: string) => `volumes:${analysisId}`,
  // De herhalingsindex hoort in de sleutel (R6.1): drie metingen van dezelfde
  // vraag in dezelfde periode zijn drie verschillende taken, geen duplicaat.
  // Index 0 houdt bewust de OUDE sleutelvorm, zodat taken die al in de wachtrij
  // stonden bij het uitrollen van R6.1 niet ineens als nieuw werk gelden.
  /**
   * De engine hoort in de sleutel (migratie 0041, blok E). Anders zou een
   * Gemini-meting van dezelfde vraag als dubbele taak worden weggefilterd.
   *
   * `openai` levert bewust de OUDE sleutel zonder achtervoegsel op. Er staan
   * taken en dedupe-sleutels in de database van vóór deze wijziging; zou de
   * standaardengine nu een andere sleutel krijgen, dan zou een lopende meetronde
   * bij de eerstvolgende poging alles opnieuw inplannen, en dat is een tweede
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
  // gekozen titels, niet één titel. Kiest de klant dezelfde drie pagina's nog
  // een keer, dan is dat dezelfde briefing; kiest hij er een vierde bij, dan is
  // het een nieuwe vragenronde.
  contentBrief: (analysisId: string, titles: string[]) =>
    `brief:${analysisId}:${[...titles].sort().join("|")}`,
  contentRevise: (contentPieceId: string) => `content_revise:${contentPieceId}`,
  // Per DAG en per merk: twee rondes op dezelfde dag halen exact dezelfde
  // cijfers op, want Google levert pas definitieve data met twee dagen
  // vertraging (`lib/search-console/window.ts`).
  gscSync: (profileId: string, dag: string) => `gsc_sync:${profileId}:${dag}`,
  // Per DAG, niet per analyse: twee analyses van hetzelfde merk die toevallig
  // op dezelfde dag hun eerste rapport krijgen, triggeren zo één herberekening
  // in plaats van twee. De taak leest bij het draaien de actuele stand van de
  // database, dus beide onderwerpen tellen sowieso mee, ook als de tweede
  // trigger hierdoor wordt genegeerd.
  recalculatePotential: (profileId: string, day = new Date().toISOString().slice(0, 10)) =>
    `potential:${profileId}:${day}`,
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
  // keer op dezelfde dag, de aanwezigheidscontrole kost een web-zoekactie.
  offsiteScan: (analysisId: string, day = new Date().toISOString().slice(0, 10)) =>
    `offsite:${analysisId}:${day}`,

  // ── Mijn reputatie (docs/tasks/mijn-reputatie.md §7) ─────────────────────
  //
  // ⚠️ De sleutel hangt aan de RUN en niet aan het profiel. Een tweede scan over
  // drie maanden is nieuw werk en geen duplicaat, en dat moet uit de sleutel
  // blijken. Zou hij aan het profiel hangen, dan zou een herhaalscan stil
  // genegeerd worden zolang de eerste nog openstond.
  reputationStart: (runId: string) => `rep_start:${runId}`,
  reputationBrand: (runId: string) => `rep_brand:${runId}`,
  reputationOffering: (runId: string, offeringId: string) =>
    `rep_offering:${runId}:${offeringId}`,
  /**
   * ⚠️ De merkbrede vergelijking heeft geen aanbodknoop, dus die sleutel eindigt
   * op het woord `merk` en niet op een lege string. Een sleutel die op `:`
   * eindigt ziet er in de database uit als een fout, en hij zou botsen met een
   * knoop-id dat ooit leeg zou zijn.
   */
  reputationCompare: (runId: string, offeringId: string | null) =>
    offeringId ? `rep_cmp:${runId}:${offeringId}` : `rep_cmp:${runId}:merk`,
  reputationSources: (runId: string) => `rep_sources:${runId}`,
  reputationSynthesis: (runId: string) => `rep_synthesis:${runId}`,
  reputationEvidence: (runId: string) => `rep_evidence:${runId}`,
  /**
   * ⚠️ Zelfde regel als bij de vergelijking: merkbreed eindigt op het woord
   * `merk` en niet op een lege string. Een sleutel die op `:` eindigt ziet er in
   * de database uit als een fout.
   */
  reputationMarket: (runId: string, offeringId: string | null) =>
    offeringId ? `rep_markt:${runId}:${offeringId}` : `rep_markt:${runId}:merk`,

  // ── De Sales-module (docs/tasks/geo-prospect-engine.md §8.3) ──────────────
  //
  // De eerste drie zijn per markt: er is precies één ontdekking, één verificatie
  // en één uitsluitingsronde per markt tegelijk. Loopt er een, dan doet een tweede
  // startklik niets, en dat is de bedoeling: de ontdekking is de enige betaalde
  // stap van deze sprint.
  salesDiscover: (marketId: string) => `sales_discover:${marketId}`,
  salesVerify: (marketId: string) => `sales_verify:${marketId}`,
  salesSuppress: (marketId: string) => `sales_suppress:${marketId}`,
  /**
   * ⚠️ De MARKT hoort in deze sleutel, naast het bedrijf. Een bedrijf kan in
   * meerdere markten zitten (plan hoofdstuk 6), en twee markten die hetzelfde
   * bedrijf goedkeuren horen niet elkaars crawltaak weg te filteren als duplicaat.
   * De crawl zelf is idempotent, dus twee taken kosten hooguit één extra
   * netwerkverzoek; één taak te weinig kost een bedrijf zonder gegevens.
   */
  salesEnrich: (marketId: string, companyId: string) =>
    `sales_enrich:${marketId}:${companyId}`,

  // ── Sprint 3: de meting (plan hoofdstuk 10 en 11) ─────────────────────────
  //
  // Vanaf hier hangt alles aan de RONDE en niet aan de markt. Een markt wordt
  // herhaald gemeten (plan hoofdstuk 6), en zou de sleutel op de markt staan,
  // dan zou ronde twee zichzelf als duplicaat van ronde één wegfilteren. Dan
  // bestaat opportunitytype 8 (verlies) niet meer, en dat is het type waar de
  // hele economie van hermeten aan hangt.
  salesIntents: (marketId: string) => `sales_intents:${marketId}`,
  salesQuestions: (runId: string) => `sales_questions:${runId}`,
  /**
   * ⚠️ De ENGINE hoort onvoorwaardelijk in deze sleutel, precies zoals bij de
   * klantmeting (migratie 0041). Zonder de engine ziet de Gemini-meting van een
   * vraag de OpenAI-meting als "al ingepland" en slaat hij zichzelf over: zonder
   * foutmelding, met een lege score per engine terwijl alles groen lijkt. En dan
   * bestaat opportunitytype 4 (engine gap) niet.
   */
  salesMeasure: (runId: string, questionId: string, engine: string) =>
    `sales_measure:${runId}:${questionId}:${engine}`,
  salesAggregate: (runId: string) => `sales_aggregate:${runId}`,
};
