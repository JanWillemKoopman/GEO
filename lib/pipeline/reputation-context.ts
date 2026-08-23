import "server-only";

/**
 * Wat elke reputatietaak nodig heeft, en de idempotente vraagstelling.
 *
 * ── WAAROM DIT ÉÉN BESTAND IS EN GEEN VIJF KOPIEËN ──────────────────────────
 *
 * Zes taaksoorten stellen vragen aan hetzelfde model over hetzelfde merk, en ze
 * moeten alle zes precies dezelfde dingen doen: het budget aftellen vóór de dure
 * aanroep, de vraag overslaan als het antwoord er al staat, en de kosten aan de
 * juiste run hangen. Dat vijf keer uitschrijven is conventie P2 uitnodigen
 * (`docs/logbook.md`): twee functies die hetzelfde zouden moeten doen, drijven
 * uit elkaar. Dat is met `getOwnedProfile` en `getOwnedAnalysis` letterlijk
 * gebeurd, en het kostte een fout die de eerste klant zou hebben geraakt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEngine } from "@/lib/engines/registry";
import { measureWebSearchEnabled } from "@/lib/config";
import { decideStep, spentOnRunUsd, type ReputationStep } from "@/lib/reputation/budget";
import { citedUrlsFrom } from "@/lib/reputation/sources";
import type {
  Profile,
  ReputationAnswer,
  ReputationBlock,
  ReputationRun,
} from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * De assistent zoals een echte gebruiker hem aantreft. Geen rolinstructie die
 * hem slimmer of strenger maakt dan hij is: dan meet je jouw prompt en niet de
 * assistent. Letterlijk dezelfde keuze als in `llm-baseline.ts`.
 *
 * ⚠️ De laatste zin is geen beleefdheid maar het vangnet uit §2.1. Een taalmodel
 * is standaard vriendelijk over een bedrijf waar het niets van weet, en zonder
 * deze instructie levert dat een welwillend, inhoudsloos antwoord op dat als
 * "positief" beoordeeld wordt. De code vangt dat óók af (de bewijskracht), maar
 * een vraag die eerlijkheid uitnodigt is de goedkoopste helft van de oplossing.
 */
export const REPUTATION_SYSTEM =
  "Je bent een behulpzame AI-assistent, zoals ChatGPT. Antwoord in het Nederlands. " +
  "Ken je een bedrijf niet, of weet je te weinig om er iets zinnigs over te zeggen, zeg dat dan " +
  "expliciet. Een eerlijk 'dat weet ik niet' is beter dan een vriendelijk antwoord dat nergens op " +
  "rust. Noem de bronnen waar je je op baseert.";

export interface ReputationContext {
  run: ReputationRun;
  profile: Profile;
  brandName: string;
  /** De eerste regio, voor in de vraag. Null als het merk er geen heeft. */
  region: string | null;
  /**
   * De zin die gelijknamige bedrijven buiten de meting houdt (migratie 0060).
   *
   * ⚠️ Zonder dit meet je bij een merk als "Van der Valk" de reputatie van
   * vijftig anderen mee. De kennistest verzamelt die uitsluitingen al; hier
   * worden ze alleen gebruikt.
   */
  disambiguation: string;
}

