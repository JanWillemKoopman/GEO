import "server-only";

/**
 * Blok D: de synthese, en het afsluiten van de run (§4.6).
 *
 * ── ⚠️ DE SYNTHESE REKENT NIET ──────────────────────────────────────────────
 *
 * Dit is de belangrijkste regel van dit bestand. De drie getallen en de plaats
 * worden HIER berekend, deterministisch, door `lib/reputation/score.ts` en
 * `lib/reputation/rank.ts`, en gaan als GEGEVEN de prompt in. Het model schrijft
 * de uitleg, het bepaalt de uitkomst niet.
 *
 * Zou je dat omdraaien, dan verschilt het cijfer per keer dat je het vraagt en
 * is geen enkele vergelijking over de tijd nog iets waard. Dat is precies wat
 * `baseline-verdict.ts` bij de kennistest ook doet: het oordeel in code, niet in
 * het model.
 *
 * ── DE VOLGORDE VAN DEZE FUNCTIE ────────────────────────────────────────────
 *
 *   1. alles inlezen wat de andere vijf taken hebben opgeslagen;
 *   2. de getallen rekenen, per aanbodknoop en merkbreed;
 *   3. het volgorde-effect meten en bepalen of de plaatsen indicatief zijn;
 *   4. de tekst laten schrijven, met de getallen als gegeven;
 *   5. de run afsluiten.
 *
 * Stap 5 komt na stap 4 en niet ervoor: mislukt de tekst, dan blijft de run open
 * en pakt de volgende poging hem op. Andersom zou een run als `klaar` op het
 * scherm staan met een lege samenvatting eronder.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ReputationSynthesis } from "@/lib/schemas/reputation";
import { loadContext, addNote } from "@/lib/pipeline/reputation-context";
import { toneIndex, evidenceScore, consistency, runIsUsable } from "@/lib/reputation/score";
import { summariseRanks, type RankSample } from "@/lib/reputation/rank";
import { measureOrderBias, rankIsIndicative } from "@/lib/reputation/order-bias";
import { positionInOrder } from "@/lib/reputation/rotate";
import { toneWord } from "@/lib/reputation/tone";
import { sourceMixSentence } from "@/lib/reputation/sources";
import { dedupeSleutel } from "@/lib/reputation/points";
import { CRITERION_LABEL } from "@/lib/types/database";
import type {
  ReputationAnswer,
  ReputationCriterion,
  ReputationRank,
  ReputationSource,
} from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Hoe vaak een punt moet terugkomen om als patroon te tellen.
 *
 * ⚠️ In code en niet in de prompt. Eén keer iets noemen is toeval; twee keer is
 * een patroon. Zonder deze drempel wordt blok 6 van het scherm een lijst van
 * losse opmerkingen, en dan is "wat AI structureel aan je koppelt" een leugen.
 */
const MIN_PATTERN = 2;

export interface SynthesisResult {
  toneIndex: number | null;
  evidenceScore: number | null;
  rankScore: number | null;
  status: "klaar" | "mislukt" | "budget_op";
}

