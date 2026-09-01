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
 * ── DRIE BEOORDELAARS, PARALLEL, ELK MET ÉÉN OPDRACHT ───────────────────────
 *
 *   1. REDACTIE      , het bestaande `Critique`-schema. Voedt `quality_score`,
 *                       dus dit schema blijft ongewijzigd: die reeks moet
 *                       vergelijkbaar blijven met de pagina's van vorige maand.
 *   2. FEITELIJKHEID , welke zinnen beweren iets over het bedrijf zonder dekking?
 *   3. CITEERBAARHEID, wordt elke deelvraag uit het contract beantwoord, en welke
 *                       vraag houdt de lezer over?
 *
 * De derde is nieuw en is de reden dat dit panel bestaat: dat is het
 * inhoudelijke oordeel over volledigheid, naast de dekkingspoort die alleen op
 * woordoverlap kan kijken.
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * Alle drie op de goedkope tier, maar met redeneertijd (werk-soort `judging`).
 * Nagemeten op `ai_calls`: een contentbeoordeling kost daar ongeveer $0,0008.
 * Drie ervan mét redeneertijd blijven ruim onder een cent, tegenover $0,15 voor
 * de schrijfaanroep ernaast. Parallel, dus ze kosten samen ongeveer evenveel
 * tijd als de ene beoordeling van vroeger.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { Critique } from "@/lib/schemas/critique";
import { FactualityVerdict, CitabilityVerdict } from "@/lib/schemas/content-panel";
import { formatFactCard, type FactItem } from "@/lib/pipeline/factcard";
import type { ContentContract } from "@/lib/schemas/content-contract";

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
}

export interface PanelResult {
  critique: Critique;
  factuality: FactualityVerdict | null;
  citability: CitabilityVerdict | null;
  /** Alle ruwe antwoorden, voor `critique_raw_json` (§5: we bewaren alles). */
  raw: unknown[];
  /** De bevindingen van alle drie samen, klaar voor de reparatiestap. */
  issues: string[];
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
    `Afgesproken opening: "${contract.openingAnswer}"`,
    `Deelvragen per sectie:`,
    ...contract.sections.map((s) => `- "${s.heading}": ${s.subQuestion}`),
  ].join("\n");
}

/**
 * Laat de drie beoordelaars tegelijk kijken.
 *
 * De redactionele beoordeling is de enige die MOET slagen: hij levert
 * `quality_score` en `followsRules`, en zonder die twee kan de kwaliteitspoort
 * niets. De andere twee falen zacht naar `null`: dan mist de reparatiestap hun
 * bevindingen, maar de deterministische poorten draaien gewoon door en de
 * pagina gaat niet verloren. Dat is dezelfde keuze als bij `analyzeCitedSources`.
 */
export async function runPanel(input: PanelInput): Promise<PanelResult> {
  const pagina = paginaBlok(input);
  const meta = { analysisId: input.analysisId, profileId: input.profileId ?? undefined };

  const [redactie, feiten, citeerbaar] = await Promise.all([
    callStructured({
      model: MODELS.quality,
      system: REDACTIE_SYSTEM,
      user: pagina,
      schema: Critique,
      schemaName: "content_critique",
      webSearch: false,
      work: "judging",
      meta: { kind: "content_critique", ...meta },
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
  ]);

  const factuality = feiten?.parsed ?? null;
  const citability = citeerbaar?.parsed ?? null;

  const issues = [
    ...redactie.parsed.issues,
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
  ];

  return {
    critique: redactie.parsed,
    factuality,
    citability,
    raw: [redactie.raw, feiten?.raw ?? null, citeerbaar?.raw ?? null].filter(Boolean),
    issues,
  };
}
