import "server-only";

/**
 * Stap 9: welke kansen levert deze meting op?
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 12 en 13)
 *
 * Geen AI. Deze stap leest de meting, laat `lib/sales/opportunity.ts` de types
 * bepalen en `lib/sales/opportunity-score.ts` de score rekenen, en schrijft het
 * resultaat weg met zijn bewijs erbij.
 *
 * ── WAAROM DIT DE STAP IS DIE HET PRODUCT MAAKT ─────────────────────────────
 *
 * Plan 1.3: het eindresultaat is geen ranglijst en geen GEO-score, maar "een
 * gekwalificeerde sales opportunity": een reden om vandaag te bellen, met bewijs.
 * De meting uit sprint 3 is de grondstof; hier wordt het een product.
 *
 * En hier wordt de fout vermeden die het systeem onbruikbaar zou maken: er wordt
 * NIET gesorteerd op laagste zichtbaarheid. De score weegt of dit bedrijf klant
 * kan worden even zwaar als hoeveel er te winnen valt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  detecteerKansen,
  kiesPrimair,
  type BedrijfMeting,
  type Kans,
  type MarktContext,
  type MeetScore,
} from "@/lib/sales/opportunity";
import { rekenScore } from "@/lib/sales/opportunity-score";
import { sjabloonHook } from "@/lib/sales/hook";
import { ENGINE_ALLE } from "@/lib/sales/measure-math";
import { alleRijen } from "@/lib/supabase/pagineer";

type Admin = SupabaseClient;

export interface DetectieUitkomst {
  bedrijven: number;
  kansen: number;
  /** Bedrijven zonder enkele kans. Dat is een uitkomst en geen fout. */
  zonderKans: number;
}

