import "server-only";

/**
 * Halte A3 — Monitoring (abcplan.md §6 A3): voor elke actieve prompt een
 * nulmeting (of wekelijkse meting): 3a (vraag stellen, web_search) → 3b
 * (antwoord beoordelen, per entiteit) → 3c (aggregatie, geen AI-call).
 *
 * Idempotent per prompt: bestaat er al een tracking_run met raw_response voor
 * deze prompt/week, dan wordt 3a NOOIT herhaald (kostenbescherming, §12.18) —
 * alleen een ontbrekende 3b (mention_json) wordt opnieuw geprobeerd.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { callPlain, callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { measureWebSearchEnabled } from "@/lib/config";
import { promptWeight, NEUTRAL_WEIGHT } from "@/lib/pipeline/prompt-weight";
import { volumeBandOf } from "@/lib/pipeline/volume";
import { Mention } from "@/lib/schemas/mention";
import { loadEntityIndex, resolveEntity } from "@/lib/entities/resolve";
import { looksLikeBrandName, textContainsName } from "@/lib/entities/normalize";
import { domainOf } from "@/lib/offsite/domain";
import { normalizePosition, weightedAveragePosition } from "@/lib/pipeline/position";
import { shareByRun, sumShare, roundQuestions } from "@/lib/pipeline/question-share";
import { classifyPendingEntities } from "@/lib/pipeline/classify-entities";
import { binomialStderr, weightedScoreStderr } from "@/lib/stats/uncertainty";
import { elicitLabel } from "@/lib/pipeline/elicit-rate";
// Gedeeld met scripts/eval-mention.ts, zodat de test exact de productie-prompt
// beoordeelt en niet een kopie die kan gaan afwijken (optimalisatie.md 0.7).
import { MENTION_SYSTEM, buildMentionUser } from "@/lib/openai/mention-prompt";
import type { Analysis, AnalysisStatus, Prompt, TrackingRun } from "@/lib/types/database";

const SIMULATE_SYSTEM =
  "Je bent een behulpzame AI-assistent (zoals ChatGPT) die vragen van gebruikers beantwoordt. " +
  "Gebruik web search om actuele, feitelijke informatie te vinden. Noem concrete merken, bedrijven " +
  "of bronnen waar relevant voor het antwoord. Antwoord in het Nederlands, zoals je dat voor een " +
  "echte gebruiker zou doen die deze vraag stelt.";

type Admin = SupabaseClient;

/**
 * Welk deel van de prompts moet minimaal slagen voordat we de meting bruikbaar
 * noemen (optimalisatie.md 0.4b)? Onder deze drempel is de score gebaseerd op
 * te weinig vragen om iets te betekenen, en falen we liever eerlijk.
 *
 * Met de retries uit 0.4 zou een enkele mislukking al zeldzaam moeten zijn; deze
 * drempel is het vangnet daaronder, niet de eerste verdedigingslinie.
 */
const MIN_SUCCESS_RATIO = 0.7;

/**
 * Onder hoeveel tekens we een antwoord als MISLUKT beschouwen in plaats van als
 * meetresultaat (optimalisatie.md 0.2, doorgetrokken naar halte 3a).
 *
 * De simulatie-call kan een lege of afgekapte string teruggeven: een weigering,
 * een web_search die niets opleverde, of een respons die alleen uit een
 * tool-aanroep bestond. `output_text` is dan "" — en dat werd tot nu toe gewoon
 * opgeslagen. Stap 3b beoordeelt vervolgens een leeg antwoord, concludeert
 * volkomen terecht "niet genoemd", en dat oordeel gaat als echte meting de score
 * in. Het resultaat is een score die te laag is zonder dat iemand het kan zien,
 * plus een "gemiste vraag" in het rapport waar een pagina voor geschreven wordt.
 *
 * Een leeg antwoord is geen nulscore maar een meetfout. Gooien betekent dat de
 * wachtrij het opnieuw vraagt, en blijft het misgaan, dan valt deze ene vraag
 * netjes buiten de drempel hierboven in plaats van de uitslag te vertekenen.
 *
 * 40 tekens is ruim onder elk echt antwoord ("Daar kan ik je niet mee helpen."
 * is al 33) en ruim boven leeg.
 */
const MIN_ANSWER_CHARS = 40;

/**
 * Waarvoor deze meting gedaan wordt (optimalisatie.md 5.3).
 *
 * Een impactmeting betreft maar een handvol vragen en mag daarom NOOIT
 * meetellen in de zichtbaarheidsscore — anders gaat een meting van drie vragen
 * als score over drie vragen het dashboard op, en dat is een grafiek die liegt.
 */
export interface MeasurePurpose {
  purpose: "periodic" | "impact" | "control";
  contentPieceId: string;
  wave: number;
}

