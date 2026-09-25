import "server-only";

/**
 * Helper rond de OpenAI **Responses API** met **structured output** (Zod) en de
 * optionele **web_search**-tool. Dit is het enige aanroeppunt dat de hele
 * pipeline gebruikt (abcplan.md §2/§6/§7/§8).
 *
 * Kernprincipe (§5): we bewaren ALLES. Daarom geeft deze helper naast het
 * geparste object ook de volledige ruwe response terug, zodat de aanroeper die
 * in de bijbehorende `raw_json`-kolom kan wegschrijven.
 */
import type { ZodType } from "zod";
import type OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI, callBudget } from "@/lib/openai/client";
import { estimateCostUsd } from "@/lib/openai/pricing";
import { logAiCall, type AiCallInput, type CallMeta } from "@/lib/openai/ledger";
import {
  isUnsupportedTemperatureError,
  resolveTuning,
  type CallTuning,
  type WorkKind,
} from "@/lib/openai/sampling";

export type { CallMeta };

/**
 * Heeft de API de temperatuur geaccepteerd? Zodra hij hem één keer weigert,
 * gaat deze vlag om en sturen we hem voor de rest van het proces niet meer mee.
 *
 * WAAROM. GPT-5.6 accepteert `temperature` alleen bij effort `none`
 * (lib/openai/sampling.ts). Dat is de regel zoals hij nu geldt, maar het is een
 * regel van OpenAI en niet van ons: scherpen ze hem aan, dan zou élke
 * classificatie-call in de app op een 400 stuklopen, midden in een meetronde
 * die per prompt al betaald web_search-werk heeft gedaan. Deze vlag maakt dat
 * een eenmalige, zelfherstellende hik in plaats van een storing. Conventie 1:
 * een aanname over het model krijgt een vangnet in code.
 */
let temperatureSupported = true;

/** Vertaalt soort werk naar API-parameters, met de huidige stand van de vlag. */
function tuningFor(model: string, work: WorkKind | undefined): CallTuning {
  return resolveTuning(model, work ?? "simulation", temperatureSupported);
}

/**
 * Voert de aanroep uit en herhaalt hem één keer zónder temperatuur als dat het
 * enige struikelblok was. Elke andere fout gaat ongewijzigd omhoog, de
 * retry-laag van de SDK (429/5xx) en die van de jobwachtrij zitten daar al op.
 */
async function withTemperatureFallback<R>(
  tuning: CallTuning,
  send: (tuning: CallTuning) => Promise<R>,
): Promise<R> {
  try {
    return await send(tuning);
  } catch (err) {
    if (tuning.temperature === undefined || !isUnsupportedTemperatureError(err)) throw err;
    temperatureSupported = false;
    return await send({ ...tuning, temperature: undefined });
  }
}

/**
 * De redeneerinspanning zoals de Responses API hem verwacht.
 *
 * De cast is nodig omdat de vastgezette SDK (openai 4.104) van vóór de
 * GPT-5-familie stamt: zijn `ReasoningEffort` kent alleen `low | medium | high`,
 * terwijl GPT-5.6 ook `none`, `xhigh` en `max` accepteert. De waarde gaat
 * ongewijzigd de HTTP-body in, dus dit is puur een typegat en geen gedrag.
 * Verdwijnt zodra de SDK meegaat naar v7.
 */
function reasoningParam(tuning: CallTuning): OpenAI.Reasoning | undefined {
  if (!tuning.reasoningEffort) return undefined;
  return { effort: tuning.reasoningEffort } as unknown as OpenAI.Reasoning;
}

/** De invoer van een aanroep zoals `ai_calls.input_json` hem bewaart (migratie 0112). */
function invoerVan(
  opts: { system: string; user: string; work?: WorkKind; webSearch?: boolean },
  tuning: CallTuning,
  schemaName: string | null,
): AiCallInput {
  return {
    system: opts.system,
    user: opts.user,
    schemaName,
    work: opts.work ?? "simulation",
    reasoningEffort: tuning.reasoningEffort ?? null,
    temperature: tuning.temperature ?? null,
    webSearch: Boolean(opts.webSearch),
  };
}

