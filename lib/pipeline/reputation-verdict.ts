import "server-only";

/**
 * De oordeelslaag van Mijn reputatie (§4.7 en §4.4).
 *
 * ── DE SPLITSING TUSSEN VRAGEN EN BEOORDELEN ────────────────────────────────
 *
 * Per antwoord uit blok A en B draait één goedkope, ONGEGRONDE beoordeling die
 * het antwoord omzet in een structuur. Dat is de tweede helft van hetzelfde
 * patroon als halte 3a en 3b van de meting: het model dat antwoordde,
 * beoordeelt zichzelf niet.
 *
 * De reden is niet zuiverheid maar geld. Het ruwe antwoord staat al in
 * `reputation_answers.answer_text` vóórdat deze laag draait, dus een mislukte
 * beoordeling mag opnieuw ZONDER dat de dure gegronde vraag opnieuw gesteld
 * wordt. Bij de meting is dat de belangrijkste kostenbescherming gebleken.
 *
 * ── ⚠️ ZES VANGNETTEN, ALLEMAAL IN CODE ─────────────────────────────────────
 *
 * Een promptinstructie is een intentie, code is een garantie (conventie 1). De
 * drie uit §4.7 en de drie uit §4.4 staan hier, niet in een prompt:
 *
 *   1. `noemt_merk === false` maakt de toonscore ALTIJD null. Een model dat over
 *      een ander bedrijf praat mag geen toon opleveren. Dit is exact de fout die
 *      bij `mention_role` optrad: structured output kiest bij twijfel de eerste
 *      waarde uit de lijst.
 *   2. `grondslag === "geen"` haalt het antwoord uit het merkcijfer, maar bewaart
 *      het wel (conventie 8). Zie de harde regel in §2.1.
 *   3. Elk citaat waarvan de tekst niet letterlijk in het opgeslagen antwoord
 *      voorkomt, gaat eruit. Dezelfde controle als `quote-check.ts` doet.
 *   4. Een partij die niet in de gevraagde set zat, wordt genegeerd (in
 *      `rank.ts`, vangnet 1).
 *   5. Ontbreekt de klant zelf in de volgorde, dan is er geen plaats en geen
 *      score. Niet "laatste" (in `rank.ts`, vangnet 2).
 *   6. Blijven er minder dan twee bekende partijen over, dan vervalt het
 *      criterium (in `rank.ts`, vangnet 3).
 *
 * De laatste drie staan in `lib/reputation/rank.ts` omdat ze pure rekenkunde
 * zijn en daar getest kunnen worden. Deze module roept ze aan.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ReputationVerdict, ReputationComparison } from "@/lib/schemas/reputation";
import { toneScore } from "@/lib/reputation/tone";
import { scoreCriterion, type CriterionOutcome } from "@/lib/reputation/rank";
import { cleanPoints } from "@/lib/reputation/points";
import type { ReputationGrounding } from "@/lib/types/database";

const VERDICT_SYSTEM =
  "Je beoordeelt een antwoord dat een AI-assistent gaf over een bedrijf. Je geeft GEEN eigen " +
  "mening over het bedrijf en je zoekt niets op: je leest alleen wat er staat en zet dat om in " +
  "een structuur. " +
  "Ga uitsluitend af op de tekst die je krijgt. Staat er niets over een onderwerp, vul dan niets " +
  "in in plaats van iets aannemelijks. " +
  "Weet je het niet, kies dan 'onbekend'. Dat is een geldig antwoord en veel beter dan een gok: " +
  "een gok wordt hier een cijfer op het scherm van een ondernemer. " +
  "⚠️ KIES 'gemengd' ZODRA ER LOF ÉN KRITIEK IN STAAT. Niet 'overwegend positief'. Dat laatste " +
  "is alleen juist als er nauwelijks iets tegenover de lof staat. Staan er twee of meer concrete " +
  "bezwaren in de tekst, dan is het beeld per definitie gemengd, ook al klinkt de tekst " +
  "vriendelijk en ook al zijn er meer pluspunten dan minpunten. Een tekst met lof en met drie " +
  "klachten over de kosten is gemengd, geen overwegend positief oordeel. " +
  "Pluspunten en minpunten neem je zo letterlijk mogelijk over uit de tekst, niet in je eigen " +
  "woorden samengevat. " +
  "⚠️ Een pluspunt of minpunt is een EIGENSCHAP van het bedrijf: waar het goed of slecht in is, " +
  "waar klanten het om prijzen of op aanspreken. Bijvoorbeeld 'persoonlijke begeleiding', " +
  "'het nakomen van afspraken', 'lange wachttijden', 'onduidelijke tarieven'. " +
  "Het is NOOIT een uitspraak over de reviews zelf. Zinnen als 'het beeld is niet uitsluitend " +
  "negatief', 'de algemene klantwaardering is goed' of 'daar staan ook positieve reviews " +
  "tegenover' zijn geen punten: die zeggen alleen dát mensen een mening hebben, en niet welke " +
  "eigenschap ze bedoelen. Laat ze weg. Houd elk punt kort, een woordgroep en geen zin. " +
  "Citaten neem je WOORDELIJK over; verzin er nooit een. " +
  "Antwoord in het Nederlands.";

export interface VerdictResult {
  tone: string;
  toneScore: number | null;
  pros: string[];
  cons: string[];
  grounding: ReputationGrounding;
  mentionsBrand: boolean;
  quotes: { tekst: string; bron_url: string }[];
  raw: unknown;
  costUsd: number;
  model: string;
}

/**
 * Beoordeelt één antwoord.
 *
 * `answerText` is wat er in de database staat, niet wat er net uit de API kwam.
 * Dat verschil is de idempotentie: draait deze functie na een herstart opnieuw,
 * dan werkt hij op precies dezelfde tekst.
 */