export async function runSynthesis(admin: Admin, runId: string): Promise<SynthesisResult> {
  const ctx = await loadContext(admin, runId);
  if (!ctx) throw new Error(`Reputatierun ${runId} niet gevonden.`);

  // ── 1. Alles inlezen ──────────────────────────────────────────────────────
  const [{ data: answerRows }, { data: rankRows }, { data: sourceRows }] = await Promise.all([
    admin.from("reputation_answers").select("*").eq("run_id", runId),
    admin.from("reputation_ranks").select("*").eq("run_id", runId),
    admin.from("reputation_sources").select("*").eq("run_id", runId),
  ]);

  const answers = (answerRows ?? []) as ReputationAnswer[];
  const ranks = (rankRows ?? []) as ReputationRank[];
  const sources = (sourceRows ?? []) as ReputationSource[];

  const beoordeeld = answers.filter((a) => a.block === "merk" || a.block === "aanbod");
  const scoreInput = beoordeeld.map((a) => ({
    toneScore: a.tone_score,
    grounding: a.grounding,
    mentionsBrand: a.mentions_brand,
  }));

  // ── Geen half cijfer bij te weinig antwoorden (§3.3, staat "Mislukt") ─────
  if (!runIsUsable(scoreInput)) {
    await admin
      .from("reputation_runs")
      .update({ status: "mislukt", finished_at: new Date().toISOString() })
      .eq("id", runId);
    await addNote(
      admin,
      runId,
      "Er kwamen te weinig bruikbare antwoorden terug om een uitspraak op te baseren. " +
        "Er staat daarom geen cijfer: een cijfer op twee antwoorden is geen cijfer.",
    );
    return { toneIndex: null, evidenceScore: null, rankScore: null, status: "mislukt" };
  }

  // ── 2. De getallen ────────────────────────────────────────────────────────
  const eigenDomeinen = new Set(sources.filter((s) => s.kind === "eigen").map((s) => s.domain));
  const bewijsInput = sources.map((s) => ({
    domain: s.domain,
    isOwn: eigenDomeinen.has(s.domain),
    isReview: s.kind === "review",
    verifiedRating: s.verified && s.rating !== null,
  }));

  const merkToon = toneIndex(scoreInput);
  const merkBewijs = evidenceScore(bewijsInput);

  // De eenduidigheid per VRAAG: alleen waar er herhalingen zijn (diepe modus).
  const perVraag = new Map<string, (string | null)[]>();
  for (const a of beoordeeld) {
    const lijst = perVraag.get(a.question) ?? [];
    lijst.push(a.tone);
    perVraag.set(a.question, lijst);
  }
  const merkEenduidigheid = consistency([...perVraag.values()]);

  // ── 3. Het volgorde-effect ────────────────────────────────────────────────
  const bias = measureOrderBias(buildObservations(answers, ranks));

  // Merkbreed: de plaatsen uit de vergelijkingen zonder aanbodknoop.
  const merkRanks = ranks.filter((r) => r.offering_id === null && r.is_own_brand);
  const merkSamen = summariseRanks(merkRanks.map(toSample));
  const merkRotaties = new Set(
    answers
      .filter((a) => a.block === "vergelijking" && a.offering_id === null)
      .map((a) => a.repeat_index),
  ).size;

  // ── Per aanbodknoop ───────────────────────────────────────────────────────
  const perKnoop = await computeOfferingScores(admin, runId, answers, ranks, bias);

  // ── 4. De tekst ───────────────────────────────────────────────────────────
  const sterk = patronen(beoordeeld.flatMap((a) => a.pros ?? []));
  const kwetsbaar = patronen(beoordeeld.flatMap((a) => a.cons ?? []));

  const tekst = await writeSynthesis(admin, {
    runId,
    profileId: ctx.profile.id,
    brandName: ctx.brandName,
    toneIndex: merkToon,
    evidenceScore: merkBewijs,
    rank: merkSamen,
    rivals: ctx.run.rivals ?? [],
    sourceMix: sourceMixSentence(sources.map((s) => ({ domain: s.domain, kind: s.kind }))),
    strengths: sterk,
    weaknesses: kwetsbaar,
    offerings: perKnoop.map((o) => ({ name: o.offering_name, tone: o.tone_index })),
  });

  // ── 5. Afsluiten ──────────────────────────────────────────────────────────
  //
  // De uitleg per dienst wordt op NAAM teruggekoppeld en niet op volgorde: een
  // model dat één dienst overslaat zou anders alle uitleg één regel opschuiven,
  // en dan staat er bij sportmassage wat over bekkenfysiotherapie gezegd is.
  const uitlegPerDienst = new Map(
    (tekst?.per_dienst ?? []).map((d) => [d.dienst.trim().toLowerCase(), d.uitleg]),
  );
  for (const o of perKnoop) {
    const uitleg = uitlegPerDienst.get(o.offering_name.trim().toLowerCase());
    if (uitleg) {
      await admin
        .from("reputation_offering_scores")
        .update({ summary: uitleg })
        .eq("run_id", runId)
        .eq("offering_name", o.offering_name);
    }
  }

  // Was het budget onderweg geraakt, dan blijft die stand staan. `budget_op` is
  // een uitkomst met een cijfer eronder, geen mislukking, en hem hier alsnog op
  // `klaar` zetten zou de kanttekening op het scherm wissen.
  const status = ctx.run.status === "budget_op" ? "budget_op" : "klaar";

  await admin
    .from("reputation_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      tone_index: merkToon,
      evidence_score: merkBewijs,
      consistency: merkEenduidigheid,
      rank_score: merkSamen.score,
      rank_position: merkSamen.position,
      rank_of: merkSamen.of,
      // De noemer waarop de plaats rust: hoeveel partijen het model kende. Bij
      // Van den Udenhout waren dat er twee van de vier, en dan is "eerste van
      // twee" geen marktpositie maar een duel.
      rank_indicative: rankIsIndicative({
        rotations: merkRotaties,
        bias,
        knownParties: merkSamen.of ?? 0,
      }),
      wins_on: merkSamen.winsOn,
      loses_on: merkSamen.losesOn,
      order_bias: bias.bias,
      summary: tekst?.samenvatting ?? null,
      strengths: sterk,
      weaknesses: kwetsbaar,
      cost_usd: answers.reduce((s, a) => s + Number(a.cost_usd ?? 0), 0),
    })
    .eq("id", runId);

  // ⚠️ Het gemeten volgorde-effect hoort in gewone taal op het scherm, niet in de
  // kleine lettertjes. Blok 7 leest deze notitie.
  if (bias.exceeded) {
    await addNote(
      admin,
      runId,
      `Bij deze meting koos ChatGPT opvallend vaak het bedrijf dat als eerste in de vraag stond ` +
        `(${Math.round((bias.bias ?? 0) * 100)}% van de keren, verwacht was ` +
        `${Math.round((bias.expected ?? 0) * 100)}%). De plaatsen hieronder zijn daarom een ` +
        `indicatie en geen uitslag.`,
    );
  }

  return {
    toneIndex: merkToon,
    evidenceScore: merkBewijs,
    rankScore: merkSamen.score,
    status,
  };
}

