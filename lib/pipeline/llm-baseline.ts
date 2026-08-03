import "server-only";

/**
 * De LLM-kennisbasislijn (docs/tasks/onboarding-2.0.md, blok B fase 3).
 *
 * ── WAT DIT MEET, EN WAAROM NIEMAND ANDERS DAT GEEFT ────────────────────────
 *
 * De maandelijkse meting vraagt: word je genoemd als iemand een koopvraag
 * stelt? Dit vraagt iets anders: **wat weet een AI-assistent al over jou, en
 * klopt dat?**
 *
 * Dat is een andere vraag met een ander antwoord. Een bedrijf kan bij nul
 * koopvragen genoemd worden en tóch prima bekend zijn — of andersom, genoemd
 * worden op basis van gegevens die niet kloppen. Voor een ondernemer is
 * *"ChatGPT denkt dat je in Eindhoven zit"* de meest alarmerende uitkomst van
 * de hele onboarding, en het is precies wat een concurrent die alleen
 * zichtbaarheid meet nooit laat zien.
 *
 * ── VIJF BLOKKEN ────────────────────────────────────────────────────────────
 *
 * | blok         | web search | wat het meet |
 * |--------------|------------|--------------|
 * | `kent`       | nee        | parametrische kennis: zit het merk in het model zelf |
 * | `klopt`      | n.v.t.     | deterministisch, in code, tegen de feiten uit fase 0 |
 * | `citeert`    | ja         | welke bronnen haalt de assistent over jou aan |
 * | `verwarring` | ja         | is de naam ambigu (levert aliassen én uitsluitingen) |
 * | `categorie`  | ja         | een nulmeting op merkneutrale koopvragen |
 *
 * `klopt` is geen eigen aanroep: het is het oordeel over het antwoord van
 * `kent`, geveld door `baseline-verdict.ts`. Het model beoordeelt zichzelf niet.
 *
 * ── WAAROM DE BLOKKEN PARALLEL DRAAIEN ──────────────────────────────────────
 *
 * Eén taak = hooguit één zwaar AI-blok (conventie 7). Dit is één blok van
 * hooguit acht korte aanroepen die niet van elkaar afhangen; serieel zou het
 * acht keer de latency kosten en niet in één werker-aanroep passen. Dezelfde
 * vorm als `generate_prompts`, dat drie funnelfases parallel doet.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { enginesForProfile } from "@/lib/engines/registry";
import { buildVerdict, type KnownFact } from "@/lib/pipeline/baseline-verdict";
import { remainingBudgetUsd } from "@/lib/pipeline/onboarding-budget";
import { measureWebSearchEnabled } from "@/lib/config";
import type { EngineAdapter } from "@/lib/engines/types";
import type { HarvestedFact } from "@/lib/pipeline/structured-data";
import type { Profile, ProfileOffering } from "@/lib/types/database";

/**
 * Welke geoogste feiten zich lenen voor een controle. Bewust kort: een
 * omschrijving van 300 tekens gaat een model nooit letterlijk herhalen, en die
 * als "niet genoemd" tellen maakt de uitslag onleesbaar.
 */
const CHECKABLE_KEYS = new Set([
  "naam",
  "adres",
  "telefoon",
  "opgericht",
  "prijsklasse",
  "email",
]);

/** Hoeveel merkneutrale koopvragen we als nulmeting stellen. */
const CATEGORY_QUESTIONS = 3;

/**
 * Een assistent die niets van zoeken weet, precies zoals een echte gebruiker
 * hem aantreft. Geen rolinstructie die hem slimmer maakt dan hij is — dan meet
 * je jouw prompt en niet de assistent.
 */
const NEUTRAL_SYSTEM =
  "Je bent een behulpzame AI-assistent, zoals ChatGPT. Antwoord in het Nederlands, " +
  "kort en feitelijk. Weet je iets niet zeker, zeg dat dan.";

interface PlannedQuestion {
  block: "kent" | "citeert" | "verwarring" | "categorie";
  question: string;
  webSearch: boolean;
}

