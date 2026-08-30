/**
 * Het plafond per marktanalyse (plan 21.3, eerste rem).
 *
 * ── HET PLAFOND IS EEN REM, GEEN DOEL ───────────────────────────────────────
 *
 * Precies dezelfde opzet als `lib/reputation/budget.ts`, en om precies dezelfde
 * reden. Het plafond staat op 10 euro (plan hoofdstuk 21) terwijl de begrote
 * som van een volledige markt met 40 vragen op twee engines rond de 8 euro
 * uitkomt. Het is er dus niet om de kosten te sturen maar om een ongeluk te
 * vangen: een cron die twintig keer vuurt, een markt met driehonderd bedrijven,
 * een stap die zichzelf opnieuw inplant.
 *
 * ⚠️ **De volgorde van de stappen is op dit plafond ontworpen.** Wat als laatste
 * draait, valt als eerste weg. Vandaag is dat de crawlverrijking, en dat is de
 * goedkoopste stap omdat er geen model aan te pas komt; loopt het budget vol,
 * dan is er dus iets grondig mis en niet iets marginaals.
 *
 * ── OVERSLAAN IS EEN UITKOMST, GEEN STILTE ──────────────────────────────────
 *
 * Valt een stap weg, dan komt dat in `sales_markets.failure_reason` en blijft de
 * markt zichtbaar staan met wat er wél is. Een markt die stil halverwege stopt,
 * is de fout die je pas ontdekt als je hem gaat gebruiken.
 *
 * Bewust ZONDER `server-only`: het OORDEEL bepaalt wat de admin op zijn scherm
 * ziet en hoort testbaar te zijn vanuit `scripts/test-unit.ts` (conventie 2).
 * Alleen het optellen zelf heeft de database nodig, en dat is de laatste functie.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Het plafond per markt, in euro. Hard in code, zoals plan hoofdstuk 21 vraagt. */
export const MARKT_BUDGET_EUR = 10;

/**
 * Wisselkoers voor de vertaling naar dollars. Vast en licht conservatief, net
 * als in `lib/reputation/budget.ts`: een plafond dat met de koers meebeweegt is
 * niet uit te leggen en niet te testen.
 */
export const EUR_TO_USD = 1.08;

export function budgetUsd(eur: number = MARKT_BUDGET_EUR): number {
  return Number((eur * EUR_TO_USD).toFixed(2));
}

/**
 * Wat elke stap ongeveer kost, in USD. Uit de begroting in plan 21.2.
 *
 * ⚠️ **Dit zijn schattingen en geen metingen**, anders dan de bedragen in
 * `lib/reputation/budget.ts` die tegen echte aanroepen zijn nagerekend. Er is
 * nog geen enkele marktanalyse gedraaid. Ze staan daarom aan de voorzichtige
 * kant: te laag schatten laat een stap beginnen die er niet meer in past, en dat
 * is de duurdere fout van de twee. Zodra de eerste echte markt gedraaid heeft,
 * horen deze bedragen tegen `ai_calls` nagerekend te worden, precies zoals dat
 * bij de reputatieanalyse is gebeurd.
 */
