/**
 * Van losse claim-audits naar één korte vragenlijst
 * (contentbriefing.md §3.3/§3.4, implementatieplan.md R5.1).
 *
 * Dit is de stap tussen "het model vond 30 onbewezen beweringen over 3 pagina's"
 * en "de klant krijgt 6 vragen te zien". Geen AI-aanroep: bundelen, ontdubbelen,
 * prioriteren en afkappen zijn regels, geen oordelen.
 *
 * ── ACHT IS DE GRENS VOOR OPTIONEEL, NIET VOOR ONMISBAAR ────────────────────
 *
 * Tot 30 augustus 2026 was 8 een harde grens over ALLE vragen: kwamen er meer
 * dan acht `kern`-vragen (zonder dit feit mist de pagina zijn doel) uit de
 * audit, dan verdwenen de overtolligen stilzwijgend, vóórdat ze ooit als rij in
 * `fact_requests` bestonden. `content-final-gate.ts` telt open vragen om de
 * definitieve versie tegen te houden, maar kan een vraag die nooit is opgeslagen
 * natuurlijk niet zien: de eindpoort stond zo open op precies de pagina's met de
 * meeste gaten. Zie docs/optimalisatielab-orbit-engine.md, werkpakket A §3.3.
 *
 * Vanaf nu geldt de grens van 8 alleen voor de OPTIONELE vragen. Elke `kern`-
 * vraag gaat altijd mee, hoeveel er ook zijn: liever een klant die twaalf keer
 * "weet ik niet, sla over" klikt dan een pagina die zijn onmisbare feiten nooit
 * te zien kreeg. Liever een korte lijst die iemand invult dan een lange die
 * iemand wegklikt (README.md §2) blijft het uitgangspunt voor wat OPTIONEEL is.
 *
 * Bewust ZONDER `server-only`: pure selectielogica, testbaar in een kaal script.
 */
import { claimKey, topicKey } from "@/lib/pipeline/factcard";
import type { AnswerType, QuestionKind } from "@/lib/schemas/claim-audit";
import type { BusinessModel, ContentType } from "@/lib/types/database";

/** Harde bovengrens per briefing (contentbriefing.md §3.4). */
export const MAX_QUESTIONS = 8;

/**
 * Hoeveel plekken er gereserveerd zijn voor de vraagsoort `onderscheid` (S4).
 *
 * `contentbriefing.md` §5 noemt `onderscheid` "de meest waardevolle en de meest
 * verwaarloosde ... de enige informatie die principieel niet uit een crawl of
 * web_search te halen is". In productie is die vraagsoort **0 van de 62 keer**
 * gesteld, over zes profielen.
 *
 * Eén oorzaak is dat er geen mechanisme was dat hem produceerde (opgelost met
 * `positioningQuestion()`). De andere is de sortering op impact: een
 * positioneringsvraag is nooit `kern` en raakt zelden alle pagina's, dus hij
 * verliest structureel van een verificatievraag. Zonder reservering zou hij ook
 * mét mechanisme de acht nooit halen.
 *
 * Eén plek, niet meer: acht vragen waarvan er drie over positionering gaan is
 * een enquête, geen briefing.
 */
export const RESERVED_FOR_ONDERSCHEID = 1;

/** Eén vraag zoals hij uiteindelijk in `fact_requests` en op het scherm belandt. */
export interface BriefingQuestion {
  claimKey: string;
  question: string;
  reason: string;
  kind: QuestionKind;
  answerType: AnswerType;
  options: string[];
  suggestedAnswer: string | null;
  /** kern-claims zijn verplicht: zonder dit feit mist de pagina z'n doel. */
  required: boolean;
  scope: "merk" | "analyse" | "pagina";
  /** Welke pagina's beter worden van het antwoord, de klant ziet dit. */
  contentPieceIds: string[];
  /** Alleen voor de sortering; wordt niet opgeslagen. */
  priority: number;
  /**
   * Een vast slot (§3.3) in plaats van een vraag uit de claim-audit.
   *
   * Slots gaan niet over de INHOUD maar over de bruikbaarheid van de pagina, en
   * ze zijn met de hand geformuleerd. De grove onderwerp-ontdubbeling van R8.4
   * slaat ze daarom over: die is er om varianten van dezelfde
   * modelformulering samen te vegen, en zou twee bewust verschillende slots
   * kunnen laten samenvallen.
   */
  fixedSlot?: boolean;
}