/**
 * Haalt de tokenaantallen uit een Responses-antwoord. De SDK-typering dekt niet
 * elke veldnaam die de API teruggeeft, vandaar de defensieve uitlezing: liever
 * een ontbrekend getal dan een harde fout in de kostenregistratie.
 */
function readUsage(usage: unknown): {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
} {
  const u = (usage ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
  return {
    inputTokens: num(u.input_tokens),
    outputTokens: num(u.output_tokens),
    totalTokens: num(u.total_tokens),
  };
}

/**
 * Web-search-tool op de Responses API.
 * ⚠️ OpenAI/de SDK gebruikt hiervoor momenteel de naam `web_search_preview`
 * (eerdere/latere SDK-versies kunnen `web_search` verwachten). Eén constante,
 * één plek om bij te stellen. Zie ook scripts/test-openai.ts.
 */
export const WEB_SEARCH_TOOL: OpenAI.Responses.Tool = { type: "web_search_preview" };

export interface StructuredCallOptions<T> {
  model: string;
  /** Systeem-/rolinstructie (de "wie ben je en wat moet je doen"). */
  system: string;
  /** De concrete gebruikersinput/context (crawltekst, Brand DNA, meetdata, ...). */
  user: string;
  /** Zod-schema dat de output afdwingt (de contracten in lib/schemas). */
  schema: ZodType<T>;
  /** Naam van het schema (verplicht voor de Responses API). */
  schemaName: string;
  /** web_search-tool aanzetten? Alleen waar echt nodig (§10 kostenknop). */
  webSearch?: boolean;
  /**
   * Wat voor werk is dit? Daaruit volgen temperatuur én redeneerinspanning
   * (lib/openai/sampling.ts), zodat die keuze op één plek vastligt
   * (optimalisatie.md 0.5) en niet per aanroep opnieuw bedacht wordt.
   * Weglaten = `simulation`: geen enkele parameter, puur de modelstandaard,
   * wat je alleen wilt bij de simulatie-call (halte 3a).
   */
  work?: WorkKind;
  /**
   * Waar hoort deze aanroep bij (optimalisatie.md 0.6)? Meegeven → de aanroep
   * wordt automatisch geregistreerd in `ai_calls`. Weglaten → geen registratie
   * (bv. in scripts/test-openai.ts, dat geen database nodig heeft).
   */
  meta?: CallMeta;
}

/** Tokens + geschatte kosten van één aanroep, gedeeld door beide call-varianten. */
export interface CallUsage {
  /** OpenAI response-id (kostenbewaking / audit). */
  responseId: string | null;
  /** Totaal gebruikte tokens, indien beschikbaar. */
  tokensUsed: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Geschatte kosten in USD: zie lib/openai/pricing.ts. */
  costUsd: number;
  /**
   * Hoe lang de aanroep duurde, in milliseconden (migratie 0114). `null` bij de
   * teststub, want daar is niets aangeroepen.
   */
  durationMs: number | null;
}

export interface StructuredCallResult<T> extends CallUsage {
  /** Het geparste, type-safe object. */
  parsed: T;
  /** De volledige ruwe response, wegschrijven naar raw_json (§5). */
  raw: unknown;
}

/**
 * Injectiepunt voor de ketentest (implementatieplan.md S7).
 *
 * De ketentest draait de échte jobhandlers tegen een échte Postgres, maar mag
 * geen OpenAI aanroepen: dat kost geld, is traag en geeft elke keer een ander
 * antwoord, en dan test je het model in plaats van de bedrading. De stub geeft
 * per `schemaName` een vast, realistisch antwoord terug, ontleend aan de ruwe
 * responses die al in `ai_calls` staan.
 *
 * Zetten kan alleen buiten productie; zie de toelichting bij
 * `__setTestAdminClient()` in lib/supabase/admin.ts voor waarom dit hier staat
 * en niet als losse laag eromheen.
 */
export type StructuredTransport = <T>(
  opts: StructuredCallOptions<T>,
) => Promise<{ parsed: T; raw: unknown }>;

let testTransport: StructuredTransport | null = null;

export function __setTestTransport(transport: StructuredTransport | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("De teststub mag niet in productie gezet worden.");
  }
  testTransport = transport;
}

