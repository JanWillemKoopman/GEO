import "server-only";

/**
 * De start van een reputatieanalyse: kiezen, vastleggen, inplannen (§4.1, §4.4, §7).
 *
 * Deze taak doet zelf GEEN enkele AI-aanroep. Hij leest wat er al is, kiest
 * deterministisch welke aanbodknopen en welke concurrenten meegaan, legt die
 * keuze vast, en zet de rest van de taken klaar.
 *
 * ── ⚠️ WAAROM DE KEUZE WORDT VASTGELEGD ─────────────────────────────────────
 *
 * `reputation_runs.scope_json` bewaart welke knopen en welke concurrenten
 * meegingen, en waarom. Zonder dat is een herhaling over drie maanden niet met
 * deze te vergelijken: dan weet niemand meer of het verschil in de reputatie zat
 * of in de vraag. Dat is precies de fout die een meetinstrument onbruikbaar
 * maakt, en hij is niet achteraf te repareren.
 *
 * ── ⚠️ DE VOLGORDE VAN INPLANNEN IS EEN BUDGETMAATREGEL ─────────────────────
 *
 * De vergelijkingstaken krijgen een LATERE `scheduled_for` dan de
 * reputatietaken. De wachtrij claimt op `scheduled_for asc` (migratie 0013), dus
 * dat is wat de volgorde uit §2.3 afdwingt: loopt het budget onverwacht vol, dan
 * valt de vergelijking weg en blijft de basisanalyse overeind, in plaats van
 * andersom. Een klant met een toon en een bewijskracht maar zonder plaats heeft
 * nog steeds een product; andersom heeft hij een plaats zonder te weten waarom.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import {
  selectNodes,
  MAX_NODES_STANDARD,
  MAX_NODES_DEEP,
  type SelectedNode,
} from "@/lib/reputation/select-nodes";
import { selectRivals } from "@/lib/reputation/select-rivals";
import { BRAND_ROTATIONS } from "@/lib/pipeline/reputation-compare";
import { MARKET_REPEATS } from "@/lib/pipeline/reputation-market";
import { instrumentVersion } from "@/lib/reputation/instrument";
import { BRAND_REPEATS } from "@/lib/pipeline/reputation-brand";
import { addNote } from "@/lib/pipeline/reputation-context";
import { activeOfferings } from "@/lib/offerings";
import type {
  Entity,
  Profile,
  ProfileOffering,
  ProfileTopic,
  ReputationRun,
} from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Hoeveel minuten de vergelijkingstaken achteraan gaan.
 *
 * Bewust ruim: de reputatietaken per knoop duren elk 20 tot 40 seconden en
 * draaien deels parallel, dus een paar minuten is genoeg om ze vóór te laten
 * gaan zonder de doorlooptijd merkbaar te verlengen. Het is een volgorde, geen
 * wachttijd: de werker pakt de vergelijkingen op zodra er ruimte is.
 */
const COMPARE_DELAY_MINUTES = 3;

export interface StartResult {
  nodes: number;
  rivals: number;
  planned: number;
}

