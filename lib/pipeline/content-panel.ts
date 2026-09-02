import "server-only";

/**
 * Het BEOORDELAARSPANEL onder een geschreven pagina
 * (docs/tasks/contentpijplijn-herontwerp.md A5).
 *
 * ── WAT ER MIS WAS MET ÉÉN BEOORDELAAR ──────────────────────────────────────
 *
 * Eén aanroep deed alles tegelijk: redactie, de harde regels, en de vijf
 * GEO-criteria. Op de goedkope tier met redeneerinspanning `none`, dus de
 * goedkoopste stand van het goedkoopste model, voor het oordeel over het enige
 * dat de klant letterlijk publiceert. In de contentronde van 31 juli gaven die
 * vijf zelfbeoordeelde booleans op alle tien de pagina's 100 van de 100, ook op
 * de pagina waarvan diezelfde aanroep in zijn eigen verbeterpunten schreef dat
 * de hoofdvraag niet beantwoord werd. Eén aanroep, twee tegenstrijdige
 * oordelen, en het cijfer koos de gunstige.
 *
 * ── VIER BEOORDELAARS, PARALLEL, ELK MET ÉÉN OPDRACHT ───────────────────────
 *
 *   1. REDACTIE      , het bestaande `Critique`-schema. Voedt `quality_score`,
 *                       dus dit schema blijft ongewijzigd: die reeks moet
 *                       vergelijkbaar blijven met de pagina's van vorige maand.
 *   2. FEITELIJKHEID , welke zinnen beweren iets over het bedrijf zonder dekking?
 *   3. CITEERBAARHEID, wordt elke deelvraag uit het contract beantwoord, en welke
 *                       vraag houdt de lezer over?
 *   4. VAKMANSCHAP   , is dit de pagina die een goede copywriter voor DEZE
 *                       ondernemer geschreven zou hebben? (migratie 0091)
 *
 * De derde was nieuw toen dit panel ontstond: het inhoudelijke oordeel over
 * volledigheid, naast de dekkingspoort die alleen op woordoverlap kan kijken.
 *
 * De vierde is er sinds het kwaliteitsraamwerk en meet als enige wat de opdracht
 * echt vraagt. Gemeten op productie haalden de pagina's van 1 september 86 tot
 * 98 procent contractdekking, dus alle secties stonden er, terwijl er over vier
 * pagina's samen vijf concrete getallen stonden tegenover tachtig zinnen die de
 * lezer opdroegen iets na te vragen. Elke bestaande controle vond dat in orde.
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * Alle vier op de goedkope tier, met redeneertijd (werk-soort `judging`).
 * Nagemeten op `ai_calls`, 2 september 2026: een redactionele beoordeling kost
 * $0,0013, een feitelijkheidsbeoordeling $0,0040, een citeerbaarheidsbeoordeling
 * $0,0039. De vierde is de zwaarste en komt naar verwachting rond $0,004 uit.
 * Samen ongeveer $0,013 tegenover $0,071 voor de schrijfaanroep ernaast, dus
 * circa achttien procent van de schrijfkosten en drie procent extra door de
 * vierde. Parallel, dus ze kosten samen evenveel tijd als de traagste.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { Critique } from "@/lib/schemas/critique";
import { FactualityVerdict, CitabilityVerdict } from "@/lib/schemas/content-panel";
import { CraftVerdict } from "@/lib/schemas/content-craft";
import { formatFactCard, type FactItem } from "@/lib/pipeline/factcard";
import type { ContentContract } from "@/lib/schemas/content-contract";
import type { ContentQualityProfile } from "@/lib/pipeline/quality-profile";

const REDACTIE_SYSTEM =
  "Je bent een strenge eindredacteur én GEO-specialist. Beoordeel de aangeleverde webpagina voor de " +
  "EIGEN site van een ondernemer. " +
  "REDACTIONEEL: scoor 0-100 op begint-met-het-directe-antwoord, on-brand, concreet-waar-mogelijk " +
  "(zonder verzinsels), scanbaar, en waardevol (geen AI-slop/vulzinnen). " +
  "HARDE REGELS: zet followsRules op false als de tekst een concurrent/ander bedrijf bij naam noemt, " +
  "feiten lijkt te verzinnen, of niet met het directe antwoord begint. " +
  "GEO: zou een AI-assistent deze pagina CITEREN? Beoordeel elk criterium streng en apart: " +
  "wordt de DOELVRAAG hierboven letterlijk beantwoord in de eerste twee zinnen; bevat elke sectie een zin " +
  "die LOSSTAAND te begrijpen is; wordt het bedrijf EXPLICIET bij naam genoemd in plaats van 'wij'/'ons'; " +
  "staan er concrete cijfers/jaartallen/feiten in; worden de logische vervolgvragen beantwoord. " +
  "Bij twijfel: false. Een te milde beoordeling levert een pagina op die niemand citeert. " +
  "Geef concrete, korte verbeterpunten en noem daarin ALTIJD de kop van de sectie waar het punt op " +
  "slaat, zodat er gericht gerepareerd kan worden. Antwoord in het Nederlands.";

const FEITEN_SYSTEM =
  "Je controleert of een webpagina alleen beweert wat onderbouwd is. Je beoordeelt de SCHRIJFSTIJL " +
  "niet en je herschrijft niets. " +
  "Je krijgt de FEITENKAART: de gesloten lijst van alles wat we met bron over dit bedrijf weten. " +
  "OPDRACHT: noem elke zin die een feitelijke uitspraak doet over DIT BEDRIJF (prijzen, cijfers, " +
  "voorwaarden, wat er wel of niet bij zit, openingstijden, keurmerken, aantallen, ervaring, " +
  "garanties) zonder dat een feit op de kaart hem dekt. Noem per zin de kop van de sectie waarin " +
  "hij staat. " +
  "Noem daarnaast onder overreachingClaims elke ALGEMENE uitleg die als belofte van dit bedrijf " +
  "gelezen kan worden. 'Een APK duurt meestal een uur' is algemene uitleg; 'bij ons duurt een APK " +
  "een uur' is een belofte en hoort op de kaart te staan. " +
  "HARDE REGELS: bij twijfel noem je de zin. Een terechte melding kost de ondernemer dertig " +
  "seconden nakijken; een gemiste verzonnen zin kost hem zijn geloofwaardigheid. Een zin die " +
  "letterlijk uit een feit op de kaart volgt, noem je NIET. Antwoord in het Nederlands.";

const CITEERBAAR_SYSTEM =
  "Je beoordeelt of een webpagina COMPLEET is. Je herschrijft niets. " +
  "Je krijgt het CONTRACT van de pagina: welke deelvraag elke sectie hoort te beantwoorden. " +
  "OPDRACHT: " +
  "(1) Loop elke deelvraag langs en zeg of de pagina hem echt beantwoordt. Zo ja: geef de zin die " +
  "het antwoord geeft. Een sectie die het onderwerp aanstipt zonder de vraag te beantwoorden telt " +
  "als NIET beantwoord. " +
  "(2) Noem de vragen die een lezer na deze pagina nog overhoudt. Dit is het belangrijkste deel van " +
  "je werk: hier komt uit of de pagina onaf aanvoelt. Denk aan wat iemand die dit leest daarna wil " +
  "weten en nergens vindt. " +
  "(3) Geef per verbeterpunt de kop van de sectie waar het op slaat. " +
  "HARDE REGEL: beoordeel alleen wat er staat. Verzin geen ontbrekende feiten over het bedrijf; als " +
  "een antwoord ontbreekt omdat het feit ontbreekt, is dat precies wat je moet melden. " +
  "Antwoord in het Nederlands.";

/**
 * De VIERDE beoordelaar: vakmanschap
 * (docs/tasks/contentkwaliteit-framework.md §4.5).
 *
 * De drie hierboven kijken naar juistheid, volledigheid en vorm. Wat geen van
 * drieën meet, is het verschil tussen een pagina die klopt en een pagina die een
 * goede copywriter geschreven zou hebben, en dat is precies waar dit werk over
 * gaat. Zie `lib/schemas/content-craft.ts` voor de zes dimensies en voor waarom
 * elk cijfer een aanwijsbare zin moet hebben.
 */