/**
 * Vaste slots per contenttype (contentbriefing.md §3.3).
 *
 * Bovenop de claim-audit, want deze gaten gaan niet over de INHOUD maar over de
 * BRUIKBAARHEID van de pagina, en juist die mist een claim-audit, omdat ze niet
 * uit de tekst volgen maar uit het paginatype.
 *
 * De `landing`-slots lossen een concrete fout op: de gegenereerde Tilburg-pagina
 * bevatte `"telephone": "+31 "` in de schema-markup. Een halve placeholder, en er
 * was geen enkele bron in het systeem waar dat nummer wél uit te halen was.
 */
type SlotDefinitie = Omit<BriefingQuestion, "contentPieceIds" | "priority" | "claimKey">;

/** Apart benoemd omdat R8.5 ze vervangt bij een bedrijf zonder één vestiging. */
const ADRES_SLOT: SlotDefinitie = {
  question: "Welk telefoonnummer en adres moeten er op deze pagina staan?",
  reason: "Zonder deze gegevens blijft de Google- en AI-vermelding van de pagina half leeg.",
  kind: "praktisch",
  answerType: "tekst_kort",
  options: [],
  suggestedAnswer: null,
  required: true,
  scope: "merk",
};

const CONTACTKNOP_SLOT: SlotDefinitie = {
  question: "Naar welke pagina moet de knop 'Neem contact op' of 'Vraag aan' linken?",
  reason: "Anders wijst de knop nergens heen en verliest de pagina haar doel.",
  kind: "praktisch",
  answerType: "url",
  options: [],
  suggestedAnswer: null,
  required: true,
  scope: "merk",
};

const SLOTS: Record<ContentType, SlotDefinitie[]> = {
  landing: [ADRES_SLOT, CONTACTKNOP_SLOT],
  comparison: [
    {
      question: "Wanneer past jouw oplossing juist NIET bij iemand?",
      reason:
        "Een vergelijking zonder één eerlijk nadeel leest als reclame, en AI-assistenten " +
        "citeren reclame slechter dan een eerlijk verhaal.",
      kind: "grenzen",
      answerType: "tekst_kort",
      options: [],
      suggestedAnswer: null,
      required: true,
      scope: "analyse",
    },
  ],
  faq: [
    {
      question: "Zijn er antwoorden die je niet hard mag toezeggen, maar die 'in overleg' zijn?",
      reason: "Dan schrijven we ze als 'in overleg' in plaats van als belofte.",
      kind: "grenzen",
      answerType: "tekst_kort",
      options: [],
      suggestedAnswer: null,
      required: false,
      scope: "analyse",
    },
  ],
  article: [
    {
      question: "Heb je een eigen cijfer, voorbeeld of klantverhaal dat nog niet op je site staat?",
      reason:
        "Eén eigen cijfer maakt het verschil tussen een artikel dat overal had kunnen staan " +
        "en een artikel dat een AI-assistent aan jou koppelt.",
      kind: "bewijs",
      answerType: "tekst_lang",
      options: [],
      suggestedAnswer: null,
      required: false,
      scope: "analyse",
    },
  ],
};

/**
 * Het slot dat voor ELK type geldt: welke bestaande pagina hoort hierbij?
 *
 * Dit repareert de verzonnen `existingUrl` uit de Udenhout-run (`/udenhout.nl/skoda`,
 * een pad dat niet bestond) terwijl de echte pagina gewoon uit de topic research
 * bekend was. Met een voorstel erbij is het één klik.
 */