export async function startReputationRun(admin: Admin, runId: string): Promise<StartResult> {
  const { data: runRow } = await admin
    .from("reputation_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (!runRow) throw new Error(`Reputatierun ${runId} niet gevonden.`);
  const run = runRow as ReputationRun;

  // Idempotent (conventie 9): staat de scope er al, dan is deze taak eerder
  // gedraaid en zijn de vervolgtaken ingepland. Opnieuw kiezen zou een ANDERE
  // scope kunnen opleveren (de aanbodboom kan intussen gewijzigd zijn), en dan
  // meet de tweede helft van de run iets anders dan de eerste.
  if (run.scope_json !== null) {
    console.info(`Reputatierun ${runId} was al gestart; scope blijft ongewijzigd.`);
    return { nodes: 0, rivals: (run.rivals ?? []).length, planned: 0 };
  }

  const { data: profileRow } = await admin
    .from("profiles")
    .select("*")
    .eq("id", run.profile_id)
    .maybeSingle();
  if (!profileRow) throw new Error(`Merk ${run.profile_id} niet gevonden.`);
  const profile = profileRow as Profile;

  // `activeOfferings()` laat verwijderde knopen weg (onboarding Ronde C,
  // §16.4): een uitgezette dienst mag niet meten worden op reputatie.
  const [offeringRows, { data: topicRows }, { data: entityRows }] = await Promise.all([
    activeOfferings(admin, profile.id),
    admin.from("profile_topics").select("*").eq("profile_id", profile.id),
    admin.from("entities").select("*").eq("profile_id", profile.id),
  ]);

  const offerings = offeringRows as ProfileOffering[];
  const topics = (topicRows ?? []) as ProfileTopic[];
  const entities = (entityRows ?? []) as Entity[];

  // ── Een merk zonder aanbodboom levert een nette weigering ─────────────────
  //
  // Geen lege run met een cijfer erboven: dit onderdeel meet per dienst, en
  // zonder diensten is er niets per dienst te meten. De merkbrede vragen alleen
  // zouden een half product zijn dat er heel uitziet.
  const nodes = selectNodes({
    offerings,
    topics,
    priorityNames: profile.priority_offerings ?? [],
    deprioritisedNames: profile.deprioritised_offerings ?? [],
    limit: run.depth === "diep" ? MAX_NODES_DEEP : MAX_NODES_STANDARD,
  });

  if (nodes.length === 0) {
    await admin
      .from("reputation_runs")
      .update({ status: "mislukt", finished_at: new Date().toISOString() })
      .eq("id", runId);
    await addNote(
      admin,
      runId,
      "Dit merk heeft nog geen diensten of producten in zijn merkprofiel staan. " +
        "De reputatieanalyse meet per dienst, dus er valt nog niets te meten. " +
        "Vul eerst het aanbod aan in het merkprofiel.",
    );
    return { nodes: 0, rivals: 0, planned: 0 };
  }

  // ── De concurrenten ───────────────────────────────────────────────────────
  const mentions = await countMentions(admin, profile.id);
  const rivals = selectRivals({
    measured: entities.map((e) => ({ entity: e, mentions: mentions.get(e.id) ?? 0 })),
    researched: profile.competitors ?? [],
    ownNames: [profile.brand_name, profile.name, ...(profile.aliases ?? [])].filter(
      (n): n is string => Boolean(n),
    ),
  });

  if (rivals.names.length === 0) {
    // ⚠️ Geen namen verzinnen. De run gaat gewoon door zonder blok V,
    // `rank_score` blijft null, en het scherm zegt waarom (conventie 3).
    await addNote(admin, runId, rivals.reason);
  }

  // ── Hoeveel antwoorden er komen ───────────────────────────────────────────
  //
  // Geteld in ANTWOORDRIJEN en niet in taken, want daar telt `bumpDone()` ook
  // op. Vijf merkbrede vragen, één per knoop, twee bronvragen, plus de
  // vergelijkingen: drie merkbrede rotaties en één per knoop.
  // Alleen merkbreed nog, zie `scheduleAll` voor waarom de vergelijking per
  // dienst eruit is.
  const vergelijkingen = rivals.names.length > 0 ? BRAND_ROTATIONS : 0;
  // Merkbreed: vijf vragen maal het aantal herhalingen. De marktvraag: drie
  // merkbreed plus één per dienst. Plus de dienstvragen, de twee bronvragen en
  // de vier onderzoeksvragen die het corpus vullen.
  const marktvragen = MARKET_REPEATS + nodes.length;
  const gepland =
    5 * BRAND_REPEATS + nodes.length + 2 + vergelijkingen + marktvragen + 4;

  await admin
    .from("reputation_runs")
    .update({
      status: "running",
      rivals: rivals.names,
      questions_planned: gepland,
      // ⚠️ Vastleggen waarmee gemeten is. Dit product wordt verkocht op
      // herhaling, en zonder deze sleutel zou een stille modelwijziging bij
      // OpenAI als vooruitgang of achteruitgang op het scherm komen.
      instrument_version: instrumentVersion(),
      scope_json: {
        nodes: nodes.map((n, i) => ({
          id: n.offering.id,
          naam: n.offering.name,
          soort: n.offering.kind,
          reden: n.reason,
          gewicht: n.weight,
          // De plek in de scope stuurt de rotatie van de partijen. Vastleggen,
          // anders is de gebruikte volgorde achteraf niet te reproduceren.
          slot: i,
        })),
        concurrenten: { namen: rivals.names, bron: rivals.source, reden: rivals.reason },
        diepte: run.depth,
      } as never,
    })
    .eq("id", runId);

  const planned = await scheduleAll(admin, run, nodes, rivals.names.length > 0);
  return { nodes: nodes.length, rivals: rivals.names.length, planned };
}

/**
 * Hoe vaak elke entiteit genoemd is in de laatste afgeronde periode.
 *
 * Dit is het sterkste concurrentiesignaal dat er is: die namen zijn niet bedacht
 * maar gemeten, ze kwamen naar boven toen een AI-assistent een echte koopvraag
 * beantwoordde.
 */
async function countMentions(admin: Admin, profileId: string): Promise<Map<string, number>> {
  const { data: analysisRows } = await admin
    .from("analyses")
    .select("id")
    .eq("profile_id", profileId);
  const analysisIds = ((analysisRows ?? []) as { id: string }[]).map((a) => a.id);
  if (analysisIds.length === 0) return new Map();

  // ⚠️ EÉN RIJ PER CONCURRENT, geen json-blob. Deze functie las eerst een kolom
  // `competitors_json` die niet bestaat. Gevolg: elke concurrent kreeg nul
  // vermeldingen, de sortering viel stil terug op alfabetische volgorde, en dan
  // vergelijkt de klant zich met de drie partijen wier naam vooraan in het
  // alfabet staat in plaats van met de drie die AI daadwerkelijk naast hem
  // noemt. Geen foutmelding, geen leeg scherm, alleen een verkeerde uitkomst.
  // Precies het soort stille degradatie waar conventie 3 tegen is, en gevonden
  // door het schema na te kijken vóór de eerste betaalde run (conventie 10).
  const { data } = await admin
    .from("competitor_breakdown")
    .select("analysis_id, week_no, competitor_name, mentions_count")
    .in("analysis_id", analysisIds);

  const rijen = (data ?? []) as {
    analysis_id: string;
    week_no: number;
    competitor_name: string;
    mentions_count: number;
  }[];
  if (rijen.length === 0) return new Map();

  // Per cluster alleen de LAATSTE periode. Oudere periodes optellen zou dezelfde
  // concurrent meerdere keren tellen en het beeld naar het verleden trekken;
  // het scherm Concurrenten rekent om dezelfde reden zo.
  const laatstePerCluster = new Map<string, number>();
  for (const r of rijen) {
    const huidig = laatstePerCluster.get(r.analysis_id);
    if (huidig === undefined || r.week_no > huidig) {
      laatstePerCluster.set(r.analysis_id, r.week_no);
    }
  }

  // Optellen over de clusters heen, op naam. De uitsplitsing bewaart de namen
  // zoals de entiteiten heten, dus dit koppelt rechtstreeks zonder een tweede
  // normalisatieslag.
  const perNaam = new Map<string, number>();
  for (const r of rijen) {
    if (laatstePerCluster.get(r.analysis_id) !== r.week_no) continue;
    const naam = (r.competitor_name ?? "").trim().toLowerCase();
    if (!naam) continue;
    perNaam.set(naam, (perNaam.get(naam) ?? 0) + (Number(r.mentions_count) || 0));
  }

  const { data: entityRows } = await admin
    .from("entities")
    .select("id, canonical_name")
    .eq("profile_id", profileId);

  const perId = new Map<string, number>();
  for (const e of (entityRows ?? []) as { id: string; canonical_name: string }[]) {
    const n = perNaam.get(e.canonical_name.trim().toLowerCase());
    if (n) perId.set(e.id, n);
  }
  return perId;
}

/**
 * Zet alle vervolgtaken klaar, in de volgorde die het budget beschermt.
 *
 * ── DE VOLGORDE, EN WAAROM ELKE STAP DAAR STAAT ─────────────────────────────
 *
 *   1. `reputation_evidence` als EERSTE en alleen. Alle dienstvragen lezen het
 *      corpus dat hij vult, dus die worden pas ingepland als hij klaar is. Zou
 *      je ze meteen inplannen, dan treffen de eerste een leeg corpus aan en
 *      vallen die terug op zelf zoeken; dan is de helft van de diensten anders
 *      gemeten dan de andere helft.
 *   2. `reputation_brand` en `reputation_market` meteen erna. Die zoeken zélf en
 *      hebben het corpus niet nodig, dus ze kunnen parallel met stap 1 draaien.
 *      Het zijn ook de twee blokken die het scherm bovenaan vullen, dus die wil
 *      je het eerst hebben.
 *   3. De vergelijkingen achteraan, met een latere starttijd. De wachtrij claimt
 *      op `scheduled_for asc`, dus dat is wat afdwingt dat een vol budget de
 *      vergelijking laat vallen en de basisanalyse overeind laat.
 *   4. De bronnen als laatste vóór de synthese, want die telt de aangehaalde
 *      URL's van de HELE run.
 */
async function scheduleAll(
  admin: Admin,
  run: ReputationRun,
  nodes: SelectedNode[],
  withCompare: boolean,
): Promise<number> {
  const nu = new Date();
  const later = new Date(nu.getTime() + COMPARE_DELAY_MINUTES * 60_000);
  let planned = 0;

  const tel = (r: { created: boolean }) => {
    if (r.created) planned++;
  };

  // ── 1. Het bewijscorpus. Plant zelf de dienstvragen in zodra hij klaar is. ──
  tel(
    await enqueue(admin, {
      type: "reputation_evidence",
      payload: { runId: run.id },
      profileId: run.profile_id,
      dedupeKey: dedupe.reputationEvidence(run.id),
    }),
  );

  // ── 2. De twee blokken die zélf zoeken ────────────────────────────────────
  tel(
    await enqueue(admin, {
      type: "reputation_brand",
      payload: { runId: run.id },
      profileId: run.profile_id,
      dedupeKey: dedupe.reputationBrand(run.id),
    }),
  );

  // De marktvraag merkbreed, met drie herhalingen. Dit is het commercieel
  // scherpste getal van het product, dus dat rust niet op één antwoord.
  tel(
    await enqueue(admin, {
      type: "reputation_market",
      payload: { runId: run.id, offeringId: null, repeats: MARKET_REPEATS },
      profileId: run.profile_id,
      dedupeKey: dedupe.reputationMarket(run.id, null),
    }),
  );

  // En per dienst één keer. Daar telt de spreiding over diensten zwaarder dan
  // de zekerheid per dienst: twaalf diensten maal drie zou de run verdrievoudigen
  // voor een precisie die op dat niveau niet nodig is.
  for (const n of nodes) {
    tel(
      await enqueue(admin, {
        type: "reputation_market",
        payload: { runId: run.id, offeringId: n.offering.id, repeats: 1 },
        profileId: run.profile_id,
        dedupeKey: dedupe.reputationMarket(run.id, n.offering.id),
      }),
    );
  }

  // ── 3. De vergelijkingen, bewust achteraan ────────────────────────────────
  //
  // ⚠️ Deze blijven bestaan naast de marktvraag, maar ze zijn niet meer het
  // hoofdmechanisme. Bij een merk waarvan AI de concurrenten kent levert een
  // gedwongen rangschikking scherpere uitspraken op; bij een regionaal bedrijf
  // levert hij niets op en neemt de marktvraag het over.
  if (withCompare) {
    tel(
      await enqueue(admin, {
        type: "reputation_compare",
        payload: { runId: run.id, offeringId: null, slot: 0, rotations: BRAND_ROTATIONS },
        profileId: run.profile_id,
        dedupeKey: dedupe.reputationCompare(run.id, null),
        scheduledFor: later,
      }),
    );

    // ⚠️ ALLEEN MERKBREED, GEEN VERGELIJKING PER DIENST MEER (23 augustus 2026).
    //
    // Die kostte twaalf gegronde aanroepen, een derde van de hele run, en hij
    // was bij Van den Udenhout aantoonbaar leeg: het model kende de
    // concurrenten op geen enkel dienstniveau, dus elke knoop leverde
    // "onbekend" op met de chip `indicatief` erbij. Twaalf betaalde vragen voor
    // een tabel met streepjes.
    //
    // Wat er voor in de plaats komt is beter én goedkoper: de marktvraag per
    // dienst. Die vraagt niet om een oordeel over partijen die het model niet
    // kent, maar laat het model zelf noemen wie er in die markt toe doet. Bij
    // een dienst waar AI niemand kent, levert dat een leeg lijstje op, en dat is
    // een echte uitkomst in plaats van een tabel vol streepjes.
    //
    // Merkbreed blijft de benoemde vergelijking wél staan: daar voedt hij de
    // criteriatabel, en met drie rotaties is hij de enige plek waar de vier
    // criteria tegen elkaar afgezet worden.
  }

  // ── 4. De bronnen als laatste vóór de synthese ────────────────────────────
  tel(
    await enqueue(admin, {
      type: "reputation_sources",
      payload: { runId: run.id },
      profileId: run.profile_id,
      dedupeKey: dedupe.reputationSources(run.id),
      scheduledFor: new Date(later.getTime() + 120_000),
    }),
  );

  return planned;
}