export async function measureOnePrompt(
  admin: Admin,
  analysis: Analysis,
  ownLabel: string,
  ownAliases: string[],
  prompt: Prompt,
  weekNo: number,
  /** Weglaten voor de gewone (periodieke) meting. */
  impact?: MeasurePurpose,
  /**
   * Hoeveelste herhaling van deze vraag binnen deze periode (R6.1). 0 = de
   * eerste meting. Alleen de zwaarstwegende vragen krijgen herhalingen; de rest
   * blijft op 0 staan, precies zoals alle metingen van vóór migratie 0031.
   */
  repeatIndex = 0,
): Promise<void> {
  // De idempotentie-sleutel verschilt per soort meting. Bij een periodieke
  // meting is (analyse, prompt, periode, herhaling) genoeg; bij een
  // impactmeting hangt hij aan de pagina en de golf, want dezelfde prompt kan in
  // dezelfde periode zowel periodiek als voor twee verschillende pagina's
  // gemeten worden.
  const query = admin
    .from("tracking_runs")
    .select("*")
    .eq("analysis_id", analysis.id)
    .eq("prompt_id", prompt.id);

  const { data: existing } = impact
    ? await query
        .eq("content_piece_id", impact.contentPieceId)
        .eq("impact_wave", impact.wave)
        .eq("purpose", impact.purpose)
        .maybeSingle()
    : await query
        .eq("week_no", weekNo)
        .eq("purpose", "periodic")
        .eq("repeat_index", repeatIndex)
        .maybeSingle();

  let run = existing as TrackingRun | null;

  if (!run) {
    // 3a — de vraag stellen (duur, web_search). Wordt NOOIT herhaald zodra dit slaagt.
    // Model: de quality-tier, historisch omdat de web_search-tool niet betrouwbaar
    // werkte op de goedkoopste tier (meting faalde 10/10 met web_search op
    // gpt-4.1-nano). Sinds de overstap naar GPT-5.6 wijzen `volume` en `quality`
    // naar hetzelfde model (`gpt-5.6-luna`); de tier-aanduiding blijft staan omdat
    // hij vastlegt wélke keuze hier bewust gemaakt is. De web_search-kosten (vast
    // tarief per call) domineren toch: ~$0,025 tegen enkele tienden van een cent
    // aan tokens.
    //
    // Grounding (web_search) is via MEASURE_WEB_SEARCH uitschakelbaar voor de
    // ontwikkelfase (kostenbesparend). Uit → de AI antwoordt uit eigen kennis.
    // Bewust GEEN soort werk meegeven (`work: "simulation"`): dan gaan er géén
    // temperatuur en géén redeneerinspanning mee. We willen weten wat een
    // AI-assistent een echte gebruiker antwoordt, en die draait ook op de
    // standaardinstellingen van het model (bij GPT-5.6: effort `medium`). Zelf
    // aan die knoppen draaien maakt de meting juist onrealistisch. De ruis die
    // dit oplevert lossen we op met méér metingen per vraag (optimalisatie.md
    // 2.1), niet met een lagere temperatuur.
    const a = await callPlain({
      model: MODELS.quality,
      system: SIMULATE_SYSTEM,
      user: prompt.text,
      webSearch: measureWebSearchEnabled,
      work: "simulation",
      meta: { kind: "measure_simulate", analysisId: analysis.id, profileId: analysis.profile_id },
    });

    // Vóór het opslaan controleren, niet erna: eenmaal opgeslagen wordt 3a nooit
    // meer herhaald (de kostenbescherming hierboven), en dan zou een leeg
    // antwoord voorgoed als meting blijven staan.
    if (a.text.trim().length < MIN_ANSWER_CHARS) {
      throw new Error(
        `Lege of onbruikbaar korte respons bij het meten van prompt ${prompt.id} ` +
          `(${a.text.trim().length} tekens). Dit is een meetfout, geen nulscore.`,
      );
    }

    const { data: inserted, error } = await admin
      .from("tracking_runs")
      .insert({
        analysis_id: analysis.id,
        prompt_id: prompt.id,
        prompt_text_snapshot: prompt.text,
        prompt_category_snapshot: prompt.category,
        // Gewicht bevriezen op meetmoment (volumeband × waarde), voor de gewogen
        // score (§6 A3). Past de klant de band later aan, dan telt dat pas mee
        // vanaf de volgende meting — een score met terugwerkende kracht
        // veranderen maakt de trend onvergelijkbaar.
        prompt_weight: promptWeight(volumeBandOf(prompt), prompt.intent_type),
        engine: "openai",
        model_used: MODELS.quality,
        week_no: weekNo,
        purpose: impact?.purpose ?? "periodic",
        // Een impactmeting kent geen herhalingen: die gaat over een handvol
        // vragen rond één pagina en heeft z'n eigen sleutel (pagina + golf).
        repeat_index: impact ? 0 : repeatIndex,
        content_piece_id: impact?.contentPieceId ?? null,
        impact_wave: impact?.wave ?? null,
        raw_response: a.text,
        raw_response_received_at: new Date().toISOString(),
        openai_response_id: a.responseId,
        tokens_used: a.tokensUsed,
        // Kosten van 3a op de meting zelf (optimalisatie.md 0.6). De kolom
        // bestond al vanaf migratie 0001 maar werd nooit gevuld. De 3b-kosten
        // staan in het ai_calls-logboek; 3a is verreweg de grootste post omdat
        // daar de web_search in zit.
        cost_usd: a.costUsd,
      })
      .select("*")
      .single();

    if (error || !inserted) throw new Error(`Opslaan van 3a mislukt voor prompt ${prompt.id}.`);
    run = inserted as TrackingRun;
  }

  if (run.mention_json) return; // 3b al gedaan — niets te doen (idempotent)

  // Een eerder opgeslagen leeg antwoord (van vóór de controle hierboven) mag
  // niet alsnog als "niet genoemd" de score in. De rij weggooien en gooien:
  // de volgende poging stelt de vraag opnieuw. Dat is begrensd door het aantal
  // pogingen van de taak, dus het kan niet ontsporen in herhaalde kosten.
  if ((run.raw_response ?? "").trim().length < MIN_ANSWER_CHARS) {
    await admin.from("tracking_runs").delete().eq("id", run.id);
    throw new Error(
      `Opgeslagen meting van prompt ${prompt.id} bevat geen bruikbaar antwoord; ` +
        `de meting wordt opnieuw gedaan.`,
    );
  }

  // 3b — het antwoord beoordelen (goedkoop, geen web_search). Retry-safe: leunt
  // op het al opgeslagen raw_response, herhaalt 3a nooit.
  const b = await callStructured({
    model: MODELS.volume,
    system: MENTION_SYSTEM,
    user: buildMentionUser({ ownLabel, ownAliases, rawResponse: run.raw_response ?? "" }),
    schema: Mention,
    schemaName: "mention",
    webSearch: false,
    work: "deterministic",
    meta: { kind: "measure_mention", analysisId: analysis.id, profileId: analysis.profile_id },
  });

  // Genormaliseerd naar tracking_run_mentions (§5) — delete-then-insert voor idempotente retries.
  //
  // De VOLGORDE is hier wezenlijk: eerst de losse oordeelsrijen, dan pas
  // `mention_json`. Dat laatste veld is namelijk waaraan de rest van de app ziet
  // dat een vraag beoordeeld is (measurementIsUsable telt erop). Andersom kon de
  // vlag gezet worden terwijl de insert stukliep — dan telde de meting als
  // geslaagd voor de drempel, maar als ONBEOORDEELD in de score. Nu is
  // `mention_json` het sluitstuk: staat hij er, dan staat de rest er ook.
  await admin.from("tracking_run_mentions").delete().eq("tracking_run_id", run.id);
  const rawText = run.raw_response ?? "";
  // `ownLabel` is "Merknaam (onderwerp)" (loadMeasureContext) — voor de
  // tekstcontrole hieronder hebben we de kale merknaam nodig, niet die
  // toevoeging, want "(onderwerp)" staat nooit letterlijk in een AI-antwoord.
  const ownBrandName = ownLabel.replace(/\s*\([^()]*\)\s*$/, "").trim() || ownLabel;
  const rows = b.parsed.mentions.map((m) => {
    // VANGNET op de LLM-classificatie (lib/openai/mention-prompt.ts): het model
    // krijgt de instructie zich uitsluitend op de tekst te baseren, maar bleek
    // in de praktijk soms `mentioned: true` te geven voor het eigen merk terwijl
    // de merknaam nergens in `raw_response` voorkomt (steekproef op de
    // Swapfiets-analyse: 5 van de 26 als "genoemd" gemarkeerde metingen bevatten
    // de merknaam letterlijk niet in de tekst). Bronnen/URL's tellen hier
    // bewust niet mee — alleen of de naam daadwerkelijk in de tekst staat.
    const candidateNames = m.isOwnBrand ? [ownBrandName, ...ownAliases] : [m.entity];
    const mentioned = m.mentioned && candidateNames.some((name) => textContainsName(rawText, name));
    return {
      tracking_run_id: run!.id,
      entity_name: m.entity,
      is_own_brand: m.isOwnBrand,
      mentioned,
      position: mentioned ? normalizePosition(m.position) : null,
      // `sentiment` wordt sinds R3 niet meer gevuld (migratie 0029): het leverde
      // in 650 metingen geen enkele keer 'negative' op en werd nergens getoond.
      // `mention_role` neemt zijn plaats in — die varieert wél.
      // Vangnet, net als bij de positie: het model vulde bij 10 van de 27
      // niet-genoemde merken tóch een rol in ('eerste_aanbeveling'), terwijl de
      // prompt expliciet null vraagt. Structured output vult bij twijfel de eerste
      // enum-waarde in. Een merk dat niet genoemd wordt kán geen eerste
      // aanbeveling zijn, dus dwingen we die tegenspraak hier weg.
      mention_role: mentioned ? m.role : null,
      cited_sources: m.citedSources,
    };
  });
  if (rows.length > 0) {
    const { error: rowsError } = await admin.from("tracking_run_mentions").insert(rows);
    if (rowsError) {
      throw new Error(`Oordeel opslaan mislukt voor meting ${run.id}: ${rowsError.message}`);
    }
  }

  const { error: judgedError } = await admin
    .from("tracking_runs")
    .update({ mention_json: b.parsed as never })
    .eq("id", run.id);
  if (judgedError) {
    // Stil falen zou betekenen dat een al betaalde meting voorgoed onbeoordeeld
    // blijft en de meting onder de drempel kan duwen terwijl de data er is.
    throw new Error(`Beoordeling vastleggen mislukt voor meting ${run.id}: ${judgedError.message}`);
  }
}