function planQuestions(
  profile: Profile,
  offerings: ProfileOffering[],
): PlannedQuestion[] {
  const merk = profile.brand_name ?? profile.name;
  const regio = profile.service_regions[0] ?? null;
  const plaatsdeel = regio ? ` uit ${regio}` : "";

  const vragen: PlannedQuestion[] = [
    // ── kent: GEEN zoekfunctie. Dit is het hele punt van dit blok — we meten
    // of het merk in het model zélf zit, niet of het te googelen valt.
    {
      block: "kent",
      question: `Wat weet je over ${merk}${plaatsdeel}?`,
      webSearch: false,
    },
    {
      block: "kent",
      question: `Wat doet ${merk}${plaatsdeel} precies?`,
      webSearch: false,
    },

    // ── citeert: mét zoekfunctie. Welke bronnen komen er boven als een
    // assistent over dit merk moet praten? Dat is vaak niet de eigen site.
    {
      block: "citeert",
      question: `Zoek informatie over ${merk} (${profile.url}) en vertel wat je vindt. Noem de bronnen die je gebruikt.`,
      webSearch: true,
    },

    // ── verwarring: niet cosmetisch. Een ambigue merknaam levert straks
    // vals-positieve vermeldingen op in de maandelijkse meting.
    {
      block: "verwarring",
      question:
        `Zijn er meerdere bedrijven, merken of begrippen die "${merk}" heten? ` +
        `Zo ja, noem ze en zeg per stuk waarin ze verschillen.`,
      webSearch: true,
    },
  ];

  // ── categorie: merkneutrale koopvragen uit het eigen aanbod. Een mini-versie
  // van de maandelijkse meting, zodat er aan het eind van de onboarding al een
  // getal staat. Merknaam mag hier NIET in — dan is een vermelding gegarandeerd
  // en meet de vraag niets (zelfde regel als in lib/pipeline/prompts.ts).
  const bladeren = offerings
    .filter((o) => o.kind === "dienst" || o.kind === "product")
    .slice(0, CATEGORY_QUESTIONS);

  for (const o of bladeren) {
    const waar = regio ? ` in ${regio}` : " in Nederland";
    vragen.push({
      block: "categorie",
      question: `Welke aanbieders van ${o.name.toLowerCase()}${waar} kun je aanbevelen?`,
      webSearch: true,
    });
  }

  return vragen;
}

export interface BaselineResult {
  measured: number;
  skipped: number;
  costUsd: number;
}

export async function runLlmBaseline(
  profileId: string,
): Promise<BaselineResult> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();
  if (!row) throw new Error(`Profiel ${profileId} niet gevonden.`);
  const profile = row as Profile;

  const [{ data: offeringRows }, { data: facetRow }, { data: doneRows }] =
    await Promise.all([
      admin
        .from("profile_offerings")
        .select("*")
        .eq("profile_id", profileId)
        .order("sort_order"),
      admin
        .from("profile_facets")
        .select("raw_json")
        .eq("profile_id", profileId)
        .eq("facet", "techniek")
        .maybeSingle(),
      admin
        .from("profile_llm_baseline")
        .select("engine, block, question")
        .eq("profile_id", profileId),
    ]);

  const offerings = (offeringRows ?? []) as ProfileOffering[];
  const harvested = ((facetRow?.raw_json as { facts?: HarvestedFact[] } | null)
    ?.facts ?? []) as HarvestedFact[];

  const facts: KnownFact[] = harvested
    .filter((f) => CHECKABLE_KEYS.has(f.key))
    .map((f) => ({ key: f.key, value: f.value }));

  // Idempotent (conventie 9): wat al gemeten is, niet opnieuw. Migratie 0041
  // dwingt dezelfde sleutel af met een unieke index, zodat code en database het
  // niet oneens kunnen worden.
  const gedaan = new Set(
    (doneRows ?? []).map(
      (r) =>
        `${r.engine as string}|${r.block as string}|${r.question as string}`,
    ),
  );

  const engines = enginesForProfile(profile.engines_enabled);
  const vragen = planQuestions(profile, offerings);

  let measured = 0;
  let skipped = 0;
  let costUsd = 0;

  for (const engine of engines) {
    // Budgetpoort per engine, niet per vraag: halverwege een engine stoppen
    // levert een half beeld op dat er compleet uitziet.
    const over = await remainingBudgetUsd(
      admin,
      profileId,
      profile.onboarding_budget_usd,
    );
    if (over <= 0.1) {
      skipped += vragen.filter(
        (q) => !gedaan.has(`${engine.info.id}|${q.block}|${q.question}`),
      ).length;
      console.warn(
        `Kennistest op ${engine.info.id} overgeslagen voor profiel ${profileId}: ` +
          `budget op ($${over.toFixed(3)} over).`,
      );
      continue;
    }

    const teDoen = vragen.filter(
      (q) => !gedaan.has(`${engine.info.id}|${q.block}|${q.question}`),
    );
    if (teDoen.length === 0) continue;

    const uitkomsten = await Promise.allSettled(
      teDoen.map((q) => askOne(engine, q, profile, facts, profileId)),
    );

    const rijen = uitkomsten
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof askOne>>> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value);

    for (const r of uitkomsten) {
      if (r.status === "rejected") {
        // Eén mislukte vraag mag de rest niet meenemen: dit blok is
        // verrijking, niet de meting waar de klant voor betaalt.
        console.error(
          `Kennisvraag mislukt voor profiel ${profileId}:`,
          r.reason,
        );
        skipped++;
      }
    }

    if (rijen.length > 0) {
      const { error } = await admin.from("profile_llm_baseline").insert(rijen);
      if (error) {
        console.error(
          `Kennisbasislijn opslaan mislukt voor profiel ${profileId}: ${error.message}`,
        );
      } else {
        measured += rijen.length;
        costUsd += rijen.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0);
      }
    }
  }

  await admin.from("profile_facets").upsert(
    {
      profile_id: profileId,
      facet: "llm_kennis",
      summary: await beschrijf(admin, profileId, profile),
      raw_json: {
        measured,
        skipped,
        engines: engines.map((e) => e.info.id),
      } as never,
      confidence: measured > 0 ? 1 : null,
      cost_usd: costUsd,
      researched_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,facet" },
  );

  return { measured, skipped, costUsd };
}

