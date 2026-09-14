/**
 * Welke modellen de sollicitatieassistent aanbiedt, en wat er per keuze
 * daadwerkelijk de deur uit gaat.
 *
 * Bewust een pure module zonder `server-only` (conventie 2): het scherm leest
 * deze lijst om de keuzelijst te vullen, de route leest hem om te controleren
 * wat er binnenkomt, en `scripts/test-unit.ts` rekent na dat die twee hetzelfde
 * zeggen. Eén tabel, drie lezers.
 *
 * ── WAAROM ALLEEN DEZE DRIE MODELLEN ───────────────────────────────────────
 *
 * De opdracht noemde ook "GPT-6 Astra" en "GPT-5.4 Thinking". Die staan hier
 * niet, en dat is geen vergeetachtigheid: de app kent ze nergens, er is geen
 * tarief voor bekend in `lib/openai/pricing.ts`, en er is in deze omgeving geen
 * sleutel om te controleren of ze bij OpenAI bestaan. Een modelnaam die niet
 * bestaat levert geen nette foutmelding op maar een mislukte aanroep, en een
 * onbekend tarief valt stil terug op de duurste schatting die we kennen. Dat is
 * precies conventie 3: onbekend is een betere waarde dan een verkeerde.
 *
 * Er bijzetten kost twee regels zodra de naam vaststaat: een regel hieronder en
 * een tarief in `lib/openai/pricing.ts`. De schermen en de routes veranderen
 * niet mee, want die lezen deze tabel.
 *
 * ── ALLE DRIE ZIJN REDENEERMODELLEN ────────────────────────────────────────
 *
 * De opdracht ging uit van "een schrijfmodel" naast "een redeneermodel". Sinds
 * GPT-5.6 is dat geen tweedeling meer tussen modellen maar een knop op elk
 * model: `isReasoningModel()` in `lib/openai/sampling.ts` herkent de hele
 * GPT-5-familie. Wat vroeger de modelkeuze was, is nu de redeneerstand
 * hieronder; wat het model bepaalt, is hoe goed de zinnen zijn en wat het kost.
 */
import { isReasoningModel, type ReasoningEffort } from "@/lib/openai/sampling";

/** De modellen die deze app kent, met hun tarief in `lib/openai/pricing.ts`. */
export type SollicitatieModelId = "gpt-5.6-sol" | "gpt-5.6-terra" | "gpt-5.6-luna";

export interface SollicitatieModel {
  id: SollicitatieModelId;
  /** Wat er in de keuzelijst staat. */
  naam: string;
  /** Eén regel: waar dit model goed voor is, in gewone woorden. */
  waarvoor: string;
  /** Wat duizend woorden antwoord ongeveer kost, in dollarcenten. Zie `PRIJSPEIL`. */
  centenPerDuizendWoorden: number;
}

/**
 * Ongeveer 1,33 token per woord bij Nederlandse tekst, en een gesprek stuurt
 * zijn hele historie plus de bronteksten opnieuw mee. De bedragen hieronder zijn
 * daarom een ORDEGROOTTE om een keuze op te baseren ("dit is tien keer zo duur
 * als dat"), geen factuur. Wat een bericht echt kostte staat na afloop in
 * `sollicitatie_berichten.cost_usd`, berekend met de echte tokenaantallen.
 */
export const PRIJSPEIL = "ruwe schatting, het echte bedrag staat per bericht in de database";

export const MODELLEN: readonly SollicitatieModel[] = [
  {
    id: "gpt-5.6-sol",
    naam: "Sol, het vlaggenschip",
    waarvoor: "De beste zinnen. Voor de brief zelf, als de tekst echt de deur uit gaat.",
    // $30 per miljoen outputtokens, 1000 woorden is ~1330 tokens: ~$0,04.
    centenPerDuizendWoorden: 4,
  },
  {
    id: "gpt-5.6-terra",
    naam: "Terra, de middenweg",
    waarvoor:
      "Bijna net zo goed, 2,5 keer goedkoper. Dit is waar ORBIT ENGINE zijn eigen content op schrijft.",
    // $12 per miljoen outputtokens: ~$0,016.
    centenPerDuizendWoorden: 2,
  },
  {
    id: "gpt-5.6-luna",
    naam: "Luna, snel en goedkoop",
    waarvoor: "Voor uitzoekwerk: de vacature ontleden, sleutelwoorden zoeken, een alinea inkorten.",
    // $1,20 per miljoen outputtokens: ~$0,0016.
    centenPerDuizendWoorden: 0.2,
  },
] as const;

