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
import { compare, deltaOf, thresholdOf, verdictOf } from "@/lib/pipeline/impact-math";
import { buildChangeBlock, isWorthEmailing } from "@/lib/pipeline/period-change-format";
import type { PeriodChange } from "@/lib/pipeline/period-change-format";
import { domainOf } from "@/lib/offsite/domain";
import { checkUrlFormat } from "@/lib/url";
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
} from "@/lib/nav";
import { DOORVERWIJZINGEN } from "@/lib/redirects";
import { findGaps } from "@/lib/profile-gaps";
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
import {
  buildPlan,
  BUFFERS_PER_MONTH,
  MONTHS_AHEAD,
  DEFAULT_FUNNELS,
} from "@/lib/pipeline/plan-build";
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
import { milestones } from "@/lib/milestones";
import { readFileSync } from "node:fs";
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
import { visibilityIndex, potentialScore, potentialBand, potentialExplanation } from "@/lib/potential";
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
import { opportunities, shareLabel } from "@/lib/opportunities";
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
  STEP_ORDER,
  fieldsOfStep,
  isFilled,
  stepProgress,
  overallProgress,
} from "@/lib/pipeline/brand-fields";
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
import { buildSteps, researchRunning } from "@/lib/pipeline/research-steps";
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
import { slugFrom, suggestedPath, resolvedContentUrl } from "@/lib/pipeline/slug";
import { diffContent } from "@/lib/pipeline/content-diff";
import { FaqEdit } from "@/lib/schemas/content-piece";

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