async function askOne(
  engine: EngineAdapter,
  q: PlannedQuestion,
  profile: Profile,
  facts: KnownFact[],
  profileId: string,
) {
  // De zoekfunctie volgt de bestaande kostenknop. Staat die uit (ontwikkelfase),
  // dan draaien de gegronde blokken zonder zoeken — dat is een ander antwoord,
  // en dat leggen we vast in de kolom `web_search` zodat de uitslag niet later
  // als representatief gelezen wordt.
  const webSearch = q.webSearch && measureWebSearchEnabled;

  const r = await engine.callPlain({
    system: NEUTRAL_SYSTEM,
    user: q.question,
    webSearch,
    meta: {
      kind: `llm_baseline_${q.block}`,
      profileId,
      engine: engine.info.id,
    },
  });

  // Alleen het `kent`-blok krijgt een feitenoordeel. Bij de andere blokken zou
  // "noemt je telefoonnummer niet" geen bevinding zijn maar ruis — daar vroegen
  // we er ook niet naar.
  const verdict =
    q.block === "kent"
      ? buildVerdict(
          r.text,
          profile.brand_name ?? profile.name,
          profile.aliases,
          facts,
        )
      : null;

  return {
    profile_id: profileId,
    engine: engine.info.id,
    block: q.block,
    question: q.question,
    raw_response: r.text,
    verdict_json: verdict as never,
    web_search: webSearch,
    model_used: r.model,
    cost_usd: r.costUsd,
  };
}

/** Eén regel voor op het profielscherm, per engine. */
async function beschrijf(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  profile: Profile,
): Promise<string> {
  const { data } = await admin
    .from("profile_llm_baseline")
    .select("engine, verdict_json")
    .eq("profile_id", profileId)
    .eq("block", "kent");

  if (!data || data.length === 0)
    return "Nog niet vastgesteld wat AI-assistenten over dit merk weten.";

  const perEngine = new Map<
    string,
    { kent: boolean; tegengesproken: number }
  >();
  for (const rij of data) {
    const v = rij.verdict_json as {
      knowsBrand?: boolean;
      contradicted?: number;
    } | null;
    const huidig = perEngine.get(rij.engine as string) ?? {
      kent: false,
      tegengesproken: 0,
    };
    perEngine.set(rij.engine as string, {
      // Eén herkennend antwoord is genoeg: als het model het merk in de ene
      // formulering wél kent en in de andere niet, kent het het merk.
      kent: huidig.kent || Boolean(v?.knowsBrand),
      tegengesproken: Math.max(huidig.tegengesproken, v?.contradicted ?? 0),
    });
  }

  const merk = profile.brand_name ?? profile.name;
  return [...perEngine.entries()]
    .map(([engine, r]) => {
      const label =
        engine === "openai"
          ? "ChatGPT"
          : engine === "gemini"
            ? "Gemini"
            : engine;
      if (!r.kent) return `${label} kent ${merk} niet`;
      return r.tegengesproken > 0
        ? `${label} kent ${merk}, maar spreekt ${r.tegengesproken} gegeven(s) tegen`
        : `${label} kent ${merk}`;
    })
    .join(" · ");
}
