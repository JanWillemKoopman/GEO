/**
 * Het contentcontract opschonen en als opdracht formuleren
 * (docs/tasks/contentpijplijn-herontwerp.md A2).
 *
 * Bewust GESCHEIDEN van `content-contract.ts`, dat het contract laat opstellen
 * en daarom `server-only` is. Wat hier staat bepaalt de uitkomst (welke secties
 * overleven, en hoe de opdracht in de schrijfprompt terechtkomt) en hoort dus
 * puur en testbaar te zijn vanuit `scripts/test-unit.ts` (conventie 2). Zelfde
 * scheiding als tussen `factcard.ts` (puur) en `factbase.ts` (server-only).
 */
import type { ContentContract } from "@/lib/schemas/content-contract";

/**
 * Verwijzingen naar de feitenkaart, zoals `[F1, F2, F5]` of `(F3)`.
 *
 * Het contract mag ze bevatten, de PAGINA nooit: `openingAnswer` is de
 * letterlijke eerste zin van de tekst. In de ronde van 1 september 2026 stond
 * op de pagina van Gasservice Brabant: "Het bedrijf is 24/7 bereikbaar om te
 * bespreken of en wanneer installatie in jouw situatie mogelijk is.
 * [F1, F2, F5, F14]". Dat is interne nummering onder de naam van de klant.
 */
const FEITVERWIJZING = /[[(]\s*F\s*\d+(\s*[,;]\s*F?\s*\d+)*\s*[\])]/gi;

/**
 * Formuleringen die verraden dat de opening over ONZE bewijsvoering gaat in
 * plaats van over de vraag van de lezer.
 *
 * Dit is de duurste fout van de eerste echte contentronde. Twee van de vier
 * pagina's openden met een ontkenning van het eigen bedrijf: "Gasservice
 * Brabant kan daarom momenteel niet als aantoonbare specialist in Tilburg
 * worden aanbevolen" en "Daardoor kan Gasservice Brabant op basis van deze
 * informatie niet worden aangewezen als de gevraagde installateur in
 * Eindhoven". Beide keren was de vraag door de klant met "ja" beantwoord; het
 * antwoord bereikte het contract alleen niet (verbetering 1 en 2).
 *
 * Deze lijst is het vangnet daaronder (conventie 1): ook als er ooit weer een
 * gat in de feitenkaart zit, mag dat gat nooit de openingszin van de klant
 * worden. Een pagina die iets niet noemt is beter dan een pagina die zichzelf
 * afraadt.
 */
const META_OPENING = [
  /niet\s+(als\s+\S+\s+)?(bevestigd|vastgesteld|onderbouwd|vastgelegd|beschikbaar|gecontroleerd|aantoonbaar|aantoonbare)/i,
  // "kan daarom momenteel niet als aantoonbare specialist in Tilburg worden
  // aanbevolen": tussen "kan" en "worden aanbevolen" staat een halve zin, dus
  // de ontkenning en het werkwoord moeten los van elkaar gezocht worden.
  /\b(kan|kunnen|kon)\b[^.]{0,120}\bniet\b[^.]{0,120}\bworden\s+(aanbevolen|aangewezen|vastgesteld|bevestigd|genoemd)/i,
  /(deze|dit) (pagina|dossier) (kan|bevat|toont|maakt)/i,
  /moet (op deze pagina )?(nog )?(aantoonbaar|bevestigd|vastgesteld)/i,
  /(de )?feitenkaart/i,
  /in dit dossier/i,
  /(is|zijn) (er )?geen (gecontroleerde|bevestigde|concrete) /i,
  /beschikbare (bedrijfs)?informatie/i,
];

