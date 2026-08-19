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
 * koopvragen genoemd worden en tóch prima bekend zijn, of andersom, genoemd
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
import {
  baselineFacetState,
  buildVerdict,
  checkableFacts,
  scoreCategoryAnswer,
  cleanCompetitorName,
  summariseKnows,
  describeKnows,
  type BaselineVerdict,
  type CategoryVerdict,
  type KnownFact,
} from "@/lib/pipeline/baseline-verdict";
import { remainingBudgetUsd } from "@/lib/pipeline/onboarding-budget";
import { measureWebSearchEnabled } from "@/lib/config";
import type { EngineAdapter } from "@/lib/engines/types";
import type { HarvestedFact } from "@/lib/pipeline/structured-data";
import type { Profile, ProfileOffering, ProfileTopic } from "@/lib/types/database";

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
  // Uit de lopende tekst (text-facts.ts, 4 aug 2026). Een KvK-nummer is het
  // scherpste feit dat er is: acht cijfers die of kloppen of niet.
  "kvk",
]);

/** Hoeveel merkneutrale koopvragen we als nulmeting stellen. */
const CATEGORY_QUESTIONS = 3;

/**
 * Een assistent die niets van zoeken weet, precies zoals een echte gebruiker
 * hem aantreft. Geen rolinstructie die hem slimmer maakt dan hij is. Dan meet
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

/**
 * Welke diensten of producten we als merkneutrale koopvraag voorleggen.
 *
 * ⚠️ NIET DE EERSTE DRIE VAN DE BOOM (4 aug 2026)
 *
 * Dat was de oude regel: `slice(0, 3)` op `sort_order`, en die volgorde komt van
 * de site. Bij Fysi-Unique leverde dat fysiotherapie, manuele therapie en
 * sportfysiotherapie op, de drie waar élke praktijk op concurreert. Terwijl het
 * marktonderzoek van dezelfde ronde schreef: *"vooral de combinatie van
 * bekkenfysiotherapie, zwangerschapsbegeleiding en seksuologie geeft Fysi-Unique
 * een specialistischer profiel dan veel algemene lokale praktijken."*
 *
 * Die drie zijn nooit gevraagd. De nulmeting mat de klant dus op zijn zwakste
 * punt, en dat is het eerste cijfer dat hij in het demogesprek ziet.
 *
 * De topics wéten het beter: `propose_topics` heeft de hele boom gewogen op
 * commerciële relevantie en heeft ze op prioriteit gezet, en sinds de reparatie
 * van 3 augustus wijzen ze ook daadwerkelijk naar de aanbodknopen waar ze uit
 * volgen. Die koppeling verdient het om gebruikt te worden.
 *
 * Terugval op de oude regel als er nog geen topics zijn (een profiel van vóór
 * blok D, of een crawl die te weinig opleverde voor een aanbodboom).
 */
function categoryLeaves(
  offerings: ProfileOffering[],
  topics: ProfileTopic[],
): ProfileOffering[] {
  const bladeren = offerings.filter(
    (o) => o.kind === "dienst" || o.kind === "product",
  );
  const perId = new Map(bladeren.map((o) => [o.id, o]));

  // Topics op prioriteit aflopend; per topic de aanbodknopen die eronder hangen.
  const gekozen: ProfileOffering[] = [];
  const gezien = new Set<string>();
  for (const t of [...topics].sort((a, b) => b.priority - a.priority)) {
    for (const id of t.offering_ids) {
      const o = perId.get(id);
      if (!o || gezien.has(o.id)) continue;
      gezien.add(o.id);
      gekozen.push(o);
      if (gekozen.length >= CATEGORY_QUESTIONS) return gekozen;
    }
  }

  // Aanvullen tot drie met de boomvolgorde, zodat een profiel met één topic
  // alsnog een volwaardige nulmeting krijgt.
  for (const o of bladeren) {
    if (gezien.has(o.id)) continue;
    gezien.add(o.id);
    gekozen.push(o);
    if (gekozen.length >= CATEGORY_QUESTIONS) break;
  }

  return gekozen;
}

