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
import { binomialStderr, weightedScoreStderr, confidenceBand, changeIsMeaningful, bandInAntwoorden, Z95 } from "@/lib/stats/uncertainty";
import {
  normalizeEntityName,
  isSameEntity,
  pickCanonicalName,
  looksLikeBrandName,
  textContainsName,
  citesOwnSite,
  mentionSurvivesTextGuard,
} from "@/lib/entities/normalize";
import {
  bandFromEstimate,
  bandFromMeasuredVolume,
  volumeBandOf,
  isVolumeBand,
  VOLUME_BANDS,
  VOLUME_FACTOR,
} from "@/lib/pipeline/volume";
import { promptWeight, NEUTRAL_WEIGHT } from "@/lib/pipeline/prompt-weight";
import { bouwInvoerOpname, promptHash } from "@/lib/openai/input-capture";
import { spoorPaginering, isUuid, SPOOR_MAX, SPOOR_STANDAARD } from "@/lib/spoor";
import { topicPrioriteit } from "@/lib/topic-volgorde";
import { parseRobots, isAllowed, sitemapsFrom } from "@/lib/audit/robots";
import { splitByTerms } from "@/lib/highlight";
import { vloeiendPad, vloeiendPadTerug } from "@/lib/chart-curve";
import { redactCompetitors, containsCompetitor } from "@/lib/pipeline/redact";
import { stripProseDashes } from "@/lib/pipeline/dash-guard";
import { publicFactRequest } from "@/lib/fact-request-public";
import { plattetekst, kopieeropties } from "@/lib/kopieervormen";
import { legeStaat } from "@/lib/search-console/lege-staat";
import {
  startdatumBijToewijzing,
  afspraakGaten,
  afspraakSamenvatting,
  leesStartdatum,
} from "@/lib/verkoopafspraak";
import { rateLimitWindowStart, rateLimitVerdict } from "@/lib/rate-limit-rules";
import { heelMetabeschrijving, heelMetatitel, MAX_METABESCHRIJVING } from "@/lib/pipeline/metatitel";
import { moetAchtergrond, ophaalVertragingSeconden, ACHTERGROND_GRENS_MS } from "@/lib/openai/achtergrond";
import {
  getallenIn,
  veiligeWaarde,
  vindKandidaten,
  automatischeWinnaar,
  houdtPaginaTegen,
  conflictpoort,
  ernstVan,
  zonderBetwisteFeiten,
  type RegisterFeit,
} from "@/lib/pipeline/conflict-detect";
import { schoonWaardepropositie, schoneWaardeproposities, zelfdePropositie, zonderVindplaats } from "@/lib/pipeline/waardeproposities";
import type { AuditedClaim } from "@/lib/schemas/claim-audit";
import type { FactItem } from "@/lib/pipeline/factcard";
import {
  resolveTargets,
  readRecommendations,
  mergeOverlappingRecommendations,
  describeActionRatio,
  rangschikAanbevelingen,
  GROEI_FACTOR,
  eenVerbeteringPerAdres,
} from "@/lib/pipeline/recommendation";


import type {
  RawRecommendation,
  CodedMissedPrompt,
  StoredRecommendation,
} from "@/lib/pipeline/recommendation";
import {
  findExistingPageMatch,
  reconcileExistingPageActions,
  matchExistingPage,
  relatedPageWarning,
  chooseExistingText,
  EXISTING_PAGE_MAX_CHARS,
  EXISTING_PAGE_RELATED_THRESHOLD,
  EXISTING_PAGE_COVERAGE_THRESHOLD,
} from "@/lib/pipeline/existing-page-match";
import type { ExistingPageCandidate } from "@/lib/pipeline/existing-page-match";
import { compare, deltaOf, thresholdOf, verdictOf, minQuestionsForSignal } from "@/lib/pipeline/impact-math";
import { impactUitleg, type ImpactCijfers } from "@/lib/impact-uitleg";
import { faseVoorPagina } from "@/lib/plan-funnel";
import { buildChangeBlock, isWorthEmailing } from "@/lib/pipeline/period-change-format";
import type { PeriodChange } from "@/lib/pipeline/period-change-format";
import { domainOf } from "@/lib/offsite/domain";
import { paginaNaam } from "@/lib/pagina-naam";
import { tellingen, filterPaginas, groepVan, LEEG_FILTER, filterKeuzes, statusRegel } from "@/lib/pagina-lijst";
import { markeerZinnen, zinInBron } from "@/lib/tekst-markering";
import { paginaStand, streefdatum, streefzin, standVolgorde, FASEN, heeftEigenScherm, type PaginaStandInput } from "@/lib/pagina-stand";
import { checkUrlFormat, isOnBrandDomain, isRedirectedElsewhere, volledigAdres } from "@/lib/url";
import { sanitizeForPostgres, hasUnstorableChars } from "@/lib/pg-text";
import { countOpenPeriodicMeasurements } from "@/lib/jobs/pending";
import { PRIMARY_ENGINE } from "@/lib/engines/types";
import { leesAiOverview } from "@/lib/ai-overview/parse";
import {
  cijferVoorBron,
  cijferVoorBronnen,
  bronfilterNaarAdres,
  leesBronfilter,
  beschikbareBronnen,
  bronLabel,
  bronToelichting,
} from "@/lib/engines/bron";
import {
  AI_OVERVIEW_ENGINE,
  AI_OVERVIEW_REPEATS,
  AI_OVERVIEW_POGINGEN,
} from "@/lib/ai-overview/types";
import { leesLlmResponse } from "@/lib/llm-responses/parse";
import {
  LLM_RESPONSE_GEMINI_ENGINE,
  LLM_RESPONSE_REPEATS,
  LLM_RESPONSE_POGINGEN,
} from "@/lib/llm-responses/types";
import { bepaalGemisteVragen, genoemdPerVraag } from "@/lib/pipeline/missed-prompts";
import { formatEvidenceDossier, excerpt, resolveGapEvidence, schoonGapCluster } from "@/lib/pipeline/evidence-format";
import type { EvidenceEntry } from "@/lib/pipeline/evidence-format";
import { stripUnsupportedClaims, validateField, NEUTRAL_FALLBACK } from "@/lib/pipeline/validate-claims";
import { normalizePosition, averagePosition, weightedAveragePosition } from "@/lib/pipeline/position";
import { shareByRun, sumShare, roundQuestions } from "@/lib/pipeline/question-share";
import {
  numberFacts,
  formatFactCard,
  normalizeForQuote,
  isSupported,
  claimKey,
  topicKey,
  factFromAnswer,
  mergeAnsweredFacts,
  metKlantopmerking,
  metGespreksbewijs,
  sourceCoverage,
  buildFactFindingAddendum,
} from "@/lib/pipeline/factcard";
import { kiesAanspreekvorm, telAanspreekvormen } from "@/lib/pipeline/tone-sliders";
import { stripChrome } from "@/lib/pipeline/page-text";
import { duplicatePromptIds } from "@/lib/pipeline/prompt-dedupe";
import { dedupeCompetitorNames } from "@/lib/pipeline/competitor-dedupe";
import { htmlToText } from "@/lib/pipeline/html-text";
import { identifyEmptyProfiles } from "@/lib/profile-status";
import { isRapportageVorm } from "@/lib/pipeline/factcard";
import { describePronoun } from "@/lib/pipeline/tone-sliders";
import {
  brandNav,
  generalNav,
  salesNav,
  hoofdstukken,
  isActive,
  isExact,
  HOOFDSTUKKEN,
  HOOFDSTUK_ICOON,
  GRENS_PER_HOOFDSTUK,
} from "@/lib/nav";
import {
  MARKT_STANDEN,
  MARKT_STAND_TEKST,
  STRAAL_STANDAARD,
  STRAAL_MAX,
  controleerMarktInvoer,
  isMarktStand,
  maakSlug,
  magOvergaan,
  standaardLabel,
  uniekeSlug,
  volgendeStanden,
  type MarktStand,
} from "@/lib/sales/market";
import {
  BEWAARTERMIJN_MAANDEN,
  bewaarTot,
  dagenTotOpruimen,
  moetOpgeruimd,
} from "@/lib/sales/retention";
import {
  bedrijvenUitBronpagina,
  isGeenProspect,
  naamUitDomein,
  normaliseerDomein,
  voegKandidatenSamen,
  zekerheidUitBronnen,
  isGeenBedrijfsnaam,
  type Kandidaat,
} from "@/lib/sales/discovery";
import {
  bepaalUitsluitingen,
  marktWaarschuwing,
  UITSLUIT_SOORTEN,
} from "@/lib/sales/suppression";
// ⚠️ Hernoemd bij het importeren: `lib/reputation/budget.ts` heeft een functie
// met dezelfde naam. Twee plafonds, twee modules, en dat hoort zo: de een is per
// reputatieanalyse, de ander per markt. Alleen de naam botst.
import {
  MARKT_BUDGET_EUR,
  STAP_KOSTEN_USD as SALES_STAP_KOSTEN,
  beoordeelBudget,
  budgetUsd as marktBudgetUsd,
} from "@/lib/sales/budget";
import { bouwOntdekVraag, beschrijfHerkomst } from "@/lib/sales/discovery";
import { marktFase } from "@/lib/sales/market";
// Sprint 3, de meting: de twee assen, het koppelen van een genoemde naam aan een
// bedrijf, en de rekensom over de vermeldingen.
import {
  INTENT_STAGES,
  STAGE_WEIGHT,
  BAND_FACTOR,
  MIN_VRAGEN_PER_INTENTIE,
  INTENTIES_MAX,
  VRAGEN_STANDAARD,
  vraagGewicht,
  verdeelVragen,
  schoonIntenties,
  normaliseerLabel,
  type Intentie,
} from "@/lib/sales/intents";
import { koppelNaam, koppelAntwoord, domeinSleutel } from "@/lib/sales/match";
import { rekenScores, marktBronnen, ENGINE_ALLE } from "@/lib/sales/measure-math";
import { raamMeetronde, beoordeelRonde as beoordeelMeetronde } from "@/lib/sales/budget";
import {
  koppelVragen,
  bouwVragenVraag,
  zetPlaatsInVraag,
  plaatsInKoopvragen,
  KOOPFASES,
} from "@/lib/sales/questions";
import { alleRijen } from "@/lib/supabase/pagineer";
import { bouwFases, procesSamenvatting, loopterIets, type ProcesMoment } from "@/lib/sales/proces";
import { groepeerOnbekend, isMerkOfBron } from "@/lib/sales/onbekend";
import { bouwIntentieVraag } from "@/lib/sales/intents";
import { bouwBeoordeelVraag, SIMULATIE_SYSTEM } from "@/lib/sales/measure-prompt";
// Sprint 4: de acht types, de score en de haak.
import {
  detecteerKansen,
  kiesPrimair,
  detecteerVerlies,
  siteBeschrijftDienst,
  buitenDeMarge,
  PRIMAIRE_VOLGORDE,
  KANS_TYPES,
  KANS_LABEL,
  ONZICHTBAAR_GRENS,
  type BedrijfMeting,
  type MarktContext,
  type MeetScore,
  type Kans,
} from "@/lib/sales/opportunity";
import {
  rekenScore,
  grootsteGelijkspel,
  vergelijkKansen,
  GEWICHTEN,
  SCHERPTE,
  BEWEGING_BONUS,
  TIER_HOOG,
} from "@/lib/sales/opportunity-score";
import {
  controleerHook,
  sjabloonHook,
  kiesHook,
  bouwHookVraag,
  toegestaneGetallen,
} from "@/lib/sales/hook";
// Sprint 5: de werkstroom, de mail en de contactregels.
import {
  OUTREACH_STANDEN,
  STAND_TEKST,
  AFWIJS_REDENEN,
  CONCEPTEN_PER_DAG,
  magOvergaanNaar,
  volgendeStandenVoor,
  beoordeelStatus,
  beoordeelPlafond,
  rekenTrechter,
} from "@/lib/sales/workflow";
import {
  controleerConcept,
  controleerVoorbereiding,
  sjabloonConcept,
  bouwMailVraag,
  TOON_PER_TYPE,
  VERBODEN_IN_MAIL,
} from "@/lib/sales/mail";
import {
  magOntvangerZijn,
  rolPast,
  isAlgemeenAdres,
  rolHoortBijBedrijf,
  leidAdresAf,
  bouwContactVraag,
} from "@/lib/sales/contact";
// Sprint 6: het publieke rapport.
import {
  marktAdres,
  publiekeBedrijven,
  magPubliceren,
  controleerRapport,
  sjabloonRapport,
  bouwRapportVraag,
  type RapportInvoer,
} from "@/lib/sales/report";
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
import { leesHerkomst, terugLink, isStukpagina } from "@/lib/origin";
import {
  contentMix,
  funnelVoortgang,
  planTotalen,
  type Funnelfase,
  type VoortgangPagina,
} from "@/lib/plan-progress";
import { activiteit, ALLE_TAAKSOORTEN, TAAK_TEKST } from "@/lib/activity";
import { beperkSectie, groepeerPerSectie, wachtrijRegel } from "@/lib/wachtrij";
import type { WorkItem } from "@/lib/work";
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
  vergelijkingsvenster,
  VERGELIJKINGSVENSTER_DAGEN,
  volledigVenster as volledigVensterGsc,
  vorigVenster,
  type GscDag,
} from "@/lib/search-console/metrics";
import {
  bewegingen as gscBewegingen,
  dalers as gscDalers,
  opHetRandje,
  RANDJE_MIN_VERTONINGEN,
  stijgers as gscStijgers,
  totalenPerQueryPagina,
  type GscQueryDag,
} from "@/lib/search-console/rankings";
import { berekenOpbrengst, type OpbrengstPagina } from "@/lib/search-console/opbrengst";
import { kandidaatZoektermen, MIN_KEYWORD_LENGTH, binnenWoordlimiet, MAX_WOORDEN_PER_ZOEKTERM } from "@/lib/search-demand/keywords";
import { extractHeadings, renderMarkdown } from "@/lib/markdown";
import {
  topicTerms,
  canonicalPath,
  scorePage,
  selectRelevantPages,
  scoreTermOverlap,
} from "@/lib/pipeline/page-relevance";
import { verifyDossierFacts, answerTypeOf } from "@/lib/pipeline/dossier-verify";
import { wilsonBounds, maySkip, elicitLabel, describeElicit } from "@/lib/pipeline/elicit-rate";
import { resolveTuning, isReasoningModel, isUnsupportedTemperatureError } from "@/lib/openai/sampling";
import { zoekCliches, telCliches } from "@/lib/solliciteren/cliches";
import {
  MAX_SLEUTELWOORDEN,
  dekkingspercentage,
  vergelijkSleutelwoorden,
} from "@/lib/solliciteren/sleutelwoorden";
import {
  MODELLEN,
  REDENEERSTANDEN,
  STANDAARD_MODEL,
  STANDAARD_STAND,
  TEMPERATUUR_ZONDER_REDENEREN,
  bepaalParameters,
  isGeldigModel,
  isGeldigeStand,
} from "@/lib/solliciteren/modellen";
import {
  EERSTE_VRAAG,
  MAX_BERICHTEN_IN_HISTORIE,
  MAX_VACATURE_TEKENS,
  bouwInvoer,
  bouwSysteemprompt,
  bouwVacatureblok,
  kapAf,
} from "@/lib/solliciteren/prompt";
import {
  MAX_DOCUMENT_TEKENS,
  MAX_DOSSIER_TEKENS,
  SOORTEN,
  bouwDossierblok,
  brievenUit,
  feitenmateriaalUit,
  isGeldigeSoort,
  pasDossierIn,
  sorteerDossier,
  type Dossierstuk,
} from "@/lib/solliciteren/dossier";
import {
  MINIMUM_WOORDEN,
  formuleerStemregels,
  meetStem,
  toetsStem,
} from "@/lib/solliciteren/stem";
import {
  CATEGORIEEN,
  KOP_BRIEF,
  KOP_OPDRACHT,
  KOP_VACATURE,
  bouwFeitenblok,
  isGeldigeCategorie,
  refVan,
  splitsAntwoord,
  zeefFeiten,
  type Feit,
} from "@/lib/solliciteren/feiten";
import {
  MAX_ONVINDBAAR,
  zoekOnvindbaar,
  zonderAanhefEnOndertekening,
} from "@/lib/solliciteren/herkomst";
import { splitsInAlineas, splitsInZinnen, telWoorden } from "@/lib/solliciteren/woorden";
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
  isArchiefOfBijlage,
  isArchiefSitemap,
  isBijlageHtml,
  volgendeBatchgrootte,
  menuLinks,
  canonicalKey,
} from "@/lib/crawl-urls";
import { scoreUrl, selectUrls, metMenuVoorrang, type UrlSignal } from "@/lib/pipeline/url-priority";
import { openCandidates } from "@/lib/pipeline/light-scan-select";
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
  maandIsVol,
  LAATSTE_DAG,
} from "@/lib/plan-schedule";
import { calendarDagen } from "@/lib/plan-calendar";
import { sharedNotice } from "@/lib/plan-overview";
import {
  filterBacklog,
  sortBacklog,
  compareByPotential,
  clusterCounts,
  potentieLabel,
  raaktLabel,
  redenChip,
  redenUitleg,
  estimateBacklogMonths,
  backlogDurationLabel,
  LEGE_BACKLOG_FILTERS,
  type BacklogItem,
} from "@/lib/plan-backlog";
import { bepaalVulling, VERBETER_TUSSENRUIMTE_MAANDEN, type OpenMaand } from "@/lib/plan-fill";
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
import { ronde, type MaandPlanPagina, type MaandTekst } from "@/lib/ronde";
import { actionNeedsStaff, STAFF_ONLY_ACTIONS } from "@/lib/cost-rules";
import { overdrachtZonderCluster } from "@/lib/cluster-start";
import {
  vraagVorm,
  vraagsoortKop,
  VRAAGSOORT_VOLGORDE,
  groepeerOpSoort,
} from "@/lib/feitenvraag";
import { navActief } from "@/lib/nav";
import { openVragenTotaal, openVragenLabel } from "@/lib/open-questions-count";
import { leesMaandKeuze, maandRegel, planStap, telStatussen } from "@/lib/plan-read";
import {
  isEersteMaand,
  totalenZin,
  planRegels,
  versheidsregel,
  volgendeMeting,
} from "@/lib/overview";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  containsRegion,
  geoBalance,
  droppableIndices,
  isLokaal,
  REGIO_DREMPEL,
  regionGateMessage,
  containsPlace,
  groeiBalans,
  toegestanePlaatsen,
  wijkbaarVoorGroei,
  vraagZonderPlaats,
} from "@/lib/pipeline/geo-share";
import { COST_DENIED } from "@/lib/cost-rules";
import { gesprekBeantwoordt, zelfdeVraag } from "@/lib/vraag-dekking";
import { isAdviesCitaat } from "@/lib/pipeline/aanbod-citaat";
import { spreidTijden, GEMINI_AFSTAND_MS } from "@/lib/jobs/spreiding";
import { buildSteps as bouwStappen } from "@/lib/pipeline/research-steps";
import { paginaSoort, isFunctiepagina, functieblok } from "@/lib/pipeline/paginafunctie";
import { knowsBrand as kentMerk, extractConfusions as haalVerwarringen, isEigenSchrijfwijze } from "@/lib/pipeline/baseline-verdict";
import { requireCount } from "@/lib/require-count";
import { mayMeasureAgain, MIN_DAGEN_TUSSEN_PERIODES } from "@/lib/measure-cadence";
import { poolRecent, describePooled, MAX_POOLED_ROUNDS } from "@/lib/stats/pooling";
import {
  visibilityIndex,
  potentialScore,
  potentialBand,
  potentialExplanation,
  distributePotentialByWeight,
  isConfident,
  CONFIDENCE_MARGIN_LIMIT,
} from "@/lib/potential";
import {
  DEFAULT_MIX,
  checkMix,
  checkNewClusterMix,
  describeMix,
  isDefaultMix,
  mixTotal,
  resolveMix,
  suggestPromptMix,
  exceedsRunBudgetWarning,
  MAX_PER_STAGE,
  MAX_TOTAL,
  NEW_CLUSTER_MIN_TOTAL,
  NEW_CLUSTER_MAX_TOTAL,
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
  DEFAULT_ACCOUNT_DAILY_LIMIT_EUR,
  DEFAULT_TOTAL_DAILY_LIMIT_EUR,
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
  SESSION_BLOCKS,
  SESSION_AUTHOR_FIELDS,
  STEP_META,
  STEP_ORDER,
  fieldsOfStep,
  isFilled,
  stepProgress,
  overallProgress,
  missingRequired,
  veldAlsTekst,
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
  reportSteering,
  groeiKernwoorden,
  raaktGroeidoel,
} from "@/lib/pipeline/commercial-context";
import { buildTopicBrief } from "@/lib/pipeline/topic-brief";
import {
  beoordeelRonde,
  snapshotsGelijk,
  type TopicRoundSnapshot,
} from "@/lib/pipeline/topic-round-diff";
import {
  isOfferingKind,
  normaliseOfferingName,
  normaliseOptionalText,
  nextSortOrder,
  wouldCreateCycle,
} from "@/lib/offerings-validate";
import { speedProfile, nextDelayMs, slowerThan, isCrawlSpeed } from "@/lib/crawl-speed";
import {
  beoordeelClaim,
  ontbrekendeOnderbouwing,
  marktclaimUitleg,
  MARKTCLAIM_UITLEG,
} from "@/lib/pipeline/claim-plausibility";
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
  regionsFromDescription,
  discontinuedNames,
} from "@/lib/pipeline/context-factors";
import { moetNaarProofPoints } from "@/lib/proof-point-regel";
import { pasSchrijfregelsToe } from "@/lib/schrijfregel-vangnet";
import { bronnenDieWelNoemden, bronnenRegel, correctQuestionCount, kortSamengevat, questionCountLine, vulBronnenAan } from "@/lib/pipeline/report-summary";
import {
  PACKAGE_SIZES,
  DEFAULT_PACKAGE_SIZE,
  isPackageSize,
  toPackageSize,
  packageLabel,
} from "@/lib/package-sizes";
import { formatDateShort, formatDateLong, formatRelativeTime, formatNumber, formatUsd, enkelOfMeervoud } from "@/lib/format";
import {
  normaliseerLabelnaam,
  zelfdeLabelnaam,
  vindLabel,
  sorteerLabels,
  leesLabelfilter,
  filterOpLabel,
  telPerLabel,
  MAX_LABELNAAM,
  LABELFILTER_ALLES,
  LABELFILTER_GEEN,
} from "@/lib/cluster-labels";
import {
  leesStatusfilter,
  filterOpStatus,
  telPerStatus,
  STATUSFILTER_ALLES,
} from "@/lib/analysis-status";
import {
  clustersVoorFilter,
  leesClusterfilter,
  CLUSTERFILTER_ALLES,
  bepaalPeriodes,
  leesPeriodefilter,
  selecteerPerCluster,
  PERIODEFILTER_ACTUEEL,
  beschikbareFunnelfasen,
  leesFunnelfilter,
  filterOpFunnel,
  FUNNELFILTER_ALLES,
} from "@/lib/analytics-filters";
import { describeToneSliders, clampToneSlider } from "@/lib/pipeline/tone-sliders";
import { slugFrom, suggestedPath, resolvedContentUrl, displayTitle } from "@/lib/pipeline/slug";
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
import { isNewerVersionAvailable } from "@/lib/deployment";
import {
  moetMelden,
  maakMelding,
  teMelden,
  MAX_MELDINGEN,
  type ClusterStand,
} from "@/lib/cluster-melding";
import {
  kiesConcurrenten,
  variantSleutel,
  voegVariantenSamen,
  voorfilter,
  alleenBestaandeTermen,
  kandidaatFeiten,
  kandidaatSoort,
  kandidaatScore,
  lijktOp,
  kaartFeiten,
  dubbelInRonde,
  schoonThema,
  themaStammen,
  binnenThema,
  themaSuggesties,
  type OntdekTerm,
} from "@/lib/cluster-discovery";
import { controleerHardeBeweringen, getallenIn as hardeGetallen, geleZinnen, splitsZinnen, vindHardeBeweringen } from "@/lib/pagina/harde-beweringen";
import { repareerMechanisch } from "@/lib/pagina/mechanisch";
import { kiesFeiten, hoortBijPagina, blokA, MAX_FEITEN, type FeitRij } from "@/lib/pagina/bedrijfskennis";
import { schrijfpoort, schrijfdatum } from "@/lib/pagina/schrijfpoort";
import { schoneAdressen, vanafEersteAlinea, MAX_STEMVOORBEELDEN } from "@/lib/pagina/stemvoorbeelden-regels";
import { openVraagTekst, OPEN_VRAAG_MAX } from "@/lib/pagina/open-vraag-tekst";
import { verwerkBrief, normaliseerVraag, kindVoorSoort, MAX_BRIEFVRAGEN, type ContentBrief } from "@/lib/pagina/brief-regels";
import { briefInvoer, BRIEF_SYSTEEM } from "@/lib/pagina/brief-opdracht";
import { schrijfSysteem, schrijfInvoer, herschrijfInvoer, type SchrijfBlokken } from "@/lib/pagina/schrijfopdracht";
import { moetHerschrijven, kiesVersie, geleZinnenNa, allesBevestigd, zinnenMetVerbodenWoord, CONTROLE_SYSTEEM } from "@/lib/pagina/controle-regels";
import type {
  ProfileOffering,
  ProfileTopic,
  Entity,
  PlannedPageStatus,
  ContentAction,
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

/**
 * Bestaat dit bestand? Voor de omgekeerde controle: een module die is opgeheven
 * mag niet terugkeren. `leesBestand()` kan dat niet zeggen, want een leeg
 * bestand en een ontbrekend bestand geven daar allebei een lege string.
 */
function bestaatBestand(pad: string): boolean {
  return existsSync(pad);
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

/** Alle `.ts`-bestanden onder een map, recursief. Voor de API-routes. */
function tsOnder(map: string): string[] {
  const uit: string[] = [];
  let inhoud: { name: string; isDirectory: () => boolean }[];
  try {
    inhoud = readdirSync(map, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return uit;
  }
  for (const item of inhoud) {
    const pad = join(map, item.name);
    if (item.isDirectory()) uit.push(...tsOnder(pad));
    else if (item.name.endsWith(".ts")) uit.push(pad);
  }
  return uit;
}

function group(name: string, fn: () => void) {
  const before = failed;
  fn();
  const mark = failed === before ? "✓" : "✗";
  console.log(`  ${mark} ${name}`);
}

/**
 * Zoals `group()`, voor een controle die moet wachten op een belofte.
 *
 * Bijna alles in dit bestand is een pure functie en dus synchroon. De
 * paginering (`lib/supabase/pagineer.ts`) is dat niet: hij haalt pagina's op tot
 * er een niet vol is, en dat is precies het gedrag dat getest moet worden.
 * Vandaar deze tweeling, en de asynchrone staart onderaan dit bestand.
 */
async function groupAsync(name: string, fn: () => Promise<void>) {
  const before = failed;
  await fn();
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

group("mentionSurvivesTextGuard: het vangnet zelf (herstelplan na audit T6)", () => {
  // Precies het gat uit de audit: op productie telden 11 van de 774 metingen
  // als vermelding terwijl de merknaam nergens in het antwoord stond, en 6
  // andersom. Deze test toetst de samenstelling (model-oordeel + tekstcontrole)
  // in plaats van alleen de tekstcontrole zelf, want dat is waar de regel eerder
  // ongemerkt kon wegvallen (bijvoorbeeld een refactor die `m.mentioned`
  // rechtstreeks doorgeeft).
  const geenNaamInTekst = "De belangrijkste voordelen zijn lagere kosten en onderhoud inbegrepen.";
  const welNaamInTekst = "Swapfiets is een populaire aanbieder van fietsabonnementen.";

  ok(
    "model zegt genoemd, naam ontbreekt in de tekst → toch niet genoemd",
    !mentionSurvivesTextGuard(true, ["Swapfiets"], geenNaamInTekst),
  );
  ok(
    "model zegt genoemd, naam staat er echt → genoemd",
    mentionSurvivesTextGuard(true, ["Swapfiets"], welNaamInTekst),
  );
  ok(
    "model zegt NIET genoemd, ook al staat de naam er → blijft niet genoemd",
    !mentionSurvivesTextGuard(false, ["Swapfiets"], welNaamInTekst),
  );
  ok(
    "een alias telt ook mee als kandidaatnaam",
    mentionSurvivesTextGuard(true, ["Swap Fiets B.V.", "Swapfiets"], welNaamInTekst),
  );
  ok(
    "geen enkele kandidaatnaam in de tekst → niet genoemd",
    !mentionSurvivesTextGuard(true, ["Swap Fiets B.V.", "Andere Naam"], geenNaamInTekst),
  );
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

group("bandFromMeasuredVolume: een echte meting herschaald naar de zwaarste vraag (blok C, §3.2)", () => {
  // De zwaarste vraag van de batch is het nulpunt van "hoog", precies zoals
  // een AI-schatting van 100 dat ook is.
  ok("de zwaarste vraag zelf is altijd hoog", bandFromMeasuredVolume(1000, 1000, null) === "hoog");
  ok("60% van de zwaarste is nog hoog (grens 60)", bandFromMeasuredVolume(600, 1000, null) === "hoog");
  ok("59% is midden", bandFromMeasuredVolume(590, 1000, null) === "midden");
  ok("24% is laag", bandFromMeasuredVolume(240, 1000, null) === "laag");

  // Zonder meting (geen match, of de leverancier kent de term niet) valt de
  // functie terug op de AI-schatting, en verandert er dus niets.
  ok("geen gemeten volume: terugval op de schatting", bandFromMeasuredVolume(null, 1000, 90) === "hoog");
  ok(
    "geen zwaarste volume in de batch (niemand gematcht): ook terugval",
    bandFromMeasuredVolume(500, 0, 20) === "laag",
  );
  ok(
    "geen van beide bekend: de bestaande terugval van bandFromEstimate",
    bandFromMeasuredVolume(null, 0, null) === "midden",
  );
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

  // Herstelplan na audit T8.8: het echte geval uit de audit. De naam ging weg,
  // de gedachtestreepjes eromheen bleven staan: "een andere aanbieder –
  // Noordwijkerhout — heeft een speciale angsttandarts".
  const tandartsNamen = ["Cleyburch Tandartsen"];
  const kapotteZin = redactCompetitors(
    "Cleyburch Tandartsen – Noordwijkerhout — heeft een speciale angsttandarts.",
    tandartsNamen,
  );
  ok(
    "geen gedachtestreepje meer over, ook niet het exemplaar naast de weggehaalde naam",
    !/[—–]/.test(kapotteZin),
    kapotteZin,
  );
  ok("de zin blijft leesbaar (geen dubbele komma)", !kapotteZin.includes(",,") && !/,\s*,/.test(kapotteZin));
});

// Herstelplan na audit T8.8: docs/schrijfstijl.md §10 verbiedt een
// gedachtestreepje in lopende tekst, met uitzondering van een getalbereik
// zonder spaties ("5–8").
group("stripProseDashes: gedachtestreepjes eruit, getalbereiken blijven staan (T8.8)", () => {
  ok(
    "een streepje met spaties wordt een komma",
    stripProseDashes("Dit is een zin — met een bijzin — erin.") === "Dit is een zin, met een bijzin, erin.",
  );
  ok(
    "en-dash met spaties ook",
    stripProseDashes("Een andere aanbieder – Noordwijkerhout — heeft iets.") ===
      "Een andere aanbieder, Noordwijkerhout, heeft iets.",
  );
  ok("een getalbereik zonder spaties blijft staan", stripProseDashes("5–8 onderwerpen") === "5–8 onderwerpen");
  ok("een paragraafbereik blijft staan", stripProseDashes("§2–§3") === "§2–§3");
  ok("tekst zonder streepje blijft ongewijzigd", stripProseDashes("Een gewone zin.") === "Een gewone zin.");
  ok("lege tekst blijft leeg", stripProseDashes("") === "");
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

group("Geen twee aanbevelingen op dezelfde zwaarste vraag (werkpakket B §4.2)", () => {
  const target = (promptId: string, weight: number) => ({
    promptId,
    runId: `run-${promptId}`,
    text: `vraag ${promptId}`,
    cluster: null,
    weight,
  });
  const stored = (over: Partial<StoredRecommendation>): StoredRecommendation => ({
    title: "T",
    type: "article",
    targetIntent: "i",
    why: "w",
    relatedUrl: null,
    priority: 1,
    action: "nieuw",
    existingUrl: null,
    targets: [],
    ...over,
  });

  // Twee aanbevelingen die allebei p1 als zwaarste doelvraag hebben: dat is
  // hetzelfde gemis, ook al verschillen de titels.
  const dubbel = mergeOverlappingRecommendations([
    stored({ title: "Wasmachine kopen", priority: 1, targets: [target("p1", 0.9)] }),
    stored({ title: "Een wasmachine aanschaffen", priority: 2, targets: [target("p1", 0.9), target("p2", 0.4)] }),
  ]);
  ok("worden samengevoegd tot één aanbeveling", dubbel.length === 1, String(dubbel.length));
  ok("de belangrijkste (laagste priority) titel wint", dubbel[0].title === "Wasmachine kopen");
  ok(
    "de extra doelvraag van de verliezer blijft behouden",
    dubbel[0].targets.some((t) => t.promptId === "p2"),
    dubbel[0].targets.map((t) => t.promptId).join(", "),
  );

  // Twee aanbevelingen op een andere zwaarste vraag blijven gewoon twee.
  const geenOverlap = mergeOverlappingRecommendations([
    stored({ title: "A", targets: [target("p1", 0.9)] }),
    stored({ title: "B", targets: [target("p3", 0.7)] }),
  ]);
  ok("verschillende zwaarste vraag blijft twee aanbevelingen", geenOverlap.length === 2);

  // Zonder doelvraag valt niets samen, ook niet met zichzelf.
  const zonderTargets = mergeOverlappingRecommendations([
    stored({ title: "A", targets: [] }),
    stored({ title: "B", targets: [] }),
  ]);
  ok("aanbevelingen zonder doelvraag blijven allebei staan", zonderTargets.length === 2);

  // Drie op dezelfde vraag: ook dat wordt er één, niet twee.
  const drieDubbel = mergeOverlappingRecommendations([
    stored({ title: "A", priority: 3, targets: [target("p1", 0.9)] }),
    stored({ title: "B", priority: 1, targets: [target("p1", 0.9)] }),
    stored({ title: "C", priority: 2, targets: [target("p1", 0.9)] }),
  ]);
  ok("drie dubbele aanbevelingen worden er één", drieDubbel.length === 1, String(drieDubbel.length));
  ok("en de belangrijkste van de drie wint", drieDubbel[0].title === "B");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nStelt het rapport niets voor dat de klant al heeft? (docs/logbook.md 1 sept 2026)");

group("herkent een bestaande pagina die het onderwerp al dekt", () => {
  const topic = {
    title: "Wasmachine kopen: waar op letten",
    targetIntent: "Praktisch advies voor wie een wasmachine wil kopen",
    why: "Bezoekers zoeken advies over het kopen van een wasmachine",
  };
  const dekkendePagina: ExistingPageCandidate = {
    url: "https://voorbeeld.nl/advies/wasmachine-kopen-waar-op-letten",
    title: "Wasmachine kopen: waar moet je op letten",
    text:
      "Praktisch advies voor wie een wasmachine wil kopen. Bezoekers zoeken vaak advies " +
      "over het kopen van de juiste wasmachine, en letten dan op prijs, capaciteit en " +
      "energielabel.",
  };
  const onverwantePagina: ExistingPageCandidate = {
    url: "https://voorbeeld.nl/klantenservice",
    title: "Klantenservice",
    text: "Neem contact op met onze klantenservice voor vragen over bezorging en retourneren.",
  };

  const match = findExistingPageMatch(topic, [onverwantePagina, dekkendePagina]);
  ok("de dekkende pagina wordt gevonden", match?.url === dekkendePagina.url, JSON.stringify(match));
  ok(
    "de dekking zit boven de drempel",
    (match?.coverage ?? 0) >= EXISTING_PAGE_COVERAGE_THRESHOLD,
    String(match?.coverage),
  );

  ok(
    "een onverwante pagina levert geen match op",
    findExistingPageMatch(topic, [onverwantePagina]) === null,
  );

  // Te weinig onderwerptermen om te kunnen oordelen: dan liever geen oordeel
  // dan een vals alarm (conventie 3).
  ok(
    "een te dun onderwerp levert geen oordeel op",
    findExistingPageMatch({ title: "Prijzen", targetIntent: "", why: "" }, [dekkendePagina]) === null,
  );

  ok(
    "geen enkele pagina levert geen oordeel op",
    findExistingPageMatch(topic, []) === null,
  );
});

group("corrigeert action/existingUrl tegen de echte crawl", () => {
  // Expliciet getypeerd op `ContentAction` (niet de letterlijke `"nieuw"`):
  // anders leidt TypeScript uit één testinvoer een te smal type af, en
  // rapporteert de build straks ten onrechte dat de vergelijking hieronder
  // met "verbeteren" nooit waar kan zijn.
  type ProefAanbeveling = {
    title: string;
    targetIntent: string;
    why: string;
    action: ContentAction;
    existingUrl: string | null;
  };
  const topic = {
    title: "Wasmachine kopen: waar op letten",
    targetIntent: "Praktisch advies voor wie een wasmachine wil kopen",
    why: "Bezoekers zoeken advies over het kopen van een wasmachine",
  };
  const dekkendePagina: ExistingPageCandidate = {
    url: "https://voorbeeld.nl/advies/wasmachine-kopen-waar-op-letten",
    title: "Wasmachine kopen: waar moet je op letten",
    text:
      "Praktisch advies voor wie een wasmachine wil kopen. Bezoekers zoeken vaak advies " +
      "over het kopen van de juiste wasmachine, en letten dan op prijs, capaciteit en " +
      "energielabel.",
  };
  const onverwantePagina: ExistingPageCandidate = {
    url: "https://voorbeeld.nl/klantenservice",
    title: "Klantenservice",
    text: "Neem contact op met onze klantenservice voor vragen over bezorging en retourneren.",
  };

  // Het model zegt "nieuw" terwijl de site het onderwerp al ruim dekt: dit is
  // precies het geval dat de klant niet wil, een voorstel voor iets dat hij al
  // heeft. Moet omslaan naar "verbeteren" met de echt gevonden URL.
  const gemist = reconcileExistingPageActions<ProefAanbeveling>(
    [{ ...topic, action: "nieuw", existingUrl: null }],
    [onverwantePagina, dekkendePagina],
  );
  ok("nieuw wordt verbeteren", gemist.recommendations[0].action === "verbeteren");
  ok("met de echt gevonden URL", gemist.recommendations[0].existingUrl === dekkendePagina.url);
  ok("en de correctie wordt gelogd", gemist.overrides.length === 1 && gemist.overrides[0].reason === "gevonden_gelijkenis");

  // Het model zegt "verbeteren" met een URL die nergens in de crawl voorkomt
  // (Udenhout, /udenhout.nl/skoda), maar we vinden zelf de echte pagina.
  const verzonnenMaarVindbaar = reconcileExistingPageActions<ProefAanbeveling>(
    [{ ...topic, action: "verbeteren", existingUrl: "https://voorbeeld.nl/skoda" }],
    [onverwantePagina, dekkendePagina],
  );
  ok(
    "de verzonnen URL wordt vervangen door de echte pagina",
    verzonnenMaarVindbaar.recommendations[0].existingUrl === dekkendePagina.url,
  );
  ok(
    "de correctie meldt een onbevestigde URL",
    verzonnenMaarVindbaar.overrides[0]?.reason === "onbevestigde_url",
  );

  // Het model zegt "verbeteren" met een verzonnen URL, en er is ook geen
  // pagina te vinden die het onderwerp dekt. Dan liever "nieuw" zonder adres
  // dan een niet te bevestigen link tonen (conventie 3, net als schoonAdres()
  // in lib/plan-backlog-data.ts).
  const verzonnenEnOnvindbaar = reconcileExistingPageActions<ProefAanbeveling>(
    [{ ...topic, action: "verbeteren", existingUrl: ":" }],
    [onverwantePagina],
  );
  ok("valt terug op nieuw", verzonnenEnOnvindbaar.recommendations[0].action === "nieuw");
  ok("zonder adres", verzonnenEnOnvindbaar.recommendations[0].existingUrl === null);

  // Het model zegt "verbeteren" met een URL die echt in de crawl staat: die
  // aanbeveling blijft ongemoeid.
  const bevestigd = reconcileExistingPageActions<ProefAanbeveling>(
    [{ ...topic, action: "verbeteren", existingUrl: dekkendePagina.url }],
    [dekkendePagina],
  );
  ok("een bevestigde URL blijft staan", bevestigd.recommendations[0].existingUrl === dekkendePagina.url);
  ok("en levert geen correctie op", bevestigd.overrides.length === 0);

  // Het model zegt "nieuw" en er is ook echt niets dat erop lijkt: geen
  // correctie nodig.
  const terecht = reconcileExistingPageActions<ProefAanbeveling>(
    [{ ...topic, action: "nieuw", existingUrl: null }],
    [onverwantePagina],
  );
  ok("terecht 'nieuw' blijft onaangeroerd", terecht.recommendations[0].action === "nieuw");
  ok("en levert geen correctie op", terecht.overrides.length === 0);
});

group("De verhouding nieuw/verbeteren in een zin (werkpakket B §4.3)", () => {
  const stored = (action: "nieuw" | "verbeteren"): StoredRecommendation => ({
    title: "T",
    type: "article",
    targetIntent: "i",
    why: "w",
    relatedUrl: null,
    priority: 1,
    action,
    existingUrl: null,
    targets: [],
  });

  const lijst = (nieuw: number, verbeteren: number): StoredRecommendation[] => [
    ...Array.from({ length: nieuw }, () => stored("nieuw")),
    ...Array.from({ length: verbeteren }, () => stored("verbeteren")),
  ];

  ok("geen aanbevelingen levert geen zin op", describeActionRatio([]) === null);
  ok(
    "allemaal nieuw krijgt een eigen zin, met het telwoord voluit",
    describeActionRatio(lijst(2, 0))!.includes("Alle twee aanbevelingen zijn nieuwe"),
  );
  ok(
    "één verbetering krijgt een eigen zin, geen 'alle 1'",
    describeActionRatio(lijst(0, 1))!.includes("De ene aanbeveling verbetert"),
  );
  ok(
    "meerdere verbeteringen gebruiken wel 'alle', met het telwoord voluit",
    describeActionRatio(lijst(0, 2))!.includes("Alle twee aanbevelingen verbeteren"),
  );

  // ⚠️ Het randgeval van punt 7 (docs/tasks/opdracht-bevindingen-5-tot-9.md):
  // "1 van de 6 aanbevelingen zijn nieuwe pagina's, de andere 5 verbeteren"
  // was dubbel fout Nederlands ("1 ... zijn" en "de andere 1 verbeteren" bij
  // precies één aan een kant). Deze lus draait alle combinaties van 0 tot en
  // met 3 aan beide kanten, plus de twee genoemde randgevallen 1 op 7 en 7 op
  // 1, en controleert bij elke uitkomst dat geen van beide fouten erin zit.
  for (let nieuw = 0; nieuw <= 3; nieuw++) {
    for (let verbeteren = 0; verbeteren <= 3; verbeteren++) {
      const zin = describeActionRatio(lijst(nieuw, verbeteren));
      if (nieuw === 0 && verbeteren === 0) {
        ok(`0 nieuw en 0 verbeteren levert geen zin op`, zin === null);
        continue;
      }
      ok(`${nieuw} nieuw, ${verbeteren} verbeteren is een lopende zin`, typeof zin === "string" && zin.length > 0);
      ok(
        `${nieuw} nieuw, ${verbeteren} verbeteren zegt nergens "1 ... zijn"`,
        !/\b1\b[^.]*\bzijn\b/.test(zin ?? ""),
        zin ?? "",
      );
      ok(
        `${nieuw} nieuw, ${verbeteren} verbeteren zegt nergens "de andere 1 verbeteren"`,
        !(zin ?? "").includes("de andere 1 verbeteren"),
        zin ?? "",
      );
    }
  }
  for (const [nieuw, verbeteren] of [
    [1, 6],
    [6, 1],
  ] as const) {
    const zin = describeActionRatio(lijst(nieuw, verbeteren))!;
    ok(
      `${nieuw} op ${verbeteren} is een lopende zin zonder "1 ... zijn" of "de andere 1 verbeteren"`,
      !/\b1\b[^.]*\bzijn\b/.test(zin) && !zin.includes("de andere 1 verbeteren"),
      zin,
    );
  }

  const eenOpZes = describeActionRatio(lijst(1, 5))!;
  ok(
    "één nieuw op vijf verbeteren: 'Eén' en 'is', geen '1' en geen 'zijn'",
    eenOpZes.startsWith("Eén van de zes aanbevelingen is een nieuwe pagina"),
    eenOpZes,
  );
  const vijfOpEen = describeActionRatio(lijst(5, 1))!;
  ok(
    "vijf nieuw op één verbeteren: 'de andere verbetert', geen 'de andere 1'",
    vijfOpEen.includes("de andere verbetert een bestaande pagina"),
    vijfOpEen,
  );
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

// docs/tasks/funnelfase-nooit-gevuld.md: de fase van een geplande pagina komt
// uit zijn doelvragen. Op productie (23 september 2026) gaf dat 32 van de 42
// pagina's een fase; de andere tien hebben een gelijkspel en blijven leeg.
group("faseVoorPagina: de fase komt uit de doelvragen", () => {
  const fasen = [
    { id: "f-ori", label: "Oriëntatie" },
    { id: "f-verg", label: "Vergelijken" },
    { id: "f-kies", label: "Kiezen" },
    { id: "f-blijf", label: "Klant blijven" },
  ];
  ok("Oriëntatie op gelijke naam", faseVoorPagina([{ category: "Oriëntatie", weight: 1 }], fasen) === "f-ori");
  ok("Overweging wordt Vergelijken", faseVoorPagina([{ category: "Overweging", weight: 1 }], fasen) === "f-verg");
  ok("Beslissing wordt Kiezen", faseVoorPagina([{ category: "Beslissing", weight: 1 }], fasen) === "f-kies");
  ok(
    "het grootste gewicht wint, niet het grootste aantal",
    faseVoorPagina(
      [
        { category: "Oriëntatie", weight: 0.2 },
        { category: "Oriëntatie", weight: 0.2 },
        { category: "Beslissing", weight: 0.9 },
      ],
      fasen,
    ) === "f-kies",
  );
  ok(
    "zonder gewicht telt een vraag als 1",
    faseVoorPagina(
      [
        { category: "Overweging", weight: null },
        { category: "Overweging", weight: null },
        { category: "Beslissing", weight: null },
      ],
      fasen,
    ) === "f-verg",
  );
  ok(
    "gelijkspel geeft geen fase, geen gok",
    faseVoorPagina(
      [
        { category: "Overweging", weight: 0.5 },
        { category: "Beslissing", weight: 0.5 },
      ],
      fasen,
    ) === null,
  );
  ok("geen doelvragen geeft geen fase", faseVoorPagina([], fasen) === null);
  ok("een vraag zonder fase telt niet mee", faseVoorPagina([{ category: "", weight: 1 }], fasen) === null);
  ok("een merk zonder fasen geeft geen fase", faseVoorPagina([{ category: "Beslissing", weight: 1 }], []) === null);
  ok(
    "een eigen merkfase met dezelfde naam als de vraagfase gaat voor",
    faseVoorPagina([{ category: "Overweging", weight: 1 }], [{ id: "eigen", label: "overweging" }, ...fasen]) === "eigen",
  );
  ok("een onbekende vraagfase geeft geen fase", faseVoorPagina([{ category: "Nazorg", weight: 1 }], fasen) === null);
});

// Bevinding 2 van de verificatie van 22 september 2026: de klant zag bij de
// nameting alleen het woord, niet de vergelijking met de controlegroep. De
// uitleg moet de opgeslagen aantallen tonen, en mag het oordeel nooit
// tegenspreken, ook niet als de controlegroep evenveel of harder bewoog.
group("impactUitleg: het oordeel met de cijfers eronder", () => {
  function rij(d: Partial<ImpactCijfers>): ImpactCijfers {
    const basis = {
      wave: 2,
      target_total: 20,
      target_before_mentioned: 2,
      target_after_mentioned: 14,
      control_total: 5,
      control_before_mentioned: 1,
      control_after_mentioned: 1,
      target_delta: null,
      control_delta: null,
      delta_threshold: null,
      verdict: "gestegen" as const,
    };
    const r = { ...basis, ...d };
    return { ...r, verdict: d.verdict ?? verdictOf({ total: r.target_total, beforeMentioned: r.target_before_mentioned, afterMentioned: r.target_after_mentioned }) };
  }

  const stijging = impactUitleg(rij({}));
  ok("de doelvragen staan er in aantallen", stijging.doel.includes("Van de 20 vragen") && stijging.doel.includes("2, nu 14"), stijging.doel);
  ok("de controlegroep staat ernaast", stijging.controle?.includes("Bij 5 vergelijkbare vragen") === true, stijging.controle ?? "");
  ok("golf 2 is 28 dagen", stijging.moment === "Gemeten 28 dagen na publicatie.");
  ok("de tabelcel krijgt de korte versie", stijging.kort === "2 → 14 van 20 vragen", stijging.kort);
  ok(
    "controlegroep stil: het verschil zit bij de pagina",
    stijging.conclusie.includes("stijging van 60 procentpunt") && stijging.conclusie.includes("het verschil zit bij de vragen waarvoor"),
    stijging.conclusie,
  );

  const allesSteeg = impactUitleg(rij({ control_before_mentioned: 0, control_after_mentioned: 4 }));
  ok(
    "controlegroep steeg net zo hard: dan niet door de pagina",
    allesSteeg.conclusie.includes("waarschijnlijk niet door de pagina zelf"),
    allesSteeg.conclusie,
  );
  const controleHarder = impactUitleg(rij({ control_before_mentioned: 0, control_after_mentioned: 5 }));
  ok(
    "controlegroep steeg HARDER dan de doelvragen: ook niet door de pagina",
    controleHarder.conclusie.includes("waarschijnlijk niet door de pagina zelf"),
    controleHarder.conclusie,
  );

  const zonderControle = impactUitleg(rij({ control_total: 0, control_before_mentioned: 0, control_after_mentioned: 0 }));
  ok("zonder controlegroep: geen controlezin", zonderControle.controle === null);
  ok("en dat staat dan eerlijk in de conclusie", zonderControle.conclusie.includes("geen controlegroep"), zonderControle.conclusie);

  const daling = impactUitleg(rij({ target_before_mentioned: 14, target_after_mentioned: 2 }));
  ok("een daling leest zonder dubbel minteken", daling.conclusie.includes("daling van 60 procentpunt"), daling.conclusie);

  // Huyberts Eindhoven: 0 naar 1 van de 5 is "gelijk", met 25 vragen nodig.
  const eindhoven = impactUitleg(rij({ target_total: 5, target_before_mentioned: 0, target_after_mentioned: 1 }));
  ok(
    "gelijk: binnen de meetruis, met het aantal vragen dat nodig zou zijn",
    eindhoven.conclusie.includes("+20 procentpunt") && eindhoven.conclusie.includes("ongeveer 25 vragen"),
    eindhoven.conclusie,
  );

  const weinig = impactUitleg(rij({ target_total: 1, target_before_mentioned: 0, target_after_mentioned: 1 }));
  ok("te weinig data zegt hoeveel er nodig zijn", weinig.conclusie.includes("minstens 2 vragen") && weinig.conclusie.includes("Het waren er 1"), weinig.conclusie);
  ok("één vraag is enkelvoud", weinig.kort === "0 → 1 van 1 vraag", weinig.kort);

  // De opgeslagen waarden zijn leidend, niet een herberekening.
  const opgeslagen = impactUitleg(rij({ target_delta: 55, delta_threshold: 12 }));
  ok("opgeslagen delta en marge gaan voor", opgeslagen.conclusie.includes("stijging van 55") && opgeslagen.conclusie.includes("de 12 procentpunt"), opgeslagen.conclusie);

  const allesTekst = [stijging, allesSteeg, zonderControle, daling, eindhoven, weinig]
    .flatMap((u) => [u.doel, u.controle ?? "", u.conclusie, u.moment, u.kort])
    .join(" ");
  ok("geen gedachtestreepjes in de uitleg", !/[—–]/.test(allesTekst));
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

// 23 september 2026: de zinnen van een verbeterpunt staan gemarkeerd in de
// leestekst, en de lijst ernaast springt ernaartoe. Een markering op de
// verkeerde plek of een kapotte tag is erger dan geen markering.
group("markeerZinnen: verbeterpunten in de leestekst", () => {
  const html = '<p>Wij leveren binnen 24 uur. Bel ons op &quot;werkdagen&quot; voor een offerte.</p><p><a href="/binnen-24-uur-geleverd">link</a></p>';
  const uit = markeerZinnen(html, [
    "Wij leveren binnen 24 uur.",
    '"Bel ons op "werkdagen" voor een offerte."',
    "Deze zin staat er niet in.",
    "Ja.",
  ]);
  ok("gevonden zinnen krijgen een markering", uit.html.includes('<mark class="tekst-punt" id="punt-0">Wij leveren binnen 24 uur.</mark>'));
  ok("aanhalingstekens in de zin volgen de escaping van de renderer", uit.html.includes('id="punt-1">Bel ons op &quot;werkdagen&quot; voor een offerte.</mark>'));
  ok("per zin of hij gevonden is", JSON.stringify(uit.gevonden) === "[true,true,false,false]");
  ok("een te kort stuk wordt niet gemarkeerd", !uit.html.includes('id="punt-3"'));
  const inHref = markeerZinnen('<a href="/binnen-24-uur-geleverd-vandaag">binnen-24-uur-geleverd-vandaag</a>', ["binnen-24-uur-geleverd-vandaag"]);
  ok("nooit binnen een tag", inHref.html.startsWith('<a href="/binnen-24-uur-geleverd-vandaag"><mark'));
  const dubbel = markeerZinnen("<p>Onderhoud in zes werkplaatsen.</p>", ["Onderhoud in zes werkplaatsen.", "Onderhoud in zes werkplaatsen."]);
  ok("dezelfde zin twee keer: de tweede nestelt niet in de eerste", (dubbel.html.match(/<mark/g) ?? []).length === 1 && dubbel.gevonden[1] === false);
  const bron = "## Kop\n\nWij leveren binnen 24 uur. En meer.";
  const plek = zinInBron(bron, "Wij leveren binnen 24 uur.");
  ok("zinInBron vindt de plek in de markdown", plek !== null && bron.slice(plek.begin, plek.eind) === "Wij leveren binnen 24 uur.");
  ok("zinInBron geeft null bij een onbekende zin", zinInBron(bron, "Niet aanwezig in de tekst.") === null);
});

group("renderMarkdown en de WordPress-export herkennen een tabel", () => {
  const md = "Inleiding.\n\n| Bedrijfswagen | Vanafprijs |\n|---|---:|\n| Caddy Cargo | € 359 |\n| Crafter | € 589 |\n\nNa de tabel.";
  const html = renderMarkdown(md);
  ok("een tabel wordt een tabel", html.includes("<table><thead><tr><th>Bedrijfswagen</th><th>Vanafprijs</th></tr></thead>"));
  ok("met alle rijen", html.includes("<tr><td>Caddy Cargo</td><td>€ 359</td></tr><tr><td>Crafter</td><td>€ 589</td></tr>"));
  ok("en de alinea erna blijft een alinea", html.includes("<p>Na de tabel.</p>"));
  ok("geen streepjes meer in de tekst", !html.includes("|---"));
  ok("zonder scheidingsregel is het geen tabel", !renderMarkdown("| dit | is een zin |").includes("<table"));
  const wp = markdownToGutenbergBlocks(md);
  ok("de export zet hem in een tabelblok", wp.includes("<!-- wp:table -->") && wp.includes("<td>Crafter</td>"));
});

group("bibliotheek: tegels en chips tellen dezelfde stand", () => {
  const vandaag = "2026-09-23";
  const mk = (naam: string, i: Partial<PaginaStandInput>) => ({
    naam,
    cluster: "Wagenparkbeheer",
    stand: paginaStand({ plan: null, tekst: null, openVragen: 0, vandaag, ...i }),
  });
  const tekst = (status: string, needs_review = false) => ({ status, needs_review, voorbereid: true });
  const rijen = [
    mk("Maandprijs", { tekst: tekst("ready", true) }),
    mk("Wagenparkbeheer", { tekst: tekst("ready", true) }),
    mk("Kosten", { plan: { status: "gepland", scheduled_for: "2026-10-20", maandVrij: true }, tekst: tekst("briefing"), openVragen: 2 }),
    mk("APK", { plan: { status: "schrijven", scheduled_for: "2026-09-26", maandVrij: true } }),
    mk("Live", { tekst: tekst("published") }),
    mk("Weg", { plan: { status: "afgewezen", scheduled_for: null, maandVrij: true } }),
  ];
  const t = tellingen(rijen);
  // Van den Udenhout, 23 september 2026: "Klaar voor vrijgave 0" boven twee
  // rijen die op vrijgave wachtten.
  ok("wat op jou wacht telt de twee teksten en de vragen", t.wacht === 3);
  ok("wordt binnenkort geschreven", t.binnenkort === 1);
  ok("staat live", t.live === 1);
  ok("vervallen telt nergens", groepVan(rijen[5].stand) === null);
  ok("filter op status", filterPaginas(rijen, { ...LEEG_FILTER, status: "goedkeuren" }).length === 2);
  ok("zoeken op naam", filterPaginas(rijen, { ...LEEG_FILTER, zoek: "maandprijs" }).length === 1);
  ok("zoeken op cluster", filterPaginas(rijen, { ...LEEG_FILTER, zoek: "wagenpark" }).length === 5);
  const soorten = [
    { naam: "A", cluster: "X", clusterId: "c1", soort: "Artikel", actie: "nieuw", stand: rijen[0].stand },
    { naam: "B", cluster: "Y", clusterId: "c2", soort: "Landingspagina", actie: "verbeteren", stand: rijen[0].stand },
  ];
  ok("filter op content", filterPaginas(soorten, { ...LEEG_FILTER, soort: "Artikel" }).length === 1);
  ok("filter op type", filterPaginas(soorten, { ...LEEG_FILTER, actie: "verbeteren" })[0]?.naam === "B");
  ok("filter op cluster", filterPaginas(soorten, { ...LEEG_FILTER, cluster: "c2" }).length === 1);
  ok("vervallen staat niet in de keuzes", !filterKeuzes(rijen).status.some(([k]) => k === "vervallen"));

  // Avond 23 september 2026: elke pagina staat op het contentplan of in de
  // bibliotheek. Alleen een pagina in een maand die nog niet vrij is, staat
  // alleen in het plan; alleen vervallen staat nergens.
  const alleStanden = [
    mk("gepland", { plan: { status: "gepland", scheduled_for: "2026-12-01", maandVrij: false } }),
    mk("volgt", { plan: { status: "gepland", scheduled_for: "2026-10-20", maandVrij: true } }),
    mk("voorbereid", { plan: { status: "gepland", scheduled_for: "2026-10-20", maandVrij: true }, tekst: { status: "briefing", needs_review: false, voorbereid: false } }),
    mk("datum", { plan: { status: "gepland", scheduled_for: "2026-11-20", maandVrij: true }, tekst: tekst("briefing") }),
    mk("zonder plan", { tekst: tekst("briefing") }),
    mk("mislukt", { plan: { status: "mislukt", scheduled_for: "2026-10-20", maandVrij: true } }),
  ];
  ok("maand niet vrij: alleen in het contentplan", groepVan(alleStanden[0].stand) === null);
  const losZonderCluster = mk("apk", { plan: { status: "gepland", scheduled_for: "2026-09-26", maandVrij: true, onderwerp: false } });
  ok(
    "zonder cluster: geen belofte van morgenochtend (Van den Udenhout, APK-pagina)",
    losZonderCluster.stand.label === "Geen cluster" &&
      !statusRegel({ stand: losZonderCluster.stand, openVragen: 0, datum: null }).includes("morgenochtend"),
  );
  ok("zonder cluster staat hij toch in de bibliotheek", groepVan(losZonderCluster.stand) === "binnenkort");
  ok(
    "al het andere wordt binnenkort geschreven, ook zonder plek in het plan",
    alleStanden.slice(1).every((r) => groepVan(r.stand) === "binnenkort"),
    alleStanden.map((r) => `${r.naam}:${r.stand.sleutel}:${groepVan(r.stand)}`).join(", "),
  );
  ok(
    "vragen: het aantal in de zin",
    statusRegel({ stand: rijen[2].stand, openVragen: 5, datum: "2026-10-20" }) ===
      "5 openstaande vragen om de pagina te kunnen schrijven",
  );
  ok("één vraag: enkelvoud", statusRegel({ stand: rijen[2].stand, openVragen: 1, datum: null }).startsWith("1 openstaande vraag "));
  ok(
    "alles bekend: de schrijfdatum, tien dagen voor de publicatie",
    statusRegel({ stand: alleStanden[3].stand, openVragen: 0, datum: "2026-11-20" }) ===
      "Alle gegevens bekend, wordt op 10 november geschreven",
  );
  ok(
    "nog niet voorbereid: geen belofte van minuten",
    statusRegel({ stand: alleStanden[1].stand, openVragen: 0, datum: null }).includes("morgenochtend"),
  );
  ok(
    "geen regel zonder tekst, en zonder gedachtestreepje",
    [...rijen, ...alleStanden].every((r) => {
      const z = statusRegel({ stand: r.stand, openVragen: 2, datum: "2026-11-20" });
      return z.length > 0 && !/[\u2013\u2014]/.test(z);
    }),
  );
  // Twee teksten van dezelfde soort gaven Status, Content en Type elk één
  // keuze, en dan stond het filter uit: "de filters doen het niet".
  ok(
    "een filter met één keuze staat niet uit",
    !leesBestand("app/(app)/merk/[id]/strategie/bibliotheek/library-view.tsx").includes("opties.length < 2"),
  );
});

group("paginaNaam: één naam per pagina, overal", () => {
  ok(
    "zoektitel zonder merk",
    paginaNaam({ title: "Maak één pagina", meta_title: "Bedrijfswagen leasen vanaf € 359 p/m | Van den Udenhout" }) ===
      "Bedrijfswagen leasen vanaf € 359 p/m",
  );
  ok("zoektitel zonder merkdeel blijft heel", paginaNaam({ title: "x", meta_title: "Wagenparkbeheer in Brabant" }) === "Wagenparkbeheer in Brabant");
  ok("zonder zoektitel de opdracht", paginaNaam({ title: "Leg helder uit wat het kost", meta_title: null }) === "Leg helder uit wat het kost");
  ok("lege zoektitel telt niet", paginaNaam({ title: "Opdracht", meta_title: "  " }) === "Opdracht");
  ok("nooit leeg", paginaNaam({ title: " " }) === "Pagina zonder titel");
});

// contentflow-een-lijn.md fase C: één stand per pagina, uit twee rijen.
group("paginaStand: elke combinatie geeft precies één stand", () => {
  const vandaag = "2026-09-23";
  const plan = (status: string, maandVrij = true, scheduled_for = "2026-10-20") =>
    ({ status, scheduled_for, maandVrij }) as PaginaStandInput["plan"];
  const tekst = (status: string, extra: Partial<NonNullable<PaginaStandInput["tekst"]>> = {}) => ({
    status,
    needs_review: false,
    voorbereid: true,
    ...extra,
  });
  const st = (i: Partial<PaginaStandInput>) =>
    paginaStand({ plan: null, tekst: null, openVragen: 0, vandaag, ...i });

  ok("maand niet vrij: gepland", st({ plan: plan("gepland", false) }).sleutel === "gepland");
  // Van den Udenhout, 23 september 2026: vijf pagina's zonder rij en zonder
  // taak zeiden "Dat duurt een paar minuten".
  const nietGestart = st({ plan: plan("gepland") });
  ok(
    "maand vrij, nog geen rij: voorbereiding volgt, geen belofte van minuten",
    nietGestart.sleutel === "voorbereiden" && nietGestart.label === "Voorbereiding volgt" && !nietGestart.zin.includes("minuten"),
  );
  const gestart = st({ plan: plan("gepland"), tekst: tekst("briefing", { voorbereid: false }) });
  ok(
    "rij zonder vragen-snapshot: wordt voorbereid",
    gestart.sleutel === "voorbereiden" && gestart.label === "Wordt voorbereid",
  );
  ok("voorbereiden heeft geen eigen scherm", !heeftEigenScherm("voorbereiden") && !heeftEigenScherm("niet_ingepland"));
  ok("vragen wel", heeftEigenScherm("vragen"));
  ok("tekst om te lezen wel", heeftEigenScherm("goedkeuren") && heeftEigenScherm("effect_bekend"));
  const vragen = st({ plan: plan("gepland"), tekst: tekst("briefing"), openVragen: 3 });
  ok("open vragen: jouw antwoorden nodig", vragen.sleutel === "vragen" && vragen.aanZet === "klant");
  ok("met de handeling erbij", vragen.handeling === "Beantwoord 3 vragen");
  ok("en de streefdatum 12 dagen voor de datum", vragen.streefdatum === "2026-10-08" && vragen.zin.includes("8 oktober"));
  const achter = st({ plan: plan("gepland", true, "2026-09-28"), tekst: tekst("briefing"), openVragen: 1 });
  ok("streefdatum voorbij: loopt achter", achter.looptAchter && achter.zin.includes("loopt achter"));
  // Het geval 9332a0fb bij Van den Udenhout: alles beantwoord, stond drie dagen op
  // "Wacht op jouw input".
  const udenhout = st({ plan: plan("gepland", true, "2026-09-28"), tekst: tekst("briefing"), openVragen: 0 });
  ok("alles beantwoord is nooit 'wacht op jou' (Van den Udenhout)", udenhout.aanZet !== "klant" && udenhout.sleutel === "schrijven");
  const vroeg = st({ plan: plan("gepland", true, "2026-11-20"), tekst: tekst("briefing"), openVragen: 0 });
  ok("alles gedaan, datum ver weg: wacht op de schrijfdatum", vroeg.sleutel === "wacht_op_datum" && vroeg.zin.includes("10 november"));
  ok(
    "oude route zonder plan, alles gedaan: niet ingepland, nooit 'wordt geschreven'",
    st({ tekst: tekst("briefing"), openVragen: 0 }).sleutel === "niet_ingepland",
  );
  ok("plan schrijft: wordt geschreven", st({ plan: plan("schrijven"), tekst: tekst("briefing") }).sleutel === "schrijven");
  // Het geval c4db492e: 'ready' met needs_review, bibliotheek zei "Klaar om te publiceren".
  const nakijken = st({ tekst: tekst("ready", { needs_review: true }) });
  ok("klaar maar niet goedgekeurd: lees en keur goed", nakijken.sleutel === "goedkeuren" && nakijken.handeling === "Keur goed");
  ok("goedgekeurd: zet hem live", st({ tekst: tekst("ready") }).sleutel === "live_zetten");
  ok("plan goedgekeurd telt ook", st({ plan: plan("goedgekeurd"), tekst: tekst("ready", { needs_review: true }) }).sleutel === "live_zetten");
  ok("plan ter goedkeuring: keur goed", st({ plan: plan("ter_goedkeuring"), tekst: tekst("ready", { needs_review: true }) }).sleutel === "goedkeuren");
  ok("gepubliceerd: staat live", st({ tekst: tekst("published") }).sleutel === "effect_meten");
  ok("plan geplaatst telt ook als live", st({ plan: plan("geplaatst") }).sleutel === "effect_meten");
  ok("met oordeel: effect bekend", st({ tekst: tekst("published"), effectBekend: true }).sleutel === "effect_bekend");
  ok("mislukt", st({ plan: plan("mislukt") }).sleutel === "mislukt");
  ok("afgewezen vervalt", st({ plan: plan("afgewezen"), tekst: tekst("ready") }).fase === null);
  ok("vijf fasen, niet acht", FASEN.length === 5);
  ok("stand streefdatum zonder datum is onbekend", streefdatum(null) === null);

  // Precies één hoofdhandeling: alleen als de klant aan zet is.
  const alle = [vragen, achter, udenhout, vroeg, nakijken, st({ tekst: tekst("ready") }), st({ tekst: tekst("published") })];
  ok("een handeling alleen als de klant aan zet is", alle.every((a) => (a.aanZet === "klant") === (a.handeling !== null)));
  ok("wat achterloopt komt bovenaan", standVolgorde(achter) < standVolgorde(vragen) && standVolgorde(vragen) < standVolgorde(udenhout));
  ok("geen gedachtestreepje of en/of", !alle.some((a) => /[—–]|en\/of/.test(a.zin + a.label)));
});

// contentflow-een-lijn.md fase A: het contentplan vraagt om een pad, de
// nameting heeft een volledig adres nodig.
group("volledigAdres maakt van een pad uit het plan een echt adres", () => {
  ok("pad met slash", volledigAdres("/diensten/apk", "https://udenhout.nl") === "https://udenhout.nl/diensten/apk");
  ok("pad zonder slash", volledigAdres("diensten/apk", "udenhout.nl") === "https://udenhout.nl/diensten/apk");
  ok("www van het merk blijft", volledigAdres("/x", "https://www.udenhout.nl/") === "https://www.udenhout.nl/x");
  ok("heel adres blijft heel", volledigAdres("https://udenhout.nl/x", null) === "https://udenhout.nl/x");
  ok("adres zonder schema krijgt https", volledigAdres("udenhout.nl/x", null) === "https://udenhout.nl/x");
  ok("pad zonder merk is onbekend, geen gok", volledigAdres("/x", null) === null);
  ok("spaties zijn geen adres", volledigAdres("/mijn pagina", "udenhout.nl") === null);
  ok("leeg is onbekend", volledigAdres("  ", "udenhout.nl") === null);
});

group("publiceren mag alleen op het domein van het merk (T3.1)", () => {
  ok("hetzelfde domein mag", isOnBrandDomain("https://voorbeeld.nl/pagina", "voorbeeld.nl"));
  ok("www telt niet als ander domein", isOnBrandDomain("https://www.voorbeeld.nl/pagina", "voorbeeld.nl"));
  ok(
    "en andersom: het merk staat met www, de pagina niet",
    isOnBrandDomain("https://voorbeeld.nl/pagina", "www.voorbeeld.nl"),
  );
  ok("een subdomein van het merk mag", isOnBrandDomain("https://blog.voorbeeld.nl/pagina", "voorbeeld.nl"));

  ok("een heel ander domein mag niet", !isOnBrandDomain("https://www.example.com/", "voorbeeld.nl"));
  ok(
    "een domein dat het merk alleen als achtervoegsel bevat mag niet",
    !isOnBrandDomain("https://nietvoorbeeld.nl", "voorbeeld.nl"),
  );
  ok(
    "een domein dat het merk als voorvoegsel misbruikt mag niet",
    !isOnBrandDomain("https://voorbeeld.nl.evil.com", "voorbeeld.nl"),
  );
  ok("zonder bekend merkdomein mag niets", !isOnBrandDomain("https://voorbeeld.nl", ""));
});

// Bevinding 1 van de verificatie van 22 september 2026: de publicatiecontrole
// zag nooit dat een link doorstuurde. Wat telt als "een andere pagina", en wat
// alleen een schrijfverschil is van hetzelfde adres.
group("isRedirectedElsewhere: doorgestuurd naar een andere pagina?", () => {
  ok("hetzelfde adres is geen doorverwijzing", !isRedirectedElsewhere("https://voorbeeld.nl/a", "https://voorbeeld.nl/a"));
  ok("http naar https is geen doorverwijzing", !isRedirectedElsewhere("http://voorbeeld.nl/a", "https://voorbeeld.nl/a"));
  ok("www erbij is geen doorverwijzing", !isRedirectedElsewhere("https://voorbeeld.nl/a", "https://www.voorbeeld.nl/a"));
  ok("een slash aan het eind is geen doorverwijzing", !isRedirectedElsewhere("https://voorbeeld.nl/a", "https://voorbeeld.nl/a/"));
  ok("trackingcodes erachter zijn geen doorverwijzing", !isRedirectedElsewhere("https://voorbeeld.nl/a", "https://voorbeeld.nl/a?utm_source=x#top"));
  ok("hoofdletters zijn geen doorverwijzing", !isRedirectedElsewhere("https://Voorbeeld.nl/A", "https://voorbeeld.nl/a"));
  ok("een ander pad is wel een doorverwijzing", isRedirectedElsewhere("https://voorbeeld.nl/oud", "https://voorbeeld.nl/nieuw"));
  ok("naar de homepage is wel een doorverwijzing", isRedirectedElsewhere("https://voorbeeld.nl/verlopen", "https://voorbeeld.nl/"));
  ok("naar een ander domein is wel een doorverwijzing", isRedirectedElsewhere("https://voorbeeld.nl/a", "https://ander.nl/a"));
  ok("een onleesbaar adres is onbekend, geen doorverwijzing", !isRedirectedElsewhere("https://voorbeeld.nl/a", ""));
});

// De domeincontrole en de needs_review-blokkade zitten in de route zelf (niet
// in een pure functie): een Next.js routehandler met `getUser()`/cookies is in
// deze codebase niet los te draaien in een test, dus deze bedrading wordt
// gelezen, net als bij de `mayTriggerCost`-controles (T4).
group("de publiceerroute weigert een fout domein en een pagina die nog nagekeken moet worden (T3.1/T3.3)", () => {
  const route = leesBestand("app/api/analyses/[id]/content/[pieceId]/publish/route.ts");
  ok("de route kent het profiel op via de analyse", route.includes("analysis.profile_id"));
  ok("en toetst het adres aan het domein van het merk", route.includes("isOnBrandDomain(url, brandUrl)"));
  ok(
    "een pagina die nog nagekeken moet worden wordt geweigerd, vóór de domeincontrole",
    route.indexOf("piece.needs_review") < route.indexOf("isOnBrandDomain("),
  );
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
group("Gerichte fact-finding bij algemene context-gaten (S9, gesprek 1 september)", () => {
  ok(
    "zonder gaten valt hij terug op de generieke vuistregel",
    buildFactFindingAddendum([]).includes("weinig geverifieerde feiten"),
  );

  const gericht = buildFactFindingAddendum([
    { term: "ISO 9001", reason: "de pagina noemt het keurmerk zonder uit te leggen wat het inhoudt" },
  ]);
  ok("met gaten wordt de term letterlijk genoemd", gericht.includes("ISO 9001"));
  ok("de reden gaat mee", gericht.includes("zonder uit te leggen wat het inhoudt"));
  ok(
    "de generieke vuistregel blijft weg zodra er gerichte gaten zijn",
    !gericht.includes("weinig geverifieerde feiten"),
  );
  ok(
    "de muur blijft staan: nooit een bewering over dit bedrijf",
    gericht.includes("bewering over dit specifieke bedrijf") ||
      gericht.includes("nooit een bewering over dit specifieke bedrijf"),
  );

  const tweeGaten = buildFactFindingAddendum([
    { term: "ISO 9001", reason: "reden A" },
    { term: "Keurmerk Stichting X", reason: "reden B" },
  ]);
  ok("twee gaten leveren twee genoemde termen op", tweeGaten.includes("ISO 9001") && tweeGaten.includes("Keurmerk Stichting X"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nZinnen en markdown (S3, gedeelde basis)");

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

group("de concurrentielat per aanbeveling herrangschikken (S10)", () => {
  // Het cluster loopt uiteen: één aanbeveling over levertijd, één over
  // certificeringen. Beide eigenschappen komen uit dezelfde analyse.
  const termenLevertijd = topicTerms("Levert u ook binnen 24 uur?");
  const termenCertificering = topicTerms("Wat houdt het ISO 9001-keurmerk in?");

  const levertijd = { attribute: "levertijd", evidence: "Levert altijd binnen 24 uur, ook in het weekend." };
  const certificering = { attribute: "certificering", evidence: "Werkt met een ISO 9001-gecertificeerd proces." };

  ok(
    "de levertijdpagina scoort de levertijd-eigenschap hoger",
    scoreTermOverlap(`${levertijd.attribute} ${levertijd.evidence}`, termenLevertijd) >
      scoreTermOverlap(`${certificering.attribute} ${certificering.evidence}`, termenLevertijd),
  );
  ok(
    "de certificeringspagina scoort de certificering-eigenschap hoger",
    scoreTermOverlap(`${certificering.attribute} ${certificering.evidence}`, termenCertificering) >
      scoreTermOverlap(`${levertijd.attribute} ${levertijd.evidence}`, termenCertificering),
  );
  ok("zonder doelvragen levert niets een voorsprong op", scoreTermOverlap(levertijd.evidence, []) === 0);
});


// ════════════════════════════════════════════════════════════════════════════
console.log("\nSitetekst atomiseren: het vangnet (S1)");


// ════════════════════════════════════════════════════════════════════════════
console.log("\nWelke zinnen zijn een bewering? (S3)");


// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe positioneringsvraag en de reservering (S4)");

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

// ════════════════════════════════════════════════════════════════════════════
console.log("\nModelparameters en kosten (GPT-5.6-overstap, augustus 2026)");

group("welk model redeneert", () => {
  ok("luna", isReasoningModel("gpt-5.6-luna"));
  ok("sol", isReasoningModel("gpt-5.6-sol"));
  ok("terra", isReasoningModel("gpt-5.6-terra"));
  ok("o3", isReasoningModel("o3-mini"));
  ok("gpt-4.1 niet", !isReasoningModel("gpt-4.1"));
  ok("gpt-4.1-nano niet", !isReasoningModel("gpt-4.1-nano"));
  // Tot 23 september 2026 herkende de regel alleen `gpt-5`, en viel GPT-6 in de
  // tak voor oude modellen: geen redeneerinspanning mee, alles op `medium`.
  ok("gpt-6 luna", isReasoningModel("gpt-6-luna"));
  ok("gpt-6 sol", isReasoningModel("gpt-6-sol"));
  ok("een latere generatie ook", isReasoningModel("gpt-7-sol"));
  ok("maar gpt-4o niet", !isReasoningModel("gpt-4o"));
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

  // Het beoordelaarspanel (A5): hetzelfde goedkope model als classificeren,
  // maar mét redeneertijd. Gaat dit stuk, dan beoordeelt de goedkoopste stand
  // van het goedkoopste model weer het duurste product van de app.
  const jud = resolveTuning(MODELS.quality, "judging");
  ok("beoordelen krijgt redeneertijd", jud.reasoningEffort === "medium");
  ok("en dus geen temperatuur", jud.temperature === undefined);

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
  ok("terra staat in de tabel", hasKnownRate("gpt-5.6-terra"));
  ok("gpt-4.1 blijft narekenbaar", hasKnownRate("gpt-4.1"));
  ok("elke tier van de app heeft een tarief", Object.values(MODELS).every(hasKnownRate));

  // GPT-6, prijzen van 23 september 2026. Zonder deze regels valt elke aanroep
  // op de terugval van $5/$30: een kostenoverzicht tot tien keer te hoog.
  const luna6 = estimateCostUsd({ model: "gpt-6-luna", inputTokens: 1e6, outputTokens: 1e6, webSearch: false });
  ok("gpt-6 luna 1M+1M = $0,60", Math.abs(luna6 - 0.6) < 1e-6, `${luna6}`);
  const sol6 = estimateCostUsd({ model: "gpt-6-sol", inputTokens: 1e6, outputTokens: 1e6, webSearch: false });
  ok("gpt-6 sol 1M+1M = $12", Math.abs(sol6 - 12) < 1e-6, `${sol6}`);
  const zoek6 = estimateCostUsd({ model: "gpt-6-luna", inputTokens: 0, outputTokens: 0, webSearch: true });
  ok("zoekactie op gpt-6 luna = $0,010", Math.abs(zoek6 - 0.01) < 1e-6, `${zoek6}`);

  // 1M in + 1M uit op Luna = $0,20 + $1,20.
  const luna = estimateCostUsd({ model: "gpt-5.6-luna", inputTokens: 1e6, outputTokens: 1e6, webSearch: false });
  ok("luna 1M+1M = $1,40", Math.abs(luna - 1.4) < 1e-6, `${luna}`);

  const sol = estimateCostUsd({ model: "gpt-5.6-sol", inputTokens: 1e6, outputTokens: 1e6, webSearch: false });
  ok("sol 1M+1M = $35", Math.abs(sol - 35) < 1e-6, `${sol}`);

  const terra = estimateCostUsd({ model: "gpt-5.6-terra", inputTokens: 1e6, outputTokens: 1e6, webSearch: false });
  ok("terra 1M+1M = $14", Math.abs(terra - 14) < 1e-6, `${terra}`);

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

/**
 * De contenttier is de duurste post van de hele app en de enige stap waarvan de
 * klant de uitkomst publiceert. Sinds 4 september 2026 staat hij op Terra in
 * plaats van Sol. Deze groep legt die keuze vast met de nagerekende cijfers uit
 * `ai_calls`, zodat een terugval naar Sol niet stil gebeurt maar een rode test
 * oplevert die uitlegt wat het kost.
 */
group("de contenttier: van Sol naar Terra (4 september 2026)", () => {

  // Gemeten op ai_calls over de twaalf pagina's van 3 september 2026:
  // content_draft 15.845 invoer / 5.925 uitvoer, mét web_search ($0,01).
  const draftSol = estimateCostUsd({
    model: "gpt-5.6-sol",
    inputTokens: 15_845,
    outputTokens: 5_925,
    webSearch: true,
  });
  const draftTerra = estimateCostUsd({
    model: "gpt-5.6-terra",
    inputTokens: 15_845,
    outputTokens: 5_925,
    webSearch: true,
  });
  // Op deze gemiddelde tokenaantallen: $0,267 op Sol tegen $0,113 op Terra. De
  // echt gefactureerde gemiddelde was $0,2578, iets lager dan de $0,267 die
  // hier uitkomt, want cached invoertokens worden goedkoper afgerekend en die
  // splitsing zit niet in `estimateCostUsd` (zie de kop van pricing.ts).
  ok("een schrijfaanroep kostte ~$0,267 op sol", Math.abs(draftSol - 0.267) < 5e-3, `${draftSol}`);
  ok("dezelfde aanroep kost ~$0,113 op terra", Math.abs(draftTerra - 0.1128) < 5e-3, `${draftTerra}`);
  ok("terra is 2,5x goedkoper dan sol", Math.abs((draftSol - 0.01) / (draftTerra - 0.01) - 2.5) < 0.01);

  // content_revise: 13.625 invoer / 4.657 uitvoer, zonder web_search.
  const reviseTerra = estimateCostUsd({
    model: "gpt-5.6-terra",
    inputTokens: 13_625,
    outputTokens: 4_657,
    webSearch: false,
  });
  ok("een herschrijfronde kost ~$0,083 op terra", Math.abs(reviseTerra - 0.0831) < 5e-4, `${reviseTerra}`);

  // Deze klopt wél op de cent met de factuur: content_revise draaide zonder
  // web_search en zonder noemenswaardige cache, en kostte $0,2078 per stuk.
  const reviseSol = estimateCostUsd({
    model: "gpt-5.6-sol",
    inputTokens: 13_625,
    outputTokens: 4_657,
    webSearch: false,
  });
  ok("dezelfde ronde kostte $0,2078 op sol", Math.abs(reviseSol - 0.2078) < 5e-4, `${reviseSol}`);

  // De hele ronde: 12 drafts + 16 herschrijfrondes was $6,4188 op Sol.
  const rondeTerra = 12 * draftTerra + 16 * reviseTerra;
  ok(
    "twaalf pagina's schrijven zakt van $6,42 naar onder de $3",
    rondeTerra < 3 && rondeTerra > 2,
    `$${rondeTerra.toFixed(2)}`,
  );

  // De kern van de afweging: beoordelen blijft verwaarloosbaar naast schrijven.
  // Vier beoordelaars samen kostten $0,0119 per keuring op 3 september.
  ok(
    "één vermeden herschrijfronde betaalt bijna zeven keuringen",
    reviseTerra / 0.0119 >= 6,
    `${(reviseTerra / 0.0119).toFixed(1)} keuringen`,
  );
});

/**
 * De overstap naar GPT-6 op 23 september 2026, met de tokenaantallen uit
 * `ai_calls` over 24 augustus tot 23 september 2026. Faalt deze groep, dan is
 * een tier stil teruggezet of klopt een tarief niet meer.
 */
group("de app draait op GPT-6 (23 september 2026)", () => {
  ok("meten en beoordelen op gpt-6-luna", MODELS.volume === "gpt-6-luna" && MODELS.quality === "gpt-6-luna");
  ok("schrijven op gpt-6-sol", MODELS.content === "gpt-6-sol", MODELS.content);

  // Luna: 14.568.695 invoer, 1.770.650 uitvoer. De 510 zoekacties ($5,10)
  // kosten op beide generaties hetzelfde en tellen hier niet mee.
  const lunaOud = estimateCostUsd({ model: "gpt-5.6-luna", inputTokens: 14_568_695, outputTokens: 1_770_650, webSearch: false });
  const lunaNieuw = estimateCostUsd({ model: MODELS.quality, inputTokens: 14_568_695, outputTokens: 1_770_650, webSearch: false });
  ok("luna-tokens: $5,04 wordt $2,34", Math.abs(lunaOud - 5.04) < 0.01 && Math.abs(lunaNieuw - 2.34) < 0.01, `${lunaOud} → ${lunaNieuw}`);

  // Schrijven: 793.755 invoer, 185.867 uitvoer op Terra.
  const schrijfOud = estimateCostUsd({ model: "gpt-5.6-terra", inputTokens: 793_755, outputTokens: 185_867, webSearch: false });
  const schrijfNieuw = estimateCostUsd({ model: MODELS.content, inputTokens: 793_755, outputTokens: 185_867, webSearch: false });
  ok("schrijven wordt niet duurder", schrijfNieuw < schrijfOud, `${schrijfOud} → ${schrijfNieuw}`);
  ok("en scheelt ~$0,37", Math.abs(schrijfOud - schrijfNieuw - 0.37) < 0.01, `${(schrijfOud - schrijfNieuw).toFixed(4)}`);

  // De temperatuurregel moet op GPT-6 net zo gelden: classificeren op `none`
  // met temperatuur 0, schrijven met redeneertijd en zonder temperatuur.
  const det = resolveTuning(MODELS.volume, "deterministic");
  ok("classificeren op gpt-6 blijft op none en 0", det.reasoningEffort === "none" && det.temperature === 0);
  const con = resolveTuning(MODELS.content, "content");
  ok("schrijven op gpt-6 zonder temperatuur", con.reasoningEffort === "medium" && con.temperature === undefined);
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

group("url-priority: titel/meta redt of ontmaskert een generieke URL (Nova-vergelijking, 16 sep 2026)", () => {
  // Een generieke slug (een numeriek ID, zoals veel CMS'en die geven) zegt op
  // zichzelf niets over de pagina. De titel wel.
  const kaleDienst = scoreUrl("https://a.nl/pagina/42");
  const kaleDienstMetTitel = scoreUrl("https://a.nl/pagina/42", [], {
    title: "Vloerverwarming installeren",
    description: "Onze dienst vloerverwarming, vakkundig geïnstalleerd.",
  });
  ok(
    "een aanbodwoord in de titel tilt een kale slug boven zijn eigen kale score",
    kaleDienstMetTitel > kaleDienst,
  );

  // Andersom: een pad dat neutraal oogt maar een blogtitel draagt, moet niet
  // meetellen als aanbod.
  const kaleSlug = scoreUrl("https://a.nl/pagina/7");
  const kaleSlugMetBlogtitel = scoreUrl("https://a.nl/pagina/7", [], {
    title: "Blog: 10 tips voor een warme winter",
    description: null,
  });
  ok(
    "een blogtitel op een neutraal pad duwt de score omlaag, niet omhoog",
    kaleSlugMetBlogtitel < kaleSlug,
  );

  // `selectUrls()` zelf: negen neutrale eigen-secties (score 0) verdringen de
  // kale `/pagina/42` (score -12, eigen sectie) uit de top-2 sectiequota, maar
  // met het signaal (score 48) springt hij er wél tussen.
  const neutraal = Array.from({ length: 9 }, (_, i) => `https://a.nl/x${i}`);
  const alle = ["https://a.nl/", "https://a.nl/pagina/42", ...neutraal];
  const signalen = new Map<string, UrlSignal>([
    ["https://a.nl/pagina/42", { title: "Onze dienst: vloerverwarming installeren", description: null }],
  ]);

  const zonderSignaal = selectUrls(alle, 2);
  ok(
    "zonder signaal verliest de kale slug het van de neutrale secties",
    !zonderSignaal.urls.includes("https://a.nl/pagina/42"),
  );

  const metSignaal = selectUrls(alle, 2, [], new Set(), signalen);
  ok(
    "met het signaal haalt dezelfde URL de top-2 wél",
    metSignaal.urls.includes("https://a.nl/pagina/42"),
  );
});

group("light-scan: welke kandidaten nog open staan (migratie 0102)", () => {
  const kandidaten = ["https://a.nl/", "https://a.nl/diensten", "https://a.nl/over-ons"];

  eq(
    "niets gescand: alles staat open",
    JSON.stringify(openCandidates(kandidaten, new Set())),
    JSON.stringify(kandidaten),
  );

  eq(
    "één gescand: die valt weg",
    JSON.stringify(openCandidates(kandidaten, new Set(["https://a.nl/diensten"]))),
    JSON.stringify(["https://a.nl/", "https://a.nl/over-ons"]),
  );

  eq(
    "alles gescand: niets staat meer open, ook al leverde een deel niets op",
    // `crawlHeads()` zet ook een pagina die niets opleverde in de kaart (met
    // title/description op null), en die telt hier als "gezien": zonder dat
    // zou een structureel mislukkende URL bij elke ronde weer als open gelden
    // en het vooronderzoek nooit klaar raken.
    String(openCandidates(kandidaten, new Set(kandidaten)).length),
    "0",
  );
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

group("url-priority: exclude filtert vóór het kiezen, niet erna (onboarding Ronde D, §17.8)", () => {
  // De topplekken staan hier al bekend; zonder exclude zou "meer" niets nieuws
  // opleveren, terwijl er nog 27 ongelezen pagina's in de showroom staan.
  // Bewust minder "bekend"-URL's dan het quotum van hun sectie, anders kiest
  // de sectieverdeling er zelf al niet alle tien (dat is een ander mechanisme,
  // getest hierboven, en niet waar dit scenario over gaat).
  const bekend = Array.from({ length: 3 }, (_, i) => `https://a.nl/diensten/d-${i}`);
  const nieuw = Array.from({ length: 27 }, (_, i) => `https://a.nl/showroom/s-${i}`);
  const alles = [...bekend, ...nieuw];

  const zonderExclude = selectUrls(alles, 10);
  ok(
    "zonder exclude komen de bekende pagina's opnieuw naar boven",
    bekend.every((u) => zonderExclude.urls.includes(u)),
  );

  const metExclude = selectUrls(alles, 10, [], new Set(bekend));
  ok(
    "met exclude staat geen enkele bekende pagina meer in de keuze",
    metExclude.urls.every((u) => !bekend.includes(u)),
  );
  eq("en de tien plekken gaan naar de nieuwe pagina's", String(metExclude.urls.length), "10");
  eq(
    "totalFound blijft de ware omvang van de site, exclude of niet",
    String(metExclude.totalFound),
    String(alles.length),
  );

  const allesBekend = selectUrls(bekend, 10, [], new Set(bekend));
  eq(
    "is alles al bekend, dan levert 'meer' een lege aanvulling op, geen gok",
    String(allesBekend.urls.length),
    "0",
  );
});

group("crawl-speed: drie standen, één doel (onboarding Ronde D, §17.5, migratie 0080)", () => {
  ok("snel bevat geen pauze", speedProfile("snel").minDelayMs === 0 && speedProfile("snel").maxDelayMs === 0);
  ok(
    "normaal is drie tegelijk met een korte pauze",
    speedProfile("normaal").batchSize === 3 && speedProfile("normaal").minDelayMs > 0,
  );
  ok(
    "langzaam is één tegelijk met de langste pauze",
    speedProfile("langzaam").batchSize === 1 &&
      speedProfile("langzaam").minDelayMs > speedProfile("normaal").minDelayMs,
  );

  // `nextDelayMs()` met een vaste toevalsgenerator: altijd binnen de
  // bandbreedte van de stand, en reproduceerbaar in plaats van flaky.
  const altijdNul = () => 0;
  const altijdBijnaEen = () => 0.999999;
  eq("op 0 valt de pauze op de ondergrens", String(nextDelayMs(speedProfile("normaal"), altijdNul)), "700");
  ok(
    "op bijna 1 blijft de pauze onder de bovengrens",
    nextDelayMs(speedProfile("normaal"), altijdBijnaEen) < speedProfile("normaal").maxDelayMs,
  );
  eq(
    "snel heeft geen bandbreedte, dus altijd 0, ongeacht het toeval",
    String(nextDelayMs(speedProfile("snel"), altijdBijnaEen)),
    "0",
  );

  eq("snel gaat bij een terugval naar normaal", slowerThan("snel"), "normaal");
  eq("normaal gaat naar langzaam", slowerThan("normaal"), "langzaam");
  eq("langzaam is de bodem, blijft langzaam", slowerThan("langzaam"), "langzaam");

  ok("de drie standen zijn geldig", isCrawlSpeed("snel") && isCrawlSpeed("langzaam"));
  ok("een onbekende stand is ongeldig", !isCrawlSpeed("bliksemsnel"));
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

  // Herstelplan na audit T8.6: bij een site die niet te crawlen was meldde dit
  // "geen enkele van de 0 gecontroleerde pagina's heeft schema.org-opmaak" als
  // WAARSCHUWING. Nul pagina's bekeken is geen bevinding over de site.
  const nietTeCrawlen = entityConsistencyChecks({
    ...basis,
    foundNames: ["Jansen Bouw B.V."],
    pagesCrawled: 0,
    pagesWithSchema: 0,
  });
  const schemaCheck = nietTeCrawlen.find((c) => c.id === "entity.schema");
  ok(
    "nul gecontroleerde pagina's = onbekend, niet een waarschuwing",
    schemaCheck?.severity === "unknown",
    schemaCheck?.severity,
  );
  ok(
    "en de melding zegt dat er niets bekeken kon worden, niet 'geen opmaak'",
    !(schemaCheck?.finding ?? "").includes("schema.org-opmaak."),
  );

  // Ter onderscheid: WEL pagina's bekeken maar nul met schema-opmaak blijft
  // een echte waarschuwing.
  const welGecrawldGeenSchema = entityConsistencyChecks({
    ...basis,
    foundNames: ["Jansen Bouw B.V."],
    pagesCrawled: 25,
    pagesWithSchema: 0,
  });
  ok(
    "wel pagina's, maar geen enkele met schema-opmaak blijft een waarschuwing",
    welGecrawldGeenSchema.find((c) => c.id === "entity.schema")?.severity === "warning",
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
  // ⚠️ Precies één tegenspraak: geen haakjesvorm "gegeven(s)" meer, en het
  // werkwoord buigt mee (punt 9 van docs/tasks/opdracht-bevindingen-5-tot-9.md).
  ok(
    "en dat is enkelvoud, geen haakjesvorm",
    tekst.includes("1 gegeven wordt tegengesproken") && !tekst.includes("gegeven(s)"),
    tekst,
  );

  const onbekend = buildVerdict("Ik ken dit bedrijf niet.", "Fysi-Unique", [], []);
  ok("niet gekend levert een andere zin", describeVerdict(onbekend, "Gemini", "Fysi-Unique").includes("niet te kennen"));

  const meerdereGegevens = buildVerdict(
    "Fysi-Unique is opgericht in 1990. Bel ons op 020 999 8877.",
    "Fysi-Unique",
    [],
    [
      { key: "telefoon", value: "033 123 4567" },
      { key: "opgericht", value: "2005" },
    ],
  );
  const tekstMeerdere = describeVerdict(meerdereGegevens, "Claude", "Fysi-Unique");
  ok(
    "twee tegenspraken worden meervoud",
    tekstMeerdere.includes("gegevens worden tegengesproken"),
    tekstMeerdere,
  );
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
  const resultVan = (job: string) => halverwege.find((s) => s.job === job)?.result;
  ok("het vooronderzoek is klaar", stand("profile_light_scan") === "klaar", stand("profile_light_scan"));
  ok("de crawl is klaar", stand("profile_discover") === "klaar", stand("profile_discover"));
  ok("het onderzoek is klaar", stand("profile_research") === "klaar");
  ok("het aanbod is bezig", stand("profile_offering") === "bezig", stand("profile_offering"));
  ok("de kennistest wacht", stand("profile_llm_baseline") === "wacht");
  ok(
    "en het tussenresultaat staat erbij",
    (resultVan("profile_discover") ?? "").includes("31 pagina's"),
    resultVan("profile_discover") ?? "",
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

  // Helemaal aan het begin staat alles te wachten op de allereerste taak: het
  // vooronderzoek (migratie 0102), vóór profile_discover.
  const start = buildSteps({
    pendingByType: { profile_light_scan: 1 },
    facetSummaries: {},
    counts: leeg,
  });
  ok("de eerste stap is bezig", start[0].job === "profile_light_scan" && start[0].state === "bezig");
  ok("de rest wacht", start.slice(1).every((s) => s.state === "wacht"));

  // Het vooronderzoek is geweest, de diepe crawl draait nu.
  const naVooronderzoek = buildSteps({
    pendingByType: { profile_discover: 1 },
    facetSummaries: {},
    counts: leeg,
  });
  ok(
    "het vooronderzoek is klaar zodra de crawl draait",
    naVooronderzoek.find((s) => s.job === "profile_light_scan")?.state === "klaar",
  );
  ok(
    "de crawl is de bezige stap",
    naVooronderzoek.find((s) => s.job === "profile_discover")?.state === "bezig",
  );
  ok(
    "en alles daarna wacht nog",
    naVooronderzoek
      .slice(naVooronderzoek.findIndex((s) => s.job === "profile_discover") + 1)
      .every((s) => s.state === "wacht"),
  );

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
  const discoverLabel = lopend[halverwege.findIndex((s) => s.job === "profile_discover")].label;
  ok(
    "en het tussenresultaat staat in het label",
    discoverLabel.includes("31 pagina's"),
    discoverLabel,
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
  ok("het model kent het merk in b1", knowsBrand(b1, "Fysi-Unique", []));
  // ⚠️ Bijgesteld op 24 september 2026 (punt 6 van de kwaliteitsdoorlichting).
  // b2 telde hier als kennen. Maar "lijkt een fysiotherapiepraktijk in
  // Amersfoort te zijn" is dezelfde vorm als "lijkt de naam van een
  // hoveniersbedrijf in Eindhoven te zijn": de soort komt uit de naam (Fysi),
  // de plaats uit de vraag. Bij de drie merken van de doorlichting maakte juist
  // deze vorm van "weet het niet" een hoge herkenning. b1 blijft kennen: daar
  // staat iets wat niet uit de naam of de vraag af te leiden is.
  ok("een gok op de soort bedrijf telt niet meer als kennen", !knowsBrand(b2, "Fysi-Unique", []));

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
    reden: null,
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

group("de kalenderweergave van het plan (blok A punt 6, plan-calendar)", () => {
  const pagina = (over: Partial<Parameters<typeof calendarDagen>[0][number]> = {}) => ({
    id: "p1",
    title: "Een pagina",
    status: "gepland" as const,
    scheduled_for: "2026-10-05",
    is_buffer: false,
    ...over,
  });

  ok("levert precies LAATSTE_DAG dagen op", calendarDagen([]).length === LAATSTE_DAG);
  ok("een lege maand heeft alleen lege dagen", calendarDagen([]).every((d) => d.paginas.length === 0));

  const gevuld = calendarDagen([pagina()]);
  ok("de pagina staat op de juiste dag", gevuld.find((d) => d.dag === 5)?.paginas.length === 1);
  ok("en met zijn titel erbij", gevuld.find((d) => d.dag === 5)?.paginas[0].title === "Een pagina");
  ok(
    "een andere dag blijft leeg",
    gevuld.find((d) => d.dag === 6)?.paginas.length === 0,
  );

  ok(
    "een buffer telt niet mee",
    calendarDagen([pagina({ id: "b1", is_buffer: true })]).every((d) => d.paginas.length === 0),
  );
  ok(
    "geen publicatiedatum telt niet mee",
    calendarDagen([pagina({ id: "p2", scheduled_for: null })]).every((d) => d.paginas.length === 0),
  );
  ok(
    "twee pagina's op dezelfde dag staan allebei in dat vakje",
    calendarDagen([pagina({ id: "p1" }), pagina({ id: "p2", title: "Nog een pagina" })]).find(
      (d) => d.dag === 5,
    )?.paginas.length === 2,
  );

  // Het popupje bij een dag (bolletje met aantal) heeft de content-piece- en
  // topic-id nodig om naar de bibliotheek te kunnen linken, net als de
  // leesweergave dat al deed.
  const metLink = calendarDagen([
    pagina({ content_piece_id: "cp1", topic_id: "t1" }),
  ]);
  const dagMetLink = metLink.find((d) => d.dag === 5)?.paginas[0];
  ok("de content-piece-id gaat mee", dagMetLink?.contentPieceId === "cp1");
  ok("de topic-id gaat mee", dagMetLink?.topicId === "t1");
  ok(
    "zonder id's blijft het null, nooit undefined",
    calendarDagen([pagina()]).find((d) => d.dag === 5)?.paginas[0].contentPieceId === null,
  );

  // Het popupje toont ook of het een nieuwe pagina of een optimalisatie is.
  const metActie = calendarDagen([pagina({ recommendation_action: "verbeteren" })]);
  ok(
    "nieuw of optimalisatie gaat mee",
    metActie.find((d) => d.dag === 5)?.paginas[0].recommendationAction === "verbeteren",
  );
  ok(
    "zonder actie blijft het null",
    calendarDagen([pagina()]).find((d) => d.dag === 5)?.paginas[0].recommendationAction === null,
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

group("een volle maand levert een lege lijst, nooit een datum in het verleden (plan-schedule)", () => {
  // ⚠️ De aanleiding: bij Wouter Warmtepomp is het plan op 31 augustus 2026
  // opgesteld. `now.getDate() + 1` werd dan 32, en `Math.min(28, 32)` klemde
  // dat terug naar dag 28, drie dagen in het verleden. Alle zeven pagina's van
  // maand 1 kregen zo een publicatiedatum die al voorbij was (punt 5 van
  // docs/tasks/opdracht-bevindingen-5-tot-9.md).
  const op31Augustus = new Date("2026-08-31T10:00:00Z");
  ok(
    "op 31 augustus is er geen bruikbare dag meer over",
    spreadDates("2026-08-01", 1, 7, op31Augustus).length === 0,
  );
  ok("dus maandIsVol() zegt hetzelfde", maandIsVol("2026-08-01", 1, op31Augustus) === true);

  // Op de 20e is er nog volop ruimte: zeven data, allemaal ná vandaag en
  // binnen dag 28.
  const op20Augustus = new Date("2026-08-20T10:00:00Z");
  const zevenOpDe20e = spreadDates("2026-08-01", 1, 7, op20Augustus);
  ok("op 20 augustus levert de aanroep zeven data op", zevenOpDe20e.length === 7);
  ok(
    "en ze liggen allemaal ná vandaag, binnen dag 28",
    zevenOpDe20e.every((d) => d > "2026-08-20" && Number(d.slice(8)) <= 28),
    zevenOpDe20e.join(", "),
  );
  ok("dus maandIsVol() zegt hier van niet", maandIsVol("2026-08-01", 1, op20Augustus) === false);

  // ⚠️ De volledige lus uit het verificatiecriterium: voor elke dag van de
  // maand (1 tot en met 31) en elk aantal pagina's (1 tot en met 20) mag er
  // NOOIT een datum uitkomen die vóór `now` ligt. Vóór de reparatie brak dit
  // bij elke dag vanaf de 28e: de geklemde datum kwam dan vóór vandaag te
  // liggen.
  let overtredingen = 0;
  for (let dag = 1; dag <= 31; dag++) {
    const vandaag = new Date(Date.UTC(2026, 7, Math.min(dag, 31), 10));
    const vandaagIso = vandaag.toISOString().slice(0, 10);
    for (let aantal = 1; aantal <= 20; aantal++) {
      const data = spreadDates("2026-08-01", 1, aantal, vandaag);
      if (data.some((d) => d <= vandaagIso)) overtredingen++;
    }
  }
  ok(
    "geen enkele datum ligt ooit op of vóór vandaag, voor elke dag en elk aantal pagina's",
    overtredingen === 0,
    `${overtredingen} overtredingen`,
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

  // ⚠️ sortBacklog() en de lichtgewicht voorraadquery in vulOpenMaanden()
  // (lib/plans.ts) delen sinds blok A punt 1 dezelfde vergelijking. Los
  // getest zodat een toekomstige wijziging aan sortBacklog() niet per ongeluk
  // alleen de UI-sortering raakt en de automatische vulling laat afwijken.
  const rijen = [
    { id: "a", potentie: 40, gewicht: 1, title: "b" },
    { id: "b", potentie: 40, gewicht: 1, title: "a" },
    { id: "c", potentie: 80, gewicht: 1, title: "z" },
  ];
  const volgorde = [...rijen].sort(compareByPotential).map((r) => r.id);
  ok("compareByPotential: hoogste potentie eerst", volgorde[0] === "c");
  ok("gelijke stand: alfabetisch op titel", volgorde[1] === "b" && volgorde[2] === "a");
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

  // Blok A, punt 4: waarom een kans nog in de voorraad staat.
  ok("een gewone wachtrijkans krijgt geen label", redenChip(kans({ reden: null })) === null);
  ok("en ook geen uitleg", redenUitleg(kans({ reden: null })) === null);
  ok("bewust uitgehaald krijgt zijn eigen label", redenChip(kans({ reden: "uitgehaald" })) === "eruit gehaald");
  ok(
    "met een uitleg die zegt dat hij terug kan",
    redenUitleg(kans({ reden: "uitgehaald" }))?.includes("sleep hem terug") === true,
  );
  ok(
    "buiten bereik krijgt een ander label",
    redenChip(kans({ reden: "buiten_bereik" })) === "buiten bereik",
  );
  ok(
    "met een uitleg die zegt dat hij nog aan de beurt komt",
    redenUitleg(kans({ reden: "buiten_bereik" }))?.includes("twaalf maanden") === true,
  );
});

group("Hoe lang de voorraad meegaat (werkpakket C §5.2)", () => {
  ok("zeven kansen bij vier per maand is twee maanden", estimateBacklogMonths(7, 4) === 2);
  ok("acht kansen bij vier per maand is precies twee", estimateBacklogMonths(8, 4) === 2);
  ok("negen kansen bij vier per maand rondt naar boven af naar drie", estimateBacklogMonths(9, 4) === 3);
  ok("lege voorraad heeft geen duur", estimateBacklogMonths(0, 4) === null);
  ok("een tempo van nul is geen deler", estimateBacklogMonths(7, 0) === null);
  ok("een negatief tempo ook niet", estimateBacklogMonths(7, -1) === null);

  ok("enkelvoud bij één maand", backlogDurationLabel(3, 4) === "Bij dit tempo duurt de voorraad nog 1 maand.");
  ok(
    "meervoud bij meer maanden",
    backlogDurationLabel(9, 4) === "Bij dit tempo duurt de voorraad nog 3 maanden.",
  );
  ok("geen voorraad levert geen zin op", backlogDurationLabel(0, 4) === null);
});

group("het plan vult zichzelf vooraf (blok A punt 1, plan-fill)", () => {
  const maand = (
    monthNumber: number,
    overrides: Partial<OpenMaand> = {},
  ): OpenMaand => ({
    id: `maand-${monthNumber}`,
    monthNumber,
    status: "concept",
    huidigAantal: 0,
    huidigBuffers: 0,
    magNogVullen: true,
    ...overrides,
  });

  ok("een lege voorraad vult niets", bepaalVulling({
    openMaanden: [maand(1)],
    voorraadIds: [],
    pagesPerMonth: 5,
  }).opdrachten.length === 0);

  {
    // Vijf kansen, pakket van vijf: maand 1 vol, maand 2 blijft leeg.
    const uitkomst = bepaalVulling({
      openMaanden: [maand(1), maand(2)],
      voorraadIds: ["a", "b", "c", "d", "e"],
      pagesPerMonth: 5,
    });
    ok("precies één maand krijgt een opdracht", uitkomst.opdrachten.length === 1);
    ok("en dat is maand 1", uitkomst.opdrachten[0].monthId === "maand-1");
    ok("met alle vijf kansen, in volgorde", uitkomst.opdrachten[0].backlogIds.join(",") === "a,b,c,d,e");
    ok("niets blijft over", uitkomst.restendeVoorraad === 0);
    ok("maand 1 wordt bevorderd", uitkomst.bevorderMaand === "maand-1");
  }

  {
    // Een dunne voorraad: minder kansen dan het pakket. Maand wordt korter,
    // er wordt niets bijverzonnen (conventie 3), precies zoals createPlan()
    // dat altijd al voor de allereerste voorzet deed.
    const uitkomst = bepaalVulling({
      openMaanden: [maand(1)],
      voorraadIds: ["a", "b"],
      pagesPerMonth: 5,
    });
    ok("de maand krijgt alleen wat er is", uitkomst.opdrachten[0].backlogIds.length === 2);
    ok("geen tekort gaat verloren, hij blijft gewoon 0", uitkomst.restendeVoorraad === 0);
  }

  {
    // Genoeg voor twee maanden: de tweede maand vult pas ná de eerste.
    const uitkomst = bepaalVulling({
      openMaanden: [maand(1), maand(2), maand(3)],
      voorraadIds: ["a", "b", "c", "d", "e", "f", "g"],
      pagesPerMonth: 3,
    });
    ok("maand 1 krijgt drie", uitkomst.opdrachten[0].backlogIds.length === 3);
    ok("maand 2 krijgt drie", uitkomst.opdrachten[1].backlogIds.length === 3);
    ok("maand 3 krijgt de rest, één", uitkomst.opdrachten[2].backlogIds.length === 1);
    ok("alleen maand 1 wordt bevorderd", uitkomst.bevorderMaand === "maand-1");
  }

  ok(
    "een goedgekeurde maand komt hier nooit binnen, dus ook nooit een opdracht",
    bepaalVulling({
      openMaanden: [maand(1, { status: "goedgekeurd", huidigAantal: 5 })],
      voorraadIds: ["a"],
      pagesPerMonth: 5,
    }).opdrachten.length === 0,
  );

  ok(
    "een maand zonder bruikbare dag meer krijgt niets, ook al is er ruimte onder de quota",
    bepaalVulling({
      openMaanden: [maand(1, { magNogVullen: false }), maand(2)],
      voorraadIds: ["a", "b"],
      pagesPerMonth: 5,
    }).opdrachten[0].monthId === "maand-2",
  );

  ok(
    "staat er al een maand ter_goedkeuring, dan wordt er nooit een tweede bevorderd",
    bepaalVulling({
      openMaanden: [
        maand(1, { status: "ter_goedkeuring", huidigAantal: 2 }),
        maand(2),
      ],
      voorraadIds: ["a", "b", "c"],
      pagesPerMonth: 5,
    }).bevorderMaand === null,
  );

  ok(
    "een maand die al inhoud had maar leeg blijft aan nieuwe kaarten, telt toch mee voor bevordering",
    bepaalVulling({
      openMaanden: [maand(1, { magNogVullen: false, huidigAantal: 3 })],
      voorraadIds: [],
      pagesPerMonth: 5,
    }).bevorderMaand === "maand-1",
  );
});

group("het plan schrijft wisselgeld (blok A punt 3, plan-fill)", () => {
  const maand = (
    monthNumber: number,
    overrides: Partial<OpenMaand> = {},
  ): OpenMaand => ({
    id: `maand-${monthNumber}`,
    monthNumber,
    status: "concept",
    huidigAantal: 0,
    huidigBuffers: 0,
    magNogVullen: true,
    ...overrides,
  });

  {
    // Maand vol (drie van de drie), en er is nog precies één kans over: die
    // wordt wisselgeld, geen tweede maand.
    const uitkomst = bepaalVulling({
      openMaanden: [maand(1)],
      voorraadIds: ["a", "b", "c", "d"],
      pagesPerMonth: 3,
    });
    ok("drie echte kaarten", uitkomst.opdrachten[0].backlogIds.length === 3);
    ok("en één buffer", uitkomst.opdrachten[0].bufferIds.join(",") === "d");
    ok("niets blijft achter in de voorraad", uitkomst.restendeVoorraad === 0);
  }

  {
    // Echte inhoud gaat altijd voor: een verre maand 2 krijgt zijn plek voordat
    // maand 1 wisselgeld krijgt.
    const uitkomst = bepaalVulling({
      openMaanden: [maand(1), maand(2)],
      voorraadIds: ["a", "b", "c", "d"],
      pagesPerMonth: 3,
    });
    ok("maand 1 vol met drie", uitkomst.opdrachten[0].backlogIds.length === 3);
    ok("maand 1 krijgt geen buffer", uitkomst.opdrachten[0].bufferIds.length === 0);
    ok("maand 2 krijgt de laatste kans als echte inhoud, niet als buffer", uitkomst.opdrachten[1].backlogIds.join(",") === "d");
    ok("maand 2 krijgt ook geen buffer, de voorraad is op", uitkomst.opdrachten[1].bufferIds.length === 0);
  }

  {
    // Twee volle maanden, twee kansen over: allebei krijgen hun eigen buffer,
    // in maandvolgorde.
    const uitkomst = bepaalVulling({
      openMaanden: [maand(1, { huidigAantal: 3 }), maand(2, { huidigAantal: 3 })],
      voorraadIds: ["x", "y"],
      pagesPerMonth: 3,
    });
    ok("maand 1 krijgt geen echte inhoud meer, hij zit al vol", uitkomst.opdrachten[0].backlogIds.length === 0);
    ok("maar wel een buffer", uitkomst.opdrachten[0].bufferIds.join(",") === "x");
    ok("maand 2 krijgt de tweede buffer", uitkomst.opdrachten[1].bufferIds.join(",") === "y");
  }

  ok(
    "een maand met al een buffer krijgt er geen tweede",
    bepaalVulling({
      openMaanden: [maand(1, { huidigAantal: 3, huidigBuffers: 1 })],
      voorraadIds: ["x"],
      pagesPerMonth: 3,
    }).opdrachten.length === 0,
  );

  ok(
    "een maand zonder bruikbare dag meer krijgt ook geen buffer",
    bepaalVulling({
      openMaanden: [maand(1, { huidigAantal: 3, magNogVullen: false })],
      voorraadIds: ["x"],
      pagesPerMonth: 3,
    }).opdrachten.length === 0,
  );

  ok(
    "een goedgekeurde maand krijgt nooit een buffer, ook al is er voorraad over",
    bepaalVulling({
      openMaanden: [maand(1, { status: "goedgekeurd", huidigAantal: 3 })],
      voorraadIds: ["x"],
      pagesPerMonth: 3,
    }).opdrachten.length === 0,
  );
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
  // Was 41 tot migratie 0060, 56 sinds onboarding 3.0 fase 1 (de commerciële
  // laag en de contactpersoon), 57 sinds onboarding ronde B stap B1
  // (`brand_name`), en 60 sinds stap B8: `style_samples`, `max_inventory_pages`
  // en `crawl_priority_paths` stonden al in de database maar niet in de
  // catalogus, alleen op `/merkprofiel/bewerken`.
  // 51 sinds de contentketen opnieuw (25 september 2026, besluit B14): elf
  // stemvelden eruit, `stem_voorbeelden` en `verhalen` erbij.
  ok(
    `het zijn er 51 aan beide kanten (nu ${BRAND_FIELDS.length} en ${EDITABLE_PROFILE_FIELDS.length})`,
    BRAND_FIELDS.length === 51 && EDITABLE_PROFILE_FIELDS.length === 51,
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
  // Onboarding ronde B, stap B8: `max_inventory_pages` en `crawl_priority_paths`
  // erbij in "bedrijf" (9 → 11), `style_samples` erbij in "stem" (6 → 7).
  // Contentketen opnieuw (B14): "stem" van 7 naar 1 (alleen de stemvoorbeelden),
  // "woorden" van 5 naar 3, "klant" en "bekend" elk één minder, "strategie"
  // één meer (`verhalen`).
  ok(
    `de verdeling is 11-3-5-1-3-7-5-13-3 (nu ${perStap})`,
    perStap ===
      "bedrijf:11 merk:3 klant:5 stem:1 woorden:3 auteur:7 bekend:5 strategie:13 contact:3",
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
  // De stemschuiven zijn weg (besluit B14): toon laten zien, niet beschrijven.
  ok("geen stemschuif meer in de catalogus", !BRAND_FIELDS.some((f) => String(f.key).startsWith("tone_")));

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
  // 45 sinds stap B8; 35 sinds de contentketen opnieuw (B14): tien stemvelden
  // uit de klantstappen, `stem_voorbeelden` erbij.
  ok(
    `de noemer is de klantlijst van 35 (nu ${overallProgress(leeg).totaal})`,
    overallProgress(leeg).totaal === klantVelden.length &&
      klantVelden.length === 35,
  );
  ok(
    "de sessie kan alle negen stappen meetellen",
    overallProgress(leeg, SESSION_STEPS).totaal === BRAND_FIELDS.length,
  );
  ok("geen enkele stap is compleet", allStepsIncompleet(leeg));

  const stem = {
    stem_voorbeelden: [{ url: "https://voorbeeld.nl/over-ons", tekst: null, opgehaald_op: null, fout: null }],
  } as never;
  const p = stepProgress(stem, "stem");
  ok("een volledig ingevulde stap is compleet", p.compleet === true);
  ok("en telt al zijn velden", p.gevuld === p.totaal && p.totaal === 1);
  ok(
    "terwijl een andere stap dan nog leeg is",
    stepProgress(stem, "auteur").gevuld === 0,
  );

  function allStepsIncompleet(prof: Record<string, unknown>): boolean {
    return STEP_ORDER.every((s) => !stepProgress(prof, s).compleet);
  }
});

group("een profielveld als leesbare tekst (blok B punt 10, profielexport)", () => {
  ok("leeg blijft leeg", veldAlsTekst(null) === "" && veldAlsTekst(undefined) === "");
  ok("ja/nee in plaats van true/false", veldAlsTekst(true) === "Ja" && veldAlsTekst(false) === "Nee");
  ok("een lijst wordt met puntkomma's", veldAlsTekst(["a", "b", "c"]) === "a; b; c");
  ok("een lege lijst is een lege tekst", veldAlsTekst([]) === "");
  ok("een gewoon getal blijft gewoon", veldAlsTekst(42) === "42");
  ok("een gewone tekst blijft gewoon", veldAlsTekst("Cv-ketel onderhoud") === "Cv-ketel onderhoud");
  ok(
    "een object (bv. persona's) wordt geen [object Object]",
    veldAlsTekst({ naam: "Jan" }) === '{"naam":"Jan"}',
  );
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
  ok("het zijn er zestien (met de verhalen)", commercieel.length === 16);
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

group("microcopy, verplichtstelling en de negen blokken (onboarding ronde B)", () => {
  // ── B2: elk veld toont waar het antwoord landt ──────────────────────────
  // Zonder deze eis kan een nieuw veld landen zonder dat iemand heeft
  // opgeschreven waarom het gevraagd wordt, en dat is precies het gat dat
  // hoofdstuk 2 (P2) beschrijft.
  const zonderUsage = BRAND_FIELDS.filter((f) => !f.usage || f.usage.trim().length < 10).map(
    (f) => f.key as string,
  );
  ok(
    `elk veld heeft een usage-tekst${zonderUsage.length ? " (mist: " + zonderUsage.join(", ") + ")" : ""}`,
    zonderUsage.length === 0,
  );

  // ── B3: verplicht, aanbevolen, optioneel ────────────────────────────────
  const geldigePrioriteiten = new Set(["verplicht", "aanbevolen", "optioneel"]);
  ok(
    "elk veld heeft een geldige priority",
    BRAND_FIELDS.every((f) => geldigePrioriteiten.has(f.priority)),
  );
  // De vijf meetkritische velden uit hoofdstuk 6, blok 2, 3 en 5.
  const verplichteSleutels = new Set(
    BRAND_FIELDS.filter((f) => f.priority === "verplicht").map((f) => f.key as string),
  );
  ok(
    "brand_name, aliases, industry, business_model, service_scope, competitors, products, proof_points, summary, intake_audience en priority_offerings zijn verplicht",
    [
      "brand_name",
      "aliases",
      "industry",
      "business_model",
      "service_scope",
      "competitors",
      "products",
      "proof_points",
      "summary",
      "intake_audience",
      "priority_offerings",
    ].every((k) => verplichteSleutels.has(k)),
  );

  ok(
    "een leeg profiel mist alle verplichte velden",
    missingRequired({}).length === verplichteSleutels.size,
  );
  ok(
    "n.v.t. haalt een verplicht veld van de lijst",
    missingRequired({}, ["brand_name"]).length === verplichteSleutels.size - 1,
  );
  ok(
    "een ingevuld verplicht veld staat er niet meer bij",
    missingRequired({ brand_name: "Bakkerij Jansen" } as never).length ===
      verplichteSleutels.size - 1,
  );

  // ⚠️ `service_regions` staat in de catalogus op "aanbevolen", maar is in de
  // praktijk verplicht zodra het werkgebied lokaal is (hoofdstuk 14.2).
  ok(
    "service_regions staat in de catalogus op aanbevolen",
    BRAND_FIELDS.find((f) => f.key === "service_regions")?.priority === "aanbevolen",
  );
  ok(
    "maar telt mee zodra het werkgebied lokaal is en de plaats ontbreekt",
    missingRequired({ service_scope: "lokaal" } as never).some(
      (v) => v.field === "service_regions",
    ),
  );
  ok(
    "en niet bij een landelijk werkgebied",
    !missingRequired({ service_scope: "landelijk" } as never).some(
      (v) => v.field === "service_regions",
    ),
  );

  // ── B4: de negen blokken dekken samen exact BRAND_FIELDS ────────────────
  const inBlokken = SESSION_BLOCKS.flatMap((b) => b.velden as string[]);
  const samenB4 = [...inBlokken, ...(SESSION_AUTHOR_FIELDS as string[])];
  const bestaandeSleutels = BRAND_FIELDS.map((f) => f.key as string);
  ok("geen dubbel veld in de blokindeling", new Set(samenB4).size === samenB4.length);
  const missenB4 = bestaandeSleutels.filter((k) => !samenB4.includes(k));
  ok(
    `elk veld staat in een blok of bij de auteursvelden${missenB4.length ? " (mist: " + missenB4.join(", ") + ")" : ""}`,
    missenB4.length === 0,
  );
  const teveelB4 = samenB4.filter((k) => !bestaandeSleutels.includes(k));
  ok(
    `en er staat geen veld bij dat niet bestaat${teveelB4.length ? " (" + teveelB4.join(", ") + ")" : ""}`,
    teveelB4.length === 0,
  );
  ok(
    "samen zijn het er 51",
    samenB4.length === 51 && samenB4.length === BRAND_FIELDS.length,
  );
  ok("zeven blokken met velden", SESSION_BLOCKS.length === 7);
  ok(
    "elk blok heeft een titel en een uitleg van minstens één zin",
    SESSION_BLOCKS.every((b) => b.titel.length > 2 && b.uitleg.length > 15),
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
    // B5: informatief, blokkeert `compleet` niet (zie de uitleg bij het type).
    packagePages: 20,
    assigned: true,
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

// ════════════════════════════════════════════════════════════════════════════
console.log("\nVerboden woorden, deterministisch (migratie 0045, C.29)");

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
  // Blok D, punt 24: een mislukt onderzoek is een andere oorzaak dan mislukte
  // taken, en moet een eigen vlag krijgen, ook als er geen enkele taak faalde.
  ok(
    "een mislukt onderzoek krijgt een eigen vlag",
    flagsOf(merk({ profileStatus: "mislukt", pijplijnfouten: 0 })).includes("Onderzoek mislukt"),
  );
  ok(
    "en die staat los van mislukte taken",
    (() => {
      const v = flagsOf(merk({ profileStatus: "mislukt", pijplijnfouten: 2 }));
      return v.includes("Onderzoek mislukt") && v.includes("2 taken mislukt");
    })(),
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
  // ⚠️ Twee lege maanden die niets met elkaar te maken hebben (punt 5 van
  // docs/tasks/opdracht-bevindingen-5-tot-9.md): een maand die de klant zelf
  // nog niet gevuld heeft, en maand 1 die geen bruikbare dag meer over had
  // toen het plan werd opgesteld. "Nog niets ingepland" leest bij de tweede
  // als een taak voor de klant, terwijl er niets te doen viel.
  ok(
    "leeg door ruimtegebrek krijgt een eigen zin",
    maandRegel({ paginas: 0, geplaatst: 0, eersteDatum: null, leegDoorRuimtegebrek: true }) ===
      "Deze maand is te ver gevorderd om nog te publiceren, dus je plan begint volgende maand.",
  );
  ok(
    "een gevulde maand negeert de vlag",
    maandRegel({ paginas: 2, geplaatst: 0, eersteDatum: null, leegDoorRuimtegebrek: true }) ===
      "2 pagina's deze maand.",
  );

  // ── Het pakkettekort (blok A punt 1) ─────────────────────────────────────
  ok(
    "geen pakket meegeven verandert niets aan de bestaande zin",
    maandRegel({ paginas: 4, geplaatst: 0, eersteDatum: null, pakket: undefined }) ===
      "4 pagina's deze maand.",
  );
  ok(
    "minder dan het pakket krijgt een tekortzin met het exacte aantal erbij (blok A punt 5)",
    maandRegel({ paginas: 2, geplaatst: 0, eersteDatum: null, pakket: 5 }) ===
      "2 pagina's deze maand. Nog 3 pagina's nodig om je pakket van 5 te halen: er zijn nog niet genoeg gemeten kansen.",
  );
  ok(
    "enkelvoud bij precies één pagina tekort",
    maandRegel({ paginas: 4, geplaatst: 0, eersteDatum: null, pakket: 5 }).includes("Nog één pagina nodig"),
  );
  ok(
    "precies het pakket krijgt geen tekortzin",
    maandRegel({ paginas: 5, geplaatst: 0, eersteDatum: null, pakket: 5 }) === "5 pagina's deze maand.",
  );
  ok(
    "de tekortzin komt ook achter 'allemaal live'",
    maandRegel({ paginas: 2, geplaatst: 2, eersteDatum: null, pakket: 5 }).includes(
      "allemaal live. Nog 3 pagina's nodig",
    ),
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

group("de maand: vijf stappen, geteld over deze kalendermaand", () => {
  // ── Het echte geval: Van den Udenhout op 23 september 2026 ─────────────────
  //
  // Nulmeting op 20 september, 22 kansen. Maand 1 van het plan heeft 14
  // pagina's met een publicatiedatum tussen 23 en 28 september en staat nog op
  // `ter_goedkeuring`. Er zijn drie teksten buiten het plan: één briefing en
  // twee klare verbeteringen van 7 september, nog niet gepubliceerd. Het oude
  // blok zei hier "Plannen ✓ 18 ingepland" en "Schrijven ✓ 3 teksten".
  const nu = new Date("2026-09-23T10:00:00Z");
  const pagina = (dag: string, extra: Partial<MaandPlanPagina> = {}): MaandPlanPagina => ({
    scheduledFor: dag,
    isBuffer: false,
    status: "gepland",
    maandStatus: "ter_goedkeuring",
    postedAt: null,
    contentPieceId: null,
    ...extra,
  });
  const septemberPlan = Array.from({ length: 14 }, (_, i) =>
    pagina(`2026-09-${String(23 + (i % 6)).padStart(2, "0")}`),
  );
  const oktoberPagina = pagina("2026-10-01", { maandStatus: "concept" });
  const teksten: MaandTekst[] = [
    { id: "b", status: "briefing", createdAt: "2026-09-07T14:55:36Z", publishedAt: null },
    { id: "v1", status: "ready", createdAt: "2026-09-07T14:07:31Z", publishedAt: null },
    { id: "v2", status: "ready", createdAt: "2026-09-07T14:08:26Z", publishedAt: null },
  ];
  const udenhout = ronde({
    now: nu,
    clusters: 5,
    metingen: ["2026-09-20T08:00:00Z"],
    kansen: 22,
    planPaginas: [...septemberPlan, oktoberPagina],
    teksten,
    hermetingen: [],
  });
  const stap = (r: typeof udenhout, id: string) => r.fases.find((f) => f.id === id)!;

  ok("de maand heet september", udenhout.maand === "september");
  ok("de eerste maand begint bij de nulmeting", udenhout.periode === "sinds je nulmeting op 20 september");
  ok(
    "rechtsboven staat wanneer er iets nieuws komt",
    udenhout.volgende === "Volgende meting op 1 oktober, over 8 dagen",
    udenhout.volgende,
  );
  ok(
    "vijf stappen, zonder kansen als eigen stap",
    udenhout.fases.map((f) => f.id).join(" ") === "meten plannen schrijven publiceren hermeten",
  );
  ok("meten staat, met de meetdatum", stap(udenhout, "meten").klaar && stap(udenhout, "meten").stand === "20 september");
  ok("en de kansen staan eronder", stap(udenhout, "meten").detail === "22 kansen gevonden");

  // ⚠️ De kern van de reparatie: dit stond op klaar.
  ok("plannen staat NIET op klaar zolang de maand op akkoord wacht", !stap(udenhout, "plannen").klaar);
  ok("plannen is aan de beurt", stap(udenhout, "plannen").actief);
  ok("en de klant is aan zet", stap(udenhout, "plannen").aanZet === "jij");
  ok("het telt alleen de pagina's van september", stap(udenhout, "plannen").stand === "14 pagina's");
  ok("hooguit één stap is aan de beurt", udenhout.fases.filter((f) => f.actief).length === 1);

  // ⚠️ De tweede reparatie: een briefing is geen geschreven tekst.
  ok("schrijven telt tegen het plan van deze maand", stap(udenhout, "schrijven").stand === "0 van de 14");
  ok("en noemt wat er buiten het plan geschreven is", stap(udenhout, "schrijven").detail === "en 2 buiten het plan");
  ok("en staat niet op klaar", !stap(udenhout, "schrijven").klaar);
  ok("publiceren telt live tegen het plan", stap(udenhout, "publiceren").stand === "0 van de 14 live");
  ok("en zegt dat er iets klaarstaat", stap(udenhout, "publiceren").detail === "2 teksten staan klaar");
  ok("hermeten legt uit wanneer het begint", stap(udenhout, "hermeten").detail === "start na je eerste publicatie");
  ok("de zin wijst de klant aan", udenhout.zin.startsWith("Jij bent aan zet: geef de 14 pagina's van deze maand vrij"));
  ok("en er gebeurde in augustus niets", udenhout.vorigeMaand === null);

  // ── Geen mengsel van maanden ───────────────────────────────────────────────
  //
  // Dezelfde klant op 2 oktober: de meting van 20 september telt niet meer,
  // en de 14 pagina's van september ook niet. Er staat één pagina in oktober.
  const oktober = ronde({
    now: new Date("2026-10-02T12:00:00Z"),
    clusters: 5,
    metingen: ["2026-09-20T08:00:00Z", "2026-10-01T06:30:00Z"],
    kansen: 18,
    planPaginas: [...septemberPlan, oktoberPagina],
    teksten: [
      ...teksten,
      { id: "v3", status: "published", createdAt: "2026-09-10T00:00:00Z", publishedAt: "2026-09-29T00:00:00Z" },
    ],
    hermetingen: [],
  });
  ok("op 2 oktober heet het oktober", oktober.maand === "oktober");
  ok("zonder nulmetingzin", oktober.periode === null);
  ok("met de meting van 1 oktober", stap(oktober, "meten").stand === "1 oktober");
  ok("en alleen de pagina van oktober", stap(oktober, "plannen").stand === "1 pagina");
  ok("een concept ligt bij de consultant", stap(oktober, "plannen").aanZet === "consultant");
  ok(
    "en het werk van september verdwijnt niet",
    oktober.vorigeMaand === "In september: 3 teksten geschreven en 1 live gezet.",
    oktober.vorigeMaand ?? "null",
  );
  ok("hermeten wacht op de twee weken", stap(oktober, "hermeten").detail === "2 weken na publicatie");

  // ── Een maand die rond is ──────────────────────────────────────────────────
  const klaar = (id: string, dag: string): MaandPlanPagina =>
    pagina(dag, { maandStatus: "goedgekeurd", status: "geplaatst", postedAt: `${dag}T12:00:00Z`, contentPieceId: id });
  const rond = ronde({
    now: new Date("2026-11-28T12:00:00Z"),
    clusters: 2,
    metingen: ["2026-11-01T06:10:00Z"],
    kansen: 4,
    planPaginas: [klaar("x1", "2026-11-05"), klaar("x2", "2026-11-12")],
    teksten: [
      { id: "x1", status: "published", createdAt: "2026-10-28T00:00:00Z", publishedAt: "2026-11-05T12:00:00Z" },
      { id: "x2", status: "published", createdAt: "2026-11-02T00:00:00Z", publishedAt: "2026-11-12T12:00:00Z" },
    ],
    hermetingen: ["2026-11-19T06:00:00Z", "2026-11-26T06:00:00Z"],
  });
  ok("dan is geen enkele stap aan de beurt", rond.fases.every((f) => f.klaar && !f.actief));
  ok("het plan telt als van de", stap(rond, "publiceren").stand === "2 van de 2 live");
  ok("hermetingen in het meervoud", stap(rond, "hermeten").stand === "2 hermetingen");
  ok("de zin belooft geen einde", !/(bent|is) klaar|voltooid|afgerond/i.test(rond.zin));
  ok("maar zegt wanneer het verdergaat", rond.zin.includes("Op 1 december meet ORBIT ENGINE opnieuw"));
  ok("de laatste dag zegt morgen", ronde({ ...leegInput(), now: new Date("2026-11-30T12:00:00Z") }).volgende.endsWith("morgen"));

  // ── Een merk zonder onderwerp (16 september 2026) ──────────────────────────
  //
  // ⚠️ DE STILLE STILSTAND DIE DIT VOORKOMT. Een net overgedragen klant heeft
  // nul clusters en kan zelf niets starten (`lib/cost-rules.ts`). "ORBIT ENGINE
  // is aan zet" liet hem wachten op iets dat nooit vanzelf kwam.
  function leegInput() {
    return { now: nu, clusters: 0, metingen: [], kansen: 0, planPaginas: [], teksten: [], hermetingen: [] };
  }
  const zonderOnderwerp = ronde(leegInput());
  ok("zonder cluster is de consultant aan zet", stap(zonderOnderwerp, "meten").aanZet === "consultant");
  ok("en meten is de actieve stap", stap(zonderOnderwerp, "meten").actief);
  ok("de zin wijst de consultant aan", zonderOnderwerp.zin.startsWith("Je consultant is aan zet"));
  ok("en nooit dat ORBIT ENGINE aan zet is", !zonderOnderwerp.zin.startsWith("ORBIT ENGINE is aan zet"));
  const metOnderwerp = ronde({ ...leegInput(), clusters: 1 });
  ok("met een cluster is ORBIT ENGINE weer aan zet", stap(metOnderwerp, "meten").aanZet === "orbit");
  ok("en de stand zegt wat er mist", stap(metOnderwerp, "meten").stand === "nog niet gemeten");

  // Reserves horen niet bij de maand die de klant afneemt (migratie 0049).
  const metReserve = ronde({
    ...leegInput(),
    clusters: 1,
    planPaginas: [pagina("2026-09-25"), pagina("2026-09-26", { isBuffer: true })],
  });
  ok("een reservepagina telt niet mee", stap(metReserve, "plannen").stand === "1 pagina");
});

group("wie mag betaald werk starten", () => {
  // ⚠️ Herstelplan na audit T4 (2 september 2026): alle zeven handelingen zijn
  // van de beheerder. Tussen 27 en 30 augustus 2026 stonden vijf ervan open
  // voor de klant zelf ("hij doet zijn eigen groeiwerk"), maar dat botste met
  // de sales-led strategie (docs/logbook.md §15): op productie kon een
  // ingelogde klant zelf een merk aanmaken en een cluster starten. De eigenaar
  // heeft dat teruggedraaid.
  //
  // Wat NIET teruggedraaid is: de knoppen blijven zichtbaar en klikbaar (kader
  // 2 van het herstelplan). Alleen `clusters_aanvullen` is een regieknop die de
  // klant niet eens mag zien (toegevoegd 30 augustus 2026,
  // optimalisatielab-orbit-engine.md §3.5); de andere zes mag hij zien en
  // aanklikken, en krijgt hij een uitnodigende melding.
  ok("een nieuw merk onderzoeken is van de beheerder", actionNeedsStaff("merk_onderzoeken"));
  ok("de meting bevestigen is van de beheerder", actionNeedsStaff("meting_starten"));
  ok("een cluster starten is van de beheerder", actionNeedsStaff("analyse_starten"));
  ok("content laten schrijven is van de beheerder", actionNeedsStaff("content_schrijven"));
  ok("een maand vrijgeven is van de beheerder", actionNeedsStaff("plan_goedkeuren"));
  ok("een reputatieanalyse blijft van de beheerder", actionNeedsStaff("reputatie_starten"));
  ok("nieuwe clusters aanvullen blijft ook van de beheerder", actionNeedsStaff("clusters_aanvullen"));
  ok("alle zeven handelingen staan op slot", STAFF_ONLY_ACTIONS.length === 7, String(STAFF_ONLY_ACTIONS.length));

  // K2: elke melding is specifiek en klinkt als een uitnodiging, niet als een
  // dichte deur.
  ok(
    "elke handeling heeft een eigen zin",
    new Set(Object.values(COST_DENIED)).size === Object.keys(COST_DENIED).length,
  );
  ok(
    "en geen enkele zin klinkt als geen toegang",
    Object.values(COST_DENIED).every((z) => !/geen toegang|niet toegestaan|mag niet/i.test(z)),
  );
  ok(
    // Tot de UX-audit van 23 september 2026 (P1.10) was dit andersom: deze zeven
    // zinnen zeiden "customer success manager", de rest van de app 24 keer "je
    // consultant". Eén woord per begrip (docs/schrijfstijl.md §11).
    "en elke zin noemt je consultant bij Outer Orbit",
    Object.values(COST_DENIED).every((z) => /je consultant bij Outer Orbit/.test(z) && !/customer success manager/i.test(z)),
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
  // contentflow-een-lijn.md §4.6: het paginascherm woont onder de bibliotheek.
  ok("het paginascherm laat de Bibliotheek oplichten", navActief("/merk/abc/strategie/bibliotheek/p1", bibliotheek));
  ok("en niet Clusters", !navActief("/merk/abc/strategie/bibliotheek/p1", clusters));
});

group("totalenZin: de totalen als één zin (UX-audit P1.1)", () => {
  // Tot 23 september 2026 een rij van vier grote cijfers. Wat er van die rij
  // moet blijven: tellen wat er GEMAAKT is (niet wat er voorgesteld is, zie 28
  // augustus 2026), het aantal clusters als stand van nu, en geen enkele
  // vergelijking met een vorige periode.
  const zin = totalenZin({ clusters: 3, geschreven: 12, geoptimaliseerd: 4, gepubliceerd: 6 });
  eq("de hele zin", zin, "3 clusters actief. Sinds de start: 12 nieuwe pagina's geschreven, 4 bestaande bijgewerkt, 6 live op je site.");
  ok("geen groeiclaim", !/\+|steeg|daalde|vorige/.test(zin));
  const een = totalenZin({ clusters: 1, geschreven: 1, geoptimaliseerd: 1, gepubliceerd: 0 });
  eq("enkelvoud, en nul live zegt dat", een, "1 cluster actief. Sinds de start: 1 nieuwe pagina geschreven, 1 bestaande bijgewerkt, nog niets live.");
  eq(
    "zonder geschreven pagina geen rij nullen",
    totalenZin({ clusters: 2, geschreven: 0, geoptimaliseerd: 0, gepubliceerd: 0 }),
    "2 clusters actief. Er is nog geen pagina geschreven.",
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
  // naast "Start het onderzoek voor deze pagina" is erger dan geen icoon: dan
  // zegt de tekening dat er iets bestaat wat er niet is.
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

group("opportunities: de kansenbron 'zoekverkeer' (blok A, 16 september 2026)", () => {
  const basis = {
    profileId: "p1",
    recommendations: [],
    unmeasuredTopics: [],
    crawlerBlocked: false,
    readyToPublish: 0,
    hasPlan: true,
  };

  const metRandje = opportunities({
    ...basis,
    randje: [
      { query: "dakinspectie kosten", page: "https://x.nl/a", position: 12, impressions: 300 },
      { query: "dakdekker zutphen", page: "https://x.nl/b", position: 15, impressions: 80 },
    ],
  });

  ok("elke randje-rij wordt een kans", metRandje.filter((o) => o.source === "zoekverkeer").length === 2);
  ok(
    "de meest getoonde staat eerst binnen deze bron",
    metRandje.filter((o) => o.source === "zoekverkeer")[0]!.url === "https://x.nl/a",
  );
  ok(
    "het is een bijwerkactie, geen nieuwe pagina",
    metRandje.filter((o) => o.source === "zoekverkeer").every((o) => o.handeling === "pagina_bijwerken"),
  );
  ok(
    "de positie staat in de titel",
    metRandje.find((o) => o.url === "https://x.nl/a")!.title.includes("12"),
  );
  ok(
    "er is geen doelvragen-getal: dit komt niet uit een AI-meting",
    metRandje.filter((o) => o.source === "zoekverkeer").every((o) => o.raakt === null && o.potential === null),
  );

  // ⚠️ Zonder Search Console-koppeling of zonder randje-pagina's levert deze
  // bron simpelweg niets op, geen foutmelding en geen lege kaart (conventie 3).
  const zonderRandje = opportunities(basis);
  ok("geen randje-kansen zonder invoer", !zonderRandje.some((o) => o.source === "zoekverkeer"));
  const expliciedLeeg = opportunities({ ...basis, randje: [] });
  ok("en ook niet bij een expliciet lege lijst", !expliciedLeeg.some((o) => o.source === "zoekverkeer"));
});

group("workKindIcon: elke soort werk heeft één tekening die bestaat", () => {
  // De chip rechts zegt wat je gaat DOEN, het icoon links waar het OVER gaat.
  // Valt er één weg, dan rendert het overzicht een leeg gat op de plek waar de
  // klant kijkt.
  const soorten: WorkKind[] = [
    "blokkade",
    "goedkeuring",
    "herstel",
    "contentmaand",
    "planpagina",
    "feit",
    "pagina",
    "offsite",
  ];
  for (const soort of soorten) {
    ok(`${soort} heeft een icoon dat bestaat`, Boolean(ICONEN[workKindIcon(soort)]));
  }

  // ⚠️ Twee soorten mogen bewust dezelfde tekening delen (`blokkade` leent
  // `letop`), maar niet ongemerkt: zodra er een derde bijkomt die hem óók
  // deelt, zegt het icoon niets meer. Zeven verschillende op acht soorten is
  // de stand van vandaag.
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
      workChipTone("contentmaand") === "attention" &&
      workChipTone("planpagina") === "attention" &&
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
    wachtOpPublicatie[2].text.includes("live staan"),
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
  ok("zeven handelingen hebben elk een eigen melding", zinnen.length === 7, `${zinnen.length}`);
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
    /je consultant/i.test(COST_DENIED.reputatie_starten),
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

// Teamsessie 1 september 2026: een kans/pagina met te weinig metingen erachter
// moet als "nog een meetronde nodig" gelabeld worden, nooit gefilterd, nooit
// een nieuwe AI-aanroep nodig. isConfident() gebruikt de al opgeslagen
// standaardfout (score_stderr/binomialStderr), geen nieuwe berekening.
group("isConfident: label voor te weinig metingen, nooit een filter", () => {
  ok("onbekende standaardfout telt als voldoende zeker", isConfident(null) === true);
  ok("een smalle band (weinig ruis) is voldoende zeker", isConfident(5) === true);
  ok("een brede band (bv. 1 doelvraag) is nog niet zeker genoeg", isConfident(20) === false);
  ok(
    "precies op de grens telt nog als voldoende zeker",
    isConfident(CONFIDENCE_MARGIN_LIMIT / Z95) === true,
  );
  ok(
    "net over de grens telt als nog een meetronde nodig",
    isConfident(CONFIDENCE_MARGIN_LIMIT / Z95 + 0.01) === false,
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
  ok("meer dan 100 in totaal wordt geweigerd", !teveelTotaal.ok);
  ok(
    "en de melding noemt wat het zou kosten",
    !teveelTotaal.ok && teveelTotaal.reason.includes("$"),
  );

  ok("negatief mag niet", !checkMix({ "Oriëntatie": -1, "Overweging": 10, "Beslissing": 10 }).ok);
  ok("kommagetal mag niet", !checkMix({ "Oriëntatie": 5.5, "Overweging": 10, "Beslissing": 10 }).ok);
  ok("onzin mag niet", !checkMix({ "Oriëntatie": "veel", "Overweging": 10, "Beslissing": 10 }).ok);
});

group("checkNewClusterMix: de engere grenzen van een nieuw cluster", () => {
  ok("de standaard 10/10/10 komt erdoor", checkNewClusterMix(DEFAULT_MIX).ok);
  ok(
    "en de grenzen kloppen met wat het scherm belooft",
    NEW_CLUSTER_MIN_TOTAL === 10 && NEW_CLUSTER_MAX_TOTAL === 60,
  );

  const onderDeTien = checkNewClusterMix({ "Oriëntatie": 3, "Overweging": 3, "Beslissing": 3 });
  ok("minder dan tien in totaal wordt geweigerd", !onderDeTien.ok);
  ok(
    "en de melding noemt het minimum",
    !onderDeTien.ok && onderDeTien.reason.includes(String(NEW_CLUSTER_MIN_TOTAL)),
  );

  const preciesTien = checkNewClusterMix({ "Oriëntatie": 4, "Overweging": 3, "Beslissing": 3 });
  ok("precies tien mag wel", preciesTien.ok);

  const bovenDeZestig = checkNewClusterMix({ "Oriëntatie": 21, "Overweging": 20, "Beslissing": 20 });
  ok("meer dan zestig in totaal wordt geweigerd", !bovenDeZestig.ok);
  ok(
    "en de melding noemt het maximum",
    !bovenDeZestig.ok && bovenDeZestig.reason.includes(String(NEW_CLUSTER_MAX_TOTAL)),
  );

  const preciesZestig = checkNewClusterMix({ "Oriëntatie": 20, "Overweging": 20, "Beslissing": 20 });
  ok("precies zestig mag wel", preciesZestig.ok);

  // De grens per fase (MAX_PER_STAGE) en op onzinnige invoer blijven gelden,
  // want `checkNewClusterMix` bouwt bovenop `checkMix` en vervangt hem niet.
  ok(
    "de grens per fase blijft ook hier gelden",
    !checkNewClusterMix({ "Oriëntatie": 41, "Overweging": 10, "Beslissing": 10 }).ok,
  );
});

group("describeMix: wat het kost en wat het oplevert", () => {
  const zin = describeMix(DEFAULT_MIX);
  ok("noemt het totaal", zin.includes("30 vragen"));
  // $0,024 per vraag maal 30 is $0,72. Gemeten over 428 echte metingen.
  // ⚠️ Met een komma, niet een punt: punt 9 van
  // docs/tasks/opdracht-bevindingen-5-tot-9.md. Dit was tot 31 augustus 2026
  // letterlijk "$0.72" en dat botste in dezelfde zin met "±16,4 punten".
  ok("noemt de maandkosten, in de Nederlandse schrijfwijze", zin.includes("$0,72"));
  ok("en niet meer de punt-schrijfwijze", !zin.includes("$0.72"));
  // Bij dertig vragen en een score rond 30 is de 95%-band ±16,4 punten.
  ok("en de onzekerheidsmarge", zin.includes("16,4"));

  // ⚠️ De marge schaalt met de wortel: verdubbelen levert een kwart smallere
  // band, niet de helft. Dat is precies wat iemand moet weten vóórdat hij het
  // getal omhoog zet.
  const zestig = describeMix({ "Oriëntatie": 20, "Overweging": 20, "Beslissing": 20 });
  ok("zestig vragen kost twee keer zoveel", zestig.includes("$1,44"));
  ok("maar de marge wordt maar een kwart smaller", zestig.includes("11,6"));
});

group("formatUsd: de Nederlandse schrijfwijze voor een dollarbedrag (punt 9)", () => {
  ok("30 vragen: $0,72", formatUsd(30 * 0.024) === "$0,72");
  ok("60 vragen: $1,44", formatUsd(60 * 0.024) === "$1,44");
  ok("een rond getal krijgt toch twee decimalen", formatUsd(2) === "$2,00");
  ok("er komt nooit een punt in te staan", !formatUsd(1234.5).includes("."));
});

group("enkelOfMeervoud: één hulpstuk voor heel de app (punt 9)", () => {
  ok("één is enkelvoud", enkelOfMeervoud(1, "punt", "punten") === "punt");
  ok("nul is meervoud", enkelOfMeervoud(0, "punt", "punten") === "punten");
  ok("twee is meervoud", enkelOfMeervoud(2, "punt", "punten") === "punten");
});

group("suggestPromptMix: grotere clusters krijgen meer vragen (werkpakket B punt 2)", () => {
  const klein = suggestPromptMix({ offeringCount: 0, regionCount: 0 });
  ok("geen diensten en geen regio's blijft de standaard", mixTotal(klein) === 30, String(mixTotal(klein)));
  ok("gelijk aan DEFAULT_MIX", JSON.stringify(klein) === JSON.stringify(DEFAULT_MIX));

  const groter = suggestPromptMix({ offeringCount: 10, regionCount: 4 });
  ok("meer diensten en regio's levert meer vragen op", mixTotal(groter) > 30, String(mixTotal(groter)));
  ok(
    "de regio's wegen door in Beslissing",
    groter.Beslissing > DEFAULT_MIX.Beslissing,
    JSON.stringify(groter),
  );

  // Extreme waarden mogen nooit de per-fase- of totaalgrens doorbreken, ook al
  // zou de wortelschaal dat wiskundig toestaan.
  const extreem = suggestPromptMix({ offeringCount: 500, regionCount: 500 });
  ok("Oriëntatie blijft binnen de perfasegrens", extreem.Oriëntatie <= MAX_PER_STAGE);
  ok("Overweging blijft binnen de perfasegrens", extreem.Overweging <= MAX_PER_STAGE);
  ok("Beslissing blijft binnen de perfasegrens", extreem.Beslissing <= MAX_PER_STAGE);
  ok(
    "het totaal blijft binnen MAX_TOTAL",
    mixTotal(extreem) <= MAX_TOTAL,
    String(mixTotal(extreem)),
  );
  ok("checkMix keurt de suggestie altijd goed", checkMix(extreem).ok, JSON.stringify(extreem));

  // Negatieve of kapotte signalen mogen nooit een negatieve verdeling opleveren.
  const negatief = suggestPromptMix({ offeringCount: -5, regionCount: -5 });
  ok("negatieve signalen worden behandeld als nul", JSON.stringify(negatief) === JSON.stringify(DEFAULT_MIX));
});

group("De waarschuwing bij een grote meetronde (werkpakket B punt 6)", () => {
  ok("de standaard verdiening geen waarschuwing", !exceedsRunBudgetWarning(DEFAULT_MIX));
  ok(
    "een verdeling boven de drempel wel",
    exceedsRunBudgetWarning({ "Oriëntatie": 30, "Overweging": 30, "Beslissing": 30 }),
  );
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
console.log("\nHet budgetplafond (F1, herstelplan na audit T5)");

group("spendVerdict: onder, op en over het accountplafond", () => {
  // €20 plafond bij koers 1,08 is $21,60. De grens is `>=`: staat er precies
  // het plafond op, dan is het op.
  const onder = spendVerdict("account", 16.2, 20);
  ok("ruim onder het plafond mag door", onder.ok);
  ok("en er is geen melding", onder.message === null);
  ok("het bedrag staat in euro's, niet in dollars", Math.abs(onder.spentEur - 15.0) < 0.01);

  const precies = spendVerdict("account", 21.6, 20);
  ok("precies op het plafond is op", !precies.ok);

  const over = spendVerdict("account", 23.76, 20);
  ok("erover blokkeert", !over.ok);
  ok("en noemt het account", over.scope === "account");

  // T5.2: niet alleen "geweigerd", ook wat de beheerder eraan doet, en of dat
  // wachten tot morgen is of iets verhogen.
  const m = over.message ?? "";
  ok("de melding noemt het bedrag dat er staat", m.includes("22,00"));
  ok("en het plafond", m.includes("20,00"));
  ok("en dat morgen de teller weer op nul staat", m.includes("morgen"));
  ok("en waar je het voor dit account verhoogt", m.includes("beheerscherm"));

  // Nederlandse notatie, met een vaste locale: de server in Vercel staat niet
  // op Nederlands en het bedrag hoort er voor iedereen hetzelfde uit te zien.
  ok("komma als decimaalteken", m.includes("€20,00") && !m.includes("€20.00"));
});

group("spendVerdict: het totaalplafond heeft een eigen verhaal", () => {
  const totaal = spendVerdict("totaal", 60, 50);
  ok("het totaalplafond blokkeert ook", !totaal.ok);
  ok("en zegt dat het over alle klanten samen gaat", (totaal.message ?? "").includes("alle klanten"));
  ok("en dat dit de noodrem is, niet een normale grens", (totaal.message ?? "").includes("noodrem"));
  // T5.2: bij het totaalplafond is "bel iemand" het andere antwoord naast
  // "wacht tot morgen", want dit hoort geen normale drukte te zijn.
  ok("en dat je kunt bellen als het vastloopt", (totaal.message ?? "").includes("bel"));
  ok("en ook hier: morgen staat de teller weer op nul", (totaal.message ?? "").includes("morgen"));

  // ⚠️ Zit je tegen allebei aan, dan gaat het totaalplafond voor: dat betekent
  // dat er iets aan de hand is over alle klanten heen, en dat wil je weten
  // vóór je het dagplafond van één account gaat verhogen.
  const beide = combinedVerdict(spendVerdict("totaal", 60, 50), spendVerdict("account", 23.76, 20));
  ok("het totaalplafond wint van het accountplafond", beide.scope === "totaal");

  const alleenAccount = combinedVerdict(spendVerdict("totaal", 10, 50), spendVerdict("account", 23.76, 20));
  ok("gaat het totaal goed, dan telt het account", alleenAccount.scope === "account");

  const allebeiGoed = combinedVerdict(spendVerdict("totaal", 10, 50), spendVerdict("account", 5, 20));
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
  ok("en blokkeert dan ook echt alles", !spendVerdict("account", 0, 0).ok);
});

group("de standaardbedragen staan waar ze op gekozen zijn (T5)", () => {
  // Herstelplan na audit T5: €20 per klant per dag, €50 over alle klanten
  // samen per dag. Nagerekend tegen de echte kosten uit T1.4/T2: een
  // onboarding ~$0,25, een meting van dertig vragen ~$0,85, een contentpagina
  // met een reparatieronde erbij ~$0,51 (concept + één ronde à $0,26). Een
  // normale werkdag voor één klant blijft daar ruim onder.
  ok("het accountplafond staat op €20", DEFAULT_ACCOUNT_DAILY_LIMIT_EUR === 20);
  ok("het totaalplafond op €50", DEFAULT_TOTAL_DAILY_LIMIT_EUR === 50);
  ok(
    "een drukke klantdag (onboarding + meting + twee pagina's, ~$2,45) komt er niet in de buurt",
    spendVerdict("account", 0.25 + 0.85 + 2 * 0.51, DEFAULT_ACCOUNT_DAILY_LIMIT_EUR).ok,
  );
  // Het totaalplafond vangt nog altijd twee klanten die op dezelfde dag allebei
  // hun eigen dagplafond volmaken (2 × €20 = €40), maar geen derde (€60).
  ok(
    "twee klanten die allebei hun dagplafond volmaken past nog",
    spendVerdict("totaal", 2 * DEFAULT_ACCOUNT_DAILY_LIMIT_EUR * 1.08, DEFAULT_TOTAL_DAILY_LIMIT_EUR).ok,
  );
  ok(
    "een derde klant die hetzelfde doet niet meer",
    !spendVerdict("totaal", 3 * DEFAULT_ACCOUNT_DAILY_LIMIT_EUR * 1.08, DEFAULT_TOTAL_DAILY_LIMIT_EUR).ok,
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

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe appstructuur: hoofdstukken en doorverwijzingen (17 augustus 2026)");

group("de zijbalk kent vijf klanthoofdstukken plus Sales en Admin", () => {
  const merkId = "00000000-0000-0000-0000-000000000001";
  const klant = hoofdstukken([...brandNav(merkId, false), ...generalNav(false), ...salesNav(false)]);
  const beheerder = hoofdstukken([...brandNav(merkId, true), ...generalNav(true), ...salesNav(true)]);

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
  // Clusters vóór Strategie: zonder meting valt er niets te plannen.
  ok(
    "Clusters staat tussen Overzicht en Strategie",
    HOOFDSTUKKEN.indexOf("Overzicht") < HOOFDSTUKKEN.indexOf("Clusters") &&
      HOOFDSTUKKEN.indexOf("Clusters") < HOOFDSTUKKEN.indexOf("Strategie"),
  );
  // UX-audit 23 september 2026 (P1.5): de klant ziet eerst wat hij heeft, de
  // consultant eerst waar hij zoekt.
  eq(
    "de klant ziet eerst Mijn clusters",
    (klant.find((k) => k.naam === "Clusters")?.items ?? []).map((i) => i.label).join(", "),
    "Mijn clusters, Clusters ontdekken",
  );
  eq(
    "de consultant eerst Clusters ontdekken",
    (beheerder.find((k) => k.naam === "Clusters")?.items ?? []).map((i) => i.label).join(", "),
    "Clusters ontdekken, Mijn clusters",
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
  //
  // ⚠️ Sales mag er sinds 24 augustus 2026 vijf, en dat is de derde uitzondering.
  // De onderbouwing staat bij `GRENS_PER_HOOFDSTUK` en is van een andere soort:
  // dit is geen klanthoofdstuk. Het bezwaar van 17 augustus ging over wat een
  // KLANT te zien krijgt, en de klant ziet deze groep nooit.
  //
  // Sinds die derde uitzondering leest deze test de grens uit `lib/nav.ts` in
  // plaats van hem hier te herhalen. Dat is niet gemak maar het punt: de
  // uitzondering staat dan op één plek, met een naam en een reden erbij, en niet
  // als een getal in een test dat niemand tegenkomt.
  for (const kop of beheerder) {
    const grens = GRENS_PER_HOOFDSTUK[kop.naam];
    ok(
      `${kop.naam} heeft hooguit ${grens} bestemmingen`,
      kop.items.length <= grens,
      `${kop.items.length}`,
    );
  }

  // ⚠️ En de grens zelf mag niet stilletjes omhoog kruipen. Zonder deze
  // controle is "hooguit vijf" binnen een half jaar de norm voor elk hoofdstuk,
  // en dan is de herindeling van 17 augustus terug bij af. De klanthoofdstukken
  // blijven op drie, met Analytics en Strategie als de twee genoemde
  // uitzonderingen op vier.
  const klantKoppen = HOOFDSTUKKEN.filter((n) => n !== "Sales" && n !== "Admin");
  // Strategie is sinds 23 september 2026 terug op drie: Clusters werd een eigen
  // hoofdstuk. Alleen Analytics houdt zijn vierde.
  const teRuim = klantKoppen.filter(
    (n) => GRENS_PER_HOOFDSTUK[n] > (n === "Analytics" ? 4 : 3),
  );
  ok(
    "de klanthoofdstukken blijven op drie, alleen Analytics mag er vier",
    teRuim.length === 0,
    teRuim.join(", "),
  );
  eq("en Sales is de enige met vijf", String(GRENS_PER_HOOFDSTUK.Sales), "5");
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
    "/profielen/:id": "/merk/:id/admin/0-meting",
    "/profielen/:id/merkprofiel": "/merk/:id/merkprofiel/bewerken",
    "/profielen/:id/profielgegevens": "/merk/:id/merkprofiel/bewerken",
    "/profielen/:id/aanvullen": "/merk/:id/strategie/vragen",
    "/profielen/:id/toevoegingen": "/merk/:id/strategie/vragen",
    "/profielen/:id/producten": "/merk/:id/admin/aanbodboom",
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

// ⚠️ Herstelplan na audit T1.2: `status: "ready"` betekent "de pijplijn is
// klaar", niet "een mens hoeft niets meer te doen". Een pagina met
// `needsReview: true` telde vóór deze wijziging toch mee als "klaar voor
// vrijgave", en gaf de klant zo een te hoog cijfer.
group("'klaar voor vrijgave' telt geen pagina's die nog nagekeken moeten worden (T1.2)", () => {
  const rijen: LibraryRow[] = [
    {
      id: "1",
      analysisId: "a",
      cluster: "Cluster A",
      title: "Onderhoud aan je CV-ketel",
      type: "article",
      action: "nieuw",
      status: "ready",
      needsReview: false,
      geoScore: 82,
      publishedUrl: null,
      createdAt: "2026-08-01T00:00:00Z",
    },
    {
      id: "2",
      analysisId: "a",
      cluster: "Cluster A",
      title: "Kennismakingsafspraak bij de tandarts",
      type: "landing",
      action: "verbeteren",
      status: "ready",
      needsReview: true,
      geoScore: 68,
      publishedUrl: null,
      createdAt: "2026-08-01T00:00:00Z",
    },
  ];

  const t = libraryTotals(rijen);
  ok("geschreven telt allebei", t.geschreven === 2);
  ok(
    "klaar voor vrijgave telt niet de pagina die nog nagekeken moet worden",
    t.klaarVoorVrijgave === 1,
    String(t.klaarVoorVrijgave),
  );
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

group("de contentpagina van een stuk slaat de dossierchrome over", () => {
  ok(
    "de contentpagina zelf",
    isStukpagina("/analyses/an-1/bibliotheek/piece-1", "an-1"),
  );
  ok(
    "ook met een trailing slash",
    isStukpagina("/analyses/an-1/bibliotheek/piece-1/", "an-1"),
  );
  ok(
    "de bibliotheeklijst zelf niet (geen pieceId)",
    !isStukpagina("/analyses/an-1/bibliotheek", "an-1"),
  );
  ok("instellingen niet", !isStukpagina("/analyses/an-1/instellingen", "an-1"));
  ok("concept niet", !isStukpagina("/analyses/an-1/concept", "an-1"));
  ok(
    "het stuk van een ander cluster niet",
    !isStukpagina("/analyses/an-2/bibliotheek/piece-1", "an-1"),
  );
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

group("vergelijkingsvenster: waarom het zoekverkeerscherm nooit een verandering toonde", () => {
  // ⚠️ DE BEVINDING VAN 16 SEPTEMBER 2026 (docs/tasks/zoekdata-in-de-keten.md
  // §7.2). Het zoekverkeerscherm gaf `volledigVenster()` (het hele databereik)
  // door aan `vergelijk()` als huidige periode. Dan ligt de periode ervóór per
  // definitie vóór de vroegste dag die er is, dus `vergelijkbaar` wordt nooit
  // `true`, hoeveel data er ook binnenkomt.
  const halfJaar: GscDag[] = [];
  for (let i = 0; i < 180; i++) {
    halfJaar.push({
      day: verschuif("2026-03-01", i),
      page: "/a",
      clicks: 3,
      impressions: 90,
      position: 12,
    });
  }

  const metVolledigBereik = vergelijk(halfJaar, volledigVensterGsc(halfJaar)!);
  ok(
    "met het volledige bereik als venster is er NOOIT een vergelijking, dat was de fout",
    !metVolledigBereik.vergelijkbaar,
  );

  const venster = vergelijkingsvenster(halfJaar)!;
  ok("het venster is precies 28 dagen lang", dagenTussen(venster.start, venster.eind) === VERGELIJKINGSVENSTER_DAGEN);
  ok("het eindigt op de laatste dag die we hebben", venster.eind === volledigVensterGsc(halfJaar)!.eind);

  const metVastVenster = vergelijk(halfJaar, venster);
  ok("met een vast venster van 28 dagen komt er wél een vergelijking", metVastVenster.vergelijkbaar);
  ok("28 dagen keer 3 klikken is 84", metVastVenster.nu.clicks === 84);
  ok("en het verschil met de 28 dagen ervoor is 0, want de reeks is vlak", metVastVenster.verschil.clicks === 0);

  // Te weinig geschiedenis (minder dan 56 dagen): nog steeds eerlijk `null`,
  // geen schijnvergelijking.
  const zesWeken: GscDag[] = [];
  for (let i = 0; i < 40; i++) {
    zesWeken.push({ day: verschuif("2026-08-01", i), page: "/a", clicks: 1, impressions: 10, position: 5 });
  }
  const kortVenster = vergelijkingsvenster(zesWeken)!;
  const kortResultaat = vergelijk(zesWeken, kortVenster);
  ok("met 40 dagen historie is 28+28 nog niet gedekt, dus geen vergelijking", !kortResultaat.vergelijkbaar);

  ok("zonder data levert het venster null op", vergelijkingsvenster([]) === null);
});

group("V5: geen delta bij een onvolledig eerste venster", () => {
  const venster = { start: "2026-08-01", eind: "2026-08-10" };

  // Data begint pas op 5 augustus: het vorige venster (22 juli tot 31 juli)
  // is dus een gat en geen meting. Zonder de correctie zou "0 klikken toen"
  // een schijnstijging van precies 100 klikken opleveren.
  const onvolledig: GscDag[] = [
    { day: "2026-08-05", page: "/a", clicks: 100, impressions: 1000, position: 10 },
  ];
  const vOnvolledig = vergelijk(onvolledig, venster);
  ok("het venster is niet vergelijkbaar", !vOnvolledig.vergelijkbaar);
  ok("dus geen kliksverschil", vOnvolledig.verschil.clicks === null);
  ok("geen vertoningenverschil", vOnvolledig.verschil.impressions === null);
  ok("geen ctr-verschil", vOnvolledig.verschil.ctr === null);

  // Data reikt tot vóór het begin van het vorige venster: nu is een lege dag
  // daarbinnen een echte nul, en telt het verschil gewoon.
  const volledig: GscDag[] = [
    { day: "2026-06-01", page: "/a", clicks: 1, impressions: 10, position: 5 },
    { day: "2026-08-05", page: "/a", clicks: 100, impressions: 1000, position: 10 },
  ];
  const vVolledig = vergelijk(volledig, venster);
  ok("dit venster is wél vergelijkbaar", vVolledig.vergelijkbaar);
  eq2("en het kliksverschil is het echte verschil", vVolledig.verschil.clicks, 100);
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

group("de positieverdeling uit Search Console (blok A)", () => {
  const venster = { start: "2026-08-01", eind: "2026-08-10" };
  const rijen: GscQueryDag[] = [
    // Op het randje: positie 12, genoeg vertoningen.
    { day: "2026-08-05", query: "dakinspectie kosten", page: "/a", clicks: 5, impressions: 100, position: 12 },
    { day: "2026-08-06", query: "dakinspectie kosten", page: "/a", clicks: 3, impressions: 60, position: 12 },
    // Positie 3: al goed, hoort niet bij "op het randje".
    { day: "2026-08-05", query: "dakdekker zutphen", page: "/b", clicks: 20, impressions: 200, position: 3 },
    // Positie 15 maar te weinig vertoningen: geen schijnprecisie.
    { day: "2026-08-05", query: "dakinspectie zutphen", page: "/c", clicks: 1, impressions: 10, position: 15 },
    // Positie 35: te ver weg voor één zet.
    { day: "2026-08-05", query: "dakonderhoud", page: "/d", clicks: 1, impressions: 80, position: 35 },
  ];

  const totalen = totalenPerQueryPagina(rijen, venster);
  ok("vier combinaties, opgeteld over het venster", totalen.length === 4);
  const a = totalen.find((t) => t.page === "/a")!;
  ok("klikken tellen op", a.clicks === 8);
  ok("vertoningen ook", a.impressions === 160);
  ok("de positie is gewogen op vertoningen, hier gelijk aan 12", Math.abs(a.position! - 12) < 1e-9);

  const randje = opHetRandje(totalen);
  ok("alleen de combinatie tussen 8 en 20 met genoeg vertoningen", randje.length === 1);
  ok("dat is /a", randje[0]!.page === "/a");
  ok(
    "de grens ligt op RANDJE_MIN_VERTONINGEN",
    randje.every((r) => r.impressions >= RANDJE_MIN_VERTONINGEN),
  );

});

group("stijgers en dalers over twee vensters", () => {
  const nu = { start: "2026-08-11", eind: "2026-08-20" };
  const reeks: GscQueryDag[] = [
    // Vorige venster: positie 20. Huidige venster: positie 8. Een stijger.
    { day: "2026-08-05", query: "dakinspectie kosten", page: "/a", clicks: 1, impressions: 60, position: 20 },
    { day: "2026-08-15", query: "dakinspectie kosten", page: "/a", clicks: 10, impressions: 60, position: 8 },
    // Vorige venster: positie 5. Huidige venster: positie 14. Een daler.
    { day: "2026-08-05", query: "dakdekker zutphen", page: "/b", clicks: 15, impressions: 100, position: 5 },
    { day: "2026-08-15", query: "dakdekker zutphen", page: "/b", clicks: 2, impressions: 100, position: 14 },
    // Alleen in het huidige venster: geen "vorige" om mee te vergelijken.
    { day: "2026-08-15", query: "nieuwe vraag", page: "/e", clicks: 1, impressions: 30, position: 9 },
  ];

  const b = gscBewegingen(reeks, nu);
  ok("alleen combinaties met een positie in BEIDE vensters", b.length === 2);
  ok("de nieuwe vraag zonder verleden telt niet mee", !b.some((x) => x.query === "nieuwe vraag"));

  const stijgersLijst = gscStijgers(b);
  ok("precies één stijger", stijgersLijst.length === 1);
  ok("dakinspectie kosten steeg, van 20 naar 8", stijgersLijst[0]!.verschil === 8 - 20);

  const dalersLijst = gscDalers(b);
  ok("precies één daler", dalersLijst.length === 1);
  ok("dakdekker zutphen daalde, van 5 naar 14", dalersLijst[0]!.verschil === 14 - 5);
});

group("berekenOpbrengst: wat ORBIT ENGINE oplevert, niet wat de site oplevert (§7)", () => {
  const nu = new Date("2026-09-10T12:00:00Z");

  const paginas: OpbrengstPagina[] = [
    { page: "https://x.nl/a", publishedAt: "2026-07-01" },
    // Jonger dan het vergelijkingsvenster: geen slecht presterende pagina.
    { page: "https://x.nl/nieuw", publishedAt: "2026-09-05" },
  ];

  const rijen: GscDag[] = [];
  for (let i = 0; i < 90; i++) {
    const dag = verschuif("2026-06-01", i);
    // Onze pagina: 5 klikken per dag, ELKE dag, ook vóór de publicatiedatum
    // (bijvoorbeeld een pagina die ORBIT ENGINE herschreef en die al langer
    // bestond). Dat moet uit "klikkenSindsStart" gefilterd worden.
    rijen.push({ day: dag, page: "https://x.nl/a", clicks: 5, impressions: 50, position: 10 });
    // Een pagina die niet van ons is: telt mee in de controlegroep.
    rijen.push({ day: dag, page: "https://x.nl/oud", clicks: 2, impressions: 40, position: 8 });
  }
  // De nieuwe pagina heeft nog nauwelijks cijfers, zoals in werkelijkheid.
  rijen.push({ day: "2026-09-08", page: "https://x.nl/nieuw", clicks: 0, impressions: 3, position: 40 });

  const o = berekenOpbrengst(paginas, rijen, 4, nu);

  ok("twee pagina's live", o.paginasLive === 2);
  ok("vier gepland", o.paginasGepland === 4);

  // ⚠️ §7.4a: /a heeft cijfers van 1 juni tot en met 29 augustus (90 dagen,
  // i = 0 tot 89 vanaf 1 juni). Vanaf de publicatiedatum (1 juli) tot en met
  // 29 augustus is dat 60 dagen, dus 60 × 5 = 300 klikken. De klikken van vóór
  // de publicatiedatum (1 tot en met 30 juni, 30 dagen × 5) tellen NIET mee,
  // ook al staan ze in de rijen van diezelfde URL.
  eq2("klikken tellen pas vanaf de eigen publicatiedatum", o.klikkenSindsStart, 60 * 5);

  ok("er is een vergelijking voor onze pagina's", o.vergelijkingOns !== null);
  ok("en voor de controlegroep", o.vergelijkingControlegroep !== null);
  // ⚠️ Nagerekend: onzeRijen loopt door tot 8 september (/nieuw), dus het
  // venster is 12 augustus tot 8 september. Daarin heeft /a nog maar 18 van
  // de 28 dagen cijfers (12 t/m 29 augustus, want de reeks van /a stopt op
  // 29 augustus): 18 × 5 = 90 klikken. De controlegroep (alleen /oud) heeft
  // wél een volle 28 dagen: 28 × 2 = 56.
  eq2("onze pagina's: 90 klikken deze periode", o.vergelijkingOns!.nu.clicks, 90);
  eq2("de controlegroep: 56 klikken deze periode", o.vergelijkingControlegroep!.nu.clicks, 56);
  ok(
    "de controlegroep is de rest, niet de hele site: onze pagina's tellen er niet in mee",
    o.vergelijkingControlegroep!.nu.clicks !== o.vergelijkingOns!.nu.clicks,
  );

  ok("precies één jonge pagina", o.jongePaginas === 1);

  // Zonder publicatiedatums is "sinds start" onbekend, geen 0 (conventie 3).
  const zonderDatums = berekenOpbrengst(
    [{ page: "https://x.nl/a", publishedAt: null }],
    rijen,
    0,
    nu,
  );
  ok("geen publicatiedatum betekent geen getal, geen 0", zonderDatums.klikkenSindsStart === null);
});

// ⚠️ "zonder DATAFORSEO-sleutel gedraagt de app zich identiek" staat als
// scenario 13 in test-chain.ts, niet hier: lib/search-demand/registry.ts is
// `server-only`, en die grendel is alleen in de ketentest opgeheven
// (scripts/chain/server-only-stub.js). test-unit.ts draait zonder die stub
// (zie de toelichting bovenaan dit bestand), dus een directe import hier
// crasht de hele testrun.

group("kandidaatZoektermen: thema plus plaats, met terugval op het thema alleen (19 september 2026)", () => {
  eq(
    "thema plus plaats als specifiekste kandidaat, thema alleen als terugval",
    kandidaatZoektermen(
      "daklekkage",
      "Wat kost het gemiddeld om een daklekkage in Apeldoorn snel te laten repareren?",
      ["Apeldoorn", "Zutphen", "Deventer"],
    ).join(" | "),
    "daklekkage apeldoorn | daklekkage",
  );
  eq(
    "geen plaats in de vraag: alleen het thema, geen dubbele kandidaat",
    kandidaatZoektermen("hardloopschoenen", "Welke hardloopschoenen passen bij overpronatie?", []).join(" | "),
    "hardloopschoenen",
  );
  eq(
    "geen serviceRegions bekend: alleen het thema, ook al staat er een plaats in de zin",
    kandidaatZoektermen("dakdekker", "Welke dakdekker in Apeldoorn kan snel komen?", []).join(" | "),
    "dakdekker",
  );
  eq(
    "twee plaatsen in de vraag: de eerste in de volgorde van serviceRegions wint",
    kandidaatZoektermen(
      "bekkenfysiotherapie",
      "Wat kost bekkenfysiotherapie in Nieuwegein of Utrecht?",
      ["Utrecht", "Nieuwegein"],
    ).join(" | "),
    "bekkenfysiotherapie utrecht | bekkenfysiotherapie",
  );
  eq(
    "staat de plaats al in het thema, dan wordt hij niet dubbel geplakt en is er maar één kandidaat",
    kandidaatZoektermen("dakdekker apeldoorn", "Welke dakdekker in Apeldoorn kan snel komen?", [
      "Apeldoorn",
    ]).join(" | "),
    "dakdekker apeldoorn",
  );
  ok("een leeg thema levert geen kandidaten op", kandidaatZoektermen("", "Wat kost een dakinspectie?", []).length === 0);
  ok(
    "een te kort thema levert geen kandidaten op",
    kandidaatZoektermen("x".repeat(MIN_KEYWORD_LENGTH - 1), "een vraag", []).length === 0,
  );
  eq(
    "hoofdletterongevoelig",
    kandidaatZoektermen("Daklekkage", "... in APELDOORN ...", ["apeldoorn"]).join(" | "),
    "daklekkage apeldoorn | daklekkage",
  );
});

group("binnenWoordlimiet: de woordlimiet die één batch niet mag laten mislukken (19 september 2026)", () => {
  ok(
    "MAX_WOORDEN_PER_ZOEKTERM woorden past nog",
    binnenWoordlimiet(Array.from({ length: MAX_WOORDEN_PER_ZOEKTERM }, (_, i) => `w${i}`).join(" ")),
  );
  ok(
    "één woord meer dan MAX_WOORDEN_PER_ZOEKTERM past niet meer",
    !binnenWoordlimiet(Array.from({ length: MAX_WOORDEN_PER_ZOEKTERM + 1 }, (_, i) => `w${i}`).join(" ")),
  );
  ok("één woord past", binnenWoordlimiet("dakinspectie"));
  ok("een lege term past niet", !binnenWoordlimiet(""));
  ok("alleen witruimte past niet", !binnenWoordlimiet("   "));
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

group("groepeerPerSectie: de wachtrij in de vaste secties van de app", () => {
  const items: WorkItem[] = [
    wachtrijItem("goedkeuring:1", "goedkeuring", "Bekijk en bevestig het concept"),
    wachtrijItem("herstel:1", "herstel", "Er is iets misgegaan"),
    wachtrijItem("contentmaand:1", "contentmaand", "Maand 3 van je contentplan"),
    wachtrijItem("planpagina:1", "planpagina", "Losse pagina"),
    wachtrijItem("feit:1", "feit", "Eén vraag over je bedrijf"),
    wachtrijItem("pagina:1", "pagina", "Briefing", "Briefing invullen"),
    wachtrijItem("pagina:2", "pagina", "Nakijken", "Pagina nakijken"),
    wachtrijItem("pagina:3", "pagina", "Publiceren", "Pagina publiceren"),
  ];
  const overzicht = groepeerPerSectie(items);

  ok(
    "de vier kopjes staan er, in die volgorde",
    overzicht.secties.map((s) => s.kop).join(",") ===
      "Cluster,Contentplan,Openstaande vragen,Bibliotheek",
  );

  const cluster = overzicht.secties.find((s) => s.kop === "Cluster")!;
  ok(
    "cluster: eerst bevestigen, dan herstellen",
    cluster.subkoppen.map((s) => s.subkop).join(",") ===
      "Clusters bevestigen (onderzoek starten),Clusters herstellen na mislukte meting",
  );

  const contentplan = overzicht.secties.find((s) => s.kop === "Contentplan")!;
  ok(
    "contentplan: eerst de maand, dan de losse pagina",
    contentplan.subkoppen.map((s) => s.subkop).join(",") ===
      "Contentmaand vrijgeven (definitief maken),Losse geplande pagina's goedkeuren",
  );

  const bibliotheek = overzicht.secties.find((s) => s.kop === "Bibliotheek")!;
  ok(
    // ⚠️ Dit is de volgorde waarin de klant de pagina daadwerkelijk aflegt,
    // niet de urgentievolgorde van `lib/work.ts` (die zet "publiceren" vóór
    // "briefing", want dat laatste is uitvragen en geen afronden). Zie
    // `SUBKOP_VOLGORDE` in `lib/wachtrij.ts`.
    "bibliotheek: briefing, dan nakijken, dan publiceren",
    bibliotheek.subkoppen.map((s) => s.subkop).join(",") ===
      "Briefing invullen voor een pagina,Pagina nakijken vóór publicatie,Pagina publiceren",
  );

  ok(
    "een blokkade komt bij de waarschuwingen en niet bij de vier secties",
    groepeerPerSectie([
      ...items,
      wachtrijItem("blokkade:1", "blokkade", "Je website houdt AI-assistenten buiten"),
    ]).waarschuwingen.length === 1,
  );

  ok(
    "elke sectie telt zijn open taken voor de groene teller",
    overzicht.secties.map((s) => `${s.kop}:${s.aantal}`).join(",") ===
      "Cluster:2,Contentplan:2,Openstaande vragen:1,Bibliotheek:3",
  );
  ok(
    "de tellers per sectie tellen op tot alles behalve de blokkade",
    overzicht.secties.reduce((som, s) => som + s.aantal, 0) === items.length,
  );
  ok(
    "elke sectie heeft een link met de naam uit de zijbalk",
    overzicht.secties.every((s) => s.overzichtLabel.startsWith("Naar je ")),
  );

  // ⚠️ Twee clusters op akkoord stonden als twee keer "Bekijk en bevestig het
  // concept" onder elkaar, zonder te zeggen welk cluster (Van den Udenhout,
  // 23 september 2026). De clusternaam is daarom de titel van de regel.
  const concept = {
    ...items[0],
    analysisName: "udenhout.nl · Occasion kopen in Noord-Brabant",
  };
  ok(
    "een cluster op akkoord toont de clusternaam, zonder het domein ervoor",
    wachtrijRegel(concept).titel === "Occasion kopen in Noord-Brabant" &&
      wachtrijRegel(concept).cluster === null,
  );
  const pagina = { ...items[6], analysisName: "udenhout.nl · Wagenparkbeheer voor mkb-bedrijven" };
  ok(
    "een pagina houdt zijn titel en krijgt het cluster als context",
    wachtrijRegel(pagina).titel === "Nakijken" &&
      wachtrijRegel(pagina).cluster === "Wagenparkbeheer voor mkb-bedrijven",
  );
  ok(
    "de vragen over je bedrijf gaan over het hele merk en krijgen geen cluster",
    wachtrijRegel(items[4]).cluster === null && wachtrijRegel(items[2]).cluster === null,
  );

  // Vier taken per blok, over de subkoppen heen, en daaronder één link zodra
  // er meer zijn (23 september 2026).
  const volleBibliotheek = groepeerPerSectie([
    wachtrijItem("pagina:b1", "pagina", "B1", "Briefing invullen"),
    wachtrijItem("pagina:b2", "pagina", "B2", "Briefing invullen"),
    wachtrijItem("pagina:n1", "pagina", "N1", "Pagina nakijken"),
    wachtrijItem("pagina:n2", "pagina", "N2", "Pagina nakijken"),
    wachtrijItem("pagina:p1", "pagina", "P1", "Pagina publiceren"),
    wachtrijItem("pagina:p2", "pagina", "P2", "Pagina publiceren"),
  ]).secties[0];
  const beperkt = beperkSectie(volleBibliotheek);
  ok(
    "zes taken in één blok: er staan er vier, en twee zijn verborgen",
    beperkt.subkoppen.reduce((som, s) => som + s.items.length, 0) === 4 && beperkt.verborgen === 2,
  );
  ok(
    "een subkop waarvan niets meer past valt weg, geen lege kop",
    beperkt.subkoppen.map((s) => s.subkop).join(",") ===
      "Briefing invullen voor een pagina,Pagina nakijken vóór publicatie",
  );
  ok(
    "precies vier taken: niets verborgen, dus geen link",
    beperkSectie(volleBibliotheek, 6).verborgen === 0 &&
      beperkSectie({ ...volleBibliotheek, aantal: 4 }).verborgen === 0,
  );

  ok("een lege lijst geeft geen secties en geen waarschuwingen", (() => {
    const leeg = groepeerPerSectie([]);
    return leeg.secties.length === 0 && leeg.waarschuwingen.length === 0;
  })());

  function wachtrijItem(
    id: string,
    kind: WorkItem["kind"],
    title: string,
    typeLabel: string = "test",
  ): WorkItem {
    return {
      id,
      kind,
      state: "nu",
      typeLabel,
      title,
      why: "test",
      urgency: 40,
      href: "#",
      analysisId: "a1",
      analysisName: "Cluster 1",
      profileId: "profiel-1",
    };
  }
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nWat ORBIT ENGINE deze week deed");

group("elke taaksoort heeft een zin in gewone taal", () => {
  // ⚠️ Zonder deze test verschijnt een nieuwe taaksoort als rauwe sleutel op het
  // scherm van de klant, of hij valt stil weg. `profile_llm_baseline` zegt hem
  // niets, en een lege regel is beter dan een verkeerde, maar het beste is een
  // regel die klopt.
  //
  // ⚠️ Sinds 24 augustus 2026 is `null` een geldige waarde, en die betekent
  // "dit ziet de klant nooit". Elke taaksoort moet dus een BESLUIT hebben:
  // een zin, of een expliciete null. Wat niet mag is `undefined`, want dat is
  // geen besluit maar een vergeten regel.
  const zonderBesluit = ALLE_TAAKSOORTEN.filter((t) => TAAK_TEKST[t] === undefined);
  ok(
    `alle ${ALLE_TAAKSOORTEN.length} taaksoorten${zonderBesluit.length ? " (mist: " + zonderBesluit.join(", ") + ")" : ""}`,
    zonderBesluit.length === 0,
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
    Object.values(TAAK_TEKST).every((v) => v === null || v[0] === v[0].toLowerCase()),
  );

  // ⚠️ EN DE SALES-TAKEN STAAN ALLEMAAL OP NULL. Ze gaan over bedrijven die geen
  // klant zijn, en die horen in geen enkele klantlijst op te duiken. Zou iemand
  // er ooit een zin voor schrijven, dan is dat vanaf dat moment een regel die de
  // klant kan zien, en deze test valt dan om (plan §4.3).
  const salesTaken = ALLE_TAAKSOORTEN.filter((t) => t.startsWith("sales_"));
  ok(`er zijn Sales-taaksoorten (${salesTaken.length})`, salesTaken.length >= 4);
  const zichtbaar = salesTaken.filter((t) => TAAK_TEKST[t] !== null);
  ok(
    `geen enkele Sales-taak is zichtbaar voor een klant${zichtbaar.length ? ": " + zichtbaar.join(", ") : ""}`,
    zichtbaar.length === 0,
  );
  // En de lijst laat ze ook echt weg, niet alleen op papier.
  ok(
    "en de activiteitenlijst laat ze weg",
    activiteit([{ type: "sales_market_discover", finished_at: "2026-08-24T10:00:00Z" }]).length === 0,
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
  // ⚠️ De wachtrijkaart zelf verhuisde op 21 september 2026 naar een eigen
  // client-component (`_components/wachtrij-lijst.tsx`), voor het "nog X
  // bekijken" per onderwerp (`lib/wachtrij.ts`). De twee broncodecontroles die
  // over die kaart gingen, kijken sindsdien naar allebei de bestanden samen.
  const wachtrijLijst = readFileSync(
    "app/(app)/merk/[id]/_components/wachtrij-lijst.tsx",
    "utf8",
  );

  // Alle vijf de werksoorten stonden op amber. "Bekijk wat er mis is" (een
  // cluster dat niet gelukt is) zag er daardoor precies zo uit als "Nakijken".
  // `docs/ux-design.md` §2: warning is "kijk hier even naar", danger is
  // "blokkade, mislukt", attention is "vraagt een keuze, is niet fout". Sinds
  // 25 augustus 2026 draagt de KAART die toon en niet meer een chip van 60
  // pixels, maar het onderscheid moet blijven bestaan.
  ok("de soort werk bepaalt de toon", wachtrijLijst.includes("workChipTone(item.kind)"));

  // ── ⚠️ ÉÉN PRIMAIRE KNOP (25 AUGUSTUS 2026) ─────────────────────────────
  //
  // Dit scherm is de bestemming na inloggen (`app/page.tsx`) en had géén enkele
  // primaire knop: de enige verzadigde kleur was een chip, en een chip is een
  // etiket. Het scherm vroeg nergens om een klik. Een tweede primaire knop is
  // net zo fout: dan kiest de klant welke van de twee de hoofdactie is, en dan
  // is er geen.
  ok(
    "precies één primaire knop op het scherm",
    (overzicht.match(/btn-primary/g) ?? []).length === 0 &&
      (wachtrijLijst.match(/btn-primary/g) ?? []).length === 1,
  );
  // Sinds 23 september 2026 is die ene knop die van de dringendste taak, en
  // niet van elke regel: `primair` is waar voor precies één id.
  ok(
    "de primaire knop hoort bij de dringendste taak",
    wachtrijLijst.includes('primair ? "btn-primary"') &&
      overzicht.includes("eersteId={eigenWerk[0]?.id}"),
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
  // mag niet het hele scherm weghalen (`docs/ux-design.md` §4). Vier blokken
  // sinds "Waar je begint" en "Wat ORBIT ENGINE deed" op 21 september 2026
  // verdwenen (ze verdubbelden met de wachtrij, en het laatste stond
  // permanent op "niets gepland"/leeg zonder iets aan te bieden). Drie sinds
  // "Je contentplan" op 23 september 2026 verdween: de ronde, de stand en de
  // wachtrij.
  ok(
    "elk blok staat in zijn eigen foutopvang",
    (overzicht.match(/<SectionErrorBoundary/g) ?? []).length >= 3,
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
  // ⚠️ Omgedraaid in de UX-audit van 23 september 2026 (P1.1): wat er op de
  // klant wacht staat bovenaan, de maand onderaan als naslag.
  ok(
    "de wachtrij staat boven het cijfer, het cijfer boven de maand",
    overzicht.indexOf("<WachtrijLijst") < overzicht.indexOf("text-5xl") &&
      overzicht.indexOf("text-5xl") < overzicht.indexOf("<RondeBalk"),
  );
  ok("geen rij van vier grote tellers meer", !overzicht.includes("CijferRij"));
  // ⚠️ Eén maandtelling op het scherm (23 september 2026). "Maand 4 sinds de
  // start" boven de merknaam telde planmaanden, "Je september" telt de
  // kalender; samen lieten ze de klant zoeken welke de echte was.
  ok("geen tweede maandtelling boven de merknaam", !overzicht.includes("sinds de start`"));

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

group("het contentplan heeft drie weergaven", () => {
  const scherm = readFileSync("app/(app)/merk/[id]/strategie/plan/page.tsx", "utf8");

  // ⚠️ Alledrie bereikbaar voor iedereen. Sinds 22 september 2026 landt
  // iedereen zonder `?weergave=` op het bord (Plannen), ongeacht rol: dat is
  // de weergave waar het meeste werk gebeurt. Tot 27 augustus 2026 was er
  // alleen het bord, ook voor de klant, met bovenaan "sleep beschikbare
  // content items naar de maand waarin ze geschreven moeten worden". Kalender
  // (blok A punt 6) kwam er als derde bij.
  ok("de leesweergave bestaat", scherm.includes("<PlanReadView"));
  ok("het bord bestaat", scherm.includes("<PlanView"));
  ok("de kalenderweergave bestaat", scherm.includes("<PlanCalendarView"));
  ok("er is een schakelaar tussen de drie", scherm.includes("<WeergaveKiezer"));
  // UX-audit 23 september 2026 (P1.6): de rol bepaalt weer waar je landt.
  ok(
    "zonder weergave in de URL landt de consultant op Plannen en de klant op Overzicht",
    scherm.includes('return staff ? "plannen" : "overzicht";'),
  );
  ok("de schakelaar heeft de gedeelde segmentvorm", scherm.includes('className="segment-item"'));
  // Een weergave in de URL wint van het standaardgedrag, zodat een gedeelde
  // link bij iedereen hetzelfde opent.
  ok("en de URL wint van het standaardgedrag", scherm.includes("searchParams"));

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
    // Sinds 24 september 2026 op merk alleen (punt 26 van de
    // kwaliteitsdoorlichting); de database bepaalt wie het mag zien.
    /from\("analyses"\)\.select\("\*"\)\.eq\("profile_id", profileId\)/.test(werk),
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
  const klantItems = [...brandNav(merkId, false), ...generalNav(false), ...salesNav(false)];

  // Geen enkel item wijst naar een afgeschermd adres.
  ok(
    "geen admin-adres in het klantmenu",
    klantItems.every((i) => !i.href.includes("/admin") && i.href !== "/beheer"),
  );
  ok("en geen enkel item is als staff-only gemarkeerd", klantItems.every((i) => !i.staffOnly));

  // ⚠️ En geen enkel Sales-adres. Dit is de zijbalkhelft van plan §4.3: een
  // klant mag nooit kunnen zien dat er een module bestaat waarin bedrijven met
  // een opportunityscore staan. `salesNav(false)` geeft daarom een lege lijst
  // terug in plaats van items die het scherm verderop wegfiltert.
  ok(
    "geen sales-adres in het klantmenu",
    klantItems.every((i) => !i.href.startsWith("/sales")),
  );
  eq("salesNav geeft een klant nul bestemmingen", String(salesNav(false).length), "0");

  // Bij een beheerder staat elk afgeschermd item wél gemarkeerd, zodat hij niet
  // per ongeluk tijdens een gedeeld scherm op een interne pagina klikt.
  const staffItems = [...brandNav(merkId, true), ...generalNav(true), ...salesNav(true)];
  const adminItems = staffItems.filter((i) => i.hoofdstuk === "Admin");
  // Zes over dít merk (Onboardinggesprek, 0-meting, Aanbodboom, Diagnose,
  // Concurrenten indelen, Toewijzen) plus "Alle merken" en "Koppelingen" over
  // de app als geheel. "Concurrenten indelen" kwam er op 2 september 2026 bij
  // (plan analytics-herontwerp.md, C1): zie de uitzondering bij
  // `GRENS_PER_HOOFDSTUK` in `lib/nav.ts`.
  // Negen sinds migratie 0091: het Kwaliteitslab kwam erbij, de vijfde
  // uitzondering op de grens. Zie `GRENS_PER_HOOFDSTUK` in `lib/nav.ts` voor de
  // toets die elke uitzondering moet doorstaan.
  ok("een beheerder heeft negen Admin-bestemmingen", adminItems.length === 9);
  ok(
    "en Search Console staat erbij",
    adminItems.some((i) => i.href === "/instellingen/koppelingen" && i.label === "Search Console"),
  );
  ok(
    "en de onboardingsessie staat erbij",
    adminItems.some((i) => i.href.endsWith("/admin/onboarding") && i.label === "Onboardinggesprek"),
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

  // Dezelfde proef op Sales. Vijf bestemmingen, alle vijf gemarkeerd, en
  // Opportunities staat bóven Markten: sales werkt vanuit kansen en niet vanuit
  // rapporten (plan §4.1). Zet je Markten bovenaan, dan wordt dit een
  // rapportenkast met een belijst eronder, en dat is precies het plan dat New
  // business heeft teruggestuurd.
  const salesItems = staffItems.filter((i) => i.hoofdstuk === "Sales");
  eq("een salesmedewerker heeft vijf Sales-bestemmingen", String(salesItems.length), "5");
  ok("allemaal gemarkeerd als alleen voor Outer Orbit", salesItems.every((i) => i.staffOnly === true));
  ok(
    "Kansen (was Opportunities, UX-audit P2.13) staat boven Markten",
    salesItems.findIndex((i) => i.label === "Kansen") <
      salesItems.findIndex((i) => i.label === "Markten"),
  );
  ok(
    "en Sales staat onder de scheidingslijn, net als Admin",
    hoofdstukken(staffItems).find((k) => k.naam === "Sales")?.afgeschermd === true,
  );

  // Sales hangt niet aan een merk: een prospect ís nog geen merk. Zonder deze
  // eigenschap zou de hele sectie verdwijnen zodra er geen merk gekozen is, en
  // dat is precies de stand waarin een salesmedewerker binnenkomt.
  eq(
    "en Sales blijft staan als er geen merk gekozen is",
    hoofdstukken([...generalNav(true), ...salesNav(true)])
      .map((k) => k.naam)
      .join(),
    "Sales,Admin",
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
  ok("negen onboardingtaken", ONBOARDING_TAKEN.length === 9);
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

  // ── Onboarding ronde B: de herindeling en de teksten uit hoofdstuk 7 ─────
  ok("de sessie rendert de negen blokken", sessie.includes("SESSION_BLOCKS"));
  // Het openingsblok "Openstaande punten en vragen" is op 1 september 2026
  // verwijderd: het stond dubbel met `/strategie/vragen`, dat dezelfde
  // `loadOpenQuestions()`-loader gebruikt. Zie docs/logbook.md.
  ok(
    "de sessie heeft geen eigen openstaande-puntenblok meer (dat staat op /strategie/vragen)",
    !sessie.includes('id="open"') && !sessie.includes("FactRequests"),
  );
  ok(
    "de auteursvelden staan ingeklapt onder één gezamenlijke uitleg",
    sessie.includes("Auteur, voor later") && sessie.includes("SESSION_AUTHOR_FIELDS"),
  );
  ok(
    "het afrondblok noemt de openstaande verplichte velden",
    sessie.includes("openstaandVerplicht"),
  );

  const paginaBron = leesBestand("app/(app)/merk/[id]/admin/onboarding/page.tsx");
  ok(
    "de pagina heet Onboardinggesprek, niet meer kaal Onboarding",
    paginaBron.includes("Onboardinggesprek"),
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

  // Het doel over twaalf maanden stuurt de clusterkeuze mee (0075), maar
  // growth_regions/seasonality/sales_objections/offline_proof bewust niet: die
  // beantwoorden HOE er binnen een onderwerp gevraagd wordt, niet WELK onderwerp.
  const metDoel = topicSteering({ ...gevuld, goal_12m: "Meer trouwhulp buiten de regio" });
  ok("het doel komt in de clustersturing terecht", metDoel.includes("trouwhulp buiten de regio"));
  ok(
    "geen doel levert geen regel over het doel op",
    !topicSteering(gevuld).includes("DOEL OVER TWAALF MAANDEN"),
  );

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
  // Achttien tot 25 september 2026; twee per branche vielen weg met de stemvelden (besluit B14).
  const teWeinig = echteCategorieen.filter((c) => exampleCount(c) < 16);
  ok(
    `elke branche heeft minstens zestien eigen voorbeelden${teWeinig.length ? " (te weinig: " + teWeinig.join(", ") + ")" : ""}`,
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
  // Elf sinds stap B1 (`brand_name` erbij, het label bepaalt het antwoord al
  // volledig, net als bij `name`), twaalf sinds stap B8: `max_inventory_pages`
  // is een getal, en een getalveld heeft aan het label genoeg.
  ok(
    "twaalf velden hebben bewust geen voorbeeld",
    zonderVoorbeeld.size === 12,
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
    note: null,
    removed_at: null,
    removed_by: null,
    updated_by: null,
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
    client_questions: null,
    client_friction: null,
    client_edge: null,
    status,
    stage: "definitief",
    origin: null,
    origin_uses_measurement: false,
    rejection_reason: null,
    analysis_id: null,
    search_volume_index: null,
    search_volume_reasoning: null,
    search_volume_absolute: null,
    search_volume_source: "geschat",
    created_at: "",
    updated_at: "",
  };
}

group("De clusterlaag smelt tot één tekst (topic-brief.ts, migratie 0075)", () => {
  const leeg = {
    client_questions: null,
    client_friction: null,
    client_edge: null,
    client_note: null,
  };
  ok("niets ingevuld levert null op", buildTopicBrief(leeg) === null);

  ok(
    "valt terug op het legacy vrije veld als de drie nieuwe leeg zijn",
    buildTopicBrief({ ...leeg, client_note: "hier komt 40% van de omzet vandaan" }) ===
      "hier komt 40% van de omzet vandaan",
  );

  const brief = buildTopicBrief({
    ...leeg,
    client_questions: "zit pechhulp erbij?",
    client_friction: "klanten onderschatten de levertijd",
    client_edge: "wij hebben als enige een 24-uurs storingsdienst",
    // Het legacy veld wordt genegeerd zodra er nieuwe velden zijn: anders
    // krijgt de schrijver twee keer dezelfde informatie, en misschien
    // tegenstrijdig als iemand alleen de nieuwe velden bijwerkt.
    client_note: "een oude aantekening die niet meer relevant is",
  });
  ok("de vaakst gestelde vraag komt erin", brief?.includes("zit pechhulp erbij?") ?? false);
  ok("wat er misgaat ook", brief?.includes("klanten onderschatten de levertijd") ?? false);
  ok("en het onderscheid", brief?.includes("24-uurs storingsdienst") ?? false);
  ok(
    "de oude aantekening wordt niet meegenomen zodra er nieuwe velden zijn",
    !brief?.includes("niet meer relevant"),
  );
});

group("De knop 'Stel nieuwe clusters voor' draait alleen bij nieuwe informatie (0077)", () => {
  const basis: TopicRoundSnapshot = {
    gesprekVastgelegdOp: null,
    beantwoordeVragen: 0,
    gemetenClusters: 0,
    afgewezenOnderwerpen: 0,
    actieveAanbodknopen: 0,
  };

  ok("twee identieke momentopnamen zijn gelijk", snapshotsGelijk(basis, { ...basis }));
  ok(
    "een andere teller maakt ze ongelijk",
    !snapshotsGelijk(basis, { ...basis, beantwoordeVragen: 1 }),
  );

  const eersteKeer = beoordeelRonde(null, basis);
  ok("de allereerste ronde mag altijd draaien", eersteKeer.nieuws === true);

  const nietsNieuws = beoordeelRonde(basis, { ...basis });
  ok("exact dezelfde stand van zaken levert geen nieuws op", nietsNieuws.nieuws === false);
  ok(
    "en de melding raadt af om de knop te gebruiken",
    /hetzelfde resultaat/i.test(nietsNieuws.melding),
    nietsNieuws.melding,
  );

  const gesprekErbij = beoordeelRonde(basis, {
    ...basis,
    gesprekVastgelegdOp: "2026-08-30T10:00:00Z",
  });
  ok("een nieuw gesprek is nieuws", gesprekErbij.nieuws === true);
  ok(
    "en de melding noemt het gesprek",
    gesprekErbij.melding.includes("strategisch gesprek is vastgelegd"),
    gesprekErbij.melding,
  );

  const allesErbij = beoordeelRonde(basis, {
    gesprekVastgelegdOp: "2026-08-30T10:00:00Z",
    beantwoordeVragen: 14,
    gemetenClusters: 3,
    afgewezenOnderwerpen: 1,
    actieveAanbodknopen: 0,
  });
  ok("meerdere veranderingen tellen allemaal mee", allesErbij.nieuws === true);
  ok("veertien klantantwoorden komen in de melding", allesErbij.melding.includes("14 klantantwoorden"));
  ok(
    "drie clusters komen in de melding",
    allesErbij.melding.includes("metingen van 3 clusters"),
    allesErbij.melding,
  );
  ok(
    "en één afgewezen onderwerp, enkelvoud",
    allesErbij.melding.includes("1 afgewezen onderwerp"),
    allesErbij.melding,
  );

  // Minder metingen (bv. een opgeschoonde teststand) is geen NIEUWE informatie.
  const minderIsGeenNieuws = beoordeelRonde({ ...basis, gemetenClusters: 5 }, { ...basis, gemetenClusters: 2 });
  ok(
    "minder tellingen dan vorige keer is geen aanleiding om te draaien",
    minderIsGeenNieuws.nieuws === false,
  );

  // Onboarding Ronde C, §16.6: zonder deze telling meldde de knop "niets
  // veranderd" nadat de consultant tijdens het gesprek drie diensten met de
  // hand had toegevoegd.
  const dienstToegevoegd = beoordeelRonde(basis, { ...basis, actieveAanbodknopen: 3 });
  ok("een toegevoegde dienst is nieuws", dienstToegevoegd.nieuws === true);
  ok(
    "en de melding noemt de nieuwe aanbodknopen",
    dienstToegevoegd.melding.includes("3 nieuwe aanbodknopen"),
    dienstToegevoegd.melding,
  );
  const enkeleAanbodknoop = beoordeelRonde(basis, { ...basis, actieveAanbodknopen: 1 });
  ok(
    "enkelvoud bij precies één nieuwe knoop",
    enkeleAanbodknoop.melding.includes("1 nieuwe aanbodknoop") &&
      !enkeleAanbodknoop.melding.includes("1 nieuwe aanbodknopen"),
    enkeleAanbodknoop.melding,
  );
  const minderKnopenIsGeenNieuws = beoordeelRonde(
    { ...basis, actieveAanbodknopen: 5 },
    { ...basis, actieveAanbodknopen: 2 },
  );
  ok(
    "een verwijderde dienst is op zichzelf geen nieuwe informatie",
    minderKnopenIsGeenNieuws.nieuws === false,
  );
});

group("De aanbodboom bewerkbaar: validatie (onboarding Ronde C, §16.3, migratie 0079)", () => {
  ok("de vijf bekende soorten zijn geldig", isOfferingKind("dienst") && isOfferingKind("vestiging"));
  ok("een onbekend soort is ongeldig", !isOfferingKind("filiaal"));
  ok("een leeg soort is ongeldig", !isOfferingKind(""));

  ok("een getrimde naam blijft staan", normaliseOfferingName("  Onderhoudsabonnement  ") === "Onderhoudsabonnement");
  ok("een lege naam is ongeldig", normaliseOfferingName("   ") === null);
  ok("een getal is geen naam", normaliseOfferingName(42) === null);

  ok("lege tekst wordt null", normaliseOptionalText("   ") === null);
  ok("ontbrekende tekst wordt null", normaliseOptionalText(undefined) === null);
  ok("getrimde tekst blijft staan", normaliseOptionalText(" vanaf 19 euro ") === "vanaf 19 euro");

  ok("een lege boom begint bij 10", nextSortOrder([]) === 10);
  ok(
    "de hoogste bestaande plus tien",
    nextSortOrder([{ sort_order: 0 }, { sort_order: 40 }, { sort_order: 20 }]) === 50,
  );

  // Lus-controle: A → B → C, mag C niet onder A hangen? Nee, want dat is geen
  // lus (A is geen nakomeling van C). Wel geweigerd: A onder C, of B onder B.
  const boom = [
    { id: "a", parent_id: null },
    { id: "b", parent_id: "a" },
    { id: "c", parent_id: "b" },
  ];
  ok("een knoop mag niet onder zichzelf hangen", wouldCreateCycle(boom, "b", "b"));
  ok("een knoop mag niet onder zijn eigen nakomeling hangen", wouldCreateCycle(boom, "a", "c"));
  ok("een knoop mag wél onder een niet-nakomeling hangen", !wouldCreateCycle(boom, "c", "a"));
  ok("een nieuwe knoop (geen id) kan nooit een lus veroorzaken", !wouldCreateCycle(boom, null, "c"));
  ok("geen ouder is nooit een lus", !wouldCreateCycle(boom, "b", null));
});

group("C2: alle lezers van profile_offerings gebruiken de gedeelde helper (§16.4)", () => {
  // ⚠️ Dit is een broncodecontrole, net als de klantscherm-check hierboven: de
  // zes bestanden die vóór 31 augustus 2026 rechtstreeks selecteerden, moeten
  // via `activeOfferings()`/`activeOfferingCount()` uit `lib/offerings.ts`
  // lopen. Vergeet je dat bij een nieuwe aanroepplek, dan komt een net
  // verwijderde dienst alsnog terug in een onderwerpvoorstel of een meetronde.
  const bewaakteBestanden = [
    "lib/pipeline/propose-topics.ts",
    "lib/pipeline/propose-more-topics.ts",
    "lib/pipeline/llm-baseline.ts",
    "lib/pipeline/reputation-start.ts",
    "app/(app)/merk/[id]/admin/aanbodboom/page.tsx",
  ];
  for (const pad of bewaakteBestanden) {
    const bron = leesBestand(pad);
    ok(
      `${pad} selecteert profile_offerings niet meer rechtstreeks`,
      !bron.includes('from("profile_offerings")') && !bron.includes("from('profile_offerings')"),
    );
    ok(`${pad} gebruikt de gedeelde helper`, /activeOfferings|activeOfferingCount/.test(bron));
  }

  // `offering.ts` mag wél rechtstreeks selecteren (het is de idempotentie-
  // controle van de aanbodstap zelf, geen "actieve boom"-lezer), maar dan
  // uitsluitend op `source = 'ai'` (§16.5.2).
  const offeringBron = leesBestand("lib/pipeline/offering.ts");
  ok(
    "offering.ts telt bij het idempotentiecontrole alleen AI-knopen",
    offeringBron.includes('.eq("source", "ai")'),
  );
});

group("Niet alle klantinput is gelijk (claim-plausibility.ts, werkpakket A §3.4)", () => {
  // Eigen werkwijze, aanbod, prijzen, garanties: zonder meer aangenomen.
  ok("een eigen mededeling wordt zonder meer aangenomen", beoordeelClaim("Wij zijn dinsdag dicht").aangenomen);
  ok(
    "ook met een cijfer erin",
    beoordeelClaim("Wij leveren binnen 48 uur").aangenomen,
  );

  // Superlatieven en marktclaims: pas aangenomen mét bewijs.
  const zonderBewijs = beoordeelClaim("Wij zijn de beste van de regio");
  ok("een superlatief wordt herkend", zonderBewijs.isMarktclaim);
  ok("zonder cijfer of link geen bewijs", !zonderBewijs.heeftBewijs);
  ok("en dus niet zomaar aangenomen", !zonderBewijs.aangenomen);

  const metBewijs = beoordeelClaim("Wij zijn de beste van de regio volgens 340 Google-reviews van 4,8 sterren");
  ok("dezelfde claim mét een cijfer wordt wel aangenomen", metBewijs.isMarktclaim && metBewijs.aangenomen);

  ok("marktleider wordt herkend", beoordeelClaim("Wij zijn marktleider in Nederland").isMarktclaim);
  ok("nummer 1 wordt herkend", beoordeelClaim("Wij zijn nummer 1 in onze branche").isMarktclaim);
  ok(
    "'de enige die' wordt herkend",
    beoordeelClaim("Wij zijn de enige die dit aanbiedt in de regio").isMarktclaim,
  );
  ok(
    "een vergelijking met de concurrent wordt herkend",
    beoordeelClaim("Onze service is beter dan de concurrent").isMarktclaim,
  );

  // Bij twijfel niet blokkeren: een gewone zin zonder superlatief blijft gewoon aangenomen.
  ok(
    "een gewone zin over het eigen werk is geen marktclaim",
    !beoordeelClaim("Wij monteren de kozijnen binnen één dag").isMarktclaim,
  );

  // ── Wat ontbreekt er precies? (punt 6 van opdracht-bevindingen-5-tot-9.md) ──
  ok(
    "'de snelste' vraagt om een cijfer",
    ontbrekendeOnderbouwing("Wij zijn de snelste van de regio") === "cijfer",
  );
  ok(
    "'marktleider' vraagt om een bron",
    ontbrekendeOnderbouwing("Wij zijn marktleider in Nederland") === "bron",
  );
  ok(
    "'de enige die' vraagt om een voorbeeld",
    ontbrekendeOnderbouwing("Wij zijn de enige die dit aanbiedt in de regio") === "voorbeeld",
  );
  ok(
    "staat er al een cijfer of link bij, dan ontbreekt er niets meer",
    ontbrekendeOnderbouwing("Wij zijn de snelste, gemiddeld binnen 2 uur ter plaatse") === null,
  );
  ok(
    "een gewone zin heeft niets te missen",
    ontbrekendeOnderbouwing("Wij monteren de kozijnen binnen één dag") === null,
  );

  // ── De concrete zin op het scherm ────────────────────────────────────────
  ok(
    "de klant leest wat er specifiek ontbreekt, niet alleen dat er iets ontbreekt",
    marktclaimUitleg("Wij zijn de snelste van de regio") ===
      "Dit klinkt als een claim over de markt of de concurrentie, geen mededeling over jullie eigen " +
        "werk. Noem er een cijfer bij, dan mag deze zin in je teksten. Laat je het antwoord zoals het " +
        "is, dan blijft de tekst er voorzichtig over.",
  );
  ok(
    "zonder een herkend patroon valt de zin terug op de algemene uitleg",
    marktclaimUitleg("Wij zijn dinsdag dicht") === MARKTCLAIM_UITLEG,
  );
});

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
  ok("de versie noemt het model", instrumentVersion().includes(MODELS.quality));
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
    "/solliciteren",
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

// ── Het zijproject "Solliciteren" ──────────────────────────────────────────
//
// ⚠️ `app/solliciteren/` is een eigen app van één pagina in dezelfde codebase
// (14 september 2026). De afspraak is dat hij twee dingen deelt, de inlog en de
// publicatie, en één ding juist niet: de opmaak. Zo'n afspraak slijt vanzelf,
// want één import uit `components/` of één `var(--text-primary)` is genoeg om
// de twee ontwerpen weer aan elkaar te knopen, en dat valt pas op als een
// wijziging in ORBIT ENGINE ineens dit scherm verandert. Conventie 1: een
// belofte in een document krijgt een vangnet in code.
group("het zijproject staat los van ORBIT ENGINE, en zit wel achter dezelfde inlog", () => {
  const layout = leesBestand("app/solliciteren/layout.tsx");
  const stijl = leesBestand("app/solliciteren/solliciteren.css");

  // De inlog: gedeeld, en twee keer gecontroleerd. De middleware stuurt een
  // bezoeker zonder sessie meteen naar het inlogscherm, de layout controleert
  // het op de server nog een keer plus het beheerdersrecht.
  ok(
    "de middleware beschermt /solliciteren",
    leesBestand("lib/supabase/middleware.ts").includes('"/solliciteren"'),
  );
  ok("de layout vraagt om een ingelogde gebruiker", layout.includes("requireUser()"));
  ok("en laat alleen een account van ORBIT ENGINE zelf binnen", layout.includes("isStaff("));
  ok("een klant krijgt een 404 en geen foutmelding", layout.includes("notFound()"));

  // De opmaak: niet gedeeld. Geen component van het hoofdproduct, geen token
  // uit `globals.css`, en de eigen stijl gaat nergens anders heen.
  const eigenBestanden = tsxOnder("app/solliciteren");
  ok("er staan schermbestanden in de map", eigenBestanden.length >= 2, `${eigenBestanden.length}`);
  for (const bestand of eigenBestanden) {
    const bron = leesBestand(bestand);
    ok(`${bestand} leent geen component van ORBIT ENGINE`, !bron.includes('from "@/components/'));
  }

  const vreemdeTokens = [...stijl.matchAll(/var\((--[a-z0-9-]+)/g)]
    .map((m) => m[1])
    .filter((naam) => !naam.startsWith("--sol-"));
  ok("de stijl gebruikt alleen eigen tokens", vreemdeTokens.length === 0, vreemdeTokens.join(", "));
  ok("en zet zelf een achtergrond", stijl.includes("background-color: var(--sol-achtergrond)"));
  // ⚠️ Het stijlblad is op 15 september 2026 omgezet naar de ontwerptaal van
  // LinkedIn. Deze twee controles bewaken niet hoe het eruitziet, maar dat het
  // een eigen, volledig gezette stijl BLIJFT: een eigen letterstapel en een
  // eigen maatvoering, zodat een wijziging aan `globals.css` hier niets doet.
  ok("het stijlblad zet zijn eigen letter", stijl.includes("--sol-letter:"));
  ok("en zijn eigen basismaat", /font-size:\s*14px/.test(stijl));

  const elders = [...tsxOnder("app/(app)"), ...tsxOnder("components")].filter((b) =>
    leesBestand(b).includes("solliciteren.css"),
  );
  ok("het stijlblad wordt nergens anders geladen", elders.length === 0, elders.join(", "));

  // De knop: sinds 22 september 2026 (commit 523c85d) nergens meer. Het
  // zijproject heeft niets met ORBIT ENGINE te maken, dus de navigatie van
  // ORBIT ENGINE wijst er ook niet naartoe; wie erin mag, gaat via het adres.
  // De toegang zelf bewaakt de layout hierboven, niet de knop.
  const verwijzers = tsxOnder("components").filter((b) =>
    leesBestand(b).includes('href="/solliciteren"'),
  );
  ok("geen knop in ORBIT ENGINE wijst naar het zijproject", verwijzers.length === 0, verwijzers.join(", "));
});

// ── De sollicitatieassistent van het zijproject ────────────────────────────
//
// ⚠️ Alles hieronder gaat over `app/solliciteren/` en `lib/solliciteren/`, de
// eigen app achter dezelfde inlog. De groep hierboven bewaakt de SCHEIDING; deze
// groepen bewaken wat de assistent zelf doet.

group("de assistent: de standaardzinnen worden geteld en niet weggehaald", () => {
  const brief =
    "In een wereld waarin alles verandert, schrijf ik u met veel enthousiasme. " +
    "Ik ben ervan overtuigd dat mijn ervaring naadloos aansluit op deze functie. " +
    "Als echte teamspeler en proactieve collega ben ik de ideale kandidaat. " +
    "Ik zie er naar uit om dit toe te lichten.";

  const vondsten = zoekCliches(brief);
  ok("er komen vondsten uit", vondsten.length >= 6, `${vondsten.length}`);
  ok(
    "de opening wordt herkend",
    vondsten.some((v) => /in een wereld waarin/i.test(v.gevonden)),
  );
  ok(
    "en het enthousiasme ook",
    vondsten.some((v) => /met veel enthousiasme/i.test(v.gevonden)),
  );
  ok("elke vondst zegt waarom", vondsten.every((v) => v.waarom.length > 10));

  // Het gedachtestreepje is het sterkste signaal van AI-tekst
  // (docs/schrijfstijl.md §10), dus dat moet er sowieso uit komen.
  const metStreepje = zoekCliches("Ik werkte drie jaar in de zorg — en dat beviel goed.");
  ok("een gedachtestreepje wordt gevonden", metStreepje.length === 1, `${metStreepje.length}`);
  ok(
    "en een schuine streep in en/of ook",
    zoekCliches("Ik werk met bouwers en/of installateurs.").length === 1,
  );

  // ⚠️ De valkuil van een globale RegExp: `lastIndex` blijft staan tussen twee
  // teksten door, en dan mist de tweede brief precies wat de eerste wel vond.
  // Dat valt in productie pas op bij het tweede bericht en dus nooit.
  const eerste = telCliches(brief);
  const tweede = telCliches(brief);
  ok("twee keer dezelfde tekst geeft twee keer hetzelfde antwoord", eerste === tweede, `${eerste} en ${tweede}`);
  ok("een lege tekst levert niets op", zoekCliches("").length === 0);

  // Een normale, concrete zin mag niet aanslaan. Een controle die overal iets
  // vindt, wordt weggeklikt en doet daarna niets meer.
  const schoon = zoekCliches(
    "Bij Van Dijk Installatie deed ik in 2024 de planning voor zeven monteurs. " +
      "Ik ken de storingsdienst van binnenuit, want ik draaide er zelf in mee.",
  );
  ok("een concrete zin blijft schoon", schoon.length === 0, schoon.map((v) => v.gevonden).join(", "));
});

// ⚠️ Conventie 1 in zijn zuiverste vorm: de systeemprompt VERBIEDT een aantal
// standaardzinnen bij naam, en `cliches.ts` is het vangnet eronder. Lopen die
// twee lijsten uit elkaar, dan verbiedt de prompt iets dat niemand nakijkt, of
// wijst het scherm iets aan wat nooit gevraagd is. Dit is de enige controle die
// dat kan zien.
group("de assistent: prompt en vangnet verbieden hetzelfde", () => {
  const prompt = bouwSysteemprompt();

  ok("de prompt verbiedt gedachtestreepjes", /gedachtestreepjes/i.test(prompt));
  ok("en noemt de tekens zelf, anders is het verbod niet te volgen", /"—"/.test(prompt));
  ok("de prompt verbiedt de schuine streep", /en\/of/.test(prompt));
  // De volgorde van de drie kopjes is de werkwijze: eerst de vacature ontleden,
  // dan kiezen wat de brief draagt, dan pas schrijven. Een model dat meteen
  // begint te schrijven maakt altijd dezelfde brief, die van niemand.
  ok(
    "de prompt zet ontleden en kiezen vóór schrijven",
    prompt.indexOf(KOP_VACATURE) < prompt.indexOf(KOP_OPDRACHT) &&
      prompt.indexOf(KOP_OPDRACHT) < prompt.indexOf(KOP_BRIEF),
  );
  ok("de prompt verbiedt verzinnen", /nooit verzint/i.test(prompt));
  ok("en zegt wat er dan wél moet gebeuren", prompt.includes("[dit weet ik niet:"));
  ok("de prompt is Nederlands", prompt.includes("Je antwoordt in het Nederlands."));

  // Elke zin die de prompt bij naam verbiedt, moet het vangnet ook echt
  // vinden. Alleen het blok met de standaardzinnen, want de tekens erboven
  // staan in dezelfde prompt tussen dezelfde aanhalingstekens.
  const blokStart = prompt.indexOf("Concreet verboden");
  const blokEind = prompt.indexOf("Geen opsomming");
  ok("het blok met standaardzinnen staat in de prompt", blokStart > 0 && blokEind > blokStart);
  const blok = prompt.slice(blokStart, blokEind);
  const verboden = [...blok.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  ok("de prompt noemt standaardzinnen bij naam", verboden.length >= 8, `${verboden.length}`);
  const gemist = verboden.filter((zin) => zoekCliches(`Zin vooraf. ${zin} en verder nog wat tekst.`).length === 0);
  ok("en het vangnet vindt ze allemaal terug", gemist.length === 0, gemist.join(" | "));
});

group("de assistent: de sleutelwoorden zijn tellen en geen gok", () => {
  const vacature =
    "Wij zoeken een ervaren projectleider installatietechniek. Je stuurt monteurs aan, " +
    "bewaakt de planning en spreekt met opdrachtgevers. Kennis van warmtepompen is een pre. " +
    "De projectleider rapporteert aan de directie.";
  const cv = "Als projectleider stuurde ik monteurs aan bij een installatiebedrijf. Planning en inkoop.";

  const woorden = vergelijkSleutelwoorden(vacature, cv);
  const namen = woorden.map((w) => w.woord);
  ok("er komen sleutelwoorden uit", woorden.length > 0, `${woorden.length}`);
  ok("stopwoorden vallen weg", !namen.includes("wordt") && !namen.includes("wij"));
  ok("korte woorden vallen weg", namen.every((w) => w.length >= 4));
  ok("warmtepompen mist in het CV", woorden.some((w) => w.woord === "warmtepompen" && !w.staatInCv));
  ok("projectleider staat er wel in", woorden.some((w) => w.woord === "projectleider" && w.staatInCv));

  // "monteurs" in de vacature tegen "monteurs" in het CV, en "planning" tegen
  // "planning": meervoud en enkelvoud horen hetzelfde te zijn.
  ok("planning telt als gevonden", woorden.some((w) => w.woord === "planning" && w.staatInCv));

  // Wat mist staat vooraan: dat is waar iemand iets aan heeft.
  const eersteRaak = woorden.findIndex((w) => w.staatInCv);
  const laatsteMis = woorden.map((w) => w.staatInCv).lastIndexOf(false);
  ok("het ontbrekende staat bovenaan", eersteRaak === -1 || laatsteMis < eersteRaak, `${eersteRaak} en ${laatsteMis}`);

  ok("de lijst is begrensd", vergelijkSleutelwoorden(vacature.repeat(40), cv).length <= MAX_SLEUTELWOORDEN);

  // Conventie 3: onbekend is een betere waarde dan een verkeerde. Zonder CV is
  // er geen percentage, en 0% naast een leeg veld leest als een oordeel.
  ok("zonder CV geen percentage", dekkingspercentage(vacature, "") === null);
  ok("zonder vacature geen percentage", dekkingspercentage("", cv) === null);
  const dekking = dekkingspercentage(vacature, cv);
  ok("met allebei wel een percentage", typeof dekking === "number" && dekking > 0 && dekking <= 100, `${dekking}`);
});

// ⚠️ Deze groep bestaat om één reden: `bepaalParameters()` in het zijproject en
// `resolveTuning()` in de pijplijn volgen dezelfde regel van de API (temperatuur
// mag alleen als er niet geredeneerd wordt), maar zijn twee stukken code. Lopen
// ze uit elkaar, dan faalt elke aanroep van dit scherm op een 400 zonder dat er
// iets aan dit scherm veranderd is.
group("de assistent: de modelkeuze volgt dezelfde regel als de pijplijn", () => {
  ok("het vlaggenschip is de standaard", STANDAARD_MODEL === "gpt-6-sol");
  ok("de standaardkeuzes bestaan", isGeldigModel(STANDAARD_MODEL) && isGeldigeStand(STANDAARD_STAND));
  ok("een model buiten de lijst wordt geweigerd", !isGeldigModel("gpt-6-astra"));
  ok("een verzonnen stand wordt geweigerd", !isGeldigeStand("heel-hoog"));
  ok("elk model heeft een tarief", MODELLEN.every((m) => hasKnownRate(m.id)), MODELLEN.map((m) => m.id).join(", "));
  ok("elk model zegt waar het voor is", MODELLEN.every((m) => m.waarvoor.length > 20));
  ok("elke stand zegt wanneer je hem wilt", REDENEERSTANDEN.every((s) => s.wanneer.length > 20));

  for (const model of MODELLEN) {
    // Zonder redeneren: temperatuur mee, zoals de API hem daar toestaat.
    const zonder = bepaalParameters(model.id, "none");
    ok(`${model.id} zonder redeneren krijgt een temperatuur`, zonder.temperature === TEMPERATUUR_ZONDER_REDENEREN);
    ok(`${model.id} zonder redeneren staat op none`, zonder.reasoningEffort === "none");

    // Mét redeneren: geen temperatuur, want dan weigert de API de hele aanroep.
    for (const stand of ["low", "medium", "high"] as const) {
      const met = bepaalParameters(model.id, stand);
      ok(`${model.id} op ${stand} stuurt geen temperatuur mee`, met.temperature === undefined);
      ok(`${model.id} op ${stand} stuurt die stand mee`, met.reasoningEffort === stand);
    }

    // Dezelfde regel, langs de andere kant gemeten: de pijplijn laat de
    // temperatuur ook vallen zodra er geredeneerd wordt.
    ok(
      `${model.id} wordt door de pijplijn als redeneermodel gezien`,
      isReasoningModel(model.id),
    );
    ok(
      `de pijplijn laat bij ${model.id} de temperatuur ook vallen`,
      resolveTuning(model.id, "content").temperature === undefined,
    );
  }
});

group("de assistent: het dossier hangt aan de persoon en niet aan de vacature", () => {
  const dossier: Dossierstuk[] = [
    { id: "3", soort: "project", titel: "Warmtepompen Nieuwegein", inhoud: "Twaalf woningen." },
    { id: "1", soort: "brief", titel: "Brief gemeente", inhoud: "Geachte mevrouw De Wit," },
    { id: "2", soort: "cv", titel: "CV 2026", inhoud: "Projectleider, 2019 tot 2026." },
    { id: "4", soort: "motivatie", titel: "Waarom techniek", inhoud: "Omdat het zichtbaar wordt." },
  ];

  // Het CV eerst, dan de brieven, dan de rest. Niet willekeurig: het CV is het
  // skelet en de brieven leveren de toon.
  const volgorde = sorteerDossier(dossier).map((s) => s.soort);
  ok("het CV staat vooraan", volgorde[0] === "cv", volgorde.join(", "));
  ok("de brieven komen daarna", volgorde[1] === "brief", volgorde.join(", "));

  const blok = bouwDossierblok(dossier);
  ok("elk stuk komt in het blok terug", Boolean(blok?.includes("CV 2026") && blok?.includes("Brief gemeente")));
  ok("met zijn soort erbij", Boolean(blok?.includes("=== CV: CV 2026 ===")));
  ok("zonder dossier is er geen blok", bouwDossierblok([]) === null);
  ok("een leeg stuk telt niet mee", bouwDossierblok([{ id: "x", soort: "cv", titel: "Leeg", inhoud: "  " }]) === null);

  // ⚠️ Het SOORT is geen ordening maar een functie: brieven leveren de stem,
  // het CV en de projecten leveren de feiten. Die twee door elkaar halen zou de
  // gemeten stem vervuilen met opsommingen uit een CV.
  ok("alleen brieven leveren de stem", brievenUit(dossier).length === 1);
  const feiten = feitenmateriaalUit(dossier);
  ok("het CV levert feiten", feiten.includes("Projectleider"));
  ok("een project ook", feiten.includes("Twaalf woningen"));
  ok("een eerdere brief niet", !feiten.includes("Geachte mevrouw"));

  ok("elk soort heeft een beschrijving", SOORTEN.every((s) => s.waarvoor.length > 20));
  ok("een verzonnen soort wordt geweigerd", !isGeldigeSoort("cv-2"));
  ok("en een echte niet", isGeldigeSoort("project"));

  // De grens is er tegen een ongeluk, en hij kapt niet stil af: wat eraf valt
  // wordt teruggegeven zodat het scherm het kan zeggen.
  // Er zijn twee grenzen, en ze werken na elkaar: eerst wordt elk stuk zelf
  // afgekapt op MAX_DOCUMENT_TEKENS, daarna vult het dossier zich tot
  // MAX_DOSSIER_TEKENS. Vier volle stukken passen precies, het vijfde niet.
  const vol = "x".repeat(MAX_DOCUMENT_TEKENS);
  const aantalDatPast = Math.floor(MAX_DOSSIER_TEKENS / MAX_DOCUMENT_TEKENS);
  const teGroot: Dossierstuk[] = [
    { id: "a", soort: "cv", titel: "CV", inhoud: vol },
    { id: "b", soort: "brief", titel: "Brief", inhoud: vol },
    { id: "c", soort: "motivatie", titel: "Motivatie", inhoud: vol },
    { id: "d", soort: "project", titel: "Aaa project", inhoud: vol },
    { id: "e", soort: "project", titel: "Zzz project dat afvalt", inhoud: "y".repeat(500) },
  ];
  const { mee, omvang } = pasDossierIn(teGroot);
  ok("wat past gaat mee", mee.length === aantalDatPast, `${mee.length} van ${aantalDatPast}`);
  ok("wat niet past valt eraf", omvang.afgevallen.includes("Zzz project dat afvalt"));
  // Het CV en de brieven vallen als laatste af: zonder CV is er geen brief,
  // zonder het zesde project wel.
  ok("het CV blijft", mee.some((stuk) => stuk.soort === "cv"));
  ok("een te lang stuk wordt zelf ook afgekapt", mee[0].inhoud.length === MAX_DOCUMENT_TEKENS);
  ok("de omvang wordt geteld", omvang.tekens > 0 && omvang.tokens > 0);
});

// ⚠️ Deze groep is het vangnet onder de belofte "de brief klinkt als jij". De
// promptregels komen uit een METING aan de eigen brieven, en dezelfde meting
// legt het antwoord er achteraf naast. Zonder deze controle is "schrijf zoals
// deze persoon" weer een bijvoeglijk naamwoord in een prompt.
group("de assistent: de stem wordt gemeten en niet gevraagd", () => {
  // Korte zinnen, "u", zelden met "Ik" beginnen. Ruim boven MINIMUM_WOORDEN.
  const kort = Array.from({ length: 12 }, () =>
    [
      "Uw vacature vraagt om iemand die de planning bewaakt.",
      "Dat doe ik al zeven jaar bij een installatiebedrijf.",
      "Mijn ploeg telt zes monteurs en drie leerlingen.",
      "De doorlooptijd ging van negen naar vijf dagen.",
      "Graag laat ik u zien hoe die aanpak werkt.",
    ].join(" "),
  );

  const profiel = meetStem(kort);
  ok("er komt een profiel uit", profiel !== null);
  if (!profiel) return;

  ok("de zinslengte is geteld", profiel.woordenPerZin >= 7 && profiel.woordenPerZin <= 11, `${profiel.woordenPerZin}`);
  ok("de aanspreekvorm is herkend", profiel.aanspreekvorm === "u", `${profiel.aanspreekvorm}`);
  ok("het aantal bronnen klopt", profiel.bronnen === 12, `${profiel.bronnen}`);
  ok("er zijn eigen woorden gevonden", profiel.eigenWoorden.length > 0);
  ok("de langere zin ligt boven het gemiddelde", profiel.langereZin >= profiel.woordenPerZin);

  // Conventie 3: te weinig materiaal geeft `null` en geen slag in de lucht. Een
  // profiel gemeten op 40 woorden ziet er precies zo betrouwbaar uit als een
  // profiel op 4000 woorden, en dat is het niet.
  ok("te weinig woorden levert geen profiel", meetStem(["Een korte zin. Nog een."]) === null);
  ok("niets levert ook niets", meetStem([]) === null);
  ok("de drempel staat op een getal dat iets betekent", MINIMUM_WOORDEN >= 100);

  // De regels zijn getallen, want een model kan "gemiddeld 9 woorden per zin"
  // volgen en "schrijf beknopt" niet, en code kan alleen het eerste nameten.
  const regels = formuleerStemregels(profiel);
  ok("de regels noemen de zinslengte met een getal", regels.some((r) => /\d+ woorden per zin/.test(r)));
  ok("en de aanspreekvorm", regels.some((r) => r.includes('"u"')));

  // De toets: hetzelfde materiaal valt binnen zijn eigen marges, een brief met
  // veel langere zinnen en de verkeerde aanspreekvorm niet.
  ok("de eigen brieven wijken niet van zichzelf af", toetsStem(kort[0], profiel).length === 0);

  const anders =
    "Jij zoekt een kandidaat die in staat is om binnen een complexe en voortdurend veranderende " +
    "omgeving het overzicht te bewaren over alle betrokken partijen en hun onderlinge belangen, " +
    "en die tegelijkertijd oog houdt voor de details die in zo'n traject nu eenmaal het verschil " +
    "maken tussen slagen en falen. Jij wilt iemand die dat kan. Jij krijgt dat van mij.";
  const afwijkingen = toetsStem(anders, profiel);
  ok("een andere stem valt op", afwijkingen.length > 0, `${afwijkingen.length}`);
  ok("de zinslengte wordt genoemd", afwijkingen.some((a) => a.wat === "Zinslengte" || a.wat === "Lange zinnen"));
  ok("de aanspreekvorm ook", afwijkingen.some((a) => a.wat === "Aanspreekvorm"));
  ok("elke afwijking zegt wat jij normaal doet", afwijkingen.every((a) => a.jij.length > 0));

  // Zonder profiel wordt er niets getoetst: dan is er geen maat om aan af te
  // meten, en iets aanwijzen zou een oordeel zijn dat nergens op steunt.
  ok("zonder profiel geen oordeel", toetsStem(anders, null).length === 0);
});

group("de assistent: tekst knippen gebeurt overal hetzelfde", () => {
  const tekst = "Eerste zin. Tweede zin!\n\nNieuwe alinea met een vraag? Ja.";
  ok("zinnen worden geteld", splitsInZinnen(tekst).length === 4, `${splitsInZinnen(tekst).length}`);
  ok("alinea's worden geteld", splitsInAlineas(tekst).length === 2);
  ok("woorden worden geteld", telWoorden("drie losse woorden") === 3);
  ok("leestekens tellen niet mee als woord", telWoorden("een, twee.") === 2);
  ok("een lege tekst geeft niets", splitsInZinnen("   ").length === 0);
  // Accenten horen bij het woord, anders valt "financiën" in tweeën uiteen.
  ok("accenten blijven heel", telWoorden("financiën coördinator") === 2);
});

group("de assistent: wat er de aanroep in gaat", () => {
  const dossier: Dossierstuk[] = [
    { id: "1", soort: "cv", titel: "CV 2026", inhoud: "Projectleider sinds 2019." },
    { id: "2", soort: "brief", titel: "Oude brief", inhoud: "Geachte heer De Vries," },
  ];

  const vacature = bouwVacatureblok("Wij zoeken een projectleider.");
  ok("het vacatureblok noemt de tekst", Boolean(vacature?.includes("Wij zoeken een projectleider.")));
  ok("zonder vacature is er geen blok", bouwVacatureblok("   ") === null);

  const lang = "a".repeat(MAX_VACATURE_TEKENS + 500);
  const gekapt = kapAf(lang, MAX_VACATURE_TEKENS);
  ok("een te lange tekst wordt afgekapt", gekapt.length < lang.length);
  ok("en zegt dat hij afgekapt is", gekapt.includes("afgekapt"));

  const invoer = bouwInvoer({
    dossier,
    feiten: [],
    vacature: "Wij zoeken een projectleider.",
    stem: null,
    historie: [],
    vraag: EERSTE_VRAAG,
  });

  // ⚠️ De volgorde is een ontwerpkeuze en geen toeval: instructie, dossier,
  // vacature, gesprek, vraag. Van meest naar minst stabiel, zodat OpenAI het
  // begin van de aanroep kan hergebruiken. Zet je het dossier achteraan, dan
  // valt dat hergebruik bij elke vervolgvraag weg.
  ok("de instructie staat vooraan", invoer[0].role === "system");
  ok("dan het dossier", invoer[1].content.includes("CV 2026"));
  ok("dan de vacature", invoer[2].content.includes("Wij zoeken een projectleider."));
  ok("het dossier staat vóór de vacature", invoer[1].content.indexOf("CV 2026") >= 0 && invoer[2].content.includes("VACATURETEKST"));
  ok("het bronmateriaal is een bericht van de gebruiker, geen instructie", invoer[1].role === "user");
  ok("de vraag staat achteraan", invoer[invoer.length - 1].content === EERSTE_VRAAG);

  // De historie wordt afgekapt op de laatste beurten.
  const historie = Array.from({ length: MAX_BERICHTEN_IN_HISTORIE + 10 }, (_, i) => ({
    rol: (i % 2 === 0 ? "gebruiker" : "assistent") as "gebruiker" | "assistent",
    inhoud: `bericht ${i}`,
  }));
  const lange = bouwInvoer({ dossier, feiten: [], vacature: "Iets.", stem: null, historie, vraag: "en nu korter" });
  // instructie + dossier + vacature + historie + vraag (geen feitenkaart hier)
  ok(
    "de historie wordt afgekapt op de laatste beurten",
    lange.length === MAX_BERICHTEN_IN_HISTORIE + 4,
    `${lange.length}`,
  );
  ok("de oudste beurt valt eruit", !lange.some((b) => b.content === "bericht 0"));
  ok("de nieuwste blijft staan", lange.some((b) => b.content === `bericht ${historie.length - 1}`));

  // Een leeg bericht (een mislukt antwoord uit de database) hoort niet mee de
  // aanroep in: de API weigert een lege inhoud.
  const metLeeg = bouwInvoer({
    dossier,
    feiten: [],
    vacature: "Iets.",
    stem: null,
    historie: [{ rol: "assistent", inhoud: "" }, { rol: "gebruiker", inhoud: "hallo" }],
    vraag: "en?",
  });
  ok("een leeg bericht gaat niet mee", metLeeg.every((b) => b.content.trim().length > 0));
  ok("de rollen zijn vertaald naar wat de API kent", metLeeg.every((b) => ["system", "user", "assistant"].includes(b.role)));

  // De gemeten stem hoort in de INSTRUCTIE, want het is een opdracht en geen
  // materiaal. Zonder gemeten brieven staat er niets, en dat is de juiste stand:
  // een verzonnen stijlvoorschrift legt een register op dat van niemand is.
  const brieven = Array.from({ length: 12 }, () =>
    "Uw vacature vraagt om overzicht. Dat doe ik al zeven jaar. Mijn ploeg telt zes monteurs.",
  );
  const profiel = meetStem(brieven);
  const metStem = bouwInvoer({ dossier, feiten: [], vacature: "Iets.", stem: profiel, historie: [], vraag: "?" });
  ok("de stem staat in de systeeminstructie", metStem[0].content.includes("DE STEM VAN DEZE PERSOON"));
  ok("met een getal erin", /\d+ woorden per zin/.test(metStem[0].content));
  ok("zonder gemeten stem staat er niets over stijl", !invoer[0].content.includes("DE STEM VAN DEZE PERSOON"));
});

// ⚠️ Dit is de belangrijkste groep van het zijproject. De feitenkaart is een
// GESLOTEN lijst: alles wat er niet op staat mag een brief niet beweren. Die
// belofte is niets waard zonder de controle eronder, want de verwijzing zelf is
// ook maar iets wat het model zegt te doen. Aanleiding staat in
// `lib/pipeline/factcard.ts`: van 16 beweringen op een gegenereerde pagina waren
// er 5 verzonnen, en precies daar waar de tekst een concreet feit nodig had.
group("de assistent: de feitenkaart is een spiegel en geen grens", () => {
  const feiten: Feit[] = [
    { id: "a", nummer: 1, categorie: "werk", tekst: "Projectleider bij Van Dijk", periode: "2019 tot 2026", bronzin: "Projectleider bij Van Dijk, 2019 tot 2026.", handmatig: false },
    { id: "b", nummer: 3, categorie: "resultaat", tekst: "Doorlooptijd van negen naar vijf dagen", periode: null, bronzin: "De doorlooptijd ging van negen naar vijf dagen.", handmatig: false },
  ];

  ok("het nummer blijft een handvat op het scherm", refVan(feiten[1]) === "F3");
  ok("elke categorie zegt waarvoor hij is", CATEGORIEEN.every((c) => c.waarvoor.length > 20));
  ok("een verzonnen categorie wordt geweigerd", !isGeldigeCategorie("prestatie"));
  ok("en een echte niet", isGeldigeCategorie("resultaat"));

  const blok = bouwFeitenblok(feiten);
  ok("het blok bestaat", Boolean(blok));
  ok("de feiten staan erin", Boolean(blok?.includes("Doorlooptijd van negen naar vijf dagen")));
  ok("een periode gaat mee waar hij er is", Boolean(blok?.includes("(2019 tot 2026)")));
  ok("zonder feiten is er geen blok", bouwFeitenblok([]) === null);

  // ⚠️ Dit is de kern van de omkering van 15 september 2026. Stond hier nog een
  // gesloten lijst of een F-nummer, dan zou het model die nummers in de brief
  // gaan plakken en zou de schrijver weer vastzitten aan wat de uitleesronde
  // toevallig gevonden heeft.
  ok("het blok zegt NIET dat de lijst gesloten is", !blok?.includes("VOLLEDIGE lijst"));
  ok("en niet dat de rest niet bestaat", !blok?.includes("bestaat voor deze brief niet"));
  ok("het zegt juist dat het dossier de bron blijft", Boolean(blok?.includes("het dossier zelf blijft de bron")));
  ok("er staan geen F-nummers in het blok", !/\bF\d/.test(blok ?? ""));
});

// ⚠️ De bronzin is de enige reden dat de kaart te vertrouwen is. Het model krijgt
// de opdracht letterlijk te citeren, en deze zeef gooit weg wat niet letterlijk
// in het dossier staat. Conventie 1: de promptinstructie krijgt een vangnet.
group("de assistent: een feit zonder aanwijsbare bronzin haalt de kaart niet", () => {
  const dossier = [
    "=== CV: CV 2026 ===",
    "Projectleider bij Van Dijk, 2019 tot 2026.",
    "De doorlooptijd van offertes ging van negen naar vijf dagen.",
  ].join("\n");

  const gezeefd = zeefFeiten(
    [
      { categorie: "werk", tekst: "Projectleider bij Van Dijk", periode: "2019 tot 2026", bronzin: "Projectleider bij Van Dijk, 2019 tot 2026." },
      { categorie: "resultaat", tekst: "Doorlooptijd bijna gehalveerd", periode: null, bronzin: "De doorlooptijd van offertes ging van negen naar vijf dagen." },
      // Klinkt goed en staat nergens: dit is precies wat de zeef moet vangen.
      { categorie: "resultaat", tekst: "Bespaarde het bedrijf 40.000 euro", periode: null, bronzin: "Hij bespaarde het bedrijf veertigduizend euro." },
      // Een samengevatte bron telt ook niet: dan bewijst de bron niets meer.
      { categorie: "werk", tekst: "Zeven jaar ervaring", periode: null, bronzin: "Zeven jaar bij Van Dijk gewerkt." },
      { categorie: "werk", tekst: "", periode: null, bronzin: "Projectleider bij Van Dijk, 2019 tot 2026." },
    ],
    dossier,
  );

  ok("wat letterlijk in het dossier staat blijft", gezeefd.length === 2, `${gezeefd.length}`);
  ok("een verzonnen bedrag valt af", !gezeefd.some((f) => f.tekst.includes("40.000")));
  ok("een samengevatte bron valt af", !gezeefd.some((f) => f.tekst.includes("Zeven jaar")));
  ok("een feit zonder tekst valt af", gezeefd.every((f) => f.tekst.length > 0));

  // Een PDF levert regelafbrekingen midden in een zin. Die mogen een feit niet
  // laten afvallen, want dan is de zeef strenger dan de bedoeling.
  const metAfbreking = zeefFeiten(
    [{ categorie: "werk", tekst: "Projectleider", periode: null, bronzin: "Projectleider bij\n  Van Dijk, 2019 tot 2026." }],
    dossier,
  );
  ok("witruimte telt niet mee in de vergelijking", metAfbreking.length === 1);

  // Twee keer hetzelfde feit is geen twee feiten.
  const dubbel = zeefFeiten(
    [
      { categorie: "werk", tekst: "Projectleider bij Van Dijk", periode: null, bronzin: "Projectleider bij Van Dijk, 2019 tot 2026." },
      { categorie: "werk", tekst: "projectleider bij van dijk", periode: null, bronzin: "Projectleider bij Van Dijk, 2019 tot 2026." },
    ],
    dossier,
  );
  ok("hetzelfde feit staat er maar één keer op", dubbel.length === 1);
});

group("de assistent: de prompt nodigt uit en verbiedt niet", () => {
  const feiten: Feit[] = [
    { id: "a", nummer: 1, categorie: "werk", tekst: "Projectleider", periode: null, bronzin: "Projectleider.", handmatig: false },
  ];

  const zonder = bouwSysteemprompt({ feiten: 0 });
  const met = bouwSysteemprompt({ feiten: feiten.length });

  // De drie kopjes zijn de vorm waar `splitsAntwoord()` op knipt. Lopen die twee
  // uit elkaar, dan valt er niets meer te controleren zonder dat er iets kapot
  // lijkt te zijn.
  for (const kop of [KOP_VACATURE, KOP_OPDRACHT, KOP_BRIEF]) {
    ok(`de prompt schrijft "${kop}" voor`, met.includes(kop) && zonder.includes(kop));
  }
  ok("de schrijfopdracht vraagt waarom juist deze kandidaat", met.includes("Waarom jij:"));
  ok("en wat er weggelaten wordt", met.includes("Weglaten:"));

  // ⚠️ De omkering van 15 september 2026, langs de kant van de prompt.
  ok("de prompt sluit de lijst niet af", !met.includes("GESLOTEN"));
  ok("en vraagt niet om nummers in de brief", !met.includes("[F12]"));
  ok("hij zegt dat het dossier de bron blijft", met.includes("het dossier"));
  ok("en staat combineren uitdrukkelijk toe", met.includes("Combineren mag"));
  ok("zonder kaart staat dat blok er niet", !zonder.includes("HET CONCREETSTE MATERIAAL"));

  // Verzinnen blijft verboden, met of zonder kaart. Dat is geen grens op het
  // materiaal maar op het model, en die blijft staan.
  for (const prompt of [met, zonder]) {
    ok("verzinnen blijft verboden", prompt.includes("verzin je niet"));
    ok("met de uitweg erbij", prompt.includes("[dit weet ik niet:"));
  }

  const invoer = bouwInvoer({
    dossier: [{ id: "1", soort: "cv", titel: "CV", inhoud: "Projectleider." }],
    feiten,
    vacature: "Iets.",
    stem: null,
    historie: [],
    vraag: "?",
  });
  ok("de uitgelichte punten staan vóór het dossier", invoer[1].content.includes("concreetste") && invoer[2].content.includes("=== CV:"));
  ok("en het dossier gaat nog steeds voluit mee", invoer[2].content.includes("Projectleider."));
});

// ⚠️ Deze groep verving op 15 september 2026 de controle op F-nummers. De
// feitenkaart stond tot die dag als GESLOTEN lijst in de prompt: wat er niet op
// stond mocht de brief niet beweren. Dat patroon komt uit het hoofdproduct, waar
// de tekst zonder tussenkomst naar de site van een klant gaat. Hier leest de
// schrijver elke brief na en is hij zelf het onderwerp, dus de grens kocht weinig
// en kostte veel: wat de uitleesronde miste was voor de brief weg, en een model
// dat per zin moet verantwoorden schrijft vlakker.
//
// De controle is verhuisd naar ná het schrijven. Hij zoekt op wat woordelijk op
// te zoeken is, getallen en namen, en wijst aan zonder iets te verbieden.
group("de assistent: getallen en namen uit de brief worden opgezocht in je materiaal", () => {
  const bronnen = [
    "Projectleider bij Van Dijk Installatie, 2019 tot 2026.",
    "Mijn ploeg telt zes monteurs en drie leerlingen.",
    "Vorig jaar leverden wij elf projecten op tijd op.",
    "Van Beek Installatietechniek zoekt een projectleider in Utrecht.",
  ].join("\n");

  const klopt =
    "Ik werk sinds 2019 bij Van Dijk Installatie. Bij Van Beek zou ik dat in Utrecht voortzetten.";
  ok("wat in het materiaal staat wordt niet aangewezen", zoekOnvindbaar(klopt, bronnen).length === 0,
    zoekOnvindbaar(klopt, bronnen).map((v) => v.waarde).join(", "));

  // Dit is de fout die deze controle moet vangen: een cijfer dat nergens staat
  // en dat de zin juist overtuigend maakt.
  const verzonnen = "Ik bespaarde het bedrijf 40.000 euro per jaar.";
  const geld = zoekOnvindbaar(verzonnen, bronnen);
  ok("een verzonnen bedrag wordt gevonden", geld.length === 1, geld.map((v) => v.waarde).join(", "));
  ok("en het is een getal", geld[0]?.soort === "getal");
  ok("met de zin erbij, zodat je ziet waar het over gaat", Boolean(geld[0]?.zin.includes("bespaarde")));

  const werkgever = zoekOnvindbaar("Daarvoor werkte ik bij Heijmans aan de spoorzone.", bronnen);
  ok("een verzonnen werkgever wordt gevonden", werkgever.some((v) => v.waarde === "Heijmans"));
  ok("en het is een naam", werkgever.find((v) => v.waarde === "Heijmans")?.soort === "naam");

  // Een hoofdletter aan het begin van een zin is interpunctie en geen naam.
  ok(
    "het eerste woord van een zin telt niet als naam",
    zoekOnvindbaar("Daarnaast stuurde ik een ploeg aan. Vervolgens ging het beter.", bronnen).length === 0,
  );
  // Zonder deze lijst wijst elke brief "Geachte" en "Met" aan, en dan klikt
  // iemand de controle na twee keer weg.
  ok(
    "beleefdheidsvormen tellen niet als naam",
    zoekOnvindbaar("Ik schrijf u, Geachte heer De Vries. Ik groet u, Met vriendelijke groet.", bronnen)
      .every((v) => !["Geachte", "Met", "vriendelijke"].includes(v.waarde)),
  );

  // Een scheidingsteken in een getal mag niet uitmaken: 40.000 en 40000 zijn
  // hetzelfde bedrag, en het dossier en de brief schrijven dat zelden gelijk.
  ok(
    "punten en komma's in een getal maken niet uit",
    zoekOnvindbaar("Ik haalde 40.000 euro binnen.", "Hij haalde 40000 euro binnen.").length === 0,
  );

  // Eén cijfer is bijna altijd een opsomming of een spelling, en levert te veel
  // loos alarm om bruikbaar te zijn.
  ok("losse cijfers worden overgeslagen", zoekOnvindbaar("Ik deed 3 dingen.", bronnen).length === 0);

  // ⚠️ Nagemeten op een proefbrief op 15 september 2026: de controle wees vier
  // namen aan, en dat waren de aanhef en de ondertekening. Allebei terecht in de
  // zin dat ze niet in het dossier staan, en allebei nutteloos: je eigen naam
  // staat zelden in je eigen CV-tekst en de ontvanger typ je zelf. Vier valse
  // treffers op een goede brief is genoeg om de controle weg te klikken, en dan
  // vangt hij het verzonnen bedrag ook niet meer.
  const heleBrief = [
    "Geachte heer De Vries,",
    "",
    "Ik werk sinds 2019 bij Van Dijk Installatie.",
    "",
    "Met vriendelijke groet,",
    "Jan Willem Koopman",
  ].join("\n");
  const opNaam = zoekOnvindbaar(heleBrief, bronnen);
  ok("de aanhef levert geen valse treffer", !opNaam.some((v) => v.waarde === "Vries"), opNaam.map((v) => v.waarde).join(", "));
  ok("de ondertekening ook niet", !opNaam.some((v) => ["Jan", "Willem", "Koopman"].includes(v.waarde)));
  ok("en er blijft dus niets over", opNaam.length === 0, opNaam.map((v) => v.waarde).join(", "));

  // Maar een verzonnen naam in de ROMP moet er nog steeds uit komen, anders is
  // de uitzondering een gat.
  const metVerzinsel = heleBrief.replace(
    "Ik werk sinds 2019 bij Van Dijk Installatie.",
    "Ik werk sinds 2019 bij Van Dijk Installatie. Daarvoor zat ik bij Heijmans.",
  );
  ok(
    "een verzonnen naam in de romp komt er nog wel uit",
    zoekOnvindbaar(metVerzinsel, bronnen).some((v) => v.waarde === "Heijmans"),
  );

  const ingekort = zonderAanhefEnOndertekening(heleBrief);
  ok("de aanhef is eraf", !ingekort.includes("Geachte"));
  ok("de ondertekening is eraf", !ingekort.includes("Koopman"));
  ok("de romp blijft heel", ingekort.includes("Van Dijk Installatie"));
  // Zonder herkenbare aanhef of afsluiting blijft alles staan: liever één naam
  // te veel aangewezen dan de halve brief stilzwijgend overslaan.
  ok("een brief zonder aanhef blijft compleet", zonderAanhefEnOndertekening("Zomaar een zin.").includes("Zomaar"));

  ok("zonder bronmateriaal wordt er niets aangewezen", zoekOnvindbaar(verzonnen, "   ").length === 0);
  ok("zonder brief ook niet", zoekOnvindbaar("", bronnen).length === 0);

  const veel = zoekOnvindbaar(
    Array.from({ length: 20 }, (_, i) => `Ik haalde ${1000 + i * 111} euro binnen.`).join(" "),
    bronnen,
  );
  ok("de lijst is begrensd", veel.length <= MAX_ONVINDBAAR, `${veel.length}`);
  ok("hetzelfde getal staat er maar één keer in", zoekOnvindbaar("Ik deed 25 en nog eens 25.", bronnen).length === 1);
});

group("de assistent: schrijven loopt via een route met een eigenaarscontrole", () => {
  // Conventie 6, en de reden dat migratie 0095 wel een selectpolicy heeft en
  // geen insertpolicy: de client schrijft nooit rechtstreeks.
  const routes = [
    "app/api/solliciteren/chats/route.ts",
    "app/api/solliciteren/chats/[id]/route.ts",
    "app/api/solliciteren/chats/[id]/berichten/route.ts",
    "app/api/solliciteren/documenten/route.ts",
    "app/api/solliciteren/documenten/[id]/route.ts",
    "app/api/solliciteren/documenten/inlezen/route.ts",
    "app/api/solliciteren/feiten/route.ts",
    "app/api/solliciteren/feiten/[id]/route.ts",
    "app/api/solliciteren/feiten/uitlezen/route.ts",
  ];
  for (const route of routes) {
    const bron = leesBestand(route);
    ok(`${route} bestaat`, bron.length > 0);
    ok(
      `${route} controleert wie er binnenkomt`,
      bron.includes("laadEigenGesprek(") ||
        bron.includes("laadEigenDocument(") ||
        bron.includes("laadEigenFeit(") ||
        bron.includes("eisBeheerder("),
    );
  }

  const toegang = leesBestand("lib/solliciteren/toegang.ts");
  ok("de controle kijkt naar het beheerdersrecht", toegang.includes("isStaff("));
  ok("en naar de eigenaar van het gesprek", toegang.includes("chat.user_id !== user.id"));
  ok("en naar de eigenaar van een dossierstuk", toegang.includes("document.user_id !== user.id"));
  ok("en naar de eigenaar van een feit", toegang.includes("feit.user_id !== user.id"));
  ok("een gesprek van iemand anders geeft 404 en geen 403", toegang.includes("status: 404"));

  // Een scherm in de browser praat nooit zelf met de database: het stuurt zijn
  // wijziging naar een route hierboven. De pagina zelf is een server component
  // en leest wél, met een controle op `user_id` ernaast.
  for (const bestand of tsxOnder("app/solliciteren")) {
    const bron = leesBestand(bestand);
    if (!bron.includes('"use client"')) continue;
    ok(`${bestand} praat niet zelf met de database`, !bron.includes("@/lib/supabase/"));
  }
  const pagina = leesBestand("app/solliciteren/page.tsx");
  ok("de pagina leest alleen de gesprekken van deze gebruiker", pagina.includes('.eq("user_id", user.id)'));

  // En het zijproject raakt geen enkele tabel van ORBIT ENGINE aan.
  const eigenBestanden = [...tsxOnder("app/solliciteren")];
  for (const bestand of [...eigenBestanden, ...routes, "lib/solliciteren/toegang.ts"]) {
    const bron = leesBestand(bestand);
    const vreemdeTabellen = [...bron.matchAll(/\.from\("([a-z_]+)"\)/g)]
      .map((m) => m[1])
      .filter((tabel) => !tabel.startsWith("sollicitatie_"));
    ok(`${bestand} raakt alleen de eigen tabellen`, vreemdeTabellen.length === 0, vreemdeTabellen.join(", "));
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
console.log("\nDe Sales-module: het fundament (sprint 1)");

group("het adres van een markt ligt vast en verandert niet", () => {
  // ⚠️ Dit adres wordt straks het PUBLIEKE adres van de markt (plan hoofdstuk
  // 20, les A uit hoofdstuk 23). Een adres dat achteraf verandert, is een
  // gebroken link in elke verkoopmail die er al uit is. Vandaar dat de regel in
  // een pure module staat en hier wordt vastgelegd.
  eq("branche en plaats worden één adres", maakSlug("makelaar", "Eindhoven"), "makelaar-eindhoven");
  eq("hoofdletters gaan eruit", maakSlug("Makelaar", "EINDHOVEN"), "makelaar-eindhoven");
  eq("spaties worden koppeltekens", maakSlug("aankoop makelaar", "Den Bosch"), "aankoop-makelaar-den-bosch");

  // Accenten horen weg: anders krijgen "Café" en "Cafe" twee verschillende
  // adressen voor dezelfde markt, en dan staan er twee publieke pagina's over
  // hetzelfde.
  eq("accenten worden gewone letters", maakSlug("café", "Curaçao"), "cafe-curacao");

  // De apostrof aan het begin is het geval dat de meeste steden in Nederland
  // raakt. Zonder het afkappen van koppeltekens aan de randen zou dit
  // "-s-hertogenbosch" worden, en dat is een adres met een streepje ervoor.
  eq("een apostrof levert geen streepje aan het begin", maakSlug("makelaar", "'s-Hertogenbosch"), "makelaar-s-hertogenbosch");
  eq("opeenvolgende tekens worden één streepje", maakSlug("auto & fiets", "Best"), "auto-fiets-best");

  // Conventie 3: liever niets dan een verzonnen adres. De aanroeper hoort
  // daarop te controleren, en dat doet `controleerMarktInvoer()` hieronder.
  eq("niets bruikbaars levert een leeg adres op", maakSlug("///", "***"), "");
});

group("twee markten mogen dezelfde naam hebben, maar nooit hetzelfde adres", () => {
  eq("een vrij adres blijft zoals het is", uniekeSlug("makelaar-eindhoven", []), "makelaar-eindhoven");
  eq(
    "een bezet adres krijgt een volgnummer",
    uniekeSlug("makelaar-eindhoven", ["makelaar-eindhoven"]),
    "makelaar-eindhoven-2",
  );
  eq(
    "en telt door zolang het bezet is",
    uniekeSlug("makelaar-eindhoven", ["makelaar-eindhoven", "makelaar-eindhoven-2"]),
    "makelaar-eindhoven-3",
  );
  // Een gat in de reeks vullen mag: -2 is vrij, dus daar gaat hij heen.
  eq(
    "een gat in de reeks wordt gevuld",
    uniekeSlug("makelaar-eindhoven", ["makelaar-eindhoven", "makelaar-eindhoven-3"]),
    "makelaar-eindhoven-2",
  );
});

group("de naam die sales leest, gokt geen meervoud", () => {
  eq("branche en plaats met een hoofdletter", standaardLabel("makelaar", "eindhoven"), "Makelaar Eindhoven");
  eq("meerdere woorden krijgen er allemaal een", standaardLabel("aankoop makelaar", "den bosch"), "Aankoop Makelaar Den Bosch");

  // ⚠️ DE KERN VAN DEZE TEST. Het plan schrijft "Makelaars Eindhoven", en dat
  // leest prettiger. Maar een meervoud automatisch maken is in het Nederlands
  // een gok: makelaar wordt makelaars en architect wordt architecten. Conventie
  // 3: onbekend is een betere waarde dan een verkeerde. Wie het meervoud wil,
  // typt het label zelf.
  ok("er wordt geen s aangeplakt", !standaardLabel("makelaar", "Eindhoven").includes("Makelaars"));
  ok("ook niet bij een woord op -ect", standaardLabel("architect", "Tilburg") === "Architect Tilburg");
});

group("de invoercontrole zegt per veld wat er moet gebeuren", () => {
  const goed = controleerMarktInvoer({ branche: "  makelaar ", plaats: " Eindhoven ", straalKm: 15 });
  ok("een normale markt gaat erdoor", goed.ok);
  if (goed.ok) {
    eq("spaties eromheen gaan eruit", goed.branche, "makelaar");
    eq("dubbele spaties erin ook", controleerMarktInvoer({ branche: "aankoop  makelaar", plaats: "Best", straalKm: 15 }).ok ? "aankoop makelaar" : "", "aankoop makelaar");
    eq("het adres komt eruit", goed.slug, "makelaar-eindhoven");
    eq("en het voorstel voor de naam", goed.label, "Makelaar Eindhoven");
  }

  // Een eigen label wint van het voorstel: dat is het hele punt van het veld.
  const eigenNaam = controleerMarktInvoer({ branche: "makelaar", plaats: "Eindhoven", straalKm: 15, label: "Makelaars Eindhoven" });
  eq("een eigen naam wint van het voorstel", eigenNaam.ok ? eigenNaam.label : "", "Makelaars Eindhoven");

  // K2 uit `docs/logbook.md`: elke foutmelding is specifiek en zegt wat je moet
  // doen. De fout die dit voorkomt is niet "iemand typt onzin" maar "iemand
  // typt iets wat er redelijk uitziet en er volgt een marktonderzoek van tien
  // euro op".
  const geenBranche = controleerMarktInvoer({ branche: "", plaats: "Eindhoven", straalKm: 15 });
  ok("een lege branche wordt geweigerd", !geenBranche.ok);
  ok("op het juiste veld", !geenBranche.ok && geenBranche.veld === "branche");
  ok("met een voorbeeld erin", !geenBranche.ok && geenBranche.melding.includes("makelaar"));

  const geenPlaats = controleerMarktInvoer({ branche: "makelaar", plaats: "", straalKm: 15 });
  ok("een lege plaats ook", !geenPlaats.ok && geenPlaats.veld === "plaats");

  const nulStraal = controleerMarktInvoer({ branche: "makelaar", plaats: "Eindhoven", straalKm: 0 });
  ok("een straal van nul is geen markt", !nulStraal.ok && nulStraal.veld === "straalKm");
  ok(
    "en de melding noemt de standaard",
    !nulStraal.ok && nulStraal.melding.includes(String(STRAAL_STANDAARD)),
  );

  const heelLand = controleerMarktInvoer({ branche: "makelaar", plaats: "Eindhoven", straalKm: STRAAL_MAX + 1 });
  ok("boven het maximum is geen straal meer maar het land", !heelLand.ok);

  const halveKm = controleerMarktInvoer({ branche: "makelaar", plaats: "Eindhoven", straalKm: 7.5 });
  ok("een halve kilometer is geen straal", !halveKm.ok && halveKm.veld === "straalKm");

  const geenGetal = controleerMarktInvoer({ branche: "makelaar", plaats: "Eindhoven", straalKm: Number.NaN });
  ok("en geen getal ook niet", !geenGetal.ok && geenGetal.veld === "straalKm");

  // Alles wegvallen kan echt: iemand typt "///" in beide velden. Dan is er geen
  // adres te maken en dus ook geen markt, en dat zeggen we hardop in plaats van
  // een markt met een leeg adres op te slaan.
  const geenLetters = controleerMarktInvoer({ branche: "///", plaats: "***", straalKm: 15 });
  ok("zonder letters of cijfers is er geen adres", !geenLetters.ok);
  ok("en de melding zegt dat", !geenLetters.ok && geenLetters.melding.includes("letters"));
});

group("de statusmachine is de code-garantie onder de twee poorten", () => {
  // ⚠️ DIT IS DE BELANGRIJKSTE TEST VAN DIT BLOK. Poort 1 (de admin keurt de
  // bedrijvenlijst goed) en poort 2 (de vragen plus de kostenraming) zijn de
  // twee plekken waar geld wordt uitgegeven op basis van een menselijk oordeel
  // (plan §8.1). Een knop is te omzeilen; een statusmachine niet.
  ok(
    "van bedrijven gevonden kun je niet rechtstreeks naar meten",
    !magOvergaan("bedrijven_gevonden", "meet"),
  );
  // ⚠️ Sinds sprint 3 liggen er twee poorten in plaats van één, en de
  // statusmachine zegt dat: van een goedgekeurde bedrijvenlijst naar meten kan
  // niet in één stap. Daar zitten de crawl, de intenties en de vragen tussen, en
  // daarna poort 2. Zou dit wél mogen, dan is er te meten zonder dat iemand de
  // vragen of de kostenraming heeft gezien, en dat is ~95% van wat een markt kost.
  ok(
    "er moet eerst goedkeuring tussen",
    magOvergaan("bedrijven_gevonden", "wacht_op_goedkeuring") &&
      magOvergaan("wacht_op_goedkeuring", "vragen_klaar") &&
      magOvergaan("vragen_klaar", "meet"),
  );
  ok(
    "en van een goedgekeurde lijst kun je niet meteen meten: poort 2 zit ertussen",
    !magOvergaan("wacht_op_goedkeuring", "meet"),
  );
  ok("en concept kan al helemaal niet meteen meten", !magOvergaan("concept", "meet"));
  ok("of meteen klaar zijn", !magOvergaan("concept", "klaar"));

  // Hermeten is geen uitzondering maar de kern van de economie van deze module
  // (plan hoofdstuk 12, type 8): elke hermeting levert nieuwe belaanleidingen
  // op uit een markt die je al kent, tegen alleen de meetkosten.
  ok("een klare markt mag opnieuw gemeten worden", magOvergaan("klaar", "meet"));

  // Opnieuw proberen begint bij het begin en niet halverwege.
  ok("een mislukte markt begint opnieuw bij concept", magOvergaan("mislukt", "concept"));
  ok("en niet halverwege", !magOvergaan("mislukt", "meet"));

  // Poort 1 mag ook de andere kant op: de admin stuurt de lijst terug.
  ok("de admin mag de bedrijvenlijst terugsturen", magOvergaan("wacht_op_goedkeuring", "bedrijven_gevonden"));

  // Elke stand kan mislukken, behalve de standen die al een eindpunt zijn.
  for (const stand of MARKT_STANDEN) {
    if (stand === "mislukt" || stand === "klaar") continue;
    ok(`${stand} kan mislukken`, magOvergaan(stand, "mislukt"));
  }

  // Zichzelf is geen overgang: anders zou "opslaan zonder wijziging" als een
  // stap in de keten tellen en de voortgang vervuilen.
  for (const stand of MARKT_STANDEN) {
    ok(`${stand} gaat niet naar zichzelf`, !magOvergaan(stand, stand));
  }

  // Een onbekende waarde uit de database mag nooit een geldige stand lijken.
  ok("een onbekende stand telt niet", !isMarktStand("verzonnen"));
  ok("en is geen vertrekpunt", volgendeStanden("verzonnen" as MarktStand).length === 0);
  for (const stand of MARKT_STANDEN) ok(`${stand} is een geldige stand`, isMarktStand(stand));

  // Elke stand heeft een tekst, want een scherm dat een lege kop toont is erger
  // dan een scherm dat "onbekend" zegt.
  for (const stand of MARKT_STANDEN) {
    ok(`${stand} heeft een label`, Boolean(MARKT_STAND_TEKST[stand]?.label));
    ok(`${stand} heeft een uitleg`, Boolean(MARKT_STAND_TEKST[stand]?.uitleg));
  }

  // `docs/schrijfstijl.md` richtlijn 11: "niet gelukt", nooit "mislukt", in wat
  // de gebruiker leest. De databasewaarde mag wel zo heten.
  eq("de gebruiker leest 'niet gelukt'", MARKT_STAND_TEKST.mislukt.label, "Niet gelukt");
});

group("de bewaartermijn rekent, en gokt niet", () => {
  const nu = new Date("2026-08-24T12:00:00Z");

  eq("de termijn is twaalf maanden", String(BEWAARTERMIJN_MAANDEN), "12");

  const vers = { last_activity_at: "2026-08-01T00:00:00Z" };
  ok("een vers bedrijf blijft staan", !moetOpgeruimd(vers, nu));
  eq("en de termijn loopt tot een jaar later", bewaarTot(vers)?.toISOString() ?? "", "2027-08-01T00:00:00.000Z");

  const oud = { last_activity_at: "2025-08-01T00:00:00Z" };
  ok("een bedrijf dat een jaar stilstaat gaat eruit", moetOpgeruimd(oud, nu));

  // Precies op de grens telt als om: anders blijft een rij een dag te lang staan
  // en dat is de kant die je juist niet wilt bij persoonsgegevens.
  const precies = { last_activity_at: "2025-08-24T12:00:00Z" };
  ok("precies op de dag is de termijn om", moetOpgeruimd(precies, nu));

  // ⚠️ DE BELANGRIJKSTE UITZONDERING. `do_not_contact` is juist de reden dat een
  // rij moet blijven: hij is het geheugen dat dit bedrijf niet benaderd mag
  // worden. Zou hij opgeruimd worden, dan komt het bedrijf bij de volgende
  // marktronde weer boven als nieuwe kans, en dan mailen we iemand die zich
  // heeft afgemeld. Dat is de ergste fout die deze module kan maken.
  ok(
    "een afgemeld bedrijf blijft staan, hoe oud ook",
    !moetOpgeruimd({ last_activity_at: "2020-01-01T00:00:00Z", do_not_contact: true }, nu),
  );

  // Twee keer anonimiseren levert niets nieuws op.
  ok(
    "een al geanonimiseerd bedrijf wordt niet nog eens opgeruimd",
    !moetOpgeruimd({ last_activity_at: "2020-01-01T00:00:00Z", anonymised_at: "2021-01-01T00:00:00Z" }, nu),
  );

  // Conventie 3: zonder laatste activiteit is er geen termijn te rekenen, en
  // dan geven we geen datum in plaats van vandaag te gokken. Een gegokte datum
  // zou een bedrijf te vroeg opruimen, en dat is onherstelbaar.
  ok("zonder laatste activiteit is er geen termijn", bewaarTot({ last_activity_at: null }) === null);
  ok("en wordt er niets opgeruimd", !moetOpgeruimd({ last_activity_at: null }, nu));
  ok("een onleesbare datum ook niet", bewaarTot({ last_activity_at: "gisteren" }) === null);
  ok("en levert geen aantal dagen op", dagenTotOpruimen({ last_activity_at: null }, nu) === null);

  eq(
    "de resterende dagen zijn te tellen",
    String(dagenTotOpruimen({ last_activity_at: "2026-08-24T12:00:00Z" }, nu)),
    "365",
  );
  ok(
    "en zijn negatief als de termijn om is",
    (dagenTotOpruimen(oud, nu) ?? 0) < 0,
  );
});

group("de Sales-module raakt de klantomgeving nergens", () => {
  // ⚠️ DIT IS DE VERIFICATIE VAN PLAN §4.3, EN HIJ IS BEWUST EEN
  // BRONCODECONTROLE. De regel luidt: geen enkel klantscherm leest uit de
  // Sales-tabellen, want een klant mag nooit kunnen zien dat hij ooit als
  // prospect met een opportunityscore in het systeem heeft gestaan.
  //
  // Dat is vandaag waar. Het risico ontstaat bij de VOLGENDE wijziging: iemand
  // hergebruikt een handige hulpfunctie uit `lib/sales/` op een klantscherm en
  // trekt er ongemerkt een import achteraan. Deze controle vangt dat af, net
  // als de bestaande controle die interne stof van klantschermen weert.
  const salesSchermen = tsxOnder("app/(app)/sales");
  ok(`er zijn Sales-schermen gevonden (${salesSchermen.length})`, salesSchermen.length >= 6);

  // ⚠️ ÉÉN GENOEMDE UITZONDERING, EN HET IS ER MAAR ÉÉN. De gedeelde layout van
  // het ingelogde gedeelte moet weten of de Sales-kop in de zijbalk hoort, dus
  // die vraagt `isSales()`. Dat is precies het tegenovergestelde van een lek: hij
  // vraagt het om de sectie te kunnen VERBERGEN. Hij leest geen enkele
  // Sales-tabel, en de controle hieronder houdt vast dat het bij deze ene blijft.
  const SHELL = "app/(app)/layout.tsx";
  const klantSchermen = tsxOnder("app/(app)").filter(
    (f) => !f.includes("/sales/") && !f.includes("/admin/") && !f.includes("/beheer/"),
  );
  ok(`er zijn klantschermen gevonden (${klantSchermen.length})`, klantSchermen.length > 20);

  // Geen enkel scherm leest een Sales-tabel. Deze regel kent geen uitzondering,
  // ook de shell niet: gegevens over prospects horen nergens in de klantkant.
  const leestTabel = klantSchermen.filter((f) => leesBestand(f).includes('from("sales_'));
  ok(
    `geen klantscherm leest een Sales-tabel${leestTabel.length ? " in " + leestTabel.join(", ") : ""}`,
    leestTabel.length === 0,
  );

  // En alleen de shell mag de Sales-laag überhaupt importeren.
  const importeert = klantSchermen.filter(
    (f) => f !== SHELL && leesBestand(f).includes("@/lib/sales/"),
  );
  ok(
    `alleen de shell importeert uit de Sales-laag${importeert.length ? ", niet " + importeert.join(", ") : ""}`,
    importeert.length === 0,
  );

  // En de shell doet er precies één ding mee: vragen of de kop mag verschijnen.
  const shell = leesBestand(SHELL);
  ok("de shell vraagt alleen of iemand sales is", shell.includes("isSales(") && !shell.includes('from("sales_'));

  // De zijbalk is het enige gedeelde onderdeel dat Sales kent, en die krijgt
  // zijn antwoord van de layout. Hij mag dus wél `salesNav` importeren, maar
  // nooit zelf beslissen wie sales is: dat oordeel hoort op één plek.
  const zijbalk = leesBestand("components/sidebar.tsx");
  ok("de zijbalk kent de Sales-bestemmingen", zijbalk.includes("salesNav"));
  ok("maar velt zelf geen oordeel", !zijbalk.includes("isSales("));
});

group("elke Sales-schrijfroute heeft zijn eigen rechtencontrole", () => {
  // ⚠️ Dezelfde gedachte als de bestaande controle op de twee remmen bij betaald
  // werk: de fout die dit voorkomt is niet "de controle werkt niet" maar "er
  // komt een route bij en die krijgt hem niet". Bij een module die gegevens
  // bevat over bedrijven die geen klant zijn, is dat het duurste soort gat.
  const routes = tsOnder("app/api/sales");
  ok(`er zijn Sales-routes gevonden (${routes.length})`, routes.length >= 1);

  for (const pad of routes) {
    const inhoud = leesBestand(pad);
    ok(
      `${pad} vraagt wie er inlogt`,
      inhoud.includes("getUser()") || inhoud.includes("requireUser()"),
    );
    ok(
      `${pad} controleert de salesrol`,
      inhoud.includes("isSalesAdmin(") || inhoud.includes("isSales("),
    );
    // Schrijven met de service-role key, nooit met de sessie van de gebruiker:
    // die kan namelijk niet schrijven, en een route die dat probeert faalt pas
    // in productie (conventie 6).
    ok(`${pad} schrijft met de service-role key`, inhoud.includes("createAdminClient("));
    // 404 en geen 403: een 403 bevestigt dat de route bestaat.
    ok(`${pad} noemt nergens 403`, !inhoud.includes("status: 403"));
  }
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe Sales-module: de markt ontdekken (sprint 2)");

/** Een eenvoudige naamnormalisatie, zodat deze tests niet van `lib/entities/` afhangen. */
const naamSleutel = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");

group("het webadres is de ontdubbelsleutel, dus hij moet streng zijn", () => {
  eq("protocol en www gaan eraf", normaliseerDomein("https://www.VanX.nl/") ?? "", "vanx.nl");
  eq("een pad ook", normaliseerDomein("https://vanx.nl/over-ons/team") ?? "", "vanx.nl");
  eq("en een querystring", normaliseerDomein("vanx.nl/?utm_source=x") ?? "", "vanx.nl");
  eq("een anker ook", normaliseerDomein("vanx.nl#contact") ?? "", "vanx.nl");
  eq("hoofdletters worden kleine letters", normaliseerDomein("VANX.NL") ?? "", "vanx.nl");

  // ⚠️ Een subdomein blijft staan. `praktijk.example.nl` en `example.nl` kunnen
  // echt twee verschillende bedrijven zijn, en samenvoegen levert een mail op
  // die naar de verkeerde vestiging gaat (plan 9.3).
  eq("een subdomein blijft staan", normaliseerDomein("praktijk.example.nl") ?? "", "praktijk.example.nl");

  // Conventie 3: liever geen domein dan een verzonnen domein. Op het domein
  // wordt ontdubbeld, en een fout domein voegt twee bedrijven samen.
  ok("zonder punt is het geen domein", normaliseerDomein("vanx") === null);
  ok("met een spatie erin ook niet", normaliseerDomein("van x.nl") === null);
  ok("een zin met een punt is geen domein", normaliseerDomein("Bel ons op 040.123456!") === null);
  ok("leeg is leeg", normaliseerDomein("") === null && normaliseerDomein(null) === null);
});

group("een platform is een bron en geen prospect", () => {
  // Plan 9.2, derde toets. Zonder deze regel vult de eerste markt zich met
  // Facebook, de Kamer van Koophandel en de vergelijkingssite waar we de namen
  // juist vandaan hebben.
  ok("facebook is geen prospect", isGeenProspect("facebook.com"));
  ok("een subdomein ervan ook niet", isGeenProspect("nl-nl.facebook.com"));
  ok("de Kamer van Koophandel evenmin", isGeenProspect("kvk.nl"));
  ok("en een gewone makelaar wel", !isGeenProspect("vanxmakelaars.nl"));
  // Een domein dat toevallig eindigt op de tekens van een platform is niet dat
  // platform. `nietfacebook.com` is een gewoon bedrijf.
  ok("een naam die er alleen op lijkt telt niet mee", !isGeenProspect("nietfacebook.com"));
  ok("zonder domein valt er niets te weren", !isGeenProspect(null));
});

group("een afgeleide naam is zichtbaar afgeleid", () => {
  eq("het domein wordt een naam", naamUitDomein("vanxmakelaars.nl"), "Vanxmakelaars");
  eq("koppeltekens worden spaties", naamUitDomein("van-x-makelaars.nl"), "Van x makelaars");
});

group("de zekerheid komt uit het aantal onafhankelijke vindplaatsen", () => {
  // Plan 9.1. ⚠️ EÉN BRON IS LAAG, OOK ALS DIE ENE BRON HET MODEL IS. Een
  // verzonnen bedrijf in een verkoopmail is niet te herstellen.
  eq("alleen het model is laag", zekerheidUitBronnen(["ai_websearch"]), "laag");
  eq("twee bronnen is middel", zekerheidUitBronnen(["ai_websearch", "bronpagina:nvm.nl"]), "middel");
  eq(
    "drie is hoog",
    zekerheidUitBronnen(["ai_websearch", "bronpagina:nvm.nl", "bronpagina:eindhoven.nl"]),
    "hoog",
  );
  // Dezelfde bron twee keer is één bron. Anders zou een pagina die een bedrijf
  // twee keer noemt zichzelf tot zekerheid promoveren.
  eq("dezelfde bron dubbel telt één keer", zekerheidUitBronnen(["ai_websearch", "ai_websearch"]), "laag");
  eq("geen bron is laag", zekerheidUitBronnen([]), "laag");
});

group("kandidaten samenvoegen: het domein wint, en bij twijfel voegen we niet samen", () => {
  const k = (over: Partial<Kandidaat>): Kandidaat => ({
    name: "Van X Makelaars",
    domain: "vanxmakelaars.nl",
    bron: "ai_websearch",
    naamHerkomst: "ai",
    ...over,
  });

  // ⚠️ HET BELANGRIJKSTE GEVAL. Hetzelfde bedrijf uit twee bronnen, één keer met
  // www en een pad erachter. Dat is één bedrijf met twee vindplaatsen, en dus
  // zekerheid `middel` in plaats van twee keer `laag`.
  const zelfde = voegKandidatenSamen(
    [
      k({ domain: "https://www.vanxmakelaars.nl/over-ons", evidenceUrl: "https://nvm.nl/leden" }),
      k({
        domain: "vanxmakelaars.nl",
        bron: "bronpagina:nvm.nl",
        naamHerkomst: "bronpagina",
        evidenceUrl: "https://nvm.nl/leden",
      }),
    ],
    naamSleutel,
  );
  eq("twee schrijfwijzen zijn één bedrijf", String(zelfde.length), "1");
  eq("met twee bronnen", String(zelfde[0].bronnen.length), "2");
  eq("en dus zekerheid middel", zelfde[0].confidence, "middel");
  eq("de vindplaats staat er maar één keer in", String(zelfde[0].evidenceUrls.length), "1");

  // Twee bedrijven met bijna dezelfde naam op verschillende domeinen zijn er
  // twee (plan 9.3). Samenvoegen zou een mail naar de verkeerde sturen.
  const bijnaGelijk = voegKandidatenSamen(
    [k({ name: "Van X Makelaars", domain: "vanx.nl" }), k({ name: "Van X Makelaardij", domain: "vanx-makelaardij.nl" })],
    naamSleutel,
  );
  eq("bijna dezelfde naam op twee domeinen blijft twee bedrijven", String(bijnaGelijk.length), "2");

  // ⚠️ EEN BEDRIJF ZONDER WEBSITE BLIJFT STAAN. Dat is de prospect die deze
  // module zoekt (plan hoofdstuk 9). Het valt terug op zijn genormaliseerde naam.
  const zonderSite = voegKandidatenSamen(
    [
      k({ name: "Makelaardij Zonder Site", domain: null, evidenceUrl: "https://gids.nl" }),
      k({ name: "makelaardij zonder site!", domain: "", bron: "bronpagina:gids.nl", naamHerkomst: "bronpagina" }),
    ],
    naamSleutel,
  );
  eq("een bedrijf zonder website blijft één bedrijf", String(zonderSite.length), "1");
  ok("en houdt geen verzonnen domein", zonderSite[0].domain === null);

  // Platforms vallen weg (plan 9.2, derde toets).
  const metPlatform = voegKandidatenSamen(
    [k({}), k({ name: "Funda", domain: "https://www.funda.nl" })],
    naamSleutel,
  );
  eq("een platform valt weg", String(metPlatform.length), "1");

  // Zonder naam én zonder domein valt er niets te ontdubbelen en niets te meten.
  const leeg = voegKandidatenSamen([k({ name: "", domain: null })], naamSleutel);
  eq("zonder naam en zonder domein is er geen kandidaat", String(leeg.length), "0");

  // Een naam uit een gecrawlde site wint van een naam uit het model, want de
  // eerste komt van het bedrijf zelf.
  const beteremaam = voegKandidatenSamen(
    [k({ name: "Van X", naamHerkomst: "ai" }), k({ name: "Van X Makelaars BV", naamHerkomst: "crawl" })],
    naamSleutel,
  );
  eq("de naam van de site zelf wint", beteremaam[0].name, "Van X Makelaars BV");

  // Zeker bovenaan: dat is de volgorde waarin de admin bij poort 1 wil lezen.
  const gesorteerd = voegKandidatenSamen(
    [
      k({ name: "Alleen model", domain: "a.nl" }),
      k({ name: "Twee bronnen", domain: "b.nl" }),
      k({ name: "Twee bronnen", domain: "b.nl", bron: "bronpagina:nvm.nl" }),
    ],
    naamSleutel,
  );
  eq("het zekerste bedrijf staat bovenaan", gesorteerd[0].name, "Twee bronnen");
});

group("een bronpagina levert de bedrijven waar hij naartoe linkt", () => {
  const html = `
    <html><body>
      <a href="/leden">Onze leden</a>
      <a href="https://nvm.nl/contact">Contact</a>
      <a href="https://www.vanxmakelaars.nl">Van X Makelaars</a>
      <a href="https://ymakelaars.nl/">Y Makelaars</a>
      <a href="https://zmakelaars.nl">lees meer</a>
      <a href="https://www.funda.nl">Funda</a>
      <a href="https://leden.nvm.nl/x">Eigen subdomein</a>
      <a href="https://ymakelaars.nl/team">Y Makelaars nog een keer</a>
    </body></html>`;
  const uit = bedrijvenUitBronpagina(html, "https://nvm.nl/leden/eindhoven");

  const domeinen = uit.map((k) => k.domain);
  ok("een relatieve link telt niet mee", !domeinen.includes("/leden"));
  ok("het eigen domein van de bronpagina ook niet", !domeinen.some((d) => d === "nvm.nl"));
  ok("en een subdomein van de bronpagina evenmin", !domeinen.some((d) => d === "leden.nvm.nl"));
  ok("een platform valt weg", !domeinen.includes("funda.nl"));
  ok("een echt bedrijf komt erin", domeinen.includes("vanxmakelaars.nl"));
  eq("hetzelfde bedrijf twee keer telt één keer", String(domeinen.filter((d) => d === "ymakelaars.nl").length), "1");

  // De linktekst IS op een ledenlijst de bedrijfsnaam. Dat scheelt een extra
  // netwerkverzoek per bedrijf.
  eq("de linktekst wordt de naam", uit.find((k) => k.domain === "vanxmakelaars.nl")?.name ?? "", "Van X Makelaars");

  // ⚠️ Maar "lees meer" is geen naam. Dan valt hij terug op het domein, en dat
  // is zichtbaar aan de herkomst, zodat poort 1 weet wat er te controleren valt.
  const zwak = uit.find((k) => k.domain === "zmakelaars.nl");
  eq("nietszeggende linktekst wordt geen naam", zwak?.name ?? "", "Zmakelaars");
  eq("en dat is zichtbaar aan de herkomst", zwak?.naamHerkomst ?? "", "domein");

  // De bron draagt het domein van de pagina, zodat twee verschillende
  // ledenlijsten als twee bronnen tellen en niet als één.
  ok("de bron noemt de pagina waar hij vandaan komt", uit[0].bron === "bronpagina:nvm.nl");
});

group("de herkomst staat in gewone taal bij poort 1", () => {
  const b = (bronnen: string[]) => ({
    sleutel: "x", name: "X", naamHerkomst: "ai" as const, domain: null, city: null,
    bronnen, evidenceUrls: [], confidence: "laag" as const,
  });
  ok(
    "alleen het model zegt dat er niets bevestigd is",
    beschrijfHerkomst(b(["ai_websearch"])).includes("nergens anders bevestigd"),
  );
  ok(
    "twee bronnen noemen de bevestiging",
    beschrijfHerkomst(b(["ai_websearch", "bronpagina:nvm.nl"])).includes("bevestigd"),
  );
  ok(
    "en het aantal klopt bij meervoud",
    beschrijfHerkomst(b(["bronpagina:a.nl", "bronpagina:b.nl"])).includes("2 overzichtspagina"),
  );
});

group("de ontdekkingsvraag vraagt naar volledigheid, niet naar bekendheid", () => {
  const vraag = bouwOntdekVraag({
    id: "x", label: "Makelaar Eindhoven", industry: "makelaar",
    location: "Eindhoven", radius_km: 15, country: "NL", status: "concept",
  });

  ok("de branche staat erin", vraag.includes("makelaar"));
  ok("de plaats ook", vraag.includes("Eindhoven"));
  ok("en de straal", vraag.includes("15"));

  // ⚠️ DIT IS DE BELANGRIJKSTE ASSERTIE VAN DEZE GROEP. Vraag je om "de
  // belangrijkste spelers", dan krijg je de bedrijven die al zichtbaar zijn, en
  // dat is precies de lijst die deze module NIET nodig heeft (plan hoofdstuk 9).
  ok("er wordt niet naar de bekendste gevraagd", !/bekendste|belangrijkste spelers|grootste/i.test(vraag));
  ok("volledigheid staat er wel expliciet in", vraag.toLowerCase().includes("volledigheid gaat boven bekendheid"));
  ok("en de opdracht om kleine bedrijven mee te nemen", /eenmanszaken|kleine bedrijven/i.test(vraag));
  ok("de bronpagina's worden apart gevraagd", /ledenlijsten|overzichtspagina/i.test(vraag));
  ok("en er staat dat er niets verzonnen mag worden", vraag.toLowerCase().includes("verzin geen"));
});

group("uitsluiten: wie er nooit in een prospectlijst mag staan", () => {
  const merken = [
    { profileId: "p1", domein: "klant.nl", naam: "Klant BV", toegewezen: true },
    { profileId: "p2", domein: "voorbereid.nl", naam: "Voorbereid BV", toegewezen: false },
  ];

  const uit = bepaalUitsluitingen(
    [
      { companyId: "c1", domein: "klant.nl", doNotContact: false },
      { companyId: "c2", domein: "voorbereid.nl", doNotContact: false },
      { companyId: "c3", domein: "vreemde.nl", doNotContact: false },
      { companyId: "c4", domein: "afgemeld.nl", doNotContact: true },
      { companyId: "c5", domein: null, doNotContact: false },
    ],
    merken,
  );

  const per = new Map(uit.map((u) => [u.companyId, u]));
  eq("een bestaande klant wordt uitgesloten", per.get("c1")?.kind ?? "", "klant");
  eq("met een verwijzing naar het merk", per.get("c1")?.relatedProfileId ?? "", "p1");
  ok("en de reden noemt de naam", (per.get("c1")?.reason ?? "").includes("Klant BV"));

  // Het product is sales-led: een merkprofiel zonder toewijzing is een traject
  // dat al klaarstaat voor een demogesprek, en dat is een even goede reden.
  eq("een voorbereid traject ook", per.get("c2")?.kind ?? "", "lopend_traject");

  ok("een vreemd bedrijf blijft gewoon staan", !per.has("c3"));

  // `do_not_contact` gaat vóór alles: absoluut, permanent, geen tegenpartij nodig.
  eq("een afgemeld bedrijf wordt uitgesloten", per.get("c4")?.kind ?? "", "do_not_contact");

  // ⚠️ Matchen gebeurt op domein en niet op naam. Een bedrijf zonder domein
  // levert dus geen match op, en dat is de veilige kant: het blijft staan en de
  // admin ziet het bij poort 1.
  ok("een bedrijf zonder webadres levert geen match op", !per.has("c5"));

  // Twee merken op hetzelfde domein: "is klant" is de zwaarste uitspraak.
  const dubbel = bepaalUitsluitingen(
    [{ companyId: "c9", domein: "beide.nl", doNotContact: false }],
    [
      { profileId: "pa", domein: "beide.nl", naam: "Voorbereid", toegewezen: false },
      { profileId: "pb", domein: "beide.nl", naam: "Klant", toegewezen: true },
    ],
  );
  eq("is-klant wint van staat-klaar", dubbel[0].kind, "klant");

  // Alle vier de soorten uit 9.5 bestaan, ook die pas later gevuld wordt.
  eq("er zijn vier soorten uitsluiting", String(UITSLUIT_SOORTEN.length), "4");
});

group("de markt waarschuwt als er een klant van ons in zit", () => {
  ok(
    "zonder klant is er geen waarschuwing",
    marktWaarschuwing([
      { companyId: "c", kind: "do_not_contact", reason: "x", relatedProfileId: null },
    ]) === null,
  );

  const een = marktWaarschuwing([
    { companyId: "c", kind: "klant", reason: "x", relatedProfileId: "p" },
  ]);
  ok("met één klant wel", (een ?? "").includes("een klant van ons"));
  ok("en de waarschuwing zegt wat je moet doen", (een ?? "").includes("voorzichtig"));

  const meer = marktWaarschuwing([
    { companyId: "a", kind: "klant", reason: "x", relatedProfileId: "p" },
    { companyId: "b", kind: "klant", reason: "x", relatedProfileId: "q" },
    { companyId: "c", kind: "lopend_traject", reason: "x", relatedProfileId: "r" },
  ]);
  ok("bij meerdere staat het aantal erbij", (meer ?? "").includes("2 klanten"));
  ok("inclusief de lopende trajecten", (meer ?? "").includes("een lopend traject"));

  // ⚠️ Geen namen in de waarschuwing. Die staan bij de bedrijven zelf, en een
  // waarschuwing die uitgroeit tot een opsomming wordt niet meer gelezen.
  ok("er staan geen bedrijfsnamen in", !(meer ?? "").includes("BV"));
});

group("het plafond per markt is een rem, geen doel", () => {
  eq("het plafond staat op tien euro", String(MARKT_BUDGET_EUR), "10");
  ok("in dollars is dat meer", marktBudgetUsd() > MARKT_BUDGET_EUR);

  const ruim = beoordeelBudget(0, "discover");
  ok("een verse markt mag beginnen", ruim.ok);
  ok("en er is geen melding", ruim.melding === null);

  // De vraag is niet "zitten we eronder" maar "zitten we er ná deze stap nog
  // onder". Een stap die begint met een paar cent over, maakt het plafond alsnog
  // kapot.
  const netAan = beoordeelBudget(marktBudgetUsd() - 0.01, "discover");
  ok("net onder het plafond mag de dure stap niet meer", !netAan.ok);
  ok("de melding noemt het plafond", (netAan.melding ?? "").includes("10,00"));
  ok("en zegt wat er niet gebeurt", (netAan.melding ?? "").includes("overgeslagen"));
  ok("met een euroteken en een komma", (netAan.melding ?? "").includes("€"));

  // ⚠️ De gratis stappen blijven doorlopen, ook bij een vol budget. Dat is het
  // ontwerp uit plan 21.1: wat meeschaalt met het aantal bedrijven kost niets,
  // dus er is geen reden om het te blokkeren.
  ok("een gratis stap mag altijd door", beoordeelBudget(marktBudgetUsd() * 2, "enrich").ok);
  eq("de crawl kost niets", String(SALES_STAP_KOSTEN.enrich), "0");
  eq("het ontdubbelen ook niet", String(SALES_STAP_KOSTEN.verify), "0");
  ok("en de ontdekking wel", SALES_STAP_KOSTEN.discover > 0);
});

group("de fase van een markt zegt wat er nu gebeurt", () => {
  eq("een verse markt heet concept", marktFase({ status: "concept" }).label, "Concept");

  // ⚠️ Tussen poort 1 en poort 2 zit werk dat niet meet en niet wacht. Dat had
  // een zevende stand kunnen worden; het is afgeleid uit twee bestaande velden,
  // want een afgeleid gegeven hoort niet als kolom opnieuw opgeslagen te worden.
  eq(
    "wachten op poort 1",
    marktFase({ status: "wacht_op_goedkeuring", approved_at: null }).label,
    "Wacht op jou",
  );
  eq(
    "en na goedkeuring iets anders",
    marktFase({ status: "wacht_op_goedkeuring", approved_at: "2026-08-24T10:00:00Z" }).label,
    "Goedgekeurd",
  );
  // ⚠️ Deze test stond er tot sprint 3 andersom in: hij eiste de woorden "wordt
  // gebouwd", want het meten bestond nog niet en de app mag nooit zeggen dat
  // iets al kan (CLAUDE.md). Nu bestaat het wél, en dan is diezelfde zin
  // onjuist geworden. De regel eronder is niet veranderd: de tekst zegt wat er
  // echt gebeurt, en zegt wie er daarna aan zet is.
  const naGoedkeuring = marktFase({
    status: "wacht_op_goedkeuring",
    approved_at: "2026-08-24T10:00:00Z",
  }).uitleg;
  ok("en belooft niets wat nog niet gebouwd is", !naGoedkeuring.includes("wordt gebouwd"));
  ok("maar zegt wel wie er hierna aan zet is", naGoedkeuring.includes("weer aan jou"));
  eq(
    "poort 2 wacht op de vragen en de kostenraming",
    marktFase({ status: "vragen_klaar" }).label,
    "Vragen klaar",
  );
  eq("een onbekende stand blijft onbekend", marktFase({ status: "verzonnen" }).label, "Onbekende stand");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe Sales-module: de markt meten (sprint 3)");

group("de twee assen bepalen wat een vraag waard is", () => {
  // Plan 10.3: fase × waarde × frequentie. De bandbreedte moet groot genoeg zijn
  // dat een koopklare vraag écht zwaarder telt dan een oriënterende, anders is
  // het gewogen aandeel hetzelfde cijfer als het ongewogen aandeel met ruis erop.
  const zwaarst = vraagGewicht("selecteren", "hoog", "hoog");
  const lichtst = vraagGewicht("orientatie", "laag", "laag");
  eq2("de zwaarste vraag telt vol mee", zwaarst, 1);
  ok("en de lichtste bijna niet", lichtst < 0.05, String(lichtst));
  ok("een factor twintig of meer ertussen", zwaarst / lichtst >= 20, String(zwaarst / lichtst));

  // ⚠️ Geen enkele vraag mag op 0 uitkomen. Een vraag met gewicht 0 telt niet
  // mee in de gewogen score en verdwijnt stil uit de meting, terwijl hij wel
  // betaald is.
  for (const stage of INTENT_STAGES) {
    ok(`${stage} met de laagste banden telt nog steeds mee`, vraagGewicht(stage, "laag", "laag") > 0);
  }

  // De koopbeslissing weegt zwaarder dan de oriëntatie. Dat is de hele reden dat
  // "onzichtbaar bij selecteren" een ander gesprek is dan "onzichtbaar bij
  // oriëntatie" (plan 10.2).
  ok("selecteren weegt zwaarder dan oriënteren", STAGE_WEIGHT.selecteren > STAGE_WEIGHT.orientatie);
  ok("en contact weegt net iets minder dan selecteren", STAGE_WEIGHT.contact < STAGE_WEIGHT.selecteren);
  ok("de banden lopen van hoog naar laag", BAND_FACTOR.hoog > BAND_FACTOR.midden && BAND_FACTOR.midden > BAND_FACTOR.laag);
});

group("de vragen worden geteld en niet gevraagd", () => {
  const intenties: Intentie[] = [
    { label: "verkoop", naam: "Verkoop", uitleg: "", waarde: "hoog", frequentie: "hoog" },
    { label: "aankoop", naam: "Aankoop", uitleg: "", waarde: "hoog", frequentie: "midden" },
    { label: "taxatie", naam: "Taxatie", uitleg: "", waarde: "midden", frequentie: "laag" },
  ];

  // ⚠️ Het totaal moet EXACT kloppen. De kostenraming bij poort 2 rust erop, en
  // de noemer van elke score ook. Een verdeling die 38 of 41 vragen oplevert bij
  // een gevraagde 40 maakt van de raming een schatting van een schatting.
  const veertig = verdeelVragen(intenties, 40);
  eq2("veertig gevraagd is veertig gekregen", veertig.length, 40);
  const dertien = verdeelVragen(intenties, 13);
  eq2("ook als het niet deelbaar is", dertien.length, 13);

  // Elke intentie krijgt ongeveer evenveel vragen. Een intentie met twee vragen
  // kan geen intent gap dragen (plan hoofdstuk 12, type 3).
  const perIntentie = new Map<string, number>();
  for (const v of veertig) perIntentie.set(v.intentLabel, (perIntentie.get(v.intentLabel) ?? 0) + 1);
  const aantallen = Array.from(perIntentie.values());
  ok("elke intentie komt aan bod", perIntentie.size === 3);
  ok(
    "en ze krijgen er hooguit één verschil",
    Math.max(...aantallen) - Math.min(...aantallen) <= 1,
    aantallen.join(", "),
  );

  // De rest van de deling gaat naar de zwaarste fases en niet naar de eerste in
  // de lijst: bij dertien vragen over drie intenties valt er van alles af, en
  // wat overblijft hoort de fase te zijn waar de koopbeslissing valt.
  const eersteIntentie = dertien.filter((v) => v.intentLabel === "verkoop");
  ok("selecteren komt als eerste aan bod", eersteIntentie[0]?.stage === "selecteren");

  ok("zonder intenties zijn er geen vragen", verdeelVragen([], 40).length === 0);
  ok("en zonder aantal ook niet", verdeelVragen(intenties, 0).length === 0);
});

group("te veel intenties is een as die niets meet", () => {
  // ⚠️ Het model levert er graag twaalf. Twaalf intenties op veertig vragen is
  // drie vragen per intentie, en dan valt elk verschil tussen twee intenties
  // binnen de marge. Dan is de hele tweede as waardeloos, en die as is precies
  // waarom deze module niet "je scoort 18 van 40" zegt.
  const ruw = Array.from({ length: 12 }, (_, i) => ({
    label: `intentie_${i}`,
    naam: `Intentie ${i}`,
    uitleg: "",
    waarde: i < 3 ? "hoog" : "laag",
    frequentie: i < 3 ? "hoog" : "laag",
  }));

  const uit = schoonIntenties(ruw, 40);
  ok("er blijven er hooguit acht over", uit.intenties.length <= INTENTIES_MAX);
  ok(
    "en niet meer dan er vragen voor zijn",
    uit.intenties.length <= Math.floor(40 / MIN_VRAGEN_PER_INTENTIE),
    String(uit.intenties.length),
  );
  ok("wat eruit gaat wordt hardop gezegd", uit.meldingen.length === 1, uit.meldingen.join(" "));
  ok(
    "en de waardevolste blijven staan",
    uit.intenties.slice(0, 3).every((i) => i.waarde === "hoog"),
  );

  // Conventie 3: onbekend wordt `midden` en geen gok naar boven. Een intentie
  // met een verzonnen hoge waarde komt bovenaan de vragenlijst op grond van niets.
  const onbekend = schoonIntenties([{ naam: "Iets", label: "iets", waarde: "enorm" }], 40);
  eq("een onbekende band wordt midden", onbekend.intenties[0]?.waarde ?? "", "midden");

  // Dubbele labels tellen één keer: anders krijgt dezelfde intentie twee keer
  // een deel van de vragen en lijkt hij dubbel zo breed gemeten.
  const dubbel = schoonIntenties(
    [
      { naam: "Aankoop", label: "aankoop", waarde: "hoog", frequentie: "hoog" },
      { naam: "Aankoop begeleiding", label: "Aankoop", waarde: "hoog", frequentie: "hoog" },
    ],
    40,
  );
  eq2("hetzelfde label telt één keer", dubbel.intenties.length, 1);
  eq("en het label is genormaliseerd", normaliseerLabel("Aankoop Begeleiding!"), "aankoop_begeleiding");
});

group("een geleverde vraag hoort op de plek waar hij thuishoort", () => {
  const intenties: Intentie[] = [
    { label: "verkoop", naam: "Verkoop", uitleg: "", waarde: "hoog", frequentie: "hoog" },
    { label: "aankoop", naam: "Aankoop", uitleg: "", waarde: "hoog", frequentie: "hoog" },
  ];
  const plekken = verdeelVragen(intenties, 4);

  const uit = koppelVragen(plekken, [
    { intent_label: "verkoop", fase: "selecteren", vraag: "Welke makelaar kies ik in Eindhoven?" },
    { intent_label: "Verkoop", fase: "vergelijken", vraag: "Wat kost een makelaar in Eindhoven?" },
    { intent_label: "aankoop", fase: "selecteren", vraag: "Wie helpt mij bij het kopen van een huis?" },
    { intent_label: "aankoop", fase: "vergelijken", vraag: "Aankoopmakelaar of zelf doen?" },
  ]);
  eq2("vier plekken, vier vragen", uit.vragen.length, 4);
  ok("er is niets te melden", uit.melding === null, uit.melding ?? "");
  ok(
    "een net anders geschreven etiket telt gewoon mee",
    uit.vragen.some((v) => v.intentLabel === "verkoop" && v.stage === "vergelijken"),
  );

  // ⚠️ Wat er gebeurt als het model erlangs levert. Zonder dit vangnet krijgt
  // de ene intentie negen vragen en de andere één, en meet de intent gap iets
  // wat er niet is.
  const scheef = koppelVragen(plekken, [
    { intent_label: "verkoop", fase: "selecteren", vraag: "Welke makelaar kies ik in Eindhoven?" },
    { intent_label: "verkoop", fase: "selecteren", vraag: "Welke makelaar is de beste hier?" },
    { intent_label: "onbekend", fase: "selecteren", vraag: "Iets heel anders over deze markt" },
    { intent_label: "verkoop", fase: "bestaat_niet", vraag: "Een fase die niet bestaat, wat nu?" },
  ]);
  eq2("een tweede vraag voor dezelfde plek valt af", scheef.vragen.length, 1);
  ok("en dat wordt gemeld", (scheef.melding ?? "").includes("3 van de 4"), scheef.melding ?? "");

  // Dezelfde vraagtekst twee keer is twee keer betalen voor hetzelfde antwoord.
  const dubbel = koppelVragen(plekken, [
    { intent_label: "verkoop", fase: "selecteren", vraag: "Welke makelaar kies ik hier?" },
    { intent_label: "aankoop", fase: "selecteren", vraag: "welke makelaar kies ik hier?" },
  ]);
  eq2("dezelfde vraag telt één keer", dubbel.vragen.length, 1);
});

group("een koopvraag noemt altijd de plaats", () => {
  // ⚠️ De duurste les van 1 september 2026. Drie van de veertig vragen noemden
  // Eindhoven, en op "Welke installateur kan bij mij in de buurt een warmtepomp
  // goed installeren?" antwoordde de assistent letterlijk dat hij eerst een
  // postcode nodig had. Twee van de veertig antwoorden noemden een bedrijf uit
  // de markt, en 42 van de 43 bedrijven kwamen daardoor op nul uit.
  eq(
    "een buurtzin wordt de plaats en blijft één zin",
    zetPlaatsInVraag("Welke installateur kan bij mij in de buurt een warmtepomp installeren?", "Eindhoven"),
    "Welke installateur kan in Eindhoven een warmtepomp installeren?",
  );
  eq(
    "bij mij thuis ook",
    zetPlaatsInVraag("Wie kan een hybride warmtepomp bij mij thuis vakkundig plaatsen?", "Eindhoven"),
    "Wie kan een hybride warmtepomp in Eindhoven vakkundig plaatsen?",
  );
  eq(
    "zonder buurtzin komt de plaats achteraan, vóór het vraagteken",
    zetPlaatsInVraag("Waar moet ik op letten bij het kiezen van een installateur?", "Eindhoven"),
    "Waar moet ik op letten bij het kiezen van een installateur in Eindhoven?",
  );
  eq(
    "een vraag die de plaats al noemt, blijft precies zoals hij is",
    zetPlaatsInVraag("Wie kan in Eindhoven een airco netjes installeren?", "Eindhoven"),
    "Wie kan in Eindhoven een airco netjes installeren?",
  );
  eq(
    "hoofdletters tellen niet mee bij het herkennen",
    zetPlaatsInVraag("Wie plaatst er warmtepompen in eindhoven?", "Eindhoven"),
    "Wie plaatst er warmtepompen in eindhoven?",
  );
  eq("zonder plaats gebeurt er niets", zetPlaatsInVraag("Wat kost een warmtepomp?", ""), "Wat kost een warmtepomp?");

  const vragen = [
    { text: "Wat kost een warmtepomp inclusief installatie?", intentLabel: "wp", stage: "orientatie" as const, weight: 1, position: 0 },
    { text: "Wat is het verschil tussen hybride en all-electric?", intentLabel: "wp", stage: "vergelijken" as const, weight: 1, position: 1 },
    { text: "Welke installateur kan bij mij in de buurt een warmtepomp installeren?", intentLabel: "wp", stage: "selecteren" as const, weight: 1, position: 2 },
    { text: "Kan iemand langskomen om te kijken welke warmtepomp past?", intentLabel: "wp", stage: "contact" as const, weight: 1, position: 3 },
  ];
  const bijgestuurd = plaatsInKoopvragen(vragen, "Eindhoven");
  eq2("twee koopvragen krijgen de plaats erbij", bijgestuurd.aangepast, 2);
  ok(
    "de oriëntatievraag mag algemeen blijven",
    bijgestuurd.vragen[0].text === "Wat kost een warmtepomp inclusief installatie?",
  );
  ok(
    "de vergelijkvraag ook",
    bijgestuurd.vragen[1].text === "Wat is het verschil tussen hybride en all-electric?",
  );
  ok(
    "en elke selecteer- en contactvraag noemt Eindhoven",
    bijgestuurd.vragen
      .filter((v) => KOOPFASES.includes(v.stage))
      .every((v) => v.text.includes("Eindhoven")),
  );

  // De prompt vraagt erom én de code garandeert het. Zonder de eerste krijg je
  // houterige zinnen, zonder de tweede krijg je de meting van 1 september.
  const prompt = bouwVragenVraag(
    { label: "Warmtepomp Eindhoven", industry: "Warmtepomp", location: "Eindhoven", radius_km: 15 },
    [{ label: "wp", naam: "Warmtepomp", uitleg: "", waarde: "hoog", frequentie: "hoog" }],
    verdeelVragen([{ label: "wp", naam: "Warmtepomp", uitleg: "", waarde: "hoog", frequentie: "hoog" }], 4),
  );
  ok(
    "de prompt eist de plaats in de fases selecteren en contact",
    prompt.includes("selecteren en contact noem je Eindhoven altijd"),
  );
  ok("en verbiedt bij mij in de buurt", prompt.includes('"bij mij in de buurt"'));
});

group("het marktscherm laat zien waar het op wacht", () => {
  // ⚠️ De pijplijn doet negen dingen en de gebruiker zag er één zin van, dertien
  // minuten lang, zonder teller en zonder de zestien mislukte schrijftaken.
  const leeg: ProcesMoment = {
    marktStatus: "concept",
    rondeStatus: null,
    rondeNr: 1,
    bedrijvenGevonden: 0,
    bedrijvenMee: 0,
    bedrijvenOnbeoordeeld: 0,
    crawlKlaar: 0,
    crawlMislukt: 0,
    vragen: 0,
    antwoorden: 0,
    antwoordenVerwacht: 0,
    kansen: 0,
    kansenGeschreven: 0,
    taken: {},
    isPublic: false,
    heeftRapport: false,
  };

  const nieuweMarkt = bouwFases(leeg);
  eq2("negen stappen, altijd", nieuweMarkt.length, 9);
  eq("de eerste is klaar zodra de markt bestaat", nieuweMarkt[0].stand, "klaar");
  eq("en het wacht op jou om te starten", nieuweMarkt[1].stand, "wacht_op_jou");
  ok("de samenvatting zegt dat ook", procesSamenvatting(nieuweMarkt).includes("wacht op jou"));
  ok("er draait niets", !loopterIets(nieuweMarkt));

  // Halverwege de meting: de teller is het hele punt.
  const metend = bouwFases({
    ...leeg,
    marktStatus: "meet",
    rondeStatus: "meet",
    bedrijvenGevonden: 26,
    bedrijvenMee: 26,
    vragen: 40,
    antwoorden: 18,
    antwoordenVerwacht: 40,
    taken: {
      sales_measure_question: { wachtend: 10, bezig: 5, klaar: 18, mislukt: 0 },
      sales_company_enrich: { wachtend: 0, bezig: 0, klaar: 26, mislukt: 0 },
    },
  });
  const meten = metend.find((f) => f.sleutel === "meten");
  eq("de meetstap is bezig", meten?.stand ?? "", "bezig");
  eq("met een teller erbij", meten?.detail ?? "", "18 van de 40 vragen gemeten");
  ok("en het scherm mag zichzelf verversen", loopterIets(metend));

  // Een mislukte schrijfstap is zichtbaar, met de geruststelling erbij.
  const naSchrijven = bouwFases({
    ...leeg,
    marktStatus: "klaar",
    rondeStatus: "klaar",
    bedrijvenGevonden: 43,
    bedrijvenMee: 43,
    vragen: 40,
    antwoorden: 40,
    antwoordenVerwacht: 40,
    kansen: 43,
    kansenGeschreven: 0,
    taken: { sales_opportunity_explain: { wachtend: 0, bezig: 0, klaar: 0, mislukt: 16 } },
  });
  const teksten = naSchrijven.find((f) => f.sleutel === "teksten");
  eq("zestien mislukte schrijftaken zijn zichtbaar", teksten?.stand ?? "", "mislukt");
  ok("en er staat wat dat betekent", (teksten?.actie ?? "").includes("sjabloonzin"));
  ok("de samenvatting wijst naar de vastloper", procesSamenvatting(naSchrijven).includes("liep vast"));

  // Poort 2 is geen stilstand maar een vraag aan jou.
  const bijPoort2 = bouwFases({
    ...leeg,
    marktStatus: "vragen_klaar",
    rondeStatus: "vragen_klaar",
    bedrijvenGevonden: 26,
    bedrijvenMee: 26,
    vragen: 40,
  });
  const poort2 = bijPoort2.find((f) => f.sleutel === "poort2");
  eq("poort 2 wacht op jou", poort2?.stand ?? "", "wacht_op_jou");
  ok("en zegt dat dit de stap is die geld kost", (poort2?.actie ?? "").includes("geld kost"));
});

group("een gemiste naam is bruikbaar in plaats van een rijtje", () => {
  // ⚠️ Feenstra werd in de eerste markt drie keer genoemd en stond niet in onze
  // lijst. Daarmee was de best zichtbare partij onzichtbaar voor de detectie.
  const uit = groepeerOnbekend([
    "Feenstra",
    "Daikin",
    "Feenstra",
    "Werkspot",
    "Kemkens",
    "Feenstra",
    "Milieu Centraal",
    "Daikin",
  ]);

  eq("de vaakst genoemde staat bovenaan", uit[0].naam, "Feenstra");
  eq2("met het aantal erbij", uit[0].keer, 3);
  eq("en hij telt als mogelijk bedrijf", uit[0].soort, "mogelijk_bedrijf");
  eq("daarna de andere installateur", uit[1].naam, "Kemkens");
  ok(
    "fabrikanten en platforms staan onderaan",
    uit.slice(2).every((n) => n.soort === "merk_of_bron"),
  );

  ok("Daikin is een merk", isMerkOfBron("Daikin"));
  ok("Werkspot een platform", isMerkOfBron("Werkspot"));
  ok("Milieu Centraal voorlichting", isMerkOfBron("milieu centraal"));
  ok("maar een installateur niet", !isMerkOfBron("Van Oers Installaties"));
});

group("gelijke scores worden niet als rangorde gepresenteerd", () => {
  // Zeven bedrijven op exact 76, zoals bij de eerste echte markt.
  const zeven = grootsteGelijkspel([76, 76, 76, 76, 76, 76, 76, 69, 65]);
  eq2("zeven delen dezelfde score", zeven.aantal, 7);
  eq2("en dat is 76", zeven.score, 76);

  const verschillend = grootsteGelijkspel([93, 90, 86, 82]);
  eq2("bij verschillende scores is er geen gelijkspel", verschillend.aantal, 0);

  // ⚠️ Het scherm geeft alleen de BOVENSTE tien mee. Onderaan een lijst staan
  // altijd groepen met hetzelfde lage cijfer (26 bedrijven zonder website op 29,
  // om precies te zijn), en daar hoeft niemand voor gewaarschuwd te worden.
  const alleenTop = grootsteGelijkspel([93, 93, 90, 86, 82, 77, 63, 61, 55, 46]);
  eq2("bovenaan delen er twee dezelfde score", alleenTop.aantal, 2);
  eq2("en dat is 93", alleenTop.score, 93);

  // De volgorde binnen dezelfde score is vast: bewijs, dan commercieel, dan naam.
  const a = { score: 76, breakdown: { bewijssterkte: 20, commercieel: 16 }, naam: "Bakker" };
  const b = { score: 76, breakdown: { bewijssterkte: 12, commercieel: 20 }, naam: "Alders" };
  ok("meer bewijs wint van meer commercieel", vergelijkKansen(a, b) < 0);

  const c = { score: 76, breakdown: { bewijssterkte: 20, commercieel: 16 }, naam: "Alders" };
  ok("en bij gelijke opbouw beslist de naam", vergelijkKansen(a, c) > 0);
  ok("een hogere score wint altijd", vergelijkKansen({ ...a, score: 80 }, b) < 0);
});

async function paginatieControles() {
  await groupAsync("alle rijen ophalen, en niet de eerste duizend", async () => {
  // ⚠️ 1 september 2026: 1720 vermeldingen, een select die er duizend gaf, en
  // een bedrijf dat wél genoemd was maar overal op "0 van de 40" stond. Deze
  // test bouwt precies die situatie na, met een bron die net als PostgREST
  // maximaal een pagina per keer teruggeeft.
  const bron = Array.from({ length: 1720 }, (_, i) => ({ i }));
  const paginas: number[] = [];
  const haal = async (van: number, tot: number) => {
    paginas.push(van);
    return { data: bron.slice(van, tot + 1), error: null };
  };

  const alles = await alleRijen<{ i: number }>(haal);
  eq2("alle 1720 rijen komen mee", alles.length, 1720);
  ok("de laatste rij hoort erbij", alles[alles.length - 1]?.i === 1719);
  eq2("dat kostte twee pagina's", paginas.length, 2);

  // Precies één volle pagina: dan is er nog een tweede nodig om te weten dat het
  // op is. Anders stopt hij te vroeg zodra een tabel toevallig op duizend staat.
  const preciesVol = Array.from({ length: 20 }, (_, i) => ({ i }));
  let rondes = 0;
  const alles2 = await alleRijen<{ i: number }>(
    async (van, tot) => {
      rondes++;
      return { data: preciesVol.slice(van, tot + 1), error: null };
    },
    20,
  );
  eq2("twintig rijen bij een pagina van twintig", alles2.length, 20);
  eq2("en er wordt nog één keer gekeken of er meer is", rondes, 2);

  // Een fout wordt gegooid en niet ingeslikt. Een halve lijst wordt een cijfer
  // waar niemand meer aan twijfelt; een mislukte taak probeert het opnieuw.
  let gegooid = false;
  try {
    await alleRijen<{ i: number }>(async () => ({ data: null, error: { message: "stuk" } }));
  } catch {
    gegooid = true;
  }
  ok("een fout halverwege stopt de optelling", gegooid);
  });
}

group("een uitvraag zegt welke verwijzing hij bedoelt", () => {
  // ⚠️ `sales_opportunities` wijst twee keer naar `sales_companies` (het bedrijf
  // en de concurrent). Wie dat niet uitschrijft, krijgt PGRST201 terug en niets
  // anders. Op 1 september 2026 stond het Opportunities-scherm daardoor een dag
  // leeg terwijl er 43 kansen in de database stonden, gaf de knop "Kans
  // oppakken" een 404, en mislukten alle zestien schrijftaken definitief.
  const bestanden = [
    "app/(app)/sales/opportunities/page.tsx",
    "app/api/sales/opportunities/[id]/assign/route.ts",
    "lib/pipeline/sales-explain.ts",
  ];
  for (const pad of bestanden) {
    const bron = leesBestand(pad);
    ok(`${pad} is te lezen`, bron.length > 0);
    ok(
      `${pad} noemt de verwijzing bij naam`,
      bron.includes("KANS_BEDRIJF"),
      "gebruik KANS_BEDRIJF uit lib/sales/relaties.ts",
    );
    ok(
      `${pad} vraagt sales_companies niet zonder verwijzing op`,
      !/[^!]sales_companies\(/.test(bron.replace(/from\("sales_companies"\)/g, "")),
      "een kale sales_companies(...) op sales_opportunities geeft PGRST201",
    );
  }

  // En de fout wordt uitgelezen. Zonder deze regel werd elke storing gemeld als
  // "deze kans bestaat niet", en dat is de melding die het zoeken een dag koste.
  for (const pad of bestanden) {
    const bron = leesBestand(pad);
    ok(`${pad} leest de foutmelding uit`, /error/.test(bron));
  }
});

group("de optelling van een meting pagineert", () => {
  // Dezelfde grens, twee plekken. Beide lezen `sales_mentions`, en beide zouden
  // stil te laag tellen zodra een markt over de duizend vermeldingen gaat.
  for (const pad of ["lib/pipeline/sales-aggregate.ts", "lib/pipeline/sales-detect.ts"]) {
    const bron = leesBestand(pad);
    ok(`${pad} is te lezen`, bron.length > 0);
    ok(`${pad} haalt de vermeldingen met alleRijen op`, bron.includes("alleRijen"));
    ok(
      `${pad} leest sales_mentions niet zonder bereik`,
      !/from\("sales_mentions"\)[\s\S]{0,400}?;/.test(bron.replace(/\.range\([^)]*\)/g, ".range()")) ||
        bron.includes(".range("),
      "een select zonder .range() stopt na duizend rijen",
    );
  }
});

group("een genoemde naam koppelen aan een bedrijf uit de markt", () => {
  const bedrijven = [
    { id: "a", name: "Van X Makelaars", nameVariants: ["Van X"], domain: "vanx.nl" },
    { id: "b", name: "Bakker Wonen", nameVariants: [], domain: "bakkerwonen.nl" },
    { id: "c", name: "De Hypotheker Eindhoven", nameVariants: [], domain: null },
  ];

  // Het domein wint, want twee bedrijven met hetzelfde webadres bestaan niet.
  const opDomein = koppelNaam({ naam: "Iets heel anders", domein: "https://www.vanx.nl/team" }, bedrijven);
  eq("het domein wint van de naam", `${opDomein.companyId}:${opDomein.grond}`, "a:domein");

  const opNaam = koppelNaam({ naam: "Van X Makelaars B.V." }, bedrijven);
  eq("de rechtsvorm doet er niet toe", `${opNaam.companyId}:${opNaam.grond}`, "a:naam");

  const opVariant = koppelNaam({ naam: "Van X" }, bedrijven);
  eq("een schrijfwijze telt ook", `${opVariant.companyId}:${opVariant.grond}`, "a:variant");

  // ⚠️ Conservatief, net als bij de merken: "Bakker Wonen" en "Bakkers Wonen"
  // zijn twee bedrijven. Twee bedrijven samenvoegen vervalst de data stil, en
  // dan krijgt de buurman de vermelding.
  ok("bijna dezelfde naam is een ander bedrijf", koppelNaam({ naam: "Bakkers Wonen" }, bedrijven).companyId === null);
  ok("een bedrijf zonder website is gewoon te vinden op naam", koppelNaam({ naam: "De Hypotheker Eindhoven" }, bedrijven).companyId === "c");

  eq("een webadres wordt teruggebracht tot zijn kern", domeinSleutel("https://WWW.VanX.nl/over-ons"), "vanx");
});

group("wat de AI noemt en wij niet kennen, is informatie", () => {
  const bedrijven = [
    { id: "a", name: "Van X Makelaars", nameVariants: [], domain: "vanx.nl" },
    { id: "b", name: "Bakker Wonen", nameVariants: [], domain: null },
  ];

  const uit = koppelAntwoord(
    [
      { naam: "Van X Makelaars" },
      { naam: "Bakker Wonen" },
      { naam: "Jansen Makelaardij" },
      // Dezelfde naam twee keer in één antwoord: één antwoord waarin het bedrijf
      // voorkomt, en niet twee. Anders telt een engine die zichzelf herhaalt als
      // betere zichtbaarheid.
      { naam: "Van X Makelaars" },
      { naam: "jansen makelaardij" },
    ],
    bedrijven,
  );

  eq2("twee bedrijven gekoppeld", uit.gekoppeld.length, 2);
  eq2("en één naam die we niet kennen", uit.onbekend.length, 1);
  eq("die naam wordt bewaard", uit.onbekend[0], "Jansen Makelaardij");
});

group("de rekensom over de vermeldingen", () => {
  // Een vaste meetset, met de hand na te rekenen. Twee bedrijven, vier vragen,
  // twee engines. Bedrijf A wordt in drie van de vier OpenAI-antwoorden genoemd
  // en in één van de vier Gemini-antwoorden; bedrijf B nergens.
  const vragen = [
    { id: "v1", intentLabel: "verkoop", stage: "selecteren" as const, weight: 1 },
    { id: "v2", intentLabel: "verkoop", stage: "orientatie" as const, weight: 0.25 },
    { id: "v3", intentLabel: "aankoop", stage: "selecteren" as const, weight: 1 },
    { id: "v4", intentLabel: "aankoop", stage: "orientatie" as const, weight: 0.25 },
  ];
  const antwoorden = [
    { id: "a1", questionId: "v1", engine: "openai", sources: ["funda.nl"] },
    { id: "a2", questionId: "v2", engine: "openai", sources: ["funda.nl", "nvm.nl"] },
    { id: "a3", questionId: "v3", engine: "openai", sources: [] },
    { id: "a4", questionId: "v4", engine: "openai", sources: [] },
    { id: "b1", questionId: "v1", engine: "gemini", sources: ["funda.nl"] },
    { id: "b2", questionId: "v2", engine: "gemini", sources: [] },
    { id: "b3", questionId: "v3", engine: "gemini", sources: [] },
    { id: "b4", questionId: "v4", engine: "gemini", sources: [] },
  ];
  const vermeldingen = [
    { answerId: "a1", companyId: "A", mentioned: true, position: 1, sources: ["funda.nl"] },
    { answerId: "a2", companyId: "A", mentioned: true, position: 3, sources: ["funda.nl"] },
    { answerId: "a3", companyId: "A", mentioned: true, position: 2, sources: [] },
    { answerId: "a4", companyId: "A", mentioned: false },
    { answerId: "b1", companyId: "A", mentioned: true, position: 1, sources: ["funda.nl"] },
    { answerId: "b2", companyId: "A", mentioned: false },
    { answerId: "b3", companyId: "A", mentioned: false },
    { answerId: "b4", companyId: "A", mentioned: false },
  ];

  const scores = rekenScores(["A", "B"], vragen, antwoorden, vermeldingen);

  const alle = scores.find((s) => s.companyId === "A" && s.engine === ENGINE_ALLE)!;
  eq2("acht antwoorden in de noemer", alle.questionsTotal, 8);
  eq2("vier vermeldingen", alle.mentions, 4);
  eq2("het ongewogen aandeel is de helft", alle.share, 0.5);

  // Gewogen: A wordt genoemd bij v1 (1,0), v2 (0,25), v3 (1,0) op OpenAI en v1
  // (1,0) op Gemini. Totaal gewicht over acht antwoorden is 2 × 2,5 = 5;
  // genoemd gewicht is 1 + 0,25 + 1 + 1 = 3,25. Dat is 0,65.
  eq2("en het gewogen aandeel ligt hoger, want de zware vragen zitten erbij", alle.weightedShare, 0.65);

  const openai = scores.find((s) => s.companyId === "A" && s.engine === "openai")!;
  const gemini = scores.find((s) => s.companyId === "A" && s.engine === "gemini")!;
  eq2("op OpenAI drie van de vier", openai.share, 0.75);
  eq2("op Gemini één van de vier", gemini.share, 0.25);

  // ⚠️ Dit is opportunitytype 4 (engine gap) in de kiem: het verschil tussen twee
  // engines is zelf een verkoopargument, en dat kan alleen als de scores per
  // engine apart bewaard worden.
  ok("het verschil tussen engines is zichtbaar", openai.share - gemini.share === 0.5);

  // ⚠️ HET BEDRIJF DAT NERGENS GENOEMD WORDT MOET IN DE UITKOMST STAAN. Dat is
  // precies de prospect waar deze module naar zoekt (opportunitytype 1). Zou de
  // functie over de vermeldingen lopen in plaats van over de bedrijven, dan
  // verdwijnt hij, en is hij onvindbaar in plaats van onzichtbaar.
  const b = scores.find((s) => s.companyId === "B" && s.engine === ENGINE_ALLE)!;
  eq2("het onzichtbare bedrijf staat er wel degelijk in", b.questionsTotal, 8);
  eq2("met nul vermeldingen", b.mentions, 0);
  ok("en met een marge, want nul uit acht is nog geen zekerheid", b.stderr > 0);

  // Per intentie: A scoort vol bij aankoop op de zware vraag en mist de lichte.
  eq2("per intentie wordt apart geteld", alle.perIntent.verkoop?.vragen ?? 0, 4);
  eq2("en dat is de laag waar de intent gap op draait", alle.perIntent.aankoop?.vermeldingen ?? -1, 1);
  eq2("de fases ook", alle.perStage.selecteren?.vragen ?? 0, 4);

  eq2("de gemiddelde positie telt alleen echte vermeldingen", openai.avgPosition, 2);
  ok("een bedrijf zonder vermelding heeft geen positie", b.avgPosition === null);

  // De bronnen die dit bedrijf dragen, voor opportunitytype 6.
  eq("de vaakst genoemde bron staat vooraan", alle.sources[0]?.domain ?? "", "funda.nl");
});

group("een vraag die niet gemeten is, telt niet als niet genoemd", () => {
  // ⚠️ DE FOUT DIE HIER HET VAAKST GEMAAKT WORDT. Viel de meting van vier van de
  // veertig vragen om, dan is de noemer zesendertig. Zou hij veertig blijven,
  // dan zakt elk bedrijf in de markt even hard en lijkt de markt onzichtbaarder
  // dan hij is, zonder dat iemand het kan zien.
  const vragen = [
    { id: "v1", intentLabel: "verkoop", stage: "selecteren" as const, weight: 1 },
    { id: "v2", intentLabel: "verkoop", stage: "selecteren" as const, weight: 1 },
  ];
  // Alleen v1 is beantwoord; de meting van v2 is omgevallen.
  const antwoorden = [{ id: "a1", questionId: "v1", engine: "openai", sources: [] }];
  const vermeldingen = [{ answerId: "a1", companyId: "A", mentioned: true, position: 1 }];

  const scores = rekenScores(["A"], vragen, antwoorden, vermeldingen);
  const alle = scores.find((s) => s.engine === ENGINE_ALLE)!;
  eq2("de noemer telt antwoorden en geen vragen", alle.questionsTotal, 1);
  eq2("dus honderd procent en niet vijftig", alle.share, 1);
});

group("het bronnenlandschap van de markt", () => {
  // Plan hoofdstuk 12, type 6: welke domeinen haalt de AI hier structureel aan?
  // Zonder dit marktbeeld is "jouw bedrijf staat in geen van de bronnen" een
  // bewering zonder maatstaf.
  const bronnen = marktBronnen([
    { id: "a1", questionId: "v1", engine: "openai", sources: ["funda.nl", "funda.nl", "nvm.nl"] },
    { id: "a2", questionId: "v2", engine: "openai", sources: ["funda.nl"] },
    { id: "a3", questionId: "v3", engine: "gemini", sources: ["nvm.nl"] },
  ]);
  eq("de vaakst aangehaalde bron staat vooraan", bronnen[0]?.domain ?? "", "funda.nl");
  // ⚠️ Per antwoord telt een domein één keer. Een engine die dezelfde bron drie
  // keer aanhaalt in één antwoord maakt die bron niet drie keer belangrijker.
  eq2("dubbel aanhalen in één antwoord telt één keer", bronnen[0]?.count ?? 0, 2);
});

group("de kostenraming is het enige waarop de goedkeuring rust", () => {
  // Plan 21.1: de kostenknop is het aantal VRAGEN, niet het aantal bedrijven.
  const veertigEen = raamMeetronde(40, 1);
  const veertigTwee = raamMeetronde(40, 2);
  ok("twee engines kost twee keer zoveel", Math.abs(veertigTwee - veertigEen * 2) < 0.01);
  ok("en meer vragen kost meer", raamMeetronde(60, 2) > veertigTwee);

  // ⚠️ De hele ronde wordt VOORAF beoordeeld en niet per vraag. Per vraag
  // beoordelen levert een ronde op die halverwege stopt: dertig van de veertig
  // vragen gemeten, een score op een willekeurige deelverzameling, en een
  // rekening die toch betaald is.
  const past = beoordeelMeetronde(0, 40, 2);
  ok("een lege markt kan een volle ronde aan", past.ok);
  eq2("en er hoeft niets weg", past.pastVragen, 40);

  const vol = beoordeelMeetronde(marktBudgetUsd() - 0.5, 40, 2);
  ok("een bijna volle markt kan dat niet", !vol.ok);
  ok("er passen er nog een paar in", vol.pastVragen > 0 && vol.pastVragen < 40, String(vol.pastVragen));
  // K2: de melding zegt wat er niet gebeurt, hoeveel er op staat en wat je eraan
  // kunt doen.
  ok("en de melding zegt wat je kunt doen", (vol.melding ?? "").includes("Haal vragen uit de lijst"));
});

group("de vragen aan het model laten niets aan het model over", () => {
  const markt = { label: "Makelaars Eindhoven", industry: "makelaar", location: "Eindhoven", radius_km: 15 };
  const intenties: Intentie[] = [
    { label: "verkoop", naam: "Verkoop", uitleg: "", waarde: "hoog", frequentie: "hoog" },
    { label: "aankoop", naam: "Aankoop", uitleg: "", waarde: "hoog", frequentie: "hoog" },
  ];

  const intentieVraag = bouwIntentieVraag(markt, ["woning verkopen", "taxatie"]);
  ok("de markt staat erin", intentieVraag.includes("Makelaars Eindhoven"));
  ok("de gecrawlde diensten ook", intentieVraag.includes("woning verkopen"));
  // Zonder websitegegevens moet dat gezegd worden in plaats van stil weggelaten.
  ok(
    "en zonder websitegegevens zegt hij dat",
    bouwIntentieVraag(markt, []).includes("geen websitegegevens"),
  );

  const vragenVraag = bouwVragenVraag(markt, intenties, verdeelVragen(intenties, 8));
  ok("het model krijgt een boodschappenlijst en geen rekensom", vragenVraag.includes("label: verkoop"));
  ok("met per fase een aantal", /\d+ in de fase selecteren/.test(vragenVraag));
  // ⚠️ Een vraag met een bedrijfsnaam erin meet of de AI die naam herhaalt, en
  // niet of het bedrijf gevonden wordt.
  ok("en de opdracht om geen bedrijfsnaam te noemen", vragenVraag.includes("Noem nooit de naam van een bedrijf"));

  const beoordeel = bouwBeoordeelVraag("Welke makelaar kies ik?", "Van X en Bakker Wonen zijn goed.");
  ok("de beoordeling krijgt de vraag mee", beoordeel.includes("Welke makelaar kies ik?"));
  ok("en het antwoord", beoordeel.includes("Van X en Bakker Wonen"));
  // ⚠️ Pure ontdekking: de namen van de bedrijven uit de markt gaan NIET mee.
  // Een meegegeven lijst richt het model op die namen in plaats van op wat er
  // staat, en elke meegegeven naam komt in élke meting terug.
  ok("het model mag niets toevoegen wat er niet staat", beoordeel.includes("Voeg nooit een bedrijf toe"));
  ok("de meting stuurt niet op meer bedrijven", !SIMULATIE_SYSTEM.includes("zoveel mogelijk"));
});

group("het aantal vragen is de kostenknop en staat begrensd", () => {
  // Plan 21.1. Dertig bedrijven meten kost precies evenveel als drie, want er
  // wordt per vraag betaald en de bedrijven komen uit hetzelfde antwoord.
  ok("de standaard is veertig vragen", VRAGEN_STANDAARD === 40);
  ok(
    "en één ronde blijft ruim onder het plafond",
    raamMeetronde(VRAGEN_STANDAARD, 2) < marktBudgetUsd(),
    `${raamMeetronde(VRAGEN_STANDAARD, 2)} tegen ${marktBudgetUsd()}`,
  );
  // De meetstap is de grootste post: meer dan alle andere stappen samen. Zou de
  // ontdekking duurder zijn, dan knelt het plafond op de verkeerde stap en gaan
  // mensen vragen wegsnijden om een markt betaalbaar te houden. Precies het
  // omgekeerde van wat plan 21.1 wil.
  const restVanDeRonde =
    SALES_STAP_KOSTEN.discover +
    SALES_STAP_KOSTEN.intents +
    SALES_STAP_KOSTEN.questions +
    SALES_STAP_KOSTEN.verify +
    SALES_STAP_KOSTEN.suppress +
    SALES_STAP_KOSTEN.enrich +
    SALES_STAP_KOSTEN.aggregate;
  ok(
    "meten kost meer dan alle andere stappen samen",
    SALES_STAP_KOSTEN.measure * VRAGEN_STANDAARD * 2 > restVanDeRonde,
    `${(SALES_STAP_KOSTEN.measure * VRAGEN_STANDAARD * 2).toFixed(2)} tegen ${restVanDeRonde.toFixed(2)}`,
  );
  // ⚠️ En wat meeschaalt met het aantal BEDRIJVEN blijft gratis (plan 21.1).
  // Zou de crawl per bedrijf geld kosten, dan wordt een volledige markt duur en
  // gaan mensen bedrijven wegsnijden: precies de onzichtbare bedrijven die deze
  // module zoekt.
  ok("en wat per bedrijf schaalt kost niets", SALES_STAP_KOSTEN.enrich === 0);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe Sales-module: de kansen (sprint 4)");

/** Een meting opbouwen zonder dertig regels boilerplate per test. */
function meting(
  id: string,
  naam: string,
  opties: Partial<{
    aandeel: number;
    vragen: number;
    stderr: number;
    perIntent: Record<string, { vragen: number; vermeldingen: number; share: number }>;
    perEngine: Record<string, { aandeel: number; stderr: number; vragen: number }>;
    secties: string[];
    plaats: string | null;
    domein: string | null;
    bronnen: { domain: string; count: number }[];
    fragmenten: { answerId: string; questionId: string; engine: string; snippet: string }[];
    vorige: { aandeel: number; stderr: number; perEngine?: Record<string, { aandeel: number; stderr: number }> } | null;
  }> = {},
): BedrijfMeting {
  const vragen = opties.vragen ?? 40;
  const aandeel = opties.aandeel ?? 0.3;
  const score: MeetScore = {
    questionsTotal: vragen,
    mentions: Math.round(aandeel * vragen),
    share: aandeel,
    weightedShare: aandeel,
    stderr: opties.stderr ?? 0.05,
    perIntent: opties.perIntent ?? {},
  };
  const perEngine: Record<string, MeetScore> = {};
  for (const [engine, e] of Object.entries(opties.perEngine ?? {})) {
    perEngine[engine] = {
      questionsTotal: e.vragen,
      mentions: Math.round(e.aandeel * e.vragen),
      share: e.aandeel,
      weightedShare: e.aandeel,
      stderr: e.stderr,
      perIntent: {},
    };
  }
  return {
    companyId: id,
    naam,
    domein: opties.domein === undefined ? `${id}.nl` : opties.domein,
    plaats: opties.plaats === undefined ? "Eindhoven" : opties.plaats,
    secties: opties.secties ?? [],
    alle: score,
    perEngine,
    bronnen: opties.bronnen ?? [],
    fragmenten:
      opties.fragmenten ??
      [{ answerId: `a-${id}`, questionId: `v-${id}`, engine: "openai", snippet: `${naam} is goed.` }],
    vorige: opties.vorige
      ? {
          weightedShare: opties.vorige.aandeel,
          stderr: opties.vorige.stderr,
          perEngine: Object.fromEntries(
            Object.entries(opties.vorige.perEngine ?? {}).map(([k, v]) => [
              k,
              { weightedShare: v.aandeel, stderr: v.stderr },
            ]),
          ),
        }
      : null,
  };
}

const markt: MarktContext = {
  bronnen: [
    { domain: "funda.nl", count: 30 },
    { domain: "nvm.nl", count: 20 },
  ],
  gemiddeldePerIntent: { verkoop: 0.3, aankoop: 0.3 },
  engines: ["openai", "gemini"],
  plaats: "Eindhoven",
};

group("onzichtbaar is een toestand en geen oordeel over de prospect", () => {
  const stil = meting("stil", "Stil Makelaars", { aandeel: 0.02, stderr: 0.02 });
  const kansen = detecteerKansen(stil, markt, [stil]);
  ok("onder de grens is onzichtbaar", kansen.some((k) => k.type === "onzichtbaar"));

  const zichtbaar = meting("zicht", "Zichtbaar BV", { aandeel: 0.3 });
  ok(
    "erboven niet",
    !detecteerKansen(zichtbaar, markt, [zichtbaar]).some((k) => k.type === "onzichtbaar"),
  );

  // ⚠️ De valkuil uit plan type 1 staat NIET in de detectie: een eenmanszaak
  // zonder website is onzichtbaar én geen prospect. Dat weegt in de SCORE, niet
  // hier. Zou het hier wegen, dan verdwijnt precies het soort bedrijf dat wel
  // degelijk klant kan worden.
  const zonderSite = meting("geen", "Zonder Site", { aandeel: 0.01, domein: null });
  ok(
    "een bedrijf zonder website wordt gewoon gedetecteerd",
    detecteerKansen(zonderSite, markt, [zonderSite]).some((k) => k.type === "onzichtbaar"),
  );
  ok("de grens staat op vijf procent", ONZICHTBAAR_GRENS === 0.05);
});

group("een concurrent die voorloopt is pas een kans buiten de marge", () => {
  const eigen = meting("eigen", "Van X", { aandeel: 0.1, stderr: 0.03 });
  const groot = meting("groot", "Y Makelaars", { aandeel: 0.6, stderr: 0.04 });

  const kansen = detecteerKansen(eigen, markt, [eigen, groot]);
  const gap = kansen.find((k) => k.type === "concurrent_gap");
  ok("een concurrent die zes keer zo vaak genoemd wordt is een kans", Boolean(gap));
  eq("en de naam hangt eraan", gap?.rivalCompanyId ?? "", "groot");

  // ⚠️ Het bewijs is de vraag waarin de ander wél en dit bedrijf niet genoemd
  // wordt. Dat is wat een verkoper laat zien, en niet een percentage.
  ok("met het bewijs erbij", (gap?.antwoorden.length ?? 0) > 0);

  // Binnen de marge is het geen verschil. Dit is de fout die een verkoper voor
  // schut zet: hij belt over een verschil dat statistisch niet bestaat.
  const bijnaGelijk = meting("bijna", "Bijna Gelijk", { aandeel: 0.22, stderr: 0.2 });
  const eigenBreed = meting("eigen2", "Van X", { aandeel: 0.1, stderr: 0.2 });
  ok(
    "een verschil binnen de marge telt niet",
    !detecteerKansen(eigenBreed, markt, [eigenBreed, bijnaGelijk]).some(
      (k) => k.type === "concurrent_gap",
    ),
  );
  ok("en dat oordeel komt uit lib/stats", !buitenDeMarge({ score: 0.1, stderr: 0.2 }, { score: 0.22, stderr: 0.2 }));
});

group("een intent gap bestaat alleen als de site die dienst beschrijft", () => {
  // Het bedrijf scoort 30% in het algemeen, maar 0 van de 8 bij aankoop.
  const perIntent = {
    verkoop: { vragen: 8, vermeldingen: 5, share: 0.63 },
    aankoop: { vragen: 8, vermeldingen: 0, share: 0 },
  };

  const metPagina = meting("met", "Met Pagina", {
    aandeel: 0.3,
    perIntent,
    secties: ["aankoopbegeleiding", "verkoop", "contact"],
  });
  const metIntent: MarktContext = {
    ...markt,
    gemiddeldePerIntent: { verkoop: 0.4, aankoop: 0.35 },
  };
  const kansen = detecteerKansen(metPagina, metIntent, [metPagina]);
  const gap = kansen.find((k) => k.type === "intent_gap");
  ok("het gat wordt gezien", Boolean(gap));
  ok("en de intentie staat erbij", (gap?.intentLabels ?? []).includes("aankoop"));

  // ⚠️ Zonder die pagina is het geen kans maar een verwijt. Het hele punt van
  // dit type is dat het bedrijf de dienst aantoonbaar wél levert (plan type 3).
  const zonderPagina = meting("zonder", "Zonder Pagina", {
    aandeel: 0.3,
    perIntent,
    secties: ["verkoop", "contact"],
  });
  ok(
    "zonder die pagina is er geen intent gap",
    !detecteerKansen(zonderPagina, metIntent, [zonderPagina]).some((k) => k.type === "intent_gap"),
  );

  ok("de woordvergelijking is streng aan de onderkant", !siteBeschrijftDienst(zonderPagina, "aankoop"));
  ok("maar herkent een dienst die er staat", siteBeschrijftDienst(metPagina, "aankoop"));

  // Te weinig vragen is geen gat maar toeval: bij drie vragen is nul van de drie
  // niets.
  const dun = meting("dun", "Dun Gemeten", {
    aandeel: 0.3,
    perIntent: { aankoop: { vragen: 3, vermeldingen: 0, share: 0 } },
    secties: ["aankoopbegeleiding"],
  });
  ok(
    "drie vragen is te dun voor een conclusie",
    !detecteerKansen(dun, metIntent, [dun]).some((k) => k.type === "intent_gap"),
  );
});

group("een engine gap vraagt twee engines die echt gemeten hebben", () => {
  const scheef = meting("scheef", "Scheef", {
    aandeel: 0.35,
    perEngine: {
      openai: { aandeel: 0.6, stderr: 0.05, vragen: 40 },
      gemini: { aandeel: 0.1, stderr: 0.05, vragen: 40 },
    },
  });
  ok(
    "een verschil van vijftig punten is een kans",
    detecteerKansen(scheef, markt, [scheef]).some((k) => k.type === "engine_gap"),
  );

  // ⚠️ Een engine die wegviel levert een verschil van honderd punten op, en dat
  // is geen engine gap maar een mislukte meting.
  const eenEngine = meting("een", "Eén Engine", {
    aandeel: 0.35,
    perEngine: { openai: { aandeel: 0.6, stderr: 0.05, vragen: 40 } },
  });
  ok(
    "één engine levert nooit een engine gap op",
    !detecteerKansen(eenEngine, markt, [eenEngine]).some((k) => k.type === "engine_gap"),
  );
});

group("een verkeerde plaats is het enige information gap dat te bewijzen is", () => {
  const elders = meting("elders", "Elders BV", {
    aandeel: 0.3,
    plaats: "Helmond",
    fragmenten: [
      {
        answerId: "a1",
        questionId: "v1",
        engine: "openai",
        snippet: "Elders BV is een makelaar in Eindhoven.",
      },
    ],
  });
  ok(
    "het antwoord zet het bedrijf in de verkeerde plaats",
    detecteerKansen(elders, markt, [elders]).some((k) => k.type === "information_gap"),
  );

  // Zonder eigen plaats is er niets om tegen af te zetten, en dan is het een
  // vermoeden. Conventie 3.
  const onbekend = meting("onb", "Onbekend", { aandeel: 0.3, plaats: null });
  ok(
    "zonder eigen plaats geen oordeel",
    !detecteerKansen(onbekend, markt, [onbekend]).some((k) => k.type === "information_gap"),
  );
});

group("een source gap verlegt het gesprek naar het speelveld", () => {
  const buiten = meting("buiten", "Buiten De Bronnen", { aandeel: 0.2, bronnen: [] });
  const a = meting("a", "A", { aandeel: 0.3, bronnen: [{ domain: "funda.nl", count: 5 }] });
  const b = meting("b", "B", { aandeel: 0.3, bronnen: [{ domain: "nvm.nl", count: 4 }] });

  ok(
    "wie in geen enkele marktbron staat terwijl twee concurrenten er wel in staan",
    detecteerKansen(buiten, markt, [buiten, a, b]).some((k) => k.type === "source_gap"),
  );

  // Bij één concurrent is het een toevalligheid van die ene en geen speelveld.
  ok(
    "bij één concurrent is er geen speelveld",
    !detecteerKansen(buiten, markt, [buiten, a]).some((k) => k.type === "source_gap"),
  );
});

group("verlies is de sterkste, en heeft twee vangnetten", () => {
  const gezakt = meting("gezakt", "Gezakt", {
    aandeel: 0.1,
    stderr: 0.03,
    perEngine: {
      openai: { aandeel: 0.1, stderr: 0.03, vragen: 40 },
      gemini: { aandeel: 0.1, stderr: 0.03, vragen: 40 },
    },
    vorige: {
      aandeel: 0.5,
      stderr: 0.03,
      perEngine: { openai: { aandeel: 0.5, stderr: 0.03 }, gemini: { aandeel: 0.5, stderr: 0.03 } },
    },
  });
  ok("een daling buiten de marge is verlies", Boolean(detecteerVerlies(gezakt, markt)));

  // ⚠️ Vangnet 1: een daling binnen de marge is geen daling.
  const ruis = meting("ruis", "Ruis", {
    aandeel: 0.28,
    stderr: 0.2,
    vorige: { aandeel: 0.32, stderr: 0.2 },
  });
  ok("binnen de marge is het geen daling", detecteerVerlies(ruis, markt) === null);

  // ⚠️ Vangnet 2: een daling bij één engine terwijl de andere gelijk bleef, is
  // een engine gap en geen verlies. De engine veranderde, het bedrijf niet.
  const eenEngineGezakt = meting("een", "Eén Engine Gezakt", {
    aandeel: 0.3,
    stderr: 0.03,
    perEngine: {
      openai: { aandeel: 0.1, stderr: 0.03, vragen: 40 },
      gemini: { aandeel: 0.5, stderr: 0.03, vragen: 40 },
    },
    vorige: {
      aandeel: 0.6,
      stderr: 0.03,
      perEngine: { openai: { aandeel: 0.7, stderr: 0.03 }, gemini: { aandeel: 0.5, stderr: 0.03 } },
    },
  });
  ok("één engine die zakt is geen verlies", detecteerVerlies(eenEngineGezakt, markt) === null);

  // Zonder vorige ronde bestaat het type niet. Dat is de reden om markten
  // structureel te hermeten in plaats van eenmalig te meten.
  const eersteRonde = meting("eerst", "Eerste Ronde", { aandeel: 0.1 });
  ok("zonder vorige ronde geen verlies", detecteerVerlies(eersteRonde, markt) === null);
});

group("het primaire type staat vast en is niet te beïnvloeden", () => {
  // Plan 12.1: verlies, information gap, intent gap, concurrent gap, source gap,
  // engine gap, onzichtbaar, sterk met zwakke plek. In die volgorde.
  const alle: Kans[] = KANS_TYPES.map((type) => ({
    type,
    vragen: [],
    antwoorden: [],
    cijfers: {},
  }));
  eq("verlies wint van alles", kiesPrimair(alle)?.type ?? "", "verlies");
  eq(
    "en information gap van de rest",
    kiesPrimair(alle.filter((k) => k.type !== "verlies"))?.type ?? "",
    "information_gap",
  );
  eq(
    "onzichtbaar verliest van een intent gap",
    kiesPrimair(alle.filter((k) => k.type === "onzichtbaar" || k.type === "intent_gap"))?.type ?? "",
    "intent_gap",
  );
  ok("zonder kansen is er geen primair type", kiesPrimair([]) === null);
  eq2("alle acht types staan in de volgorde", PRIMAIRE_VOLGORDE.length, KANS_TYPES.length);
  ok(
    "en elk type heeft een naam die een verkoper leest",
    KANS_TYPES.every((t) => (KANS_LABEL[t] ?? "").length > 3),
  );
});

group("de score sorteert niet op laagste zichtbaarheid", () => {
  // ⚠️ DE TOETS DIE HOOFDSTUK 2 AFDWINGT. Het onzichtbare eenmansbedrijf zonder
  // website tegenover de professionele partij die één dienst mist. Zou de score
  // op zichtbaarheid sorteren, dan wint de eerste, en dan is de hele module een
  // lijst met bedrijven die niets kopen.
  const eenmanszaak: Kans = {
    type: "onzichtbaar",
    vragen: [],
    antwoorden: [],
    cijfers: { aandeel: 0, vermeldingen: 0, vragen: 40 },
  };
  const gemist: Kans = {
    type: "intent_gap",
    vragen: ["v1", "v2"],
    antwoorden: ["a1", "a2"],
    intentLabels: ["aankoop"],
    cijfers: { eigen_aandeel: 0.35 },
  };

  const klein = rekenScore({
    bedrijf: meting("klein", "Eenmanszaak", { aandeel: 0, domein: null, secties: [] }),
    kansen: [eenmanszaak],
    primair: eenmanszaak,
    marktGemiddelde: 0.3,
    heeftContactgegevens: false,
    sizeSignal: "zzp",
    doNotContact: false,
    eerderAfgewezen: false,
  });

  const groot = rekenScore({
    bedrijf: meting("groot", "Professioneel", {
      aandeel: 0.35,
      secties: ["aankoop", "verkoop", "taxatie", "team", "contact", "nieuws", "over", "diensten"],
    }),
    kansen: [gemist],
    primair: gemist,
    marktGemiddelde: 0.5,
    heeftContactgegevens: true,
    sizeSignal: "middel",
    doNotContact: false,
    eerderAfgewezen: false,
  });

  ok(
    "de professionele partij die één dienst mist wint van de onzichtbare eenmanszaak",
    groot.score > klein.score,
    `${groot.score} tegen ${klein.score}`,
  );

  // De opbouw staat er altijd bij, want zonder de componenten is de score niet
  // uit te leggen en bestaat de leerlus uit hoofdstuk 19 later niet.
  ok("elke component staat apart", Object.keys(groot.breakdown).length >= 7);
  ok("de aftrek is zichtbaar en niet weggemoffeld", klein.breakdown.aftrek < 0);
});

group("een afgemeld bedrijf scoort nul, hoe groot de kans ook is", () => {
  // Plan 13.1: `do_not_contact` en een afwijzing binnen twaalf maanden zetten de
  // score op NUL in plaats van hem te verlagen. Een score van 30 op een bedrijf
  // dat zich heeft afgemeld staat nog steeds in de lijst en wordt toch gebeld.
  const kans: Kans = {
    type: "verlies",
    vragen: ["v1"],
    antwoorden: ["a1"],
    cijfers: { nu: 0.1, eerder: 0.6, daling: 0.5 },
  };
  const uit = rekenScore({
    bedrijf: meting("weg", "Afgemeld", { aandeel: 0.1 }),
    kansen: [kans],
    primair: kans,
    marktGemiddelde: 0.5,
    heeftContactgegevens: true,
    sizeSignal: "groot",
    doNotContact: true,
    eerderAfgewezen: false,
  });
  eq2("de score is nul", uit.score, 0);
  ok("en de reden staat in de opbouw", uit.breakdown.reden_afgemeld === 1);
});

group("urgentie verhoogt de score, en scherpte weegt mee", () => {
  const basis = {
    bedrijf: meting("b", "Bedrijf", { aandeel: 0.2, secties: ["a", "b", "c", "d"] }),
    marktGemiddelde: 0.4,
    heeftContactgegevens: true,
    sizeSignal: "middel",
    doNotContact: false,
    eerderAfgewezen: false,
  };
  const zonderVerlies: Kans = {
    type: "onzichtbaar",
    vragen: [],
    antwoorden: [],
    cijfers: {},
  };
  const metVerlies: Kans = { type: "verlies", vragen: ["v"], antwoorden: ["a"], cijfers: {} };

  const a = rekenScore({ ...basis, kansen: [zonderVerlies], primair: zonderVerlies });
  const b = rekenScore({ ...basis, kansen: [metVerlies], primair: metVerlies });
  ok("een aantoonbare daling telt zwaarder", b.score > a.score, `${b.score} tegen ${a.score}`);
  ok("de bonus is tien punten", BEWEGING_BONUS === 10);

  // Plan 13.1: type 5 en 3 zijn scherper dan type 1, want specifiek en
  // verifieerbaar.
  ok("een information gap is scherper dan onzichtbaar", SCHERPTE.information_gap > SCHERPTE.onzichtbaar);
  ok("een intent gap ook", SCHERPTE.intent_gap > SCHERPTE.onzichtbaar);

  // De gewichten samen zijn honderd, plus de bonus erbovenop.
  const som = Object.values(GEWICHTEN).reduce((s, g) => s + g, 0);
  eq2("de componenten tellen op tot honderd", som, 100);
});

group("een haak met een verzonnen getal wordt verworpen", () => {
  // ⚠️ DIT IS HET VANGNET UIT PLAN HOOFDSTUK 14. Een model dat een zin mooier
  // maakt rondt onderweg een getal af, en dat is precies wat een prospect
  // naleest.
  const kans: Kans = {
    type: "concurrent_gap",
    vragen: ["v1", "v2"],
    antwoorden: ["a1", "a2"],
    rivalCompanyId: "y",
    cijfers: { eigen_aandeel: 0.1, concurrent_aandeel: 0.4, vragen: 40 },
  };

  ok(
    "een zin met de gemeten percentages mag",
    controleerHook("Y wordt bij 40% van de vragen genoemd, jij bij 10%.", kans).ok,
  );
  ok(
    "de verhouding uit die twee mag ook",
    controleerHook("Y wordt 4 keer vaker genoemd dan jij.", kans).ok,
  );
  const fout = controleerHook("Y wordt 7 keer vaker genoemd dan jij.", kans);
  ok("een verzonnen verhouding niet", !fout.ok);
  eq2("en het foute getal wordt benoemd", fout.onbekend[0] ?? 0, 7);
  ok(
    "een zin zonder getallen mag altijd",
    controleerHook("Y wordt vaker genoemd dan jij.", kans).ok,
  );
  ok("de toegestane getallen komen uit de meetdata", toegestaneGetallen(kans).has(40));
});

group("valt er geen zin door de controle, dan wint het sjabloon", () => {
  const kans: Kans = {
    type: "concurrent_gap",
    vragen: ["v1"],
    antwoorden: ["a1"],
    rivalCompanyId: "y",
    cijfers: { eigen_aandeel: 0.1, concurrent_aandeel: 0.4 },
  };

  const goed = kiesHook(
    ["Y wordt bij 40% van de vragen genoemd, Van X bij 10%."],
    kans,
    "Van X",
    "Y Makelaars",
  );
  eq("een kloppende zin komt uit het model", goed.bron, "model");

  const alleFout = kiesHook(
    ["Y wordt 9 keer vaker genoemd.", "Y scoort 88% beter.", "Y wint met 77 punten."],
    kans,
    "Van X",
    "Y Makelaars",
  );
  eq("drie foute zinnen leveren het sjabloon op", alleFout.bron, "sjabloon");
  // ⚠️ En dat sjabloon is zelf gecontroleerd: het bevat uitsluitend waarden uit
  // de meetdata. Een saaie ware zin verslaat een mooie zin met een verzonnen
  // getal, want die tweede kost het hele gesprek.
  ok("en het sjabloon komt door zijn eigen controle", controleerHook(alleFout.tekst, kans).ok);

  // Elk van de acht types heeft een sjabloonzin die de controle haalt.
  for (const type of KANS_TYPES) {
    const k: Kans = {
      type,
      vragen: ["v1"],
      antwoorden: ["a1"],
      cijfers: {
        vermeldingen: 3,
        vragen: 40,
        eigen_aandeel: 0.1,
        concurrent_aandeel: 0.4,
        hoogste_aandeel: 0.6,
        laagste_aandeel: 0.1,
        concurrenten_in_die_bronnen: 3,
        positie: 2,
        nu: 0.2,
        eerder: 0.5,
      },
    };
    const zin = sjabloonHook(k, "Van X", "Y Makelaars");
    ok(`het sjabloon van ${type} klopt met de data`, controleerHook(zin, k).ok, zin);
    ok(`en noemt het bedrijf bij naam`, zin.includes("Van X") || type === "information_gap");
  }
});

group("de opdracht aan het model laat geen ruimte voor eigen cijfers", () => {
  const kans: Kans = {
    type: "concurrent_gap",
    vragen: ["v1"],
    antwoorden: ["a1"],
    cijfers: { eigen_aandeel: 0.1, concurrent_aandeel: 0.4 },
  };
  const vraag = bouwHookVraag(kans, "Van X", "Y Makelaars", "Makelaars Eindhoven");
  ok("de cijfers gaan mee als percentages", vraag.includes("40%"));
  ok("het sjabloon staat erbij als ondergrens", vraag.includes("Dit staat er als je het niet beter kunt"));
  ok("en de opdracht om niets te verzinnen", vraag.includes("Verzin geen enkel getal"));
  ok("één zin, niet vijf", vraag.includes("Eén zin"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe Sales-module: de outreach (sprint 5)");

group("de trechter loopt één kant op, met drie uitgangen", () => {
  // Plan 17.1. De uitgangen zijn overal bereikbaar, want een prospect kan op elk
  // moment nee zeggen; terug kan niet, want dan telt hetzelfde bedrijf drie keer
  // als "gesprek" in de trechter van hoofdstuk 18.
  ok("nieuw gaat naar toegewezen", magOvergaanNaar("nieuw", "toegewezen"));
  ok("en toegewezen naar gemaild", magOvergaanNaar("toegewezen", "gemaild"));
  ok("gesprek kan rechtstreeks klant worden", magOvergaanNaar("gesprek", "klant"));
  ok("maar gemaild niet terug naar toegewezen", !magOvergaanNaar("gemaild", "toegewezen"));
  ok("en nieuw niet meteen klant", !magOvergaanNaar("nieuw", "klant"));

  // De enige weg terug: een uitgestelde kans kan opnieuw opgepakt worden. Daar
  // is de follow-updatum voor.
  ok("niet nu kan terug naar toegewezen", magOvergaanNaar("niet_nu", "toegewezen"));
  ok("een afgewezen kans is eindstation", volgendeStandenVoor("afgewezen").length === 0);
  ok("elke stand heeft een tekst die een verkoper leest", OUTREACH_STANDEN.every((s) => (STAND_TEKST[s]?.label ?? "").length > 2));
});

group("een afwijzing zonder reden bestaat niet", () => {
  // ⚠️ Plan 17.1: de reden is verplicht en komt uit een korte lijst. Zonder
  // categorie is niet te tellen welk soort prospect afhaakt, en dan is de
  // leerlus uit hoofdstuk 19 onmogelijk. De database dwingt het ook af, maar een
  // constraint-fout is een 500 en dit is een zin die de verkoper kan lezen.
  const zonder = beoordeelStatus("gemaild", "afgewezen", null);
  ok("zonder reden mag het niet", !zonder.ok);
  ok("en de melding legt uit waarom", (zonder.melding ?? "").includes("welk soort prospect"));

  const met = beoordeelStatus("gemaild", "afgewezen", "geen_budget");
  ok("met een reden uit de lijst wel", met.ok, met.melding ?? "");

  const verzonnen = beoordeelStatus("gemaild", "afgewezen", "geen_zin");
  ok("een verzonnen reden telt niet", !verzonnen.ok);

  const onmogelijk = beoordeelStatus("nieuw", "klant", null);
  ok("een onmogelijke sprong wordt geweigerd", !onmogelijk.ok);
  ok(
    "en de melding zegt wat er wél kan",
    (onmogelijk.melding ?? "").includes("Vanaf hier kun je naar"),
    onmogelijk.melding ?? "",
  );
  eq2("er zijn zes redenen om uit te kiezen", AFWIJS_REDENEN.length, 6);
});

group("het plafond beschermt het maildomein en niet het budget", () => {
  // Plan 16.6, eerste maatregel. Omdat de medewerker zelf verstuurt kan de app
  // het versturen niet tegenhouden, maar wel de AANVOER van concepten.
  const rustig = beoordeelPlafond({ verstuurd: 5, bounces: 0, klachten: 0, afmeldingen: 0 });
  ok("vijf van het plafond laat ruimte", rustig.ok);
  eq2("en zegt hoeveel", rustig.ruimte, CONCEPTEN_PER_DAG - 5);

  const vol = beoordeelPlafond({ verstuurd: CONCEPTEN_PER_DAG, bounces: 0, klachten: 0, afmeldingen: 0 });
  ok("bij het plafond stopt de aanvoer", !vol.ok);
  ok("en de melding legt uit waarom dit bestaat", (vol.melding ?? "").includes("maildomein"));

  // ⚠️ De tweede rem: loopt het aandeel bounces en klachten op, dan halveert het
  // plafond. Meer volume is dan precies de verkeerde reactie, want het domein is
  // al aan het beschadigen. De aantallen staan bewust in verhouding tot het
  // plafond, zodat deze test blijft kloppen als de eigenaar dat getal verzet
  // (op 1 september 2026 ging het van 20 naar 100).
  const helft = Math.floor(CONCEPTEN_PER_DAG / 2);
  const slechtMaarRuimte = beoordeelPlafond({
    verstuurd: helft - 1,
    bounces: helft,
    klachten: 0,
    afmeldingen: 0,
  });
  eq2("bij veel bounces is er nog één plek over", slechtMaarRuimte.ruimte, 1);

  const slecht = beoordeelPlafond({
    verstuurd: helft,
    bounces: helft,
    klachten: 0,
    afmeldingen: 0,
  });
  ok("en op de helft van het plafond stopt de aanvoer", !slecht.ok);
  ok("en dat wordt gezegd", (slecht.melding ?? "").includes("gehalveerd"));
});

group("de trechter telt cumulatief en niet op de huidige stand", () => {
  // ⚠️ DE KLASSIEKE FOUT IN EEN TRECHTERGRAFIEK. Zou hij tellen op de huidige
  // stand, dan zakt "gemaild" zodra iemand doorschuift naar "gebeld", en dan
  // daalt het aantal verstuurde mails terwijl er méér verstuurd is.
  const trechter = rekenTrechter(["gemaild", "gebeld", "gesprek", "toegewezen", "afgewezen"]);
  const per = new Map(trechter.map((t) => [t.stand, t.aantal]));

  eq2("wie een gesprek had, is ook gemaild geweest", per.get("gemaild") ?? 0, 3);
  // Alle vijf zijn ooit toegewezen geweest, ook de afgewezen kans: er was
  // iemand om af te wijzen.
  eq2("en alle vijf zijn toegewezen geweest", per.get("toegewezen") ?? 0, 5);
  eq2("het gesprek is het cijfer dat telt", per.get("gesprek") ?? 0, 1);

  // Een afgewezen kans telt mee tot waar hij gekomen is en niet verder. Zou hij
  // helemaal uit de trechter vallen, dan lijkt de conversie beter dan hij is.
  ok("een afgewezen kans valt niet uit de telling", (per.get("toegewezen") ?? 0) > (per.get("gemaild") ?? 0));

  const conversie = trechter.find((t) => t.stand === "gemaild")?.conversie ?? 0;
  ok("en er staat een conversie per stap bij", conversie > 0 && conversie <= 1, String(conversie));
});

group("een mail met een verzonnen cijfer wordt niet klaargezet", () => {
  const kans: Kans = {
    type: "concurrent_gap",
    vragen: ["v1"],
    antwoorden: ["a1"],
    cijfers: { eigen_aandeel: 0.08, concurrent_aandeel: 0.6, vragen: 40 },
  };

  const goed = controleerConcept(
    {
      onderwerp: "Van X in AI-antwoorden over makelaars",
      tekst:
        "Beste, wij stelden 40 vragen aan AI-assistenten over makelaars in Eindhoven. Van X wordt " +
        "bij 8% van die vragen genoemd en Y Makelaars bij 60%. Dat zegt niets over jullie werk, " +
        "wel over wat een AI-assistent over jullie weet. Tien minuten deze week?",
    },
    kans,
  );
  ok("een mail met alleen gemeten cijfers mag", goed.ok, goed.bezwaren.join(" "));

  const fout = controleerConcept(
    {
      onderwerp: "Van X in AI-antwoorden",
      tekst:
        "Beste, jullie lopen 73% achter op de markt en missen daardoor 12 opdrachten per maand. " +
        "Dat kunnen wij oplossen. Tien minuten deze week? Met vriendelijke groet.",
    },
    kans,
  );
  ok("een mail met verzonnen cijfers niet", !fout.ok);
  ok("en de bezwaren noemen ze", (fout.bezwaren[0] ?? "").includes("73"));

  // Plan 16.2, punt 1: de onderwerpregel gaat over hen en niet over ons.
  const overOns = controleerConcept(
    {
      onderwerp: "ORBIT ENGINE helpt jullie met AI-zichtbaarheid",
      tekst:
        "Beste, wij stelden 40 vragen over makelaars in Eindhoven. Van X wordt bij 8% genoemd. " +
        "Tien minuten deze week om er even naar te kijken? Met vriendelijke groet.",
    },
    kans,
  );
  ok("een onderwerpregel over onszelf wordt afgekeurd", !overOns.ok);

  // Het sjabloon is het vangnet: saai, kort en waar.
  const sjabloon = sjabloonConcept(kans, "Van X", "makelaars Eindhoven", "Y wordt bij 60% genoemd, Van X bij 8%.", "M. de Vries");
  ok("het sjabloon komt door zijn eigen controle", controleerConcept(sjabloon, kans).ok);
  ok("en vraagt om tien minuten in plaats van een demo", sjabloon.tekst.includes("tien minuten"));
});

group("de gespreksvoorbereiding valt onder dezelfde bewijsregel", () => {
  // Plan 16.5: elk getal in de voorbereiding wordt tegen de meetdata
  // gecontroleerd. Een verkoper die een verkeerd cijfer voorleest, staat er net
  // zo hard naast als wanneer het in de mail stond.
  const kans: Kans = {
    type: "onzichtbaar",
    vragen: [],
    antwoorden: [],
    cijfers: { vermeldingen: 3, vragen: 40 },
  };

  const goed = controleerVoorbereiding(
    {
      cijfers: ["3 van de 40 vragen", "40 gemeten vragen"],
      openingen: ["Geen reactie gehad?", "Je gaf aan interesse te hebben.", "Je was sceptisch."],
      bezwaren: [{ bezwaar: "Wij krijgen klanten via mond-tot-mond.", antwoord: "Dat klopt vaak." }],
      nietZeggen: ["Hoeveel omzet dit misloopt, dat weten we niet."],
    },
    kans,
  );
  ok("een voorbereiding met gemeten cijfers mag", goed.ok, goed.bezwaren.join(" "));

  const fout = controleerVoorbereiding(
    {
      cijfers: ["3 van de 40", "je mist 12 opdrachten per maand"],
      openingen: ["a", "b", "c"],
      bezwaren: [],
      nietZeggen: ["iets"],
    },
    kans,
  );
  ok("een verzonnen cijfer niet", !fout.ok);

  // ⚠️ De grens van wat de meting draagt is verplicht. Juist die zin voorkomt dat
  // een verkoper iets belooft wat we niet gemeten hebben.
  const zonderGrens = controleerVoorbereiding(
    {
      cijfers: ["3 van de 40"],
      openingen: ["a", "b", "c"],
      bezwaren: [],
      nietZeggen: [],
    },
    kans,
  );
  ok("zonder die grens is de voorbereiding niet compleet", !zonderGrens.ok);
});

group("elk hooktype krijgt een eigen toon, en de mail geen pitch", () => {
  // Plan 16.2: "Dezelfde mail voor alle acht types is een sjabloon met
  // variabelen, en dat ruikt een ondernemer."
  for (const type of KANS_TYPES) {
    ok(`${type} heeft een eigen toon`, (TOON_PER_TYPE[type] ?? "").length > 30);
  }
  const tonen = new Set(Object.values(TOON_PER_TYPE));
  eq2("en die tonen verschillen echt van elkaar", tonen.size, KANS_TYPES.length);

  const vraag = bouwMailVraag(
    { type: "onzichtbaar", vragen: [], antwoorden: [], cijfers: { vermeldingen: 3, vragen: 40 } },
    "Van X",
    "makelaars Eindhoven",
    "Van X wordt bij 3 van de 40 vragen genoemd.",
    "M. de Vries",
    null,
  );
  ok("de opdracht noemt wat er niet in mag", VERBODEN_IN_MAIL.every((v) => vraag.includes(v)));
  ok("en vraagt om tien minuten in plaats van een demo", vraag.includes("tien minuten deze week"));
  ok("zonder publiek rapport staat er geen link in", !vraag.includes("orbitengine.nl"));
});

group("wie mag er een mail krijgen, en wie zeker niet", () => {
  // ⚠️ Plan 9.4, regel 1: een afgeleid adres is geen adres. "Een mail die
  // stuitert kost je niets, maar een mail bij de verkeerde persoon kost je het
  // bedrijf."
  const afgeleid = magOntvangerZijn({
    naam: "J. Jansen",
    rol: "Directeur",
    email: "j.jansen@vanx.nl",
    emailKind: "afgeleid",
    zekerheid: "middel",
  });
  ok("een afgeleid adres mag niet zonder bevestiging", !afgeleid.ok);
  ok("en de melding zegt wat je moet doen", (afgeleid.melding ?? "").includes("Controleer hem eerst"));

  const bevestigd = magOntvangerZijn({
    naam: "J. Jansen",
    rol: "Directeur",
    email: "j.jansen@vanx.nl",
    emailKind: "afgeleid",
    zekerheid: "middel",
    verifiedAt: "2026-08-29T10:00:00Z",
  });
  ok("bevestigd door een mens mag wel", bevestigd.ok);

  // Regel 3: de juiste rol, en een uitsluiting weegt zwaarder dan een treffer.
  ok("een directeur past", rolPast("Directeur"));
  ok("een commercieel manager ook", rolPast("Commercieel manager"));
  ok("een administratief medewerker niet", !rolPast("Administratief medewerker"));
  ok(
    "ook niet als er marketing in de titel staat",
    !rolPast("Administratief medewerker marketing"),
  );
  ok("en zonder functie weten we het niet", !rolPast(null));

  const zonderAdres = magOntvangerZijn({
    naam: "J. Jansen",
    rol: "Directeur",
    email: null,
    emailKind: "gevonden",
    zekerheid: "hoog",
  });
  ok("zonder adres gaat er niets uit", !zonderAdres.ok);
  ok("en er wordt er geen gegokt", (zonderAdres.melding ?? "").includes("gokt er geen"));

  // ⚠️ Uit de eerste echte markt (1 september 2026). Bij Coolvent kwam
  // `info@coolvent.nl` uit de leveringsvoorwaarden met het label "gevonden",
  // want hij stond er echt. Daarmee glipte hij door elke controle, terwijl plan
  // 16.1 juist zegt dat een mail aan info@ geen persoonlijk eerste contact is.
  const algemeen = magOntvangerZijn(
    { naam: "D. Satram", rol: "Eigenaar", email: "info@coolvent.nl", emailKind: "gevonden", zekerheid: "middel" },
    "Coolvent",
  );
  ok("een algemene postbus is geen persoon", !algemeen.ok);
  ok("en de melding zegt waarom", (algemeen.melding ?? "").includes("algemene postbus"));
  ok("info@ is algemeen", isAlgemeenAdres("info@coolvent.nl"));
  ok("verkoop@ ook", isAlgemeenAdres("verkoop@coolvent.nl"));
  ok("maar een persoonsadres niet", !isAlgemeenAdres("d.satram@coolvent.nl"));
  ok("en een adres met een punt erin ook niet", !isAlgemeenAdres("info.jansen@coolvent.nl"));

  // Ook uit die markt: de gevonden functie was "eigenaar van JS Montage
  // Eindhoven", op de site van Coolvent. `rolPast()` keurde die goed, want er
  // staat "eigenaar" in. Het is alleen de eigenaar van een ander bedrijf.
  ok(
    "een functie bij een ander bedrijf valt af",
    !rolHoortBijBedrijf("eigenaar van JS Montage Eindhoven", "Coolvent"),
  );
  ok(
    "dezelfde naam mag wel, ook met een rechtsvorm erachter",
    rolHoortBijBedrijf("eigenaar van Coolvent B.V.", "Coolvent"),
  );
  ok("een kale functie blijft gewoon staan", rolHoortBijBedrijf("Commercieel directeur", "Coolvent"));
  ok("en zonder functie ook", rolHoortBijBedrijf(null, "Coolvent"));

  const andereFirma = magOntvangerZijn(
    {
      naam: "D. Satram",
      rol: "eigenaar van JS Montage Eindhoven",
      email: "d.satram@coolvent.nl",
      emailKind: "gevonden",
      zekerheid: "middel",
    },
    "Coolvent",
  );
  ok("en dan gaat er geen mail naartoe", !andereFirma.ok);
});

group("de mail gebruikt de naam van de ontvanger", () => {
  // ⚠️ De hele module draait om een persoonlijk eerste contact (plan 9.4). Tot
  // 1 september 2026 begon elk concept met "Beste,", ook als er iemand gevonden
  // was: de contactpersoon werd nooit aan de outreach gehangen.
  const kans: Kans = {
    type: "concurrent_gap",
    vragen: ["v1", "v2"],
    antwoorden: ["a1"],
    cijfers: { vermeldingen: 0, concurrent_vermeldingen: 7 },
    rivalCompanyId: "r1",
  };

  const metNaam = sjabloonConcept(kans, "Van Oers", "Warmtepomp Tilburg", "De haak.", "Jan", "M. de Vries");
  ok("met een gevonden naam begint de mail persoonlijk", metNaam.tekst.startsWith("Beste M. de Vries,"));

  const zonderNaam = sjabloonConcept(kans, "Van Oers", "Warmtepomp Tilburg", "De haak.", "Jan");
  ok("zonder naam blijft het Beste,", zonderNaam.tekst.startsWith("Beste,"));
  ok("en er wordt er geen verzonnen", !zonderNaam.tekst.includes("Beste ["));

  const vraagMet = bouwMailVraag(kans, "Van Oers", "Warmtepomp Tilburg", "De haak.", "Jan", null, "M. de Vries");
  ok("de opdracht noemt de ontvanger", vraagMet.includes("Beste M. de Vries,"));
  const vraagZonder = bouwMailVraag(kans, "Van Oers", "Warmtepomp Tilburg", "De haak.", "Jan", null);
  ok("en zonder ontvanger staat er dat je er geen verzint", vraagZonder.includes("verzin geen naam"));

  // ⚠️ De opdracht vroeg tot 1 september 2026 alleen om een mail, terwijl de
  // verwachte uitvoer ook de vier blokken van de belvoorbereiding bevat. Het
  // model leverde ze dus leeg, de controle verwierp ze terecht, en er stond op
  // twee markten geen enkele voorbereiding op het dossier.
  ok("de opdracht vraagt om de gespreksvoorbereiding", vraagZonder.includes("gespreksvoorbereiding"));
  ok("met precies twee cijfers", vraagZonder.includes("cijfers: precies twee"));
  ok("en precies drie openingen", vraagZonder.includes("openingen: precies drie"));
  ok("en de grens van wat de meting draagt", vraagZonder.includes("niet_zeggen"));
});

group("een linktekst is geen bedrijfsnaam", () => {
  // ⚠️ Onze eigen crawler leest bronpagina's uit en nam de tekst van een link
  // over als naam. Twee ECHTE installateurs heetten daardoor "Open website", in
  // de kans, in de score en in de conceptmail.
  ok('"Open website" is geen naam', isGeenBedrijfsnaam("Open website"));
  ok('"Lees meer over deze doeleinden" ook niet', isGeenBedrijfsnaam("Lees meer over deze doeleinden"));
  ok('"Update mijn webbrowser" ook niet', isGeenBedrijfsnaam("Update mijn webbrowser"));
  ok('"Website door Bonsai media" ook niet', isGeenBedrijfsnaam("Website door Bonsai media"));
  ok("een telefoonnummer ook niet", isGeenBedrijfsnaam("+31 6 13818383"));
  ok("een leeg veld ook niet", isGeenBedrijfsnaam("  "));
  ok("maar een echt bedrijf wel", !isGeenBedrijfsnaam("Coolvent"));
  ok("ook met een rechtsvorm", !isGeenBedrijfsnaam("Van Oers Installaties B.V."));

  // Het bedrijf gaat er niet uit: met een domein erbij levert de naam uit het
  // domein een bruikbare naam op, en dat is te zien aan de herkomst.
  const uit = voegKandidatenSamen(
    [
      { name: "Open website", domain: "klima-techniek.nl", city: null, bron: "bronpagina:nvkl.nl", naamHerkomst: "bronpagina", evidenceUrl: null },
    ],
    (n) => n.toLowerCase(),
  );
  eq2("het bedrijf blijft staan", uit.length, 1);
  eq("en heet naar zijn domein", uit[0].name, "Klima techniek");
  eq("met de herkomst erbij", uit[0].naamHerkomst, "domein");

  // De bronnen zelf horen er niet in, ook niet als de crawler ze aandraagt.
  for (const domein of ["rvo.nl", "mkb.nl", "knmi.nl", "cookiedatabase.org", "fraudehelpdesk.nl", "openstreetmap.org", "wa.me"]) {
    ok(`${domein} is geen prospect`, isGeenProspect(domein));
  }
});

group("een adres afleiden mag alleen met een echt patroon", () => {
  // ⚠️ Uit één adres een patroon afleiden is geen afleiding maar een aanname met
  // een steekproef van één.
  ok(
    "één bekend adres is geen patroon",
    leidAdresAf("Jan", "Jansen", "vanx.nl", ["info@vanx.nl"]) === null,
  );

  const patroon = leidAdresAf("Jan", "Jansen", "vanx.nl", [
    "piet.klaassen@vanx.nl",
    "marie.devries@vanx.nl",
  ]);
  eq("twee gelijke patronen leveren een gok op", patroon?.email ?? "", "jan.jansen@vanx.nl");
  ok("met de vorm erbij", (patroon?.patroon ?? "").includes("voornaam"));

  ok(
    "twee verschillende vormen zijn geen patroon",
    leidAdresAf("Jan", "Jansen", "vanx.nl", ["piet@vanx.nl", "marie.devries@vanx.nl"]) === null,
  );
});

group("de contactvraag zoekt de juiste persoon en verzint niets", () => {
  const vraag = bouwContactVraag({ naam: "Van X Makelaars", domein: "vanx.nl", plaats: "Eindhoven" });
  ok("het bedrijf staat erin", vraag.includes("Van X Makelaars"));
  ok("de opdracht zoekt de commercieel verantwoordelijke", vraag.includes("over de commercie gaat"));
  ok("administratief personeel is uitgesloten", vraag.includes("Noem geen administratief"));
  ok("en verzinnen mag niet", vraag.includes("Verzin nooit een mailadres"));
  ok(
    "zonder website zegt hij dat",
    bouwContactVraag({ naam: "Zonder Site", domein: null, plaats: null }).includes(
      "geen bekende website",
    ),
  );
});

// Bevindingen uit de eerste live doorloop, 31 augustus 2026
// (docs/tasks/bevindingen-live-test-31-augustus-2026.md)
// ════════════════════════════════════════════════════════════════════════════

// ⚠️ De fout: in het gesprek stond bij een nieuwe regio "Uitbreiding richting
// Oosterhout en Geertruidenberg." en die hele zin kwam als plaatsnaam in
// `service_regions`. Dat veld wordt letterlijk in de lokale meetvragen geplakt
// en het aantal regio's stuurt `suggestPromptMix()` aan, dus dat kost de klant
// onbruikbare vragen én een duurdere meting.
group("een hele zin wordt geen plaatsnaam (bevinding 2)", () => {
  ok(
    "de zin uit de doorloop levert niets op",
    regionsFromDescription("Uitbreiding richting Oosterhout en Geertruidenberg.").length === 0,
  );
  ok(
    "een enkele plaats komt er wel uit",
    regionsFromDescription("Amersfoort")[0] === "Amersfoort",
  );
  ok(
    "een punt erachter valt weg",
    regionsFromDescription("Amersfoort.")[0] === "Amersfoort",
  );

  // De reden dat er NIET op "en" gesplitst wordt: dan zou hier "Gilze" en
  // "Rijen" uitkomen, twee plaatsen die niet bestaan.
  const gilze = regionsFromDescription("Gilze en Rijen");
  ok("Gilze en Rijen blijft één gemeente", gilze.length === 1 && gilze[0] === "Gilze en Rijen");
  ok(
    "Bergen op Zoom blijft heel",
    regionsFromDescription("Bergen op Zoom")[0] === "Bergen op Zoom",
  );

  const twee = regionsFromDescription("Oosterhout, Geertruidenberg");
  ok("een komma is wel een opsomming", twee.length === 2, twee.join("|"));
  ok("en beide plaatsen komen er heel uit", twee[1] === "Geertruidenberg", twee.join("|"));

  const drie = regionsFromDescription("Oosterhout, Gilze en Rijen, 's-Hertogenbosch");
  ok("gemengd blijft ook goed", drie.length === 3, drie.join("|"));
  ok("met apostrof en al", drie[2] === "'s-Hertogenbosch", drie.join("|"));

  // Kleine letter vooraan is een zin, geen plaatsnaam.
  ok("een losse bijzin valt af", regionsFromDescription("richting het zuiden").length === 0);
  ok("leeg blijft leeg", regionsFromDescription("   ").length === 0);

  ok(
    "extraRegionsFrom gebruikt dezelfde regel",
    extraRegionsFrom([
      { kind: "nieuwe_regio", description: "Uitbreiding richting Oosterhout en Geertruidenberg.", effective_from: null },
      { kind: "nieuwe_regio", description: "Oosterhout, Waalwijk", effective_from: null },
    ]).join("|") === "Oosterhout|Waalwijk",
  );
});

// ⚠️ De fout: het rapport schreef "nog niet genoemd bij de 15 onderzochte
// vragen" terwijl er 30 vragen waren, en sprak zichzelf drie zinnen verder
// tegen met "de meting bestaat uit 30 antwoorden". Het getal is te tellen, dus
// hoort er code onder te staan en niet alleen een promptregel (conventie 1).
group("het aantal onderzochte vragen wordt rechtgezet (bevinding 4)", () => {
  const fout =
    "Wouter Warmtepomp wordt in deze eerste meting nog niet genoemd bij de 15 onderzochte vragen. " +
    "De meting bestaat uit 30 antwoorden.";
  const hersteld = correctQuestionCount(fout, 30);
  ok("het getal is vervangen", hersteld.summary.includes("de 30 onderzochte vragen"), hersteld.summary);
  ok("en de oude waarde is gelogd", hersteld.corrected[0] === 15, String(hersteld.corrected));
  ok("de rest van de zin blijft heel", hersteld.summary.includes("nog niet genoemd bij"));

  ok(
    "een kloppend getal wordt niet aangeraakt",
    correctQuestionCount("bij de 30 onderzochte vragen", 30).corrected.length === 0,
  );

  // ⚠️ Een verhouding is geen totaal. Zou deze zin ook rechtgezet worden, dan
  // maakt het vangnet er een onwaarheid van.
  const verhouding = correctQuestionCount("bij 17 van de 30 vragen ontbreekt het merk", 30);
  ok("een verhouding blijft ongemoeid", verhouding.corrected.length === 0, verhouding.summary);

  ok("andere formuleringen ook", correctQuestionCount("er zijn 12 vragen gemeten", 30).summary.includes("30 vragen gemeten"));
  ok("zonder betrouwbaar eigen getal gebeurt er niets", correctQuestionCount("de 15 onderzochte vragen", 0).corrected.length === 0);
  ok("een lege samenvatting valt niet om", correctQuestionCount(null, 30).summary === "");

  const regel = questionCountLine(30, 46);
  ok("de instructie noemt het aantal vragen", regel.includes("30"), regel);
  ok("en het verschil met het aantal metingen", regel.includes("46"), regel);
  ok("bij nul vragen valt de regel weg", questionCountLine(0, 0) === "");
});

// ⚠️ De fout: "Wat dit cluster laat zien" toonde de volledige
// rapportsamenvatting, soms zeven of acht zinnen, plus een lijst met elke
// gemiste vraag eronder. Het model krijgt de instructie kort te schrijven,
// maar "kort" is geen getal (conventie 1).
group("de clustersamenvatting wordt afgekapt op 5 zinnen", () => {
  const kort = "Eén. Twee. Drie.";
  ok("een korte tekst blijft heel", kortSamengevat(kort) === kort, kortSamengevat(kort));

  const lang = "Eén. Twee. Drie. Vier. Vijf. Zes. Zeven.";
  const afgekapt = kortSamengevat(lang);
  ok("langer dan 5 zinnen wordt geknipt", afgekapt === "Eén. Twee. Drie. Vier. Vijf.", afgekapt);
  ok("geknipt bij precies 5 zinnen", !afgekapt.includes("Zes"));

  ok(
    "een ander maximum werkt ook",
    kortSamengevat("Eén. Twee. Drie.", 2) === "Eén. Twee.",
  );
});

// ⚠️ De fout: het planscherm blokkeerde op "kies eerst 10, 20 of 40 pagina's
// per maand" terwijl er nergens een scherm was om dat te kiezen. Het pakket
// staat nu in de pre-boardingwizard en op het toewijzen-scherm.
group("het contentpakket kent maar drie maten (bevinding 8)", () => {
  ok("er zijn er drie", PACKAGE_SIZES.length === 3, PACKAGE_SIZES.join("|"));
  ok("de standaard is het instappakket", DEFAULT_PACKAGE_SIZE === 10);
  ok("10 mag", isPackageSize(10));
  ok("40 mag", isPackageSize(40));
  ok("15 niet", !isPackageSize(15));
  ok("tekst niet", !isPackageSize("10"));
  ok("een half pakket niet", !isPackageSize(10.5));

  ok("een getal uit een formulier komt er als getal uit", toPackageSize("20") === 20);
  ok("leeg betekent geen pakket", toPackageSize("") === null);
  ok("null blijft null", toPackageSize(null) === null);
  ok("een onbekende maat wordt null en geen gok", toPackageSize(33) === null);

  ok("het label leest als een afspraak", packageLabel(20) === "20 pagina's per maand");
  ok("en zonder pakket zegt het dat", packageLabel(null) === "Nog geen pakket gekozen");
});

// ⚠️ De fout: een pagina in de briefingfase werd in de werklijst aangeboden als
// "de tekst is klaar om te publiceren", met een knop Publiceren, terwijl er
// geen letter geschreven was. `lib/work.ts` kende alleen `draft` en
// gepubliceerd; `briefing` viel door naar de tak "klaar". Deze test leest de
// broncode omdat `work.ts` `server-only` is en dus niet importeerbaar.
group("de werklijst kent de briefingfase (bevinding 1)", () => {
  const bron = leesBestand("lib/work.ts");
  ok('work.ts behandelt status "briefing"', bron.includes('piece.status === "briefing"'));
  ok(
    "en doet dat vóór de tak die 'klaar om te publiceren' zegt",
    bron.indexOf('piece.status === "briefing"') < bron.indexOf("De tekst is klaar om te publiceren"),
  );
  ok(
    "de briefingkaart wijst naar het briefingscherm",
    /briefing[\s\S]{0,600}\/briefing`/.test(bron),
  );
  // Elke status uit ContentStatus hoort een tak te hebben, anders ontstaat
  // dezelfde fout opnieuw bij de volgende die erbij komt.
  const statussen = leesBestand("lib/types/database.ts").match(
    /export type ContentStatus =([^;]+);/,
  );
  ok("ContentStatus is gevonden", statussen !== null);
  for (const rauw of (statussen?.[1] ?? "").split("|")) {
    const naam = rauw.trim().replace(/"/g, "");
    if (!naam || naam === "published" || naam === "ready" || naam === "archived") continue;
    ok(`work.ts weet raad met "${naam}"`, bron.includes(`piece.status === "${naam}"`));
  }
});

group("beide helften van 'Stel nieuwe clusters voor' zijn afgeschermd (punt 8)", () => {
  // ⚠️ De `POST` was op slot, de `GET` ernaast niet: die controleerde alleen
  // eigendom, dus een klantaccount kreeg gewoon de vooruitblik te zien. Zelfde
  // patroon als bij punt 1 van de vorige ronde (`work.ts` en `ContentStatus`):
  // deze test leest de broncode en eist dat élke exportfunctie in dit bestand
  // `mayTriggerCost` aanroept, zodat de volgende routehelft die erbij komt
  // niet stil onbeschermd kan blijven.
  const bron = leesBestand("app/api/profiles/[id]/topics/refresh/route.ts");
  ok("het bestand is gevonden", bron.length > 0);

  const functies = [...bron.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
  ok("er staan minstens twee routehelften in (GET en POST)", functies.length >= 2, functies.join(", "));

  for (const naam of functies) {
    // Het lichaam van deze ene functie: van zijn eigen `export async function`
    // tot aan de volgende (of het einde van het bestand). Zo raakt een
    // aanroep in een ANDERE functie deze telling niet.
    const start = bron.indexOf(`export async function ${naam}(`);
    const volgende = bron.indexOf("export async function ", start + 1);
    const lichaam = bron.slice(start, volgende === -1 ? undefined : volgende);
    ok(`${naam} roept mayTriggerCost aan`, lichaam.includes("mayTriggerCost("));
  }
});

group("geen haakjesmeervoud meer in klanttekst (punt 9)", () => {
  // ⚠️ "en nog 6 punt(en)" op het briefingscherm, en dezelfde fout bij
  // "gegeven(s)" (de reputatiesamenvatting) en "bewering(en)" (de
  // redactienotitie), zie docs/tasks/opdracht-bevindingen-5-tot-9.md. De vorm
  // is herkenbaar aan zijn vorm: een geteld aantal (`${...}`), gevolgd door
  // een woord met de meervoudsvorm tussen haakjes. Dat is precies wat een
  // logregel voor jezelf ook doet ("2 veld(en) wél opgeslagen"), dus die
  // blijven met opzet in de UITZONDERINGEN: ze zijn niet voor de klant, net
  // als de bedragen in logregels verderop.
  //
  // Commentaar eraf vóór het zoeken: anders valt deze test over zijn EIGEN
  // uitleg hierboven, die het patroon als voorbeeld citeert.
  const zonderCommentaar = (bron: string) =>
    bron.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  function bestandenOnder(map: string, extensies: string[]): string[] {
    const uit: string[] = [];
    let inhoud: { name: string; isDirectory: () => boolean }[];
    try {
      inhoud = readdirSync(map, { withFileTypes: true, encoding: "utf8" });
    } catch {
      return uit;
    }
    for (const item of inhoud) {
      const pad = join(map, item.name);
      if (item.isDirectory()) uit.push(...bestandenOnder(pad, extensies));
      else if (extensies.some((e) => item.name.endsWith(e))) uit.push(pad);
    }
    return uit;
  }

  const UITZONDERINGEN = [
    "veld(en) wél opgeslagen", // console.error, app/api/profiles/route.ts en [id]/route.ts
    "Engine(s) overgeslagen", // console.warn, lib/engines/registry.ts
    "gelijknamige partij(en) voorgesteld", // console.info, lib/pipeline/llm-baseline.ts
    "niet-onderbouwde bewering(en)", // console.warn, lib/pipeline/report.ts
    "aanbeveling(en) ", // console.warn, lib/pipeline/report.ts (bestaande-paginacheck)
    "onderwerp(en) hersteld", // console.info, lib/pipeline/offering.ts
  ];

  const bestanden = [
    ...bestandenOnder("app/(app)", [".ts", ".tsx"]),
    ...bestandenOnder("lib", [".ts"]),
  ];

  // Het patroon van de fout: een geteld aantal, direct gevolgd door een woord
  // met een haakjesmeervoud. Dat onderscheidt "${x} punt(en)" van code als
  // `setSegment(s)` of `Boolean(n)`, die nooit een `${...}` ervoor hebben.
  const PATROON = /\$\{[^}]*\}\s*[a-zà-ÿ]+\((en|s)\)/gi;
  const treffers: string[] = [];
  for (const pad of bestanden) {
    const bron = zonderCommentaar(readFileSync(pad, "utf8"));
    for (const regel of bron.split("\n")) {
      if (!PATROON.test(regel)) continue;
      PATROON.lastIndex = 0;
      if (UITZONDERINGEN.some((u) => regel.includes(u))) continue;
      treffers.push(`${pad}: ${regel.trim()}`);
    }
  }
  ok(
    "geen haakjesmeervoud meer in klanttekst onder app/(app) en lib/",
    treffers.length === 0,
    treffers.join(" | "),
  );
});

// ════════════════════════════════════════════════════════════════════════════
// Ronde A: losse ingrepen aan de onboardingsessie (31 augustus 2026,
// documentatie/onboarding_optimalisatie.md §18, stap A1 t/m A6). Geen migratie,
// dus broncodecontroles: elke ingreep is los terug te draaien en heeft geen
// eigen pure module gekregen.
// ════════════════════════════════════════════════════════════════════════════

group("A1: het gevonden-blok opent alleen als de stap nog niet compleet is", () => {
  const bron = leesBestand("app/(app)/merk/[id]/_components/onboarding-session.tsx");
  ok(
    "CollapsibleSection krijgt defaultOpen mee, afgeleid van stepProgress().compleet",
    /<CollapsibleSection[\s\S]{0,500}defaultOpen=\{!p\.compleet\}/.test(bron),
  );
});

group("A2: de negen schuif-, keuze- en ja-nee-velden hebben een werkend label", () => {
  const bron = leesBestand("app/(app)/merk/[id]/_components/brand-field-input.tsx");
  ok(
    "het label krijgt een eigen id, naast htmlFor",
    /<label htmlFor=\{id\} id=\{labelId\(id\)\}/.test(bron),
  );
  // De radiogroep moet naar het label-id verwijzen (`${id}-label`), niet naar
  // het veld-id zelf: dat element bestaat bij deze veldsoorten niet.
  const standenAanroepen = [...bron.matchAll(/<Standen\s+id=\{([^}]+)\}/g)].map((m) => m[1]);
  ok("Standen wordt minstens twee keer aangeroepen", standenAanroepen.length >= 2, `${standenAanroepen.length}`);
  for (const arg of standenAanroepen) {
    ok(`<Standen id={${arg}}> wijst naar het label-id`, arg === "labelId(id)");
  }
  ok(
    "de radiogroep leest zijn naam uit dat label-id",
    bron.includes('role="radiogroup" aria-labelledby={id}'),
  );
});

group("A3: het vangnet van de opslagroute dekt alle lijstvelden", () => {
  const bron = leesBestand("app/api/profiles/[id]/route.ts");
  const match = bron.match(/const LIST_FIELDS = \[([\s\S]*?)\] as const;/);
  ok("LIST_FIELDS is gevonden", match !== null);
  const lijst = match?.[1] ?? "";
  for (const veld of [
    "products",
    "value_props",
    "competitors",
    "aliases",
    "service_regions",
    "proof_points",
  ]) {
    ok(`"${veld}" staat in LIST_FIELDS`, new RegExp(`"${veld}"`).test(lijst));
  }
});

group("A4: een openstaand veld wordt bewaard bij het sluiten van het tabblad", () => {
  const bron = leesBestand("app/(app)/merk/[id]/_components/onboarding-session.tsx");
  ok("er wordt geluisterd naar pagehide", bron.includes('addEventListener("pagehide"'));
  ok(
    "er wordt geluisterd naar visibilitychange",
    bron.includes('addEventListener("visibilitychange"'),
  );
  ok(
    "de aanvraag blijft doorlopen na het loslaten van de pagina",
    /fetch\(`\/api\/profiles\/\$\{profileId\}`[\s\S]{0,200}keepalive: true/.test(bron),
  );
  ok(
    "elke veldwijziging wordt als openstaand gemarkeerd",
    /function zet\(key: string, value: unknown\) \{[\s\S]{0,120}openstaandeVelden\.current\.add\(key\)/.test(
      bron,
    ),
  );
});

group("er bestaat nergens een route die zelf een openingsmail verstuurt", () => {
  // ⚠️ PLAN 16.3 IS EEN VASTE REGEL EN GEEN ONTWERPOPTIE: "Er bestaat geen knop,
  // geen instelling en geen cron die een openingsmail de deur uit doet." Deze
  // broncodecontrole is de garantie. Zonder hem is het een afspraak, en een
  // afspraak verdwijnt zodra iemand het handig vindt.
  const salesBestanden = [
    ...tsOnder("lib/sales"),
    ...tsOnder("lib/pipeline").filter((p) => p.includes("sales-")),
    ...tsOnder("app/api/sales"),
  ];
  ok("er zijn Sales-bestanden gevonden", salesBestanden.length > 10, `${salesBestanden.length}`);

  const verstuurders = salesBestanden.filter((pad) => {
    const bron = leesBestand(pad);
    return /from "@\/lib\/email|sendMail|resend|nodemailer/i.test(bron);
  });
  ok(
    "geen enkel Sales-bestand raakt de maillaag",
    verstuurders.length === 0,
    verstuurders.join(", "),
  );
});

group("A5: het contentpakket landt niet meer op het account van de consultant", () => {
  const route = leesBestand("app/api/profiles/route.ts");
  ok("de route zet packagePagesPerMonth niet meer op een account", !route.includes("packagePagesPerMonth"));
  ok("toPackageSize wordt hier niet meer gebruikt", !route.includes("toPackageSize"));

  const wizard = leesBestand("app/(app)/merk/nieuw/onboarding-wizard.tsx");
  ok("de aanmaakwizard vraagt geen contentpakket meer", !wizard.includes("packagePagesPerMonth"));
  ok("de aanmaakwizard heeft geen isStaff-vertakking meer nodig", !wizard.includes("isStaff"));

  // ⚠️ Deze controle keek tot 16 september 2026 of het blok de zin "vóór het
  // eerste contentplan" bevatte. Die zin stond er altijd, ook bij een klant
  // waarbij het pakket allang goed stond, en daarmee bewaakte hij vooral zijn
  // eigen formulering. De belofte eronder is wat telt: de consultant moet te
  // zien krijgen dat een ontbrekend pakket het contentplan van de klant
  // blokkeert. Dat komt nu uit `afspraakGaten()`, alleen als het gat er echt is,
  // en het staat hierboven onder test. Hier blijft over dat het blok die lijst
  // ook daadwerkelijk toont: zonder dat is de tekst getest en de schermweergave niet.
  const pakketBlok = leesBestand("app/(app)/merk/[id]/_components/package-box.tsx");
  ok("het toewijzingsscherm toont de openstaande verkoopafspraak", pakketBlok.includes("afspraakGaten"));
  ok("met het gevolg erbij en niet alleen het veld", pakketBlok.includes("gat.gevolg"));
});

group("A6: de opslagknop van het gespreksblok zegt wat hij doet", () => {
  const bron = leesBestand("app/(app)/merk/[id]/_components/strategy-box.tsx");
  ok(
    "de knop heet 'Gesprek vastleggen en onderwerpen definitief maken'",
    bron.includes("Gesprek vastleggen en onderwerpen definitief maken"),
  );
  ok(
    "er staat een regel uitleg onder de knop",
    bron.includes("ORBIT ENGINE vervangt de voorlopige onderwerpen door een definitieve lijst"),
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe Sales-module: publiceren en hermeten (sprint 6 en 7)");

/** Een markt met tien bedrijven, waarvan er één om verwijdering vroeg. */
function rapportInvoer(overschrijf: Partial<RapportInvoer> = {}): RapportInvoer {
  const bedrijven = Array.from({ length: 10 }, (_, i) => ({
    companyId: `c${i}`,
    naam: `Bedrijf ${i}`,
    aandeel: i === 0 ? 0.6 : i < 4 ? 0.2 : 0,
    vermeldingen: i === 0 ? 24 : i < 4 ? 8 : 0,
    vragen: 40,
    verborgen: i === 9,
  }));
  return {
    markt: "Makelaars Eindhoven",
    plaats: "Eindhoven",
    branche: "makelaar",
    bedrijven,
    vragen: 40,
    engines: ["openai", "gemini"],
    gemetenOp: "2026-08-29T10:00:00Z",
    ...overschrijf,
  };
}

group("wie om verwijdering vroeg, staat er niet op", () => {
  // ⚠️ Plan hoofdstuk 20, laatste alinea: "zonder discussie". Niet
  // geanonimiseerd, niet als 'een bedrijf in deze markt', niet in een totaal dat
  // hem impliciet zichtbaar maakt. Weg is weg.
  const invoer = rapportInvoer();
  const zichtbaar = publiekeBedrijven(invoer.bedrijven);
  eq2("negen van de tien blijven over", zichtbaar.length, 9);
  ok("en het verwijderde bedrijf staat er niet tussen", !zichtbaar.some((b) => b.naam === "Bedrijf 9"));
  ok("de best zichtbare staat bovenaan", zichtbaar[0]?.naam === "Bedrijf 0");

  eq("het adres van een markt ligt vast", marktAdres("makelaar-eindhoven"), "/markt/makelaar-eindhoven");
});

group("een te dunne markt wordt niet gepubliceerd", () => {
  ok("een normale markt mag online", magPubliceren(rapportInvoer()).ok);

  // ⚠️ Onder de vijf zichtbare bedrijven is elk bedrijf herkenbaar aan zijn plek
  // in de lijst. Dan is "verwijderd op verzoek" een loze belofte, want de rest
  // van de markt weet precies wie er weg is.
  const klein = magPubliceren(
    rapportInvoer({
      bedrijven: rapportInvoer().bedrijven.slice(0, 4),
    }),
  );
  ok("een markt met vier bedrijven niet", !klein.ok);
  ok("en de reden gaat over herkenbaarheid", klein.bezwaren.join(" ").includes("herkenbaar"));

  const dun = magPubliceren(rapportInvoer({ vragen: 6 }));
  ok("zes vragen is te weinig voor een openbare uitspraak", !dun.ok);

  const zonderEngine = magPubliceren(rapportInvoer({ engines: [] }));
  ok("en zonder engine is er niets gemeten", !zonderEngine.ok);

  // ⚠️ De markt van 1 september 2026: 43 bedrijven op de pagina, waarvan er één
  // één keer genoemd werd. Die pagina was publiceerbaar en zou over 42 echte
  // bedrijven hebben gezegd dat een AI-assistent ze nooit noemt, terwijl de
  // meting hun stad niet eens bevroeg. Een lijst nullen is geen marktbeeld.
  const nullen = magPubliceren(
    rapportInvoer({
      bedrijven: Array.from({ length: 43 }, (_, i) => ({
        companyId: `n${i}`,
        naam: `Bedrijf ${i}`,
        aandeel: i === 0 ? 0.025 : 0,
        vermeldingen: i === 0 ? 1 : 0,
        vragen: 40,
        verborgen: false,
      })),
    }),
  );
  ok("een markt waarin bijna niemand genoemd wordt, mag niet online", !nullen.ok);
  ok(
    "en de reden wijst naar de meting en niet naar de markt",
    nullen.bezwaren.join(" ").includes("meten"),
  );

  // Genoeg bedrijven, maar te weinig ervan genoemd: vier op zeventig is geen
  // markt met winnaars en verliezers maar een meting die niet gewerkt heeft.
  const scheef = magPubliceren(
    rapportInvoer({
      bedrijven: Array.from({ length: 70 }, (_, i) => ({
        companyId: `s${i}`,
        naam: `Bedrijf ${i}`,
        aandeel: i < 4 ? 0.2 : 0,
        vermeldingen: i < 4 ? 8 : 0,
        vragen: 40,
        verborgen: false,
      })),
    }),
  );
  ok("vier genoemde bedrijven op zeventig is ook te weinig", !scheef.ok);
});

group("op een publieke pagina telt elk getal en elk woord", () => {
  const invoer = rapportInvoer();

  const goed = controleerRapport(
    "Wij stelden 40 vragen aan 2 AI-assistenten. Bedrijf 0 wordt bij 24 van de 40 vragen genoemd.",
    invoer,
  );
  ok("gemeten cijfers mogen", goed.ok, goed.bezwaren.join(" "));

  const fout = controleerRapport(
    "Wij stelden 40 vragen. Bedrijf 0 loopt 87% voor op de rest van de markt.",
    invoer,
  );
  ok("een verzonnen cijfer niet", !fout.ok);
  ok(
    "en de reden zegt waarom dat hier erger is",
    fout.bezwaren.join(" ").includes("iedereen kan narekenen"),
  );

  // ⚠️ Deze pagina zegt wat de AI-assistenten antwoordden, en niets over de
  // kwaliteit van een bedrijf. De ondernemer over wie het gaat leest hem zelf.
  const oordeel = controleerRapport(
    "Bedrijf 3 doet slecht werk aan zijn zichtbaarheid en wordt daarom niet genoemd.",
    invoer,
  );
  ok("een oordeel over een bedrijf komt er niet op", !oordeel.ok);
  ok("en dat wordt met zoveel woorden gezegd", oordeel.bezwaren.join(" ").includes("oordeel"));
});

group("het sjabloonrapport is saai, kort en waar", () => {
  const invoer = rapportInvoer();
  const sjabloon = sjabloonRapport(invoer);
  const geheel = `${sjabloon.intro} ${sjabloon.methode} ${sjabloon.bevindingen}`;

  ok("het sjabloon komt door zijn eigen controle", controleerRapport(geheel, invoer).ok, geheel);
  ok("de methode staat erin", sjabloon.methode.includes("40 vragen"));
  // ⚠️ De zin die voorkomt dat deze pagina als aanklacht leest. Wie hier komt
  // kijken is meestal het bedrijf zelf.
  ok(
    "en er staat bij wat het NIET zegt",
    sjabloon.bevindingen.includes("zegt niets over de kwaliteit"),
  );

  const vraag = bouwRapportVraag(invoer);
  ok("het model krijgt de cijfers per bedrijf", vraag.includes("24 van de 40"));
  ok("met de opdracht om er niets bij te verzinnen", vraag.includes("Verzin er geen enkel bij"));
  ok("en geen oordeel te geven", vraag.includes("Geef geen oordeel over een bedrijf"));
  ok("geen personen", vraag.includes("Noem geen personen"));
  // Het verwijderde bedrijf gaat niet mee in de opdracht: het model kan niet
  // noemen wat het niet ziet, en dat is een tweede slot naast de controle.
  ok("het verwijderde bedrijf gaat niet mee naar het model", !vraag.includes("Bedrijf 9"));
});

group("de publieke pagina leest niet via RLS, en dat is bewust", () => {
  // ⚠️ Een anonieme selectpolicy op `sales_market_reports` zou betekenen dat élk
  // rapport leesbaar is zodra iemand het adres raadt, ook een rapport dat nog
  // niet gepubliceerd is of net is ingetrokken. De pagina leest daarom via de
  // service-role key mét een expliciete controle op is_public en
  // published_run_id.
  const bron = leesBestand("app/markt/[slug]/page.tsx");
  ok("de pagina bestaat", bron.length > 0);
  ok("hij leest via de service-role key", bron.includes("createAdminClient"));
  ok("en controleert of de markt publiek is", bron.includes("is_public"));
  ok("en welke ronde er getoond mag worden", bron.includes("published_run_id"));
  // Geen inlogcontrole: dit is de enige pagina van de app zonder account. De
  // toets kijkt naar de IMPORT en niet naar het woord, want in het commentaar
  // bovenaan staat uitgelegd waarom hij er niet is.
  ok("de authlaag wordt niet geïmporteerd", !bron.includes('from "@/lib/auth"'));
  // ⚠️ En er staat geen persoonsgegeven op: contactpersonen zijn
  // persoonsgegevens, ook als ze publiek op een website staan (plan 9.4).
  ok("en er worden geen contactpersonen getoond", !bron.includes("sales_contacts"));
});

group("een hermeting gebruikt exact dezelfde vragen", () => {
  // ⚠️ Opportunitytype 8 vergelijkt twee rondes. Dat mag alleen als het verschil
  // aan de markt ligt en niet aan de vraag. Zou de hermeting nieuwe vragen
  // genereren, dan meet je het verschil tussen twee vragenlijsten en presenteer
  // je dat als een daling van het bedrijf.
  // Sinds 1 september 2026 staat het werk in een module en niet meer in de
  // route: de geplande hermeting moet exact hetzelfde doen vanuit de wachtrij,
  // en twee keer hetzelfde opschrijven loopt op een dag uit elkaar.
  const route = leesBestand("app/api/sales/markets/[id]/remeasure/route.ts");
  ok("de route bestaat", route.length > 0);
  ok("en leunt op de gedeelde module", route.includes("maakHermeting"));

  const bron = leesBestand("lib/pipeline/sales-remeasure.ts");
  ok("de module bestaat", bron.length > 0);
  ok("hij leest de vragen van de vorige ronde", bron.includes("sales_questions"));
  ok("en schrijft ze over naar de nieuwe ronde", bron.includes("run_id: runId"));
  // Geen intentie- of vragenstap: die zouden andere vragen opleveren.
  ok("hij plant geen nieuwe vragenstap in", !bron.includes("sales_market_questions"));
  // ⚠️ Maar poort 2 blijft staan: meten kost geld, ook de tweede keer.
  ok("en de ronde wacht weer op goedkeuring", bron.includes("vragen_klaar"));
  ok("het rondenummer telt door", bron.includes("round_no: vorige.round_no + 1"));

  // ⚠️ De geplande hermeting zet het slot vóór het werk. Zonder die volgorde
  // pakt de werker dezelfde markt een minuut later opnieuw op, en dat is de
  // duurste lus die dit systeem kan maken: veertig betaalde vragen per keer.
  const slot = bron.indexOf("remeasure_done_at: nu");
  const werk = bron.indexOf("await maakHermeting(admin, markt.id");
  ok("het slot gaat vóór het meten", slot > 0 && werk > 0 && slot < werk);
});

group("het rapport wordt niet vanzelf geschreven en niet vanzelf gepubliceerd", () => {
  // Plan 21.2: "Publiek rapport schrijven, alleen bij publicatie." Zou de
  // meetketen dit doen, dan schrijft ORBIT ENGINE voor elke markt een pagina die
  // misschien nooit online komt.
  const handlers = leesBestand("lib/jobs/handlers.ts");
  const naAggregatie = handlers.slice(handlers.indexOf("sales_market_aggregate:"));
  ok(
    "de meetketen plant geen rapporttaak in",
    !naAggregatie.slice(0, 2000).includes("salesReport"),
  );

  // En publiceren is een tweede besluit, met een eigen route.
  const publish = leesBestand("app/api/sales/markets/[id]/publish/route.ts");
  ok("publiceren is een eigen handeling", publish.includes("export async function POST"));
  ok("intrekken kan altijd", publish.includes("export async function DELETE"));
  ok("en alleen een sales admin mag het", publish.includes("isSalesAdmin"));
  // ⚠️ De pagina verschuift niet vanzelf mee met de laatste meting: dan
  // veranderen de cijfers onder een lopende mailcampagne.
  ok("de gepubliceerde ronde wordt expliciet gezet", publish.includes("published_run_id"));
});

group("een verwijderverzoek doet drie dingen tegelijk", () => {
  // Plan hoofdstuk 20 en 16.4: van de pagina af, nooit meer benaderen, en de
  // lopende outreach stopt. Die drie horen bij elkaar: iemand die vraagt of zijn
  // naam eraf kan, vraagt niet om volgende maand alsnog gebeld te worden.
  const bron = leesBestand("app/api/sales/companies/[id]/remove/route.ts");
  ok("de route bestaat", bron.length > 0);
  ok("het bedrijf gaat van de publieke pagina af", bron.includes("hidden_from_report: true"));
  ok("het wordt nooit meer benaderd", bron.includes("do_not_contact: true"));
  ok("en de lopende outreach stopt", bron.includes("sales_outreach"));
  // ⚠️ De rij blijft staan: anders vindt de marktontdekking hem volgende ronde
  // gewoon opnieuw.
  ok("er wordt niets weggegooid", !bron.includes(".delete()"));
});

group("van prospect naar klant is de enige brug naar de klantomgeving", () => {
  const bron = leesBestand("app/api/sales/outreach/[id]/convert/route.ts");
  ok("de route bestaat", bron.length > 0);
  ok("er wordt een merkprofiel aangemaakt", bron.includes('from("profiles")'));
  // ⚠️ De naamvarianten verhuizen mee. Dat is precies het veld waar een
  // verkeerde invulling later een te lage score oplevert, en de Sales-module
  // heeft ze al geverifieerd tijdens de marktontdekking (plan 17.4).
  ok("de naamvarianten gaan mee", bron.includes("name_variants"));
  ok("de bestaande onboarding start", bron.includes("profile_discover"));
  ok("en de statusmachine beslist of het mag", bron.includes("beoordeelStatus"));
  ok("alleen een sales admin", bron.includes("isSalesAdmin"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nV7: voor wie is deze pagina? (contentkwaliteit-copywriterronde.md)");

console.log("\nV13: volgt de beoordelaar ook de VOLGORDE van het menselijke oordeel?");

console.log("\nV6 en V12: adviseren, en hetzelfde rijtje feiten op elke pagina");

console.log("\nV8, V1 en V10: de opening, de merkstem en de koppen");

console.log("\nV9 en V4: van feit naar betekenis, in de woorden van de ondernemer");

console.log("\nV5: een instructie van de klant is een verbod, geen feit");

console.log("\nV3: ons werkproces lekt niet meer de klantpagina in");

console.log("\nV2: één aanspreekvorm per pagina (contentkwaliteit-copywriterronde.md)");

group("de aanspreekvorm wordt altijd gekozen, en de bron is na te rekenen", () => {
  ok(
    "wat de klant zelf koos gaat voor",
    kiesAanspreekvorm({ voorkeur: "je", formaliteit: 3 }).vorm === "je",
  );
  ok("en dan is de bron het profiel", kiesAanspreekvorm({ voorkeur: "u" }).bron === "profiel");

  // De formaliteitsschuif noemt de vorm letterlijk in zijn labels.
  ok("stand 3 is formeel", kiesAanspreekvorm({ formaliteit: 3 }).vorm === "u");
  ok("stand 1 is informeel", kiesAanspreekvorm({ formaliteit: 1 }).vorm === "je");
  ok("en de bron is dan de toon", kiesAanspreekvorm({ formaliteit: 1 }).bron === "toon");

  // ⚠️ Stand 2 zegt niets over de aanspreekvorm, alleen over de formaliteit.
  // Dan telt wat er op de site van de klant staat.
  const uitSite = kiesAanspreekvorm({
    formaliteit: 2,
    bestaandeTekst:
      "MJB Dakservice is al 25 jaar uw vaste dakdekker. Of u nu tobt met uw dak of uw goot, " +
      "wij hebben voor u een passende oplossing. Vindt u hieronder de richtprijzen.",
  });
  ok("wat de klant op zijn eigen site doet, telt", uitSite.vorm === "u", uitSite.vorm);
  ok("en de bron is dan de bestaande pagina", uitSite.bron === "bestaande pagina");

  // Nek aan nek zegt niets: dan is de standaard eerlijker dan een muntje.
  const gelijkspel = kiesAanspreekvorm({ bestaandeTekst: "Kom je langs? Dan helpen wij u graag." });
  ok("bij twijfel valt hij terug op de standaard", gelijkspel.bron === "standaard");
  ok("en die standaard is 'u'", gelijkspel.vorm === "u");

  // Nooit meer leeg: dat was de hele bug. Geen enkele invoer levert 'geen keuze'.
  ok("zonder enige aanwijzing is er tóch een vorm", Boolean(kiesAanspreekvorm({}).vorm));

  const geteld = telAanspreekvormen("Jij belt ons, en dan helpen wij u met uw dak. Jouw dak.");
  ok("beide vormen zijn te tellen", geteld.je === 2 && geteld.u === 2, JSON.stringify(geteld));
});

// ════════════════════════════════════════════════════════════════════════════
group("Het adres oplossen en de verwante pagina meedragen (2 september 2026)", () => {
  const paginas = [
    {
      url: "https://fysi-unique.nl/tarieven-2026/",
      title: "Tarieven 2026",
      text: "Onze tarieven voor fysiotherapie en manuele therapie.",
    },
    {
      url: "https://fysi-unique.nl/fysiotherapie-bij-hardloopklachten-in-amersfoort/",
      title: "Fysiotherapie bij hardloopklachten in Amersfoort",
      text: "Wij behandelen hardloopblessures met een persoonlijk behandelplan.",
    },
    { url: "https://fysi-unique.nl/", title: "Home", text: "Welkom bij Fysi-Unique." },
  ];

  // ── Het adres oplossen op PAD in plaats van op letterlijke tekst ─────────
  //
  // Dit is de fout van 1 september 2026: 5 van de 8 mislukte koppelingen waren
  // geen verzinsel maar notatie. Het model gaf het pad zonder domein terug, de
  // schrijfstap vergeleek op de letterlijke tekst, en de pagina werd geschreven
  // zonder één woord van zijn eigen bestaande tekst.
  ok(
    "een pad zonder domein vindt de pagina alsnog",
    matchExistingPage("/tarieven-2026/", paginas)?.url === "https://fysi-unique.nl/tarieven-2026/",
  );
  ok(
    "een afsluitende schuine streep maakt niet uit",
    matchExistingPage("https://fysi-unique.nl/tarieven-2026", paginas)?.url ===
      "https://fysi-unique.nl/tarieven-2026/",
  );
  // ⚠️ HET DOMEIN IN HET PAD (nagerekend op productie, 2 september 2026).
  //
  // `/udenhout.nl/skoda` is geen verzonnen pagina: `https://udenhout.nl/skoda`
  // bestaat, en het model zette alleen het domein op de verkeerde plek. Van de
  // 91 aanbevelingen die in productie een adres dragen hebben er 8 deze vorm,
  // allemaal wijzend naar een pagina die echt bestaat. Ze werden alle 8
  // weggegooid, waarvan twee verbeteringen die daardoor een tweede pagina naast
  // een bestaande pagina zouden zijn geworden.
  const udenhout = [
    { url: "https://udenhout.nl/skoda", title: "Škoda" },
    { url: "https://udenhout.nl/leasen/private-lease", title: "Private lease" },
  ];
  ok(
    "het domein in het pad wordt herkend en gerepareerd",
    matchExistingPage("/udenhout.nl/skoda", udenhout)?.url === "https://udenhout.nl/skoda",
  );
  ok(
    "ook bij een dieper pad",
    matchExistingPage("/udenhout.nl/leasen/private-lease", udenhout)?.url ===
      "https://udenhout.nl/leasen/private-lease",
  );
  // ⚠️ En er wordt niets geraden: het eerste segment moet écht de host zijn, en
  // wat er daarna staat moet nog steeds een bestaande pagina aanwijzen.
  ok(
    "een ander domein in het pad blijft onbekend",
    matchExistingPage("/concurrent.nl/skoda", udenhout) === null,
  );
  ok(
    "en een bestaand domein met een pad dat niet bestaat ook",
    matchExistingPage("/udenhout.nl/bestaat-niet", udenhout) === null,
  );
  // Een gewone map met een punt erin is geen domein: `/v1.2/handleiding` mag
  // niet stilletjes zijn eerste segment verliezen.
  ok(
    "een map die geen host is blijft staan",
    matchExistingPage("/diensten/skoda", udenhout) === null,
  );
  ok("een verzonnen pad vindt niets", matchExistingPage("/udenhout.nl/leasen/private-lease", paginas) === null);
  ok("een leeg adres ook niet", matchExistingPage("", paginas) === null);
  // ⚠️ "." en "/" stonden in productie letterlijk als existingUrl. Die mogen
  // nooit de homepage aanwijzen: dat is geen keuze van het model maar een gok.
  ok("een punt wijst niet naar de homepage", matchExistingPage(".", paginas) === null);
  ok("de homepage zelf mag wel", matchExistingPage("https://fysi-unique.nl/", paginas)?.title === "Home");

  // ── Een bevestigd adres wordt de vorm uit de crawl ──────────────────────
  //
  // `reconcileExistingPageActions()` liet een bevestigd adres tot 2 september
  // staan zoals het model het gaf. Dat is dezelfde pagina, maar wat er in de
  // database belandde was een pad zonder domein: onbruikbaar voor de
  // schrijfstap en niet klikbaar op het scherm.
  type Proef = {
    title: string;
    targetIntent: string;
    why: string;
    action: ContentAction;
    existingUrl: string | null;
    relatedUrl?: string | null;
  };
  const onderwerp = {
    title: "Hardloopblessure behandelen in Amersfoort",
    targetIntent: "hardlopers met een blessure",
    why: "De AI noemt ons niet bij deze vraag over hardloopblessures",
  };

  const genormaliseerd = reconcileExistingPageActions<Proef>(
    [{ ...onderwerp, action: "verbeteren", existingUrl: "/tarieven-2026/" }],
    paginas,
  );
  ok(
    "een pad zonder domein wordt de volledige URL uit de crawl",
    genormaliseerd.recommendations[0].existingUrl === "https://fysi-unique.nl/tarieven-2026/",
  );
  ok(
    "en dat wordt gemeld als normalisatie, niet als correctie van de handeling",
    genormaliseerd.overrides[0]?.reason === "adres_genormaliseerd" &&
      genormaliseerd.recommendations[0].action === "verbeteren",
  );

  // ── Onder de omzetdrempel: waarschuwen in plaats van zwijgen ────────────
  //
  // De hardloopklachten-pagina dekt dit onderwerp deels. Dekt hij het ruim, dan
  // zet `reconcileExistingPageActions()` de aanbeveling om naar `verbeteren`
  // (de test daarvoor staat hierboven). Daaronder blijft hij `nieuw`, maar
  // draagt hij de pagina mee zodat de schrijver en de klant hem zien.
  // Dekking 0,50: boven de waarschuwdrempel (0,40), onder de omzetdrempel
  // (0,70). Precies het gebied waarvoor `relatedUrl` bestaat.
  const verwant = reconcileExistingPageActions<Proef>(
    [
      {
        title: "Hardloopblessure voorkomen",
        targetIntent: "hardlopers in Amersfoort",
        why: "Vraag over het voorkomen van een hardloopblessure",
        action: "nieuw",
        existingUrl: null,
      },
    ],
    paginas,
  );
  ok(
    "een nieuwe pagina naast een verwante pagina blijft nieuw",
    verwant.recommendations[0].action === "nieuw",
  );
  ok(
    "maar draagt die pagina mee",
    verwant.recommendations[0].relatedUrl ===
      "https://fysi-unique.nl/fysiotherapie-bij-hardloopklachten-in-amersfoort/",
  );
  ok("en meldt dat als verwante pagina", verwant.overrides[0]?.reason === "verwante_pagina");

  // ── Het adres dat het model zelf opgaf, bij een nieuwe pagina ───────────
  //
  // In productie draagt 32 van de 70 `nieuw`-aanbevelingen tóch een adres, en 13
  // daarvan bestaan echt. Dat is een directe aanwijzing van het model en weegt
  // zwaarder dan onze eigen termmeting.
  const aangewezen = reconcileExistingPageActions<Proef>(
    [
      {
        title: "Bedrijfsfitness voor werkgevers",
        targetIntent: "werkgevers",
        why: "Werkgevers zoeken bedrijfsfitness voor personeel",
        action: "nieuw",
        existingUrl: "/tarieven-2026/",
      },
    ],
    paginas,
  );
  ok("de handeling blijft nieuw", aangewezen.recommendations[0].action === "nieuw");
  ok(
    "de aangewezen pagina wordt de verwante pagina",
    aangewezen.recommendations[0].relatedUrl === "https://fysi-unique.nl/tarieven-2026/",
  );
  // ⚠️ En niet als `existingUrl` blijven staan: dat veld betekent "deze pagina
  // wordt vervangen", en dat is hier juist niet aan de orde.
  ok("en niet als te vervangen pagina", aangewezen.recommendations[0].existingUrl === null);

  // Rommel die het model bij een nieuwe pagina invulde ("`:`", "`.`", "`:null`",
  // alle drie letterlijk uit productie) verdwijnt.
  const rommel = reconcileExistingPageActions<Proef>(
    [
      {
        title: "Bedrijfsfitness voor werkgevers",
        targetIntent: "werkgevers",
        why: "Werkgevers zoeken bedrijfsfitness voor personeel",
        action: "nieuw",
        existingUrl: ":",
      },
    ],
    paginas,
  );
  ok("een onbruikbaar adres verdwijnt", rommel.recommendations[0].existingUrl === null);
  ok("en levert geen waarschuwing op", rommel.recommendations[0].relatedUrl === null);

  // ── Een echt nieuw onderwerp raakt niets ────────────────────────────────
  const echtNieuw = reconcileExistingPageActions<Proef>(
    [
      {
        title: "Bedrijfsfitness voor werkgevers",
        targetIntent: "werkgevers",
        why: "Werkgevers zoeken bedrijfsfitness voor personeel",
        action: "nieuw",
        existingUrl: null,
      },
    ],
    paginas,
  );
  ok("een onderwerp dat nergens staat blijft schoon", echtNieuw.recommendations[0].relatedUrl === null);
  ok("en levert geen melding op", echtNieuw.overrides.length === 0);

  // ⚠️ De drempel voor waarschuwen ligt onder die voor omzetten: daartussen zit
  // het gebied waarin omzetten te ver gaat en zwijgen ook.
  ok(
    "de waarschuwdrempel ligt onder de omzetdrempel",
    EXISTING_PAGE_RELATED_THRESHOLD < EXISTING_PAGE_COVERAGE_THRESHOLD,
  );

  // ── De waarschuwing voor de schrijver ───────────────────────────────────
  ok("zonder pagina geen waarschuwing", relatedPageWarning(null) === "");
  ok(
    "met pagina wel, mét het adres",
    relatedPageWarning("https://x.nl/a").includes("https://x.nl/a") &&
      relatedPageWarning("https://x.nl/a").includes("ANDERS"),
  );
});

// ════════════════════════════════════════════════════════════════════════════
group("Het menu gaat uit de opgehaalde sitetekst (2 september 2026)", () => {
  // Overgenomen uit de tak `claude/gasservice-brabant-content-fe9g07`, samen met
  // de module zelf: één implementatie, één set tests.
  const menu = "<nav><ul><li>Cv-ketel</li><li>Onderhoud</li><li>Warmtepomp</li></ul></nav>";
  const inhoud =
    "<p>De kosten van een hybride warmtepomp kunnen oplopen tot maximaal 6000 euro. " +
    "Deze kosten hangen af van het vermogen en van het soort hybride warmtepomp. " +
    "Het vermogen hangt af van de grootte van je woning en het bouwjaar van de woning.</p>";
  const voet = "<footer>Alle rechten voorbehouden. Bel ons op 073.</footer>";

  const geschoond = stripChrome(`${menu}${inhoud}${voet}`);
  ok("het menu gaat eruit", !geschoond.includes("Cv-ketel"));
  ok("de voettekst ook", !geschoond.includes("Alle rechten"));
  ok("en de inhoud blijft", geschoond.includes("maximaal 6000 euro"));

  const metMenu = stripChrome(`<header><nav>Menu hier</nav></header>${inhoud}`);
  ok("een koptekst met menu gaat eruit", !metMenu.includes("Menu hier"));
  const metTitel = stripChrome(`<header><h1>Wat kost een warmtepomp?</h1></header>${inhoud}`);
  ok("een koptekst met de titel blijft", metTitel.includes("Wat kost een warmtepomp?"));

  const metMain = stripChrome(`<div>zijbalk met van alles erin</div><main>${inhoud}</main>`);
  ok("de hoofdinhoud wint", metMain.includes("maximaal 6000 euro") && !metMain.includes("zijbalk"));

  // ⚠️ Het vangnet. Een pagina die álles in een header zet mag niet leeg raken:
  // minder tekst is erger dan ruis (conventie 3).
  const allesInHeader = `<header><nav>Menu</nav>${inhoud}</header>`;
  ok("een te gretige knip wordt teruggedraaid", stripChrome(allesInHeader).includes("maximaal 6000 euro"));
  ok("lege invoer blijft leeg", stripChrome("") === "");

  const metScript = `<script>${"x=1;".repeat(4000)}</script>${menu}${inhoud}`;
  ok("JavaScript telt niet mee als tekst", !stripChrome(metScript).includes("Cv-ketel"));

  // ── Het echte geval: het menu stond er TWEE keer, vóór de eerste zin ──────
  //
  // Zo zag wouterwarmtepomp.nl/hybride-warmtepomp/ eruit: dezelfde
  // navigatieregel dubbel, gevolgd door de inhoud. Van de 3493 opgehaalde
  // tekens was ongeveer een derde menu.
  const dubbelMenu = `${menu}${menu}<main>${inhoud}</main>`;
  const na = stripChrome(dubbelMenu);
  ok("een dubbel menu verdwijnt helemaal", !na.includes("Onderhoud"));
  ok("en de inhoud staat vooraan", na.trim().startsWith("<p>De kosten"));

  // ⚠️ De ophaalstap moet dit ook echt gebruiken, anders staat de reparatie in
  // de module en niet in het product.
  const ophalen = leesBestand("lib/pipeline/existing-page-fetch.ts");
  ok("de verse ophaling schoont de pagina", ophalen.includes("stripChrome(html)"));
  ok("en doet dat vóór het afkappen", ophalen.indexOf("stripChrome(html)") < ophalen.indexOf("EXISTING_PAGE_MAX_CHARS)"));
});

// ════════════════════════════════════════════════════════════════════════════
group("De bestaande pagina als bron (O3, existing-page-fetch.ts)", () => {
  ok(
    "de verse tekst wint van het crawl-excerpt",
    chooseExistingText({ fresh: "verse tekst", excerpt: "oude afgekapte tekst" })?.bron === "vers",
  );
  ok(
    "zonder verse tekst valt hij terug op de crawl",
    chooseExistingText({ fresh: null, excerpt: "oude tekst" })?.bron === "crawl",
  );
  ok(
    "en zonder allebei is er niets",
    chooseExistingText({ fresh: "   ", excerpt: null }) === null,
  );
  // ⚠️ 6000 tekens en niet 1500: 667 van de 738 gecrawlde pagina's op productie
  // staan op de crawlgrens, en 9 van de 10 daadwerkelijk verbeterde pagina's ook.
  ok("de ophaalgrens ligt op 6000 tekens", EXISTING_PAGE_MAX_CHARS === 6000);
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nLabels en de prullenbak op het clusteroverzicht (migratie 0083)");

group("een labelnaam wordt opgeschoond voordat hij een groep wordt", () => {
  eq("spaties aan de randen gaan eraf", normaliseerLabelnaam("  Onderhoud  ") ?? "", "Onderhoud");
  eq("dubbele spaties binnenin worden er één", normaliseerLabelnaam("cv  ketel") ?? "", "cv ketel");
  eq("een regeleinde telt als spatie", normaliseerLabelnaam("cv\nketel") ?? "", "cv ketel");
  // Conventie 3: onbruikbare invoer wordt null, nooit een leeg label dat
  // daarna als groep in het uitklapmenu staat.
  ok("alleen spaties levert niets op", normaliseerLabelnaam("   ") === null);
  ok("leeg levert niets op", normaliseerLabelnaam("") === null);
  ok("niet-tekst levert niets op", normaliseerLabelnaam(undefined) === null);
  eq2(
    `langer dan ${MAX_LABELNAAM} tekens wordt afgekapt`,
    (normaliseerLabelnaam("x".repeat(80)) ?? "").length,
    MAX_LABELNAAM,
  );
});

group("hoofdletters maken geen tweede label", () => {
  ok("Onderhoud is onderhoud", zelfdeLabelnaam("Onderhoud", "onderhoud"));
  ok("maar onderhoud is geen vervanging", !zelfdeLabelnaam("Onderhoud", "vervanging"));

  const labels = [
    { id: "a", name: "Onderhoud" },
    { id: "b", name: "Vervanging" },
  ];
  eq("een bestaand label wordt hergebruikt", vindLabel(labels, "ONDERHOUD")?.id ?? "geen", "a");
  ok("een nieuw label wordt niet verzonnen", vindLabel(labels, "Storing") === null);
});

group("het uitklapmenu staat op alfabet", () => {
  const gesorteerd = sorteerLabels([
    { id: "1", name: "vervanging" },
    { id: "2", name: "Onderhoud" },
    { id: "3", name: "Advies" },
  ]);
  eq("op alfabet, hoofdletters tellen niet mee", gesorteerd.map((l) => l.name).join(", "), "Advies, Onderhoud, vervanging");
});

group("een label uit het adres wordt gewantrouwd", () => {
  const labels = [{ id: "abc", name: "Onderhoud" }];
  eq("een bekend label mag", leesLabelfilter("abc", labels), "abc");
  eq("zonder label ook", leesLabelfilter(LABELFILTER_GEEN, labels), LABELFILTER_GEEN);
  // ⚠️ Een label-id van een ander merk zou anders een leeg scherm geven zonder
  // uitleg, en dat leest als "mijn clusters zijn weg".
  eq("een onbekend label valt terug op alles", leesLabelfilter("van-een-ander-merk", labels), LABELFILTER_ALLES);
  eq("geen label in het adres is alles", leesLabelfilter(undefined, labels), LABELFILTER_ALLES);
});

group("filteren toont precies de clusters van dat label", () => {
  const clusters = [
    { id: "1", label_id: "a" },
    { id: "2", label_id: "b" },
    { id: "3", label_id: null },
    { id: "4", label_id: "a" },
  ];
  eq("alles laat alles staan", filterOpLabel(clusters, LABELFILTER_ALLES).length.toString(), "4");
  eq("één label toont er twee", filterOpLabel(clusters, "a").map((c) => c.id).join(","), "1,4");
  // Zonder deze stand is cluster 3 nergens meer te vinden zodra er labels zijn.
  eq("zonder label toont er één", filterOpLabel(clusters, LABELFILTER_GEEN).map((c) => c.id).join(","), "3");

  const telling = telPerLabel(clusters);
  eq2("label a heeft er twee", telling.perLabel.a, 2);
  eq2("label b heeft er één", telling.perLabel.b, 1);
  eq2("en er is er één zonder label", telling.zonderLabel, 1);
});

group("een status uit het adres wordt gewantrouwd (22 september 2026)", () => {
  eq("een bekende status mag", leesStatusfilter("concept_klaar"), "concept_klaar");
  // ⚠️ Een onbekende waarde zou anders een leeg scherm geven zonder uitleg,
  // en dat leest als "mijn clusters zijn weg" (zelfde reden als het labelfilter).
  eq("een onbekende status valt terug op alles", leesStatusfilter("verzonnen"), STATUSFILTER_ALLES);
  eq("niets in het adres is ook alles", leesStatusfilter(undefined), STATUSFILTER_ALLES);
});

group("filteren op status toont precies die clusters", () => {
  const clusters = [
    { id: "1", status: "concept_klaar" as const },
    { id: "2", status: "meten" as const },
    { id: "3", status: "gereed" as const },
    { id: "4", status: "concept_klaar" as const },
  ];
  eq("alles laat alles staan", filterOpStatus(clusters, STATUSFILTER_ALLES).length.toString(), "4");
  eq(
    "wacht op mijn goedkeuring toont er twee",
    filterOpStatus(clusters, "concept_klaar").map((c) => c.id).join(","),
    "1,4",
  );

  const telling = telPerStatus(clusters);
  eq2("concept_klaar heeft er twee", telling.concept_klaar, 2);
  eq2("meten heeft er één", telling.meten, 1);
});

group("de prullenbak stopt de metingen, en dat staat in de code", () => {
  // ⚠️ Dit is de belofte van de knop. Zou `activeOnly()` uit de maandronde
  // verdwijnen, dan blijft een weggehaald cluster elke maand geld kosten
  // zonder dat iemand het ziet: de uitkomst staat in geen enkele lijst.
  const cron = leesBestand("app/api/cron/tracking/route.ts");
  ok("de maandronde slaat gearchiveerde clusters over", cron.includes("activeOnly("));

  const route = leesBestand("app/api/analyses/[id]/archief/route.ts");
  ok("de prullenbakroute controleert het eigenaarschap", route.includes("getOwnedAnalysis"));
  ok("en schrijft via de service-role", route.includes("createAdminClient"));
  // Archiveren en niet verwijderen: onder een cluster hangt maanden meetdata
  // die alleen terugkomt door er opnieuw voor te betalen (migratie 0044).
  ok("de prullenbak archiveert en verwijdert niet", route.includes("archived_at") && !route.includes(".delete("));
  ok("en terugzetten kan ook", route.includes("archived_at: body.archived ?"));

  // Het label mag nooit een cluster van een ander merk oppikken.
  const patch = leesBestand("app/api/analyses/[id]/route.ts");
  ok("een label moet bij hetzelfde merk horen", patch.includes('.eq("profile_id", analysis.profile_id)'));
  const labels = leesBestand("app/api/profiles/[id]/labels/route.ts");
  ok("de labelroute controleert het eigenaarschap", labels.includes("getOwnedProfile"));
});

group("een label hernoemen raakt één rij, weggooien raakt geen cluster", () => {
  const beheer = leesBestand("app/api/profiles/[id]/labels/[labelId]/route.ts");
  ok("hernoemen kan", beheer.includes("export async function PATCH"));
  ok("weggooien kan", beheer.includes("export async function DELETE"));
  ok("allebei via het eigen merk", beheer.includes("getOwnedProfile"));
  // ⚠️ Zonder het merk IN de query kan iemand met twee merken een label-id van
  // merk B meesturen op het adres van merk A.
  ok("het merk staat in de query", beheer.includes('.eq("profile_id", profileId)'));
  // Hernoemen is één update op `cluster_labels`, nooit een ronde langs de
  // clusters: die wijzen naar het id en verhuizen vanzelf mee.
  ok("hernoemen raakt de clusters niet aan", !beheer.includes('from("analyses")'));

  // De belofte van de bevestiging: geen cluster gaat mee. Dat is `on delete set
  // null` in migratie 0083, en die vorm hoort er te blijven staan.
  const migratie = leesBestand("supabase/migrations/0083_clusterlabels.sql");
  ok(
    "een label weggooien laat de clusters staan",
    migratie.includes("references public.cluster_labels (id) on delete set null"),
  );

  const paneel = leesBestand("app/(app)/merk/[id]/strategie/clusters/label-beheer.tsx");
  ok("de bevestiging zegt dat de clusters blijven staan", paneel.includes("blijven gewoon staan"));
  // Wél terug te draaien, dus niet in het rode kader dat zegt van niet.
  ok("en gebruikt het onomkeerbaar-blok niet", !paneel.includes("irreversible={"));
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDe filterbalk van Analytics (plan analytics-herontwerp.md, F2)");

group("label beperkt de clusterlijst, cluster laat het label met rust", () => {
  const clusters = [
    { id: "1", name: "CV-ketel onderhoud", label_id: "a" },
    { id: "2", name: "CV-ketel vervangen", label_id: "a" },
    { id: "3", name: "Zonnepanelen", label_id: "b" },
    { id: "4", name: "Warmtepomp", label_id: null },
  ];

  eq(
    "een label beperkt de clusterlijst",
    clustersVoorFilter(clusters, "a").map((c) => c.id).join(","),
    "1,2",
  );
  // Zonder label is een gewone keuze, geen restcategorie.
  eq(
    "'zonder label' levert de clusters zonder label_id",
    clustersVoorFilter(clusters, LABELFILTER_GEEN).map((c) => c.id).join(","),
    "4",
  );
  eq(
    "alles laat alles staan",
    clustersVoorFilter(clusters, LABELFILTER_ALLES).map((c) => c.id).join(","),
    "1,2,3,4",
  );

  // Een cluster-keuze raakt het labelfilter zelf niet: dat zijn twee losse
  // URL-parameters, en `leesClusterfilter` leest alleen de clusterlijst die
  // het labelfilter al opleverde, hij verandert die niet.
  const bijLabelA = clustersVoorFilter(clusters, "a");
  eq("een geldig cluster binnen dat label mag", leesClusterfilter("2", bijLabelA), "2");
  eq(
    "een onbekende waarde in het adres valt terug op alles",
    leesClusterfilter("van-een-ander-merk", bijLabelA),
    CLUSTERFILTER_ALLES,
  );
  eq(
    "een cluster dat niet bij dit label hoort valt ook terug op alles",
    leesClusterfilter("3", bijLabelA),
    CLUSTERFILTER_ALLES,
  );
  eq("niets in het adres is ook alles", leesClusterfilter(undefined, bijLabelA), CLUSTERFILTER_ALLES);
});

group("funnel: alleen de fasen die voorkomen, en filteren op de gekozen fase", () => {
  const prompts = [
    { category: "Oriëntatie" },
    { category: "Overweging" },
    { category: "Overweging" },
  ];

  const fasen = beschikbareFunnelfasen(prompts);
  eq("alleen de fasen die voorkomen, in vaste volgorde", fasen.join(","), "Oriëntatie,Overweging");
  eq2("Beslissing komt niet voor, dus telt niet mee", fasen.includes("Beslissing") ? 1 : 0, 0);

  eq("een geldige fase blijft staan", leesFunnelfilter("Overweging", fasen), "Overweging");
  eq(
    "een onbekende waarde valt terug op alle fasen",
    leesFunnelfilter("van-een-ander-merk", fasen),
    FUNNELFILTER_ALLES,
  );
  eq("niets in het adres is ook alle fasen", leesFunnelfilter(undefined, fasen), FUNNELFILTER_ALLES);

  eq2("alle fasen laat alles staan", filterOpFunnel(prompts, FUNNELFILTER_ALLES).length, 3);
  eq2("een gekozen fase laat alleen die fase staan", filterOpFunnel(prompts, "Overweging").length, 2);
});

group("periode: onbekend valt terug op actueel, en per cluster de juiste stand", () => {
  const rijen = [
    { analysis_id: "1", computed_at: "2026-07-01T09:00:00Z" },
    { analysis_id: "1", computed_at: "2026-08-01T09:00:00Z" },
    { analysis_id: "2", computed_at: "2026-08-02T09:00:00Z" },
  ];

  const periodes = bepaalPeriodes(rijen);
  eq("elke meetdatum wordt één periode", periodes.length.toString(), "3");
  eq("nieuwste eerst", periodes[0].id, "2026-08-02");

  eq(
    "een bekende datum mag",
    leesPeriodefilter("2026-07-01", periodes),
    "2026-07-01",
  );
  eq(
    "een onbekende datum valt terug op actueel",
    leesPeriodefilter("2099-01-01", periodes),
    PERIODEFILTER_ACTUEEL,
  );

  // Bij "actueel" krijgt elk cluster zijn nieuwste rij.
  const actueel = selecteerPerCluster(rijen, PERIODEFILTER_ACTUEEL);
  eq(
    "actueel neemt de nieuwste van elk cluster",
    actueel.map((r) => r.computed_at).sort().join(","),
    "2026-08-01T09:00:00Z,2026-08-02T09:00:00Z",
  );

  // Bij een gekozen periode: de laatste rij op of vóór die datum, nooit een
  // latere. Cluster 2 heeft dan nog niets, en levert dus niets op (conventie
  // 3: geen terugval op de nieuwste, dat zou een meting van later tonen als
  // een stand van toen).
  const opJuli = selecteerPerCluster(rijen, "2026-07-01");
  eq2("op de datum van juli doet alleen cluster 1 mee", opJuli.length, 1);
  eq("en dat is de meting van juli, niet die van augustus", opJuli[0].computed_at, "2026-07-01T09:00:00Z");
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nDubbele vragen over de funnelfasen heen (herstelplan na audit T8.1)");

group("duplicatePromptIds: de oudste blijft, latere duplicaten gaan weg", () => {
  const r = (id: string, text: string, createdAt: string) => ({ id, text, createdAt });

  ok("geen vragen, geen duplicaten", duplicatePromptIds([]).length === 0);
  ok(
    "verschillende vragen blijven allemaal staan",
    duplicatePromptIds([
      r("1", "Wat kost een cv-ketel onderhoud?", "2026-09-01T10:00:00Z"),
      r("2", "Hoe vaak moet een cv-ketel onderhouden worden?", "2026-09-01T10:00:01Z"),
    ]).length === 0,
  );

  // ⚠️ Het echte geval: dertig vragen over drie funnelfasen, twee daarvan
  // letterlijk identiek maar in een andere fase gegenereerd (dus met een later
  // tijdstip, want de fasen draaien parallel maar ronden niet gelijktijdig af).
  const dubbel = duplicatePromptIds([
    r("orientatie-1", "Wat kost cv-ketel onderhoud?", "2026-09-01T10:00:00Z"),
    r("overweging-1", "Wat kost cv-ketel onderhoud?", "2026-09-01T10:00:03Z"),
  ]);
  ok("de latere van de twee identieke vragen gaat weg", dubbel.length === 1 && dubbel[0] === "overweging-1");

  ok(
    "hoofdletters en spaties maken geen verschil",
    duplicatePromptIds([
      r("1", "Wat kost cv-ketel onderhoud?", "2026-09-01T10:00:00Z"),
      r("2", "  wat KOST cv-ketel onderhoud? ", "2026-09-01T10:00:02Z"),
    ]).length === 1,
  );

  // Drie identieke vragen: alleen de oudste blijft, de andere twee gaan weg.
  const drieDubbel = duplicatePromptIds([
    r("a", "Welke aanbieder is het beste?", "2026-09-01T10:00:02Z"),
    r("b", "Welke aanbieder is het beste?", "2026-09-01T10:00:00Z"),
    r("c", "Welke aanbieder is het beste?", "2026-09-01T10:00:01Z"),
  ]);
  ok("de oudste (b) blijft, a en c gaan weg", drieDubbel.length === 2 && !drieDubbel.includes("b"));
});

// Herstelplan na audit T8.2: een vraag wijzigen of verwijderen tijdens een
// lopende meting gaf een 200. Route-logica met `getUser()`/cookies is hier
// niet los te draaien (zelfde reden als T3.1/T3.3), dus gelezen als bedrading.
group("een vraag wijzigen of verwijderen terwijl de meting loopt wordt geweigerd (T8.2)", () => {
  const route = leesBestand("app/api/analyses/[id]/prompts/[promptId]/route.ts");
  const patchStart = route.indexOf("export async function PATCH");
  const deleteStart = route.indexOf("export async function DELETE");
  ok("PATCH bestaat", patchStart >= 0);
  ok("DELETE bestaat", deleteStart >= 0);

  const patchBody = route.slice(patchStart, deleteStart);
  const deleteBody = route.slice(deleteStart);
  ok("PATCH weigert zolang de analyse op 'meten' staat", patchBody.includes('owned.status === "meten"'));
  ok(
    "en dat gebeurt vóór de eigenlijke update",
    patchBody.indexOf('owned.status === "meten"') < patchBody.indexOf('.from("prompts").update('),
  );
  ok("DELETE weigert hetzelfde", deleteBody.includes('owned.status === "meten"'));
  ok(
    "en dat gebeurt vóór de eigenlijke delete",
    deleteBody.indexOf('owned.status === "meten"') < deleteBody.indexOf('.from("prompts").delete('),
  );
});

// Herstelplan na audit T8.3: na één onboarding stonden er negen concurrenten
// in het profiel waarvan er vier dubbel waren, telkens dezelfde naam met en
// zonder plaatsnaam erachter.
group("concurrentnamen ontdubbelen op meer dan de exacte tekst (T8.3)", () => {
  ok("lege lijst blijft leeg", dedupeCompetitorNames([]).length === 0);
  ok(
    "verschillende namen blijven allemaal staan",
    dedupeCompetitorNames(["Dental4U", "MondCleanic", "De Voorstraat"]).length === 3,
  );

  // Het echte geval uit de audit.
  const namen = dedupeCompetitorNames([
    "Cleyburch Tandartsen",
    "Dental4U",
    "MondCleanic",
    "De Voorstraat",
    "Cleyburch Tandartsen in Noordwijk",
    "Dental4U in Noordwijk",
    "MondCleanic in Noordwijk",
    "De Voorstraat in Noordwijk",
    "Praktijk Verweij",
  ]);
  ok("van negen blijven er vijf over", namen.length === 5, String(namen.length));
  ok("de generieke naam blijft, niet de vorm met plaatsnaam", namen.includes("Cleyburch Tandartsen"));
  ok("de vorm met plaatsnaam is weg", !namen.includes("Cleyburch Tandartsen in Noordwijk"));
  ok("een naam zonder tegenhanger blijft gewoon staan", namen.includes("Praktijk Verweij"));

  // Volgorde van aanleveren maakt niet uit: staat de lange vorm eerst, dan
  // wint de korte vorm alsnog.
  const omgekeerd = dedupeCompetitorNames(["Dental4U in Noordwijk", "Dental4U"]);
  ok("de korte vorm wint ook als hij als tweede komt", omgekeerd[0] === "Dental4U");

  ok(
    "lege en dubbel witruimte tellen niet als aparte naam",
    dedupeCompetitorNames(["Dental4U", "  Dental4U  ", "", "   "]).length === 1,
  );
});

// Herstelplan na audit T8.5: htmlToText() decodeerde zes namen en geen enkele
// numerieke code. Op productie: 76 van de 790 gecrawlde pagina's bleven met
// een letterlijke entiteit zitten, ook in evidence_quote.
group("htmlToText decodeert meer dan zes entiteiten (T8.5)", () => {
  ok("de zes bestaande namen blijven werken", htmlToText("Tom &amp; Jerry") === "Tom & Jerry");
  ok(
    "het echte geval: een typografisch aanhalingsteken, numeriek gecodeerd",
    htmlToText("Hij zei &#8220;ja&#8221;.") === "Hij zei “ja”.",
  );
  ok("numerieke entiteiten in hex ook", htmlToText("&#x20AC;100") === "€100");
  ok("de veelgebruikte typografische namen", htmlToText("wachten&hellip;") === "wachten…");
  ok("een gedachtestreepje uit de bron blijft een teken, geen entiteit", htmlToText("2020&mdash;2024") === "2020—2024");
  ok(
    "een onzinnig hoge codepoint crasht niet en levert geen teken op",
    htmlToText("voor&#99999999;na") === "voorna",
  );
  ok("gewone tekst blijft ongemoeid", htmlToText("<p>Gewoon een zin.</p>") === "Gewoon een zin.");
});

// Herstelplan na audit T8.7: een merk waarvan de site niet te crawlen was
// kreeg status 'klaar' met nul gecrawlde pagina's, terwijl het profiel er
// gevuld uitzag. Gevaarlijkste vorm: een consultant die dit vóór een
// demogesprek klaarzet, ziet "klaar" en kijkt niet verder.
group("een leeg merk heet niet zomaar 'klaar' (T8.7)", () => {
  const merken = [
    { id: "a", status: "klaar" as const },
    { id: "b", status: "klaar" as const },
    { id: "c", status: "bezig" as const },
    { id: "d", status: "mislukt" as const },
  ];

  const metenPagina = new Map([
    ["a", 42],
    // "b" ontbreekt bewust: nul pagina's, net als de echte bug.
  ]);
  const leeg = identifyEmptyProfiles(merken, metenPagina);
  ok("merk b (klaar, nul pagina's) wordt gemeld", leeg.has("b"));
  ok("merk a (klaar, wél pagina's) niet", !leeg.has("a"));
  ok(
    "merk c ('bezig', nog geen pagina's) niet: dat is normaal, geen bevinding",
    !leeg.has("c"),
  );
  ok("merk d ('mislukt') niet: dat heeft al zijn eigen melding", !leeg.has("d"));
});

// Herstelplan na audit T8.9: PATCH /api/profiles/[id]/facts en de "Werk"-tab
// stuurden de volledige databaserij van een feitenvraag terug, inclusief
// raw_json (het complete ruwe antwoord van OpenAI, met het antwoord-id).
group("publicFactRequest houdt raw_json buiten de browser (T8.9)", () => {
  const rij = {
    id: "f1",
    profile_id: "p1",
    analysis_id: null,
    question: "In welk jaar opgericht?",
    reason: "de tekst noemt het",
    answer: "1998",
    status: "beantwoord",
    answered_at: "2026-09-02T10:00:00Z",
    created_at: "2026-09-01T10:00:00Z",
    scope: "merk",
    // Het echte geval: geen klein herkomst-object, maar het volledige
    // OpenAI-antwoord.
    raw_json: {
      id: "resp_086925cedc1a38c5006a9845a71cf087d1ab2e2027a0772c74",
      model: "gpt-5.6-luna",
      output: [{ type: "message", content: [{ text: "1998" }] }],
    },
    section_id: "oud-en-ongebruikt",
    section_refs: ["stuk-1:s3"],
  };

  const veilig = publicFactRequest(rij);
  ok("raw_json is weg", !("raw_json" in veilig));
  ok("section_id is weg", !("section_id" in veilig));
  ok("section_refs is weg", !("section_refs" in veilig));
  ok("het antwoord blijft staan", veilig.answer === "1998");
  ok("de vraag blijft staan", veilig.question === "In welk jaar opgericht?");
  ok("de status blijft staan", veilig.status === "beantwoord");
  ok(
    "geen spoor van het OpenAI-antwoord-id in de JSON-serialisatie",
    !JSON.stringify(veilig).includes("resp_086925cedc1a38c5006a9845a71cf087d1ab2e2027a0772c74"),
  );
});

// Herstelplan na audit T8.11: de tabel rate_limits bestond, was leeg, en het
// woord kwam in de hele code niet voor. Inloggen en een uitnodiging
// verzilveren waren onbegrensd.
group("rateLimitWindowStart en rateLimitVerdict (T8.11)", () => {
  const vensterMs = 15 * 60 * 1000;
  const t1 = new Date("2026-09-02T10:07:00Z");
  const t2 = new Date("2026-09-02T10:14:59Z");
  const t3 = new Date("2026-09-02T10:15:00Z");
  ok(
    "twee momenten in hetzelfde kwartier vallen in hetzelfde venster",
    rateLimitWindowStart(t1, vensterMs).getTime() === rateLimitWindowStart(t2, vensterMs).getTime(),
  );
  ok(
    "het volgende kwartier is een nieuw venster",
    rateLimitWindowStart(t1, vensterMs).getTime() !== rateLimitWindowStart(t3, vensterMs).getTime(),
  );
  ok(
    "het venster begint op een veelvoud van de vensterduur",
    rateLimitWindowStart(t1, vensterMs).getTime() % vensterMs === 0,
  );

  const windowStart = rateLimitWindowStart(t1, vensterMs);
  ok("onder het plafond mag door", rateLimitVerdict(5, 10, windowStart, vensterMs).ok);
  ok("precies op het plafond mag nog net", rateLimitVerdict(10, 10, windowStart, vensterMs).ok);
  ok("erover blokkeert", !rateLimitVerdict(11, 10, windowStart, vensterMs).ok);
  ok(
    "het venster gaat weer open na de vensterduur",
    rateLimitVerdict(11, 10, windowStart, vensterMs).resetAt.getTime() ===
      windowStart.getTime() + vensterMs,
  );
});

group("inloggen en een uitnodiging verzilveren zijn begrensd (T8.11)", () => {
  const login = leesBestand("app/(auth)/actions.ts");
  ok("inloggen roept de snelheidsbegrenzing aan", login.includes("hitRateLimit("));
  ok(
    "en dat gebeurt vóórdat het wachtwoord gecontroleerd wordt",
    login.indexOf("hitRateLimit(") < login.indexOf("signInWithPassword("),
  );
  ok("zowel per e-mailadres als per IP-adres", login.includes("login:e:") && login.includes("login:ip:"));

  const invite = leesBestand("app/api/invites/accept/route.ts");
  ok("het verzilveren van een uitnodiging roept de snelheidsbegrenzing aan", invite.includes("hitRateLimit("));
  ok(
    "en dat gebeurt vóórdat de token gecontroleerd wordt",
    invite.indexOf("hitRateLimit(") < invite.indexOf("await acceptInvite("),
  );
});

// ── De vloeiende lijn in de grafieken ───────────────────────────────────────
//
// Waarom dit getest wordt en niet alleen bekeken: de reden om monotone
// interpolatie te nemen in plaats van een gewone spline is dat een gewone
// spline doorschiet, en doorschieten is op deze grafieken een verkeerd getal
// tekenen (zichtbaarheid boven de 100, of een daling in een week waarin niets
// daalde). Dat is met het oog niet betrouwbaar te controleren: een bult van
// twee pixels zie je niet en hij liegt wel.
//
// Elke controle hieronder loopt over de kromme heen door hem in stapjes uit te
// rekenen, en kijkt dan naar de uiterste waarden. Zonder dat kun je alleen de
// stuurpunten controleren, en die liggen per definitie buiten de kromme.

/** Rekent de punten van een Bézier-pad uit, zodat je ertussen kunt kijken. */
function padWaarden(d: string, stappen = 40): { x: number; y: number }[] {
  const getallen = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const uit: { x: number; y: number }[] = [];
  // Het pad is "M x,y" gevolgd door groepjes van zes getallen per C-segment.
  let px = getallen[0];
  let py = getallen[1];
  for (let i = 2; i + 5 < getallen.length; i += 6) {
    const [c1x, c1y, c2x, c2y, qx, qy] = getallen.slice(i, i + 6);
    for (let s = 0; s <= stappen; s++) {
      const t = s / stappen;
      const u = 1 - t;
      uit.push({
        x: u * u * u * px + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * qx,
        y: u * u * u * py + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * qy,
      });
    }
    px = qx;
    py = qy;
  }
  return uit;
}

group("de vloeiende lijn in de grafieken", () => {
  ok("nul punten geeft een leeg pad", vloeiendPad([]) === "");
  ok("één punt geeft alleen het beginpunt", vloeiendPad([{ x: 0, y: 5 }]) === "M0.0,5.0");
  ok(
    "twee punten geven een rechte lijn, geen kromme",
    vloeiendPad([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]) === "M0.0,0.0 L10.0,10.0",
  );

  // ⚠️ DE KERNCONTROLE. Een Catmull-Rom-spline zwiept hier boven de 95 uit; op
  // een zichtbaarheidsgrafiek van 0 tot 100 is dat een percentage tekenen dat
  // niet bestaat.
  const sprong = [
    { x: 0, y: 40 },
    { x: 1, y: 95 },
    { x: 2, y: 90 },
    { x: 3, y: 92 },
  ];
  const waarden = padWaarden(vloeiendPad(sprong)).map((p) => p.y);
  ok(
    "de kromme komt nooit boven de hoogste meting uit",
    Math.max(...waarden) <= 95 + 1e-6,
    `hoogste punt op de lijn: ${Math.max(...waarden).toFixed(2)}`,
  );
  ok(
    "en nooit onder de laagste",
    Math.min(...waarden) >= 40 - 1e-6,
    `laagste punt op de lijn: ${Math.min(...waarden).toFixed(2)}`,
  );

  // Een vlak stuk blijft vlak: tussen twee gelijke metingen hoort geen bult of
  // kuil te ontstaan, want er is niets veranderd en de grafiek zegt dat dan ook.
  const vlak = padWaarden(
    vloeiendPad([
      { x: 0, y: 20 },
      { x: 1, y: 60 },
      { x: 2, y: 60 },
      { x: 3, y: 10 },
    ]),
  ).filter((p) => p.x >= 1 && p.x <= 2);
  ok(
    "tussen twee gelijke metingen blijft de lijn vlak",
    vlak.every((p) => Math.abs(p.y - 60) < 0.05),
    `grootste afwijking: ${Math.max(...vlak.map((p) => Math.abs(p.y - 60))).toFixed(3)}`,
  );

  // Een stijgende reeks mag nergens dalen. Dat is wat "monotoon" betekent, en
  // het is het verschil tussen een ronding en een verzonnen dip.
  const klim = padWaarden(
    vloeiendPad([
      { x: 0, y: 10 },
      { x: 1, y: 12 },
      { x: 2, y: 70 },
      { x: 3, y: 72 },
    ]),
  );
  let daalt = false;
  for (let i = 1; i < klim.length; i++) if (klim[i].y < klim[i - 1].y - 1e-6) daalt = true;
  ok("een lijn die alleen maar stijgt, daalt nergens", !daalt);

  // De lijn gaat door de metingen heen en niet er langs: de stippen op de
  // grafiek staan op de echte waarden, dus de lijn moet ze raken.
  const pad = vloeiendPad(sprong);
  ok("de lijn raakt elke meting", sprong.every((p) => pad.includes(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)));

  // De onderrand van de onzekerheidsband loopt terug en moet aan de bovenrand
  // vastzitten: begint hij met een M, dan wordt het een tweede losse vorm en
  // valt de band uit elkaar.
  const terug = vloeiendPadTerug(sprong);
  ok("de terugweg van de band sluit aan en begint niet opnieuw", terug.startsWith("L"));
  ok("en hij begint bij de laatste meting", terug.startsWith("L3.0,92.0"));

  // Twee metingen op hetzelfde moment horen niet voor te komen, maar ze mogen
  // de grafiek niet stukmaken: delen door nul geeft NaN, en een pad met NaN
  // erin tekent helemaal niets meer.
  ok(
    "dubbele meetmomenten geven geen kapot pad",
    !vloeiendPad([
      { x: 0, y: 10 },
      { x: 0, y: 20 },
      { x: 1, y: 30 },
    ]).includes("NaN"),
  );
});

// ════════════════════════════════════════════════════════════════════════════
console.log("\nExpertronde 4 september 2026: blok A, de tegenstrijdigheden");

// ════════════════════════════════════════════════════════════════════════════
console.log("\nExpertronde 4 september 2026: blok B, de schrijfopdracht");
// (optimalisatie 5, 6, 7 en 12, migratie 0094)
// ════════════════════════════════════════════════════════════════════════════

const heleOpdracht = {
  lezer: "Iemand met water door zijn plafond die vandaag hulp zoekt",
  hoofdvraag: "Kan er vandaag iemand komen en wat kost dat?",
  kernantwoord: "Wij zijn er binnen 24 uur en u hoort het bedrag voordat wij beginnen",
  waaromDezePagina: "De assistent noemt bij deze vraag alleen andere partijen.",
  kernfeiten: ["F2", "F3", "F7"],
  keuzeredenen: [{ factRef: "F2", reden: "deze lezer heeft haast en wij komen binnen 24 uur" }],
  eigenWoorden: "Over houtrot werken we niet heen, want dan kunnen we onze garantie niet waarmaken.",
  moetErIn: ["het bedrag vooraf"],
  nietDoen: ["geen checklist om dakdekkers te vergelijken"],
  blijftHangen: "dit bedrijf begrijpt mijn situatie en komt vandaag",
};

// ════════════════════════════════════════════════════════════════════════════
console.log("\nExpertronde 4 september 2026: blok C, verhaal, FAQ en lezer");

// ── Eén feitenvraag, één model (16 september 2026) ──────────────────────────
console.log("\nDe feitenvraag, op elk scherm hetzelfde");

group("het invoerveld hoort bij de vraag", () => {
  // ── WAT HIER MIS WAS ─────────────────────────────────────────────────────
  //
  // Dezelfde rij uit `fact_requests` kreeg op de briefing een ja-of-nee-keuze
  // en op "Openstaande vragen" een leeg tekstvak van drie regels. Een vraag van
  // één klik kostte daar dus een getypt antwoord, en dat bepaalt of iemand hem
  // beantwoordt.
  ok("ja of nee wordt een keuze", vraagVorm({ answer_type: "ja_nee" }).vorm === "keuze");
  ok(
    "met twee knoppen",
    vraagVorm({ answer_type: "ja_nee" }).keuzes.join("/") === "Ja/Nee",
  );
  ok(
    "een keuzevraag gebruikt zijn eigen opties",
    vraagVorm({ answer_type: "keuze", options: ["Wel", "Niet"] }).keuzes.join("/") === "Wel/Niet",
  );
  ok("een lijst krijgt een tekstvak", vraagVorm({ answer_type: "lijst" }).vorm === "tekstvak");
  ok("met een hint erin", vraagVorm({ answer_type: "lijst" }).hint === "Eén per regel");
  ok("een bedrag krijgt zijn eigen veld", vraagVorm({ answer_type: "bedrag" }).vorm === "bedrag");
  ok("een url ook", vraagVorm({ answer_type: "url" }).vorm === "url");

  // ⚠️ Conventie 3. Een keuzelijst zonder opties is een vraag die je niet kúnt
  // beantwoorden; een tekstvak is hooguit onhandig. Rijen van vóór migratie
  // 0024 hebben de kolom niet.
  ok("een keuze zonder opties valt terug", vraagVorm({ answer_type: "keuze", options: [] }).vorm !== "keuze");
  ok("een lege optie telt niet mee", vraagVorm({ answer_type: "keuze", options: ["  "] }).vorm !== "keuze");
  ok("geen type valt terug op een regel", vraagVorm({}).vorm === "regel");
  ok("een onbekend type ook", vraagVorm({ answer_type: "iets_nieuws" }).vorm === "regel");
});

group("de kopjes en de volgorde staan op één plek", () => {
  ok("elke soort heeft een kop", VRAAGSOORT_VOLGORDE.every((k) => vraagsoortKop(k) !== null));
  ok("zonder soort geen kop", vraagsoortKop(null) === null);
  ok("een onbekende soort ook niet", vraagsoortKop("verzonnen") === null);
  // De klant leest geen categorieënmodel, hij leest een vraag van zijn
  // leverancier. Dat geldt voor de vijf soorten met een jargonnaam; "praktisch"
  // is al gewoon Nederlands en heet daarom wél zo.
  const jargon = ["verificatie", "aanvulling", "onderscheid", "bewijs", "grenzen"];
  ok(
    "geen enkel jargonwoord staat in zijn eigen kop",
    jargon.every((k) => !vraagsoortKop(k)!.titel.toLowerCase().includes(k)),
  );
  ok(
    "en elke kop legt uit waarom de vraag gesteld wordt",
    VRAAGSOORT_VOLGORDE.every((k) => vraagsoortKop(k)!.uitleg.trim().length > 25),
  );

  // De volgorde is overgenomen uit het scherm dat al bij klanten draait en met
  // opzet niet "verbeterd".
  ok("verificatie eerst", VRAAGSOORT_VOLGORDE[0] === "verificatie");
  ok("onderscheid daarna", VRAAGSOORT_VOLGORDE[1] === "onderscheid");
  ok("grenzen achteraan", VRAAGSOORT_VOLGORDE[VRAAGSOORT_VOLGORDE.length - 1] === "grenzen");

  const groepen = groepeerOpSoort([
    { kind: "grenzen" },
    { kind: "verificatie" },
    { kind: null },
    { kind: "onderscheid" },
  ]);
  ok("gegroepeerd in de vaste volgorde", groepen.map((g) => g.kind).join(" ") === "verificatie onderscheid grenzen ");
  ok("en wat geen soort heeft, staat achteraan", groepen[groepen.length - 1].kind === "");
  ok("zonder kop", groepen[groepen.length - 1].kop === null);
  ok("een lege lijst geeft geen groepen", groepeerOpSoort([]).length === 0);
});

group("het ruwe AI-antwoord bereikt de browser niet", () => {
  // Herstelplan na audit T8.9. Twee paden waren gerepareerd, dit derde niet:
  // `loadOpenQuestions` deed `select("*")` en die rij ging als prop naar een
  // clientcomponent. De schoonmaak staat nu in de loader, zodat elke volgende
  // lezer hem vanzelf krijgt.
  const loader = leesBestand("lib/open-questions.ts");
  ok("de loader schoont de rijen op", loader.includes("publicFactRequest"));

  const schoon = publicFactRequest({
    id: "f1",
    question: "Hoeveel monteurs heb je?",
    raw_json: { antwoord: "het complete OpenAI-antwoord" },
    section_id: "s1",
    section_refs: ["a"],
    kind: "bewijs",
    answer_type: "getal",
  }) as unknown as Record<string, unknown>;
  ok("raw_json gaat eruit", !("raw_json" in schoon));
  ok("section_id ook", !("section_id" in schoon));
  // En wat het scherm nodig heeft, blijft staan: anders zou de schoonmaak de
  // vraagvorm slopen die hierboven net getest is.
  ok("de vraagsoort blijft", schoon.kind === "bewijs");
  ok("het antwoordtype blijft", schoon.answer_type === "getal");
});

// ── Eén bibliotheek in plaats van twee (16 september 2026) ──────────────────
console.log("\nEén bibliotheek");

group("de bibliotheek per cluster is een doorverwijzing geworden", () => {
  // ── WAT HIER MIS WAS ─────────────────────────────────────────────────────
  //
  // Twee lijsten over dezelfde rijen: een per cluster en een merkbrede. Een
  // klant met vier clusters had er vijf, met twee weergaven, twee manieren om
  // te filteren en twee tellingen die gelijk hoorden te zijn zonder dat iets
  // dat afdwong. De merkbrede kan alles wat de andere kon, plus zoeken,
  // paginering en kerncijfers.
  const cluster = leesBestand("app/(app)/analyses/[id]/bibliotheek/page.tsx");
  ok("hij verwijst door", cluster.includes("redirect("));
  ok("naar de merkbrede, met dit cluster als filter", cluster.includes("strategie/bibliotheek?cluster="));
  ok("en toont zelf geen lijst meer", !cluster.includes("LibraryList"));

  // Het oude detailscherm onder het cluster is weg (contentketen-opnieuw.md WP1):
  // een pagina heeft één scherm, onder de merkbrede bibliotheek.
  ok(
    "de oude detailpagina onder het cluster is weg",
    !bestaatBestand("app/(app)/analyses/[id]/bibliotheek/[pieceId]/page.tsx"),
  );
  // De oude lijstweergave hoort weg te zijn: code die nergens meer vandaan
  // wordt aangeroepen, gaat stil uit de pas lopen met de weergave die wél
  // gebruikt wordt.
  ok(
    "de oude lijstweergave is opgeruimd",
    !bestaatBestand("app/(app)/analyses/[id]/bibliotheek/library-list.tsx"),
  );

  const merk = leesBestand("app/(app)/merk/[id]/strategie/bibliotheek/page.tsx");
  ok("de merkbrede leest het filter uit het adres", merk.includes("searchParams"));
  ok("en geeft het door aan de weergave", merk.includes("beginCluster"));

  // Een adres met een onbekend cluster-id mag geen lege lijst opleveren: dat is
  // verwarrender dan geen filter (conventie 3).
  ok("een onbekend cluster valt terug op alles", merk.includes("rows.some("));

  // En het scherm dat de klant uitlegt hoe het werkt, mag niet meer over twee
  // bibliotheken praten (CLAUDE.md: nooit schrijven dat iets kan wat er niet is).
  const support = leesBestand("app/(app)/support/page.tsx");
  ok("de uitleg noemt er nog maar één", !support.includes("eigen, kleinere bibliotheek"));
});

// ── Een cluster starten is beheerderswerk (16 september 2026) ───────────────
console.log("\nWie begint een cluster");

group("elke dure route heeft dezelfde rem", () => {
  // ── WAT HIER MIS WAS ─────────────────────────────────────────────────────
  //
  // `lib/cost-rules.ts` schrijft in zijn eigen toelichting dat "POST
  // /api/profiles en POST /api/analyses allebei een 201 gaven" en dat de
  // eigenaar dat op 2 september 2026 heeft teruggedraaid. Bij /api/profiles is
  // die rem er die dag gekomen, bij /api/analyses niet: dat was op 16 september
  // 2026 de enige dure route zonder `mayTriggerCost`. Een klant kon er via het
  // vrije tekstveld betaald onderzoek mee starten, terwijl hetzelfde onderwerp
  // via het snelpad netjes werd geweigerd.
  //
  // Deze controle bewaakt de belofte van `cost-guard.ts` ("elke dure route
  // stelt dezelfde vraag aan dezelfde functie") in plaats van hem te geloven.
  const dureRoutes = [
    "app/api/analyses/route.ts",
    "app/api/profiles/route.ts",
    "app/api/analyses/[id]/measure/route.ts",
    "app/api/profiles/[id]/topics/route.ts",
    "app/api/profiles/[id]/reputation/route.ts",
  ];
  const zonderRem = dureRoutes.filter((pad) => !leesBestand(pad).includes("mayTriggerCost"));
  ok("elke dure route vraagt het aan cost-guard", zonderRem.length === 0, zonderRem.join(", "));

  ok(
    "en een cluster starten staat op slot",
    STAFF_ONLY_ACTIONS.includes("analyse_starten"),
  );
});

group("een klant loopt niet tegen een knop die hem afwijst", () => {
  // De knoppen die naar /analyses/new wezen stonden bij een klant vol in beeld
  // en weigerden pas ná de klik. Op het lege clusterscherm verdwijnt die knop
  // in plaats van te weigeren.
  const topics = leesBestand("app/(app)/merk/[id]/_components/topics-panel.tsx");
  ok("het snelpad op het lege scherm toont de knop alleen aan de consultant", topics.includes("staff ? ("));
  ok(
    "en zegt de klant anders wie zijn onderwerpen klaarzet",
    topics.includes("consultant kiest samen met jou"),
  );

  // Een adres achter een verborgen knop is nog steeds een adres.
  const nieuw = leesBestand("app/(app)/analyses/new/page.tsx");
  ok("en de pagina zelf controleert het ook", nieuw.includes("isStaff") && nieuw.includes("notFound()"));

  // Sinds 21 september 2026 is "Nieuwe cluster" WEL zichtbaar voor de klant
  // (op verzoek van de eigenaar), maar leidt hij een klant nooit naar die
  // geblokkeerde route: `NieuweClusterKnop` beslist zelf, in de component en
  // niet op de pagina, of hij linkt (staff) of de uitleg toont (klant).
  const clusters = leesBestand("app/(app)/merk/[id]/strategie/clusters/page.tsx");
  ok(
    "het clusterscherm toont de knop aan iedereen",
    clusters.includes("<NieuweClusterKnop merkId={id} staff={staff} />"),
  );

  const knop = leesBestand("app/(app)/merk/[id]/strategie/clusters/nieuwe-cluster-knop.tsx");
  ok("de knop zelf linkt alleen voor staff naar /analyses/new", knop.includes('if (staff) {'));
  // Sinds de UX-audit van 23 september 2026 (P1.3) de melding van de
  // kostenpoort zelf, en niet meer de tekst van het lege scherm ("je eerste
  // onderwerpen"), die niet klopt voor een klant die al clusters heeft.
  ok(
    "en toont een klant de uitleg in plaats van te navigeren",
    knop.includes("COST_DENIED.analyse_starten"),
  );
  ok("die uitleg staat op één plek en wordt hier hergebruikt", knop.includes("lib/cost-rules"));
  ok("en de klantknop zegt dat het een aanvraag is", knop.includes("Nieuw cluster aanvragen"));
});

group("een merk zonder cluster overdragen wordt gemeld", () => {
  ok("met nul clusters komt er een waarschuwing", overdrachtZonderCluster(0) !== null);
  ok("met één cluster niet", overdrachtZonderCluster(1) === null);
  ok(
    "de waarschuwing zegt wat de klant zou zien",
    /leeg overzicht/.test(overdrachtZonderCluster(0) ?? ""),
  );
  ok(
    "en wat je eraan doet",
    /zet eerst/i.test(overdrachtZonderCluster(0) ?? ""),
  );

  const toewijzen = leesBestand("app/(app)/merk/[id]/admin/toewijzen/page.tsx");
  ok("het toewijzingsscherm toont hem", toewijzen.includes("overdrachtZonderCluster"));
});

// ── Een veld belooft nooit meer dan het doet (16 september 2026) ────────────
console.log("\nGeen veld belooft wat het niet doet");

group("omschrijving en gebruik spreken elkaar niet tegen", () => {
  // ── WAT HIER MIS GING ────────────────────────────────────────────────────
  //
  // `deal_value_band` had als omschrijving "Bepaalt hoe zwaar een onderwerp
  // meeweegt" en als gebruik "Wordt op dit moment nog niet meegewogen in de
  // app". Die twee regels staan pal onder elkaar op hetzelfde scherm
  // (`brand-field-input.tsx` toont eerst `description`, dan `usage`), dus de
  // consultant las een belofte met de ontkenning eronder. CLAUDE.md: schrijf
  // nooit dat iets al kan wat nog niet gebouwd is.
  //
  // Deze controle vangt precies dat geval: zegt het gebruik "nog niet", dan mag
  // de omschrijving geen werkwoord bevatten dat beweert dat de app er iets mee
  // doet. Het gaat om de belofte, niet om de formulering: een veld beschrijven
  // mag altijd, iets toezeggen niet.
  const beweert = /\b(bepaalt|stuurt|zorgt ervoor|wordt gebruikt|komt onder|weegt mee|verschijnt)\b/i;
  const nogNiet = /nog niet|nog geen lezer|niet meegewogen/i;

  const overtreders = BRAND_FIELDS.filter(
    (f) => nogNiet.test(f.usage) && beweert.test(f.description),
  ).map((f) => f.key);

  ok("geen enkel veld belooft wat zijn gebruik ontkent", overtreders.length === 0, overtreders.join(", "));

  // En het omgekeerde moet blijven bestaan: dat er velden ZIJN die eerlijk
  // zeggen dat ze nog geen lezer hebben. Verdwijnt die categorie, dan is de
  // controle hierboven stil nutteloos geworden.
  ok(
    "er zijn nog velden die eerlijk zeggen dat ze niet gebruikt worden",
    BRAND_FIELDS.some((f) => nogNiet.test(f.usage)),
  );
});

group("de waardeklasse is vastgelegd, niet aangesloten", () => {
  // De redenering staat in `commercial-context.ts`: de potentiescore is per
  // onderwerp en de waardeklasse per merk, dus een factor zou elk onderwerp van
  // een merk even hard verschuiven en de onderlinge volgorde niet veranderen.
  // Deze controle houdt vast dat het een besluit blijft en niet stil terugkeert.
  const potentie = leesBestand("lib/potential.ts");
  ok("de potentiescore leest de waardeklasse niet", !potentie.includes("deal_value_band"));
  const voorraad = leesBestand("lib/plan-backlog.ts");
  ok("de voorraadsortering evenmin", !voorraad.includes("deal_value_band"));

  const context = leesBestand("lib/pipeline/commercial-context.ts");
  ok(
    "en de reden staat uitgeschreven op één plek",
    context.includes("deal_value_band") && context.includes("per merk"),
  );
});

// ── De verkoopafspraak onder een account (16 september 2026) ────────────────
console.log("\nDe verkoopafspraak: pakket en startdatum");

group("het programma begint bij de toewijzing", () => {
  const nu = new Date("2026-09-16T10:00:00Z");
  ok("zonder startdatum wordt er een gezet", startdatumBijToewijzing(null, nu) === nu.toISOString());
  // ⚠️ De regel die ertoe doet: een klant die zijn tweede merk krijgt, begint
  // niet opnieuw. Zou dit overschrijven, dan springt zijn teller terug naar
  // maand 1 en daarmee elk cijfer dat "sinds de start" rekent.
  ok("een bestaande datum blijft staan", startdatumBijToewijzing("2026-03-01T00:00:00Z", nu) === null);
});

group("elk gat noemt wat de klant ervan merkt", () => {
  const leeg = afspraakGaten({ pakket: null, startdatum: null });
  ok("twee gaten", leeg.length === 2);
  ok("het pakket staat bovenaan", leeg[0].veld === "pakket");
  // Zwaar betekent hier: hoeveel de klant ervan merkt. Zonder pakket blokkeert
  // zijn contentplan, zonder startdatum blijft alleen een teller leeg.
  ok("en de startdatum eronder", leeg[1].veld === "startdatum");
  ok(
    "elk gat zegt het gevolg en niet alleen het veld",
    leeg.every((g) => g.gevolg.trim().length > 40),
  );
  ok("het gevolg van geen pakket is het contentplan", /contentplan/i.test(leeg[0].gevolg));

  ok("alleen een pakket laat de datum over", afspraakGaten({ pakket: 20, startdatum: null }).length === 1);
  ok(
    "alles ingevuld is geen gat",
    afspraakGaten({ pakket: 20, startdatum: "2026-03-01T00:00:00Z" }).length === 0,
  );
});

group("de samenvatting zegt hoe het ervoor staat", () => {
  ok(
    "compleet noemt het pakket en de datum",
    /20 pagina's per maand/.test(afspraakSamenvatting({ pakket: 20, startdatum: "2026-03-01T00:00:00Z" })),
  );
  ok(
    "helemaal leeg zegt dat ook",
    afspraakSamenvatting({ pakket: null, startdatum: null }) === "De verkoopafspraak staat nog helemaal open.",
  );
});

group("een startdatum uit een invoerveld", () => {
  ok("leeg wist de datum", leesStartdatum("") === null);
  ok("null wist de datum", leesStartdatum(null) === null);
  ok("een datum wordt een tijdstempel", (leesStartdatum("2026-03-01") ?? "").startsWith("2026-03-01"));
  // Onbekend is beter dan verkeerd (conventie 3): een onleesbare datum slaat de
  // route over in plaats van de teller van de klant op een gok te zetten.
  ok("onzin levert niets op", leesStartdatum("morgen") === undefined);
  ok("een getal levert niets op", leesStartdatum(20260301) === undefined);
});

// ── De vier lege staten van het zoekverkeerscherm (16 september 2026) ───────
console.log("\nWaarom staat er geen zoekverkeer op het scherm?");

const gsc = (over: Partial<Parameters<typeof legeStaat>[0]> = {}) =>
  legeStaat({
    heeftProperty: true,
    geverifieerdOp: "2026-09-01T00:00:00Z",
    laatsteFout: null,
    gepubliceerdePaginas: 3,
    dagenVoorOnzePaginas: 42,
    ...over,
  });

group("elk van de vier heeft zijn eigen uitleg", () => {
  ok("geen property", gsc({ heeftProperty: false })?.staat === "niet_gekoppeld");
  ok("nooit geverifieerd", gsc({ geverifieerdOp: null })?.staat === "geen_toegang");
  ok("laatste poging mislukt", gsc({ laatsteFout: "403 van Google" })?.staat === "geen_toegang");
  ok("niets gepubliceerd", gsc({ gepubliceerdePaginas: 0 })?.staat === "niets_live");
  ok("nog geen cijfers", gsc({ dagenVoorOnzePaginas: 0 })?.staat === "cijfers_komen");
  ok("alles in orde geeft niets", gsc() === null);
});

group("de volgorde is het programma zelf", () => {
  // De fout van vóór 16 september 2026: dit is de meest voorkomende klant, net
  // gekoppeld en nog niets live, en die las "Koppel je Google Search Console".
  ok(
    "net gekoppeld en niets live gaat over publiceren",
    gsc({ gepubliceerdePaginas: 0, dagenVoorOnzePaginas: 0 })?.staat === "niets_live",
  );
  // Zonder toegang valt er over publiceren niets zinnigs te zeggen: eerst moet
  // Google ons binnenlaten.
  ok(
    "geen toegang weegt zwaarder dan niets live",
    gsc({ geverifieerdOp: null, gepubliceerdePaginas: 0 })?.staat === "geen_toegang",
  );
  ok(
    "geen koppeling weegt het zwaarst",
    gsc({ heeftProperty: false, geverifieerdOp: null, gepubliceerdePaginas: 0 })?.staat ===
      "niet_gekoppeld",
  );
});

group("elke staat zegt wie er aan zet is", () => {
  ok("niet gekoppeld is consultantwerk", gsc({ heeftProperty: false })?.aanZet === "consultant");
  ok("geen toegang is consultantwerk", gsc({ geverifieerdOp: null })?.aanZet === "consultant");
  ok("niets live is aan de klant", gsc({ gepubliceerdePaginas: 0 })?.aanZet === "klant");
  // De enige staat waarin niemand iets kan doen, en dus de enige die letterlijk
  // zegt dat je niets hoeft te doen.
  const wachten = gsc({ dagenVoorOnzePaginas: 0 });
  ok("wachten is van niemand", wachten?.aanZet === null);
  ok("en zegt dat ook", /niets te doen|niets doen/i.test(wachten?.geruststelling ?? ""));

  const alle = [
    gsc({ heeftProperty: false })!,
    gsc({ geverifieerdOp: null })!,
    gsc({ gepubliceerdePaginas: 0 })!,
    gsc({ dagenVoorOnzePaginas: 0 })!,
  ];
  ok("vier verschillende koppen", new Set(alle.map((a) => a.kop)).size === 4);
  ok(
    "elke uitleg zegt wat er aan de hand is",
    alle.every((a) => a.uitleg.trim().length > 40),
  );
  ok(
    "wie kan wachten leest dat ook",
    alle.filter((a) => a.aanZet !== "klant").every((a) => a.geruststelling.trim().length > 0),
  );
});

// ── De drie kopieervormen (16 september 2026) ───────────────────────────────
console.log("\nKopiëren naar het CMS van de klant");

group("platte tekst houdt wat een mens nodig heeft", () => {
  const md = [
    "# Daklekkage verhelpen",
    "",
    "Wij komen **binnen 24 uur** langs. Lees de [voorwaarden](https://voorbeeld.nl/voorwaarden).",
    "",
    "- Eerst afdichten",
    "- Daarna herstellen",
    "",
    "1. Bel ons",
    "2. Wij komen langs",
  ].join("\n");
  const uit = plattetekst(md);

  ok("de hekjes zijn weg", !uit.includes("#"));
  ok("de sterretjes zijn weg", !uit.includes("**"));
  ok("de kop staat er nog", uit.startsWith("Daklekkage verhelpen"));
  // Het verschil met `stripMarkdown`: dit gaat naar een mens die het plakt, dus
  // de opsomming en het linkadres moeten het overleven.
  ok("het opsommingsteken blijft", uit.includes("- Eerst afdichten"));
  ok("het nummer blijft", uit.includes("1. Bel ons"));
  ok("het linkadres blijft", uit.includes("voorwaarden (https://voorbeeld.nl/voorwaarden)"));
  ok("het linklabel blijft", uit.includes("voorwaarden ("));
});

group("platte tekst ruimt op wat een editor in de weg zit", () => {
  const md = "Eerste alinea.\n\n---\n\nTweede alinea.";
  const uit = plattetekst(md);
  ok("de horizontale lijn is weg", !uit.includes("---"));
  ok("hooguit één witregel", !uit.includes("\n\n\n"));
  ok("geen witruimte aan de randen", uit === uit.trim());

  ok("blokcitaat verliest zijn teken", plattetekst("> Zo staat het in de norm.") === "Zo staat het in de norm.");
  ok("inline code verliest zijn tekens", plattetekst("Gebruik `robots.txt` hiervoor.") === "Gebruik robots.txt hiervoor.");
  // Een link waarvan het label al het adres is, wordt niet verdubbeld: anders
  // staat er "https://x.nl (https://x.nl)" op de pagina van de klant.
  ok("geen dubbel adres", plattetekst("[https://x.nl](https://x.nl)") === "https://x.nl");
  ok("een afbeelding houdt alleen zijn bijschrift", plattetekst("![Het dak](/dak.jpg)") === "Het dak");
});

group("de opties dragen hun eigen reden", () => {
  const opties = kopieeropties("# Kop\n\nTekst.", "<h1>Kop</h1>\n<p>Tekst.</p>");
  ok("drie vormen", opties.length === 3);
  ok("HTML staat vooraan", opties[0].vorm === "html");
  // Waarom de volgorde vastligt: de meeste CMS'en nemen opmaak over, dus dat is
  // de rij waar de klant het eerst op moet stuiten.
  ok("daarna platte tekst", opties[1].vorm === "tekst");
  ok("Markdown als laatste", opties[2].vorm === "markdown");
  ok(
    "elke optie zegt waarvoor hij is",
    opties.every((o) => o.waarvoor.trim().length > 20),
  );
  ok(
    "geen enkele reden praat over het formaat in plaats van over het CMS",
    opties.every((o) => /CMS|editor/i.test(o.waarvoor)),
  );

  // Een pagina zonder tekst hoort geen kopieerknop te tonen die niets doet.
  ok("lege pagina geeft geen opties", kopieeropties("", "").length === 0);
  ok("alleen HTML leeg valt weg", kopieeropties("Tekst.", "").every((o) => o.vorm !== "html"));
});

group("punt 25: nieuwe versie beschikbaar", () => {
  ok("gelijke versies: geen melding", !isNewerVersionAvailable("abc123", "abc123"));
  ok("verschillende versies: wel een melding", isNewerVersionAvailable("abc123", "def456"));
  ok("eigen versie nog onbekend: geen melding", !isNewerVersionAvailable("", "def456"));
  ok("serverversie nog onbekend: geen melding", !isNewerVersionAvailable("abc123", ""));
  ok("allebei onbekend: geen melding", !isNewerVersionAvailable("", ""));});

// ════════════════════════════════════════════════════════════════════════════
void (async () => {
  await paginatieControles();

  console.log(`\n${passed} geslaagd, ${failed} mislukt`);
  if (failures.length > 0) {
    console.log("\nMislukt:");
    for (const f of failures) console.log(`  ✗ ${f}`);
  }
  process.exit(failed === 0 ? 0 : 1);
})();

// ── lib/stats/pooling.ts ─────────────────────────────────────────────────────
//
// De aanleiding staat in docs/logbook.md, 20 september 2026 (3): één meetronde
// is een steekproef met een band die breder is dan het verschil dat een klant
// als vooruitgang leest. Samenvoegen maakt het cijfer zekerder zonder één extra
// betaalde meting.
group("poolRecent: rustige rondes samenvoegen, een echte stijging niet", () => {
  // Niets te tonen zonder metingen.
  ok("lege lijst geeft null", poolRecent([]) === null);

  // ⚠️ Een nieuwe klant moet exact zien wat hij nu ook ziet.
  const een = poolRecent([{ score: 21, stderr: 8.3 }]);
  ok("één ronde komt onveranderd terug", een?.score === 21 && een?.rounds === 1);
  eq2("en met zijn eigen standaardfout", een?.stderr ?? null, 8.3);

  // Drie rondes die binnen elkaars ruis vallen: samenvoegen mag, en de band
  // hoort smaller te worden. Met gelijke standaardfouten is de winst de wortel
  // uit drie: 8,3 / 1,732 ≈ 4,79.
  const rustig = poolRecent([
    { score: 18, stderr: 8.3 },
    { score: 24, stderr: 8.3 },
    { score: 21, stderr: 8.3 },
  ]);
  ok("drie rustige rondes gaan samen", rustig?.rounds === 3);
  ok("het cijfer is het gemiddelde", rustig?.score === 21);
  ok(
    "en de band is ongeveer wortel drie smaller",
    Math.abs((rustig?.stderr ?? 0) - 4.79) < 0.05,
    `stderr=${rustig?.stderr}`,
  );

  // ⚠️ HET GEVAL DAT DIT MOET AFVANGEN. Gaat een merk van 10% naar 70%, dan is
  // dat geen ruis maar verdiende winst. Die uitsmeren over drie rondes zou de
  // klant zijn resultaat afpakken, en precies dat is waarom poolRecent() stopt
  // bij een betekenisvol verschil.
  const sprong = poolRecent([
    { score: 10, stderr: 5 },
    { score: 12, stderr: 5 },
    { score: 70, stderr: 5 },
  ]);
  ok("een echte sprong wordt niet uitgesmeerd", sprong?.rounds === 1);
  ok("en het getoonde cijfer is de nieuwe stand", sprong?.score === 70);

  // De teller begint opnieuw bij de ronde waarin het gebeurde: de ronde vóór de
  // sprong doet niet mee, ook niet als de ronde dáárvoor weer dichtbij ligt.
  const naSprong = poolRecent([
    { score: 68, stderr: 5 },
    { score: 10, stderr: 5 },
    { score: 70, stderr: 5 },
  ]);
  ok("een oudere ronde achter een sprong telt niet mee", naSprong?.rounds === 1);

  // Nooit meer dan drie, ook niet met tien rustige rondes.
  const veel = poolRecent(Array.from({ length: 10 }, () => ({ score: 20, stderr: 8 })));
  ok("hoogstens drie rondes", veel?.rounds === 3);
  ok("de grens staat op drie", MAX_POOLED_ROUNDS === 3);

  // Een zekerdere ronde weegt zwaarder dan een onzekere. 10 met stderr 2 en 50
  // met stderr 10 geeft gewichten 1/4 en 1/100, dus vrijwel helemaal de 10.
  const ongelijk = poolRecent([
    { score: 50, stderr: 10 },
    { score: 10, stderr: 2 },
  ]);
  ok(
    "de zekerste ronde weegt het zwaarst",
    (ongelijk?.score ?? 0) <= 12,
    `score=${ongelijk?.score}`,
  );

  // ⚠️ Een standaardfout van 0 betekent "niet bekend" (zie BrandPeriod) en mag
  // geen oneindig gewicht krijgen. Dan liever onveranderd teruggeven dan een
  // verzonnen getal (conventie 3).
  const zonderMarge = poolRecent([{ score: 40, stderr: 0 }]);
  ok("stderr 0 levert geen oneindig gewicht", zonderMarge?.score === 40);
  eq2("en geen verzonnen marge", zonderMarge?.stderr ?? null, 0);

  // ⚠️ Altijd afgerond, ook bij één ronde (21 september 2026). `visibility_scores`
  // bewaart de volle precisie ("22.232558139534884") en die kwam tot vandaag
  // ongerond op het scherm terecht zodra er niets samen te voegen viel.
  const nietGeheel = poolRecent([{ score: 22.232558139534884, stderr: 8.3 }]);
  ok("een score met decimalen wordt afgerond", nietGeheel?.score === 22);
  const zonderMargeNietGeheel = poolRecent([{ score: 40.6, stderr: 0 }]);
  ok(
    "ook zonder marge blijft het getoonde cijfer een geheel getal",
    zonderMargeNietGeheel?.score === 41,
  );

  // De zin eronder moet zeggen dat het cijfer zekerder is, niet zwakker.
  ok("één ronde wordt zo benoemd", describePooled({ score: 20, stderr: 8, rounds: 1 }).includes("laatste meting"));
  ok(
    "meer rondes heten zekerder",
    describePooled({ score: 20, stderr: 5, rounds: 3 }).includes("zekerder"),
  );
});

// ── bandInAntwoorden: de band als hoofdgetal ─────────────────────────────────
//
// "21%" leest als een stand terwijl er een band van ±15 omheen ligt. Een klant
// die dat een maand later ziet verschuiven leest daar verval in dat er niet is.
// Zie docs/logbook.md, 20 september 2026 (3), voor de meting eronder.
group("bandInAntwoorden: de band in antwoorden in plaats van in procenten", () => {
  // Het geval uit het echte dashboard: score 21%, band 6% tot 36%.
  eq("21% met band 6 tot 36 wordt 1 tot 4", bandInAntwoorden({ low: 6, high: 36 }), "1 tot 4 van de 10");

  // ⚠️ Een smalle band mag geen "tussen 2 en 2" opleveren. Dat leest als een
  // fout, terwijl het juist het zekerste geval is.
  eq("een smalle band wordt ongeveer", bandInAntwoorden({ low: 18, high: 23 }), "ongeveer 2 van de 10");

  // ⚠️ Nul is geen uitkomst die we durven beloven. "0 tot 0 van de 10" zou
  // zeggen dat het merk gegarandeerd nooit genoemd wordt, en dat weten we niet
  // (conventie 3: onbekend is beter dan een verkeerde waarde).
  eq("een lage band belooft geen nul", bandInAntwoorden({ low: 0, high: 4 }), "minder dan 1 van de 10");

  // De bovenkant moet ook kloppen: 90% tot 100% is negen tot tien.
  eq("de bovenkant telt door", bandInAntwoorden({ low: 88, high: 100 }), "9 tot 10 van de 10");

  // Een brede band bij een middenscore, het meest voorkomende geval.
  eq("een brede band toont zijn breedte", bandInAntwoorden({ low: 12, high: 58 }), "1 tot 6 van de 10");

  // ⚠️ De formulering mag nooit een gedachtestreepje bevatten (schrijfstijl §10),
  // want deze tekst komt letterlijk op het scherm.
  ok(
    "geen gedachtestreepjes in de uitkomst",
    !["1 tot 4", "ongeveer 2", "minder dan 1"].some(() =>
      bandInAntwoorden({ low: 6, high: 36 }).includes("—"),
    ),
  );
});

// ── De score rust op één engine ──────────────────────────────────────────────
//
// lib/jobs/queue.ts waarschuwde hiervoor en die waarschuwing was terecht:
// computeAggregates() bevatte op 20 september 2026 het woord "engine" niet.
// Zie PRIMARY_ENGINE in lib/engines/types.ts.
group("countOpenPeriodicMeasurements: op welke metingen wacht de aggregatie", () => {
  const taak = (payload: Record<string, unknown>, type = "measure_prompt") => ({
    payload_json: payload,
    type,
  });

  // ⚠️ HET GEVAL DAT DIT AFVANGT. De kansen die de klant ziet komen uit een
  // meerderheidsregel over álle metingen van een vraag (`computeMissedPrompts`).
  // Zou de aggregatie niet op de tweede bron wachten, dan landen die metingen ná
  // het rapport en tellen ze die ronde nergens in mee.
  ok(
    "de aggregatie wacht op de tweede meetbron",
    countOpenPeriodicMeasurements([taak({ weekNo: 0 }, "measure_ai_overview")], 0) === 1,
  );
  ok(
    "en op de primaire engine",
    countOpenPeriodicMeasurements([taak({ weekNo: 0, engine: "openai" })], 0) === 1,
  );

  // ⚠️ Maar NIET op een derde engine. Die vult alleen `per_engine_json` en voedt
  // geen kansen, dus hij mag later landen.
  ok(
    "maar niet op een engine die alleen de uitsplitsing vult",
    countOpenPeriodicMeasurements([taak({ weekNo: 0, engine: "gemini" })], 0) === 0,
  );

  // Een andere periode telt nooit mee, ook niet bij de tweede bron.
  ok(
    "een andere periode telt niet mee",
    countOpenPeriodicMeasurements([taak({ weekNo: 1 }, "measure_ai_overview")], 0) === 0,
  );

  // Een taak van vóór deze wijziging draagt geen engine mee, en kwam toen per
  // definitie van de primaire engine. Die moet blijven tellen, anders rekent de
  // aggregatie een lopende ronde te vroeg door.
  ok(
    "een payload zonder engine telt als primair",
    countOpenPeriodicMeasurements([taak({ weekNo: 0 })], 0) === 1,
  );

  // Gemengd: de primaire engine en de tweede bron, niet de derde engine.
  ok(
    "gemengde wachtrij telt beide meetbronnen",
    countOpenPeriodicMeasurements(
      [
        taak({ weekNo: 0 }),
        taak({ weekNo: 0, engine: "gemini" }),
        taak({ weekNo: 0, engine: "openai" }),
        taak({ weekNo: 0 }, "measure_ai_overview"),
      ],
      0,
    ) === 3,
  );

  // De bestaande regels blijven gelden.
  ok(
    "een impactmeting telt nog steeds niet mee",
    countOpenPeriodicMeasurements([taak({ weekNo: 0, impact: { wave: 1 }, engine: "openai" })], 0) === 0,
  );
  ok("de primaire engine is ChatGPT", PRIMARY_ENGINE === "openai");
});

// ── lib/ai-overview/parse.ts ─────────────────────────────────────────────────
//
// Dit is de plek waar "geen AI Overview" en "wél een AI Overview" uit elkaar
// gehouden worden, en dat onderscheid bepaalt of een vraag die ronde meetelt in
// de noemer. Een fout hier verlaagt stilletjes de score van een merk doordat
// Google toevallig geen overzicht toonde.
group("leesAiOverview: een overzicht uitpakken, en weten wanneer er geen is", () => {
  const taak = (inhoud: Record<string, unknown>) => ({
    tasks: [{ status_code: 20000, cost: 0.004, result: [{ items: [inhoud] }] }],
  });

  // Het gewone geval: tekst plus bronnen.
  const goed = leesAiOverview(
    taak({
      type: "ai_overview",
      markdown: "In Zwolle vindt u verschillende dakdekkers die eerst een inspectie doen.",
      references: [{ domain: "www.mrdakdekkerzwolle.nl" }, { domain: "de-kraaij.com" }],
    }),
  );
  eq("status is gemeten", goed.status, "gemeten");
  ok("de tekst komt mee", goed.tekst.includes("Zwolle"));
  eq("www valt weg uit het domein", goed.bronnen.join(","), "mrdakdekkerzwolle.nl,de-kraaij.com");
  eq2("en de kosten komen mee", goed.kostenUsd, 0.004);

  // Zonder `markdown` valt hij terug op de losse tekstblokken.
  const viaItems = leesAiOverview(
    taak({ type: "ai_overview", items: [{ text: "Eerste stuk." }, { text: "Tweede stuk." }] }),
  );
  eq("zonder markdown werken de losse blokken", viaItems.status, "gemeten");
  ok("en die worden samengevoegd", viaItems.tekst.includes("Eerste") && viaItems.tekst.includes("Tweede"));

  // ⚠️ HET BELANGRIJKSTE GEVAL. Geen overzichtsblok is een NIET-METING, geen
  // nulscore. Zou dit als "merk niet genoemd" wegschrijven, dan zakt de score
  // van een merk doordat Google geen antwoord gaf (conventie 3).
  const geen = leesAiOverview(taak({ type: "organic" }));
  eq("geen overzichtsblok is geen meting", geen.status, "geen_overview");
  eq("en dus geen tekst", geen.tekst, "");

  // ⚠️ Een LEEG overzichtsblok telt ook als geen meting. Dat kwam in de meting
  // van 20 september 4 keer voor op 180 aanroepen.
  const leegBlok = leesAiOverview(taak({ type: "ai_overview", markdown: "", references: [] }));
  eq("een leeg overzicht telt niet als meting", leegBlok.status, "geen_overview");

  // Een mislukte taak. ⚠️ De kosten komen tóch mee: een 40101 kost $0,002, en
  // die weglaten maakt elke kostenraming van deze bron structureel te laag.
  const stuk = leesAiOverview({
    tasks: [{ status_code: 40101, status_message: "Internal SE Server Error.", cost: 0.002 }],
  });
  eq("een serverfout is een mislukking", stuk.status, "mislukt");
  eq2("en kost tóch geld", stuk.kostenUsd, 0.002);
  ok("met de reden erbij", (stuk.melding ?? "").includes("Internal SE"));

  // Onverwachte vormen mogen nooit gooien: één rare respons zou anders een hele
  // meetronde kunnen afbreken.
  eq("een lege respons is een mislukking", leesAiOverview({}).status, "mislukt");
  eq("en null ook", leesAiOverview(null).status, "mislukt");

  // De afspraken die de kosten bepalen.
  ok("elke vraag gaat drie keer", AI_OVERVIEW_REPEATS === 3);
  ok("en een mislukte aanroep krijgt één herkansing", AI_OVERVIEW_POGINGEN === 2);
  ok("de bron landt onder zijn eigen engine-naam", AI_OVERVIEW_ENGINE === "google_ai_overview");
});

// ── lib/engines/bron.ts ──────────────────────────────────────────────────────
//
// De keuzeknop "Bron" op Zichtbaarheid in AI. Eén ding moet hier vaststaan: een
// klant die de knop nooit aanraakt ziet exact wat hij altijd zag.
group("cijferVoorBron: het cijfer van de gekozen meetbron", () => {
  const rij = (per: unknown) => ({
    score: 21,
    score_stderr: 8.3,
    weighted_score: 24,
    weighted_stderr: 7.1,
    per_engine_json: per,
  });

  // ⚠️ DE BELANGRIJKSTE TOETS. De primaire bron leest de gewone kolommen, want
  // díé kolommen ZIJN de primaire engine sinds de aggregatie engine-bewust werd.
  // Zou deze functie ook voor ChatGPT in per_engine_json duiken, dan verandert
  // het cijfer van elke bestaande klant.
  const chatgpt = cijferVoorBron(rij(null), PRIMARY_ENGINE);
  eq2("ChatGPT leest de gewone kolommen", chatgpt?.score ?? null, 24);
  eq2("en de bijbehorende marge", chatgpt?.stderr ?? null, 7.1);

  // Zonder gewogen cijfer valt hij terug op het ongewogen, zelfde regel als
  // `leidend()` op het scherm.
  const zonderGewogen = cijferVoorBron(
    { score: 21, score_stderr: 8.3, weighted_score: null, weighted_stderr: null, per_engine_json: null },
    PRIMARY_ENGINE,
  );
  eq2("zonder gewogen cijfer telt het ongewogen", zonderGewogen?.score ?? null, 21);

  // De tweede bron komt uit per_engine_json, en ook daar gaat gewogen voor.
  const metGoogle = rij({
    google_ai_overview: { score: 40, stderr: 9, weighted_score: 45, weighted_stderr: 8 },
  });
  const google = cijferVoorBron(metGoogle, AI_OVERVIEW_ENGINE);
  eq2("Google leest zijn eigen gewogen cijfer", google?.score ?? null, 45);
  eq2("met zijn eigen marge", google?.stderr ?? null, 8);

  // ⚠️ NIET GEMETEN IS NIET NUL (conventie 3). Een ronde van vóór deze bron
  // heeft geen per_engine_json; die als 0% in de grafiek zetten zou een val
  // tonen die er niet is.
  ok("een ronde zonder deze bron geeft null", cijferVoorBron(rij(null), AI_OVERVIEW_ENGINE) === null);
  ok(
    "en een bron zonder cijfer ook",
    cijferVoorBron(rij({ google_ai_overview: { score: null, stderr: 0 } }), AI_OVERVIEW_ENGINE) === null,
  );

  // Een onbekende waarde in het adres mag nooit een leeg scherm geven.
  const beschikbaar = [
    { id: PRIMARY_ENGINE, label: "ChatGPT" },
    { id: AI_OVERVIEW_ENGINE, label: "Google AI Overview" },
  ];
  ok(
    "een onbekende bron valt terug op de standaard",
    JSON.stringify(leesBronfilter("onzin", beschikbaar)) === JSON.stringify([PRIMARY_ENGINE]),
  );
  ok("en een lege waarde ook", JSON.stringify(leesBronfilter(null, beschikbaar)) === JSON.stringify([PRIMARY_ENGINE]));
  ok(
    "een geldige bron blijft staan",
    JSON.stringify(leesBronfilter(AI_OVERVIEW_ENGINE, beschikbaar)) === JSON.stringify([AI_OVERVIEW_ENGINE]),
  );
  ok(
    "meerdere bronnen, kommagescheiden, blijven allebei staan",
    JSON.stringify(leesBronfilter(`${PRIMARY_ENGINE},${AI_OVERVIEW_ENGINE}`, beschikbaar)) ===
      JSON.stringify([PRIMARY_ENGINE, AI_OVERVIEW_ENGINE]),
  );

  // ⚠️ De knop verschijnt alleen als er iets te kiezen valt. Zolang er nooit via
  // een tweede bron gemeten is, verandert dit scherm dus niets.
  eq2("zonder tweede bron valt er niets te kiezen", beschikbareBronnen([rij(null)]).length, 1);
  eq2("met een tweede bron wel", beschikbareBronnen([metGoogle]).length, 2);

  // Meerdere bronnen tegelijk: één gemiddeld cijfer, nooit twee naast elkaar.
  const gemiddeld = cijferVoorBronnen(metGoogle, [PRIMARY_ENGINE, AI_OVERVIEW_ENGINE]);
  eq2("het gemiddelde van ChatGPT (24) en Google (45) is 34,5", gemiddeld?.score ?? null, 34.5);
  ok(
    "bij precies één bron is het gemiddelde gelijk aan die ene bron",
    cijferVoorBronnen(metGoogle, [AI_OVERVIEW_ENGINE])?.score === cijferVoorBron(metGoogle, AI_OVERVIEW_ENGINE)?.score,
  );
  ok(
    "een bron die deze ronde niet meemat telt niet mee in het gemiddelde",
    cijferVoorBronnen(rij(null), [PRIMARY_ENGINE, AI_OVERVIEW_ENGINE])?.score === 24,
  );
  ok(
    "geen enkele gekozen bron gemeten geeft null, geen nul",
    cijferVoorBronnen(rij(null), [AI_OVERVIEW_ENGINE]) === null,
  );

  // Het adres blijft schoon bij de standaardkeuze, en draagt de keuze anders.
  ok("de standaardkeuze staat niet in het adres", bronfilterNaarAdres([PRIMARY_ENGINE]) === null);
  ok(
    "een andere keuze staat wel in het adres",
    bronfilterNaarAdres([PRIMARY_ENGINE, AI_OVERVIEW_ENGINE]) === `${PRIMARY_ENGINE},${AI_OVERVIEW_ENGINE}`,
  );

  // De labels zijn wat de klant de assistent noemt, niet de technische naam.
  eq("ChatGPT heet ChatGPT", bronLabel(PRIMARY_ENGINE), "ChatGPT");
  eq("en de tweede bron heet Google AI Overview", bronLabel(AI_OVERVIEW_ENGINE), "Google AI Overview");
  eq("en de derde bron heet Gemini", bronLabel(LLM_RESPONSE_GEMINI_ENGINE), "Gemini");

  // ⚠️ Gemini kent geen Nederlandse zoekcontext (hoofdstuk 3.1 van het plan).
  // Zonder een toelichting leest een lage score hier als een oordeel over het
  // merk, en dat is precies wat merkstrategie.md §30 bijhoudt.
  ok("Gemini krijgt een toelichting", (bronToelichting(LLM_RESPONSE_GEMINI_ENGINE) ?? "").length > 0);
  ok("ChatGPT krijgt er geen", bronToelichting(PRIMARY_ENGINE) === null);
  ok("Google AI Overview ook niet", bronToelichting(AI_OVERVIEW_ENGINE) === null);
});

// ── lib/llm-responses/parse.ts ───────────────────────────────────────────────
//
// Zelfde soort risico als bij AI Overview, en één extra: een leeg antwoord
// kwam bij de verificatie van 20 september 2026 voor terwijl DataForSEO er wél
// voor liet betalen. Dat mag nooit als "merk niet genoemd" tellen.
group("leesLlmResponse: een Gemini-antwoord uitpakken, en weten wanneer het leeg is", () => {
  const taak = (resultaat: Record<string, unknown>, opties?: { statusCode?: number; cost?: number }) => ({
    tasks: [
      {
        status_code: opties?.statusCode ?? 20000,
        cost: opties?.cost ?? 0,
        result: [resultaat],
      },
    ],
  });

  // Het gewone geval: tekst en een paar bronvermeldingen, langer dan de grens.
  const goed = leesLlmResponse(
    taak({
      money_spent: 0.0351,
      items: [
        {
          type: "message",
          sections: [
            {
              type: "text",
              text: "In Oss zijn er verschillende autobedrijven waar je een occasion kunt kopen en je huidige auto kunt inruilen.",
              annotations: [{ url: "https://voorbeeld.nl/1" }, { url: "https://voorbeeld.nl/2" }],
            },
          ],
        },
      ],
    }),
  );
  eq("status is gemeten", goed.status, "gemeten");
  ok("de tekst komt mee", goed.tekst.includes("Oss"));
  eq2("het aantal bronvermeldingen komt mee", goed.aantalBronvermeldingen, 2);
  eq2("money_spent is de kostenbron, niet cost", goed.kostenUsd, 0.0351);

  // ⚠️ HET BELANGRIJKSTE GEVAL. Een antwoord dat er wél is maar te kort om een
  // meting te zijn, is GEEN nulscore (conventie 3). Nagemeten op 20 september
  // 2026: dit gebeurde bij de eerste verificatieronde op alle vijf testvragen.
  const leeg = leesLlmResponse(
    taak(
      { money_spent: 0.02, items: [{ type: "message", sections: [{ type: "text", text: "" }] }] },
    ),
  );
  eq("een te kort antwoord is geen meting", leeg.status, "leeg");
  eq2("de kosten komen wél mee", leeg.kostenUsd, 0.02);

  // Een mislukte taak, bijvoorbeeld het model ondersteunt een veld niet.
  const stuk = leesLlmResponse({
    tasks: [
      {
        status_code: 40501,
        status_message: "Invalid Field: 'this model does not support force_web_search'.",
        cost: 0,
      },
    ],
  });
  eq("een statusfout is een mislukking", stuk.status, "mislukt");
  ok("met de reden erbij", (stuk.melding ?? "").includes("force_web_search"));

  // Onverwachte vormen mogen nooit gooien.
  eq("een lege respons is een mislukking", leesLlmResponse({}).status, "mislukt");
  eq("en null ook", leesLlmResponse(null).status, "mislukt");

  // De afspraken die de kosten en het gedrag bepalen.
  ok("elke vraag gaat één keer, niet drie", LLM_RESPONSE_REPEATS === 1);
  ok("en een mislukte aanroep krijgt één herkansing", LLM_RESPONSE_POGINGEN === 2);
  ok("de bron landt onder zijn eigen engine-naam", LLM_RESPONSE_GEMINI_ENGINE === "dataforseo_gemini");
});

// ── lib/pipeline/missed-prompts.ts ───────────────────────────────────────────
//
// De belangrijkste rekenkundige wijziging van deze bouwronde (hoofdstuk 5 van
// docs/tasks/vier-meetbronnen-en-ai-zoekvolume.md): eerst binnen een bron een
// meerderheid, dan pas tussen de bronnen. Deze module bepaalt welke pagina's
// geschreven worden, dus elk scenario hieronder staat voor een cijfer dat
// anders een bestaande klant zou raken.
group("bepaalGemisteVragen: eerst binnen een bron, dan tussen de bronnen", () => {
  const meting = (runId: string, promptId: string, engine: string, mentioned: boolean) => ({
    runId,
    promptId,
    engine,
    mentioned,
  });

  // ⚠️ HET PROBLEEM DAT DIT OPLOST. Google meet 3x, ChatGPT en Gemini 1x. Bij
  // ChatGPT genoemd, bij Gemini niet, en bij Google 2 van de 3 keer wél: zou
  // je alle 5 metingen even zwaar tellen (3 wél, 2 niet), dan wint "genoemd"
  // met de stem van Google. Met één stem per bron staat het 2-1 (ChatGPT en
  // Google noemen het merk, Gemini niet), en dat is geen gemiste kans.
  const googleWintNietMeer = bepaalGemisteVragen([
    meting("r1", "p1", "openai", true),
    meting("r2", "p1", "gemini_dfs", false),
    meting("r3", "p1", "google_ai_overview", true),
    meting("r4", "p1", "google_ai_overview", true),
    meting("r5", "p1", "google_ai_overview", false),
  ]);
  eq2(
    "Google's drievoudige meting krijgt niet meer stemgewicht dan de rest",
    googleWintNietMeer.length,
    0,
  );

  // Twee bronnen tegen twee bronnen: gelijke stand telt als gemiste kans
  // (hoofdstuk 5, de voorzichtige kant).
  const gelijkeStand = bepaalGemisteVragen([
    meting("r1", "p1", "openai", true),
    meting("r2", "p1", "gemini_dfs", true),
    meting("r3", "p1", "google_ai_overview", false),
    meting("r4", "p1", "vierde_bron", false),
  ]);
  eq2("een gelijke stand tussen bronnen is een gemiste kans", gelijkeStand.length, 1);
  eq("met een run uit een bron die 'm miste", gelijkeStand[0]?.promptId, "p1");

  // Een bron die voor deze vraag helemaal geen meting heeft (bijvoorbeeld
  // Gemini viel deze ronde uit) telt niet mee als "gemist" en niet als
  // "genoemd": hij doet gewoon niet mee aan de stemming. Hier stemmen alleen
  // ChatGPT en Google, allebei "gemist".
  const eenBronOntbreekt = bepaalGemisteVragen([
    meting("r1", "p1", "openai", false),
    meting("r2", "p1", "google_ai_overview", false),
    meting("r3", "p1", "google_ai_overview", false),
  ]);
  eq2("de twee bronnen die wél meetten, zijn het eens: gemiste kans", eenBronOntbreekt.length, 1);

  // Een vraag die maar door één bron gemeten is: die ene bron beslist, zoals
  // vóór deze bouwronde.
  const eenBronMaar = bepaalGemisteVragen([meting("r1", "p1", "openai", false)]);
  eq2("één bron alleen: die bron beslist", eenBronMaar.length, 1);
  eq("de run van die ene meting is het bewijs", eenBronMaar[0]?.representatieveRunId, "r1");

  const eenBronMaarWelGenoemd = bepaalGemisteVragen([meting("r1", "p1", "openai", true)]);
  eq2("en bij wél genoemd geen gemiste kans", eenBronMaarWelGenoemd.length, 0);

  // Binnen één bron blijft een gelijke stand "genoemd" winnen (ongewijzigd
  // gedrag): bij twee van de vier metingen genoemd is dat geen meerderheid.
  const binnenBronGelijkeStand = bepaalGemisteVragen([
    meting("r1", "p1", "openai", true),
    meting("r2", "p1", "openai", true),
    meting("r3", "p1", "openai", false),
    meting("r4", "p1", "openai", false),
  ]);
  eq2("binnen één bron wint een gelijke stand als 'genoemd'", binnenBronGelijkeStand.length, 0);

  // Twee vragen door elkaar heen: ze mogen elkaar niet beïnvloeden.
  const tweeVragen = bepaalGemisteVragen([
    meting("r1", "p1", "openai", false),
    meting("r2", "p2", "openai", true),
  ]);
  eq2("twee losse vragen blijven los", tweeVragen.length, 1);
  eq("en het is de juiste vraag", tweeVragen[0]?.promptId, "p1");
});

// ─────────────────────────────────────────────────────────────────────────────
// De melding als een cluster klaar is (22 september 2026)
//
// Het clusterresultaat heeft geen eigen scherm meer
// (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`). Deze module bepaalt
// in plaats daarvan of er iets te melden valt en wat erin staat, en dat is de
// enige plek waar de klant nog hoort dat zijn meting klaar is. Gaat dit stil
// stuk, dan merkt niemand het, ook de klant niet.
// ─────────────────────────────────────────────────────────────────────────────
group("cluster-melding: één melding per ronde, en alleen als de ronde klaar is", () => {
  const basis: ClusterStand = {
    id: "c1",
    naam: "Cv-ketel onderhoud",
    status: "gereed",
    resultaatGezienAt: null,
    zichtbaarheid: 34,
    openVragen: 6,
    voorgesteld: 4,
  };

  ok("een afgerond, nog niet gemeld cluster wordt gemeld", moetMelden(basis));
  ok(
    "dezelfde uitslag een tweede keer niet",
    !moetMelden({ ...basis, resultaatGezienAt: "2026-09-22T10:00:00Z" }),
  );
  ok("een lopende meting nog niet", !moetMelden({ ...basis, status: "meten" }));
  // `gemeten` betekent: score binnen, rapport nog niet. Juist dat rapport
  // levert de vragen en de voorgestelde pagina's waar de melding over gaat.
  ok("en 'score binnen, rapport volgt' ook niet", !moetMelden({ ...basis, status: "gemeten" }));
  ok("een mislukte ronde wél", moetMelden({ ...basis, status: "mislukt" }));

  const gelukt = maakMelding(basis);
  eq("de titel die de eigenaar vroeg", gelukt.titel, "Cluster succesvol gemeten");
  ok(
    "met de drie cijfers in één regel",
    gelukt.regel.includes("34% zichtbaarheid") &&
      gelukt.regel.includes("6 openstaande vragen") &&
      gelukt.regel.includes("4 voorgestelde pagina's"),
    gelukt.regel,
  );
  ok("en de naam van het cluster erbij", gelukt.regel.startsWith("Cv-ketel onderhoud:"), gelukt.regel);

  // Conventie 3: onbekend is beter dan verkeerd. Een cluster zonder score krijgt
  // geen 0%, want 0% betekent "gemeten en nergens genoemd".
  const zonderScore = maakMelding({ ...basis, zichtbaarheid: null });
  ok("geen score wordt 'nog geen score' en geen 0%", zonderScore.regel.includes("nog geen score"), zonderScore.regel);
  ok("en dus nergens een 0%", !zonderScore.regel.includes("0%"), zonderScore.regel);

  // Enkelvoud en meervoud: dit getal staat vaak op 1.
  const eenVanElk = maakMelding({ ...basis, openVragen: 1, voorgesteld: 1 });
  ok(
    "enkelvoud bij één vraag en één pagina",
    eenVanElk.regel.includes("1 openstaande vraag") && eenVanElk.regel.includes("1 voorgestelde pagina."),
    eenVanElk.regel,
  );

  const niets = maakMelding({ ...basis, openVragen: 0, voorgesteld: 0 });
  ok(
    "nul is hier een echte nul en geen onbekend",
    niets.regel.includes("geen openstaande vragen") && niets.regel.includes("nog geen voorgestelde pagina"),
    niets.regel,
  );

  const mislukt = maakMelding({ ...basis, status: "mislukt" });
  eq("een mislukking heeft zijn eigen soort", mislukt.soort, "mislukt");
  ok("met de clusternaam in de titel", mislukt.titel.includes("Cv-ketel onderhoud"), mislukt.titel);
});

group("teMelden: hooguit drie meldingen, maar alles wordt weggezet", () => {
  const maak = (i: number): ClusterStand => ({
    id: `c${i}`,
    naam: `Cluster ${i}`,
    status: "gereed",
    resultaatGezienAt: null,
    zichtbaarheid: 20 + i,
    openVragen: i,
    voorgesteld: i,
  });

  const vijf = [maak(1), maak(2), maak(3), maak(4), maak(5)];
  const uit = teMelden(vijf);

  eq2("er verschijnen er hooguit drie in beeld", uit.meldingen.length, MAX_MELDINGEN);
  // ⚠️ Dit is het punt van de test: alle vijf gaan als gezien weg. Zou alleen
  // het drietal weggezet worden, dan komen de andere twee bij elke volgende
  // ronde van de melder opnieuw terug, en dan klikt de klant een muur weg die
  // nooit opdroogt.
  eq2("maar alle vijf worden als gemeld weggezet", uit.gezien.length, 5);

  const gemengd = teMelden([
    maak(1),
    { ...maak(2), status: "meten" },
    { ...maak(3), resultaatGezienAt: "2026-09-22T08:00:00Z" },
  ]);
  eq2("een lopende en een al gemelde ronde tellen niet mee", gemengd.meldingen.length, 1);
  eq2("en worden ook niet weggezet", gemengd.gezien.length, 1);
  eq("het is het juiste cluster", gemengd.gezien[0] ?? "", "c1");

  const leeg = teMelden([]);
  eq2("zonder clusters valt er niets te melden", leeg.meldingen.length, 0);
});

// ════════════════════════════════════════════════════════════════════════════
// Clusters ontdekken (docs/tasks/clusters-ontdekken.md). De hoofdgevallen zijn
// de cijfers uit de proefronde van 23 september 2026 op udenhout.nl.

function term(t: Partial<OntdekTerm> & { keyword: string }): OntdekTerm {
  return {
    volume: null,
    bronnen: ["suggestie"],
    eigenPositie: null,
    eigenUrl: null,
    vertoningen: null,
    klikken: null,
    concurrent: null,
    ...t,
  };
}

group("Clusters ontdekken: portalen vallen af als concurrent, dealers blijven", () => {
  const gekozen = kiesConcurrenten(
    [
      { domein: "udenhout.nl", omvang: 2423, overlap: 2426 },
      { domein: "autoscout24.nl", omvang: 104988, overlap: 1704 },
      { domein: "viabovag.nl", omvang: 59165, overlap: 1143 },
      { domein: "broekhuis.nl", omvang: 28910, overlap: 1066 },
      { domein: "vanmossel.nl", omvang: 18112, overlap: 1056 },
      { domein: "www.pouw.nl", omvang: 6319, overlap: 934 },
      { domein: "facebook.com", omvang: 3735952, overlap: 1500 },
      { domein: "onbekend.nl", omvang: null, overlap: 2000 },
      { domein: "piepklein.nl", omvang: 100, overlap: 900 },
    ],
    "https://www.udenhout.nl/",
    2423,
  );
  eq("drie dealers, op overlap", gekozen.map((g) => g.domein).join(","), "broekhuis.nl,vanmossel.nl,pouw.nl");
  eq2("zonder eigen omvang geen keuze", kiesConcurrenten([{ domein: "pouw.nl", omvang: 6319, overlap: 1 }], "udenhout.nl", null).length, 0);
});

group("Clusters ontdekken: varianten zijn één zoekvraag, niet zes", () => {
  eq("woordvolgorde telt niet", variantSleutel("Private lease occasion"), variantSleutel("occasion private-lease"));
  const samen = voegVariantenSamen([
    term({ keyword: "private lease occasion", volume: 22200 }),
    term({ keyword: "occasion private lease", volume: 22200, bronnen: ["concurrent"], concurrent: { domein: "dewaalautogroep.nl", positie: 5 } }),
    term({ keyword: "private lease occasion", volume: null, bronnen: ["gsc"], vertoningen: 300, eigenPositie: 14 }),
    term({ keyword: "apk", volume: 22200 }),
  ]);
  eq2("twee termen over", samen.length, 2);
  const lease = samen.find((t) => t.keyword.includes("lease"))!;
  eq2("volume niet opgeteld", lease.volume, 22200);
  eq2("vertoningen wel", lease.vertoningen, 300);
  eq2("beste eigen positie blijft", lease.eigenPositie, 14);
  eq("bronnen samengevoegd", [...lease.bronnen].sort().join(","), "concurrent,gsc,suggestie");
  eq2("concurrent blijft", lease.concurrent?.positie ?? null, 5);
});

group("Clusters ontdekken: voorfilter en verzonnen termen", () => {
  const uit = voorfilter(
    [
      term({ keyword: "van den udenhout occasions", volume: 900 }),
      term({ keyword: "laadpaal thuis kosten", volume: 2900 }),
      term({ keyword: "apk", volume: 5 }),
      term({ keyword: "apk keuring rosmalen", volume: null, vertoningen: 40, bronnen: ["gsc"] }),
      term({ keyword: "een heel lange zin die echt geen zoekterm meer is maar een vraag", volume: 5000 }),
    ],
    ["Van den Udenhout", "udenhout"],
  );
  eq("merkterm, te weinig volume en te lang eruit", uit.map((t) => t.keyword).join("|"), "apk keuring rosmalen|laadpaal thuis kosten");
  // Eén bron kan de rest niet verdringen: 20 brede concurrenttermen met een
  // enorm volume tegen 5 kleine eigen termen, bij 10 plekken. Zonder vast deel
  // per bron waren dat 10 concurrenttermen (udenhout.nl, 23 september 2026:
  // 220 van de 400).
  const breed = Array.from({ length: 20 }, (_, i) =>
    term({ keyword: `merk${i} auto`, volume: 100000 - i, bronnen: ["concurrent"], concurrent: { domein: "x.nl", positie: 3 } }),
  );
  const klein = Array.from({ length: 5 }, (_, i) =>
    term({ keyword: `occasion ${i} kopen`, volume: 50, bronnen: ["eigen"], eigenPositie: 9 }),
  );
  const verdeeld = voorfilter([...breed, ...klein], [], 10);
  eq2("de eigen termen krijgen hun deel", verdeeld.filter((t) => t.bronnen.includes("eigen")).length, 2);
  eq2("en de lijst blijft op tien", verdeeld.length, 10);

  const invoer = [term({ keyword: "occasion kopen", volume: 1900 }), term({ keyword: "auto kopen occasion", volume: 1000 })];
  const gekozen = alleenBestaandeTermen(["kopen occasion", "occasion kopen", "verzonnen term"], invoer);
  eq("model mag bundelen, niet verzinnen of dubbel tellen", gekozen.map((t) => t.keyword).join("|"), "occasion kopen");
});

group("Clusters ontdekken: soort, score en zinnen", () => {
  const snel = kandidaatFeiten([
    term({ keyword: "audi occasions", volume: 9900, eigenPositie: 10, eigenUrl: "https://www.udenhout.nl/occasions" }),
    term({ keyword: "audi occasion kopen", volume: 480, eigenPositie: 15 }),
  ]);
  eq2("volumes van verschillende vragen tellen op", snel.totaalVolume, 10380);
  eq("plek 10 is snelle winst", kandidaatSoort(snel), "snelle_winst");
  const gat = kandidaatFeiten([term({ keyword: "occasion private lease", volume: 22200, concurrent: { domein: "dewaalautogroep.nl", positie: 5 } })]);
  eq("concurrent in top 20, jij nergens", kandidaatSoort(gat), "concurrent_voor");
  eq("niemand, geen positie", kandidaatSoort(kandidaatFeiten([term({ keyword: "laadpaal thuis", volume: 12100 })])), "nieuw_terrein");
  eq("al bovenaan is geen snelle winst", kandidaatSoort(kandidaatFeiten([term({ keyword: "apk den bosch", volume: 300, eigenPositie: 2 })])), "nieuw_terrein");
  eq2("onbekend volume blijft onbekend", kandidaatFeiten([term({ keyword: "x" })]).totaalVolume, null);

  const s = kandidaatScore(snel, "sterk", false);
  // vraag log10(10380) × 8 = 32, positie plek 10 = 25 - 6/16 × 20 = 17,5 → 18, pasvorm 20.
  eq2("score snelle winst", s.score, 32 + 18 + 0 + 20);
  eq2("overlap trekt 30 af", kandidaatScore(snel, "sterk", true).score, s.score - 30);
  eq2("nooit onder nul", kandidaatScore(kandidaatFeiten([]), "redelijk", true).score, 0);

  const zinnen = kaartFeiten(snel, "snelle_winst");
  ok("volume met gevolg", zinnen[0]?.includes("10.380") && zinnen[0]?.includes("AI-assistent"), zinnen[0]);
  ok("positie met gevolg", zinnen[1]?.includes("plek 10") && zinnen[1]?.includes("eerste pagina"), zinnen[1]);
  ok("geen nul-volume-zin", !kaartFeiten(kandidaatFeiten([term({ keyword: "x" })]), "nieuw_terrein").some((z) => z.includes(" 0 keer")));
  ok("geen gedachtestreepjes", !zinnen.join(" ").match(/[\u2013\u2014]/));
});

group("Clusters ontdekken: lijkt op een bestaand cluster", () => {
  const regio = ["Den Bosch", "Eindhoven", "Noord-Brabant"];
  eq("zelfde vraag, andere stad", lijktOp("APK in Eindhoven", ["APK Den Bosch", "Goedkope prive lease"], regio) ?? "", "APK Den Bosch");
  eq("ander onderwerp", lijktOp("Laadpaal thuis laten installeren", ["APK Den Bosch", "Occasion kopen in Noord-Brabant"], regio) ?? "geen", "geen");
});

group("Clusters ontdekken: dubbel binnen één ronde op zoektermen, niet op titelwoorden", () => {
  // De eerste echte ronde (Van den Udenhout, 23 september 2026): het model gaf
  // 9 kandidaten, de titelvergelijking liet er 3 over. Dezelfde titels en
  // termen als toen.
  const k = (titel: string, woorden: string[]) => ({ titel, termen: woorden.map((w) => term({ keyword: w })) });
  const ronde = [
    k("Volkswagen onderhoud en service in de regio", ["volkswagen garage eindhoven", "vw garage", "volkswagen den bosch"]),
    k("Audi onderhoud en service in de regio", ["audi garage eindhoven", "audi garage", "audi dealer den bosch"]),
    k("SEAT onderhoud en service in de regio", ["seat dealer eindhoven", "seat den bosch", "seat dealer"]),
    k("Škoda onderhoud en service in de regio", ["skoda dealer eindhoven", "skoda dealer den bosch", "skoda oss"]),
    k("CUPRA onderhoud en service in de regio", ["cupra dealer eindhoven", "cupra dealer breda", "cupra eindhoven"]),
    k("Een gebruikte auto leasen", ["occasion lease", "occasions leasen", "lease tweedehands auto"]),
    k("Een auto tijdelijk leasen met shortlease", ["shortlease auto", "auto leasen", "auto lease"]),
    k("Een auto huren voor particulier gebruik", ["particulier auto huren", "auto huren vakantie", "autoverhuur"]),
    k("Zakelijk een auto huren", ["auto huren", "autoverhuur", "auto huren eindhoven"]),
  ];
  const gezien: { titel: string; termen: OntdekTerm[] }[] = [];
  for (const r of ronde) if (!dubbelInRonde(r.termen, gezien)) gezien.push(r);
  eq2("alle negen blijven", gezien.length, 9);
  eq(
    "zelfde bewijs is wel dubbel",
    dubbelInRonde([term({ keyword: "vw garage" }), term({ keyword: "garage volkswagen eindhoven" })], [ronde[0]]) ?? "geen",
    "Volkswagen onderhoud en service in de regio",
  );
});

group("Clusters ontdekken: een ronde gaat over één thema (migratie 0111)", () => {
  eq("thema opgeschoond", schoonThema("  private   lease ") ?? "", "private lease");
  ok("te kort is geen thema", schoonThema("ab") === null);
  ok("geen tekst is geen thema", schoonThema(42) === null);
  ok("een lap tekst is geen thema", schoonThema("x".repeat(81)) === null);

  const lease = themaStammen("Private lease");
  ok("leasen hoort erbij", binnenThema("occasions leasen", lease));
  ok("shortlease hoort erbij", binnenThema("shortlease auto", lease));
  ok("apk niet", !binnenThema("apk eindhoven", lease));
  ok("laadpalen vindt laadpaal", binnenThema("laadpaal thuis kosten", themaStammen("Laadpalen")));
  ok("occasions vindt occasion", binnenThema("occasion kopen", themaStammen("Occasions")));
  ok("zonder thema raakt alles", binnenThema("wat dan ook", themaStammen(null)));

  // Binnen elke bron gaat het thema voor, ook boven een groter volume.
  const uit = voorfilter(
    [
      term({ keyword: "volkswagen golf", volume: 90000, bronnen: ["eigen"], eigenPositie: 12 }),
      term({ keyword: "private lease occasion", volume: 900, bronnen: ["eigen"], eigenPositie: 15 }),
    ],
    [],
    1,
    lease,
  );
  eq("thema eerst", uit.map((t) => t.keyword).join("|"), "private lease occasion");

  const knopen = [
    { id: "w", parent_id: null, kind: "categorie", name: "Van den Udenhout" },
    { id: "l", parent_id: "w", kind: "categorie", name: "Lease" },
    { id: "l1", parent_id: "l", kind: "dienst", name: "Private lease" },
    { id: "v", parent_id: "w", kind: "categorie", name: "Vestigingen" },
    { id: "v1", parent_id: "v", kind: "vestiging", name: "Eindhoven" },
    { id: "s", parent_id: "w", kind: "categorie", name: "Service en onderhoud" },
    { id: "s1", parent_id: "s", kind: "dienst", name: "APK" },
  ];
  eq("categorieën met aanbod, geen wortel of vestigingen", themaSuggesties(knopen).join("|"), "Lease|Service en onderhoud");
  eq("zonder categorieën de diensten", themaSuggesties([{ id: "a", parent_id: null, kind: "dienst", name: "Dakgoot reinigen" }]).join("|"), "Dakgoot reinigen");

  const route = leesBestand("app/api/profiles/[id]/discovery/route.ts");
  ok("de route start geen ronde zonder thema", route.includes("schoonThema(") && route.includes("theme: thema"));
});

group("Clusters ontdekken: de klant voegt zelf toe, afwijzen blijft van de consultant (23 september 2026 (4))", () => {
  const route = leesBestand("app/api/profiles/[id]/discovery/route.ts");
  const afwijzen = route.slice(route.indexOf('if (body.actie === "afwijzen")'), route.indexOf('if (body.actie !== "toevoegen")'));
  ok("afwijzen vraagt de consultant", afwijzen.includes("if (!staff)"));
  const toevoegen = route.slice(route.indexOf('if (body.actie !== "toevoegen")'));
  ok("toevoegen vraagt geen consultant", !toevoegen.includes("if (!staff)"));
  ok("de tussenstap aanvragen is weg", !route.includes('"aanvragen"'));
  const kaart = leesBestand("app/(app)/merk/[id]/ontdekken/kandidaat-kaart.tsx");
  ok("de kaart toont geen 'Dit wil ik' meer", !kaart.includes("Dit wil ik"));
  // Toevoegen kost niets; de meting wel, en die start de klant niet zelf.
  eq("een meting starten blijft van de consultant", String(actionNeedsStaff("analyse_starten")), "true");
});

// ════════════════════════════════════════════════════════════════════════════
// UX-audit van 23 september 2026 (docs/logbook.md, 23 september 2026 (12)).
// Elke groep hieronder hoort bij één genummerd punt uit die audit.
// ════════════════════════════════════════════════════════════════════════════

group("UX-audit P0.1: onder 1024 pixels is er toch een menu", () => {
  const chrome = leesBestand("components/workspace-chrome.tsx");
  ok("de desktopbalk draagt de menuknop", chrome.includes("<NavLade"));
  const lade = leesBestand("components/nav-lade.tsx");
  ok("de knop verdwijnt zodra de zijbalk er zelf staat", lade.includes("lg:hidden"));
  ok("de lade toont dezelfde zijbalk, geen tweede menu", lade.includes("<Sidebar"));
});

group("UX-audit P0.2: een vaste actiebalk ligt boven de onderbalk", () => {
  const balk = leesBestand("app/(app)/analyses/[id]/_editors/confirm-bar.tsx");
  ok("de bevestigbalk gebruikt de gedeelde vorm", balk.includes("vaste-actiebalk"));
  ok("en zet zelf geen bottom-0 meer", !balk.includes("bottom-0"));
  const css = leesBestand("app/globals.css");
  ok("met onderbalk schuift hij omhoog", css.includes("body:has(.onderbalk) .vaste-actiebalk"));
});

group("UX-audit P1.2, P1.4, P1.10: één woord per begrip", () => {
  ok("Analytics noemt de meetvragen AI-vragen", !leesBestand("app/(app)/merk/[id]/analytics/page.tsx").includes(">Prompts<"));
  ok("de vragentabel heeft geen kolom Prompt", !leesBestand("components/analytics-prompt-table.tsx").includes('header: "Prompt"'));
  ok("het startscherm zegt AI-vragen", leesBestand("app/(app)/merk/[id]/page.tsx").includes("AI-vragen"));
  const publiceren = [
    "components/pagina/publish-box.tsx",
    "app/(app)/merk/[id]/strategie/plan/plan-view.tsx",
    "lib/pagina-stand.ts",
  ].map(leesBestand).join("\n");
  ok("niemand belooft meer dat de app de pagina live zet", !publiceren.includes('"Zet deze pagina live"') && !publiceren.includes('handeling: "Zet live"'));
  ok("en markeren als geplaatst heet overal live melden", !publiceren.includes('title="Markeer als geplaatst"'));
  ok("Mijn account opent op Mijn account", leesBestand("app/(app)/instellingen/page.tsx").includes('title="Mijn account"'));
  ok("Alle merken opent op Alle merken", leesBestand("app/(app)/beheer/page.tsx").includes('title="Alle merken"'));
  const ui = [...tsxOnder("app"), ...tsxOnder("components")].map(leesBestand).join("\n");
  ok("geen customer success manager meer in de schermen", !/customer success manager/i.test(ui));
});

group("UX-audit P1.1, P1.3, P1.5, P2.9, P2.11: startscherm, eerlijke knoppen, clusterstroom", () => {
  const topics = leesBestand("app/(app)/merk/[id]/_components/topics-panel.tsx");
  ok("een klant krijgt geen knop Cluster starten", topics.includes("!staff && (") && topics.includes("Je consultant start het voor je"));
  ok("geen accentknop per voorstel", !topics.includes("btn-actie"));
  const kaart = leesBestand("app/(app)/merk/[id]/ontdekken/kandidaat-kaart.tsx");
  ok("toevoegen heet wat het doet", kaart.includes("Bewaar als voorstel") && !kaart.includes("Toevoegen aan Mijn clusters"));
  ok("geen accentknop per kandidaat", !kaart.includes("btn-actie"));
  const nieuw = leesBestand("app/(app)/merk/nieuw/page.tsx");
  ok("wie geen merk mag laten onderzoeken krijgt de uitleg, geen formulier", nieuw.includes("COST_DENIED.merk_onderzoeken"));
  const merken = leesBestand("app/(app)/merk/page.tsx");
  ok("een merk in de lijst opent het overzicht", merken.includes('`/merk/${p.id}`'));
  const clusterKaart = leesBestand("app/(app)/merk/[id]/strategie/clusters/cluster-kaart.tsx");
  ok("de clusterkaart linkt naar zijn pagina's", clusterKaart.includes("strategie/bibliotheek?cluster="));
  const wacht = leesBestand("app/(app)/merk/[id]/_components/wachtrij-lijst.tsx");
  ok("open werk is geen groene chip", !wacht.includes("chip chip-success"));
  ok("de maandbalk heet Deze maand", leesBestand("app/(app)/merk/[id]/_components/ronde-balk.tsx").includes(">Deze maand<"));
});

group("UX-audit P1.7: Zichtbaarheid in AI opent met het AI-cijfer", () => {
  const a = leesBestand("app/(app)/merk/[id]/analytics/page.tsx");
  ok("het cijfer staat boven de Google-opbrengst", a.indexOf("merkScore === null ?") < a.indexOf("opbrengstLeeg ? ("));
  ok("een blokkade staat boven de filters", a.indexOf("blokkades.length > 0 &&") < a.indexOf("<AnalyticsFilters"));
  const f = leesBestand("components/analytics-filters.tsx");
  ok("verdiepende filters staan achter Meer filters", f.includes("Meer filters") && f.indexOf('label="Cluster"') < f.indexOf('label="Label"'));
  ok("geen vakjargon Funnel", !f.includes('label="Funnel"'));
});

group("UX-audit P1.8, P1.9: merkdossier zonder crawlgereedschap, support per bestemming", () => {
  const dossier = leesBestand("app/(app)/merk/[id]/merkprofiel/bewerken/page.tsx");
  ok("het uitleesgereedschap staat alleen voor de consultant", /\{staf && \([\s\S]*<InventoryBox/.test(dossier));
  const wizard = leesBestand("app/(app)/merk/[id]/_components/brand-wizard.tsx");
  ok("onderaan geen losse Bewaren-knop meer", !wizard.includes('"Bewaren"'));

  // Elke klantbestemming in de zijbalk heeft uitleg op Support. Zonder deze
  // controle zakte het hoofdstuk Clusters (23 september 2026) ongemerkt weg,
  // omdat de uitleg nog onder Strategie hing.
  const support = leesBestand("app/(app)/support/page.tsx");
  for (const item of brandNav("x", false)) {
    const sleutel = /^[A-Za-z]+$/.test(item.label) ? `${item.label}: (` : `"${item.label}": (`;
    ok(`Support legt "${item.label}" uit`, support.includes(sleutel));
  }
  ok("Support belooft geen clusterdossier meer", !support.includes("eigen dossier met vier hoofdstukken"));
});

group("UX-audit P2.5 tot P2.12: onderbalk, zijbalk, lege staten, reputatie, 404", () => {
  const onder = leesBestand("components/bottom-nav.tsx");
  ok("de onderbalk heeft Clusters", onder.includes('label: "Clusters"'));
  ok("en geen eigen woord Zichtbaar", !onder.includes('label: "Zichtbaar"'));
  const zijbalk = leesBestand("components/sidebar.tsx");
  ok("alleen jij staat bij de kop, niet bij elke regel", !zijbalk.includes("item.staffOnly &&") && zijbalk.includes("kop.afgeschermd &&"));
  ok("een hoofdstuk met één bestemming is één regel", zijbalk.includes("kop.items.length === 1"));
  const clusters = leesBestand("app/(app)/merk/[id]/strategie/clusters/page.tsx");
  ok("lege staten gebruiken het gedeelde onderdeel", !clusters.includes('mono-label">Geen clusters met dit filter') && !clusters.includes('mono-label">Nog geen voorstellen'));
  const rep = leesBestand("app/(app)/merk/[id]/analytics/reputatie/page.tsx");
  ok("het bedrag van een reputatieanalyse alleen voor wie hem start", rep.includes("magStarten\n              ? \"Ongeveer 50 vragen aan ChatGPT, een halfuur werk, ongeveer 75 cent.\""));
  ok("een lopende analyse ververst vanzelf", rep.includes("<VanzelfVerversen"));
  ok("een 404 binnen de app houdt het menu", bestaatBestand("app/(app)/not-found.tsx"));
});

group("UX-audit P1.3, nagekomen: een maand vrijgeven zegt vooraf wie dat doet", () => {
  const knop = leesBestand("app/(app)/merk/[id]/strategie/plan/release-month-button.tsx");
  ok("zonder recht de melding van de kostenpoort, geen knop", knop.includes("if (!staff)") && knop.includes("COST_DENIED.plan_goedkeuren"));
  const bord = leesBestand("app/(app)/merk/[id]/strategie/plan/plan-view.tsx");
  ok("ook op het bord alleen een knop voor wie het mag", bord.includes("Vrijgeven via je consultant"));
});

group("Elke AI-aanroep bewaart wat erin ging (migratie 0112, 23 september 2026)", () => {
  eq("geen invoer, geen opname", String(bouwInvoerOpname(null)), "null");
  const a = bouwInvoerOpname({ system: "Je bent een schrijver.", user: "Schrijf over daklekkage.", schemaName: "content", work: "writing", reasoningEffort: "medium", temperature: null, webSearch: false });
  eq("de systeemopdracht staat er letterlijk in", String(a?.inputJson.system), "Je bent een schrijver.");
  eq("de gebruikersopdracht staat er letterlijk in", String(a?.inputJson.user), "Schrijf over daklekkage.");
  eq("lengte gebruikersopdracht", String(a?.inputJson.tekensGebruiker), "24");
  eq("hash is 16 tekens", String(a?.promptHash?.length), "16");
  // De hash hangt alleen aan de systeemopdracht: een andere klant is geen andere prompt.
  const b = bouwInvoerOpname({ system: "Je bent een schrijver.", user: "Schrijf over dakisolatie." });
  eq("zelfde systeemopdracht, zelfde hash", String(a?.promptHash === b?.promptHash), "true");
  eq("andere systeemopdracht, andere hash", String(promptHash("Je bent een beoordelaar.") === a?.promptHash), "false");
  // Onbekend is geen lege tekst (conventie 3).
  const c = bouwInvoerOpname({ request: { pad: "keywords" } });
  eq("zonder systeemopdracht geen hash", String(c?.promptHash), "null");
  eq("onbekende gebruikersopdracht blijft null", String(c?.inputJson.user), "null");

  // De opname gebeurt op de plek waar élke OpenAI-aanroep langskomt, zodat geen stap hem kan vergeten.
  const structured = leesBestand("lib/openai/structured.ts");
  // Drie sinds 24 september 2026: ook een mislukte JSON-aanroep wordt vastgelegd (punt 18).
  eq("beide aanroepvormen en de mislukte parse geven de invoer door", String((structured.match(/invoerVan\(opts, verstuurd/g) ?? []).length), "3");
  const ledger = leesBestand("lib/openai/ledger.ts");
  ok("het logboek schrijft input_json en prompt_hash", ledger.includes("input_json:") && ledger.includes("prompt_hash:"));
  for (const bestand of ["lib/engines/gemini.ts", "lib/pipeline/measure-llm-response.ts", "lib/pipeline/measure-ai-overview.ts", "lib/discovery/labs.ts"]) {
    ok(`${bestand} geeft invoer mee`, /input: /.test(leesBestand(bestand)) || leesBestand(bestand).includes("record(response"));
  }
});

group("De spoorexport van één merk (kwaliteitsdoorlichting, 23 september 2026)", () => {
  const leeg = spoorPaginering(new URLSearchParams(""));
  eq("standaard aantal", String(leeg.aantal), String(SPOOR_STANDAARD));
  eq("standaard met opdrachten", String(leeg.metInvoer), "true");
  eq("geen startpunt", String(leeg.na), "null");
  eq("te veel wordt begrensd", String(spoorPaginering(new URLSearchParams("aantal=5000")).aantal), String(SPOOR_MAX));
  eq("onzin wordt de standaard", String(spoorPaginering(new URLSearchParams("aantal=abc")).aantal), String(SPOOR_STANDAARD));
  eq("invoer=0 laat de opdrachten weg", String(spoorPaginering(new URLSearchParams("invoer=0")).metInvoer), "false");
  // Microseconden blijven staan, anders komt de laatste rij van de vorige bladzijde terug.
  eq("tijd ongewijzigd", String(spoorPaginering(new URLSearchParams("na=2026-09-23T21:30:01.123456+00:00")).na), "2026-09-23T21:30:01.123456+00:00");
  eq("onleesbare tijd wordt genegeerd", String(spoorPaginering(new URLSearchParams("na=gisteren")).na), "null");
  ok("een uuid komt erdoor", isUuid("e1fe7b94-ead1-4020-a8ed-216905c042c8"));
  ok("een filter niet", !isUuid("x,analysis_id.not.is.null"));
  const route = leesBestand("app/api/beheer/spoor/[profileId]/route.ts");
  ok("alleen voor beheerders", route.includes("isStaff(user.id)") && route.includes("status: 404"));
  ok("alleen lezen", !/\.(insert|update|upsert|delete)\(/.test(route));
});

group("Het gespreksscherm slaat de waarde van de laatste klik op (23 september 2026)", () => {
  // Gevonden in de kwaliteitsdoorlichting: bij een lijst of keuzeknop las het
  // opslaan de waarde van vóór de klik, dus het laatste lijstpunt en elke keuze
  // gingen verloren terwijl het scherm "opgeslagen" toonde.
  const scherm = leesBestand("app/(app)/merk/[id]/_components/onboarding-session.tsx");
  const zet = scherm.slice(scherm.indexOf("function zet("), scherm.indexOf("async function bewaarVeld("));
  ok("zet() werkt de ref meteen bij", zet.includes("waardenRef.current = { ...waardenRef.current, [key]: value }"));
  const bewaar = scherm.slice(scherm.indexOf("async function bewaarVeld("), scherm.indexOf("A4: opslaan bij het sluiten"));
  ok("bewaarVeld leest uit de ref", bewaar.includes("const waarde = waardenRef.current[key]"));
  ok("bewaarVeld leest niet de oude state", !bewaar.includes("waarden[key]"));
});

group("Voorgestelde onderwerpen: volgorde uit de positie, en nooit nul na een mislukte opslag (23 september 2026)", () => {
  eq("eerste onderwerp hoogst", String(topicPrioriteit(0, 8)), "8");
  eq("tweede lager", String(topicPrioriteit(1, 8)), "7");
  eq("nooit onder nul", String(topicPrioriteit(12, 8)), "0");
  eq("altijd een heel getal", String(Number.isInteger(topicPrioriteit(1.5, 8))), "true");
  const bron = leesBestand("lib/pipeline/propose-topics.ts");
  ok("het getal van het model telt niet meer", !bron.includes("MAX_TOPICS - (Number.isFinite(t.priority)"));
  ok("de positie wel", bron.includes("priority: topicPrioriteit(i, MAX_TOPICS)"));
  const opslaan = bron.slice(bron.indexOf('.from("profile_topics").insert('));
  ok("bij een mislukte opslag gaan de concepten terug", opslaan.includes("insert(weggehaald)"));
  ok("en de taak mislukt zichtbaar", opslaan.includes("throw new Error(`Topicvoorstellen opslaan mislukt"));
});

group("Een definitief mislukte Gemini- of Google-meting laat de analyse niet hangen (24 september 2026)", () => {
  const bron = leesBestand("lib/jobs/handlers.ts");
  const tak = bron.slice(bron.indexOf("REPUTATION_STEPS.includes(job.type"), bron.indexOf("export async function runJob("));
  ok("alle drie de meetsoorten plannen de aggregatie na opgeven", tak.includes('"measure_ai_overview", "measure_llm_response"'));
  ok("en ook voor die twee volgt scheduleAggregateIfLastPrompt", (tak.match(/scheduleAggregateIfLastPrompt\(/g) ?? []).length >= 2);
});

group("Het bewijs onder een gap wijst naar echte metingen (24 september 2026)", () => {
  // Gevonden in de kwaliteitsdoorlichting: het model ziet alleen V1, V2, …, gaf
  // die (of niets) terug, en de naamcontrole vond daardoor bij geen enkele gap
  // een toegestane naam. 49 juiste zinnen over concurrenten verdwenen.
  const r1 = "11111111-1111-4111-8111-111111111111";
  const r2 = "22222222-2222-4222-8222-222222222222";
  const dossier = [
    { code: "V1", runId: r1, cluster: "Installateur vinden Geldrop" },
    { code: "V2", runId: r2, cluster: "Offertes vergelijken" },
  ];
  eq("code wordt meet-id", resolveGapEvidence({ cluster: "x", evidenceRunIds: ["V1"] }, dossier).join(), r1);
  eq("kleine letter en tekst eromheen", resolveGapEvidence({ cluster: "x", evidenceRunIds: ["v2, gewicht 0,50"] }, dossier).join(), r2);
  eq("echte meet-id blijft staan", resolveGapEvidence({ cluster: "x", evidenceRunIds: [r2] }, dossier).join(), r2);
  eq("verzonnen code valt weg", resolveGapEvidence({ cluster: "x", evidenceRunIds: ["V23"] }, dossier).length === 0 ? "leeg" : "gevuld", "leeg");
  eq("leeg: code uit de clusternaam", resolveGapEvidence({ cluster: "V2 \u2014 Offertes", evidenceRunIds: [] }, dossier).join(), r2);
  eq("leeg: dezelfde clusternaam", resolveGapEvidence({ cluster: "installateur vinden geldrop", evidenceRunIds: [] }, dossier).join(), r1);
  eq("niets te vinden blijft leeg", resolveGapEvidence({ cluster: "Onbekend", evidenceRunIds: [] }, dossier).length === 0 ? "leeg" : "gevuld", "leeg");
  eq("geen dubbelingen", resolveGapEvidence({ cluster: "x", evidenceRunIds: ["V1", r1, "V1"] }, dossier).length === 1 ? "één" : "meer", "één");
  eq("code voor de clusternaam gaat weg", schoonGapCluster("V1 \u2014 Proefles bij faalangst"), "Proefles bij faalangst");
  eq("ook met dubbele punt", schoonGapCluster("V12: Kosten"), "Kosten");
  eq("gewone naam blijft", schoonGapCluster("Vijver aanleggen in Best"), "Vijver aanleggen in Best");
  eq("alleen een code blijft staan", schoonGapCluster("V3"), "V3");
  const bron = leesBestand("lib/pipeline/report.ts");
  const controle = bron.slice(bron.indexOf("async function validateReportClaims("), bron.indexOf("export async function generateReport("));
  ok("de naamcontrole vertaalt eerst de codes", controle.includes("evidenceRunIds: resolveGapEvidence(gap, dossier)"));
});

group("Het rapport zegt niet 'nergens genoemd' als Google het merk wel noemde (24 september 2026)", () => {
  const labels = [
    { id: "openai", label: "ChatGPT" },
    { id: "google_ai_overview", label: "Google AI Overview" },
  ];
  // De echte cijfers van de rijschool: ChatGPT 0, Google 23.
  const rijschool = {
    openai: { score: 0, judged_runs: 30 },
    google_ai_overview: { score: 23, judged_runs: 25 },
  };
  eq("Google telt mee", bronnenDieWelNoemden(rijschool, "openai", labels).join(), "Google AI Overview");
  eq("ChatGPT zelf telt niet", bronnenDieWelNoemden({ openai: { score: 40, judged_runs: 30 } }, "openai", labels).length === 0 ? "leeg" : "gevuld", "leeg");
  eq("zonder metingen telt niet", bronnenDieWelNoemden({ google_ai_overview: { score: 20, judged_runs: 0 } }, "openai", labels).length === 0 ? "leeg" : "gevuld", "leeg");
  eq("onleesbaar telt niet", bronnenDieWelNoemden("rommel", "openai", labels).length === 0 ? "leeg" : "gevuld", "leeg");
  ok("de schrijfregel noemt de bron", bronnenRegel(["Google AI Overview"]).includes("In Google AI Overview werd het merk WEL genoemd"));
  ok("en geen cijfer van die bron", !/\d/.test(bronnenRegel(["Google AI Overview"])));
  eq("zonder andere bron geen regel", bronnenRegel([]), "");
  const echt =
    "Dit is de eerste meting. Pompert werd niet genoemd bij de 30 onderzochte vragen. De zichtbaarheid is daarmee ongeveer 0 op 100.";
  const aangevuld = vulBronnenAan(echt, ["Google AI Overview"]);
  ok("de echte zin wordt aangevuld", aangevuld.aangevuld);
  ok("met Google erbij", aangevuld.summary.endsWith("in Google AI Overview werd het merk wel genoemd."));
  ok("de oorspronkelijke tekst blijft staan", aangevuld.summary.startsWith(echt));
  ok("een zin met ChatGPT erin is al juist", !vulBronnenAan("In ChatGPT werd Pompert niet genoemd.", ["Google AI Overview"]).aangevuld);
  ok("een gewone score-zin blijft", !vulBronnenAan("Het merk komt uit op ongeveer 15 op 100.", ["Google AI Overview"]).aangevuld);
  ok("zonder andere bron niets", !vulBronnenAan(echt, []).aangevuld);
  const bron = leesBestand("lib/pipeline/report.ts");
  ok("het rapport gebruikt het vangnet", bron.includes("vulBronnenAan("));
  ok("en geeft de regel mee", bron.includes("bronnenRegel("));
});

group("Rapport na de herhaling op echte data: drie restfouten (24 september 2026)", () => {
  const echt =
    "In ChatGPT is Pompert niet genoemd. Ook bij de gewogen score is Pompert niet genoemd. Dit zegt alleen iets over ChatGPT: in Google AI Overview werd Pompert wél genoemd.";
  ok("het model noemde Google al: geen tweede zin", !vulBronnenAan(echt, ["Google AI Overview"]).aangevuld);
  const vsb = stripUnsupportedClaims("In dat antwoord stonden Broers en Verwarming Service Brabant.", {
    knownNames: ["Verwarming Service Brabant", "Verwarming Service Brabant (VSB)", "Broers"],
    allowedNames: ["Broers", "Verwarming Service Brabant (VSB)"],
    where: "test",
  });
  eq("de korte naam telt als de lange met haakjes", vsb.stripped.length === 0 ? "blijft" : "weg", "blijft");
  const ander = stripUnsupportedClaims("In dat antwoord stond Kemkens.", {
    knownNames: ["Kemkens"],
    allowedNames: ["Kemkens Eindhoven (KE)"],
    where: "test",
  });
  eq("maar een andere naam blijft verboden", ander.stripped.length === 1 ? "weg" : "blijft", "weg");
  const bron = leesBestand("lib/pipeline/evidence.ts");
  ok("een eigen product telt niet als concurrentnaam", bron.includes('if (e.entity_role === "eigen_product") continue;'));
});

group("Een klaar cluster is aan te klikken (24 september 2026)", () => {
  const kaart = leesBestand("app/(app)/merk/[id]/strategie/clusters/cluster-kaart.tsx");
  const kop = kaart.slice(kaart.indexOf("const kopLink ="), kaart.indexOf("const analyticsLink ="));
  ok("de kop linkt ook bij gereed", kop.includes('analyse.status === "gereed"'));
  ok("de links onder de kaart ook", kaart.includes('(analyse.status === "gemeten" || analyse.status === "gereed") && ('));
});

group("Het contentplan zegt de klant vooraf dat de consultant het opstelt (24 september 2026)", () => {
  const box = leesBestand("app/(app)/merk/[id]/strategie/plan/create-plan-box.tsx");
  ok("de klant krijgt de melding in plaats van de knop", box.includes("{mag && !staff && (") && box.includes("COST_DENIED.content_schrijven"));
  ok("de knop alleen voor de consultant", box.includes("{mag && staff && ("));
  ok("geen belofte dat de klant het zelf doet", !box.includes("stel je het plan zelf op"));
});

group("De potentie van een geplande pagina volgt de regel van het rapport (24 september 2026)", () => {
  // De echte stand bij de installateur: ChatGPT noemde hem 1 van de 3 keer,
  // Google 0 van de 3. Het rapport: gemist. Het plan gaf potentie 0.
  const m = (runId: string, engine: string, mentioned: boolean) => ({ runId, promptId: "geldrop", engine, mentioned });
  const geldrop = [m("a", "openai", true), m("b", "openai", false), m("c", "openai", false), m("d", "google_ai_overview", false), m("e", "google_ai_overview", false), m("f", "google_ai_overview", false)];
  eq("één keer genoemd is niet genoeg", String(genoemdPerVraag(geldrop).get("geldrop")), "false");
  const beide = [m("a", "openai", true), m("d", "google_ai_overview", true)];
  eq("genoemd in beide bronnen telt als genoemd", String(genoemdPerVraag(beide).get("geldrop")), "true");
  const gelijk = [m("a", "openai", true), m("d", "google_ai_overview", false)];
  eq("een gelijke stand tussen bronnen telt als gemist, net als in het rapport", String(genoemdPerVraag(gelijk).get("geldrop")), "false");
  const bron = leesBestand("lib/potential-data.ts");
  ok("de potentie gebruikt die regel", bron.includes("genoemdPerVraag("));
  ok("en niet meer 'genoemd wint'", !bron.includes("(mentioned && !huidig)"));
});

group("Antwoorden op paginavragen worden geen sitefeit (24 september 2026)", () => {
  ok("vraag uit de voorbereiding blijft bij de pagina", !moetNaarProofPoints({ claim_key: "prijsband tuin", scope: "pagina" }));
  ok("ook zonder sleutel als hij aan een pagina hangt", !moetNaarProofPoints({ claim_key: null, scope: "pagina" }));
  ok("ook een analysevraag met sleutel", !moetNaarProofPoints({ claim_key: "iets", scope: "analyse" }));
  ok("een losse merkvraag gaat wel mee", moetNaarProofPoints({ claim_key: null, scope: "merk" }));
  ok("answerFact gebruikt de regel", leesBestand("lib/facts.ts").includes("if (!moetNaarProofPoints(fact))"));
});

group("De consultant en de accountleden zien de clusters van een merk (24 september 2026)", () => {
  const work = leesBestand("lib/work.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const q = work.slice(work.indexOf("export async function loadBrandWork("), work.indexOf("const analyses = (data ?? []) as Analysis[];"));
  ok("de clusterlijst filtert op het merk", q.includes('.eq("profile_id", profileId)'));
  ok("en niet meer op wie hem aanmaakte", !q.includes('.eq("user_id"'));
  const pagina = leesBestand("app/(app)/merk/[id]/strategie/clusters/page.tsx");
  ok("de prullenbak ook niet", !pagina.includes('.eq("user_id", user.id)'));
  ok("en de lijst gebruikt de client met de sessie", pagina.includes("const supabase = await createClient();") && pagina.includes("loadDashboard(supabase,"));
});


group("Meetvragen over de groeiplaatsen (verbeterronde, punt 5)", () => {
  const groei = ["Mierlo", "Heeze-Leende", "Nuenen"];
  eq("werkgebied plus groeiplaatsen, zonder dubbelen", toegestanePlaatsen(["Geldrop", "Eindhoven"], ["Nuenen", "eindhoven"]).join(","), "Geldrop,Eindhoven,Nuenen");
  eq("zonder groeiplaatsen alleen het werkgebied", toegestanePlaatsen(["Geldrop"], null).join(","), "Geldrop");
  ok("een groeiplaats telt", containsPlace("Welke installateur in Mierlo vervangt een cv-ketel?", groei));
  ok("met koppelteken ook", containsPlace("Wie doet onderhoud in Heeze-Leende?", groei));
  ok("de provincie telt hier niet", !containsPlace("Welke installateur in Brabant?", groei));
  ok("in de buurt ook niet", !containsPlace("Welke installateur bij mij in de buurt?", groei));
  // De echte uitkomst van de doorlichting: 10 vragen over Geldrop en Eindhoven.
  const oud = Array.from({ length: 10 }, (_, i) => `Welke installateur in ${i % 2 ? "Geldrop" : "Eindhoven"} doet ${i}?`);
  const b = groeiBalans(oud, groei, 10);
  eq("drie van de tien moeten over een groeiplaats", `${b.aantal}/${b.nodig}/${b.tekort}`, "0/3/3");
  eq("zonder groeiplaatsen is er geen eis", String(groeiBalans(oud, [], 10).nodig), "0");
  eq("de laatste drie wijken, hoogste eerst", wijkbaarVoorGroei(oud, groei, 3).join(","), "9,8,7");
  const gemengd = [...oud.slice(0, 9), "Wie in Nuenen plaatst een warmtepomp?"];
  eq("een groeivraag wijkt nooit", wijkbaarVoorGroei(gemengd, groei, 2).join(","), "8,7");
  const prompts = leesBestand("lib/pipeline/prompts.ts");
  ok("de generator telt de groeivragen na", prompts.includes("groeiBalans(collected.map((p) => p.text), groei, collected.length)"));
  ok("en de lokale regel noemt de groeiplaatsen als toegestaan", prompts.includes("toegestanePlaatsen(brand.serviceRegions, groei)"));
  ok("de opdracht vraagt een aantal, geen deel", growthRegionsRule({ growth_regions: groei }, { nodig: 3, van: 10 }).includes("MINSTENS 3 van de 10 vragen"));
});


group("Het rapport weegt de groeidoelen zwaar (verbeterronde, punt 24 en 27)", () => {
  // De echte gespreksvelden van de drie bedrijven uit de doorlichting.
  const rijschool = groeiKernwoorden({
    priority_offerings: ["Rijles bij faalangst, autisme en ADHD", "Rijles in de automaat"],
    growth_regions: ["Veldhoven", "Best", "Son en Breugel"],
  });
  ok("faalangst is een kernwoord", rijschool.woorden.includes("faalangst"));
  ok("ADHD als afkorting ook", rijschool.woorden.includes("adhd"));
  ok("rijles niet, dat staat in elke aanbeveling", !rijschool.woorden.includes("rijles"));
  ok("een pagina over autisme raakt het groeidoel", raaktGroeidoel("Rijles met autisme in Eindhoven", rijschool));
  ok("een pagina voor Son en Breugel ook", raaktGroeidoel("Rijschool in Son en Breugel", rijschool));
  ok("Best niet in 'beste'", !raaktGroeidoel("De beste rijschool in Helmond", rijschool));
  ok("Helmond is geen groeiplaats", !raaktGroeidoel("Rijschool in Helmond", rijschool));
  const installateur = groeiKernwoorden({
    priority_offerings: ["Hybride warmtepompen", "Cv-ketelvervanging met onderhoudscontract"],
    growth_regions: ["Mierlo"],
  });
  ok("warmtepompen wordt warmtepomp", installateur.woorden.includes("warmtepomp"));
  ok("en raakt het enkelvoud", raaktGroeidoel("Wat kost een hybride warmtepomp?", installateur));

  const rec = (title: string, weight: number, priority: number) => ({
    title, type: "landing" as const, targetIntent: "", why: "", priority,
    action: "nieuw" as const, existingUrl: null, relatedUrl: null,
    targets: [{ promptId: title, runId: null, text: title, cluster: null, weight }],
  });
  // De hovenier kreeg Best en Nuenen op prioriteit 10, achteraan.
  const hovenier = groeiKernwoorden({ priority_offerings: ["Zwemvijvers"], growth_regions: ["Best", "Nuenen"] });
  const uit = rangschikAanbevelingen(
    [rec("Tuinaanleg in Eindhoven", 0.6, 1), rec("Hovenier in Nuenen", 0.4, 10), rec("Kunstgras leggen", 0.9, 2)],
    hovenier,
    groeiKernwoorden({ priority_offerings: ["Kunstgras als losse opdracht"], growth_regions: [] }).woorden,
    raaktGroeidoel,
  );
  eq("de groeiplaats gaat voor (0,4 keer 2 tegen 0,6)", uit.aanbevelingen.map((r) => r.title).join(" | "), "Hovenier in Nuenen | Tuinaanleg in Eindhoven");
  eq("opnieuw genummerd, 1 is het belangrijkst", uit.aanbevelingen.map((r) => r.priority).join(","), "1,2");
  eq("kunstgras wil de klant niet", uit.geschrapt.map((r) => r.title).join(","), "Kunstgras leggen");
  ok("de factor is twee", GROEI_FACTOR === 2);
  const gelijk = rangschikAanbevelingen([rec("B", 0.5, 2), rec("A", 0.5, 1)], { plaatsen: [], woorden: [] }, [], raaktGroeidoel);
  eq("bij gelijk gewicht beslist het getal van het model", gelijk.aanbevelingen.map((r) => r.title).join(","), "A,B");

  const stuur = reportSteering({
    priority_offerings: ["Hybride warmtepompen"], deprioritised_offerings: [], growth_regions: ["Mierlo"],
    target_segments: [], forbidden_topics: [], offline_proof: ["Meer dan 1.800 onderhoudscontracten"],
  });
  ok("de rapportinvoer noemt Mierlo", stuur.includes("Mierlo"));
  ok("en het bewijs uit het gesprek, als niet opnieuw te vragen", stuur.includes("1.800") && stuur.includes("NIET opnieuw"));
  ok("een leeg profiel levert niets op", reportSteering({ priority_offerings: [], deprioritised_offerings: [], growth_regions: [], target_segments: [], forbidden_topics: [], offline_proof: [] }) === "");
  const report = leesBestand("lib/pipeline/report.ts");
  ok("het rapport slaat de gerangschikte volgorde op", report.includes("eenVerbeteringPerAdres(gerangschikt, canonicalKey)") && report.includes("recommendations_json: perAdres as never"));
  ok("en de instructie zegt welke kant priority op gaat", report.includes("1 is de belangrijkste aanbeveling"));
});


group("Vragen die het gesprek al beantwoordde of die er al staan (verbeterronde, punt 35 en 36)", () => {
  // De echte gespreksvelden en vragen van de installateur.
  const gesprek = {
    offline_proof: [
      "Twaalf monteurs in dienst",
      "Storingsdienst voor contractklanten: binnen 24 uur bij een storing, ook in het weekend",
      "Meer dan 1.800 onderhoudscontracten",
    ],
    service_regions: ["Geldrop", "Eindhoven"],
    growth_regions: ["Mierlo", "Heeze-Leende", "Nuenen"],
  };
  eq("de monteursvraag", String(gesprekBeantwoordt("Hoeveel eigen monteurs werken er momenteel bij het bedrijf?", gesprek)), "Twaalf monteurs in dienst");
  eq("de plaatsvraag", String(gesprekBeantwoordt("In welke plaatsen buiten Geldrop en Eindhoven neemt u opdrachten aan?", gesprek)), "Werkt nu in Geldrop, Eindhoven, wil groeien in Mierlo, Heeze-Leende, Nuenen.");
  eq("de contractvraag zonder meer", String(gesprekBeantwoordt("Biedt u onderhoudscontracten aan?", gesprek)), "Meer dan 1.800 onderhoudscontracten");
  // Streng: een vraag die meer vraagt dan het gesprek zegt, blijft open.
  eq("contracten voor welke toestellen zegt het gesprek niet", String(gesprekBeantwoordt("Biedt u onderhoudscontracten aan voor cv-ketels, warmtepompen of airco's?", gesprek)), "null");
  eq("een ander feit over monteurs ook niet", String(gesprekBeantwoordt("Hoeveel monteurs hebben een F-gassencertificaat?", gesprek)), "null");
  eq("buiten kantoortijden staat er niet", String(gesprekBeantwoordt("Kunnen klanten buiten kantoortijden een storing melden, en voor welke storingen rijdt u dan uit?", gesprek)), "null");
  eq("een plaatsvraag met een afstand erbij blijft open", String(gesprekBeantwoordt("In welke plaatsen nemen jullie opdrachten aan, en tot hoeveel kilometer vanaf Eindhoven?", gesprek)), "null");
  eq("zonder werkgebied geen antwoord", String(gesprekBeantwoordt("In welke plaatsen werkt u?", { offline_proof: [], service_regions: [], growth_regions: [] })), "null");

  ok("dezelfde vraag, korter gesteld", zelfdeVraag("Wat is doorgaans de wachttijd voor een eerste gesprek?", "Wat is de gebruikelijke wachttijd voor een eerste gesprek en voor de start van tuinaanleg?"));
  ok("dezelfde vraag, ander slot", zelfdeVraag("Welke merken en modellen hybride warmtepompen leveren of installeren jullie?", "Welke merken of modellen hybride warmtepompen kunnen jullie leveren of met elkaar vergelijken?"));
  ok("prijs en levensduur zijn twee vragen", !zelfdeVraag("Wat kost een hybride warmtepomp?", "Hoe lang gaat een hybride warmtepomp mee?"));
  ok("ook met een plaats erbij", !zelfdeVraag("Wat kost een hybride warmtepomp in Mierlo?", "Hoe lang duurt de installatie van een hybride warmtepomp in Mierlo?"));
  ok("onderhoud en merken zijn twee vragen", !zelfdeVraag("Welk onderhoud voeren jullie uit aan hybride warmtepompen?", "Welke merken hybride warmtepompen leveren jullie?"));

  ok("het rapport filtert zijn vragen", leesBestand("lib/pipeline/report.ts").includes("filterNieuweMerkvragen("));
  ok("het merkonderzoek ook", leesBestand("lib/pipeline/synthesis.ts").includes("filterNieuweMerkvragen("));
  ok("en opslaan van het gesprek sluit open vragen", leesBestand("app/api/profiles/[id]/route.ts").includes("sluitVragenUitGesprek(admin, id)"));
  ok("alleen vragen die niet aan een pagina hangen", leesBestand("lib/vraag-sluiten.ts").includes("if ((rij.content_piece_ids ?? []).length > 0) continue;"));
});


group("De crawl leest de site zoals de eigenaar hem bedoelt (verbeterronde, punt 4, 10 en 28)", () => {
  // Punt 10: de echte adressen van de rijschool.
  const r = "https://www.autorijschoolpompert.nl";
  for (const pad of [
    "/tag/rijlessen/", "/category/uncategorized/", "/author/wetalkseo/",
    "/autorijschool-pompert/autorijschool_pompert_eindhoven_10/",
    "/ons-team-en-wagenpark/whatsapp-image-2022-06-21-at-4-42-28-pm/",
    "/ons-team-en-wagenpark/95588177_255747952474662_8504102822831612049_n/",
    "/rijsimulator/img_20220711_162136/", "/pech-onderweg-moet/pexels-photo-1/",
    "/hoe-werkt-een-tussentijdse-toets-bij-rijexamens/attachment/8722/",
    "/wp-content/uploads/2022/07/rijopleiding-in-stappen.jpeg", "/feed/",
  ]) ok(`weg: ${pad}`, isArchiefOfBijlage(r + pad));
  for (const pad of ["/", "/rijschool-best/", "/prijzen-lespakketten/", "/faalangst-autisme-spectrum-stoornissen-en-ad-h-d/", "/diensten/tuinaanleg/", "/foto-galerij/"]) {
    ok(`blijft: ${pad}`, !isArchiefOfBijlage(r + pad));
  }
  ok("de tagsitemap van Yoast gaat niet open", isArchiefSitemap("https://hansverstraatenhoveniers.nl/post_tag-sitemap.xml"));
  ok("de paginasitemap wel", !isArchiefSitemap("https://hansverstraatenhoveniers.nl/page-sitemap.xml"));
  // Een bijlage met een gewone naam valt pas na het ophalen op (echte body-klassen van de rijschool).
  ok("bijlage na ophalen herkend", isBijlageHtml(`<html><body class="attachment attachment-template-default single single-attachment postid-534 attachmentid-534 attachment-jpeg min-h-full">`));
  ok("een gewone pagina niet", !isBijlageHtml(`<html><body class="page-template-default page page-id-2789 min-h-full">`));

  // Punt 4: een trage server vraagt minder tegelijk.
  eq("acht met een time-out wordt vier", String(volgendeBatchgrootte(8, 1)), "4");
  eq("niet onder de twee", String(volgendeBatchgrootte(2, 3)), "2");
  eq("zonder time-out gelijk", String(volgendeBatchgrootte(8, 0)), "8");
  const traag = assessInventory(
    [{ url: "https://h.nl/", title: "Home", text: "x".repeat(900) }, ...Array.from({ length: 9 }, (_, i) => ({ url: `https://h.nl/p${i}/`, title: "P", text: i < 5 ? "x".repeat(900) : null }))],
    { totalFound: 70, traagNietGelezen: 4 },
  );
  ok("een trage site krijgt een eerlijke melding", (traag.advice ?? "").includes("reageerde traag"));
  ok("en geen JavaScript-diagnose", !(traag.advice ?? "").includes("JavaScript"));

  // Punt 28: het menu van de homepage, en de menupagina's vooraan.
  const html = `<header><nav><a href="/">Home</a><a href="/faalangst-autisme-spectrum-stoornissen-en-ad-h-d/">Faalangst</a><a href="/wp-content/uploads/a.jpg">x</a></nav></header><main><a href="/blog/iets/">blog</a></main>`;
  const wpMenu = `<div><ul><li id="menu-item-2099" class="menu-item menu-item-type-post_type"><a href="https://www.autorijschoolpompert.nl/faalangst-autisme-spectrum-stoornissen-en-ad-h-d/">Rijles met faalangst</a></li></ul></div><p><a href="/blog/x/">blog</a></p>`;
  eq("ook de menu-items van WordPress buiten een nav", menuLinks(wpMenu, r, "www.autorijschoolpompert.nl").map((u) => u.replace(r, "")).join(","), "/faalangst-autisme-spectrum-stoornissen-en-ad-h-d/");
  eq("alleen de menulinks, zonder bestanden", menuLinks(html, r, "www.autorijschoolpompert.nl").map((u) => u.replace(r, "")).join(","), "/,/faalangst-autisme-spectrum-stoornissen-en-ad-h-d/");
  const gekozen = [r + "/", r + "/blog-a/", r + "/blog-b/", r + "/blog-c/"];
  eq(
    "homepage eerst, dan het menu, binnen het maximum",
    metMenuVoorrang(gekozen, [r + "/faalangst/", r], 3).map((u) => u.replace(r, "")).join(","),
    "/,/faalangst/,/blog-a/",
  );
  ok("de ontdekkingsstap zet het menu vooraan", leesBestand("lib/pipeline/discover.ts").includes("metMenuVoorrang(selectie.urls, menu, maxPages)"));
  ok("en plant bij een trage site een aanvulronde", leesBestand("lib/jobs/handlers.ts").includes("ontdekt.traagNietGelezen > 0"));
});


group("Een verbetering houdt de functie van de pagina (verbeterronde, punt 45)", () => {
  eq("homepage", paginaSoort("https://hansverstraatenhoveniers.nl"), "homepage");
  eq("de prijzenpagina van de rijschool", paginaSoort("https://www.autorijschoolpompert.nl/prijzen-lespakketten/"), "prijzen");
  eq("contact met volgnummer", paginaSoort("https://hansverstraatenhoveniers.nl/contact-2/"), "contact");
  eq("een plaatspagina is een onderwerp", paginaSoort("https://hansverstraatenhoveniers.nl/hovenier-in-best/"), "onderwerp");
  ok("de homepage is niet te vervangen", isFunctiepagina("https://hansverstraatenhoveniers.nl/"));
  ok("een prijzenpagina wel te verbeteren", !isFunctiepagina("https://www.autorijschoolpompert.nl/prijzen-lespakketten/"));
  const blok = functieblok("https://www.autorijschoolpompert.nl/prijzen-lespakketten/", "Autorijles pakketten & prijzen");
  ok("het blok zegt dat alle prijzen blijven", blok.includes("Alle prijzen en pakketten") && blok.includes("Autorijles pakketten & prijzen"));
  eq("zonder bestaande pagina geen blok", functieblok(null, null), "");

  // De echte aanbeveling van de hovenier: de homepage verbeteren.
  const { recommendations, overrides } = reconcileExistingPageActions(
    [{ title: "Maak de bestaande hoofdpagina concreter over complete tuinen en bestrating", targetIntent: "Een huiseigenaar in Helmond", why: "", action: "verbeteren" as "verbeteren" | "nieuw", existingUrl: "https://hansverstraatenhoveniers.nl" as string | null, relatedUrl: null as string | null }],
    [{ url: "https://hansverstraatenhoveniers.nl", title: "Hovenier Eindhoven", text: "Tuinaanleg, bestrating, tuinontwerp" }],
  );
  eq("wordt een nieuwe pagina", recommendations[0].action, "nieuw");
  eq("met de homepage als verwante pagina", String(recommendations[0].relatedUrl), "https://hansverstraatenhoveniers.nl");
  eq("en de reden staat erbij", overrides[0]?.reason ?? "", "functiepagina");
});


group("Het plan is uitvoerbaar (verbeterronde, punt 31, 32 en 33)", () => {
  // Punt 31: vier verbeteringen van /warmtepomp in dezelfde week bij de installateur.
  const maanden: OpenMaand[] = [1, 2, 3, 4, 5].map((n) => ({
    id: `m${n}`, monthNumber: n, status: n === 1 ? "ter_goedkeuring" : "concept", huidigAantal: 0, huidigBuffers: 0, magNogVullen: true,
  }));
  const adres = "wkinstallatie.nl/warmtepomp";
  const uit = bepaalVulling({
    openMaanden: maanden,
    voorraadIds: ["keuzehulp", "controle", "prijs", "nieuwe-pagina"],
    pagesPerMonth: 5,
    adresVan: new Map([["keuzehulp", adres], ["controle", adres], ["prijs", adres]]),
  });
  const maandVan = (id: string) => uit.opdrachten.find((o) => o.backlogIds.includes(id) || o.bufferIds.includes(id))?.monthNumber ?? 0;
  eq("de eerste verbetering in maand 1, samen met de nieuwe pagina", `${maandVan("keuzehulp")},${maandVan("nieuwe-pagina")}`, "1,1");
  eq("de tweede pas drie maanden later", String(maandVan("controle")), "4");
  eq("de derde past niet meer in vijf maanden", String(uit.restendeVoorraadIds.includes("prijs")), "true");
  ok("de tussenruimte is drie maanden", VERBETER_TUSSENRUIMTE_MAANDEN === 3);
  const alBezet = bepaalVulling({
    openMaanden: maanden.slice(1), voorraadIds: ["controle"], pagesPerMonth: 5,
    adresVan: new Map([["controle", adres]]), bezet: new Map([[adres, [1]]]),
  });
  eq("een verbetering in een vrijgegeven maand telt ook mee", String(alBezet.opdrachten.find((o) => o.backlogIds.includes("controle"))?.monthNumber), "4");

  // En in het rapport: de tweede verbetering van dezelfde pagina wordt een nieuwe pagina.
  const rec = (title: string, url: string | null, action: "nieuw" | "verbeteren") => ({
    title, type: "landing" as const, targetIntent: "", why: "", priority: 1, action, existingUrl: url, relatedUrl: null, targets: [],
  });
  const r = eenVerbeteringPerAdres(
    [rec("Keuzehulp", "https://www.wkinstallatie.nl/warmtepomp", "verbeteren"), rec("Prijs", "https://wkinstallatie.nl/warmtepomp/", "verbeteren"), rec("Mierlo", null, "nieuw")],
    canonicalKey,
  );
  eq("de eerste blijft een verbetering", r.aanbevelingen.map((a) => a.action).join(","), "verbeteren,nieuw,nieuw");
  eq("de tweede wijst naar de pagina als verwante pagina", String(r.aanbevelingen[1].relatedUrl), "https://wkinstallatie.nl/warmtepomp/");

  // Punt 33: nooit een streefdatum in het verleden.
  eq("op tijd", streefzin("2026-10-20", "2026-09-24"), "Beantwoord ze graag vóór 8 oktober om op schema te blijven.");
  ok("te laat: zo snel mogelijk, zonder datum in het verleden", streefzin("2026-09-25", "2026-09-24").startsWith("Beantwoord ze zo snel mogelijk") && !streefzin("2026-09-25", "2026-09-24").includes("13 september"));
  eq("zonder datum niets", streefzin(null, "2026-09-24"), "");
  ok("beide vrijgeefdialogen gebruiken het", leesBestand("app/(app)/merk/[id]/strategie/plan/plan-view.tsx").includes("streefzin(eerste, new Date().toISOString())") && leesBestand("app/(app)/merk/[id]/strategie/plan/release-month-button.tsx").includes("streefzin(eersteDatum"));
});


group("De kennistest en de naamlijst meten het merk eerlijk (verbeterronde, punt 3 en 6)", () => {
  // Punt 3: de echte voorstellen van de drie merken.
  const rijschool = ["Autorijschool Pompert", "Rijschool Pompert", "Pompert"];
  ok("Pompert Autorijschool is het merk zelf", isEigenSchrijfwijze("Pompert Autorijschool", rijschool));
  ok("Autorijschool Pompert / Pompert ook", isEigenSchrijfwijze("Autorijschool Pompert / Pompert", rijschool));
  ok("een andere Pompert blijft op de lijst", !isEigenSchrijfwijze("Pompert Bouw", rijschool));
  ok("Rijschool Peter Pompert beslist de consultant", !isEigenSchrijfwijze("Rijschool Peter Pompert", rijschool));
  const installateur = ["Wesley Keeris Installatietechniek", "WK Installatie", "Wesley Keeris"];
  ok("Wesley Keeris Installatiebedrijf B.V is het merk", isEigenSchrijfwijze("Wesley Keeris Installatiebedrijf B.V", installateur));
  ok("Wesley Keeris Beheer B.V ook", isEigenSchrijfwijze("Wesley Keeris Beheer B.V", installateur));
  ok("Hoveniersbedrijf Hans Verstraaten B.V ook", isEigenSchrijfwijze("Hoveniersbedrijf Hans Verstraaten B.V", ["Hans Verstraaten Hoveniers", "Hans Verstraaten"]));
  eq(
    "de verwarringslijst houdt alleen de andere partij over",
    haalVerwarringen("- **Pompert Autorijschool**\n- **Pompert Bouw** in Tilburg", rijschool).join(","),
    "Pompert Bouw",
  );
  ok("de meting filtert ook een al gevulde lijst", leesBestand("lib/pipeline/measure.ts").includes("!isEigenSchrijfwijze(n, [base"));

  // Punt 6: de echte antwoorden van de kennistest.
  const nee = [
    "Autorijschool Pompert lijkt een lokale rijschool in Eindhoven. Ik kan niet betrouwbaar bevestigen wie de eigenaar is.",
    "Ik heb geen betrouwbare, actuele gegevens over Autorijschool Pompert in Eindhoven en wil daarom geen details verzinnen.",
    "Hans Verstraaten Hoveniers lijkt de naam van een hoveniersbedrijf in Eindhoven te zijn. Ik kan niet met zekerheid bevestigen wie de eigenaar is.",
    "Wesley Keeris Installatietechniek is een installatiebedrijf in Geldrop. Op basis van de bedrijfsnaam lijkt het zich bezig te houden met installatiewerk.",
    "Ik heb geen betrouwbare, actuele informatie over **Wesley Keeris Installatietechniek** paraat. De naam suggereert een installatiebedrijf.",
  ];
  for (const a of nee) ok(`geen herkenning: ${a.slice(0, 45)}`, !kentMerk(a, "Autorijschool Pompert", ["Hans Verstraaten Hoveniers", "Wesley Keeris Installatietechniek"]));
  ok(
    "echte kennis blijft herkenning",
    kentMerk("Voor zover bekend is Hans Verstraaten Hoveniers een hoveniersbedrijf in Eindhoven. Het houdt zich bezig met tuinontwerp, tuinaanleg en tuinonderhoud.", "Hans Verstraaten Hoveniers"),
  );
  ok(
    "ook met een voorbehoud over details (Fysi-Unique)",
    kentMerk("Fysi-Unique in Amersfoort is een fysiotherapiepraktijk. Ik kan zonder actuele website-informatie niet met zekerheid zeggen welke specialisaties zij aanbieden.", "Fysi-Unique"),
  );
});


group("Kleine punten uit de doorlichting (verbeterronde blok F, punt 12, 18, 23 en 38)", () => {
  // Punt 23: dezelfde concurrent met en zonder afkorting.
  ok("met afkorting tussen haakjes is hetzelfde bedrijf", isSameEntity("Verwarming Service Brabant (VSB)", "Verwarming Service Brabant"));
  ok("een ander bedrijf blijft anders", !isSameEntity("VSB Hybride", "Verwarming Service Brabant"));
  // Punt 18: een mislukte JSON-aanroep komt in het logboek.
  const structured = leesBestand("lib/openai/structured.ts");
  ok("mislukte parse wordt vastgelegd", structured.includes("isParseFout(err)") && structured.includes("mislukt: true"));
  // Punt 12: de klant krijgt vooraf te horen wie de meting start.
  const concept = leesBestand("app/(app)/analyses/[id]/concept/page.tsx");
  ok("het conceptscherm kijkt of de meting gestart mag worden", concept.includes("mayTriggerCost(user.id, \"meting_starten\")") && concept.includes("COST_DENIED.meting_starten"));
});


group("Kleine punten uit de doorlichting, deel 2 (verbeterronde blok F, punt 8, 9, 11, 14 en 17)", () => {
  // Punt 8: dezelfde vraag met een andere plaats.
  const plaatsen = ["Geldrop", "Eindhoven", "Mierlo"];
  eq(
    "Geldrop en Eindhoven geven dezelfde sleutel",
    String(vraagZonderPlaats("Welke installateur in Geldrop vervangt een cv-ketel?", plaatsen) === vraagZonderPlaats("Welke installateur in Eindhoven vervangt een cv-ketel?", plaatsen)),
    "true",
  );
  ok("een andere vraag niet", vraagZonderPlaats("Wat kost een warmtepomp in Geldrop?", plaatsen) !== vraagZonderPlaats("Welke installateur in Geldrop vervangt een cv-ketel?", plaatsen));
  ok("ook met 'in de buurt' en de provincie", vraagZonderPlaats("Welke installateur bij mij in de buurt vervangt een cv-ketel?", plaatsen) === vraagZonderPlaats("Welke installateur in Brabant vervangt een cv-ketel?", plaatsen));
  const prompts = leesBestand("lib/pipeline/prompts.ts");
  ok("de generator gebruikt de sleutel", prompts.includes("vraagZonderPlaats(tekst, regios)"));
  ok("en de bezwaren uit het gesprek", prompts.includes("DE TWIJFELS DIE KOPERS IN DEZE MARKT HEBBEN"));

  // Punt 9: de echte citaten van de installateur en de rijschool.
  ok("een advies is geen dienst", isAdviesCitaat("Het ventilatiesysteem moet regelmatig worden schoongemaakt."));
  ok("een aanbod wel", !isAdviesCitaat("Wij zorgen voor een professionele vervanging van uw oude ketel"));
  ok("ook met 'kun je'", !isAdviesCitaat("dan kun je er misschien aan denken om een theoriecursus te nemen, waarin je begeleid wordt"));
  ok("een los woord uit een menu ook", !isAdviesCitaat("Tuinaanleg"));

  // Punt 11: gevuld is niet gecontroleerd.
  const sessie = leesBestand("app/(app)/merk/[id]/_components/onboarding-session.tsx");
  ok("een blok blijft open met nog te controleren velden", sessie.includes("!isHumanSet(states[k as string]?.source)") && sessie.includes("nog te controleren"));

  // Punt 14: de technische controle is klaar als hij een resultaat heeft, en
  // de schatting telt de stappen die nog moeten komen.
  const stappen = bouwStappen({
    pendingByType: { profile_offering: 1 },
    facetSummaries: {},
    counts: { topics: 0, auditChecks: 12, researchDone: true },
  });
  eq("technische controle met resultaat staat niet op wacht", stappen.find((st) => st.job === "technical_audit")?.state ?? "", "klaar");
  const wachtend = stappen.filter((st) => st.state === "wacht").map((st) => st.job);
  ok("er wachten nog stappen na het aanbod", wachtend.length >= 3);
  // `etaMetWachtendeStappen()` staat in een server-module; hier de bedrading.
  ok("de statusroute telt de wachtende stappen mee", leesBestand("app/api/profiles/[id]/status/route.ts").includes("etaMetWachtendeStappen("));

  // Punt 17: Gemini-taken gespreid, achter wat er al klaarstaat.
  const nu = new Date("2026-09-24T12:00:00Z");
  const t = spreidTijden(nu, null, 3, GEMINI_AFSTAND_MS);
  eq("vanaf nu, vier seconden ertussen", t.map((d) => d.toISOString().slice(11, 19)).join(","), "12:00:00,12:00:04,12:00:08");
  const achter = spreidTijden(nu, new Date("2026-09-24T12:02:00Z"), 2, GEMINI_AFSTAND_MS);
  eq("een tweede cluster sluit aan", achter.map((d) => d.toISOString().slice(11, 19)).join(","), "12:02:04,12:02:08");
});


group("Het euroteken en letters met een accent komen goed van de site (punt 63)", () => {
  eq("de installateur", htmlToText("<p>Ons bedrijf beschikt over een offici&euml;le CO-certificering</p>"), "Ons bedrijf beschikt over een officiële CO-certificering");
  eq("de rijschool", htmlToText("Meer info over de intake &euro; 50"), "Meer info over de intake € 50");
  eq("hoofdletters en andere accenten", htmlToText("&Eacute;&eacute;n caf&eacute; &agrave; la carte, gar&ccedil;on"), "Één café à la carte, garçon");
  eq("een onbekende naam blijft staan", htmlToText("A &foo; B"), "A &foo; B");
});

// ════════════════════════════════════════════════════════════════════════════
// WP2 van docs/tasks/contentpijplijn-publicatiewaardig.md: het feitenregister.
group("Het vangnet op L1: een getal moet in de feittekst staan (WP2)", () => {
  eq("Nederlandse notatie", getallenIn("€ 2.200 tot € 3.200, beoordeling 4,9").join(","), "2200,3200,4.9");
  ok("telwoorden tellen mee", getallenIn("Twaalf monteurs in dienst").includes(12));
  const band = veiligeWaarde("Tuinaanleg met bestrating kost meestal € 12.000 tot € 35.000.", { min: 12000, max: 35000, eenheid: "EUR" });
  eq("een bandbreedte die er staat blijft", `${band?.min}-${band?.max}-${band?.eenheid}`, "12000-35000-eur");
  eq("een verzonnen getal maakt de waarde leeg", String(veiligeWaarde("Tuinaanleg kost meestal € 12.000.", { min: 15000, max: 15000, eenheid: "EUR" })), "null");
  eq("twaalf monteurs voluit geschreven", String(veiligeWaarde("Twaalf monteurs in dienst", { min: 12, max: 12, eenheid: "monteurs" })?.min), "12");
  eq("zonder getal en zonder tekst is onbekend", String(veiligeWaarde("Iets", { min: null, max: null, tekst: "" })), "null");
});

group("Kandidaat-conflicten op soort, geldigheid en waarde (WP2)", () => {
  const feit = (id: string, text: string, extra: Partial<RegisterFeit>): RegisterFeit => ({
    id, text, kind: "site", factKey: id, soort: "prijs", waarde: null, geldtVoor: null, stand: "site", bewijskracht: "gewoon", ...extra,
  });
  // De rijschool (§1.2, O4): na het uitlezen stonden er twee intakeprijzen
  // zonder het onderscheid kantoor of auto. Code ziet een kandidaat; L2 beslist.
  const kantoor = feit("a", "Intake € 50", { geldtVoor: "intake", waarde: { min: 50, max: 50, eenheid: "eur" } });
  const auto = feit("b", "Intake € 80", { geldtVoor: "intake", waarde: { min: 80, max: 80, eenheid: "eur" } });
  const kandidaten = vindKandidaten([kantoor, auto]);
  eq("de twee intakeprijzen van de rijschool zijn een kandidaat", String(kandidaten.length), "1");
  eq("geen kandidaat als L1 de geldigheid wel onderscheidt", String(vindKandidaten([{ ...kantoor, geldtVoor: "intake op kantoor" }, { ...auto, geldtVoor: "intake in de auto" }]).length), "0");
  eq("dezelfde prijs is geen kandidaat", String(vindKandidaten([kantoor, { ...auto, waarde: { min: 50, max: 50, eenheid: "EUR" } }]).length), "0");
  eq("een andere eenheid is niet te vergelijken", String(vindKandidaten([kantoor, { ...auto, waarde: { min: 12, max: 15, eenheid: "eur per maand" } }]).length), "0");
  eq("overig doet niet mee", String(vindKandidaten([{ ...kantoor, soort: "overig" }, { ...auto, soort: "overig" }]).length), "0");
  eq("een vervangen feit doet niet mee", String(vindKandidaten([kantoor, { ...auto, stand: "vervangen" }]).length), "0");
  const gebiedA = feit("c", "werkgebied a", { soort: "werkgebied", waarde: { tekst: "Eindhoven, Helmond, Best" } });
  const gebiedB = feit("d", "werkgebied b", { soort: "werkgebied", waarde: { tekst: "Eindhoven, Helmond, Best, Eersel" } });
  eq("een ander werkgebied in woorden is een kandidaat", String(vindKandidaten([gebiedA, gebiedB]).length), "1");
  const dienstA = feit("e", "d a", { soort: "dienst", waarde: { tekst: "tuinaanleg" } });
  const dienstB = feit("f", "d b", { soort: "dienst", waarde: { tekst: "tuinontwerp" } });
  eq("twee diensten in woorden niet: dat zijn twee kanten van hetzelfde bedrijf", String(vindKandidaten([dienstA, dienstB]).length), "0");

  const klant = { ...auto, kind: "klant" };
  eq("een antwoord van de klant wint van de site", automatischeWinnaar(kantoor, klant)?.id ?? "", "b");
  eq("twee sitefeiten beslist de adviseur", String(automatischeWinnaar(kantoor, auto)), "null");
});

group("De conflictpoort: alleen als het betwiste feit op deze pagina nodig is (WP2)", () => {
  const prijs = { soort: "prijs" as const, feitIds: ["p1", "p2"] };
  const leeg = new Set<string>();
  ok("een betwiste prijs die de pagina niet nodig heeft houdt niets tegen", !houdtPaginaTegen(prijs, { prioriteitsFeitIds: leeg }));
  ok("als prioriteitsfeit wel", houdtPaginaTegen(prijs, { prioriteitsFeitIds: new Set(["p1"]) }));
  ok("of als een onderwerp niet zonder kan", houdtPaginaTegen(prijs, { prioriteitsFeitIds: leeg, benodigdeFeitIds: new Set(["p2"]) }));
  const gebied = { soort: "werkgebied" as const, feitIds: ["w1", "w2"] };
  ok("een werkgebied alleen op een pagina over die plaats", !houdtPaginaTegen(gebied, { prioriteitsFeitIds: new Set(["w1"]) }) && houdtPaginaTegen(gebied, { prioriteitsFeitIds: new Set(["w1"]), overPlaats: true }));
  const termijn = { soort: "termijn" as const, feitIds: ["t1", "t2"] };
  ok("een termijn alleen als prioriteitsfeit", !houdtPaginaTegen(termijn, { prioriteitsFeitIds: leeg, benodigdeFeitIds: new Set(["t1"]) }) && houdtPaginaTegen(termijn, { prioriteitsFeitIds: new Set(["t1"]) }));
  const product = { soort: "product" as const, feitIds: ["x1", "x2"] };
  ok("productinformatie alleen op een productpagina", !houdtPaginaTegen(product, { prioriteitsFeitIds: new Set(["x1"]) }) && houdtPaginaTegen(product, { prioriteitsFeitIds: new Set(["x1"]), isProductpagina: true }));
  eq("de poort geeft de tegenhoudende conflicten", conflictpoort([prijs, gebied], { prioriteitsFeitIds: new Set(["p1", "w1"]) }).map((c) => c.soort).join(","), "prijs");
  eq("een prijsconflict is blokkerend", ernstVan("prijs"), "blokkerend");
  eq("een werkwijze hooguit een waarschuwing", ernstVan("werkwijze"), "waarschuwing");
});

group("De achtergrondmodus en de werksoort redactioneel (WP3, §4.3)", () => {
  ok("zonder metingen direct", !moetAchtergrond("content_strategy", []));
  ok("tot 120 seconden direct", !moetAchtergrond("content_strategy", [98_800, ACHTERGROND_GRENS_MS]));
  ok("één aanroep boven 120 seconden: achtergrond", moetAchtergrond("content_strategy", [40_000, 121_000]));
  ok("een onbekende duur telt niet mee", !moetAchtergrond("content_edit", [null, undefined]));
  eq("ophalen na 30, 60, 120 en hoogstens 240 seconden", [0, 1, 2, 5].map(ophaalVertragingSeconden).join(","), "30,60,120,240");
  const t = resolveTuning("gpt-6-sol", "redactioneel");
  eq("redactioneel draait op denktijd hoog", String(t.reasoningEffort), "high");
  eq("zonder temperatuur", String(t.temperature), "undefined");
  ok("elke aanroep legt zijn duur vast", leesBestand("lib/openai/ledger.ts").includes("duration_ms:"));
});

// ════════════════════════════════════════════════════════════════════════════
// WP1 van docs/tasks/contentpijplijn-publicatiewaardig.md: de invoer opschonen.
// De zinnen hieronder staan letterlijk in de merkdossiers van 25 september 2026.
group("Waardeproposities zonder herkomsttaal en zonder dubbelingen (WP1)", () => {
  const hovenier = [
    "Meer dan 35 jaar ervaring, volgens de website",
    "Diverse tuinwerkzaamheden onder één dak, van ontwerp en aanleg tot onderhoud",
    "Persoonlijk kennismakingsgesprek om wensen en mogelijkheden te bespreken",
    "Maatwerk voor ieder budget, volgens de website",
    "De klant wordt naar eigen zeggen van A tot Z ontzorgd",
    "De website biedt een gratis, vrijblijvende offerte aan",
    "Een breed dienstenpakket voor tuinontwerp, aanleg, onderhoud en aanvullende tuinvoorzieningen",
    "Een persoonlijk kennismakingsgesprek om wensen en mogelijkheden te bespreken",
    "De website stelt dat het bedrijf tuinen op maat voor ieder budget realiseert",
    "De klant wordt volgens de website van A tot Z ontzorgd",
    "Gratis en vrijblijvende offerte; de website zegt te streven naar verzending binnen 4 uur",
  ];
  const installateur = [
    "Breed aanbod aan installatiewerk, loodgieterswerk en woningrenovaties bij één lokaal bedrijf.",
    "Het bedrijf zegt werkzaamheden aan badkamers, toiletten, keukens en kleine interne verbouwingen van A tot Z te regelen met professionele onderaannemers.",
    "Persoonlijk afgestemde productkeuze: bij CV-ketelvervanging wordt volgens de site gekeken naar woning, energieverbruik en wensen.",
    "Nadruk op service, vakmanschap, nauwkeurigheid en een vrijblijvende bezichtiging of offerte.",
    "Vermeldt officiële CO-certificering volgens de Gasketelwet op de pagina over CV-ketelvervanging.",
    "Bij CV-ketelvervanging wordt volgens de site gekeken naar de woning, het energieverbruik en de wensen van de klant.",
    "De communicatie benadrukt service, vakmanschap, nauwkeurigheid en de mogelijkheid van een vrijblijvende bezichtiging of offerte.",
    "De pagina over CV-ketelvervanging vermeldt een officiële CO-certificering volgens de Gasketelwet.",
  ];
  const rijschool = [
    "Persoonlijke begeleiding door één vaste rijinstructeur",
    "Rijopleiding afgestemd op de wensen, sterke punten en ontwikkelbehoeften van de leerling",
    "Een rustige, ongedwongen aanpak met aandacht voor zelfvertrouwen en veilig zelfstandig rijden",
    "Ervaring met begeleiding van leerlingen met faalangst, ADHD of vergelijkbare extra begeleidingsbehoeften",
    "Een intake om het benodigde aantal lessen beter in te schatten en een pakket op maat samen te stellen",
    "Keuze uit rijlessen in een auto, automaatlessen en simulatorlessen",
    "Een rustige en ongedwongen aanpak met aandacht voor zelfvertrouwen en veilig zelfstandig rijden",
    "Ervaring met begeleiding van leerlingen met faalangst, ASS of AD(H)D",
    "Keuze uit autorijlessen, automaatlessen en simulatorlessen",
  ];

  eq("35 jaar zonder 'volgens de website'", schoonWaardepropositie(hovenier[0]) ?? "", "Meer dan 35 jaar ervaring");
  eq("'naar eigen zeggen' eruit", schoonWaardepropositie(hovenier[4]) ?? "", "De klant wordt van A tot Z ontzorgd");
  eq("'De website biedt X aan' wordt X", schoonWaardepropositie(hovenier[5]) ?? "", "Een gratis, vrijblijvende offerte");
  eq("het deel met herkomst na de puntkomma vervalt", schoonWaardepropositie(hovenier[10]) ?? "", "Gratis en vrijblijvende offerte");
  eq("een bijzin die niet netjes om te zetten is vervalt", String(schoonWaardepropositie(hovenier[8])), "null");
  eq("'Het bedrijf zegt ... te regelen' vervalt", String(schoonWaardepropositie(installateur[1])), "null");
  eq("'volgens de Gasketelwet' is geen herkomst en blijft", schoonWaardepropositie(installateur[4]) ?? "", "Officiële CO-certificering volgens de Gasketelwet");
  eq("'De pagina over ... vermeldt' wordt de kern", schoonWaardepropositie(installateur[7]) ?? "", "Officiële CO-certificering volgens de Gasketelwet");
  eq("'De communicatie benadrukt' vervalt", String(schoonWaardepropositie(installateur[6])), "null");

  const herkomst = /volgens de (website|site)|naar eigen zeggen|de website|het bedrijf zegt|de communicatie/i;
  for (const [naam, lijst, verwacht] of [
    ["hovenier", hovenier, 7],
    ["installateur", installateur, 4],
    ["rijschool", rijschool, 6],
  ] as const) {
    const schoon = schoneWaardeproposities(lijst);
    ok(`${naam}: geen herkomsttaal meer`, !schoon.some((z) => herkomst.test(z)), schoon.join(" | "));
    eq(`${naam}: van ${lijst.length} naar ${verwacht} regels`, String(schoon.length), String(verwacht));
  }
  ok("de lesvormen van de rijschool zijn één propositie", zelfdePropositie(rijschool[5], rijschool[8]));
  ok("de twee dienstenomschrijvingen van de hovenier niet", !zelfdePropositie(hovenier[1], hovenier[6]));
  eq("een lege lijst blijft leeg", String(schoneWaardeproposities(null).length), "0");
});

group("De feitenkaart zonder 'De website vermeldt' (WP1)", () => {
  // Letterlijk uit `brand_facts` van de drie proefklanten, 25 september 2026.
  const gevallen: [string, string][] = [
    ["De website vermeldt: “35+ Jaar ervaring”.", "35+ Jaar ervaring"],
    ["De website biedt een gratis offerte aan.", "Een gratis offerte"],
    ["De site noemt een vrijblijvende intake van 60 minuten.", "Een vrijblijvende intake van 60 minuten."],
    ["Bedrijfsgegevens volgens de aangeleverde website-informatie: Speelheuvelweg 6A, 5652 CH Eindhoven; KvK 17120470.", "Speelheuvelweg 6A, 5652 CH Eindhoven; KvK 17120470."],
    ["De website vermeldt: ‘Ons bedrijf beschikt over een officiële CO-certificering volgens de Gasketelwet.’", "Ons bedrijf beschikt over een officiële CO-certificering volgens de Gasketelwet."],
    ["De website vermeldt in de aangeleverde prijstekst: prijzen gelden per 1 november 2025; prijswijzigingen voorbehouden.", "Prijzen gelden per 1 november 2025; prijswijzigingen voorbehouden."],
    ["Twaalf monteurs in dienst", "Twaalf monteurs in dienst"],
  ];
  for (const [feit, verwacht] of gevallen) {
    const uit = zonderVindplaats(feit);
    eq(`"${feit.slice(0, 40)}..."`, uit, verwacht);
    ok("wat overblijft is letterlijk een stuk van het feit, dus het citaat klopt", normalizeForQuote(feit).includes(normalizeForQuote(uit)));
  }
  const kaart = formatFactCard([
    { ref: "F27", text: "De website vermeldt: “35+ Jaar ervaring”.", source: "site hansverstraatenhoveniers.nl", allowed: true, citable: true, kind: "site" } as never,
  ]);
  ok("de kaart toont het feit zonder vindplaats", kaart.includes("F27  35+ Jaar ervaring") && !kaart.includes("De website vermeldt"));
  ok("het profielonderzoek vraagt om de bewering zelf", leesBestand("lib/pipeline/profile-research.ts").includes("Schrijf de bewering zelf op, niet dat de site hem doet"));
});

// ════════════════════════════════════════════════════════════════════════════
// DE CONTENTKETEN OPNIEUW: de bewaking (docs/tasks/contentketen-opnieuw.md §7.2, §7.3)
// ════════════════════════════════════════════════════════════════════════════
//
// De vorige keten groeide doordat elke sessie er iets oud of nieuws bij bouwde.
// Deze twee controles houden de nieuwe keten klein: `lib/pagina/` gebruikt
// alleen algemene infrastructuur, en de kolommen van de oude keten leest of
// schrijft niemand meer.
console.log("\nDe contentketen opnieuw: de bewaking");

group("lib/pagina importeert alleen wat op de lijst van §7.3 staat", () => {
  const toegestaan = [
    /^@\/lib\/pagina\//,
    /^@\/lib\/jobs\/(queue|dedupe|types)$/,
    /^@\/lib\/openai\//,
    /^@\/lib\/supabase\//,
    /^@\/lib\/types\/database$/,
    /^@\/lib\/open-questions$/,
    /^@\/lib\/schrijfregel-vangnet$/,
    /^@\/lib\/pipeline\/(redact|existing-page-fetch|waardeproposities|dash-guard|metatitel|content-export|structured-data)$/,
    /^@\/lib\/schema-jsonld$/,
    /^@\/lib\/plan-(status|writing)$/,
    /^zod$/,
    /^server-only$/,
    /^@supabase\/supabase-js$/,
    /^node:/,
  ];
  const bestanden = bestaatBestand("lib/pagina") ? tsOnder("lib/pagina") : [];
  const fout: string[] = [];
  for (const pad of bestanden) {
    const bron = leesBestand(pad);
    const statisch = [...bron.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
    const kaal = [...bron.matchAll(/^\s*import\s+"([^"]+)"/gm)].map((m) => m[1]);
    const dynamisch = [...bron.matchAll(/\bimport\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]);
    for (const spec of [...statisch, ...kaal, ...dynamisch]) {
      const m = [spec, spec];
      if (!toegestaan.some((r) => r.test(m[1]))) fout.push(`${pad}: ${m[1]}`);
    }
  }
  ok("geen import buiten de lijst", fout.length === 0, fout.join(", "));
});

group("de kolommen van de oude keten leest of schrijft niemand meer (§7.2)", () => {
  const oud = /(?<![a-z_])(contract_json|dossier_json|strategy_json|edit_log_json|readiness_json|quality_json|quality_verdict|quality_profile|writer_brief_json|proof_points_json|claims_json|critique_raw_json|briefing_snapshot_json|write_mode|geaccepteerde_zinnen|brief_instruction)(?![a-z_])/;
  const bestanden = [...tsOnder("app"), ...tsxOnder("app"), ...tsOnder("lib"), ...tsOnder("components"), ...tsxOnder("components")].filter(
    (p) => !p.endsWith("lib/types/database.ts"),
  );
  const fout: string[] = [];
  for (const pad of new Set(bestanden)) {
    leesBestand(pad)
      .split("\n")
      .forEach((regel, i) => {
        const t = regel.trim();
        // Commentaar mag de oude namen noemen: dat is uitleg, geen gebruik.
        if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) return;
        if (oud.test(regel)) fout.push(`${pad}:${i + 1}`);
      });
  }
  ok("geen gebruik meer", fout.length === 0, fout.join(", "));
});

// ── WP3: de controle in code (contentketen-opnieuw.md §6.5) ─────────────────
console.log("\nDe contentketen opnieuw: harde beweringen, reparatie, bedrijfskennis");

group("harde beweringen: wat is er een, en wat niet", () => {
  const namen = ["Autorijschool Pompert"];
  const is = (zin: string) => vindHardeBeweringen(zin, namen).length > 0;
  // Geen harde bewering: gewone uitleg zonder getal of belofte.
  ok("1. een paar lessen zonder getal is geen bewering", !is("Veel leerlingen hebben na een paar lessen meer vertrouwen."));
  ok("2. 'na enkele lessen' ook niet", !is("Na enkele lessen merk je vaak dat het rustiger gaat."));
  ok("3. een telefoonnummer niet", !is("Bel ons op 040 123 4567 voor een afspraak."));
  ok("4. een mobiel nummer met streepje niet", !is("Bel ons op 06-12345678."));
  ok("5. een postcode niet", !is("Ons kantoor zit op 5652 CH in Eindhoven."));
  ok("6. een huisnummer na een straat niet", !is("Kom langs op de Speelheuvelweg 6A."));
  ok("7. een opsomming in een kop niet", !is("## 3 tips voor je eerste rijles"));
  ok("8. 'altijd' in algemeen advies niet (gaat niet over het bedrijf)", !is("Controleer altijd je spiegels voor je afslaat."));
  // Wel een harde bewering.
  ok("9. een lesduur is er een", is("De eerste les duurt ongeveer 60 minuten."));
  ok("10. een aantal instructeurs ook", is("We werken met 3 instructeurs."));
  ok("11. een prijs met euroteken", is("Een losse les kost € 55."));
  ok("12. een prijs met 'euro' erachter", is("Een losse les kost 55 euro."));
  ok("13. een termijn", is("Je kunt binnen 2 weken beginnen."));
  ok("14. een jaartal", is("Wij rijden sinds 1990 met leerlingen door Eindhoven."));
  ok("15. garantie in een zin over het bedrijf", is("Wij geven garantie dat je slaagt."));
  ok("16. 'de beste' met de bedrijfsnaam", is("Autorijschool Pompert is de beste rijschool van de regio."));
  ok("17. een percentage", is("Ruim 80% van onze leerlingen slaagt in één keer."));
  const bereik = hardeGetallen("Een ketel kost € 2.200 tot € 3.200.");
  ok("18. een bereik levert twee bedragen op", bereik.length === 2 && bereik.every((g) => g.eenheid === "euro"));
  eq("19. duizendtallen worden genormaliseerd", bereik[0]?.waarde ?? "", "2200");
  eq("20. een komma wordt een punt", hardeGetallen("De les duurt 1,5 uur.")[0]?.waarde ?? "", "1.5");
});

group("harde beweringen: wanneer is er een bron", () => {
  const namen = ["Wesley Keeris Installatietechniek", "Wesley Keeris"];
  const bronnen = [
    "Twaalf monteurs in dienst. Een nieuwe cv-ketel kost € 2.200 tot € 3.200, inclusief installatie.",
    "Wij hebben meer dan 35+ jaar ervaring.",
    "De levertijd is 2 tot 4 weken.",
    "Wij geven geen garantie op het behalen van je examen.",
    "Officiële CO-certificering volgens de Gasketelwet.",
    "Sinds 1990 in Eindhoven.",
  ];
  const oordeel = (zin: string) => controleerHardeBeweringen(zin, bronnen, namen)[0];
  ok("21. een bedrag uit de bron is gedekt", oordeel("Een nieuwe ketel kost bij ons € 2.200 tot € 3.200.")?.ongedekt.length === 0);
  ok("22. een verzonnen bedrag niet", (oordeel("Een nieuwe ketel kost bij ons € 1.900.")?.ongedekt.length ?? 0) > 0);
  ok("23. '35 jaar' tegenover '35+ jaar' is gedekt", oordeel("Wij hebben 35 jaar ervaring.")?.ongedekt.length === 0);
  ok("24. een termijn uit de bron is gedekt", oordeel("We leveren in 2 tot 4 weken.")?.ongedekt.length === 0);
  ok("25. dezelfde waarde met een andere eenheid niet", (oordeel("We geven 2 jaar garantie.")?.ongedekt.length ?? 0) > 0);
  ok(
    "26. 'garantie dat je slaagt' wordt niet gedekt door 'geen garantie'",
    (oordeel("Wij geven garantie dat je slaagt.")?.ongedekt.length ?? 0) > 0,
  );
  ok("27. een keurmerk uit de bron is gedekt", oordeel("Wij zijn gecertificeerd voor CO-metingen.")?.ongedekt.length === 0);
  ok("28. 'nooit' is altijd geel, want het is zelf een ontkenning", (oordeel("Wij laten je nooit in de kou staan.")?.ongedekt.length ?? 0) > 0);
  ok("29. een jaartal uit de bron is gedekt", oordeel("Wij werken sinds 1990 in de regio.")?.ongedekt.length === 0);
  ok("30. vakkennis als bron: een subsidiebedrag dat in de uitleg staat", controleerHardeBeweringen(
    "De ISDE-subsidie voor een hybride warmtepomp is ongeveer € 2.100.",
    ["De ISDE-subsidie voor een hybride warmtepomp bedraagt ongeveer € 2.100 (bron: rvo.nl)."],
  )[0]?.ongedekt.length === 0);
  ok("31. 'de beste' zonder bron is geel", (oordeel("Wesley Keeris is de beste installateur van Geldrop.")?.ongedekt.length ?? 0) > 0);
  const tekst = "Een nieuwe ketel kost € 2.200 tot € 3.200.\n\nWij geven 10 jaar garantie. Bel 040 123 4567.";
  eq("32. alleen de zin zonder bron wordt geel", geleZinnen(controleerHardeBeweringen(tekst, bronnen, namen)).join("|"), "Wij geven 10 jaar garantie.");
  // De zinnen uit de kwaliteitsdoorlichting die de vorige keten fout deed.
  ok(
    "33. 'Wij hebben meer dan 35 jaar ervaring, maar dat zegt niets' draagt geen verzonnen getal",
    oordeel("Wij hebben meer dan 35 jaar ervaring, maar dat zegt op zichzelf niets over het aantal zwemvijvers.")?.ongedekt.length === 0,
  );
  ok("34. twaalf monteurs in woorden wordt niet herkend en dus niet geel (regel 2: geen taalontleding)", vindHardeBeweringen("Wij hebben twaalf monteurs.", namen).length === 0);
});

group("zinnen splitsen uit markdown", () => {
  const z = splitsZinnen("## Wat kost het?\n\nEen les kost € 55. Een pakket is goedkoper.\n\n- 1.800 leerlingen\n1. Eerste stap");
  ok("een kop is een zin", z.includes("Wat kost het?"));
  ok("twee zinnen op één regel worden er twee", z.includes("Een les kost € 55.") && z.includes("Een pakket is goedkoper."));
  ok("een lijstteken valt weg, een getal met punt blijft heel", z.includes("1.800 leerlingen"));
  ok("een genummerde lijst verliest zijn nummer", z.includes("Eerste stap"));
});

group("mechanische reparatie: repareren, nooit blokkeren", () => {
  const uit = repareerMechanisch(
    {
      titel: "Rijles bij faalangst — rustig beginnen",
      meta_titel: "Rijles bij faalangst in Eindhoven en omgeving voor iedereen met zenuwen | Autorijschool Pompert",
      meta_beschrijving: "Nerveus voor je rijles? Bij Autorijschool Pompert begin je rustig, en/of in je eigen tempo.",
      tekst_markdown: "Veel leerlingen zijn nerveus—dat is normaal. Een pakket van 5–8 lessen is gebruikelijk.",
      faq: [{ vraag: "Hoe lang duurt een les?", antwoord: "Een les duurt 60 minuten — soms 90." }, { vraag: "", antwoord: "leeg" }],
    },
    "Autorijschool Pompert",
  );
  ok("een gedachtestreepje met spaties wordt een komma", uit.titel === "Rijles bij faalangst, rustig beginnen");
  ok("een gedachtestreepje tussen woorden ook", uit.tekst_markdown.includes("nerveus, dat is normaal"));
  ok("een bereik tussen cijfers blijft staan", uit.tekst_markdown.includes("5–8 lessen"));
  ok("en/of wordt of", !uit.meta_beschrijving.includes("en/of"));
  ok("de metatitel blijft binnen 60 tekens", uit.meta_titel.length <= 60, `${uit.meta_titel.length}`);
  ok("de beschrijving binnen 160", uit.meta_beschrijving.length <= 160);
  ok("een lege FAQ-vraag valt weg", uit.faq.length === 1);
  ok("ook in de FAQ", !uit.faq[0].antwoord.includes("—"));
});

group("bedrijfskennis: welke feiten mee gaan naar de schrijver", () => {
  const f = (id: string, text: string, extra: Partial<FeitRij> = {}): FeitRij => ({
    id, text, stand: "site", superseded_by: null, allowed: true, geldt_voor: null, bewijskracht: "gewoon", ...extra,
  });
  const pagina = { titel: "Cv-ketel vervangen in Geldrop", onderwerp: "Ketelvervanging", zoekintentie: "Wat kost een nieuwe cv-ketel?" };
  const gekozen = kiesFeiten(
    [
      f("1", "Twaalf monteurs in dienst"),
      f("2", "Een ketelonderhoud kost € 120.", { stand: "betwist" }),
      f("3", "Oude prijs", { superseded_by: "x" }),
      f("4", "Zonnepanelen vanaf € 4.000", { geldt_voor: "zonnepanelen" }),
      f("5", "Een nieuwe cv-ketel kost € 2.200 tot € 3.200.", { geldt_voor: "cv-ketel", bewijskracht: "sterk" }),
      f("6", "Niet noemen", { allowed: false }),
      f("7", "  "),
    ],
    pagina,
  );
  eq("alleen wat klopt en bij deze pagina hoort, sterk bewijs eerst", gekozen.map((x) => x.id).join(","), "5,1");
  ok("een feit voor het hele merk hoort er altijd bij", hoortBijPagina(null, pagina));
  ok("een feit voor een andere dienst niet", !hoortBijPagina("zonnepanelen", pagina));
  ok("een feit voor deze plaats wel", hoortBijPagina("Geldrop", pagina));
  const veel = Array.from({ length: 400 }, (_, i) => f(String(i), `Feit ${i}`));
  eq("hooguit 150 feiten", String(kiesFeiten(veel, pagina).length), String(MAX_FEITEN));
  const a = blokA({ bedrijfsnaam: "Wesley Keeris", feiten: gekozen, waardeproposities: [], verhalen: null, bezwaren: [], merkAntwoorden: [] });
  ok("blok A noemt het bedrijf en de feiten", a.startsWith("Bedrijf: Wesley Keeris") && a.includes("- Twaalf monteurs in dienst"));
  ok("en laat lege onderdelen weg", !a.includes("Verhalen"));
});

group("de schrijfpoort: alleen de vragen en de datum (§6.8)", () => {
  const vandaag = "2026-10-01";
  eq("geen brief: nog niet", String(schrijfpoort({ briefKlaar: false, openVragen: 0, publicatiedatum: null, vandaag }).reden), "voorbereiding_loopt");
  eq("een open vraag: nog niet", String(schrijfpoort({ briefKlaar: true, openVragen: 1, publicatiedatum: null, vandaag }).reden), "vragen_open");
  eq("onbekend aantal is geen nul", String(schrijfpoort({ briefKlaar: true, openVragen: Number.NaN, publicatiedatum: null, vandaag }).reden), "vragen_open");
  eq("alles gedaan, datum ver weg: wachten", String(schrijfpoort({ briefKlaar: true, openVragen: 0, publicatiedatum: "2026-11-20", vandaag }).reden), "nog_niet_aan_de_beurt");
  eq("de schrijfdatum is 10 dagen ervoor", schrijfdatum("2026-11-20"), "2026-11-10");
  ok("alles gedaan, binnen 10 dagen: schrijven", schrijfpoort({ briefKlaar: true, openVragen: 0, publicatiedatum: "2026-10-05", vandaag }).mag);
  ok("zonder datum: schrijven", schrijfpoort({ briefKlaar: true, openVragen: 0, publicatiedatum: null, vandaag }).mag);
});

group("stemvoorbeelden: de adressen van de ondernemer (B14)", () => {
  const a = schoneAdressen(["  wesleykeeris.nl/over-ons ", "https://wesleykeeris.nl/over-ons", "geen adres", "", { url: "http://voorbeeld.nl/blog" }, "vierde.nl"]);
  eq("schema erbij, dubbel en ongeldig eruit", a.join(" "), "https://wesleykeeris.nl/over-ons http://voorbeeld.nl/blog https://vierde.nl/");
  eq("hooguit drie", String(schoneAdressen(["a.nl", "b.nl", "c.nl", "d.nl"]).length), String(MAX_STEMVOORBEELDEN));
  eq("geen lijst is leeg", String(schoneAdressen("wesleykeeris.nl").length), "0");
  const pagina = "Home\nOver ons\nContact\nWij zijn een familiebedrijf uit Zwolle en werken al sinds 1990 aan cv-ketels in de regio.\nTweede alinea.";
  ok("menu bovenaan valt weg", vanafEersteAlinea(pagina).startsWith("Wij zijn een familiebedrijf"));
  eq("zonder echte alinea blijft alles", vanafEersteAlinea("Kort\nOok kort"), "Kort\nOok kort");
});

group("de open vraag: tekst per pagina (B3)", () => {
  ok("de titel staat in de vraag, want de vraagtekst is uniek per merk", openVraagTekst("Cv-ketel vervangen").includes("Cv-ketel vervangen"));
  ok("twee pagina's geven twee vragen", openVraagTekst("A") !== openVraagTekst("B"));
  eq("een lang antwoord mag", String(OPEN_VRAAG_MAX), "3000");
});

group("de content brief: wat code met de uitvoer doet (§6.1)", () => {
  const vraag = (v: string, extra: Partial<ContentBrief["vragen"][number]> = {}): ContentBrief["vragen"][number] => ({
    vraag: v, waarom: "Omdat het de pagina eigener maakt.", soort: "praktijk", antwoord_type: "tekst_lang", opties: null, merkbreed: false, ...extra,
  });
  const ruw: ContentBrief = {
    zoekintentie: "Een rijschool vinden — snel",
    deelvragen: [],
    concurrentie: { goed: [], gaten: [] },
    vakkennis: [
      { uitleg: "Met bron", bron_url: "https://www.cbr.nl" },
      { uitleg: "Zonder bron", bron_url: "geen adres" },
      { uitleg: "Ftp telt niet", bron_url: "ftp://cbr.nl" },
    ],
    valkuilen: [],
    vragen: [
      vraag("Wat kost een rijles?"),
      vraag("Welke keuze?", { antwoord_type: "keuze", opties: ["Alleen"] }),
      vraag("Welke dag?", { antwoord_type: "keuze", opties: ["Maandag", "Dinsdag"] }),
      vraag("Een vraag", { antwoord_type: "tekst_kort", opties: ["x", "y"] }),
      vraag("een VRAAG!"),
      ...Array.from({ length: 10 }, (_, i) => vraag(`Voorbeeld ${i}?`)),
    ],
    ook_voor_deze_pagina: ["a", "b", "a", "c"],
  };
  const eerdere = [
    { id: "a", question: "Iets open", status: "open" },
    { id: "b", question: "Wat kost een rijles", status: "beantwoord" },
  ];
  const uit = verwerkBrief(ruw, eerdere);
  eq("vakkennis alleen met een webadres", String(uit.onderzoek.vakkennis.length), "1");
  ok("de schrijfregels gaan over de tekst", !uit.onderzoek.zoekintentie.includes("—"));
  ok("een vraag die het merk al kreeg valt weg", !uit.vragen.some((v) => v.vraag.startsWith("Wat kost")));
  ok("een gelijke vraag in dezelfde brief ook", uit.vragen.filter((v) => normaliseerVraag(v.vraag) === "een vraag").length === 1);
  eq("hooguit acht", String(uit.vragen.length), String(MAX_BRIEFVRAGEN));
  eq("keuze met één optie wordt korte tekst", uit.vragen.find((v) => v.vraag === "Welke keuze?")?.antwoord_type ?? "", "tekst_kort");
  eq("keuze met twee opties blijft keuze", String(uit.vragen.find((v) => v.vraag === "Welke dag?")?.opties?.length), "2");
  eq("opties bij een gewone vraag vallen weg", String(uit.vragen.find((v) => v.vraag === "Een vraag")?.opties), "null");
  eq("alleen open vragen van dit merk worden gekoppeld, één keer", uit.koppel.join(","), "a");
  eq("praktijk wordt praktisch", kindVoorSoort("praktijk"), "praktisch");
  eq("twijfel wordt grenzen", kindVoorSoort("twijfel"), "grenzen");
  eq("feit wordt aanvulling", kindVoorSoort("feit"), "aanvulling");
});

group("de opdracht voor de brief (§6.1)", () => {
  ok("de voorbeeldvragen staan er letterlijk in", BRIEF_SYSTEEM.includes("Slecht: \"Wat is faalangst?\"") && BRIEF_SYSTEEM.includes("Beter: \"Kun je een typisch voorbeeld"));
  ok("acht is een bovengrens, nul mag", BRIEF_SYSTEEM.includes("Nul vragen is een goed antwoord"));
  ok("geen gedachtestreepje in de opdracht", !/[—–]/.test(BRIEF_SYSTEEM));
  const invoer = briefInvoer({
    titel: "Rijles in Zwolle", paginasoort: "dienstpagina", handeling: "nieuw", zoekintentie: null, waarom: null,
    doelvragen: [{ vraag: "Beste rijschool Zwolle?", antwoord: "x".repeat(5000) }], merknaam: "Rijschool Rem",
    werkgebied: ["Zwolle"], bedrijf: "Bedrijf: Rijschool Rem", huidigeTekst: null, eerdereVragen: [{ id: "q1", vraag: "Hoe lang?", stand: "open" }],
  });
  ok("een winnend antwoord gaat ingekort mee", invoer.length < 3000);
  ok("eerdere vragen met id en stand", invoer.includes("[q1] (open) Hoe lang?"));
});

group("de schrijfopdracht: vier blokken, geen budget (§6.4)", () => {
  const sys = schrijfSysteem({ aanspreekvorm: "u", verbodenOnderwerpen: ["politiek"], verbodenWoorden: ["goedkoop"] });
  ok("de kern staat erin", sys.includes("Schrijf de beste pagina die iemand met deze vraag zou kunnen lezen."));
  ok("geen woordenbudget", !/\b\d{3,4}\s*woorden\b/.test(sys));
  ok("de aanspreekvorm", sys.includes("Spreek de lezer aan met u."));
  ok("de verboden onderwerpen en woorden", sys.includes("politiek") && sys.includes("goedkoop"));
  const b: SchrijfBlokken = {
    titel: "Tuinontwerp", paginasoort: "dienstpagina", handeling: "nieuw", bedrijf: "Bedrijf: Groen",
    stem: [{ bron: "https://groen.nl", tekst: "Wij zijn nuchter." }], eigenVerhaal: "Aan de keukentafel.",
    antwoorden: [{ vraag: "Hoe begin je?", antwoord: "Met koffie." }], onderzoek: null, zoekintentie: "Een tuin laten ontwerpen",
    doelvragen: ["Wat kost een tuinontwerp?"], andereTitels: ["Onderhoud"], huidigeTekst: null,
  };
  const invoer = schrijfInvoer(b);
  ok("het eigen verhaal letterlijk", invoer.includes('"""Aan de keukentafel."""'));
  ok("de stem met de ene zin", invoer.includes("Neem de toon, de zinsbouw en de woordkeus over, niet de inhoud en niet de zinnen zelf."));
  ok("zonder onderzoek geen leeg blok C", !invoer.includes("(onderzoek)"));
  ok("geen bronverwijzingen gevraagd", !/\[F\d|bron:/i.test(invoer));
  const her = herschrijfInvoer(b, { vorige: "Oud.", punten: [{ waar: "opening", probleem: "vaag", hoe: "concreter" }], verzonnen: [], ongedekt: ["Wij geven 10 jaar garantie."], notitieKlant: null });
  ok("herschrijven: vorige versie en feedback", her.includes("SCHRIJF EEN BETERE VERSIE") && her.includes("10 jaar garantie") && her.includes("opening: vaag"));
});

group("de controle: herschrijven, welke versie, welke zinnen geel (§6.6, §6.7)", () => {
  const goed = { oordeel: "goed" as const, verzonnen: [], punten: [] };
  ok("goed en niets ongedekt: niet herschrijven", !moetHerschrijven(goed, []));
  ok("goed maar een ongedekte zin: wel", moetHerschrijven(goed, ["Wij bestaan 30 jaar."]));
  ok("niet goed: wel", moetHerschrijven({ ...goed, oordeel: "niet_goed" }, []));
  ok("een verzonnen zin: wel", moetHerschrijven({ ...goed, verzonnen: [{ zin: "x", waarom: "y" }] }, []));
  ok("mislukte beoordeling: niet", !moetHerschrijven(null, ["Wij bestaan 30 jaar."]));
  eq("gelijk aantal ongedekt: de nieuwe blijft", kiesVersie(2, 2), "nieuw");
  eq("meer ongedekt: de vorige blijft", kiesVersie(1, 2), "vorige");
  const geel = geleZinnenNa("Wij bestaan 30 jaar. Wij zijn de beste.", ["Wij bestaan 30 jaar."], ["Wij zijn de beste.", "Weggeschreven zin."]);
  eq("ongedekt plus verzonnen die er nog staan", geel.join(" | "), "Wij bestaan 30 jaar. | Wij zijn de beste.");
  ok("alles bevestigd", allesBevestigd({ gele_zinnen: ["A zin."], bevestigd: ["a zin"] }));
  ok("niet alles bevestigd", !allesBevestigd({ gele_zinnen: ["A zin.", "B zin."], bevestigd: ["A zin."] }));
  ok("geen controle telt als niet bevestigd", !allesBevestigd(null));
});

group("harde beweringen: een bereik met 'en' (proef 26 september 2026)", () => {
  const g = hardeGetallen("Een hybride kost tussen de 4.500 en 7.500 euro.");
  eq("twee getallen", String(g.length), "2");
  eq("allebei in euro", g.map((x) => x.eenheid).join(","), "euro,euro");
  const oordeel = controleerHardeBeweringen(
    "Reken als eerste indicatie op € 4.500 tot € 7.500 inclusief btw.",
    ["Een hybride inclusief installatie ligt meestal tussen de 4.500 en 7.500 euro."],
  );
  eq("het bedrag van de ondernemer dekt de zin", String(geleZinnen(oordeel).length), "0");
});

group("verboden woorden van het merk worden geel (B16)", () => {
  const tekst = "Onze tuinman komt langs. Een tuinmannetje staat in de border. Wij zijn nooit de goedkoopste. Het adviesbezoek is gratis.";
  eq("een los woord, ongeacht hoofdletters", zinnenMetVerbodenWoord(tekst, ["Tuinman"]).join(" | "), "Onze tuinman komt langs.");
  eq("geen deel van een ander woord", String(zinnenMetVerbodenWoord("Hij is goedkoper.", ["goedkoop"]).length), "0");
  eq("een uitzondering tussen haakjes telt niet mee: de zin wordt geel", zinnenMetVerbodenWoord(tekst, ["gratis (behalve bij de offerte)"]).join(""), "Het adviesbezoek is gratis.");
  eq("meer woorden in één regel", zinnenMetVerbodenWoord(tekst, ["de goedkoopste"]).join(""), "Wij zijn nooit de goedkoopste.");
  eq("geen lijst, niets geel", String(zinnenMetVerbodenWoord(tekst, []).length), "0");
});

group("de schrijfopdracht, versie 2 (WP9)", () => {
  const sys = schrijfSysteem({ aanspreekvorm: null, verbodenOnderwerpen: [], verbodenWoorden: [] });
  ok("een FAQ alleen met een antwoord dat uit de informatie blijkt", sys.includes("Weet je het antwoord voor dit bedrijf niet, laat de vraag dan weg."));
  ok("een praktijkvoorbeeld hoort bij deze pagina", sys.includes("De andere pagina's van dit bedrijf vertellen hun eigen voorbeelden."));
  ok("de brief koppelt geen voorbeeldvraag aan een andere pagina", BRIEF_SYSTEEM.includes("Een vraag om een voorbeeld uit de praktijk koppel je niet aan een andere pagina"));
});

group("de schrijfopdracht, versie 3: bedrijfskennis en algemene kennis gescheiden (WP9 ronde 2)", () => {
  const sys = schrijfSysteem({ aanspreekvorm: null, verbodenOnderwerpen: [], verbodenWoorden: [] });
  ok("algemene kennis nooit als eigenschap van het bedrijf", sys.includes("nooit als een werkwijze, belofte, advies of eigenschap van dit bedrijf"));
  ok("één gegeven overal hetzelfde, ook in de meta", sys.includes("ook in de metabeschrijving en de veelgestelde vragen"));
  ok("een verhaal van het hele bedrijf hooguit kort", sys.includes("vertel het hooguit kort"));
  const invoer = schrijfInvoer({
    titel: "Tuinontwerp", paginasoort: "dienstpagina", handeling: "nieuw", bedrijf: "Bedrijf: Groen", stem: [],
    eigenVerhaal: null, antwoorden: [{ vraag: "Hoe begin je?", antwoord: "Met koffie." }], zoekintentie: null, doelvragen: [], andereTitels: [], huidigeTekst: null,
    onderzoek: { deelvragen: [], concurrentie: { goed: [], gaten: [] }, vakkennis: [{ uitleg: "Afschot is meestal 1 procent.", bron_url: "https://x.nl" }], valkuilen: [] },
  });
  ok("blok A en B heten bedrijfskennis", invoer.includes("WAT WE ZEKER WETEN OVER HET BEDRIJF (bedrijfskennis)") && invoer.includes("WAT DE ONDERNEMER VERTELDE (bedrijfskennis)"));
  ok("blok C heet algemene kennis en zegt dat het niet over het bedrijf gaat", invoer.includes("(onderzoek, algemene kennis)") && invoer.includes("niet over dit bedrijf") && invoer.includes("Algemene vakkennis:"));
  ok("de controle telt algemene kennis als bedrijfsclaim als verzonnen", CONTROLE_SYSTEEM.includes("dan is het wel een verzonnen claim"));
  ok("de brief vraagt hoe dit bedrijf het doet", BRIEF_SYSTEEM.includes("Vraag dan hoe dit bedrijf het doet."));
  ok("geen gedachtestreepje in de brief", !/[—–]/.test(BRIEF_SYSTEEM));
});
