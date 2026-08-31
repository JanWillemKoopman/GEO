/**
 * Hoeveel vragen per funnelfase, per analyse instelbaar.
 *
 * ── WAAROM PER ANALYSE EN NIET PER MERK ─────────────────────────────────────
 *
 * Besloten op 12 augustus 2026. De juiste verdeling hangt niet aan het bedrijf
 * maar aan het onderwerp: dezelfde installateur wil bij "cv-ketel onderhoud"
 * vooral beslissingsvragen ("wie kan dit voor mij doen in Den Bosch"), en bij
 * "warmtepomp subsidie" juist oriëntatievragen, want daar is de koper nog aan
 * het uitzoeken wát hij wil. Eén verdeling per merk zou die twee door elkaar
 * halen.
 *
 * ── WAT DIT KOST, EN WAAROM DAT HIER STAAT ──────────────────────────────────
 *
 * ⚠️ Elke vraag erbij is een betaalde meting, elke maand opnieuw. Gemeten over
 * 428 echte metingen op productie: **$0,024 per vraag per ronde**. De standaard
 * van 30 vragen kost dus ~$0,72 per meetronde, 60 vragen ~$1,44 en 90 vragen
 * ~$2,16. Dat is per onderwerp, en een klant heeft er meestal vier.
 *
 * Daar staat betrouwbaarheid tegenover, en die schaalt met de wortel: de
 * 95%-onzekerheidsband is ±16 punten bij 30 vragen, ±12 bij 60 en ±9,5 bij 90.
 * Verdubbelen levert dus een kwart smallere band, verdrievoudigen een derde.
 * Het scherm hoort dat te zeggen vóórdat iemand het getal omhoog zet, en niet
 * pas op de rekening.
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */
import { PROMPT_CATEGORIES } from "@/lib/types/database";
import { formatUsd } from "@/lib/format";

export type FunnelStage = (typeof PROMPT_CATEGORIES)[number];

/** Aantal vragen per funnelfase. */
export type PromptMix = Record<FunnelStage, number>;

/**
 * De standaard: tien per fase, dertig in totaal.
 *
 * Blijft precies wat het was, zodat een bestaande analyse en een nieuwe analyse
 * zonder eigen instelling exact hetzelfde doen. Een nieuwe knop mag geen
 * bestaand gedrag veranderen.
 */
export const DEFAULT_STAGE_COUNT = 10;
export const DEFAULT_MIX: PromptMix = {
  Oriëntatie: DEFAULT_STAGE_COUNT,
  Overweging: DEFAULT_STAGE_COUNT,
  Beslissing: DEFAULT_STAGE_COUNT,
};

/**
 * De grenzen, en waar ze vandaan komen.
 *
 * `MAX_PER_STAGE` op 40: daarboven wordt één generatie-aanroep zo lang dat hij
 * tegen de tijdslimiet van de werker aan loopt, ook nu de generatie per fase in
 * een eigen taak zit.
 *
 * `MAX_TOTAL` op 100 (opgehoogd van 90 op 30 augustus 2026, werkpakket B punt 2
 * van docs/optimalisatielab-orbit-engine.md, expliciet met de eigenaar
 * afgestemd omdat dit de meetkosten rechtstreeks vermenigvuldigt): dat is
 * ~$2,40 per meetronde per onderwerp. Boven die grens kost een klant met vier
 * onderwerpen meer dan $9,60 per maand alleen aan meten, en dan hoort er een
 * gesprek aan vooraf te gaan in plaats van een invoerveld.
 *
 * `MIN_TOTAL` op 1: nul vragen betekent een analyse die nooit iets kan meten en
 * eeuwig op "meten" blijft staan. Dat is geen keuze maar een val.
 */
export const MAX_PER_STAGE = 40;
export const MAX_TOTAL = 100;
export const MIN_TOTAL = 1;

/** Gemeten op productie over 428 metingen, augustus 2026. */
export const COST_PER_PROMPT_USD = 0.024;

/**
 * Vanaf hier is meer dan de standaard verstandig om even bij stil te staan
 * (werkpakket B punt 6): geen harde grens, wel een zichtbare waarschuwing vóór
 * het geld wordt uitgegeven. ~$1,20 boven de standaard van 30 vragen.
 */
export const RUN_BUDGET_WARNING_TOTAL = 80;