const VAKMANSCHAP_SYSTEM =
  "Je bent een ervaren copywriter die het werk van een collega beoordeelt. Je herschrijft niets en " +
  "je controleert geen feiten: dat doen anderen. " +
  "Je beoordeelt of dit de pagina is die een goede copywriter voor DEZE ondernemer geschreven zou " +
  "hebben. " +
  "SCOOR 0-100 op zes punten, elk met de LETTERLIJKE zin uit de pagina waarop je cijfer rust: " +
  "(1) SPECIFICITEIT: gaat deze pagina over dit bedrijf, of zou hij op de site van elke concurrent " +
  "kunnen staan? Dit is het zwaarste punt. Een pagina vol algemene uitleg over het onderwerp is " +
  "hier laag, ook als alles klopt. " +
  "(2) EXPERTISE: laat de tekst zien dat de schrijver het vak kent, of somt hij op wat iedereen weet? " +
  "(3) DIEPGANG: gaat de pagina verder dan de oppervlakte, of blijft hij bij het voor de hand liggende? " +
  "(4) ORIGINALITEIT: zegt de pagina iets eigens, of is het het bekende verhaal in andere woorden? " +
  "(5) TOON: klinkt de tekst zoals dit bedrijf klinkt, gemeten aan de meegegeven stijlvoorbeelden? " +
  "(6) OVERTUIGING: zet de pagina een lezer aan tot de volgende stap? " +
  "BEOORDEEL STRENG. Een pagina die nergens de mist in gaat maar ook nergens iets toevoegt, scoort " +
  "rond de 50 en niet rond de 80. Zinnen die de lezer opdragen iets na te vragen ('neem contact op " +
  "voor de actuele prijs') zijn een teken van een LAGE score op specificiteit: een copywriter met " +
  "genoeg informatie schrijft die zin niet. " +
  "ZEG DAARNA of je deze tekst zonder aanpassing naar een klant zou sturen, en wat je als EERSTE " +
  "zou veranderen, met de kop van de sectie waar dat op slaat. Eén punt, niet vijf: het punt dat " +
  "het meeste oplevert. " +
  "Antwoord in het Nederlands.";