function toSample(r: ReputationRank): RankSample {
  return {
    criterion: r.criterion,
    position: r.position,
    ofParties: r.of_parties,
  };
}

/**
 * Wie stond er vooraan in de vraag, en wie kwam er als eerste uit?
 *
 * ⚠️ Dit is waar `reputation_answers.party_order` voor bestaat. Zonder die kolom
 * is de eerste helft van deze waarneming weg, en dan is het volgorde-effect niet
 * te berekenen en de hele vergelijking niet te controleren.
 */
function buildObservations(answers: ReputationAnswer[], ranks: ReputationRank[]) {
  const perAntwoord = new Map<string, ReputationRank[]>();
  for (const r of ranks) {
    const lijst = perAntwoord.get(r.answer_id) ?? [];
    lijst.push(r);
    perAntwoord.set(r.answer_id, lijst);
  }

  const waarnemingen: {
    firstAsked: string;
    firstAskedKnown: boolean;
    firstPlaced: string | null;
    ofParties: number;
  }[] = [];

  for (const a of answers) {
    if (a.block !== "vergelijking") continue;
    const volgorde = a.party_order ?? [];
    if (volgorde.length < 2) continue;

    // Per criterium één waarneming: elk criterium is een eigen ranglijst en dus
    // een eigen kans voor het volgorde-effect om zich te tonen.
    const perCriterium = new Map<ReputationCriterion, ReputationRank[]>();
    for (const r of perAntwoord.get(a.id) ?? []) {
      const lijst = perCriterium.get(r.criterion) ?? [];
      lijst.push(r);
      perCriterium.set(r.criterion, lijst);
    }

    for (const [, rijen] of perCriterium) {
      const eerste = rijen.find((r) => r.position === 1);
      const noemer = rijen[0]?.of_parties ?? 0;
      if (!eerste || noemer < 2) continue;

      // ⚠️ Kende het model de partij die vooraan in de vraag stond? Zo niet, dan
      // kon die per definitie niet eerste worden en zegt dit oordeel niets over
      // het volgorde-effect. Zie `firstAskedKnown` in `order-bias.ts` voor de
      // meting die daarop stukliep.
      const eerstGevraagd = rijen.find(
        (r) => r.party_name.trim().toLowerCase() === volgorde[0].trim().toLowerCase(),
      );

      waarnemingen.push({
        firstAsked: volgorde[0],
        firstAskedKnown: eerstGevraagd?.known === true,
        firstPlaced: eerste.party_name,
        ofParties: noemer,
      });
    }
  }

  return waarnemingen;
}

/**
 * Punten die in minstens twee antwoorden voorkomen.
 *
 * Losjes vergeleken op de eerste drie woorden: "levertijd valt tegen" en
 * "levertijd valt soms tegen" zijn hetzelfde punt, en die als twee losse
 * observaties tellen zou ze allebei onder de drempel houden.
 */