export async function callStructured<T>(
  opts: StructuredCallOptions<T>,
): Promise<StructuredCallResult<T>> {
  if (testTransport) {
    const { parsed, raw } = await testTransport(opts);
    // Geen kostenregistratie: er is niets aangeroepen, en een gelogde aanroep
    // die nooit plaatsvond maakt de kostenboekhouding onbetrouwbaar.
    return {
      parsed,
      raw,
      responseId: null,
      tokensUsed: null,
      inputTokens: null,
      outputTokens: null,
      costUsd: 0,
      durationMs: null,
    };
  }

  const openai = getOpenAI();

  // Eén budget voor de HELE aanroep, dus buiten withTemperatureFallback: die kan
  // een tweede poging doen, en twee losse budgetten zouden samen het dubbele van
  // de bovengrens opleveren waar lib/jobs/worker.ts op rekent.
  const budget = callBudget();
  // De duur van de hele aanroep, pogingen binnen de SDK meegerekend (migratie 0114).
  const begin = Date.now();
  // De instellingen zoals ze WERKELIJK verstuurd zijn: na een geweigerde
  // temperatuur is dat de tweede poging, niet de eerste (migratie 0112).
  let verstuurd: CallTuning = tuningFor(opts.model, opts.work);
  const response = await withTemperatureFallback(verstuurd, (tuning) => {
    verstuurd = tuning;
    return openai.responses.parse(
      {
        model: opts.model,
        input: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        tools: opts.webSearch ? [WEB_SEARCH_TOOL] : undefined,
        temperature: tuning.temperature,
        reasoning: reasoningParam(tuning),
        text: {
          format: zodTextFormat(opts.schema, opts.schemaName),
        },
      },
      budget,
    );
  }).catch(async (err: unknown) => {
    // ⚠️ Punt 18 van de kwaliteitsdoorlichting: het model begon soms met
    // hardop denken ("We need ou...") in plaats van met het gevraagde JSON, en
    // de SDK gooit dan bij het parsen, vóór `recordUsage()`. Zo'n aanroep kost
    // wel geld maar stond nergens, en het aandeel was niet te meten. Nu komt
    // hij in `ai_calls` met de foutmelding als uitvoer; kosten en tokens zijn
    // dan onbekend (0 en null), want het antwoordobject is er niet.
    if (opts.meta && isParseFout(err)) {
      await logAiCall(opts.meta, {
        model: opts.model,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        webSearch: Boolean(opts.webSearch),
        costUsd: 0,
        responseId: null,
        raw: { mislukt: true, fout: String((err as Error)?.message ?? err).slice(0, 2000) },
        input: invoerVan(opts, verstuurd, opts.schemaName),
        durationMs: Date.now() - begin,
      });
    }
    throw err;
  });

  const parsed = response.output_parsed;
  if (parsed == null) {
    throw new Error(
      `OpenAI gaf geen geldig geparst resultaat voor schema "${opts.schemaName}". ` +
        `Ruwe status: ${response.status ?? "onbekend"}.`,
    );
  }

  const usage = await recordUsage(
    opts.model,
    Boolean(opts.webSearch),
    response,
    opts.meta,
    parsed,
    invoerVan(opts, verstuurd, opts.schemaName),
    Date.now() - begin,
  );

  return { parsed: parsed as T, raw: response, ...usage };
}

/**
 * Leest de tokens uit, schat de kosten en registreert de aanroep (als er `meta`
 * is). Gedeeld door callStructured en callPlain zodat er maar één plek is waar
 * kosten berekend worden.
 */
