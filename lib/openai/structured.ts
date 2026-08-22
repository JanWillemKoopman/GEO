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
import { logAiCall, type CallMeta } from "@/lib/openai/ledger";
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
    };
  }

  const openai = getOpenAI();

  // Eén budget voor de HELE aanroep, dus buiten withTemperatureFallback: die kan
  // een tweede poging doen, en twee losse budgetten zouden samen het dubbele van
  // de bovengrens opleveren waar lib/jobs/worker.ts op rekent.
  const budget = callBudget();
  const response = await withTemperatureFallback(tuningFor(opts.model, opts.work), (tuning) =>
    openai.responses.parse(
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
    ),
  );

  const parsed = response.output_parsed;
  if (parsed == null) {
    throw new Error(
      `OpenAI gaf geen geldig geparst resultaat voor schema "${opts.schemaName}". ` +
        `Ruwe status: ${response.status ?? "onbekend"}.`,
    );
  }

  const usage = await recordUsage(opts.model, Boolean(opts.webSearch), response, opts.meta);

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
    });
  }

  return { responseId, tokensUsed: totalTokens, inputTokens, outputTokens, costUsd };
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
    };
  }

  const openai = getOpenAI();

  // Zie callStructured: één budget over beide pogingen heen.
  const budget = callBudget();
  const response = await withTemperatureFallback(tuningFor(opts.model, opts.work), (tuning) =>
    openai.responses.create(
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
    ),
  );

  const usage = await recordUsage(opts.model, Boolean(opts.webSearch), response, opts.meta);

  return { text: response.output_text ?? "", raw: response, ...usage };
}