function linkSlot(suggestion: string | null): Omit<BriefingQuestion, "contentPieceIds" | "priority" | "claimKey"> {
  return {
    question: "Welke bestaande pagina op je site hoort hierbij?",
    reason: "Daar linken we naartoe, zodat de nieuwe pagina niet los in de lucht hangt.",
    kind: "praktisch",
    answerType: "url",
    options: [],
    suggestedAnswer: suggestion,
    required: false,
    scope: "pagina",
  };
}

/**
 * De vestigingsvragen vervangen door een contactvraag (R8.5).
 *
 * "Welk telefoonnummer en adres moeten er op deze pagina staan?" is de goede
 * vraag voor een fysiotherapiepraktijk en een onmogelijke vraag voor Bol
 * (43.300 verkooppartners), Coolblue (22 winkels) of Van der Valk (100+
 * zelfstandige hotels). In de contentronde van 31 juli werd hij bij alle drie
 * bewust overgeslagen, de enige eerlijke uitkomst van een vraag die niet
 * beantwoord kán worden.
 *
 * Een verplichte vraag zonder waar antwoord is niet neutraal: hij nodigt uit tot
 * invullen wat niet klopt, en dat is precies wat R5 moest voorkomen. Voor deze
 * modellen vragen we daarom naar het kanaal dat er wél is.
 */
const CONTACTKANAAL_SLOT: Omit<BriefingQuestion, "contentPieceIds" | "priority" | "claimKey"> = {
  question: "Naar welke pagina moeten klanten met vragen over dit onderwerp toe?",
  reason:
    "Jouw bedrijf heeft geen enkel adres of telefoonnummer dat op deze pagina hoort. " +
    "Een klantenservice- of contactpagina werkt hier beter.",
  kind: "praktisch",
  answerType: "url",
  options: [],
  suggestedAnswer: null,
  required: true,
  scope: "merk",
};

/** Bedrijfsmodellen zonder één vestiging: daar past de adres-/telefoonvraag niet. */
const ZONDER_VESTIGING = new Set<BusinessModel>(["retailer", "platform"]);

/**
 * De positioneringsvraag: wat kun jij wat je concurrent niet kan? (S4)
 *
 * ── WAAROM DIT EEN SLOT IS EN GEEN AI-AANROEP ───────────────────────────────
 *
 * Deze vraag kán niet uit de claim-audit komen, en dat is geen instelfout maar
 * een vormfout. Die audit vraagt: "welke bewering heeft deze pagina nodig, en
 * dekt de kaart hem?" Elk gat wordt een vraag. Maar "wat kun jij wat de
 * concurrent niet kan" is geen dekkingsgat, het is een positioneringsvraag, en
 * die past niet in het schema. Vandaar 0 van de 62.
 *
 * R8.8 controleert of het onderscheidende antwoord in de tekst terechtkwam. Die
 * controle draaide tot nu toe op een lege verzameling: er wás geen antwoord,
 * want er werd nooit naar gevraagd.
 *
 * Het materiaal ligt er wel. `competitor_breakdown.attributes_json` (R4.2) bevat
 * per concurrent de eigenschap waaróp hij genoemd wordt, mét een letterlijk
 * citaat: "Zitting manuele therapie: €60,00 per sessie", "biedt fysiotherapie
 * aan zonder dat een verwijsbrief nodig is". Dat is precies wat deze vraag
 * scherp maakt: we laten de ondernemer zien wát de AI nu over de ander zegt en
 * vragen wat zijn antwoord daarop is.
 *
 * Zónder namen. De aanroeper haalt die eruit (`redactCompetitors`), want de harde
 * regel dat klantcontent nooit een concurrent noemt geldt ook voor wat we de
 * klant voorschotelen.
 */
