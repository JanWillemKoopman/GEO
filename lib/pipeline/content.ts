import "server-only";

/**
 * FASE C — Genereren (abcplan.md §8): op klant-verzoek schrijft de app één
 * kant-en-klare pagina per aanbeveling, als een kleine REDACTIONELE PIJPLIJN
 * i.p.v. één blinde call:
 *
 *   1. Draft         — premium model (`gpt-5.6-sol`), on-brand, geground op de
 *                      concrete feiten uit het klantprofiel.
 *   2. Redactie      — goedkope call (quality-tier) scoort de draft op een rubric,
 *                      checkt de harde regels én de GEO-criteria.
 *   3. Herschrijven  — premium model verwerkt de feedback (alleen als nodig).
 *   4. Kwaliteitspoort — onder de drempel of met regel-risico → needs_review.
 *   5. Schema.org    — programmatisch gevalideerd/gerepareerd (geen LLM-string).
 *
 * ── WAT ER IN FASE 4 VERANDERDE (optimalisatie.md) ──────────────────────────
 *
 * De app mat wél en schreef wél, maar de twee helften raakten elkaar niet. De
 * schrijfaanroep kreeg het merkprofiel en VIJF WILLEKEURIGE vraagteksten "alleen
 * ter inspiratie". Wat hij niet kreeg: welke vraag hij moest winnen, wat de AI
 * antwoordde toen de concurrent won, en welke bronnen daarbij geciteerd werden.
 *
 * Nu krijgt hij dat alle drie:
 *   • de concrete GEMISTE VRAGEN uit de meting, letterlijk (4.2)
 *   • het WINNENDE ANTWOORD als context, met concurrentnamen eruit (4.3)
 *   • wat de GECITEERDE BRONNEN inhoudelijk doen — de lat (4.4)
 *
 * En de beoordelaar kijkt niet meer alleen redactioneel maar ook of een AI deze
 * pagina zou citeren (4.5).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { currentPiece } from "@/lib/jobs/content-jobs";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ContentPiece } from "@/lib/schemas/content-piece";
import { Critique, geoScore, geoIssues } from "@/lib/schemas/critique";
import { checkContentGate } from "@/lib/pipeline/content-gate";
import { detectClaimSentences, detectedCoverage, resolveFactId } from "@/lib/pipeline/claim-extract";
import type { AuditedClaim } from "@/lib/schemas/claim-audit";
import { validateOrRebuildJsonLd } from "@/lib/schema-jsonld";
import { redactCompetitors, containsCompetitor } from "@/lib/pipeline/redact";
import { analyzeCitedSources } from "@/lib/pipeline/source-analysis";
import { contentWebSearchEnabled, minProofPointsForConcreteContent } from "@/lib/config";
import { buildFactBase } from "@/lib/pipeline/factbase";
import { syncBrandFacts } from "@/lib/pipeline/factstore";
import { factsFromSnapshot, planFromSnapshot } from "@/lib/pipeline/briefing";
import {
  formatFactCard,
  sourceCoverage,
  isSupported,
  factFromAnswer,
  mergeAnsweredFacts,
  normalizeForQuote,
  type AnsweredFactInput,
  type FactItem,
  type WrittenClaim,
} from "@/lib/pipeline/factcard";
import type { RecommendationTarget } from "@/lib/pipeline/recommendation";
import type {
  Analysis,
  Profile,
  ProfilePage,
  TopicResearch,
  ContentAction,
  ContentType,
  // De databaserij heet ook ContentPiece; hernoemd om te botsen met het Zod-schema.
  ContentPiece as ContentPieceRow,
} from "@/lib/types/database";

/** Onder deze rubric-score markeren we een pagina voor menselijke controle (F1). */
const REVIEW_THRESHOLD = 80;

/**
 * Onder deze GEO-score is de pagina misschien prima geschreven, maar niet
 * geschikt voor het doel waarvoor hij gemaakt is. 60 = drie van de vijf criteria;
 * daaronder ontbreekt er iets fundamenteels (meestal: de doelvraag wordt niet
 * meteen beantwoord, of het bedrijf staat er nergens met naam in).
 */
const GEO_THRESHOLD = 60;

/**
 * Doellengte per paginatype (optimalisatie.md 4.10).
 *
 * Er ging nooit een maximum mee; het aantal woorden werd achteraf geteld. Dat
 * levert bij elk type dezelfde middelmatige lap tekst op, terwijl een FAQ geen
 * artikel is. Een AI-assistent citeert bovendien liever een compacte, precieze
 * passage dan een uitgesponnen betoog — lengte is hier geen kwaliteitsmaat.
 */
const TARGET_WORDS: Record<ContentType, { min: number; max: number }> = {
  faq: { min: 250, max: 500 }, // korte inleiding; het werk zit in de vraag-antwoordparen
  landing: { min: 400, max: 700 }, // overtuigen kost ruimte, uitweiden niet
  article: { min: 700, max: 1200 }, // het enige type waar diepte echt telt
  comparison: { min: 500, max: 900 },
};

/**
 * Harde regels — dit staat op de EIGEN website van de klant:
 * 1. Nooit concurrenten of andere bedrijven bij naam noemen.
 * 2. De FEITENKAART is de enige bron van concrete beweringen over de klant
 *    (R5.3). Gesloten lijst: wat er niet op staat, wordt niet geschreven.
 * 3. Direct antwoord eerst; heldere koppen; scanbaar; geen AI-slop.
 *
 * De GEO-regels (4-6) zijn nieuw in fase 4 en gaan over iets anders dan
 * leesbaarheid: ze gaan over de vraag of een AI-assistent deze pagina kán
 * aanhalen. Regel 5 is de belangrijkste en de minst intuïtieve — "wij leveren
 * binnen 24 uur" is voor een lezer duidelijk en voor een model waardeloos,
 * omdat het niet weet wie "wij" is.
 */
const CONTENT_SYSTEM =
  "Je bent een ervaren contentschrijver die pagina's schrijft voor de EIGEN website van een lokale " +
  "ondernemer, klaar om te publiceren. On-brand, Nederlands. " +
  "HARDE REGELS: " +
  "(1) Noem NOOIT concurrenten of andere bedrijven bij naam — dit is de site van de klant zelf; " +
  "vergelijkingen met bij naam genoemde bedrijven zijn absoluut verboden. " +
  // ── R5.3: de feitenkaart is een GRENS, geen suggestie ────────────────────
  // Hier stond "je mag de concrete feiten gebruiken die onder 'Feiten over dit
  // bedrijf' staan". Dat is een uitnodiging: het zegt wat mag, niet wat niet
  // mag. In de praktijktest schreef het model vijf feiten die er niet stonden —
  // pechhulp, vervangend vervoer, schadeherstel, looptijden, kilometerbundels —
  // en elk daarvan op precies de plek waar de pagina een concreet detail nodig
  // had. De regel hieronder draait het om: gesloten lijst, en wat er niet op
  // staat bestaat niet.
  "(2) De FEITENKAART is de ENIGE toegestane bron van concrete beweringen over dit bedrijf. Elke " +
  "feitelijke bewering over de klant (prijzen, cijfers, voorwaarden, wat er wel/niet bij zit, " +
  "openingstijden, keurmerken, aantallen, namen van vestigingen) moet herleidbaar zijn tot een " +
  "F-nummer op die kaart. Staat het er niet op, dan schrijf je er NIET over — niet gladstrijken, " +
  "niet aannemen, niet 'logisch invullen', ook niet voorzichtig geformuleerd of als vraag in een " +
  "FAQ. Een pagina die iets niet noemt is beter dan een pagina die het verzint. Wat onder 'MAG JE " +
  "NIET BEWEREN' staat is een VERBOD. Algemene uitleg over het onderwerp (hoe dit in het algemeen " +
  "werkt) mag wel zonder F-nummer, zolang er geen belofte van deze klant in zit. " +
  "Lever in het veld `claims` per concrete bewering over de klant het F-nummer dat hem dekt PLUS " +
  "het letterlijke fragment uit dat feit dat hem dekt (`quote`). Kun je die zin niet letterlijk " +
  "aanwijzen, dan mag je de bewering niet doen. Wat onder 'ACHTERGROND' staat heeft geen F-nummer " +
  "en dekt dus niets: dat is losse sitetekst om de context te begrijpen, geen bevestigd feit. " +
  "(3) Schrijf in dezelfde stijl als de meegegeven voorbeeldzinnen van de site. " +
  "REGELS VOOR VINDBAARHEID IN AI-ASSISTENTEN (net zo belangrijk als de rest): " +
  "(4) Beantwoord de DOELVRAAG letterlijk en volledig in de eerste twee zinnen van de pagina, vóór " +
  "elke inleiding. Een AI die een antwoord zoekt, leest de opwarmer niet uit. " +
  "(5) Noem het BEDRIJF EXPLICIET bij naam op de plekken waar je iets over jezelf zegt, in plaats van " +
  "'wij' en 'ons'. Schrijf dus niet 'wij leveren binnen 24 uur' maar '[Bedrijfsnaam] levert binnen 24 uur'. " +
  "Een AI-assistent die 'wij' leest, weet niet wie hij moet noemen in zijn antwoord — en noemt je dus niet. " +
  "(6) Zorg dat elke sectie minstens één zin bevat die LOSSTAAND te begrijpen is, zonder de rest van de " +
  "pagina: één zin die het complete antwoord op één deelvraag geeft. Dat is de eenheid waarin een " +
  "AI-assistent knipt. " +
  "(7) Beantwoord naast de hoofdvraag ook de logische vervolgvragen die iemand daarna stelt. " +
  "(8) Voeg geldige schema.org JSON-LD toe passend bij het type. " +
  "Vermijd generieke 'AI-slop' en cliché-vulzinnen ('in de snel veranderende wereld van…') — elke zin moet iets toevoegen.";