/** Overschrijdt deze verdeling het bedrag waarbij het scherm een waarschuwing toont? */
export function exceedsRunBudgetWarning(mix: PromptMix): boolean {
  return mixTotal(mix) > RUN_BUDGET_WARNING_TOTAL;
}

/** Wat er in de database staat: null per fase betekent "gebruik de standaard". */
export interface PromptMixRow {
  prompts_orientatie: number | null;
  prompts_overweging: number | null;
  prompts_beslissing: number | null;
}

/**
 * Van databaserij naar een volledige verdeling.
 *
 * Per fase apart terugvallen op de standaard, niet als geheel: zet iemand alleen
 * de beslissingsfase op 20 en laat hij de rest leeg, dan hoort dat 10/10/20 te
 * worden en niet 10/10/10 met een genegeerde instelling.
 *
 * ⚠️ Nul is een echte waarde en geen "niet ingevuld". Een analyse zonder
 * oriëntatievragen is een geldige keuze voor een lokale ondernemer die alleen
 * op koopmomenten beoordeeld wil worden. Vandaar de expliciete null-controle in
 * plaats van `??`, dat nul zou wegrekenen.
 */
export function resolveMix(row: Partial<PromptMixRow> | null | undefined): PromptMix {
  const val = (n: number | null | undefined): number =>
    n === null || n === undefined ? DEFAULT_STAGE_COUNT : n;
  return {
    Oriëntatie: val(row?.prompts_orientatie),
    Overweging: val(row?.prompts_overweging),
    Beslissing: val(row?.prompts_beslissing),
  };
}

export function mixTotal(mix: PromptMix): number {
  return PROMPT_CATEGORIES.reduce((som, fase) => som + mix[fase], 0);
}

/** Is dit precies de standaard? Dan hoeft het scherm er niets over te zeggen. */
export function isDefaultMix(mix: PromptMix): boolean {
  return PROMPT_CATEGORIES.every((fase) => mix[fase] === DEFAULT_STAGE_COUNT);
}

export type MixCheck =
  | { ok: true; mix: PromptMix }
  | { ok: false; reason: string };

/**
 * Controleert een ingevoerde verdeling.
 *
 * De meldingen noemen alle vier het getal dat fout is en de grens, want "ongeldige
 * invoer" laat iemand raden welk van de drie velden hij moet aanpassen.
 */
export function checkMix(input: Partial<Record<FunnelStage, unknown>>): MixCheck {
  const mix = {} as PromptMix;

  for (const fase of PROMPT_CATEGORIES) {
    const ruw = input[fase];
    const n = typeof ruw === "number" ? ruw : Number(ruw);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { ok: false, reason: `${fase}: vul een heel getal in.` };
    }
    if (n < 0) {
      return { ok: false, reason: `${fase}: kan niet negatief zijn.` };
    }
    if (n > MAX_PER_STAGE) {
      return {
        ok: false,
        reason: `${fase}: maximaal ${MAX_PER_STAGE} vragen per fase. Meer past niet binnen de tijd die één generatieronde krijgt.`,
      };
    }
    mix[fase] = n;
  }

  const totaal = mixTotal(mix);
  if (totaal < MIN_TOTAL) {
    return {
      ok: false,
      reason:
        "Er moet minstens één vraag zijn. Een analyse zonder vragen kan niets meten en blijft eeuwig op 'meten' staan.",
    };
  }
  if (totaal > MAX_TOTAL) {
    return {
      ok: false,
      reason:
        `Samen ${totaal} vragen, en het maximum is ${MAX_TOTAL}. Dat is ongeveer ` +
        `${formatUsd(totaal * COST_PER_PROMPT_USD)} per meetronde, elke maand opnieuw.`,
    };
  }

  return { ok: true, mix };
}

/**
 * Eén zin die zegt wat deze verdeling kost en oplevert.
 *
 * Staat onder het invoerveld, want het getal veranderen is gratis en de gevolgen
 * ervan niet. De onzekerheidsband komt uit dezelfde rekensom als
 * `lib/stats/uncertainty.ts`: 1,96 keer de standaardfout bij een aandeel van
 * ongeveer 0,3, wat de score is die we in de praktijk zien.
 */
