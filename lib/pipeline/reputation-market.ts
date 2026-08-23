import "server-only";

/**
 * Blok M: wie raadt AI aan als een koper het vraagt?
 *
 * ── DIT VERVANGT DE BENOEMDE VERGELIJKING ALS HOOFDMECHANISME ───────────────
 *
 * De eerste echte run bewees dat een gedwongen rangschikking van partijen die
 * wij aandragen niet werkt bij een regionaal bedrijf: ChatGPT kende geen van
 * beide echte concurrenten van Van den Udenhout. Het volledige waarom staat in
 * `lib/reputation/market.ts`.
 *
 * ⚠️ DEZE VRAAG BLIJFT ZOEKEN, en dat is geen detail. Hij simuleert wat een
 * echte koper te zien krijgt, en dat is de belofte van het product. De
 * dienstvragen mogen tegen een gedeeld corpus draaien omdat ze analytisch zijn;
 * deze is simulatief, en dan is realisme belangrijker dan consistentie.
 *
 * ⚠️ DE MERKNAAM STAAT NIET IN DE VRAAG. Dat is dezelfde regel als in
 * `lib/pipeline/prompts.ts` bij de gewone meting: noem je het merk, dan is een
 * vermelding gegarandeerd en meet de vraag niets. Hier is dat nog scherper, want
 * de hele uitkomst is of het merk uit zichzelf genoemd wordt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  askAndStore,
  budgetAllows,
  loadContext,
  type PlannedAsk,
  type ReputationContext,
} from "@/lib/pipeline/reputation-context";
import { bumpDone } from "@/lib/pipeline/reputation-brand";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ReputationMarket } from "@/lib/schemas/reputation";
import { readMarketAnswer, type NamedCompany } from "@/lib/reputation/market";
import { loadEntityIndex } from "@/lib/entities/resolve";
import { normalizeEntityName } from "@/lib/entities/normalize";
import type { ProfileOffering, ReputationAnswer } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Hoeveel keer we de marktvraag per dienst stellen.
 *
 * ⚠️ DRIE, en niet één. Dit is het commercieel scherpste getal van het hele
 * product, en bij de vorige opzet rustte elk getal op één antwoord. Een
 * aanbevelingslijst is bovendien gevoeliger voor toeval dan een oordeel: een
 * model dat vijf bedrijven mag noemen, kiest bij twee pogingen niet vanzelf
 * dezelfde vijf. Met drie herhalingen wordt "hij noemt je bij twee van de drie"
 * een uitspraak in plaats van een muntworp.
 */
export const MARKET_REPEATS = 3;

/**
 * De vraag zoals een koper hem stelt.
 *
 * Geen merknaam, geen opgelegde partijen, geen criteria. Het model mag zelf
 * bepalen wie er toe doet, en juist dat maakt de uitkomst bruikbaar.
 */
export function buildMarketQuestion(
  ctx: ReputationContext,
  offeringName: string | null,
): string {
  const wat = offeringName ? offeringName.toLowerCase() : (ctx.profile.industry ?? "dit soort werk");
  const waar = ctx.region ? ` in ${ctx.region}` : " in Nederland";

  return (
    `Ik zoek een bedrijf voor ${wat}${waar}. Welke bedrijven raad je aan? ` +
    `Noem ze in volgorde van wie je het eerst zou aanraden, en zeg per bedrijf kort waarom. ` +
    `Ken je er geen, zeg dat dan; verzin geen namen.`
  );
}

export interface MarketResult {
  asked: number;
  named: number;
  ownFound: number;
  skipped: boolean;
}