function patronen(items: string[]): string[] {
  const groepen = new Map<string, { tekst: string; aantal: number }>();
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    // ⚠️ DEZELFDE sleutel als `cleanPoints()` gebruikt, en niet een eigen kopie.
    // Met een eigen kopie telden "persoonlijke begeleiding" en "persoonlijke
    // begeleiding bij aankoop" als twee patronen, en stonden ze allebei in de
    // sterke punten van de eerste echte run. Twee functies die hetzelfde zouden
    // moeten doen drijven uit elkaar (conventie P2).
    const sleutel = dedupeSleutel(v);
    const bestaand = groepen.get(sleutel);
    if (bestaand) bestaand.aantal++;
    else groepen.set(sleutel, { tekst: v, aantal: 1 });
  }

  return [...groepen.values()]
    .filter((g) => g.aantal >= MIN_PATTERN)
    .sort((a, b) => b.aantal - a.aantal || a.tekst.localeCompare(b.tekst))
    .slice(0, 6)
    .map((g) => g.tekst);
}

/** De uitkomst per aanbodknoop, berekend en opgeslagen. */
async function computeOfferingScores(
  admin: Admin,
  runId: string,
  answers: ReputationAnswer[],
  ranks: ReputationRank[],
  bias: ReturnType<typeof measureOrderBias>,
) {
  const knoopIds = [
    ...new Set(
      answers
        .filter((a) => a.offering_id !== null)
        .map((a) => a.offering_id as string),
    ),
  ];
  if (knoopIds.length === 0) return [];

  const { data: offeringRows } = await admin
    .from("profile_offerings")
    .select("id, name, kind")
    .in("id", knoopIds);
  const namen = new Map(
    ((offeringRows ?? []) as { id: string; name: string; kind: string }[]).map((o) => [
      o.id,
      o,
    ]),
  );

  const rijen = knoopIds.map((id) => {
    const eigenAntwoorden = answers.filter(
      (a) => a.offering_id === id && a.block === "aanbod",
    );
    const eigenRanks = ranks.filter((r) => r.offering_id === id && r.is_own_brand);
    const rotaties = new Set(
      answers
        .filter((a) => a.offering_id === id && a.block === "vergelijking")
        .map((a) => a.repeat_index),
    ).size;

    const samen = summariseRanks(eigenRanks.map(toSample));
    const knoop = namen.get(id);

    // De bronnen die specifiek bij deze knoop genoemd zijn.
    const domeinen = [
      ...new Set(
        eigenAntwoorden
          .flatMap((a) => a.cited_urls ?? [])
          .map((u) => {
            try {
              return new URL(u).hostname.replace(/^www\./, "");
            } catch {
              return "";
            }
          })
          .filter(Boolean),
      ),
    ];

    return {
      run_id: runId,
      offering_id: knoop ? id : null,
      // De naam bewaart wat er gemeten is, ook als de knoop later verdwijnt.
      offering_name: knoop?.name ?? "Onbekende dienst",
      offering_kind: knoop?.kind ?? null,
      tone_index: toneIndex(
        eigenAntwoorden.map((a) => ({
          toneScore: a.tone_score,
          grounding: a.grounding,
          mentionsBrand: a.mentions_brand,
        })),
      ),
      evidence_score:
        domeinen.length > 0
          ? evidenceScore(
              domeinen.map((d) => ({
                domain: d,
                isOwn: false,
                isReview: false,
                verifiedRating: false,
              })),
            )
          : 0,
      answers: eigenAntwoorden.length,
      rank_score: samen.score,
      rank_position: samen.position,
      rank_of: samen.of,
      // ⚠️ Eén vergelijking per knoop is indicatief, drie is een uitslag. In de
      // standaardmodus krijgt elke knoop er één, dus daar staat de chip altijd.
      rank_indicative: rankIsIndicative({
        rotations: rotaties,
        bias,
        knownParties: samen.of ?? 0,
      }),
      wins_on: samen.winsOn,
      loses_on: samen.losesOn,
      top_pros: patronen(eigenAntwoorden.flatMap((a) => a.pros ?? [])),
      top_cons: patronen(eigenAntwoorden.flatMap((a) => a.cons ?? [])),
      source_domains: domeinen.slice(0, 8),
    };
  });

  const { error } = await admin
    .from("reputation_offering_scores")
    .upsert(rijen, { onConflict: "run_id,offering_name" });
  if (error) throw new Error(`Uitkomst per dienst opslaan mislukt: ${error.message}`);

  return rijen;
}