async function recordUsage(
  model: string,
  webSearch: boolean,
  response: { id?: string | null; usage?: unknown },
  meta?: CallMeta,
  /**
   * Wat het model teruggaf, ruw. Gaat mee het kostenlogboek in (conventie 8).
   *
   * ⚠️ Toegevoegd op 1 september 2026, en de aanleiding was een conceptmail die
   * werd afgekeurd omdat er een cijfer in stond dat niet gemeten was. Wat er
   * precies stond, was daarna nergens meer terug te lezen: we bewaarden wel wat
   * de aanroep kostte, niet wat hij opleverde. Bij een bericht dat naar een
   * ondernemer gaat, is dat het verkeerde moment om je bron kwijt te zijn.
   */
  ruw?: unknown,
  /** Wat er naar het model ging (migratie 0112). */
  invoer?: AiCallInput,
  /** Hoe lang de aanroep duurde (migratie 0114). */
  durationMs: number | null = null,
): Promise<CallUsage> {
  const { inputTokens, outputTokens, totalTokens } = readUsage(response.usage);
  const costUsd = estimateCostUsd({ model, inputTokens, outputTokens, webSearch });
  const responseId = response.id ?? null;

  if (meta) {
    await logAiCall(meta, {
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      webSearch,
      costUsd,
      responseId,
      raw: ruw ?? null,
      input: invoer ?? null,
      durationMs,
    });
  }

  return { responseId, tokensUsed: totalTokens, inputTokens, outputTokens, costUsd, durationMs };
}

export interface PlainCallOptions {
  model: string;
  system: string;
  user: string;
  webSearch?: boolean;
  /** Zie StructuredCallOptions.work. Bewust leeg laten bij halte 3a. */
  work?: WorkKind;
  /** Zie StructuredCallOptions.meta. */
  meta?: CallMeta;
}

export interface PlainCallResult extends CallUsage {
  /** De vrije-tekst antwoordinhoud. */
  text: string;
  raw: unknown;
}

/**
 * Vrije-tekst call (GEEN structured output), voor halte 3a (abcplan.md §6 A3):
 * simuleert wat een AI-assistent een echte klant zou antwoorden. Structured
 * output zou het model dwingen tot JSON i.p.v. een natuurlijk antwoord.
 */
/**
 * Hetzelfde injectiepunt als `__setTestTransport`, maar voor de vrije-tekst-
 * aanroep.
 *
 * ── WAAROM DIT ER PAS IN AUGUSTUS 2026 BIJ KOMT ─────────────────────────────
 *
 * Tot Mijn reputatie had geen enkele ketentest een `callPlain` nodig: de meting
 * (halte 3a) is de enige andere gebruiker, en die wordt in `test-chain.ts` met
 * voorgebakken rijen in `tracking_runs` nagebootst in plaats van gedraaid.
 *
 * Mijn reputatie kan dat niet. Zes taaksoorten wachten daar op elkaar via een
 * afteller op het aantal opgeslagen ANTWOORDEN, en juist die samenhang is wat de
 * ketentest moet toetsen (§9: zeven van de zeven fouten van het vorige traject
 * zaten in de samenhang tussen taken). Rijen vooraf klaarzetten zou precies het
 * stuk overslaan dat getest moet worden.
 */
export type PlainTransport = (
  opts: PlainCallOptions,
) => Promise<{ text: string; raw: unknown }>;

let testPlainTransport: PlainTransport | null = null;

export function __setTestPlainTransport(transport: PlainTransport | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("De teststub mag niet in productie gezet worden.");
  }
  testPlainTransport = transport;
}