export async function detecteerVoorRonde(admin: Admin, runId: string): Promise<DetectieUitkomst> {
  const { data: run } = await admin
    .from("sales_runs")
    .select("id, market_id, round_no, engines")
    .eq("id", runId)
    .maybeSingle();
  if (!run) throw new Error(`Meetronde ${runId} bestaat niet.`);

  const marketId = run.market_id as string;

  const { data: markt } = await admin
    .from("sales_markets")
    .select("location")
    .eq("id", marketId)
    .maybeSingle();

  const metingen = await leesMetingen(admin, runId, marketId, run.round_no as number);
  if (metingen.length === 0) {
    return { bedrijven: 0, kansen: 0, zonderKans: 0 };
  }

  const context: MarktContext = {
    bronnen: await leesMarktBronnen(admin, runId),
    gemiddeldePerIntent: gemiddeldePerIntent(metingen),
    engines: ((run.engines as string[] | null) ?? []).filter((e) => e !== ENGINE_ALLE),
    plaats: (markt?.location as string) ?? "",
  };

  const marktGemiddelde =
    metingen.reduce((som, m) => som + m.alle.weightedShare, 0) / metingen.length;

  let geschreven = 0;
  let zonderKans = 0;
  const behouden = new Set<string>();

  for (const bedrijf of metingen) {
    const kansen = detecteerKansen(bedrijf, context, metingen);
    const primair = kiesPrimair(kansen);
    if (!primair) {
      zonderKans++;
      continue;
    }

    const rivaal = primair.rivalCompanyId
      ? metingen.find((m) => m.companyId === primair.rivalCompanyId)?.naam ?? null
      : null;

    const extra = await leesBedrijfsgegevens(admin, bedrijf.companyId);
    const uitkomst = rekenScore({
      bedrijf,
      kansen,
      primair,
      marktGemiddelde,
      heeftContactgegevens: extra.heeftContactgegevens,
      sizeSignal: extra.sizeSignal,
      doNotContact: extra.doNotContact,
      eerderAfgewezen: extra.eerderAfgewezen,
    });

    // ⚠️ UPSERT EN GEEN DELETE-THEN-INSERT, en dat verschil is groter dan het
    // lijkt. Een tweede detectie op dezelfde ronde (een herstelde taak, een
    // handmatige herberekening) moet dezelfde kans OPLEVEREN én dezelfde kans
    // BLIJVEN: sprint 5 hangt de toewijzing, de conceptmail en de uitkomst aan
    // het id van deze rij. Zou de rij opnieuw aangemaakt worden, dan wijst de
    // outreach van een verkoper naar een kans die niet meer bestaat, en is niet
    // meer te reconstrueren waarom hij gebeld heeft.
    const { data: nieuw, error } = await admin
      .from("sales_opportunities")
      .upsert(
        {
        run_id: runId,
        market_id: marketId,
        company_id: bedrijf.companyId,
        type: primair.type,
        alle_types: kansen.map((k) => k.type),
        score: uitkomst.score,
        score_breakdown: uitkomst.breakdown as unknown as Record<string, unknown>,
        tier: uitkomst.tier,
        confidence: uitkomst.confidence,
        rival_company_id: primair.rivalCompanyId ?? null,
        top_intent_labels: primair.intentLabels ?? [],
        // ⚠️ ELKE KANS HEEFT METEEN EEN HAAK, en die is waar.
        //
        // De sjabloonzin bevat uitsluitend gecontroleerde waarden (plan
        // hoofdstuk 14). Het model schrijft er later een mooiere van, maar alleen
        // voor de kansen die iemand oppakt. Zou de haak leeg blijven tot dat
        // moment, dan staat er op het Opportunities-scherm een regel zonder reden
        // bij elke lage kans, en dan is de lijst half gevuld met niets.
        hook_type: primair.type,
        hook_text: sjabloonHook(primair, bedrijf.naam, rivaal),
        hook_source: "sjabloon",
        evidence: {
          cijfers: primair.cijfers,
          vragen: primair.vragen,
          antwoorden: primair.antwoorden,
        } as unknown as Record<string, unknown>,
        },
        { onConflict: "run_id,company_id" },
      )
      .select("id")
      .single();

    if (error || !nieuw) {
      throw new Error(`Opslaan van de kans voor ${bedrijf.naam} mislukt: ${error?.message}`);
    }

    await schrijfBewijs(admin, nieuw.id as string, primair);
    behouden.add(nieuw.id as string);
    geschreven++;
  }

  // Wat er bij een vorige detectie van DEZE ronde uitkwam en er nu niet meer is,
  // gaat weg. Dat gebeurt na afloop en niet vooraf: zo houdt elke kans die
  // blijft bestaan zijn id, en verdwijnt alleen wat echt vervallen is.
  const { data: bestaandeKansen } = await admin
    .from("sales_opportunities")
    .select("id")
    .eq("run_id", runId);
  const vervallen = ((bestaandeKansen ?? []) as { id: string }[])
    .map((k) => k.id)
    .filter((id) => !behouden.has(id));
  for (const id of vervallen) {
    await admin.from("sales_opportunities").delete().eq("id", id);
  }

  // ⚠️ De kansen van de VORIGE ronde worden gemarkeerd en niet verwijderd. Een
  // verkoper die vorige maand een kans kreeg toegewezen, moet die kunnen
  // terugvinden, ook als de nieuwe meting hem anders beoordeelt. Zonder deze
  // markering staat er straks een verouderde kans naast een nieuwe zonder dat
  // iemand ziet welke van de twee de actuele is.
  await markeerVorigeRondes(admin, marketId, runId);

  return { bedrijven: metingen.length, kansen: geschreven, zonderKans };
}

