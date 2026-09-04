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
import type { ContentContract, ContractSection } from "@/lib/schemas/content-contract";
import { scoreTermOverlap, topicTerms } from "@/lib/pipeline/page-relevance";

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

/**
 * Wat er hoogstens in mag passen, en waar de pagina tegen afgezet wordt.
 *
 * Beide velden zijn optioneel en staan los van elkaar: `maxWoorden` weglaten
 * betekent niet snoeien, `existingText` weglaten betekent geen oordeel over een
 * bestaande pagina.
 */
export interface ContractGrenzen {
  /** De bovengrens van `TARGET_WORDS[type]`. */
  maxWoorden?: number;
  /**
   * De tekst van de bestaande pagina, als deze pagina er een verbetert (O4).
   * Zonder deze tekst kan het oordeel per sectie niet kloppen, en dan wordt het
   * ook niet bewaard.
   */
  existingText?: string | null;
}

/**
 * Hoeveel van de secties hoogstens 'kern' mogen zijn.
 *
 * Een derde, en dat is een vangnet en geen streefwaarde. Een kernsectie zonder
 * bewijs is een BLOKKADE (`quality-score.ts`), dus een model dat het label
 * royaal uitdeelt zet elke pagina dicht waarvan één sectie een feit mist. De
 * prompt vraagt om terughoudendheid; deze grens garandeert hem.
 *
 * Bij vier secties zijn er dus hoogstens één kern, bij negen drie. Er blijft
 * altijd minstens één kernsectie over: een pagina zonder enige kern heeft geen
 * doel meer waaraan de bewijsdekking te meten valt.
 */
export const KERN_AANDEEL_MAX = 1 / 3;

/**
 * Hoeveel woorden een sectie minstens waard moet zijn (optimalisatie 8 en 15).
 *
 * Tachtig. Daaronder is een sectie twee zinnen met een kop erboven, en een
 * pagina die daaruit bestaat is de "FAQ-dump" die de externe copywriter als
 * ondergrens 3 benoemde. Gemeten over de twaalf pagina's van 3 september 2026:
 * 850 tot 1650 woorden met tot 26 secties, dus ongeveer 55 woorden per sectie.
 *
 * Dit getal doet twee dingen tegelijk. Het begrenst hoeveel secties er in de
 * doellengte passen, en het is de ondergrens waaronder een richtlengte per
 * sectie niet meer serieus te nemen is. ⚠️ Gekozen op één ronde, net als de
 * zeven drempels van 3 september.
 */
export const MIN_WOORDEN_PER_SECTIE = 80;

const BELANGEN = ["kern", "ondersteunend", "optioneel"] as const;

const ROLLEN = [
  "probleem",
  "herkenning",
  "gevolg",
  "oplossing",
  "bewijs",
  "bezwaar",
  "zekerheid",
  "actie",
  "uitleg",
] as const;

/** De verhaalrol van een sectie, met terugval op "uitleg" (conventie 3). */
function geldigeRol(ruw: unknown): (typeof ROLLEN)[number] {
  return (ROLLEN as readonly string[]).includes(ruw as string)
    ? (ruw as (typeof ROLLEN)[number])
    : "uitleg";
}

/** Het belang van een sectie, met terugval naar 'ondersteunend' (conventie 3). */
function geldigBelang(ruw: unknown): "kern" | "ondersteunend" | "optioneel" {
  return (BELANGEN as readonly string[]).includes(ruw as string)
    ? (ruw as "kern" | "ondersteunend" | "optioneel")
    : "ondersteunend";
}

/**
 * Snoeit het aantal kernsecties terug tot `KERN_AANDEEL_MAX` van het totaal.
 *
 * Welke kernsecties blijven staan: de EERSTE, want een contract staat in
 * leesvolgorde en de secties die de doelvraag dragen staan vooraan. Alternatief
 * zou zijn om op woordlengte of op het aantal F-nummers te kiezen, en allebei
 * meten iets anders dan belang.
 *
 * Puur en geëxporteerd, zodat `scripts/test-unit.ts` de verhouding kan narekenen.
 */
export function begrensKernsecties<T extends { importance: "kern" | "ondersteunend" | "optioneel" }>(
  secties: T[],
): T[] {
  const kernen = secties.filter((s) => s.importance === "kern").length;
  const maximum = Math.max(1, Math.floor(secties.length * KERN_AANDEEL_MAX));
  if (kernen <= maximum) return secties;

  let over = maximum;
  return secties.map((s) => {
    if (s.importance !== "kern") return s;
    if (over > 0) {
      over--;
      return s;
    }
    return { ...s, importance: "ondersteunend" as const };
  });
}