export async function callPlain(opts: PlainCallOptions): Promise<PlainCallResult> {
  if (testPlainTransport) {
    const { text, raw } = await testPlainTransport(opts);
    // Geen kostenregistratie, zelfde reden als bij `callStructured`: een
    // gelogde aanroep die nooit plaatsvond maakt de boekhouding onbetrouwbaar.
    return {
      text,
      raw,
      responseId: null,
      tokensUsed: null,
      inputTokens: null,
      outputTokens: null,
      costUsd: 0,
      durationMs: null,
    };
  }

  const openai = getOpenAI();

  // Zie callStructured: één budget over beide pogingen heen.
  const budget = callBudget();
  const begin = Date.now();
  let verstuurd: CallTuning = tuningFor(opts.model, opts.work);
  const response = await withTemperatureFallback(verstuurd, (tuning) => {
    verstuurd = tuning;
    return openai.responses.create(
      {
        model: opts.model,
        input: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        tools: opts.webSearch ? [WEB_SEARCH_TOOL] : undefined,
        temperature: tuning.temperature,
        reasoning: reasoningParam(tuning),
      },
      budget,
    );
  });

  const usage = await recordUsage(
    opts.model,
    Boolean(opts.webSearch),
    response,
    opts.meta,
    response.output_text ?? "",
    invoerVan(opts, verstuurd, null),
    Date.now() - begin,
  );

  return { text: response.output_text ?? "", raw: response, ...usage };
}

/** Is dit een fout bij het lezen van het antwoord als JSON, en niet bij het versturen? */
export function isParseFout(err: unknown): boolean {
  const naam = (err as { name?: string } | null)?.name ?? "";
  const tekst = String((err as { message?: string } | null)?.message ?? err ?? "");
  return naam === "SyntaxError" || /is not valid JSON|Unexpected token|Unexpected end of JSON/i.test(tekst);
}

// ════════════════════════════════════════════════════════════════════════════
// De ACHTERGRONDMODUS (WP3 van docs/tasks/contentpijplijn-publicatiewaardig.md)
//
// Paginastrategie en eindredactie draaien op Sol met denktijd hoog, en een
// aanroep mag hoogstens `CALL_BUDGET_MS` (150 seconden) duren. Loopt hij daar
// overheen, dan breekt de taak af, probeert de wachtrij het opnieuw en betaalt
// de app de duurste aanroep twee keer. In de achtergrondmodus start de taak de
// aanroep bij OpenAI en bewaart hij alleen het response-id; een vervolgtaak
// haalt het resultaat op. Een nieuwe poging haalt dan op in plaats van opnieuw
// te starten, dus een time-out kost nooit een tweede aanroep.
//
// Wanneer de modus aangaat, beslist `moetAchtergrond()` in
// `lib/openai/achtergrond.ts` op de gemeten duur (`ai_calls.duration_ms`).
// ════════════════════════════════════════════════════════════════════════════

/** In de ketentest: gestarte aanroepen, op hun nep-id. */
const testAchtergrond = new Map<string, StructuredCallOptions<unknown>>();
let testAchtergrondTeller = 0;

/** Voor de ketentest: hoeveel achtergrondaanroepen er gestart zijn (dus betaald zouden worden). */
export function __aantalAchtergrondStarts(): number {
  return testAchtergrondTeller;
}

/**
 * Start een aanroep in de achtergrondmodus. Geeft alleen het response-id terug;
 * het resultaat komt met `haalStructuredOp()`.
 */
export async function startStructuredAchtergrond<T>(opts: StructuredCallOptions<T>): Promise<{ responseId: string }> {
  if (testTransport) {
    const responseId = `stub-achtergrond-${++testAchtergrondTeller}`;
    testAchtergrond.set(responseId, opts as StructuredCallOptions<unknown>);
    return { responseId };
  }
  const openai = getOpenAI();
  // Geen temperatuur-terugval: de achtergrondmodus is voor redeneerwerk, en daar
  // gaat nooit een temperatuur mee (`resolveTuning()`).
  const tuning = tuningFor(opts.model, opts.work);
  // ⚠️ `background` kent de vastgezette SDK (4.104) nog niet; de waarde gaat
  // ongewijzigd de HTTP-body in. Zelfde soort typegat als `reasoningParam()`.
  const response = await openai.responses.create(
    {
      model: opts.model,
      input: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      tools: opts.webSearch ? [WEB_SEARCH_TOOL] : undefined,
      temperature: tuning.temperature,
      reasoning: reasoningParam(tuning),
      text: { format: zodTextFormat(opts.schema, opts.schemaName) },
      background: true,
      store: true,
    } as unknown as OpenAI.Responses.ResponseCreateParamsNonStreaming,
    callBudget(),
  );
  if (!response.id) throw new Error("OpenAI gaf geen response-id terug voor de achtergrondaanroep.");
  return { responseId: response.id };
}