/**
 * Rollen die als "een genoemde aanbieder" gelden (implementatieplan.md R2.1).
 *
 * Dezelfde set als in lib/pipeline/evidence.ts, en om dezelfde reden: de
 * mention-classificatie pikt naast bedrijven ook gewone woorden op. Bij Coolblue
 * kwamen "voorlader", "bovenlader", "wasmachine" en "fabrieksgarantie" als
 * entiteit binnen; bij Van der Valk "hotel", "locatie" en "vergaderlocatie".
 * Zouden die als aanbieder tellen, dan lijkt een zuivere adviesvraag ineens
 * winbaar en blijft precies het probleem bestaan dat R2 moet oplossen.
 *
 * Nog niet geclassificeerd (geen entiteit, of rol 'onbepaald') telt WÉL mee: die
 * naam stond echt in het antwoord, we weten alleen nog niet wat het is.
 */
const AANBIEDER_ROLLEN: ReadonlySet<string> = new Set([
  "concurrent",
  "vergelijker",
  "brancheorganisatie",
  "eigen_product",
]);

type MentionRow = {
  id: string;
  tracking_run_id: string;
  entity_name: string;
  is_own_brand: boolean;
  mentioned: boolean;
};

/** Wat een merk in één periode aan zichtbaarheid opbouwt, naast "genoemd ja/nee". */
export interface VisibilityProfile {
  /** Gemiddelde positie in het antwoord; null als nergens genoemd. Lager is beter. */
  avgPosition: number | null;
  /** In hoeveel antwoorden staat het eigen domein tussen de geciteerde bronnen? */
  citationCount: number;
  /** In hoeveel antwoorden wordt dit merk als eerste aanbeveling gepresenteerd? */
  firstMentionCount: number;
}

/**
 * Berekent het zichtbaarheidsprofiel over een set mention-rijen
 * (implementatieplan.md R3.2).
 *
 * De positie wordt alleen gemiddeld over antwoorden waarin het merk daadwerkelijk
 * genoemd is: een niet-genoemd merk heeft geen positie, en die als 0 of als
 * maximum meetellen zou het gemiddelde allebei op een andere manier vervalsen.
 *
 * `share` is het aandeel van deze meting binnen z'n vraag (R6.1): 1 bij een
 * eenmalig gemeten vraag, 1/3 bij een drie keer gemeten vraag. Alle cijfers
 * hieronder zijn daardoor uitgedrukt in VRAGEN, niet in metingen — "in 4 vragen
 * geciteerd" blijft 4 vragen, ook als er twaalf metingen onder liggen.
 */
function profileVisibility(
  rows: {
    mentioned: boolean;
    position: number | null;
    mention_role?: string | null;
    cited_sources?: string[] | null;
    share?: number;
  }[],
  ownDomain: string | null,
): VisibilityProfile {
  const share = (r: { share?: number }) => r.share ?? 1;
  const citationTotal = ownDomain
    ? rows
        .filter((r) => (r.cited_sources ?? []).some((src) => domainOf(src) === ownDomain))
        .reduce((sum, r) => sum + share(r), 0)
    : 0;
  const firstMentionTotal = rows
    .filter((r) => r.mentioned && r.mention_role === "eerste_aanbeveling")
    .reduce((sum, r) => sum + share(r), 0);

  return {
    avgPosition: weightedAveragePosition(
      rows.filter((r) => r.mentioned).map((r) => ({ position: r.position, weight: share(r) })),
    ),
    citationCount: roundQuestions(citationTotal),
    firstMentionCount: roundQuestions(firstMentionTotal),
  };
}