/** Alles wat de detectie van één ronde nodig heeft, in zo min mogelijk query's. */
async function leesMetingen(
  admin: Admin,
  runId: string,
  marketId: string,
  rondeNr: number,
): Promise<BedrijfMeting[]> {
  const [{ data: scoreRijen }, { data: leden }, vermeldingen] = await Promise.all([
    admin
      .from("sales_company_scores")
      .select("company_id, engine, questions_total, mentions, share, weighted_share, stderr, per_intent, sources")
      .eq("run_id", runId),
    admin
      .from("sales_market_companies")
      .select("company_id, sales_companies(id, name, domain, city, crawl_summary)")
      .eq("market_id", marketId)
      .eq("included", true),
    // Pagineren, om dezelfde reden als in `sales-aggregate.ts`: in een markt waar
    // de bedrijven wél gezien worden, loopt het aantal vermeldingen hard op, en
    // een `select` zonder bereik stopt stil na duizend rijen. Hier zou dat
    // betekenen dat een kans zijn bewijs kwijtraakt zonder dat iemand het merkt.
    alleRijen<Record<string, unknown>>((van, tot) =>
      admin
        .from("sales_mentions")
        .select("company_id, answer_id, snippet, sales_answers(question_id, engine)")
        .eq("run_id", runId)
        .eq("mentioned", true)
        .range(van, tot),
    ),
  ]);

  type Lid = {
    company_id: string;
    sales_companies: {
      id: string;
      name: string;
      domain: string | null;
      city: string | null;
      crawl_summary: { secties?: string[] } | null;
    } | null;
  };

  type Vermelding = {
    company_id: string;
    answer_id: string;
    snippet: string | null;
    sales_answers: { question_id: string; engine: string } | null;
  };

  const vorige = await leesVorigeRonde(admin, marketId, rondeNr);

  const perBedrijf = new Map<string, BedrijfMeting>();
  for (const rij of (leden ?? []) as unknown as Lid[]) {
    const c = rij.sales_companies;
    if (!c) continue;
    perBedrijf.set(c.id, {
      companyId: c.id,
      naam: c.name,
      domein: c.domain,
      plaats: c.city,
      secties: (c.crawl_summary?.secties ?? []).map((s) => String(s)),
      alle: leegScore(),
      perEngine: {},
      bronnen: [],
      fragmenten: [],
      vorige: vorige.get(c.id) ?? null,
    });
  }

  for (const s of (scoreRijen ?? []) as Record<string, unknown>[]) {
    const meting = perBedrijf.get(s.company_id as string);
    if (!meting) continue;
    const score: MeetScore = {
      questionsTotal: Number(s.questions_total ?? 0),
      mentions: Number(s.mentions ?? 0),
      share: Number(s.share ?? 0),
      weightedShare: Number(s.weighted_share ?? 0),
      stderr: Number(s.stderr ?? 0),
      perIntent: (s.per_intent ?? {}) as MeetScore["perIntent"],
    };
    if (s.engine === ENGINE_ALLE) {
      meting.alle = score;
      meting.bronnen = ((s.sources ?? []) as { domain: string; count: number }[]) ?? [];
    } else {
      meting.perEngine[s.engine as string] = score;
    }
  }

  for (const v of vermeldingen as unknown as Vermelding[]) {
    const meting = perBedrijf.get(v.company_id);
    if (!meting || !v.sales_answers) continue;
    meting.fragmenten.push({
      answerId: v.answer_id,
      questionId: v.sales_answers.question_id,
      engine: v.sales_answers.engine,
      snippet: v.snippet ?? "",
    });
  }

  return Array.from(perBedrijf.values());
}

/**
 * De vorige ronde van dezelfde markt, als die er is.
 *
 * ⚠️ Op ROND-NUMMER en niet op datum. Twee rondes op één dag komen voor (een
 * mislukte en een geslaagde), en dan is "de vorige" op datum niet te bepalen.
 * Zonder deze functie bestaat opportunitytype 8 niet, en dat is het type waar de
 * hele economie van hermeten aan hangt.
 */
async function leesVorigeRonde(
  admin: Admin,
  marketId: string,
  rondeNr: number,
): Promise<Map<string, NonNullable<BedrijfMeting["vorige"]>>> {
  const uit = new Map<string, NonNullable<BedrijfMeting["vorige"]>>();
  if (rondeNr <= 1) return uit;

  const { data: vorigeRun } = await admin
    .from("sales_runs")
    .select("id")
    .eq("market_id", marketId)
    .eq("round_no", rondeNr - 1)
    .eq("status", "klaar")
    .maybeSingle();
  if (!vorigeRun) return uit;

  const { data } = await admin
    .from("sales_company_scores")
    .select("company_id, engine, weighted_share, stderr")
    .eq("run_id", vorigeRun.id as string);

  for (const s of (data ?? []) as Record<string, unknown>[]) {
    const id = s.company_id as string;
    const bestaand = uit.get(id) ?? { weightedShare: 0, stderr: 0, perEngine: {} };
    if (s.engine === ENGINE_ALLE) {
      bestaand.weightedShare = Number(s.weighted_share ?? 0);
      bestaand.stderr = Number(s.stderr ?? 0);
    } else {
      bestaand.perEngine[s.engine as string] = {
        weightedShare: Number(s.weighted_share ?? 0),
        stderr: Number(s.stderr ?? 0),
      };
    }
    uit.set(id, bestaand);
  }
  return uit;
}