/** Haalt F-verwijzingen uit een zin en ruimt de spaties op die overblijven. */
export function stripFactRefs(tekst: string): string {
  return (tekst ?? "")
    .replace(FEITVERWIJZING, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Gaat deze opening over onze bewijsvoering in plaats van over de lezer?
 *
 * Puur, zodat `scripts/test-unit.ts` hem op de echte zinnen van 1 september
 * 2026 kan vastleggen.
 */
export function openingIsMeta(opening: string): boolean {
  const tekst = (opening ?? "").trim();
  if (!tekst) return false;
  return META_OPENING.some((patroon) => patroon.test(tekst));
}

/**
 * Het contract opschonen vóór opslag.
 *
 * Twee dingen die het model soms laat liggen en die de dekkingspoort scheef
 * zouden zetten: een sectie zonder id (dan kan een bevinding er niet naar
 * wijzen) en een richtlengte van 0 of onzinnig hoog. Het vangnet in code hoort
 * bij de instructie in de prompt (conventie 1).
 */
/**
 * Hoeveel woorden we vrijhouden voor de opening, buiten de secties om.
 *
 * De doellengte geldt voor `bodyMarkdown`, en daar hoort het directe antwoord
 * bovenaan ook bij. Zestig woorden is twee ruime zinnen.
 */
const OPENING_WOORDEN = 60;

/** Hoeveel secties een pagina minstens houdt, wat het snoeien ook zegt. */
const MIN_SECTIES = 3;

/** Hoeveel vragen er hoogstens in de FAQ komen. */
const MAX_FAQ = 8;

/** Wat er hoogstens in mag passen. Weglaten betekent: niet snoeien. */
export interface ContractGrenzen {
  /** De bovengrens van `TARGET_WORDS[type]`. */
  maxWoorden: number;
}

export function normaliseerContract(
  contract: ContentContract,
  grenzen?: ContractGrenzen,
): ContentContract {
  // ── De opening opschonen (verbetering 3) ─────────────────────────────────
  //
  // Twee dingen, in deze volgorde. Eerst de F-verwijzingen eruit, want die
  // horen nooit in tekst die gepubliceerd wordt. Daarna: gaat wat er overblijft
  // over onze eigen bewijsvoering, dan vervalt de opening helemaal en valt de
  // schrijver terug op regel 4 van `CONTENT_SYSTEM` ("beantwoord de doelvraag
  // in de eerste twee zinnen"). Die regel wordt deterministisch nagerekend door
  // `doelvraagInOpening` in `content-gate.ts`, dus de garantie blijft staan; we
  // dicteren de zin alleen niet meer.
  const schoneOpening = stripFactRefs(contract.openingAnswer ?? "");
  const opening = openingIsMeta(schoneOpening) ? "" : schoneOpening;

  const opgeschoond = {
    ...contract,
    openingAnswer: opening,
    sections: contract.sections
      .filter((s) => s.heading?.trim() && s.subQuestion?.trim())
      .map((s, i) => ({
        ...s,
        // Ook hier: de kop komt letterlijk op de pagina te staan.
        heading: stripFactRefs(s.heading),
        id: s.id?.trim() || `s${i + 1}`,
        targetWords: Number.isFinite(s.targetWords)
          ? Math.min(Math.max(Math.round(s.targetWords), 40), 400)
          : 120,
        factRefs: (s.factRefs ?? []).filter((f) => f?.trim()),
        explainerTerms: (s.explainerTerms ?? []).filter((t) => t?.trim()),
        mustCover: (s.mustCover ?? []).filter((m) => m?.trim()),
      })),
    faqQuestions: (contract.faqQuestions ?? []).filter((v) => v?.trim()),
  };

  return snoeiOpDoellengte(opgeschoond, grenzen);
}

/**
 * Het contract terugbrengen tot wat er in de doellengte past
 * (contentronde-gasservice-brabant-1-september-2026.md, verbetering 6).
 *
 * ── WAAROM DIT MOET ─────────────────────────────────────────────────────────
 *
 * De schrijfprompt zegt twee dingen die elkaar uitsluiten zodra het contract te
 * groot is. Regel 10 van `CONTENT_SYSTEM`: "Elke sectie komt erop ... je mag er
 * niets uit weglaten." En het lengteblok: "ga niet over het maximum heen om vol
 * te maken." Het model kan dan niet allebei, en kiest in de praktijk het
 * contract.
 *
 * Gemeten op 1 september 2026: de Tilburg-pagina is een landingspagina met een
 * doelbereik van 400 tot 700 woorden. Het contract vroeg 25 secties met samen
 * 1000 woorden plus 16 FAQ-vragen. De pagina werd 1331 woorden, en 7 van de 25
 * secties werden alsnog afgekeurd als "te dun". Alle vier de pagina's van die
 * ronde stonden boven hun maximum.
 *
 * Wat er afvalt, valt van ACHTEREN af: het contract staat in leesvolgorde, en de
 * eerste secties beantwoorden de doelvraag. Er blijven altijd minstens drie
 * secties staan, want een pagina met één sectie is geen pagina; loopt hij
 * daarmee alsnog over de doellengte, dan is dat een beter probleem dan een
 * pagina zonder inhoudsopgave.
 */
function snoeiOpDoellengte(
  contract: ContentContract,
  grenzen: ContractGrenzen | undefined,
): ContentContract {
  const faqQuestions = contract.faqQuestions.slice(0, MAX_FAQ);
  if (!grenzen || !Number.isFinite(grenzen.maxWoorden) || grenzen.maxWoorden <= 0) {
    return { ...contract, faqQuestions };
  }

  const ruimte = Math.max(grenzen.maxWoorden - OPENING_WOORDEN, 0);
  const behouden: typeof contract.sections = [];
  let som = 0;
  for (const sectie of contract.sections) {
    const past = som + sectie.targetWords <= ruimte;
    if (!past && behouden.length >= MIN_SECTIES) break;
    behouden.push(sectie);
    som += sectie.targetWords;
  }

  return { ...contract, sections: behouden, faqQuestions };
}

/** Het contract als opdracht in de schrijfprompt. */
export function formatContract(contract: ContentContract | null): string {
  if (!contract || contract.sections.length === 0) return "";
  return [
    `DIT IS HET CONTRACT VOOR DEZE PAGINA. Alles wat hier staat MOET erop komen, in deze volgorde. ` +
      `Wij rekenen na of dat gelukt is, sectie voor sectie.`,
    contract.openingAnswer.trim()
      ? `OPENING (de eerste twee zinnen van de pagina, vóór elke inleiding): "${contract.openingAnswer}"`
      : `OPENING: beantwoord de doelvraag in de eerste twee zinnen, vóór elke inleiding, met wat je ` +
        `WEL kunt onderbouwen. Schrijf nooit dat iets niet bevestigd of niet vastgesteld is: laat het ` +
        `dan gewoon weg.`,
    ...contract.sections.map((s, i) =>
      [
        `SECTIE ${i + 1} — kop: "${s.heading}" (ongeveer ${s.targetWords} woorden)`,
        `  beantwoordt: ${s.subQuestion}`,
        s.mustCover.length ? `  moet behandelen: ${s.mustCover.join("; ")}` : "",
        s.factRefs.length ? `  gebruik hier deze feiten: ${s.factRefs.join(", ")}` : "",
        s.explainerTerms.length ? `  leg hier kort uit: ${s.explainerTerms.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    contract.faqQuestions.length
      ? `FAQ (zet deze vragen in het veld faq, in de woorden van de lezer):\n- ${contract.faqQuestions.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