/**
 * Hoeveel verschillende aanbieders noemt elk antwoord?
 *
 * Ontdubbeld op entiteit: een antwoord dat "Coolblue" en "coolblue.nl" noemt,
 * noemt één aanbieder. Het eigen merk telt mee (zie de toelichting bij de
 * aanroep) — precies één keer, hoeveel mention-rijen het ook opleverde.
 */
function countBrandsPerRun(
  mentions: MentionRow[],
  entityByMention: Map<string, string>,
  entityById: Map<string, { entity_role: string; canonical_name: string }>,
  ownByRun: Map<string, { mentioned: boolean }>,
): Map<string, number> {
  const perRun = new Map<string, Set<string>>();

  for (const m of mentions) {
    if (m.is_own_brand || !m.mentioned) continue;
    const entityId = entityByMention.get(m.id);
    const entity = entityId ? entityById.get(entityId) : undefined;
    if (entity && !AANBIEDER_ROLLEN.has(entity.entity_role)) continue;
    // Een generieke term ("fysiotherapie", "medische fitness") is geen genoemde
    // aanbieder, ook niet als de classificatie hem in een relevante rol zette.
    // Zonder dit lijkt een zuivere adviesvraag alsnog winbaar.
    if (!looksLikeBrandName(entity?.canonical_name ?? m.entity_name)) continue;

    const set = perRun.get(m.tracking_run_id) ?? new Set<string>();
    // Zonder entiteit valt hij terug op de mention-id: die is uniek, dus telt
    // hij als eigen aanbieder. Dat is de veilige kant — liever één te veel dan
    // een vraag ten onrechte als onmeetbaar wegzetten.
    set.add(entityId ?? m.id);
    perRun.set(m.tracking_run_id, set);
  }

  const counts = new Map<string, number>();
  for (const [runId, set] of perRun) counts.set(runId, set.size);

  // Het eigen merk erbij, als het genoemd werd.
  for (const [runId, own] of ownByRun) {
    if (!own.mentioned) continue;
    counts.set(runId, (counts.get(runId) ?? 0) + 1);
  }

  // Beoordeelde runs zonder enige aanbieder expliciet op 0 — anders is niet te
  // onderscheiden of er niets genoemd werd of dat de telling nooit draaide.
  for (const runId of ownByRun.keys()) {
    if (!counts.has(runId)) counts.set(runId, 0);
  }

  return counts;
}

/** Schrijft de tellingen weg. Eén update per waarde in plaats van per run. */
async function persistBrandCounts(admin: Admin, counts: Map<string, number>): Promise<void> {
  if (counts.size === 0) return;

  // Groeperen op aantal: dertig runs leveren doorgaans een handvol verschillende
  // waarden op, dus dit zijn een paar queries in plaats van dertig.
  const byCount = new Map<number, string[]>();
  for (const [runId, n] of counts) {
    const list = byCount.get(n) ?? [];
    list.push(runId);
    byCount.set(n, list);
  }

  for (const [n, runIds] of byCount) {
    const { error } = await admin.from("tracking_runs").update({ brands_in_answer: n }).in("id", runIds);
    if (error) {
      // Niet laten klappen: de score is hierboven al berekend, en een ontbrekende
      // telling wordt bij de volgende aggregatie alsnog gezet.
      console.warn(`Aantal aanbieders opslaan mislukt voor ${runIds.length} metingen: ${error.message}`);
    }
  }
}

/**
 * Bepaalt per vraag hoe vaak hij een aanbieder oplevert
 * (implementatieplan.md R2.1/R2.4, herzien in R7 / migratie 0037).
 *
 * ── WAAROM DIT GEEN VLAG MEER IS ────────────────────────────────────────────
 *
 * De oude regel was: 'nee' na TWEE metingen zonder aanbieder. De redenering
 * ("één keer kan toeval zijn, twee keer is een patroon") klonk goed en bleek
 * onjuist. De verificatieronde van 31 juli mat dezelfde acht vragen drie keer in
 * dezelfde week; bij vier ervan wisselde de winbaarheid TUSSEN die metingen, en
 * geen enkele was alle drie de keren winbaar.
 *
 * Bij een vraag die één op de drie keer iets oplevert is de kans om twee keer
 * achtereen nul te trekken ongeveer 44%. Die vraag verdween dan permanent. Zo
 * kromp de meetbasis van 30 naar 21 vragen en de winbare basis van 17 naar 5 —
 * waarmee de 95%-band op de score naar ±42 punten liep en het cijfer ophield
 * iets te betekenen.
 *
 * Nu tellen we de STEEKPROEF: hoe vaak beoordeeld, hoe vaak raak. De vlag blijft
 * bestaan en blijft gevuld (additief, §2.3), maar wordt afgeleid van die telling
 * via `elicitLabel()` — en de beslissing om over te slaan gebruikt het
 * betrouwbaarheidsinterval in plaats van twee ongelukkige trekkingen.
 */
async function updateBrandEliciting(admin: Admin, analysisId: string): Promise<void> {
  const { data } = await admin
    .from("tracking_runs")
    .select("prompt_id, brands_in_answer")
    .eq("analysis_id", analysisId)
    .eq("purpose", "periodic")
    .not("prompt_id", "is", null)
    .not("brands_in_answer", "is", null);

  const perPrompt = new Map<string, number[]>();
  for (const row of (data ?? []) as { prompt_id: string; brands_in_answer: number }[]) {
    const list = perPrompt.get(row.prompt_id) ?? [];
    list.push(row.brands_in_answer);
    perPrompt.set(row.prompt_id, list);
  }

  // Per vraag de tellers wegschrijven, plus de afgeleide vlag. Eén update per
  // vraag: de tellers verschillen per rij, dus groeperen zoals bij de oude vlag
  // kan niet meer.
  for (const [promptId, counts] of perPrompt) {
    const bewijs = {
      samples: counts.length,
      successes: counts.filter((n) => n > 0).length,
    };

    const { error } = await admin
      .from("prompts")
      .update({
        elicit_samples: bewijs.samples,
        elicit_successes: bewijs.successes,
        brand_eliciting: elicitLabel(bewijs),
      })
      .eq("id", promptId);
    if (error) console.warn(`Meetbaarheid opslaan mislukt voor vraag ${promptId}: ${error.message}`);
  }
}

