import "server-only";

/**
 * 5–8 core topics voorstellen (docs/tasks/onboarding-2.0.md, blok D).
 *
 * ── WAT DIT VERVANGT ────────────────────────────────────────────────────────
 *
 * Een analyse begon met een leeg tekstveld waarin de klant een onderwerp typte
 * ("wasmachines", "herenkapsel"). Dat legt de moeilijkste vraag van het hele
 * product bij de persoon die er het minst over nagedacht heeft — en het is
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
 */
import { z } from "zod";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Idempotent vóór de aanroep (conventie 9). Staan er al voorstellen, dan niets
  // opnieuw doen — ook niet als de klant er intussen een paar heeft afgewezen.
  // Opnieuw voorstellen zou zijn keuzes overschrijven.
  const { count: existing } = await admin
    .from("profile_topics")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  if ((existing ?? 0) > 0) return { proposed: existing ?? 0, costUsd: 0 };

  const { data: offeringRows } = await admin
    .from("profile_offerings")
    .select("*")
    .eq("profile_id", profileId)
    .order("sort_order");
  const offerings = (offeringRows ?? []) as ProfileOffering[];

  if (offerings.length === 0) {
    // Zonder aanbodboom zou dit een model zijn dat onderwerpen verzint op basis
    // van een branchenaam. Dat levert generieke topics op die precies niet over
    // deze klant gaan — en de klant kan altijd nog zelf een onderwerp intypen.
    return { proposed: 0, costUsd: 0 };
  }

  const byId = new Map(offerings.map((o) => [o.id, o]));
  const boom = offerings
    .map((o) => {
      const parent = o.parent_id ? byId.get(o.parent_id) : null;
      const pad = parent ? `${parent.name} › ${o.name}` : o.name;
      const extra = [o.audience, o.price_indication].filter(Boolean).join(", ");
      return `- [${o.kind}] ${pad}${o.description ? ` — ${o.description}` : ""}${extra ? ` (${extra})` : ""}`;
    })
    .join("\n");

  const regios = profile.service_regions.length > 0 ? profile.service_regions.join(", ") : null;

  const system =
    `Je bepaalt de ${MIN_TOPICS} tot ${MAX_TOPICS} ONDERWERPEN waarop dit bedrijf zichtbaar moet ` +
    `zijn in AI-assistenten zoals ChatGPT. Een onderwerp is de noemer waaronder een koper zoekt, ` +
    `niet een productnaam en niet een hele branche.\n\n` +
    `HET NIVEAU BEPAALT ALLES:\n` +
    `- Te breed ("fysiotherapie", "witgoed"): dan meet je een hele markt en zegt de uitslag niets ` +
    `over dit bedrijf.\n` +
    `- Te smal ("dry needling bij frozen shoulder"): daar stelt niemand een vraag over.\n` +
    `- Goed: het niveau waarop iemand met een probleem zoekt — "hardloopblessure behandelen", ` +
    `"wasmachine kopen", "bruiloftsfotograaf inhuren".\n\n` +
    `REGELS:\n` +
    `1. Elk onderwerp moet aantoonbaar uit het AANBOD hieronder volgen. Zet in 'offerings' de ` +
    `namen die je gebruikt hebt, LETTERLIJK zoals ze in de lijst staan.\n` +
    `2. Geen merknamen in de titel — niet die van dit bedrijf en niet die van een ander.\n` +
    `3. Geen twee onderwerpen die op hetzelfde neerkomen. Liever vijf scherpe dan acht vage.\n` +
    `4. Schrijf de onderbouwing voor een ondernemer, zonder vaktermen. Zeg wat het oplevert, niet ` +
    `wat het is.\n` +
    `Antwoord in het Nederlands.`;

  const user =
    `Bedrijf: ${profile.brand_name ?? profile.name}\n` +
    (profile.industry ? `Branche: ${profile.industry}\n` : "") +
    (profile.business_model ? `Bedrijfsmodel: ${profile.business_model}\n` : "") +
    (regios ? `Werkgebied: ${regios}\n` : "") +
    `\nHET AANBOD (uit de eigen website gehaald):\n${boom}`;

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
  // dat ook — zonder deze filter zou één dubbel voorstel de hele batch-insert
  // laten mislukken en de klant nul topics opleveren.
  const gezien = new Set<string>();
  const namen = new Set(offerings.map((o) => o.name.toLowerCase()));
  const voorstellen = result.parsed.topics
    .filter((t) => {
      const key = t.title.trim().toLowerCase();
      if (!key || gezien.has(key)) return false;
      gezien.add(key);
      return true;
    })
    .slice(0, MAX_TOPICS);

  if (voorstellen.length === 0) return { proposed: 0, costUsd: result.costUsd };

  const { error } = await admin.from("profile_topics").insert(
    voorstellen.map((t, i) => ({
      profile_id: profileId,
      title: t.title.trim(),
      rationale: t.rationale.trim() || null,
      // Alleen verwijzingen die echt bestaan. Een verzonnen aanbodnaam zou een
      // topic opleveren dat nergens op terug te voeren is.
      offering_ids: t.offerings
        .filter((naam) => namen.has(naam.trim().toLowerCase()))
        .map((naam) => offerings.find((o) => o.name.toLowerCase() === naam.trim().toLowerCase())!.id),
      // Aflopend: hoogste prioriteit bovenaan bij `order by priority desc`.
      priority: Math.max(0, MAX_TOPICS - (Number.isFinite(t.priority) ? t.priority : i + 1)),
      status: "voorgesteld",
    })),
  );

  if (error) {
    console.error(`Topicvoorstellen opslaan mislukt voor profiel ${profileId}: ${error.message}`);
    return { proposed: 0, costUsd: result.costUsd };
  }

  return { proposed: voorstellen.length, costUsd: result.costUsd };
}