/** De brondomeinen die deze markt bepalen, geteld over alle antwoorden. */
async function leesMarktBronnen(
  admin: Admin,
  runId: string,
): Promise<{ domain: string; count: number }[]> {
  const { data } = await admin.from("sales_answers").select("cited_sources").eq("run_id", runId);

  const teller = new Map<string, number>();
  for (const rij of (data ?? []) as { cited_sources: unknown }[]) {
    const bronnen = Array.isArray(rij.cited_sources) ? (rij.cited_sources as string[]) : [];
    for (const d of new Set(bronnen.map((b) => String(b).trim().toLowerCase()).filter(Boolean))) {
      teller.set(d, (teller.get(d) ?? 0) + 1);
    }
  }
  return Array.from(teller.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}

/** Wat er van het bedrijf zelf nodig is voor de score, buiten de meting om. */
async function leesBedrijfsgegevens(
  admin: Admin,
  companyId: string,
): Promise<{
  heeftContactgegevens: boolean;
  sizeSignal: string;
  doNotContact: boolean;
  eerderAfgewezen: boolean;
}> {
  const { data } = await admin
    .from("sales_companies")
    .select("email, phone, size_signal, do_not_contact, crawl_summary")
    .eq("id", companyId)
    .maybeSingle();

  const samenvatting = (data?.crawl_summary ?? null) as { heeftContactpagina?: boolean } | null;

  return {
    heeftContactgegevens: Boolean(
      data?.email || data?.phone || samenvatting?.heeftContactpagina,
    ),
    sizeSignal: (data?.size_signal as string) ?? "onbekend",
    doNotContact: Boolean(data?.do_not_contact),
    // ⚠️ Sprint 5 vult dit uit `sales_outreach`. Tot die tabel bestaat is dit
    // altijd `false`, en dat staat hier expliciet in plaats van dat de score
    // stilzwijgend een signaal mist dat niemand meer terugvindt.
    eerderAfgewezen: false,
  };
}

/** Het bewijs bij de primaire kans. Geen bewijs is geen claim (plan hoofdstuk 15). */
async function schrijfBewijs(admin: Admin, opportunityId: string, kans: Kans): Promise<void> {
  // Het bewijs hoort bij de meting van dit moment, dus het wordt vervangen en
  // niet aangevuld. De KANS houdt zijn id (zie de upsert hierboven); zijn bewijs
  // volgt de laatste detectie.
  await admin.from("sales_evidence").delete().eq("opportunity_id", opportunityId);

  const rijen: Record<string, unknown>[] = [];
  const gezien = new Set<string>();

  const paren = kans.vragen.map((q, i) => ({ q, a: kans.antwoorden[i] ?? null }));
  for (const { q, a } of paren) {
    const sleutel = `${q}:${a}`;
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    rijen.push({
      opportunity_id: opportunityId,
      question_id: q,
      answer_id: a,
      // Bij een concurrent gap is het bewijs juist de vraag waar de ander wél en
      // dit bedrijf niet genoemd wordt. Dat is een ander soort bewijs, en de
      // lezer hoort te weten welk van de twee hij ziet.
      kind: kans.type === "concurrent_gap" ? "rivaal" : "eigen",
    });
  }

  if (rijen.length === 0) return;
  const { error } = await admin.from("sales_evidence").insert(rijen);
  if (error) throw new Error(`Opslaan van het bewijs mislukt: ${error.message}`);
}

/** De kansen van eerdere rondes wijzen naar hun opvolger. */
async function markeerVorigeRondes(
  admin: Admin,
  marketId: string,
  runId: string,
): Promise<void> {
  const { data: nieuw } = await admin
    .from("sales_opportunities")
    .select("id, company_id")
    .eq("run_id", runId);

  for (const kans of (nieuw ?? []) as { id: string; company_id: string }[]) {
    await admin
      .from("sales_opportunities")
      .update({ superseded_by: kans.id })
      .eq("market_id", marketId)
      .eq("company_id", kans.company_id)
      .neq("run_id", runId)
      .is("superseded_by", null);
  }
}

function gemiddeldePerIntent(metingen: BedrijfMeting[]): Record<string, number> {
  const som = new Map<string, { totaal: number; n: number }>();
  for (const m of metingen) {
    for (const [label, deel] of Object.entries(m.alle.perIntent)) {
      const t = som.get(label) ?? { totaal: 0, n: 0 };
      t.totaal += deel.share;
      t.n += 1;
      som.set(label, t);
    }
  }
  const uit: Record<string, number> = {};
  for (const [label, t] of som) uit[label] = t.n > 0 ? t.totaal / t.n : 0;
  return uit;
}

function leegScore(): MeetScore {
  return {
    questionsTotal: 0,
    mentions: 0,
    share: 0,
    weightedShare: 0,
    stderr: 0,
    perIntent: {},
  };
}
