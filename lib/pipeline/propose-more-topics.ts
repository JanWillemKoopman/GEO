import "server-only";

/**
 * De knop "Stel nieuwe clusters voor" (docs/optimalisatielab-orbit-engine.md,
 * werkpakket A §3.5, migratie 0077).
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS EN GEEN UITBREIDING VAN propose-topics.ts ─
 *
 * `proposeTopics()` in `propose-topics.ts` draait automatisch, ONGEVRAAGD, op
 * twee vaste momenten (na de aanbodboom, na het gesprek) en is daarom
 * idempotent: dezelfde aanroep twee keer mag nooit twee keer kosten maken.
 * Deze functie draait op een KLIK van de beheerder, gebruikt structureel meer
 * bewijs (metingen, afwijzingsredenen), en is expliciet NIET idempotent op
 * dezelfde manier: een tweede klik met nieuwe informatie moet wél opnieuw
 * draaien. Twee functies met een andere vorm van "nogmaals draaien mag niet"
 * horen niet in dezelfde functie (conventie 2, P2 in docs/logbook.md).
 *
 * ── WAT ER ANDERS IS DAN DE AUTOMATISCHE RONDE ──────────────────────────────
 *
 *   - ALTIJD aanvullend: niets wordt verwijderd of vervangen, ook geen
 *     onbesliste concepten. Concepten van vóór het gesprek horen bij die
 *     eerste, automatische stap; deze knop is er voor daarna.
 *   - Neemt gemeten gaps mee (het laatste rapport per lopend cluster) als
 *     concreet bewijs, niet alleen de aanbodboom en het gesprek.
 *   - Neemt afwijzingsredenen mee als expliciete "vermijd dit"-instructie.
 *   - Wijst zichzelf af zodra er niets nieuws is sinds de vorige ronde
 *     (`topic-round-diff.ts`), vóór er een dure aanroep gedaan wordt.
 *   - Logt elke ronde in `profile_topic_rounds`, ook een ronde die niets
 *     opleverde: dat is zelf ook informatie (de kwaliteitstoets is misschien
 *     te streng).
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { discontinuedNames, parseContextFactors } from "@/lib/pipeline/context-factors";
import { requireCount } from "@/lib/require-count";
import { topicSteering, goalRule } from "@/lib/pipeline/commercial-context";
import { TopicProposals } from "@/lib/pipeline/propose-topics";
import {
  beoordeelRonde,
  snapshotsGelijk,
  type TopicRoundSnapshot,
} from "@/lib/pipeline/topic-round-diff";
import type { Profile, ProfileOffering } from "@/lib/types/database";
import type { Report } from "@/lib/schemas/report";

/** Hoeveel gemeten gaps er hoogstens de prompt in gaan, over alle clusters samen. */
const MAX_GAPS_IN_PROMPT = 8;
/** En hoogstens dit aantal per cluster, zodat één groot cluster de rest niet verdrukt. */
const MAX_GAPS_PER_CLUSTER = 2;

export interface RoundPreview {
  /** Is er een goede reden om deze ronde te draaien? */
  aanraden: boolean;
  /** Wat de beheerder leest vóór hij klikt. */
  melding: string;
  /** Ruwe schatting voor de kostenindicatie, zelfde orde als propose-topics.ts. */
  geschatteKostenUsd: number;
}

export interface AdditionalRoundResult {
  /** Heeft de ronde daadwerkelijk een AI-aanroep gedaan? */
  gedraaid: boolean;
  voorgesteld: number;
  costUsd: number;
  melding: string;
}

async function buildSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
): Promise<TopicRoundSnapshot> {
  const [strategyRes, vraagRes, analyseRes, afgewezenRes] = await Promise.all([
    admin.from("profile_strategy").select("recorded_at").eq("profile_id", profileId).maybeSingle(),
    admin
      .from("fact_requests")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("status", "beantwoord"),
    admin.from("analyses").select("id").eq("profile_id", profileId),
    admin
      .from("profile_topics")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("status", "afgewezen"),
  ]);

  const analyseIds = (analyseRes.data ?? []).map((r) => r.id as string);
  let gemetenClusters = 0;
  if (analyseIds.length > 0) {
    const { data: rapportRijen } = await admin
      .from("reports")
      .select("analysis_id")
      .in("analysis_id", analyseIds);
    gemetenClusters = new Set((rapportRijen ?? []).map((r) => r.analysis_id as string)).size;
  }

  return {
    gesprekVastgelegdOp:
      (strategyRes.data as { recorded_at: string | null } | null)?.recorded_at ?? null,
    beantwoordeVragen: requireCount(vraagRes, "de beantwoorde klantvragen van dit merk"),
    gemetenClusters,
    afgewezenOnderwerpen: requireCount(afgewezenRes, "de afgewezen onderwerpen van dit merk"),
  };
}