export function normaliseerContract(
  contract: ContentContract,
  grenzen?: ContractGrenzen,
): ContentContract {
  const bestaand = (grenzen?.existingText ?? "").trim();

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
        // ── Het sectiebelang, met een vangnet (migratie 0091) ─────────────
        //
        // Het model bepaalt het belang; de code bewaakt de verhouding. Zonder
        // die bewaking is "kern" het label dat het model op alles plakt, en dan
        // blokkeert elke pagina waarvan één sectie geen feit heeft. De grens
        // staat in `KERN_AANDEEL_MAX` hieronder; wat erboven uitkomt zakt naar
        // 'ondersteunend', de sterkste eerst. Precies conventie 1: een
        // promptinstructie krijgt een deterministisch vangnet.
        importance: geldigBelang(s.importance),
        // De verhaalrol, met terugval op "uitleg" (optimalisatie 8). Een
        // contract van vóór 4 september 2026 heeft dit veld niet, en dan is
        // "uitleg" de eerlijke waarde: we weten niet welke stap deze sectie zet
        // (conventie 3).
        rol: geldigeRol(s.rol),
        successCriterion: (s.successCriterion ?? "").trim(),
        ...beoordeelSectie(s, bestaand),
      })),
    pageObjective: (contract.pageObjective ?? "").trim(),
    targetAudience: (contract.targetAudience ?? "").trim(),
    avoid: (contract.avoid ?? []).filter((a) => a?.trim()),
    faqQuestions: (contract.faqQuestions ?? []).filter((v) => v?.trim()),
  };

  return snoeiOpDoellengte(
    { ...opgeschoond, sections: begrensKernsecties(opgeschoond.sections) },
    grenzen,
  );
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
/**
 * Hoogstens één sectie roept op tot actie, en die staat achteraan
 * (optimalisatie 8).
 *
 * Dit is het deterministische deel van de verhaalboog. De volgorde van de rest
 * laten we met rust: die hangt van het onderwerp af, en een boog forceren zou
 * het contract slechter maken dan het model hem plande. Maar een oproep om te
 * bellen halverwege een uitleg is altijd fout, en twee van die oproepen op één
 * pagina ook. De eerste actiesectie verhuist naar achteren, de rest wordt
 * gewone uitleg.
 *
 * Puur en geëxporteerd, zodat de volgorde na te rekenen is.
 */
export function zetActieAchteraan<T extends { rol?: string }>(secties: T[]): T[] {
  const eerste = secties.findIndex((s) => s.rol === "actie");
  if (eerste === -1) return secties;

  const rest = secties
    .filter((_, i) => i !== eerste)
    .map((s) => (s.rol === "actie" ? { ...s, rol: "uitleg" as const } : s));
  return [...rest, secties[eerste]];
}

function snoeiOpDoellengte(
  contract: ContentContract,
  grenzen: ContractGrenzen | undefined,
): ContentContract {
  const faqQuestions = contract.faqQuestions.slice(0, MAX_FAQ);
  const maxWoorden = grenzen?.maxWoorden;
  if (maxWoorden === undefined || !Number.isFinite(maxWoorden) || maxWoorden <= 0) {
    return { ...contract, faqQuestions };
  }

  const ruimte = Math.max(maxWoorden - OPENING_WOORDEN, 0);

  // ── Hoeveel secties passen hier ZINVOL in? (optimalisatie 8) ─────────────
  //
  // De woordenbegroting hieronder hield al iets tegen, maar niet genoeg: met een
  // richtlengte van veertig woorden past een landingspagina van 700 woorden
  // zeventien secties, en dan is elke sectie twee zinnen. Dat is precies de
  // pagina waarvan de copywriter zei dat er waarschijnlijk geen verhaal in zit.
  const maxSecties = Math.max(MIN_SECTIES, Math.floor(ruimte / MIN_WOORDEN_PER_SECTIE));

  const behouden: typeof contract.sections = [];
  let som = 0;
  for (const sectie of contract.sections) {
    const past = som + sectie.targetWords <= ruimte;
    if (behouden.length >= maxSecties) break;
    if (!past && behouden.length >= MIN_SECTIES) break;
    behouden.push(sectie);
    som += sectie.targetWords;
  }

  return { ...contract, sections: zetActieAchteraan(behouden), faqQuestions };
}

