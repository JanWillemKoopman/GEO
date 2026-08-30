import "server-only";

/**
 * 5–8 core topics voorstellen (docs/tasks/onboarding-2.0.md, blok D).
 *
 * ── WAT DIT VERVANGT ────────────────────────────────────────────────────────
 *
 * Een analyse begon met een leeg tekstveld waarin de klant een onderwerp typte
 * ("wasmachines", "herenkapsel"). Dat legt de moeilijkste vraag van het hele
 * product bij de persoon die er het minst over nagedacht heeft, en het is
 * precies de stap die InSpace door een strateeg laat doen ("map 5 to 8 core
 * topics"). Met de aanbodboom uit fase 1 kan die lijst automatisch.
 *
 * ── BEWUST GEEN METING ──────────────────────────────────────────────────────
 *
 * Verleidelijk om per voorstel alvast een paar vragen te meten, zodat de klant
 * ziet waar hij staat. Dat kost 8 × ~$0,40 vóórdat iemand ja heeft gezegd. Dit
 * is een voorstellijst met een onderbouwing; goedkeuren start de bestaande
 * analysepijplijn. Kosten van deze stap: ~$0,01.
 *
 * ── HET NIVEAU IS HET HELE PUNT ─────────────────────────────────────────────
 *
 * Een topic op categorieniveau ("fysiotherapie") is te breed: dan meet je een
 * hele markt en zegt de uitslag niets over deze klant. Een topic op
 * productniveau ("dry needling bij een frozen shoulder") is te smal: daar stelt
 * niemand een vraag over aan ChatGPT. Het bruikbare niveau zit ertussenin, en
 * dat is precies waarom de boom uit fase 1 hieraan voorafgaat.
 *
 * ── CONCEPT VÓÓR HET GESPREK, DEFINITIEF ERNA (migratie 0068) ──────────────
 *
 * Deze stap draait meteen nadat de aanbodboom er is, dus ruim vóórdat het
 * strategisch gesprek ooit gevoerd is. Is er nog geen gesprek vastgelegd
 * (`profile_strategy.recorded_at` is leeg), dan krijgen de voorstellen
 * `stage: "concept"`: zichtbaar als gespreksvoorbereiding, niet te starten
 * (`app/api/profiles/[id]/topics/route.ts` bewaakt dat). Zodra het gesprek
 * bewaard wordt, roept `strategy/route.ts` deze functie opnieuw aan. Staan er
 * dan nog onbesliste concept-topics (niet gestart, niet afgewezen), dan worden
 * die vervangen door een definitieve ronde mét de gespreksinformatie erbij.
 * Een topic dat al gestart, goedgekeurd of afgewezen is, blijft altijd staan:
 * dat is een keuze van de klant, geen conceptvoorstel meer om weg te gooien.
 */
import { z } from "zod";
import { callStructured } from "@/lib/openai/structured";
import { topicSteering } from "@/lib/pipeline/commercial-context";
import { MODELS } from "@/lib/openai/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { discontinuedNames, parseContextFactors } from "@/lib/pipeline/context-factors";
import type { Profile, ProfileOffering } from "@/lib/types/database";

export const TopicProposals = z.object({
  topics: z.array(
    z.object({
      /** Het onderwerp zoals het in een analyse komt te staan. Kort, geen zin. */
      title: z.string(),
      /** Waarom dit onderwerp de moeite waard is, in gewone taal. */
      rationale: z.string(),
      /** De namen uit de aanbodboom waar dit topic uit voortkomt. */
      offerings: z.array(z.string()),
      /** 1 = het belangrijkste. Bepaalt alleen de volgorde. */
      priority: z.number(),
    }),
  ),
});

export type TopicProposals = z.infer<typeof TopicProposals>;

/** Onder de vijf is het geen keuze meer, boven de acht kiest niemand. */
const MIN_TOPICS = 5;
const MAX_TOPICS = 8;