group("buildPlan: de verdeling over twaalf maanden", () => {
  const funnels = DEFAULT_FUNNELS.map((label, i) => ({
    id: `f${i}`,
    label,
    sortOrder: i,
  }));
  const topics = Array.from({ length: 7 }, (_, i) => ({
    id: `t${i}`,
    title: `Onderwerp ${i}`,
    priority: 10 - i,
  }));
  const start = new Date("2026-09-01T00:00:00Z");

  const r = buildPlan({ startedOn: start, pagesPerMonth: 10, topics, funnels });
  ok("geen problemen bij een compleet merk", r.problems.length === 0);
  ok(
    "twaalf maanden, elk met de quota plus de buffer",
    r.pages.length === MONTHS_AHEAD * (10 + BUFFERS_PER_MONTH),
  );

  const maand1 = r.pages.filter((p) => p.monthNumber === 1);
  ok("tien echte pagina's in maand 1", maand1.filter((p) => !p.isBuffer).length === 10);
  ok("plus één buffer", maand1.filter((p) => p.isBuffer).length === BUFFERS_PER_MONTH);

  // ⚠️ Regel 1: een klant die na drie maanden opzegt (besluit 7: dat kan) moet
  // de béste drie maanden gehad hebben, niet een willekeurige greep.
  ok(
    "het hoogst geprioriteerde onderwerp staat vooraan",
    maand1[0].topicId === "t0",
  );

  // Regel 2: elke maand raakt alle fasen aan, anders ziet de klant pas in maand
  // zeven een pagina die iets oplevert.
  const fasenInMaand1 = new Set(maand1.map((p) => p.funnelStageId));
  ok("alle vier de funnelfasen komen in maand 1 voor", fasenInMaand1.size === 4);

  // Regel 4: een buffer heeft geen datum, anders loopt hij mee in de cron.
  ok(
    "buffers hebben geen publicatiedatum",
    r.pages.filter((p) => p.isBuffer).every((p) => p.scheduledFor === ""),
  );
  ok(
    "echte pagina's hebben er wel een",
    r.pages.filter((p) => !p.isBuffer).every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.scheduledFor)),
  );

  // De data lopen door de maanden heen vooruit, en blijven binnen dag 1 tot 28
  // zodat februari geen uitzondering is.
  const dagen = r.pages
    .filter((p) => !p.isBuffer)
    .map((p) => Number(p.scheduledFor.slice(8, 10)));
  ok("nooit na de 28e", dagen.every((d) => d >= 1 && d <= 28));
  ok(
    "maand 2 ligt na maand 1",
    r.pages.find((p) => p.monthNumber === 2 && !p.isBuffer)!.scheduledFor >
      r.pages.find((p) => p.monthNumber === 1 && !p.isBuffer)!.scheduledFor,
  );

  // Regel 3: minder onderwerpen dan plekken is geen reden om te stoppen.
  const weinig = buildPlan({
    startedOn: start,
    pagesPerMonth: 10,
    topics: topics.slice(0, 2),
    funnels,
  });
  ok(
    "twee onderwerpen vullen alsnog het hele jaar",
    weinig.pages.length === MONTHS_AHEAD * 11,
  );

  // ⚠️ Gevonden bij de praktijkcheck tegen Van den Udenhout: met acht
  // onderwerpen en tien pagina's per maand kwam "Auto financieren" twee keer in
  // maand één te staan, met exact dezelfde titel. Een plan waarin twee regels
  // hetzelfde heten leest als een fout.
  const titelsInMaand1 = maand1.filter((p) => !p.isBuffer).map((p) => p.title);
  ok(
    "geen twee pagina's met dezelfde titel in één maand",
    new Set(titelsInMaand1).size === titelsInMaand1.length,
  );
  ok(
    "de titel draagt de invalshoek",
    maand1[0].title.includes("Auto") === false && maand1[0].title.includes("·"),
  );

  // ⚠️⚠️ En dit is de test die de vorige had moeten zijn. Zeven onderwerpen en
  // vier fasen vallen toevallig goed uit; acht en vier niet, want dan lopen de
  // tellers in de pas. Bij het echte plan van Van den Udenhout stond
  // "Auto financieren · Oriëntatie" daardoor twee keer in maand 1, op plek 1 en
  // plek 9. Het aantal onderwerpen van een merk is niets om op te vertrouwen,
  // dus dit loopt langs alle aantallen die in de praktijk voorkomen.
  for (const aantalOnderwerpen of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16]) {
    for (const perMaand of [10, 20, 40]) {
      const p = buildPlan({
        startedOn: start,
        pagesPerMonth: perMaand,
        topics: topics.slice(0, 1).concat(
          Array.from({ length: aantalOnderwerpen - 1 }, (_, i) => ({
            id: `x${i}`,
            title: `Extra ${i}`,
            priority: 5 - i,
          })),
        ),
        funnels,
      });
      const dubbel = p.pages.some((page, _, alle) => {
        const gelijk = alle.filter(
          (q) => q.monthNumber === page.monthNumber && q.title === page.title,
        );
        return gelijk.length > 1;
      });
      ok(
        `${aantalOnderwerpen} onderwerpen bij ${perMaand} per maand: elke titel uniek binnen zijn maand`,
        !dubbel,
      );
    }
  }

  // Herhaling die rekenkundig onvermijdelijk is (8 onderwerpen × 4 fasen = 32
  // combinaties, 41 plekken) wordt zichtbaar gemaakt en niet verstopt.
  const krap = buildPlan({
    startedOn: start,
    pagesPerMonth: 40,
    topics: Array.from({ length: 8 }, (_, i) => ({
      id: `k${i}`,
      title: `Krap ${i}`,
      priority: 8 - i,
    })),
    funnels,
  });
  ok(
    "bij meer plekken dan combinaties krijgt de herhaling '(deel 2)'",
    krap.pages.filter((p) => p.monthNumber === 1).some((p) => p.title.endsWith("(deel 2)")),
  );

  // Het echte geval, met de echte aantallen van Van den Udenhout.
  const udenhout = buildPlan({
    startedOn: start,
    pagesPerMonth: 10,
    topics: Array.from({ length: 8 }, (_, i) => ({
      id: `u${i}`,
      title: `Onderwerp ${i}`,
      priority: 8 - i,
    })),
    funnels,
  });
  const parenMaand1 = udenhout.pages
    .filter((p) => p.monthNumber === 1)
    .map((p) => `${p.topicId}|${p.funnelStageId}`);
  ok(
    "acht onderwerpen en vier fasen: elk paar hoogstens één keer per maand",
    new Set(parenMaand1).size === parenMaand1.length,
  );
  ok(
    "en zonder '(deel 2)', want 32 combinaties passen ruim in elf plekken",
    udenhout.pages.every((p) => !p.title.includes("(deel")),
  );

  // Twee keer draaien op dezelfde invoer geeft hetzelfde plan. Zonder die
  // eigenschap is "opnieuw genereren" een gok.
  const nogmaals = buildPlan({ startedOn: start, pagesPerMonth: 10, topics, funnels });
  ok(
    "twee runs geven hetzelfde plan",
    JSON.stringify(nogmaals.pages) === JSON.stringify(r.pages),
  );
});