export interface PanelInput {
  bodyMarkdown: string;
  faq: { q: string; a: string }[];
  title: string;
  brandName: string;
  targetQuestions: string[];
  contract: ContentContract | null;
  facts: FactItem[];
  analysisId: string;
  profileId: string | null;
  /**
   * Het kwaliteitsprofiel van dit contenttype (migratie 0091). Gaat naar de
   * vakmanschapsbeoordelaar, zodat hij weet welk soort pagina hij beoordeelt: een
   * FAQ die kort is, is een goede FAQ, en dezelfde lengte op een dienstenpagina
   * is een probleem.
   */
  profiel?: ContentQualityProfile | null;
  /** Voorbeeldzinnen van de site, voor het oordeel over de toon. */
  styleSamples?: string[];
}

export interface PanelResult {
  /**
   * ⚠️ Sinds migratie 0091 mag ook de redactionele beoordelaar `null` zijn.
   *
   * Hij moest slagen omdat `quality_score` en `followsRules` de enige poort
   * waren. Nu weegt het raamwerk twaalf dimensies uit vier bronnen, en een
   * gevallen beoordelaar verlaagt de ZEKERHEID in plaats van de hele pagina te
   * laten mislukken (scenario 11 van de opdracht: een evaluator die faalt mag
   * nooit als goedkeuring lezen).
   */
  critique: Critique | null;
  factuality: FactualityVerdict | null;
  citability: CitabilityVerdict | null;
  craft: CraftVerdict | null;
  /** Alle ruwe antwoorden, voor `critique_raw_json` (§5: we bewaren alles). */
  raw: unknown[];
  /** De bevindingen van alle vier samen, klaar voor de reparatiestap. */
  issues: string[];
  /** Hoeveel beoordelaars er gevraagd zijn en hoeveel er antwoord gaven. */
  beoordelaars: { geslaagd: number; gevraagd: number };
}