/**
 * Het vangnet onder het sectie-oordeel (conventie 1).
 *
 * Twee regels, allebei deterministisch:
 *
 * 1. **Geen bestaande pagina, geen oordeel.** Dan staat er `niet_van_toepassing`
 *    en is `whatToChange` leeg, wat het model ook teruggaf. Een uitspraak over
 *    wat er "al op de pagina staat" terwijl die pagina niet bestaat, is precies
 *    de gefabriceerde bewering die conventie 3 verbiedt.
 *
 * 2. **"Staat er al" moet in de tekst terug te vinden zijn.** Zegt het model dat
 *    een sectie er volledig op staat, terwijl geen enkel kernwoord uit de kop en
 *    de deelvraag in de bestaande tekst voorkomt, dan kan dat niet kloppen en
 *    wordt het `ontbreekt`. Bewust deze kant op en niet andersom: een sectie ten
 *    onrechte als ontbrekend aanmerken kost de klant een alinea die hij al had,
 *    een sectie ten onrechte als aanwezig aanmerken kost hem het gat waarvoor hij
 *    betaalt.
 *
 * De grens ligt op nul: één term is genoeg om het model te geloven. Strenger
 * meten zou een pagina die hetzelfde in andere woorden zegt onterecht afkeuren,
 * en dat oordeel hoort bij het model, dat de tekst wél gelezen heeft.
 */
function beoordeelSectie(
  s: ContractSection,
  bestaand: string,
): Pick<ContractSection, "presentOnExisting" | "whatToChange"> {
  if (bestaand.length === 0) {
    return { presentOnExisting: "niet_van_toepassing", whatToChange: "" };
  }

  const gegeven = s.presentOnExisting ?? "ontbreekt";
  const wijziging = (s.whatToChange ?? "").trim();

  if (gegeven === "aanwezig") {
    const termen = topicTerms(s.heading, s.subQuestion);
    if (termen.length > 0 && scoreTermOverlap(bestaand, termen) === 0) {
      return {
        presentOnExisting: "ontbreekt",
        whatToChange:
          wijziging ||
          `Deze sectie staat nog niet op de pagina: voeg "${s.heading}" toe.`,
      };
    }
    return { presentOnExisting: "aanwezig", whatToChange: wijziging };
  }

  // Een sectie die ontbreekt of half aanwezig is zonder één woord uitleg is voor
  // de klant onbruikbaar. Dan schrijven we de zin zelf, uit de kop.
  return {
    presentOnExisting: gegeven === "niet_van_toepassing" ? "ontbreekt" : gegeven,
    whatToChange:
      wijziging ||
      (gegeven === "deels"
        ? `Vul "${s.heading}" aan, want de pagina beantwoordt nu niet volledig: ${s.subQuestion}`
        : `Voeg "${s.heading}" toe, want de pagina beantwoordt nu niet: ${s.subQuestion}`),
  };
}

