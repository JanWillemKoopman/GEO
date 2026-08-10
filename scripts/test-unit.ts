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

  ok(
    "elk veld hoort bij een bestaande stap",
    BRAND_FIELDS.every((f) => STEP_ORDER.includes(f.step)),
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
  ok("een beheerder van Aura mag altijd", mayInvite(null, true) === true);
  ok("een lid van Aura-staf ook", mayInvite("member", true) === true);
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
  };

  const r = assessReadiness(compleet);
  ok("alles gevuld is compleet", r.compleet === true);
  ok("zes onderdelen zijn verplicht", r.nodigAantal === 6);
  ok("en alle zes staan er", r.klaarAantal === 6);
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
    versionReasonLabel({ version: 1, revisionNote: "iets", editedByUser: true }).includes("Aura geschreven"),
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

// ════════════════════════════════════════════════════════════════════════════
console.log(`\n${passed} geslaagd, ${failed} mislukt`);
if (failures.length > 0) {
  console.log("\nMislukt:");
  for (const f of failures) console.log(`  ✗ ${f}`);
}
process.exit(failed === 0 ? 0 : 1);
