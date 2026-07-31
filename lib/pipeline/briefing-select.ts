/**
 * Van losse claim-audits naar één korte vragenlijst
 * (contentbriefing.md §3.3/§3.4, implementatieplan.md R5.1).
 *
 * Dit is de stap tussen "het model vond 30 onbewezen beweringen over 3 pagina's"
 * en "de klant krijgt 6 vragen te zien". Geen AI-aanroep: bundelen, ontdubbelen,
 * prioriteren en afkappen zijn regels, geen oordelen.
 *
 * ── DE HARDE GRENS VAN ACHT ─────────────────────────────────────────────────
 *
 * Maximaal 8 vragen per briefing. Wat er niet in past blijft open staan en komt
 * bij een volgende batch terug. Liever een korte lijst die iemand invult dan een
 * lange die iemand wegklikt — README.md §2. Dit is ook de reden dat de
 * prioritering ertoe doet: bij het afkappen moet het beste bovenaan staan.
 *
 * Bewust ZONDER `server-only`: pure selectielogica, testbaar in een kaal script.
 */
import { claimKey } from "@/lib/pipeline/factcard";
import type { AnswerType, QuestionKind } from "@/lib/schemas/claim-audit";
import type { ContentType } from "@/lib/types/database";

/** Harde bovengrens per briefing (contentbriefing.md §3.4). */
export const MAX_QUESTIONS = 8;

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
  /** Welke pagina's beter worden van het antwoord — de klant ziet dit. */
  contentPieceIds: string[];
  /** Alleen voor de sortering; wordt niet opgeslagen. */
  priority: number;
}

/**
 * Vaste slots per contenttype (contentbriefing.md §3.3).
 *
 * Bovenop de claim-audit, want deze gaten gaan niet over de INHOUD maar over de
 * BRUIKBAARHEID van de pagina — en juist die mist een claim-audit, omdat ze niet
 * uit de tekst volgen maar uit het paginatype.
 *
 * De `landing`-slots lossen een concrete fout op: de gegenereerde Tilburg-pagina
 * bevatte `"telephone": "+31 "` in de schema-markup. Een halve placeholder, en er
 * was geen enkele bron in het systeem waar dat nummer wél uit te halen was.
 */
const SLOTS: Record<ContentType, Omit<BriefingQuestion, "contentPieceIds" | "priority" | "claimKey">[]> = {
  landing: [
    {
      question: "Welk telefoonnummer en adres moeten er op deze pagina staan?",
      reason: "Zonder deze gegevens blijft de Google- en AI-vermelding van de pagina half leeg.",
      kind: "praktisch",
      answerType: "tekst_kort",
      options: [],
      suggestedAnswer: null,
      required: true,
      scope: "merk",
    },
    {
      question: "Naar welke pagina moet de knop 'Neem contact op' of 'Vraag aan' linken?",
      reason: "Anders wijst de knop nergens heen en verliest de pagina haar doel.",
      kind: "praktisch",
      answerType: "url",
      options: [],
      suggestedAnswer: null,
      required: true,
      scope: "merk",
    },
  ],
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

/** De vaste slots voor één gekozen pagina, als vragen met een claim-sleutel. */
export function slotQuestions(
  type: ContentType,
  contentPieceId: string,
  linkSuggestion: string | null = null,
): BriefingQuestion[] {
  const basis = [...(SLOTS[type] ?? []), linkSlot(linkSuggestion)];
  return basis.map((slot) => ({
    ...slot,
    claimKey: claimKey(`slot ${type} ${slot.question}`),
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
 * beste voorstel wint — een vraag mét voorstel is voor de klant veel goedkoper.
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

  return Array.from(samengevoegd.values())
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
    )
    .slice(0, max);
}

/**
 * De eerlijke telling onder de knop (contentbriefing.md §6).
 *
 * "3 van de 8 beantwoord — je pagina's worden geschreven zonder informatie over
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
