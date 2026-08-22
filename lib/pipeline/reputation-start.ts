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
import { addNote } from "@/lib/pipeline/reputation-context";
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

  const [{ data: offeringRows }, { data: topicRows }, { data: entityRows }] = await Promise.all([
    admin.from("profile_offerings").select("*").eq("profile_id", profile.id).order("sort_order"),
    admin.from("profile_topics").select("*").eq("profile_id", profile.id),
    admin.from("entities").select("*").eq("profile_id", profile.id),
  ]);

  const offerings = (offeringRows ?? []) as ProfileOffering[];
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
  const vergelijkingen =
    rivals.names.length > 0 ? BRAND_ROTATIONS + nodes.length : 0;
  const gepland = 5 + nodes.length + 2 + vergelijkingen;

  await admin
    .from("reputation_runs")
    .update({
      status: "running",
      rivals: rivals.names,
      questions_planned: gepland,
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

  const { data } = await admin
    .from("competitor_breakdown")
    .select("competitors_json, week_no")
    .in("analysis_id", analysisIds)
    .order("week_no", { ascending: false })
    .limit(20);

  // Op NAAM tellen en dan op entiteit-id koppelen zou een tweede
  // normalisatieslag vergen. De uitsplitsing bewaart de namen al genormaliseerd
  // zoals de entiteiten heten, dus dit koppelt rechtstreeks.
  const perNaam = new Map<string, number>();
  for (const rij of (data ?? []) as { competitors_json: unknown }[]) {
    const lijst = (rij.competitors_json ?? []) as { entity_name?: string; mentions_count?: number }[];
    if (!Array.isArray(lijst)) continue;
    for (const c of lijst) {
      const naam = (c.entity_name ?? "").trim().toLowerCase();
      if (!naam) continue;
      perNaam.set(naam, (perNaam.get(naam) ?? 0) + (Number(c.mentions_count) || 0));
    }
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

/** Zet alle vervolgtaken klaar, in de volgorde die het budget beschermt. */
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

  // ── De basisanalyse: merkbreed, per knoop, en de bronnen ─────────────────
  tel(
    await enqueue(admin, {
      type: "reputation_brand",
      payload: { runId: run.id },
      profileId: run.profile_id,
      dedupeKey: dedupe.reputationBrand(run.id),
    }),
  );

  for (const n of nodes) {
    tel(
      await enqueue(admin, {
        type: "reputation_offering",
        payload: { runId: run.id, offeringId: n.offering.id },
        profileId: run.profile_id,
        dedupeKey: dedupe.reputationOffering(run.id, n.offering.id),
      }),
    );
  }

  // ── De vergelijkingen, bewust achteraan ──────────────────────────────────
  if (withCompare) {
    tel(
      await enqueue(admin, {
        type: "reputation_compare",
        // Merkbreed krijgt ALTIJD drie rotaties, ook in de standaardmodus, want
        // dat is het getal dat bovenaan het scherm komt (§4.4, maatregel 3).
        payload: { runId: run.id, offeringId: null, slot: 0, rotations: BRAND_ROTATIONS },
        profileId: run.profile_id,
        dedupeKey: dedupe.reputationCompare(run.id, null),
        scheduledFor: later,
      }),
    );

    for (const [i, n] of nodes.entries()) {
      tel(
        await enqueue(admin, {
          type: "reputation_compare",
          // Eén rotatie per knoop in de standaardmodus. Die krijgt daarmee de
          // chip `indicatief`, en terecht: het gemiddelde over de knopen is
          // gecorrigeerd, de losse knoop niet.
          payload: { runId: run.id, offeringId: n.offering.id, slot: i, rotations: 1 },
          profileId: run.profile_id,
          dedupeKey: dedupe.reputationCompare(run.id, n.offering.id),
          scheduledFor: later,
        }),
      );
    }
  }

  // ── De bronnen als laatste vóór de synthese ──────────────────────────────
  //
  // Blok C3 telt de aangehaalde URL's van de HELE run, dus hij moet ná blok A, B
  // en V draaien. Zou hij vooraan staan, dan zag hij alleen zijn eigen twee
  // vragen en miste hij de bronnen die AI bij de dienstvragen aanhaalde, en die
  // zijn even veel waard.
  tel(
    await enqueue(admin, {
      type: "reputation_sources",
      payload: { runId: run.id },
      profileId: run.profile_id,
      dedupeKey: dedupe.reputationSources(run.id),
      scheduledFor: new Date(later.getTime() + 60_000),
    }),
  );

  return planned;
}