group("buildPlan: de potentiescore wint van de dag-1-gok (fase 3, docs/tasks/potentiescore.md)", () => {
  const funnels = DEFAULT_FUNNELS.map((label, i) => ({ id: `f${i}`, label, sortOrder: i }));
  const start = new Date("2026-09-01T00:00:00Z");

  // t0 heeft de hoogste PRIORITY (de gegokte dag-1-inschatting), maar t1 heeft
  // de hoogste POTENTIESCORE (gemeten). De potentiescore hoort te winnen.
  const topics = [
    { id: "t0", title: "Hoogste prioriteit, lage potentie", priority: 10, potential: 20 },
    { id: "t1", title: "Lage prioriteit, hoogste potentie", priority: 1, potential: 90 },
    { id: "t2", title: "Geen potentiescore, gemiddelde prioriteit", priority: 5 },
  ];

  const r = buildPlan({ startedOn: start, pagesPerMonth: 3, topics, funnels });
  const maand1 = r.pages.filter((p) => p.monthNumber === 1 && !p.isBuffer);

  ok(
    "het onderwerp met de hoogste potentiescore staat vooraan, niet het onderwerp met de hoogste priority",
    maand1[0].topicId === "t1",
  );
  ok(
    "een onderwerp MET potentiescore gaat altijd voor een onderwerp ZONDER, ook al is de priority lager",
    maand1[1].topicId === "t0",
  );
  ok(
    "het onderwerp zonder potentiescore staat als laatste, op zijn priority",
    maand1[2].topicId === "t2",
  );

  // Zonder potentiescore op GEEN van de onderwerpen verandert er niets: exact
  // hetzelfde gedrag als vóór fase 3 (achterwaartse compatibiliteit).
  const zonderPotentie = buildPlan({
    startedOn: start,
    pagesPerMonth: 3,
    topics: topics.map(({ id, title, priority }) => ({ id, title, priority })),
    funnels,
  });
  const maand1ZonderPotentie = zonderPotentie.pages.filter(
    (p) => p.monthNumber === 1 && !p.isBuffer,
  );
  ok(
    "zonder potentiescores sorteert alles gewoon op priority, zoals vroeger",
    maand1ZonderPotentie[0].topicId === "t0" &&
      maand1ZonderPotentie[1].topicId === "t2" &&
      maand1ZonderPotentie[2].topicId === "t1",
  );
});

