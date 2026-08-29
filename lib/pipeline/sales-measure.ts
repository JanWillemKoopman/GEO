import "server-only";

/**
 * Stap 6 en 7: één vraag stellen aan één engine, en het antwoord beoordelen
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 11 en §7.2)
 *
 * ── DEZELFDE OPZET ALS DE KLANTMETING, MET ÉÉN GROOT VERSCHIL ───────────────
 *
 * `lib/pipeline/measure.ts` meet één merk: staat het erin of niet. Hier gaan
 * dertig bedrijven door hetzelfde antwoord, en dat verandert twee dingen:
 *
 * 1. **De beoordeling is pure ontdekking.** De namen van de dertig bedrijven
 *    gaan NIET mee in de prompt. Dezelfde reden als bij de klantmeting (migratie
 *    0026): een vooraf meegegeven lijst richt het model op die namen in plaats
 *    van op wat er staat. Bij dertig namen weegt dat zwaarder, en het maakt de
 *    beoordeling bovendien duur. Het model somt op wie het ziet; het koppelen
 *    gebeurt daarna deterministisch in `lib/sales/match.ts`.
 * 2. **Een naam die nergens bij hoort, is informatie** (plan 9.1, laatste rij).
 *    Ofwel onze marktinventarisatie miste een bedrijf, ofwel de engine verzint
 *    een naam. Het eerste betekent een gemiste prospect, het tweede dat deze
 *    meting minder waard is dan hij lijkt. Allebei wordt vastgelegd op het
 *    antwoord en getoond, geen van beide wordt stil weggegooid.
 *
 * ── DE TWEE HALTES, EN WAAROM DE TWEEDE NOOIT DE EERSTE HERHAALT ────────────
 *
 * 6 is de dure aanroep met web-zoeken; 7 is de goedkope beoordeling. Slaagt 6 en
 * faalt 7, dan wordt bij de volgende poging alléén 7 opnieuw gedaan, op het al
 * opgeslagen antwoord. Zonder die scheiding kost elke mislukte beoordeling een
 * tweede betaalde zoekactie, en dat is bij veertig vragen maal twee engines geen
 * detail.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { getEngine } from "@/lib/engines/registry";
import type { EngineId } from "@/lib/engines/types";
import { measureWebSearchEnabled } from "@/lib/config";
import { SalesAnswerJudgement } from "@/lib/schemas/sales";
import { textContainsName } from "@/lib/entities/normalize";
import { normalizePosition } from "@/lib/pipeline/position";
import { koppelAntwoord, type HerkenbaarBedrijf } from "@/lib/sales/match";
import { beoordeelBudget, besteedAanMarkt } from "@/lib/sales/budget";
import { domainOf } from "@/lib/offsite/domain";
import {
  SIMULATIE_SYSTEM,
  BEOORDEEL_SYSTEM,
  bouwBeoordeelVraag,
} from "@/lib/sales/measure-prompt";

type Admin = SupabaseClient;

/**
 * Onder hoeveel tekens is een antwoord een meetfout in plaats van een meting?
 *
 * Exact dezelfde grens en dezelfde reden als in `lib/pipeline/measure.ts`: een
 * leeg antwoord levert "geen enkel bedrijf genoemd" op, en dat gaat als echte
 * meting de score in. Dan is de hele markt onzichtbaar door een storing, en
 * onzichtbaarheid is hier precies het signaal waar de module op afgaat.
 */
const MIN_ANTWOORD_TEKENS = 40;

export interface MeetUitkomst {
  /** Overgeslagen: het antwoord stond er al, of het plafond zat vol. */
  skipped: boolean;
  melding: string | null;
  gekoppeld: number;
  onbekend: string[];
}

