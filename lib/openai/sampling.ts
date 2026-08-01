/**
 * Van SOORT WERK naar de parameters die daadwerkelijk de deur uit gaan.
 *
 * Bewust een pure module (geen `server-only`): de vertaalregels bepalen wat elke
 * AI-aanroep in de app kost en hoe reproduceerbaar hij is, en dat hoort
 * testbaar te zijn vanuit `scripts/test-unit.ts` (code-conventie 2).
 *
 * WAAROM DIT BESTAAT. Tot en met de GPT-4.1-familie was `temperature` overal
 * toegestaan en was dat de enige knop die we hadden. De GPT-5-familie is een
 * redeneerfamilie: die accepteert `temperature` alleen zolang er niet geredeneerd
 * wordt (`reasoning.effort: "none"`), en heeft er een tweede, sterkere knop bij
 * gekregen — de redeneerinspanning zelf. Zonder vertaallaag zou elke aanroep in
 * de pijplijn óf een 400 opleveren (temperatuur bij effort > none) óf stilletjes
 * op de standaardinstelling draaien (effort `medium`), wat de mention-classificatie
 * drie keer zo traag en duur maakt zonder dat hij er beter van wordt.
 *
 * Eén tabel, één functie, 21 aanroepplekken die alleen nog zeggen wat voor werk
 * het is. Zie ook lib/openai/models.ts voor de modelkeuze zelf.
 */
import { TEMPERATURES } from "@/lib/openai/models";

/**
 * Soort werk. Dit is wat een aanroepplek opgeeft; alles hieronder is afgeleid.
 * De eerste vier komen één-op-één uit `TEMPERATURES`; `simulation` is de
 * meting zelf (halte 3a), die bewust op de standaardinstellingen van het model
 * draait.
 */
export type WorkKind = "deterministic" | "analytical" | "creative" | "content" | "simulation";

/**
 * Redeneerinspanning zoals GPT-5.6 die kent: `none`, `low`, `medium`, `high`,
 * `xhigh`, `max`. Weglaten = de modelstandaard, en die is `medium`.
 */
export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

interface WorkProfile {
  /** Temperatuur zoals de app hem bedoelt. `undefined` = modelstandaard. */
  temperature?: number;
  /** Redeneerinspanning op een redeneermodel. `undefined` = modelstandaard (`medium`). */
  effort?: ReasoningEffort;
}

/**
 * De vertaaltabel. Per soort werk: hoeveel mag het model zwerven, en hoeveel mag
 * het nadenken. De keuze per regel is niet willekeurig:
 *
 * - `deterministic` — classificeren en beoordelen (mention-detectie 30×/week,
 *   claim-audit, content-kritiek). Reproduceerbaarheid gaat hier vóór alles: één
 *   verschoven oordeel verschuift direct de zichtbaarheidsscore. Effort `none`
 *   houdt het snel en goedkoop (zoals de oude nano-tier) én is de enige stand
 *   waarin `temperature: 0` nog is toegestaan.
 * - `analytical` — onderzoek, kalibratie, gap-analyse, rapport. Hier betaalt
 *   redeneren zich wél uit. `low` en niet `medium`: de client-timeout staat op
 *   100 s (lib/openai/client.ts) en deze stappen draaien deels mét web_search,
 *   die zelf al 20–40 s kost.
 * - `creative` — promptgeneratie. Variatie is hier het product; redeneren maakt
 *   de tien vragen per funnelfase juist weer op elkaar lijkend. Effort `none`,
 *   temperatuur hoog.
 * - `content` — het betaalde product, en de enige stap op het duurste model.
 *   Expliciet `medium` en niet `high`: één schrijfcall moet binnen de 100 s van
 *   `TIMEOUT_MS` (lib/openai/client.ts) passen, en een volledige pagina op de
 *   Sol-tier mét zware redeneertijd zit daar tegenaan. Een timeout kost hier het
 *   dubbele van gewoon falen — de taak wordt opnieuw gedraaid en de duurste
 *   tokens van de app zijn dan twee keer betaald. `high` is de knop om aan te
 *   draaien zodra iemand de werkelijke doorlooptijd op productie heeft nagemeten
 *   en de tijdsconstanten in lib/jobs/worker.ts daarop zijn bijgesteld.
 *   De temperatuur vervalt: op effort > none accepteert de API hem niet, en
 *   natuurlijke variatie komt bij een redeneermodel uit het redeneren zelf. Dat
 *   maakt de tekst niet deterministisch — de bewaking erop is dat ook nooit
 *   geweest: `content-gate.ts` keurt de uitkomst, niet de instelling.
 * - `simulation` — halte 3a. Niets meegeven, in beide kolommen. We willen weten
 *   wat een AI-assistent een echte gebruiker antwoordt, en die draait ook op de
 *   standaardinstellingen. Een eigen temperatuur of effort zou de meting juist
 *   onrealistisch maken.
 */