export function describeMix(mix: PromptMix): string {
  const totaal = mixTotal(mix);
  const kosten = totaal * COST_PER_PROMPT_USD;
  // 1,96 keer de standaardfout, maal 100 om van een aandeel naar punten te gaan,
  // en dan afgerond op één decimaal. Bij dertig vragen levert dat ±16,4.
  const band = Math.round(1.96 * Math.sqrt((0.3 * 0.7) / Math.max(1, totaal)) * 1000) / 10;
  return (
    `${totaal} vragen per meetronde, ongeveer ${formatUsd(kosten)} per maand voor dit onderwerp. ` +
    `De onzekerheidsmarge op de score is dan ongeveer ±${band.toFixed(1).replace(".", ",")} punten.`
  );
}

/**
 * Hoeveel vragen dit cluster WAARSCHIJNLIJK nodig heeft (werkpakket B punt 2).
 *
 * ── WAT DIT WEL EN NIET IS ───────────────────────────────────────────────────
 *
 * Dit is een schatting op basis van de OMVANG van het cluster vóór de eerste
 * meting: hoeveel diensten eronder hangen en hoe breed het werkgebied is. Het
 * is NIET de "verzadigingsregel" die het plan ook noemt, "stop vanzelf zodra
 * nieuwe vragen niets nieuws meer opleveren": dat vraagt om een tweede
 * meetronde die kijkt of de eerste al genoeg vond, en dat is een grotere,
 * losstaande uitbreiding op de huidige pijplijn (één taak, één meting, zie
 * conventie 7) die dit plan bewust niet in dezelfde stap meeneemt. Deze functie
 * lost het eerste, kleinere deel van punt 2 op: een klant met twintig diensten
 * en vijf regio's krijgt niet dezelfde dertig vragen als een klant met twee
 * diensten in één plaats.
 *
 * ── WAAROM EEN WORTELSCHAAL ──────────────────────────────────────────────────
 *
 * Elke volgende dienst of regio levert minder EXTRA vragen op dan de vorige:
 * de eerste tien diensten dekken de kern van een cluster, dienst twintig voegt
 * een randgeval toe. Een lineaire schaal (`aantal × vast getal`) zou een cluster
 * met honderd diensten duizenden vragen geven; de wortel remt dat af zonder de
 * relevante clusters plat te trekken. Zie ook `MAX_TOTAL` hierboven, de harde
 * bovengrens waar dit nooit overheen gaat.
 *
 * Regio's tellen zwaarder mee in de Beslissing-fase ("wie kan dit voor mij doen
 * in Den Bosch"), zie de module-uitleg bovenaan: dat is precies waar een breder
 * werkgebied meer, specifiek lokale vragen oplevert.
 */
export function suggestPromptMix(signals: {
  /** Hoeveel diensten/producten er onder dit onderwerp in de aanbodboom hangen. */
  offeringCount: number;
  /** Hoeveel werkgebieden dit merk opgeeft (`profiles.service_regions`). */
  regionCount: number;
}): PromptMix {
  const diensten = Math.max(0, Math.round(signals.offeringCount));
  const regios = Math.max(0, Math.round(signals.regionCount));

  const extraAlgemeen = Math.round(Math.sqrt(diensten) * 6);
  const extraRegionaal = Math.round(Math.sqrt(regios) * 8);
  const ruimte = MAX_TOTAL - DEFAULT_STAGE_COUNT * 3;

  // De regionale extra gaat naar Beslissing ("wie kan dit voor mij doen in Den
  // Bosch"), maar nooit zo veel dat die fase alleen MAX_PER_STAGE al opsoupeert.
  const regionaalDeel = Math.min(extraRegionaal, MAX_PER_STAGE - DEFAULT_STAGE_COUNT, ruimte);
  const overigeRuimte = ruimte - regionaalDeel;
  // De algemene extra verdeeld over Oriëntatie en Overweging, ook geclampt: bij
  // een cluster met een onrealistisch grote aanbodboom mag dit nooit boven
  // MAX_PER_STAGE per fase uitkomen, ook al zou de wortelschaal dat wiskundig
  // wel toestaan.
  const algemeenDeel = Math.min(extraAlgemeen, overigeRuimte, (MAX_PER_STAGE - DEFAULT_STAGE_COUNT) * 2);
  const perFase = Math.floor(algemeenDeel / 2);
  const rest = algemeenDeel - perFase * 2;

  return {
    Oriëntatie: DEFAULT_STAGE_COUNT + perFase,
    Overweging: DEFAULT_STAGE_COUNT + perFase + rest,
    Beslissing: DEFAULT_STAGE_COUNT + regionaalDeel,
  };
}