export async function meetVraag(
  admin: Admin,
  runId: string,
  questionId: string,
  engineId: EngineId,
): Promise<MeetUitkomst> {
  const { data: vraag } = await admin
    .from("sales_questions")
    .select("id, run_id, text, active")
    .eq("id", questionId)
    .maybeSingle();
  if (!vraag) throw new Error(`Vraag ${questionId} bestaat niet.`);
  if (vraag.active === false) {
    return { skipped: true, melding: "Deze vraag is bij poort 2 uit de lijst gehaald.", gekoppeld: 0, onbekend: [] };
  }

  const { data: run } = await admin
    .from("sales_runs")
    .select("id, market_id")
    .eq("id", runId)
    .maybeSingle();
  if (!run) throw new Error(`Meetronde ${runId} bestaat niet.`);
  const marketId = run.market_id as string;

  // ── Halte 6: de vraag stellen ────────────────────────────────────────────
  //
  // Idempotent op (vraag, engine), precies de sleutel van de unieke index in
  // migratie 0071. Staat het antwoord er al, dan wordt de dure aanroep niet
  // herhaald en gaan we door naar de beoordeling.
  const { data: bestaand } = await admin
    .from("sales_answers")
    .select("id, answer_text, cited_sources")
    .eq("question_id", questionId)
    .eq("engine", engineId)
    .maybeSingle();

  let answerId = bestaand?.id as string | undefined;
  let antwoordTekst = (bestaand?.answer_text as string | undefined) ?? "";
  let bronnen: string[] = Array.isArray(bestaand?.cited_sources)
    ? (bestaand?.cited_sources as string[])
    : [];

  if (!answerId) {
    const oordeel = beoordeelBudget(await besteedAanMarkt(admin, marketId), "measure");
    if (!oordeel.ok) return { skipped: true, melding: oordeel.melding, gekoppeld: 0, onbekend: [] };

    const engine = getEngine(engineId);
    const a = await engine.callPlain({
      system: SIMULATIE_SYSTEM,
      user: vraag.text as string,
      webSearch: measureWebSearchEnabled,
      meta: {
        kind: "sales_measure_simulate",
        engine: engineId,
        salesMarketId: marketId,
        salesRunId: runId,
      },
    });

    // Vóór het opslaan controleren en niet erna: eenmaal opgeslagen wordt de
    // dure aanroep nooit meer herhaald, en dan staat een meetfout voorgoed als
    // meting in de tabel.
    if (a.text.trim().length < MIN_ANTWOORD_TEKENS) {
      throw new Error(
        `Lege of onbruikbaar korte respons bij vraag ${questionId} op ${engineId} ` +
          `(${a.text.trim().length} tekens). Dit is een meetfout, geen nulmeting.`,
      );
    }

    const { data: nieuw, error } = await admin
      .from("sales_answers")
      .insert({
        question_id: questionId,
        run_id: runId,
        engine: engineId,
        answer_text: a.text,
        model_used: a.model,
        response_id: a.responseId,
        cost_usd: a.costUsd ?? 0,
        raw: { model: a.model, responseId: a.responseId } as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (error || !nieuw) {
      // Een botsing op de unieke index betekent dat een andere poging deze
      // meting net opsloeg. De aanroep hierboven is al betaald; die rij
      // overnemen is beter dan hem nog drie keer doen (MAX_ATTEMPTS = 4).
      const { data: naRace } = await admin
        .from("sales_answers")
        .select("id, answer_text")
        .eq("question_id", questionId)
        .eq("engine", engineId)
        .maybeSingle();
      if (!naRace) throw new Error(`Opslaan van het antwoord op vraag ${questionId} mislukt.`);
      answerId = naRace.id as string;
      antwoordTekst = naRace.answer_text as string;
    } else {
      answerId = nieuw.id as string;
      antwoordTekst = a.text;
    }
  }

  // Een eerder opgeslagen leeg antwoord mag niet alsnog als "niemand genoemd"
  // de score in. Weggooien en gooien: de volgende poging stelt de vraag opnieuw.
  if (antwoordTekst.trim().length < MIN_ANTWOORD_TEKENS) {
    await admin.from("sales_answers").delete().eq("id", answerId);
    throw new Error(
      `Het opgeslagen antwoord op vraag ${questionId} is onbruikbaar kort; de meting wordt opnieuw gedaan.`,
    );
  }

  // Al beoordeeld? Dan is er niets meer te doen. Eén rij per bedrijf per
  // antwoord, dus de aanwezigheid van rijen is het bewijs.
  const { count } = await admin
    .from("sales_mentions")
    .select("id", { count: "exact", head: true })
    .eq("answer_id", answerId);
  if ((count ?? 0) > 0) {
    return { skipped: true, melding: "Dit antwoord was al beoordeeld.", gekoppeld: 0, onbekend: [] };
  }

  // ── Halte 7: het antwoord beoordelen ─────────────────────────────────────
  const bedrijven = await bedrijvenVanMarkt(admin, marketId);

  const b = await callStructured({
    model: MODELS.volume,
    system: BEOORDEEL_SYSTEM,
    user: bouwBeoordeelVraag(vraag.text as string, antwoordTekst),
    schema: SalesAnswerJudgement,
    schemaName: "sales_answer_judgement",
    webSearch: false,
    work: "deterministic",
    meta: {
      kind: "sales_measure_judge",
      engine: engineId,
      salesMarketId: marketId,
      salesRunId: runId,
    },
  });

  // ⚠️ HET VANGNET (conventie 1). Het model zegt wie het ziet; de TEKST beslist
  // of die naam er echt staat. Dat is exact dezelfde controle als bij de
  // klantmeting, waar `mentioned = true` voorkwam voor merken die nergens in het
  // antwoord stonden. Hier weegt hij zwaarder: een verzonnen vermelding maakt
  // van een prospect een niet-prospect, en dan bellen we hem nooit.
  const genoemd = b.parsed.bedrijven
    .filter((x) => (x.naam ?? "").trim().length > 1)
    .filter((x) => textContainsName(antwoordTekst, x.naam))
    .map((x) => ({
      naam: x.naam.trim(),
      domein: x.website?.trim() || null,
      positie: normalizePosition(x.positie),
      rol: x.rol,
      fragment: (x.fragment ?? "").trim().slice(0, 500),
    }));

  const koppeling = koppelAntwoord(
    genoemd.map((g) => ({ naam: g.naam, domein: g.domein })),
    bedrijven,
  );

  const perCompany = new Map(
    koppeling.gekoppeld.map((k) => [k.companyId, genoemd.find((g) => g.naam === k.genoemdAls)]),
  );

  // Eén rij per bedrijf per antwoord, óók voor de bedrijven die er niet in
  // staan. Die nulrijen zijn geen ruis maar de kern: opportunitytype 1 leeft
  // ervan, en zonder die rijen is "bij deze vraag genoemd noch niet genoemd"
  // niet te onderscheiden van "deze vraag is nooit gesteld".
  const rijen = bedrijven.map((bedrijf) => {
    const hit = perCompany.get(bedrijf.id);
    const mentioned = Boolean(hit);
    return {
      answer_id: answerId,
      run_id: runId,
      company_id: bedrijf.id,
      mentioned,
      // ⚠️ Alleen een rol als het bedrijf genoemd is. Structured output kiest bij
      // twijfel de eerste enum-waarde; bij de klantmeting vulde het model op die
      // manier 10 van de 27 niet-genoemde merken tóch een rol in.
      mention_role: mentioned ? hit?.rol ?? null : null,
      position: mentioned ? hit?.positie ?? null : null,
      snippet: mentioned ? hit?.fragment ?? null : null,
    };
  });

  await admin.from("sales_mentions").delete().eq("answer_id", answerId);
  if (rijen.length > 0) {
    const { error } = await admin.from("sales_mentions").insert(rijen);
    if (error) throw new Error(`Opslaan van de vermeldingen mislukt: ${error.message}`);
  }

  bronnen = Array.from(
    new Set(
      (b.parsed.bronnen ?? [])
        .map((s) => domainOf(String(s).trim()) ?? String(s).trim().toLowerCase())
        .filter((s) => s.length > 2),
    ),
  ).slice(0, 25);

  // ⚠️ De fout wordt WEL gelezen. Deze update draagt het bronnenlandschap
  // (opportunitytype 6) en de namen die wij niet kennen (plan 9.1, laatste rij).
  // Zou hij stil mislukken, dan staat er een meting die compleet lijkt terwijl
  // twee van de acht opportunitytypes er niets uit kunnen halen. Dat is precies
  // wat er in de ketentest gebeurde toen de shim de jsonb-kolom weigerde.
  const { error: bronFout } = await admin
    .from("sales_answers")
    .update({
      cited_sources: bronnen as unknown as Record<string, unknown>,
      unknown_names: koppeling.onbekend.slice(0, 25),
    })
    .eq("id", answerId);
  if (bronFout) {
    throw new Error(`Opslaan van de bronnen bij antwoord ${answerId} mislukt: ${bronFout.message}`);
  }

  return {
    skipped: false,
    melding: null,
    gekoppeld: koppeling.gekoppeld.length,
    onbekend: koppeling.onbekend,
  };
}

/** De goedgekeurde bedrijven van deze markt, met alles wat nodig is om ze te herkennen. */
export async function bedrijvenVanMarkt(
  admin: Admin,
  marketId: string,
): Promise<HerkenbaarBedrijf[]> {
  const { data } = await admin
    .from("sales_market_companies")
    .select("company_id, sales_companies(id, name, name_variants, domain)")
    .eq("market_id", marketId)
    .eq("included", true);

  type Lid = {
    company_id: string;
    sales_companies: {
      id: string;
      name: string;
      name_variants: string[] | null;
      domain: string | null;
    } | null;
  };

  const uit: HerkenbaarBedrijf[] = [];
  for (const rij of (data ?? []) as unknown as Lid[]) {
    const c = rij.sales_companies;
    if (!c) continue;
    uit.push({ id: c.id, name: c.name, nameVariants: c.name_variants ?? [], domain: c.domain ?? null });
  }
  return uit;
}
