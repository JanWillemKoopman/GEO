/**
 * Eenheidstests voor de rekenkundige en tekstverwerkende kern.
 *
 * Draai met `npm run test:unit`. GEEN database, GEEN API-sleutel, GEEN kosten —
 * daarom kan dit bij elke wijziging draaien in plaats van alleen als iemand
 * eraan denkt.
 *
 * ── WAAROM DEZE FUNCTIES EN NIET MEER ───────────────────────────────────────
 *
 * Alles hier is puur: invoer erin, uitvoer eruit, geen netwerk. Dat is bewust de
 * scheidslijn geweest bij het bouwen — telkens als er een stuk logica ontstond
 * waar het stil mis kon gaan (een normalisatie, een drempel, een percentage),
 * is dat uit de databasecode getrokken naar een eigen module zonder
 * `server-only`. Precies die modules staan hieronder.
 *
 * Wat hier NIET in staat: alles wat de database of OpenAI nodig heeft. Dat is
 * niet te testen zonder een echt project, en een test met een nagebootste
 * database toetst vooral of je nabootsing klopt.
 */
import { binomialStderr, weightedScoreStderr, confidenceBand, changeIsMeaningful } from "@/lib/stats/uncertainty";
import { normalizeEntityName, isSameEntity, pickCanonicalName, looksLikeBrandName } from "@/lib/entities/normalize";
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
  factFromAnswer,
  sourceCoverage,
} from "@/lib/pipeline/factcard";
import { selectBriefingQuestions, describeSkipped, MAX_QUESTIONS } from "@/lib/pipeline/briefing-select";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
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
  // hoort de band breder te worden — niet gelijk te blijven.
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
  // Een vraag die één kant niet beoordeeld is, is een dataprobleem — geen daling.
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
  // Een mail die elke periode hetzelfde zegt, wordt na drie keer niet geopend —
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

  // Een payload zonder periode is geen periodieke meting van periode 0 — anders
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
  ok("merkloze vraag verbiedt een concurrent te noemen", leeg.includes("noem er ook geen"));
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
  // bewering ongemoeid bleef — precies het geval dat gevangen moest worden.
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
  // tellen — anders trekt één ontspoorde meting het cijfer omlaag.
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
  // gemeten — maar dan moeten ze niet ook zwaarder gaan MEEtellen.
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
  // 1/2 — de vraag blijft in totaal 1 wegen in plaats van te verdampen.
  const naUitval = shareByRun([
    { runId: "a1", promptId: "A" },
    { runId: "a2", promptId: "A" },
  ]);
  ok("uitval verandert de deler, niet het totaal", sumShare(["a1", "a2"], naUitval) === 1);

  // Zonder herhalingen komt er exact hetzelfde uit als vóór R6.1 — bewust, zodat
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
  // Achtergrond krijgt met opzet GEEN nummer — een nummer is de uitnodiging om
  // ernaar te verwijzen, en dat was precies het alibi van 31 juli.
  ok("achtergrond krijgt geen F-nummer", facts[2].ref === "");

  const kaart = formatFactCard(facts);
  ok("bruikbaar feit staat op de kaart", kaart.includes("F1") && kaart.includes("€419"));
  // Verboden staan in een EIGEN blok. Tussen de feiten leest een model ze als
  // materiaal; onder een verbodskop leest het ze als grens — dat verschil is
  // precies waar het in de Udenhout-run misging.
  ok("verbod staat onder een eigen kop", kaart.includes("MAG JE NIET BEWEREN"));
  ok("verbod krijgt geen F-nummer op de kaartregel", !/F2\s+Pechhulp/.test(kaart));

  // Zonder feiten mag er niets concreets beweerd worden — dat moet er expliciet
  // staan, want een leeg blok leest een model als "verzin het zelf maar".
  ok("achtergrond staat in een eigen blok", kaart.includes("ACHTERGROND — GEEN BRON"));

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
  // drie de pagina's 100 — ook voor de pagina met vijf verzonnen feiten. Een
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

  // Nooit vragen wat we al weten — dat is geloofwaardigheidsverlies (§4 regel 6).
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
console.log(`\n${passed} geslaagd, ${failed} mislukt`);
if (failures.length > 0) {
  console.log("\nMislukt:");
  for (const f of failures) console.log(`  ✗ ${f}`);
}
process.exit(failed === 0 ? 0 : 1);