/**
 * De laatste gemeten gaps per lopend cluster, als leesbaar bewijs.
 *
 * `reports.gaps_json` is `Report["gaps"]`: `{ cluster, problem, evidenceRunIds }`.
 * `problem` is al jargonvrije tekst ("AI noemt concurrent X, jou niet"), dus
 * hier is niets te interpreteren, alleen te verzamelen en af te kappen.
 */
async function loadMeasuredGaps(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
): Promise<{ text: string; usedMeasurement: boolean }> {
  const { data: analyseRijen } = await admin
    .from("analyses")
    .select("id, topic")
    .eq("profile_id", profileId);
  const analyses = analyseRijen ?? [];
  if (analyses.length === 0) return { text: "", usedMeasurement: false };

  const { data: rapportRijen } = await admin
    .from("reports")
    .select("analysis_id, gaps_json, generated_at")
    .in(
      "analysis_id",
      analyses.map((a) => a.id as string),
    )
    .order("generated_at", { ascending: false });

  const topicVan = new Map(analyses.map((a) => [a.id as string, a.topic as string]));
  // Welk rapport per cluster het nieuwste is: de query staat al aflopend op
  // datum, dus de EERSTE keer dat een analysis_id voorbijkomt is zijn nieuwste.
  const nieuwsteRapportPerCluster = new Map<string, Report["gaps"]>();
  for (const rapport of rapportRijen ?? []) {
    const analysisId = rapport.analysis_id as string;
    if (nieuwsteRapportPerCluster.has(analysisId)) continue;
    const gaps = (rapport.gaps_json ?? []) as Report["gaps"] | null;
    nieuwsteRapportPerCluster.set(analysisId, Array.isArray(gaps) ? gaps : []);
  }

  const regels: string[] = [];
  outer: for (const [analysisId, gaps] of nieuwsteRapportPerCluster) {
    let perCluster = 0;
    for (const gap of gaps) {
      if (perCluster >= MAX_GAPS_PER_CLUSTER) break;
      if (!gap?.problem?.trim()) continue;
      regels.push(`- [${topicVan.get(analysisId) ?? "onbekend cluster"}] ${gap.problem.trim()}`);
      perCluster++;
      if (regels.length >= MAX_GAPS_IN_PROMPT) break outer;
    }
  }

  return { text: regels.join("\n"), usedMeasurement: regels.length > 0 };
}

/**
 * Kan de knop deze ronde aanraden, of is er niets nieuws? Geen AI-aanroep,
 * dus veilig om bij elke schermweergave te draaien.
 */
export async function previewAdditionalRound(profileId: string): Promise<RoundPreview> {
  const admin = createAdminClient();
  const huidige = await buildSnapshot(admin, profileId);

  const { data: laatsteRonde } = await admin
    .from("profile_topic_rounds")
    .select("snapshot_json")
    .eq("profile_id", profileId)
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const vorige = (laatsteRonde?.snapshot_json as TopicRoundSnapshot | undefined) ?? null;
  const oordeel = beoordeelRonde(vorige && Object.keys(vorige).length > 0 ? vorige : null, huidige);

  return {
    aanraden: oordeel.nieuws,
    melding: oordeel.melding,
    // Zelfde orde als de automatische ronde (~$0,01), iets hoger door de
    // extra context (metingen, afwijzingsredenen). Een schatting, geen
    // toezegging: de echte kosten staan na afloop in ai_calls.
    geschatteKostenUsd: 0.02,
  };
}

/**
 * De ronde daadwerkelijk draaien. Roep dit alleen aan ná een expliciete klik
 * van de beheerder; de admin-controle zelf staat in de API-route
 * (`mayTriggerCost`, conventie: de knop is een intentie, de route is de
 * garantie).
 */