export async function judgeAnswer(args: {
  runId: string;
  profileId: string;
  brandName: string;
  question: string;
  answerText: string;
}): Promise<VerdictResult> {
  const r = await callStructured({
    model: MODELS.volume,
    system: VERDICT_SYSTEM,
    user: [
      `Bedrijf: ${args.brandName}`,
      `Gestelde vraag: ${args.question}`,
      "",
      "Het antwoord van de AI-assistent:",
      args.answerText,
    ].join("\n"),
    schema: ReputationVerdict,
    schemaName: "reputation_verdict",
    webSearch: false,
    work: "deterministic",
    meta: {
      kind: "reputation_verdict",
      profileId: args.profileId,
      reputationRunId: args.runId,
    },
  });

  const v = r.parsed;

  // ── Vangnet 1 ─────────────────────────────────────────────────────────────
  // Een antwoord dat niet over dit merk ging levert geen toon op. Punt. Ook niet
  // als het model overtuigd "positief" invulde: dan is hij positief over iemand
  // anders.
  const mentionsBrand = v.noemt_merk === true;

  // ── ⚠️ VANGNET 7: LOF MÉT KRITIEK IS GEMENGD, HOE VRIENDELIJK DE TEKST OOK IS
  //
  // Gemeten op Gasservice Brabant (23 augustus 2026), en dit is de scherpste
  // vlakheidsfout die dit product tot nu toe gemaakt heeft:
  //
  //   18 van de 19 beoordeelde antwoorden kregen "overwegend_positief"
  //   18 van die 18 bevatten kritiek
  //   17 van die 18 bevatten TWEE OF MEER concrete bezwaren
  //   gemiddeld 5,3 bezwaren per antwoord
  //   precies één antwoord kreeg "gemengd"
  //
  // Wat er onder dat label stond bij een GASINSTALLATIEBEDRIJF: "scheef
  // aangesloten rookgasafvoer", "geen controle van de gasdichtheid", en "een
  // conflict over het niet doorgaan van een afspraak bij een gemeld gaslek".
  //
  // Daarmee kwam de merkindex op +47 uit en de verdeeldheid op 5, dus het scherm
  // zou "overwegend positief, eenduidig beeld" hebben getoond aan een bedrijf
  // waarover AI veiligheidsklachten rapporteert. Dat is precies de uitkomst
  // waartegen §2.1 het hele onderdeel bewapent, alleen verplaatst: niet de
  // inhoud werd vlak maar het etiket erboven.
  //
  // De prompt is aangescherpt, maar dat is een intentie (conventie 1). Dit is de
  // garantie: een antwoord met twee of meer concrete bezwaren KAN niet positief
  // zijn. Het is gemengd, en dat is geen strengere lezing maar een letterlijke:
  // er staat lof en er staat kritiek.
  //
  // Twee en niet één, omdat één losse kanttekening in een verder lovend verhaal
  // wél als overwegend positief mag gelden. Bij twee is het een patroon.
  const MIN_BEZWAREN_VOOR_GEMENGD = 2;
  const bezwaren = schoonAantal(v.minpunten);
  const teVriendelijk =
    bezwaren >= MIN_BEZWAREN_VOOR_GEMENGD &&
    (v.toon === "positief" || v.toon === "overwegend_positief");

  const toonLabel = teVriendelijk ? "gemengd" : v.toon;
  const score = mentionsBrand ? toneScore(toonLabel) : null;

  // ── Vangnet 3 ─────────────────────────────────────────────────────────────
  // Een citaat dat niet letterlijk in het antwoord staat, is verzonnen. De klant
  // kan het straks nalezen op het scherm, dus een verzonnen citaat is niet
  // hinderlijk maar een leugen met een aanhalingsteken eromheen.
  const genormaliseerd = normaliseer(args.answerText);
  const quotes = v.citaten.filter(
    (c) => c.tekst.trim().length > 0 && genormaliseerd.includes(normaliseer(c.tekst)),
  );

  return {
    tone: mentionsBrand ? toonLabel : "onbekend",
    toneScore: score,
    // Ging het antwoord niet over dit merk, dan zijn ook de plus- en minpunten
    // van iemand anders. Weggooien in plaats van bewaren: ze zouden anders in
    // blok 6 van het scherm belanden als "wat AI aan jou koppelt".
    pros: mentionsBrand ? cleanPoints(v.pluspunten) : [],
    cons: mentionsBrand ? cleanPoints(v.minpunten) : [],
    // ── Vangnet 2 ───────────────────────────────────────────────────────────
    // De grondslag blijft staan zoals het model hem gaf, óók als hij `geen` is.
    // `score.ts` haalt hem dan uit het merkcijfer; hier weggooien zou het
    // verschil tussen "geen bewijs" en "niet beoordeeld" wissen.
    grounding: (v.grondslag ?? "onbekend") as ReputationGrounding,
    mentionsBrand,
    quotes,
    raw: r.raw,
    costUsd: r.costUsd,
    // `callStructured` geeft het model niet terug, want de aanroeper koos het
    // zelf. Vastleggen wat er gedraaid heeft is hier wél nuttig: wisselt de tier
    // ooit, dan moet een oude run nog steeds uit te leggen zijn.
    model: MODELS.volume,
  };
}