export async function runMarketBlock(
  admin: Admin,
  runId: string,
  offeringId: string | null,
  repeats = MARKET_REPEATS,
): Promise<MarketResult> {
  const ctx = await loadContext(admin, runId);
  if (!ctx) throw new Error(`Reputatierun ${runId} niet gevonden.`);

  if (!(await budgetAllows(admin, ctx.run, "market", repeats))) {
    return { asked: 0, named: 0, ownFound: 0, skipped: true };
  }

  let offering: ProfileOffering | null = null;
  if (offeringId) {
    const { data } = await admin
      .from("profile_offerings")
      .select("*")
      .eq("id", offeringId)
      .maybeSingle();
    offering = (data as ProfileOffering | null) ?? null;
    if (!offering) {
      console.warn(`Aanbodknoop ${offeringId} bestaat niet meer; marktvraag overgeslagen.`);
      await bumpDone(admin, runId);
      return { asked: 0, named: 0, ownFound: 0, skipped: true };
    }
  }

  const vraag = buildMarketQuestion(ctx, offering?.name ?? null);
  const index = await loadEntityIndex(admin, ctx.profile.id);
  const eigenNamen = [
    ctx.profile.brand_name,
    ctx.profile.name,
    ...(ctx.profile.aliases ?? []),
  ].filter((n): n is string => Boolean(n));

  let gesteld = 0;
  let genoemd = 0;
  let eigenGevonden = 0;

  for (let r = 0; r < repeats; r++) {
    const ask: PlannedAsk = {
      block: "markt",
      offeringId,
      question: vraag,
      webSearch: true,
      repeatIndex: r,
    };

    let antwoord: ReputationAnswer;
    try {
      const uitkomst = await askAndStore(admin, ctx, ask);
      antwoord = uitkomst.answer;
      if (uitkomst.asked) gesteld++;
    } catch (err) {
      // Eén mislukte herhaling mag de andere twee niet meenemen.
      console.error(`Marktvraag ${r} mislukt in run ${runId}:`, err);
      continue;
    }

    if (antwoord.verdict_json !== null) continue; // al beoordeeld (idempotent)

    try {
      const uit = await storeMarket(admin, ctx, antwoord, eigenNamen, offeringId, index);
      genoemd += uit.named;
      if (uit.ownFound) eigenGevonden++;
    } catch (err) {
      console.error(`Beoordeling van de marktvraag mislukt in run ${runId}:`, err);
    }
  }

  await bumpDone(admin, runId);
  return { asked: gesteld, named: genoemd, ownFound: eigenGevonden, skipped: false };
}

/** Leest de genoemde bedrijven uit één antwoord en slaat ze op. */
async function storeMarket(
  admin: Admin,
  ctx: ReputationContext,
  answer: ReputationAnswer,
  ownNames: string[],
  offeringId: string | null,
  index: Awaited<ReturnType<typeof loadEntityIndex>>,
): Promise<{ named: number; ownFound: boolean }> {
  const r = await callStructured({
    model: MODELS.volume,
    system:
      "Je leest een antwoord waarin een AI-assistent bedrijven aanbeveelt, en zet dat om in een " +
      "structuur. Neem de bedrijven over in de volgorde waarin ze in de tekst staan, want die " +
      "volgorde IS de aanbeveling. " +
      "Neem alleen bedrijven over die echt als aanbeveling genoemd worden. Een bedrijf dat " +
      "alleen terloops voorkomt, bijvoorbeeld als voorbeeld van wat je moet vermijden of als " +
      "leverancier van een ander, hoort er niet bij. " +
      "Voeg nooit een bedrijf toe dat niet in de tekst staat. Staat er geen enkele aanbeveling " +
      "in, geef dan een lege lijst. Antwoord in het Nederlands.",
    user: answer.answer_text ?? "",
    schema: ReputationMarket,
    schemaName: "reputation_market",
    webSearch: false,
    work: "deterministic",
    meta: {
      kind: "reputation_market_verdict",
      profileId: ctx.profile.id,
      reputationRunId: ctx.run.id,
    },
  });

  const genoemd: NamedCompany[] = r.parsed.bedrijven.map((b) => ({
    name: b.naam,
    position: b.plek,
    reason: b.reden,
  }));

  const uitkomst = readMarketAnswer(genoemd, ownNames);
  const eigen = normalizeEntityName(ctx.brandName);

  const rijen = uitkomst.all.map((c) => {
    const genormaliseerd = normalizeEntityName(c.name);
    return {
      run_id: ctx.run.id,
      answer_id: answer.id,
      offering_id: offeringId,
      party_name: c.name,
      // ⚠️ Geen `resolveEntity` maar alleen opzoeken. Een naam die AI noemt en
      // die wij niet kennen is de interessantste uitkomst van dit blok, maar hij
      // hoort niet automatisch als bevestigde concurrent in het entiteitenscherm
      // te belanden. Dat is een beslissing van de klant, niet van een antwoord.
      entity_id: index.byNormalized.get(genormaliseerd)?.id ?? null,
      is_own_brand: genormaliseerd === eigen,
      position: c.position,
      of_parties: uitkomst.ofParties,
      reason: c.reason || null,
    };
  });

  await admin.from("reputation_market").delete().eq("answer_id", answer.id);
  if (rijen.length > 0) {
    const { error } = await admin.from("reputation_market").insert(rijen);
    if (error) throw new Error(`Marktrijen opslaan mislukt: ${error.message}`);
  }

  // `verdict_json` als sluitstuk, net als bij de andere blokken: staat hij er,
  // dan staan de rijen er ook.
  await admin
    .from("reputation_answers")
    .update({
      verdict_json: { bedrijven: rijen.length, eigen_plek: uitkomst.ownPosition } as never,
      cost_usd: Number(answer.cost_usd ?? 0) + r.costUsd,
    })
    .eq("id", answer.id);

  return { named: rijen.length, ownFound: uitkomst.ownPosition !== null };
}