export function positioningQuestion(args: {
  /** Eigenschap + letterlijk bewijs, namen er al uit. Beste eerst. */
  evidence: { attribute: string; evidence: string }[];
  contentPieceIds: string[];
}): BriefingQuestion | null {
  const bewijs = args.evidence
    .filter((e) => e.evidence?.trim() && e.attribute?.trim())
    .slice(0, 3);
  if (bewijs.length === 0) return null;

  const opsomming = bewijs.map((e) => `"${e.evidence.trim()}" (${e.attribute})`).join(", ");

  return {
    // Vaste sleutel: deze vraag mag per merk maar één keer bestaan, ongeacht hoe
    // de concurrentargumenten deze periode luiden.
    claimKey: claimKey("slot onderscheid positionering"),
    question:
      "Een AI-assistent noemt bij deze vragen nu andere aanbieders, met argumenten als " +
      `${opsomming}. Wat kun jij wat zij niet kunnen? Noem één concreet ding: een aantal, ` +
      "een termijn, een dienst of een voorwaarde.",
    reason:
      "Dit is het enige wat een concurrent niet van je kan overschrijven, en het is het enige " +
      "dat wij niet van je website kunnen halen.",
    kind: "onderscheid",
    // Lang tekstveld: hier moet ruimte zijn om iets uit te leggen. Dit is de ene
    // vraag in de briefing waar formuleren méér waard is dan bevestigen.
    answerType: "tekst_lang",
    options: [],
    suggestedAnswer: null,
    // Bewust niet verplicht. Een ondernemer die hier niets op weet moet door
    // kunnen (README.md §2); de reservering zorgt dat hij de vraag in elk geval
    // te zien krijgt.
    required: false,
    scope: "merk",
    contentPieceIds: args.contentPieceIds,
    priority: 2,
    // Handgeschreven, net als de andere vaste slots: de onderwerp-ontdubbeling
    // van R8.4 moet hem met rust laten.
    fixedSlot: true,
  };
}

/** De vaste slots voor één gekozen pagina, als vragen met een claim-sleutel. */
export function slotQuestions(
  type: ContentType,
  contentPieceId: string,
  linkSuggestion: string | null = null,
  /** `null` = onbekend; dan blijft het gedrag exact zoals vóór R8.5. */
  businessModel: BusinessModel | null = null,
): BriefingQuestion[] {
  const perType = SLOTS[type] ?? [];
  const aangepast =
    businessModel && ZONDER_VESTIGING.has(businessModel)
      ? [
          ...perType.filter((slot) => slot !== ADRES_SLOT && slot !== CONTACTKNOP_SLOT),
          CONTACTKANAAL_SLOT,
        ]
      : perType;

  const basis = [...aangepast, linkSlot(linkSuggestion)];
  return basis.map((slot) => ({
    ...slot,
    claimKey: claimKey(`slot ${type} ${slot.question}`),
    fixedSlot: true,
    contentPieceIds: [contentPieceId],
    // Slots wegen als een ondersteunende claim: ze mogen de echte inhoudelijke
    // gaten niet van de lijst duwen, maar wel meeliften als er ruimte is.
    priority: slot.required ? 2 : 1,
  }));
}

/**
 * Ontdubbelen, prioriteren en afkappen.
 *
 * **Ontdubbelen** gebeurt op `claimKey`: dezelfde vraag vanuit drie pagina's
 * wordt één vraag die alle drie de pagina's voedt. De `contentPieceIds` van de
 * varianten worden samengevoegd, want dat is precies wat de klant te zien krijgt
 * ("verbetert: alle 3 de pagina's").
 *
 * **Verplicht wint van optioneel** bij het samenvoegen: is dezelfde vraag voor de
 * ene pagina kern en voor de andere ondersteunend, dan is hij verplicht. En het
 * beste voorstel wint, een vraag mét voorstel is voor de klant veel goedkoper.
 *
 * **Prioriteren** op `aantal pagina's × kern(2)/ondersteunend(1)`. Een vraag die
 * drie pagina's tegelijk redt hoort boven een detail van één pagina.
 *
 * **Filteren** tegen wat we al weten: elke vraag die de klant beantwoordt terwijl
 * het antwoord al in de kennisbank stond, is een geloofwaardigheidsverlies
 * (contentbriefing.md §4, regel 6).
 */
