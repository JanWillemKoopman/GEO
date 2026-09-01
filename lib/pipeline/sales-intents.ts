import "server-only";

/**
 * Stap 4: welke commerciële intenties heeft deze markt?
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 10)
 *
 * ── WAT DEZE STAP WEL EN NIET VRAAGT ────────────────────────────────────────
 *
 * Niet: "welke vragen stellen mensen over makelaars in Eindhoven". Dat levert
 * een lijst prompts op zonder etiket, en dan is de uitkomst "je scoort 18 van
 * 40": een cijfer waar een ondernemer niets mee kan (plan 10.2).
 *
 * Wel: "welke soorten opdrachten zijn er in deze markt te vergeven, en wat
 * levert er geld op". Dat zijn de intenties. Bij makelaars zijn dat
 * verkoopbegeleiding, aankoopbegeleiding, taxatie, expats, starters. Het
 * verschil tussen die twee vragen is het verschil tussen een score en een
 * verkoopargument, en het is de reden dat deze stap bestaat.
 *
 * ── ÉÉN AANROEP, EN DE VERDELING KOMT ERNA ──────────────────────────────────
 *
 * Conventie 7: één taak, één zware aanroep. Het model levert de intenties met
 * een waarde- en frequentieband; `lib/sales/intents.ts` maakt daarna de
 * rekensom die bepaalt hoeveel vragen elke intentie krijgt en hoe zwaar ze
 * tellen. Die scheiding is conventie 1 in de praktijk: het model levert de
 * inhoud, de code levert de garantie.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { SalesMarketIntents } from "@/lib/schemas/sales";
import { beoordeelBudget, besteedAanMarkt } from "@/lib/sales/budget";
import {
  schoonIntenties,
  bouwIntentieVraag,
  INTENTIES_MIN,
  type Intentie,
} from "@/lib/sales/intents";

type Admin = SupabaseClient;

export interface IntentieUitkomst {
  intenties: Intentie[];
  kanttekening: string;
  skipped: boolean;
  melding: string | null;
}

/**
 * De diensten die de crawl op de sites van deze markt tegenkwam.
 *
 * ⚠️ Dit is de reden dat de intentiestap ná de verrijking draait en niet ervoor.
 * Een model dat uit zijn eigen kennis de intenties van "makelaars Eindhoven"
 * opsomt, geeft de landelijke, generieke lijst. De sites van déze dertig
 * bedrijven vertellen wat er in déze markt daadwerkelijk aangeboden wordt, en
 * dat is precies wat opportunitytype 3 nodig heeft: het bedrijf beschrijft de
 * dienst zelf, dus het gat is aantoonbaar niet dat de dienst ontbreekt.
 */
async function sectiesUitDeMarkt(admin: Admin, marketId: string): Promise<string[]> {
  const { data } = await admin
    .from("sales_market_companies")
    .select("company_id, sales_companies(crawl_summary)")
    .eq("market_id", marketId)
    .eq("included", true);

  type Lid = { company_id: string; sales_companies: { crawl_summary: unknown } | null };

  const teller = new Map<string, number>();
  for (const rij of (data ?? []) as unknown as Lid[]) {
    const samenvatting = rij.sales_companies?.crawl_summary as { secties?: string[] } | null;
    for (const sectie of samenvatting?.secties ?? []) {
      const s = String(sectie).trim().toLowerCase();
      if (s.length < 3 || s.length > 40) continue;
      teller.set(s, (teller.get(s) ?? 0) + 1);
    }
  }

  // Alleen wat op meer dan één site voorkomt. Eén site die "duurzaam wonen"
  // aanbiedt maakt daar geen marktintentie van, en een intentie die maar bij één
  // bedrijf bestaat kan geen intent gap dragen.
  return Array.from(teller.entries())
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([s]) => s);
}

export async function bepaalIntenties(
  admin: Admin,
  marketId: string,
  maxVragen: number,
): Promise<IntentieUitkomst> {
  const leeg: IntentieUitkomst = {
    intenties: [],
    kanttekening: "",
    skipped: true,
    melding: null,
  };

  const { data } = await admin
    .from("sales_markets")
    .select("id, label, industry, location, radius_km")
    .eq("id", marketId)
    .maybeSingle();
  if (!data) throw new Error(`Markt ${marketId} bestaat niet.`);

  const besteed = await besteedAanMarkt(admin, marketId);
  const oordeel = beoordeelBudget(besteed, "intents");
  if (!oordeel.ok) return { ...leeg, melding: oordeel.melding };

  const secties = await sectiesUitDeMarkt(admin, marketId);

  const r = await callStructured({
    model: MODELS.quality,
    system:
      "Je brengt in kaart welke soorten opdrachten er in een lokale markt te vergeven zijn. " +
      "Je kijkt naar wat er geld oplevert, niet naar wat er interessant klinkt. " +
      "Een intentie is een soort opdracht of dienst waar een klant een aanbieder voor zoekt, " +
      "geen onderwerp en geen thema. " +
      "Antwoord in het Nederlands.",
    user: bouwIntentieVraag(
      {
        label: data.label as string,
        industry: data.industry as string,
        location: data.location as string,
        radius_km: data.radius_km as number,
      },
      secties,
    ),
    schema: SalesMarketIntents,
    schemaName: "sales_market_intents",
    webSearch: false,
    work: "analytical",
    meta: { kind: "sales_market_intents", salesMarketId: marketId },
  });

  const { intenties, meldingen } = schoonIntenties(r.parsed.intenties, maxVragen);

  if (intenties.length < INTENTIES_MIN) {
    return {
      ...leeg,
      melding:
        `Het onderzoek vond maar ${intenties.length} bruikbare ${
          intenties.length === 1 ? "intentie" : "intenties"
        } in deze markt, en er zijn er minstens ${INTENTIES_MIN} nodig. ` +
        "Zonder die tweede as meet je alleen dát een bedrijf niet genoemd wordt, niet waar.",
    };
  }

  return {
    intenties,
    kanttekening: [(r.parsed.kanttekening ?? "").trim(), ...meldingen].filter(Boolean).join(" "),
    skipped: false,
    melding: null,
  };
}