export interface TopicResult {
  proposed: number;
  costUsd: number;
}

export async function proposeTopics(profileId: string): Promise<TopicResult> {
  const admin = createAdminClient();

  const { data: row } = await admin.from("profiles").select("*").eq("id", profileId).single();
  if (!row) throw new Error(`Profiel ${profileId} niet gevonden.`);
  const profile = row as Profile;

  const [{ data: existingTopics }, { data: strategyRow }] = await Promise.all([
    admin
      .from("profile_topics")
      .select("id, title, status, stage, analysis_id")
      .eq("profile_id", profileId),
    admin
      .from("profile_strategy")
      .select("strategy_notes, context_factors, recorded_at")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);

  const strategy = strategyRow as {
    strategy_notes: string | null;
    context_factors: unknown;
    recorded_at: string | null;
  } | null;
  const hasGesprek = Boolean(strategy?.recorded_at);
  const nieuweStage: "concept" | "definitief" = hasGesprek ? "definitief" : "concept";

  const bestaand = (existingTopics ?? []) as {
    id: string;
    title: string;
    status: string;
    stage: "concept" | "definitief";
    analysis_id: string | null;
  }[];

  // Onbesliste concepten: nog niet gestart, niet goedgekeurd, niet afgewezen.
  // Dat zijn de enige rijen die een latere ronde nog mag vervangen (§3.2).
  const onbeslisteConcepten = bestaand.filter(
    (t) => t.stage === "concept" && t.status === "voorgesteld" && !t.analysis_id,
  );

  if (bestaand.length > 0) {
    // Idempotent vóór de aanroep (conventie 9), met precies één uitzondering:
    // het gesprek is net vastgelegd en er liggen nog onbesliste concepten. Dat
    // is het enige moment waarop een tweede ronde geen dubbel werk is maar de
    // definitieve vervanging van een voorlopige lijst waar niemand nog op
    // klikte. Alles wat al gestart, goedgekeurd of afgewezen is, blijft altijd
    // staan: dat is een keuze van de klant, geen conceptvoorstel meer.
    if (!(hasGesprek && onbeslisteConcepten.length > 0)) {
      return { proposed: bestaand.length, costUsd: 0 };
    }
  }

  const { data: offeringRows } = await admin
    .from("profile_offerings")
    .select("*")
    .eq("profile_id", profileId)
    .order("sort_order");

  // Wat de klant in het gesprek als gestopt opgaf, hoort niet in de voorstellen
  // (blok C). De crawl vindt zo'n dienst nog wel, hij staat vaak nog maanden
  // op de site, dus zonder deze filter stelt de app een analyse voor op iets
  // wat het bedrijf niet meer levert.
  const gestopt = discontinuedNames(parseContextFactors(strategy?.context_factors));

  const offerings = ((offeringRows ?? []) as ProfileOffering[]).filter(
    (o) => !gestopt.some((naam) => o.name.toLowerCase().includes(naam)),
  );

  if (offerings.length === 0) {
    // Zonder aanbodboom zou dit een model zijn dat onderwerpen verzint op basis
    // van een branchenaam. Dat levert generieke topics op die precies niet over
    // deze klant gaan, en de klant kan altijd nog zelf een onderwerp intypen.
    return { proposed: 0, costUsd: 0 };
  }

  const byId = new Map(offerings.map((o) => [o.id, o]));
  const boom = offerings
    .map((o) => {
      const parent = o.parent_id ? byId.get(o.parent_id) : null;
      const pad = parent ? `${parent.name} › ${o.name}` : o.name;
      const extra = [o.audience, o.price_indication].filter(Boolean).join(", ");
      return `- [${o.kind}] ${pad}${o.description ? `: ${o.description}` : ""}${extra ? ` (${extra})` : ""}`;
    })
    .join("\n");

  const regios = profile.service_regions.length > 0 ? profile.service_regions.join(", ") : null;

  // Wat er in het gesprek is gezegd (migratie 0068). Alleen meegeven in de
  // definitieve ronde: in de conceptronde bestaat dit nog niet, en dat is
  // precies waarom er straks een tweede, betere ronde volgt.
  const gesprekBlok =
    hasGesprek && strategy?.strategy_notes
      ? `\n\nUIT HET STRATEGISCH GESPREK MET DE KLANT:\n${strategy.strategy_notes.trim()}\n` +
        `Weeg dit mee: een onderwerp dat hier direct op aansluit weegt zwaarder dan een dat alleen ` +
        `uit de website volgt.`
      : "";

  const system =
    `Je bepaalt de ${MIN_TOPICS} tot ${MAX_TOPICS} ONDERWERPEN waarop dit bedrijf zichtbaar moet ` +
    `zijn in AI-assistenten zoals ChatGPT. Een onderwerp is de noemer waaronder een koper zoekt, ` +
    `niet een productnaam en niet een hele branche.\n\n` +
    `HET NIVEAU BEPAALT ALLES:\n` +
    `- Te breed ("fysiotherapie", "witgoed"): dan meet je een hele markt en zegt de uitslag niets ` +
    `over dit bedrijf.\n` +
    `- Te smal ("dry needling bij frozen shoulder"): daar stelt niemand een vraag over.\n` +
    `- Goed: het niveau waarop iemand met een probleem zoekt, zoals "hardloopblessure behandelen", ` +
    `"wasmachine kopen", "bruiloftsfotograaf inhuren".\n\n` +
    `REGELS:\n` +
    `1. Elk onderwerp moet aantoonbaar uit het AANBOD hieronder volgen. Zet in 'offerings' de ` +
    `namen die je gebruikt hebt, LETTERLIJK zoals ze in de lijst staan.\n` +
    `2. Geen merknamen in de titel, niet die van dit bedrijf en niet die van een ander.\n` +
    `3. Geen twee onderwerpen die op hetzelfde neerkomen. Liever vijf scherpe dan acht vage.\n` +
    `4. Schrijf de onderbouwing voor een ondernemer, zonder vaktermen. Zeg wat het oplevert, niet ` +
    `wat het is.\n` +
    `Antwoord in het Nederlands.`;

  const user =
    `Bedrijf: ${profile.brand_name ?? profile.name}\n` +
    (profile.industry ? `Branche: ${profile.industry}\n` : "") +
    (profile.business_model ? `Bedrijfsmodel: ${profile.business_model}\n` : "") +
    (regios ? `Werkgebied: ${regios}\n` : "") +
    `\nHET AANBOD (uit de eigen website gehaald):\n${boom}` +
    // Wat de klant zelf zei over waar hij op wil groeien (migratie 0060). Zonder
    // dit stelt het model onderwerpen voor op grond van wat er toevallig op de
    // site staat, en dat is precies het aanbod waar hij vanaf wil.
    topicSteering(profile) +
    gesprekBlok;

  const result = await callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: TopicProposals,
    schemaName: "topic_proposals",
    webSearch: false,
    work: "analytical",
    meta: { kind: "propose_topics", profileId },
  });

  // ── Vangnet (conventie 1) ────────────────────────────────────────────────
  // Ontdubbelen op kleine letters, want de unieke index in migratie 0040 doet
  // dat ook. Zonder deze filter zou één dubbel voorstel de hele batch-insert
  // laten mislukken en de klant nul topics opleveren.
  const gezien = new Set<string>();

  // ⚠️ ZOWEL DE NAAM ALS HET PAD (3 aug 2026)
  //
  // De aanbodlijst hierboven toont elke knoop als "Ouder › Kind", en regel 1
  // vraagt de namen LETTERLIJK over te nemen. Het model doet dat dus ook, het
  // gaf "Specialismen › Sportfysiotherapie" terug, terwijl deze koppeling
  // alleen op `o.name` zocht. Uitkomst bij Fysi-Unique: acht topics, nul
  // verwijzingen naar het aanbod waar ze uit volgden, en dus een onderbouwing
  // die op het scherm nergens naar terug te klikken is.
  const byLabel = new Map<string, string>();
  // Van hetzelfde label naar de KALE naam van de knoop, "Specialismen ›
  // Sportfysiotherapie" wordt "Sportfysiotherapie". Dat is wat er in
  // `offering_names` hoort: een naam die een herbouw van de boom overleeft.
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
  // Titels van onderwerpen die blijven staan (beslist, dus niet vervangen).
  // Zonder deze filter kan de definitieve ronde een titel voorstellen die al
  // een gestart of afgewezen onderwerp draagt, en dan mislukt de hele insert
  // op de unieke index van migratie 0040, niet alleen die ene rij.
  const blijvendeTitels = new Set(
    bestaand
      .filter((t) => !onbeslisteConcepten.some((c) => c.id === t.id))
      .map((t) => t.title.trim().toLowerCase()),
  );

  const voorstellen = result.parsed.topics
    .filter((t) => {
      const key = t.title.trim().toLowerCase();
      if (!key || gezien.has(key) || blijvendeTitels.has(key)) return false;
      gezien.add(key);
      return true;
    })
    .slice(0, MAX_TOPICS);

  if (voorstellen.length === 0) return { proposed: bestaand.length, costUsd: result.costUsd };

  // De definitieve ronde vervangt de onbesliste concepten, ze stonden er
  // alleen ter voorbereiding op dit gesprek en niemand heeft erop geklikt.
  if (onbeslisteConcepten.length > 0) {
    const { error: deleteError } = await admin
      .from("profile_topics")
      .delete()
      .in(
        "id",
        onbeslisteConcepten.map((c) => c.id),
      );
    if (deleteError) {
      console.error(
        `Conceptonderwerpen opruimen mislukt voor profiel ${profileId}: ${deleteError.message}`,
      );
      return { proposed: bestaand.length, costUsd: result.costUsd };
    }
  }

  const { error } = await admin.from("profile_topics").insert(
    voorstellen.map((t, i) => ({
      profile_id: profileId,
      title: t.title.trim(),
      rationale: t.rationale.trim() || null,
      // Alleen verwijzingen die echt bestaan. Een verzonnen aanbodnaam zou een
      // topic opleveren dat nergens op terug te voeren is. Ontdubbeld, want
      // "Sportfysiotherapie" en "Specialismen › Sportfysiotherapie" wijzen naar
      // dezelfde knoop.
      offering_ids: [
        ...new Set(
          t.offerings
            .map((naam) => byLabel.get(naam.trim().toLowerCase()))
            .filter((id): id is string => Boolean(id)),
        ),
      ],
      // De NAMEN erbij (migratie 0043). Een herhaalronde gooit de AI-knopen weg
      // en bouwt ze opnieuw op met nieuwe id's; zonder deze kolom wijzen de
      // offering_ids daarna naar rijen die niet meer bestaan, stil, want een
      // uuid[] kan geen foreign key hebben. `buildOfferingTree()` herstelt de
      // koppeling hierop.
      offering_names: [
        ...new Set(
          t.offerings
            .map((naam) => byName.get(naam.trim().toLowerCase()))
            .filter((n): n is string => Boolean(n)),
        ),
      ],
      // Aflopend: hoogste prioriteit bovenaan bij `order by priority desc`.
      priority: Math.max(0, MAX_TOPICS - (Number.isFinite(t.priority) ? t.priority : i + 1)),
      status: "voorgesteld",
      stage: nieuweStage,
    })),
  );

  if (error) {
    console.error(`Topicvoorstellen opslaan mislukt voor profiel ${profileId}: ${error.message}`);
    return { proposed: bestaand.length - onbeslisteConcepten.length, costUsd: result.costUsd };
  }

  return {
    proposed: blijvendeTitels.size + voorstellen.length,
    costUsd: result.costUsd,
  };
}