const WORK: Record<WorkKind, WorkProfile> = {
  deterministic: { temperature: TEMPERATURES.deterministic, effort: "none" },
  analytical: { temperature: TEMPERATURES.analytical, effort: "low" },
  creative: { temperature: TEMPERATURES.creative, effort: "none" },
  content: { temperature: TEMPERATURES.content, effort: "medium" },
  simulation: {},
};

/** Wat er daadwerkelijk in de request-body belandt. */
export interface CallTuning {
  /** Weggelaten zodra het model hem niet accepteert. */
  temperature?: number;
  /** Alleen voor redeneermodellen; weggelaten = modelstandaard. */
  reasoningEffort?: ReasoningEffort;
}

/**
 * Is dit een redeneermodel (GPT-5-familie en de o-serie)? Bewust op prefix en
 * niet op een lijst modelnamen: een nieuwe variant (`gpt-5.6-terra`,
 * `gpt-5.7-...`) valt dan vanzelf goed, in plaats van stil in de verkeerde tak.
 */
export function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o[1-9])/.test(model);
}

/**
 * Vertaal soort werk + model naar de parameters voor één aanroep.
 *
 * `temperatureSupported` staat standaard aan en gaat uit zodra de API hem één
 * keer geweigerd heeft (zie `structured.ts`). Zo blijft de app draaien als
 * OpenAI de regel aanscherpt, zonder dat wij de tabel hierboven hoeven te
 * verminken: liever iets meer ruis in de classificatie dan een pijplijn die
 * halverwege een meetronde op een 400 stukloopt.
 */
export function resolveTuning(
  model: string,
  work: WorkKind,
  temperatureSupported = true,
): CallTuning {
  const profile = WORK[work];

  // Niet-redeneermodellen (gpt-4.1 en ouder, en wat een evaluatiescript ook maar
  // langs de meetlat legt): temperatuur zoals bedoeld, geen effort.
  if (!isReasoningModel(model)) {
    return { temperature: profile.temperature };
  }

  // Redeneermodellen: temperatuur mag uitsluitend mee zolang er niet geredeneerd
  // wordt. Dat is geen voorzorg maar de regel van de API — bij effort `low` en
  // hoger is `temperature` een unsupported parameter en faalt de hele call.
  const temperature =
    profile.effort === "none" && temperatureSupported ? profile.temperature : undefined;

  return { temperature, reasoningEffort: profile.effort };
}

/**
 * Weigert de API de temperatuur? Dan herkennen we dat hieraan, en schakelt de
 * aanroeplaag hem voor de rest van het proces uit.
 *
 * Defensief uitgelezen: de SDK hangt de foutdetails aan verschillende velden
 * (`error.param`, `error.message`, `message`) afhankelijk van hoe de fout
 * ontstaat. Een gemiste herkenning is niet erg (dan faalt de taak en pakt de
 * retry-laag hem op), een valse herkenning wél — vandaar dat zowel het woord
 * "temperature" als een expliciete afwijzing aanwezig moet zijn.
 */
export function isUnsupportedTemperatureError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;

  const e = err as { status?: unknown; param?: unknown; message?: unknown; error?: unknown };
  if (e.status !== 400) return false;

  const inner = (e.error ?? {}) as { param?: unknown; message?: unknown };
  const haystack = [e.param, e.message, inner.param, inner.message]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();

  if (!haystack.includes("temperature")) return false;
  return /unsupported|not supported|unknown parameter|does not support/.test(haystack);
}