export function selectBriefingQuestions(args: {
  candidates: BriefingQuestion[];
  /** Claim-sleutels die al beantwoord zijn of al als open vraag klaarstaan. */
  alreadyKnown: Set<string>;
  max?: number;
}): BriefingQuestion[] {
  const { candidates, alreadyKnown, max = MAX_QUESTIONS } = args;

  const samengevoegd = new Map<string, BriefingQuestion>();
  for (const kandidaat of candidates) {
    if (!kandidaat.question.trim()) continue;
    if (alreadyKnown.has(kandidaat.claimKey)) continue;

    const bestaand = samengevoegd.get(kandidaat.claimKey);
    if (!bestaand) {
      samengevoegd.set(kandidaat.claimKey, { ...kandidaat });
      continue;
    }

    bestaand.contentPieceIds = Array.from(
      new Set([...bestaand.contentPieceIds, ...kandidaat.contentPieceIds]),
    );
    bestaand.required = bestaand.required || kandidaat.required;
    bestaand.suggestedAnswer = bestaand.suggestedAnswer ?? kandidaat.suggestedAnswer;
    if (bestaand.options.length === 0) bestaand.options = kandidaat.options;
    bestaand.priority = Math.max(bestaand.priority, kandidaat.priority);
  }

  const gesorteerd = dedupeOpOnderwerp(Array.from(samengevoegd.values()))
    .map((vraag) => ({
      ...vraag,
      priority: vraag.contentPieceIds.length * (vraag.required ? 2 : 1) * vraag.priority,
    }))
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        // Bij gelijke prioriteit eerst de verplichte, dan de vraag met een
        // voorstel (die kost de klant één klik in plaats van een formulering).
        Number(b.required) - Number(a.required) ||
        Number(Boolean(b.suggestedAnswer)) - Number(Boolean(a.suggestedAnswer)) ||
        a.question.localeCompare(b.question),
    );

  // ── Verplicht gaat altijd mee, `max` begrenst alleen het optionele deel ────
  //
  // Vóór 30 augustus 2026 sneed `slice(0, max)` dwars door verplichte vragen
  // heen zodra er meer dan `max` waren: die verdwenen zonder rij in
  // `fact_requests`, en dus zonder dat `content-final-gate.ts` ze ooit kon
  // tegenhouden. Nu telt de grens alleen voor de OPTIONELE vragen; hoeveel
  // `kern`-vragen er ook zijn, ze gaan allemaal mee.
  const optioneleRuimte = Math.max(0, max - gesorteerd.filter((v) => v.required).length);
  let optioneelGebruikt = 0;
  const gekozen = gesorteerd.filter((v) => {
    if (v.required) return true;
    if (optioneelGebruikt < optioneleRuimte) {
      optioneelGebruikt++;
      return true;
    }
    return false;
  });

  // ── De gereserveerde plek voor 'onderscheid' (S4) ─────────────────────────
  //
  // De sortering hierboven is `aantal pagina's × kern(2)`. Een positioneringsvraag
  // raakt zelden alle pagina's en is nooit `kern`, dus hij verliest structureel
  // van elke verificatievraag, ook nu er eindelijk een mechanisme is dat hem
  // produceert. Zonder deze reservering zou `onderscheid` 0 van de 62 blijven.
  //
  // Verplichte vragen worden hiervoor NOOIT geruild, dat zou de garantie
  // hierboven tegenspreken. Is de optionele ruimte al vol, dan wisselt de
  // zwakste al gekozen OPTIONELE vraag. Is er geen optionele ruimte (de
  // verplichte vragen vullen `max` al), dan komt de positioneringsvraag er in
  // de zeldzame gevallen bovenop: liever één vraag extra dan de enige vraag
  // die een concurrent niet kan overschrijven laten vervallen.
  if (!gekozen.some((v) => v.kind === "onderscheid")) {
    const kandidaat = gesorteerd.find((v) => v.kind === "onderscheid");
    if (kandidaat) {
      // Was er optionele ruimte, dan is die al vol met sterkere optionele
      // vragen (anders had de filter hierboven `kandidaat` al gekozen): ruil de
      // zwakste optionele vraag. Was er geen optionele ruimte, dan is er niets
      // te ruilen en komt de vraag erbovenop.
      const zwaksteOptioneleIndex = [...gekozen].reverse().findIndex((v) => !v.required);
      if (optioneleRuimte > 0 && zwaksteOptioneleIndex >= 0) {
        gekozen.splice(gekozen.length - 1 - zwaksteOptioneleIndex, RESERVED_FOR_ONDERSCHEID, kandidaat);
      } else {
        gekozen.push(kandidaat);
      }
    }
  }

  // ── Minstens één vraag per PAGINA (A8) ────────────────────────────────────
  //
  // De sortering hierboven is `aantal pagina's × kern(2) × prioriteit`. Een
  // vraag die vier pagina's dient wint daarmee altijd van een vraag die er één
  // scherp maakt, en bij een batch van tien pagina's kan een individuele pagina
  // dus nul vragen krijgen terwijl juist die de dunste feitendekking heeft. Dat
  // is dezelfde fout als de clusterbrede input die S9 en S10 repareerden, maar
  // dan in de vragenronde: de kans wordt clusterbreed gevonden, de PAGINA moet
  // itemspecifiek geschreven worden.
  //
  // Per pagina zonder gekozen vraag komt de best scorende kandidaat van díé
  // pagina er alsnog bij. Bewust erbovenop en niet in ruil: een vraag die vier
  // pagina's dient wegruilen om er één te helpen maakt het probleem groter, en
  // de klant ziet ze gegroepeerd per pagina.
  const gedekt = new Set(gekozen.flatMap((v) => v.contentPieceIds));
  const allePaginas = new Set(gesorteerd.flatMap((v) => v.contentPieceIds));
  for (const pieceId of allePaginas) {
    if (gedekt.has(pieceId)) continue;
    const kandidaat = gesorteerd.find(
      (v) => v.contentPieceIds.includes(pieceId) && !gekozen.includes(v),
    );
    if (!kandidaat) continue;
    gekozen.push(kandidaat);
    for (const id of kandidaat.contentPieceIds) gedekt.add(id);
  }

  return gekozen;
}