export const STAP_KOSTEN_USD = {
  /** Eén onderzoeksaanroep mét web-zoeken die de markt opsomt. Plan 21.2: €0,75. */
  discover: 0.85,
  /** Ontdubbelen en bronpagina's uitlezen. Geen model, alleen netwerkverkeer. */
  verify: 0,
  /** De uitsluitingen. Twee query's, geen model. */
  suppress: 0,
  /** De crawl per bedrijf. Geen model, dus gratis (plan 21.2, tweede regel). */
  enrich: 0,
  /** Eén aanroep die de commerciële intenties van de markt voorstelt. */
  intents: 0.06,
  /** Eén aanroep die de veertig vragen schrijft. */
  questions: 0.1,
  /**
   * Eén vraag op één engine: de dure zoekactie plus de goedkope beoordeling.
   *
   * ⚠️ **Dit is de kostenknop van de hele module** (plan 21.1). Veertig vragen
   * maal twee engines is tachtig keer dit bedrag, en dat is ~95% van wat een
   * marktronde kost. Het aantal BEDRIJVEN verandert er niets aan: die komen uit
   * hetzelfde antwoord. Vandaar dat het aantal vragen begrensd is en het aantal
   * bedrijven niet.
   *
   * Het bedrag is de web-zoekactie (~$0,025 vast tarief) plus tokens, gelijk aan
   * wat een klantmeting per vraag kost (`docs/architecture.md` §6). De
   * beoordeling erna is verwaarloosbaar naast die zoekactie.
   */
  measure: 0.03,
  /** De aggregatie. Geen model, dus gratis. */
  aggregate: 0,
  /** De detectie van de kansen. Deterministisch, dus geen model en gratis. */
  detect: 0,
  /**
   * De uitleg en de haak bij één kans.
   *
   * Eén goedkope aanroep zonder web-zoeken, met drie kandidaatzinnen tegelijk.
   * Bij dertig bedrijven is dat ~€0,90 voor de hele markt, precies de post
   * "opportunities verklaren en hooks schrijven" uit de begroting in plan 21.2.
   */
  explain: 0.03,
  /**
   * Eén onderzoeksaanroep mét web-zoeken die de contactpersoon zoekt.
   *
   * ⚠️ Draait pas bij TOEWIJZING en niet bij detectie (plan §8.2b). Voor dertig
   * bedrijven een contactpersoon uitzoeken terwijl er acht benaderd worden, is
   * werk en geld dat niemand gebruikt.
   */
  contact: 0.05,
  /** De conceptmail plus de gespreksvoorbereiding. Eén aanroep, geen web-zoeken. */
  draft: 0.15,
} as const;

export type SalesStap = keyof typeof STAP_KOSTEN_USD;

/**
 * Wat gaat deze meetronde kosten?
 *
 * ── WAAROM DIT EEN EIGEN FUNCTIE IS EN GEEN SOM OP HET SCHERM ───────────────
 *
 * Dit getal staat bij poort 2 naast de vragenlijst, en het is het enige waarop
 * de sales admin zijn ja baseert (plan §8.1). Zou het scherm hem zelf uitrekenen,
 * dan is er niets dat hem koppelt aan wat de meting daadwerkelijk doet, en dan
 * groeit het verschil tussen raming en rekening zonder dat iemand het merkt.
 *
 * De raming wordt daarom bewaard op de ronde (`sales_runs.estimate_usd`), náást
 * wat het werd. Een raming die er structureel naast zit, zie je alleen als je
 * hem bewaart.
 */
export function raamMeetronde(vragen: number, engines: number): number {
  const meten = vragen * Math.max(1, engines) * STAP_KOSTEN_USD.measure;
  return Number((meten + STAP_KOSTEN_USD.aggregate).toFixed(2));
}

/**
 * Past deze hele meetronde nog binnen het plafond?
 *
 * ⚠️ Deze vraag hoort VÓÓR de eerste meting gesteld te worden en niet per vraag.
 * Per vraag beoordelen betekent dat een ronde halverwege stopt: dertig van de
 * veertig vragen gemeten, een score die op een willekeurige deelverzameling
 * rust, en een rekening die toch is betaald. Beter is het om te weigeren te
 * beginnen en te zeggen hoeveel vragen er wél in passen.
 */
export function beoordeelRonde(
  besteedUsd: number,
  vragen: number,
  engines: number,
  plafondEur: number = MARKT_BUDGET_EUR,
): BudgetOordeel & { pastVragen: number } {
  const raming = raamMeetronde(vragen, engines);
  const plafond = budgetUsd(plafondEur);
  const ruimte = plafond - besteedUsd;

  if (besteedUsd + raming <= plafond) {
    return { ok: true, besteed: besteedUsd, stap: raming, melding: null, pastVragen: vragen };
  }

  const perVraag = Math.max(1, engines) * STAP_KOSTEN_USD.measure;
  const pastVragen = Math.max(0, Math.floor(ruimte / perVraag));

  return {
    ok: false,
    besteed: besteedUsd,
    stap: raming,
    pastVragen,
    melding:
      `Deze meting kost naar schatting ${euro(raming)} en er is nog ${euro(Math.max(0, ruimte))} ` +
      `van het plafond over. Er passen nog ${pastVragen} vragen in. Haal vragen uit de lijst of ` +
      "verhoog het plafond.",
  };
}