/**
 * 3c — aggregatie: visibility_scores + competitor_breakdown.
 *
 * Doet sinds fase 2 drie dingen extra (optimalisatie.md 2.2/2.4/2.5):
 *   • merknamen samenvoegen tot één entiteit per bedrijf
 *   • de onzekerheid van de score berekenen en opslaan
 *   • het aandeel over de echte concurrenten berekenen
 *
 * Was tot migratie 0026 vrij van AI-aanroepen. Dat is niet meer zo: nu de
 * concurrenten uit de meting komen in plaats van uit een lijst vooraf, moet er
 * per ontdekt merk bepaald worden of het écht een concurrent is of een
 * marktplaats/vergelijker. Dat is één goedkope aanroep per ~40 nieuwe merken,
 * en alleen voor merken die nog niet geclassificeerd zijn — bij een tweede
 * periode is dat er meestal nul. De aanroep zit in een try/catch: mislukt hij,
 * dan blijven de cijfers gewoon staan en probeert de volgende aggregatie het
 * opnieuw.
 */
export async function computeAggregates(admin: Admin, analysisId: string, weekNo: number): Promise<void> {
  const { data: runsFull } = await admin
    .from("tracking_runs")
    .select("id, prompt_id, prompt_category_snapshot, prompt_weight")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    // Impact- en controlemetingen (optimalisatie.md 5.3) horen hier niet bij:
    // die betreffen een handvol vragen en zouden de score vertekenen.
    .eq("purpose", "periodic");
  const runs = runsFull ?? [];
  if (runs.length === 0) return;

  const { data: analysisRow } = await admin
    .from("analyses")
    .select("profile_id, url")
    .eq("id", analysisId)
    .single();
  const profileId = analysisRow?.profile_id as string | undefined;
  if (!profileId) throw new Error(`Analyse ${analysisId} heeft geen profiel.`);

  // Het eigen domein, om geciteerd-worden te kunnen tellen (R3).
  const ownUrl = (analysisRow?.url as string | undefined) ?? "";
  const ownDomain = domainOf(ownUrl.startsWith("http") ? ownUrl : `https://${ownUrl}`);

  const runIds = runs.map((r) => r.id as string);
  const categoryByRun = new Map(runs.map((r) => [r.id as string, r.prompt_category_snapshot as string]));
  // Welke vraag hoort bij welke meting — nodig om per VRAAG te kunnen tellen nu
  // de zwaarste vragen meerdere keren gemeten worden (R6.1).
  const promptByRun = new Map(runs.map((r) => [r.id as string, (r.prompt_id as string | null) ?? null]));
  // Gewicht per run (volume × waarde), bevroren op meetmoment. Ontbreekt het
  // (oude rij, of handmatige prompt zonder tags), dan het NEUTRALE gewicht —
  // niet de ondergrens, zie NEUTRAL_WEIGHT (optimalisatie.md 0.10).
  const weightByRun = new Map(runs.map((r) => [r.id as string, Number(r.prompt_weight ?? NEUTRAL_WEIGHT)]));

  const { data: mentionRows } = await admin.from("tracking_run_mentions").select("*").in("tracking_run_id", runIds);
  const mentions = mentionRows ?? [];

  // ── Entiteiten samenvoegen (optimalisatie.md 2.4) ──────────────────────────
  // Sinds migratie 0026 wordt hier NIETS meer voorgezaaid vanuit een vooraf
  // gegenereerde concurrentenlijst. Elk merk in deze lus komt uit een echt
  // AI-antwoord; wie er meetelt als concurrent bepaalt de classificatie
  // hieronder, niet een lijst die vóór de meting bedacht is.
  const index = await loadEntityIndex(admin, profileId);

  // Elke gemeten naam koppelen aan z'n entiteit. Het eigen merk slaan we over:
  // dat is geen concurrent en heeft z'n eigen behandeling.
  const entityByMention = new Map<string, string>(); // mention.id → entity.id
  for (const m of mentions) {
    if (m.is_own_brand) continue;
    const entity = await resolveEntity(admin, profileId, index, m.entity_name as string);
    if (!entity) continue;
    entityByMention.set(m.id as string, entity.id);
    if (m.entity_id !== entity.id) {
      await admin.from("tracking_run_mentions").update({ entity_id: entity.id }).eq("id", m.id);
    }
  }

  // ── Ontdekte merken classificeren (migratie 0026) ──────────────────────────
  // Een autobedrijf krijgt naast echte concurrenten ook AutoScout24, Marktplaats
  // en de ANWB terug. Zonder dit onderscheid zouden die als concurrent in de
  // grafiek staan en het aandeel drukken.
  //
  // Mag de aggregatie niet laten klappen: de score is dan al berekend en een
  // cijfer dat een periode later compleet is, is beter dan geen cijfer. Blijven
  // entiteiten op 'onbepaald' staan, dan pakt de volgende aggregatie ze op.
  try {
    const [{ data: profileRow }, { data: analysisRow }] = await Promise.all([
      admin.from("profiles").select("brand_name, industry, products").eq("id", profileId).maybeSingle(),
      admin.from("analyses").select("topic").eq("id", analysisId).maybeSingle(),
    ]);
    await classifyPendingEntities(
      admin,
      profileId,
      {
        brandName: (profileRow?.brand_name as string | null) ?? "",
        industry: (profileRow?.industry as string | null) ?? null,
        topic: (analysisRow?.topic as string | null) ?? null,
        ownProducts: (profileRow?.products as string[] | null) ?? [],
      },
      analysisId,
    );
  } catch (err) {
    console.error(`Classificeren van ontdekte merken mislukt voor analyse ${analysisId}:`, err);
  }

  // Ná de classificatie herladen: de rollen die hierboven gezet zijn bepalen
  // hieronder wie er in de vergelijking en in het aandeel meetelt.
  const entityById = new Map((await loadEntityIndex(admin, profileId)).all.map((e) => [e.id, e]));

  // ── Eigen merk per run ─────────────────────────────────────────────────────
  // De classificatie hoort er precies één per run te geven, maar kan er meer
  // teruggeven (bv. merknaam én alias als losse entiteiten). Voorheen won dan
  // willekeurig de LAATSTE rij, wat betekende dat een "niet genoemd"-rij een
  // "wel genoemd"-rij kon overschrijven en de score stilletjes verlaagde. Nu een
  // expliciete regel (optimalisatie.md 0.3): genoemd wint van niet-genoemd; bij
  // twee keer genoemd telt de vroegste positie.
  const ownByRun = new Map<string, (typeof mentions)[number]>();
  for (const m of mentions) {
    if (!m.is_own_brand) continue;
    const current = ownByRun.get(m.tracking_run_id);
    if (!current) {
      ownByRun.set(m.tracking_run_id, m);
      continue;
    }
    if (m.mentioned && !current.mentioned) {
      ownByRun.set(m.tracking_run_id, m);
      continue;
    }
    if (m.mentioned && current.mentioned) {
      const currentPos = current.position ?? Number.MAX_SAFE_INTEGER;
      const candidatePos = m.position ?? Number.MAX_SAFE_INTEGER;
      if (candidatePos < currentPos) ownByRun.set(m.tracking_run_id, m);
    }
  }

  // Alleen BEOORDEELDE runs tellen mee (optimalisatie.md 0.2, zelfde regel als
  // in report.ts). Een run zonder eigen-merk-oordeel betekent dat 3b faalde —
  // dat is onbekend, niet "niet genoemd".
  const judgedRunIds = runIds.filter((id) => ownByRun.has(id));
  if (judgedRunIds.length < runIds.length) {
    console.warn(
      `Analyse ${analysisId} periode ${weekNo}: ${runIds.length - judgedRunIds.length} van ${runIds.length} ` +
        `metingen zonder eigen-merk-oordeel; die tellen niet mee in de score.`,
    );
  }

  // ── Per VRAAG tellen, niet per meting (R6.1) ───────────────────────────────
  // De zwaarstwegende vragen worden meerdere keren gemeten. Zonder deze weging
  // zouden die drie keer zo zwaar meetellen als de rest — het omgekeerde van de
  // bedoeling. Elke meting weegt 1/(aantal beoordeelde metingen van die vraag),
  // dus elke vraag weegt precies 1. Zonder herhalingen is elk aandeel 1 en
  // verandert er getalsmatig niets. Zie lib/pipeline/question-share.ts.
  const shares = shareByRun(
    judgedRunIds.map((id) => ({ runId: id, promptId: promptByRun.get(id) ?? null })),
  );
  const judgedRuns = roundQuestions(sumShare(judgedRunIds, shares));
  /** Het aandeel van één meting binnen z'n vraag; 1 voor eenmalig gemeten vragen. */
  const shareOf = (runId: string) => shares.get(runId) ?? 1;

  // ── Meetbaarheid (implementatieplan.md R2) ─────────────────────────────────
  //
  // Bij een groot deel van de metingen noemt de AI géén enkele aanbieder: het
  // zijn "hoe kies ik"-antwoorden met stappenplannen en criteria. Bij Van der
  // Valk is dat 17 van de 30 vragen. Die metingen telden volledig mee als "het
  // eigen merk werd niet genoemd" en gingen zo als gemiste kans het rapport in.
  //
  // Dat mengt twee onvergelijkbare dingen. Waar merken genoemd worden en de
  // klant er niet bij zit, is een echte gemiste kans. Waar niemand genoemd
  // wordt, is er niets te winnen — en niets te verliezen. Vanaf hier telt alleen
  // het eerste mee in de score; het tweede wordt als eigen cijfer getoond.
  //
  // Het eigen merk telt mee als aanbieder: er zijn antwoorden waarin uitsluitend
  // de klant genoemd wordt (3× bij Bol, 2× bij Coolblue en HEMA, 1× bij Van der
  // Valk). Dat zijn zuivere winsten; die buiten de score houden zou de klant een
  // overwinning kosten.
  const brandsPerRun = countBrandsPerRun(mentions, entityByMention, entityById, ownByRun);
  await persistBrandCounts(admin, brandsPerRun);

  const winnableRunIds = judgedRunIds.filter((id) => (brandsPerRun.get(id) ?? 0) > 0);
  // Alle tellingen hieronder zijn in VRAGEN, niet in metingen: elke meting weegt
  // z'n aandeel (1/aantal herhalingen van die vraag). Een vraag die drie keer
  // gemeten is en twee keer winbaar bleek, telt dus voor 2/3 winbaar.
  const winnableTotal = sumShare(winnableRunIds, shares);
  const winnableRuns = roundQuestions(winnableTotal);
  const brandlessRuns = Math.max(0, judgedRuns - winnableRuns);
  if (brandlessRuns > 0) {
    console.log(
      `Analyse ${analysisId} periode ${weekNo}: bij ${brandlessRuns} van ${judgedRuns} vragen ` +
        `noemt de AI geen enkele aanbieder; die tellen niet mee in de score.`,
    );
  }

  const mentionedRunIds = winnableRunIds.filter((id) => ownByRun.get(id)?.mentioned);
  const ownMentionedTotal = sumShare(mentionedRunIds, shares);
  const ownMentionedCount = roundQuestions(ownMentionedTotal);
  // Delen vóór afronden: op de afgeronde hele vragen delen zou bij herhaalde
  // metingen een score kunnen opleveren die niet bij de onderliggende cijfers past.
  const score = winnableTotal > 0 ? Math.round((ownMentionedTotal / winnableTotal) * 100) : 0;

  // Gewogen zichtbaarheid: Σ gewicht van meetbare vragen waarin het merk genoemd
  // wordt ÷ Σ gewicht van alle meetbare vragen. Het gewicht van een meting is
  // z'n vraaggewicht × z'n aandeel, zodat een driemaal gemeten vraag in totaal
  // z'n eigen gewicht meebrengt en niet drie keer dat gewicht.
  const effectiveWeight = (id: string) =>
    (weightByRun.get(id) ?? NEUTRAL_WEIGHT) * (shares.get(id) ?? 1);
  const totalWeight = winnableRunIds.reduce((sum, id) => sum + effectiveWeight(id), 0);
  const ownWeight = mentionedRunIds.reduce((sum, id) => sum + effectiveWeight(id), 0);
  const weightedScore = totalWeight > 0 ? Math.round((ownWeight / totalWeight) * 100) : 0;

  // ── Onzekerheid (optimalisatie.md 2.2) ─────────────────────────────────────
  // Over de meetbare vragen, niet over alle beoordeelde: een kleinere noemer
  // geeft een bredere band, en dat is de eerlijke weergave van wat we werkelijk
  // weten. Bewust in VRAGEN en niet in metingen: drie metingen van dezelfde
  // vraag maken die vraag betrouwbaarder, maar leveren geen derde vraag op. Wie
  // hier de metingen zou tellen, koopt een smallere band voor geld in plaats van
  // voor kennis.
  const stderr = binomialStderr(ownMentionedTotal, winnableTotal);
  const weightedStderr = weightedScoreStderr(
    winnableRunIds.map((id) => ({
      weight: effectiveWeight(id),
      mentioned: Boolean(ownByRun.get(id)?.mentioned),
    })),
  );

  // Welke vragen leveren structureel niets op? Bepaalt of ze bij een volgende
  // periode nog gemeten worden (R2.4).
  await updateBrandEliciting(admin, analysisId);

  // ── Zichtbaarheidsprofiel (implementatieplan.md R3) ───────────────────────
  //
  // Genoemd-ja/nee is een grove maat. Als vijfde genoemd worden ná drie
  // concurrenten is iets anders dan als eerste aanbevolen worden, en geciteerd
  // worden is een derde vorm van zichtbaarheid die tot nu toe helemaal niet
  // meetelde — terwijl dát de link is waarop de gebruiker doorklikt.
  const ownProfile = profileVisibility(
    winnableRunIds
      .map((id) => {
        const own = ownByRun.get(id);
        return own ? { ...own, share: shares.get(id) ?? 1 } : null;
      })
      .filter((m): m is (typeof mentions)[number] & { share: number } => Boolean(m)),
    ownDomain,
  );

  // ── Aandeel over de ECHTE concurrenten (optimalisatie.md 2.5 / migratie 0026) ─
  // Voorheen: eigen ÷ (eigen + álle concurrentvermeldingen). Die noemer groeide
  // met elk merk dat de classificatie toevallig ontdekte, waardoor het aandeel
  // daalde zonder dat de klant iets verkeerd deed. De oplossing was toen een
  // handmatige bevestigingspoort — maar die maakte het cijfer afhankelijk van
  // een vooraf opgegeven lijst in plaats van van de meting.
  //
  // Nu bepaalt de ROL de noemer: alleen merken die als echte concurrent
  // geclassificeerd zijn tellen mee. Een marktplaats of brancheorganisatie
  // vervuilt het cijfer dus niet, en de klant hoeft niets af te vinken.
  const competitorRows = mentions.filter((m) => !m.is_own_brand);
  const inBasis = (m: (typeof mentions)[number]) => {
    const entityId = entityByMention.get(m.id as string);
    const entity = entityId ? entityById.get(entityId) : undefined;
    return entity?.entity_role === "concurrent" && !entity.dismissed;
  };
  // Ook hier per VRAAG (R6.1): een concurrent die in alle drie de metingen van
  // dezelfde vraag genoemd wordt, wint die ene vraag — niet drie.
  const basisMentions = competitorRows
    .filter((m) => m.mentioned && inBasis(m))
    .reduce((sum, m) => sum + shareOf(m.tracking_run_id as string), 0);
  const basisEntities = new Set(
    competitorRows.filter(inBasis).map((m) => entityByMention.get(m.id as string)),
  );
  const shareOfVoice =
    ownMentionedTotal + basisMentions > 0
      ? Math.round((ownMentionedTotal / (ownMentionedTotal + basisMentions)) * 100)
      : null;

  await admin.from("visibility_scores").upsert(
    {
      analysis_id: analysisId,
      week_no: weekNo,
      score,
      weighted_score: weightedScore,
      winnable_runs: winnableRuns,
      brandless_runs: brandlessRuns,
      // Zichtbaarheidsprofiel (R3): genoemd wórden is één ding, waar in het
      // antwoord en of je geciteerd wordt zijn er twee andere.
      avg_position: ownProfile.avgPosition,
      citation_count: ownProfile.citationCount,
      first_mention_count: ownProfile.firstMentionCount,
      share_of_voice: shareOfVoice,
      judged_runs: judgedRuns,
      score_stderr: stderr,
      weighted_stderr: weightedStderr,
      // +1 voor het eigen merk: de noemer is "wij plus de echte concurrenten".
      share_basis_count: basisEntities.size + 1,
    },
    { onConflict: "analysis_id,week_no" },
  );

  // ── Uitsplitsing per concurrent, gegroepeerd op ENTITEIT ───────────────────
  // Alleen echte concurrenten (migratie 0026). Marktplaatsen, vergelijkers en
  // brancheorganisaties komen wél uit de meting maar horen niet in 'Jij vs.
  // concurrenten'; die staan apart onder "Ook genoemd".
  const byEntity = new Map<string, typeof competitorRows>();
  for (const m of competitorRows) {
    const entityId = entityByMention.get(m.id as string);
    if (!entityId) continue;
    if (!inBasis(m)) continue;
    const list = byEntity.get(entityId) ?? [];
    list.push(m);
    byEntity.set(entityId, list);
  }

  await admin.from("competitor_breakdown").delete().eq("analysis_id", analysisId).eq("week_no", weekNo);

  const breakdownRows = Array.from(byEntity.entries()).map(([entityId, ms]) => {
    const byCategoryTotals: Record<string, number> = {};
    const sources = new Set<string>();
    const winningRunIds: string[] = [];
    const losingRunIds: string[] = [];

    for (const m of ms) {
      if (m.mentioned) {
        const cat = categoryByRun.get(m.tracking_run_id) ?? "Onbekend";
        byCategoryTotals[cat] = (byCategoryTotals[cat] ?? 0) + shareOf(m.tracking_run_id as string);
        for (const s of m.cited_sources ?? []) sources.add(s);
      }
      const own = ownByRun.get(m.tracking_run_id);
      if (m.mentioned && own && !own.mentioned) winningRunIds.push(m.tracking_run_id);
      if (!m.mentioned && own && own.mentioned) losingRunIds.push(m.tracking_run_id);
    }

    // Herhaalde metingen van dezelfde vraag leveren meerdere run-ids op. Die
    // lijsten zijn bewijsmateriaal ("bij welke vragen wint deze concurrent van
    // jou"), dus hoort elke VRAAG er hooguit één keer in te staan — anders leest
    // de klant dezelfde vraag drie keer in het rapport (R6.1).
    const withShare = ms.map((m) => ({ ...m, share: shareOf(m.tracking_run_id as string) }));

    const eersteRunPerVraag = (ids: string[]): string[] => {
      const gezien = new Set<string>();
      return ids.filter((id) => {
        const key = promptByRun.get(id) ?? `run:${id}`;
        if (gezien.has(key)) return false;
        gezien.add(key);
        return true;
      });
    };

    return {
      analysis_id: analysisId,
      week_no: weekNo,
      // De weergavenaam van de entiteit, niet de toevallige schrijfwijze uit
      // één antwoord — anders heet dezelfde concurrent elke periode anders.
      competitor_name: entityById.get(entityId)?.canonical_name ?? "Onbekend",
      mentions_count: roundQuestions(
        ms
          .filter((m) => m.mentioned)
          .reduce((sum, m) => sum + shareOf(m.tracking_run_id as string), 0),
      ),
      mentions_by_category_json: Object.fromEntries(
        Object.entries(byCategoryTotals).map(([cat, total]) => [cat, roundQuestions(total)]),
      ),
      top_cited_sources: Array.from(sources).slice(0, 5),
      winning_run_ids: eersteRunPerVraag(winningRunIds),
      losing_run_ids: eersteRunPerVraag(losingRunIds),
      // Zelfde profiel als voor het eigen merk (R3), anders valt er niets te
      // vergelijken: even vaak genoemd maar structureel later in het antwoord is
      // een heel ander verhaal dan even vaak én even prominent. Het eigen domein
      // is hier niet van toepassing, dus geen citatietelling.
      avg_position: profileVisibility(withShare, null).avgPosition,
      first_mention_count: profileVisibility(withShare, null).firstMentionCount,
    };
  });

  // Nul-metingen weglaten (migratie 0026). Een concurrent die in geen enkel
  // antwoord voorkwam hoort niet als lege balk in de grafiek: de vergelijking
  // laat zien wie je in de antwoorden tegenkomt, niet wie er ooit bedacht is.
  const measured = breakdownRows.filter((r) => r.mentions_count > 0);
  if (measured.length > 0) await admin.from("competitor_breakdown").insert(measured);
}