/**
 * De tekst laten schrijven, met de getallen als gegeven.
 *
 * De schrijfregels uit `docs/schrijfstijl.md` gaan mee, inclusief regel 9 over
 * gedachtestreepjes, precies zoals `lib/pipeline/content.ts` dat doet. Deze
 * tekst komt op het scherm van de klant.
 */
async function writeSynthesis(
  admin: Admin,
  args: {
    runId: string;
    profileId: string;
    brandName: string;
    toneIndex: number | null;
    evidenceScore: number;
    rank: ReturnType<typeof summariseRanks>;
    rivals: string[];
    sourceMix: string;
    strengths: string[];
    weaknesses: string[];
    offerings: { name: string; tone: number | null }[];
  },
): Promise<ReputationSynthesis | null> {
  const gegevens = [
    `Bedrijf: ${args.brandName}`,
    `Toon: ${args.toneIndex === null ? "geen oordeel te vellen" : `${args.toneIndex} op een schaal van -100 tot 100, dus ${toneWord(args.toneIndex)}`}`,
    `Bewijskracht: ${args.evidenceScore} op 100. ${args.sourceMix}`,
    args.rank.position !== null
      ? `Plaats tegenover de concurrenten: gemiddeld ${args.rank.position} van ${args.rank.of}, ` +
        `vergeleken met ${args.rivals.join(", ")}.` +
        (args.rank.winsOn.length > 0
          ? ` Sterk op: ${args.rank.winsOn.map((c) => CRITERION_LABEL[c]).join(", ")}.`
          : "") +
        (args.rank.losesOn.length > 0
          ? ` Zwak op: ${args.rank.losesOn.map((c) => CRITERION_LABEL[c]).join(", ")}.`
          : "")
      : "Plaats tegenover de concurrenten: niet vast te stellen.",
    "",
    `Wat AI positief noemt: ${args.strengths.join("; ") || "niets dat vaker dan één keer terugkwam"}`,
    `Wat AI als bezwaar noemt: ${args.weaknesses.join("; ") || "niets dat vaker dan één keer terugkwam"}`,
    "",
    "De gemeten diensten en hun toon:",
    ...args.offerings.map(
      (o) => `- ${o.name}: ${o.tone === null ? "geen beeld" : `${o.tone} (${toneWord(o.tone)})`}`,
    ),
  ].join("\n");

  try {
    const r = await callStructured({
      model: MODELS.quality,
      system:
        "Je schrijft de samenvatting van een reputatieanalyse voor een ondernemer die geen " +
        "marketeer is. " +
        "⚠️ DE CIJFERS STAAN VAST. Je krijgt ze en je legt ze uit; je berekent ze niet en je " +
        "spreekt ze niet tegen. Noem geen cijfer dat je niet gekregen hebt. " +
        "Schrijfregels: je en jij, korte stellende zinnen, ORBIT ENGINE of ChatGPT als handelend " +
        "onderwerp. Geen verkooppraat en geen geruststelling: een probleem benoem je. " +
        "INTERPUNCTIE. Gebruik GEEN gedachtestreepjes (— of –) en GEEN schuine streep tussen twee " +
        "woorden. Schrijf 'en of' voluit. Dat zijn de twee leestekens waaraan een lezer AI-tekst " +
        "herkent, en dit scherm draagt de naam van de klant. Gebruik een komma, een dubbele punt, " +
        "of splits de zin. Een koppelteken in een samenstelling ('AI-assistent') mag wel. " +
        "Bij sterke en kwetsbare punten neem je alleen over wat je krijgt; verzin er niets bij. " +
        "Antwoord in het Nederlands.",
      user: gegevens,
      schema: ReputationSynthesis,
      schemaName: "reputation_synthesis",
      webSearch: false,
      work: "analytical",
      meta: {
        kind: "reputation_synthesis",
        profileId: args.profileId,
        reputationRunId: args.runId,
      },
    });
    return r.parsed;
  } catch (err) {
    // Faalt hard genoeg om zichtbaar te zijn, zacht genoeg om de cijfers te
    // behouden: de getallen staan al berekend en worden hierboven opgeslagen,
    // ook zonder tekst. Het scherm toont dan de kale cijfers, en dat is beter
    // dan een run die als mislukt geldt terwijl er wél gemeten is.
    console.error(`Synthese schrijven mislukt voor run ${args.runId}:`, err);
    await addNote(
      admin,
      args.runId,
      "De samenvattende tekst kon niet geschreven worden. De cijfers hieronder kloppen wel.",
    );
    return null;
  }
}