export interface BudgetOordeel {
  ok: boolean;
  /** Wat er tot nu toe uitgegeven is, in USD. */
  besteed: number;
  /** Wat deze stap er naar schatting bij doet. */
  stap: number;
  /** Alleen gevuld als het niet mag. Zegt wat er niet gebeurt en waarom. */
  melding: string | null;
}

/**
 * Past deze stap nog binnen het plafond?
 *
 * De vraag is niet "zitten we eronder" maar "zitten we er ná deze stap nog
 * onder". Een stap die begint met een paar cent over, maakt het plafond alsnog
 * kapot, en juist de dure stappen zijn de stappen die je niet half wilt draaien.
 *
 * ⚠️ **Een stap die niets kost, wordt nooit geblokkeerd.** Dat lijkt een detail
 * en het is het tegenovergestelde. Twee van de vier stappen in deze module zijn
 * gratis (het ontdubbelen en de crawl per bedrijf), en dat is geen toeval maar
 * het ontwerp uit plan 21.1: wat meeschaalt met het aantal bedrijven moet
 * kosteloos zijn, anders gaan mensen bedrijven wegsnijden. Zou een vol budget
 * ook die stappen tegenhouden, dan verliest een markt zijn crawlgegevens zonder
 * dat het ook maar één cent bespaart. Een rem hoort te remmen waar geld
 * wegloopt, en nergens anders.
 */
/**
 * Een bedrag in dollars, geschreven als euro's.
 *
 * K2: een melding zegt wat er niet gebeurt, hoeveel er op staat en waar de grens
 * ligt. Nederlandse notatie met een vaste locale, want de server in Vercel staat
 * niet op Nederlands.
 */
function euro(usd: number): string {
  return (usd / EUR_TO_USD).toLocaleString("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

export function beoordeelBudget(
  besteedUsd: number,
  stap: SalesStap,
  plafondEur: number = MARKT_BUDGET_EUR,
): BudgetOordeel {
  const kosten = STAP_KOSTEN_USD[stap];
  const plafond = budgetUsd(plafondEur);
  const na = besteedUsd + kosten;

  if (kosten === 0 || na <= plafond) {
    return { ok: true, besteed: besteedUsd, stap: kosten, melding: null };
  }

  return {
    ok: false,
    besteed: besteedUsd,
    stap: kosten,
    melding:
      `Deze markt heeft ${euro(besteedUsd)} gekost en het plafond is ${euro(plafond)}. ` +
      "De volgende stap is overgeslagen. Verhoog het plafond of start een nieuwe markt " +
      "met minder vragen.",
  };
}

/**
 * Wat deze markt tot nu toe gekost heeft, in USD, uit het kostenlogboek.
 *
 * ⚠️ Faalt naar 0 en niet naar "vol". Dat is dezelfde keuze als bij het
 * dagplafond in `lib/spend-limit.ts`: zou een trage query hier "geblokkeerd"
 * opleveren, dan legt hij elke lopende marktanalyse plat, inclusief werk dat al
 * betaald is. Een rem die stil niet werkt is erger dan geen rem, dus dit wordt
 * luid gelogd.
 */
export async function besteedAanMarkt(
  admin: SupabaseClient,
  marketId: string,
): Promise<number> {
  try {
    const { data, error } = await admin
      .from("ai_calls")
      .select("cost_usd")
      .eq("sales_market_id", marketId);
    if (error) {
      console.error(`Kosten per markt optellen mislukt (${marketId}):`, error.message);
      return 0;
    }
    return (data ?? []).reduce((som, r) => som + Number(r.cost_usd ?? 0), 0);
  } catch (err) {
    console.error(`Kosten per markt optellen mislukt (${marketId}):`, err);
    return 0;
  }
}