group("buildPlan: wat het weigert", () => {
  const funnels = DEFAULT_FUNNELS.map((label, i) => ({ id: `f${i}`, label, sortOrder: i }));
  const topics = [{ id: "t", title: "Iets", priority: 1 }];
  const start = new Date("2026-09-01T00:00:00Z");

  ok(
    "zonder pakket geen plan",
    buildPlan({ startedOn: start, pagesPerMonth: 0, topics, funnels }).problems.length > 0,
  );
  ok(
    "zonder onderwerpen geen plan",
    buildPlan({ startedOn: start, pagesPerMonth: 10, topics: [], funnels }).problems.length > 0,
  );
  // Nova eist er drie tot vijf vóór ze een strategie laten genereren.
  ok(
    "met twee funnelfasen geen plan",
    buildPlan({ startedOn: start, pagesPerMonth: 10, topics, funnels: funnels.slice(0, 2) })
      .problems.length > 0,
  );
  ok(
    "met zes funnelfasen ook niet",
    buildPlan({
      startedOn: start,
      pagesPerMonth: 10,
      topics,
      funnels: [...funnels, { id: "x", label: "x", sortOrder: 4 }, { id: "y", label: "y", sortOrder: 5 }],
    }).problems.length > 0,
  );
  ok(
    "en dan komt er ook geen halve lijst uit",
    buildPlan({ startedOn: start, pagesPerMonth: 10, topics: [], funnels }).pages.length === 0,
  );
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
  ok(
    `het zijn er 41 aan beide kanten (nu ${BRAND_FIELDS.length} en ${EDITABLE_PROFILE_FIELDS.length})`,
    BRAND_FIELDS.length === 41 && EDITABLE_PROFILE_FIELDS.length === 41,
  );

  ok(
    "elk veld hoort bij een bestaande stap",
    BRAND_FIELDS.every((f) => STEP_ORDER.includes(f.step)),
  );
  ok("zeven stappen", STEP_ORDER.length === 7);
  // De verdeling uit docs/tasks/appstructuur.md §4.4b. Staat hier voluit zodat
  // een veld dat naar een andere stap verhuist een bewuste wijziging is en geen
  // stille verschuiving.
  const perStap = STEP_ORDER.map((s) => `${s}:${fieldsOfStep(s).length}`).join(" ");
  ok(
    `de verdeling is 8-3-6-6-5-7-6 (nu ${perStap})`,
    perStap === "bedrijf:8 merk:3 klant:6 stem:6 woorden:5 auteur:7 bekend:6",
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
  ok("er zijn keuzevelden", keuzes.length === 3);
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
  ok(
    "en de noemer is de hele lijst",
    overallProgress(leeg).totaal === BRAND_FIELDS.length,
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
    researchGaps: 0,
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
    researchGaps: 10,
  });
  ok(
    "open vragen blokkeren 'compleet' niet",
    metOpenVragen.compleet === true,
  );
  ok(
    "maar ze staan er wel als open punt",
    metOpenVragen.optioneelOpen.length === 2,
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
console.log("\nHet opbrengstblok (fase 5, milestones.ts)");

group("milestones: drie getallen, ook als er nog niets te vieren valt", () => {
  const nu = new Date("2026-11-15T12:00:00Z");
  const basis = {
    startedAt: "2026-08-11T00:00:00Z",
    eersteScore: 22,
    laatsteScore: 34,
    metingen: 3,
    gepubliceerd: 12,
    now: nu,
  };

  const m = milestones(basis);
  ok("altijd precies drie blokken", m.length === 3);

  // ⚠️ Een blok dat verdwijnt zodra het getal nul is, laat de klant precies op
  // het moment dat hij twijfelt een leeg scherm zien.
  const leeg = milestones({
    startedAt: null,
    eersteScore: null,
    laatsteScore: null,
    metingen: 0,
    gepubliceerd: 0,
    now: nu,
  });
  ok("ook zonder enige data drie blokken", leeg.length === 3);
  ok(
    "en dan staat er waaróm het leeg is",
    leeg.every((b) => b.detail !== null && b.detail.length > 0),
  );

  ok("de groei staat er met een plusteken", m[1].waarde === "+12 punten");
  ok("met het startpunt erbij", m[1].detail?.includes("22") === true);
  ok("de maandteller telt vanaf de start", m[0].detail?.includes("Maand 4") === true);
  ok("en het aantal pagina's staat er los", m[2].waarde === "12");

  // ⚠️ Conventie 3: bij één meting is er geen groei, alleen een startpunt. "0%"
  // zou suggereren dat er niets gebeurde, terwijl er nog niets te vergelijken is.
  const eenMeting = milestones({ ...basis, metingen: 1, eersteScore: 22, laatsteScore: 22 });
  ok(
    "bij één meting staat er een startpunt en geen groei",
    eenMeting[1].detail?.includes("startpunt") === true,
  );

  // Achteruitgang wordt niet verstopt.
  const omlaag = milestones({ ...basis, eersteScore: 40, laatsteScore: 31 });
  ok("een daling staat er gewoon", omlaag[1].waarde === "-9 punten");

  // Besluit 16: zonder bedrag aantallen, met bedrag geld. Zo hoeft er geen
  // scherm om zodra de prijzen er zijn.
  ok("zonder waarde per vermelding geen bedrag", m[1].detail?.includes("€") === false);
  const metGeld = milestones({ ...basis, waardePerVermelding: 25 });
  ok("met waarde per vermelding wél", metGeld[1].detail?.includes("€ 300") === true);
  ok(
    "maar niet bij een daling, want dat zou een verlies als opbrengst tonen",
    milestones({ ...basis, eersteScore: 40, laatsteScore: 31, waardePerVermelding: 25 })[1]
      .detail?.includes("€") === false,
  );

  // Enkelvoud en meervoud: "1 pagina's" is precies het soort slordigheid dat
  // een demo-scherm goedkoop laat lijken.
  ok("één pagina is enkelvoud", milestones({ ...basis, gepubliceerd: 1 })[2].label === "Pagina gepubliceerd");
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

  // ⚠️ Conventie 3: geen gewichten betekent geen getal, niet nul. Nul zou zeggen
  // dat er niets te winnen valt, en dat is iets anders dan "we weten het niet".
  const onbekend = lijst.find((o) => o.title === "Onbekend")!;
  ok("zonder gewichten geen getal", onbekend.share === null);
  ok("en dus ook geen percentage op het scherm", shareLabel(onbekend.share) === null);
  ok("een klein aandeel wordt niet naar nul afgerond", shareLabel(0.004) === "minder dan 1% van de gemeten vragen");

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
  ok("en heeft wel nog gewoon een share", lijst[2].share === 0.2);

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
  // foutmelding is specifiek). Vijf handelingen, vijf zinnen, geen dubbele.
  const zinnen = Object.values(COST_DENIED);
  ok("vijf handelingen hebben elk een eigen melding", zinnen.length === 5);
  ok("en geen twee zijn hetzelfde", new Set(zinnen).size === zinnen.length);
  ok(
    "geen enkele melding zegt alleen 'geen toegang'",
    zinnen.every((z) => z.length > 40 && !/geen toegang/i.test(z)),
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
  for (const kop of beheerder) {
    ok(`${kop.naam} heeft hooguit drie bestemmingen`, kop.items.length <= 3, `${kop.items.length}`);
  }

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

  // Zonder gekozen merk blijft alleen wat niet aan een merk hangt.
  ok(
    "zonder merk blijft alleen Instellingen over",
    hoofdstukken(generalNav(false)).map((k) => k.naam).join() === "Instellingen",
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
    ok(
      `${item.label} staat onder het merk`,
      item.href.startsWith(`/merk/${merkId}/`),
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
  // Dit is de verificatie uit fase 1 van docs/tasks/appstructuur.md: de
  // eigenaar deelt demolinks naar deze adressen, dus een dood adres kost hier
  // een gesprek en niet alleen een klik. Alle dertien zijn 308 (permanent) en
  // wijzen naar het EINDadres, niet naar een tussenstation.
  const verwacht: Record<string, string> = {
    "/profielen/nieuw": "/merk/nieuw",
    "/profielen": "/merk",
    "/profielen/:id": "/merk/:id/merkprofiel",
    "/profielen/:id/merkprofiel": "/merk/:id/merkprofiel/bewerken",
    "/profielen/:id/profielgegevens": "/merk/:id/merkprofiel/bewerken",
    "/profielen/:id/aanvullen": "/merk/:id/merkprofiel/input",
    "/profielen/:id/toevoegingen": "/merk/:id/merkprofiel/input",
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
  // ⚠️ DE VERIFICATIE UIT FASE 4 VAN docs/tasks/appstructuur.md. Op productie
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
});

// ════════════════════════════════════════════════════════════════════════════
console.log(`\n${passed} geslaagd, ${failed} mislukt`);
if (failures.length > 0) {
  console.log("\nMislukt:");
  for (const f of failures) console.log(`  ✗ ${f}`);
}
process.exit(failed === 0 ? 0 : 1);