function planQuestions(
  profile: Profile,
  offerings: ProfileOffering[],
  topics: ProfileTopic[],
): PlannedQuestion[] {
  const merk = profile.brand_name ?? profile.name;
  const regio = profile.service_regions[0] ?? null;
  const plaatsdeel = regio ? ` uit ${regio}` : "";

  // ── kent: GEEN zoekfunctie. Dit is het hele punt van dit blok — we meten of
  // het merk in het model zélf zit, niet of het te googelen valt.
  //
  // ⚠️ ZES FORMULERINGEN EN GEEN TWEE (4 aug 2026)
  //
  // Twee meetronden op dezelfde site, dezelfde dag, gaven het tegenovergestelde
  // antwoord. "Wat weet je over Fysi-Unique?" → het model kon de naam aan geen
  // enkele organisatie koppelen. "Wat weet je over Fysi-Unique úít Amersfoort?"
  // → een correcte omschrijving. Twee woorden verschil, en het was de kopregel
  // van het profielscherm die omsloeg.
  //
  // Dit blok kostte $0,0003 voor twee vragen. Zes kost $0,001. Voor die prijs
  // krijg je een verhouding in plaats van een muntworp, en de vragen mét en
  // zónder plaatsnaam staan er allebei in, want het verschil ertussen is zelf
  // een bevinding: een merk dat alleen mét plaatsnaam herkend wordt, is niet
  // als entiteit bekend maar als woordcombinatie.
  const kentVragen = [
    `Wat weet je over ${merk}${plaatsdeel}?`,
    `Wat doet ${merk}${plaatsdeel} precies?`,
    `Ken je ${merk}${plaatsdeel}?`,
    `Wie is ${merk}${plaatsdeel}?`,
    `Is ${merk}${plaatsdeel} een bestaand bedrijf? Zo ja, wat voor bedrijf?`,
    // Bewust zónder plaatsnaam, ook als er een regio is.
    `Wat weet je over ${merk}?`,
  ];

  const vragen: PlannedQuestion[] = [];

  // Ontdubbelen (conventie 1). Zonder regio vallen de eerste en de laatste vraag
  // samen, en de unieke index uit migratie 0041 laat maar één rij per
  // (profiel, engine, blok, vraag) toe, een dubbele in dezelfde batch zou de
  // hele insert laten mislukken en de kennistest nul rijen opleveren.
  const gezien = new Set<string>();
  for (const vraag of kentVragen) {
    if (gezien.has(vraag)) continue;
    gezien.add(vraag);
    vragen.push({ block: "kent", question: vraag, webSearch: false });
  }

  // ── citeert: mét zoekfunctie. Welke bronnen komen er boven als een
  // assistent over dit merk moet praten? Dat is vaak niet de eigen site.
  vragen.push({
    block: "citeert",
    question: `Zoek informatie over ${merk} (${profile.url}) en vertel wat je vindt. Noem de bronnen die je gebruikt.`,
    webSearch: true,
  });

  // ── verwarring: niet cosmetisch. Een ambigue merknaam levert straks
  // vals-positieve vermeldingen op in de maandelijkse meting.
  vragen.push({
    block: "verwarring",
    question:
      `Zijn er meerdere bedrijven, merken of begrippen die "${merk}" heten? ` +
      `Zo ja, noem ze en zeg per stuk waarin ze verschillen.`,
    webSearch: true,
  });

  // ── categorie: merkneutrale koopvragen uit het eigen aanbod. Een mini-versie
  // van de maandelijkse meting, zodat er aan het eind van de onboarding al een
  // getal staat. Merknaam mag hier NIET in. Dan is een vermelding gegarandeerd
  // en meet de vraag niets (zelfde regel als in lib/pipeline/prompts.ts).
  for (const o of categoryLeaves(offerings, topics)) {
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

  const [
    { data: offeringRows },
    { data: facetRow },
    { data: doneRows },
    { data: topicRows },
    { data: marktFacet },
  ] = await Promise.all([
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
    admin
      .from("profile_topics")
      .select("*")
      .eq("profile_id", profileId)
      .order("priority", { ascending: false }),
    admin
      .from("profile_facets")
      .select("raw_json")
      .eq("profile_id", profileId)
      .eq("facet", "markt")
      .maybeSingle(),
  ]);

  const offerings = (offeringRows ?? []) as ProfileOffering[];
  const topics = (topicRows ?? []) as ProfileTopic[];

  // ── Tegen wie zetten we het antwoord af? ──────────────────────────────────
  //
  // Het marktfacet is de betere bron: `market.ts` schrijft daar kale namen weg
  // ("SMC Amersfoort"). `profiles.competitors` bevat óók de onderbouwing die het
  // profielonderzoek teruggaf, hele zinnen met een markdown-link erachter, en
  // die matchen nooit op een antwoordtekst. Vandaar allebei, met de opschoning
  // eroverheen (`cleanCompetitorName`).
  const marktNamen = (
    ((marktFacet?.raw_json as { competitors?: { name?: string }[] } | null)
      ?.competitors ?? []) as { name?: string }[]
  )
    .map((c) => c.name?.trim())
    .filter((n): n is string => Boolean(n));

  const competitors = [
    ...new Set(
      [...marktNamen, ...profile.competitors]
        .map((c) => cleanCompetitorName(c))
        .filter((n): n is string => Boolean(n)),
    ),
  ];
  const harvested = ((facetRow?.raw_json as { facts?: HarvestedFact[] } | null)
    ?.facts ?? []) as HarvestedFact[];

  // Eerst op sleutel (welk soort gegeven), dan op herkomst en circulariteit
  // (`checkableFacts`). Die tweede stap haalde bij Fysi-Unique 19 feiten terug
  // naar 0, zeventien paginatitels en twee keer de merknaam zelf.
  const facts: KnownFact[] = checkableFacts(
    harvested
      .filter((f) => CHECKABLE_KEYS.has(f.key))
      .map((f) => ({ key: f.key, value: f.value, fromType: f.fromType })),
    [profile.brand_name, profile.name, ...profile.aliases].filter(
      (n): n is string => Boolean(n),
    ),
  );

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
  const vragen = planQuestions(profile, offerings, topics);

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
      teDoen.map((q) =>
        askOne(engine, q, profile, facts, competitors, profileId),
      ),
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

  // ⚠️ Geen samenvatting als er niets gemeten is, zie `baselineFacetState()`.
  // Een gevulde samenvatting zette het voortgangsscherm op "klaar" terwijl het
  // budget op was en er nul vragen gesteld waren.
  const facetStand = baselineFacetState({ measured, eerder: gedaan.size, skipped });

  await admin.from("profile_facets").upsert(
    {
      profile_id: profileId,
      facet: "llm_kennis",
      summary: facetStand.gemeten
        ? await beschrijf(admin, profileId, profile)
        : null,
      raw_json: {
        measured,
        skipped,
        alles_overgeslagen: facetStand.allesOvergeslagen,
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
  competitors: string[],
  profileId: string,
) {
  // De zoekfunctie volgt de bestaande kostenknop. Staat die uit (ontwikkelfase),
  // dan draaien de gegronde blokken zonder zoeken. Dat is een ander antwoord,
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
  // "noemt je telefoonnummer niet" geen bevinding zijn maar ruis. Daar vroegen
  // we er ook niet naar.
  //
  // Het `categorie`-blok krijgt sinds 4 augustus 2026 wél een eigen oordeel, van
  // een andere soort: word je genoemd, en wie wél. Tot dan werd de vraag
  // "Word je genoemd bij koopvragen?" op het scherm gesteld en nergens
  // beantwoord, terwijl dit blok $0,044 van de $0,2463 per onboarding kost.
  const verdict: BaselineVerdict | CategoryVerdict | null =
    q.block === "kent"
      ? buildVerdict(
          r.text,
          profile.brand_name ?? profile.name,
          profile.aliases,
          facts,
        )
      : q.block === "categorie"
        ? scoreCategoryAnswer(
            r.text,
            [profile.brand_name, profile.name, ...profile.aliases].filter(
              (n): n is string => Boolean(n),
            ),
            competitors,
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

/**
 * Eén regel voor op het profielscherm, per engine.
 *
 * Sinds 4 augustus 2026 met een VERHOUDING in plaats van een ja of nee, en met de
 * uitkomst van de koopvragen erbij. Zie `summariseKnows()` in
 * baseline-verdict.ts voor waarom die verhouding er moest komen: twee
 * meetronden op dezelfde site gaven het tegenovergestelde antwoord op grond van
 * twee woorden verschil in de vraagstelling.
 */
async function beschrijf(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  profile: Profile,
): Promise<string> {
  const { data } = await admin
    .from("profile_llm_baseline")
    .select("engine, block, verdict_json")
    .eq("profile_id", profileId)
    .in("block", ["kent", "categorie"]);

  if (!data || data.length === 0)
    return "Nog niet vastgesteld wat AI-assistenten over dit merk weten.";

  const merk = profile.brand_name ?? profile.name;
  const engines = [...new Set(data.map((r) => r.engine as string))];

  return engines
    .map((engine) => {
      const vanEngine = data.filter((r) => r.engine === engine);

      const kentOordelen = vanEngine
        .filter((r) => r.block === "kent")
        .map((r) => r.verdict_json as BaselineVerdict | null)
        .filter((v): v is BaselineVerdict => Boolean(v));

      const categorieOordelen = vanEngine
        .filter((r) => r.block === "categorie")
        .map((r) => r.verdict_json as CategoryVerdict | null)
        .filter((v): v is CategoryVerdict => Boolean(v));

      const label = engineLabel(engine);
      const delen = [`${label} ${describeKnows(summariseKnows(kentOordelen), merk)}`];

      // De tegenspraak is de zwaarste bevinding die er is en hoort in de regel
      // die de klant als eerste ziet, niet in een uitklapper.
      const tegengesproken = Math.max(
        0,
        ...kentOordelen.map((v) => v.contradicted),
      );
      if (tegengesproken > 0) {
        delen.push(`spreekt ${tegengesproken} gegeven(s) tegen`);
      }

      if (categorieOordelen.length > 0) {
        const genoemd = categorieOordelen.filter((v) => v.mentioned).length;
        delen.push(
          `genoemd bij ${genoemd} van de ${categorieOordelen.length} koopvragen`,
        );
      }

      return delen.join(" · ");
    })
    .join(" · ");
}

/** ChatGPT en Gemini in plaats van openai en gemini. */
function engineLabel(id: string): string {
  return id === "openai" ? "ChatGPT" : id === "gemini" ? "Gemini" : id;
}