/**
 * Hoeveel BRUIKBARE bezwaren een antwoord bevat.
 *
 * Telt na dezelfde opschoning die de punten zelf ondergaan, want een lijst van
 * vijf waarvan er drie citaten of dooddoeners zijn, is geen vijf bezwaren.
 */
function schoonAantal(punten: string[]): number {
  return cleanPoints(punten).length;
}

/** Witruimte en hoofdletters weg, zodat een citaat niet op een spatie sneuvelt. */
function normaliseer(text: string): string {
  return text.toLowerCase().replace(/[\s ]+/g, " ").trim();
}


export interface ComparisonResult {
  outcomes: CriterionOutcome[];
  /** Wie het model op plaats 1 zette, per criterium. Voedt `order-bias.ts`. */
  firstPlaced: Map<string, string | null>;
  /** De reden en de bronnen per partij per criterium, voor `reputation_ranks`. */
  details: Map<string, { reason: string; sources: string[] }>;
  raw: unknown;
  costUsd: number;
  model: string;
}

/** Sleutel voor de twee kaarten hierboven: criterium plus partij. */
export function detailKey(criterion: string, party: string): string {
  return `${criterion}|${party.trim().toLowerCase()}`;
}

/**
 * Beoordeelt één vergelijkingsantwoord: van vrije tekst naar plaatsen.
 *
 * `askedParties` is de volgorde waarin de partijen de vraag IN gingen, dus de
 * uitkomst van `rotateParties()`. Die lijst is ook de filter: alles daarbuiten
 * valt af (vangnet 4). Modellen voegen graag een vijfde bedrijf toe, en dat is
 * geen antwoord op de vraag maar een verstoring van de noemer.
 */
