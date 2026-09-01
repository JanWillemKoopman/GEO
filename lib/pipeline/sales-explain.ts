import "server-only";

/**
 * Stap 10: de uitleg en de haak bij één kans
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 14)
 *
 * ── HET MODEL FORMULEERT, DE CODE BESLIST ───────────────────────────────────
 *
 * De kans, het type, de cijfers en het bewijs liggen al vast als deze stap
 * begint. Het model schrijft er twee dingen bij: één haak van één zin, en drie
 * tot vijf zinnen uitleg. Het kiest niet wélke kans het is en het rekent niets.
 *
 * En daarna controleert code elk getal in de haak tegen de meetdata
 * (`lib/sales/hook.ts`). Klopt er een niet, dan wordt de zin verworpen en valt
 * hij terug op een sjabloon dat alleen gecontroleerde waarden bevat. Dat is
 * hetzelfde patroon als de claimvalidator in de contentpijplijn, en hier weegt
 * het zwaarder: deze zin gaat naar buiten, naar iemand die zijn eigen markt
 * kent.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { SalesOpportunityText } from "@/lib/schemas/sales";
import { beoordeelBudget, besteedAanMarkt } from "@/lib/sales/budget";
import { KANS_BEDRIJF } from "@/lib/sales/relaties";
import { bouwHookVraag, kiesHook, MAX_HOOK_POGINGEN } from "@/lib/sales/hook";
import type { Kans } from "@/lib/sales/opportunity";

type Admin = SupabaseClient;

export interface UitlegUitkomst {
  skipped: boolean;
  melding: string | null;
  /** Kwam de haak uit het model of uit het sjabloon? */
  bron: "model" | "sjabloon" | null;
}

export async function schrijfUitleg(
  admin: Admin,
  opportunityId: string,
): Promise<UitlegUitkomst> {
  // ⚠️ `KANS_BEDRIJF` en niet `sales_companies`: zie `lib/sales/relaties.ts`.
  // En de foutmelding wordt uitgelezen, want zonder dat werd elke storing hier
  // gerapporteerd als "deze kans bestaat niet".
  const { data, error } = await admin
    .from("sales_opportunities")
    .select(
      "id, market_id, run_id, company_id, type, evidence, hook_text, hook_source, rival_company_id, " +
        `${KANS_BEDRIJF}(name), sales_markets(label)`,
    )
    .eq("id", opportunityId)
    .maybeSingle();

  if (error) throw new Error(`Kans ${opportunityId} lezen mislukt: ${error.message}`);

  type Rij = {
    id: string;
    market_id: string;
    run_id: string;
    company_id: string;
    type: string;
    evidence: { cijfers?: Record<string, number>; vragen?: string[]; antwoorden?: string[] } | null;
    hook_text: string | null;
    hook_source: string | null;
    rival_company_id: string | null;
    sales_companies: { name: string } | null;
    sales_markets: { label: string } | null;
  };

  const kans = data as unknown as Rij | null;
  if (!kans) throw new Error(`Kans ${opportunityId} bestaat niet.`);

  // Idempotent (conventie 9), maar op de BRON en niet op de aanwezigheid van
  // tekst. Elke kans krijgt bij de detectie al een sjabloonhaak, dus "er staat
  // iets" betekent niet "het is af". Wat hier telt is of het model er al aan te
  // pas is gekomen; zo ja, dan blijft de zin staan en ziet een verkoper die de
  // kans gisteren las vandaag dezelfde tekst.
  if (kans.hook_source === "model") {
    return { skipped: true, melding: "De haak was al geschreven.", bron: null };
  }

  const oordeel = beoordeelBudget(await besteedAanMarkt(admin, kans.market_id), "explain");
  if (!oordeel.ok) return { skipped: true, melding: oordeel.melding, bron: null };

  const naam = kans.sales_companies?.name ?? "Dit bedrijf";
  const marktNaam = kans.sales_markets?.label ?? "deze markt";

  let rivaalNaam: string | null = null;
  if (kans.rival_company_id) {
    const { data: rivaal } = await admin
      .from("sales_companies")
      .select("name")
      .eq("id", kans.rival_company_id)
      .maybeSingle();
    rivaalNaam = (rivaal?.name as string) ?? null;
  }

  // De vorm die `lib/sales/hook.ts` verwacht. De cijfers komen uit de opgeslagen
  // kans en niet uit een nieuwe berekening: twee plekken die hetzelfde getal
  // maken, lopen uit elkaar.
  const invoer: Kans = {
    type: kans.type as Kans["type"],
    vragen: kans.evidence?.vragen ?? [],
    antwoorden: kans.evidence?.antwoorden ?? [],
    rivalCompanyId: kans.rival_company_id,
    cijfers: kans.evidence?.cijfers ?? {},
  };

  const r = await callStructured({
    model: MODELS.volume,
    system:
      "Je schrijft de opening van een verkoopgesprek op basis van een meting. Je gebruikt " +
      "uitsluitend de cijfers die je krijgt en je verzint er nooit één bij, ook geen afronding. " +
      "Je schrijft zakelijk en zonder verkooptaal. Antwoord in het Nederlands.",
    user: bouwHookVraag(invoer, naam, rivaalNaam, marktNaam),
    schema: SalesOpportunityText,
    schemaName: "sales_opportunity_text",
    webSearch: false,
    work: "analytical",
    meta: {
      kind: "sales_opportunity_explain",
      salesMarketId: kans.market_id,
      salesRunId: kans.run_id,
    },
  });

  // ⚠️ De controle op de getallen (plan hoofdstuk 14). Het model levert
  // meerdere kandidaten; de eerste die de controle haalt wint, en haalt er geen
  // enkele het, dan wint het sjabloon.
  const kandidaten = [r.parsed.haak, ...(r.parsed.alternatieven ?? [])].slice(
    0,
    MAX_HOOK_POGINGEN + 1,
  );
  const haak = kiesHook(kandidaten, invoer, naam, rivaalNaam);

  await admin
    .from("sales_opportunities")
    .update({
      hook_type: invoer.type,
      hook_text: haak.tekst,
      hook_source: haak.bron,
      why_text: (r.parsed.uitleg ?? "").trim() || null,
    })
    .eq("id", opportunityId);

  return { skipped: false, melding: null, bron: haak.bron };
}