/**
 * Tweede ontdubbelronde, nu op ONDERWERP in plaats van op formulering (R8.4).
 *
 * `claimKey` vangt dezelfde vraag in andere woordvolgorde, maar niet dezelfde
 * vraag in een andere zinsbouw. Bij Fysi-Unique leverde dat 17 openstaande
 * vragen voor 2 pagina's op, waarvan er 4 over het persoonlijke behandelplan
 * gingen en 3 over preventieve nazorg, allemaal met een eigen `claimKey`.
 *
 * Met een grens van acht vragen is dat niet alleen vervelend maar schadelijk:
 * zeven van de acht plekken gingen op aan twee onderwerpen, en de vragen die er
 * daardoor uit vielen waren de vragen die de pagina concreet hadden gemaakt.
 *
 * Per onderwerp blijft de BESTE vraag staan: verplicht wint, dan de vraag met
 * een voorstel (één klik in plaats van een formulering), dan de kortste. Want
 * dat is de vraag die een klant binnen dertig seconden beantwoordt
 * (contentbriefing.md §4, regel 2).
 */
function dedupeOpOnderwerp(vragen: BriefingQuestion[]): BriefingQuestion[] {
  const perOnderwerp = new Map<string, BriefingQuestion>();
  const uitkomst: BriefingQuestion[] = [];

  for (const vraag of vragen) {
    // Vaste slots doen niet mee: die zijn met de hand geformuleerd en bewust
    // verschillend, ook als ze qua kernwoorden op elkaar lijken.
    const sleutel = vraag.fixedSlot ? "" : topicKey(vraag.question);

    // Onder de twee kernwoorden is de sleutel te grof om op te vertrouwen. Een
    // vraag als "Wat is de prijs?" houdt één woord over, en dan zou élke korte
    // vraag met dat woord erin samenvallen met een heel ander onderwerp. Bij
    // twijfel niet samenvoegen: een dubbele vraag kost de klant dertig seconden,
    // een ten onrechte verdwenen vraag kost hem het feit dat zijn pagina concreet
    // had gemaakt.
    if (!sleutel || sleutel.split(" ").length < 2) {
      uitkomst.push(vraag);
      continue;
    }

    const bestaand = perOnderwerp.get(sleutel);
    if (!bestaand) {
      perOnderwerp.set(sleutel, vraag);
      continue;
    }

    // De verliezer verdwijnt niet zonder sporen: zijn pagina's worden aan de
    // winnaar gekoppeld, want het antwoord voedt ze allebei.
    const winnaar = kiesBesteVraag(bestaand, vraag);
    const verliezer = winnaar === bestaand ? vraag : bestaand;
    winnaar.contentPieceIds = Array.from(
      new Set([...winnaar.contentPieceIds, ...verliezer.contentPieceIds]),
    );
    winnaar.required = winnaar.required || verliezer.required;
    winnaar.suggestedAnswer = winnaar.suggestedAnswer ?? verliezer.suggestedAnswer;
    if (winnaar.options.length === 0) winnaar.options = verliezer.options;
    winnaar.priority = Math.max(winnaar.priority, verliezer.priority);
    perOnderwerp.set(sleutel, winnaar);
  }

  return [...uitkomst, ...perOnderwerp.values()];
}