export async function judgeComparison(args: {
  runId: string;
  profileId: string;
  askedParties: string[];
  ownParty: string;
  question: string;
  answerText: string;
}): Promise<ComparisonResult> {
  const r = await callStructured({
    model: MODELS.volume,
    system:
      "Je leest een antwoord waarin een AI-assistent een aantal bedrijven met elkaar vergeleek, " +
      "en zet dat om in een structuur. Je geeft GEEN eigen oordeel over de bedrijven en je zoekt " +
      "niets op: je leest alleen terug wat er staat. " +
      "Zet per onderwerp de bedrijven op de volgorde die in de tekst staat. " +
      "Zegt de tekst over een bedrijf dat het onbekend is, of komt het bedrijf bij dat onderwerp " +
      "niet voor, zet dan `ken_ik` op false en `plaats` op 0. Dat is een geldig antwoord en het " +
      "is beter dan een gok. Voeg NOOIT een bedrijf toe dat niet in de tekst staat. " +
      "Antwoord in het Nederlands.",
    user: [
      `De vergeleken bedrijven, in de volgorde waarin ze gevraagd zijn: ${args.askedParties.join(", ")}`,
      `Gestelde vraag: ${args.question}`,
      "",
      "Het antwoord van de AI-assistent:",
      args.answerText,
    ].join("\n"),
    schema: ReputationComparison,
    schemaName: "reputation_comparison",
    webSearch: false,
    work: "deterministic",
    meta: {
      kind: "reputation_compare_verdict",
      profileId: args.profileId,
      reputationRunId: args.runId,
    },
  });

  const outcomes: CriterionOutcome[] = [];
  const firstPlaced = new Map<string, string | null>();
  const details = new Map<string, { reason: string; sources: string[] }>();

  // Ontdubbelen op criterium: geeft het model hetzelfde onderwerp twee keer,
  // dan telt de eerste. Twee volgordes voor hetzelfde criterium zijn geen
  // extra meting maar een tegenspraak, en de tweede kiezen is willekeur.
  const gezien = new Set<string>();

  for (const blok of r.parsed.criteria) {
    if (gezien.has(blok.criterium)) continue;
    gezien.add(blok.criterium);

    for (const p of blok.partijen) {
      details.set(detailKey(blok.criterium, p.naam), {
        reason: p.reden?.trim() ?? "",
        sources: (p.bronnen ?? []).filter((s) => s.trim().length > 0),
      });
    }

    // Vangnetten 4, 5 en 6 zitten in `scoreCriterion`, waar ze getest worden.
    const uitkomst = scoreCriterion({
      criterion: blok.criterium,
      askedParties: args.askedParties,
      ownParty: args.ownParty,
      raw: blok.partijen.map((p) => ({
        party: p.naam,
        known: p.ken_ik === true && p.plaats >= 1,
        position: p.plaats >= 1 ? Math.trunc(p.plaats) : null,
      })),
    });
    outcomes.push(uitkomst);

    // Wie kwam er als eerste uit? Dat is de helft van de meting van het
    // volgorde-effect; de andere helft is wie er als eerste in ging, en die
    // staat in `reputation_answers.party_order`.
    const eerste =
      uitkomst.placements.find((p) => p.adjusted === 1)?.party ?? null;
    firstPlaced.set(blok.criterium, eerste);
  }

  return {
    outcomes,
    firstPlaced,
    details,
    raw: r.raw,
    costUsd: r.costUsd,
    model: MODELS.volume,
  };
}