/**
 * De gedeelde context die elke meting nodig heeft: hoe heet het eigen merk en
 * hoe kan het nog meer genoemd worden.
 *
 * Wordt per meettaak opnieuw geladen in plaats van meegegeven in de payload
 * (optimalisatie.md 1.3): past de klant halverwege z'n merkgegevens aan, dan
 * meten de resterende vragen meteen tegen de nieuwe gegevens.
 *
 * Sinds migratie 0026 zit hier GEEN concurrentenlijst meer in. Concurrenten
 * worden niet vooraf opgegeven maar ontdekt in de antwoorden zelf; welke
 * ontdekte merken echt concurrent zijn, bepaalt de classificatie tijdens de
 * aggregatie (lib/pipeline/classify-entities.ts).
 */
export interface MeasureContext {
  analysis: Analysis;
  ownLabel: string;
  ownAliases: string[];
}

export async function loadMeasureContext(admin: Admin, analysisId: string): Promise<MeasureContext> {
  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", analysisId).single();
  if (!analysisRow) throw new Error(`Analyse ${analysisId} niet gevonden.`);
  const analysis = analysisRow as Analysis;

  const { data: profile } = await admin
    .from("profiles")
    .select("brand_name, aliases")
    .eq("id", analysis.profile_id)
    .maybeSingle();

  // Gebruik de canonieke merknaam voor mention-detectie (een AI-antwoord noemt
  // "Golden Fingers", niet het domein) — nauwkeuriger dan alleen de URL.
  const base = profile?.brand_name ?? analysis.url;
  return {
    analysis,
    ownLabel: `${base} (${analysis.topic})`,
    // Aliassen (§12.24) tellen ook als het eigen merk — verbetert de detectie.
    ownAliases: (profile?.aliases as string[] | null) ?? [],
  };
}