/**
 * Het vlaggenschip staat voor, want de reden dat iemand dit scherm opent is de
 * brief en niet de analyse. Wie wil uitzoeken, zet hem zelf een stap terug.
 */
export const STANDAARD_MODEL: SollicitatieModelId = "gpt-5.6-sol";

export interface Redeneerstand {
  id: ReasoningEffort;
  naam: string;
  /** Wanneer je deze stand wilt, in gewone woorden. */
  wanneer: string;
}

/**
 * De vier standen die dit scherm aanbiedt, van geen naar veel nadenken.
 *
 * `xhigh` en `max` bestaan ook (`lib/openai/sampling.ts`), maar staan hier niet:
 * een antwoord moet binnen de tijdslimiet van de route blijven, en bij een
 * gesprek dat live meeschrijft is stilte duurder dan een iets minder doordacht
 * antwoord. Wie ze wil, zet ze hier bij en meet eerst de doorlooptijd na.
 */
export const REDENEERSTANDEN: readonly Redeneerstand[] = [
  {
    id: "none",
    naam: "Geen",
    wanneer: "Direct antwoord. De enige stand waarin de temperatuur meegaat, dus de losste pen.",
  },
  { id: "low", naam: "Laag", wanneer: "Een korte controle vooraf. Goed voor herschrijven." },
  {
    id: "medium",
    naam: "Midden",
    wanneer: "De stand waarop ORBIT ENGINE zijn content schrijft. Goed voor een eerste brief.",
  },
  {
    id: "high",
    naam: "Hoog",
    wanneer: "Het meeste denkwerk. Voor de vacature ontleden en de match met je CV opbouwen.",
  },
] as const;

export const STANDAARD_STAND: ReasoningEffort = "medium";

/**
 * De temperatuur die meegaat zodra er niet geredeneerd wordt.
 *
 * 0,7 en niet 0: dit is schrijfwerk, en dan is variatie kwaliteit. Hetzelfde
 * cijfer als `TEMPERATURES.content` in `lib/openai/models.ts`, om dezelfde reden.
 */
export const TEMPERATUUR_ZONDER_REDENEREN = 0.7;

export function isGeldigModel(waarde: unknown): waarde is SollicitatieModelId {
  return MODELLEN.some((m) => m.id === waarde);
}

export function isGeldigeStand(waarde: unknown): waarde is ReasoningEffort {
  return REDENEERSTANDEN.some((s) => s.id === waarde);
}

export function vindModel(id: SollicitatieModelId): SollicitatieModel {
  const model = MODELLEN.find((m) => m.id === id);
  // Kan niet gebeuren zolang het type klopt, maar een route krijgt zijn invoer
  // van buiten: liever het vlaggenschip dan een lege verwijzing.
  return model ?? MODELLEN[0];
}

/** Wat er daadwerkelijk in de request-body van OpenAI belandt. */
export interface Aanroepparameters {
  model: string;
  reasoningEffort?: ReasoningEffort;
  temperature?: number;
}

/**
 * Van een keuze op het scherm naar de parameters voor één aanroep.
 *
 * ⚠️ De regel die hier wordt nagevolgd is niet van ons maar van de API: een
 * redeneermodel accepteert `temperature` alleen zolang de redeneerstand op
 * `none` staat. Bij `low` en hoger is het een unsupported parameter en faalt de
 * hele aanroep met een 400. Dezelfde regel, met dezelfde onderbouwing, staat in
 * `resolveTuning()` in `lib/openai/sampling.ts`; die functie vertaalt SOORT WERK
 * naar parameters en dit scherm laat de gebruiker zelf kiezen, dus de tabel daar
 * past hier niet. De regel zelf staat op allebei de plekken, en
 * `scripts/test-unit.ts` rekent na dat ze niet uit elkaar lopen.
 */
export function bepaalParameters(
  modelId: SollicitatieModelId,
  stand: ReasoningEffort,
): Aanroepparameters {
  if (!isReasoningModel(modelId)) {
    // Kan met de huidige drie modellen niet voorkomen. Staat er voor het geval
    // er ooit een ouder model bij komt: dan is temperatuur juist het enige dat
    // werkt en redeneerstand het enige dat niet bestaat.
    return { model: modelId, temperature: TEMPERATUUR_ZONDER_REDENEREN };
  }

  if (stand === "none") {
    return { model: modelId, reasoningEffort: "none", temperature: TEMPERATUUR_ZONDER_REDENEREN };
  }

  return { model: modelId, reasoningEffort: stand };
}