/**
 * Vangnet-instructie als de klant te weinig geverifieerde feiten heeft
 * (optimalisatie.md 4.6). Alleen actief bij een dunne feitenlijst, en alleen
 * met web-zoeken aan.
 *
 * De spanning die dit oplost: "verzin niets" + "wees concreet" is bij een dunne
 * website een tegenspraak, en het model kiest dan altijd voor algemeen. Door
 * ALGEMENE vakkennis te laten opzoeken (geen bedrijfsclaims — die kunnen we niet
 * controleren) krijgt de pagina toch iets concreets om op te staan.
 */
const FACT_FINDING_ADDENDUM =
  " AANVULLENDE OPDRACHT: er zijn weinig geverifieerde feiten over dit bedrijf beschikbaar. Zoek daarom " +
  "op internet naar ALGEMEEN GELDENDE, verifieerbare feiten over het ONDERWERP (normen, termijnen, " +
  "richtprijzen in de markt, wettelijke eisen, technische standaarden) en verwerk die met bronvermelding. " +
  "Doe dit NOOIT voor claims over dit specifieke bedrijf — die mag je alleen uit de aangeleverde feitenlijst " +
  "halen. Een marktfeit met bron is waardevol; een verzonnen bedrijfsfeit is schadelijk.";

/** Redacteur-rol voor de kritiek-stap — redactioneel én GEO (optimalisatie.md 4.5). */
const CRITIQUE_SYSTEM =
  "Je bent een strenge eindredacteur én GEO-specialist. Beoordeel de aangeleverde webpagina voor de " +
  "EIGEN site van een ondernemer. " +
  "REDACTIONEEL: scoor 0-100 op begint-met-het-directe-antwoord, on-brand, concreet-waar-mogelijk " +
  "(zonder verzinsels), scanbaar, en waardevol (geen AI-slop/vulzinnen). " +
  "HARDE REGELS: zet followsRules op false als de tekst een concurrent/ander bedrijf bij naam noemt, " +
  "feiten lijkt te verzinnen, of niet met het directe antwoord begint. " +
  "GEO — zou een AI-assistent deze pagina CITEREN? Beoordeel elk criterium streng en apart: " +
  "wordt de DOELVRAAG hierboven letterlijk beantwoord in de eerste twee zinnen; bevat elke sectie een zin " +
  "die LOSSTAAND te begrijpen is; wordt het bedrijf EXPLICIET bij naam genoemd in plaats van 'wij'/'ons'; " +
  "staan er concrete cijfers/jaartallen/feiten in; worden de logische vervolgvragen beantwoord. " +
  "Bij twijfel: false. Een te milde beoordeling levert een pagina op die niemand citeert. " +
  "Geef concrete, korte verbeterpunten. Antwoord in het Nederlands.";

/** Type-specifieke instructie — bepaalt wat voor pagina er echt uitkomt. */
const TYPE_GUIDANCE: Record<ContentType, string> = {
  faq:
    "Schrijf ECHTE veelgestelde klantvragen + antwoorden: dingen die klanten willen weten vóór ze " +
    "langskomen of boeken (bv. hoe maak ik een afspraak of kan ik zonder afspraak langskomen, welke " +
    "diensten zijn er, hoe lang duurt een behandeling, wat kan ik verwachten, hoe kan ik betalen). " +
    "Zet de vraag-antwoord-paren in het FAQ-veld en houd bodyMarkdown kort (alleen een korte inleiding), " +
    "zodat de vragen niet dubbel op de pagina verschijnen.",
  landing:
    "Schrijf een overtuigende landingspagina voor deze dienst/dit onderwerp: heldere waardepropositie " +
    "bovenaan, wat de klant krijgt, waarom voor deze aanbieder kiezen, en een duidelijke call-to-action.",
  article:
    "Schrijf een informatief, waardevol artikel dat het onderwerp echt beantwoordt met correcte, " +
    "concrete-waar-mogelijk informatie (zonder iets te verzinnen).",
  comparison:
    "Vergelijk OPTIES of AANPAKKEN in algemene zin (bv. types dienstverleners of methoden). " +
    "Vergelijk NOOIT met concrete, bij naam genoemde bedrijven.",
};

export interface RecommendationInput {
  title: string;
  type: ContentType;
  targetIntent: string;
  why: string;
  /** Uit het rapport (abcplan.md §12.23): bestaande pagina verbeteren of nieuw? */
  action?: ContentAction;
  existingUrl?: string | null;
  /** De gemiste vragen die deze pagina moet winnen (optimalisatie.md 4.1/4.2). */
  targets?: RecommendationTarget[];
  /** Wat de klant zelf anders wil (optimalisatie.md 4.8). */
  revisionNote?: string | null;
}