/**
 * Meet één prompt binnen een analyse. Dit is wat een `measure_prompt`-taak doet.
 * Idempotent: is deze prompt voor deze week al gemeten, dan gebeurt er niets.
 */
export async function measurePromptById(
  analysisId: string,
  promptId: string,
  weekNo: number,
  impact?: MeasurePurpose,
  repeatIndex = 0,
): Promise<void> {
  const admin = createAdminClient();
  const ctx = await loadMeasureContext(admin, analysisId);

  const { data: promptRow } = await admin.from("prompts").select("*").eq("id", promptId).maybeSingle();
  if (!promptRow) {
    // Prompt verwijderd terwijl de taak in de rij stond — geen fout, niets te doen.
    console.warn(`Prompt ${promptId} bestaat niet meer; meting overgeslagen.`);
    return;
  }

  await measureOnePrompt(
    admin,
    ctx.analysis,
    ctx.ownLabel,
    ctx.ownAliases,
    promptRow as Prompt,
    weekNo,
    impact,
    repeatIndex,
  );
}

/**
 * Zijn er genoeg vragen gemeten om een bruikbare score op te baseren
 * (optimalisatie.md 0.4b)? Onder de drempel is het geen meting meer maar een
 * steekproef met te weinig grond, en tonen we liever niets dan een misleidend
 * cijfer. Wordt aangeroepen door de aggregatietaak, die als laatste draait.
 */
export async function measurementIsUsable(
  admin: Admin,
  analysisId: string,
  weekNo: number,
): Promise<{ usable: boolean; measured: number; expected: number }> {
  const [{ count: expected }, { count: measured }] = await Promise.all([
    admin
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .eq("active", true),
    admin
      .from("tracking_runs")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .eq("week_no", weekNo)
      .eq("purpose", "periodic")
      // Alleen de eerste meting per vraag telt hier mee (R6.1). Zonder dit
      // filter zouden de herhalingen van de zwaarste vragen de teller boven de
      // noemer duwen, en zou een ronde waarin de helft van de vragen mislukte
      // alsnog "voldoende gemeten" heten.
      .eq("repeat_index", 0)
      .not("mention_json", "is", null),
  ]);

  const exp = expected ?? 0;
  const got = measured ?? 0;
  const ratio = exp > 0 ? got / exp : 0;
  return { usable: got > 0 && ratio >= MIN_SUCCESS_RATIO, measured: got, expected: exp };
}