function paginaBlok(input: PanelInput): string {
  return [
    `Titel: ${input.title}`,
    `Bedrijfsnaam die expliciet genoemd moet worden: ${input.brandName}`,
    input.targetQuestions.length
      ? `DOELVRAGEN die deze pagina moet beantwoorden:\n- ${input.targetQuestions.join("\n- ")}`
      : "DOELVRAAG: niet opgegeven. Beoordeel dan of de pagina zijn eigen titel als vraag beantwoordt.",
    "",
    "Pagina-inhoud (Markdown):",
    input.bodyMarkdown,
    input.faq.length ? `\nFAQ:\n${input.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function contractBlok(contract: ContentContract | null): string {
  if (!contract) return "Er is geen contract meegegeven. Beoordeel dan op de doelvragen zelf.";
  return [
    // Sinds migratie 0091 draagt het contract ook het DOEL van de pagina. Zonder
    // dat kon de beoordelaar wel zien of elke deelvraag beantwoord werd, maar
    // niet of de pagina daarmee bereikte waarvoor hij bedoeld was.
    contract.pageObjective ? `Doel van deze pagina: ${contract.pageObjective}` : "",
    contract.targetAudience ? `Geschreven voor: ${contract.targetAudience}` : "",
    contract.avoid?.length ? `Wat er NIET op mag: ${contract.avoid.join("; ")}` : "",
    `Afgesproken opening: "${contract.openingAnswer}"`,
    `Deelvragen per sectie:`,
    ...contract.sections.map(
      (s) =>
        `- "${s.heading}": ${s.subQuestion}` +
        (s.successCriterion ? ` (geslaagd als: ${s.successCriterion})` : ""),
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Wat de vakmanschapsbeoordelaar naast de pagina zelf nodig heeft. */
function vakmanschapBlok(input: PanelInput): string {
  const profiel = input.profiel;
  return [
    profiel
      ? [
          `SOORT PAGINA: ${profiel.type}.`,
          `Doel: ${profiel.doel}.`,
          `Doelgroep: ${profiel.doelgroep}.`,
          `Waaraan een AI-assistent hem moet kunnen citeren: ${profiel.citeerbaarheid}.`,
        ].join("\n")
      : "",
    input.styleSamples?.length
      ? `STIJLVOORBEELDEN van de eigen site, hieraan meet je de toon:\n- ${input.styleSamples
          .slice(0, 5)
          .join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Laat de vier beoordelaars tegelijk kijken.
 *
 * ── ALLE VIER FALEN ZACHT ───────────────────────────────────────────────────
 *
 * Tot migratie 0091 moest de redactionele beoordelaar slagen: hij leverde
 * `quality_score` en `followsRules`, en zonder die twee kon de poort niets. Nu
 * weegt het raamwerk twaalf dimensies uit vier bronnen, en de deterministische
 * controles blijven daarnaast staan. Een gevallen beoordelaar verlaagt daarom de
 * ZEKERHEID (`quality_confidence`) in plaats van de hele pagina te laten
 * mislukken.
 *
 * Dat is geen versoepeling maar het tegendeel: eerder verdween een gevallen
 * feitelijkheidsbeoordelaar stilzwijgend en kon de pagina daarna op `ready`
 * eindigen alsof hij gekeurd was. Nu staat er een getal onder dat zegt hoeveel
 * van de keuring echt gedaan is (scenario 11 van de opdracht).
 */
export async function runPanel(input: PanelInput): Promise<PanelResult> {
  const pagina = paginaBlok(input);
  const meta = { analysisId: input.analysisId, profileId: input.profileId ?? undefined };

  const [redactie, feiten, citeerbaar, vakmanschap] = await Promise.all([
    callStructured({
      model: MODELS.quality,
      system: REDACTIE_SYSTEM,
      user: pagina,
      schema: Critique,
      schemaName: "content_critique",
      webSearch: false,
      work: "judging",
      meta: { kind: "content_critique", ...meta },
    }).catch((err) => {
      console.warn(`Redactionele beoordeling mislukt, de zekerheid daalt: ${String(err)}`);
      return null;
    }),
    callStructured({
      model: MODELS.quality,
      system: FEITEN_SYSTEM,
      user: `${formatFactCard(input.facts)}\n\n${pagina}`,
      schema: FactualityVerdict,
      schemaName: "content_factuality",
      webSearch: false,
      work: "judging",
      meta: { kind: "content_factuality", ...meta },
    }).catch((err) => {
      console.warn(`Feitelijkheidsbeoordeling mislukt, de pagina gaat door: ${String(err)}`);
      return null;
    }),
    callStructured({
      model: MODELS.quality,
      system: CITEERBAAR_SYSTEM,
      user: `${contractBlok(input.contract)}\n\n${pagina}`,
      schema: CitabilityVerdict,
      schemaName: "content_citability",
      webSearch: false,
      work: "judging",
      meta: { kind: "content_citability", ...meta },
    }).catch((err) => {
      console.warn(`Citeerbaarheidsbeoordeling mislukt, de pagina gaat door: ${String(err)}`);
      return null;
    }),
    callStructured({
      model: MODELS.quality,
      system: VAKMANSCHAP_SYSTEM,
      user: `${vakmanschapBlok(input)}\n\n${pagina}`,
      schema: CraftVerdict,
      schemaName: "content_craft",
      webSearch: false,
      work: "judging",
      meta: { kind: "content_craft", ...meta },
    }).catch((err) => {
      console.warn(`Vakmanschapsbeoordeling mislukt, de pagina gaat door: ${String(err)}`);
      return null;
    }),
  ]);

  const critique = redactie?.parsed ?? null;
  const factuality = feiten?.parsed ?? null;
  const citability = citeerbaar?.parsed ?? null;
  const craft = vakmanschap?.parsed ?? null;

  const issues = [
    ...(critique?.issues ?? []),
    ...(factuality?.unsupportedSentences ?? []).map(
      (z) =>
        `In de sectie "${z.section || "(onbekend)"}" staat een bewering zonder bevestigd feit: ` +
        `"${z.sentence}". ${z.why} Onderbouw hem met een F-nummer of haal hem weg.`,
    ),
    ...(factuality?.overreachingClaims ?? []).map(
      (z) => `Deze algemene uitleg leest als een belofte van dit bedrijf: "${z}". Formuleer hem algemeen.`,
    ),
    ...(citability?.subQuestionAnswers ?? [])
      .filter((a) => !a.answered)
      .map((a) => `Deze vraag wordt op de pagina niet beantwoord: "${a.subQuestion}". Beantwoord hem.`),
    ...(citability?.remainingReaderQuestions ?? []).map(
      (v) => `Een lezer houdt deze vraag over na het lezen: "${v}". Behandel hem, of leg uit waarom hij niet speelt.`,
    ),
    ...(citability?.issues ?? []).map((i) => `In de sectie "${i.section || "(onbekend)"}": ${i.issue}`),
    ...(craft?.firstThingToChange?.trim()
      ? [
          `Een copywriter zou dit als eerste veranderen${
            craft.firstThingSection?.trim() ? ` in de sectie "${craft.firstThingSection.trim()}"` : ""
          }: ${craft.firstThingToChange.trim()}`,
        ]
      : []),
  ];

  const geslaagd = [critique, factuality, citability, craft].filter(Boolean).length;

  return {
    critique,
    factuality,
    citability,
    craft,
    raw: [redactie?.raw ?? null, feiten?.raw ?? null, citeerbaar?.raw ?? null, vakmanschap?.raw ?? null].filter(
      Boolean,
    ),
    issues,
    beoordelaars: { geslaagd, gevraagd: 4 },
  };
}