export async function loadContext(admin: Admin, runId: string): Promise<ReputationContext | null> {
  const { data: runRow } = await admin
    .from("reputation_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (!runRow) return null;
  const run = runRow as ReputationRun;

  const { data: profileRow } = await admin
    .from("profiles")
    .select("*")
    .eq("id", run.profile_id)
    .maybeSingle();
  if (!profileRow) return null;
  const profile = profileRow as Profile;

  const brandName = profile.brand_name ?? profile.name;
  const region = profile.service_regions[0] ?? null;

  const delen: string[] = [];
  if (region) delen.push(`Het gaat om het bedrijf in ${region}, niet om gelijknamige bedrijven elders.`);
  if (profile.name_exclusions.length > 0) {
    delen.push(
      `Verwar het niet met: ${profile.name_exclusions.join(", ")}. Dat zijn andere bedrijven.`,
    );
  }

  return { run, profile, brandName, region, disambiguation: delen.join(" ") };
}

/** De vraag zoals hij gesteld wordt, plus waar hij bij hoort. */
export interface PlannedAsk {
  block: ReputationBlock;
  offeringId: string | null;
  question: string;
  webSearch: boolean;
  repeatIndex: number;
  /** Alleen bij een vergelijking: de volgorde waarin de partijen erin gingen. */
  partyOrder?: string[];
}

export interface AskOutcome {
  answer: ReputationAnswer;
  /** Is de vraag nu gesteld, of stond het antwoord er al? */
  asked: boolean;
}

/**
 * Stelt één vraag en slaat het antwoord op, of geeft terug wat er al stond.
 *
 * ── DE IDEMPOTENTIE (conventie 9) ───────────────────────────────────────────
 *
 * Draait een taak twee keer, dan wordt de vraag één keer gesteld. De unieke
 * index uit migratie 0062 dwingt dezelfde sleutel af in de database, zodat de
 * code en de database het niet oneens kunnen worden. Dat is niet theoretisch:
 * elke gegronde vraag is een betaalde web-zoekactie, en een taak die na een
 * time-out opnieuw draait zou de hele analyse een tweede keer betalen.
 *
 * ⚠️ Het antwoord wordt opgeslagen ZONDER oordeel. De beoordeling is een tweede,
 * goedkope stap, en die mag opnieuw zonder dat deze dure aanroep herhaald wordt.
 */
export async function askAndStore(
  admin: Admin,
  ctx: ReputationContext,
  ask: PlannedAsk,
): Promise<AskOutcome> {
  const bestaand = await findAnswer(admin, ctx.run.id, ask);
  if (bestaand && (bestaand.answer_text ?? "").trim().length > 0) {
    return { answer: bestaand, asked: false };
  }

  const engine = getEngine(ctx.run.engine as "openai");
  const gegrond = ask.webSearch && measureWebSearchEnabled;
  const r = await engine.callPlain({
    system: REPUTATION_SYSTEM,
    user: ask.question,
    // De zoekfunctie volgt de bestaande kostenknop. Staat die uit
    // (ontwikkelfase), dan draaien de gegronde blokken zonder zoeken. Dat is een
    // ander antwoord, en dat leggen we vast in `web_search` zodat de uitslag
    // niet later als representatief gelezen wordt.
    webSearch: gegrond,
    meta: {
      kind: `reputation_${ask.block}`,
      profileId: ctx.profile.id,
      engine: ctx.run.engine,
      reputationRunId: ctx.run.id,
    },
  });

  // Vóór het opslaan controleren, niet erna: eenmaal opgeslagen wordt de vraag
  // nooit meer gesteld, en dan zou een leeg antwoord voorgoed als meting blijven
  // staan. Dezelfde volgorde als bij halte 3a van de meting.
  if (r.text.trim().length < 40) {
    throw new Error(
      `Leeg of onbruikbaar kort antwoord op "${ask.question.slice(0, 60)}" ` +
        `(${r.text.trim().length} tekens). Dat is een meetfout, geen uitkomst.`,
    );
  }

  // ⚠️ Een gewone `insert` en bewust GEEN `upsert`. De unieke index die de
  // ontdubbeling doet staat op een uitdrukking (`coalesce` op `offering_id` en
  // `md5` op de vraag), en zo'n index kan Postgres niet als ON CONFLICT-doel
  // gebruiken. Een upsert zou dus op de primaire sleutel moeten mikken, en die
  // botst per definitie nooit: dat leest als bescherming terwijl het er geen is.
  //
  // De echte bescherming is tweeledig en staat hierboven en hieronder: eerst
  // kijken of het antwoord er al staat, en bij een race de unieke index laten
  // winnen en ophalen wat de ander schreef.
  const { data, error } = await admin
    .from("reputation_answers")
    .insert({
      run_id: ctx.run.id,
      block: ask.block,
      offering_id: ask.offeringId,
      question: ask.question,
      web_search: gegrond,
      repeat_index: ask.repeatIndex,
      answer_text: r.text,
      raw_json: r.raw as never,
      // ⚠️ Een antwoord dat niet mocht opzoeken draagt geen bronnen. De reden
      // staat bij `citedUrlsFrom()`, en hij is duurder dan hij lijkt.
      cited_urls: citedUrlsFrom(r.text, r.raw, gegrond),
      party_order: ask.partyOrder ?? [],
      model: r.model,
      cost_usd: r.costUsd,
    })
    .select("*")
    .single();

  if (error || !data) {
    // Race met een tweede werker die dezelfde vraag pakte: de unieke index wint.
    // Gewoon ophalen wat er staat, dan is het antwoord er alsnog.
    const geraced = await findAnswer(admin, ctx.run.id, ask);
    if (geraced) return { answer: geraced, asked: false };
    throw new Error(`Antwoord opslaan mislukt voor run ${ctx.run.id}: ${error?.message}`);
  }

  return { answer: data as ReputationAnswer, asked: true };
}

async function findAnswer(
  admin: Admin,
  runId: string,
  ask: PlannedAsk,
): Promise<ReputationAnswer | null> {
  let query = admin
    .from("reputation_answers")
    .select("*")
    .eq("run_id", runId)
    .eq("block", ask.block)
    .eq("question", ask.question)
    .eq("repeat_index", ask.repeatIndex);

  query = ask.offeringId
    ? query.eq("offering_id", ask.offeringId)
    : query.is("offering_id", null);

  const { data } = await query.maybeSingle();
  return (data as ReputationAnswer | null) ?? null;
}


/**
 * De budgetpoort vóór een zware stap (§2.3 en §7).
 *
 * ⚠️ Staat vóór ELKE zware taak en niet alleen aan het begin. Dat is wat de
 * volgorde uit §2.3 laat werken: de vergelijkingstaken worden ná de
 * reputatietaken ingepland, dus als het budget vol loopt vallen zij als eerste
 * af en blijft de basisanalyse overeind. Zou de poort alleen bij de start
 * tellen, dan kwam die volgorde nergens op neer.
 *
 * Geeft `false` terug én schrijft de notitie weg. Overslaan is een uitkomst,
 * geen stilte.
 */
export async function budgetAllows(
  admin: Admin,
  run: ReputationRun,
  step: ReputationStep,
  times = 1,
): Promise<boolean> {
  const spent = await spentOnRunUsd(admin, run.id);
  const oordeel = decideStep({ step, spentUsd: spent, budgetEur: run.budget_eur, times });
  if (oordeel.ok) return true;

  await addNote(admin, run.id, oordeel.note as string);
  // De run gaat op `budget_op` en niet op `klaar`. De klant ziet dan een cijfer
  // met een kanttekening in plaats van een cijfer dat doet alsof er niets aan de
  // hand was.
  await admin
    .from("reputation_runs")
    .update({ status: "budget_op" })
    .eq("id", run.id)
    .in("status", ["queued", "running"]);

  return false;
}

/** Een notitie erbij, zonder de bestaande te overschrijven en zonder dubbelen. */
export async function addNote(admin: Admin, runId: string, note: string): Promise<void> {
  const { data } = await admin
    .from("reputation_runs")
    .select("notes")
    .eq("id", runId)
    .maybeSingle();

  const huidig = ((data?.notes as string[] | null) ?? []).filter(Boolean);
  if (huidig.includes(note)) return;

  await admin
    .from("reputation_runs")
    .update({ notes: [...huidig, note] })
    .eq("id", runId);
}