/** Welke van twee vragen over hetzelfde onderwerp de klant het beste kan stellen. */
function kiesBesteVraag(a: BriefingQuestion, b: BriefingQuestion): BriefingQuestion {
  if (a.required !== b.required) return a.required ? a : b;
  const aVoorstel = Boolean(a.suggestedAnswer?.trim());
  const bVoorstel = Boolean(b.suggestedAnswer?.trim());
  if (aVoorstel !== bVoorstel) return aVoorstel ? a : b;
  if (a.priority !== b.priority) return a.priority > b.priority ? a : b;
  return a.question.length <= b.question.length ? a : b;
}

/**
 * De eerlijke telling onder de knop (contentbriefing.md §6).
 *
 * "3 van de 8 beantwoord, je pagina's worden geschreven zonder informatie over
 * looptijd, pechhulp en vervangend vervoer." De klant kan altijd door, maar hij
 * ziet precies wat het overslaan hem kost. Dat is het verschil tussen een gate
 * en een muur.
 */
export function describeSkipped(open: { question: string; required: boolean }[]): string {
  if (open.length === 0) return "";
  const verplicht = open.filter((v) => v.required);
  const relevant = verplicht.length > 0 ? verplicht : open;
  const namen = relevant.slice(0, 3).map((v) => v.question.replace(/\?$/, ""));
  const rest = relevant.length - namen.length;
  const opsomming =
    namen.length === 1
      ? namen[0]
      : `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}`;
  return rest > 0
    ? `Je pagina's worden geschreven zonder antwoord op: ${opsomming} (en nog ${rest}).`
    : `Je pagina's worden geschreven zonder antwoord op: ${opsomming}.`;
}