function countWords(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * De doelvragen als blok. Dit vervangt de "vijf willekeurige vraagteksten ALLEEN
 * ter inspiratie" — een instructie die het model expliciet vertelde de vragen
 * níét serieus te nemen, terwijl ze het enige waren wat de meting bijdroeg.
 */
function buildTargetBlock(targets: RecommendationTarget[]): string {
  if (targets.length === 0) return "";
  const lines = targets.map((t) => `- "${t.text}"`);
  return (
    `\nDOELVRAGEN — dit zijn de vragen waarop een AI-assistent jouw klant NU NIET noemt. Deze pagina ` +
    `moet ze expliciet en direct beantwoorden; dat is het hele doel van deze pagina:\n${lines.join("\n")}`
  );
}

/**
 * Het antwoord waarin de concurrent won, als context (optimalisatie.md 4.3).
 *
 * Concurrentnamen zijn er al uit (redactCompetitors), en er staat een vangnet
 * omheen: zit er ná het opschonen tóch nog een naam in, dan laten we het blok
 * weg. Liever minder context dan de harde regel breken — een pagina die een
 * concurrent noemt is onbruikbaar voor de klant, hoe goed hij verder ook is.
 */
function buildWinningAnswerBlock(answers: string[], competitors: string[]): string {
  const safe = answers
    .map((a) => redactCompetitors(a, competitors))
    .filter((a) => a.trim() && !containsCompetitor(a, competitors))
    .slice(0, 2);

  if (safe.length === 0) return "";

  return (
    `\nWAT DE AI NU ANTWOORDT op deze vragen (bedrijfsnamen zijn vervangen door een neutrale ` +
    `aanduiding). Dit is het antwoord waarin jouw klant NIET voorkwam. Jouw pagina moet de informatie ` +
    `bevatten die hier ontbreekt, of dezelfde informatie concreter en directer geven. Neem hier NIETS ` +
    `letterlijk uit over:\n` +
    safe.map((a, i) => `--- ANTWOORD ${i + 1} ---\n${a}`).join("\n\n")
  );
}

/**
 * Het paginaplan als opdracht (S2).
 *
 * ── WAAROM DIT BLOK ER NIET WAS ─────────────────────────────────────────────
 *
 * De claim-audit rekent vóór het schrijven uit welke beweringen de pagina nodig
 * heeft om zijn doelvraag geloofwaardig te beantwoorden, en waaróm. Van die
 * uitkomst gebruikte de app alleen de GATEN — om vragen aan de klant van te
 * maken. De rest verdween. Gemeten over de vijf testcases: 31 beweringen in de
 * audits, waarvan 19 onderbouwd; alle 31 weggegooid na het stellen van de vragen.
 *
 * De schrijver begon dus elke keer bij nul: feitenkaart, doelvragen, succes. Nu
 * krijgt hij het skelet, met per bewering de stand van zaken op dít moment —
 * opnieuw doorgerekend tegen de kaart inclusief de antwoorden die de klant ná de
 * briefing gaf, niet tegen de stand van tijdens de audit.
 *
 * Drie uitkomsten, en het verschil ertussen is het hele punt:
 *   • GEDEKT       — schrijf hem, met dit F-nummer erbij
 *   • WEERLEGD     — de klant heeft dit ontkend; dit is een verbod
 *   • GEEN BRON    — laat de passage weg, vul hem niet in
 */
function buildPlanBlock(plan: AuditedClaim[], facts: FactItem[]): string {
  if (plan.length === 0) return "";

  const regels = plan.map((claim) => {
    const gedekt = isSupported(claim.sourceRef, facts, claim.supportQuote);
    // Een feit met `allowed: false` is een VERBOD, geen ontbrekend feit: de
    // klant heeft "nee" geantwoord. Dat onderscheid weglaten zou het model laten
    // redeneren dat het waarschijnlijk tóch wel zo is — precies de fout uit de
    // Udenhout-run, maar dan mét een antwoord in de hand.
    const weerlegd = facts.some(
      (f) =>
        !f.allowed &&
        f.ref &&
        claim.sourceRef &&
        claim.sourceRef.toUpperCase().includes(f.ref.toUpperCase()),
    );

    const stand = gedekt
      ? `GEDEKT door ${claim.sourceRef}`
      : weerlegd
        ? "WEERLEGD — de klant heeft dit ontkend, dus VERBODEN"
        : "GEEN BRON — laat deze passage weg";

    return (
      `- [${claim.importance === "kern" ? "KERN" : "ondersteunend"}] ${claim.claim}\n` +
      `    beantwoordt: ${claim.neededFor}\n    stand: ${stand}`
    );
  });

  return (
    `\nPAGINAPLAN — dit is wat deze pagina moet vertellen, en per punt of we het kunnen ` +
    `onderbouwen. Volg dit plan: behandel de KERN-punten die gedekt zijn als eerste, laat de ` +
    `punten zonder bron volledig weg (niet voorzichtig formuleren — WEGLATEN), en schrijf nooit ` +
    `iets dat als WEERLEGD staat aangemerkt.\n${regels.join("\n")}`
  );
}

function buildContentInput(args: {
  analysis: Analysis;
  profile: Profile | null;
  topicResearch: TopicResearch | null;
  existingPage: ProfilePage | null;
  competitors: string[];
  rec: RecommendationInput;
  targets: RecommendationTarget[];
  winningAnswers: string[];
  sourceBlock: string;
  /** Waarop concurrenten genoemd worden — de lat (R4.3). Zonder namen. */
  competitorEdge: string;
  /** De gesloten feitenkaart (R5.3). Vervangt de open "gebruik deze feiten"-lijst. */
  facts: FactItem[];
  /** Wat deze pagina moet vertellen, uit de claim-audit (S2). */
  plan: AuditedClaim[];
  /** Verplichte vragen die de klant liet liggen — die claims vervallen (§6). */
  unansweredRequired: string[];
}): string {
  const {
    analysis,
    profile,
    topicResearch,
    existingPage,
    competitors,
    rec,
    targets,
    winningAnswers,
    sourceBlock,
    competitorEdge,
    facts,
    plan,
    unansweredRequired,
  } = args;

  const styleSamples = profile?.style_samples ?? [];
  const words = TARGET_WORDS[rec.type];
  const brandName = profile?.brand_name ?? analysis.url;

  return [
    `Bedrijf: ${brandName}`,
    `Website: ${analysis.url}`,
    `Onderwerp/scope: ${analysis.topic}`,
    analysis.content_brief?.trim()
      ? `Gewenste richting/doelgroep van de content (van de klant — VOLG dit): ${analysis.content_brief.trim()}`
      : "",
    `Branche: ${profile?.industry ?? "onbekend"}`,
    `Tone of voice: ${profile?.tone_of_voice ?? "professioneel, helder"}`,
    `Diensten/producten: ${(profile?.products ?? []).join(", ") || "onbekend"}`,
    profile?.value_props?.length ? `Waardeproposities (waarom klanten kiezen): ${profile.value_props.join(", ")}` : "",
    // ✅ De gesloten feitenkaart (R5.3) — geen uitnodiging maar een grens.
    formatFactCard(facts),
    // ✅ Het paginaplan uit de claim-audit (S2) — wat de pagina moet vertellen,
    // met per punt of we het kunnen onderbouwen. Direct onder de kaart, want de
    // twee horen bij elkaar: het plan noemt de F-nummers die de kaart draagt.
    buildPlanBlock(plan, facts),
    // Wat de klant bewust liet liggen. Expliciet benoemen is wezenlijk: zonder
    // deze regel weet het model alleen dat het feit ontbreekt, en "ontbreekt"
    // is precies de situatie waarin het gaat invullen. Nu weet het dat er
    // NAAR GEVRAAGD is en dat er geen antwoord kwam.
    unansweredRequired.length
      ? `ONBEANTWOORD GEBLEVEN — hier is naar gevraagd, de klant heeft niet geantwoord. Schrijf ` +
        `hier NIETS over; laat de passage weg in plaats van hem in te vullen:\n- ${unansweredRequired.join("\n- ")}`
      : "",
    // ✅ Stijl-grounding: letterlijke voorbeeldzinnen om de toon na te bootsen.
    styleSamples.length ? `Voorbeeldzinnen in de merkstem (toon nabootsen):\n- ${styleSamples.join("\n- ")}` : "",
    topicResearch?.content_summary ? `Wat de website al zegt over dit onderwerp: ${topicResearch.content_summary}` : "",
    competitors.length ? `NIET noemen op deze pagina (concurrenten): ${competitors.join(", ")}` : "",
    "",
    `Te maken pagina: "${rec.title}" (type: ${rec.type})`,
    `Doel: ${rec.targetIntent}`,
    `Achtergrond: ${rec.why}`,
    TYPE_GUIDANCE[rec.type],
    // 4.10 — lengte sturen in plaats van achteraf tellen.
    `Doellengte: ${words.min}-${words.max} woorden in bodyMarkdown. Een AI-assistent citeert liever een ` +
      `compacte, precieze passage dan een uitgesponnen betoog; ga niet over het maximum heen om vol te maken.`,
    // 4.2 — de doelvraag letterlijk.
    buildTargetBlock(targets),
    // 4.3 — het winnende antwoord als context.
    buildWinningAnswerBlock(winningAnswers, competitors),
    // 4.4 — wat de geciteerde bronnen doen.
    sourceBlock,
    // R4.3 — waarop de concurrenten genoemd worden. Dit is de lat: de pagina moet
    // op deze punten minstens zo concreet zijn. Bewust ZONDER namen (zie de
    // opbouw in loadContentContext) — de harde regel blijft dat klantcontent
    // nooit een concurrent noemt.
    competitorEdge,
    existingPage
      ? `\nBESTAANDE PAGINA om te verbeteren/aanvullen (${existingPage.url}) — bouw hierop voort, herschrijf ` +
        `niet vanaf nul, behoud wat al goed is en vul alleen de ontbrekende delen aan:\n"""\n${existingPage.text_excerpt ?? ""}\n"""`
      : "",
    "",
    `Schrijf de volledige pagina in Markdown (zonder concurrentnamen), plus meta-title (max 60 tekens), ` +
      `meta-description (max 160 tekens), FAQ en schema.org JSON-LD. Noem "${brandName}" expliciet bij naam ` +
      `waar je iets over het bedrijf zegt. Vul daarna \`claims\` met elke concrete bewering die je over ` +
      `${brandName} hebt gedaan, het F-nummer dat hem dekt, en de letterlijke zin uit dat feit.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Input voor de redactie-stap. Krijgt sinds fase 4 de DOELVRAAG mee — zonder die
 * vraag kon de beoordelaar onmogelijk vaststellen of de pagina hem beantwoordt,
 * en beoordeelde hij dus alleen of de tekst lekker las.
 */
function buildCritiqueInput(
  piece: ContentPiece,
  rec: RecommendationInput,
  targets: RecommendationTarget[],
  brandName: string,
): string {
  return [
    `Type pagina: ${rec.type}. Doel: ${rec.targetIntent}.`,
    `Bedrijfsnaam die expliciet genoemd moet worden: ${brandName}`,
    targets.length
      ? `DOELVRAGEN die deze pagina moet beantwoorden:\n- ${targets.map((t) => t.text).join("\n- ")}`
      : "DOELVRAAG: niet opgegeven — beoordeel dan of de pagina zijn eigen titel als vraag beantwoordt.",
    `Titel: ${piece.title}`,
    "",
    "Pagina-inhoud (Markdown):",
    piece.bodyMarkdown,
    piece.faq.length ? `\nFAQ:\n${piece.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Input voor de herschrijf-stap: de originele opdracht + de feedback. */
function buildReviseInput(
  baseInput: string,
  piece: ContentPiece,
  issues: string[],
  revisionNote?: string | null,
): string {
  return [
    baseInput,
    "",
    "── HERSCHRIJF-OPDRACHT ──",
    "Hieronder je eigen eerdere versie én de opmerkingen. Herschrijf de pagina zodat álle opmerkingen " +
      "zijn verwerkt, met behoud van de harde regels.",
    // De klant gaat vóór de redacteur. Dit is zijn website; vraagt hij om een
    // andere toon of een ander accent, dan is dat geen suggestie (4.8).
    revisionNote?.trim()
      ? `\nWAT DE KLANT ZELF VRAAGT (dit weegt het ZWAARST — dit is zijn website):\n"""\n${revisionNote.trim()}\n"""`
      : "",
    issues.length ? `\nVerbeterpunten van de eindredacteur:\n${issues.map((i) => `- ${i}`).join("\n")}` : "",
    "",
    "Je eerdere versie (Markdown):",
    piece.bodyMarkdown,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * De context die beide contentstappen nodig hebben. Puur databasewerk plus
 * hooguit één bronanalyse-aanroep.
 */
interface ContentContext {
  analysis: Analysis;
  profile: Profile | null;
  competitors: string[];
  targets: RecommendationTarget[];
  baseInput: string;
  /** Web-zoeken aanzetten voor déze aanroep, omdat de feitenlijst te dun is (4.6). */
  needsFactFinding: boolean;
  brandName: string;
  /**
   * De feitenkaart waarop deze pagina geschreven wordt (R5.3). Wordt ook ná het
   * schrijven gebruikt: de dekkingsberekening rekent er de bronnen mee na, en
   * die controle is alleen zinnig tegen dezelfde kaart die het model kreeg.
   */
  facts: FactItem[];
  /** Wat de pagina moet vertellen, uit de claim-audit (S2). Leeg = geen plan. */
  plan: AuditedClaim[];
  /**
   * Wat de klant als ONDERSCHEIDEND heeft opgegeven (R8.8). De briefing vraagt
   * er expliciet naar (contentbriefing.md §5, vraagsoort 3) omdat het de enige
   * informatie is die principieel niet uit een crawl te halen is — maar tot nu
   * toe controleerde niets of het antwoord ook in de tekst belandde.
   */
  distinctiveAnswers: string[];
}

async function loadContentContext(
  admin: ReturnType<typeof createAdminClient>,
  analysisId: string,
  userId: string,
  recommendation: RecommendationInput,
): Promise<ContentContext> {
  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", analysisId).single();
  if (!analysisRow || analysisRow.user_id !== userId) throw new Error("Analyse niet gevonden.");
  const analysis = analysisRow as Analysis;

  const [{ data: profileRow }, { data: topicResearchRow }, { data: factRows }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", analysis.profile_id).maybeSingle(),
    admin.from("topic_research").select("*").eq("analysis_id", analysisId).maybeSingle(),
    // Feiten die de klant zelf aanleverde (4.6) — vaak precies de cijfers die
    // nergens op de website stonden — én de vragen die ONBEANTWOORD bleven.
    // Beide zijn nodig: de antwoorden gaan de feitenkaart in (R8.1), de
    // onbeantwoorde verplichte vragen gaan als expliciet verbod de prompt in.
    admin
      .from("fact_requests")
      .select(
        "id, question, answer, answer_type, answered_at, status, required, scope, analysis_id, kind",
      )
      .eq("profile_id", analysis.profile_id),
  ]);
  const profile = profileRow as Profile | null;
  const topicResearch = topicResearchRow as TopicResearch | null;

  // ── De antwoorden van de klant, klaar om de kaart in te gaan (R8.1) ───────
  //
  // Dit stond hier al, maar werd nergens gebruikt: de lijst werd opgebouwd en
  // daarna vergeten, terwijl de schrijver uitsluitend de kaart kreeg die vóór
  // de briefing bevroren was. Precies daardoor werd een met bron bevestigd
  // "nee" alsnog als "ja" gepubliceerd (zie mergeAnsweredFacts).
  //
  // Dezelfde scope-regel als buildFactBase: merkbrede antwoorden gelden altijd,
  // analyse-antwoorden alleen bij deze analyse. Een 'pagina'-antwoord hoort bij
  // één content_piece en zou hier bij de verkeerde pagina kunnen belanden.
  // De extra velden dienen alleen het wegschrijven naar de feitenbank hieronder;
  // `mergeAnsweredFacts` kijkt er niet naar.
  const answeredFacts: (AnsweredFactInput & { scope: string; requestId: string })[] = (
    factRows ?? []
  )
    .filter((f) => {
      if (f.status !== "beantwoord" || !(f.answer as string | null)?.trim()) return false;
      const scope = f.scope as string;
      return scope === "merk" || (scope === "analyse" && f.analysis_id === analysisId);
    })
    .flatMap((f) => {
      const fact = factFromAnswer(f as never);
      return fact
        ? [
            {
              question: f.question as string,
              fact,
              // Wordt hieronder ingevuld zodra het antwoord in de feitenbank
              // staat; blijft null als dat wegschrijven mislukt.
              id: null as string | null,
              scope: f.scope as string,
              requestId: f.id as string,
            },
          ]
        : [];
    });

  // Verplichte vragen die de klant heeft laten liggen of bewust oversloeg. De
  // bewering vervalt dan — hij wordt niet verzonnen (contentbriefing.md §6).
  const unansweredRequired = (factRows ?? [])
    .filter((f) => f.required && (f.status === "open" || f.status === "overgeslagen"))
    .map((f) => f.question as string);

  // Wat de klant als onderscheidend opgaf (R8.8) — apart, omdat de poort ná het
  // schrijven controleert of dit ook echt in de tekst is beland.
  const distinctiveAnswers = (factRows ?? [])
    .filter((f) => f.kind === "onderscheid" && f.status === "beantwoord")
    .map((f) => ((f.answer as string | null) ?? "").trim())
    .filter(Boolean);

  // Gededupliceerde unie: onderwerp-specifieke concurrenten + algemene bedrijfsconcurrenten.
  const competitors = Array.from(
    new Set([...(topicResearch?.competitors ?? []), ...(profile?.competitors ?? [])]),
  );

  const action = recommendation.action ?? "nieuw";
  let existingPage: ProfilePage | null = null;
  if (action === "verbeteren" && recommendation.existingUrl) {
    const { data: pageRow } = await admin
      .from("profile_pages")
      .select("*")
      .eq("profile_id", analysis.profile_id)
      .eq("url", recommendation.existingUrl)
      .maybeSingle();
    existingPage = (pageRow as ProfilePage | null) ?? null;
  }

  const targets = recommendation.targets ?? [];

  // ── De metingen achter de doelvragen ophalen (4.3/4.4) ────────────────────
  // Het letterlijke antwoord waarin de concurrent won, plus de bronnen die
  // daarbij geciteerd werden. Beide stonden al in de database en werden nooit
  // gebruikt.
  const runIds = targets.map((t) => t.runId).filter((id): id is string => Boolean(id));
  let winningAnswers: string[] = [];
  let citedSources: string[] = [];

  if (runIds.length > 0) {
    const [{ data: runRows }, { data: mentionRows }] = await Promise.all([
      admin.from("tracking_runs").select("id, raw_response").in("id", runIds),
      admin
        .from("tracking_run_mentions")
        .select("cited_sources, is_own_brand, mentioned")
        .in("tracking_run_id", runIds),
    ]);
    winningAnswers = (runRows ?? [])
      .map((r) => (r.raw_response as string | null) ?? "")
      .filter(Boolean);
    citedSources = Array.from(
      new Set(
        (mentionRows ?? [])
          // Alleen de bronnen bij een merk dat WÉL genoemd werd: dat zijn de
          // pagina's die de AI overtuigend genoeg vond om aan te halen.
          .filter((m) => m.mentioned && !m.is_own_brand)
          .flatMap((m) => (m.cited_sources ?? []) as string[]),
      ),
    );
  }

  const sources = await analyzeCitedSources({
    urls: citedSources,
    targetQuestions: targets.map((t) => t.text),
    competitors,
    analysisId,
    profileId: analysis.profile_id,
  });

  // R4.3 — waarop worden de concurrenten genoemd? Alleen de EIGENSCHAPPEN, nooit
  // de namen: die mogen de schrijfprompt niet in, anders belandt er vroeg of laat
  // een concurrent op de pagina van de klant.
  const { data: rivalRows } = await admin
    .from("competitor_breakdown")
    .select("attributes_json")
    .eq("analysis_id", analysisId)
    .not("attributes_json", "is", null)
    .order("mentions_count", { ascending: false })
    .limit(8);

  // ── Waaróp worden de concurrenten genoemd? (R4.3, aangescherpt in S4) ─────
  //
  // Deze Map bevatte de bewijszinnen al — en er ging alleen `.keys()` de prompt
  // in. De schrijver kreeg dus letterlijk dit als "de lat":
  //
  //     - locatie
  //     - service
  //     - specialisme
  //     - prijs
  //
  // Vier abstracte zelfstandige naamwoorden, terwijl de concrete zinnen eronder
  // in de database stonden: "Zitting manuele therapie: €60,00 per sessie",
  // "biedt fysiotherapie aan zonder dat een verwijsbrief nodig is". Dat is het
  // verschil tussen weten dát je op prijs verliest en weten waarvan.
  //
  // De namen gaan er dubbel uit — wegstrepen én controleren — want de harde
  // regel is dat er nooit een concurrent op de pagina van de klant komt.
  const edgeCounts = new Map<string, string>();
  for (const row of rivalRows ?? []) {
    for (const a of (row.attributes_json ?? []) as { attribute: string; evidence: string }[]) {
      if (!a?.attribute?.trim() || !a?.evidence?.trim()) continue;
      if (edgeCounts.has(a.attribute)) continue;
      const schoon = redactCompetitors(a.evidence.trim(), competitors);
      if (containsCompetitor(schoon, competitors)) continue;
      edgeCounts.set(a.attribute, schoon);
    }
  }

  const competitorEdge =
    edgeCounts.size > 0
      ? `\nWAAROP DE AI NU ANDERE AANBIEDERS NOEMT (dit is de lat — jouw pagina moet op deze punten ` +
        `minstens zo concreet zijn; de namen doen er niet toe en mogen niet op de pagina):\n` +
        Array.from(edgeCounts, ([attr, bewijs]) => `- ${attr}: "${bewijs}"`).join("\n")
      : "";

  // ── De feitenkaart (R5.3) ─────────────────────────────────────────────────
  //
  // Bij voorkeur de BEVROREN kaart uit de briefing: dan is achterhaalbaar op
  // basis van welke feiten deze pagina destijds geschreven is, ook als de klant
  // later een feit bijstelt (contentbriefing.md §10, zelfde principe als
  // prompt_text_snapshot). Bestaat die niet — een pagina van vóór R5.1, of een
  // herschrijfronde zonder briefing — dan bouwen we hem alsnog op. Zonder kaart
  // schrijven is geen optie: dat is precies de open context waarin het model
  // ging invullen.
  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select("briefing_snapshot_json")
    .eq("analysis_id", analysisId)
    .eq("title", recommendation.title)
    .eq("is_current", true)
    .maybeSingle();

  const bevroren = factsFromSnapshot(pieceRow?.briefing_snapshot_json);
  const basis =
    bevroren.length > 0
      ? bevroren
      : // De doelvragen sturen de relevantieselectie (S1). Zonder ze zou de
        // terugvalroute weer de eerste acht crawlrijen pakken — bij Coolblue vier
        // navigatiepagina's plus dezelfde vier in het Engels.
        await buildFactBase(
          admin,
          analysis.profile_id,
          analysisId,
          targets.map((t) => t.text),
        );

  // Het paginaplan uit de audit (S2). Wordt in `buildPlanBlock()` opnieuw
  // doorgerekend tegen de kaart hieronder — inclusief de verse antwoorden — in
  // plaats van tegen de stand van tijdens de briefing.
  const plan = planFromSnapshot(pieceRow?.briefing_snapshot_json);

  // ── De bevroren kaart is een MOMENTOPNAME, geen eindstand (R8.1) ──────────
  //
  // Hij is bevroren toen de claim-audit draaide — dus vóórdat de klant ook maar
  // één vraag beantwoord had. Alles wat hij daarna invulde staat in
  // `fact_requests` en moet er alsnog bij, anders schrijft het model tegen een
  // kaart die het halve verhaal mist. Bij de terugvalroute (geen snapshot)
  // zitten de antwoorden al in `buildFactBase`; het samenvoegen ontdubbelt
  // daarop, dus die route blijft ongewijzigd van uitkomst.
  //
  // ── Eerst de bank, dan de kaart (migratie 0036) ───────────────────────────
  //
  // `buildFactBase()` zet zijn feiten in de feitenbank, maar draait tijdens de
  // BRIEFING — dus vóórdat de klant één vraag beantwoord had. De antwoorden die
  // daarna binnenkwamen zouden daardoor nooit in de bank belanden: precies de
  // feiten die het meest waard zijn om te onthouden, want ze staan nergens op de
  // site. Vandaar hier alsnog, op het moment dat ze de kaart op gaan.
  //
  // Scope volgt dezelfde regel als overal: een 'merk'-antwoord geldt voor élke
  // analyse van deze klant, een 'analyse'-antwoord alleen voor deze. Ze merkbreed
  // maken zou elke andere analyse van dezelfde klant vervuilen.
  const antwoordHerkomst = new Map<string, { factRequestId: string | null; documentId: null }>(
    answeredFacts.map((a) => [a.fact.text, { factRequestId: a.requestId, documentId: null }]),
  );
  const bank = await syncBrandFacts(admin, {
    profileId: analysis.profile_id,
    analysisId,
    brandWide: answeredFacts.filter((a) => a.scope === "merk").map((a) => a.fact),
    topicScoped: answeredFacts.filter((a) => a.scope !== "merk").map((a) => a.fact),
    origins: antwoordHerkomst,
  });

  // Het id terugkoppelen op tekst, met dezelfde normalisatie als de rest van de
  // keten gebruikt — anders zou een verschil in spatie of hoofdletter het feit
  // opnieuw zonder identiteit op de kaart zetten.
  const idPerTekst = new Map(bank.facts.filter((f) => f.id).map((f) => [normalizeForQuote(f.text), f.id]));
  for (const antwoord of answeredFacts) {
    antwoord.id = idPerTekst.get(normalizeForQuote(antwoord.fact.text)) ?? null;
  }

  const facts = mergeAnsweredFacts(basis, answeredFacts);

  const proofCount = facts.filter((f) => f.allowed).length;

  return {
    analysis,
    facts,
    plan,
    profile,
    competitors,
    targets,
    distinctiveAnswers,
    brandName: profile?.brand_name ?? analysis.url,
    needsFactFinding: contentWebSearchEnabled && proofCount < minProofPointsForConcreteContent,
    baseInput: buildContentInput({
      analysis,
      profile,
      topicResearch,
      existingPage,
      competitors,
      rec: recommendation,
      targets,
      winningAnswers,
      sourceBlock: sources.block,
      competitorEdge,
      facts,
      plan,
      unansweredRequired,
    }),
  };
}

/** Zet de opgeslagen kolommen terug om naar de vorm die de prompts verwachten. */
function pieceFromRow(row: ContentPieceRow): ContentPiece {
  return {
    title: row.title,
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    bodyMarkdown: row.body_markdown ?? "",
    faq: (row.faq_json ?? []) as { q: string; a: string }[],
    schemaJsonLd: row.schema_jsonld ?? "",
    targetIntent: row.target_intent ?? "",
    cluster: row.cluster ?? "",
    // Bij een hervatte poging staan de beweringen al in de kolom (R5.3). Is de
    // rij van vóór R5.3, dan is dat een lege lijst — geen dekking bekend, wat
    // eerlijker is dan doen alsof alles gedekt was.
    claims: ((row.claims_json ?? []) as WrittenClaim[])
      .filter((c) => typeof c?.claim === "string" && typeof c?.factRef === "string")
      .map((c) => ({ claim: c.claim, factRef: c.factRef, quote: c.quote ?? "" })),
  };
}

/**
 * Legt vast welke gemiste vragen deze pagina moet winnen (optimalisatie.md 4.1).
 *
 * Delete-then-insert zodat een herschreven versie geen dubbele rijen oplevert.
 * Dit is de spil van de fase: zonder deze koppeling is achteraf niet te zeggen
 * of een pagina iets uithaalde, en kan fase 5 (effect meten) niet bestaan.
 */
async function saveTargets(
  admin: ReturnType<typeof createAdminClient>,
  contentPieceId: string,
  targets: RecommendationTarget[],
): Promise<void> {
  await admin.from("content_piece_targets").delete().eq("content_piece_id", contentPieceId);
  if (targets.length === 0) return;

  const rows = targets.map((t) => ({
    content_piece_id: contentPieceId,
    prompt_id: t.promptId,
    tracking_run_id: t.runId,
    prompt_text: t.text,
    cluster: t.cluster,
  }));
  const { error } = await admin.from("content_piece_targets").insert(rows);
  if (error) console.warn(`Doelvragen koppelen mislukt voor pagina ${contentPieceId}: ${error.message}`);
}

export interface DraftResult {
  contentPieceId: string;
  /** Moet er een herschrijfronde komen? Zo ja, met welke verbeterpunten? */
  needsRevise: boolean;
  issues: string[];
}

/** Wat `callStructured` voor een contentpagina teruggeeft, of wat we uit de DB hervatten. */
type DraftOutput = { parsed: ContentPiece; raw: unknown };

/**
 * Haalt een eerder weggeschreven draft terug in de vorm die de rest van deze
 * functie van een verse AI-aanroep verwacht. `null` als er nog geen tekst staat —
 * dan moet er alsnog geschreven worden.
 */
async function loadSavedDraft(
  admin: ReturnType<typeof createAdminClient>,
  pieceId: string,
): Promise<DraftOutput | null> {
  const { data } = await admin
    .from("content_pieces")
    .select("target_intent, cluster, body_markdown, meta_title, meta_description, schema_jsonld, faq_json, raw_json, claims_json")
    .eq("id", pieceId)
    .maybeSingle();

  if (!data?.body_markdown) return null;

  return {
    parsed: {
      title: "", // niet gebruikt: de app volgt altijd de titel uit het rapport
      targetIntent: data.target_intent ?? "",
      cluster: data.cluster ?? "",
      bodyMarkdown: data.body_markdown as string,
      metaTitle: data.meta_title ?? "",
      metaDescription: data.meta_description ?? "",
      schemaJsonLd: data.schema_jsonld ?? "",
      faq: (data.faq_json ?? []) as ContentPiece["faq"],
      // Meenemen bij hervatten: zonder dit zou een pagina die na het schrijven
      // strandde zijn traceerbaarheid kwijtraken en op dekking 0 uitkomen,
      // terwijl de tekst gewoon onderbouwd was.
      claims: (data.claims_json ?? []) as ContentPiece["claims"],
    } as ContentPiece,
    raw: data.raw_json,
  };
}

/**
 * De dekking, met een noemer die de CODE bepaalt (S3).
 *
 * ── WAT ER MIS WAS MET DE OUDE NOEMER ───────────────────────────────────────
 *
 * `sourceCoverage()` rekent na of de beweringen in `claims_json` standhouden
 * tegen de feitenkaart — en dat blijft precies zoals het was. Maar `claims_json`
 * wordt door het SCHRIJVENDE model zelf samengesteld: het bepaalt welke zinnen
 * als bewering tellen. Gemeten over de tien pagina's van 31 juli:
 *
 *   4.470 woorden · ~250 zinnen · 49 getagde beweringen
 *
 * Ongeveer één op de vijf zinnen werd gemeten, en juist in die andere vier
 * vijfde zaten beide fabricages die de contentronde vond: "Op valk.com …
 * reserveer direct online" (aantoonbaar onjuist, source_coverage bleef 100) en
 * de Fysi-Unique-openingszin die een bevestigd "nee" tegensprak. Niet-taggen was
 * een ontsnappingsroute.
 *
 * `detectClaimSentences()` bepaalt nu welke zinnen een bewering zijn (merknaam,
 * getal of toezegging) en een zin zonder onderbouwde claim telt als ongedekt.
 * Wat het model tagt is nog steeds nodig — het levert het F-nummer — maar het
 * bepaalt niet langer waarover afgerekend wordt.
 *
 * Eén functie voor de schrijf- én de herschrijfronde, zodat die twee niet elk
 * hun eigen variant krijgen.
 */
function assessClaims(piece: ContentPiece, facts: FactItem[], brandName: string) {
  const detected = detectClaimSentences(
    { bodyMarkdown: piece.bodyMarkdown, faq: piece.faq },
    brandName,
  );
  return detectedCoverage({ detected, claims: piece.claims ?? [], facts });
}

/** De kolommen die uit de SCHRIJFronde komen — los van het oordeel dat erna volgt. */
function buildDraftRow(args: {
  analysisId: string;
  reportId: string | null;
  recommendation: RecommendationInput;
  draft: DraftOutput;
  analysis: { url: string };
  action: ContentAction;
  version: number;
  supersedesId: string | null;
  /** De kaart waartegen de beweringen nagerekend worden (R5.3). */
  facts: FactItem[];
  brandName: string;
}) {
  const {
    analysisId,
    reportId,
    recommendation,
    draft,
    analysis,
    action,
    version,
    supersedesId,
    facts,
    brandName,
  } = args;

  const { coverage, unsupported } = assessClaims(draft.parsed, facts, brandName);

  return {
    analysis_id: analysisId,
    report_id: reportId,
    type: recommendation.type,
    // ⚠️ De titel van de AANBEVELING, niet die van het model. Het model mag zijn
    // eigen titel voorstellen (hij staat in raw_json), maar de hele app zoekt
    // deze pagina op de titel uit het rapport: de poll-route van de knop, de
    // "al gegenereerd"-markering op het rapportscherm, en de dedupe-sleutel van
    // de schrijftaak. Wijkt de opgeslagen titel daarvan af, dan vindt geen van
    // die drie de pagina nog — de knop blijft eeuwig "bezig", de teller loopt
    // niet terug, en elke volgende klik maakt een duplicaat met volle
    // premium-kosten. Eén bron van waarheid, en dat is het rapport.
    title: recommendation.title,
    target_intent: draft.parsed.targetIntent,
    cluster: draft.parsed.cluster,
    body_markdown: draft.parsed.bodyMarkdown,
    meta_title: draft.parsed.metaTitle,
    meta_description: draft.parsed.metaDescription,
    schema_jsonld: validateOrRebuildJsonLd(draft.parsed.schemaJsonLd, {
      type: recommendation.type,
      title: recommendation.title,
      description: draft.parsed.metaDescription,
      url: analysis.url,
      faq: draft.parsed.faq,
    }),
    faq_json: draft.parsed.faq as never,
    raw_json: draft.raw as never,
    // Traceerbaarheid (R5.3): per bewering het F-nummer, zodat bij een klacht
    // per zin aanwijsbaar is waar hij vandaan komt, en zodat bij een nieuw
    // antwoord van de klant bekend is welke pagina's daardoor beter kunnen.
    // Elke bewering krijgt het FEIT-ID mee naast het F-nummer (migratie 0036).
    // Het model levert alleen het nummer; de code zoekt het feit erbij op. Zonder
    // dat id verwijst `claims_json` naar een plek in een lijst, en is achteraf
    // niet te zeggen of F3 in versie 2 hetzelfde feit is als F3 in versie 1.
    claims_json: (draft.parsed.claims ?? []).map((c) => ({
      ...c,
      factId: resolveFactId(c.factRef, facts),
    })) as never,
    // De kaart zoals hij BIJ HET SCHRIJVEN gebruikt is — inclusief de antwoorden
    // die de klant ná de claim-audit gaf (R8.1). Daarmee klopt "bevriezen" weer
    // met wat er werkelijk gebeurd is, en resolven de F-nummers in `claims_json`
    // ook later nog naar het juiste feit.
    //
    // De AANBEVELING gaat mee en wordt niet overschreven: daar zitten de
    // doelvragen in (R4.1), en die staan nergens anders in de kolommen van
    // content_pieces. Zonder dit veld verloor elke geschreven pagina z'n
    // doelvragen-snapshot zodra de eerste versie werd weggeschreven.
    briefing_snapshot_json: {
      facts,
      recommendation,
      writtenAt: new Date().toISOString(),
    } as never,
    source_coverage: coverage,
    word_count: countWords(draft.parsed.bodyMarkdown),
    action,
    existing_url: recommendation.existingUrl ?? null,
    version,
    is_current: true,
    supersedes_id: supersedesId,
    revision_note: recommendation.revisionNote ?? null,
    // Onderbouwde beweringen die nergens naar wijzen zijn geen detail: dat is
    // precies de fout die R5 moet uitbannen, en de klant hoort hem te zien
    // staan in plaats van hem te moeten vinden.
    review_notes:
      unsupported.length > 0
        ? [
            `${unsupported.length} bewering(en) in deze tekst konden we niet herleiden tot een ` +
              `bevestigd feit: ${unsupported.slice(0, 3).map((c) => `"${c.claim}"`).join(", ")}` +
              `${unsupported.length > 3 ? ` (en nog ${unsupported.length - 3})` : ""}. ` +
              `Controleer of ze kloppen voordat je publiceert.`,
          ]
        : [],
    // Nog niet beoordeeld: de redactieronde zet dit zo meteen op z'n eindwaarde.
    // 'draft' is hier de eerlijke stand — de tekst bestaat, het oordeel nog niet.
    status: "draft" as const,
    needs_review: true,
  };
}

/**
 * Schrijft de zojuist geschreven pagina weg en geeft het id terug. Bevat de
 * versie-administratie: hervatten werkt de bestaande rij bij, een nieuwe versie
 * vlagt eerst de vorige af.
 */
async function persistDraft(
  admin: ReturnType<typeof createAdminClient>,
  row: ReturnType<typeof buildDraftRow>,
  opts: { resumeId: string | null; currentId: string | null },
): Promise<string> {
  if (opts.resumeId) {
    const { data, error } = await admin
      .from("content_pieces")
      .update(row)
      .eq("id", opts.resumeId)
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Opslaan van de gegenereerde pagina mislukt: ${error?.message ?? "geen rij"}`);
    }
    return data.id as string;
  }

  // De oude versie EERST afvlaggen, dan pas de nieuwe invoegen. Migratie 0023
  // dwingt af dat er maar één huidige versie per (analyse, titel) bestaat —
  // precies om de duplicaten te voorkomen die eerder ontstonden — en dus zou
  // invoegen-vóór-afvlaggen op die index botsen.
  //
  // Wat het oude commentaar hier terecht wilde beschermen (de klant mag nooit
  // zonder huidige pagina komen te staan als het invoegen stukloopt) doen we
  // nu expliciet: bij een mislukking zetten we de vlag terug.
  if (opts.currentId) {
    await admin.from("content_pieces").update({ is_current: false }).eq("id", opts.currentId);
  }

  const { data, error } = await admin.from("content_pieces").insert(row).select("id").single();
  if (error || !data) {
    if (opts.currentId) {
      await admin.from("content_pieces").update({ is_current: true }).eq("id", opts.currentId);
    }
    throw new Error(
      `Opslaan van de gegenereerde pagina mislukt: ${error?.message ?? "geen rij teruggekregen"}`,
    );
  }
  return data.id as string;
}

/**
 * ── STAP 1 — schrijven + beoordelen (optimalisatie.md 1.3) ──────────────────
 *
 * Contentgeneratie deed vier AI-aanroepen achter elkaar, waarvan twee een
 * volledige pagina schrijven. Dat past niet betrouwbaar in één taak: het is de
 * meest waarschijnlijke plek waar het op een tijdslimiet stukloopt, en dan is
 * het dure schrijfwerk wég.
 *
 * Daarom twee taken. Deze stap schrijft en beoordeelt, en zet het resultaat hoe
 * dan ook in de database — als 'draft' wanneer er nog een herschrijfronde volgt,
 * als 'ready' wanneer de eerste versie al door de poort komt.
 */
export async function draftContentPiece(args: {
  analysisId: string;
  userId: string;
  reportId: string | null;
  recommendation: RecommendationInput;
  /**
   * Opnieuw genereren, ook al staat er al een afgeronde versie (optimalisatie.md 4.7).
   * De bestaande versie blijft bewaard; dit wordt versie n+1.
   */
  regenerate?: boolean;
}): Promise<DraftResult> {
  const { analysisId, userId, reportId, recommendation, regenerate = false } = args;
  const admin = createAdminClient();

  // ── Bestaat er al een versie? (optimalisatie.md 4.7) ──────────────────────
  // De idempotentie zat op de titel en blokkeerde opnieuw genereren volledig:
  // een pagina met "check nodig" liep dood. Nu is de huidige versie het
  // aanknopingspunt — hervatten bij een draft, of een nieuwe versie beginnen.
  //
  // Via dezelfde helper als de inplanroute (lib/jobs/content-jobs.ts). Stond
  // hier als een eigen query ZONDER `order`/`limit`, terwijl de helper daar
  // juist voor bestaat: met meerdere versies onder één titel geeft
  // `maybeSingle()` een fout, en die werd hier niet uitgelezen — dan leek er
  // geen huidige versie te zijn en kwam er een duplicaat bij.
  const current = await currentPiece(admin, analysisId, recommendation.title);

  // 'briefing' telt hier, net als in lib/jobs/content-jobs.ts (planContentDraft),
  // als "nog niet geschreven": de rij bestaat al sinds de klant de pagina koos
  // (R5.1), maar er staat nog geen tekst in. Deze functie kende die uitzondering
  // niet — ontdekt tijdens de contentronde van 31 juli (status-doorontwikkeling.md
  // §5): alle 10 content_draft-taken meldden zich in <2 seconden als "klaar"
  // zonder ook maar één AI-aanroep te doen, omdat "briefing" hier gewoon als
  // "al af" gold. Erger: de pollroute (`GET .../content`) toont zo'n pagina
  // vervolgens als `ready: true` (status !== 'draft'), dus de klant zag "klaar"
  // terwijl er nooit geschreven is. Sinds R5.2 loopt IEDERE pagina via de
  // briefing, dus dit trof potentieel elke "Schrijf mijn pagina's"-klik.
  if (current && current.status !== "draft" && current.status !== "briefing" && !regenerate) {
    return { contentPieceId: current.id, needsRevise: false, issues: [] };
  }

  // ── In welke rij schrijven we? (R8.10) ────────────────────────────────────
  //
  // Drie gevallen, waar de code er eerder twee van kende:
  //
  //  1. Een 'draft' hervatten — een eerdere poging strandde ná het schrijven.
  //     Schrijf in DEZELFDE rij, versie ongewijzigd.
  //  2. Een verse 'briefing'-rij voor het eerst schrijven. Ook DEZELFDE rij: er
  //     is nog geen tekst om te bewaren, dus er valt niets te superseden.
  //  3. Een expliciete herstart bovenop een afgeronde versie (`regenerate`).
  //     Nieuwe rij, versie + 1, oude blijft als historie staan.
  //
  // Geval 2 viel eerder onder 3. Gevolg: de briefing-rij (versie 1, leeg) bleef
  // als niet-actuele spookrij achter naast de geschreven versie 2 — en
  // `fact_requests.content_piece_ids`, dat bij de briefing aan die eerste id
  // gekoppeld werd, wees daarna naar een rij die de klant nooit te zien krijgt.
  // Gemeten in de contentronde van 31 juli bij beide Fysi-Unique-pagina's.
  const hergebruikt =
    current && (current.status === "draft" || current.status === "briefing") && !regenerate;
  const resumeId = hergebruikt ? current!.id : null;
  const nextVersion = hergebruikt ? current!.version : (current?.version ?? 0) + 1;

  const ctx = await loadContentContext(admin, analysisId, userId, recommendation);
  const { analysis, targets, baseInput, brandName } = ctx;

  // ── Draft (premium model) ────────────────────────────────────────────────
  //
  // Staat er al een draft mét tekst, dan is deze ronde in een eerdere poging al
  // gedaan en hergebruiken we hem. Dit is de duurste aanroep van het hele
  // product — het premium model dat een volledige pagina schrijft — en die twee keer
  // betalen omdat de vórige poging ná het schrijven strandde, is puur verlies.
  const saved = resumeId ? await loadSavedDraft(admin, resumeId) : null;
  const draft =
    saved ??
    (await callStructured({
      model: MODELS.content,
      // Vangnet bij een dunne feitenlijst (4.6): dan mag hij marktfeiten opzoeken.
      system: ctx.needsFactFinding ? CONTENT_SYSTEM + FACT_FINDING_ADDENDUM : CONTENT_SYSTEM,
      user: baseInput,
      schema: ContentPiece,
      schemaName: "content_piece",
      webSearch: ctx.needsFactFinding,
      work: "content",
      meta: { kind: "content_draft", analysisId, profileId: analysis.profile_id },
    }));

  // ── Wegschrijven vóór de redactieronde ───────────────────────────────────
  //
  // Bewust hier en niet pas onderaan. Het schrijven en het beoordelen zijn twee
  // aanroepen achter elkaar; wordt de route tussendoor afgekapt, dan was de hele
  // dure schrijfronde weg en begon elke volgende poging opnieuw. Nu staat de
  // tekst op schijf zodra hij bestaat, en pikt de hervatting hierboven hem op.
  const draftRow = buildDraftRow({
    analysisId,
    reportId,
    recommendation,
    draft,
    analysis,
    action: recommendation.action ?? "nieuw",
    // Dezelfde kaart die het model kreeg (R5.3). Tegen een andere kaart
    // narekenen zou een dekking opleveren die niets zegt over deze tekst.
    facts: ctx.facts,
    brandName,
    version: nextVersion,
    supersedesId: resumeId ? null : (current?.id ?? null),
  });

  const pieceId = saved
    ? resumeId!
    : await persistDraft(admin, draftRow, { resumeId, currentId: current?.id ?? null });

  // ── Redactie/kritiek (goedkoop model) ────────────────────────────────────
  const critique = await callStructured({
    model: MODELS.quality,
    system: CRITIQUE_SYSTEM,
    user: buildCritiqueInput(draft.parsed, recommendation, targets, brandName),
    schema: Critique,
    schemaName: "content_critique",
    webSearch: false,
    work: "deterministic",
    meta: { kind: "content_critique", analysisId, profileId: analysis.profile_id },
  });

  const geo = critique.parsed.geo;
  // ── De deterministische poort (R8.2/R8.7/R8.8) ───────────────────────────
  //
  // Niet ná maar NAAST de zelfrapportage van het model, en zijn oordeel wint.
  // In de contentronde gaven de vijf zelfbeoordeelde booleans 100/100 op alle
  // tien de pagina's — óók op de pagina waarvan dezelfde aanroep in z'n eigen
  // verbeterpunten schreef dat de hoofdvraag niet beantwoord werd.
  const gate = checkContentGate({
    bodyMarkdown: draft.parsed.bodyMarkdown,
    faq: draft.parsed.faq ?? [],
    brandName,
    targetQuestions: targets.map((t) => t.text),
    distinctiveAnswers: ctx.distinctiveAnswers,
  });
  const geo_score = gate.score ?? geoScore(geo);

  // Zinnen die een uitspraak doen over het bedrijf zonder dat het model ze als
  // bewering aanmeldde (S3). Dat is de categorie waarin beide fabricages van
  // 31 juli vielen, en de herschrijfronde kan er iets mee: de zin staat erbij.
  const { untagged } = assessClaims(draft.parsed, ctx.facts, brandName);
  const brononderbouwing =
    untagged.length > 0
      ? [
          `${untagged.length} zin(nen) doen een uitspraak over het bedrijf zonder bron: ` +
            `${untagged.slice(0, 2).map((d) => `"${d.sentence}"`).join(", ")}` +
            `${untagged.length > 2 ? ` (en nog ${untagged.length - 2})` : ""}. ` +
            `Onderbouw ze met een F-nummer of haal ze weg.`,
        ]
      : [];

  // De GEO-tekortkomingen worden gewone verbeterpunten: de herschrijfronde weet
  // dan precies wát er moet veranderen in plaats van "beter maken".
  const issues = [
    ...critique.parsed.issues,
    ...geoIssues(geo),
    ...gate.issues,
    ...brononderbouwing,
  ];

  const needsRevise =
    !critique.parsed.followsRules ||
    critique.parsed.qualityScore < REVIEW_THRESHOLD ||
    geo_score < GEO_THRESHOLD ||
    issues.length > 0;

  // De tekst staat er al (hierboven weggeschreven); dit vult alleen het oordeel
  // aan en zet de eindstatus.
  const { error: critiqueError } = await admin
    .from("content_pieces")
    .update({
      critique_raw_json: [critique.raw] as never,
      quality_score: critique.parsed.qualityScore,
      geo_score,
      // Beide oordelen bewaren: `zelfrapportage` is wat het model ervan vond,
      // `deterministisch` is wat de code kon vaststellen. Uit elkaar houden
      // maakt achteraf zichtbaar wannéér die twee gingen afwijken — precies het
      // signaal dat deze poort nodig maakte.
      geo_json: { zelfrapportage: geo, deterministisch: gate.checks } as never,
      // Wat er nog aan schort, in gewone taal (4.13). Stond alleen in de ruwe
      // API-respons, en die laat je een klant niet lezen.
      review_notes: issues,
      // Komt de eerste versie al door de poort, dan is dit meteen de eindstand.
      needs_review: needsRevise ? true : !critique.parsed.followsRules,
      status: needsRevise ? ("draft" as const) : ("ready" as const),
    })
    .eq("id", pieceId);
  if (critiqueError) {
    throw new Error(`Opslaan van de beoordeling mislukt: ${critiqueError.message}`);
  }

  await saveTargets(admin, pieceId, targets);

  return { contentPieceId: pieceId, needsRevise, issues };
}

/**
 * ── STAP 2 — herschrijven + herbeoordelen ───────────────────────────────────
 *
 * Verwerkt de verbeterpunten uit stap 1 (en eventueel wat de klant zelf vroeg)
 * en bepaalt de eindscore. Faalt deze stap definitief, dan blijft de draft uit
 * stap 1 staan in plaats van dat het schrijfwerk verloren gaat.
 */
export async function reviseContentPiece(args: {
  analysisId: string;
  userId: string;
  contentPieceId: string;
  recommendation: RecommendationInput;
  issues: string[];
}): Promise<void> {
  const { analysisId, userId, contentPieceId, recommendation, issues } = args;
  const admin = createAdminClient();

  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select("*")
    .eq("id", contentPieceId)
    .maybeSingle();
  if (!pieceRow) throw new Error(`Contentpagina ${contentPieceId} niet gevonden.`);
  if (pieceRow.status !== "draft") return; // al afgerond — niets te doen (idempotent)

  const ctx = await loadContentContext(admin, analysisId, userId, recommendation);
  const { analysis, targets, baseInput, brandName } = ctx;
  const draftPiece = pieceFromRow(pieceRow as ContentPieceRow);

  const revised = await callStructured({
    model: MODELS.content,
    system: ctx.needsFactFinding ? CONTENT_SYSTEM + FACT_FINDING_ADDENDUM : CONTENT_SYSTEM,
    user: buildReviseInput(baseInput, draftPiece, issues, recommendation.revisionNote),
    schema: ContentPiece,
    schemaName: "content_piece",
    webSearch: ctx.needsFactFinding,
    work: "content",
    meta: { kind: "content_revise", analysisId, profileId: analysis.profile_id },
  });

  // Herbeoordelen geeft een eerlijke eindscore voor de kwaliteitspoort.
  const critique = await callStructured({
    model: MODELS.quality,
    system: CRITIQUE_SYSTEM,
    user: buildCritiqueInput(revised.parsed, recommendation, targets, brandName),
    schema: Critique,
    schemaName: "content_critique",
    webSearch: false,
    work: "deterministic",
    meta: { kind: "content_critique", analysisId, profileId: analysis.profile_id },
  });

  const final = revised.parsed;
  const geo = critique.parsed.geo;
  // Dezelfde deterministische poort als bij de eerste ronde (R8.2/R8.7/R8.8).
  // Juist hier telt hij: dit is de EINDSTAND — er volgt geen derde ronde, dus
  // wat hier doorheen komt gaat zo naar de klant.
  const gate = checkContentGate({
    bodyMarkdown: final.bodyMarkdown,
    faq: final.faq ?? [],
    brandName,
    targetQuestions: targets.map((t) => t.text),
    distinctiveAnswers: ctx.distinctiveAnswers,
  });
  const geo_score = gate.score ?? geoScore(geo);
  const needsReview =
    !critique.parsed.followsRules ||
    critique.parsed.qualityScore < REVIEW_THRESHOLD ||
    geo_score < GEO_THRESHOLD ||
    // Een openstaand punt uit de poort is een harde reden om na te kijken. De
    // redacteur beoordeelt de tekst; de poort beoordeelt of de pagina zijn
    // opdracht uitvoert — en dat laatste mag niet stil wegvallen.
    gate.issues.length > 0;

  // Ruwe kritiek van BEIDE rondes bewaren (§5: we bewaren alles).
  const previousCritiques = Array.isArray(pieceRow.critique_raw_json) ? pieceRow.critique_raw_json : [];

  // De bronnendekking opnieuw narekenen (R5.3). De herschrijfronde levert een
  // andere tekst op, dus ook andere beweringen — de dekking van de eerste
  // versie laten staan zou een cijfer over een tekst zijn die niet meer bestaat.
  const { coverage, unsupported, untagged } = assessClaims(final, ctx.facts, brandName);
  const bronNotitie = [
    ...(unsupported.length > 0
      ? [
          `${unsupported.length} bewering(en) konden we niet herleiden tot een bevestigd feit: ` +
            `${unsupported.slice(0, 3).map((c) => `"${c.claim}"`).join(", ")}` +
            `${unsupported.length > 3 ? ` (en nog ${unsupported.length - 3})` : ""}. ` +
            `Controleer of ze kloppen voordat je publiceert.`,
        ]
      : []),
    // De categorie waarin beide fabricages van 31 juli vielen (S3): een zin die
    // een uitspraak doet over het bedrijf zonder dat het model hem als bewering
    // aanmeldde. Vóór S3 was zo'n zin onzichtbaar voor élke controle; nu staat
    // hij letterlijk in de notitie die de klant leest.
    ...(untagged.length > 0
      ? [
          `${untagged.length} zin(nen) doen een uitspraak over het bedrijf zonder bron: ` +
            `${untagged.slice(0, 2).map((d) => `"${d.sentence}"`).join(", ")}` +
            `${untagged.length > 2 ? ` (en nog ${untagged.length - 2})` : ""}. ` +
            `Klopt dit? Zo niet, haal de zin weg.`,
        ]
      : []),
  ];

  await admin
    .from("content_pieces")
    .update({
      // `title` bewust NIET bijwerken: de titel uit het rapport is de sleutel
      // waarop de rest van de app deze pagina terugvindt (zie de toelichting bij
      // het invoegen in draftContentPiece). De herschrijfronde mag de inhoud
      // veranderen, niet waar de pagina heet.
      target_intent: final.targetIntent,
      cluster: final.cluster,
      body_markdown: final.bodyMarkdown,
      meta_title: final.metaTitle,
      meta_description: final.metaDescription,
      schema_jsonld: validateOrRebuildJsonLd(final.schemaJsonLd, {
        type: recommendation.type,
        title: recommendation.title,
        description: final.metaDescription,
        url: analysis.url,
        faq: final.faq,
      }),
      faq_json: final.faq as never,
      raw_json: revised.raw as never,
      claims_json: (final.claims ?? []).map((c) => ({
        ...c,
        factId: resolveFactId(c.factRef, ctx.facts),
      })) as never,
      source_coverage: coverage,
      critique_raw_json: [...previousCritiques, critique.raw] as never,
      quality_score: critique.parsed.qualityScore,
      geo_score,
      geo_json: { zelfrapportage: geo, deterministisch: gate.checks } as never,
      // Een onherleidbare bewering is óók een reden om na te kijken, ook als de
      // redacteur tevreden was: die beoordeelt de tekst, niet de herkomst.
      review_notes: [
        ...(needsReview ? [...critique.parsed.issues, ...geoIssues(geo)] : []),
        ...gate.issues,
        ...bronNotitie,
      ],
      // Een onherleidbare bewering telt, en sinds S3 ook een bewerende zin
      // zónder claim: dat is precies de vorm waarin de twee fabricages van
      // 31 juli aan elke controle ontsnapten.
      needs_review: needsReview || unsupported.length > 0 || untagged.length > 0,
      status: "ready" as const,
      word_count: countWords(final.bodyMarkdown),
    })
    .eq("id", contentPieceId);

  // De titel kan in de herschrijfronde veranderd zijn; de koppeling met de
  // doelvragen moet blijven staan.
  await saveTargets(admin, contentPieceId, targets);
}