export async function proposeAdditionalTopics(
  profileId: string,
): Promise<AdditionalRoundResult> {
  const admin = createAdminClient();

  const { data: row } = await admin.from("profiles").select("*").eq("id", profileId).single();
  if (!row) throw new Error(`Profiel ${profileId} niet gevonden.`);
  const profile = row as Profile;

  const huidige = await buildSnapshot(admin, profileId);
  const { data: laatsteRonde } = await admin
    .from("profile_topic_rounds")
    .select("snapshot_json")
    .eq("profile_id", profileId)
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const vorigeRaw = laatsteRonde?.snapshot_json as TopicRoundSnapshot | undefined;
  const vorige = vorigeRaw && Object.keys(vorigeRaw).length > 0 ? vorigeRaw : null;

  // Dezelfde stand van zaken als de vorige klik: geen aanroep, wel loggen
  // (0 kosten, 0 voorstellen), zodat het scherm ook na een herlaad ziet dat
  // er net geprobeerd is.
  if (vorige && snapshotsGelijk(vorige, huidige)) {
    const melding = beoordeelRonde(vorige, huidige).melding;
    await admin.from("profile_topic_rounds").insert({
      profile_id: profileId,
      cost_usd: 0,
      proposed_count: 0,
      snapshot_json: huidige as never,
    });
    return { gedraaid: false, voorgesteld: 0, costUsd: 0, melding };
  }

  const [{ data: offeringRows }, { data: strategyRow }, { data: bestaandeTopics }] = await Promise.all([
    admin.from("profile_offerings").select("*").eq("profile_id", profileId).order("sort_order"),
    admin
      .from("profile_strategy")
      .select("strategy_notes, context_factors, recorded_at")
      .eq("profile_id", profileId)
      .maybeSingle(),
    admin
      .from("profile_topics")
      .select("title, status, rejection_reason")
      .eq("profile_id", profileId),
  ]);

  const strategy = strategyRow as {
    strategy_notes: string | null;
    context_factors: unknown;
    recorded_at: string | null;
  } | null;
  const hasGesprek = Boolean(strategy?.recorded_at);

  const gestopt = discontinuedNames(parseContextFactors(strategy?.context_factors));
  const offerings = ((offeringRows ?? []) as ProfileOffering[]).filter(
    (o) => !gestopt.some((naam) => o.name.toLowerCase().includes(naam)),
  );

  if (offerings.length === 0) {
    const melding = "Geen aanbodboom bekend, er valt niets voor te stellen.";
    await admin.from("profile_topic_rounds").insert({
      profile_id: profileId,
      cost_usd: 0,
      proposed_count: 0,
      snapshot_json: huidige as never,
    });
    return { gedraaid: false, voorgesteld: 0, costUsd: 0, melding };
  }

  const byId = new Map(offerings.map((o) => [o.id, o]));
  const byLabel = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const o of offerings) {
    const parent = o.parent_id ? byId.get(o.parent_id) : null;
    const kaal = o.name.trim();
    byLabel.set(kaal.toLowerCase(), o.id);
    byName.set(kaal.toLowerCase(), kaal);
    if (parent) {
      const pad = `${parent.name} › ${o.name}`.trim().toLowerCase();
      byLabel.set(pad, o.id);
      byName.set(pad, kaal);
    }
  }
  const boom = offerings
    .map((o) => {
      const parent = o.parent_id ? byId.get(o.parent_id) : null;
      const pad = parent ? `${parent.name} › ${o.name}` : o.name;
      return `- [${o.kind}] ${pad}${o.description ? `: ${o.description}` : ""}`;
    })
    .join("\n");

  const alleTopics = (bestaandeTopics ?? []) as {
    title: string;
    status: string;
    rejection_reason: string | null;
  }[];
  const bestaandeTitels = new Set(alleTopics.map((t) => t.title.trim().toLowerCase()));
  const bestaandBlok =
    alleTopics.length > 0
      ? `\n\nONDERWERPEN DIE ER AL STAAN (stel deze niet nog een keer voor, ook niet net anders ` +
        `geformuleerd):\n${alleTopics.map((t) => `- ${t.title}`).join("\n")}`
      : "";

  const afgewezenMetReden = alleTopics.filter(
    (t) => t.status === "afgewezen" && t.rejection_reason?.trim(),
  );
  const afwijzingBlok =
    afgewezenMetReden.length > 0
      ? `\n\nEERDER AFGEWEZEN, MET REDEN (vermijd deze richting, ook een variant erop):\n` +
        afgewezenMetReden.map((t) => `- "${t.title}": ${t.rejection_reason}`).join("\n")
      : "";

  const { text: gapsBlok, usedMeasurement } = await loadMeasuredGaps(admin, profileId);
  const metingBlok = gapsBlok
    ? `\n\nGEMETEN GEMISSEN VAN LOPENDE CLUSTERS (dit is hard bewijs, geef een onderwerp dat hier ` +
      `direct op aansluit voorrang):\n${gapsBlok}`
    : "";

  const regios = profile.service_regions.length > 0 ? profile.service_regions.join(", ") : null;

  const system =
    "Je stelt AANVULLENDE onderwerpen voor waarop dit bedrijf zichtbaar moet zijn in AI-assistenten " +
    "zoals ChatGPT, bovenop een lijst die er al ligt. Dit is geen startlijst: geef ALLEEN onderwerpen " +
    "die er nog niet zijn en die een echte, onderbouwde toevoeging zijn.\n\n" +
    "HET NIVEAU BEPAALT ALLES:\n" +
    "- Te breed (een hele branche): dan meet je een hele markt en zegt de uitslag niets over dit " +
    "bedrijf.\n" +
    "- Te smal (een productdetail): daar stelt niemand een vraag over aan een AI-assistent.\n" +
    "- Goed: het niveau waarop iemand met een concreet probleem zoekt.\n\n" +
    "REGELS:\n" +
    "1. Elk onderwerp moet aantoonbaar uit het AANBOD volgen. Zet in 'offerings' de namen LETTERLIJK " +
    "zoals ze in de lijst staan.\n" +
    "2. Geen merknamen in de titel.\n" +
    "3. Sla een onderwerp over als het inhoudelijk hetzelfde is als een onderwerp dat er al staat of " +
    "eerder is afgewezen, ook bij een andere formulering.\n" +
    "4. Is er weinig of niets toe te voegen, geef dan weinig of GEEN onderwerpen terug. Een lege lijst " +
    "is een geldig en eerlijk antwoord.\n" +
    "5. Schrijf de onderbouwing voor een ondernemer, zonder vaktermen, en verwijs naar het gemeten " +
    "gemis als dat er is.\n" +
    "Antwoord in het Nederlands.";

  const user =
    `Bedrijf: ${profile.brand_name ?? profile.name}\n` +
    (profile.industry ? `Branche: ${profile.industry}\n` : "") +
    (regios ? `Werkgebied: ${regios}\n` : "") +
    `\nHET AANBOD:\n${boom}` +
    topicSteering(profile) +
    goalRule(profile) +
    (hasGesprek && strategy?.strategy_notes
      ? `\n\nUIT HET STRATEGISCH GESPREK:\n${strategy.strategy_notes.trim()}`
      : "") +
    bestaandBlok +
    afwijzingBlok +
    metingBlok;

  const result = await callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: TopicProposals,
    schemaName: "topic_proposals",
    webSearch: false,
    work: "analytical",
    meta: { kind: "propose_more_topics", profileId },
  });

  const gezien = new Set<string>();
  const voorstellen = result.parsed.topics.filter((t) => {
    const key = t.title.trim().toLowerCase();
    if (!key || gezien.has(key) || bestaandeTitels.has(key)) return false;
    gezien.add(key);
    return true;
  });

  let ingevoegd = 0;
  if (voorstellen.length > 0) {
    const { error } = await admin.from("profile_topics").insert(
      voorstellen.map((t, i) => ({
        profile_id: profileId,
        title: t.title.trim(),
        rationale: t.rationale.trim() || null,
        offering_ids: [
          ...new Set(
            t.offerings
              .map((naam) => byLabel.get(naam.trim().toLowerCase()))
              .filter((id): id is string => Boolean(id)),
          ),
        ],
        offering_names: [
          ...new Set(
            t.offerings
              .map((naam) => byName.get(naam.trim().toLowerCase()))
              .filter((n): n is string => Boolean(n)),
          ),
        ],
        priority: Math.max(0, voorstellen.length - i),
        status: "voorgesteld",
        // Een aanvullende ronde draait per definitie na de allereerste
        // aanbodstap; de stage volgt dezelfde poort als de automatische ronde
        // (§3.2): zonder gesprek nog concept, ter voorbereiding.
        stage: hasGesprek ? "definitief" : "concept",
        origin: hasGesprek ? "aanbod_en_gesprek" : "aanbod",
        origin_uses_measurement: usedMeasurement,
      })),
    );
    if (!error) ingevoegd = voorstellen.length;
    else console.error(`Aanvullende onderwerpen opslaan mislukt voor profiel ${profileId}: ${error.message}`);
  }

  const melding =
    ingevoegd === 0
      ? "Deze ronde leverde geen nieuwe onderwerpen op die door de toets kwamen."
      : `${ingevoegd} nieuw${ingevoegd === 1 ? " onderwerp" : "e onderwerpen"} toegevoegd.`;

  await admin.from("profile_topic_rounds").insert({
    profile_id: profileId,
    cost_usd: result.costUsd,
    proposed_count: ingevoegd,
    snapshot_json: huidige as never,
  });

  return { gedraaid: true, voorgesteld: ingevoegd, costUsd: result.costUsd, melding };
}