export type AchtergrondUitkomst<T> =
  | { stand: "bezig"; status: string }
  | { stand: "klaar"; result: StructuredCallResult<T> }
  | { stand: "mislukt"; status: string; fout: string };

/** De tekst uit een Responses-antwoord, ook als de SDK `output_text` niet invult. */
function uitvoerTekst(response: unknown): string {
  const r = response as { output_text?: unknown; output?: unknown };
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  const delen: string[] = [];
  for (const item of Array.isArray(r.output) ? r.output : []) {
    const inhoud = (item as { content?: unknown }).content;
    for (const c of Array.isArray(inhoud) ? inhoud : []) {
      const t = (c as { type?: unknown; text?: unknown });
      if (t.type === "output_text" && typeof t.text === "string") delen.push(t.text);
    }
  }
  return delen.join("");
}

/**
 * Haal het resultaat van een achtergrondaanroep op. `bezig` zolang OpenAI nog
 * rekent; `klaar` met hetzelfde resultaat als `callStructured()`, inclusief de
 * registratie in `ai_calls` (één keer, hier); `mislukt` als OpenAI hem afbrak.
 *
 * `gestartOp` is het moment van starten, zodat de gemeten duur de hele aanroep
 * is en niet alleen het ophalen.
 */
export async function haalStructuredOp<T>(
  responseId: string,
  opts: StructuredCallOptions<T>,
  gestartOp: string,
): Promise<AchtergrondUitkomst<T>> {
  if (testTransport) {
    const gestart = testAchtergrond.get(responseId);
    if (!gestart) return { stand: "mislukt", status: "onbekend", fout: `Geen gestarte aanroep ${responseId}.` };
    // Niet uit de lijst halen: de echte API geeft een voltooide aanroep bij elke
    // opvraging opnieuw terug, en een tweede ophaalpoging moet dat ook kunnen.
    const { parsed, raw } = await testTransport(opts);
    return {
      stand: "klaar",
      result: { parsed, raw, responseId, tokensUsed: null, inputTokens: null, outputTokens: null, costUsd: 0, durationMs: null },
    };
  }

  const openai = getOpenAI();
  const response = await openai.responses.retrieve(responseId, {}, callBudget());
  const status = String((response as { status?: unknown }).status ?? "onbekend");
  if (status === "queued" || status === "in_progress") return { stand: "bezig", status };
  if (status !== "completed") {
    return { stand: "mislukt", status, fout: `OpenAI brak de achtergrondaanroep af met status "${status}".` };
  }

  const duur = Date.now() - new Date(gestartOp).getTime();
  const tuning = tuningFor(opts.model, opts.work);
  let parsed: T;
  try {
    parsed = opts.schema.parse(JSON.parse(uitvoerTekst(response)));
  } catch (err) {
    // Zelfde vangnet als bij `callStructured()` (punt 18): wel betaald, dus wel
    // in het logboek, met de fout als uitvoer.
    if (opts.meta) {
      await logAiCall(opts.meta, {
        model: opts.model,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        webSearch: Boolean(opts.webSearch),
        costUsd: 0,
        responseId,
        raw: { mislukt: true, fout: String((err as Error)?.message ?? err).slice(0, 2000) },
        input: invoerVan(opts, tuning, opts.schemaName),
        durationMs: duur,
      });
    }
    return { stand: "mislukt", status, fout: `Het antwoord paste niet op het schema: ${String(err)}` };
  }

  const usage = await recordUsage(
    opts.model,
    Boolean(opts.webSearch),
    response as { id?: string | null; usage?: unknown },
    opts.meta,
    parsed,
    invoerVan(opts, tuning, opts.schemaName),
    duur,
  );
  return { stand: "klaar", result: { parsed, raw: response, ...usage } };
}
