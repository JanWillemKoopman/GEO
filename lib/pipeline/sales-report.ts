import "server-only";

/**
 * Het publieke marktrapport schrijven (plan hoofdstuk 20).
 *
 * ── DIT IS DE ENIGE TEKST VAN DE MODULE DIE NAAR BUITEN GAAT ────────────────
 *
 * De haak en de mail gaan langs een mens voordat iemand ze leest. Deze pagina
 * niet: hij staat er maanden, hij is door iedereen te vinden, en de ondernemer
 * over wie het gaat leest hem zelf. De getallencontrole uit `lib/sales/report.ts`
 * weegt hier dus het zwaarst van de drie, en er staat een tweede controle naast:
 * geen oordeel over een bedrijf.
 *
 * ⚠️ Deze stap PUBLICEERT niet. Hij schrijft alleen. Publiceren is een
 * expliciete handeling van een sales admin, en intrekken kan altijd
 * (`app/api/sales/markets/[id]/publish`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { SalesMarketReport } from "@/lib/schemas/sales";
import { beoordeelBudget, besteedAanMarkt } from "@/lib/sales/budget";
import {
  bouwRapportVraag,
  controleerRapport,
  magPubliceren,
  sjabloonRapport,
  type RapportBedrijf,
  type RapportInvoer,
} from "@/lib/sales/report";
import { ENGINE_ALLE } from "@/lib/sales/measure-math";

type Admin = SupabaseClient;

export interface RapportUitkomst {
  skipped: boolean;
  melding: string | null;
  bron: "model" | "sjabloon" | null;
}

export async function schrijfRapport(admin: Admin, runId: string): Promise<RapportUitkomst> {
  const { data: run } = await admin
    .from("sales_runs")
    .select("id, market_id, engines, question_count, finished_at, status")
    .eq("id", runId)
    .maybeSingle();
  if (!run) throw new Error(`Meetronde ${runId} bestaat niet.`);
  if (run.status !== "klaar") {
    return { skipped: true, melding: "Deze ronde is nog niet afgerond.", bron: null };
  }

  // Idempotent (conventie 9): één rapport per ronde, en een tweede poging
  // schrijft niet nog een versie van dezelfde cijfers.
  const { data: bestaand } = await admin
    .from("sales_market_reports")
    .select("id")
    .eq("run_id", runId)
    .maybeSingle();
  if (bestaand) {
    return { skipped: true, melding: "Het rapport stond er al.", bron: null };
  }

  const marketId = run.market_id as string;
  const { data: markt } = await admin
    .from("sales_markets")
    .select("label, industry, location")
    .eq("id", marketId)
    .maybeSingle();
  if (!markt) throw new Error(`Markt ${marketId} bestaat niet.`);

  const invoer = await leesInvoer(admin, runId, marketId, {
    label: markt.label as string,
    industry: markt.industry as string,
    location: markt.location as string,
    engines: ((run.engines as string[] | null) ?? []).filter((e) => e !== ENGINE_ALLE),
    vragen: Number(run.question_count ?? 0),
    gemetenOp: (run.finished_at as string | null) ?? null,
  });

  // ⚠️ De publicatiedrempel wordt hier al getoetst en niet pas bij het
  // publiceren. Een rapport schrijven over een markt die nooit publiek mag,
  // kost geld en levert een tekst op die niemand mag zien.
  const drempel = magPubliceren(invoer);
  if (!drempel.ok) {
    return { skipped: true, melding: drempel.bezwaren.join(" "), bron: null };
  }

  const oordeel = beoordeelBudget(await besteedAanMarkt(admin, marketId), "report");
  if (!oordeel.ok) return { skipped: true, melding: oordeel.melding, bron: null };

  const r = await callStructured({
    model: MODELS.quality,
    system:
      "Je schrijft een openbare pagina over wat AI-assistenten antwoorden op vragen over een lokale " +
      "markt. Je gebruikt uitsluitend de cijfers die je krijgt. Je geeft nooit een oordeel over een " +
      "bedrijf: je beschrijft wat er gemeten is. Antwoord in het Nederlands.",
    user: bouwRapportVraag(invoer),
    schema: SalesMarketReport,
    schemaName: "sales_market_report",
    webSearch: false,
    work: "analytical",
    meta: { kind: "sales_market_report", salesMarketId: marketId, salesRunId: runId },
  });

  const geheel = `${r.parsed.intro} ${r.parsed.methode} ${r.parsed.bevindingen}`;
  const controle = controleerRapport(geheel, invoer);
  const tekst = controle.ok
    ? { intro: r.parsed.intro, methode: r.parsed.methode, bevindingen: r.parsed.bevindingen }
    : sjabloonRapport(invoer);

  const { error } = await admin.from("sales_market_reports").insert({
    market_id: marketId,
    run_id: runId,
    intro: tekst.intro,
    methode: tekst.methode,
    bevindingen: tekst.bevindingen,
    // De cijfers bevroren op dit moment: zonder dit veld is een gepubliceerde
    // pagina niet meer na te rekenen zodra de volgende ronde de scores
    // overschrijft.
    cijfers: {
      vragen: invoer.vragen,
      engines: invoer.engines,
      gemetenOp: invoer.gemetenOp,
      bedrijven: invoer.bedrijven,
    } as unknown as Record<string, unknown>,
    bron: controle.ok ? "model" : "sjabloon",
  });
  if (error) throw new Error(`Opslaan van het rapport mislukt: ${error.message}`);

  return { skipped: false, melding: null, bron: controle.ok ? "model" : "sjabloon" };
}

/** De cijfers waar het rapport op rust, met de verwijderde bedrijven eruit. */
export async function leesInvoer(
  admin: Admin,
  runId: string,
  marketId: string,
  markt: {
    label: string;
    industry: string;
    location: string;
    engines: string[];
    vragen: number;
    gemetenOp: string | null;
  },
): Promise<RapportInvoer> {
  const { data } = await admin
    .from("sales_company_scores")
    .select(
      "company_id, questions_total, mentions, share, sales_companies(name, hidden_from_report)",
    )
    .eq("run_id", runId)
    .eq("engine", ENGINE_ALLE);

  type Rij = {
    company_id: string;
    questions_total: number;
    mentions: number;
    share: number;
    sales_companies: { name: string; hidden_from_report: boolean } | null;
  };

  const bedrijven: RapportBedrijf[] = ((data ?? []) as unknown as Rij[])
    .filter((r) => r.sales_companies)
    .map((r) => ({
      companyId: r.company_id,
      naam: r.sales_companies!.name,
      aandeel: Number(r.share ?? 0),
      vermeldingen: Number(r.mentions ?? 0),
      vragen: Number(r.questions_total ?? 0),
      verborgen: Boolean(r.sales_companies!.hidden_from_report),
    }));

  return {
    markt: markt.label,
    plaats: markt.location,
    branche: markt.industry,
    bedrijven,
    vragen: markt.vragen,
    engines: markt.engines,
    gemetenOp: markt.gemetenOp,
  };
}
