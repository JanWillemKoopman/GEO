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
} as const;

export type SalesStap = keyof typeof STAP_KOSTEN_USD;

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

  // K2: de melding zegt wat er niet gebeurt, hoeveel er op staat en waar de
  // grens ligt. Nederlandse notatie met een vaste locale, want de server in
  // Vercel staat niet op Nederlands.
  const euro = (usd: number) =>
    (usd / EUR_TO_USD).toLocaleString("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });

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