/** Het contract als opdracht in de schrijfprompt. */
export function formatContract(contract: ContentContract | null): string {
  if (!contract || contract.sections.length === 0) return "";
  return [
    `DIT IS HET CONTRACT VOOR DEZE PAGINA. Alles wat hier staat MOET erop komen, in deze volgorde. ` +
      `Wij rekenen na of dat gelukt is, sectie voor sectie.`,
    // Doel, doelgroep en verboden onderwerpen (migratie 0091). De schrijver
    // kreeg de secties wel en het doel niet, dus hij kon een contract volmaken
    // zonder te weten waarvoor de pagina bedoeld was.
    contract.pageObjective?.trim() ? `DOEL VAN DEZE PAGINA: ${contract.pageObjective.trim()}` : "",
    contract.targetAudience?.trim() ? `GESCHREVEN VOOR: ${contract.targetAudience.trim()}` : "",
    contract.avoid?.length
      ? `WAT ER NIET OP MAG (dit is een verbod, geen voorkeur):\n- ${contract.avoid.join("\n- ")}`
      : "",
    contract.openingAnswer.trim()
      ? `OPENING (de eerste twee zinnen van de pagina, vóór elke inleiding): "${contract.openingAnswer}"`
      : `OPENING: beantwoord de doelvraag in de eerste twee zinnen, vóór elke inleiding, met wat je ` +
        `WEL kunt onderbouwen. Schrijf nooit dat iets niet bevestigd of niet vastgesteld is: laat het ` +
        `dan gewoon weg.`,
    ...contract.sections.map((s, i) =>
      [
        // Geen kastlijntje: `docs/schrijfstijl.md` §10 geldt ook voor prompts, en
        // een prompt die het teken zelf gebruikt is een slecht voorbeeld voor een
        // model dat het niet mag gebruiken.
        `SECTIE ${i + 1}, kop: "${s.heading}" (ongeveer ${s.targetWords} woorden)`,
        `  beantwoordt: ${s.subQuestion}`,
        // Het succescriterium is concreter dan de deelvraag en zegt waaraan de
        // sectie AFGEMETEN wordt; een herstelronde krijgt precies deze zin mee.
        s.successCriterion?.trim() ? `  geslaagd als: ${s.successCriterion.trim()}` : "",
        s.importance === "kern"
          ? `  DIT IS EEN KERNSECTIE: zonder deze sectie bereikt de pagina zijn doel niet`
          : "",
        s.mustCover.length ? `  moet behandelen: ${s.mustCover.join("; ")}` : "",
        s.factRefs.length ? `  gebruik hier deze feiten: ${s.factRefs.join(", ")}` : "",
        s.explainerTerms.length ? `  leg hier kort uit: ${s.explainerTerms.join(", ")}` : "",
        // Wat er op de bestaande pagina al staat (O4). De schrijver moet weten
        // waar hij moet aanvullen en waar hij moet overnemen: dat is het verschil
        // tussen verbeteren en overschrijven.
        s.presentOnExisting === "aanwezig"
          ? `  staat AL op de bestaande pagina: neem dit over in je eigen woorden en verlies de inhoud niet`
          : s.presentOnExisting === "deels"
            ? `  staat HALF op de bestaande pagina: ${s.whatToChange || "vul aan"}`
            : s.presentOnExisting === "ontbreekt"
              ? `  ONTBREEKT op de bestaande pagina: ${s.whatToChange || "voeg toe"}`
              : "",
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

/** Eén regel van de verbeterlijst die de klant leest. */
export interface Improvement {
  sectionId: string;
  heading: string;
  stand: "aanwezig" | "deels" | "ontbreekt";
  /** Wat er moet veranderen, in gewone taal. Leeg bij een sectie die er al staat. */
  wat: string;
}

/**
 * Wat er aan de bestaande pagina verandert (O5).
 *
 * Dit is het antwoord op de vraag die de klant tot 2 september 2026 niet kreeg:
 * hij zag een vervangende tekst en de instructie om zijn pagina te overschrijven,
 * en nergens stond wat er nu eigenlijk aan schortte. Puur afgeleid uit het
 * contract, dus er is geen vierde plek die kan verouderen.
 *
 * Secties die er al volledig op staan gaan mee in de lijst, met stand
 * `aanwezig`. Dat lijkt overbodig en is het niet: "deze zes dingen blijven zoals
 * ze zijn" is precies de geruststelling die iemand nodig heeft voordat hij zijn
 * eigen pagina overschrijft.
 */
export function describeImprovements(contract: ContentContract | null): Improvement[] {
  if (!contract) return [];
  return contract.sections
    .filter((s) => s.presentOnExisting && s.presentOnExisting !== "niet_van_toepassing")
    .map((s) => ({
      sectionId: s.id,
      heading: s.heading,
      stand: s.presentOnExisting as "aanwezig" | "deels" | "ontbreekt",
      wat: (s.whatToChange ?? "").trim(),
    }));
}

/**
 * De telling onder de lijst, in gewone taal.
 *
 * Met de noemer erbij, zoals overal in dit product: "4 van de 7 secties" zegt
 * hoe groot de ingreep is, "4 secties" niet.
 */
export function describeImprovementCount(improvements: Improvement[]): string {
  if (improvements.length === 0) return "";
  const nieuw = improvements.filter((i) => i.stand === "ontbreekt").length;
  const aangevuld = improvements.filter((i) => i.stand === "deels").length;
  const blijft = improvements.filter((i) => i.stand === "aanwezig").length;

  const delen: string[] = [];
  if (nieuw > 0) delen.push(nieuw === 1 ? "1 onderdeel is nieuw" : `${nieuw} onderdelen zijn nieuw`);
  if (aangevuld > 0) {
    delen.push(aangevuld === 1 ? "1 wordt aangevuld" : `${aangevuld} worden aangevuld`);
  }
  if (blijft > 0) {
    delen.push(blijft === 1 ? "1 blijft zoals hij is" : `${blijft} blijven zoals ze zijn`);
  }
  if (delen.length === 0) return "";

  const opsomming =
    delen.length === 1
      ? delen[0]
      : `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;
  return `Van de ${improvements.length} onderdelen op deze pagina: ${opsomming}.`;
}
